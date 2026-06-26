export type HytaleServerId = 'dev' | 'prod';

export const HYTALE_SERVER_IDS: HytaleServerId[] = ['dev', 'prod'];

export function parseServerId(raw: string | null | undefined): HytaleServerId {
	const v = (raw ?? process.env.HYTALE_DEFAULT_SERVER ?? 'dev').trim().toLowerCase();
	return v === 'prod' ? 'prod' : 'dev';
}

/** Каталог сервера внутри контейнера админки (volume mount). */
export function serverRootDir(serverId?: HytaleServerId): string {
	const id = serverId ?? parseServerId(undefined);
	if (id === 'prod') {
		return (process.env.HYTALE_SERVER_PROD_DIR || '/servers/prod').trim() || '/servers/prod';
	}
	return (process.env.HYTALE_SERVER_DEV_DIR || '/servers/dev').trim() || '/servers/dev';
}

export function serverLabel(serverId: HytaleServerId): string {
	return serverId === 'prod' ? 'Prod' : 'Dev';
}

const SERVER_CONTAINER_NAMES: Record<HytaleServerId, string> = {
	dev: 'hytale-server-dev',
	prod: 'hytale-server-prod',
};

/** Имя Docker-контейнера игрового сервера. */
export function serverContainerName(serverId: HytaleServerId): string {
	return SERVER_CONTAINER_NAMES[serverId];
}
