import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveAssetsZip } from '@/lib/assets-zip';
import { iconSourceId } from '@/lib/market-item';

const execFileAsync = promisify(execFile);

const ICON_ALIASES: Record<string, string> = {
	// Shortbow → Bow в ассетах
	Weapon_Shortbow_Doomed: 'Weapon_Bow_Doomed',
	Weapon_Shortbow_Iron: 'Weapon_Bow_Iron',

	// Опечатка в Assets.zip — "Amor" вместо "Armor"
	Armor_Adamantite_Hands: 'Amor_Adamantite_Hands',

	// Нет иконки в ассетах — используем ближайшие
	Bench_Builders: 'Bench_WorkBench',
	Egg_Spawner_Lantern: 'Deco_Lantern',
	Farming_Collar: 'Deco_Dog_Collar',

	// Кастомные предметы рулетки/сундуков — нет в ассетах
	CHEST_COMMON:    'Furniture_Crude_Chest_Small',
	CHEST_RARE:      'Furniture_Desert_Chest_Small',
	CHEST_EPIC:      'Furniture_Dungeon_Chest_Epic',
	CHEST_LEGENDARY: 'Furniture_Dungeon_Chest_Legendary_Large',
	CHEST_MYTHIC:    'Furniture_GrandWizard_Chest_Large',
	CHEST_JACKPOT:   'Furniture_Kweebec_Chest_Large',
	WHEEL_COINS_50:  'Ingredient_Crystal_Fragments_Yellow',
	WHEEL_COINS_75:  'Ingredient_Crystal_Fragments_Yellow',
	WHEEL_EMPTY:     'Furniture_Crude_Chest_Small',
	WHEEL_FREE_SPIN: 'Tool_Repair_Kit_Iron',

	// Royal Magic мебель — только часть есть в ассетах
	Furniture_Royal_Magic_Chair:      'Furniture_Royal_Magic_Bed',
	Furniture_Royal_Magic_Chest_Large: 'Furniture_Ancient_Chest_Large',
	Furniture_Royal_Magic_Chest_Small: 'Furniture_Ancient_Chest_Small',
	Furniture_Royal_Magic_Table:      'Furniture_Royal_Magic_Pot',
	Furniture_Royal_Magic_Wardrobe:   'Furniture_Royal_Magic_Bed',

	// Другой потолочный фонарь
	Deco_Lantern_Ceiling: 'Furniture_Kweebec_Lantern',

	// Разные наименования в ассетах
	Ingredient_Charcoal:    'Rubble_Charcoal_Small',
	Plant_Bush:             'Plant_Bush_Green',
	Plant_Crop_Chilli_Item: 'Ingredient_Life_Essence_Chilli',
	Plant_Reeds_Water:      'Plant_Reeds',
	Plant_Sapling_Redwood:  'Plant_Redwood_Sapling',
	Plant_Vine_Jungle:      'Plant_Bush_Green',
};

async function findZipEntry(assetsZip: string, sourceId: string): Promise<string | null> {
	const { stdout } = await execFileAsync('unzip', ['-Z1', assetsZip], { maxBuffer: 64 * 1024 * 1024 });
	const needle = `itemsgenerated/${sourceId.toLowerCase()}.png`;
	for (const line of stdout.split('\n')) {
		const t = line.trim();
		if (t.toLowerCase().endsWith(needle)) return t;
	}
	return null;
}

export async function extractItemIconPng(itemId: string): Promise<Buffer | null> {
	const outputId = itemId.trim();
	if (!outputId) return null;

	const assetsZip = await resolveAssetsZip();
	if (!assetsZip) return null;

	const sourceId = ICON_ALIASES[outputId] ?? iconSourceId(outputId);
	const entry = await findZipEntry(assetsZip, sourceId);
	if (!entry) return null;

	const { stdout } = await execFileAsync('unzip', ['-p', assetsZip, entry], {
		encoding: 'buffer',
		maxBuffer: 8 * 1024 * 1024,
	});
	return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
}

/** Локальная иконка из мода (если уже собрана на хосте). */
export async function readBundledModIcon(itemId: string): Promise<Buffer | null> {
	const base = process.env.HYTALE_MARKET_ICONS_DIR?.trim();
	if (!base) return null;
	const file = path.join(base, `${itemId.trim()}.png`);
	try {
		return await readFile(file);
	} catch {
		return null;
	}
}

export async function loadItemIcon(itemId: string): Promise<Buffer | null> {
	return (await extractItemIconPng(itemId)) ?? (await readBundledModIcon(itemId));
}
