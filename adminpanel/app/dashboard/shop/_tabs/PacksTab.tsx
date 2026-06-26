'use client';
import React from 'react';

type PackRow = { id: number; pack_id: string; pack_name: string; item_id: string; quantity: number; sort_order: number };
type PackGroup = { packId: string; packName: string; items: PackRow[] };

const inp: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.2)', color: 'inherit', fontSize: 13, boxSizing: 'border-box' };

function groupRows(rows: PackRow[]): PackGroup[] {
	const map = new Map<string, PackGroup>();
	for (const r of rows) {
		if (!map.has(r.pack_id)) map.set(r.pack_id, { packId: r.pack_id, packName: r.pack_name, items: [] });
		map.get(r.pack_id)!.items.push(r);
	}
	return Array.from(map.values());
}

export function PacksTab() {
	const [groups, setGroups] = React.useState<PackGroup[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [msg, setMsg] = React.useState<{ text: string; ok: boolean } | null>(null);

	const [selPackId, setSelPackId] = React.useState('');
	const [newPackId, setNewPackId] = React.useState('');
	const [newPackName, setNewPackName] = React.useState('');
	const [newItemId, setNewItemId] = React.useState('');
	const [newQty, setNewQty] = React.useState('1');
	const [newSort, setNewSort] = React.useState('0');

	const [editId, setEditId] = React.useState<number | null>(null);
	const [editItem, setEditItem] = React.useState('');
	const [editQty, setEditQty] = React.useState('');
	const [editSort, setEditSort] = React.useState('');

	const flash = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); };

	const load = React.useCallback(async () => {
		setLoading(true);
		try {
			const r = await fetch('/api/hytale/market/packs', { credentials: 'include' });
			const j = await r.json() as { ok: boolean; rows?: PackRow[]; error?: string };
			if (!j.ok) throw new Error(j.error);
			setGroups(groupRows(j.rows ?? []));
		} catch (e) { flash(e instanceof Error ? e.message : String(e), false); }
		finally { setLoading(false); }
	}, []);

	React.useEffect(() => { void load(); }, [load]);

	async function addItem() {
		const packId   = selPackId || newPackId.trim();
		const packName = groups.find(g => g.packId === packId)?.packName || newPackName.trim() || packId;
		if (!packId || !newItemId.trim()) { flash('Заполни Pack ID и Item ID', false); return; }
		setLoading(true);
		try {
			const r = await fetch('/api/hytale/market/packs', {
				method: 'POST', credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ packId, packName, itemId: newItemId.trim(), quantity: Number(newQty) || 1, sortOrder: Number(newSort) || 0 }),
			});
			const j = await r.json() as { ok: boolean; error?: string };
			if (!j.ok) throw new Error(j.error);
			flash('Предмет добавлен');
			setNewItemId(''); setNewQty('1'); setNewSort('0');
			void load();
		} catch (e) { flash(e instanceof Error ? e.message : String(e), false); }
		finally { setLoading(false); }
	}

	async function renameGroup(packId: string, current: string) {
		const name = prompt('Новое название пака:', current);
		if (!name || name.trim() === current) return;
		const firstId = groups.find(g => g.packId === packId)?.items[0]?.id;
		if (!firstId) return;
		setLoading(true);
		try {
			const r = await fetch(`/api/hytale/market/packs/${firstId}`, {
				method: 'PATCH', credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ packName: name.trim() }),
			});
			const j = await r.json() as { ok: boolean; error?: string };
			if (!j.ok) throw new Error(j.error);
			flash('Переименовано'); void load();
		} catch (e) { flash(e instanceof Error ? e.message : String(e), false); }
		finally { setLoading(false); }
	}

	async function saveEdit(id: number) {
		setLoading(true);
		try {
			const r = await fetch(`/api/hytale/market/packs/${id}`, {
				method: 'PATCH', credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					itemId: editItem.trim() || undefined,
					quantity: editQty !== '' ? Number(editQty) : undefined,
					sortOrder: editSort !== '' ? Number(editSort) : undefined,
				}),
			});
			const j = await r.json() as { ok: boolean; error?: string };
			if (!j.ok) throw new Error(j.error);
			flash('Сохранено'); setEditId(null); void load();
		} catch (e) { flash(e instanceof Error ? e.message : String(e), false); }
		finally { setLoading(false); }
	}

	async function del(id: number) {
		if (!confirm('Удалить предмет из пака?')) return;
		setLoading(true);
		try {
			const r = await fetch(`/api/hytale/market/packs/${id}`, { method: 'DELETE', credentials: 'include' });
			const j = await r.json() as { ok: boolean; error?: string };
			if (!j.ok) throw new Error(j.error);
			flash('Удалено'); void load();
		} catch (e) { flash(e instanceof Error ? e.message : String(e), false); }
		finally { setLoading(false); }
	}

	return (
		<>
			{msg && <div style={{ padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: msg.ok ? 'rgba(50,160,80,0.15)' : 'rgba(200,50,50,0.15)', color: msg.ok ? '#6e6' : '#f88', border: `1px solid ${msg.ok ? '#3a5' : '#c23'}` }}>{msg.text}</div>}

			{/* Форма добавления */}
			<div className="dashboard-card" style={{ marginBottom: 16 }}>
				<h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Добавить предмет в пак</h3>
				<div className="market-form-grid">
					<label>
						<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Пак</div>
						<select style={inp} value={selPackId} onChange={e => setSelPackId(e.target.value)}>
							<option value="">— новый пак —</option>
							{groups.map(g => <option key={g.packId} value={g.packId}>{g.packName} ({g.packId})</option>)}
						</select>
					</label>
					{!selPackId && <>
						<label>
							<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Pack ID</div>
							<input style={inp} value={newPackId} onChange={e => setNewPackId(e.target.value)} placeholder="pack_my_pack" />
						</label>
						<label>
							<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Название</div>
							<input style={inp} value={newPackName} onChange={e => setNewPackName(e.target.value)} placeholder="My Loot Pack" />
						</label>
					</>}
					<label>
						<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Item ID</div>
						<input style={inp} value={newItemId} onChange={e => setNewItemId(e.target.value)} placeholder="Weapon_Sword_Iron" />
					</label>
					<label>
						<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Количество</div>
						<input style={inp} type="number" min={1} value={newQty} onChange={e => setNewQty(e.target.value)} />
					</label>
					<label>
						<div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Сортировка</div>
						<input style={inp} type="number" value={newSort} onChange={e => setNewSort(e.target.value)} />
					</label>
				</div>
				<div style={{ marginTop: 12 }}>
					<button type="button" className="gm-btn gm-btn--primary" onClick={() => void addItem()} disabled={loading}>Добавить предмет</button>
				</div>
			</div>

			{/* Группы паков */}
			{loading && !groups.length ? <div style={{ opacity: 0.5, fontSize: 13 }}>Загрузка…</div> :
				groups.length === 0 ? <div style={{ opacity: 0.5, fontSize: 13 }}>Паков нет</div> :
				groups.map(g => (
					<div key={g.packId} className="dashboard-card" style={{ marginBottom: 14 }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
							<span style={{ fontWeight: 700, fontSize: 15 }}>{g.packName}</span>
							<span style={{ fontSize: 11, opacity: 0.45, fontFamily: 'monospace' }}>{g.packId}</span>
							<button type="button" className="gm-btn" style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 10px' }} onClick={() => renameGroup(g.packId, g.packName)}>Переименовать</button>
						</div>
						<div className="market-catalog-wrap">
							<table className="market-catalog-table" style={{ width: '100%' }}>
								<thead><tr><th style={{ width: 60 }}>Сорт.</th><th>Item ID</th><th style={{ width: 90 }}>Кол-во</th><th style={{ width: 160 }}>Действия</th></tr></thead>
								<tbody>
									{g.items.map(row => editId === row.id ? (
										<tr key={row.id}>
											<td><input style={{ ...inp, width: 64 }} type="number" value={editSort} onChange={e => setEditSort(e.target.value)} /></td>
											<td><input style={inp} value={editItem} onChange={e => setEditItem(e.target.value)} /></td>
											<td><input style={{ ...inp, width: 80 }} type="number" min={1} value={editQty} onChange={e => setEditQty(e.target.value)} /></td>
											<td style={{ whiteSpace: 'nowrap' }}>
												<button type="button" className="gm-btn gm-btn--primary" style={{ marginRight: 6, fontSize: 12 }} onClick={() => void saveEdit(row.id)} disabled={loading}>Сохранить</button>
												<button type="button" className="gm-btn" style={{ fontSize: 12 }} onClick={() => setEditId(null)}>Отмена</button>
											</td>
										</tr>
									) : (
										<tr key={row.id}>
											<td style={{ textAlign: 'center', opacity: 0.4, fontSize: 12 }}>{row.sort_order}</td>
											<td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.item_id}</td>
											<td style={{ textAlign: 'center' }}>{row.quantity}</td>
											<td style={{ whiteSpace: 'nowrap' }}>
												<button type="button" className="gm-btn" style={{ marginRight: 6, fontSize: 12 }} onClick={() => { setEditId(row.id); setEditItem(row.item_id); setEditQty(String(row.quantity)); setEditSort(String(row.sort_order)); }}>Изменить</button>
												<button type="button" className="gm-btn" style={{ fontSize: 12, borderColor: 'rgba(200,50,50,0.5)' }} onClick={() => void del(row.id)} disabled={loading}>Удалить</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				))
			}
		</>
	);
}
