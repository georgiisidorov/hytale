import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// Корень репозитория targetads: переменные из ./.env (как у бэкенда), а не только из src/frontend
const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(frontendDir, '..', '..');
loadEnvConfig(repoRoot);

const nextConfig: NextConfig = {
	reactStrictMode: true,
	output: 'standalone',
	// Монорепо: корректный трейсинг зависимостей для standalone-образа
	outputFileTracingRoot: repoRoot,
};

export default nextConfig;
