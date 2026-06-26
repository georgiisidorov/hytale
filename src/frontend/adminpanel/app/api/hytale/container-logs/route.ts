import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeSessionToken } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth-constants';
import { type AllowedContainer, getContainerLogLines } from '@/lib/container-logs';

function parseAllowedContainer(raw: string | null): AllowedContainer | null {
	if (!raw) return null;
	const v = raw.trim();
	const allowed: AllowedContainer[] = [
		'all',
		'admin-auth',
		'hytale-caddy',
		'hytale-adminpanel',
		'hytale-admin-db',
		'hytale-prometheus',
		'hytale-node-exporter',
		'hytale-cadvisor',
		'hytale-server-dev',
		'hytale-server-prod',
	];
	return (allowed as string[]).includes(v) ? (v as AllowedContainer) : null;
}

export async function GET(req: Request) {
	const cookieStore = await cookies();
	const token = cookieStore.get(SESSION_COOKIE)?.value ?? '';
	const decoded = token ? await decodeSessionToken(token) : null;
	if (!decoded) {
		return NextResponse.json({ ok: false, error: 'unauthorized', lines: [] as string[] }, { status: 401 });
	}

	const url = new URL(req.url);
	const container = parseAllowedContainer(url.searchParams.get('container'));
	if (!container) {
		return NextResponse.json({ ok: false, error: 'bad_container', lines: [] as string[] }, { status: 400 });
	}

	const tailRaw = url.searchParams.get('tail');
	const tail = tailRaw == null ? undefined : Number(tailRaw);

	const r = await getContainerLogLines({ container, tail });
	return NextResponse.json(r);
}
