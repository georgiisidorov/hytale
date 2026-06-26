import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPool } from '@/lib/db';
import { decodeSessionToken } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth-constants';
import { syncPlayersFromPermissions } from '@/lib/players-sync';

type PromoPayload = {
	balance?: number;
	[key: string]: unknown;
};

async function requireAdmin(): Promise<{ username: string } | null> {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token) return null;
	return await decodeSessionToken(token);
}

function badRequest(message: string) {
	return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(req: Request) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const body = (await req.json()) as Partial<{ code: string; username: string }>;
		const code = typeof body.code === 'string' ? body.code.trim() : '';
		const username = typeof body.username === 'string' ? body.username.trim() : '';
		if (!code) return badRequest('code обязателен');
		if (!username) return badRequest('username обязателен');
		if (username.length > 64) return badRequest('username слишком длинный');

		const pool = getPool();
		const client = await pool.connect();
		try {
			await client.query('BEGIN');

			// ensure player exists
			const playerRes = await client.query<{ id: number }>(
				`INSERT INTO hytale_players(username)
				 VALUES ($1)
				 ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
				 RETURNING id`,
				[username],
			);
			const playerId = playerRes.rows[0]?.id;
			if (!playerId) throw new Error('failed to upsert player');

			// lock promocode row
			const promoRes = await client.query<{
				id: number;
				payload: PromoPayload;
				is_multi_use: boolean;
				max_uses: number | null;
				uses_count: number;
				starts_at: string | null;
				ends_at: string | null;
				is_active: boolean;
			}>(
				`SELECT id, payload, is_multi_use, max_uses, uses_count, starts_at, ends_at, is_active
				 FROM hytale_promocodes
				 WHERE code = $1
				 FOR UPDATE`,
				[code],
			);
			const promo = promoRes.rows[0];
			if (!promo) {
				await client.query('ROLLBACK');
				return NextResponse.json({ ok: false, error: 'Промокод не найден' }, { status: 404 });
			}

			if (!promo.is_active) {
				await client.query('ROLLBACK');
				return NextResponse.json({ ok: false, error: 'Промокод выключен' }, { status: 409 });
			}

			// time window
			const now = await client.query<{ now: string }>('SELECT now()::timestamptz AS now');
			const nowTs = new Date(now.rows[0]?.now ?? Date.now());
			if (promo.starts_at) {
				const s = new Date(promo.starts_at);
				if (!Number.isNaN(s.getTime()) && nowTs < s) {
					await client.query('ROLLBACK');
					return NextResponse.json({ ok: false, error: 'Промокод ещё не активен' }, { status: 409 });
				}
			}
			if (promo.ends_at) {
				const e = new Date(promo.ends_at);
				if (!Number.isNaN(e.getTime()) && nowTs > e) {
					await client.query('ROLLBACK');
					return NextResponse.json({ ok: false, error: 'Срок промокода истёк' }, { status: 409 });
				}
			}

			// per-player uniqueness (also blocks "one-time for player" even for multi-use)
			// if multi-use and you want allow same player multiple times, remove UNIQUE constraint in DB.
			const redemptionTry = await client.query(
				`INSERT INTO hytale_promocode_redemptions(promo_code_id, player_id)
				 VALUES ($1, $2)
				 ON CONFLICT (promo_code_id, player_id) DO NOTHING
				 RETURNING id`,
				[promo.id, playerId],
			);
			if (!redemptionTry.rows[0]) {
				await client.query('ROLLBACK');
				return NextResponse.json({ ok: false, error: 'Этот игрок уже активировал промокод' }, { status: 409 });
			}

			// usage limits
			if (promo.is_multi_use) {
				if (promo.max_uses != null && promo.uses_count >= promo.max_uses) {
					await client.query('ROLLBACK');
					return NextResponse.json({ ok: false, error: 'Лимит использований исчерпан' }, { status: 409 });
				}
				await client.query(`UPDATE hytale_promocodes SET uses_count = uses_count + 1 WHERE id = $1`, [promo.id]);
			} else {
				if (promo.uses_count >= 1) {
					await client.query('ROLLBACK');
					return NextResponse.json({ ok: false, error: 'Промокод уже использован' }, { status: 409 });
				}
				await client.query(`UPDATE hytale_promocodes SET uses_count = 1 WHERE id = $1`, [promo.id]);
			}

			// apply payload (balance credit)
			const bal = promo.payload?.balance;
			const balanceCredit = typeof bal === 'number' && Number.isFinite(bal) ? bal : null;
			if (balanceCredit != null && balanceCredit > 0) {
				const credit = Math.floor(balanceCredit);
				await client.query(
					`INSERT INTO hytale_player_balance(player_id, balance, coins, crystals)
					 VALUES ($1, $2, $2, 0)
					 ON CONFLICT (player_id) DO UPDATE
					 SET balance = hytale_player_balance.balance + EXCLUDED.balance,
					     coins = hytale_player_balance.coins + EXCLUDED.coins,
					     updated_at = now()`,
					[playerId, credit],
				);
				await client.query(
					`INSERT INTO hytale_balance_txn(player_id, kind, amount, currency, reason, promo_code_id, created_by_admin)
					 VALUES ($1, 'credit', $2, 'coins', $3, $4, $5)`,
					[playerId, credit, `promo:${code}`, promo.id, admin.username],
				);
			}

			await client.query('COMMIT');
			await syncPlayersFromPermissions(pool, 'dev').catch(() => {});
			return NextResponse.json({
				ok: true,
				applied: { balance: balanceCredit ?? 0 },
			});
		} catch (e) {
			try {
				await client.query('ROLLBACK');
			} catch {}
			throw e;
		} finally {
			client.release();
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

