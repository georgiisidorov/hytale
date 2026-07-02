"""loot_pack_purchases_activated_at

Revision ID: 0011
Revises: 0010
Create Date: 2026-07-02
"""
from alembic import op

revision = "0011"
down_revision = "0010"


def upgrade() -> None:
    op.execute("""
        ALTER TABLE hytale_loot_pack_purchases
        ADD COLUMN activated_at TIMESTAMPTZ DEFAULT NULL
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE hytale_loot_pack_purchases
        DROP COLUMN activated_at
    """)
