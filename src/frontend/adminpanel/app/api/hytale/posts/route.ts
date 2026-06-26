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

export async function GET() {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const pool = getPool();
		const { rows } = await pool.query(
			`SELECT id, title, preview_url, is_published, created_by, created_at, updated_at
			 FROM hytale_posts
			 ORDER BY created_at DESC`,
		);
		return NextResponse.json({ ok: true, rows });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

export async function POST(req: Request) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const body = (await req.json()) as Partial<{
			title: string;
			content: string;
			previewUrl: string | null;
			isPublished: boolean;
		}>;

		const title = typeof body.title === 'string' ? body.title.trim() : '';
		if (!title) return NextResponse.json({ ok: false, error: 'title обязателен' }, { status: 400 });
		if (title.length > 500) return NextResponse.json({ ok: false, error: 'title слишком длинный' }, { status: 400 });

		const content = typeof body.content === 'string' ? body.content : '';
		const previewUrl = typeof body.previewUrl === 'string' && body.previewUrl.trim() ? body.previewUrl.trim() : null;
		const isPublished = body.isPublished === true;

		const pool = getPool();
		const { rows } = await pool.query(
			`INSERT INTO hytale_posts(title, content, preview_url, is_published, created_by)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING id, title, preview_url, is_published, created_by, created_at, updated_at`,
			[title, content, previewUrl, isPublished, admin.username],
		);
		return NextResponse.json({ ok: true, row: rows[0] });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
