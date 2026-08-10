import { Outlet, ScrollRestoration } from 'react-router-dom'

import { ReactLenis } from 'lenis/react'

import { Footer } from '@/widgets/footer'
import { Join } from '@/widgets/join'
import { Navbar } from '@/widgets/navbar'

export const BaseLayout = () => (
    <ReactLenis root options={{ lerp: 0.3, smoothWheel: true }}>
        <div className="relative min-h-screen overflow-x-hidden">
            <Navbar />
            <main>
                <Outlet />
            </main>
            <Join />
            <Footer />
            <ScrollRestoration />
        </div>
    </ReactLenis>
)
