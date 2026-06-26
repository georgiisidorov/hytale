import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/market-auth';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const { id } = await ctx.params;
		const rowId = Number(id);
		if (!rowId) return NextResponse.json({ ok: false, error: 'неверный id' }, { status: 400 });

		const body = (await req.json()) as Partial<{
			packName: string;
			itemId: string;
			quantity: number;
			sortOrder: number;
		}>;

		const pool = getPool();
		const fields: string[] = [];
		const values: unknown[] = [];
		let idx = 1;

		if (typeof body.packName === 'string' && body.packName.trim()) {
			// Обновляем pack_name у всех строк этого пака
			const cur = await pool.query(`SELECT pack_id FROM hytale_market_item_pack_contents WHERE id=$1`, [rowId]);
			if (cur.rows.length) {
				await pool.query(
					`UPDATE hytale_market_item_pack_contents SET pack_name=$1, updated_at=now() WHERE pack_id=$2`,
					[body.packName.trim(), cur.rows[0].pack_id],
				);
			}
			return NextResponse.json({ ok: true });
		}
		if (typeof body.itemId === 'string' && body.itemId.trim()) {
			fields.push(`item_id=$${idx++}`); values.push(body.itemId.trim());
		}
		if (body.quantity !== undefined) {
			fields.push(`quantity=$${idx++}`); values.push(Math.max(1, Number(body.quantity)));
		}
		if (body.sortOrder !== undefined) {
			fields.push(`sort_order=$${idx++}`); values.push(Number(body.sortOrder));
		}
		if (!fields.length) return NextResponse.json({ ok: false, error: 'нет полей для обновления' }, { status: 400 });

		fields.push(`updated_at=now()`);
		values.push(rowId);
		await pool.query(
			`UPDATE hytale_market_item_pack_contents SET ${fields.join(', ')} WHERE id=$${idx}`,
			values,
		);
		return NextResponse.json({ ok: true });
	} catch (e) {
		return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
	}
}

export async function DELETE(_req: Request, ctx: Ctx) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const { id } = await ctx.params;
		const rowId = Number(id);
		if (!rowId) return NextResponse.json({ ok: false, error: 'неверный id' }, { status: 400 });

		const pool = getPool();
		await pool.query(`DELETE FROM hytale_market_item_pack_contents WHERE id=$1`, [rowId]);
		return NextResponse.json({ ok: true });
	} catch (e) {
		return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
	}
}
