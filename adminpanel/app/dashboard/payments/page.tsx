'use client';

import React from 'react';
import CalendarJS from '@calendarjs/ce';
import '@calendarjs/ce/dist/style.css';
import { destroyCalendarInstance } from '../../../lib/calendar-dom';
import { iconCalendar } from '@sit-onyx/icons';
import { Icon } from '@/components/godmode/Icon';

type PaymentRow = {
	amount: string;
	username: string;
	payment_type: string;
	created_at: string;
};

const TZ_OFFSET = '+03:00'; // UTC+3 (Europe/Moscow)
const MIN_DATE = '2026-04-01T00:00:00'; // нельзя раньше апреля 2026
const MAX_DATE = '2100-01-01T00:00:00';
const MSK_SHIFT_MIN = 180; // фиксированный сдвиг к UTC: +03:00

function stripTz(s: string): string {
	return s.replace(/([+-]\d\d:\d\d|Z)\s*$/, '');
}

function sanitizeCalendarString(s: string): string {
	const v = stripTz(String(s ?? '')).trim();
	if (!v) return '';
	// CalendarJS иногда отдаёт плейсхолдеры времени вроде "HH:00"
	const v2 = v.replace(/\bHH\b/g, '00').replace(' ', 'T');
	return v2;
}

function dateToIsoLocalNoTz(d: Date): string {
	// CalendarJS может отдавать Date в локальной TZ; нам важен стабильный формат без TZ
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function normalizeCalendarPart(v: unknown): string {
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

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

function dateToIsoNoTz(d: Date): string {
	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

/**
 * CalendarJS в нашей интеграции должен работать как "UTC+3 фиксированно",
 * независимо от TZ браузера. Поэтому:
 * - входящую строку (без TZ) трактуем как UTC,
 * - прибавляем +03:00,
 * - храним/показываем как ISO без суффикса TZ (чтобы CalendarJS не прыгал по зонам).
 */
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
	// если уже есть timezone — оставляем
	if (/[+-]\d\d:\d\d$/.test(v) || /Z$/.test(v)) return v;
	return `${v}${TZ_OFFSET}`;
}

function PaymentsRangePicker(props: { from: string; to: string; onChange: (next: { from: string; to: string }) => void }) {
	const startInputRef = React.useRef<HTMLInputElement | null>(null);
	const calendarRef = React.useRef<{
		setValue?: (v: string) => void;
		getValue?: () => unknown;
		update?: () => void;
		close?: () => void;
		open?: () => void;
	} | null>(null);
	const onChangeRef = React.useRef(props.onChange);
	const iconBtnRef = React.useRef<HTMLButtonElement | null>(null);
	const pendingFromRef = React.useRef<string>('');
	const pendingToRef = React.useRef<string>('');
	const chooseCleanupRef = React.useRef<null | (() => void)>(null);
	const committingRef = React.useRef(false);
	const observerCleanupRef = React.useRef<null | (() => void)>(null);

	function relabelCalendarButton() {
		const openModals = document.querySelectorAll('.lm-calendar .lm-modal:not([closed=\"true\"])');
		const root: Element | null = openModals.length ? openModals[openModals.length - 1] : null;
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

	function relabelCalendarButtonSoon() {
		let tries = 0;
		const tick = () => {
			tries += 1;
			relabelCalendarButton();
			if (tries < 12) {
				window.requestAnimationFrame(tick);
			}
		};
		window.requestAnimationFrame(tick);
	}

	function ensureConfirmWired() {
		const openModals = document.querySelectorAll('.lm-calendar .lm-modal:not([closed=\"true\"])');
		const root: Element | null = openModals.length ? openModals[openModals.length - 1] : null;
		const el = (root ?? document).querySelector('.lm-calendar-update input, .lm-calendar-update button');
		if (!el) return;

		relabelCalendarButton();

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
			const raw = typeof rawFromApi === 'string' ? rawFromApi : (startInputRef.current?.value ?? '');
			const [rawFrom, rawTo] = raw.split(',');
			const fFromInput = rawFrom ? normalizeCalendarPart(rawFrom) : '';
			const tFromInput = rawTo ? normalizeCalendarPart(rawTo) : '';
			const f = fFromInput || pendingFromRef.current || stripTz(props.from || '');
			const t = tFromInput || pendingToRef.current || stripTz(props.to || '');
			committingRef.current = true;
			onChangeRef.current({ from: f, to: t });
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
		ensureConfirmWired();
		observerCleanupRef.current = () => obs.disconnect();
	}

	const open = React.useCallback(() => {
		document.body.classList.add('calendar-open');
		committingRef.current = false;
		// фокус нужен, чтобы CalendarJS понимал "origin input"
		startInputRef.current?.focus();

		// Смещение календаря влево: позиционируем относительно иконки
		const btn = iconBtnRef.current;
		if (btn) {
			const r = btn.getBoundingClientRect();
			const left = Math.max(16, Math.min(r.left, window.innerWidth - 360));
			const top = Math.max(16, Math.min(r.bottom + 10, window.innerHeight - 420));
			document.body.style.setProperty('--payments-cal-left', `${Math.round(left)}px`);
			document.body.style.setProperty('--payments-cal-top', `${Math.round(top)}px`);
		}

		calendarRef.current?.open?.();
		relabelCalendarButtonSoon();
		startObserver();
	}, []);

	React.useEffect(() => {
		onChangeRef.current = props.onChange;
	}, [props.onChange]);

	React.useEffect(() => {
		const el = startInputRef.current;
		if (!el) return;

		const rangeValue = props.from && props.to ? `${props.from},${props.to}` : undefined;

		const cal = CalendarJS.Calendar(document.body, {
			type: 'default',
			input: el,
			range: true,
			time: true,
			format: 'YYYY-MM-DDTHH:mm:ss',
			value: rangeValue,
			validRange: [MIN_DATE, MAX_DATE],
			onopen: () => {
				document.body.classList.add('calendar-open');
				committingRef.current = false;
				relabelCalendarButtonSoon();
				startObserver();
			},
			onclose: () => {
				document.body.classList.remove('calendar-open');
			},
			onchange: (_self: unknown, value: unknown) => {
				// В range onchange может приходить массив или строка вида "start,end"
				if (Array.isArray(value)) {
					const nextFrom = normalizeCalendarPart(value[0]);
					const nextTo = normalizeCalendarPart(value[1]);
					pendingFromRef.current = nextFrom;
					pendingToRef.current = nextTo;
					return;
				}
				if (typeof value === 'string') {
					const [rawFrom, rawTo] = value.split(',');
					const nextFrom = normalizeCalendarPart(rawFrom || '');
					const nextTo = normalizeCalendarPart(rawTo || '');
					pendingFromRef.current = nextFrom;
					pendingToRef.current = nextTo;
					return;
				}
			},
		}) as unknown as {
			setValue?: (v: string) => void;
			getValue?: () => unknown;
			update?: () => void;
			close?: () => void;
			open?: () => void;
		};

		calendarRef.current = cal;
		return () => {
			chooseCleanupRef.current?.();
			observerCleanupRef.current?.();
			destroyCalendarInstance(cal);
			chooseCleanupRef.current = null;
			observerCleanupRef.current = null;
			calendarRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	React.useEffect(() => {
		// Обновляем отображение в input (Calendar может пытаться писать comma-range, но нам нужна только "from")
		if (!startInputRef.current) return;
		// ВАЖНО: Calendar парсит значение инпута по своему `format`.
		// Поэтому здесь держим исходную строку ISO-формата, чтобы не ломать внутреннюю логику и не уводить месяц.
		startInputRef.current.value = stripTz(props.from || '');
		// Если нужно — синхронизируем значение в самом calendar.
		if (props.from && props.to) {
			calendarRef.current?.setValue?.(`${stripTz(props.from)},${stripTz(props.to)}`);
		}
		pendingFromRef.current = stripTz(props.from || '');
		pendingToRef.current = stripTz(props.to || '');
	}, [props.from, props.to]);

	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
			{/* скрытый input — только для привязки CalendarJS */}
			<input
				ref={startInputRef}
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
				value={stripTz(props.from)}
				onChange={() => {}}
			/>

			<button
				ref={iconBtnRef}
				type="button"
				onClick={open}
				className="payments-cal-btn"
				style={{
					height: 32,
					width: 32,
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					borderRadius: 10,
					border: 'none',
					background: 'transparent',
					color: '#fff',
					cursor: 'pointer',
					padding: 0,
				}}
				title="Выбрать период"
				aria-label="Выбрать период"
			>
				<Icon icon={iconCalendar as never} size={32} />
			</button>

			<div
				style={{
					padding: '8px 4px',
					borderRadius: 12,
					border: 'none',
					background: 'transparent',
					color: 'var(--godmode-text-primary)',
					fontVariantNumeric: 'tabular-nums',
					minWidth: 280,
				}}
			>
				{props.from && props.to ? `${formatLabel(props.from)} — ${formatLabel(props.to)}` : 'Выбрать период'}
			</div>
		</div>
	);
}

export default function PaymentsPage() {
	const [from, setFrom] = React.useState('');
	const [to, setTo] = React.useState('');
	const [rows, setRows] = React.useState<PaymentRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const load = React.useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const qs = new URLSearchParams();
			if (from.trim()) qs.set('from', withTz(from));
			if (to.trim()) qs.set('to', withTz(to));
			qs.set('limit', '500');
			const r = await fetch(`/api/hytale/payments?${qs.toString()}`);
			const j = (await r.json()) as { ok: boolean; rows?: PaymentRow[]; error?: string };
			if (!j.ok) throw new Error(j.error ?? 'Не удалось загрузить оплаты');
			setRows(j.rows ?? []);
		} catch (e) {
			setRows([]);
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, [from, to]);

	React.useEffect(() => {
		// Автопоказ: грузим когда выбран полный диапазон или диапазон сброшен.
		if ((from && to) || (!from && !to)) {
			void load();
		}
	}, [from, to, load]);

	React.useEffect(() => {
		document.body.classList.add('payments-page');
		return () => {
			document.body.classList.remove('payments-page');
			document.body.classList.remove('calendar-open');
		};
	}, []);

	return (
		<div className="dashboard-page">
			<div className="payments-content">
				<div className="dashboard-card">
				<div
					style={{
						display: 'flex',
						gap: 12,
						alignItems: 'center',
						justifyContent: 'flex-start',
						flexWrap: 'wrap',
						marginTop: 12,
						width: '100%',
					}}
				>
					<PaymentsRangePicker
						from={from}
						to={to}
						onChange={({ from: nextFrom, to: nextTo }) => {
							setFrom(nextFrom);
							setTo(nextTo);
						}}
					/>
					{loading ? <div style={{ opacity: 0.75 }}>Загрузка…</div> : null}
					{error ? <div style={{ color: '#ff6b6b' }}>{error}</div> : null}
				</div>

				<div style={{ marginTop: 14, overflowX: 'auto' }}>
					<style jsx global>{`
						/* CalendarJS attaches its modal to document.body;
						   центрируем только на странице оплат. */
						.payments-page .lm-calendar .lm-modal[closed='true'] {
							display: none !important;
						}

						.payments-page .lm-calendar .lm-modal:not([closed='true']) {
							position: fixed !important;
							left: var(--payments-cal-left, 80px) !important;
							top: var(--payments-cal-top, 120px) !important;
							transform: none !important;
							z-index: 999999 !important;
							border: 2px solid var(--godmode-accent) !important;
							border-radius: 14px !important;
							overflow: hidden !important;
							background: var(--godmode-bg-secondary) !important;
						}

						/* Blur: всё остальное на странице, кроме календаря */
						body.payments-page.calendar-open::before {
							content: '';
							position: fixed;
							inset: 0;
							background: rgba(0, 0, 0, 0.18);
							backdrop-filter: blur(6px);
							-webkit-backdrop-filter: blur(6px);
							z-index: 999998; /* ниже чем у календаря */
							pointer-events: none;
						}

						/* Фон календаря = secondary (а не дефолтный) */
						body.payments-page .lm-calendar,
						body.payments-page .lm-calendar .lm-modal,
						body.payments-page .lm-calendar .lm-calendar-header > div:first-child,
						body.payments-page .lm-calendar .lm-calendar-weekdays,
						body.payments-page .lm-calendar .lm-calendar-content > div,
						body.payments-page .lm-calendar .lm-calendar-footer {
							background: var(--godmode-bg-secondary) !important;
							color: var(--godmode-text-primary) !important;
						}

						/* Убираем RESET/DONE, оставляем кнопку подтверждения (Update в footer) */
						body.payments-page .lm-calendar-options {
							display: none !important;
						}

						/* Выделение диапазона и выбранной даты = красный */
						body.payments-page .lm-calendar {
							--lm-main-color: var(--godmode-accent) !important;
							--lm-main-color-alpha: rgba(128, 0, 0, 0.45) !important;
						}

						body.payments-page .lm-calendar .lm-calendar-content > div[data-selected='true'] {
							background-color: rgba(128, 0, 0, 0.22) !important;
							color: var(--godmode-text-primary) !important;
						}

						/* Иконка календаря: белая, hover — красный полупрозрачный */
						.payments-cal-btn {
							color: #ffffff !important;
						}
						.payments-cal-btn:hover {
							color: rgba(128, 0, 0, 0.4) !important;
						}
						.payments-cal-btn .icon-wrapper svg,
						.payments-cal-btn .icon-wrapper img {
							width: 100% !important;
							height: 100% !important;
							display: block;
						}

						/* Принудительно делаем SVG белым через currentColor */
						.payments-cal-btn .icon-wrapper svg,
						.payments-cal-btn .icon-wrapper svg * {
							fill: currentColor !important;
							stroke: currentColor !important;
							filter: none !important;
						}
					`}</style>

					<table style={{ width: '100%', borderCollapse: 'collapse' }}>
						<thead>
							<tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
								<th style={{ padding: '10px 8px' }}>Сумма</th>
								<th style={{ padding: '10px 8px' }}>Юзернейм</th>
								<th style={{ padding: '10px 8px' }}>Тип платежа</th>
								<th style={{ padding: '10px 8px' }}>Дата</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((r, idx) => (
								<tr key={`${r.username}-${r.created_at}-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
									<td style={{ padding: '10px 8px', fontVariantNumeric: 'tabular-nums' }}>{r.amount}</td>
									<td style={{ padding: '10px 8px' }}>{r.username}</td>
									<td style={{ padding: '10px 8px' }}>{r.payment_type}</td>
									<td style={{ padding: '10px 8px', fontVariantNumeric: 'tabular-nums', opacity: 0.9 }}>{r.created_at}</td>
								</tr>
							))}
							{!loading && rows.length === 0 ? (
								<tr>
									<td colSpan={4} style={{ padding: '14px 8px', opacity: 0.7 }}>
										Нет оплат за выбранный период.
									</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</div>
				</div>
			</div>
		</div>
	);
}

