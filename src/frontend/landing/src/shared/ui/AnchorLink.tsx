import type { ComponentPropsWithoutRef, MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useLenis } from 'lenis/react'

import { ROUTES } from '@/shared/config/site'

type AnchorLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, 'to'> & {
    to: string
}

const parseHash = (to: string) => {
    const index = to.indexOf('#')
    if (index === -1) return null
    const hash = to.slice(index)
    if (hash.length <= 1) return null
    const path = to.slice(0, index) || ROUTES.home
    return { path, hash }
}

export const AnchorLink = ({ to, onClick, ...rest }: AnchorLinkProps) => {
    const lenis = useLenis()
    const navigate = useNavigate()
    const location = useLocation()

    const target = parseHash(to)

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event)
        if (!target || event.defaultPrevented) return

        event.preventDefault()

        if (location.pathname === target.path) {
            lenis?.scrollTo(target.hash)
        } else {
            navigate(target.path, { state: { scrollTo: target.hash } })
        }
    }

    return <Link to={to} onClick={handleClick} {...rest} />
}
