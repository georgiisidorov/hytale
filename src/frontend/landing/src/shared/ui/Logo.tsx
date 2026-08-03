import { Link } from 'react-router-dom'

import { cn } from '@/shared/lib/cn'

import { ROUTES } from '@/shared/config/site'

import LogoWithName from '@/assets/icons/logo-with-name.svg'

interface LogoProps {
    className?: string
}

export const Logo = ({ className }: LogoProps) => (
    <Link to={ROUTES.home} className={cn('flex items-center gap-3', className)}>
        <LogoWithName width={96} height={96} />
    </Link>
)
