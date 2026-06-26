import { NextResponse } from 'next/server';

// Браузеры часто запрашивают /favicon.ico. Держим совместимость,
// отдавая редирект на SVG-иконку (без бинарников в репозитории).
export async function GET() {
	return NextResponse.redirect(new URL('/favicon.svg', 'http://localhost'), 307);
}

