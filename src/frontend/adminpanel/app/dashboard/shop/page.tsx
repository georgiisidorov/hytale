'use client';

import React from 'react';
import { PacksTab } from './_tabs/PacksTab';
import { VouchersTab } from './_tabs/VouchersTab';
import { KitsTab } from './_tabs/KitsTab';
import {
	CURRENCIES,
	RARITIES,
	SHOP_TAB_CATEGORIES,
	deriveDisplayName,
	deriveUiCategory,
	categoryLabel,
	currencyLabel,
	itemIconUrl,
	rarityLabel,
	type Currency,
	type Rarity,
	type ShopTabCategory,
} from '@/lib/market-item';

type ShopRow = {
	id: number;
	item_id: string;
	category: string;
	ui_category: string;
	display_name: string;
	description: string;
	stat1: string;
	stat2: string;
	stat3: string;
	quantity: number;
	rarity: string;
	price: number;
	currency: string;
	sort_order: number;
	is_active: boolean;
};

type WheelRow = {
	id: number;
	slot_index: number;
	item_id: string;
	display_name: string;
	weight: number;
	qty_min: number;
	qty_max: number;
	rarity: string;
	is_active: boolean;
};

const SHOP_TAB_LABELS: Record<ShopTabCategory, string> = Object.fromEntries(
	SHOP_TAB_CATEGORIES.map((c) => [c, categoryLabel(c)]),
) as Record<ShopTabCategory, string>;

function ItemPreview({ itemId }: { itemId: string }) {
	const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
	const [failed, setFailed] = React.useState(false);

	React.useEffect(() => {
		const id = itemId.trim();
		if (!id) {
			setBlobUrl(null);
			setFailed(false);
			return;
		}
		let revoked: string | null = null;
		setFailed(false);
		setBlobUrl(null);
		const ac = new AbortController();
		void (async () => {
			try {
				const r = await fetch(itemIconUrl(id), { credentials: 'include', signal: ac.signal });
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				const blob = await r.blob();
				if (!blob.size) throw new Error('empty');
				const url = URL.createObjectURL(blob);
				revoked = url;
				setBlobUrl(url);
			} catch {
				if (!ac.signal.aborted) setFailed(true);
			}
		})();
		return () => {
			ac.abort();
			if (revoked) URL.revokeObjectURL(revoked);
		};
	}, [itemId]);

	if (!itemId.trim() || failed || !blobUrl) {
		return (
			<div
				style={{
					width: 56,
					height: 56,
					borderRadius: 8,
					background: 'rgba(255,255,255,0.06)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: 10,
					opacity: 0.5,
				}}
			>
				?
			</div>
		);
	}
	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={blobUrl}
			alt={itemId}
			width={56}
			height={56}
			style={{ imageRendering: 'pixelated', borderRadius: 8, background: 'rgba(0,0,0,0.25)' }}
		/>
	);
}

