import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

import { CornerBorders } from './CornerBorders'

interface GlassPanelProps {
    children: ReactNode
    className?: string
    corners?: boolean
    variant?: 'glass' | 'stat' | 'feature' | 'popular'
}

const variants = {
    glass: 'bg-panel-glass backdrop-blur-panel border-gold/45 shadow-panel',
    stat: 'bg-stat-glass backdrop-blur-card border-gold/20',
    feature: 'bg-card-feature backdrop-blur-card border-gold/20',
    popular: 'bg-card-popular backdrop-blur-card border-gold/45'
}

export const GlassPanel = ({
    children,
    className,
    corners,
    variant = 'glass'
}: GlassPanelProps) => (
    <div className={cn('relative rounded-panel border', variants[variant], className)}>
        {corners && <CornerBorders />}
        {children}
    </div>
)
