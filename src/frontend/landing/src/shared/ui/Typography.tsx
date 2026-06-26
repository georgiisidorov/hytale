import type { ElementType, ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

interface BaseProps {
    children: ReactNode
    className?: string
    as?: ElementType
}

export const Eyebrow = ({ children, className, as: Tag = 'span' }: BaseProps) => (
    <Tag className={cn('font-cinzel text-eyebrow uppercase text-gold-light', className)}>
        {children}
    </Tag>
)

export const SectionTitle = ({ children, className, as: Tag = 'h2' }: BaseProps) => (
    <Tag
        className={cn(
            'font-cinzel font-black uppercase text-ink',
            'text-h2-mobile desktop:text-h2',
            className
        )}
    >
        {children}
    </Tag>
)

export const CardTitle = ({ children, className, as: Tag = 'h3' }: BaseProps) => (
    <Tag className={cn('font-cinzel text-h3 font-bold uppercase text-ink', className)}>
        {children}
    </Tag>
)

export const BodyText = ({ children, className, as: Tag = 'p' }: BaseProps) => (
    <Tag className={cn('font-outfit text-body-sm text-ink-muted', className)}>{children}</Tag>
)

export const GoldText = ({ children, className, as: Tag = 'span' }: BaseProps) => (
    <Tag className={cn('text-gold-grad', className)}>{children}</Tag>
)

export const Label = ({ children, className, as: Tag = 'span' }: BaseProps) => (
    <Tag className={cn('font-cinzel text-label uppercase text-gold-deep', className)}>
        {children}
    </Tag>
)
