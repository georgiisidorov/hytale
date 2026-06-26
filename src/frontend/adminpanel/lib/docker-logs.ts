import http from 'node:http';

export type ContainerLogLine = {
	container: string;
	line: string;
};

function dockerSocketPath(): string {
	return process.env.DOCKER_SOCKET_PATH?.trim() || '/var/run/docker.sock';
}

function dockerGet(pathname: string, opts?: { timeoutMs?: number }): Promise<Buffer> {
	const socketPath = dockerSocketPath();
	const timeoutMs = Math.max(500, Math.min(20000, opts?.timeoutMs ?? 4500));
	return new Promise((resolve, reject) => {
		const req = http.request(
			{
				socketPath,
				method: 'GET',
				path: pathname,
				headers: { Host: 'docker' },
			},
			(res) => {
				const chunks: Buffer[] = [];
				res.on('data', (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
				res.on('end', () => {
					const buf = Buffer.concat(chunks);
					if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
						resolve(buf);
						return;
					}
					reject(new Error(`docker http ${res.statusCode ?? 0}: ${buf.toString('utf-8').slice(0, 300)}`));
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

export async function fetchContainerLogs(
	containers: string[],
	opts?: { tail?: number },
): Promise<ContainerLogLine[]> {
	const tail = opts?.tail ?? 200;

	const results: ContainerLogLine[] = [];
	for (const name of containers) {
		try {
			const qs = new URLSearchParams({
				stdout: '1',
				stderr: '1',
				timestamps: '1',
				tail: String(tail),
			});
			const buf = await dockerGet(`/containers/${encodeURIComponent(name)}/logs?${qs.toString()}`, { timeoutMs: 4500 });
			const text = buf.toString('utf-8');
			for (const raw of text.split('\n')) {
				const line = raw.trimEnd();
				if (!line) continue;
				results.push({ container: name, line });
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			results.push({ container: name, line: `[error] ${msg}` });
		}
	}

	// crude interleave: timestamps are in line start for docker logs with timestamps; sort lexicographically works for RFC3339.
	results.sort((a, b) => a.line.localeCompare(b.line));
	return results;
}

