import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

interface IconBoxProps {
    children: ReactNode
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const sizes = {
    sm: 'size-9',
    md: 'size-[46px]',
    lg: 'size-14'
}

export const IconBox = ({ children, size = 'lg', className }: IconBoxProps) => (
    <div
        className={cn(
            'flex items-center justify-center rounded-btn border border-gold/45 bg-icon-box text-gold shadow-icon-inset',
            sizes[size],
            className
        )}
    >
        {children}
    </div>
)
