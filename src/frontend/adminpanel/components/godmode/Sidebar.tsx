'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	iconDashboard,
	iconBank,
	iconBarGraph,
	iconUserGroup,
	iconVoucher,
	iconStar,
	iconLogout,
} from '@sit-onyx/icons';

const iconPosts = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2z"/></svg>';
import { Icon } from './Icon';

export function Sidebar() {
	const pathname = usePathname();

	const menuItems = [
		{ id: 'dashboard', label: 'Обзор', icon: iconDashboard, href: '/dashboard' },
		{ id: 'payments', label: 'Оплаты', icon: iconBank, href: '/dashboard/payments' },
		{ id: 'analytics', label: 'Аналитика', icon: iconBarGraph, href: '/dashboard/analytics' },
		{ id: 'promocodes', label: 'Промокоды', icon: iconVoucher, href: '/dashboard/promocodes' },
		{ id: 'players', label: 'Игроки', icon: iconUserGroup, href: '/dashboard/players' },
		{ id: 'shop', label: 'Премиум', icon: iconStar, href: '/dashboard/shop' },
		{ id: 'posts', label: 'Посты', icon: iconPosts, href: '/dashboard/posts' },
	];

	const isActive = (href: string) => {
		if (href === '/dashboard') {
			return pathname === '/dashboard';
		}
		return pathname === href || pathname.startsWith(`${href}/`);
	};

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}

	return (
		<div className="sidebar collapsed">
			<nav className="sidebar-nav">
				{menuItems.map((item) => (
					<div key={item.id} className="nav-section">
						<Link
							href={item.href}
							className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
						>
							<span className="nav-icon">
								<Icon icon={item.icon as never} size={32} />
							</span>
							<span className="nav-label-tooltip">{item.label}</span>
						</Link>
					</div>
				))}
			</nav>
			<div className="sidebar-footer">
				<div className="nav-section">
					<button type="button" className="nav-item nav-item-button" onClick={() => void logout()}>
						<span className="nav-icon">
							<Icon icon={iconLogout as never} size={32} />
						</span>
						<span className="nav-label-tooltip">Выйти</span>
					</button>
				</div>
			</div>
		</div>
	);
}
