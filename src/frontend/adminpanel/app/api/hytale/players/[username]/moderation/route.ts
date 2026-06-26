import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPool } from '@/lib/db';
import { decodeSessionToken } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth-constants';
import { parseServerId } from '@/lib/hytale-server-instance';
import { setModerationInPermissionsJson } from '@/lib/permissions-store';

async function requireAdmin(): Promise<boolean> {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token) return false;
	return (await decodeSessionToken(token)) != null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ username: string }> }) {
	try {
		if (!(await requireAdmin())) {
			return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
		}

		const { username } = await ctx.params;
		// В permissions.json ключи — UUID; параметр маршрута трактуем как uuid (для обратной совместимости имя оставлено).
		const u = decodeURIComponent(username).trim().toLowerCase();
		if (!u) return NextResponse.json({ ok: false, error: 'bad uuid' }, { status: 400 });

		const body = (await req.json()) as Partial<{ action: string; until?: string | null; server?: string }>;
		const action = body.action;
		if (action !== 'active' && action !== 'banned' && action !== 'temp_kick') {
			return NextResponse.json({ ok: false, error: 'action: active | banned | temp_kick' }, { status: 400 });
		}

		let moderation_until: Date | null = null;
		if (action === 'temp_kick') {
			const untilRaw = body.until;
			if (!untilRaw || typeof untilRaw !== 'string') {
				return NextResponse.json({ ok: false, error: 'temp_kick требует until (ISO datetime)' }, { status: 400 });
			}
			const until = new Date(untilRaw);
			if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
				return NextResponse.json({ ok: false, error: 'until должен быть в будущем' }, { status: 400 });
			}
			moderation_until = until;
		}

		const pool = getPool();
		const upd = await pool.query<{
			id: number;
			username: string;
			moderation_status: string;
			moderation_until: string | null;
		}>(
			`UPDATE hytale_players
			 SET moderation_status = $1, moderation_until = $2
			 WHERE lower(username) = lower($3)
			 RETURNING id, username, moderation_status, moderation_until`,
			[action, moderation_until, u],
		);
		if (!upd.rowCount) {
			return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
		}

		// БД — прокладка: изменения фиксируем обратно в permissions.json (источник истины).
		const writeback = await setModerationInPermissionsJson({
			username: u,
			status: action,
			until: moderation_until,
			serverId: parseServerId(body.server),
		});
		if (!writeback.ok) {
			return NextResponse.json({ ok: false, error: writeback.error }, { status: 500 });
		}

		return NextResponse.json({ ok: true, row: upd.rows[0] });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
