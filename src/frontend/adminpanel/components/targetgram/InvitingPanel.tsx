'use client';

import React from 'react';

type Inviter = {
	id: string;
	username: string;
	status: 'active' | 'limited' | 'blocked';
	sentToday: number;
	limitToday: number;
};

export function InvitingPanel() {
	const [groupLink, setGroupLink] = React.useState('');
	const [invitesPerDay, setInvitesPerDay] = React.useState(150);
	const [inviterAccounts, setInviterAccounts] = React.useState<Inviter[]>([
		{ id: '1', username: 'username1', status: 'active', sentToday: 0, limitToday: 50 },
	]);

	const active = inviterAccounts.filter((a) => a.status === 'active').length;
	const sent = inviterAccounts.reduce((s, a) => s + a.sentToday, 0);

	return (
		<div style={{ display: 'grid', gap: 14 }}>
			<div className="stat-card">
				<div className="stat-card-header">
					<h3>Группа</h3>
				</div>
				<div style={{ display: 'flex', gap: 10, maxWidth: 720 }}>
					<input
						className="form-input"
						placeholder="https://t.me/your_group или @your_group"
						value={groupLink}
						onChange={(e) => setGroupLink(e.target.value)}
					/>
					<button
						type="button"
						className="notifications-btn"
						onClick={() => {
							// пока заглушка
						}}
					>
						Проверить
					</button>
				</div>
				<div style={{ opacity: 0.8, fontSize: 12, marginTop: 8 }}>
					Инвайтинг в `targetgram` сейчас был UI-заготовкой без серверной реализации. Подключим реальную механику
					после того, как определим формат очереди/таблиц.
				</div>
			</div>

			<div className="stat-card">
				<div className="stat-card-header">
					<h3>Лимиты</h3>
				</div>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<label style={{ opacity: 0.8 }}>Приглашений в день</label>
					<input
						className="form-input"
						type="number"
						value={invitesPerDay}
						onChange={(e) => setInvitesPerDay(Number(e.target.value || 0))}
						style={{ width: 120 }}
					/>
					<span style={{ opacity: 0.8, fontSize: 12 }}>
						Активных аккаунтов: {active} • Приглашено сегодня: {sent}/{invitesPerDay}
					</span>
				</div>
			</div>

			<div className="stat-card">
				<div className="stat-card-header">
					<h3>Аккаунты-инвайтеры</h3>
				</div>
				<div className="orders-table-wrapper">
					<table className="orders-table">
						<thead>
							<tr>
								<th>ID</th>
								<th>Username</th>
								<th>Статус</th>
								<th>Сегодня</th>
								<th>Лимит</th>
							</tr>
						</thead>
						<tbody>
							{inviterAccounts.map((a) => (
								<tr key={a.id}>
									<td>{a.id}</td>
									<td>@{a.username}</td>
									<td>{a.status}</td>
									<td>{a.sentToday}</td>
									<td>{a.limitToday}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

