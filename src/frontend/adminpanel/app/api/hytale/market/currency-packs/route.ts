import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authorizeCatalogOrIcon, requireAdmin } from '@/lib/market-auth';

export async function GET(req: Request) {
	// Поддерживаем X-Market-Key (Java) и admin-сессию
	if (!await authorizeCatalogOrIcon(req)) {
		return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
	}
	try {
		const { rows } = await getPool().query(
			`SELECT id, pack_id, pack_name, pack_type, price_rub, amount, is_active, sort_order
			 FROM hytale_market_currency_packs
			 ORDER BY pack_type, sort_order, id`,
		);
		return NextResponse.json({ ok: true, rows });
	} catch (e) {
		return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
	}
}
