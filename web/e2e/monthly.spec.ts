import { expect, test } from '@playwright/test'
import { addMonths, monthKeyFor, signIn } from './helpers/app'
import {
  createUserSession,
  fetchTransaction,
  fetchTransactions,
  seedTransaction,
  seedTransactionWithNoGroup,
} from './helpers/supabase'

test('navigates monthly view into a future month and shows planned transactions', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const nextMonth = addMonths(new Date(), 1)

  await seedTransaction(supabase, userId, {
    date: `${monthKeyFor(nextMonth)}-10`,
    description: 'Parcela futura e2e',
    amount: 420,
    type: 'Despesa',
    category: 'Compras',
    installment: '02/05',
  })

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Mensal' }).click()
  await page.getByRole('button', { name: 'Próximo mês' }).click()

  await expect(page.getByText('Meses futuros mostram apenas o que já está previsto na base.')).toBeVisible()
  await expect(page.getByText('Parcela futura e2e')).toBeVisible()
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
  const dialog = page.getByRole('dialog', { name: 'Editar classificacao' })
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
  const dialog = page.getByRole('dialog', { name: 'Editar classificacao' })
  await dialog.getByLabel('Categoria').selectOption('Alimentação')
  await dialog.getByLabel('Grupo').selectOption(selectableBudgetGroup.id)
  await dialog.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByRole('heading', { name: 'Lembrar esta classificacao?' })).toBeVisible()
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
