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
	return (process.env.PROMETHEUS_URL || 'http://target_ads_prometheus:9090').trim();
}

export async function queryRange(
	query: string,
	opts: { start: number; end: number; stepSec: number },
): Promise<number[]> {
	const u = new URL('/api/v1/query_range', promUrl());
	u.searchParams.set('query', query);
	u.searchParams.set('start', String(opts.start));
	u.searchParams.set('end', String(opts.end));
	u.searchParams.set('step', String(opts.stepSec));

	const res = await fetch(u.toString(), { cache: 'no-store' });
	if (!res.ok) {
		throw new Error(`Prometheus HTTP ${res.status}`);
	}
	const j = (await res.json()) as PromQueryRangeResponse;
	if (j.status !== 'success') {
		throw new Error(`Prometheus error: ${j.errorType}: ${j.error}`);
	}
	const first = j.data.result[0];
	if (!first?.values?.length) return [];
	return first.values.map(([, v]) => Number(v));
}

