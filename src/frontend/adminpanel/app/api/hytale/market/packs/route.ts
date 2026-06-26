import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/market-auth';

export async function GET() {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const pool = getPool();
		const { rows } = await pool.query(
			`SELECT id, pack_id, pack_name, item_id, quantity, sort_order, created_at, updated_at
			 FROM hytale_market_item_pack_contents
			 ORDER BY pack_id, sort_order, id`,
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

		const body = (await req.json()) as Partial<{
			packId: string;
			packName: string;
			itemId: string;
			quantity: number;
			sortOrder: number;
		}>;

		const packId = typeof body.packId === 'string' ? body.packId.trim() : '';
		const packName = typeof body.packName === 'string' ? body.packName.trim() : '';
		const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : '';
		const quantity = Math.max(1, Number(body.quantity) || 1);
		const sortOrder = Number(body.sortOrder) || 0;

		if (!packId) return NextResponse.json({ ok: false, error: 'packId обязателен' }, { status: 400 });
		if (!packName) return NextResponse.json({ ok: false, error: 'packName обязателен' }, { status: 400 });
		if (!itemId) return NextResponse.json({ ok: false, error: 'itemId обязателен' }, { status: 400 });

		const pool = getPool();
		const { rows } = await pool.query(
			`INSERT INTO hytale_market_item_pack_contents (pack_id, pack_name, item_id, quantity, sort_order)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING id, pack_id, pack_name, item_id, quantity, sort_order`,
			[packId, packName, itemId, quantity, sortOrder],
		);
		return NextResponse.json({ ok: true, row: rows[0] });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (/duplicate key|unique/i.test(msg)) {
			return NextResponse.json({ ok: false, error: 'такой предмет уже есть в паке' }, { status: 409 });
		}
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
