import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { getPool } from '@/lib/db';

export async function POST(req: Request) {
	const body = await req.json().catch(() => null);
	if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

	const { packId, playerUuid, returnUrl } = body as {
		packId?: string;
		playerUuid?: string;
		returnUrl?: string;
	};

	if (!packId) return NextResponse.json({ error: 'packId required' }, { status: 400 });
	if (!returnUrl) return NextResponse.json({ error: 'returnUrl required' }, { status: 400 });

	const pool = getPool();
	const packRow = await pool.query<{ pack_name: string; price_rub: string }>(
		`SELECT pack_name, price_rub FROM hytale_market_loot_pack_prices WHERE pack_id = $1 AND is_active = TRUE`,
		[packId],
	);
	if (!packRow.rows.length) {
		return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
	}
	const { pack_name, price_rub } = packRow.rows[0]!;

	const shopId = process.env.YOOKASSA_SHOP_ID;
	const secretKey = process.env.YOOKASSA_SECRET_KEY;
	if (!shopId || !secretKey) {
		return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
	}

	const credentials = Buffer.from(`${shopId}:${secretKey}`).toString('base64');

	const payload = {
		amount: { value: parseFloat(price_rub).toFixed(2), currency: 'RUB' },
		capture: true,
		confirmation: { type: 'redirect', return_url: returnUrl },
		description: `Лут-пак «${pack_name}»`,
		metadata: {
			pack_id: packId,
			...(playerUuid ? { player_uuid: playerUuid } : {}),
		},
	};

	const ykRes = await fetch('https://api.yookassa.ru/v3/payments', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Basic ${credentials}`,
			'Idempotence-Key': randomUUID(),
		},
		body: JSON.stringify(payload),
	});

	if (!ykRes.ok) {
		const err = await ykRes.text();
		return NextResponse.json({ error: 'YooKassa error', detail: err }, { status: 502 });
	}

	const payment = await ykRes.json();
	return NextResponse.json({
		ok: true,
		paymentId: payment.id,
		confirmationUrl: payment.confirmation?.confirmation_url,
	});
}

export async function OPTIONS() {
	return new Response(null, { status: 204 });
}
