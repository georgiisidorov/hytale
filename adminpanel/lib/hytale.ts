import type { Pool } from 'pg';

export type PaymentRow = {
	amount: string; // numeric -> string
	username: string;
	payment_type: string;
	created_at: string; // ISO
};

export async function fetchPayments(
	pool: Pool,
	opts: { from?: string; to?: string; limit?: number },
): Promise<PaymentRow[]> {
	// Защита от случая, когда SQL init ещё не применился (например, если volume уже существовал).
	// TABLE создаётся идемпотентно.
	await pool.query(`
		CREATE TABLE IF NOT EXISTS hytale_payments (
			id BIGSERIAL PRIMARY KEY,
			amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
			username TEXT NOT NULL,
			payment_type TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);

		CREATE INDEX IF NOT EXISTS idx_hytale_payments_created_at
			ON hytale_payments (created_at DESC);

		CREATE INDEX IF NOT EXISTS idx_hytale_payments_username
			ON hytale_payments (username);
	`);

	const limit = Math.min(Math.max(opts.limit ?? 500, 1), 2000);
	const from = opts.from?.trim() ? new Date(opts.from) : null;
	const to = opts.to?.trim() ? new Date(opts.to) : null;

	const where: string[] = [];
	const args: Array<string | number | Date> = [];
	let i = 1;

	if (from && !Number.isNaN(from.getTime())) {
		where.push(`created_at >= $${i++}`);
		args.push(from);
	}
	if (to && !Number.isNaN(to.getTime())) {
		where.push(`created_at <= $${i++}`);
		args.push(to);
	}

	args.push(limit);
	const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

	const { rows } = await pool.query(
		`SELECT amount::text, username, payment_type, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
		 FROM hytale_payments
		 ${whereSql}
		 ORDER BY created_at DESC
		 LIMIT $${i}`,
		args,
	);
	return rows as PaymentRow[];
}

