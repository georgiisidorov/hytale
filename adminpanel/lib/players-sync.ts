import type { Pool } from 'pg';
import { extractPermissionUsers } from '@/lib/permissions-json';
import { type HytaleServerId } from '@/lib/hytale-server-instance';
import { getAdminpanelModeration, readPermissionsJson } from '@/lib/permissions-store';

function syncKey(serverId: HytaleServerId): string {
	return `last_permissions_sync:${serverId}`;
}
const DAY_MS = 24 * 60 * 60 * 1000;

export async function readPermissionsUserMap(serverId?: HytaleServerId): Promise<{
	map: ReturnType<typeof extractPermissionUsers>;
	error?: string;
	path?: string;
}> {
	const r = await readPermissionsJson(serverId);
	if (!r.parsed) {
		return { map: new Map(), error: r.error, path: r.path };
	}
	return { map: extractPermissionUsers(r.parsed), path: r.path };
}

export async function getLastPermissionsSync(pool: Pool, serverId: HytaleServerId): Promise<Date | null> {
	const r = await pool.query<{ value_timestamptz: string | null }>(
		`SELECT value_timestamptz FROM hytale_admin_meta WHERE key = $1`,
		[syncKey(serverId)],
	);
	const t = r.rows[0]?.value_timestamptz;
	return t ? new Date(t) : null;
}

async function touchPermissionsSync(pool: Pool, serverId: HytaleServerId): Promise<void> {
	await pool.query(
		`INSERT INTO hytale_admin_meta (key, value_timestamptz)
		 VALUES ($1, now())
		 ON CONFLICT (key) DO UPDATE SET value_timestamptz = excluded.value_timestamptz`,
		[syncKey(serverId)],
	);
}

/**
 * Импорт ников из permissions.json в hytale_players.
 * Так как источник истины — файл, при конфликте обновляем поля модерации из секции adminpanel.moderation.
 */
export async function syncPlayersFromPermissions(
	pool: Pool,
	serverId: HytaleServerId,
): Promise<{ inserted: number; error?: string }> {
	const r = await readPermissionsJson(serverId);
	if (!r.parsed) {
		return { inserted: 0, error: r.error };
	}
	const map = extractPermissionUsers(r.parsed);
	if (map.size === 0) return { inserted: 0, error: r.error };

	const moderation = getAdminpanelModeration(r.parsed);

	let inserted = 0;
	for (const { username } of map.values()) {
		const key = username.toLowerCase();
		const m = moderation[key];
		const status = m?.status === 'banned' || m?.status === 'temp_kick' ? m.status : 'active';
		const untilIso = typeof m?.until === 'string' && m.until.trim() ? m.until.trim() : null;
		const until = untilIso ? new Date(untilIso) : null;
		const untilDb = until && !Number.isNaN(until.getTime()) ? until : null;

		const ins = await pool.query(
			`INSERT INTO hytale_players (username, moderation_status, moderation_until)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (username) DO UPDATE
			 SET username = EXCLUDED.username,
			     moderation_status = EXCLUDED.moderation_status,
			     moderation_until = EXCLUDED.moderation_until
			 RETURNING (xmax = 0) AS inserted`,
			[username, status, untilDb],
		);
		if (ins.rows[0]?.inserted) inserted += 1;
	}

	await touchPermissionsSync(pool, serverId);
	return { inserted, error: r.error };
}

/** Раз в сутки или принудительно — подтянуть ники из permissions.json в БД. */
export async function syncPlayersFromPermissionsIfNeeded(
	pool: Pool,
	opts?: { force?: boolean; serverId?: HytaleServerId },
): Promise<{ error?: string }> {
	const serverId = opts?.serverId ?? 'dev';
	// Если БД пустая — всегда сначала наполняем её из permissions.json (источник истины).
	const cnt = await pool.query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM hytale_players`);
	const isEmpty = Number(cnt.rows[0]?.c ?? '0') === 0;

	if (opts?.force || isEmpty) {
		const r = await syncPlayersFromPermissions(pool, serverId);
		return { error: r.error };
	}
	const last = await getLastPermissionsSync(pool, serverId);
	if (!last || Date.now() - last.getTime() >= DAY_MS) {
		const r = await syncPlayersFromPermissions(pool, serverId);
		return { error: r.error };
	}
	return {};
}
