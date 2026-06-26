"""wheel_rewards_table

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-21
"""
from alembic import op

revision = "0008"
down_revision = "0007"


def upgrade() -> None:
    op.execute("""
    CREATE TABLE hytale_market_wheel_rewards (
        id          BIGSERIAL PRIMARY KEY,
        reward_id   TEXT NOT NULL UNIQUE,
        rarity      TEXT NOT NULL DEFAULT 'Common',
        reward_type TEXT NOT NULL DEFAULT 'item',
        item_id     TEXT,
        quantity    INTEGER NOT NULL DEFAULT 1,
        weight      INTEGER NOT NULL DEFAULT 100,
        display_name_ru TEXT NOT NULL DEFAULT '',
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT hytale_market_wheel_rewards_weight_check CHECK (weight > 0),
        CONSTRAINT hytale_market_wheel_rewards_qty_check    CHECK (quantity >= 1)
    );
    CREATE TRIGGER update_hytale_market_wheel_rewards_updated_at
        BEFORE UPDATE ON hytale_market_wheel_rewards
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS hytale_market_wheel_rewards;")
