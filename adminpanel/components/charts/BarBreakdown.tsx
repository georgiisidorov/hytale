'use client';

import React, { useMemo } from 'react';

export type BarItem = { label: string; value: number; color: string };

type Props = {
	items: BarItem[];
	height?: number;
};

export function BarBreakdown({ items, height = 10 }: Props) {
	const { total, segments } = useMemo(() => {
		const vs = items.map((i) => Math.max(0, Number(i.value) || 0));
		const t = vs.reduce((a, b) => a + b, 0) || 1;
		let acc = 0;
		const segs = items.map((it, idx) => {
			const v = vs[idx];
			const w = (v / t) * 100;
			const left = acc;
			acc += w;
			return { ...it, pct: w, left };
		});
		return { total: t, segments: segs };
	}, [items]);

	return (
		<div>
			<div
				style={{
					position: 'relative',
					width: '100%',
					height,
					borderRadius: 999,
					overflow: 'hidden',
					background: 'rgba(0,0,0,0.06)',
				}}
			>
				{segments.map((s) => (
					<div
						key={s.label}
						title={`${s.label}: ${s.value}`}
						style={{
							position: 'absolute',
							left: `${s.left}%`,
							top: 0,
							bottom: 0,
							width: `${s.pct}%`,
							background: s.color,
						}}
					/>
				))}
			</div>
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
				{items.map((it) => (
					<div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ffffff', fontSize: 12 }}>
						<span style={{ width: 10, height: 10, borderRadius: 3, background: it.color, display: 'inline-block' }} />
						<span>
							{it.label}: <b>{it.value}</b>
						</span>
					</div>
				))}
				<div style={{ marginLeft: 'auto', color: '#ddd', fontSize: 12 }}>Всего: {total}</div>
			</div>
		</div>
	);
}

