import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/market-auth';
import { RARITIES, validateItemId, type Rarity } from '@/lib/market-item';

const MAX_WHEEL_SLOTS = 12;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const { id } = await ctx.params;
		const rowId = Number(id);
		if (!Number.isFinite(rowId) || rowId <= 0) {
			return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 });
		}

		const body = (await req.json()) as Record<string, unknown>;
		const set: string[] = ['updated_at = now()'];
		const args: unknown[] = [];
		let i = 1;

		if (body.slotIndex != null) {
			const slot = Number(body.slotIndex);
			if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_WHEEL_SLOTS) {
				return NextResponse.json({ ok: false, error: `slotIndex: 0..${MAX_WHEEL_SLOTS - 1}` }, { status: 400 });
			}
			set.push(`slot_index = $${i++}`);
			args.push(slot);
		}
		if (typeof body.itemId === 'string') {
			const itemId = body.itemId.trim();
			const err = validateItemId(itemId);
			if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 });
			set.push(`item_id = $${i++}`);
			args.push(itemId);
		}
		if (body.weight != null) {
			set.push(`weight = $${i++}`);
			args.push(Math.max(1, Math.min(Number(body.weight) || 100, 1_000_000)));
		}
		if (body.qtyMin != null) {
			set.push(`qty_min = $${i++}`);
			args.push(Math.max(1, Math.min(Number(body.qtyMin) || 1, 1_000_000)));
		}
		if (body.qtyMax != null) {
			set.push(`qty_max = $${i++}`);
			args.push(Math.max(1, Math.min(Number(body.qtyMax) || 1, 1_000_000)));
		}
		if (typeof body.rarity === 'string') {
			if (!RARITIES.includes(body.rarity.trim() as Rarity)) {
				return NextResponse.json({ ok: false, error: 'неверная редкость' }, { status: 400 });
			}
			set.push(`rarity = $${i++}`);
			args.push(body.rarity.trim());
		}
		if (typeof body.isActive === 'boolean') {
			if (body.isActive) {
				const pool = getPool();
				const cur = await pool.query(
					`SELECT id, is_active FROM hytale_market_wheel_slots WHERE id = $1`,
					[rowId],
				);
				if (!cur.rows[0]) {
					return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
				}
				if (!cur.rows[0].is_active) {
					const { rows: cnt } = await pool.query(
						`SELECT COUNT(*)::int AS c FROM hytale_market_wheel_slots WHERE is_active = true`,
					);
					if ((cnt[0]?.c ?? 0) >= MAX_WHEEL_SLOTS) {
						return NextResponse.json(
							{ ok: false, error: `максимум ${MAX_WHEEL_SLOTS} активных секторов` },
							{ status: 400 },
						);
					}
				}
			}
			set.push(`is_active = $${i++}`);
			args.push(body.isActive);
		}

		if (set.length <= 1) {
			return NextResponse.json({ ok: false, error: 'nothing to update' }, { status: 400 });
		}

		args.push(rowId);
		const pool = getPool();
		const { rows } = await pool.query(
			`UPDATE hytale_market_wheel_slots SET ${set.join(', ')} WHERE id = $${i}
			RETURNING
				id, slot_index, item_id, weight, qty_min, qty_max, rarity,
				is_active, created_at, updated_at`,
			args,
		);

		if (!rows[0]) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
		return NextResponse.json({ ok: true, row: rows[0] });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (/duplicate key|unique/i.test(msg)) {
			return NextResponse.json({ ok: false, error: 'слот уже занят' }, { status: 409 });
		}
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const { id } = await ctx.params;
		const rowId = Number(id);
		if (!Number.isFinite(rowId) || rowId <= 0) {
			return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 });
		}

		const pool = getPool();
		const { rowCount } = await pool.query(`DELETE FROM hytale_market_wheel_slots WHERE id = $1`, [rowId]);
		if (!rowCount) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
		return NextResponse.json({ ok: true });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
