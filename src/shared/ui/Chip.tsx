import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

type ChipVariant = 'gold' | 'blue' | 'violet' | 'lazure' | 'green'

interface ChipProps {
    children: ReactNode
    variant?: ChipVariant
    className?: string
}

const variants: Record<ChipVariant, string> = {
    gold: 'border-gold/35 bg-gold/10 text-gold-light',
    blue: 'border-accent-bright/25 bg-accent-bright/[0.08] text-accent',
    violet: 'border-violet-bright/25 bg-violet-bright/[0.20] text-violet',
    lazure: 'border-lazure-bright/25 bg-lazure-bright/[0.10] text-lazure',
    green: 'border-green-bright/25 bg-green-bright/[0.10] text-green'
}

export const Chip = ({ children, variant = 'gold', className }: ChipProps) => (
    <span
        className={cn(
            'inline-flex h-[32.59px] items-center rounded-badge border px-3 font-outfit text-[12px] tracking-[0.72px]',
            variants[variant],
            className
        )}
    >
        {children}
    </span>
)
