import { NextResponse } from 'next/server';
import {
	createSessionToken,
	totpConfigured,
	verifyAdminPassword,
	verifyAdminTotp,
} from '../../../../lib/auth';
import { SESSION_COOKIE } from '../../../../lib/auth-constants';
import { getPool } from '../../../../lib/db';
import { logAdminAuthEvent } from '../../../../lib/admin-audit';

export async function POST(req: Request) {
	let body: { username?: string; password?: string; totp?: string };
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: 'некорректный JSON' }, { status: 400 });
	}
	const username = typeof body.username === 'string' ? body.username.trim() : '';
	const password = body.password ?? '';
	const totp = typeof body.totp === 'string' ? body.totp : '';
	if (!username || !verifyAdminPassword(username, password)) {
		return NextResponse.json({ error: 'неверный пароль или код' }, { status: 401 });
	}
	if (totpConfigured(username)) {
		if (!totp.trim()) {
			return NextResponse.json({ requiresTotp: true });
		}
		if (!verifyAdminTotp(username, totp)) {
			return NextResponse.json({ error: 'неверный пароль или код' }, { status: 401 });
		}
	}
	let token: string;
	try {
		token = await createSessionToken(username);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'ошибка сервера';
		return NextResponse.json({ error: msg }, { status: 500 });
	}

	// Audit log: успешный логин
	try {
		const ip =
			req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
			req.headers.get('x-real-ip')?.trim() ||
			null;
		const userAgent = req.headers.get('user-agent');
		const pool = getPool();
		await logAdminAuthEvent(pool, { username, event: 'login', ip, userAgent });
	} catch {
		// no-op: не ломаем вход из-за логирования
	}

	const res = NextResponse.json({ ok: true });
	res.cookies.set(SESSION_COOKIE, token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: 60 * 60 * 8,
	});
	return res;
}
