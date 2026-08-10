import { CardTitle, GlassPanel, IconBox, Label } from '@/shared/ui'

interface FeatureCardProps {
    title: string
    text: string
    tags: string
    icon: React.ReactNode
}

export const FeatureCard = ({ title, text, tags, icon }: FeatureCardProps) => (
    <GlassPanel variant="feature" className="overflow-hidden p-card-pad">
        <IconBox>{icon}</IconBox>
        <CardTitle className="mt-7">{title}</CardTitle>
        <p className="mt-4 font-outfit text-body-sm text-ink-muted">{text}</p>
        <Label className="mt-7 block">{tags}</Label>
    </GlassPanel>
)
