import type { Pool } from 'pg';

export type AuthEvent = 'login' | 'logout' | `server_restart_${string}`;

export async function logAdminAuthEvent(
	pool: Pool,
	ev: {
		username: string;
		event: AuthEvent | string;
		ip?: string | null;
		userAgent?: string | null;
	},
): Promise<void> {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS admin_auth_log (
			id BIGSERIAL PRIMARY KEY,
			username TEXT NOT NULL,
			event TEXT NOT NULL,
			ip TEXT,
			user_agent TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);
	`);
	await pool.query(
		`INSERT INTO admin_auth_log(username, event, ip, user_agent) VALUES ($1, $2, $3, $4)`,
		[ev.username, ev.event, ev.ip ?? null, ev.userAgent ?? null],
	);
}

