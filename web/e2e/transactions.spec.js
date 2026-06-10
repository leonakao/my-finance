import { expect, test } from '@playwright/test'
import { createUserSession, fetchRules, fetchTransaction, seedTransactionWithNoGroup } from './helpers/supabase'

async function signIn(page, email, password) {
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

  await page.getByRole('button', { name: 'Regras' }).click()
  await expect(page.getByRole('heading', { name: 'Regras de classificacao' })).toBeVisible()
  await expect(page.getByText('supermercado')).toBeVisible()

  const rules = await fetchRules(supabase)
  expect(rules.some((rule) => rule.match_mode === 'description_amount' && rule.match_description === 'supermercado')).toBe(true)
})
