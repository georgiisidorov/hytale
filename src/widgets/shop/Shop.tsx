import { useCallback, useEffect, useState } from 'react'

import useEmblaCarousel from 'embla-carousel-react'

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

    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'center',
        loop: false,
        containScroll: false
    })

    const [selectedIndex, setSelectedIndex] = useState(0)

    const scrollTo = useCallback(
        (index: number) => {
            emblaApi?.scrollTo(index)
        },
        [emblaApi]
    )

    useEffect(() => {
        if (!emblaApi) return

        const onSelect = () => {
            setSelectedIndex(emblaApi.selectedScrollSnap())
        }

        onSelect()
        emblaApi.on('select', onSelect)

        return () => {
            emblaApi.off('select', onSelect)
        }
    }, [emblaApi])

    const closeModal = useCallback(() => setTarget(null), [])

    return (
        <section id="shop" className="pt-12">
            <Container>
                <SectionLabel>Магазин</SectionLabel>

                <SectionTitle className="mt-5 text-center font-bold">
                    СтартерПак для <br />
                    <GoldText>Твоего героя</GoldText>
                </SectionTitle>

                <p className="mt-4 text-center font-outfit text-body-sm text-ink-muted">
                    Стартовые наборы, чтобы быстрее освоиться
                </p>

                <div className="flex flex-col gap-4 desktop:hidden">
                    <div ref={emblaRef} className="mt-16 overflow-hidden">
                        <div className="flex">
                            <div className="min-w-0 flex-[0_0_92%] px-2">
                                <LootboxCard
                                    onBuy={(withLicense) =>
                                        setTarget({
                                            kind: 'starterpack',
                                            header: 'Покупка стартерпака',
                                            eyebrow: LOOTBOX.eyebrow,
                                            title: withLicense
                                                ? `${LOOTBOX.title} + лицензия`
                                                : LOOTBOX.title,
                                            note: LOOTBOX.note,
                                            price: priceNumber(LOOTBOX.price),
                                            amount: priceNumber(LOOTBOX.price)
                                        })
                                    }
                                />
                            </div>

                            {SHOP_PLANS.map((plan) => (
                                <div key={plan.id} className="min-w-0 flex-[0_0_92%] px-2">
                                    <PlanCard
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
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-center gap-2">
                        {Array.from({
                            length: 1 + SHOP_PLANS.length
                        }).map((_, index) => (
                            <button
                                key={index}
                                type="button"
                                aria-label={`Перейти к слайду ${index + 1}`}
                                onClick={() => scrollTo(index)}
                                className={`size-2 rounded-full transition-all duration-300 ${
                                    selectedIndex === index ? 'scale-125 bg-gold' : 'bg-[#4A4A4A]'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-16 hidden items-start gap-card-pad desktop:grid desktop:grid-cols-3">
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
