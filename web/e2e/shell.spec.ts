import { expect, test } from '@playwright/test'
import { signIn } from './helpers/app'
import { createUserSession } from './helpers/supabase'

test('shows budget group management controls', async ({ page }) => {
  const { email, password } = await createUserSession()

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Grupos' }).click()

  await expect(page.getByRole('heading', { name: 'Gerenciar grupos' })).toBeVisible()
  await expect(page.getByLabel('Nome do grupo', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Meta %')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Criar grupo' })).toBeVisible()
  await expect(page.locator('.budget-group-row')).toHaveCount(3)
})

test('keeps import submit disabled until a file is attached', async ({ page }) => {
  const { email, password } = await createUserSession()

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Importar' }).click()

  const submitButton = page.getByRole('button', { name: 'Importar arquivo' })
  await expect(submitButton).toBeDisabled()
  await page.getByLabel('Tipo de arquivo').selectOption('account')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'nubank-conta.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Data,Descrição,Valor\n01/06/2026,Teste,10,00'),
  })
  await expect(submitButton).toBeEnabled()
})

test('signs out back to login', async ({ page }) => {
  const { email, password } = await createUserSession()

  await signIn(page, email, password)
  await page.getByRole('button', { name: 'Sair' }).click()

  await expect(page.locator('form').getByRole('button', { name: 'Entrar' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Finanças' })).toBeVisible()
})

test('updates the URL when navigating authenticated pages', async ({ page }) => {
  const { email, password } = await createUserSession()

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Regras' }).click()

  await expect(page.getByRole('heading', { name: 'Regras', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/app\/regras$/)
})
