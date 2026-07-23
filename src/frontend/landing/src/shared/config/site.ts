export const ROUTES = {
    home: '/',
    news: '/news',
    newsDetail: (id: number | string) => `/news/${id}`,
    howToConnect: '/how-to-connect',
    voucher: '/voucher'
} as const

export const SITE = {
    name: 'CastleWar',
    ip: 'play.castlewar.ru',
    version: 'Hytale 1.0',
    foundedYear: 2025,
    copyrightYear: 2026
} as const

export const NAV_LINKS = [
    { label: 'О сервере', href: '/#about' },
    { label: 'Преимущества', href: '/#features' },
    { label: 'Магазин', href: '/#shop' },
    { label: 'Новости', href: ROUTES.news },
    { label: 'Статистика', href: '/#stats' },
    { label: 'Как подключиться', href: ROUTES.howToConnect }
] as const

export const FOOTER_COLUMNS = [
    {
        title: 'Сервер',
        links: [
            { label: 'О сервере', href: '/#about' },
            { label: 'Преимущества', href: '/#features' },
            { label: 'Статистика', href: '/#stats' }
        ]
    },
    {
        title: 'Игроку',
        links: [
            { label: 'Магазин', href: '/#shop' },
            { label: 'Новости', href: ROUTES.news },
            { label: 'Правила', href: '#' }
        ]
    },
    {
        title: 'Связь',
        links: [
            { label: 'Поддержка', href: '#' },
            { label: 'Discord', href: '#' },
            { label: 'Telegram', href: '#' }
        ]
    }
] as const

export const LEGAL_LINKS = [
    { label: 'Политика конфиденциальности', href: '/documents/policy_hytale.docx' },
    { label: 'Оферта', href: '/documents/oferta_222334141771_ред.docx' }
] as const

export const FOOTER_DESCRIPTION =
    'Hytale-сервер с PvE и PvP, фармингом, кланами и квестами. Создавайте игровое сообщество вместе с нами.'

export const LEGAL_REQUISITES = [
    'ИП ТУТОВ СЕРГЕЙ ДМИТРИЕВИЧ',
    'ИНН 222334141771',
    'ОГРНИП 324220200060090'
] as const
