import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPool } from '@/lib/db';
import { decodeSessionToken } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth-constants';
import { fetchPayments } from '@/lib/hytale';

async function requireAdmin(): Promise<boolean> {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token) return false;
	return (await decodeSessionToken(token)) != null;
}

export async function GET(req: Request) {
	try {
		if (!(await requireAdmin())) {
			return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
		}
		const url = new URL(req.url);
		const from = url.searchParams.get('from') ?? undefined;
		const to = url.searchParams.get('to') ?? undefined;
		const limitRaw = url.searchParams.get('limit');
		const limit = limitRaw ? Number(limitRaw) : undefined;

		const pool = getPool();
		const rows = await fetchPayments(pool, { from, to, limit });
		return NextResponse.json({ ok: true, rows });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

