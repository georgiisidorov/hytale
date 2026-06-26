import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '../../lib/auth';
import { SESSION_COOKIE } from '../../lib/auth-constants';
import { LoginForm } from './login-form';
import styles from '../../styles/login.module.scss';

export default async function LoginPage() {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (token && (await verifySessionToken(token))) {
		redirect('/dashboard');
	}
	return (
		<div className={styles.page}>
			<div className={styles.card}>
					<h1 className={styles.title}>Atomic Hytale</h1>
				<LoginForm />
			</div>
		</div>
	);
}
