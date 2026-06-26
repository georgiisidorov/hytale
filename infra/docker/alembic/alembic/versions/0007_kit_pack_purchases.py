"""Kit pack purchases table for packs-api.

Revision ID: 0007
Revises: 0006

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, Sequence[str], None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text("""
CREATE TABLE IF NOT EXISTS hytale_kit_pack_purchases (
    yookassa_payment_id TEXT PRIMARY KEY,
    player_uuid         TEXT NOT NULL,
    pack_id             TEXT NOT NULL,
    coins_amount        BIGINT NOT NULL CHECK (coins_amount > 0),
    rub_amount          NUMERIC(12, 2) NOT NULL CHECK (rub_amount > 0),
    status              TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'succeeded', 'canceled')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    fulfilled_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hytale_kit_pack_purchases_player
    ON hytale_kit_pack_purchases (player_uuid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hytale_kit_pack_purchases_status
    ON hytale_kit_pack_purchases (status) WHERE status = 'pending';
""")
    )


def downgrade() -> None:
    op.execute(
        sa.text("""
DROP TABLE IF EXISTS hytale_kit_pack_purchases;
""")
    )
