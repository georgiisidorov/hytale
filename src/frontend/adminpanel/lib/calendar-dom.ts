/** Убирает виджеты CalendarJS, оставшиеся на document.body после SPA-навигации. */
export function purgeCalendarWidgets(): void {
	if (typeof document === 'undefined') return;
	document.body.classList.remove('calendar-open', 'payments-page', 'promocodes-page');
	document.body.style.removeProperty('--payments-cal-left');
	document.body.style.removeProperty('--payments-cal-top');
	document.querySelectorAll('.lm-calendar').forEach((el) => el.remove());
}

export function destroyCalendarInstance(cal: { destroy?: () => void; close?: () => void } | null): void {
	if (!cal) return;
	try {
		cal.close?.();
	} catch {
		// no-op
	}
	try {
		cal.destroy?.();
	} catch {
		// no-op
	}
	purgeCalendarWidgets();
}
