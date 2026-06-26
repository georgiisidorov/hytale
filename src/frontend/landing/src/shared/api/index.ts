export { api, request } from './httpClient'

export { analyticsApi } from './analytics'
export type { ServerStats } from './analytics'

export { postsApi } from './posts'
export type { Post, PostListItem } from './posts'

export { packsApi } from './packs'
export type { CreateVoucherPayload, PackId } from './packs'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
