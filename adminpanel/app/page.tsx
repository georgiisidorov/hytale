import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '../lib/auth';
import { SESSION_COOKIE } from '../lib/auth-constants';

export default async function HomePage() {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (token && (await verifySessionToken(token))) {
		redirect('/dashboard');
	}
	redirect('/login');
}
