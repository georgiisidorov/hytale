import { cn } from '@/shared/lib/cn'

import type { ShopPlan } from '@/shared/data/content'

import { Button, Chip, CornerBorders } from '@/shared/ui'

import CheckIcon from '@/assets/icons/check.svg'
import InfoIcon from '@/assets/icons/info.svg'

interface PlanCardProps {
    plan: ShopPlan
    onBuy: (plan: ShopPlan) => void
}

export const PlanCard = ({ plan, onBuy }: PlanCardProps) => {
    const blue = plan.accent === 'blue'
    const violet = plan.accent === 'violet'
    const lazure = plan.accent === 'lazure'
    const green = plan.accent === 'green'

    return (
        <div
            className={cn(
                'relative flex min-h-full flex-col rounded-card border p-card-pad-inner backdrop-blur-card desktop:min-h-[620px]',
                plan.popular ? 'border-gold/45 bg-card-popular' : 'border-gold/20 bg-card-feature'
            )}
        >
            {plan.popular ? (
                <>
                    <div className="absolute inset-x-0 top-0 h-[3px] bg-divider-gold opacity-90 shadow-badge-glow" />
                    <CornerBorders />
                </>
            ) : blue ? (
                <div className="absolute inset-x-0 top-0 h-0.5 bg-divider-blue opacity-60" />
            ) : violet ? (
                <div className="absolute inset-x-0 top-0 h-0.5 bg-divider-violet opacity-60" />
            ) : lazure ? (
                <div className="absolute inset-x-0 top-0 h-0.5 bg-divider-lazure opacity-60" />
            ) : green ? (
                <div className="absolute inset-x-0 top-0 h-0.5 bg-divider-green opacity-60" />
            ) : null}

            {/* <InfoIcon className="absolute right-4 top-3 size-[17.5px]" /> */}

            {plan.popular && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <div className="rounded-badge border border-gold-border bg-btn-gold px-4 py-2 text-center font-cinzel text-[11px] uppercase leading-tight tracking-[3.3px] text-ink-dark shadow-badge-glow">
                        {plan.badge}
                    </div>
                </div>
            )}

            <span className="font-cinzel text-[12px] uppercase leading-[18.6px] tracking-[4.8px] text-gold">
                {plan.eyebrow}
            </span>
            <h3 className="mt-4 font-cinzel text-h3-lg font-bold uppercase text-ink">
                {plan.title}
            </h3>

            <p
                className={cn(
                    'mt-3 font-cinzel text-price font-black',
                    plan.popular ? 'text-gold-grad' : 'text-ink'
                )}
            >
                {plan.price}
                {plan.period && (
                    <span className="ml-2 font-cinzel text-[18px] font-normal text-ink-dim">
                        {plan.period}
                    </span>
                )}
            </p>
            <p className="mt-3 font-outfit text-[13px] tracking-[1.3px] text-ink-dim">
                {plan.note}
            </p>

            {plan.chips && (
                <div className="mt-5 flex flex-wrap gap-[6px] border-b border-gold/[0.18] pb-5">
                    {plan.chips.map((chip) => (
                        <Chip key={chip.label} variant={chip.variant}>
                            {chip.label}
                        </Chip>
                    ))}
                </div>
            )}

            <ul className="mt-6 flex flex-col border-t border-gold/20">
                {plan.features.map((feature, i) => (
                    <li
                        key={feature.strong}
                        className={cn(
                            'flex items-baseline gap-3 py-2.5',
                            i < plan.features.length - 1 &&
                                'border-b border-dashed border-gold/[0.08]'
                        )}
                    >
                        <CheckIcon className="size-3 shrink-0 translate-y-0.5 text-gold/85 desktop:size-3.5" />
                        <span className="font-outfit text-[11px] text-ink desktop:text-[14px]">
                            {feature.strong}
                        </span>
                        {feature.rest && (
                            <span className="font-outfit text-[11px] text-ink-muted desktop:text-[14px]">
                                {feature.rest}
                            </span>
                        )}
                    </li>
                ))}
            </ul>

            <Button
                variant={
                    blue ? 'blue' : violet ? 'violet' : lazure ? 'lazure' : green ? 'green' : 'gold'
                }
                className="mt-auto h-[52px] w-full text-[13px]"
                onClick={() => onBuy(plan)}
            >
                {plan.cta}
            </Button>
        </div>
    )
}
