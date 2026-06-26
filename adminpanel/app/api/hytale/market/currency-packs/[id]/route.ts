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

		const body = (await req.json()) as Partial<{ packName: string; priceRub: number; amount: number; isActive: boolean; sortOrder: number }>;

		const fields: string[] = [];
		const values: unknown[] = [];
		let idx = 1;
		if (typeof body.packName === 'string' && body.packName.trim()) { fields.push(`pack_name=$${idx++}`); values.push(body.packName.trim()); }
		if (body.priceRub !== undefined) { fields.push(`price_rub=$${idx++}`); values.push(Math.max(1, Number(body.priceRub))); }
		if (body.amount    !== undefined) { fields.push(`amount=$${idx++}`);    values.push(Math.max(1, Number(body.amount))); }
		if (body.isActive  !== undefined) { fields.push(`is_active=$${idx++}`); values.push(Boolean(body.isActive)); }
		if (body.sortOrder !== undefined) { fields.push(`sort_order=$${idx++}`); values.push(Number(body.sortOrder)); }
		if (!fields.length) return NextResponse.json({ ok: false, error: 'нет полей' }, { status: 400 });

		fields.push('updated_at=now()');
		values.push(rowId);
		await getPool().query(`UPDATE hytale_market_currency_packs SET ${fields.join(', ')} WHERE id=$${idx}`, values);
		return NextResponse.json({ ok: true });
	} catch (e) {
		return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
	}
}
