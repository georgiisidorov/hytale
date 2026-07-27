import { useEffect, useState } from 'react'

import { type PostListItem, postsApi } from '@/shared/api'
import { Container, GoldText, SectionLabel, SectionTitle } from '@/shared/ui'

import { NewsCard } from './components'

export const News = () => {
    const [posts, setPosts] = useState<PostListItem[]>([])

    useEffect(() => {
        postsApi
            .getPosts({ limit: 2 })
            .then((data) => setPosts(data.rows))
            .catch(() => {})
    }, [])

    return (
        <section className="py-20 desktop:py-24">
            <Container>
                <SectionLabel>Журнал</SectionLabel>
                <SectionTitle className="mt-5 text-center">
                    Последние <GoldText>новости</GoldText>
                </SectionTitle>

                <div className="mt-12 grid grid-cols-1 gap-card-pad desktop:grid-cols-2">
                    {Array.isArray(posts)
                        ? posts.map((item) => <NewsCard key={item.id} item={item} />)
                        : null}
                </div>

                <p className="mt-8 text-center font-outfit text-[13px] text-ink-dim">
                    Новости сортируются по дате
                    <span className="mx-2">·</span>
                    Открываются на отдельной странице
                </p>
            </Container>
        </section>
    )
}
