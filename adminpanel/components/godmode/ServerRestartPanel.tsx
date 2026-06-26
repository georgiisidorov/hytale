'use client';

import React from 'react';
import { type HytaleServerId } from '@/lib/hytale-server-instance';

type RestartState = {
	loading: boolean;
	message: string | null;
	error: string | null;
};

const initialState = (): RestartState => ({
	loading: false,
	message: null,
	error: null,
});

export function ServerRestartPanel() {
	const [dev, setDev] = React.useState<RestartState>(initialState);
	const [prod, setProd] = React.useState<RestartState>(initialState);

	async function restart(server: HytaleServerId) {
		const setState = server === 'prod' ? setProd : setDev;
		const label = server === 'prod' ? 'Prod' : 'Dev';
		if (
			!window.confirm(
				`Перезапустить ${label} (hytale-server-${server})?\n\nИгроки будут отключены. Подтянется новый jar и свежий каталог с админки.`,
			)
		) {
			return;
		}

		setState({ loading: true, message: null, error: null });
		try {
			const res = await fetch('/api/hytale/server/restart', {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ server }),
			});
			const j = (await res.json()) as { ok: boolean; message?: string; error?: string };
			if (!res.ok || !j.ok) {
				throw new Error(j.error || `HTTP ${res.status}`);
			}
			setState({ loading: false, message: j.message ?? 'Перезапуск выполнен', error: null });
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			setState({ loading: false, message: null, error: msg });
		}
	}

	function renderStatus(st: RestartState) {
		if (st.loading) return <span style={{ fontSize: 12, color: 'var(--godmode-text-muted)' }}>Перезапуск…</span>;
		if (st.error) return <span style={{ fontSize: 12, color: '#f87171' }}>{st.error}</span>;
		if (st.message) return <span style={{ fontSize: 12, color: '#7fd695' }}>{st.message}</span>;
		return null;
	}

	return (
		<div className="server-restart-panel stat-card">
			<div className="server-restart-panel__buttons">
				<button
					type="button"
					className="gm-btn gm-btn--primary"
					disabled={dev.loading || prod.loading}
					onClick={() => void restart('dev')}
				>
					{dev.loading ? 'Dev…' : 'Перезапуск Dev'}
				</button>
				<button
					type="button"
					className="gm-btn"
					disabled={dev.loading || prod.loading}
					onClick={() => void restart('prod')}
				>
					{prod.loading ? 'Prod…' : 'Перезапуск Prod'}
				</button>
			</div>
			{(dev.loading || dev.error || dev.message || prod.loading || prod.error || prod.message) && (
				<div className="server-restart-panel__status">
					{renderStatus(dev)}
					{renderStatus(prod)}
				</div>
			)}
		</div>
	);
}
