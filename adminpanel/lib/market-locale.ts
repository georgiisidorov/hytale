import { withShopLocale, withShopLocaleFast, withWheelLocale, withWheelLocaleFast } from '@/lib/item-locale';

/** Полная локализация (цепочки Parent/JSON) — для игрового каталога. */
export async function applyShopLocales<T extends { item_id: string; display_name?: string; description?: string }>(
	rows: T[],
): Promise<T[]> {
	return Promise.all(rows.map((r) => withShopLocale(r)));
}

/** Быстрая локализация — только server.lang, для списков в админке. */
export async function applyShopLocalesFast<T extends { item_id: string; display_name?: string; description?: string }>(
	rows: T[],
): Promise<T[]> {
	if (!rows.length) return rows;
	return Promise.all(rows.map((r) => withShopLocaleFast(r)));
}

export async function applyWheelLocales<T extends { item_id: string }>(
	rows: T[],
): Promise<(T & { display_name: string })[]> {
	return Promise.all(rows.map((r) => withWheelLocale(r)));
}

export async function applyWheelLocalesFast<T extends { item_id: string }>(
	rows: T[],
): Promise<(T & { display_name: string })[]> {
	if (!rows.length) return rows as (T & { display_name: string })[];
	return Promise.all(rows.map((r) => withWheelLocaleFast(r)));
}
