"""Колонки модерации у игроков + мета-синхронизация permissions.json.

Revision ID: 0002
Revises: 0001

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, Sequence[str], None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
	op.execute(
		sa.text("""
ALTER TABLE hytale_players
	ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'active';
""")
	)
	op.execute(
		sa.text("""
ALTER TABLE hytale_players
	ADD COLUMN IF NOT EXISTS moderation_until TIMESTAMPTZ;
""")
	)
	op.execute(
		sa.text("""
ALTER TABLE hytale_players DROP CONSTRAINT IF EXISTS chk_hytale_players_moderation_status;
""")
	)
	op.execute(
		sa.text("""
ALTER TABLE hytale_players ADD CONSTRAINT chk_hytale_players_moderation_status
	CHECK (moderation_status IN ('active', 'banned', 'temp_kick'));
""")
	)
	op.execute(
		sa.text("""
CREATE TABLE IF NOT EXISTS hytale_admin_meta (
	key TEXT PRIMARY KEY,
	value_timestamptz TIMESTAMPTZ NOT NULL
);
""")
	)


def downgrade() -> None:
	op.execute(sa.text("ALTER TABLE hytale_players DROP CONSTRAINT IF EXISTS chk_hytale_players_moderation_status"))
	op.execute(sa.text("ALTER TABLE hytale_players DROP COLUMN IF EXISTS moderation_until"))
	op.execute(sa.text("ALTER TABLE hytale_players DROP COLUMN IF EXISTS moderation_status"))
	op.execute(sa.text("DROP TABLE IF EXISTS hytale_admin_meta"))
