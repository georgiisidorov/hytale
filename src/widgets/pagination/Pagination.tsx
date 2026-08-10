import { cn } from '@/shared/lib/cn'

import ChevronIcon from '@/assets/icons/chevron.svg'

interface PaginationProps {
    current: number
    total: number
    onChange: (page: number) => void
}

const buildPages = (current: number, total: number): (number | '...')[] => {
    if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1)
    if (current <= 3) return [1, 2, 3, '...', total - 1, total]
    if (current >= total - 2) return [1, 2, '...', total - 1, total]
    return [1, '...', current, '...', total]
}

const cell =
    'flex size-[40px] shrink-0 items-center justify-center rounded-[10px] font-outfit text-[18px] font-semibold leading-[1.3] transition-colors desktop:size-[62px] desktop:rounded-[12px] desktop:text-[24px]'

const arrow =
    'flex size-[34px] shrink-0 items-center justify-center rounded-full border border-gold/45 bg-panel-glass text-white shadow-panel-inset backdrop-blur-panel transition-colors hover:border-gold disabled:opacity-40 desktop:size-12'

export const Pagination = ({ current, total, onChange }: PaginationProps) => (
    <div className="flex items-center justify-center gap-1 desktop:gap-[6px]">
        <button
            type="button"
            aria-label="Назад"
            disabled={current === 1}
            onClick={() => onChange(current - 1)}
            className={cn(arrow, 'mr-1 desktop:mr-3')}
        >
            <ChevronIcon className="size-9 -rotate-90 desktop:size-12" />
        </button>

        {buildPages(current, total).map((page, i) =>
            page === '...' ? (
                <span
                    key={`dots-${i}`}
                    className={cn(
                        cell,
                        'border border-gold/45 bg-panel-glass text-white shadow-panel-inset backdrop-blur-panel'
                    )}
                >
                    …
                </span>
            ) : (
                <button
                    key={page}
                    type="button"
                    onClick={() => onChange(page)}
                    className={cn(
                        cell,
                        page === current
                            ? 'bg-gradient-to-b from-gold-grad-from via-gold-grad-via via-[35%] to-[#8a6a1f] text-white shadow-badge-glow'
                            : 'border border-gold/45 bg-panel-glass text-white shadow-panel-inset backdrop-blur-panel'
                    )}
                >
                    {page}
                </button>
            )
        )}

        <button
            type="button"
            aria-label="Вперёд"
            disabled={current === total}
            onClick={() => onChange(current + 1)}
            className={cn(arrow, 'ml-1 desktop:ml-3')}
        >
            <ChevronIcon className="size-9 rotate-90 desktop:size-12" />
        </button>
    </div>
)
