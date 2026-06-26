import { Unbounded } from 'next/font/google';
import type { Metadata } from 'next';
import '../styles/reset.css';
import '../styles/godmode/utilities.scss';

const unbounded = Unbounded({
	subsets: ['latin', 'cyrillic'],
	weight: ['400', '500', '600'],
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Atomic Hytale',
	description: 'Метрики и состояние сервиса',
	icons: {
		icon: [
			{ url: '/favicon.ico', type: 'image/x-icon' },
			{ url: '/hytale.ico', type: 'image/x-icon' },
		],
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ru">
			<head>
				<link rel="icon" href="/favicon.ico" sizes="any" />
				<link rel="icon" href="/hytale.ico" sizes="any" />
				<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Material+Icons&display=swap" />
				<link
					rel="stylesheet"
					href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
				/>
			</head>
			<body className={unbounded.className}>{children}</body>
		</html>
	);
}
