const formatter = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
})

export const formatDate = (iso: string) => formatter.format(new Date(iso))
