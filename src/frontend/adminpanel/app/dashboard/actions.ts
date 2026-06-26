'use server';

import { getContainerLogLines, type AllowedContainer } from '../../lib/container-logs';

export type { AllowedContainer };

export async function getContainerLogsAction(args: { container: AllowedContainer; tail?: number }) {
	return await getContainerLogLines(args);
}

