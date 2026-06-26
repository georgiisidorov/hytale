/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare module '@/assets/icons/*.svg' {
    import type { FunctionComponent, SVGProps } from 'react'

    const ReactComponent: FunctionComponent<SVGProps<SVGSVGElement>>
    export default ReactComponent
}
