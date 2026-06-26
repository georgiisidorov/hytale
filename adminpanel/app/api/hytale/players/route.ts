import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPool } from '@/lib/db';
import { decodeSessionToken } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth-constants';
import {
	getLastPermissionsSync,
	readPermissionsUserMap,
	syncPlayersFromPermissionsIfNeeded,
} from '@/lib/players-sync';
import { moderationDisplay } from '@/lib/moderation-display';
import { readPlayerNamesMap } from '@/lib/player-names';
import { parseServerId, serverLabel, serverRootDir, type HytaleServerId } from '@/lib/hytale-server-instance';

async function requireAdmin(): Promise<boolean> {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token) return false;
	return (await decodeSessionToken(token)) != null;
}

export async function GET(req: Request) {
	try {
		if (!(await requireAdmin())) {
			return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
		}

		const url = new URL(req.url);
		const serverId = parseServerId(url.searchParams.get('server'));
		const q = (url.searchParams.get('q') ?? '').trim();
		const forceSync = url.searchParams.get('forceSync') === '1' || url.searchParams.get('sync') === '1';
		/** Только пересечение БД ∩ permissions.json (иначе — все игроки из БД + ранг из файла, если есть). */
		const registeredOnly = url.searchParams.get('registeredOnly') === '1';
		const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '2000') || 2000, 1), 5000);

		const pool = getPool();

		const syncMeta = await syncPlayersFromPermissionsIfNeeded(pool, { force: forceSync, serverId });

		const perm = await readPermissionsUserMap(serverId);
		const permMap = perm.map;
		const namesLower = Array.from(permMap.keys());
		const playerNames = await readPlayerNamesMap(serverId);

		if (registeredOnly && namesLower.length === 0) {
			const lastSyncEmpty = await getLastPermissionsSync(pool, serverId).catch(() => null);
			return NextResponse.json({
				ok: true,
				rows: [],
				registeredOnly: true,
				server: serverId,
				serverLabel: serverLabel(serverId),
				permissionsPath: perm.path ?? `${serverRootDir(serverId)}/permissions.json`,
				permissionsUsersCount: 0,
				syncError: syncMeta.error,
				permissionsError: perm.error,
				lastPermissionsSync: lastSyncEmpty?.toISOString() ?? null,
			});
		}

		const where: string[] = [];
		const args: unknown[] = [];
		let idx = 1;
		if (registeredOnly && namesLower.length > 0) {
			where.push(`lower(p.username) = ANY($${idx++}::text[])`);
			args.push(namesLower);
		}
		if (q) {
			where.push(`p.username ILIKE $${idx++}`);
			args.push(`%${q}%`);
		}
		args.push(limit);

		const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

		const { rows: dbRows } = await pool.query<{
			id: number;
			username: string;
			created_at: string;
			balance: string;
			coins: string;
			crystals: string;
			moderation_status: string;
			moderation_until: string | null;
		}>(
			`SELECT
				p.id,
				p.username,
				p.created_at,
				COALESCE(b.balance, 0)::text AS balance,
				COALESCE(b.coins, 0)::text AS coins,
				COALESCE(b.crystals, 0)::text AS crystals,
				COALESCE(p.moderation_status, 'active') AS moderation_status,
				p.moderation_until
			FROM hytale_players p
			LEFT JOIN hytale_player_balance b ON b.player_id = p.id
			${whereSql}
			ORDER BY p.id DESC
			LIMIT $${idx}`,
			args,
		);

		const rows = dbRows.map((r) => {
			const uuidLower = r.username.toLowerCase();
			const info = permMap.get(uuidLower);
			const in_permissions = Boolean(info);
			const rank = info?.rank ?? '—';
			const disp = moderationDisplay(r.moderation_status, r.moderation_until);
			const display_username = playerNames.map.get(uuidLower) ?? null;
			return {
				id: r.id,
				uuid: r.username,
				username: display_username ?? r.username,
				display_username,
				rank,
				in_permissions,
				moderation_status: r.moderation_status,
				moderation_until: r.moderation_until,
				status_label: disp.label,
				status_kind: disp.kind,
				balance: r.coins,
				coins: r.coins,
				crystals: r.crystals,
				created_at: r.created_at,
			};
		});

		const lastSync = await getLastPermissionsSync(pool, serverId).catch(() => null);

		return NextResponse.json({
			ok: true,
			rows,
			registeredOnly,
			server: serverId,
			serverLabel: serverLabel(serverId),
			permissionsPath: perm.path ?? `${serverRootDir(serverId)}/permissions.json`,
			permissionsUsersCount: permMap.size,
			playerNamesError: playerNames.error,
			syncError: syncMeta.error,
			permissionsError: perm.error,
			lastPermissionsSync: lastSync?.toISOString() ?? null,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
