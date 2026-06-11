import { expect, test } from '@playwright/test'
import { addMonths, monthKeyFor, signIn } from './helpers/app'
import { createUserSession, seedTransaction } from './helpers/supabase'

function dateKeyFor(date: Date) {
  return `${monthKeyFor(date)}-${String(date.getDate()).padStart(2, '0')}`
}

function currency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

test('calculates current-month available balance and weekly suggestion from remaining projections', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const now = new Date()
  const previousMonth = addMonths(now, -1)
  const secondPreviousMonth = addMonths(now, -2)
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const expectedDay = String(tomorrow.getDate()).padStart(2, '0')
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const weeksRemaining = Math.ceil((lastDay - now.getDate() + 1) / 7)

  await seedTransaction(supabase, userId, {
    date: dateKeyFor(now),
    description: 'Receita realizada para cálculo e2e',
    amount: 5000,
    type: 'Receita',
    category: 'Salário',
  })
  await seedTransaction(supabase, userId, {
    date: dateKeyFor(now),
    description: 'Despesa realizada para cálculo e2e',
    amount: 1000,
    type: 'Despesa',
    category: 'Moradia',
  })
  await seedTransaction(supabase, userId, {
    date: dateKeyFor(tomorrow),
    description: 'Receita restante para cálculo e2e',
    amount: 500,
    type: 'Receita',
    category: 'Freelance',
  })
  await seedTransaction(supabase, userId, {
    date: dateKeyFor(tomorrow),
    description: 'Despesa restante para cálculo e2e',
    amount: 900,
    type: 'Despesa',
    category: 'Moradia',
  })
  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(secondPreviousMonth)}-${expectedDay}`,
    description: 'Recorrência para cálculo e2e',
    amount: 200,
    type: 'Despesa',
    category: 'Moradia',
  })
  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(previousMonth)}-${expectedDay}`,
    description: 'Recorrência para cálculo e2e',
    amount: 400,
    type: 'Despesa',
    category: 'Moradia',
  })

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Mensal' }).click()

  const availableBalance = 5000 - 1000 + 500 - 900 - 300
  const weeklySuggestion = availableBalance / weeksRemaining
  await expect(page.locator('.monthly-projection-metric').filter({ hasText: 'Saldo realizado até hoje' })).toContainText(currency(4000))
  await expect(page.locator('.monthly-projection-metric').filter({ hasText: 'Receitas restantes' })).toContainText(currency(500))
  await expect(page.locator('.monthly-projection-metric').filter({ hasText: 'Despesas registradas restantes' })).toContainText(currency(900))
  await expect(page.locator('.monthly-projection-metric').filter({ hasText: 'Despesas prováveis' })).toContainText(currency(300))
  await expect(page.locator('.monthly-projection-metric').filter({ hasText: 'Saldo projetado do mês' })).toContainText(currency(availableBalance))
  await expect(page.locator('.monthly-projection-metric').filter({ hasText: 'Sugestão por semana' })).toContainText(currency(weeklySuggestion))
})

test('shows a projected deficit and clamps the weekly spending suggestion to zero', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const now = new Date()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  await seedTransaction(supabase, userId, {
    date: dateKeyFor(tomorrow),
    description: 'Despesa que gera déficit e2e',
    amount: 900,
    type: 'Despesa',
    category: 'Moradia',
  })

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Mensal' }).click()

  await expect(page.getByText(`Há um déficit projetado de ${currency(900)}. A sugestão semanal foi limitada a ${currency(0)}.`)).toBeVisible()
  await expect(page.locator('.monthly-projection-metric').filter({ hasText: 'Saldo projetado do mês' })).toContainText(currency(-900))
  await expect(page.locator('.monthly-projection-metric').filter({ hasText: 'Sugestão por semana' })).toContainText(currency(0))
})

test('shows a future month composed only of probable ungrouped estimates', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const now = new Date()
  const previousMonth = addMonths(now, -1)
  const secondPreviousMonth = addMonths(now, -2)
  const nextMonth = addMonths(now, 1)
  const longDescription = 'Estimativa recorrente sem grupo com uma descrição extensa para validar todo o conteúdo e2e'

  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(secondPreviousMonth)}-18`,
    description: longDescription,
    amount: 100,
    type: 'Despesa',
    category: 'Outros',
    budget_group_id: null,
  })
  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(previousMonth)}-18`,
    description: longDescription,
    amount: 200,
    type: 'Despesa',
    category: 'Outros',
    budget_group_id: null,
  })

  await signIn(page, email, password)
  await page.goto(`/app/mensal?month=${monthKeyFor(nextMonth)}`)

  await expect(page.getByText('Nenhum lançamento registrado restante.')).toBeVisible()
  await expect(page.getByText(longDescription)).toBeVisible()
  await expect(page.getByRole('table', { name: 'Estimativas prováveis' })).toContainText('Sem grupo')
  await expect(page.getByRole('table', { name: 'Estimativas prováveis' })).toContainText('2 ocorrências em 2 meses')
  await expect(page.locator('.monthly-projection-metric').filter({ hasText: 'Despesas registradas' })).toContainText(currency(0))
  await expect(page.locator('.monthly-projection-metric').filter({ hasText: 'Despesas prováveis' })).toContainText(currency(150))
  await expect(page.getByRole('heading', { name: 'Nenhum lançamento previsto' })).toBeVisible()
})
