import { Link } from 'react-router-dom'

import { formatDate } from '@/shared/lib/formatDate'

import { ROUTES } from '@/shared/config/site'

import { API_BASE_URL, type PostListItem } from '@/shared/api'

import ArrowLongIcon from '@/assets/icons/arrow-long.svg'

interface NewsListCardProps {
    item: PostListItem
}

const Corner = ({ className }: { className: string }) => (
    <span className={`absolute size-[14px] border-r border-t border-ink ${className}`} />
)

export const NewsListCard = ({ item }: NewsListCardProps) => (
    <article className="relative border border-gold/45 bg-gradient-to-b from-[rgba(22,23,36,0.85)] to-[rgba(10,10,15,0.85)] p-5 shadow-panel-inset backdrop-blur-panel">
        <Corner className="left-[3px] top-[3px] -scale-x-100" />
        <Corner className="right-[3px] top-[3px]" />
        <Corner className="bottom-[3px] right-[3px] -scale-y-100" />
        <Corner className="bottom-[3px] left-[3px] scale-x-[-1] scale-y-[-1]" />

        <div className="flex items-center justify-between">
            <h3 className="font-outfit text-[19px] leading-[1.3] text-white">{item.title}</h3>
        </div>

        <div className="relative mt-[18px] h-fit overflow-hidden shadow-panel-inset backdrop-blur-panel">
            <img
                src={`${API_BASE_URL}${item.preview_url}`}
                alt={item.title}
                className="size-full object-fill"
            />

            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />

            <span className="absolute right-2 top-[9px] inline-flex h-[29px] items-center rounded-badge border border-gold/[0.18] bg-[rgba(8,8,14,0.85)] px-3 font-outfit text-[11px] tracking-[1.1px] text-ink-muted">
                {formatDate(item.created_at)}
            </span>
        </div>
        <div className="mt-6 flex justify-end">
            <Link
                to={ROUTES.newsDetail(item.id)}
                className="inline-flex items-center gap-3 font-cinzel text-[12px] uppercase tracking-[2.88px] text-gold transition-colors hover:text-gold-light"
            >
                Читать далее
                <ArrowLongIcon className="h-3 w-[17px]" />
            </Link>
        </div>
    </article>
)
