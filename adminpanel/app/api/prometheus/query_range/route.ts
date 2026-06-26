import { NextResponse } from 'next/server';

type PromSeries = {
	resultType: 'matrix';
	result: Array<{
		metric: Record<string, string>;
		values: Array<[number, string]>;
	}>;
};

type PromQueryRangeResponse =
	| { status: 'success'; data: PromSeries }
	| { status: 'error'; errorType: string; error: string };

function promUrl(): string {
	return (process.env.PROMETHEUS_URL || 'http://hytale-prometheus:9090').trim();
}

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const query = (searchParams.get('query') || '').trim();
	const start = Number(searchParams.get('start'));
	const end = Number(searchParams.get('end'));
	const stepSec = Number(searchParams.get('stepSec'));

	if (!query) {
		return NextResponse.json({ error: 'query is required' }, { status: 400 });
	}
	if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(stepSec) || stepSec <= 0) {
		return NextResponse.json({ error: 'start/end/stepSec are required numbers' }, { status: 400 });
	}
	if (end <= start) {
		return NextResponse.json({ error: 'end must be > start' }, { status: 400 });
	}

	const u = new URL('/api/v1/query_range', promUrl());
	u.searchParams.set('query', query);
	u.searchParams.set('start', String(start));
	u.searchParams.set('end', String(end));
	u.searchParams.set('step', String(stepSec));

	const res = await fetch(u.toString(), { cache: 'no-store' });
	if (!res.ok) {
		return NextResponse.json({ error: `Prometheus HTTP ${res.status}` }, { status: 502 });
	}
	const j = (await res.json()) as PromQueryRangeResponse;
	if (j.status !== 'success') {
		return NextResponse.json({ error: `Prometheus error: ${j.errorType}: ${j.error}` }, { status: 502 });
	}

	const first = j.data.result[0];
	const values = (first?.values || []).map(([, v]) => Number(v)).filter((n) => Number.isFinite(n));

	return NextResponse.json({ values });
}