export default function ShopPage() {
	const [tab, setTab] = React.useState<'shop' | 'wheel' | 'packs' | 'vouchers' | 'kits'>('shop');
	const [shopRows, setShopRows] = React.useState<ShopRow[]>([]);
	const [wheelRows, setWheelRows] = React.useState<WheelRow[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [filterUi, setFilterUi] = React.useState<'' | ShopTabCategory>('');

	// форма магазина
	const [shopItemId, setShopItemId] = React.useState('');
	const [shopDisplayName, setShopDisplayName] = React.useState('');
	const [shopUiCategory, setShopUiCategory] = React.useState<ShopTabCategory>('Weapon');
	const [shopQty, setShopQty] = React.useState('1');
	const [shopRarity, setShopRarity] = React.useState<Rarity>('Common');
	const [shopPrice, setShopPrice] = React.useState('100');
	const [shopCurrency, setShopCurrency] = React.useState<Currency>('coins');
	const [shopDesc, setShopDesc] = React.useState('');
	const [shopSort, setShopSort] = React.useState('0');

	// форма рулетки
	const [wheelSlot, setWheelSlot] = React.useState('0');
	const [wheelItemId, setWheelItemId] = React.useState('');
	const [wheelWeight, setWheelWeight] = React.useState('100');
	const [wheelQtyMin, setWheelQtyMin] = React.useState('1');
	const [wheelQtyMax, setWheelQtyMax] = React.useState('1');
	const [wheelRarity, setWheelRarity] = React.useState<Rarity>('Common');

	const derivedName = shopItemId.trim() ? deriveDisplayName(shopItemId) : '';

	React.useEffect(() => {
		const id = shopItemId.trim();
		if (!id) return;
		setShopUiCategory(deriveUiCategory(id));
		const ac = new AbortController();
		const t = window.setTimeout(() => {
			void (async () => {
				try {
					const u = new URL('/api/hytale/market/item-locale', window.location.origin);
					u.searchParams.set('itemId', id);
					const r = await fetch(u, { credentials: 'include', signal: ac.signal });
					if (!r.ok) {
						setShopDisplayName((prev) => prev.trim() || deriveDisplayName(id));
						return;
					}
					const j = (await r.json()) as { name?: string | null; description?: string | null };
					if (j.name) setShopDisplayName(j.name);
					else setShopDisplayName((prev) => prev.trim() || deriveDisplayName(id));
					if (j.description) setShopDesc(j.description);
				} catch {
					if (!ac.signal.aborted) {
						setShopDisplayName((prev) => prev.trim() || deriveDisplayName(id));
					}
				}
			})();
		}, 350);
		return () => {
			ac.abort();
			window.clearTimeout(t);
		};
	}, [shopItemId]);

	const load = React.useCallback(async () => {
		setError(null);
		setLoading(true);
		try {
			const shopU = new URL('/api/hytale/market/shop-items', window.location.origin);
			shopU.searchParams.set('all', '1');
			if (filterUi) shopU.searchParams.set('uiCategory', filterUi);

			const fetchOpts: RequestInit = { cache: 'no-store', credentials: 'include' };
			const [shopR, wheelR] = await Promise.all([
				fetch(shopU.toString(), fetchOpts),
				fetch('/api/hytale/market/wheel-items?all=1', fetchOpts),
			]);

			const shopJ = (await shopR.json()) as { ok: boolean; rows?: ShopRow[]; error?: string };
			const wheelJ = (await wheelR.json()) as { ok: boolean; rows?: WheelRow[]; error?: string };
			if (!shopR.ok || !shopJ.ok) throw new Error(shopJ.error || `shop HTTP ${shopR.status}`);
			if (!wheelR.ok || !wheelJ.ok) throw new Error(wheelJ.error || `wheel HTTP ${wheelR.status}`);

			setShopRows(Array.isArray(shopJ.rows) ? shopJ.rows : []);
			setWheelRows(Array.isArray(wheelJ.rows) ? wheelJ.rows : []);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, [filterUi]);

	React.useEffect(() => {
		void load();
	}, [load]);

	const activeWheel = wheelRows.filter((r) => r.is_active).length;
	const totalWheelWeight = wheelRows
		.filter((r) => r.is_active)
		.reduce((s, r) => s + r.weight, 0);

	async function createShopItem() {
		setError(null);
		setLoading(true);
		try {
			const r = await fetch('/api/hytale/market/shop-items', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					itemId: shopItemId.trim(),
					displayName: shopDisplayName.trim() || deriveDisplayName(shopItemId),
					uiCategory: shopUiCategory,
					description: shopDesc,
					quantity: Number(shopQty),
					rarity: shopRarity,
					price: Number(shopPrice),
					currency: shopCurrency,
					sortOrder: Number(shopSort),
				}),
			});
			const j = (await r.json()) as { ok: boolean; error?: string };
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			setShopItemId('');
			setShopDisplayName('');
			setShopDesc('');
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}

	async function createWheelSlot() {
		setError(null);
		setLoading(true);
		try {
			const r = await fetch('/api/hytale/market/wheel-items', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					slotIndex: Number(wheelSlot),
					itemId: wheelItemId.trim(),
					weight: Number(wheelWeight),
					qtyMin: Number(wheelQtyMin),
					qtyMax: Number(wheelQtyMax),
					rarity: wheelRarity,
				}),
			});
			const j = (await r.json()) as { ok: boolean; error?: string };
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			setWheelItemId('');
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}

	async function patchShop(id: number, patch: Record<string, unknown>) {
		setError(null);
		try {
			const r = await fetch(`/api/hytale/market/shop-items/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(patch),
			});
			const j = (await r.json()) as { ok: boolean; error?: string };
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}

	async function patchWheel(id: number, patch: Record<string, unknown>) {
		setError(null);
		try {
			const r = await fetch(`/api/hytale/market/wheel-items/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(patch),
			});
			const j = (await r.json()) as { ok: boolean; error?: string };
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}

	async function deleteShop(id: number) {
		if (!confirm('Удалить товар из каталога?')) return;
		setError(null);
		try {
			const r = await fetch(`/api/hytale/market/shop-items/${id}`, { method: 'DELETE' });
			const j = (await r.json()) as { ok: boolean; error?: string };
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}

	async function deleteWheel(id: number) {
		if (!confirm('Удалить сектор рулетки?')) return;
		setError(null);
		try {
			const r = await fetch(`/api/hytale/market/wheel-items/${id}`, { method: 'DELETE' });
			const j = (await r.json()) as { ok: boolean; error?: string };
			if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}

	const inputStyle: React.CSSProperties = {
		width: '100%',
		padding: '8px 10px',
		borderRadius: 8,
		border: '1px solid rgba(255,255,255,0.12)',
		background: 'rgba(0,0,0,0.2)',
		color: 'inherit',
	};

	return (
		<div className="dashboard-page">
			<div className="dashboard-card" style={{ marginBottom: 12 }}>
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
					<button
						type="button"
						className={tab === 'shop' ? 'gm-btn gm-btn--primary' : 'gm-btn'}
						onClick={() => setTab('shop')}
					>
						Магазин
					</button>
					<button
						type="button"
						className={tab === 'wheel' ? 'gm-btn gm-btn--primary' : 'gm-btn'}
						onClick={() => setTab('wheel')}
					>
						Рулетка ({activeWheel}/12)
					</button>
					<button
						type="button"
						className={tab === 'packs' ? 'gm-btn gm-btn--primary' : 'gm-btn'}
						onClick={() => setTab('packs')}
					>
						Лут-паки
					</button>
					<button
						type="button"
						className={tab === 'vouchers' ? 'gm-btn gm-btn--primary' : 'gm-btn'}
						onClick={() => setTab('vouchers')}
					>
						Ваучеры
					</button>
					<button
						type="button"
						className={tab === 'kits' ? 'gm-btn gm-btn--primary' : 'gm-btn'}
						onClick={() => setTab('kits')}
					>
						Кит-паки
					</button>
					<button type="button" className="gm-btn" onClick={() => void load()} disabled={loading}>
						Обновить
					</button>
				</div>
				{error ? (
					<div style={{ marginTop: 8, color: '#ff8a8a' }}>{error}</div>
				) : null}
			</div>

			{tab === 'shop' ? (
				<>
					<div className="dashboard-card" style={{ marginBottom: 12 }}>
						<h3 style={{ margin: '0 0 12px' }}>Новый товар</h3>
						<div className="market-form-grid">
							<label>
								<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Идентификатор предмета</div>
								<input style={inputStyle} value={shopItemId} onChange={(e) => setShopItemId(e.target.value)} placeholder="Weapon_Shortbow_Doomed" />
							</label>
							<label>
								<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Название предмета</div>
								<input style={inputStyle} value={shopDisplayName} onChange={(e) => setShopDisplayName(e.target.value)} placeholder={derivedName || '…'} />
							</label>
							<label>
								<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Категория в магазине</div>
								<select style={inputStyle} value={shopUiCategory} onChange={(e) => setShopUiCategory(e.target.value as ShopTabCategory)}>
									{SHOP_TAB_CATEGORIES.map((c) => (
										<option key={c} value={c}>
											{SHOP_TAB_LABELS[c]}
										</option>
									))}
								</select>
							</label>
							<label>
								<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Количество выдачи</div>
								<input style={inputStyle} value={shopQty} onChange={(e) => setShopQty(e.target.value)} />
							</label>
							<label>
								<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Редкость</div>
								<select style={inputStyle} value={shopRarity} onChange={(e) => setShopRarity(e.target.value as Rarity)}>
									{RARITIES.map((r) => (
										<option key={r} value={r}>
											{rarityLabel(r)}
										</option>
									))}
								</select>
							</label>
							<label>
								<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Цена</div>
								<input style={inputStyle} value={shopPrice} onChange={(e) => setShopPrice(e.target.value)} />
							</label>
							<label>
								<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Валюта</div>
								<select style={inputStyle} value={shopCurrency} onChange={(e) => setShopCurrency(e.target.value as Currency)}>
									{CURRENCIES.map((c) => (
										<option key={c} value={c}>
											{currencyLabel(c)}
										</option>
									))}
								</select>
							</label>
							<label>
								<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Порядок сортировки</div>
								<input style={inputStyle} value={shopSort} onChange={(e) => setShopSort(e.target.value)} />
							</label>
						</div>
						<label className="market-form-desc" style={{ display: 'block', marginTop: 4 }}>
							<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Описание</div>
							<textarea style={{ ...inputStyle, minHeight: 60 }} value={shopDesc} onChange={(e) => setShopDesc(e.target.value)} />
						</label>
						<div className="market-form-actions" style={{ marginTop: 12 }}>
							<ItemPreview itemId={shopItemId} />
							<button type="button" className="gm-btn gm-btn--primary" disabled={loading || !shopItemId.trim()} onClick={() => void createShopItem()}>
								Добавить
							</button>
						</div>
					</div>

					<div className="dashboard-card">
						<div className="market-category-filters">
							<button type="button" className={!filterUi ? 'gm-btn gm-btn--primary' : 'gm-btn'} onClick={() => setFilterUi('')}>
								Все
							</button>
							{SHOP_TAB_CATEGORIES.map((c) => (
								<button
									key={c}
									type="button"
									className={filterUi === c ? 'gm-btn gm-btn--primary' : 'gm-btn'}
									onClick={() => setFilterUi(c)}
								>
									{SHOP_TAB_LABELS[c]}
								</button>
							))}
						</div>
						<div className="market-catalog-wrap">
							<table className="market-catalog-table">
								<thead>
									<tr>
										<th>Иконка</th>
										<th>Идентификатор предмета</th>
										<th>Название предмета</th>
										<th>Категория</th>
										<th>Количество</th>
										<th>Редкость</th>
										<th>Цена</th>
										<th>Валюта</th>
										<th>Активен</th>
										<th>Действия</th>
									</tr>
								</thead>
								<tbody>
									{loading && !shopRows.length ? (
										<tr>
											<td colSpan={10} style={{ opacity: 0.65, padding: 16 }}>
												Загрузка каталога…
											</td>
										</tr>
									) : null}
									{shopRows.map((row) => (
										<tr key={row.id} style={{ opacity: row.is_active ? 1 : 0.45 }}>
											<td>
												<ItemPreview itemId={row.item_id} />
											</td>
											<td className="market-cell-id">{row.item_id}</td>
											<td className="market-cell-name">{row.display_name}</td>
											<td>{categoryLabel(row.ui_category)}</td>
											<td>{row.quantity}</td>
											<td>{rarityLabel(row.rarity)}</td>
											<td>{row.price.toLocaleString('ru-RU')}</td>
											<td>{currencyLabel(row.currency)}</td>
											<td>{row.is_active ? 'Да' : 'Нет'}</td>
											<td className="market-cell-actions">
												<button type="button" className="gm-btn" onClick={() => void patchShop(row.id, { isActive: !row.is_active })}>
													{row.is_active ? 'Выключить' : 'Включить'}
												</button>
												<button type="button" className="gm-btn" onClick={() => void deleteShop(row.id)}>
													Удалить
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
							{!shopRows.length && !loading ? <div style={{ opacity: 0.6, padding: 12 }}>Нет товаров</div> : null}
						</div>
					</div>
				</>
			) : tab === 'wheel' ? (
				<>
					<div className="dashboard-card" style={{ marginBottom: 12 }}>
						<h3 style={{ margin: '0 0 8px' }}>Новый сектор (макс. 12 активных)</h3>
						<p style={{ fontSize: 12, opacity: 0.75, margin: '0 0 12px' }}>
							Сумма весов активных: {totalWheelWeight}. Вероятность слота ≈ weight / сумма.
						</p>
						<div className="market-form-grid">
							<label>
								<div style={{ fontSize: 12, opacity: 0.7 }}>Номер слота (0–11)</div>
								<input style={inputStyle} value={wheelSlot} onChange={(e) => setWheelSlot(e.target.value)} />
							</label>
							<label>
								<div style={{ fontSize: 12, opacity: 0.7 }}>Идентификатор предмета</div>
								<input style={inputStyle} value={wheelItemId} onChange={(e) => setWheelItemId(e.target.value)} />
							</label>
							<label>
								<div style={{ fontSize: 12, opacity: 0.7 }}>Вес (вероятность)</div>
								<input style={inputStyle} value={wheelWeight} onChange={(e) => setWheelWeight(e.target.value)} />
							</label>
							<label>
								<div style={{ fontSize: 12, opacity: 0.7 }}>Количество (минимум)</div>
								<input style={inputStyle} value={wheelQtyMin} onChange={(e) => setWheelQtyMin(e.target.value)} />
							</label>
							<label>
								<div style={{ fontSize: 12, opacity: 0.7 }}>Количество (максимум)</div>
								<input style={inputStyle} value={wheelQtyMax} onChange={(e) => setWheelQtyMax(e.target.value)} />
							</label>
							<label>
								<div style={{ fontSize: 12, opacity: 0.7 }}>Редкость</div>
								<select style={inputStyle} value={wheelRarity} onChange={(e) => setWheelRarity(e.target.value as Rarity)}>
									{RARITIES.map((r) => (
										<option key={r} value={r}>
											{rarityLabel(r)}
										</option>
									))}
								</select>
							</label>
						</div>
						<div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
							<ItemPreview itemId={wheelItemId} />
							<button
								type="button"
								className="gm-btn gm-btn--primary"
								disabled={loading || !wheelItemId.trim() || activeWheel >= 12}
								onClick={() => void createWheelSlot()}
							>
								Добавить сектор
							</button>
						</div>
					</div>

					<div className="dashboard-card">
						<div className="market-catalog-wrap">
							<table className="market-catalog-table">
								<thead>
									<tr>
										<th className="market-cell-slot">Номер слота</th>
										<th>Иконка</th>
										<th>Идентификатор предмета</th>
										<th>Название предмета</th>
										<th>Вес</th>
										<th>Вероятность</th>
										<th>Количество</th>
										<th>Редкость</th>
										<th>Активен</th>
										<th>Действия</th>
									</tr>
								</thead>
								<tbody>
									{wheelRows.map((row) => {
										const pct = totalWheelWeight > 0 && row.is_active ? ((100 * row.weight) / totalWheelWeight).toFixed(1) : '—';
										const qtyLabel =
											row.qty_min === row.qty_max ? String(row.qty_min) : `${row.qty_min}–${row.qty_max}`;
										return (
											<tr key={row.id} style={{ opacity: row.is_active ? 1 : 0.45 }}>
												<td className="market-cell-slot">{row.slot_index + 1}</td>
												<td>
													<ItemPreview itemId={row.item_id} />
												</td>
												<td className="market-cell-id">{row.item_id}</td>
												<td className="market-cell-name">{row.display_name}</td>
												<td>{row.weight}</td>
												<td>{pct === '—' ? pct : `${pct}%`}</td>
												<td>{qtyLabel}</td>
												<td>{rarityLabel(row.rarity)}</td>
												<td>{row.is_active ? 'Да' : 'Нет'}</td>
												<td className="market-cell-actions">
													<button type="button" className="gm-btn" onClick={() => void patchWheel(row.id, { isActive: !row.is_active })}>
														{row.is_active ? 'Выключить' : 'Включить'}
													</button>
													<button type="button" className="gm-btn" onClick={() => void deleteWheel(row.id)}>
														Удалить
													</button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
						{!wheelRows.length && !loading ? <div style={{ opacity: 0.6, padding: 12 }}>Нет секторов</div> : null}
					</div>
				</>
			) : tab === 'packs' ? (
				<PacksTab />
			) : tab === 'vouchers' ? (
				<VouchersTab />
			) : tab === 'kits' ? (
				<KitsTab />
			) : null}
		</div>
	);
}
