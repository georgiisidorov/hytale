"""Русские описания каталога (вместо английского seed).

Revision ID: 0004
Revises: 0003

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, Sequence[str], None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
	op.execute(
		sa.text("""
UPDATE hytale_market_shop_items SET
	description = 'Лёгкий длинный меч, выкованный из мифрила.',
	stat1 = 'Урон +24', stat2 = 'Скорость +6%', stat3 = 'Прочность 220',
	updated_at = now()
WHERE item_id = 'Weapon_Longsword_Mithril';

UPDATE hytale_market_shop_items SET
	description = 'Сияющий щит ордена Орбис.',
	stat1 = 'Блок +22%', stat2 = 'Броня +14', stat3 = 'Эффект свечения',
	updated_at = now()
WHERE item_id = 'Weapon_Shield_Orbis_Incandescent';

UPDATE hytale_market_shop_items SET
	description = 'Проклятый короткий лук с мрачной силой.',
	stat1 = 'Урон +16', stat2 = 'Дальность +10%', stat3 = 'Прочность 160',
	updated_at = now()
WHERE item_id = 'Weapon_Shortbow_Doomed';

UPDATE hytale_market_shop_items SET
	description = 'Усиленная кожаная нагрудная броня.',
	stat1 = 'Броня +18', stat2 = 'Вес: средний', stat3 = '',
	updated_at = now()
WHERE item_id = 'Armor_Leather_Heavy_Chest';

UPDATE hytale_market_shop_items SET
	description = 'Связка свежих яблок.',
	stat1 = 'Восстанавливает голод', stat2 = 'Стак: 100', stat3 = '',
	updated_at = now()
WHERE item_id = 'Plant_Fruit_Apple';

UPDATE hytale_market_shop_items SET
	description = 'Декоративные железные слитки для крафта.',
	stat1 = 'Материал для крафта', stat2 = 'Стак: 20', stat3 = '',
	updated_at = now()
WHERE item_id = 'Metal_Iron_Ornate';

UPDATE hytale_market_shop_items SET
	description = 'Дубовая древесина для строительства и крафта.',
	stat1 = 'Строительный материал', stat2 = 'Стак: 50', stat3 = '',
	updated_at = now()
WHERE item_id = 'Wood_Oak_Trunk';

UPDATE hytale_market_shop_items SET
	stat1 = 'Скорость добычи +12%', stat2 = 'Прочность 280', stat3 = '',
	updated_at = now()
WHERE item_id = 'Tool_Pickaxe_Iron';
""")
	)


def downgrade() -> None:
	pass
