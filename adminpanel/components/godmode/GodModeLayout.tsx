'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import '@/styles/godmode/index.scss';

interface GodModeLayoutProps {
	children: React.ReactNode;
}

export default function GodModeLayout({ children }: GodModeLayoutProps) {
	const pathname = usePathname();
	const isDashboardRoot = pathname === '/dashboard';
	return (
		<div className="godmode-layout">
			<Sidebar />
			<div className="godmode-main-content">
				<Header />
				<main className="godmode-main-area">
					<div className={`godmode-main-content-area${isDashboardRoot ? ' dashboard-main-content-area' : ''}`}>{children}</div>
				</main>
			</div>
		</div>
	);
}
