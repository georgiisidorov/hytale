import { cn } from '@/shared/lib/cn'

import { Button, IconBox } from '@/shared/ui'

import BookIcon from '@/assets/icons/book.svg'
import CoinIcon from '@/assets/icons/coin.svg'

interface CurrencyTileProps {
    title: string
    text: string
    price: string
    cta: string
    variant: 'glass' | 'gold'
    onBuy: () => void
}

export const CurrencyTile = ({ title, text, price, cta, variant, onBuy }: CurrencyTileProps) => {
    const gold = variant === 'gold'

    return (
        <div
            className={cn(
                'flex flex-col gap-5 rounded-card border p-6 backdrop-blur-card desktop:flex-row desktop:items-center desktop:gap-6',
                gold ? 'border-gold-border bg-currency-gold' : 'border-gold/20 bg-card-feature'
            )}
        >
            <IconBox
                size="md"
                className={cn(
                    'shrink-0',
                    gold && 'border-gold-border bg-[#e2c16a] bg-none shadow-none'
                )}
            >
                {gold ? (
                    <BookIcon className="size-[22px] text-white" />
                ) : (
                    <CoinIcon className="size-[22px] text-gold" />
                )}
            </IconBox>

            <div className="flex-1">
                <h4 className="font-cinzel text-[18px] uppercase tracking-[1.5px] text-ink">
                    {title}
                </h4>
                <p
                    className={cn(
                        'mt-1 max-w-[434px] font-outfit text-[14px]',
                        gold ? 'text-white' : 'text-ink-muted'
                    )}
                >
                    {text}
                </p>
            </div>

            <p
                className={cn(
                    'font-cinzel text-[28px] font-black',
                    gold ? 'text-white' : 'text-gold-grad'
                )}
            >
                {price}
            </p>

            <Button
                variant={gold ? 'glass' : 'gold'}
                className="h-[52px] w-[170.72px] text-[13px]"
                onClick={onBuy}
            >
                {cta}
            </Button>
        </div>
    )
}
