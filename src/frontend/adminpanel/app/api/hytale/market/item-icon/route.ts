import { NextResponse } from 'next/server';
import { loadItemIcon } from '@/lib/item-icon';
import { validateItemId } from '@/lib/market-item';
import { authorizeCatalogOrIcon } from '@/lib/market-auth';

export async function GET(req: Request) {
	try {
		if (!(await authorizeCatalogOrIcon(req))) {
			return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
		}

		const url = new URL(req.url);
		const itemId = (url.searchParams.get('itemId') ?? '').trim();
		const err = validateItemId(itemId);
		if (err) {
			return NextResponse.json({ ok: false, error: err }, { status: 400 });
		}

		const png = await loadItemIcon(itemId);
		if (!png?.length) {
			return NextResponse.json({ ok: false, error: 'icon not found' }, { status: 404 });
		}

		return new NextResponse(new Uint8Array(png), {
			status: 200,
			headers: {
				'content-type': 'image/png',
				'cache-control': 'public, max-age=3600',
			},
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
