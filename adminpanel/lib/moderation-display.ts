/** Единая логика подписи статуса для API и при необходимости для UI. */

export type ModerationKind = 'active' | 'banned' | 'temp_kick';

export function moderationDisplay(
	moderationStatus: string,
	moderationUntilIso: string | null | undefined,
): { label: string; kind: ModerationKind } {
	const until = moderationUntilIso ? new Date(moderationUntilIso) : null;
	if (moderationStatus === 'banned') {
		return { label: 'Бан', kind: 'banned' };
	}
	if (moderationStatus === 'temp_kick') {
		if (until && !Number.isNaN(until.getTime()) && until.getTime() > Date.now()) {
			return { label: `Кик до ${until.toLocaleString()}`, kind: 'temp_kick' };
		}
		return { label: 'Активен', kind: 'active' };
	}
	return { label: 'Активен', kind: 'active' };
}
