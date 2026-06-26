import type { Pool, PoolClient } from 'pg';

export type WalletCurrency = 'coins' | 'crystals';

export type WalletBalances = {
	coins: number;
	crystals: number;
};

export function coinsPerRub(): number {
	const v = Number(process.env.MARKET_COINS_PER_RUB ?? '100');
	return Number.isFinite(v) && v > 0 ? Math.floor(v) : 100;
}

export function crystalsPerRub(): number {
	const v = Number(process.env.MARKET_CRYSTALS_PER_RUB ?? '1');
	return Number.isFinite(v) && v > 0 ? Math.floor(v) : 1;
}

export function wheelSpinCrystalCost(): number {
	const v = Number(process.env.MARKET_WHEEL_SPIN_CRYSTALS ?? '150');
	return Number.isFinite(v) && v > 0 ? Math.floor(v) : 150;
}

export function gameAmountFromRub(rub: number, currency: WalletCurrency): number {
	const amount = Math.max(0, rub);
	if (currency === 'crystals') {
		return Math.max(1, Math.floor(amount * crystalsPerRub()));
	}
	return Math.max(1, Math.floor(amount * coinsPerRub()));
}

function normUuid(uuid: string): string {
	return uuid.trim().toLowerCase();
}

/** Создаёт игрока по UUID, если ещё нет в hytale_players. */
export async function ensurePlayerId(pool: Pool | PoolClient, playerUuid: string): Promise<number> {
	const username = normUuid(playerUuid);
	const { rows } = await pool.query<{ id: number }>(
		`INSERT INTO hytale_players (username)
		 VALUES ($1)
		 ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
		 RETURNING id`,
		[username],
	);
	return rows[0]!.id;
}

export async function getWalletByUuid(pool: Pool, playerUuid: string): Promise<WalletBalances | null> {
	const username = normUuid(playerUuid);
	const { rows } = await pool.query<{ coins: string; crystals: string }>(
		`SELECT
			COALESCE(b.coins, 0)::text AS coins,
			COALESCE(b.crystals, 0)::text AS crystals
		FROM hytale_players p
		LEFT JOIN hytale_player_balance b ON b.player_id = p.id
		WHERE lower(p.username) = lower($1)`,
		[username],
	);
	if (!rows.length) return null;
	return {
		coins: Number(rows[0]!.coins) || 0,
		crystals: Number(rows[0]!.crystals) || 0,
	};
}

async function ensureBalanceRow(client: PoolClient, playerId: number): Promise<void> {
	await client.query(
		`INSERT INTO hytale_player_balance (player_id, coins, crystals, balance)
		 VALUES ($1, 0, 0, 0)
		 ON CONFLICT (player_id) DO NOTHING`,
		[playerId],
	);
}

export async function debitWallet(
	pool: Pool,
	playerUuid: string,
	currency: WalletCurrency,
	amount: number,
	reason: string,
): Promise<{ ok: true; balances: WalletBalances } | { ok: false; error: string; balances?: WalletBalances }> {
	const amt = Math.floor(amount);
	if (amt <= 0) {
		return { ok: false, error: 'сумма списания должна быть > 0' };
	}
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const playerId = await ensurePlayerId(client, playerUuid);
		await ensureBalanceRow(client, playerId);
		const col = currency === 'crystals' ? 'crystals' : 'coins';
		const { rows } = await client.query<{ coins: string; crystals: string }>(
			`UPDATE hytale_player_balance
			 SET ${col} = ${col} - $2,
			     updated_at = now()
			 WHERE player_id = $1 AND ${col} >= $2
			 RETURNING coins::text AS coins, crystals::text AS crystals`,
			[playerId, amt],
		);
		if (!rows.length) {
			await client.query('ROLLBACK');
			const cur = await getWalletByUuid(pool, playerUuid);
			const label = currency === 'crystals' ? 'кристаллов' : 'монет';
			return {
				ok: false,
				error: `Недостаточно ${label}`,
				balances: cur ?? { coins: 0, crystals: 0 },
			};
		}
		await client.query(
			`INSERT INTO hytale_balance_txn (player_id, kind, amount, currency, reason)
			 VALUES ($1, 'debit', $2, $3, $4)`,
			[playerId, amt, currency, reason.slice(0, 500)],
		);
		await client.query('COMMIT');
		return {
			ok: true,
			balances: {
				coins: Number(rows[0]!.coins) || 0,
				crystals: Number(rows[0]!.crystals) || 0,
			},
		};
	} catch (e) {
		try {
			await client.query('ROLLBACK');
		} catch {
			/* ignore */
		}
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, error: msg };
	} finally {
		client.release();
	}
}

