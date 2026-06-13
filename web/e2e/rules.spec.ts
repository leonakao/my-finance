import { expect, test } from '@playwright/test'
import { signIn } from './helpers/app'
import {
  createUserSession,
  fetchRules,
  fetchTransaction,
  getBudgetGroups,
  seedClassificationRule,
  seedTransaction,
  seedTransactionWithNoGroup,
} from './helpers/supabase'

test('creates a user rule from the remember-classification flow', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const { selectableBudgetGroup } = await seedTransactionWithNoGroup(supabase, userId)

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Mensal' }).click()

  await page.getByRole('button', { name: 'Editar' }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar transação' })
  await dialog.getByLabel('Categoria').selectOption('Alimentação')
  await dialog.getByLabel('Grupo').selectOption(selectableBudgetGroup.id)
  await dialog.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByRole('heading', { name: 'Lembrar esta classificação?' })).toBeVisible()
  await page.getByLabel('Nome da regra').fill('supermercado')
  await page.getByRole('button', { name: 'Lembrar pelo nome + valor' }).click()
  await expect(page.getByRole('heading', { name: 'Reclassificar transações existentes?' })).toBeVisible()
  await page.getByRole('button', { name: 'Agora não' }).click()

  await page.getByRole('link', { name: 'Regras' }).click()
  await expect(page.getByRole('heading', { name: 'Regras', exact: true })).toBeVisible()
  await expect(page.getByText('supermercado')).toBeVisible()

  const rules = await fetchRules(supabase)
  expect(rules.some((rule: { match_mode: string; match_description: string }) => rule.match_mode === 'description_amount' && rule.match_description === 'supermercado')).toBe(true)
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
  await page.getByRole('link', { name: 'Regras' }).click()
  await expect(page.getByRole('heading', { name: 'Regras', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Editar' }).first().click()
  await page.getByLabel('Categoria').last().selectOption('Alimentação')
  await page.getByLabel('Grupo').last().selectOption(selectableBudgetGroup.id)
  await page.getByRole('button', { name: 'Salvar regra' }).click()

  await expect(page.getByRole('heading', { name: 'Reclassificar transações existentes?' })).toBeVisible()
  await page.getByRole('button', { name: 'Reclassificar' }).click()
  await expect(page.getByText(/reclassificada/)).toBeVisible()

  const updatedTransaction = await fetchTransaction(supabase, matchingTransaction.id)
  expect(updatedTransaction).toMatchObject({
    type: 'Despesa',
    category: 'Alimentação',
    budget_group_id: selectableBudgetGroup.id,
  })
})

test('reclassifica transação com notes nulo sem falhar', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const [selectableBudgetGroup] = await getBudgetGroups(supabase)
  if (!selectableBudgetGroup) {
    throw new Error('No budget group available for reclassification E2E test')
  }
  const matchingTransaction = await seedTransaction(supabase, userId, {
    description: 'Compra e2e supermercado central',
    amount: 73.2,
    notes: '',
  })
  await seedClassificationRule(supabase, userId, {
    match_description: 'supermercado',
    match_description_normalized: 'supermercado',
  })

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Regras' }).click()
  await expect(page.getByRole('heading', { name: 'Regras', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Editar' }).first().click()
  await page.getByLabel('Categoria').last().selectOption('Alimentação')
  await page.getByLabel('Grupo').last().selectOption(selectableBudgetGroup.id)
  await page.getByRole('button', { name: 'Salvar regra' }).click()

  await expect(page.getByRole('heading', { name: 'Reclassificar transações existentes?' })).toBeVisible()
  await page.getByRole('button', { name: 'Reclassificar' }).click()
  await expect(page.getByText(/reclassificada/)).toBeVisible()

  const updatedTransaction = await fetchTransaction(supabase, matchingTransaction.id)
  expect(updatedTransaction).toMatchObject({
    type: 'Despesa',
    category: 'Alimentação',
    budget_group_id: selectableBudgetGroup.id,
  })
})

test('aplica notes da regra em transação sem notes', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const [selectableBudgetGroup] = await getBudgetGroups(supabase)
  if (!selectableBudgetGroup) {
    throw new Error('No budget group available for reclassification E2E test')
  }
  const matchingTransaction = await seedTransaction(supabase, userId, {
    description: 'Compra e2e supermercado central',
    amount: 73.2,
    notes: '',
  })
  await seedClassificationRule(supabase, userId, {
    match_description: 'supermercado',
    match_description_normalized: 'supermercado',
  })

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Regras' }).click()
  await expect(page.getByRole('heading', { name: 'Regras', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Editar' }).first().click()
  await page.getByLabel('Categoria').last().selectOption('Alimentação')
  await page.getByLabel('Grupo').last().selectOption(selectableBudgetGroup.id)
  await page.getByLabel('Notas').last().fill('Nota da regra')
  await page.getByRole('button', { name: 'Salvar regra' }).click()

  await expect(page.getByRole('heading', { name: 'Reclassificar transações existentes?' })).toBeVisible()
  await page.getByRole('button', { name: 'Reclassificar' }).click()
  await expect(page.getByText(/reclassificada/)).toBeVisible()

  const updatedTransaction = await fetchTransaction(supabase, matchingTransaction.id)
  expect(updatedTransaction).toMatchObject({
    category: 'Alimentação',
    budget_group_id: selectableBudgetGroup.id,
    notes: 'Nota da regra',
  })
})

test('preserva notes existentes da transação na reclassificação', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const [selectableBudgetGroup] = await getBudgetGroups(supabase)
  if (!selectableBudgetGroup) {
    throw new Error('No budget group available for reclassification E2E test')
  }
  const matchingTransaction = await seedTransaction(supabase, userId, {
    description: 'Compra e2e supermercado central',
    amount: 73.2,
    notes: 'Nota existente',
  })
  await seedClassificationRule(supabase, userId, {
    match_description: 'supermercado',
    match_description_normalized: 'supermercado',
    notes: 'Nota da regra',
  })

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Regras' }).click()
  await expect(page.getByRole('heading', { name: 'Regras', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Editar' }).first().click()
  await page.getByLabel('Categoria').last().selectOption('Alimentação')
  await page.getByLabel('Grupo').last().selectOption(selectableBudgetGroup.id)
  await page.getByRole('button', { name: 'Salvar regra' }).click()

  await expect(page.getByRole('heading', { name: 'Reclassificar transações existentes?' })).toBeVisible()
  await page.getByRole('button', { name: 'Reclassificar' }).click()
  await expect(page.getByText(/reclassificada/)).toBeVisible()

  const updatedTransaction = await fetchTransaction(supabase, matchingTransaction.id)
  expect(updatedTransaction).toMatchObject({
    category: 'Alimentação',
    budget_group_id: selectableBudgetGroup.id,
    notes: 'Nota existente',
  })
})
