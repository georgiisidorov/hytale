'use client';

import React from 'react';
import { iconSync } from '@sit-onyx/icons';
import { Icon } from '../../../components/godmode/Icon';
import { type HytaleServerId } from '@/lib/hytale-server-instance';

type PlayerRow = {
	id: number;
	uuid: string;
	username: string;
	display_username: string | null;
	rank: string;
	moderation_status: string;
	moderation_until: string | null;
	status_label: string;
	status_kind: string;
	balance: string;
	created_at: string;
};

export default function PlayersPage() {
	const [q, setQ] = React.useState('');
	const [rows, setRows] = React.useState<PlayerRow[]>([]);
	const [selected, setSelected] = React.useState<string | null>(null);
	const [profile, setProfile] = React.useState<any>(null);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [syncError, setSyncError] = React.useState<string | null>(null);
	const [permError, setPermError] = React.useState<string | null>(null);
	const [namesError, setNamesError] = React.useState<string | null>(null);
	const [lastSync, setLastSync] = React.useState<string | null>(null);
	const [registeredOnly, setRegisteredOnly] = React.useState(false);
	const [permUsersCount, setPermUsersCount] = React.useState<number | null>(null);
	const [server, setServer] = React.useState<HytaleServerId>('dev');
	const [permissionsPath, setPermissionsPath] = React.useState<string | null>(null);

	const loadList = React.useCallback(async (forceSync: boolean) => {
		setError(null);
		setLoading(true);
		try {
			const u = new URL('/api/hytale/players', window.location.origin);
			u.searchParams.set('server', server);
			if (q.trim()) u.searchParams.set('q', q.trim());
			if (forceSync) u.searchParams.set('forceSync', '1');
			if (registeredOnly) u.searchParams.set('registeredOnly', '1');
			const r = await fetch(u.toString(), { cache: 'no-store' });
			const j = (await r.json()) as {
				ok: boolean;
				rows?: PlayerRow[];
				error?: string;
				syncError?: string;
				permissionsError?: string;
				playerNamesError?: string;
				lastPermissionsSync?: string | null;
				permissionsUsersCount?: number;
				permissionsPath?: string;
			};
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			setRows(Array.isArray(j.rows) ? j.rows : []);
			setSyncError(j.syncError ?? null);
			setPermError(j.permissionsError ?? null);
			setNamesError(j.playerNamesError ?? null);
			setLastSync(j.lastPermissionsSync ?? null);
			setPermUsersCount(typeof j.permissionsUsersCount === 'number' ? j.permissionsUsersCount : null);
			setPermissionsPath(typeof j.permissionsPath === 'string' ? j.permissionsPath : null);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, [q, registeredOnly, server]);

	const loadProfile = React.useCallback(async (uuid: string) => {
		setError(null);
		setLoading(true);
		try {
			const r = await fetch(`/api/hytale/players/${encodeURIComponent(uuid)}`, { cache: 'no-store' });
			const j = (await r.json()) as any;
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			setProfile(j);
			setSelected(uuid);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, []);

	React.useEffect(() => {
		void loadList(false);
	}, [loadList]);

	async function patchModeration(uuid: string, action: 'active' | 'banned' | 'temp_kick', untilIso?: string) {
		setError(null);
		try {
			const body: { action: string; until?: string } = { action };
			if (action === 'temp_kick' && untilIso) body.until = untilIso;
			const r = await fetch(`/api/hytale/players/${encodeURIComponent(uuid)}/moderation`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ...body, server }),
			});
			const j = (await r.json()) as { ok: boolean; error?: string };
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			await loadList(false);
			if (selected === uuid) void loadProfile(uuid);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}

	async function patchRank(uuid: string, rank: 'Regular' | 'VIP' | 'Admin' | 'OP') {
		setError(null);
		try {
			const r = await fetch(`/api/hytale/players/${encodeURIComponent(uuid)}/rank`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ rank, server }),
			});
			const j = (await r.json()) as { ok: boolean; error?: string };
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			await loadList(false);
			if (selected === uuid) void loadProfile(uuid);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}

	function onKick(uuid: string) {
		const raw = window.prompt('Кик: сколько минут (целое число > 0)?', '60');
		if (raw == null) return;
		const n = Number(raw.trim());
		if (!Number.isFinite(n) || n <= 0) {
			setError('Нужно положительное число минут');
			return;
		}
		const until = new Date(Date.now() + n * 60_000).toISOString();
		void patchModeration(uuid, 'temp_kick', until);
	}

	return (
		<div className="dashboard-page">
			<div className="dashboard-card">
				{error ? <div style={{ color: '#ff6b6b', marginBottom: 12 }}>{error}</div> : null}
				<div className="players-server-bar">
					<span style={{ opacity: 0.75, fontSize: 13 }}>Сервер:</span>
					<button
						type="button"
						className={server === 'dev' ? 'gm-btn gm-btn--primary' : 'gm-btn'}
						onClick={() => setServer('dev')}
					>
						Dev
					</button>
					<button
						type="button"
						className={server === 'prod' ? 'gm-btn gm-btn--primary' : 'gm-btn'}
						onClick={() => setServer('prod')}
					>
						Prod
					</button>
					{permissionsPath ? (
						<span className="server-path-hint">permissions.json: {permissionsPath}</span>
					) : null}
				</div>

				{permError ? (
					<div style={{ color: '#ffb347', marginBottom: 8, fontSize: 13 }}>permissions.json: {permError}</div>
				) : null}
				{syncError ? <div style={{ color: '#ffb347', marginBottom: 8, fontSize: 13 }}>Синхронизация: {syncError}</div> : null}
				{namesError ? <div style={{ color: '#ffb347', marginBottom: 8, fontSize: 13 }}>player-names.json: {namesError}</div> : null}
				{lastSync ? (
					<div style={{ opacity: 0.55, marginBottom: 10, fontSize: 12 }}>
						Последняя синхронизация с permissions.json: {new Date(lastSync).toLocaleString()}
					</div>
				) : null}
				{permUsersCount != null ? (
					<div style={{ opacity: 0.55, marginBottom: 8, fontSize: 12 }}>
						Ников в permissions.json (после разбора файла): <b>{permUsersCount}</b>
					</div>
				) : null}

				<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 1fr)', gap: 12, alignItems: 'start' }}>
					<div
						style={{
							border: '2px solid var(--godmode-border)',
							borderRadius: 12,
							background: 'var(--godmode-bg-primary)',
							padding: 12,
						}}
					>
						<div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
							<div style={{ opacity: 0.75 }}>
								Игроки из БД
								{registeredOnly ? ' ∩ permissions.json' : ' + ранг из файла'}
							</div>
							<button
								type="button"
								className="notifications-btn header-red-btn"
								aria-label="Обновить и синхронизировать"
								title="Обновить (с синхронизацией из файла)"
								onClick={() => void loadList(true)}
								disabled={loading}
							>
								<Icon icon={iconSync as never} size={30} className="header-icon-accent" />
							</button>
						</div>

						<div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
							<input
								value={q}
								onChange={(e) => setQ(e.target.value)}
								placeholder="Поиск по нику..."
								style={{ ...inputStyle(), flex: 1 }}
							/>
							<button type="button" onClick={() => void loadList(false)} style={miniBtnStyle()} disabled={loading}>
								Искать
							</button>
						</div>

						<label
							style={{
								display: 'flex',
								gap: 10,
								alignItems: 'center',
								marginTop: 10,
								opacity: 0.9,
								cursor: 'pointer',
								userSelect: 'none',
							}}
						>
							<input
								type="checkbox"
								checked={registeredOnly}
								onChange={(e) => setRegisteredOnly(e.target.checked)}
							/>
							<span style={{ fontSize: 13 }}>
								Только пересечение с permissions.json (иначе показываются все строки из БД)
							</span>
						</label>

						<div className="players-table-wrap" style={{ marginTop: 10, maxHeight: '70vh' }}>
							<table className="players-table">
								<thead>
									<tr style={{ opacity: 0.75 }}>
										<th style={thStyle()}>ID</th>
										<th style={thStyle()}>Ник</th>
										<th style={thStyle()}>Ранг</th>
										<th style={thStyle()}>Статус</th>
									</tr>
								</thead>
								<tbody>
									{rows.length === 0 ? (
										<tr>
											<td colSpan={4} style={{ padding: 12, opacity: 0.7 }}>
												{loading
													? 'Загрузка…'
													: registeredOnly
														? 'Нет строк в пересечении БД и permissions.json (снимите галочку или проверьте файл).'
														: 'В БД пока нет игроков или ничего не подошло под поиск.'}
											</td>
										</tr>
									) : (
										rows.map((r) => {
											const isSel = selected === r.username;
											return (
												<tr
													key={r.id}
													style={{
														borderTop: '1px solid rgba(255,255,255,0.06)',
														background: isSel ? 'rgba(63,217,209,0.12)' : 'transparent',
													}}
												>
													<td style={tdStyle()} onClick={() => void loadProfile(r.uuid)} role="presentation">
														{r.id}
													</td>
													<td style={{ ...tdStyle(), cursor: 'pointer' }} onClick={() => void loadProfile(r.uuid)}>
														<div style={{ display: 'grid', gap: 2 }}>
															<div>{r.display_username ?? r.username}</div>
															<div style={{ opacity: 0.55, fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace' }}>
																{r.uuid}
															</div>
														</div>
													</td>
													<td style={tdStyle()} onClick={() => void loadProfile(r.uuid)} role="presentation">
														<div style={{ display: 'grid', gap: 6 }}>
															<div style={{ fontWeight: 600 }}>{r.rank}</div>
															<div className="player-action-group">
																{(['Regular', 'VIP', 'Admin', 'OP'] as const).map((rk) => {
																	const isCurrent = r.rank === rk;
																	return (
																		<button
																			key={rk}
																			type="button"
																			disabled={isCurrent}
																			onClick={(e) => {
																				e.stopPropagation();
																				void patchRank(r.uuid, rk);
																			}}
																			style={actionBtnStyle(isCurrent)}
																		>
																			{rk}
																		</button>
																	);
																})}
															</div>
														</div>
													</td>
													<td style={tdStyle()} onClick={() => void loadProfile(r.uuid)} role="presentation">
														<div style={{ display: 'grid', gap: 6 }}>
															<div>
																<span
																	style={{
																		fontWeight: 600,
																		color:
																			r.status_kind === 'banned'
																				? '#ff6b6b'
																				: r.status_kind === 'temp_kick'
																					? '#ffb347'
																					: 'inherit',
																	}}
																>
																	{r.status_label}
																</span>
															</div>
															<div className="player-action-group">
																{(() => {
																	const isActive = r.status_kind === 'active';
																	const isBanned = r.status_kind === 'banned';
																	const isTempKick = r.status_kind === 'temp_kick';
																	return (
																		<>
																			<button
																				type="button"
																				disabled={isActive}
																				onClick={(e) => {
																					e.stopPropagation();
																					void patchModeration(r.uuid, 'active');
																				}}
																				style={actionBtnStyle(isActive)}
																			>
																				Активен
																			</button>
																			<button
																				type="button"
																				disabled={isBanned}
																				onClick={(e) => {
																					e.stopPropagation();
																					if (window.confirm(`Забанить «${r.display_username ?? r.username}»?`))
																						void patchModeration(r.uuid, 'banned');
																				}}
																				style={actionBtnStyle(isBanned)}
																			>
																				Бан
																			</button>
																			<button
																				type="button"
																				disabled={isTempKick}
																				onClick={(e) => {
																					e.stopPropagation();
																					onKick(r.uuid);
																				}}
																				style={actionBtnStyle(isTempKick)}
																			>
																				Кик
																			</button>
																		</>
																	);
																})()}
															</div>
														</div>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</div>

					<div
						style={{
							border: '2px solid var(--godmode-border)',
							borderRadius: 12,
							background: 'var(--godmode-bg-primary)',
							padding: 12,
							minHeight: 300,
						}}
					>
						<div style={{ opacity: 0.75, marginBottom: 10 }}>Профиль</div>
						{profile?.player ? (
							<div style={{ display: 'grid', gap: 12 }}>
								<div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
									<div style={{ display: 'grid', gap: 2 }}>
										<div style={{ fontSize: 18, fontWeight: 600 }}>
											{profile.display_username ?? profile.player.username}
										</div>
										<div
											style={{
												opacity: 0.55,
												fontSize: 11,
												fontFamily:
													'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace',
											}}
										>
											UUID: {profile.player.username}
										</div>
									</div>
									<div style={{ opacity: 0.85 }}>
										Баланс: <b>{profile.balance}</b>
									</div>
								</div>
								{profile.moderation ? (
									<div style={{ opacity: 0.9 }}>
										Статус: <b>{profile.moderation.label}</b>
									</div>
								) : null}
								{profile.rank ? (
									<div style={{ opacity: 0.9 }}>
										Ранг: <b>{profile.rank}</b>
									</div>
								) : null}

								<section>
									<div style={{ opacity: 0.75, marginBottom: 8 }}>Транзакции баланса (последние 200)</div>
									<pre style={monoBoxStyle()}>
										{(profile.balanceTxns ?? [])
											.map((t: any) => `${t.created_at}  ${t.kind}  ${t.amount}  ${t.reason ?? ''}`)
											.join('\n') || '—'}
									</pre>
								</section>

								<section>
									<div style={{ opacity: 0.75, marginBottom: 8 }}>Активации промокодов</div>
									<pre style={monoBoxStyle()}>
										{(profile.promocodeRedemptions ?? [])
											.map((x: any) => `${x.redeemed_at}  ${x.code}`)
											.join('\n') || '—'}
									</pre>
								</section>

								<section>
									<div style={{ opacity: 0.75, marginBottom: 8 }}>Покупки</div>
									<pre style={monoBoxStyle()}>
										{(profile.purchases ?? [])
											.map((p: any) => `${p.created_at}  ${p.sku}  ${p.title}  ${p.price} ${p.currency}`)
											.join('\n') || '—'}
									</pre>
								</section>
							</div>
						) : (
							<div style={{ opacity: 0.7 }}>{loading ? 'Загрузка…' : 'Выбери игрока слева.'}</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function inputStyle(): React.CSSProperties {
	return {
		borderRadius: 12,
		border: '2px solid var(--godmode-border)',
		background: 'var(--godmode-bg-secondary)',
		padding: '10px 12px',
		color: 'var(--godmode-text-primary)',
		outline: 'none',
	};
}

function monoBoxStyle(): React.CSSProperties {
	return {
		border: '2px solid var(--godmode-border)',
		borderRadius: 12,
		background: 'var(--godmode-bg-secondary)',
		padding: 12,
		whiteSpace: 'pre-wrap',
		fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		fontSize: 12,
		lineHeight: 1.45,
		margin: 0,
	};
}

function miniBtnStyle(): React.CSSProperties {
	return {
		borderRadius: 10,
		border: '2px solid var(--godmode-border)',
		background: 'var(--godmode-bg-secondary)',
		padding: '6px 10px',
		color: 'var(--godmode-text-primary)',
		cursor: 'pointer',
		fontSize: 12,
	};
}

function actionBtnStyle(isCurrent: boolean): React.CSSProperties {
	if (isCurrent) {
		return {
			...miniBtnStyle(),
			borderColor: '#3FD9D1',
			color: '#3FD9D1',
			cursor: 'default',
			opacity: 0.95,
		};
	}
	return miniBtnStyle();
}

function thStyle(): React.CSSProperties {
	return { textAlign: 'left', padding: '8px 10px', fontWeight: 600, whiteSpace: 'nowrap' };
}

function tdStyle(): React.CSSProperties {
	return { padding: '10px 10px', verticalAlign: 'top' };
}
