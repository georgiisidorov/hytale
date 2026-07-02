import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authorizeCatalogOrIcon } from '@/lib/market-auth';
import { ensurePlayerId } from '@/lib/player-wallet';

type PackVoucherPayload = {
	type: string;
	pack_id: string;
	payment_id?: string;
	target_uuid?: string;
};

type PackItem = { item_id: string; quantity: number };

export async function POST(req: Request) {
	try {
		if (!(await authorizeCatalogOrIcon(req))) {
			return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
		}

		const body = (await req.json()) as Partial<{ code: string; playerUuid: string }>;
		const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
		const playerUuid = typeof body.playerUuid === 'string' ? body.playerUuid.trim() : '';
		if (!code) return NextResponse.json({ ok: false, error: 'code обязателен' }, { status: 400 });
		if (!playerUuid) return NextResponse.json({ ok: false, error: 'playerUuid обязателен' }, { status: 400 });

		const pool = getPool();
		const client = await pool.connect();
		try {
			await client.query('BEGIN');

			const promoRes = await client.query<{
				id: number;
				payload: PackVoucherPayload;
				uses_count: number;
				is_active: boolean;
				ends_at: string | null;
			}>(
				`SELECT id, payload, uses_count, is_active, ends_at
				 FROM hytale_promocodes
				 WHERE code = $1
				 FOR UPDATE`,
				[code],
			);
			const promo = promoRes.rows[0];

			if (!promo) {
				await client.query('ROLLBACK');
				return NextResponse.json({ ok: false, error: 'Ваучер не найден' }, { status: 404 });
			}
			if (!promo.is_active) {
				await client.query('ROLLBACK');
				return NextResponse.json({ ok: false, error: 'Ваучер недействителен' }, { status: 409 });
			}
			if (promo.ends_at) {
				if (new Date() > new Date(promo.ends_at)) {
					await client.query('ROLLBACK');
					return NextResponse.json({ ok: false, error: 'Срок ваучера истёк' }, { status: 409 });
				}
			}
			if (promo.payload?.type !== 'pack_voucher') {
				await client.query('ROLLBACK');
				return NextResponse.json({ ok: false, error: 'Неверный тип промокода' }, { status: 409 });
			}
			if (promo.uses_count >= 1) {
				await client.query('ROLLBACK');
				return NextResponse.json({ ok: false, error: 'Ваучер уже был активирован' }, { status: 409 });
			}

			// Проверяем персональную привязку
			const targetUuid = promo.payload.target_uuid;
			if (targetUuid && targetUuid.toLowerCase() !== playerUuid.toLowerCase()) {
				await client.query('ROLLBACK');
				return NextResponse.json({ ok: false, error: 'Ваучер выдан другому игроку' }, { status: 403 });
			}

			const packId = promo.payload.pack_id;

			// Получаем состав пака
			const itemsRes = await client.query<PackItem>(
				`SELECT item_id, quantity
				 FROM hytale_market_item_pack_contents
				 WHERE pack_id = $1
				 ORDER BY sort_order, id`,
				[packId],
			);
			if (!itemsRes.rows.length) {
				await client.query('ROLLBACK');
				return NextResponse.json({ ok: false, error: `Пак '${packId}' пуст или не найден` }, { status: 404 });
			}

			// Создаём/находим игрока и записываем активацию
			const playerId = await ensurePlayerId(client, playerUuid);
			await client.query(
				`INSERT INTO hytale_promocode_redemptions (promo_code_id, player_id)
				 VALUES ($1, $2)
				 ON CONFLICT (promo_code_id, player_id) DO NOTHING`,
				[promo.id, playerId],
			);
			await client.query(
				`UPDATE hytale_promocodes SET uses_count = 1, updated_at = now() WHERE id = $1`,
				[promo.id],
			);

			await client.query('COMMIT');

			// Фиксируем активацию в таблице покупок
			await pool.query(
				`UPDATE hytale_loot_pack_purchases SET activated_at = NOW() WHERE voucher_code = $1`,
				[code],
			);

			// Имя пака из первой строки
			const packNameRes = await pool.query<{ pack_name: string }>(
				`SELECT pack_name FROM hytale_market_item_pack_contents WHERE pack_id = $1 LIMIT 1`,
				[packId],
			);

			return NextResponse.json({
				ok: true,
				packName: packNameRes.rows[0]?.pack_name ?? packId,
				items: itemsRes.rows,
			});
		} catch (e) {
			try { await client.query('ROLLBACK'); } catch { /* ignore */ }
			throw e;
		} finally {
			client.release();
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
