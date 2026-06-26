import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// Корень репозитория targetads: переменные из ./.env (как у бэкенда), а не только из src/frontend
const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(frontendDir, '..', '..');
loadEnvConfig(repoRoot);

const CORS_HEADERS = [
	{ key: 'Access-Control-Allow-Origin', value: '*' },
	{ key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
	{ key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
];

const nextConfig: NextConfig = {
	reactStrictMode: true,
	output: 'standalone',
	// Монорепо: корректный трейсинг зависимостей для standalone-образа
	outputFileTracingRoot: repoRoot,
	async headers() {
		return [
			{ source: '/api/:path*', headers: CORS_HEADERS },
		];
	},
};

export default nextConfig;
