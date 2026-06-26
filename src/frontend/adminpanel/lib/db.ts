import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
	const url = process.env.DATABASE_URL;
	if (!url?.trim()) {
		throw new Error('DATABASE_URL не задан');
	}
	if (!pool) {
		pool = new Pool({ connectionString: url.trim(), max: 8, idleTimeoutMillis: 30_000 });
	}
	return pool;
}

