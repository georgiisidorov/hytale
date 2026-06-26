import { cn } from '@/shared/lib/cn'

interface DividerProps {
    className?: string
    tone?: 'gold' | 'soft'
}

export const Divider = ({ className, tone = 'soft' }: DividerProps) => (
    <span
        className={cn(
            'block h-px w-full',
            tone === 'gold' ? 'bg-divider-gold' : 'bg-gold/20',
            className
        )}
    />
)
