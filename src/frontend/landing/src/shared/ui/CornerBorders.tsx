const corner = 'pointer-events-none absolute size-[14px] border-ink'

export const CornerBorders = () => (
    <>
        <span className={`${corner} -left-px -top-px border-l border-t`} />
        <span className={`${corner} -right-px -top-px border-r border-t`} />
        <span className={`${corner} -bottom-px -left-px border-b border-l`} />
        <span className={`${corner} -bottom-px -right-px border-b border-r`} />
    </>
)
