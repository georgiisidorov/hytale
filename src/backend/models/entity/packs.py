from dataclasses import dataclass, field
from typing import List, Tuple


@dataclass(frozen=True)
class ItemGrant:
    item_id: str
    quantity: int


@dataclass(frozen=True)
class KitPack:
    id: str
    name: str
    price_rub: int
    diamonds: int
    bonus: str = ""
    currency: str = "crystals"  # "crystals" | "coins"


@dataclass(frozen=True)
class LootPack:
    id: str
    name: str
    price_diamonds: int
    items: Tuple[ItemGrant, ...]


KIT_PACKS: List[KitPack] = [
    # Монетные паки (рубли → монеты)
    KitPack(id="coin_pack_rookie",   name="Новичок",             price_rub=149,  diamonds=1500,  currency="coins"),
    KitPack(id="coin_pack_starter",  name="Стартовый запас",     price_rub=349,  diamonds=4000,  currency="coins"),
    KitPack(id="coin_pack_builder",  name="Большая стройка",     price_rub=799,  diamonds=10000, currency="coins"),
    KitPack(id="coin_pack_guild",    name="Гильдейский сундук",  price_rub=1990, diamonds=30000, currency="coins"),
    # Кристальные паки (рубли → алмазы)
    KitPack(id="diamond_pack_small_bag",    name="Малый мешочек",    price_rub=299,  diamonds=330,  bonus="+10%"),
    KitPack(id="diamond_pack_seeker_chest", name="Сундук искателя",  price_rub=699,  diamonds=850,  bonus="+21%"),
    KitPack(id="diamond_pack_royal_vein",   name="Королевская жила", price_rub=1490, diamonds=2000, bonus="+34%"),
    KitPack(id="diamond_pack_dragon_hoard", name="Драконий клад",    price_rub=2990, diamonds=4500, bonus="+50%"),
]

KIT_PACKS_BY_ID = {p.id: p for p in KIT_PACKS}

LOOT_PACKS: List[LootPack] = [
    LootPack(
        id="pack_builder_premium",
        name="Набор строителя",
        price_diamonds=800,
        items=(
            ItemGrant("Tool_Hammer_Iron", 1),
            ItemGrant("Bench_Builders", 1),
            ItemGrant("Furniture_Royal_Magic_Chest_Large", 1),
            ItemGrant("Deco_Lantern_Ceiling", 8),
            ItemGrant("Furniture_Village_Crate", 8),
            ItemGrant("Furniture_Tavern_Barrel", 4),
        ),
    ),
    LootPack(
        id="pack_pet_utility",
        name="Набор питомца",
        price_diamonds=800,
        items=(
            ItemGrant("Egg_Spawner_Lantern", 1),
            ItemGrant("Farming_Collar", 1),
            ItemGrant("Tool_Capture_Crate", 1),
            ItemGrant("Tool_Repair_Kit_Rare", 1),
        ),
    ),
    LootPack(
        id="pack_iron_adventurer",
        name="Набор авантюриста",
        price_diamonds=700,
        items=(
            ItemGrant("Armor_Iron_Head", 1),
            ItemGrant("Armor_Iron_Chest", 1),
            ItemGrant("Armor_Iron_Hands", 1),
            ItemGrant("Armor_Iron_Legs", 1),
            ItemGrant("Weapon_Sword_Iron", 1),
            ItemGrant("Weapon_Shortbow_Iron", 1),
            ItemGrant("Weapon_Arrow_Iron", 64),
            ItemGrant("Potion_Health", 5),
            ItemGrant("Potion_Stamina", 3),
        ),
    ),
    LootPack(
        id="pack_alchemist_premium",
        name="Набор алхимика",
        price_diamonds=550,
        items=(
            ItemGrant("Bench_Alchemy", 1),
            ItemGrant("Potion_Empty", 32),
            ItemGrant("Potion_Health", 5),
            ItemGrant("Potion_Stamina", 5),
            ItemGrant("Ingredient_Life_Essence_Tomato", 3),
            ItemGrant("Ingredient_Fire_Essence", 2),
            ItemGrant("Ingredient_Ice_Essence", 2),
        ),
    ),
    LootPack(
        id="pack_royal_decor",
        name="Набор декора",
        price_diamonds=1500,
        items=(
            ItemGrant("Furniture_Royal_Magic_Chest_Large", 1),
            ItemGrant("Furniture_Royal_Magic_Chest_Small", 1),
            ItemGrant("Furniture_Royal_Magic_Bed", 1),
            ItemGrant("Furniture_Royal_Magic_Chair", 2),
            ItemGrant("Furniture_Royal_Magic_Table", 1),
            ItemGrant("Furniture_Royal_Magic_Wardrobe", 1),
            ItemGrant("Furniture_Royal_Magic_Carpet", 2),
            ItemGrant("Furniture_Royal_Magic_Medium_Door", 2),
            ItemGrant("Furniture_Royal_Magic_Pot", 4),
        ),
    ),
]

LOOT_PACKS_BY_ID = {p.id: p for p in LOOT_PACKS}
