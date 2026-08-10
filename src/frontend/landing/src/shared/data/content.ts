export const ONLINE = {
    now: 12567,
    accounts: '148K+',
    clans: 'SOON'
}

export const FEATURES = [
    {
        title: 'PvP Битвы',
        text: 'Клановые войны, дуэли и арены. Сражайся на захват замков и собирай добычу с поверженных врагов.',
        tags: 'Арены · Войны · Дуэли · SOON'
    },
    {
        title: 'Выживание и фарм',
        text: 'Добывай ресурсы, прокачивай ремёсла, крафти снаряжение — один или с друзьями. Прогресс остаётся с тобой.',
        tags: 'Ресурсы · Крафт · Ремёсла'
    },
    {
        title: 'Квесты и подземелья',
        text: 'Сотни заданий и лабиринтов ручной сборки. Головоломки, боссы и легендарный лут — исследуй в своём темпе.',
        tags: 'Сюжет · Боссы · Лут · SOON'
    },
    {
        title: 'Кланы и гильдии',
        text: 'Собери своих: общий банк, ранги, территории. Клан здесь — про плечо рядом, а не только про войну.',
        tags: 'Гильдии · Банк · Ранги · SOON'
    },
    {
        title: 'Дом и приват',
        text: 'Свой участок в деревне уже за первый вечер: дом, печь, сундуки. Приват бережёт всё, что построил — базу не снесут.',
        tags: 'Дом · Участок · Декор'
    },
    {
        title: 'Лидерборд',
        text: 'Соревнуйся за топ рейтинга: сезонные награды, эксклюзивные титулы и косметика для победителей.',
        tags: 'Сезоны · Рейтинг · Награды'
    }
]

export const STATS = [
    { value: '4 515', label: 'Игроков онлайн', sub: 'прямо сейчас' },
    { value: '53 253', label: 'Персонажей создано', sub: 'всего' },
    { value: 'SOON', label: 'Кланы', sub: 'активных гильдий и альянсов' },
    { value: 'SOON', label: 'Боссы', sub: 'за последние 30 дней' }
]

export interface ShopFeature {
    strong: string
    rest?: string
}

export interface ShopChip {
    label: string;
    variant: "gold" | "blue" | "violet" | "lazure" | "green"
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
    accent?: 'blue' | 'violet' | 'lazure' | 'green'
    chips?: ShopChip[]
}

