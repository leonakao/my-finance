export function toCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

export function toPercent(value: number): string {
  return `${(value || 0).toFixed(2)}%`
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Number(year), Number(month) - 1, 1))
}
