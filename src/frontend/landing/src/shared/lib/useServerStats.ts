import { useEffect, useState } from 'react'

import { type ServerStats, analyticsApi } from '@/shared/api'

import { totalAccounts } from './totalAccounts'

export const useServerStats = (intervalMs = 10_000) => {
    const [stats, setStats] = useState<ServerStats>({
        onlinePlayers: null,
        registeredPlayers: null
    })

    useEffect(() => {
        let cancelled = false

        const tick = async () => {
            try {
                const data = await analyticsApi.getServerStats()
                if (!cancelled) {
                    setStats({
                        onlinePlayers: data.onlinePlayers,
                        registeredPlayers:
                            data.onlinePlayers === null || data.onlinePlayers === undefined
                                ? null
                                : totalAccounts(data.onlinePlayers)
                    })
                }
            } catch {
                /* empty */
            }
        }

        tick()
        const id = setInterval(tick, intervalMs)

        return () => {
            cancelled = true
            clearInterval(id)
        }
    }, [intervalMs])

    return stats
}
