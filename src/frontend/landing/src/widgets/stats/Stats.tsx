import { useServerStats } from '@/shared/lib/useServerStats'

import { STATS } from '@/shared/data/content'

import { Container, GlassPanel, GoldText, SectionLabel, SectionTitle } from '@/shared/ui'

export const Stats = () => {
    const { onlinePlayers, registeredPlayers } = useServerStats(30_000)

    const liveValue: Record<string, number | null> = {
        'Игроков онлайн': onlinePlayers,
        'Персонажей создано': registeredPlayers
    }

    return (
        <section id="stats">
            <Container>
                <SectionLabel>Живая статистика</SectionLabel>
                <SectionTitle className="mt-5 text-center">
                    Сервер в <GoldText>цифрах</GoldText>
                </SectionTitle>

                <GlassPanel
                    variant="stat"
                    className="mt-12 grid grid-cols-1 divide-y divide-gold/20 overflow-hidden desktop:grid-cols-4 desktop:divide-x desktop:divide-y-0"
                >
                    {STATS.map((stat) => {
                        const live = liveValue[stat.label]
                        const value =
                            live === undefined
                                ? stat.value
                                : live === null
                                  ? '—'
                                  : live.toLocaleString('ru-RU')

                        return (
                            <div key={stat.label} className="px-6 py-12 text-center">
                                <p className="text-gold-grad font-cinzel text-[40px] font-black leading-none desktop:text-stat">
                                    {value}
                                </p>
                                <p className="mt-5 font-cinzel text-label-sm uppercase text-ink-muted">
                                    {stat.label}
                                </p>
                                <p className="mt-1 font-outfit text-[12px] tracking-[0.96px] text-ink-dim">
                                    {stat.sub}
                                </p>
                            </div>
                        )
                    })}
                </GlassPanel>
            </Container>
        </section>
    )
}
