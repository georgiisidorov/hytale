"""loot_pack_purchases

Revision ID: 0010
Revises: 0009
Create Date: 2026-07-02
"""
from alembic import op

revision = "0010"
down_revision = "0009"


def upgrade() -> None:
    op.execute("""
        CREATE TABLE hytale_loot_pack_purchases (
            id           SERIAL PRIMARY KEY,
            payment_id   TEXT        NOT NULL UNIQUE,
            pack_id      TEXT        NOT NULL,
            player_uuid  TEXT,
            amount_rub   NUMERIC(10,2) NOT NULL,
            voucher_code TEXT        NOT NULL,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX idx_loot_pack_purchases_player ON hytale_loot_pack_purchases (player_uuid)")
    op.execute("CREATE INDEX idx_loot_pack_purchases_pack   ON hytale_loot_pack_purchases (pack_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS hytale_loot_pack_purchases")
