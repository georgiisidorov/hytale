import type { Config } from 'tailwindcss'

const config: Config = {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            screens: {
                desktop: '1024px',
                'max-cont': { max: '1319px' },
                'max-cont-wide': { max: '1548px' }
            },
            colors: {
                gold: {
                    DEFAULT: '#c9a84c',
                    light: '#e7c66a',
                    border: '#f1d27a',
                    deep: '#8a6f24',
                    'grad-from': '#f9e29a',
                    'grad-via': '#d6b358',
                    'grad-to': '#7a5d18'
                },
                ink: {
                    DEFAULT: '#e8e6df',
                    muted: '#a5a3a0',
                    dim: '#6e6c69',
                    dark: '#1a1606'
                },
                bg: {
                    top: '#050509',
                    mid: '#0a0a14',
                    bottom: '#07070b'
                },
                accent: {
                    DEFAULT: '#7cbcff',
                    bright: '#4a9eff',
                    border: '#8ec7ff',
                    dark: '#061224'
                },
                online: '#4ade80'
            },
            fontFamily: {
                cinzel: ['Cinzel', 'serif'],
                outfit: ['Outfit', 'sans-serif']
            },
            fontSize: {
                eyebrow: ['13px', { lineHeight: '20.15px', letterSpacing: '6.5px' }],
                logo: ['55.8px', { lineHeight: '53px', letterSpacing: '19.53px' }],
                'logo-mobile': ['28px', { lineHeight: '33px', letterSpacing: '8px' }],
                h1: ['110.5px', { lineHeight: '105px', letterSpacing: '2.21px' }],
                'h1-mobile': ['48px', { lineHeight: '48px', letterSpacing: '1px' }],
                h2: ['44px', { lineHeight: '50px', letterSpacing: '2px' }],
                'h2-mobile': ['32px', { lineHeight: '38px', letterSpacing: '1.5px' }],
                h3: ['19px', { lineHeight: '29.45px', letterSpacing: '1.9px' }],
                'h3-lg': ['26px', { lineHeight: '40.3px', letterSpacing: '3.12px' }],
                h4: ['13px', { lineHeight: '16px', letterSpacing: '2.6px' }],
                body: ['17px', { lineHeight: '28.9px' }],
                'body-sm': ['15px', { lineHeight: '24px' }],
                'big-number': ['89.8px', { lineHeight: '92px', letterSpacing: '1.84px' }],
                'big-number-mobile': ['58px', { lineHeight: '58px', letterSpacing: '1.2px' }],
                stat: ['58.9px', { lineHeight: '60px', letterSpacing: '1.2px' }],
                'stat-sm': ['22px', { lineHeight: '34.1px' }],
                price: ['38px', { lineHeight: '38px' }],
                label: ['11px', { lineHeight: '17.05px', letterSpacing: '3.3px' }],
                'label-sm': ['12px', { lineHeight: '18.6px', letterSpacing: '3.84px' }],
                nav: ['13px', { lineHeight: '20.15px', letterSpacing: '1.04px' }],
                tag: ['14px', { lineHeight: '21.7px', letterSpacing: '4.48px' }]
            },
            borderRadius: {
                btn: '4px',
                card: '4px',
                panel: '6px',
                badge: '2px'
            },
            spacing: {
                'container-x': '300px',
                'container-x-mobile': '20px',
                section: '120px',
                'card-pad': '30px',
                'card-pad-inner': '31px'
            },
            maxWidth: {
                container: '1320px',
                'container-wide': '1549px'
            },
            boxShadow: {
                'btn-gold': '0px 0px 0px 1px rgba(0,0,0,0.4), 0px 0px 24px 0px rgba(201,168,76,0.35)',
                'btn-inset': 'inset 0px 1px 0px 1px rgba(255,255,255,0.35)',
                panel: '0px 30px 60px 0px rgba(0,0,0,0.4)',
                'panel-inset': 'inset 0px 0px 40px 0px rgba(201,168,76,0.05)',
                'icon-inset': 'inset 0px 0px 14px 0px rgba(201,168,76,0.15)',
                'logo-inset': 'inset 0px 0px 12px 0px rgba(201,168,76,0.15)',
                'online-glow': '0px 0px 12px 0px #4ade80',
                'badge-glow': '0px 0px 9px 0px rgba(201,168,76,0.4)',
                'btn-blue': '0px 0px 12px 0px rgba(74,158,255,0.35)',
                'btn-blue-inset': 'inset 0px 1px 0px 0px rgba(255,255,255,0.3)'
            },
            backgroundImage: {
                'gold-grad': 'linear-gradient(180deg, #f9e29a 0%, #c9a84c 55%, #7a5d18 100%)',
                'btn-gold':
                    'linear-gradient(180deg, #d8b558 0%, #b48f37 50%, #7d5f1a 100%)',
                'btn-blue': 'linear-gradient(180deg, #5fb0ff 0%, #3a7dd1 100%)',
                'currency-gold': 'linear-gradient(180deg, #d8b558 0%, #b48f37 50%, #7d5f1a 100%)',
                'icon-box': 'linear-gradient(180deg, #232539 0%, #0f1018 100%)',
                'panel-glass':
                    'linear-gradient(180deg, rgba(22,23,36,0.85) 0%, rgba(10,10,15,0.85) 100%)',
                'stat-glass':
                    'linear-gradient(180deg, rgba(20,21,32,0.6) 0%, rgba(8,8,14,0.7) 100%)',
                'card-feature':
                    'linear-gradient(180deg, rgba(28,29,42,0.6) 0%, rgba(10,10,15,0.6) 100%)',
                'card-popular':
                    'linear-gradient(180deg, rgba(40,33,12,0.6) 0%, rgba(15,12,5,0.85) 100%)',
                'divider-gold':
                    'linear-gradient(90deg, rgba(201,168,76,0) 0%, #c9a84c 50%, rgba(201,168,76,0) 100%)',
                'divider-gold-r':
                    'linear-gradient(90deg, rgba(201,168,76,0) 0%, #c9a84c 100%)',
                'divider-blue':
                    'linear-gradient(90deg, rgba(74,158,255,0) 0%, #4a9eff 50%, rgba(74,158,255,0) 100%)'
            },
            backdropBlur: {
                panel: '4px',
                card: '3px'
            }
        }
    },
    plugins: []
}

export default config
