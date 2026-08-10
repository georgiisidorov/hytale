import { api } from './httpClient'

export interface PostListItem {
    id: number
    title: string
    preview_url: string
    created_at: string
}

export interface Post {
    id: number
    title: string
    content: string
    preview_url: string
    created_by: string
    created_at: string
    updated_at: string
}

interface PostsResponse {
    ok: true
    total: number
    limit: number
    offset: number
    rows: PostListItem[]
}

interface PostResponse {
    ok: true
    post: Post
}

export const postsApi = {
    getPosts: (params?: { limit?: number; offset?: number }) =>
        api.get<PostsResponse>('/api/posts', { params }),

    getPost: (id: number) => api.get<PostResponse>(`/api/posts/${id}`)
}
