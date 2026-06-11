import { expect, test } from '@playwright/test'
import { addMonths, monthKeyFor, monthLabel, signIn } from './helpers/app'
import { createUserSession, getBudgetGroups, seedTransaction } from './helpers/supabase'

test('renders every authenticated page and allows primary navigation', async ({ page }) => {
  const { email, password } = await createUserSession()

  await signIn(page, email, password)

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Saúde financeira com leitura do presente e do que já vem pela frente.')).toBeVisible()
  await expect(page.getByText('Horizonte dos próximos 3 meses')).toBeVisible()

  await page.getByRole('link', { name: 'Mensal' }).click()
  await expect(page.getByRole('heading', { name: 'Mensal' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mês anterior' })).toBeVisible()
  await expect(page.getByText('Nenhum lançamento no período')).toBeVisible()

  await page.getByRole('link', { name: 'Importar' }).click()
  await expect(page.getByRole('heading', { name: 'Importar' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Traga novos dados para a base com um fluxo mais guiado.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Importar para o Supabase' })).toBeVisible()

  await page.getByRole('link', { name: 'Regras' }).click()
  await expect(page.getByRole('heading', { name: 'Regras', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Adicionar regra manualmente' })).toBeVisible()

  await page.getByRole('link', { name: 'Budget groups' }).click()
  await expect(page.locator('header').getByRole('heading', { name: 'Budget groups', exact: true })).toBeVisible()
  await expect(page.getByText('Organize os grupos que sustentam metas, leitura mensal e projeções.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Criar grupo' })).toBeVisible()
})

test('shows projected and probable commitments on the dashboard', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const now = new Date()
  const previousMonth = addMonths(now, -1)
  const currentMonth = addMonths(now, 0)
  const nextMonth = addMonths(now, 1)
  const [needsGroup, wantsGroup] = await getBudgetGroups(supabase)

  if (!needsGroup || !wantsGroup) {
    throw new Error('Budget groups are required for dashboard projection E2E test')
  }

  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(currentMonth)}-05`,
    description: 'Salário recorrente e2e',
    amount: 10000,
    type: 'Receita',
    category: 'Salário',
  })
  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(previousMonth)}-10`,
    description: 'Aluguel recorrente e2e',
    amount: 3200,
    type: 'Despesa',
    category: 'Moradia',
    budget_group_id: needsGroup.id,
  })
  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(currentMonth)}-10`,
    description: 'Aluguel recorrente e2e',
    amount: 3200,
    type: 'Despesa',
    category: 'Moradia',
    budget_group_id: needsGroup.id,
  })
  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(nextMonth)}-12`,
    description: 'Notebook parcelado e2e',
    amount: 800,
    type: 'Despesa',
    category: 'Compras',
    budget_group_id: wantsGroup.id,
    installment: '04/10',
  })

  await signIn(page, email, password)

  const nextMonthCard = page.locator('.projection-card').filter({ hasText: monthLabel(nextMonth) })
  await expect(nextMonthCard).toContainText('1 previstos')
  await expect(nextMonthCard).toContainText('1 prováveis')
  await expect(page.getByText('Impacto acumulado no horizonte')).toBeVisible()
})
