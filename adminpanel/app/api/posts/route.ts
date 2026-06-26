import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 1), 100);
		const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

		const pool = getPool();

		const { rows } = await pool.query(
			`SELECT id, title, preview_url, created_at
			 FROM hytale_posts
			 WHERE is_published = TRUE
			 ORDER BY created_at DESC
			 LIMIT $1 OFFSET $2`,
			[limit, offset],
		);

		const { rows: countRows } = await pool.query(
			`SELECT COUNT(*)::int AS total FROM hytale_posts WHERE is_published = TRUE`,
		);

		return NextResponse.json({ ok: true, rows, total: countRows[0].total, limit, offset });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
