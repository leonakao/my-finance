import { expect, test, type Page } from '@playwright/test'
import {
  createUserSession,
  fetchRules,
  fetchTransaction,
  fetchTransactions,
  getBudgetGroups,
  seedClassificationRule,
  seedTransaction,
  seedTransactionWithNoGroup,
} from './helpers/supabase'

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Resumo mensal e revisao' })).toBeVisible()
}

test('persists selected budget group when editing a transaction', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const { transactionId, selectableBudgetGroup } = await seedTransactionWithNoGroup(supabase, userId)

  await signIn(page, email, password)

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

test('creates a user rule from the remember-classification flow', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const { selectableBudgetGroup } = await seedTransactionWithNoGroup(supabase, userId)

  await signIn(page, email, password)

  await page.getByRole('button', { name: 'Editar' }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar classificacao' })
  await dialog.getByLabel('Categoria').selectOption('Alimentação')
  await dialog.getByLabel('Grupo').selectOption(selectableBudgetGroup.id)
  await dialog.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByRole('heading', { name: 'Lembrar esta classificacao?' })).toBeVisible()
  await page.getByLabel('Nome da regra').fill('supermercado')
  await page.getByRole('button', { name: 'Lembrar pelo nome + valor' }).click()
  await expect(page.getByText('Reclassificar transações existentes?')).toBeVisible()
  await page.getByRole('button', { name: 'Agora não' }).click()

  await page.getByRole('button', { name: 'Regras' }).click()
  await expect(page.getByRole('heading', { name: 'Regras de classificacao' })).toBeVisible()
  await expect(page.getByText('supermercado')).toBeVisible()

  const rules = await fetchRules(supabase)
  expect(rules.some((rule: { match_mode: string; match_description: string }) => rule.match_mode === 'description_amount' && rule.match_description === 'supermercado')).toBe(true)
})

test('shows reclassification CTA after remember-classification and updates matching transactions', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const { transactionId, selectableBudgetGroup } = await seedTransactionWithNoGroup(supabase, userId)
  const matchingTransaction = await seedTransaction(supabase, userId, {
    description: 'Compra e2e supermercado extra',
    amount: 88.4,
  })

  await signIn(page, email, password)

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

test('shows reclassification CTA after editing a saved rule and updates matching transactions', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const [selectableBudgetGroup] = await getBudgetGroups(supabase)
  if (!selectableBudgetGroup) {
    throw new Error('No budget group available for reclassification E2E test')
  }
  const matchingTransaction = await seedTransaction(supabase, userId, {
    description: 'Compra e2e supermercado central',
    amount: 73.2,
  })
  await seedClassificationRule(supabase, userId, {
    match_description: 'supermercado',
    match_description_normalized: 'supermercado',
  })

  await signIn(page, email, password)
  await page.getByRole('button', { name: 'Regras' }).click()
  await expect(page.getByRole('heading', { name: 'Regras de classificacao' })).toBeVisible()

  await page.getByRole('button', { name: 'Editar' }).first().click()
  await page.getByLabel('Categoria').last().selectOption('Alimentação')
  await page.getByLabel('Grupo').last().selectOption(selectableBudgetGroup.id)
  await page.getByRole('button', { name: 'Salvar regra' }).click()

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