export const SHOP_PLANS: ShopPlan[] = [
    {
        id: 'landscape',
        eyebrow: 'Стартерпак',
        title: 'Landscape Pack',
        price: '150 ₽',
        note: 'терраформинг и декор мира',
        cta: 'Купить',
        accent: 'green',
        chips: [
            { label: 'Трава x 128', variant: 'gold' as const },
            { label: 'Земля x 128', variant: 'gold' as const },
            { label: 'Мох x 64', variant: 'green' as const },
            { label: 'Листва × 64', variant: 'green' as const },
            { label: 'Цветы x 32', variant: 'green' as const },
            { label: 'еще 1 предмет', variant: 'green' as const }
        ],
        features: [
            { strong: 'Природный набор', rest: 'озеленение с нуля' },
            { strong: 'Терраформинг', rest: 'трава, мох, цветы' },
            { strong: 'Можно открывать', rest: 'сразу после покупки' },
        ]
    },
    {
        id: 'farmer',
        eyebrow: 'Стартерпак',
        title: 'Farmer Pack',
        price: '180 ₽',
        note: 'старт собственной фермы',
        cta: 'Купить',
        popular: true,
        badge: 'Популярный выбор',
        chips: [
            { label: 'Семена x 64', variant: 'gold' as const },
            { label: 'Семена овощей x 32', variant: 'gold' as const },
            { label: 'Удобрение × 16', variant: 'blue' as const },
            { label: 'Семена ягод x 16', variant: 'blue' as const },
            { label: 'Саженцы x 8', variant: 'blue' as const },
            { label: 'еще 1 предмет', variant: 'blue' as const }
        ],
        features: [
            { strong: 'Первый урожай', rest: 'уже в первый день' },
            { strong: 'Полный цикл', rest: 'семена + удобрение' },
            { strong: 'Можно открывать', rest: 'сразу после покупки' },
        ]
    },
    {
        id: 'farmer',
        eyebrow: 'Стартерпак',
        title: 'Alchemist Pack',
        price: '250 ₽',
        note: 'для зельеваров и алхимиков',
        cta: 'Купить',
        accent: 'violet',
        chips: [
            { label: 'Бутылка x 32', variant: 'gold' as const },
            { label: 'Волокно x 32', variant: 'gold' as const },
            { label: 'Лепестки × 16', variant: 'violet' as const },
            { label: 'Древесный сок x 16', variant: 'violet' as const },
            { label: 'Эссенция жизни x 3', variant: 'violet' as const },
            { label: 'еще 1 предмет', variant: 'violet' as const }
        ],
        features: [
            { strong: 'Первый урожай', rest: 'уже в первый день' },
            { strong: 'Полный цикл', rest: 'семена + удобрение' },
            { strong: 'Можно открывать', rest: 'сразу после покупки' },
        ]
    },
    {
        id: 'adventurer',
        eyebrow: 'Стартерпак',
        title: 'Adventurer Pack',
        price: '350 ₽',
        note: 'PvE-старт для приключений',
        cta: 'Купить',
        accent: 'lazure',
        chips: [
            { label: 'Железный меч × 1', variant: 'gold' as const },
            { label: 'Стрелы × 64', variant: 'gold' as const },
            { label: 'Зелье лечения × 3', variant: 'lazure' as const },
            { label: 'Еда x 32', variant: 'lazure' as const },
            { label: 'Факел x 32', variant: 'lazure' as const },
            { label: 'еще 1 предмет', variant: 'lazure' as const }
        ],
        features: [
            { strong: 'Готов к бою', rest: 'оружие сразу в руках' },
            { strong: 'PvE-набор', rest: 'оружие и лечение' },
            { strong: 'Можно открывать', rest: 'сразу после покупки' },
        ]
    }
]

export const LOOTBOX = {
    eyebrow: 'Стартерпак',
    title: 'Builder Pack',
    price: '120 ₽',
    note: 'для тех, кто строит с размахом',
    chips: [
        { label: 'Земля x 128', variant: 'gold' as const },
        { label: 'Камень x 128', variant: 'blue' as const },
        { label: 'Бревно x 64', variant: 'blue' as const },
        { label: 'Факел × 32', variant: 'gold' as const },
        { label: 'Стекло x 32', variant: 'blue' as const },
        { label: 'еще 1 предмет', variant: 'blue' as const }
    ],
    features: [
        { strong: 'Блоки и опоры', rest: 'для первых построек' },
        { strong: 'Быстрый старт', rest: 'всё для стройки' },
        { strong: 'Можно открывать', rest: 'сразу после покупки' }
    ],
    cta: 'Купить'
}

export interface CurrencyTileItem {
    title: string
    text: string
    price: string
    cta: string
    variant: 'glass' | 'gold'
}

export const CURRENCY_TILES: CurrencyTileItem[] = [
    // {
    //     title: 'Игровая валюта',
    //     text: 'Покупай предметы у NPC, торгуй с игроками и улучшай экипировку.',
    //     price: 'от 49 ₽',
    //     cta: 'Пополнить',
    //     variant: 'glass'
    // },
    {
        title: 'Вход в Hytale бесплатно - скачивайте лаунчер собственной разработки прямо сейчас!',
        text: 'HYTALE',
        price: 'от 49 ₽',
        cta: 'Начать играть',
        variant: 'gold'
    }
]

export const PLACEHOLDER_BODY = Array.from(
    { length: 10 },
    () =>
        'Окунись в мир сражений и фарминга. Совместные локации, лабиринты, клановые войны и сотни квестов — всё на одном сервере. Создавайте игровое сообщество вместе с нами.'
)
