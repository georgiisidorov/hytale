import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authorizeCatalogOrIcon } from '@/lib/market-auth';
import { debitWallet, type WalletCurrency } from '@/lib/player-wallet';

function parseCurrency(raw: unknown): WalletCurrency | null {
	if (typeof raw !== 'string') return null;
	const c = raw.trim().toLowerCase();
	if (c === 'coins' || c === 'crystals') return c;
	return null;
}

export async function POST(req: Request) {
	try {
		if (!(await authorizeCatalogOrIcon(req))) {
			return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
		}

		const body = (await req.json()) as Partial<{
			playerUuid: string;
			currency: string;
			amount: number;
			reason: string;
		}>;

		const playerUuid = typeof body.playerUuid === 'string' ? body.playerUuid.trim() : '';
		if (!playerUuid) {
			return NextResponse.json({ ok: false, error: 'playerUuid required' }, { status: 400 });
		}

		const currency = parseCurrency(body.currency);
		if (!currency) {
			return NextResponse.json({ ok: false, error: 'currency: coins или crystals' }, { status: 400 });
		}

		const amount = Number(body.amount);
		if (!Number.isFinite(amount) || amount <= 0) {
			return NextResponse.json({ ok: false, error: 'amount > 0' }, { status: 400 });
		}

		const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'debit';

		const result = await debitWallet(getPool(), playerUuid, currency, amount, reason);
		if (!result.ok) {
			return NextResponse.json(
				{
					ok: false,
					error: result.error,
					coins: result.balances?.coins ?? 0,
					crystals: result.balances?.crystals ?? 0,
				},
				{ status: 409 },
			);
		}

		return NextResponse.json({
			ok: true,
			coins: result.balances.coins,
			crystals: result.balances.crystals,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
