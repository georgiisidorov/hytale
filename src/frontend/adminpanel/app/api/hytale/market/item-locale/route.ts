import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/market-auth';
import { getItemLocale } from '@/lib/item-locale';
import { validateItemId } from '@/lib/market-item';

export async function GET(req: Request) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const itemId = new URL(req.url).searchParams.get('itemId')?.trim() ?? '';
		const idErr = validateItemId(itemId);
		if (idErr) return NextResponse.json({ ok: false, error: idErr }, { status: 400 });

		const locale = await getItemLocale(itemId);
		return NextResponse.json({
			ok: true,
			itemId,
			name: locale?.name ?? null,
			description: locale?.description ?? null,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
