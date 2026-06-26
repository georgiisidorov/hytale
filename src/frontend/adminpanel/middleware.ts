import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_COOKIE } from './lib/auth-constants';

function secret(): Uint8Array | null {
	const s = process.env.ADMIN_JWT_SECRET;
	if (!s?.trim()) {
		return null;
	}
	return new TextEncoder().encode(s.trim());
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	if (!pathname.startsWith('/dashboard')) {
		return NextResponse.next();
	}
	const s = secret();
	if (!s) {
		// Не ломаем весь сайт из-за конфигурации окружения: просто отправляем на логин.
		return NextResponse.redirect(new URL('/login', request.url));
	}
	const token = request.cookies.get(SESSION_COOKIE)?.value;
	if (!token) {
		return NextResponse.redirect(new URL('/login', request.url));
	}
	try {
		await jwtVerify(token, s);
	} catch {
		return NextResponse.redirect(new URL('/login', request.url));
	}
	return NextResponse.next();
}

export const config = {
	matcher: ['/dashboard/:path*'],
};
