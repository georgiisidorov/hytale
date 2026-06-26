'use client';

import React from 'react';
import CalendarJS from '@calendarjs/ce';
import '@calendarjs/ce/dist/style.css';
import { destroyCalendarInstance } from '../../../lib/calendar-dom';
import { iconCalendar, iconSync } from '@sit-onyx/icons';
import { Icon } from '@/components/godmode/Icon';

type PromoRow = {
	id: number;
	code: string;
	payload: any;
	is_multi_use: boolean;
	max_uses: number | null;
	uses_count: number;
	starts_at: string | null;
	ends_at: string | null;
	is_active: boolean;
	created_by_admin: string | null;
	created_at: string;
};

function genCode(): string {
	// удобный для ручного ввода: A-Z0-9 без двусмысленных
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let out = 'HYT-';
	for (let i = 0; i < 10; i++) {
		out += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return out;
}

export default function PromoCodesPage() {
	const [rows, setRows] = React.useState<PromoRow[]>([]);
	const [q, setQ] = React.useState('');
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	// форма создания
	const [code, setCode] = React.useState(() => genCode());
	const [balance, setBalance] = React.useState('100');
	const [isMultiUse, setIsMultiUse] = React.useState(false);
	const [maxUses, setMaxUses] = React.useState('1');
	const [endsAt, setEndsAt] = React.useState<string>(''); // YYYY-MM-DDTHH:mm:ss (без TZ), “MSK fixed”
	const [isActive, setIsActive] = React.useState(true);

	// ручная активация (через админку)
	const [redeemCode, setRedeemCode] = React.useState('');
	const [redeemUsername, setRedeemUsername] = React.useState('');

	const load = React.useCallback(async () => {
		setError(null);
		setLoading(true);
		try {
			const u = new URL('/api/hytale/promocodes', window.location.origin);
			if (q.trim()) u.searchParams.set('q', q.trim());
			const r = await fetch(u.toString(), { cache: 'no-store' });
			const j = (await r.json()) as { ok: boolean; rows?: PromoRow[]; error?: string };
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			setRows(Array.isArray(j.rows) ? j.rows : []);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, [q]);

	React.useEffect(() => {
		document.body.classList.add('promocodes-page');
		return () => document.body.classList.remove('promocodes-page');
	}, []);

	React.useEffect(() => {
		void load();
	}, [load]);

	async function createPromo() {
		setError(null);
		setLoading(true);
		try {
			const payload: any = {};
			const bal = Number(balance);
			if (Number.isFinite(bal) && bal >= 0) payload.balance = bal;

			const r = await fetch('/api/hytale/promocodes', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					code: code.trim(),
					payload,
					isMultiUse,
					maxUses: isMultiUse ? (maxUses.trim() ? Number(maxUses) : null) : 1,
					endsAt: endsAt ? withTz(endsAt) : null,
					isActive,
				}),
			});
			const j = (await r.json()) as { ok: boolean; error?: string };
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			setCode(genCode());
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}

	async function toggleActive(id: number, next: boolean) {
		setError(null);
		try {
			const r = await fetch(`/api/hytale/promocodes/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ isActive: next }),
			});
			const j = (await r.json()) as { ok: boolean; error?: string };
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}

	async function removePromo(id: number) {
		setError(null);
		try {
			const r = await fetch(`/api/hytale/promocodes/${id}`, { method: 'DELETE' });
			const j = (await r.json()) as { ok: boolean; error?: string };
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}

	async function redeem() {
		setError(null);
		setLoading(true);
		try {
			const r = await fetch('/api/hytale/promocodes/redeem', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ code: redeemCode.trim(), username: redeemUsername.trim() }),
			});
			const j = (await r.json()) as { ok: boolean; error?: string };
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			setRedeemCode('');
			setRedeemUsername('');
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="dashboard-page">
			<div className="dashboard-card">
				<style jsx global>{`
					/* CalendarJS attaches its modal to document.body; styles only for promocodes page */
					.promocodes-page .lm-calendar .lm-modal[closed='true'] {
						display: none !important;
					}

					.promocodes-page .lm-calendar .lm-modal:not([closed='true']) {
						position: fixed !important;
						left: 50% !important;
						top: 50% !important;
						transform: translate(-50%, -50%) !important;
						z-index: 999999 !important;
						border: 2px solid var(--godmode-accent) !important;
						border-radius: 14px !important;
						overflow: hidden !important;
						background: var(--godmode-bg-secondary) !important;
					}

					/* Blur: всё остальное на странице, кроме календаря */
					body.promocodes-page.calendar-open::before {
						content: '';
						position: fixed;
						inset: 0;
						background: rgba(0, 0, 0, 0.18);
						backdrop-filter: blur(6px);
						-webkit-backdrop-filter: blur(6px);
						z-index: 999998;
						pointer-events: none;
					}

					/* Фон календаря = secondary */
					body.promocodes-page .lm-calendar,
					body.promocodes-page .lm-calendar .lm-modal,
					body.promocodes-page .lm-calendar .lm-calendar-header > div:first-child,
					body.promocodes-page .lm-calendar .lm-calendar-weekdays,
					body.promocodes-page .lm-calendar .lm-calendar-content > div,
					body.promocodes-page .lm-calendar .lm-calendar-footer {
						background: var(--godmode-bg-secondary) !important;
						color: var(--godmode-text-primary) !important;
					}

					/* Убираем RESET/DONE, оставляем кнопку подтверждения */
					body.promocodes-page .lm-calendar-options {
						display: none !important;
					}

					/* Выделение выбранной даты = красный */
					body.promocodes-page .lm-calendar {
						--lm-main-color: var(--godmode-accent) !important;
						--lm-main-color-alpha: rgba(128, 0, 0, 0.45) !important;
					}

					body.promocodes-page .lm-calendar .lm-calendar-content > div[data-selected='true'] {
						background-color: rgba(128, 0, 0, 0.22) !important;
						color: var(--godmode-text-primary) !important;
					}
				`}</style>
				{error ? <div style={{ color: '#ff6b6b', marginBottom: 12 }}>{error}</div> : null}

				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
						gap: 12,
						alignItems: 'start',
					}}
				>
					<div
						style={{
							border: '2px solid var(--godmode-border)',
							borderRadius: 12,
							background: 'var(--godmode-bg-primary)',
							padding: 12,
						}}
					>
						<div style={{ opacity: 0.75, marginBottom: 10 }}>Создать промокод</div>

						<div style={{ display: 'grid', gap: 10 }}>
							<label style={{ display: 'grid', gap: 6 }}>
								<div style={{ opacity: 0.75, fontSize: 12 }}>Код</div>
								<input
									value={code}
									onChange={(e) => setCode(e.target.value)}
									style={inputStyle()}
									placeholder="HYT-XXXX..."
								/>
							</label>

							<label style={{ display: 'grid', gap: 6 }}>
								<div style={{ opacity: 0.75, fontSize: 12 }}>Начислить баланс</div>
								<input value={balance} onChange={(e) => setBalance(e.target.value)} style={inputStyle()} />
							</label>

							<label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
								<input type="checkbox" checked={isMultiUse} onChange={(e) => setIsMultiUse(e.target.checked)} />
								<div style={{ opacity: 0.85 }}>Многоразовый</div>
							</label>

							<label style={{ display: 'grid', gap: 6, opacity: isMultiUse ? 1 : 0.5 }}>
								<div style={{ opacity: 0.75, fontSize: 12 }}>Макс. использований</div>
								<input
									disabled={!isMultiUse}
									value={maxUses}
									onChange={(e) => setMaxUses(e.target.value)}
									style={inputStyle()}
								/>
							</label>

							<label style={{ display: 'grid', gap: 6 }}>
								<div style={{ opacity: 0.75, fontSize: 12 }}>Действует до (опционально)</div>
							<PromoEndsAtPicker value={endsAt} onChange={setEndsAt} />
							</label>

							<label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
								<input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
								<div style={{ opacity: 0.85 }}>Активен</div>
							</label>

							<div style={{ display: 'flex', gap: 10 }}>
								<button
									type="button"
									onClick={() => setCode(genCode())}
									style={btnStyle('secondary')}
									disabled={loading}
								>
									Сгенерировать
								</button>
								<button type="button" onClick={() => void createPromo()} style={btnStyle('primary')} disabled={loading}>
									Создать
								</button>
							</div>
						</div>
					</div>

					<div
						style={{
							border: '2px solid var(--godmode-border)',
							borderRadius: 12,
							background: 'var(--godmode-bg-primary)',
							padding: 12,
						}}
					>
						<div style={{ opacity: 0.75, marginBottom: 10 }}>Активировать промокод игроку</div>
						<div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
							<label style={{ display: 'grid', gap: 6 }}>
								<div style={{ opacity: 0.75, fontSize: 12 }}>Код</div>
								<input value={redeemCode} onChange={(e) => setRedeemCode(e.target.value)} style={inputStyle()} />
							</label>
							<label style={{ display: 'grid', gap: 6 }}>
								<div style={{ opacity: 0.75, fontSize: 12 }}>Ник игрока</div>
								<input
									value={redeemUsername}
									onChange={(e) => setRedeemUsername(e.target.value)}
									style={inputStyle()}
								/>
							</label>
							<div style={{ display: 'flex', gap: 10 }}>
								<button type="button" onClick={() => void redeem()} style={btnStyle('primary')} disabled={loading}>
									Активировать
								</button>
							</div>
							<div style={{ opacity: 0.6, fontSize: 12 }}>
								Это тестовая/ручная активация через админку: запишет redemption и начислит баланс по payload.
							</div>
						</div>

						<div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
							<div style={{ opacity: 0.75 }}>Список промокодов</div>
							<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
								<input
									value={q}
									onChange={(e) => setQ(e.target.value)}
									placeholder="Поиск по коду..."
									style={{ ...inputStyle(), width: 220 }}
								/>
								<button
									type="button"
									className="notifications-btn header-red-btn"
									aria-label="Обновить список"
									title="Обновить"
									onClick={() => void load()}
									disabled={loading}
								>
									<Icon icon={iconSync as never} size={30} className="header-icon-accent" />
								</button>
							</div>
						</div>

						<div style={{ marginTop: 10, overflowX: 'auto' }}>
							<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
								<thead>
									<tr style={{ opacity: 0.75 }}>
										<th style={thStyle()}>Код</th>
										<th style={thStyle()}>Баланс</th>
										<th style={thStyle()}>Исп.</th>
										<th style={thStyle()}>До</th>
										<th style={thStyle()}>Активен</th>
										<th style={thStyle()}>Действия</th>
									</tr>
								</thead>
								<tbody>
									{rows.length === 0 ? (
										<tr>
											<td colSpan={6} style={{ padding: 12, opacity: 0.7 }}>
												{loading ? 'Загрузка…' : 'Пусто.'}
											</td>
										</tr>
									) : (
										rows.map((r) => {
											const bal = r?.payload?.balance;
											const balStr =
												typeof bal === 'number' && Number.isFinite(bal) ? bal.toFixed(2).replace(/\.00$/, '') : '—';
											return (
												<tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
													<td style={tdStyle()}>
														<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
															<span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
																{r.code}
															</span>
															<button
																type="button"
																onClick={() => void navigator.clipboard?.writeText(r.code)}
																style={miniBtnStyle()}
															>
																Копировать
															</button>
														</div>
													</td>
													<td style={tdStyle()}>{balStr}</td>
													<td style={tdStyle()}>
														{r.is_multi_use ? `${r.uses_count}/${r.max_uses ?? '∞'}` : `${r.uses_count}/1`}
													</td>
													<td style={tdStyle()}>
														{r.ends_at ? formatApiIsoToHuman(r.ends_at) : '—'}
													</td>
													<td style={tdStyle()}>{r.is_active ? 'да' : 'нет'}</td>
													<td style={tdStyle()}>
														<div style={{ display: 'flex', gap: 10 }}>
															<button
																type="button"
																onClick={() => void toggleActive(r.id, !r.is_active)}
																style={miniBtnStyle()}
															>
																{r.is_active ? 'Выключить' : 'Включить'}
															</button>
															<button type="button" onClick={() => void removePromo(r.id)} style={miniBtnStyle()}>
																Удалить
															</button>
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
				</div>
			</div>
		</div>
	);
}

const TZ_OFFSET = '+03:00'; // UTC+3 (Europe/Moscow)
const MAX_DATE = '2100-01-01T00:00:00';
const MSK_SHIFT_MIN = 180; // фиксированный сдвиг к UTC: +03:00

function stripTz(s: string): string {
	return s.replace(/([+-]\d\d:\d\d|Z)\s*$/, '');
}

function sanitizeCalendarString(s: string): string {
	const v = stripTz(String(s ?? '')).trim();
	if (!v) return '';
	return v.replace(/\bHH\b/g, '00').replace(' ', 'T');
}

function dateToIsoLocalNoTz(d: Date): string {
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function normalizeCalendarValue(v: unknown): string {
	if (!v) return '';
	if (typeof v === 'string') return sanitizeCalendarString(v);
	if (v instanceof Date) return dateToIsoLocalNoTz(v);
	if (typeof v === 'number') return dateToIsoLocalNoTz(new Date(v));
	return sanitizeCalendarString(String(v));
}

function formatLabel(s: string): string {
	const v = sanitizeCalendarString(s);
	if (!v) return '';
	// YYYY-MM-DDTHH:mm(:ss) -> DD.MM.YYYY HH:mm
	const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
	if (!m) return v.replace('T', ' ').slice(0, 16);
	const [, yyyy, mm, dd, hh, mi] = m;
	return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
}

function formatApiIsoToHuman(s: string): string {
	const d = new Date(s);
	if (Number.isNaN(d.getTime())) return s;
	const out = d.toLocaleString('ru-RU', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
	return out.replace(',', '');
}

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

function dateToIsoNoTz(d: Date): string {
	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(
		d.getUTCSeconds(),
	)}`;
}

function utcStringToMskNoTz(raw: string): string {
	const base = stripTz(raw.trim());
	if (!base) return '';
	const d = new Date(`${base}Z`); // трактуем как UTC
	if (Number.isNaN(d.getTime())) return base;
	d.setUTCMinutes(d.getUTCMinutes() + MSK_SHIFT_MIN);
	return dateToIsoNoTz(d);
}

function withTz(s: string): string {
	const v = s.trim();
	if (!v) return '';
	if (/[+-]\d\d:\d\d$/.test(v) || /Z$/.test(v)) return v;
	return `${v}${TZ_OFFSET}`;
}

function ensureEndOfDayIfNoTime(v: string): string {
	const base = stripTz(v.trim());
	if (!base) return '';
	// если время 00:00:00 (частый default при выборе только даты) — ставим конец дня
	if (/T00:00:00$/.test(base)) return base.replace(/T00:00:00$/, 'T23:59:59');
	return base;
}

function PromoEndsAtPicker(props: { value: string; onChange: (next: string) => void }) {
	const calendarInputRef = React.useRef<HTMLInputElement | null>(null);
	const calendarRef = React.useRef<{
		setValue?: (v: string) => void;
		getValue?: () => unknown;
		update?: () => void;
		close?: () => void;
		open?: () => void;
	} | null>(null);
	const onChangeRef = React.useRef(props.onChange);
	const iconBtnRef = React.useRef<HTMLButtonElement | null>(null);
	const pendingRef = React.useRef<string>('');
	const chooseCleanupRef = React.useRef<null | (() => void)>(null);
	const committingRef = React.useRef(false);
	const observerCleanupRef = React.useRef<null | (() => void)>(null);

	React.useEffect(() => {
		onChangeRef.current = props.onChange;
	}, [props.onChange]);

	function getActiveModalRoot(): Element | null {
		// CalendarJS attaches to document.body; берём открытую модалку (если их несколько — последнюю)
		const openModals = document.querySelectorAll('.lm-calendar .lm-modal:not([closed=\"true\"])');
		return openModals.length ? openModals[openModals.length - 1] : null;
	}

	function relabelCalendarButton() {
		const root = getActiveModalRoot();
		const el = (root ?? document).querySelector('.lm-calendar-update input, .lm-calendar-update button');
		if (!el) return;
		if (el instanceof HTMLInputElement) {
			if (el.value !== 'Выбрать') el.value = 'Выбрать';
			if (el.getAttribute('value') !== 'Выбрать') el.setAttribute('value', 'Выбрать');
			return;
		}
		if (el instanceof HTMLButtonElement) {
			if (el.textContent !== 'Выбрать') el.textContent = 'Выбрать';
		}
	}

	function ensureConfirmWired() {
		const root = getActiveModalRoot();
		const el = (root ?? document).querySelector('.lm-calendar-update input, .lm-calendar-update button');
		if (!el) return;

		relabelCalendarButton();

		// навешиваем обработчик один раз на конкретный DOM-элемент (CalendarJS может создавать новый — тогда снова навесим)
		if ((el as any).dataset?.adminpanelBound === '1') return;
		(el as any).dataset.adminpanelBound = '1';

		chooseCleanupRef.current?.();
		const handler = (e: Event) => {
			e.preventDefault();
			e.stopPropagation();
			try {
				calendarRef.current?.update?.();
			} catch {}
			const rawFromApi = calendarRef.current?.getValue?.();
			const raw = rawFromApi ?? calendarInputRef.current?.value ?? '';
			const vFromCalendar = raw ? ensureEndOfDayIfNoTime(normalizeCalendarValue(raw)) : '';
			const v = vFromCalendar || pendingRef.current || (props.value ? ensureEndOfDayIfNoTime(props.value) : '');
			committingRef.current = true;
			onChangeRef.current(v);
			try {
				calendarRef.current?.close?.();
			} catch {}
			document.body.classList.remove('calendar-open');
		};

		el.addEventListener('click', handler, { capture: true });
		chooseCleanupRef.current = () => el.removeEventListener('click', handler, { capture: true } as any);
	}

	function startObserver() {
		observerCleanupRef.current?.();
		const obs = new MutationObserver(() => {
			ensureConfirmWired();
		});
		obs.observe(document.body, { subtree: true, childList: true, attributes: true });
		// первичная попытка
		ensureConfirmWired();
		observerCleanupRef.current = () => obs.disconnect();
	}

	const open = React.useCallback(() => {
		document.body.classList.add('calendar-open');
		committingRef.current = false;
		// фокус нужен, чтобы CalendarJS понимал "origin input"
		calendarInputRef.current?.focus();

		calendarRef.current?.open?.();
		startObserver();
	}, []);

	React.useEffect(() => {
		const el = calendarInputRef.current;
		if (!el) return;

		const cal = CalendarJS.Calendar(document.body, {
			type: 'default',
			input: el,
			range: false,
			time: true,
			format: 'YYYY-MM-DDTHH:mm:ss',
			value: props.value ? ensureEndOfDayIfNoTime(props.value) : undefined,
			onchange: (_self: unknown, value: unknown) => {
				// value может быть строкой/числом/Date; НЕ коммитим в состояние сразу, только сохраняем "черновик"
				const v = Array.isArray(value) ? value[0] : value;
				pendingRef.current = ensureEndOfDayIfNoTime(normalizeCalendarValue(v));
			},
			onclose: () => {
				document.body.classList.remove('calendar-open');
			},
			onopen: () => {
				document.body.classList.add('calendar-open');
				committingRef.current = false;
				startObserver();
			},
		});

		calendarRef.current = cal as unknown as {
			setValue?: (v: string) => void;
			getValue?: () => unknown;
			update?: () => void;
			close?: () => void;
			open?: () => void;
		};

		return () => {
			chooseCleanupRef.current?.();
			observerCleanupRef.current?.();
			destroyCalendarInstance(calendarRef.current as { destroy?: () => void; close?: () => void } | null);
			chooseCleanupRef.current = null;
			observerCleanupRef.current = null;
			calendarRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	React.useEffect(() => {
		const v = props.value ? ensureEndOfDayIfNoTime(props.value) : '';
		// синхронизируем только "технический" input, чтобы CalendarJS не портил отображаемый формат
		if (calendarInputRef.current) calendarInputRef.current.value = v;
		calendarRef.current?.setValue?.(v);
		pendingRef.current = v;
	}, [props.value]);

	return (
		<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
			<input
				ref={calendarInputRef}
				readOnly
				tabIndex={-1}
				aria-hidden="true"
				style={{
					position: 'absolute',
					opacity: 0,
					pointerEvents: 'none',
					width: 1,
					height: 1,
				}}
				value={props.value ? ensureEndOfDayIfNoTime(props.value) : ''}
				onChange={() => {}}
			/>
			<input
				readOnly
				value={props.value ? formatLabel(props.value) : ''}
				placeholder="ДД.ММ.ГГГГ ЧЧ:ММ"
				style={{ ...inputStyle(), flex: 1 }}
			/>
			<button
				ref={iconBtnRef}
				type="button"
				className="notifications-btn header-red-btn"
				aria-label="Выбрать дату окончания"
				title="Календарь"
				onClick={open}
			>
				<Icon icon={iconCalendar as never} size={30} className="header-icon-accent" />
			</button>
			{props.value ? (
				<button type="button" onClick={() => props.onChange('')} style={btnStyle('secondary')}>
					Сброс
				</button>
			) : null}
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

function btnStyle(kind: 'primary' | 'secondary'): React.CSSProperties {
	if (kind === 'primary') {
		return {
			borderRadius: 12,
			border: '2px solid var(--godmode-border)',
			background: 'var(--godmode-accent)',
			padding: '10px 12px',
			color: '#fff',
			cursor: 'pointer',
		};
	}
	return {
		borderRadius: 12,
		border: '2px solid var(--godmode-border)',
		background: 'var(--godmode-bg-secondary)',
		padding: '10px 12px',
		color: 'var(--godmode-text-primary)',
		cursor: 'pointer',
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

function thStyle(): React.CSSProperties {
	return { textAlign: 'left', padding: '8px 10px', fontWeight: 600, whiteSpace: 'nowrap' };
}

function tdStyle(): React.CSSProperties {
	return { padding: '10px 10px', verticalAlign: 'top', whiteSpace: 'nowrap' };
}

