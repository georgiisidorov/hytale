import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '../../../../lib/auth-constants';
import { decodeSessionToken } from '../../../../lib/auth';
import { getPool } from '../../../../lib/db';
import { logAdminAuthEvent } from '../../../../lib/admin-audit';

export async function POST(req: Request) {
	// Audit log: логаут (если можем понять, кто это)
	try {
		const cookie = req.headers.get('cookie') || '';
		const m = cookie.match(/(?:^|;\s*)admin_session=([^;]+)/);
		const token = m ? decodeURIComponent(m[1]) : '';
		if (token) {
			const decoded = await decodeSessionToken(token);
			if (decoded?.username) {
				const ip =
					req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
					req.headers.get('x-real-ip')?.trim() ||
					null;
				const userAgent = req.headers.get('user-agent');
				const pool = getPool();
				await logAdminAuthEvent(pool, { username: decoded.username, event: 'logout', ip, userAgent });
			}
		}
	} catch {
		// no-op
	}
	const res = NextResponse.json({ ok: true });
	res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
	return res;
}
