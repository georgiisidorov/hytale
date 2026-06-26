import { readFile } from 'fs/promises';
import { join } from 'path';

const CONTENT_TYPES: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	gif: 'image/gif',
};

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
	const { path } = await ctx.params;
	const segments = path.filter(s => s !== '..' && s !== '.' && !s.includes('/'));
	const filePath = join(process.cwd(), 'public', 'uploads', ...segments);

	try {
		const buffer = await readFile(filePath);
		const ext = segments.at(-1)?.split('.').pop()?.toLowerCase() ?? '';
		return new Response(buffer, {
			headers: {
				'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
				'Cache-Control': 'public, max-age=31536000, immutable',
			},
		});
	} catch {
		return new Response('Not found', { status: 404 });
	}
}
