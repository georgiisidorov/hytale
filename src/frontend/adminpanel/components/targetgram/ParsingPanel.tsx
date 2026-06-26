'use client';

import React from 'react';
import { iconDisc, iconSync } from '@sit-onyx/icons';
import { Icon } from '../godmode/Icon';

type Task = {
	id: string;
	name: string;
	query: string;
	status: 'active' | 'paused' | 'completed' | 'error';
	createdAt: string;
	resultsCount: number;
};

type UsageStatItem = {
	serviceKey: string;
	title: string;
	spentRequests?: string;
	spentChannels?: string;
	spentWords?: string;
	spentObjects?: string;
	expiredAt?: number;
};

type UsageStatResponse =
	| { ok: true; response: UsageStatItem[]; fetchedAt: string | null }
	| { ok: false; error: string };

type TokenResponse = { ok: true } | { ok: false; error: string };

export function ParsingPanel() {
	const [tasks, setTasks] = React.useState<Task[]>([]);
	const [query, setQuery] = React.useState('');
	const [name, setName] = React.useState('');
	const [token, setToken] = React.useState('');
	const [savingToken, setSavingToken] = React.useState(false);
	const [usage, setUsage] = React.useState<UsageStatResponse | null>(null);
	const [loadingUsage, setLoadingUsage] = React.useState(false);

	function addMockTask() {
		const q = query.trim();
		if (!q) return;
		const t: Task = {
			id: String(Date.now()),
			name: name.trim() || q,
			query: q,
			status: 'active',
			createdAt: new Date().toLocaleString(),
			resultsCount: 0,
		};
		setTasks((prev) => [t, ...prev]);
		setQuery('');
		setName('');
	}

	async function saveToken() {
		const t = token.trim();
		if (!t) return;
		setSavingToken(true);
		try {
			const r = await fetch('/api/tgstat/token', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ token: t }),
			});
			const j = (await r.json().catch(() => ({}))) as TokenResponse;
			if (!r.ok || !('ok' in j) || !j.ok) {
				const err = 'error' in j ? j.error : `HTTP ${r.status}`;
				setUsage({ ok: false, error: err });
				return;
			}
			await loadUsage();
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			setUsage({ ok: false, error: msg });
		} finally {
			setSavingToken(false);
		}
	}

	async function loadUsage() {
		setLoadingUsage(true);
		try {
			const r = await fetch('/api/tgstat/usage_stat', { cache: 'no-store' });
			const j = (await r.json().catch(() => ({}))) as UsageStatResponse;
			if (!r.ok) {
				const err = (j && 'ok' in j && !j.ok && 'error' in j && j.error) ? j.error : `HTTP ${r.status}`;
				setUsage({ ok: false, error: err });
				return;
			}
			setUsage(j);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			setUsage({ ok: false, error: msg });
		} finally {
			setLoadingUsage(false);
		}
	}

	React.useEffect(() => {
		void loadUsage();
	}, []);

	function formatExpiry(ts?: number) {
		if (!ts) return '—';
		const d = new Date(ts * 1000);
		return d.toLocaleString();
	}

	return (
		<div style={{ display: 'grid', gap: 14 }}>
			<div className="stat-card">
				<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 460px) minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
					{/* left: token */}
					<div style={{ display: 'grid', gap: 10 }}>
						<div style={{ opacity: 0.85, fontSize: 12 }}>API токен TGStat</div>
						<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
							<input
								className="tg-logs-control"
								placeholder="Вставь токен…"
								value={token}
								onChange={(e) => setToken(e.target.value)}
								style={{ flex: 1, paddingRight: 10 }}
							/>
							<button type="button" className="tg-logs-refresh" onClick={() => void saveToken()} disabled={savingToken} title="Сохранить токен">
								<Icon icon={iconDisc as never} size={22} />
							</button>
						</div>
						<div style={{ opacity: 0.7, fontSize: 12 }}>
							Токен хранится в БД и используется сервером для запросов к TGStat.
						</div>
					</div>

					{/* right: usage */}
					<div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
						<div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
							<div style={{ opacity: 0.85, fontSize: 12 }}>Оплаченные тарифы / экспирации</div>
							<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
								{usage && 'ok' in usage && usage.ok && usage.fetchedAt ? (
									<div style={{ opacity: 0.65, fontSize: 12, whiteSpace: 'nowrap' }}>
										обновлено: {new Date(usage.fetchedAt).toLocaleString()}
									</div>
								) : null}
								<button
									type="button"
									className="tg-logs-refresh"
									onClick={() => void loadUsage()}
									disabled={loadingUsage}
									title="Обновить статусы"
								>
									<Icon icon={iconSync as never} size={22} />
								</button>
							</div>
						</div>
						{usage === null ? (
							<div style={{ opacity: 0.8 }}>Загрузка…</div>
						) : 'ok' in usage && !usage.ok ? (
							<div style={{ color: '#ff6b6b' }}>Ошибка: {usage.error}</div>
						) : usage.ok && usage.response.length === 0 ? (
							<div style={{ opacity: 0.8 }}>Нет данных (или токен не задан).</div>
						) : (
							<div className="orders-table-wrapper">
								<table className="orders-table">
									<thead>
										<tr>
											<th>Сервис</th>
											<th>Квоты</th>
											<th>Истекает</th>
										</tr>
									</thead>
									<tbody>
										{usage.ok
											? usage.response.map((it) => {
													const quota =
														it.spentRequests || it.spentChannels || it.spentWords || it.spentObjects || '—';
													return (
														<tr key={it.serviceKey}>
															<td>
																<div style={{ fontWeight: 500 }}>{it.title}</div>
																<div style={{ opacity: 0.7, fontSize: 12 }}>{it.serviceKey}</div>
															</td>
															<td style={{ whiteSpace: 'nowrap' }}>{quota}</td>
															<td style={{ whiteSpace: 'nowrap' }}>{formatExpiry(it.expiredAt)}</td>
														</tr>
													);
												})
											: null}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="stat-card">
				<div className="stat-card-header">
					<h3>Методы TGStat (справочник)</h3>
				</div>
				<div style={{ display: 'grid', gap: 10 }}>
					<div style={{ opacity: 0.8, fontSize: 12 }}>
						Ниже — каталог методов TGStat, разнесённый по разделам. Это список для навигации/планирования интеграции; вызовы подключаем
						по мере реализации.
					</div>
					<div className="orders-table-wrapper">
						<table className="orders-table">
							<thead>
								<tr>
									<th>Раздел</th>
									<th>Метод</th>
									<th>URL</th>
								</tr>
							</thead>
							<tbody>
								{/* Каналы / чаты */}
								<tr>
									<td rowSpan={11}>Каналы / чаты</td>
									<td>channels/get</td>
									<td>https://api.tgstat.ru/channels/get</td>
								</tr>
								<tr>
									<td>channels/search</td>
									<td>https://api.tgstat.ru/channels/search</td>
								</tr>
								<tr>
									<td>channels/stat</td>
									<td>https://api.tgstat.ru/channels/stat</td>
								</tr>
								<tr>
									<td>channels/posts</td>
									<td>https://api.tgstat.ru/channels/posts</td>
								</tr>
								<tr>
									<td>channels/stories</td>
									<td>https://api.tgstat.ru/channels/stories</td>
								</tr>
								<tr>
									<td>channels/mentions</td>
									<td>https://api.tgstat.ru/channels/mentions</td>
								</tr>
								<tr>
									<td>channels/forwards</td>
									<td>https://api.tgstat.ru/channels/forwards</td>
								</tr>
								<tr>
									<td>channels/subscribers</td>
									<td>https://api.tgstat.ru/channels/subscribers</td>
								</tr>
								<tr>
									<td>channels/views</td>
									<td>https://api.tgstat.ru/channels/views</td>
								</tr>
								<tr>
									<td>channels/avg-posts-reach</td>
									<td>https://api.tgstat.ru/channels/avg-posts-reach</td>
								</tr>
								<tr>
									<td>channels/er / err / err24</td>
									<td>
										https://api.tgstat.ru/channels/er<br />
										https://api.tgstat.ru/channels/err<br />
										https://api.tgstat.ru/channels/err24
									</td>
								</tr>

								{/* Посты */}
								<tr>
									<td rowSpan={4}>Посты</td>
									<td>posts/get</td>
									<td>https://api.tgstat.ru/posts/get</td>
								</tr>
								<tr>
									<td>posts/stat</td>
									<td>https://api.tgstat.ru/posts/stat</td>
								</tr>
								<tr>
									<td>posts/stat-multi</td>
									<td>https://api.tgstat.ru/posts/stat-multi</td>
								</tr>
								<tr>
									<td>posts/search</td>
									<td>https://api.tgstat.ru/posts/search</td>
								</tr>

								{/* Истории */}
								<tr>
									<td rowSpan={3}>Истории</td>
									<td>stories/get</td>
									<td>https://api.tgstat.ru/stories/get</td>
								</tr>
								<tr>
									<td>stories/stat</td>
									<td>https://api.tgstat.ru/stories/stat</td>
								</tr>
								<tr>
									<td>stories/stat-multi</td>
									<td>https://api.tgstat.ru/stories/stat-multi</td>
								</tr>

								{/* Ключевые слова */}
								<tr>
									<td rowSpan={2}>Ключевые слова</td>
									<td>words/mentions-by-period</td>
									<td>https://api.tgstat.ru/words/mentions-by-period</td>
								</tr>
								<tr>
									<td>words/mentions-by-channels</td>
									<td>https://api.tgstat.ru/words/mentions-by-channels</td>
								</tr>

								{/* Callback */}
								<tr>
									<td rowSpan={6}>Callback</td>
									<td>callback/set-callback-url (POST)</td>
									<td>https://api.tgstat.ru/callback/set-callback-url</td>
								</tr>
								<tr>
									<td>callback/get-callback-info</td>
									<td>https://api.tgstat.ru/callback/get-callback-info</td>
								</tr>
								<tr>
									<td>callback/subscribe-channel (POST)</td>
									<td>https://api.tgstat.ru/callback/subscribe-channel</td>
								</tr>
								<tr>
									<td>callback/subscribe-word (POST)</td>
									<td>https://api.tgstat.ru/callback/subscribe-word</td>
								</tr>
								<tr>
									<td>callback/subscriptions-list</td>
									<td>https://api.tgstat.ru/callback/subscriptions-list</td>
								</tr>
								<tr>
									<td>callback/unsubscribe (POST)</td>
									<td>https://api.tgstat.ru/callback/unsubscribe</td>
								</tr>

								{/* Справочники и ошибки */}
								<tr>
									<td rowSpan={4}>Справочники / ошибки</td>
									<td>database/categories</td>
									<td>https://api.tgstat.ru/database/categories</td>
								</tr>
								<tr>
									<td>database/countries</td>
									<td>https://api.tgstat.ru/database/countries</td>
								</tr>
								<tr>
									<td>database/languages</td>
									<td>https://api.tgstat.ru/database/languages</td>
								</tr>
								<tr>
									<td>errors</td>
									<td>https://api.tgstat.ru/docs/ru/errors.html</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<div className="stat-card">
				<div className="stat-card-header">
					<h3>Создать задачу</h3>
				</div>
				<div style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
					<input
						className="form-input"
						placeholder="Название (опционально)"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<input
						className="form-input"
						placeholder="Запрос (ключевые слова)"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
					<div style={{ display: 'flex', gap: 10 }}>
						<button type="button" className="notifications-btn" onClick={addMockTask}>
							Добавить
						</button>
						<div style={{ opacity: 0.8, fontSize: 12, alignSelf: 'center' }}>
							Это UI-заготовка как в `targetgram`. Реальный парсинг подключим через TGStat/API.
						</div>
					</div>
				</div>
			</div>

			<div className="stat-card">
				<div className="stat-card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
					<h3>Задачи</h3>
					<span style={{ opacity: 0.8, fontSize: 12 }}>всего: {tasks.length}</span>
				</div>
				{tasks.length === 0 ? (
					<div style={{ opacity: 0.8 }}>Нет активных задач</div>
				) : (
					<div className="orders-table-wrapper">
						<table className="orders-table">
							<thead>
								<tr>
									<th>ID</th>
									<th>Название</th>
									<th>Запрос</th>
									<th>Статус</th>
									<th>Результаты</th>
									<th>Создано</th>
								</tr>
							</thead>
							<tbody>
								{tasks.map((t) => (
									<tr key={t.id}>
										<td>{t.id}</td>
										<td>{t.name}</td>
										<td>{t.query}</td>
										<td>{t.status}</td>
										<td>{t.resultsCount}</td>
										<td>{t.createdAt}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}

