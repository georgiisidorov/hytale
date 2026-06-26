import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authorizeCatalogOrIcon } from '@/lib/market-auth';
import { applyShopLocalesFast, applyWheelLocalesFast } from '@/lib/market-locale';

export async function GET(req: Request) {
	try {
		if (!(await authorizeCatalogOrIcon(req))) {
			return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
		}

		const pool = getPool();
		const [shopRes, wheelRes, rewardsRes] = await Promise.all([
			pool.query(
				`SELECT
					id, item_id, category, ui_category, display_name, description,
					stat1, stat2, stat3, quantity, rarity, price, currency,
					sort_order, is_active, updated_at
				FROM hytale_market_shop_items
				WHERE is_active = true
				ORDER BY sort_order ASC, id ASC`,
			),
			pool.query(
				`SELECT
					id, slot_index, item_id, weight, qty_min, qty_max, rarity, is_active, updated_at
				FROM hytale_market_wheel_slots
				WHERE is_active = true
				ORDER BY slot_index ASC`,
			),
			pool.query(
				`SELECT
					id, reward_id, rarity, reward_type, item_id, quantity, weight, display_name_ru, is_active, updated_at
				FROM hytale_market_wheel_rewards
				WHERE is_active = true
				ORDER BY id ASC`,
			),
		]);

		const version = Math.max(
			0,
			...shopRes.rows.map((r: { updated_at?: Date }) => new Date(r.updated_at ?? 0).getTime()),
			...wheelRes.rows.map((r: { updated_at?: Date }) => new Date(r.updated_at ?? 0).getTime()),
			...rewardsRes.rows.map((r: { updated_at?: Date }) => new Date(r.updated_at ?? 0).getTime()),
		);

		const [shop, wheel] = await Promise.all([
			applyShopLocalesFast(shopRes.rows),
			applyWheelLocalesFast(wheelRes.rows),
		]);

		return NextResponse.json({
			ok: true,
			version,
			shop,
			wheel,
			wheel_rewards: rewardsRes.rows,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
