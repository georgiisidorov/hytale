import { Link } from 'react-router-dom'

import { ROUTES } from '@/shared/config/site'

import { Button, Container } from '@/shared/ui'

import ArrowLongIcon from '@/assets/icons/arrow-long.svg'

export const HowToConnectPage = () => (
    <Container wide className="pb-[120px] pt-[140px] desktop:pt-[170px]">
        <Link
            to={ROUTES.home}
            className="inline-flex items-center gap-3 font-cinzel text-[21px] uppercase tracking-[4.48px] text-ink transition-colors hover:text-gold"
        >
            <ArrowLongIcon className="h-[15px] w-[21px] -scale-x-100" />
            Назад
        </Link>

        <div className="mt-8">
            <h1 className="text-gold-grad font-cinzel text-[32px] font-black uppercase leading-[1.1] sm:text-[48px] desktop:text-[72px]">
                Как подключиться
            </h1>
            <p className="mt-2 font-cinzel text-[28px] font-normal uppercase leading-[1.2] text-ink sm:text-[40px] desktop:text-[63px]">
                к серверу ?
            </p>
        </div>

        <div className="mt-11 h-[3px] w-full bg-[linear-gradient(90deg,#c9a84c_0%,rgba(201,168,76,0.45)_50%,#c9a84c_100%)]" />

        <div className="mt-11 flex flex-col gap-10">
            <div>
                <h3 className="font-outfit text-[24px] font-semibold text-white">
                    1. Скачайте лаунчер
                </h3>
                <p className="mt-3 font-outfit text-[21px] font-light leading-[1.3] text-[#c9c9c9]">
                    Нажмите кнопку «Скачать лаунчер» и установите его на компьютер. Это наш
                    бесплатный лаунчер собственной разработки.
                </p>
            </div>

            <div>
                <h3 className="font-outfit text-[24px] font-semibold text-white">
                    2. Войдите в аккаунт
                </h3>
                <p className="mt-3 font-outfit text-[21px] font-light leading-[1.3] text-[#c9c9c9]">
                    Запустите лаунчер, авторизуйтесь, придумайте ник и создайте персонажа.
                </p>
            </div>

            <div>
                <h3 className="font-outfit text-[24px] font-semibold text-white">
                    3. Нажмите «Играть»
                </h3>
                <p className="mt-3 font-outfit text-[21px] font-light leading-[1.3] text-[#c9c9c9]">
                    Сервер уже встроен в лаунчер — ничего добавлять, настраивать или вводить вручную
                    не нужно. Просто нажмите «Играть» и отправляйтесь в мир Hytale.
                </p>
            </div>
        </div>
        <div className="mt-12 flex items-center justify-center">
            <Button className="p-4">Скачать лаунчер</Button>
        </div>
    </Container>
)
