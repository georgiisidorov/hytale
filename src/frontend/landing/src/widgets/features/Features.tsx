import { FEATURES } from '@/shared/data/content'

import { Container, GoldText, SectionLabel, SectionTitle } from '@/shared/ui'

import ClanIcon from '@/assets/icons/clan.svg'
import FarmIcon from '@/assets/icons/farm.svg'
import HomeIcon from '@/assets/icons/home.svg'
import QuestIcon from '@/assets/icons/quest.svg'
import SwordIcon from '@/assets/icons/sword.svg'
import TrophyIcon from '@/assets/icons/trophy.svg'

import { FeatureCard } from './components'

const ICONS = [SwordIcon, FarmIcon, QuestIcon, ClanIcon, HomeIcon, TrophyIcon]

export const Features = () => (
    <section id="features" className="pb-20">
        <Container>
            <SectionLabel>Что внутри</SectionLabel>
            <SectionTitle className="mt-5 text-center">
                Что тебя <GoldText>ждёт</GoldText>
            </SectionTitle>
            <p className="mx-auto mt-4 max-w-[749px] text-center font-outfit text-body-sm text-ink-muted">
                Эльдхейм — это дом и деревня, живое комьюнити и ивенты. А кто хочет борьбы — честные
                PvP-сезоны и кланы. Всё в одном клиенте Hytale.
            </p>

            <div className="mt-14 grid grid-cols-1 gap-card-pad sm:grid-cols-2 desktop:grid-cols-3">
                {FEATURES.map((feature, i) => {
                    const Icon = ICONS[i]
                    return (
                        <FeatureCard
                            key={feature.title}
                            title={feature.title}
                            text={feature.text}
                            tags={feature.tags}
                            icon={<Icon className="size-7" />}
                        />
                    )
                })}
            </div>
        </Container>
    </section>
)
