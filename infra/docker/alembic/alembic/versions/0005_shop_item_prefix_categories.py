"""ui_category = префикс item id (до первого `_`).

Revision ID: 0005
Revises: 0004

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, Sequence[str], None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
	op.execute(
		sa.text("""
UPDATE hytale_market_shop_items SET
	category = split_part(item_id, '_', 1),
	ui_category = split_part(item_id, '_', 1),
	updated_at = now()
WHERE strpos(item_id, '_') > 0;
""")
	)


def downgrade() -> None:
	pass
