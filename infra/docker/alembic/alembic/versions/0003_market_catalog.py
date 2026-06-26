"""Каталог Aether Market (магазин + рулетка) для админки и игрового мода.

Revision ID: 0003
Revises: 0002

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, Sequence[str], None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
	op.execute(
		sa.text("""
CREATE TABLE IF NOT EXISTS hytale_market_shop_items (
	id BIGSERIAL PRIMARY KEY,
	item_id TEXT NOT NULL UNIQUE,
	category TEXT NOT NULL,
	ui_category TEXT NOT NULL DEFAULT 'featured',
	display_name TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	stat1 TEXT NOT NULL DEFAULT '',
	stat2 TEXT NOT NULL DEFAULT '',
	stat3 TEXT NOT NULL DEFAULT '',
	quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
	rarity TEXT NOT NULL DEFAULT 'Common',
	price INT NOT NULL DEFAULT 0 CHECK (price >= 0),
	currency TEXT NOT NULL DEFAULT 'coins' CHECK (currency IN ('coins', 'crystals')),
	sort_order INT NOT NULL DEFAULT 0,
	is_active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
""")
	)
	op.execute(
		sa.text("""
CREATE INDEX IF NOT EXISTS idx_hytale_market_shop_active_sort
	ON hytale_market_shop_items (is_active, ui_category, sort_order, id)
""")
	)
	op.execute(
		sa.text("""
CREATE TABLE IF NOT EXISTS hytale_market_wheel_slots (
	id BIGSERIAL PRIMARY KEY,
	slot_index INT NOT NULL UNIQUE CHECK (slot_index >= 0 AND slot_index < 12),
	item_id TEXT NOT NULL,
	weight INT NOT NULL DEFAULT 100 CHECK (weight > 0),
	qty_min INT NOT NULL DEFAULT 1 CHECK (qty_min >= 1),
	qty_max INT NOT NULL DEFAULT 1,
	rarity TEXT NOT NULL DEFAULT 'Common',
	is_active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CHECK (qty_max >= qty_min)
)
""")
	)
	op.execute(
		sa.text("""
CREATE INDEX IF NOT EXISTS idx_hytale_market_wheel_active
	ON hytale_market_wheel_slots (is_active, slot_index)
""")
	)

	# Начальный каталог (как в YooKassaPayPage до миграции на БД)
	op.execute(
		sa.text("""
INSERT INTO hytale_market_shop_items (
	item_id, category, ui_category, display_name, description,
	stat1, stat2, stat3, quantity, rarity, price, currency, sort_order
) VALUES
('Tool_Pickaxe_Iron', 'Tool', 'tools', 'Iron Pickaxe',
 'Sturdy iron pickaxe for mining and gathering.', 'Mining speed +12%', 'Durability 280', '', 1, 'Common', 475, 'coins', 10),
('Weapon_Longsword_Mithril', 'Weapon', 'weapons', 'Mithril Longsword',
 'A light longsword forged from mithril.', 'Damage +24', 'Speed +6%', 'Durability 220', 1, 'Epic', 1890, 'coins', 20),
('Weapon_Shield_Orbis_Incandescent', 'Weapon', 'weapons', 'Orbis Incandescent Shield',
 'Radiant shield from the Orbis order.', 'Block +22%', 'Armor +14', 'Glow effect', 1, 'Legendary', 720, 'crystals', 30),
('Weapon_Shortbow_Doomed', 'Weapon', 'weapons', 'Doomed Shortbow',
 'A cursed shortbow with grim power.', 'Damage +16', 'Range +10%', 'Durability 160', 1, 'Rare', 935, 'coins', 40),
('Armor_Leather_Heavy_Chest', 'Armor', 'armor', 'Heavy Leather Chest',
 'Reinforced leather chest armor.', 'Armor +18', 'Weight: Medium', '', 1, 'Rare', 1280, 'coins', 50),
('Plant_Fruit_Apple', 'Plant', 'cosmetics', 'Apple',
 'A bundle of fresh apples.', 'Restores hunger', 'Stack: 100', '', 100, 'Common', 340, 'coins', 60),
('Metal_Iron_Ornate', 'Metal', 'featured', 'Ornate Iron',
 'Decorative iron ingots for crafting.', 'Crafting material', 'Stack: 20', '', 20, 'Uncommon', 865, 'coins', 70),
('Wood_Oak_Trunk', 'Wood', 'featured', 'Oak Trunk',
 'Oak wood for building and crafting.', 'Building material', 'Stack: 50', '', 50, 'Common', 590, 'coins', 80)
ON CONFLICT (item_id) DO NOTHING
""")
	)

	op.execute(
		sa.text("""
INSERT INTO hytale_market_wheel_slots (slot_index, item_id, weight, qty_min, qty_max, rarity) VALUES
(0, 'Potion_Poison', 120, 1, 1, 'Common'),
(1, 'Rock_Gem_Diamond', 40, 1, 1, 'Rare'),
(2, 'Ingredient_Bar_Gold', 80, 1, 3, 'Uncommon'),
(3, 'Rock_Gem_Emerald', 50, 1, 1, 'Rare'),
(4, 'Rock_Gem_Ruby', 50, 1, 1, 'Rare'),
(5, 'Rock_Gem_Sapphire', 50, 1, 1, 'Rare'),
(6, 'Rock_Gem_Topaz', 35, 1, 1, 'Epic'),
(7, 'Rock_Gem_Voidstone', 35, 1, 1, 'Epic'),
(8, 'Rock_Gem_Zephyr', 35, 1, 1, 'Epic'),
(9, 'Plant_Fruit_Azure', 100, 1, 5, 'Common'),
(10, 'Bandage_Crude', 110, 1, 3, 'Common'),
(11, 'Potion_Health', 90, 1, 2, 'Common')
ON CONFLICT (slot_index) DO NOTHING
""")
	)


def downgrade() -> None:
	op.execute(sa.text("DROP TABLE IF EXISTS hytale_market_wheel_slots"))
	op.execute(sa.text("DROP TABLE IF EXISTS hytale_market_shop_items"))
