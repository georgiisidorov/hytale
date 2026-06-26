/**
 * Разбор permissions.json (LuckPerms-подобный users + запасные варианты).
 */

export type PermissionsUserInfo = {
	/** Каноническое написание ника из файла */
	username: string;
	/** Группа / ранг для отображения */
	rank: string;
};

function pickRank(u: Record<string, unknown>): string {
	if (typeof u.primaryGroup === 'string' && u.primaryGroup.trim()) return u.primaryGroup.trim();
	if (typeof u.rank === 'string' && u.rank.trim()) return u.rank.trim();
	// Частый формат: groups как массив строк (пример на скрине permissions.json)
	if (Array.isArray(u.groups)) {
		// Ищем именно ранги LuckPerms, а не игровые режимы (Adventure/Creative и т.п.)
		const allowed = new Set(['Regular', 'VIP', 'Admin', 'OP']);
		const normalizeRank = (g: string): string | null => {
			const s = g.trim();
			if (!s) return null;
			if (allowed.has(s)) return s;
			const lower = s.toLowerCase();
			if (lower === 'op') return 'OP';
			if (lower === 'admin') return 'Admin';
			if (lower === 'vip') return 'VIP';
			if (lower === 'regular') return 'Regular';
			return null;
		};
		let firstNonEmpty: string | null = null;
		for (const g of u.groups) {
			if (typeof g !== 'string') continue;
			const s = g.trim();
			if (!s) continue;
			if (!firstNonEmpty) firstNonEmpty = s;
			const rank = normalizeRank(g);
			if (rank) return rank;
		}
		// fallback: если нет ни одного “ранга”, вернём дефолт
		return 'Regular';
	}
	if (u.groups && typeof u.groups === 'object' && !Array.isArray(u.groups)) {
		const g = u.groups as Record<string, unknown>;
		const keys = Object.keys(g);
		if (keys.length) {
			const allowed = new Set(['Regular', 'VIP', 'Admin', 'OP']);
			for (const k of keys) if (allowed.has(k)) return k;
			return 'Regular';
		}
	}
	return 'Regular';
}

function tryUserEntry(entry: unknown, fallbackName?: string): PermissionsUserInfo | null {
	if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
		if (fallbackName) {
			return { username: fallbackName.trim(), rank: '—' };
		}
		return null;
	}
	const u = entry as Record<string, unknown>;
	const meta = u.metadata && typeof u.metadata === 'object' && !Array.isArray(u.metadata) ? (u.metadata as Record<string, unknown>) : null;
	const name =
		(typeof u.name === 'string' && u.name.trim()) ||
		(typeof u.username === 'string' && u.username.trim()) ||
		(typeof u.displayName === 'string' && u.displayName.trim()) ||
		(typeof u.lastKnownUsername === 'string' && u.lastKnownUsername.trim()) ||
		(meta && typeof meta.name === 'string' && meta.name.trim()) ||
		(meta && typeof meta.username === 'string' && meta.username.trim()) ||
		(fallbackName ? fallbackName.trim() : '');
	if (!name) return null;
	return { username: name, rank: pickRank(u) };
}

/**
 * Ключ — username в нижнем регистре (для сопоставления с БД).
 */
export function extractPermissionUsers(parsed: unknown): Map<string, PermissionsUserInfo> {
	const byLower = new Map<string, PermissionsUserInfo>();
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return byLower;

	const root = parsed as Record<string, unknown>;

	if (root.users && typeof root.users === 'object' && !Array.isArray(root.users)) {
		for (const [k, v] of Object.entries(root.users as Record<string, unknown>)) {
			// В некоторых форматах users ключом может быть UUID или ник; используем как fallback,
			// но только если внутри нет нормального поля name/username/metadata.
			const info = tryUserEntry(v, k);
			if (info) {
				const k = info.username.toLowerCase();
				if (!byLower.has(k)) byLower.set(k, info);
			}
		}
		return byLower;
	}

	const skip = new Set(['version', 'schema', 'groups', 'roles', 'meta', 'metadata', 'config', 'users']);
	for (const [key, v] of Object.entries(root)) {
		if (skip.has(key)) continue;
		if (v && typeof v === 'object' && !Array.isArray(v)) {
			const info = tryUserEntry(v, key);
			if (info) {
				const k = info.username.toLowerCase();
				if (!byLower.has(k)) byLower.set(k, info);
			}
		} else if (typeof v === 'string') {
			const k = key.toLowerCase();
			if (!byLower.has(k)) byLower.set(k, { username: key, rank: '—' });
		}
	}

	return byLower;
}
