import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdmin } from '@/lib/market-auth';
import {
	CURRENCIES,
	RARITIES,
	SHOP_TAB_CATEGORIES,
	deriveCategory,
	deriveUiCategory,
	validateItemId,
	type Currency,
	type Rarity,
} from '@/lib/market-item';
import { withShopLocale } from '@/lib/item-locale';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const { id } = await ctx.params;
		const rowId = Number(id);
		if (!Number.isFinite(rowId) || rowId <= 0) {
			return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 });
		}

		const body = (await req.json()) as Record<string, unknown>;
		const set: string[] = ['updated_at = now()'];
		const args: unknown[] = [];
		let i = 1;

		if (typeof body.itemId === 'string') {
			const itemId = body.itemId.trim();
			const err = validateItemId(itemId);
			if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 });
			set.push(`item_id = $${i++}`);
			args.push(itemId);
			set.push(`category = $${i++}`);
			args.push(deriveCategory(itemId));
			if (body.uiCategory === undefined) {
				set.push(`ui_category = $${i++}`);
				args.push(deriveUiCategory(itemId));
			}
		}

		if (typeof body.uiCategory === 'string') {
			const ui = body.uiCategory.trim();
			if (!SHOP_TAB_CATEGORIES.includes(ui as (typeof SHOP_TAB_CATEGORIES)[number])) {
				return NextResponse.json({ ok: false, error: 'неверная категория магазина' }, { status: 400 });
			}
			set.push(`ui_category = $${i++}`);
			args.push(ui);
		}

		if (typeof body.displayName === 'string') {
			set.push(`display_name = $${i++}`);
			args.push(body.displayName.trim());
		}
		if (typeof body.description === 'string') {
			set.push(`description = $${i++}`);
			args.push(body.description);
		}
		for (const key of ['stat1', 'stat2', 'stat3'] as const) {
			if (typeof body[key] === 'string') {
				set.push(`${key} = $${i++}`);
				args.push(body[key]);
			}
		}
		if (body.quantity != null) {
			const q = Math.max(1, Math.min(Number(body.quantity) || 1, 1_000_000));
			set.push(`quantity = $${i++}`);
			args.push(q);
		}
		if (typeof body.rarity === 'string') {
			if (!RARITIES.includes(body.rarity.trim() as Rarity)) {
				return NextResponse.json({ ok: false, error: 'неверная редкость' }, { status: 400 });
			}
			set.push(`rarity = $${i++}`);
			args.push(body.rarity.trim());
		}
		if (body.price != null) {
			set.push(`price = $${i++}`);
			args.push(Math.max(0, Math.min(Number(body.price) || 0, 2_000_000_000)));
		}
		if (typeof body.currency === 'string') {
			const c = body.currency.trim();
			if (!CURRENCIES.includes(c as Currency)) {
				return NextResponse.json({ ok: false, error: 'currency: coins или crystals' }, { status: 400 });
			}
			set.push(`currency = $${i++}`);
			args.push(c);
		}
		if (body.sortOrder != null) {
			set.push(`sort_order = $${i++}`);
			args.push(Number(body.sortOrder) || 0);
		}
		if (typeof body.isActive === 'boolean') {
			set.push(`is_active = $${i++}`);
			args.push(body.isActive);
		}

		if (set.length <= 1) {
			return NextResponse.json({ ok: false, error: 'nothing to update' }, { status: 400 });
		}

		args.push(rowId);
		const pool = getPool();
		const { rows } = await pool.query(
			`UPDATE hytale_market_shop_items SET ${set.join(', ')} WHERE id = $${i}
			RETURNING
				id, item_id, category, ui_category, display_name, description,
				stat1, stat2, stat3, quantity, rarity, price, currency,
				sort_order, is_active, created_at, updated_at`,
			args,
		);

		if (!rows[0]) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
		return NextResponse.json({ ok: true, row: await withShopLocale(rows[0]) });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (/duplicate key|unique/i.test(msg)) {
			return NextResponse.json({ ok: false, error: 'item id уже занят' }, { status: 409 });
		}
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const { id } = await ctx.params;
		const rowId = Number(id);
		if (!Number.isFinite(rowId) || rowId <= 0) {
			return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 });
		}

		const pool = getPool();
		const { rowCount } = await pool.query(`DELETE FROM hytale_market_shop_items WHERE id = $1`, [rowId]);
		if (!rowCount) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
		return NextResponse.json({ ok: true });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
