export function toCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

export function toPercent(value) {
  return `${(value || 0).toFixed(2)}%`
}

export function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-')
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Number(year), Number(month) - 1, 1))
}
