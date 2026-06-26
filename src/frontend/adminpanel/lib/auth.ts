import { SignJWT, jwtVerify } from 'jose';
import { timingSafeEqual } from 'crypto';
import { authenticator } from 'otplib';
import { SESSION_COOKIE } from './auth-constants';

type AdminUser = {
	username: string;
	password: string;
	totpSecret?: string;
};

function getJwtSecret(): Uint8Array {
	const s = process.env.ADMIN_JWT_SECRET;
	if (!s?.trim()) {
		throw new Error('ADMIN_JWT_SECRET не задан');
	}
	return new TextEncoder().encode(s.trim());
}

function parseAdminUsers(): AdminUser[] {
	const raw = process.env.ADMIN_USERS_JSON;
	if (!raw?.trim()) {
		return [];
	}
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		const out: AdminUser[] = [];
		for (const u of parsed) {
			const obj = u as Partial<AdminUser>;
			const username = typeof obj.username === 'string' ? obj.username.trim() : '';
			const password = typeof obj.password === 'string' ? obj.password : '';
			const totpSecret = typeof obj.totpSecret === 'string' ? obj.totpSecret.trim() : undefined;
			if (!username || !password) continue;
			out.push({ username, password, totpSecret });
		}
		return out;
	} catch {
		return [];
	}
}

function findAdmin(username: string): AdminUser | null {
	const u = username.trim();
	if (!u) return null;
	return parseAdminUsers().find((x) => x.username === u) ?? null;
}

export async function createSessionToken(username: string): Promise<string> {
	return new SignJWT({ role: 'admin', username })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('8h')
		.sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<boolean> {
	try {
		await jwtVerify(token, getJwtSecret());
		return true;
	} catch {
		return false;
	}
}

export async function decodeSessionToken(token: string): Promise<{ username: string } | null> {
	try {
		const { payload } = await jwtVerify(token, getJwtSecret());
		const username = typeof payload.username === 'string' ? payload.username : '';
		if (!username) return null;
		return { username };
	} catch {
		return null;
	}
}

export function verifyAdminPassword(username: string, password: string): boolean {
	const admin = findAdmin(username);
	if (!admin) return false;
	const a = Buffer.from(password, 'utf8');
	const b = Buffer.from(admin.password, 'utf8');
	if (a.length !== b.length) {
		return false;
	}
	return timingSafeEqual(a, b);
}

export function totpConfigured(username: string): boolean {
	const admin = findAdmin(username);
	return Boolean(admin?.totpSecret?.trim());
}

export function verifyAdminTotp(username: string, code: string): boolean {
	const admin = findAdmin(username);
	const secret = admin?.totpSecret?.replace(/\s+/g, '').trim();
	if (!secret) {
		return false;
	}
	const digits = code.replace(/\D/g, '');
	if (digits.length !== 6) {
		return false;
	}
	authenticator.options = { window: 1 };
	return authenticator.verify({ token: digits, secret });
}
