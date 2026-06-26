import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type PermissionsJson = {
	users?: Record<string, unknown>;
};

import { parseServerId, serverRootDir } from '@/lib/hytale-server-instance';

/** Считаем зарегистрированных: предпочтительно `users`, иначе пробуем корень как карту игроков. */
function countRegisteredFromPermissions(parsed: unknown): { count: number | null; note?: string } {
	if (!parsed || typeof parsed !== 'object') {
		return { count: null, note: 'JSON не объект' };
	}
	const j = parsed as PermissionsJson & Record<string, unknown>;

	if (j.users && typeof j.users === 'object' && !Array.isArray(j.users)) {
		const n = Object.keys(j.users).length;
		return { count: n };
	}

	const skip = new Set(['version', 'schema', 'groups', 'roles', 'meta', 'metadata', 'config']);
	const keys = Object.keys(j).filter((k) => !skip.has(k));
	if (keys.length === 0) {
		return { count: null, note: 'Нет поля users и нет подходящих ключей в корне' };
	}
	return { count: keys.length, note: 'Счёт по ключам корня JSON (users отсутствует)' };
}

async function readRegisteredCount(serverId?: string): Promise<{ value: number | null; error?: string; note?: string }> {
	const root = serverRootDir(parseServerId(serverId));
	const p = path.join(root, 'permissions.json');
	try {
		const raw = await fs.readFile(p, 'utf8');
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw) as unknown;
		} catch {
			return { value: null, error: `permissions.json: невалидный JSON (${p})` };
		}
		const { count, note } = countRegisteredFromPermissions(parsed);
		if (count === null) {
			return { value: null, error: `${note ?? 'Не удалось посчитать'} (${p})` };
		}
		return { value: count, note };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		const code = (e as NodeJS.ErrnoException)?.code;
		if (code === 'ENOENT') {
			return { value: null, error: `Файл не найден (mount?): ${p}` };
		}
		return { value: null, error: `${msg} (${p})` };
	}
}

async function readModsList(serverId?: string): Promise<{ value: string[] | null; error?: string }> {
	const root = serverRootDir(parseServerId(serverId));
	const dir = path.join(root, 'mods');
	try {
		const entries = await fs.readdir(dir, { withFileTypes: true });
		const jars = entries
			.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.jar'))
			.map((e) => e.name)
			.sort((a, b) => a.localeCompare(b));
		return { value: jars };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		const code = (e as NodeJS.ErrnoException)?.code;
		if (code === 'ENOENT') {
			return { value: null, error: `Папка не найдена (mount?): ${dir}` };
		}
		return { value: null, error: `${msg} (${dir})` };
	}
}

/** Разбор текстового Prometheus exposition format (то, что отдаёт плагин на /metrics). */
function parseGaugeFromExposition(text: string, metricName: string): number | null {
	const escaped = metricName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`^${escaped}(?:\\{[^}]*\\})?\\s+(-?[0-9.eE+-]+)\\s*$`);
	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const m = trimmed.match(re);
		if (m) {
			const v = Number(m[1]);
			if (Number.isFinite(v)) return Math.round(v);
		}
	}
	return null;
}

async function readOnlineFromPluginExporter(): Promise<{ value: number | null; error?: string }> {
	const url = (process.env.HYTALE_PLAYER_METRICS_URL || 'http://hytale-server-dev:9105/metrics').trim();
	try {
		const ctrl = new AbortController();
		const tid = setTimeout(() => ctrl.abort(), 8000);
		let res: Response;
		try {
			res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
		} finally {
			clearTimeout(tid);
		}
		const text = await res.text();
		if (!res.ok) {
			return { value: null, error: `Экспортёр: HTTP ${res.status}` };
		}
		const names = ['hytale_players_online', 'hytale_online_players', 'hytale_online'];
		for (const n of names) {
			const v = parseGaugeFromExposition(text, n);
			if (v != null) return { value: v };
		}
		return { value: null, error: 'В ответе экспортёра нет метки онлайна' };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { value: null, error: `Экспортёр недоступен: ${msg}` };
	}
}

async function queryPromValue(query: string): Promise<{ value: number | null; detail?: string }> {
	const baseRaw = process.env.PROMETHEUS_URL?.trim();
	const base = baseRaw || 'http://hytale-prometheus:9090';
	try {
		const u = new URL('/api/v1/query', base);
		u.searchParams.set('query', query);
		const res = await fetch(u.toString(), { cache: 'no-store' });
		const text = await res.text();
		if (!res.ok) {
			return { value: null, detail: `HTTP ${res.status}` };
		}
		let j: any;
		try {
			j = JSON.parse(text) as any;
		} catch {
			return { value: null, detail: `не JSON` };
		}
		if (j?.status !== 'success') {
			return { value: null, detail: `${j?.error ?? j?.status ?? 'unknown'}` };
		}
		const results = j?.data?.result;
		if (!Array.isArray(results) || results.length === 0) {
			return { value: null, detail: `нет данных` };
		}
		const v = Number(results[0]?.value?.[1]);
		return Number.isFinite(v) ? { value: v } : { value: null, detail: `не число` };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { value: null, detail: msg };
	}
}

async function readOnlineFromTsdb(): Promise<{ value: number | null; error?: string }> {
	const queries = ['hytale_players_online', 'hytale_online_players', 'hytale_online'];
	const details: string[] = [];
	for (const q of queries) {
		const r = await queryPromValue(q);
		if (r.value != null) {
			return { value: Math.round(r.value) };
		}
		if (r.detail) details.push(`${q}: ${r.detail}`);
	}
	return {
		value: null,
		error: details.length ? details.join(' · ') : 'нет данных',
	};
}

/**
 * Сначала опрос экспортёра плагина (надёжно в одной docker-сети), затем запасной вариант через TSDB.
 */
async function readOnlinePlayers(): Promise<{
	value: number | null;
	error?: string;
	source?: 'plugin_exporter' | 'tsdb';
}> {
	const direct = await readOnlineFromPluginExporter();
	if (direct.value != null) {
		return { value: direct.value, source: 'plugin_exporter' };
	}
	const remote = await readOnlineFromTsdb();
	if (remote.value != null) {
		return { value: remote.value, source: 'tsdb' };
	}
	return {
		value: null,
		error: [direct.error, remote.error].filter(Boolean).join(' · ') || 'не удалось получить онлайн',
	};
}

export async function GET(req: Request) {
	const serverId = parseServerId(new URL(req.url).searchParams.get('server'));
	const [reg, modsRes, onlineRes] = await Promise.all([
		readRegisteredCount(serverId),
		readModsList(serverId),
		readOnlinePlayers(),
	]);

	return NextResponse.json({
		ok: true,
		server: serverId,
		onlinePlayers: onlineRes.value,
		registeredPlayers: reg.value,
		mods: modsRes.value,
		sources: {
			serverDir: serverRootDir(serverId),
			online: {
				ok: onlineRes.value != null,
				value: onlineRes.value,
				source: onlineRes.source ?? null,
				error: onlineRes.value != null ? null : (onlineRes.error ?? null),
			},
			registered: {
				ok: reg.value != null,
				value: reg.value,
				error: reg.error ?? null,
				note: reg.note ?? null,
			},
			modsDir: {
				ok: modsRes.value != null,
				count: modsRes.value?.length ?? null,
				error: modsRes.error ?? null,
			},
		},
	});
}
