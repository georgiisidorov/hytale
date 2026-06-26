"""Начальная схема Hytale Admin (платежи, игроки, баланс, промокоды, магазин).

Revision ID: 0001
Revises:
Create Date: 2025-04-30

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_UPGRADE_SQL = [
	"""
CREATE TABLE IF NOT EXISTS hytale_payments (
	id BIGSERIAL PRIMARY KEY,
	amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
	username TEXT NOT NULL,
	payment_type TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
""",
	"CREATE INDEX IF NOT EXISTS idx_hytale_payments_created_at ON hytale_payments (created_at DESC)",
	"CREATE INDEX IF NOT EXISTS idx_hytale_payments_username ON hytale_payments (username)",
	"""
CREATE TABLE IF NOT EXISTS hytale_players (
	id BIGSERIAL PRIMARY KEY,
	username TEXT NOT NULL UNIQUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
""",
	"""
CREATE TABLE IF NOT EXISTS hytale_player_balance (
	player_id BIGINT PRIMARY KEY REFERENCES hytale_players(id) ON DELETE CASCADE,
	balance NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
""",
	"""
CREATE TABLE IF NOT EXISTS hytale_balance_txn (
	id BIGSERIAL PRIMARY KEY,
	player_id BIGINT NOT NULL REFERENCES hytale_players(id) ON DELETE CASCADE,
	kind TEXT NOT NULL CHECK (kind IN ('credit','debit')),
	amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
	reason TEXT,
	promo_code_id BIGINT,
	created_by_admin TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
""",
	"CREATE INDEX IF NOT EXISTS idx_hytale_balance_txn_player_time ON hytale_balance_txn (player_id, created_at DESC)",
	"""
CREATE TABLE IF NOT EXISTS hytale_promocodes (
	id BIGSERIAL PRIMARY KEY,
	code TEXT NOT NULL UNIQUE,
	payload JSONB NOT NULL DEFAULT '{}'::jsonb,
	is_multi_use BOOLEAN NOT NULL DEFAULT false,
	max_uses INT,
	uses_count INT NOT NULL DEFAULT 0,
	starts_at TIMESTAMPTZ,
	ends_at TIMESTAMPTZ,
	is_active BOOLEAN NOT NULL DEFAULT true,
	created_by_admin TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
""",
	"CREATE INDEX IF NOT EXISTS idx_hytale_promocodes_active ON hytale_promocodes (is_active, ends_at)",
	"""
CREATE TABLE IF NOT EXISTS hytale_promocode_redemptions (
	id BIGSERIAL PRIMARY KEY,
	promo_code_id BIGINT NOT NULL REFERENCES hytale_promocodes(id) ON DELETE CASCADE,
	player_id BIGINT NOT NULL REFERENCES hytale_players(id) ON DELETE CASCADE,
	redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	UNIQUE (promo_code_id, player_id)
)
""",
	"CREATE INDEX IF NOT EXISTS idx_hytale_promocode_redemptions_promo_time ON hytale_promocode_redemptions (promo_code_id, redeemed_at DESC)",
	"""
CREATE TABLE IF NOT EXISTS hytale_shop_items (
	id BIGSERIAL PRIMARY KEY,
	sku TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	description TEXT,
	price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
	is_active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
""",
	"CREATE INDEX IF NOT EXISTS idx_hytale_shop_items_active ON hytale_shop_items (is_active)",
	"""
CREATE TABLE IF NOT EXISTS hytale_purchases (
	id BIGSERIAL PRIMARY KEY,
	player_id BIGINT NOT NULL REFERENCES hytale_players(id) ON DELETE CASCADE,
	item_id BIGINT NOT NULL REFERENCES hytale_shop_items(id),
	price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
	currency TEXT NOT NULL DEFAULT 'balance',
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
""",
	"CREATE INDEX IF NOT EXISTS idx_hytale_purchases_player_time ON hytale_purchases (player_id, created_at DESC)",
]


def upgrade() -> None:
	for sql in _UPGRADE_SQL:
		op.execute(sa.text(sql.strip()))


def downgrade() -> None:
	op.execute(
		sa.text("""
DROP TABLE IF EXISTS hytale_purchases CASCADE;
DROP TABLE IF EXISTS hytale_promocode_redemptions CASCADE;
DROP TABLE IF EXISTS hytale_balance_txn CASCADE;
DROP TABLE IF EXISTS hytale_player_balance CASCADE;
DROP TABLE IF EXISTS hytale_promocodes CASCADE;
DROP TABLE IF EXISTS hytale_shop_items CASCADE;
DROP TABLE IF EXISTS hytale_players CASCADE;
DROP TABLE IF EXISTS hytale_payments CASCADE;
""")
	)
