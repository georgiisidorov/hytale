import { Link, useLocation } from 'react-router-dom'

import { useLenis } from 'lenis/react'

import { ROUTES, SITE } from '@/shared/config/site'

import { Button, Container, GoldText, SectionLabel } from '@/shared/ui'

export const Join = () => {
    const lenis = useLenis()
    const { pathname } = useLocation()
    const isHowToConnect = ROUTES.howToConnect === pathname

    if (isHowToConnect) return null

    return (
        <section id="about" className="join-bg relative border-t border-gold/[0.18]">
            <span className="pointer-events-none absolute inset-x-0 top-[60px] h-px bg-divider-gold opacity-50 desktop:top-[93px]" />

            <Container className="py-24 text-center desktop:py-28">
                <SectionLabel>Присоединяйся</SectionLabel>

                <h2 className="mx-auto mt-6 font-cinzel text-[36px] font-bold uppercase leading-[39.6px] tracking-[1.44px] text-ink desktop:text-[64px] desktop:leading-[70.4px] desktop:tracking-[2.56px]">
                    Место у огня
                    <br />
                    <GoldText>уже готово</GoldText>
                </h2>

                <p className="mx-auto mt-6 max-w-[700px] font-outfit text-[18px] leading-[27.9px] text-ink-muted">
                    Эльдхейм открывается в августе. Регистрация — меньше минуты, а участок в деревне
                    ждёт тебя с первого входа. Заходи, кем бы ты ни был и откуда бы ни играл.
                </p>

                <div className="mt-9 flex flex-col items-center justify-center gap-4 desktop:flex-row">
                    <Button
                        as={Link}
                        to={ROUTES.howToConnect}
                        className="h-16 w-full px-0 text-[14px] desktop:w-auto desktop:px-7"
                    >
                        Как подключиться ?
                    </Button>
                    <Button
                        variant="glass"
                        onClick={() => lenis?.scrollTo('#shop')}
                        as={Link}
                        to={ROUTES.howToConnect}
                        className="h-16 w-full px-7 text-[14px] desktop:w-auto"
                    >
                        НАЧАТЬ ИГРУ
                    </Button>
                </div>

                <p className="mt-8 text-[13px] tracking-[1.04px]">
                    <span className="font-outfit text-ink-dim">IP: </span>
                    <span className="font-cinzel text-gold">{SITE.ip}</span>
                    <span className="mx-2 font-outfit text-gold-deep">·</span>
                    <span className="font-outfit text-ink-dim">Версия: </span>
                    <span className="font-outfit text-ink-muted">{SITE.version}</span>
                </p>
            </Container>
        </section>
    )
}
