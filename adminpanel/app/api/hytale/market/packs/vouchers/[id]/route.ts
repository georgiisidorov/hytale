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

		const body = (await req.json()) as Partial<{ isActive: boolean }>;
		if (typeof body.isActive !== 'boolean') {
			return NextResponse.json({ ok: false, error: 'isActive обязателен' }, { status: 400 });
		}

		const pool = getPool();
		await pool.query(
			`UPDATE hytale_promocodes SET is_active=$1, updated_at=now() WHERE id=$2`,
			[body.isActive, rowId],
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
		await pool.query(`DELETE FROM hytale_promocode_redemptions WHERE promo_code_id=$1`, [rowId]);
		await pool.query(`DELETE FROM hytale_promocodes WHERE id=$1`, [rowId]);
		return NextResponse.json({ ok: true });
	} catch (e) {
		return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
	}
}
