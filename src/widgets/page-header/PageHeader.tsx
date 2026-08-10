import { Link } from 'react-router-dom'

import { Container, Divider } from '@/shared/ui'

interface PageHeaderProps {
    titleGold?: string
    titleInk: string
    backTo: string
    backLabel?: string
    eyebrow?: string
    aside?: React.ReactNode
}

export const PageHeader = ({
    titleGold,
    titleInk,
    backTo,
    backLabel = 'Назад',
    eyebrow,
    aside
}: PageHeaderProps) => (
    <Container className="pt-[140px] desktop:pt-[170px]">
        <Link
            to={backTo}
            className="inline-flex items-center gap-2 font-cinzel text-[11px] uppercase tracking-[3.3px] text-ink-dim transition-colors hover:text-gold"
        >
            ‹ {backLabel}
        </Link>

        <div className="mt-8 flex flex-col items-start justify-between gap-8 desktop:flex-row desktop:items-end">
            <div>
                {eyebrow && (
                    <p className="text-gold-grad font-cinzel text-[28px] font-black uppercase desktop:text-[40px]">
                        {eyebrow}
                    </p>
                )}
                {titleGold && (
                    <h1 className="text-gold-grad font-cinzel text-[40px] font-black uppercase leading-[1.05] desktop:text-[56px]">
                        {titleGold}
                    </h1>
                )}
                <h1 className="font-cinzel text-[28px] font-bold uppercase text-ink desktop:text-[36px]">
                    {titleInk}
                </h1>
            </div>
            {aside}
        </div>

        <Divider tone="gold" className="mt-8" />
    </Container>
)
