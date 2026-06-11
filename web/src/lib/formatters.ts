export function toCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

export function toPercent(value: number): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)
  return `${formatted}%`
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Number(year), Number(month) - 1, 1))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function dateLabel(isoDate: string | null | undefined): string {
  if (isoDate === null || isoDate === undefined || isoDate === '') {
    return ''
  }
  const [year = '', month = '', day = ''] = isoDate.split('-')
  if (year === '' || month === '' || day === '') {
    return isoDate
  }
  return `${day}/${month}/${year}`
}
