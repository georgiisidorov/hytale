'use client';

import React from 'react';

type MailingRow = {
	id: number;
	user_id: number;
	channel_id: number;
	name: string;
	status: string;
	schedule: string | null;
	recipients_count: number;
	sent_count: number;
	created_at: string | null;
	updated_at: string | null;
};

export function MailingsTable() {
	const [rows, setRows] = React.useState<MailingRow[] | null>(null);
	const [error, setError] = React.useState<string | null>(null);

	async function load() {
		setError(null);
		const r = await fetch('/api/targetgram/mailings', { method: 'GET' });
		if (!r.ok) {
			setRows(null);
			setError(`Ошибка загрузки: ${r.status}`);
			return;
		}
		const data = (await r.json()) as MailingRow[];
		setRows(data);
	}

	React.useEffect(() => {
		void load();
	}, []);

	return (
		<div className="stat-card">
			<div className="stat-card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
				<h3>Список</h3>
				<button type="button" className="notifications-btn" onClick={() => void load()}>
					Обновить
				</button>
			</div>

			{error ? <div style={{ color: '#ff6b6b' }}>{error}</div> : null}

			{rows === null ? (
				<div style={{ opacity: 0.8 }}>Загрузка…</div>
			) : (
				<div className="orders-table-wrapper">
					<table className="orders-table">
						<thead>
							<tr>
								<th>ID</th>
								<th>Название</th>
								<th>Статус</th>
								<th>Получатели</th>
								<th>Отправлено</th>
								<th>Schedule</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((r) => (
								<tr key={r.id}>
									<td>{r.id}</td>
									<td>{r.name}</td>
									<td>{r.status}</td>
									<td>{r.recipients_count}</td>
									<td>{r.sent_count}</td>
									<td>{r.schedule ? new Date(r.schedule).toLocaleString() : '—'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

