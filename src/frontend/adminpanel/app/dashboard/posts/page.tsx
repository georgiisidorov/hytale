'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

type PostRow = {
	id: number;
	title: string;
	preview_url: string | null;
	is_published: boolean;
	created_by: string | null;
	created_at: string;
	updated_at: string;
};

type PostDetail = PostRow & { content: string };

// ───────── styles ─────────

const pageStyle: React.CSSProperties = {
	display: 'flex',
	height: '100%',
	gap: 0,
	overflow: 'hidden',
	color: 'rgba(255,255,255,0.9)',
	fontFamily: 'inherit',
};

const leftPaneStyle: React.CSSProperties = {
	width: 340,
	minWidth: 340,
	borderRight: '1px solid rgba(17,105,113,0.45)',
	display: 'flex',
	flexDirection: 'column',
	overflow: 'hidden',
	background: '#050f10',
};

const rightPaneStyle: React.CSSProperties = {
	flex: 1,
	display: 'flex',
	flexDirection: 'column',
	overflow: 'hidden',
	background: '#000E0F',
};

const panelHeader: React.CSSProperties = {
	padding: '14px 16px',
	borderBottom: '1px solid rgba(17,105,113,0.45)',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	gap: 8,
	flexShrink: 0,
};

const btnPrimary: React.CSSProperties = {
	background: '#116971',
	border: 'none',
	color: '#fff',
	padding: '7px 14px',
	borderRadius: 5,
	cursor: 'pointer',
	fontSize: 13,
	fontWeight: 500,
	whiteSpace: 'nowrap',
};

const btnDanger: React.CSSProperties = {
	background: 'rgba(255,68,68,0.12)',
	border: '1px solid rgba(255,68,68,0.4)',
	color: '#ff4444',
	padding: '5px 10px',
	borderRadius: 4,
	cursor: 'pointer',
	fontSize: 12,
};

const btnSecondary: React.CSSProperties = {
	background: 'rgba(63,217,209,0.1)',
	border: '1px solid rgba(63,217,209,0.3)',
	color: '#3FD9D1',
	padding: '7px 14px',
	borderRadius: 5,
	cursor: 'pointer',
	fontSize: 13,
	whiteSpace: 'nowrap',
};

const inputStyle: React.CSSProperties = {
	background: 'rgba(255,255,255,0.05)',
	border: '1px solid rgba(17,105,113,0.45)',
	borderRadius: 5,
	color: 'rgba(255,255,255,0.9)',
	padding: '8px 10px',
	fontSize: 13,
	outline: 'none',
	width: '100%',
	boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
	fontSize: 11,
	color: 'rgba(255,255,255,0.5)',
	marginBottom: 4,
	display: 'block',
	textTransform: 'uppercase',
	letterSpacing: '0.05em',
};

// ───────── WYSIWYG toolbar ─────────

type ToolbarBtn = {
	cmd: string;
	arg?: string;
	label: string;
	title: string;
};

const TOOLBAR: ToolbarBtn[] = [
	{ cmd: 'bold', label: 'B', title: 'Жирный (Ctrl+B)' },
	{ cmd: 'italic', label: 'I', title: 'Курсив (Ctrl+I)' },
	{ cmd: 'underline', label: 'U', title: 'Подчёркнутый (Ctrl+U)' },
	{ cmd: 'strikeThrough', label: 'S̶', title: 'Зачёркнутый' },
	{ cmd: 'formatBlock', arg: 'H2', label: 'H2', title: 'Заголовок 2' },
	{ cmd: 'formatBlock', arg: 'H3', label: 'H3', title: 'Заголовок 3' },
	{ cmd: 'formatBlock', arg: 'P', label: '¶', title: 'Параграф' },
	{ cmd: 'insertUnorderedList', label: '•', title: 'Маркированный список' },
	{ cmd: 'insertOrderedList', label: '1.', title: 'Нумерованный список' },
	{ cmd: 'removeFormat', label: '✕', title: 'Убрать форматирование' },
];

