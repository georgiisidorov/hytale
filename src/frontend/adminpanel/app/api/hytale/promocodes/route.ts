import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPool } from '@/lib/db';
import { decodeSessionToken } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth-constants';

type PromoPayload = {
	// пока поддерживаем базовый кейс: начислить баланс
	balance?: number;
	[key: string]: unknown;
};

function badRequest(message: string) {
	return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

async function requireAdmin(): Promise<{ username: string } | null> {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token) return null;
	return await decodeSessionToken(token);
}

export async function GET(req: Request) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const url = new URL(req.url);
		const q = (url.searchParams.get('q') ?? '').trim();
		const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? '200') || 200, 1), 1000);

		const pool = getPool();
		const where: string[] = [];
		const args: Array<string | number> = [];
		let i = 1;
		if (q) {
			where.push(`code ILIKE $${i++}`);
			args.push(`%${q}%`);
		}
		args.push(limit);
		const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

		const { rows } = await pool.query(
			`SELECT
				id,
				code,
				payload,
				is_multi_use,
				max_uses,
				uses_count,
				starts_at,
				ends_at,
				is_active,
				created_by_admin,
				created_at
			FROM hytale_promocodes
			${whereSql}
			ORDER BY created_at DESC
			LIMIT $${i}`,
			args,
		);

		return NextResponse.json({ ok: true, rows });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

export async function POST(req: Request) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const body = (await req.json()) as Partial<{
			code: string;
			payload: PromoPayload;
			isMultiUse: boolean;
			maxUses: number | null;
			startsAt: string | null;
			endsAt: string | null;
			isActive: boolean;
		}>;

		const code = typeof body.code === 'string' ? body.code.trim() : '';
		if (!code) return badRequest('code обязателен');
		if (code.length > 64) return badRequest('code слишком длинный');

		const payload = (body.payload && typeof body.payload === 'object' ? body.payload : {}) as PromoPayload;
		const isMultiUse = Boolean(body.isMultiUse);
		const maxUsesRaw = body.maxUses == null ? null : Number(body.maxUses);
		const maxUses = maxUsesRaw == null || Number.isNaN(maxUsesRaw) ? null : Math.max(1, Math.min(maxUsesRaw, 1_000_000));
		const startsAt = typeof body.startsAt === 'string' && body.startsAt.trim() ? new Date(body.startsAt) : null;
		const endsAt = typeof body.endsAt === 'string' && body.endsAt.trim() ? new Date(body.endsAt) : null;
		const isActive = body.isActive === false ? false : true;

		if (payload.balance != null) {
			const v = Number(payload.balance);
			if (!Number.isFinite(v) || v < 0) return badRequest('payload.balance должен быть >= 0');
		}

		const pool = getPool();
		const { rows } = await pool.query(
			`INSERT INTO hytale_promocodes(
				code, payload, is_multi_use, max_uses, starts_at, ends_at, is_active, created_by_admin
			)
			VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, $8)
			RETURNING
				id, code, payload, is_multi_use, max_uses, uses_count, starts_at, ends_at, is_active, created_by_admin, created_at`,
			[
				code,
				JSON.stringify(payload ?? {}),
				isMultiUse,
				maxUses,
				startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt : null,
				endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt : null,
				isActive,
				admin.username,
			],
		);

		return NextResponse.json({ ok: true, row: rows[0] });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		// Unique violation (code)
		if (/duplicate key|unique/i.test(msg)) {
			return NextResponse.json({ ok: false, error: 'code уже существует' }, { status: 409 });
		}
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

