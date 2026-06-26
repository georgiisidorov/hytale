import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeSessionToken } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/auth-constants';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

async function requireAdmin(): Promise<{ username: string } | null> {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token) return null;
	return await decodeSessionToken(token);
}

const ALLOWED_TYPES: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
};

export async function POST(req: Request) {
	try {
		const admin = await requireAdmin();
		if (!admin) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

		const formData = await req.formData();
		const file = formData.get('file');
		if (!file || typeof file === 'string') {
			return NextResponse.json({ ok: false, error: 'файл не передан' }, { status: 400 });
		}

		const ext = ALLOWED_TYPES[file.type];
		if (!ext) {
			return NextResponse.json({ ok: false, error: 'разрешены только JPEG, PNG, WebP, GIF' }, { status: 400 });
		}

		const MAX_SIZE = 8 * 1024 * 1024;
		const buffer = Buffer.from(await file.arrayBuffer());
		if (buffer.length > MAX_SIZE) {
			return NextResponse.json({ ok: false, error: 'файл слишком большой (макс 8 МБ)' }, { status: 400 });
		}

		const uploadDir = join(process.cwd(), 'public', 'uploads', 'posts');
		await mkdir(uploadDir, { recursive: true });

		const name = `${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
		await writeFile(join(uploadDir, name), buffer);

		return NextResponse.json({ ok: true, url: `/api/uploads/posts/${name}` });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ ok: false, error: msg }, { status: 500 });
	}
}
