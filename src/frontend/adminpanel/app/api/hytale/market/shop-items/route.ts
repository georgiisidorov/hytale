import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/market-auth';
import {
	CURRENCIES,
	RARITIES,
	deriveCategory,
	deriveDisplayName,
	SHOP_TAB_CATEGORIES,
	deriveUiCategory,
	validateItemId,
	type Currency,
	type Rarity,
} from '@/lib/market-item';
import { applyShopLocalesFast } from '@/lib/market-locale';
import { resolveItemDescription, resolveItemDisplayName } from '@/lib/item-locale';

function badRequest(message: string) {
	return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function GET(req: Request) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const url = new URL(req.url);
		const uiCategory = (url.searchParams.get('uiCategory') ?? '').trim();
		const includeInactive = url.searchParams.get('all') === '1';

		const pool = getPool();
		const where: string[] = [];
		const args: Array<string | boolean> = [];
		let i = 1;

		if (!includeInactive) {
			where.push('is_active = true');
		}
		if (uiCategory) {
			where.push(`ui_category = $${i++}`);
			args.push(uiCategory);
		}

		const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
		const { rows } = await pool.query(
			`SELECT
				id, item_id, category, ui_category, display_name, description,
				stat1, stat2, stat3, quantity, rarity, price, currency,
				sort_order, is_active, created_at, updated_at
			FROM hytale_market_shop_items
			${whereSql}
			ORDER BY sort_order ASC, id ASC`,
			args,
		);

		return NextResponse.json({ ok: true, rows: await applyShopLocalesFast(rows) });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

export async function POST(req: Request) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const body = (await req.json()) as Partial<{
			itemId: string;
			displayName: string;
			uiCategory: string;
			description: string;
			stat1: string;
			stat2: string;
			stat3: string;
			quantity: number;
			rarity: string;
			price: number;
			currency: string;
			sortOrder: number;
			isActive: boolean;
		}>;

		const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : '';
		const idErr = validateItemId(itemId);
		if (idErr) return badRequest(idErr);

		const category = deriveCategory(itemId);
		const uiCategoryRaw = typeof body.uiCategory === 'string' ? body.uiCategory.trim() : '';
		const uiCategory = SHOP_TAB_CATEGORIES.includes(uiCategoryRaw as (typeof SHOP_TAB_CATEGORIES)[number])
			? uiCategoryRaw
			: deriveUiCategory(itemId);

		const displayName =
			typeof body.displayName === 'string' && body.displayName.trim()
				? body.displayName.trim()
				: await resolveItemDisplayName(itemId, deriveDisplayName(itemId));

		const description =
			typeof body.description === 'string' && body.description.trim()
				? body.description.trim()
				: await resolveItemDescription(itemId, '');

		const rarity = typeof body.rarity === 'string' ? body.rarity.trim() : 'Common';
		if (!RARITIES.includes(rarity as Rarity)) return badRequest('неверная редкость');

		const currency = typeof body.currency === 'string' ? body.currency.trim() : 'coins';
		if (!CURRENCIES.includes(currency as Currency)) return badRequest('currency: coins или crystals');

		const quantity = Math.max(1, Math.min(Number(body.quantity) || 1, 1_000_000));
		const price = Math.max(0, Math.min(Number(body.price) || 0, 2_000_000_000));
		const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
		const isActive = body.isActive === false ? false : true;

		const pool = getPool();
		const { rows } = await pool.query(
			`INSERT INTO hytale_market_shop_items (
				item_id, category, ui_category, display_name, description,
				stat1, stat2, stat3, quantity, rarity, price, currency, sort_order, is_active
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
			RETURNING
				id, item_id, category, ui_category, display_name, description,
				stat1, stat2, stat3, quantity, rarity, price, currency,
				sort_order, is_active, created_at, updated_at`,
			[
				itemId,
				category,
				uiCategory,
				displayName,
				description,
				typeof body.stat1 === 'string' ? body.stat1 : '',
				typeof body.stat2 === 'string' ? body.stat2 : '',
				typeof body.stat3 === 'string' ? body.stat3 : '',
				quantity,
				rarity,
				price,
				currency,
				sortOrder,
				isActive,
			],
		);

		return NextResponse.json({ ok: true, row: rows[0] });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (/duplicate key|unique/i.test(msg)) {
			return NextResponse.json({ ok: false, error: 'товар с таким item id уже есть' }, { status: 409 });
		}
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
