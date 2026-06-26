import { type ReactNode, useEffect, useState } from 'react'

import { cn } from '@/shared/lib/cn'

import { Button } from '@/shared/ui'

import CloseIcon from '@/assets/icons/close.svg'
import ImagePlaceholderIcon from '@/assets/icons/image-placeholder.svg'
import ShieldIcon from '@/assets/icons/shield.svg'

export interface StarterpackTarget {
    kind: 'starterpack'
    header: string
    eyebrow: string
    title: string
    note: string
    price: string
    amount: string
}

export interface CurrencyTarget {
    kind: 'currency'
    header: string
    title: string
    note: string
    price: string
    item: ReactNode
    icon: ReactNode
}

export type PurchaseTarget = StarterpackTarget | CurrencyTarget

interface PurchaseModalProps {
    target: PurchaseTarget | null
    onClose: () => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const sectionLabel =
    'font-cinzel text-[18px] font-bold uppercase tracking-[3.84px] leading-[18.6px] text-gold-grad'

const fieldShell =
    'h-[58px] w-full rounded-b-[4px] bg-[#1e2031] border border-gold/[0.18] backdrop-blur-card px-[21px] font-outfit text-[18px] font-medium text-[#bebebe] placeholder:text-[#bebebe] focus:outline-none focus:border-gold/45'

const hintClass = 'mt-[18px] font-outfit text-[16px] text-ink-dim'

const previewBox =
    'flex h-[152px] w-[130px] items-center justify-center rounded-[4px] bg-[#23253F] text-gold'

const Divider = () => <div className="h-px w-full bg-divider-gold" />

const Header = ({ text, onClose }: { text: string; onClose: () => void }) => (
    <div className="relative flex h-[68px] items-center justify-center">
        <span className="text-gold-grad font-cinzel text-[12px] font-bold uppercase leading-[18.6px] tracking-[3.84px]">
            {text}
        </span>
        <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="absolute right-[18px] top-[17px] flex size-[29px] items-center justify-center rounded-full border border-ink-dim text-ink-dim transition-colors hover:border-ink hover:text-ink"
        >
            <CloseIcon className="size-[11px] text-white" />
        </button>
    </div>
)

export const PurchaseModal = ({ target, onClose }: PurchaseModalProps) => {
    const [shown, setShown] = useState<PurchaseTarget | null>(target)
    const [prevTarget, setPrevTarget] = useState(target)
    const [login, setLogin] = useState('')
    const [password, setPassword] = useState('')
    const [email, setEmail] = useState('')
    const [checked, setChecked] = useState(false)

    if (target !== prevTarget) {
        setPrevTarget(target)
        if (target) {
            setShown(target)
            setLogin('')
            setPassword('')
            setEmail('')
            setChecked(false)
        }
    }

    useEffect(() => {
        if (!target) return
        const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        document.addEventListener('keydown', onEsc)
        const { documentElement } = document
        documentElement.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onEsc)
            documentElement.style.overflow = ''
        }
    }, [target, onClose])

    const data = target ?? shown
    const needsPassword = data?.kind === 'currency'
    const loginValid = login.trim().length > 0
    const passwordValid = !needsPassword || password.trim().length > 0
    const emailValid = EMAIL_RE.test(email)
    const canPay = loginValid && passwordValid && emailValid

    const handleSubmit = () => {
        if (!canPay || !data) return
        onClose()
    }

    return (
        <div
            className={cn(
                'fixed inset-0 z-[60] overflow-y-auto',
                target ? 'pointer-events-auto' : 'pointer-events-none'
            )}
            aria-hidden={!target}
            data-lenis-prevent
        >
            <div
                className={cn(
                    'fixed inset-0 bg-bg-top/80 backdrop-blur-sm transition-opacity duration-300',
                    target ? 'opacity-100' : 'opacity-0'
                )}
                onClick={onClose}
            />

            <div className="flex min-h-full items-center justify-center p-4" onClick={onClose}>
                <div
                    className={cn(
                        'relative w-full max-w-[647px] rounded-[4px] border border-gold/[0.18] bg-stat-glass shadow-panel transition-all duration-300',
                        target ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    {data && (
                        <>
                            <div>
                                <Header text={data.header} onClose={onClose} />
                                <Divider />
                            </div>

                            <div className="px-[56px]">
                                {data.kind === 'starterpack' ? (
                                    <div className="flex items-start gap-[40px] pt-[44px]">
                                        <div className={cn(previewBox, 'shrink-0')}>
                                            <ImagePlaceholderIcon className="size-[40px]" />
                                        </div>
                                        <div className="pt-[16px]">
                                            <p className="font-outfit text-[17px] uppercase tracking-[1.53px] text-ink-muted">
                                                {data.eyebrow}
                                            </p>
                                            <h3 className="mt-[8px] font-cinzel text-[45px] font-bold uppercase leading-[1.2] tracking-[2.25px] text-[#e8e6df]">
                                                {data.title}
                                            </h3>
                                            <p className="mt-[10px] font-outfit text-[16px] leading-[24.8px] text-ink-muted">
                                                {data.note}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center pt-[28px] text-center">
                                        <div className={previewBox}>{data.icon}</div>
                                        <h3 className="mt-[24px] font-cinzel text-[45px] font-bold uppercase leading-[1.2] tracking-[2.25px] text-[#e8e6df]">
                                            {data.title}
                                        </h3>
                                        <p className="mt-[16px] max-w-[410px] font-outfit text-[21px] leading-[1.3] text-ink-muted">
                                            {data.note}
                                        </p>
                                    </div>
                                )}

                                {data.kind === 'currency' && (
                                    <>
                                        <div className="flex items-center gap-[14px] py-[40px]">
                                            <div className="h-px flex-1 bg-divider-gold-r" />
                                            <div className="size-[30px] rotate-45 rounded-[5px] bg-gold-grad" />
                                            <div className="h-px flex-1 rotate-180 bg-divider-gold-r" />
                                        </div>
                                        <div className="flex gap-[20px]">
                                            <div className="flex h-[52px] flex-1 items-center justify-between rounded-b-[4px] border border-gold/[0.18] bg-[#1e2031] px-[21px] backdrop-blur-card">
                                                {data.item}
                                            </div>
                                            <div className="flex h-[52px] w-[175px] items-center justify-between rounded-b-[4px] border border-gold/[0.18] bg-[#1e2031] px-[18px] backdrop-blur-card">
                                                <span className="text-gold-grad font-cinzel text-[23px]">
                                                    {data.price}
                                                </span>
                                                <span className="text-gold-grad font-cinzel text-[23px]">
                                                    ₽
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {data.kind === 'starterpack' && (
                                    <div className="pt-[41px]">
                                        <Divider />
                                    </div>
                                )}

                                <div className="pt-[41px]">
                                    <span className={sectionLabel}>логин в игре</span>
                                    <div className="mt-[19px] flex gap-[20px]">
                                        <input
                                            value={login}
                                            onChange={(e) => {
                                                setLogin(e.target.value)
                                                setChecked(false)
                                            }}
                                            className={cn(fieldShell, 'min-w-0 flex-1')}
                                            placeholder="Введите логин вашего персонажа"
                                        />
                                        <button
                                            type="button"
                                            disabled={!loginValid}
                                            onClick={() => setChecked(true)}
                                            className="text-gold-grad h-[58px] w-[175px] shrink-0 rounded-b-[4px] border border-gold-grad-from font-cinzel text-[12px] font-bold uppercase tracking-[3.84px] backdrop-blur-card transition-colors hover:bg-gold/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {checked ? 'готово' : 'проверить'}
                                        </button>
                                    </div>
                                    <p className={hintClass}>Убедитесь, что логин введён верно</p>
                                </div>

                                {data.kind === 'starterpack' && (
                                    <>
                                        <div className="pt-[41px]">
                                            <Divider />
                                        </div>
                                        <div className="pt-[41px]">
                                            <span className={sectionLabel}>сумма к оплате</span>
                                            <div className="mt-[19px] flex h-[71px] items-center gap-[6px] rounded-b-[4px] border border-gold/[0.18] bg-[#1e2031] px-[25px] backdrop-blur-card">
                                                <span className="text-gold-grad font-cinzel text-[32px] font-bold">
                                                    {data.amount}
                                                </span>
                                                <span className="font-outfit text-[18px] font-medium text-white">
                                                    ₽
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {data.kind === 'currency' && (
                                    <div className="pt-[41px]">
                                        <Divider />
                                        <div className="pt-[41px]">
                                            <span className={sectionLabel}>Пароль в игре</span>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className={cn(fieldShell, 'mt-[19px] h-[71px]')}
                                                placeholder="Введите пароль для вашего персонажа"
                                            />
                                            <p className={hintClass}>
                                                Убедитесь, что пароль введён верно
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-[41px]">
                                    <Divider />
                                </div>

                                <div className="pb-[44px] pt-[41px]">
                                    <span className={sectionLabel}>e-mail для чека</span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={cn(fieldShell, 'mt-[19px]')}
                                        placeholder="Введите e-mail для получения чека"
                                    />
                                    <p className={hintClass}>
                                        {data.kind === 'currency'
                                            ? 'На этот e-mail мы отправим чек и статус заказа'
                                            : 'Убедитесь, что e-mail введён верно'}
                                    </p>
                                </div>
                            </div>

                            <div className="sticky bottom-0 border-t border-gold/[0.18] bg-[#0c0d15] px-[56px] pb-[40px] pt-[36px]">
                                <Button
                                    disabled={!canPay}
                                    onClick={handleSubmit}
                                    className="h-[84px] w-full text-[24px] tracking-[2.86px] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                >
                                    оплатить {data.price} ₽
                                </Button>

                                <div className="mt-[28px] flex items-center justify-center gap-[8px]">
                                    <ShieldIcon className="size-[16px] text-ink-dim" />
                                    <span className="font-outfit text-[16px] text-ink-dim">
                                        Безопасная оплата
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
