'use client';

import React from 'react';
import { iconSync } from '@sit-onyx/icons';
import { Icon } from '../../../components/godmode/Icon';

type AnalyticsJson = {
	ok: boolean;
	onlinePlayers: number | null;
	registeredPlayers: number | null;
	mods: string[] | null;
	sources?: {
		serverDir?: string;
		online?: {
			ok: boolean;
			value: number | null;
			source?: string | null;
			error: string | null;
		};
		registered?: { ok: boolean; value: number | null; error: string | null; note: string | null };
		modsDir?: { ok: boolean; count: number | null; error: string | null };
	};
};

export default function AnalyticsPage() {
	const [online, setOnline] = React.useState<number | null>(null);
	const [registered, setRegistered] = React.useState<number | null>(null);
	const [mods, setMods] = React.useState<string[] | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [lastUpdatedAt, setLastUpdatedAt] = React.useState<number | null>(null);
	const [diag, setDiag] = React.useState<AnalyticsJson['sources']>(undefined);

	const load = React.useCallback(async () => {
		setError(null);
		try {
			const r = await fetch('/api/hytale/analytics', { cache: 'no-store' });
			if (!r.ok) {
				throw new Error(`HTTP ${r.status}`);
			}
			const j = (await r.json()) as AnalyticsJson;
			setOnline(j.onlinePlayers ?? null);
			setRegistered(j.registeredPlayers ?? null);
			setMods(j.mods ?? null);
			setDiag(j.sources);
			setLastUpdatedAt(Date.now());
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}, []);

	React.useEffect(() => {
		let cancelled = false;
		void (async () => {
			await load();
		})();

		const t = window.setInterval(() => {
			if (cancelled) return;
			void load();
		}, 5000);
		return () => {
			cancelled = true;
			window.clearInterval(t);
		};
	}, [load]);

	return (
		<div className="dashboard-page">
			<div className="dashboard-card">
				<div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
					<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
						<button
							type="button"
							className="notifications-btn header-red-btn"
							aria-label="Обновить"
							title="Обновить"
							onClick={() => void load()}
						>
							<Icon icon={iconSync as never} size={30} className="header-icon-accent" />
						</button>
						<div style={{ opacity: 0.65, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
							{lastUpdatedAt == null ? '—' : `Обновлено: ${new Date(lastUpdatedAt).toLocaleTimeString()}`}
						</div>
					</div>
					{error ? <div style={{ color: '#ff6b6b', fontSize: 12 }}>{error}</div> : null}
				</div>

				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
					<div
						style={{
							padding: 12,
							borderRadius: 12,
							border: '2px solid var(--godmode-border)',
							background: 'var(--godmode-bg-primary)',
						}}
					>
						<div style={{ opacity: 0.75, marginBottom: 6 }}>Онлайн сейчас</div>
						<div style={{ fontSize: 28, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
							{online == null ? '—' : String(online)}
						</div>
						{online == null ? (
							<div style={{ opacity: 0.75, marginTop: 6, fontSize: 11, lineHeight: 1.45 }}>
								{diag?.online?.error ? (
									<div style={{ color: '#ff9b9b' }}>{diag.online.error}</div>
								) : (
									<div style={{ opacity: 0.55 }}>Нет данных об онлайне.</div>
								)}
							</div>
						) : null}
					</div>

					<div
						style={{
							padding: 12,
							borderRadius: 12,
							border: '2px solid var(--godmode-border)',
							background: 'var(--godmode-bg-primary)',
						}}
					>
						<div style={{ opacity: 0.75, marginBottom: 6 }}>Всего зарегистрированных</div>
						<div style={{ fontSize: 28, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
							{registered == null ? '—' : String(registered)}
						</div>
						<div style={{ opacity: 0.75, marginTop: 6, fontSize: 11, lineHeight: 1.45 }}>
							{diag?.registered?.note ? (
								<div style={{ opacity: 0.55, marginTop: 4 }}>{diag.registered.note}</div>
							) : null}
							{diag?.registered?.error ? (
								<div style={{ color: '#ff9b9b', marginTop: 6 }}>{diag.registered.error}</div>
							) : null}
						</div>
					</div>
				</div>

				<div style={{ marginTop: 14 }}>
					<div style={{ opacity: 0.75, marginBottom: 8 }}>Установленные моды</div>
					{mods == null ? (
						<div style={{ opacity: 0.85, fontSize: 12 }}>
							{diag?.modsDir?.error ? (
								<span style={{ color: '#ff9b9b' }}>{diag.modsDir.error}</span>
							) : (
								'—'
							)}
						</div>
					) : mods.length === 0 ? (
						<div style={{ opacity: 0.7 }}>Папка `mods/` пустая.</div>
					) : (
						<div
							style={{
								border: '2px solid var(--godmode-border)',
								borderRadius: 12,
								background: 'var(--godmode-bg-primary)',
								padding: 12,
								whiteSpace: 'pre-wrap',
								fontFamily:
									'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
								fontSize: 12,
								lineHeight: 1.4,
							}}
						>
							{mods.join('\n')}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

