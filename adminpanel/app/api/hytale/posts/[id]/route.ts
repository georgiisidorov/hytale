import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPool } from '@/lib/db';
import { decodeSessionToken } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth-constants';

async function requireAdmin(): Promise<{ username: string } | null> {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token) return null;
	return await decodeSessionToken(token);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const { id } = await ctx.params;
		const postId = Number(id);
		if (!Number.isFinite(postId) || postId <= 0) {
			return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 });
		}

		const pool = getPool();
		const { rows } = await pool.query(
			`SELECT id, title, content, preview_url, is_published, created_by, created_at, updated_at
			 FROM hytale_posts WHERE id = $1`,
			[postId],
		);
		if (!rows[0]) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
		return NextResponse.json({ ok: true, row: rows[0] });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const { id } = await ctx.params;
		const postId = Number(id);
		if (!Number.isFinite(postId) || postId <= 0) {
			return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 });
		}

		const body = (await req.json()) as Partial<{
			title: string;
			content: string;
			previewUrl: string | null;
			isPublished: boolean;
		}>;

		const set: string[] = [];
		const args: Array<string | boolean | null | number> = [];
		let i = 1;

		if (typeof body.title === 'string') {
			const title = body.title.trim();
			if (!title) return NextResponse.json({ ok: false, error: 'title не может быть пустым' }, { status: 400 });
			set.push(`title = $${i++}`);
			args.push(title);
		}
		if (typeof body.content === 'string') {
			set.push(`content = $${i++}`);
			args.push(body.content);
		}
		if (body.previewUrl !== undefined) {
			const url = typeof body.previewUrl === 'string' && body.previewUrl.trim() ? body.previewUrl.trim() : null;
			set.push(`preview_url = $${i++}`);
			args.push(url);
		}
		if (typeof body.isPublished === 'boolean') {
			set.push(`is_published = $${i++}`);
			args.push(body.isPublished);
		}

		if (!set.length) {
			return NextResponse.json({ ok: false, error: 'nothing to update' }, { status: 400 });
		}

		args.push(postId);
		const pool = getPool();
		const { rows } = await pool.query(
			`UPDATE hytale_posts SET ${set.join(', ')} WHERE id = $${i}
			 RETURNING id, title, preview_url, is_published, created_by, created_at, updated_at`,
			args,
		);
		if (!rows[0]) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
		return NextResponse.json({ ok: true, row: rows[0] });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const { id } = await ctx.params;
		const postId = Number(id);
		if (!Number.isFinite(postId) || postId <= 0) {
			return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 });
		}

		const pool = getPool();
		const { rowCount } = await pool.query(`DELETE FROM hytale_posts WHERE id = $1`, [postId]);
		if (!rowCount) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
		return NextResponse.json({ ok: true });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
