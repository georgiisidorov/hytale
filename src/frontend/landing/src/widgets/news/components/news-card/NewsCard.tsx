import { Link } from 'react-router-dom'

import { formatDate } from '@/shared/lib/formatDate'

import { ROUTES } from '@/shared/config/site'

import { API_BASE_URL, type PostListItem } from '@/shared/api'

import ArrowRightIcon from '@/assets/icons/arrow-right.svg'

interface NewsCardProps {
    item: PostListItem
}

export const NewsCard = ({ item }: NewsCardProps) => (
    <article className="relative flex flex-col overflow-hidden rounded-card border border-gold/20 bg-gradient-to-b from-[rgba(22,23,36,0.7)] to-[rgba(8,8,14,0.85)]">
        <div className="relative h-[200px] border-b border-gold/20 desktop:h-[308px]">
            <img
                src={`${API_BASE_URL}${item.preview_url}`}
                alt={item.title}
                className="size-full object-fill"
            />

            <span className="absolute right-4 top-4 rounded-badge border border-gold/20 bg-[rgba(8,8,14,0.85)] px-3 py-1.5 font-outfit text-[11px] tracking-[1.1px] text-ink-muted">
                {formatDate(item.created_at)}
            </span>
        </div>

        <div className="flex flex-1 flex-col p-card-pad-inner">
            <h3 className="font-cinzel text-[22px] font-bold tracking-[1.32px] text-ink">
                {item.title}
            </h3>

            <Link
                to={ROUTES.newsDetail(item.id)}
                className="mt-6 inline-flex items-center gap-2 font-cinzel text-[12px] uppercase tracking-[2.88px] text-gold transition-colors hover:text-gold-light"
            >
                Читать далее
                <ArrowRightIcon className="size-3.5" />
            </Link>
        </div>
    </article>
)
