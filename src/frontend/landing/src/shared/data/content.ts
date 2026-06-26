export const ONLINE = {
    now: 12567,
    accounts: '148K+',
    clans: '3200+'
}

export const FEATURES = [
    {
        title: 'PvP Битвы',
        text: 'Клановые войны, дуэли и арены. Сражайся на захват замков и собирай добычу с поверженных врагов.',
        tags: 'Арены · Войны · Дуэли'
    },
    {
        title: 'Совместный фарминг',
        text: 'Зачищай локации с союзниками: добывай ресурсы, прокачивай ремёсла и крафти редкое снаряжение.',
        tags: 'Ресурсы · Крафт · Команда'
    },
    {
        title: 'Квесты и лабиринты',
        text: 'Сотни заданий и подземелий ручной сборки. Решай головоломки, охоться на боссов и забирай легендарную добычу.',
        tags: 'Сюжет · Боссы · Лут'
    },
    {
        title: 'Кланы',
        text: 'Создавай гильдии, захватывай замки и удерживай территории. Клановый банк, ранги и общая казна.',
        tags: 'Замки · Альянсы · Казна'
    },
    {
        title: 'Личные локации',
        text: 'Строй дом в жилом квартале: участок земли, печь, верстак и сундуки. Приглашай друзей в гости.',
        tags: 'Дом · Участок · Декор'
    },
    {
        title: 'Лидерборд',
        text: 'Соревнуйся за топ рейтинга: сезонные награды, эксклюзивные титулы и косметика для победителей.',
        tags: 'Сезоны · Рейтинг · Награды'
    }
]

export const STATS = [
    { value: '4 515', label: 'Игроков онлайн', sub: 'пиковое значение за сутки' },
    { value: '53 253', label: 'Персонажей создано', sub: 'с момента запуска беты' },
    { value: '1149+', label: 'Кланов', sub: 'активных гильдий и альянсов' },
    { value: '358', label: 'Боссов', sub: 'за последние 30 дней' }
]

export interface ShopFeature {
    strong: string
    rest?: string
}

export interface ShopPlan {
    id: string
    eyebrow: string
    title: string
    price: string
    period?: string
    note: string
    features: ShopFeature[]
    cta: string
    popular?: boolean
    badge?: string
    accent?: 'blue'
}

export const SHOP_PLANS: ShopPlan[] = [
    {
        id: 'farmer',
        eyebrow: 'Стартерпак',
        title: 'Фермер',
        price: '399 ₽',
        period: '/мес',
        note: 'для тех, кто любит развитие и крафт',
        popular: true,
        badge: 'Популярный выбор',
        cta: 'Купить',
        features: [
            { strong: '+5% к фармингу', rest: 'ресурсов' },
            { strong: 'Личная локация', rest: 'в жилом квартале' },
            { strong: 'Топор + Кирка', rest: 'сразу в инвентаре' },
            { strong: 'Факелы × 20', rest: 'и Лестница × 10' },
            { strong: 'Приоритетный заход', rest: 'на сервер' }
        ]
    },
    {
        id: 'warrior',
        eyebrow: 'Стартерпак',
        title: 'Воин',
        price: '399 ₽',
        period: '/мес',
        note: 'для тех, кто живёт в PvP',
        cta: 'Купить',
        accent: 'blue',
        features: [
            { strong: '+5% к прочности', rest: 'снаряжения' },
            { strong: 'Личная локация', rest: 'в жилом квартале' },
            { strong: 'Меч + Щит', rest: 'в стартовом наборе' },
            { strong: 'Лечебное зелье × 5' },
            { strong: 'Еда × 5', rest: 'на дорогу' }
        ]
    }
]

export const LOOTBOX = {
    eyebrow: 'Стартерпак',
    title: 'Сундук Воина',
    price: '399 ₽',
    note: 'случайный набор предметов',
    chips: [
        { label: 'Алмаз', variant: 'gold' as const },
        { label: 'Меч', variant: 'blue' as const },
        { label: 'Топор', variant: 'blue' as const },
        { label: 'Кираса', variant: 'blue' as const },
        { label: 'Золото × 100', variant: 'gold' as const },
        { label: 'Земля × 20', variant: 'blue' as const }
    ],
    features: [
        { strong: '6 предметов', rest: 'в каждом сундуке' },
        { strong: 'Шанс легендарки', rest: 'в каждом 10-м' },
        { strong: 'Можно открывать', rest: 'сразу после покупки' }
    ],
    cta: 'Открыть'
}

export interface CurrencyTileItem {
    title: string
    text: string
    price: string
    cta: string
    variant: 'glass' | 'gold'
}

export const CURRENCY_TILES: CurrencyTileItem[] = [
    {
        title: 'Игровая валюта',
        text: 'Покупай предметы у NPC, торгуй с игроками и улучшай экипировку.',
        price: 'от 49 ₽',
        cta: 'Пополнить',
        variant: 'glass'
    },
    {
        title: 'Купить лицензию',
        text: 'HYTALE',
        price: 'от 49 ₽',
        cta: 'Купить',
        variant: 'gold'
    }
]

export const PLACEHOLDER_BODY = Array.from(
    { length: 10 },
    () =>
        'Окунись в мир сражений и фарминга. Совместные локации, лабиринты, клановые войны и сотни квестов — всё на одном сервере. Создавайте игровое сообщество вместе с нами.'
)
