import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPool } from '@/lib/db';
import { decodeSessionToken } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth-constants';
import { moderationDisplay } from '@/lib/moderation-display';
import { readPlayerNamesMap } from '@/lib/player-names';
import { readPermissionsUserMap } from '@/lib/players-sync';

async function requireAdmin(): Promise<boolean> {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token) return false;
	return (await decodeSessionToken(token)) != null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ username: string }> }) {
	try {
		if (!(await requireAdmin())) {
			return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
		}

		const { username } = await ctx.params;
		const u = decodeURIComponent(username).trim();
		if (!u) return NextResponse.json({ ok: false, error: 'bad username' }, { status: 400 });

		const pool = getPool();
		const playerRes = await pool.query<{
			id: number;
			username: string;
			created_at: string;
			moderation_status: string;
			moderation_until: string | null;
		}>(
			`SELECT id, username, created_at,
			        COALESCE(moderation_status, 'active') AS moderation_status,
			        moderation_until
			 FROM hytale_players WHERE lower(username) = lower($1)`,
			[u],
		);
		const player = playerRes.rows[0];
		if (!player) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

		const modDisp = moderationDisplay(player.moderation_status, player.moderation_until);
		const playerNames = await readPlayerNamesMap();
		const uuidLower = player.username.toLowerCase();
		const display_username = playerNames.map.get(uuidLower) ?? null;
		const perm = await readPermissionsUserMap();
		const rank = perm.map.get(uuidLower)?.rank ?? 'Regular';

		const [balRes, txRes, purchasesRes, redemptionsRes] = await Promise.all([
			pool.query<{ balance: string; coins: string; crystals: string }>(
				`SELECT
					COALESCE(coins, 0)::text AS coins,
					COALESCE(crystals, 0)::text AS crystals,
					COALESCE(balance, 0)::text AS balance
				FROM hytale_player_balance WHERE player_id = $1`,
				[player.id],
			),
			pool.query(
				`SELECT kind, amount::text AS amount, reason, created_by_admin, created_at
				 FROM hytale_balance_txn
				 WHERE player_id = $1
				 ORDER BY created_at DESC
				 LIMIT 200`,
				[player.id],
			),
			pool.query(
				`SELECT
					i.sku,
					i.title,
					p.price::text AS price,
					p.currency,
					p.created_at
				 FROM hytale_purchases p
				 JOIN hytale_shop_items i ON i.id = p.item_id
				 WHERE p.player_id = $1
				 ORDER BY p.created_at DESC
				 LIMIT 200`,
				[player.id],
			),
			pool.query(
				`SELECT
					c.code,
					r.redeemed_at
				 FROM hytale_promocode_redemptions r
				 JOIN hytale_promocodes c ON c.id = r.promo_code_id
				 WHERE r.player_id = $1
				 ORDER BY r.redeemed_at DESC
				 LIMIT 200`,
				[player.id],
			),
		]);

		return NextResponse.json({
			ok: true,
			player,
			display_username,
			rank,
			playerNamesError: playerNames.error,
			moderation: { label: modDisp.label, kind: modDisp.kind },
			balance: balRes.rows[0]?.coins ?? balRes.rows[0]?.balance ?? '0',
			coins: balRes.rows[0]?.coins ?? '0',
			crystals: balRes.rows[0]?.crystals ?? '0',
			balanceTxns: txRes.rows,
			purchases: purchasesRes.rows,
			promocodeRedemptions: redemptionsRes.rows,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

