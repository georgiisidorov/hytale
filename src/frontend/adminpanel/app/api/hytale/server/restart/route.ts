import { NextResponse } from 'next/server';
import { logAdminAuthEvent } from '@/lib/admin-audit';
import { restartHytaleServer } from '@/lib/docker-control';
import { getPool } from '@/lib/db';
import { HYTALE_SERVER_IDS, parseServerId, serverLabel } from '@/lib/hytale-server-instance';
import { requireAdmin } from '@/lib/market-auth';

export async function POST(req: Request) {
	try {
		const admin = await requireAdmin();
		if (!admin) {
			return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
		}

		let body: { server?: string } = {};
		try {
			body = (await req.json()) as { server?: string };
		} catch {
			body = {};
		}

		const server = parseServerId(body.server);
		if (!HYTALE_SERVER_IDS.includes(server)) {
			return NextResponse.json({ ok: false, error: 'invalid_server' }, { status: 400 });
		}

		const { container } = await restartHytaleServer(server);

		const pool = getPool();
		const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
		await logAdminAuthEvent(pool, {
			username: admin.username,
			event: `server_restart_${server}`,
			ip,
			userAgent: req.headers.get('user-agent'),
		}).catch(() => {});

		return NextResponse.json({
			ok: true,
			server,
			label: serverLabel(server),
			container,
			message: `${serverLabel(server)}: контейнер ${container} перезапущен`,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
