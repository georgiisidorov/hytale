import {
    FOOTER_COLUMNS,
    FOOTER_DESCRIPTION,
    LEGAL_LINKS,
    LEGAL_REQUISITES,
    SITE
} from '@/shared/config/site'

import { AnchorLink, Container, Logo } from '@/shared/ui'

export const Footer = () => (
    <footer className="relative bg-[#04040a]">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-divider-gold opacity-50" />

        <Container className="grid grid-cols-1 gap-12 py-16 desktop:grid-cols-4 desktop:gap-8">
            <div className="max-w-[322px]">
                <Logo />
                <p className="mt-5 font-outfit text-[14px] leading-[21.7px] text-ink-dim">
                    {FOOTER_DESCRIPTION}
                </p>
                <div className="mt-5 flex flex-col gap-0.5">
                    {LEGAL_REQUISITES.map((line) => (
                        <p
                            key={line}
                            className="font-outfit text-[12px] leading-[18px] text-ink-dim"
                        >
                            {line}
                        </p>
                    ))}
                </div>
            </div>

            {FOOTER_COLUMNS.map((col) => (
                <div key={col.title}>
                    <h4 className="font-cinzel text-[12px] font-bold uppercase tracking-[3.6px] text-gold">
                        {col.title}
                    </h4>
                    <ul className="mt-6 flex flex-col gap-[17px]">
                        {col.links.map((link) => (
                            <li key={link.label}>
                                <AnchorLink
                                    to={link.href}
                                    className="font-outfit text-[14px] text-ink-muted transition-colors hover:text-gold"
                                >
                                    {link.label}
                                </AnchorLink>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </Container>

        <Container>
            <div className="flex flex-col items-center gap-4 border-t border-gold/[0.18] py-8 text-center desktop:flex-row desktop:justify-between desktop:text-left">
                <p className="font-outfit text-[12px] tracking-[0.96px] text-ink-dim">
                    © {SITE.copyrightYear} Hytale CastleWar. Все права защищены.
                </p>
                <div className="flex gap-8">
                    {LEGAL_LINKS.map((link) => (
                        <AnchorLink
                            key={link.label}
                            to={link.href}
                            className="font-outfit text-[12px] text-ink-dim transition-colors hover:text-gold"
                        >
                            {link.label}
                        </AnchorLink>
                    ))}
                </div>
            </div>
        </Container>
    </footer>
)
