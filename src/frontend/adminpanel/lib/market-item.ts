export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

export const CURRENCIES = ['coins', 'crystals'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Префикс item id до первого `_` (Weapon, Armor, Tool, …). */
export function deriveCategory(itemId: string): string {
	const trimmed = itemId.trim();
	const i = trimmed.indexOf('_');
	return i > 0 ? trimmed.slice(0, i) : trimmed || 'Misc';
}

/**
 * Вкладки магазина в игровом UI — префиксы item id из Assets (без dev/editor).
 * Порядок = порядок кнопок в YooKassaPay.ui.
 */
export const SHOP_TAB_CATEGORIES = [
	'Weapon',
	'Armor',
	'Tool',
	'Plant',
	'Ingredient',
	'Potion',
	'Food',
	'Metal',
	'Wood',
	'Furniture',
	'Bench',
	'Ore',
	'Fish',
	'Cloth',
	'Deco',
] as const;

export type ShopTabCategory = (typeof SHOP_TAB_CATEGORIES)[number];

/** @deprecated используйте SHOP_TAB_CATEGORIES */
export const UI_CATEGORIES = SHOP_TAB_CATEGORIES;
export type UiCategory = ShopTabCategory;

const CATEGORY_LABELS: Record<string, string> = {
	Weapon: 'Оружие',
	Armor: 'Броня',
	Tool: 'Инструменты',
	Plant: 'Растения',
	Ingredient: 'Ингредиенты',
	Potion: 'Зелья',
	Food: 'Еда',
	Metal: 'Металл',
	Wood: 'Дерево',
	Furniture: 'Мебель',
	Bench: 'Верстаки',
	Ore: 'Руда',
	Fish: 'Рыба',
	Cloth: 'Ткань',
	Deco: 'Декор',
};

export function categoryLabel(category: string): string {
	return CATEGORY_LABELS[category] ?? category;
}

const RARITY_LABELS: Record<Rarity, string> = {
	Common: 'Обычное',
	Uncommon: 'Необычное',
	Rare: 'Редкое',
	Epic: 'Эпическое',
	Legendary: 'Легендарное',
};

export function rarityLabel(rarity: string): string {
	return RARITY_LABELS[rarity as Rarity] ?? rarity;
}

const CURRENCY_LABELS: Record<Currency, string> = {
	coins: 'Монеты',
	crystals: 'Кристаллы',
};

export function currencyLabel(currency: string): string {
	return CURRENCY_LABELS[currency as Currency] ?? currency;
}

/** Вкладка магазина = префикс item id (если есть в SHOP_TAB_CATEGORIES). */
export function deriveUiCategory(itemId: string): ShopTabCategory {
	const cat = deriveCategory(itemId);
	if (SHOP_TAB_CATEGORIES.includes(cat as ShopTabCategory)) {
		return cat as ShopTabCategory;
	}
	return 'Weapon';
}

/** Человекочитаемое имя: части после категории. */
export function deriveDisplayName(itemId: string): string {
	const parts = itemId.trim().split('_').filter(Boolean);
	if (parts.length < 2) return itemId.trim();
	return parts
		.slice(1)
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
		.join(' ');
}

const ICON_ALIASES: Record<string, string> = {
	Weapon_Shortbow_Doomed: 'Weapon_Bow_Doomed',
};

export function iconSourceId(itemId: string): string {
	const id = itemId.trim();
	return ICON_ALIASES[id] ?? id;
}

export function itemIconUrl(itemId: string): string {
	const u = new URL('/api/hytale/market/item-icon', 'http://local');
	u.searchParams.set('itemId', itemId.trim());
	return `${u.pathname}?${u.searchParams.toString()}`;
}

export function validateItemId(itemId: string): string | null {
	const id = itemId.trim();
	if (!id) return 'item id обязателен';
	if (id.length > 128) return 'item id слишком длинный';
	if (!/^[A-Za-z0-9_]+$/.test(id)) return 'item id: только буквы, цифры и _';
	return null;
}
