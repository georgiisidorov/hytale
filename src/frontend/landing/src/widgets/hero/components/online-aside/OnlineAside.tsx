import { useServerStats } from '@/shared/lib/useServerStats'

import { ONLINE } from '@/shared/data/content'

import { GlassPanel, OnlineBadge } from '@/shared/ui'

export const OnlineAside = () => {
    const { onlinePlayers, registeredPlayers } = useServerStats(30_000)

    return (
        <GlassPanel corners className="w-full max-w-[404px] px-8 py-9 shadow-panel-inset">
            <OnlineBadge className="justify-center" />

            <p className="text-gold-grad mt-8 text-center font-cinzel text-big-number-mobile font-black desktop:text-big-number">
                {onlinePlayers === null || onlinePlayers === undefined
                    ? '—'
                    : onlinePlayers.toLocaleString('ru-RU')}
            </p>

            <p className="mt-2 text-center font-outfit text-[13px] tracking-[0.78px] text-ink-muted">
                Игроков онлайн прямо сейчас
            </p>

            <div className="mt-6 grid grid-cols-2 border-t border-gold/20 pt-5">
                <div className="text-center">
                    <p className="font-cinzel text-stat-sm font-bold text-accent">
                        {registeredPlayers === null || registeredPlayers === undefined
                            ? '—'
                            : registeredPlayers.toLocaleString('ru-RU')}
                    </p>
                    <p className="mt-1 font-outfit text-[11px] uppercase tracking-[1.76px] text-ink-dim">
                        Аккаунтов
                    </p>
                </div>
                <div className="border-l border-gold/20 text-center">
                    <p className="font-cinzel text-stat-sm font-bold text-accent">{ONLINE.clans}</p>
                    <p className="mt-1 font-outfit text-[11px] uppercase tracking-[1.76px] text-ink-dim">
                        кланов
                    </p>
                </div>
            </div>
        </GlassPanel>
    )
}