export async function creditWallet(
	pool: Pool,
	playerUuid: string,
	currency: WalletCurrency,
	amount: number,
	reason: string,
): Promise<{ ok: true; balances: WalletBalances } | { ok: false; error: string }> {
	const amt = Math.floor(amount);
	if (amt <= 0) {
		return { ok: false, error: 'сумма зачисления должна быть > 0' };
	}
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const playerId = await ensurePlayerId(client, playerUuid);
		await ensureBalanceRow(client, playerId);
		const col = currency === 'crystals' ? 'crystals' : 'coins';
		const { rows } = await client.query<{ coins: string; crystals: string }>(
			`INSERT INTO hytale_player_balance (player_id, coins, crystals, balance)
			 VALUES ($1, 0, 0, 0)
			 ON CONFLICT (player_id) DO UPDATE
			 SET ${col} = hytale_player_balance.${col} + $2,
			     updated_at = now()
			 RETURNING coins::text AS coins, crystals::text AS crystals`,
			[playerId, amt],
		);
		await client.query(
			`INSERT INTO hytale_balance_txn (player_id, kind, amount, currency, reason)
			 VALUES ($1, 'credit', $2, $3, $4)`,
			[playerId, amt, currency, reason.slice(0, 500)],
		);
		await client.query('COMMIT');
		return {
			ok: true,
			balances: {
				coins: Number(rows[0]!.coins) || 0,
				crystals: Number(rows[0]!.crystals) || 0,
			},
		};
	} catch (e) {
		try {
			await client.query('ROLLBACK');
		} catch {
			/* ignore */
		}
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, error: msg };
	} finally {
		client.release();
	}
}

/** Идемпотентное зачисление после успешной оплаты ЮKassa. */
export async function creditYooKassaPayment(
	pool: Pool,
	params: {
		paymentId: string;
		playerUuid: string;
		creditCurrency: WalletCurrency;
		rubAmount: number;
		/** Если задан — используется вместо rubAmount × rate (для фиксированных пакетов). */
		gameAmountOverride?: number;
	},
): Promise<
	| { ok: true; alreadyCredited: boolean; gameAmount: number; balances: WalletBalances }
	| { ok: false; error: string }
> {
	const paymentId = params.paymentId.trim();
	if (!paymentId) return { ok: false, error: 'paymentId обязателен' };
	const rub = Number(params.rubAmount);
	if (!Number.isFinite(rub) || rub <= 0) {
		return { ok: false, error: 'некорректная сумма RUB' };
	}
	const override = params.gameAmountOverride;
	const gameAmount =
		typeof override === 'number' && Number.isFinite(override) && override > 0
			? Math.floor(override)
			: gameAmountFromRub(rub, params.creditCurrency);
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const playerId = await ensurePlayerId(client, params.playerUuid);
		const dup = await client.query(
			`SELECT 1 FROM hytale_yookassa_wallet_credits WHERE yookassa_payment_id = $1`,
			[paymentId],
		);
		if (dup.rowCount && dup.rowCount > 0) {
			const balances = (await getWalletByUuid(pool, params.playerUuid)) ?? { coins: 0, crystals: 0 };
			await client.query('COMMIT');
			return { ok: true, alreadyCredited: true, gameAmount, balances };
		}
		await ensureBalanceRow(client, playerId);
		const col = params.creditCurrency === 'crystals' ? 'crystals' : 'coins';
		const { rows } = await client.query<{ coins: string; crystals: string }>(
			`INSERT INTO hytale_player_balance (player_id, coins, crystals, balance)
			 VALUES ($1, 0, 0, 0)
			 ON CONFLICT (player_id) DO UPDATE
			 SET ${col} = hytale_player_balance.${col} + $2,
			     updated_at = now()
			 RETURNING coins::text AS coins, crystals::text AS crystals`,
			[playerId, gameAmount],
		);
		await client.query(
			`INSERT INTO hytale_balance_txn (player_id, kind, amount, currency, reason)
			 VALUES ($1, 'credit', $2, $3, $4)`,
			[playerId, gameAmount, params.creditCurrency, `yookassa:${paymentId}`],
		);
		await client.query(
			`INSERT INTO hytale_yookassa_wallet_credits
				(yookassa_payment_id, player_id, currency, rub_amount, game_amount)
			 VALUES ($1, $2, $3, $4, $5)`,
			[paymentId, playerId, params.creditCurrency, rub, gameAmount],
		);
		await client.query('COMMIT');
		return {
			ok: true,
			alreadyCredited: false,
			gameAmount,
			balances: {
				coins: Number(rows[0]!.coins) || 0,
				crystals: Number(rows[0]!.crystals) || 0,
			},
		};
	} catch (e) {
		try {
			await client.query('ROLLBACK');
		} catch {
			/* ignore */
		}
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, error: msg };
	} finally {
		client.release();
	}
}
