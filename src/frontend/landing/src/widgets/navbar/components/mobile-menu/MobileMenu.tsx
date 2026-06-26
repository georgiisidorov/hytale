import { cn } from '@/shared/lib/cn'

import { NAV_LINKS } from '@/shared/config/site'

import { AnchorLink, Button } from '@/shared/ui'

interface MobileMenuProps {
    open: boolean
    onClose: () => void
}

export const MobileMenu = ({ open, onClose }: MobileMenuProps) => (
    <div
        className={cn(
            'fixed inset-0 z-50 desktop:hidden',
            open ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        aria-hidden={!open}
    >
        <div
            className={cn(
                'absolute inset-0 bg-bg-top/80 backdrop-blur-sm transition-opacity duration-300',
                open ? 'opacity-100' : 'opacity-0'
            )}
            onClick={onClose}
        />
        <nav
            className={cn(
                'absolute right-0 top-0 flex h-full w-[280px] flex-col gap-1 border-l border-gold/20 bg-bg-mid p-6 pt-24 transition-transform duration-300',
                open ? 'translate-x-0' : 'translate-x-full'
            )}
        >
            {NAV_LINKS.map((link) => (
                <AnchorLink
                    key={link.label}
                    to={link.href}
                    onClick={onClose}
                    className="py-3 font-cinzel text-[14px] uppercase tracking-[1.5px] text-ink-muted transition-colors hover:text-gold"
                >
                    {link.label}
                </AnchorLink>
            ))}
            <Button className="mt-6 h-[52px] text-[13px]" onClick={onClose}>
                Играть бесплатно
            </Button>
        </nav>
    </div>
)
