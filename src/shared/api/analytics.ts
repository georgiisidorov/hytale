import { api } from './httpClient'

export interface ServerStats {
    onlinePlayers: number | null
    registeredPlayers: number | null
}

interface AnalyticsResponse extends ServerStats {
    ok: true
}

export const analyticsApi = {
    getServerStats: (server = 'prod') =>
        api.get<AnalyticsResponse>(`/api/hytale/analytics?server=${server}`, {
            headers: { 'Cache-Control': 'no-store' }
        })
}
