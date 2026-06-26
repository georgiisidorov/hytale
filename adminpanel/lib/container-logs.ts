import { fetchContainerLogs } from './docker-logs';
import { getPool } from './db';

export const ALLOWED_CONTAINERS = [
	'hytale-caddy',
	'hytale-adminpanel',
	'hytale-admin-db',
	'hytale-prometheus',
	'hytale-node-exporter',
	'hytale-cadvisor',
	'hytale-server-dev',
	'hytale-server-prod',
] as const;

export type AllowedContainer = (typeof ALLOWED_CONTAINERS)[number] | 'all' | 'admin-auth';

async function fetchAdminAuthLogs(tail: number): Promise<string[]> {
	const pool = getPool();
	const { rows } = await pool.query<
		{
			username: string;
			event: string;
			ip: string | null;
			user_agent: string | null;
			created_at: string;
		}
	>(
		`SELECT
			username,
			event,
			ip,
			user_agent,
			to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS created_at
		 FROM admin_auth_log
		 ORDER BY created_at DESC
		 LIMIT $1`,
		[tail],
	);
	return rows.map((r) => {
		const ip = r.ip ?? '-';
		const ua = (r.user_agent ?? '-').replace(/\s+/g, ' ').trim();
		return `[admin-auth] ${r.created_at} UTC | ${r.event} | user=${r.username} | ip=${ip} | ua=${ua}`;
	});
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
	let t: NodeJS.Timeout | null = null;
	return Promise.race([
		p,
		new Promise<T>((_, reject) => {
			t = setTimeout(() => reject(new Error(`timeout_after_${ms}ms`)), ms);
		}),
	]).finally(() => {
		if (t) clearTimeout(t);
	});
}

export async function getContainerLogLines(args: { container: AllowedContainer; tail?: number }): Promise<
	| { ok: true; lines: string[] }
	| { ok: false; error: string; lines: string[] }
> {
	const tail = Math.max(10, Math.min(2000, Number(args.tail ?? 200)));
	const container = args.container;

	if (container === 'admin-auth') {
		try {
			const lines = await withTimeout(fetchAdminAuthLogs(tail), 4500);
			return { ok: true, lines };
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			return { ok: false, error: `admin_auth_log_unavailable:${msg}`, lines: [] };
		}
	}

	const containers =
		container === 'all' ? [...ALLOWED_CONTAINERS] : ALLOWED_CONTAINERS.includes(container as never) ? [container] : [];

	if (containers.length === 0) {
		return { ok: false, error: 'container_not_allowed', lines: [] };
	}

	try {
		const lines = await withTimeout(fetchContainerLogs(containers, { tail }), 4500);
		return {
			ok: true,
			lines: lines.map((l) => `[${l.container}] ${l.line}`),
		};
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, error: `docker_logs_timeout_or_error:${msg}`, lines: [] };
	}
}
