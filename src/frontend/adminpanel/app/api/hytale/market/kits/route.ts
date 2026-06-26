import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/market-auth';

export async function GET() {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
		const { rows } = await getPool().query(
			`SELECT id, kit_id, kit_name, item_id, quantity, sort_order, created_at, updated_at
			 FROM hytale_market_kits ORDER BY kit_id, sort_order, id`,
		);
		return NextResponse.json({ ok: true, rows });
	} catch (e) {
		return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
	}
}

export async function POST(req: Request) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const body = (await req.json()) as Partial<{ kitId: string; kitName: string; itemId: string; quantity: number; sortOrder: number }>;
		const kitId   = typeof body.kitId   === 'string' ? body.kitId.trim()   : '';
		const kitName = typeof body.kitName === 'string' ? body.kitName.trim() : '';
		const itemId  = typeof body.itemId  === 'string' ? body.itemId.trim()  : '';
		if (!kitId)   return NextResponse.json({ ok: false, error: 'kitId обязателен' },   { status: 400 });
		if (!kitName) return NextResponse.json({ ok: false, error: 'kitName обязателен' }, { status: 400 });
		if (!itemId)  return NextResponse.json({ ok: false, error: 'itemId обязателен' },  { status: 400 });

		const { rows } = await getPool().query(
			`INSERT INTO hytale_market_kits (kit_id, kit_name, item_id, quantity, sort_order)
			 VALUES ($1,$2,$3,$4,$5) RETURNING id, kit_id, kit_name, item_id, quantity, sort_order`,
			[kitId, kitName, itemId, Math.max(1, Number(body.quantity) || 1), Number(body.sortOrder) || 0],
		);
		return NextResponse.json({ ok: true, row: rows[0] });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (/duplicate key|unique/i.test(msg))
			return NextResponse.json({ ok: false, error: 'такой предмет уже есть в ките' }, { status: 409 });
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
