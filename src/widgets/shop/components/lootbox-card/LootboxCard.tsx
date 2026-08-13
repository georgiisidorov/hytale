import { useState } from 'react'

import { cn } from '@/shared/lib/cn'

import { LOOTBOX } from '@/shared/data/content'

import { Button, Chip } from '@/shared/ui'

import CheckIcon from '@/assets/icons/check.svg'
import InfoIcon from '@/assets/icons/info.svg'

interface LootboxCardProps {
    onBuy: (withLicense: boolean) => void
}

export const LootboxCard = ({ onBuy }: LootboxCardProps) => {
    const [license] = useState(false)

    return (
        <div className="relative flex min-h-full flex-col rounded-card border border-gold/20 bg-card-feature p-card-pad-inner backdrop-blur-card desktop:min-h-[620px]">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-divider-blue opacity-60" />
            {/* <InfoIcon className="absolute right-4 top-3 size-[17.5px]" /> */}

            <div className="absolute -top-[68px] right-0 hidden h-[52px] w-[176px] items-center rounded-card border border-gold/20 bg-card-feature px-5 backdrop-blur-card desktop:flex">
                <span className="w-[135px] font-outfit text-[14px] leading-[1.2] text-ink">
                    доступна разовая покупка на аккаунт
                </span>
            </div>

            <span className="font-cinzel text-[12px] uppercase leading-[18.6px] tracking-[4.8px] text-gold">
                {LOOTBOX.eyebrow}
            </span>
            <h3 className="mt-4 font-cinzel text-h3-lg font-bold uppercase text-ink">
                {LOOTBOX.title}
            </h3>
            <p className="mt-3 font-cinzel text-price font-black text-ink">{LOOTBOX.price}</p>
            <p className="mt-3 font-outfit text-[13px] tracking-[1.3px] text-ink-dim">
                {LOOTBOX.note}
            </p>

            <div className="mt-5 flex flex-wrap gap-[6px] border-b border-gold/[0.18] pb-5">
                {LOOTBOX.chips.map((chip) => (
                    <Chip key={chip.label} variant={chip.variant}>
                        {chip.label}
                    </Chip>
                ))}
            </div>

            <ul className="mt-6 flex flex-col">
                {LOOTBOX.features.map((feature, i) => (
                    <li
                        key={feature.strong}
                        className={cn(
                            'flex items-baseline gap-3 py-2.5',
                            i < LOOTBOX.features.length - 1 &&
                                'border-b border-dashed border-gold/[0.08]'
                        )}
                    >
                        <CheckIcon className="size-3 shrink-0 translate-y-0.5 text-gold/85 desktop:size-3.5" />
                        <span className="font-outfit text-[11px] text-ink desktop:text-[14px]">
                            {feature.strong}
                        </span>
                        <span className="font-outfit text-[11px] text-ink-muted desktop:text-[14px]">
                            {feature.rest}
                        </span>
                    </li>
                ))}
            </ul>

            <div className="mt-auto">
                <Button
                    variant="glass"
                    className="mt-6 h-[52px] w-full text-[13px]"
                    onClick={() => onBuy(license)}
                >
                    {LOOTBOX.cta}
                </Button>
            </div>

            {/* <button
                type="button"
                role="switch"
                aria-checked={license}
                onClick={() => setLicense((v) => !v)}
                className="mt-5 flex items-center gap-3"
            >
                <span className="relative h-[26px] w-[55px] rounded-full bg-[rgba(57,61,88,0.5)] backdrop-blur-card">
                    <span
                        className={cn(
                            'absolute top-0 size-[26px] rounded-full bg-btn-gold transition-all',
                            license ? 'left-[29px]' : 'left-0'
                        )}
                    />
                </span>
                <span className="font-cinzel text-[16px] text-ink">лицензия</span>
            </button> */}
        </div>
    )
}
