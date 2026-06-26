import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { deriveDisplayName } from '@/lib/market-item';
import { resolveAssetsZip } from '@/lib/assets-zip';

const execFileAsync = promisify(execFile);

const LOCALE_ENTRY = 'Server/Languages/ru-RU/server.lang';
const ITEM_KEY_RE =
	/^(?:server\.)?items\.([A-Za-z0-9_]+)\.(name|description)\s*=\s*(.*)$/;

export type ItemLocale = { name?: string; description?: string };

let indexPromise: Promise<Map<string, ItemLocale>> | null = null;

/** Убирает теги Hytale (<color>, <i>…) — Custom UI их не рендерит. */
export function formatDescriptionForUi(text: string): string {
	return text
		.replace(/\\n/g, '\n')
		.replace(/^\[TMP\]\s*/i, '')
		.replaceAll(/<[^>]+>/g, '')
		.replaceAll(/[ \t]+/g, ' ')
		.replaceAll(/\n{3,}/g, '\n\n')
		.trim();
}

async function loadIndex(): Promise<Map<string, ItemLocale>> {
	const assetsZip = await resolveAssetsZip();
	if (!assetsZip) return new Map();

	const { stdout } = await execFileAsync('unzip', ['-p', assetsZip, LOCALE_ENTRY], {
		encoding: 'utf8',
		maxBuffer: 16 * 1024 * 1024,
	});
	const text = typeof stdout === 'string' ? stdout : String(stdout);
	const map = new Map<string, ItemLocale>();

	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const m = ITEM_KEY_RE.exec(trimmed);
		if (!m) continue;
		const itemId = m[1];
		const field = m[2] as 'name' | 'description';
		let value = m[3].trim();
		if (field === 'description') {
			value = formatDescriptionForUi(value);
		}
		const prev = map.get(itemId) ?? {};
		if (field === 'name') prev.name = value;
		else prev.description = value;
		map.set(itemId, prev);
	}
	return map;
}

async function localeIndex(): Promise<Map<string, ItemLocale>> {
	if (!indexPromise) indexPromise = loadIndex();
	return indexPromise;
}

async function findItemJsonPath(assetsZip: string, itemId: string): Promise<string | null> {
	const { stdout } = await execFileAsync('unzip', ['-Z1', assetsZip], {
		maxBuffer: 64 * 1024 * 1024,
	});
	const needle = `/${itemId}.json`.toLowerCase();
	for (const line of stdout.split('\n')) {
		const t = line.trim();
		if (t.toLowerCase().endsWith(needle) && t.includes('/Item/Items/')) {
			return t;
		}
	}
	return null;
}

type ItemJson = {
	Parent?: string;
	TranslationProperties?: { Name?: string; Description?: string };
};

async function readItemJson(assetsZip: string, itemId: string): Promise<ItemJson | null> {
	const path = await findItemJsonPath(assetsZip, itemId);
	if (!path) return null;
	const { stdout } = await execFileAsync('unzip', ['-p', assetsZip, path], {
		encoding: 'utf8',
		maxBuffer: 2 * 1024 * 1024,
	});
	try {
		return JSON.parse(typeof stdout === 'string' ? stdout : String(stdout)) as ItemJson;
	} catch {
		return null;
	}
}

function langKeyToItemId(langKey: string): string | null {
	const k = langKey.trim().replace(/^server\./, '');
	const m = /^items\.([A-Za-z0-9_]+)\.(name|description)$/.exec(k);
	return m ? m[1] : null;
}

/** Английский seed из БД — не показываем в shop, если нет ru-RU в Assets. */
function isEnglishSeedText(text: string): boolean {
	const t = text.trim();
	if (!t) return false;
	const cyrillic = (t.match(/[\u0400-\u04FF]/g) ?? []).length;
	const latin = (t.match(/[A-Za-z]/g) ?? []).length;
	return latin > 0 && cyrillic === 0;
}

