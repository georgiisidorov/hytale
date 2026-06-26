import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { formatDate } from '@/shared/lib/formatDate'

import { ROUTES } from '@/shared/config/site'

import { API_BASE_URL, type Post, postsApi } from '@/shared/api'
import { Container } from '@/shared/ui'

import ArrowLongIcon from '@/assets/icons/arrow-long.svg'

export const NewsDetailPage = () => {
    const { id } = useParams()
    const [post, setPost] = useState<Post | null>(null)

    useEffect(() => {
        if (!id) return
        postsApi
            .getPost(Number(id))
            .then((data) => setPost(data.post))
            .catch(() => setPost(null))
    }, [id])

    if (!post) return null

    return (
        <Container wide className="pb-[120px] pt-[140px] desktop:pt-[170px]">
            <Link
                to={ROUTES.news}
                className="inline-flex items-center gap-3 font-cinzel text-[21px] uppercase tracking-[4.48px] text-ink transition-colors hover:text-gold"
            >
                <ArrowLongIcon className="h-[15px] w-[21px] -scale-x-100" />
                Назад
            </Link>

            <div className="mt-8 flex flex-col gap-8 desktop:flex-row desktop:items-start desktop:justify-between">
                <div>
                    <h1 className="font-cinzel text-[40px] font-normal uppercase leading-[1.2] text-ink desktop:text-[63px]">
                        {post.title}
                    </h1>
                </div>

                <div className="relative h-[201px] w-full overflow-hidden bg-[#23253f] shadow-panel-inset backdrop-blur-panel desktop:w-[457px]">
                    <img
                        src={`${API_BASE_URL}${post.preview_url}`}
                        alt={post.title}
                        className="size-full object-cover"
                    />
                    <span className="absolute right-2 top-[9px] inline-flex h-[29px] items-center rounded-badge border border-gold/[0.18] bg-[rgba(8,8,14,0.85)] px-3 font-outfit text-[11px] tracking-[1.1px] text-ink-muted">
                        {formatDate(post.created_at)}
                    </span>
                </div>
            </div>

            <div className="mt-11 h-[3px] w-full bg-[linear-gradient(90deg,#c9a84c_0%,rgba(201,168,76,0.45)_50%,#c9a84c_100%)]" />

            <div
                className="mt-11 font-outfit text-[21px] font-light leading-[1.3] text-[#c9c9c9]"
                dangerouslySetInnerHTML={{ __html: post.content }}
            />
        </Container>
    )
}
