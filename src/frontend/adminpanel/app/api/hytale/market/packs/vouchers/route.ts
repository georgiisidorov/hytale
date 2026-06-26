import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/market-auth';

export async function GET(req: Request) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const url = new URL(req.url);
		const q = url.searchParams.get('q')?.trim() ?? '';
		const pool = getPool();

		const { rows } = await pool.query(
			`SELECT
				p.id, p.code,
				p.payload->>'pack_id'      AS pack_id,
				p.payload->>'payment_id'   AS payment_id,
				p.payload->>'target_uuid'  AS target_uuid,
				p.uses_count, p.is_active,
				p.ends_at, p.created_at, p.updated_at,
				r.player_id AS redeemed_by_player_id,
				pl.username AS redeemed_uuid
			 FROM hytale_promocodes p
			 LEFT JOIN hytale_promocode_redemptions r ON r.promo_code_id = p.id
			 LEFT JOIN hytale_players pl ON pl.id = r.player_id
			 WHERE p.payload->>'type' = 'pack_voucher'
			   AND ($1 = '' OR p.code ILIKE '%' || $1 || '%'
			              OR p.payload->>'pack_id' ILIKE '%' || $1 || '%'
			              OR p.payload->>'payment_id' ILIKE '%' || $1 || '%')
			 ORDER BY p.id DESC
			 LIMIT 200`,
			[q],
		);
		return NextResponse.json({ ok: true, rows });
	} catch (e) {
		return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
	}
}
