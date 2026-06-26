import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeSessionToken } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth-constants';
import { parseServerId } from '@/lib/hytale-server-instance';
import { setRankInPermissionsJson, type AllowedRank } from '@/lib/permissions-store';

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
		const uuid = decodeURIComponent(username).trim();
		if (!uuid) return NextResponse.json({ ok: false, error: 'bad uuid' }, { status: 400 });

		const body = (await req.json()) as Partial<{ rank: AllowedRank; server?: string }>;
		const rank = body.rank;
		if (rank !== 'Regular' && rank !== 'VIP' && rank !== 'Admin' && rank !== 'OP') {
			return NextResponse.json({ ok: false, error: 'rank: Regular | VIP | Admin | OP' }, { status: 400 });
		}

		const r = await setRankInPermissionsJson({ uuid, rank, serverId: parseServerId(body.server) });
		if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 500 });

		return NextResponse.json({ ok: true });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

