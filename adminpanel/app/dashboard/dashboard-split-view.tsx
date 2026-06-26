'use client';

import React from 'react';
import { RealtimePromSparklineCard } from '../../components/charts/RealtimePromSparklineCard';
import { ContainerLogsPanel } from '../../components/godmode/ContainerLogsPanel';
import { ServerRestartPanel } from '../../components/godmode/ServerRestartPanel';

const LS_KEY = 'dashboard_split_top_px_v1';

export function DashboardSplitView() {
	const containerRef = React.useRef<HTMLDivElement | null>(null);
	const draggingRef = React.useRef(false);

	const [topPx, setTopPx] = React.useState<number | null>(null);
	const [containerH, setContainerH] = React.useState<number>(0);

	const DIVIDER_LINE_H = 5;
	const DIVIDER_HIT_H = 15; // зона захвата разделителя
	/** Вертикальный зазор между низом графиков и разделителем и между разделителем и блоком «Логи» */
	const SECTION_GAP_Y = 12;
	const MIN_CHARTS_H = 260; // ниже этого графики не сжимаем, дальше — overlay логов
const MIN_LOGS_H = 220; // чтобы логи оставались юзабельными
const INSET = 20; // совпадает с отступом контента дашборда
const LOGS_RESTART_GAP = 12;

	React.useEffect(() => {
		const raw = window.localStorage.getItem(LS_KEY);
		if (!raw) return;
		const n = Number(raw);
		if (!Number.isFinite(n) || n <= 0) return;
		setTopPx(n);
	}, []);

	React.useEffect(() => {
		if (topPx == null) return;
		window.localStorage.setItem(LS_KEY, String(Math.round(topPx)));
	}, [topPx]);

	React.useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => {
			setContainerH(el.clientHeight);
		});
		ro.observe(el);
		setContainerH(el.clientHeight);
		return () => ro.disconnect();
	}, []);

	function clampTop(next: number, innerH: number) {
		// split = расстояние от верха внутренней области до верха зоны разделителя
		const maxSplit = Math.max(
			0,
			innerH - MIN_LOGS_H - DIVIDER_HIT_H - SECTION_GAP_Y,
		);
		return Math.min(Math.max(next, 0), maxSplit);
	}

	function onDividerMouseDown(e: React.MouseEvent) {
		e.preventDefault();
		draggingRef.current = true;
		const el = containerRef.current;
		if (!el) return;

		// initialize from current split if not set
		const innerH = Math.max(0, el.clientHeight - INSET * 2);
		if (topPx == null) {
			setTopPx(clampTop((innerH * 0.5) | 0, innerH));
		}

		const startY = e.clientY;
		const startTop = topPx ?? innerH * 0.5;

		function onMove(ev: MouseEvent) {
			if (!draggingRef.current) return;
			const dy = ev.clientY - startY;
			const c = containerRef.current;
			if (!c) return;
			const inner = Math.max(0, c.clientHeight - INSET * 2);
			setTopPx(clampTop(startTop + dy, inner));
		}

		function onUp() {
			draggingRef.current = false;
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		}

		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	return (
		<div
			ref={containerRef}
			className="dashboard-statistics dashboard-page"
			style={{
				position: 'relative',
				minHeight: 0,
				height: '100%',
				overflow: 'hidden',
				padding: INSET,
				boxSizing: 'border-box',
			}}
		>
			{(() => {
				const innerH = Math.max(0, containerH - INSET * 2);
				const split = clampTop(
					topPx ?? Math.max(0, (innerH * 0.5) | 0),
					innerH,
				);
				// Зазор над разделителем: низ графиков = split - SECTION_GAP_Y; при overlay высота не ниже MIN_CHARTS_H
				const chartsH = Math.max(split - SECTION_GAP_Y, MIN_CHARTS_H);
				const dividerTop = INSET + split;
				const logsTop = dividerTop + DIVIDER_HIT_H + SECTION_GAP_Y;
				const dividerPad = (DIVIDER_HIT_H - DIVIDER_LINE_H) / 2;
				return (
					<>
						<div
							style={{
								position: 'absolute',
								left: INSET,
								right: INSET,
								top: INSET,
								height: chartsH,
								minHeight: 0,
								display: 'flex',
								zIndex: 10,
							}}
						>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
									gridAutoRows: 'minmax(0, 1fr)',
									gap: 14,
									flex: 1,
									minHeight: 0,
								}}
							>
								<RealtimePromSparklineCard
									title="CPU"
									query={`100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])))`}
									valueSuffix="%"
									valueDecimals={0}
								/>
								<RealtimePromSparklineCard
									title="RAM"
									query={`100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))`}
									valueSuffix="%"
									valueDecimals={0}
								/>
								<RealtimePromSparklineCard
									title="Диск"
									query={`100 * (1 - (node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}))`}
									valueSuffix="%"
									valueDecimals={0}
								/>
								<RealtimePromSparklineCard title="Нагрузка" query={`node_load1`} valueDecimals={2} />
							</div>
						</div>

						<div
							onMouseDown={onDividerMouseDown}
							role="separator"
							aria-orientation="horizontal"
							title="Тяни, чтобы изменить высоту"
							style={{
								position: 'absolute',
								left: INSET,
								right: INSET,
								top: dividerTop,
								height: DIVIDER_HIT_H,
								cursor: 'row-resize',
								borderRadius: 999,
								background: 'transparent',
								zIndex: 30,
							}}
						/>
						<div
							aria-hidden="true"
							style={{
								position: 'absolute',
								left: INSET,
								right: INSET,
								top: dividerTop + dividerPad,
								height: DIVIDER_LINE_H,
								borderRadius: 999,
								background: 'var(--godmode-accent)',
								border: 'none',
								pointerEvents: 'none',
								zIndex: 31,
							}}
						/>

						<div
							className="dashboard-logs-bottom"
							style={{
								position: 'absolute',
								left: INSET,
								right: INSET,
								top: logsTop,
								bottom: INSET,
								minHeight: 0,
								overflow: 'hidden',
								display: 'flex',
								flexDirection: 'row',
								alignItems: 'stretch',
								gap: LOGS_RESTART_GAP,
								zIndex: 20,
								boxSizing: 'border-box',
							}}
						>
							<div
								className="dashboard-logs-card"
								style={{
									flex: 1,
									minWidth: 0,
									minHeight: 0,
									overflow: 'hidden',
									display: 'flex',
									flexDirection: 'column',
									background: 'var(--godmode-bg-primary)',
									border: '2px solid var(--godmode-border)',
									borderRadius: 8,
									padding: 20,
									boxSizing: 'border-box',
								}}
							>
								<h3 className="targetads-section-title" style={{ marginTop: 0, flexShrink: 0 }}>
									Логи
								</h3>
								<div style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex' }}>
									<ContainerLogsPanel />
								</div>
							</div>
							<ServerRestartPanel />
						</div>
					</>
				);
			})()}
		</div>
	);
}

