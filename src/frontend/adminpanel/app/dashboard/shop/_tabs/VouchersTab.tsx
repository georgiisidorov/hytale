'use client';
import React from 'react';

type VoucherRow = {
	id: number;
	code: string;
	pack_id: string | null;
	payment_id: string | null;
	target_uuid: string | null;
	uses_count: number;
	is_active: boolean;
	ends_at: string | null;
	created_at: string;
	updated_at: string;
	redeemed_uuid: string | null;
};

const inp: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.2)', color: 'inherit', fontSize: 13 };

function fmt(iso: string | null) {
	if (!iso) return '—';
	return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function VouchersTab() {
	const [rows, setRows] = React.useState<VoucherRow[]>([]);
	const [q, setQ] = React.useState('');
	const [loading, setLoading] = React.useState(false);
	const [msg, setMsg] = React.useState<{ text: string; ok: boolean } | null>(null);
	const [copied, setCopied] = React.useState<string | null>(null);

	const flash = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); };

	const load = React.useCallback(async (search = q) => {
		setLoading(true);
		try {
			const u = new URL('/api/hytale/market/packs/vouchers', window.location.origin);
			if (search.trim()) u.searchParams.set('q', search.trim());
			const r = await fetch(u.toString(), { cache: 'no-store', credentials: 'include' });
			const j = await r.json() as { ok: boolean; rows?: VoucherRow[]; error?: string };
			if (!j.ok) throw new Error(j.error);
			setRows(j.rows ?? []);
		} catch (e) { flash(e instanceof Error ? e.message : String(e), false); }
		finally { setLoading(false); }
	}, [q]);

	React.useEffect(() => { void load(); }, [load]);

	async function toggleActive(row: VoucherRow) {
		try {
			const r = await fetch(`/api/hytale/market/packs/vouchers/${row.id}`, {
				method: 'PATCH', credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !row.is_active }),
			});
			const j = await r.json() as { ok: boolean; error?: string };
			if (!j.ok) throw new Error(j.error);
			flash(row.is_active ? 'Ваучер деактивирован' : 'Ваучер активирован');
			void load();
		} catch (e) { flash(e instanceof Error ? e.message : String(e), false); }
	}

	async function deleteRow(id: number) {
		if (!confirm('Удалить ваучер безвозвратно?')) return;
		try {
			const r = await fetch(`/api/hytale/market/packs/vouchers/${id}`, { method: 'DELETE', credentials: 'include' });
			const j = await r.json() as { ok: boolean; error?: string };
			if (!j.ok) throw new Error(j.error);
			flash('Ваучер удалён'); void load();
		} catch (e) { flash(e instanceof Error ? e.message : String(e), false); }
	}

	function copyCode(code: string) {
		void navigator.clipboard.writeText(code);
		setCopied(code);
		setTimeout(() => setCopied(null), 1500);
	}

	const used   = rows.filter(r => r.uses_count > 0).length;
	const active = rows.filter(r => r.is_active && r.uses_count === 0).length;

	return (
		<>
			{msg && <div style={{ padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13, background: msg.ok ? 'rgba(50,160,80,0.15)' : 'rgba(200,50,50,0.15)', color: msg.ok ? '#6e6' : '#f88', border: `1px solid ${msg.ok ? '#3a5' : '#c23'}` }}>{msg.text}</div>}

			{/* Поиск + статистика */}
			<div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
				<input
					style={{ ...inp, maxWidth: 320 }}
					placeholder="Поиск по коду, pack_id, payment_id…"
					value={q}
					onChange={e => setQ(e.target.value)}
					onKeyDown={e => e.key === 'Enter' && void load(q)}
				/>
				<button type="button" className="gm-btn" onClick={() => void load(q)} disabled={loading}>
					{loading ? 'Загрузка…' : 'Найти'}
				</button>
				<div style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.55, display: 'flex', gap: 16 }}>
					<span>Всего: <b style={{ color: '#fff' }}>{rows.length}</b></span>
					<span>Активных: <b style={{ color: '#7fd695' }}>{active}</b></span>
					<span>Погашено: <b style={{ color: '#f0a050' }}>{used}</b></span>
				</div>
			</div>

			<div className="dashboard-card" style={{ padding: 0, overflow: 'hidden' }}>
				<div className="market-catalog-wrap">
					<table className="market-catalog-table" style={{ width: '100%', minWidth: 860 }}>
						<thead>
							<tr>
								<th>Код</th>
								<th>Пак</th>
								<th>Payment ID</th>
								<th>UUID игрока</th>
								<th>Погашен</th>
								<th>Создан</th>
								<th>Статус</th>
								<th>Действия</th>
							</tr>
						</thead>
						<tbody>
							{rows.length === 0 ? (
								<tr>
									<td colSpan={8} style={{ textAlign: 'center', opacity: 0.4, padding: '24px 0' }}>
										{loading ? 'Загрузка…' : 'Ваучеров нет'}
									</td>
								</tr>
							) : rows.map(row => {
								const isUsed = row.uses_count > 0;
								return (
									<tr key={row.id} style={{ opacity: !row.is_active ? 0.45 : 1 }}>
										<td>
											<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
												<code style={{ fontSize: 13, letterSpacing: 1, fontFamily: 'monospace', fontWeight: 600 }}>{row.code}</code>
												<button type="button" className="gm-btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => copyCode(row.code)}>
													{copied === row.code ? '✓' : 'Копировать'}
												</button>
											</div>
										</td>
										<td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.pack_id ?? '—'}</td>
										<td style={{ fontFamily: 'monospace', fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.payment_id ?? ''}>{row.payment_id ?? '—'}</td>
										<td style={{ fontFamily: 'monospace', fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.target_uuid ?? ''}>{row.target_uuid ? row.target_uuid.slice(0, 8) + '…' : '—'}</td>
										<td>
											{isUsed
												? <span style={{ color: '#f0a050', fontSize: 12 }}>{row.redeemed_uuid ? row.redeemed_uuid.slice(0, 8) + '…' : 'Да'}</span>
												: <span style={{ color: '#7fd695', fontSize: 12 }}>Нет</span>}
										</td>
										<td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmt(row.created_at)}</td>
										<td>
											{!row.is_active
												? <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Откл.</span>
												: isUsed
													? <span style={{ fontSize: 12, color: '#f0a050' }}>Погашен</span>
													: <span style={{ fontSize: 12, color: '#7fd695' }}>Активен</span>}
										</td>
										<td style={{ whiteSpace: 'nowrap' }}>
											{!isUsed && (
												<button type="button" className="gm-btn" style={{ marginRight: 6, fontSize: 12 }} onClick={() => void toggleActive(row)}>
													{row.is_active ? 'Откл.' : 'Вкл.'}
												</button>
											)}
											<button type="button" className="gm-btn" style={{ fontSize: 12, borderColor: 'rgba(200,50,50,0.5)' }} onClick={() => void deleteRow(row.id)}>
												Удалить
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</>
	);
}
