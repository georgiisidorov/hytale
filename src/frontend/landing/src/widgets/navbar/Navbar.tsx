import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useServerStats } from '@/shared/lib/useServerStats'

import { NAV_LINKS } from '@/shared/config/site'

import { AnchorLink, Button, Container, Logo } from '@/shared/ui'

import { MobileMenu } from './components'

export const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false)
    const { onlinePlayers } = useServerStats(30_000)

    return (
        <header className="absolute inset-x-0 top-0 z-40">
            <Container className="flex h-[90px] items-center gap-6">
                <Logo className="shrink-0" />

                <nav className="no-scrollbar hidden min-w-0 flex-1 items-center gap-7 overflow-x-auto desktop:flex">
                    {NAV_LINKS.map((link) => (
                        <AnchorLink
                            key={link.label}
                            to={link.href}
                            className="shrink-0 whitespace-nowrap font-outfit text-nav uppercase text-ink-muted transition-colors hover:text-gold"
                        >
                            {link.label}
                        </AnchorLink>
                    ))}
                </nav>

                <div className="hidden shrink-0 items-center gap-3 desktop:flex">
                    <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-[4px] bg-online" />
                        <span className="font-outfit text-[12px] tracking-[1.2px] text-ink-muted">
                            ОНЛАЙН
                        </span>
                    </div>
                    <span className="font-outfit text-[12px] font-semibold tracking-[1.2px] text-ink">
                        {onlinePlayers === null || onlinePlayers === undefined
                            ? '—'
                            : onlinePlayers.toLocaleString('ru-RU')}
                    </span>
                </div>

                <Button
                    as={Link}
                    to="#"
                    className="hidden h-[54px] shrink-0 whitespace-nowrap px-7 text-[13px] desktop:inline-flex"
                >
                    Играть бесплатно
                </Button>

                <button
                    type="button"
                    aria-label="Меню"
                    onClick={() => setMenuOpen(true)}
                    className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-btn border border-gold/15 desktop:hidden"
                >
                    <span className="flex w-[18px] flex-col gap-[5px]">
                        <span className="h-0.5 w-full bg-ink" />
                        <span className="h-0.5 w-full bg-ink" />
                        <span className="h-0.5 w-full bg-ink" />
                    </span>
                </button>
            </Container>

            <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        </header>
    )
}
