"""Баланс игрока: монеты и кристаллы, учёт пополнений ЮKassa.

Revision ID: 0006
Revises: 0005

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, Sequence[str], None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
	op.execute(
		sa.text("""
ALTER TABLE hytale_player_balance
	ADD COLUMN IF NOT EXISTS coins BIGINT NOT NULL DEFAULT 0 CHECK (coins >= 0),
	ADD COLUMN IF NOT EXISTS crystals BIGINT NOT NULL DEFAULT 0 CHECK (crystals >= 0);

UPDATE hytale_player_balance
SET coins = GREATEST(coins, GREATEST(0, ROUND(balance)::bigint))
WHERE balance > 0;

ALTER TABLE hytale_balance_txn
	ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'coins';

ALTER TABLE hytale_balance_txn DROP CONSTRAINT IF EXISTS hytale_balance_txn_currency_check;
ALTER TABLE hytale_balance_txn
	ADD CONSTRAINT hytale_balance_txn_currency_check
	CHECK (currency IN ('coins', 'crystals'));

CREATE TABLE IF NOT EXISTS hytale_yookassa_wallet_credits (
	yookassa_payment_id TEXT PRIMARY KEY,
	player_id BIGINT NOT NULL REFERENCES hytale_players(id) ON DELETE CASCADE,
	currency TEXT NOT NULL CHECK (currency IN ('coins', 'crystals')),
	rub_amount NUMERIC(12, 2) NOT NULL CHECK (rub_amount >= 0),
	game_amount BIGINT NOT NULL CHECK (game_amount > 0),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hytale_yookassa_wallet_credits_player
	ON hytale_yookassa_wallet_credits (player_id, created_at DESC);
""")
	)


def downgrade() -> None:
	op.execute(
		sa.text("""
DROP TABLE IF EXISTS hytale_yookassa_wallet_credits;
ALTER TABLE hytale_balance_txn DROP CONSTRAINT IF EXISTS hytale_balance_txn_currency_check;
ALTER TABLE hytale_balance_txn DROP COLUMN IF EXISTS currency;
ALTER TABLE hytale_player_balance DROP COLUMN IF EXISTS crystals;
ALTER TABLE hytale_player_balance DROP COLUMN IF EXISTS coins;
""")
	)
