import { NextResponse } from 'next/server';

type PromVector = {
	resultType: 'vector';
	result: Array<{
		metric: Record<string, string>;
		value: [number, string];
	}>;
};

type PromQueryResponse =
	| { status: 'success'; data: PromVector }
	| { status: 'error'; errorType: string; error: string };

function promUrl(): string {
	return (process.env.PROMETHEUS_URL || 'http://hytale-prometheus:9090').trim();
}

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const query = (searchParams.get('query') || '').trim();
	if (!query) {
		return NextResponse.json({ error: 'query is required' }, { status: 400 });
	}

	const u = new URL('/api/v1/query', promUrl());
	u.searchParams.set('query', query);

	const res = await fetch(u.toString(), { cache: 'no-store' });
	if (!res.ok) {
		return NextResponse.json({ error: `Prometheus HTTP ${res.status}` }, { status: 502 });
	}
	const j = (await res.json()) as PromQueryResponse;
	if (j.status !== 'success') {
		return NextResponse.json({ error: `Prometheus error: ${j.errorType}: ${j.error}` }, { status: 502 });
	}

	const first = j.data.result[0];
	const value = Number(first?.value?.[1]);
	if (!Number.isFinite(value)) {
		return NextResponse.json({ value: null });
	}
	return NextResponse.json({ value });
}

