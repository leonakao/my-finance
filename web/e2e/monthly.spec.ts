import { expect, test } from '@playwright/test'
import { addMonths, monthKeyFor, monthLabel, signIn } from './helpers/app'
import {
  createUserSession,
  fetchTransaction,
  fetchTransactions,
  seedTransaction,
  seedTransactionWithNoGroup,
} from './helpers/supabase'

function dateKeyFor(date: Date) {
  return `${monthKeyFor(date)}-${String(date.getDate()).padStart(2, '0')}`
}

test('shows current-month remaining projections and keeps registered items editable below', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const now = new Date()
  const currentMonth = addMonths(now, 0)
  const previousMonth = addMonths(now, -1)
  const secondPreviousMonth = addMonths(now, -2)
  const remainingDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)
  const expectedDay = String(remainingDate.getDate()).padStart(2, '0')

  await seedTransaction(supabase, userId, {
    date: dateKeyFor(new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 1))),
    description: 'Salário realizado e2e',
    amount: 5000,
    type: 'Receita',
    category: 'Salário',
  })
  await seedTransaction(supabase, userId, {
    date: dateKeyFor(remainingDate),
    description: 'Conta restante e2e',
    amount: 420,
    type: 'Despesa',
    category: 'Moradia',
  })
  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(secondPreviousMonth)}-${expectedDay}`,
    description: 'Internet provável e2e',
    amount: 140,
    type: 'Despesa',
    category: 'Moradia',
  })
  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(previousMonth)}-${expectedDay}`,
    description: 'Internet provável e2e',
    amount: 160,
    type: 'Despesa',
    category: 'Moradia',
  })

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Mensal' }).click()

  await expect(page.getByRole('region', { name: `Projeção restante de ${monthLabel(currentMonth)}` })).toBeVisible()
  await expect(page.getByText('Saldo realizado até hoje')).toBeVisible()
  await expect(page.getByText('Sugestão por semana')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Resumo da projeção' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Itens que compõem a projeção' })).toBeVisible()
  await expect(page.getByText('Conta restante e2e')).toHaveCount(2)
  await expect(page.getByText('Internet provável e2e')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Lançamentos do mês' })).toBeVisible()
})

test('opens a future projection by direct URL and separates registered from probable items', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const now = new Date()
  const previousMonth = addMonths(now, -1)
  const secondPreviousMonth = addMonths(now, -2)
  const nextMonth = addMonths(now, 1)

  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(nextMonth)}-10`,
    description: 'Parcela futura e2e',
    amount: 420,
    type: 'Despesa',
    category: 'Compras',
    installment: '02/05',
  })
  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(secondPreviousMonth)}-18`,
    description: 'Seguro provável e2e',
    amount: 200,
    type: 'Despesa',
    category: 'Moradia',
  })
  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(previousMonth)}-18`,
    description: 'Seguro provável e2e',
    amount: 220,
    type: 'Despesa',
    category: 'Moradia',
  })

  await signIn(page, email, password)
  await page.goto(`/app/mensal?month=${monthKeyFor(nextMonth)}`)

  await expect(page).toHaveURL(new RegExp(`/app/mensal\\?month=${monthKeyFor(nextMonth)}$`))
  await expect(page.getByLabel('Selecionar mês')).toHaveValue(monthKeyFor(nextMonth))
  await expect(page.getByText('Meses futuros combinam lançamentos registrados e estimativas recorrentes.')).toBeVisible()
  await expect(page.getByRole('region', { name: `Projeção de ${monthLabel(nextMonth)}` })).toBeVisible()
  await expect(page.getByText('Parcela futura e2e')).toHaveCount(2)
  await expect(page.getByText('Seguro provável e2e')).toHaveCount(1)
  await expect(
    page.getByRole('table', { name: 'Estimativas prováveis' }).getByText('Provável', { exact: true }),
  ).toBeVisible()
})

test('keeps the monthly empty state visible below an empty projection', async ({ page }) => {
  const { email, password } = await createUserSession()

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Mensal' }).click()

  await expect(page.getByText('Nenhum lançamento registrado ou provável para este período.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nenhum lançamento no período' })).toBeVisible()
})

test('does not render projection blocks for past months', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const previousMonth = addMonths(new Date(), -1)

  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(previousMonth)}-10`,
    description: 'Compra passada sem projeção e2e',
    amount: 90,
  })

  await signIn(page, email, password)
  await page.goto(`/app/mensal?month=${monthKeyFor(previousMonth)}`)

  await expect(page.getByText('Compra passada sem projeção e2e')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Resumo da projeção' })).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Itens que compõem a projeção' })).not.toBeVisible()
})

