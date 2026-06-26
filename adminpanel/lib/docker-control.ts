import http from 'node:http';
import { serverContainerName, type HytaleServerId } from '@/lib/hytale-server-instance';

function dockerSocketPath(): string {
	return process.env.DOCKER_SOCKET_PATH?.trim() || '/var/run/docker.sock';
}

function dockerRequest(
	method: string,
	pathname: string,
	opts?: { timeoutMs?: number },
): Promise<{ statusCode: number; body: string }> {
	const socketPath = dockerSocketPath();
	const timeoutMs = Math.max(500, Math.min(120_000, opts?.timeoutMs ?? 30_000));
	return new Promise((resolve, reject) => {
		const req = http.request(
			{
				socketPath,
				method,
				path: pathname,
				headers: { Host: 'docker' },
			},
			(res) => {
				const chunks: Buffer[] = [];
				res.on('data', (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
				res.on('end', () => {
					const body = Buffer.concat(chunks).toString('utf-8');
					resolve({ statusCode: res.statusCode ?? 0, body });
				});
			},
		);
		req.setTimeout(timeoutMs, () => {
			req.destroy(new Error(`docker socket timeout after ${timeoutMs}ms`));
		});
		req.on('error', reject);
		req.end();
	});
}

/** Перезапуск контейнера Hytale (подтягивает новый jar, каталог с админки). */
export async function restartHytaleServer(serverId: HytaleServerId): Promise<{ container: string }> {
	const container = serverContainerName(serverId);
	const qs = new URLSearchParams({ t: '10' });
	const { statusCode, body } = await dockerRequest(
		'POST',
		`/containers/${encodeURIComponent(container)}/restart?${qs.toString()}`,
		{ timeoutMs: 90_000 },
	);
	if (statusCode === 204 || statusCode === 200) {
		return { container };
	}
	const detail = body.trim().slice(0, 400);
	throw new Error(`docker restart ${container}: HTTP ${statusCode}${detail ? ` — ${detail}` : ''}`);
}
