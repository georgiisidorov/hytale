import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

type ButtonVariant = 'gold' | 'glass' | 'blue' | 'violet' | 'lazure' | 'green'

interface ButtonProps<T extends ElementType> {
    as?: T
    variant?: ButtonVariant
    children: ReactNode
    className?: string
}

const base =
    'relative inline-flex items-center justify-center rounded-btn font-cinzel font-bold uppercase tracking-[2.86px] transition-transform duration-200 hover:-translate-y-0.5'

const variants: Record<ButtonVariant, string> = {
    gold: cn(
        'bg-btn-gold border border-gold-border text-ink-dark shadow-btn-gold',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-btn before:shadow-btn-inset'
    ),
    glass: 'border border-gold/45 bg-[rgba(20,22,35,0.5)] text-ink backdrop-blur-card hover:border-gold/70',
    blue: cn(
        'bg-btn-blue border border-accent-border text-accent-dark shadow-btn-blue',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-btn before:shadow-btn-blue-inset'
    ),
    violet: cn(
        'bg-btn-violet border border-violet-border text-accent-dark shadow-btn-violet',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-btn before:shadow-btn-violet-inset'
    ),
    lazure: cn(
        'bg-btn-lazure border border-lazure-border text-accent-dark shadow-btn-lazure',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-btn before:shadow-btn-lazure-inset'
    ),
    green: cn(
        'bg-btn-green border border-green-border text-accent-dark shadow-btn-green',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-btn before:shadow-btn-green-inset'
    )
}

export const Button = <T extends ElementType = 'button'>({
    as,
    variant = 'gold',
    children,
    className,
    ...rest
}: ButtonProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof ButtonProps<T>>) => {
    const Tag = as || 'button'
    return (
        <Tag className={cn(base, variants[variant], className)} {...rest}>
            <span className="relative z-10">{children}</span>
        </Tag>
    )
}
