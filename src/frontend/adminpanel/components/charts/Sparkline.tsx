'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
	values: number[];
	height?: number;
	fillParent?: boolean;
	stroke?: string;
	fill?: string;
	minPoints?: number;
	emptyLabel?: string;
};

function clamp(n: number) {
	if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
	return n;
}

export function Sparkline({
	values,
	height = 56,
	fillParent = false,
	stroke = '#ffffff',
	fill = 'rgba(255, 255, 255, 0.12)',
	minPoints = 2,
	emptyLabel = 'нет данных',
}: Props) {
	const wrapRef = useRef<HTMLDivElement | null>(null);
	const [width, setWidth] = useState<number>(0);
	const [measuredHeight, setMeasuredHeight] = useState<number>(height);

	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return;

		const ro = new ResizeObserver((entries) => {
			const w = Math.floor(entries[0]?.contentRect?.width ?? 0);
			setWidth((prev) => (prev === w ? prev : w));
			if (fillParent) {
				const h = Math.floor(entries[0]?.contentRect?.height ?? 0);
				if (h > 0) setMeasuredHeight((prev) => (prev === h ? prev : h));
			}
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, [fillParent]);

	const hPx = fillParent ? measuredHeight : height;

	const { points, areaPoints, gridY } = useMemo(() => {
		const vs = values.map((v) => clamp(v));
		if (vs.length < minPoints || width <= 2) return { points: '', areaPoints: '', gridY: [] as number[] };
		const min = Math.min(...vs);
		const max = Math.max(...vs);
		const span = max - min || 1;
		const padX = 6;
		const padY = 2;
		const w = Math.max(1, width - padX * 2);
		const h = Math.max(1, hPx - padY * 2);
		const xs = vs.length === 1 ? [0.5] : vs.map((_, i) => i / (vs.length - 1));
		const pts = xs
			.map((x, i) => {
				const y01 = (vs[i] - min) / span;
				const xPx = padX + x * w;
				const yPx = padY + (1 - y01) * h;
				return `${xPx.toFixed(2)},${yPx.toFixed(2)}`;
			})
			.join(' ');
		const area = `${padX},${hPx - padY} ${pts} ${width - padX},${hPx - padY}`;
		const gy = [0.0, 0.5, 1.0].map((t) => padY + t * h);
		return { points: pts, areaPoints: area, gridY: gy };
	}, [values, width, hPx, minPoints]);

	if (!points) {
		return (
			<div
				ref={wrapRef}
				style={{
					height: fillParent ? '100%' : height,
					width: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color: 'rgba(255,255,255,0.7)',
					fontSize: 12,
					background: 'rgba(255,255,255,0.06)',
					borderRadius: 8,
				}}
			>
				{emptyLabel}
			</div>
		);
	}

	return (
		<div ref={wrapRef} style={{ width: '100%', height: fillParent ? '100%' : height }}>
			<svg width={width} height={hPx} viewBox={`0 0 ${width} ${hPx}`} aria-hidden="true">
				{gridY.map((y) => (
					<line key={y} x1={0} x2={width} y1={y} y2={y} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
				))}
				<polyline points={areaPoints} fill={fill} stroke="none" />
				<polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</div>
	);
}