async function resolveDescriptionFromItemChain(
	itemId: string,
	map: Map<string, ItemLocale>,
): Promise<string | null> {
	const assetsZip = await resolveAssetsZip();
	if (!assetsZip) return null;

	const visited = new Set<string>();
	let current: string | null = itemId.trim();
	for (let depth = 0; depth < 16 && current; depth++) {
		if (visited.has(current)) break;
		visited.add(current);

		const direct = map.get(current)?.description;
		if (direct) return direct;

		const json = await readItemJson(assetsZip, current);
		if (!json) break;

		const descKey = json.TranslationProperties?.Description?.trim();
		if (descKey) {
			const refId = langKeyToItemId(descKey);
			if (refId) {
				const refDesc = map.get(refId)?.description;
				if (refDesc) return refDesc;
				const chained = await resolveDescriptionFromItemChain(refId, map);
				if (chained) return chained;
				current = refId;
				continue;
			}
		}

		const parent = json.Parent?.trim();
		if (!parent || parent === current) break;
		current = parent;
	}
	return null;
}

/** Официальное имя/описание предмета из ru-RU server.lang (Assets.zip). */
export async function getItemLocale(itemId: string): Promise<ItemLocale | null> {
	const id = itemId.trim();
	if (!id) return null;
	const map = await localeIndex();
	const base = map.get(id);
	const description =
		base?.description ?? (await resolveDescriptionFromItemChain(id, map)) ?? undefined;
	if (!base?.name && !description) return null;
	return { name: base?.name, description };
}

export async function resolveItemDisplayName(itemId: string, fallback?: string): Promise<string> {
	const loc = await getItemLocale(itemId);
	if (loc?.name) return loc.name;
	return fallback?.trim() || itemId.trim();
}

export async function resolveItemDescription(itemId: string, fallback?: string): Promise<string> {
	const loc = await getItemLocale(itemId);
	if (loc?.description) return loc.description;
	const fb = fallback?.trim();
	if (!fb || isEnglishSeedText(fb)) return '';
	return formatDescriptionForUi(fb);
}

/** Быстро: только ru-RU server.lang, без обхода JSON-цепочек (для списков админки). */
export async function resolveItemDisplayNameFromMap(itemId: string, fallback?: string): Promise<string> {
	const id = itemId.trim();
	if (!id) return '';
	const map = await localeIndex();
	const fromLang = map.get(id)?.name;
	if (fromLang) return fromLang;
	const fb = fallback?.trim();
	if (fb && !isEnglishSeedText(fb)) return fb;
	return deriveDisplayName(id);
}

export async function resolveItemDescriptionFromMap(itemId: string, fallback?: string): Promise<string> {
	const id = itemId.trim();
	if (!id) return '';
	const map = await localeIndex();
	const fromLang = map.get(id)?.description;
	if (fromLang) return fromLang;
	const fb = fallback?.trim();
	if (!fb || isEnglishSeedText(fb)) return '';
	return formatDescriptionForUi(fb);
}

export async function withShopLocaleFast<T extends { item_id: string; display_name?: string; description?: string }>(
	row: T,
): Promise<T> {
	const display_name = await resolveItemDisplayNameFromMap(row.item_id, row.display_name);
	const description = await resolveItemDescriptionFromMap(row.item_id, row.description);
	return { ...row, display_name, description };
}

export async function withShopLocale<T extends { item_id: string; display_name?: string; description?: string }>(
	row: T,
): Promise<T> {
	const display_name = await resolveItemDisplayName(row.item_id, row.display_name);
	const description = await resolveItemDescription(row.item_id, row.description);
	return {
		...row,
		display_name,
		description,
	};
}

export async function withWheelLocaleFast<T extends { item_id: string }>(
	row: T,
): Promise<T & { display_name: string }> {
	const display_name = await resolveItemDisplayNameFromMap(row.item_id, row.item_id);
	return { ...row, display_name };
}

export async function withWheelLocale<T extends { item_id: string }>(
	row: T,
): Promise<T & { display_name: string }> {
	const name = await resolveItemDisplayName(row.item_id, row.item_id);
	return { ...row, display_name: name };
}
