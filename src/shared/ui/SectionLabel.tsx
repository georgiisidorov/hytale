import { cn } from '@/shared/lib/cn'

interface SectionLabelProps {
    children: string
    className?: string
}

export const SectionLabel = ({ children, className }: SectionLabelProps) => (
    <div className={cn('flex items-center justify-center gap-3', className)}>
        <span className="h-px w-9 bg-divider-gold-r" />
        <span className="font-cinzel text-label-sm uppercase tracking-[3.6px] text-gold">
            {children}
        </span>
        <span className="h-px w-9 rotate-180 bg-divider-gold-r" />
    </div>
)
