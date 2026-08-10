import { cn } from '@/shared/lib/cn'

interface OnlineBadgeProps {
    label?: string
    value?: string
    className?: string
}

export const OnlineBadge = ({ label = 'Сервер онлайн', value, className }: OnlineBadgeProps) => (
    <div className={cn('flex items-center gap-2.5', className)}>
        <span className="size-2.5 rounded-full bg-online shadow-online-glow" />
        <span className="font-cinzel text-[11px] uppercase tracking-[4.4px] text-gold">
            {label}
        </span>
        {value && (
            <span className="font-outfit text-[12px] font-semibold tracking-[1.2px] text-ink">
                {value}
            </span>
        )}
    </div>
)
