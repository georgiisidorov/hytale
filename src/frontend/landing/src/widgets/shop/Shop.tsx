import { useCallback, useState } from 'react'

import { CURRENCY_TILES, LOOTBOX, SHOP_PLANS } from '@/shared/data/content'

import { Container, GoldText, SectionLabel, SectionTitle } from '@/shared/ui'

import BookIcon from '@/assets/icons/book.svg'
import CoinIcon from '@/assets/icons/coin.svg'

import {
    CurrencyTile,
    LootboxCard,
    PlanCard,
    PurchaseModal,
    type PurchaseTarget
} from './components'

const priceNumber = (price: string) => price.replace(/[^\d\s]/g, '').trim()

export const Shop = () => {
    const [target, setTarget] = useState<PurchaseTarget | null>(null)
    const closeModal = useCallback(() => setTarget(null), [])

    return (
        <section id="shop" className="pt-20">
            <Container>
                <SectionLabel>Магазин</SectionLabel>
                <SectionTitle className="mt-5 text-center font-bold">
                    СтартерПак для <br />
                    <GoldText>Твоего героя</GoldText>
                </SectionTitle>
                <p className="mt-4 text-center font-outfit text-body-sm text-ink-muted">
                    Стартовые наборы, чтобы быстрее освоиться
                </p>

                <div className="mt-16 grid grid-cols-1 items-start gap-card-pad desktop:grid-cols-3">
                    <LootboxCard
                        onBuy={(withLicense) =>
                            setTarget({
                                kind: 'starterpack',
                                header: 'Покупка стартерпака',
                                eyebrow: LOOTBOX.eyebrow,
                                title: withLicense ? `${LOOTBOX.title} + лицензия` : LOOTBOX.title,
                                note: LOOTBOX.note,
                                price: priceNumber(LOOTBOX.price),
                                amount: priceNumber(LOOTBOX.price)
                            })
                        }
                    />
                    {SHOP_PLANS.map((plan) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            onBuy={(p) =>
                                setTarget({
                                    kind: 'starterpack',
                                    header: 'Покупка стартерпака',
                                    eyebrow: p.eyebrow,
                                    title: p.title,
                                    note: p.note,
                                    price: priceNumber(p.price),
                                    amount: priceNumber(p.price)
                                })
                            }
                        />
                    ))}
                </div>

                <div className="mt-card-pad flex flex-col gap-4">
                    {CURRENCY_TILES.map((tile) => {
                        const gold = tile.variant === 'gold'
                        return (
                            <CurrencyTile
                                key={tile.title}
                                title={tile.title}
                                text={tile.text}
                                price={tile.price}
                                cta={tile.cta}
                                variant={tile.variant}
                                isLink={true}
                                onBuy={() =>
                                    setTarget({
                                        kind: 'currency',
                                        header: 'Покупка игровой валюты',
                                        title: tile.title,
                                        note: 'Покупай предметы и ресурсы, торговля с игроками и улучшай экипировку',
                                        price: priceNumber(tile.price),
                                        item: (
                                            <>
                                                <span className="font-outfit text-[18px] font-medium text-[#bebebe]">
                                                    {tile.title}
                                                </span>
                                                {gold ? (
                                                    <BookIcon className="size-[20px] text-gold" />
                                                ) : (
                                                    <CoinIcon className="size-[20px] text-gold" />
                                                )}
                                            </>
                                        ),
                                        icon: gold ? (
                                            <BookIcon className="size-[40px]" />
                                        ) : (
                                            <CoinIcon className="size-[40px] text-gold" />
                                        )
                                    })
                                }
                            />
                        )
                    })}
                </div>
            </Container>

            <PurchaseModal target={target} onClose={closeModal} />
        </section>
    )
}
