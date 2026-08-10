import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { useLenis } from 'lenis/react'

import { Features } from '@/widgets/features'
import { Hero } from '@/widgets/hero'
import { News } from '@/widgets/news'
import { Shop } from '@/widgets/shop'
import { Stats } from '@/widgets/stats'

export const HomePage = () => {
    const lenis = useLenis()
    const location = useLocation()

    useEffect(() => {
        const hash = (location.state as { scrollTo?: string } | null)?.scrollTo
        if (hash && lenis) lenis.scrollTo(hash)
    }, [location.state, lenis])

    return (
        <>
            <Hero />
            <Features />
            <Stats />
            <Shop />
            <News />
        </>
    )
}
