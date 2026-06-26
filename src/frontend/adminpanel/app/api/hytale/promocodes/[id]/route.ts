import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPool } from '@/lib/db';
import { decodeSessionToken } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth-constants';

async function requireAdmin(): Promise<{ username: string } | null> {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token) return null;
	return await decodeSessionToken(token);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const { id } = await ctx.params;
		const promoId = Number(id);
		if (!Number.isFinite(promoId) || promoId <= 0) {
			return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 });
		}

		const body = (await req.json()) as Partial<{
			isActive: boolean;
			maxUses: number | null;
			startsAt: string | null;
			endsAt: string | null;
		}>;

		const set: string[] = [];
		const args: Array<number | boolean | Date | null> = [];
		let i = 1;

		if (typeof body.isActive === 'boolean') {
			set.push(`is_active = $${i++}`);
			args.push(body.isActive);
		}

		if (body.maxUses !== undefined) {
			const raw = body.maxUses == null ? null : Number(body.maxUses);
			const maxUses = raw == null || Number.isNaN(raw) ? null : Math.max(1, Math.min(raw, 1_000_000));
			set.push(`max_uses = $${i++}`);
			args.push(maxUses);
		}

		if (body.startsAt !== undefined) {
			const d = typeof body.startsAt === 'string' && body.startsAt.trim() ? new Date(body.startsAt) : null;
			set.push(`starts_at = $${i++}`);
			args.push(d && !Number.isNaN(d.getTime()) ? d : null);
		}

		if (body.endsAt !== undefined) {
			const d = typeof body.endsAt === 'string' && body.endsAt.trim() ? new Date(body.endsAt) : null;
			set.push(`ends_at = $${i++}`);
			args.push(d && !Number.isNaN(d.getTime()) ? d : null);
		}

		if (!set.length) {
			return NextResponse.json({ ok: false, error: 'nothing to update' }, { status: 400 });
		}

		args.push(promoId);

		const pool = getPool();
		const { rows } = await pool.query(
			`UPDATE hytale_promocodes
			 SET ${set.join(', ')}
			 WHERE id = $${i}
			 RETURNING id, code, payload, is_multi_use, max_uses, uses_count, starts_at, ends_at, is_active, created_by_admin, created_at`,
			args,
		);

		if (!rows[0]) {
			return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
		}

		return NextResponse.json({ ok: true, row: rows[0] });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const { id } = await ctx.params;
		const promoId = Number(id);
		if (!Number.isFinite(promoId) || promoId <= 0) {
			return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 });
		}

		const pool = getPool();
		const { rowCount } = await pool.query(`DELETE FROM hytale_promocodes WHERE id = $1`, [promoId]);
		if (!rowCount) {
			return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
		}
		return NextResponse.json({ ok: true });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

