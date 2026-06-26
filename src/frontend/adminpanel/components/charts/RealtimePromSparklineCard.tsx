'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { Sparkline } from './Sparkline';

type Props = {
	title: string;
	query: string;
	windowSec?: number;
	stepSec?: number;
	refreshMs?: number;
	valueSuffix?: string;
	valueDecimals?: number;
	hint?: string;
	hintQuery?: string;
	hintTemplate?: string;
};

function clamp(n: number) {
	if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
	return n;
}

export function RealtimePromSparklineCard({
	title,
	query,
	windowSec = 10 * 60,
	stepSec = 1,
	refreshMs = 1_000,
	valueSuffix = '',
	valueDecimals = 0,
	hint,
	hintQuery,
	hintTemplate,
}: Props) {
	const [values, setValues] = useState<number[]>([]);
	const [status, setStatus] = useState<'loading' | 'ok' | 'empty' | 'error'>('loading');
	const [hintValue, setHintValue] = useState<number | null>(null);

	const last = useMemo(() => {
		const v = values.at(-1);
		if (v === undefined) return null;
		return clamp(v);
	}, [values]);

	useEffect(() => {
		let cancelled = false;

		async function tick() {
			try {
				const now = Math.floor(Date.now() / 1000);
				const start = now - windowSec;
				const u = new URL('/api/prometheus/query_range', window.location.origin);
				u.searchParams.set('query', query);
				u.searchParams.set('start', String(start));
				u.searchParams.set('end', String(now));
				u.searchParams.set('stepSec', String(stepSec));

				const res = await fetch(u.toString(), { cache: 'no-store' });
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const j = (await res.json()) as { values?: number[] };
				const vs = (j.values || []).map((n) => Number(n)).filter((n) => Number.isFinite(n));
				if (cancelled) return;
				setValues(vs);
				setStatus(vs.length >= 2 ? 'ok' : 'empty');
			} catch {
				if (cancelled) return;
				setStatus('error');
			}
		}

		tick();
		const id = window.setInterval(tick, refreshMs);
		return () => {
			cancelled = true;
			window.clearInterval(id);
		};
	}, [query, refreshMs, stepSec, windowSec]);

	useEffect(() => {
		if (!hintQuery) return;
		const q = hintQuery;
		let cancelled = false;

		async function tick() {
			try {
				const u = new URL('/api/prometheus/query', window.location.origin);
				u.searchParams.set('query', q);
				const res = await fetch(u.toString(), { cache: 'no-store' });
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const j = (await res.json()) as { value?: number | null };
				const v = j.value ?? null;
				if (cancelled) return;
				setHintValue(typeof v === 'number' && Number.isFinite(v) ? v : null);
			} catch {
				if (cancelled) return;
				setHintValue(null);
			}
		}

		tick();
		const id = window.setInterval(tick, 30_000);
		return () => {
			cancelled = true;
			window.clearInterval(id);
		};
	}, [hintQuery]);

	const overlayValue =
		last === null
			? ''
			: Number.isFinite(last)
				? `${last.toFixed(valueDecimals)}${valueSuffix}`
				: '';
	const emptyLabel = status === 'error' ? 'ошибка' : status === 'loading' ? 'загрузка…' : 'нет данных';
	const hintText = hintTemplate
		? hintTemplate.replace('{value}', hintValue === null ? '?' : String(Math.round(hintValue)))
		: hint || '';

	return (
		<div className="stat-card stat-card-compact" style={{ height: '100%', minHeight: 0 }}>
			<div className="stat-card-header" style={{ marginBottom: 10 }}>
				<div style={{ position: 'relative', paddingRight: 64, width: '100%' }}>
					<h3>{title}</h3>
					{overlayValue ? (
						<div style={{ position: 'absolute', right: 0, top: 0, color: '#ffffff', fontSize: 18, fontWeight: 500, lineHeight: 1.1 }}>
							{overlayValue}
						</div>
					) : null}
				</div>
				{hintText ? (
					<div
						style={{
							marginTop: 2,
							color: 'rgba(255,255,255,0.72)',
							fontSize: 12,
							whiteSpace: 'nowrap',
							overflow: 'visible',
							textOverflow: 'clip',
						}}
						title={hintText}
					>
						{hintText}
					</div>
				) : null}
			</div>
			<div className="stat-card-value" style={{ alignItems: 'stretch', flex: 1, minHeight: 0 }}>
				<Sparkline values={values} fillParent emptyLabel={emptyLabel} />
			</div>
		</div>
	);
}

