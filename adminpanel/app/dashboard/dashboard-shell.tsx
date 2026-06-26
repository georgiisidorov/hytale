'use client';

import { usePathname } from 'next/navigation';
import React from 'react';
import GodModeLayout from '../../components/godmode/GodModeLayout';
import { purgeCalendarWidgets } from '../../lib/calendar-dom';

export function DashboardShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();

	React.useEffect(() => {
		const needsCalendar =
			pathname?.includes('/dashboard/payments') || pathname?.includes('/dashboard/promocodes');
		if (!needsCalendar) {
			purgeCalendarWidgets();
		}
	}, [pathname]);

	return <GodModeLayout>{children}</GodModeLayout>;
}
