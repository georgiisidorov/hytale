import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { authorizeCatalogOrIcon } from '@/lib/market-auth';
import { creditYooKassaPayment, type WalletCurrency } from '@/lib/player-wallet';

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
			paymentId: string;
			playerUuid: string;
			creditCurrency: string;
			rubAmount: number;
			gameAmountOverride: number;
		}>;

		const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : '';
		const playerUuid = typeof body.playerUuid === 'string' ? body.playerUuid.trim() : '';
		const creditCurrency = parseCurrency(body.creditCurrency);
		const rubAmount = Number(body.rubAmount);

		if (!paymentId || !playerUuid) {
			return NextResponse.json({ ok: false, error: 'paymentId и playerUuid обязательны' }, { status: 400 });
		}
		if (!creditCurrency) {
			return NextResponse.json({ ok: false, error: 'creditCurrency: coins или crystals' }, { status: 400 });
		}

		const overrideRaw = body.gameAmountOverride;
		const gameAmountOverride =
			typeof overrideRaw === 'number' && overrideRaw > 0 ? overrideRaw : undefined;

		const result = await creditYooKassaPayment(getPool(), {
			paymentId,
			playerUuid,
			creditCurrency,
			rubAmount,
			gameAmountOverride,
		});

		if (!result.ok) {
			return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
		}

		return NextResponse.json({
			ok: true,
			alreadyCredited: result.alreadyCredited,
			gameAmount: result.gameAmount,
			coins: result.balances.coins,
			crystals: result.balances.crystals,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
