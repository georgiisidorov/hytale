import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { fetchPayments } from '@/lib/hytale';

export async function GET(req: Request) {
	try {
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

