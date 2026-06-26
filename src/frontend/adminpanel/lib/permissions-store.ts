import { promises as fs } from 'fs';
import path from 'path';
import { applyRankToUserEntry, ensurePermissionGroups } from '@/lib/permissions-ranks';
import { type HytaleServerId, serverRootDir as resolveServerRoot } from '@/lib/hytale-server-instance';

export type ModerationAction = 'active' | 'banned' | 'temp_kick';

export type PermissionsAdminpanelModerationEntry = {
	status: ModerationAction;
	/** ISO string */
	until?: string | null;
	updatedAt?: string | null;
};

export type PermissionsJsonRoot = Record<string, unknown> & {
	users?: Record<string, unknown>;
	adminpanel?: {
		moderation?: Record<string, PermissionsAdminpanelModerationEntry>;
	};
};

export function serverRootDir(serverId?: HytaleServerId): string {
	return resolveServerRoot(serverId);
}

export function permissionsJsonPath(serverId?: HytaleServerId): string {
	return path.join(serverRootDir(serverId), 'permissions.json');
}

export async function readPermissionsJson(
	serverId?: HytaleServerId,
): Promise<{ path: string; parsed: PermissionsJsonRoot | null; error?: string }> {
	const p = permissionsJsonPath(serverId);
	try {
		const raw = await fs.readFile(p, 'utf8');
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw) as unknown;
		} catch {
			return { path: p, parsed: null, error: `permissions.json: невалидный JSON (${p})` };
		}
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return { path: p, parsed: null, error: `permissions.json: JSON не объект (${p})` };
		}
		return { path: p, parsed: parsed as PermissionsJsonRoot };
	} catch (e) {
		const code = (e as NodeJS.ErrnoException)?.code;
		const msg = e instanceof Error ? e.message : String(e);
		if (code === 'ENOENT') {
			return { path: p, parsed: null, error: `Файл не найден (mount?): ${p}` };
		}
		return { path: p, parsed: null, error: `${msg} (${p})` };
	}
}

async function atomicWriteJson(p: string, obj: unknown): Promise<void> {
	const dir = path.dirname(p);
	const tmp = path.join(dir, `.permissions.json.tmp.${process.pid}.${Date.now()}`);
	const data = JSON.stringify(obj, null, 2) + '\n';
	await fs.writeFile(tmp, data, 'utf8');
	await fs.rename(tmp, p);
}

export function getAdminpanelModeration(root: PermissionsJsonRoot): Record<string, PermissionsAdminpanelModerationEntry> {
	const ap = root.adminpanel;
	const mod = ap?.moderation;
	if (!mod || typeof mod !== 'object' || Array.isArray(mod)) return {};
	return mod as Record<string, PermissionsAdminpanelModerationEntry>;
}

export async function setModerationInPermissionsJson(params: {
	username: string;
	status: ModerationAction;
	until: Date | null;
	serverId?: HytaleServerId;
}): Promise<{ ok: true } | { ok: false; error: string }> {
	const { path: p, parsed, error } = await readPermissionsJson(params.serverId);
	if (!parsed) return { ok: false, error: error ?? `Не удалось прочитать ${p}` };

	const root = parsed;
	if (!root.adminpanel || typeof root.adminpanel !== 'object' || Array.isArray(root.adminpanel)) {
		root.adminpanel = {};
	}
	if (!root.adminpanel.moderation || typeof root.adminpanel.moderation !== 'object' || Array.isArray(root.adminpanel.moderation)) {
		root.adminpanel.moderation = {};
	}
	const key = params.username.trim().toLowerCase();
	const entry: PermissionsAdminpanelModerationEntry = {
		status: params.status,
		until: params.until ? params.until.toISOString() : null,
		updatedAt: new Date().toISOString(),
	};
	root.adminpanel.moderation[key] = entry;

	try {
		await atomicWriteJson(p, root);
		return { ok: true };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, error: `Не удалось записать permissions.json: ${msg}` };
	}
}

const ALLOWED_RANKS = ['Regular', 'VIP', 'Admin', 'OP'] as const;
export type AllowedRank = (typeof ALLOWED_RANKS)[number];

export async function setRankInPermissionsJson(params: {
	uuid: string;
	rank: AllowedRank;
	serverId?: HytaleServerId;
}): Promise<{ ok: true } | { ok: false; error: string }> {
	const { path: p, parsed, error } = await readPermissionsJson(params.serverId);
	if (!parsed) return { ok: false, error: error ?? `Не удалось прочитать ${p}` };

	const root = parsed;
	ensurePermissionGroups(root);
	if (!root.users || typeof root.users !== 'object' || Array.isArray(root.users)) {
		root.users = {};
	}
	const users = root.users as Record<string, unknown>;
	const uuid = params.uuid.trim();
	if (!uuid) return { ok: false, error: 'bad uuid' };

	let user = users[uuid];
	if (!user || typeof user !== 'object' || Array.isArray(user)) {
		user = {};
		users[uuid] = user;
	}
	const u = user as Record<string, unknown>;
	applyRankToUserEntry(u, params.rank);

	try {
		await atomicWriteJson(p, root);
		return { ok: true };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, error: `Не удалось записать permissions.json: ${msg}` };
	}
}