test('keeps projection layout contained on mobile, laptop and ultra-wide viewports', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const now = new Date()
  const remainingDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)

  await seedTransaction(supabase, userId, {
    date: dateKeyFor(remainingDate),
    description: 'Conteúdo responsivo mensal e2e',
    amount: 240,
    type: 'Despesa',
    category: 'Compras',
  })

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Mensal' }).click()

  for (const viewport of [
    { width: 390, height: 844, columns: 1 },
    { width: 1280, height: 900, columns: 3 },
    { width: 2560, height: 1440, columns: 3 },
  ]) {
    await page.setViewportSize(viewport)
    await expect(page.getByRole('heading', { name: 'Itens que compõem a projeção' })).toBeVisible()

    const layout = await page.evaluate(() => {
      const metrics = document.querySelector('.monthly-projection-metrics')
      return {
        columns: metrics ? getComputedStyle(metrics).gridTemplateColumns.split(' ').length : 0,
        hasPageOverflow: document.documentElement.scrollWidth > window.innerWidth,
      }
    })

    expect(layout).toEqual({
      columns: viewport.columns,
      hasPageOverflow: false,
    })
  }
})

test('filters transactions in the monthly view', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()

  await seedTransaction(supabase, userId, {
    description: 'Padaria e2e',
    amount: 18.4,
    category: 'Alimentação',
  })
  await seedTransaction(supabase, userId, {
    description: 'Mercado e2e',
    amount: 118.4,
    category: 'Alimentação',
  })

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Mensal' }).click()
  await page.getByLabel('Buscar').fill('Padaria')

  await expect(page.getByText('Padaria e2e')).toBeVisible()
  await expect(page.getByText('Mercado e2e')).not.toBeVisible()
})

test('persists selected budget group when editing a transaction', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const { transactionId, selectableBudgetGroup } = await seedTransactionWithNoGroup(supabase, userId)

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Mensal' }).click()

  await page.getByRole('button', { name: 'Editar' }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar classificação' })
  await dialog.getByLabel('Grupo').selectOption(selectableBudgetGroup.id)
  const updateRequestPromise = page.waitForRequest((request) => {
    return (
      request.method() === 'PATCH' &&
      request.url().includes('/rest/v1/transactions') &&
      request.url().includes(`id=eq.${transactionId}`)
    )
  })

  await dialog.getByRole('button', { name: 'Salvar' }).click()
  const updateRequest = await updateRequestPromise
  const updatePayload = updateRequest.postDataJSON()

  await expect(page.getByRole('cell', { name: selectableBudgetGroup.name }).first()).toBeVisible()
  expect(updatePayload).toEqual({
    type: 'Despesa',
    category: 'Outros',
    budget_group_id: selectableBudgetGroup.id,
  })

  const updatedTransaction = await fetchTransaction(supabase, transactionId)
  expect(updatedTransaction.budget_group_id).toBe(selectableBudgetGroup.id)
})

test('shows reclassification CTA after remember-classification and updates matching transactions', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const { transactionId, selectableBudgetGroup } = await seedTransactionWithNoGroup(supabase, userId)
  const matchingTransaction = await seedTransaction(supabase, userId, {
    description: 'Compra e2e supermercado extra',
    amount: 88.4,
  })

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Mensal' }).click()

  const transactions = await fetchTransactions(supabase)
  const editableTransaction = transactions.find((transaction: { id: string; description: string }) => transaction.id === transactionId)
  if (!editableTransaction) {
    throw new Error('Editable transaction not found in seeded dataset')
  }

  await page
    .locator('tr')
    .filter({ has: page.getByText(editableTransaction.description, { exact: true }) })
    .getByRole('button', { name: 'Editar' })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Editar classificação' })
  await dialog.getByLabel('Categoria').selectOption('Alimentação')
  await dialog.getByLabel('Grupo').selectOption(selectableBudgetGroup.id)
  await dialog.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByRole('heading', { name: 'Lembrar esta classificação?' })).toBeVisible()
  await page.getByLabel('Nome da regra').fill('supermercado')
  await page.getByRole('button', { name: 'Lembrar pelo nome', exact: true }).click()

  await expect(page.getByText('Reclassificar transações existentes?')).toBeVisible()
  await page.getByRole('button', { name: 'Reclassificar' }).click()
  await expect(page.getByText(/reclassificada/)).toBeVisible()

  const updatedTransaction = await fetchTransaction(supabase, matchingTransaction.id)
  expect(updatedTransaction).toMatchObject({
    type: 'Despesa',
    category: 'Alimentação',
    budget_group_id: selectableBudgetGroup.id,
  })
})
