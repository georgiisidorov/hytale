import { useEffect, useState } from 'react'

import { type PostListItem, postsApi } from '@/shared/api'
import { Container } from '@/shared/ui'

import { NewsListCard } from '@/widgets/news/components'
import { Pagination } from '@/widgets/pagination'

const PAGE_SIZE = 9

export const NewsListPage = () => {
    const [page, setPage] = useState(1)
    const [rows, setRows] = useState<PostListItem[]>([])
    const [total, setTotal] = useState(0)

    useEffect(() => {
        postsApi
            .getPosts({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
            .then((data) => {
                setRows(data.rows)
                setTotal(data.total)
            })
            .catch(() => {})
    }, [page])

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    return (
        <Container wide className="pb-[120px] pt-[140px] desktop:pt-[170px]">
            <h1 className="text-gold-grad font-cinzel text-[40px] font-black uppercase leading-[1.1] desktop:text-[51px]">
                Новости
            </h1>

            <div className="mt-12 grid grid-cols-1 gap-card-pad sm:grid-cols-2 desktop:grid-cols-3">
                {rows.map((item) => (
                    <NewsListCard key={item.id} item={item} />
                ))}
            </div>

            {totalPages > 1 && (
                <div className="mt-[60px]">
                    <Pagination current={page} total={totalPages} onChange={setPage} />
                </div>
            )}
        </Container>
    )
}
