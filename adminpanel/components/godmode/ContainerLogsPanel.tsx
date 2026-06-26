'use client';

import React from 'react';
import type { AllowedContainer } from '../../lib/container-logs';
import { iconChevronDown, iconSync } from '@sit-onyx/icons';
import { Icon } from './Icon';

const OPTIONS: { id: AllowedContainer; label: string }[] = [
	{ id: 'all', label: 'Все' },
	{ id: 'admin-auth', label: 'auth-log' },
	{ id: 'hytale-caddy', label: 'caddy' },
	{ id: 'hytale-adminpanel', label: 'adminpanel' },
	{ id: 'hytale-admin-db', label: 'postgres' },
	{ id: 'hytale-prometheus', label: 'prometheus' },
	{ id: 'hytale-node-exporter', label: 'node_exporter' },
	{ id: 'hytale-cadvisor', label: 'cadvisor' },
	{ id: 'hytale-server-dev', label: 'hytale-server-dev' },
	{ id: 'hytale-server-prod', label: 'hytale-server-prod' },
];

export function ContainerLogsPanel() {
	// По умолчанию — dev-сервер. "Все" может быть тяжёлым и зависать на docker.sock.
	const [selected, setSelected] = React.useState<AllowedContainer>('hytale-server-dev');
	const [loading, setLoading] = React.useState(false);
	const [text, setText] = React.useState<string>('Загрузка…');
	const tail = 1000;
	const [selectOpen, setSelectOpen] = React.useState(false);

	async function load(next?: AllowedContainer) {
		const c = next ?? selected;
		setLoading(true);
		try {
			const url = new URL('/api/hytale/container-logs', window.location.origin);
			url.searchParams.set('container', c);
			url.searchParams.set('tail', String(tail));
			const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store', credentials: 'same-origin' });
			const r = (await res.json()) as { ok: boolean; error?: string; lines?: string[] };
			if (!res.ok || !r.ok) {
				setText(`Ошибка: HTTP ${res.status} ${r.error ?? ''}`.trim());
				return;
			}
			setText(Array.isArray(r.lines) && r.lines.length ? r.lines.join('\n') : 'Пусто (или нет доступа к Docker socket).');
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			setText(`Ошибка: ${msg}`);
		} finally {
			setLoading(false);
		}
	}

	React.useEffect(() => {
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selected]);

	return (
		<div className="stat-card tg-logs-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
			<div className="stat-card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
					<div style={{ position: 'relative' }}>
						<select
							value={selected}
							onChange={(e) => {
								setSelected(e.target.value as AllowedContainer);
								setSelectOpen(false);
							}}
							onBlur={() => setSelectOpen(false)}
							onMouseDown={() => setSelectOpen((v) => !v)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
									setSelectOpen(true);
								}
								if (e.key === 'Escape') setSelectOpen(false);
							}}
							className="tg-logs-control"
						>
							{OPTIONS.map((o) => (
								<option key={o.id} value={o.id}>
									{o.label}
								</option>
							))}
						</select>
						<span
							style={{
								position: 'absolute',
								right: 10,
								top: '50%',
								transform: 'translateY(-50%)',
								pointerEvents: 'none',
								color: 'var(--godmode-text-primary)',
								opacity: 0.95,
								display: 'inline-flex',
							}}
						>
							<span
								style={{
									display: 'inline-flex',
									transform: selectOpen ? 'rotate(180deg)' : 'rotate(0deg)',
									transformOrigin: '50% 50%',
									transition: 'transform 120ms ease',
								}}
							>
								<Icon icon={iconChevronDown as never} size={18} />
							</span>
						</span>
					</div>

					<button type="button" className="tg-logs-refresh" onClick={() => void load(selected)} disabled={loading}>
						<Icon icon={iconSync as never} size={22} />
					</button>
				</div>
			</div>

			<pre
				style={{
					margin: 0,
					flex: 1,
					overflow: 'auto',
					fontSize: 12,
					lineHeight: 1.35,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
					fontFamily:
						'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
					color: 'var(--godmode-text-primary)',
				}}
			>
				{text}
			</pre>
		</div>
	);
}

