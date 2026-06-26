import { cookies } from 'next/headers';
import { decodeSessionToken } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth-constants';

export function marketCatalogApiKey(): string {
	return (process.env.MARKET_CATALOG_API_KEY ?? '').trim();
}

export function isValidMarketKey(headerValue: string | null): boolean {
	const expected = marketCatalogApiKey();
	if (!expected) return true;
	const got = (headerValue ?? '').trim();
	return got.length > 0 && got === expected;
}

/** Публичный каталог / иконки: без ключа в env — открыто; с ключом — X-Market-Key или сессия админа. */
export async function authorizeCatalogOrIcon(req: Request): Promise<boolean> {
	const expected = marketCatalogApiKey();
	if (!expected) return true;

	if (isValidMarketKey(req.headers.get('x-market-key'))) return true;

	return (await requireAdmin()) !== null;
}

export async function requireAdmin(): Promise<{ username: string } | null> {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token) return null;
	return await decodeSessionToken(token);
}
