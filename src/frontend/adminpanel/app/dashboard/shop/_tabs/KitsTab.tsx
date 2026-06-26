'use client';
import React from 'react';

type CurrencyPack = {
	id: number;
	pack_id: string;
	pack_name: string;
	pack_type: 'coins' | 'crystals';
	price_rub: number;
	amount: number;
	is_active: boolean;
	sort_order: number;
};

const inp: React.CSSProperties = {
	padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
	background: 'rgba(0,0,0,0.2)', color: 'inherit', fontSize: 13, width: '100%', boxSizing: 'border-box',
};

function formatAmount(type: 'coins' | 'crystals', amount: number) {
	const label = type === 'coins' ? 'монет' : 'алмазов';
	return `${amount.toLocaleString('ru-RU')} ${label}`;
}

export function KitsTab() {
	const [rows, setRows] = React.useState<CurrencyPack[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [msg, setMsg] = React.useState<{ text: string; ok: boolean } | null>(null);
	type EditState = { pack_name: string; price_rub: number; amount: number };
	const [editing, setEditing] = React.useState<Record<number, EditState>>({});

	const flash = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); };

	const load = React.useCallback(async () => {
		setLoading(true);
		try {
			const r = await fetch('/api/hytale/market/currency-packs', { credentials: 'include' });
			const j = await r.json() as { ok: boolean; rows?: CurrencyPack[]; error?: string };
			if (!j.ok) throw new Error(j.error);
			setRows(j.rows ?? []);
		} catch (e) { flash(e instanceof Error ? e.message : String(e), false); }
		finally { setLoading(false); }
	}, []);

	React.useEffect(() => { void load(); }, [load]);

	function startEdit(row: CurrencyPack) {
		setEditing(prev => ({ ...prev, [row.id]: { pack_name: row.pack_name, price_rub: row.price_rub, amount: row.amount } }));
	}

	function cancelEdit(id: number) {
		setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
	}

	async function saveEdit(row: CurrencyPack) {
		const patch = editing[row.id];
		if (!patch) return;
		setLoading(true);
		try {
			const r = await fetch(`/api/hytale/market/currency-packs/${row.id}`, {
				method: 'PATCH', credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ packName: patch.pack_name, priceRub: patch.price_rub, amount: patch.amount }),
			});
			const j = await r.json() as { ok: boolean; error?: string };
			if (!j.ok) throw new Error(j.error);
			flash('Сохранено');
			cancelEdit(row.id);
			void load();
		} catch (e) { flash(e instanceof Error ? e.message : String(e), false); }
		finally { setLoading(false); }
	}

	async function toggleActive(row: CurrencyPack) {
		setLoading(true);
		try {
			const r = await fetch(`/api/hytale/market/currency-packs/${row.id}`, {
				method: 'PATCH', credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !row.is_active }),
			});
			const j = await r.json() as { ok: boolean; error?: string };
			if (!j.ok) throw new Error(j.error);
			void load();
		} catch (e) { flash(e instanceof Error ? e.message : String(e), false); }
		finally { setLoading(false); }
	}

	const coins    = rows.filter(r => r.pack_type === 'coins');
	const crystals = rows.filter(r => r.pack_type === 'crystals');

	function renderSection(title: string, icon: string, packs: CurrencyPack[]) {
		return (
			<div className="dashboard-card" style={{ marginBottom: 16 }}>
				<h3 style={{ margin: '0 0 12px', fontSize: 15 }}>{icon} {title}</h3>
				<div className="market-catalog-wrap">
					<table className="market-catalog-table" style={{ width: '100%' }}>
						<thead>
							<tr>
								<th>Название</th>
								<th style={{ width: 110 }}>Цена (руб.)</th>
								<th style={{ width: 140 }}>Количество</th>
								<th style={{ width: 80 }}>Активен</th>
								<th style={{ width: 200 }}>Действия</th>
							</tr>
						</thead>
						<tbody>
							{packs.map(row => {
								const ed = editing[row.id];
								return (
									<tr key={row.id} style={{ opacity: row.is_active ? 1 : 0.45 }}>
										<td>
											{ed ? (
												<input style={inp} value={ed.pack_name} onChange={e => setEditing(prev => ({ ...prev, [row.id]: { ...prev[row.id], pack_name: e.target.value } }))} />
											) : (
												<span style={{ fontWeight: 500 }}>{row.pack_name}</span>
											)}
											<div style={{ fontSize: 11, opacity: 0.4, fontFamily: 'monospace', marginTop: 2 }}>{row.pack_id}</div>
										</td>
										<td>
											{ed ? (
												<input style={inp} type="number" min={1} value={String(ed.price_rub)} onChange={e => setEditing(prev => ({ ...prev, [row.id]: { ...prev[row.id], price_rub: Number(e.target.value) } }))} />
											) : (
												<span>{row.price_rub.toLocaleString('ru-RU')} ₽</span>
											)}
										</td>
										<td>
											{ed ? (
												<input style={inp} type="number" min={1} value={String(ed.amount)} onChange={e => setEditing(prev => ({ ...prev, [row.id]: { ...prev[row.id], amount: Number(e.target.value) } }))} />
											) : (
												<span>{formatAmount(row.pack_type, row.amount)}</span>
											)}
										</td>
										<td style={{ textAlign: 'center' }}>
											<span style={{ color: row.is_active ? '#7fd695' : 'rgba(255,255,255,0.3)', fontSize: 13 }}>
												{row.is_active ? 'Да' : 'Нет'}
											</span>
										</td>
										<td style={{ whiteSpace: 'nowrap' }}>
											{ed ? (
												<>
													<button type="button" className="gm-btn gm-btn--primary" style={{ marginRight: 6, fontSize: 12 }} onClick={() => void saveEdit(row)} disabled={loading}>Сохранить</button>
													<button type="button" className="gm-btn" style={{ fontSize: 12 }} onClick={() => cancelEdit(row.id)}>Отмена</button>
												</>
											) : (
												<>
													<button type="button" className="gm-btn" style={{ marginRight: 6, fontSize: 12 }} onClick={() => startEdit(row)}>Изменить</button>
													<button type="button" className="gm-btn" style={{ fontSize: 12 }} onClick={() => void toggleActive(row)} disabled={loading}>
														{row.is_active ? 'Откл.' : 'Вкл.'}
													</button>
												</>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		);
	}

	return (
		<>
			{msg && <div style={{ padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: msg.ok ? 'rgba(50,160,80,0.15)' : 'rgba(200,50,50,0.15)', color: msg.ok ? '#6e6' : '#f88', border: `1px solid ${msg.ok ? '#3a5' : '#c23'}` }}>{msg.text}</div>}

			<div style={{ marginBottom: 14, fontSize: 13, opacity: 0.6 }}>
				Пачки валюты, продаваемые через YooKassa на вкладке «Паки». После изменения Java подтянет обновлённые данные из API.
			</div>

			{loading && !rows.length
				? <div style={{ opacity: 0.5 }}>Загрузка…</div>
				: <>
					{renderSection('Монеты', '🪙', coins)}
					{renderSection('Алмазы', '💎', crystals)}
				</>
			}
		</>
	);
}
