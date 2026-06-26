import { Link } from 'react-router-dom'

import { ROUTES } from '@/shared/config/site'

import { Button, Container, Eyebrow } from '@/shared/ui'

import bgHero from '@/assets/hero-bg.png'

import { OnlineAside } from './components'

const TAGS = ['PvE', 'PvP', 'Фарминг', 'Кланы', 'Квесты']

export const Hero = () => (
    <section className="hero-bg relative overflow-hidden pb-14 pt-[148px] desktop:pb-40 desktop:pt-[160px]">
        <img
            src={bgHero}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full object-cover"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[360px] bg-gradient-to-b from-transparent to-bg-bottom/90" />

        <Container className="relative grid grid-cols-1 items-start gap-12 desktop:grid-cols-[1fr_auto]">
            <div>
                <div className="flex items-center gap-4">
                    <span className="h-px w-12 bg-divider-gold-r" />
                    <Eyebrow>Hytale Server · с 2025</Eyebrow>
                </div>

                <p className="mt-8 font-cinzel text-logo-mobile font-bold uppercase text-ink-muted desktop:text-logo">
                    Hytale
                </p>

                <h1 className="mt-4 font-cinzel text-h1-mobile font-black uppercase leading-[1.05] desktop:text-h1">
                    <span className="text-gold-grad">CastleWar</span>
                    <br />
                    <span className="text-ink">Эпоха</span>
                    <br />
                    <span className="text-ink">битв</span>
                </h1>

                <div className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-1 font-cinzel text-tag uppercase text-ink">
                    {TAGS.map((tag, i) => (
                        <span key={tag} className="flex items-center gap-2">
                            {i > 0 && <span className="text-gold">·</span>}
                            {tag}
                        </span>
                    ))}
                </div>

                <p className="mt-7 max-w-[589px] font-outfit text-body text-ink-muted">
                    Окунись в мир сражений и фарминга. Совместные локации, лабиринты, клановые войны
                    и сотни квестов — всё на одном сервере. Создавайте игровое сообщество вместе с
                    нами.
                </p>

                <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                    <Button as={Link} to="#" className="h-16 px-9 text-[14px]">
                        Начать играть
                    </Button>
                    <Button
                        variant="glass"
                        as={Link}
                        to={ROUTES.howToConnect}
                        className="h-16 px-9 text-[14px]"
                    >
                        Как подключиться
                    </Button>
                </div>
            </div>

            <div className="desktop:pt-1">
                <OnlineAside />
            </div>
        </Container>

        <div className="relative z-10 flex flex-col items-center gap-3 pb-7 pt-6 desktop:pb-14 desktop:pt-20">
            <span className="font-cinzel text-[11px] uppercase tracking-[3.3px] text-ink-dim">
                Прокрути
            </span>
            <span className="h-9 w-px bg-gradient-to-b from-gold to-transparent" />
        </div>
    </section>
)
