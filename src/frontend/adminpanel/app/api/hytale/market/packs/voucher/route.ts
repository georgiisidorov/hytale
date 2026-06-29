import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getPool } from '@/lib/db';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
	const bytes = randomBytes(12);
	const segs: string[] = [];
	for (let s = 0; s < 3; s++) {
		let seg = '';
		for (let i = 0; i < 4; i++) seg += CHARS[bytes[s * 4 + i]! % CHARS.length];
		segs.push(seg);
	}
	return segs.join('-');
}

type YooKassaPayment = {
	id: string;
	status: string;
	paid: boolean;
	metadata?: Record<string, string>;
};

async function verifyYooKassaPayment(paymentId: string): Promise<YooKassaPayment | null> {
	const shopId = process.env.YOOKASSA_SHOP_ID;
	const secretKey = process.env.YOOKASSA_SECRET_KEY;
	if (!shopId || !secretKey) return null;

	const credentials = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
	const res = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
		headers: { Authorization: `Basic ${credentials}` },
	});
	if (!res.ok) return null;
	return (await res.json()) as YooKassaPayment;
}

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as Partial<{
			paymentId: string;
			packId: string;
			playerUuid: string;
		}>;

		const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : '';
		const packId = typeof body.packId === 'string' ? body.packId.trim() : '';
		if (!paymentId) return NextResponse.json({ ok: false, error: 'paymentId обязателен' }, { status: 400 });
		if (!packId) return NextResponse.json({ ok: false, error: 'packId обязателен' }, { status: 400 });

		const playerUuid = typeof body.playerUuid === 'string' ? body.playerUuid.trim() : null;

		// Верифицируем платёж через YooKassa API
		const payment = await verifyYooKassaPayment(paymentId);
		if (!payment) {
			return NextResponse.json({ ok: false, error: 'Не удалось проверить платёж' }, { status: 402 });
		}
		if (payment.status !== 'succeeded' || !payment.paid) {
			return NextResponse.json({ ok: false, error: 'Платёж не завершён' }, { status: 402 });
		}
		// Проверяем что paymentId действительно создавался для этого пака
		if (payment.metadata?.pack_id && payment.metadata.pack_id !== packId) {
			return NextResponse.json({ ok: false, error: 'Платёж не соответствует паку' }, { status: 403 });
		}
		// Проверяем привязку к игроку (если есть в metadata)
		if (playerUuid && payment.metadata?.player_uuid &&
			payment.metadata.player_uuid.toLowerCase() !== playerUuid.toLowerCase()) {
			return NextResponse.json({ ok: false, error: 'Платёж привязан к другому игроку' }, { status: 403 });
		}

		const pool = getPool();

		// Проверяем, что пак существует
		const packCheck = await pool.query(
			`SELECT pack_id FROM hytale_market_item_pack_contents WHERE pack_id = $1 LIMIT 1`,
			[packId],
		);
		if (!packCheck.rows.length) {
			return NextResponse.json({ ok: false, error: `Пак '${packId}' не найден` }, { status: 404 });
		}

		// Идемпотентность по paymentId — если уже создан, возвращаем тот же код
		const existing = await pool.query<{ code: string }>(
			`SELECT code FROM hytale_promocodes
			 WHERE payload->>'payment_id' = $1 AND payload->>'type' = 'pack_voucher'
			 LIMIT 1`,
			[paymentId],
		);
		if (existing.rows.length) {
			return NextResponse.json({ ok: true, code: existing.rows[0]!.code });
		}

		// Генерируем уникальный код
		let code = '';
		for (let attempt = 0; attempt < 10; attempt++) {
			const candidate = generateCode();
			const conflict = await pool.query(`SELECT 1 FROM hytale_promocodes WHERE code = $1`, [candidate]);
			if (!conflict.rows.length) {
				code = candidate;
				break;
			}
		}
		if (!code) {
			return NextResponse.json({ ok: false, error: 'Не удалось сгенерировать код' }, { status: 500 });
		}

		const payload: Record<string, string> = {
			type: 'pack_voucher',
			pack_id: packId,
			payment_id: paymentId,
		};
		if (playerUuid) payload.target_uuid = playerUuid;

		await pool.query(
			`INSERT INTO hytale_promocodes (code, payload, is_multi_use, max_uses, is_active)
			 VALUES ($1, $2::jsonb, false, 1, true)`,
			[code, JSON.stringify(payload)],
		);

		return NextResponse.json({ ok: true, code });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

export function OPTIONS() {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		},
	});
}
