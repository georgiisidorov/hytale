import { Link } from 'react-router-dom'

import { cn } from '@/shared/lib/cn'

import { ROUTES } from '@/shared/config/site'

import SwordsIcon from '@/assets/icons/swords.svg'

import { IconBox } from './IconBox'

interface LogoProps {
    className?: string
}

export const Logo = ({ className }: LogoProps) => (
    <Link to={ROUTES.home} className={cn('flex items-center gap-3', className)}>
        <IconBox size="sm">
            <SwordsIcon className="size-5" />
        </IconBox>
        <span className="font-cinzel text-[19px] font-black uppercase tracking-[3.42px] text-ink">
            Castle<span className="text-gold">War</span>
        </span>
    </Link>
)
