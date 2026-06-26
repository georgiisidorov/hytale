import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

interface ContainerProps {
    children: ReactNode
    className?: string
    wide?: boolean
}

export const Container = ({ children, className, wide }: ContainerProps) => (
    <div
        className={cn(
            'mx-auto w-full',
            wide
                ? 'max-w-container-wide max-cont-wide:px-container-x-mobile'
                : 'max-w-container max-cont:px-container-x-mobile',
            className
        )}
    >
        {children}
    </div>
)
