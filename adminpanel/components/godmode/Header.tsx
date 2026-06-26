'use client';

import React, { useState } from 'react';
import { iconBellRing, iconFullscreen } from '@sit-onyx/icons';
import { Icon } from './Icon';

export function Header() {
	const [notifications, setNotifications] = useState(0);
	const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

	const clearNotifications = () => {
		setNotifications(0);
		setIsNotificationsOpen(false);
	};

	const toggleNotifications = () => {
		setIsNotificationsOpen(!isNotificationsOpen);
	};

	return (
		<header className="godmode-header">
			<div className="header-left">
				<h1 className="header-title">Atomic Hytale</h1>
			</div>
			<div className="header-right">
				<div className="notifications">
					<button
						type="button"
						className="notifications-btn header-red-btn"
						onClick={toggleNotifications}
						title="Уведомления"
					>
						<Icon icon={iconBellRing as never} size={30} className="header-icon-accent" />
						{notifications > 0 && <span className="notification-badge">{notifications}</span>}
					</button>
					{notifications > 0 && isNotificationsOpen && (
						<div className="notifications-popup">
							<div className="popup-header">
								<h4>Уведомления ({notifications})</h4>
								<button type="button" onClick={clearNotifications}>
									Очистить все
								</button>
							</div>
							<div className="notification-list">
								<p style={{ padding: '12px', margin: 0, color: '#666' }}>Нет активных уведомлений</p>
							</div>
						</div>
					)}
				</div>
				<button
					type="button"
					className="notifications-btn header-red-btn"
					title="Полноэкранный режим"
					onClick={() => {
						if (!document.fullscreenElement) {
							void document.documentElement.requestFullscreen().catch(() => {});
						} else {
							void document.exitFullscreen().catch(() => {});
						}
					}}
				>
					<Icon icon={iconFullscreen as never} size={30} className="header-icon-accent" />
				</button>
			</div>
		</header>
	);
}
