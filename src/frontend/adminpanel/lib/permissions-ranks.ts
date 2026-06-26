import type { AllowedRank } from '@/lib/permissions-store';
import type { PermissionsJsonRoot } from '@/lib/permissions-store';

/** Узел rank.* для AutoRankNickname и отображения в чате. */
export function rankPermissionNode(rank: AllowedRank): string {
	switch (rank) {
		case 'OP':
			return 'rank.op';
		case 'Admin':
			return 'rank.admin';
		case 'VIP':
			return 'rank.vip';
		default:
			return 'rank.regular';
	}
}

/**
 * Права групп в permissions.json (Hytale PermissionsModule).
 * «*» как отдельный узел сервер отклоняет — используем сегментные wildcard.
 */
export const DEFAULT_PERMISSION_GROUPS: Record<string, string[]> = {
	Default: [],
	Regular: ['rank.regular'],
	VIP: ['rank.vip', 'rank.regular'],
	Admin: [
		'rank.admin',
		'rank.vip',
		'rank.regular',
		'hytale.command.spawn',
		'hytale.command.setspawn',
		'hytale.world_map.teleport.marker',
		'bettermap.marker.create',
		'bettermap.command.teleport',
	],
	OP: [
		'rank.op',
		'rank.admin',
		'rank.vip',
		'rank.regular',
		'hytale.*',
		'Custom.*',
		'bettermap.*',
	],
};

const RANK_GROUP_NAMES = new Set(['Regular', 'VIP', 'Admin', 'OP', 'regular', 'vip', 'admin', 'op']);

export function ensurePermissionGroups(root: PermissionsJsonRoot): void {
	if (!root.groups || typeof root.groups !== 'object' || Array.isArray(root.groups)) {
		root.groups = {};
	}
	const groups = root.groups as Record<string, unknown>;
	for (const [name, perms] of Object.entries(DEFAULT_PERMISSION_GROUPS)) {
		const existing = groups[name];
		if (!Array.isArray(existing) || existing.length === 0) {
			groups[name] = [...perms];
		}
	}
}

function mergeUserPermissions(existing: unknown, rank: AllowedRank): string[] {
	const rankNodes = new Set<string>();
	for (const r of ['Regular', 'VIP', 'Admin', 'OP'] as AllowedRank[]) {
		if (rankWeight(r) <= rankWeight(rank)) {
			rankNodes.add(rankPermissionNode(r));
		}
	}

	const out = new Set<string>();
	if (Array.isArray(existing)) {
		for (const x of existing) {
			if (typeof x !== 'string') continue;
			const s = x.trim();
			if (!s || s === '*') continue;
			if (s.startsWith('rank.')) continue;
			out.add(s);
		}
	}
	for (const n of rankNodes) out.add(n);
	return [...out];
}

function rankWeight(rank: AllowedRank): number {
	switch (rank) {
		case 'OP':
			return 4;
		case 'Admin':
			return 3;
		case 'VIP':
			return 2;
		default:
			return 1;
	}
}

/** Нормализует groups: ранг PascalCase + игровые режимы (Adventure/Creative). */
export function applyRankToUserEntry(u: Record<string, unknown>, rank: AllowedRank): void {
	let groups: string[] = [];
	if (Array.isArray(u.groups)) {
		groups = (u.groups as unknown[])
			.filter((x): x is string => typeof x === 'string')
			.map((x) => x.trim())
			.filter(Boolean);
	}
	groups = groups.filter((g) => !RANK_GROUP_NAMES.has(g));
	groups.unshift(rank);
	u.groups = groups;
	u.permissions = mergeUserPermissions(u.permissions, rank);
}
