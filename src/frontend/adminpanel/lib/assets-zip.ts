import { access } from 'node:fs/promises';
import path from 'node:path';

/** Путь к Assets.zip (Docker: /assets/Assets.zip, локально — репозиторий или server-dev). */
export async function resolveAssetsZip(): Promise<string | null> {
	const candidates = [
		process.env.HYTALE_ASSETS_ZIP?.trim(),
		'/assets/Assets.zip',
		'/home/projects/Hytale/Assets.zip',
		'/home/hytale/server-dev/Assets.zip',
		path.join(process.cwd(), '../../Assets.zip'),
		path.join(process.cwd(), '../../../Assets.zip'),
	].filter(Boolean) as string[];

	for (const p of candidates) {
		try {
			await access(p);
			return p;
		} catch {
			/* next */
		}
	}
	return null;
}
