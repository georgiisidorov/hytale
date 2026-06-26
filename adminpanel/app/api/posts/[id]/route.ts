import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await ctx.params;
		const postId = Number(id);
		if (!Number.isFinite(postId) || postId <= 0) {
			return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 });
		}

		const pool = getPool();
		const { rows } = await pool.query(
			`SELECT id, title, content, preview_url, created_by, created_at, updated_at
			 FROM hytale_posts
			 WHERE id = $1 AND is_published = TRUE`,
			[postId],
		);

		if (!rows[0]) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
		return NextResponse.json({ ok: true, post: rows[0] });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
