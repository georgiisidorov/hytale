/** Открытие сервера — 13 августа 2026, МСК. */
const LAUNCH_DATE = new Date('2026-08-13T00:00:00+03:00')

const DAY_MS = 24 * 60 * 60 * 1000

/** Полных суток с открытия; до открытия — 0. */
const daysSinceLaunch = () => Math.max(0, Math.floor((Date.now() - LAUNCH_DATE.getTime()) / DAY_MS))

export const totalAccounts = (displayOnline: number) =>
    100 + displayOnline * 300 + daysSinceLaunch() * displayOnline * 2