function execCmd(cmd: string, arg?: string) {
	document.execCommand(cmd, false, arg);
}

function WysiwygEditor({
	value,
	onChange,
}: {
	value: string;
	onChange: (html: string) => void;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const skipNextChange = useRef(false);

	useEffect(() => {
		if (!ref.current) return;
		if (ref.current.innerHTML !== value) {
			skipNextChange.current = true;
			ref.current.innerHTML = value;
		}
	}, [value]);

	function handleInput() {
		if (skipNextChange.current) {
			skipNextChange.current = false;
			return;
		}
		if (ref.current) onChange(ref.current.innerHTML);
	}

	function handleLinkBtn() {
		const url = prompt('Введите URL ссылки:');
		if (url) execCmd('createLink', url);
		ref.current?.focus();
		if (ref.current) onChange(ref.current.innerHTML);
	}

	const toolbarStyle: React.CSSProperties = {
		display: 'flex',
		flexWrap: 'wrap',
		gap: 3,
		padding: '6px 8px',
		borderBottom: '1px solid rgba(17,105,113,0.35)',
		background: 'rgba(255,255,255,0.03)',
		flexShrink: 0,
	};

	const tbBtnStyle: React.CSSProperties = {
		background: 'rgba(255,255,255,0.07)',
		border: '1px solid rgba(255,255,255,0.12)',
		color: 'rgba(255,255,255,0.85)',
		padding: '3px 8px',
		borderRadius: 3,
		cursor: 'pointer',
		fontSize: 13,
		minWidth: 28,
		textAlign: 'center',
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', border: '1px solid rgba(17,105,113,0.45)', borderRadius: 6 }}>
			<div style={toolbarStyle}>
				{TOOLBAR.map((btn) => (
					<button
						key={btn.cmd + (btn.arg ?? '')}
						type="button"
						title={btn.title}
						style={btn.label === 'B' ? { ...tbBtnStyle, fontWeight: 700 } : btn.label === 'I' ? { ...tbBtnStyle, fontStyle: 'italic' } : tbBtnStyle}
						onMouseDown={(e) => {
							e.preventDefault();
							execCmd(btn.cmd, btn.arg);
							if (ref.current) onChange(ref.current.innerHTML);
						}}
					>
						{btn.label}
					</button>
				))}
				<button
					type="button"
					title="Вставить ссылку"
					style={tbBtnStyle}
					onMouseDown={(e) => { e.preventDefault(); handleLinkBtn(); }}
				>
					🔗
				</button>
			</div>
			<div
				ref={ref}
				contentEditable
				suppressContentEditableWarning
				onInput={handleInput}
				onBlur={handleInput}
				style={{
					flex: 1,
					overflowY: 'auto',
					padding: '12px 14px',
					outline: 'none',
					fontSize: 14,
					lineHeight: 1.6,
					color: 'rgba(255,255,255,0.88)',
					background: '#050f10',
					minHeight: 200,
				}}
			/>
		</div>
	);
}

// ───────── main page ─────────

export default function PostsPage() {
	const [rows, setRows] = useState<PostRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [selected, setSelected] = useState<PostDetail | null>(null);
	const [isNew, setIsNew] = useState(false);
	const [saving, setSaving] = useState(false);
	const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

	// form state
	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [previewUrl, setPreviewUrl] = useState('');
	const [isPublished, setIsPublished] = useState(false);
	const [uploading, setUploading] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	const flash = (text: string, ok: boolean) => {
		setMsg({ text, ok });
		setTimeout(() => setMsg(null), 3000);
	};

	const loadList = useCallback(async () => {
		setLoading(true);
		try {
			const r = await fetch('/api/hytale/posts');
			const j = (await r.json()) as { ok: boolean; rows: PostRow[] };
			if (j.ok) setRows(j.rows);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { void loadList(); }, [loadList]);

	async function openPost(id: number) {
		const r = await fetch(`/api/hytale/posts/${id}`);
		const j = (await r.json()) as { ok: boolean; row: PostDetail };
		if (!j.ok) return;
		setSelected(j.row);
		setIsNew(false);
		setTitle(j.row.title);
		setContent(j.row.content);
		setPreviewUrl(j.row.preview_url ?? '');
		setIsPublished(j.row.is_published);
	}

	function openNew() {
		setSelected(null);
		setIsNew(true);
		setTitle('');
		setContent('');
		setPreviewUrl('');
		setIsPublished(false);
	}

	async function handleSave(publish?: boolean) {
		if (!title.trim()) { flash('Введите заголовок', false); return; }
		setSaving(true);
		try {
			const published = publish !== undefined ? publish : isPublished;
			if (isNew) {
				const r = await fetch('/api/hytale/posts', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title, content, previewUrl: previewUrl || null, isPublished: published }),
				});
				const j = (await r.json()) as { ok: boolean; row: PostRow; error?: string };
				if (!j.ok) { flash(j.error ?? 'Ошибка', false); return; }
				setIsNew(false);
				setSelected({ ...j.row, content });
				setIsPublished(published);
				await loadList();
				flash('Пост создан', true);
			} else if (selected) {
				const r = await fetch(`/api/hytale/posts/${selected.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title, content, previewUrl: previewUrl || null, isPublished: published }),
				});
				const j = (await r.json()) as { ok: boolean; row: PostRow; error?: string };
				if (!j.ok) { flash(j.error ?? 'Ошибка', false); return; }
				setSelected({ ...j.row, content });
				setIsPublished(published);
				await loadList();
				flash('Сохранено', true);
			}
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete(id: number) {
		if (!confirm('Удалить пост?')) return;
		const r = await fetch(`/api/hytale/posts/${id}`, { method: 'DELETE' });
		const j = (await r.json()) as { ok: boolean };
		if (j.ok) {
			if (selected?.id === id) { setSelected(null); setIsNew(false); }
			await loadList();
			flash('Пост удалён', true);
		}
	}

	async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		try {
			const fd = new FormData();
			fd.append('file', file);
			const r = await fetch('/api/hytale/posts/upload', { method: 'POST', body: fd });
			const j = (await r.json()) as { ok: boolean; url?: string; error?: string };
			if (j.ok && j.url) {
				setPreviewUrl(j.url);
				// Auto-save preview URL for existing posts so the user doesn't have to click Save manually
				if (!isNew && selected) {
					try {
						await fetch(`/api/hytale/posts/${selected.id}`, {
							method: 'PATCH',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ previewUrl: j.url }),
						});
						await loadList();
					} catch {}
				}
				flash('Изображение загружено', true);
			} else {
				flash(j.error ?? 'Ошибка загрузки', false);
			}
		} finally {
			setUploading(false);
			if (fileRef.current) fileRef.current.value = '';
		}
	}

	const showEditor = isNew || selected !== null;

	return (
		<div style={pageStyle}>
			{/* ── left: list ── */}
			<div style={leftPaneStyle}>
				<div style={panelHeader}>
					<span style={{ fontSize: 14, fontWeight: 600, color: '#9FF3F3' }}>Посты</span>
					<button style={btnPrimary} onClick={openNew}>+ Новый пост</button>
				</div>

				{msg && (
					<div style={{
						margin: '8px 12px 0',
						padding: '8px 12px',
						borderRadius: 5,
						fontSize: 13,
						background: msg.ok ? 'rgba(63,217,209,0.12)' : 'rgba(255,68,68,0.12)',
						color: msg.ok ? '#3FD9D1' : '#ff4444',
						border: `1px solid ${msg.ok ? 'rgba(63,217,209,0.3)' : 'rgba(255,68,68,0.3)'}`,
					}}>
						{msg.text}
					</div>
				)}

				<div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
					{loading ? (
						<div style={{ padding: 20, color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center' }}>Загрузка…</div>
					) : rows.length === 0 ? (
						<div style={{ padding: 20, color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center' }}>Постов пока нет</div>
					) : rows.map(row => {
						const active = !isNew && selected?.id === row.id;
						return (
							<div
								key={row.id}
								onClick={() => void openPost(row.id)}
								style={{
									padding: '10px 14px',
									cursor: 'pointer',
									borderLeft: `3px solid ${active ? '#3FD9D1' : 'transparent'}`,
									background: active ? 'rgba(63,217,209,0.08)' : 'transparent',
									borderBottom: '1px solid rgba(17,105,113,0.2)',
									display: 'flex',
									flexDirection: 'column',
									gap: 4,
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
									<span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
										{row.title}
									</span>
									<div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
										<span style={{
											fontSize: 10,
											padding: '2px 6px',
											borderRadius: 3,
											background: row.is_published ? 'rgba(63,217,209,0.15)' : 'rgba(255,255,255,0.07)',
											color: row.is_published ? '#3FD9D1' : 'rgba(255,255,255,0.4)',
											border: `1px solid ${row.is_published ? 'rgba(63,217,209,0.3)' : 'rgba(255,255,255,0.1)'}`,
										}}>
											{row.is_published ? 'Опубл.' : 'Черновик'}
										</span>
										<button
											style={btnDanger}
											onClick={() => void handleDelete(row.id)}
										>✕</button>
									</div>
								</div>
								<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
									{new Date(row.updated_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
									{row.created_by ? ` · ${row.created_by}` : ''}
								</span>
							</div>
						);
					})}
				</div>
			</div>

			{/* ── right: editor ── */}
			<div style={rightPaneStyle}>
				{!showEditor ? (
					<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
						Выберите пост или создайте новый
					</div>
				) : (
					<>
						<div style={panelHeader}>
							<span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
								{isNew ? 'Новый пост' : `Редактирование #${selected?.id ?? ''}`}
							</span>
							<div style={{ display: 'flex', gap: 8 }}>
								<button
									style={btnSecondary}
									disabled={saving}
									onClick={() => void handleSave(false)}
								>
									{saving ? 'Сохранение…' : 'Сохранить черновик'}
								</button>
								<button
									style={{ ...btnPrimary, background: isPublished ? '#116971' : '#159AAB' }}
									disabled={saving}
									onClick={() => void handleSave(!isPublished)}
								>
									{isPublished ? 'Снять с публикации' : 'Опубликовать'}
								</button>
							</div>
						</div>

						<div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', padding: 20, gap: 16 }}>
							{/* title */}
							<div>
								<label style={labelStyle}>Заголовок</label>
								<input
									style={{ ...inputStyle, fontSize: 16, fontWeight: 500 }}
									value={title}
									onChange={e => setTitle(e.target.value)}
									placeholder="Введите заголовок поста…"
									maxLength={500}
								/>
							</div>

							{/* preview image */}
							<div>
								<label style={labelStyle}>Превью-изображение</label>
								{previewUrl ? (
									<div style={{ display: 'inline-block', position: 'relative' }}>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={previewUrl}
											alt="preview"
											style={{ height: 80, maxWidth: 200, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(17,105,113,0.45)', display: 'block' }}
											onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
										/>
										<button
											onClick={() => setPreviewUrl('')}
											title="Удалить изображение"
											style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: '#0a1f21', border: '1px solid rgba(63,217,209,0.4)', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
										>✕</button>
									</div>
								) : (
									<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
										<input
											style={{ ...inputStyle, flex: 1 }}
											value={previewUrl}
											onChange={e => setPreviewUrl(e.target.value)}
											placeholder="https://… или загрузите файл"
										/>
										<button
											style={{ ...btnSecondary, flexShrink: 0 }}
											onClick={() => fileRef.current?.click()}
											disabled={uploading}
										>
											{uploading ? '…' : 'Загрузить'}
										</button>
									</div>
								)}
								<input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => void handleUpload(e)} />
							</div>

							{/* content editor */}
							<div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 300 }}>
								<label style={labelStyle}>Текст поста (HTML)</label>
								<WysiwygEditor value={content} onChange={setContent} />
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
