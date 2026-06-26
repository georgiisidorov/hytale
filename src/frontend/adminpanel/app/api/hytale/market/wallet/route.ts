import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authorizeCatalogOrIcon } from '@/lib/market-auth';
import { ensurePlayerId, getWalletByUuid } from '@/lib/player-wallet';

export async function GET(req: Request) {
	try {
		if (!(await authorizeCatalogOrIcon(req))) {
			return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
		}

		const url = new URL(req.url);
		const playerUuid = (url.searchParams.get('playerUuid') ?? url.searchParams.get('uuid') ?? '').trim();
		if (!playerUuid) {
			return NextResponse.json({ ok: false, error: 'playerUuid required' }, { status: 400 });
		}

		const pool = getPool();
		await ensurePlayerId(pool, playerUuid);
		const balances = await getWalletByUuid(pool, playerUuid);
		return NextResponse.json({
			ok: true,
			coins: balances?.coins ?? 0,
			crystals: balances?.crystals ?? 0,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
