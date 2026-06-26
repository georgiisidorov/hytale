import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/market-auth';
import { RARITIES, deriveCategory, deriveDisplayName, validateItemId, type Rarity } from '@/lib/market-item';
import { applyWheelLocalesFast } from '@/lib/market-locale';

function badRequest(message: string) {
	return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

const MAX_WHEEL_SLOTS = 12;

export async function GET(req: Request) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const url = new URL(req.url);
		const includeInactive = url.searchParams.get('all') === '1';
		const pool = getPool();
		const where = includeInactive ? '' : 'WHERE is_active = true';
		const { rows } = await pool.query(
			`SELECT
				id, slot_index, item_id, weight, qty_min, qty_max, rarity,
				is_active, created_at, updated_at
			FROM hytale_market_wheel_slots
			${where}
			ORDER BY slot_index ASC`,
		);

		return NextResponse.json({ ok: true, rows: await applyWheelLocalesFast(rows) });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

export async function POST(req: Request) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const body = (await req.json()) as Partial<{
			slotIndex: number;
			itemId: string;
			weight: number;
			qtyMin: number;
			qtyMax: number;
			rarity: string;
			isActive: boolean;
		}>;

		const slotIndex = Number(body.slotIndex);
		if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= MAX_WHEEL_SLOTS) {
			return badRequest(`slotIndex: 0..${MAX_WHEEL_SLOTS - 1}`);
		}

		const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : '';
		const idErr = validateItemId(itemId);
		if (idErr) return badRequest(idErr);

		const pool = getPool();
		const activeCount = await pool.query(
			`SELECT COUNT(*)::int AS c FROM hytale_market_wheel_slots WHERE is_active = true`,
		);
		const isActive = body.isActive === false ? false : true;
		if (isActive && (activeCount.rows[0]?.c ?? 0) >= MAX_WHEEL_SLOTS) {
			return badRequest(`максимум ${MAX_WHEEL_SLOTS} активных секторов`);
		}

		const weight = Math.max(1, Math.min(Number(body.weight) || 100, 1_000_000));
		const qtyMin = Math.max(1, Math.min(Number(body.qtyMin) || 1, 1_000_000));
		const qtyMax = Math.max(qtyMin, Math.min(Number(body.qtyMax) || qtyMin, 1_000_000));

		const rarity = typeof body.rarity === 'string' ? body.rarity.trim() : 'Common';
		if (!RARITIES.includes(rarity as Rarity)) return badRequest('неверная редкость');

		// category hint for UI (not stored)
		void deriveCategory(itemId);
		void deriveDisplayName(itemId);

		const { rows } = await pool.query(
			`INSERT INTO hytale_market_wheel_slots (
				slot_index, item_id, weight, qty_min, qty_max, rarity, is_active
			) VALUES ($1,$2,$3,$4,$5,$6,$7)
			RETURNING
				id, slot_index, item_id, weight, qty_min, qty_max, rarity,
				is_active, created_at, updated_at`,
			[slotIndex, itemId, weight, qtyMin, qtyMax, rarity, isActive],
		);

		return NextResponse.json({ ok: true, row: rows[0] });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (/duplicate key|unique/i.test(msg)) {
			return NextResponse.json({ ok: false, error: 'этот слот уже занят' }, { status: 409 });
		}
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
