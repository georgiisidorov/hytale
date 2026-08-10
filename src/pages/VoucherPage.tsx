import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import axios from 'axios'

import { ROUTES } from '@/shared/config/site'

import { type PackId, packsApi } from '@/shared/api'
import { Button, Container, GlassPanel } from '@/shared/ui'

type Status =
    | { state: 'loading' }
    | { state: 'success'; code: string }
    | { state: 'error'; message: string }

const ERROR_MESSAGES: Record<number, string> = {
    402: 'Платёж не найден или ещё не завершён. Попробуйте позже.',
    403: 'Данные платежа не совпадают с лут-паком.',
    404: 'Лут-пак не найден.'
}

export const VoucherPage = () => {
    const [params] = useSearchParams()

    const paymentId = params.get('paymentId')
    const packId = params.get('packId') as PackId | null
    const playerUuid = params.get('playerUuid')

    const [status, setStatus] = useState<Status>(
        paymentId && packId
            ? { state: 'loading' }
            : { state: 'error', message: 'Не передан идентификатор платежа.' }
    )

    useEffect(() => {
        if (!paymentId || !packId) return

        packsApi
            .createVoucher({
                paymentId,
                packId,
                ...(playerUuid ? { playerUuid } : {})
            })
            .then((data) => setStatus({ state: 'success', code: data.code }))
            .catch((error) => {
                const fallback = 'Не удалось создать ваучер. Попробуйте позже.'
                const message = axios.isAxiosError(error)
                    ? (ERROR_MESSAGES[error.response?.status ?? 0] ?? fallback)
                    : fallback
                setStatus({ state: 'error', message })
            })
    }, [paymentId, packId, playerUuid])

    return (
        <Container className="flex min-h-screen items-center justify-center py-[140px]">
            <GlassPanel corners className="w-full max-w-[520px] px-10 py-12 text-center">
                {status.state === 'loading' && (
                    <p className="font-cinzel text-[18px] uppercase tracking-[3.84px] text-gold">
                        Создаём ваучер…
                    </p>
                )}

                {status.state === 'success' && (
                    <>
                        <p className="font-cinzel text-[18px] uppercase tracking-[3.84px] text-gold">
                            Ваучер готов
                        </p>
                        <p className="mt-6 font-outfit text-[15px] text-ink-muted">
                            Активируйте этот код на сервере:
                        </p>
                        <p className="text-gold-grad mt-4 select-all font-cinzel text-[40px] font-black tracking-[2px]">
                            {status.code}
                        </p>
                    </>
                )}

                {status.state === 'error' && (
                    <>
                        <p className="font-cinzel text-[18px] uppercase tracking-[3.84px] text-gold">
                            Ошибка
                        </p>
                        <p className="mt-6 font-outfit text-[15px] text-ink-muted">
                            {status.message}
                        </p>
                    </>
                )}

                <Button as={Link} to={ROUTES.home} className="mt-10 h-[54px] px-7 text-[13px]">
                    На главную
                </Button>
            </GlassPanel>
        </Container>
    )
}
