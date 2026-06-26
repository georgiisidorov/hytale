'use client';

import React, { useState } from 'react';

export function MailerTriggerButton() {
	const [loading, setLoading] = useState(false);
	const [lastId, setLastId] = useState<number | null>(null);
	const [error, setError] = useState('');

	async function trigger() {
		setError('');
		setLoading(true);
		try {
			const res = await fetch('/api/mailer/trigger', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ requestedBy: 'adminpanel' }),
			});
			if (!res.ok) {
				const j = (await res.json().catch(() => ({}))) as { error?: string };
				setError(j.error ?? `HTTP ${res.status}`);
				return;
			}
			const j = (await res.json().catch(() => ({}))) as { id?: number | null };
			setLastId(typeof j.id === 'number' ? j.id : null);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			setError(msg);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
			<button
				type="button"
				className="notifications-btn header-red-btn"
				title="Запустить один цикл рассылки"
				disabled={loading}
				onClick={() => void trigger()}
			>
				{loading ? '…' : 'Запуск рассылки'}
			</button>
			{lastId ? <span style={{ color: '#666', fontSize: 12 }}>id: {lastId}</span> : null}
			{error ? <span style={{ color: '#b91c1c', fontSize: 12 }}>{error}</span> : null}
		</div>
	);
}

