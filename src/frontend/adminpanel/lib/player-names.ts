import { promises as fs } from 'fs';
import path from 'path';
import { type HytaleServerId, serverRootDir } from '@/lib/hytale-server-instance';

type PlayerNamesJson = {
	players?: Record<string, string>;
};

function extractNameFromPlayerSave(parsed: unknown): string | null {
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
	const root = parsed as Record<string, unknown>;
	const components = root.Components;
	if (!components || typeof components !== 'object' || Array.isArray(components)) return null;
	const c = components as Record<string, unknown>;

	// Часто присутствует:
	// - Components.Nameplate.Text
	// - Components.DisplayName.DisplayName.RawText
	const nameplate = c.Nameplate;
	if (nameplate && typeof nameplate === 'object' && !Array.isArray(nameplate)) {
		const t = (nameplate as Record<string, unknown>).Text;
		if (typeof t === 'string' && t.trim()) return t.trim();
	}

	const displayName = c.DisplayName;
	if (displayName && typeof displayName === 'object' && !Array.isArray(displayName)) {
		const dn = (displayName as Record<string, unknown>).DisplayName;
		if (dn && typeof dn === 'object' && !Array.isArray(dn)) {
			const raw = (dn as Record<string, unknown>).RawText;
			if (typeof raw === 'string' && raw.trim()) return raw.trim();
		}
	}

	return null;
}

async function mergeFromPlayersDir(
	map: Map<string, string>,
	serverId?: HytaleServerId,
): Promise<{ error?: string; path: string }> {
	const root = serverRootDir(serverId);
	const dir = path.join(root, 'universe', 'players');
	try {
		const entries = await fs.readdir(dir, { withFileTypes: true });
		for (const e of entries) {
			if (!e.isFile()) continue;
			if (!e.name.endsWith('.json')) continue;
			const uuid = e.name.slice(0, -'.json'.length).trim().toLowerCase();
			if (!uuid || map.has(uuid)) continue;
			const fp = path.join(dir, e.name);
			try {
				const raw = await fs.readFile(fp, 'utf8');
				const parsed = JSON.parse(raw) as unknown;
				const name = extractNameFromPlayerSave(parsed);
				if (name) map.set(uuid, name);
			} catch {
				// ignore bad file
			}
		}
		return { path: dir };
	} catch (e) {
		const code = (e as NodeJS.ErrnoException)?.code;
		const msg = e instanceof Error ? e.message : String(e);
		if (code === 'ENOENT') return { error: `Папка не найдена (mount?): ${dir}`, path: dir };
		return { error: `${msg} (${dir})`, path: dir };
	}
}

export async function readPlayerNamesMap(
	serverId?: HytaleServerId,
): Promise<{ map: Map<string, string>; error?: string; path: string }> {
	const root = serverRootDir(serverId);
	const p = path.join(root, 'universe', 'player-names.json');
	const map = new Map<string, string>();
	try {
		const raw = await fs.readFile(p, 'utf8');
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw) as unknown;
		} catch {
			const merged = await mergeFromPlayersDir(map, serverId);
			return { map, error: `player-names.json: невалидный JSON (${p}); ${merged.error ?? ''}`.trim(), path: p };
		}
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			const merged = await mergeFromPlayersDir(map, serverId);
			return { map, error: `player-names.json: JSON не объект (${p}); ${merged.error ?? ''}`.trim(), path: p };
		}
		const j = parsed as PlayerNamesJson & Record<string, unknown>;
		const players = j.players;
		if (!players || typeof players !== 'object' || Array.isArray(players)) {
			const merged = await mergeFromPlayersDir(map, serverId);
			return { map, error: `player-names.json: нет поля players (${p}); ${merged.error ?? ''}`.trim(), path: p };
		}
		for (const [uuid, username] of Object.entries(players as Record<string, unknown>)) {
			if (typeof uuid !== 'string' || typeof username !== 'string') continue;
			const u = uuid.trim().toLowerCase();
			const n = username.trim();
			if (!u || !n) continue;
			map.set(u, n);
		}
		const merged = await mergeFromPlayersDir(map, serverId);
		const err = merged.error ? `players-dir: ${merged.error}` : undefined;
		return { map, path: p, error: err };
	} catch (e) {
		const code = (e as NodeJS.ErrnoException)?.code;
		const msg = e instanceof Error ? e.message : String(e);
		if (code === 'ENOENT') {
			const merged = await mergeFromPlayersDir(map, serverId);
			return { map, error: `Файл не найден (mount?): ${p}; ${merged.error ?? ''}`.trim(), path: p };
		}
		const merged = await mergeFromPlayersDir(map, serverId);
		return { map, error: `${msg} (${p}); ${merged.error ?? ''}`.trim(), path: p };
	}
}

