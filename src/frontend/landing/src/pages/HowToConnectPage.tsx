import { Link } from 'react-router-dom'

import { PLACEHOLDER_BODY } from '@/shared/data/content'

import { ROUTES } from '@/shared/config/site'

import { Container } from '@/shared/ui'

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
            {PLACEHOLDER_BODY.map((paragraph, i) => (
                <p
                    key={i}
                    className="font-outfit text-[21px] font-light leading-[1.3] text-[#c9c9c9]"
                >
                    {paragraph}
                </p>
            ))}
        </div>
    </Container>
)
