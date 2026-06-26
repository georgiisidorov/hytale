'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '../../styles/login.module.scss';

type Step = 'password' | 'totp';

function onlyDigits(s: string): string {
	return s.replace(/\D/g, '');
}

function normalizeTotpDigits(raw: string): string {
	return onlyDigits(raw).slice(0, 6);
}

export function LoginForm() {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [step, setStep] = useState<Step>('password');
	const [totpDigits, setTotpDigits] = useState<string[]>(['', '', '', '', '', '']);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const totpRefs = useRef<Array<HTMLInputElement | null>>([]);
	const totpValue = useMemo(() => totpDigits.join(''), [totpDigits]);

	useEffect(() => {
		if (step === 'totp') {
			totpRefs.current[0]?.focus();
		}
	}, [step]);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError('');
		setLoading(true);
		try {
			const payload =
				step === 'password'
					? { username, password }
					: { username, password, totp: totpValue };
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const j = (await res.json().catch(() => ({}))) as { error?: string };
				setError(j.error ?? 'ошибка входа');
				return;
			}
			const j = (await res.json().catch(() => ({}))) as { ok?: boolean; requiresTotp?: boolean };
			if (j.requiresTotp) {
				setStep('totp');
				return;
			}
			window.location.href = '/dashboard';
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			setError(`Не удалось выполнить вход: ${message}`);
		} finally {
			setLoading(false);
		}
	}

	return (
		<form onSubmit={(e) => void onSubmit(e)}>
			{error ? <div className={styles.error}>{error}</div> : null}
			{step === 'password' ? (
				<>
					<input
						type="text"
						name="username"
						autoComplete="username"
						placeholder="Логин"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						disabled={loading}
						className={styles.input}
					/>
					<input
						type="password"
						name="password"
						autoComplete="current-password"
						placeholder="Пароль"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						disabled={loading}
						className={styles.input}
					/>
				</>
			) : (
				<>
					<label className={styles.label}>Код Google Authenticator</label>
					<div
						className={styles.otp}
						onPaste={(e) => {
							const pasted = normalizeTotpDigits(e.clipboardData.getData('text'));
							if (!pasted) return;
							e.preventDefault();
							setTotpDigits(pasted.split('').concat(['', '', '', '', '', '']).slice(0, 6));
							if (pasted.length === 6) {
								totpRefs.current[5]?.focus();
							} else {
								totpRefs.current[pasted.length]?.focus();
							}
						}}
					>
						{totpDigits.map((d, idx) => (
							<input
								// eslint-disable-next-line react/no-array-index-key
								key={idx}
								ref={(el) => {
									totpRefs.current[idx] = el;
								}}
								className={styles.otpCell}
								inputMode="numeric"
								autoComplete={idx === 0 ? 'one-time-code' : 'off'}
								pattern="[0-9]*"
								maxLength={1}
								disabled={loading}
								value={d}
								onChange={(e) => {
									const next = onlyDigits(e.target.value).slice(-1);
									setTotpDigits((prev) => {
										const copy = prev.slice();
										copy[idx] = next;
										return copy;
									});
									if (next && idx < 5) {
										totpRefs.current[idx + 1]?.focus();
									}
								}}
								onKeyDown={(e) => {
									if (e.key === 'Backspace' && !totpDigits[idx] && idx > 0) {
										totpRefs.current[idx - 1]?.focus();
									}
									if (e.key === 'ArrowLeft' && idx > 0) {
										e.preventDefault();
										totpRefs.current[idx - 1]?.focus();
									}
									if (e.key === 'ArrowRight' && idx < 5) {
										e.preventDefault();
										totpRefs.current[idx + 1]?.focus();
									}
								}}
							/>
						))}
					</div>
					<button
						type="button"
						className={styles.backLink}
						disabled={loading}
						onClick={() => {
							setError('');
							setTotpDigits(['', '', '', '', '', '']);
							setStep('password');
						}}
					>
						← Назад
					</button>
				</>
			)}
			<button type="submit" disabled={loading} className={styles.button}>
				{loading ? '…' : step === 'password' ? 'Далее' : 'Войти'}
			</button>
		</form>
	);
}
