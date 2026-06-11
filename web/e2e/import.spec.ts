import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { signIn } from './helpers/app'
import { createUserSession, fetchTransactions, fetchTransactionsByExternalIds } from './helpers/supabase'

const ACCOUNT_IMPORT_FILE = resolve(process.cwd(), '../inbox/nubank-conta-2026-05.csv')
const ACCOUNT_IMPORT_EXTERNAL_IDS = [
  '69f64647-fe33-4fb6-b1eb-60a7e7e7d41b',
  '69f64a22-1ba6-4d1d-bd8c-80712945a1ff',
  '69f9bf96-d62d-4360-a6c4-9f264769c707',
]
const SANTANDER_CARD_IMPORT_FILE = resolve(process.cwd(), '../inbox/santander-2026-06.pdf')

test('imports a Nubank account CSV from inbox and persists the imported transactions', async ({ page }) => {
  const { email, password, supabase } = await createUserSession()

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Importar' }).click()

  await page.getByLabel('Tipo de arquivo').selectOption('account')
  await page.locator('input[type="file"]').setInputFiles(ACCOUNT_IMPORT_FILE)
  await page.getByRole('button', { name: 'Importar arquivo' }).click()

  await expect(
    page.getByText('Importação concluída: 24 linhas identificadas, 24 inseridas, 0 ignoradas, 0 classificadas automaticamente.'),
  ).toBeVisible()

  const importedTransactions = await fetchTransactionsByExternalIds(supabase, ACCOUNT_IMPORT_EXTERNAL_IDS)

  expect(importedTransactions).toHaveLength(ACCOUNT_IMPORT_EXTERNAL_IDS.length)
  expect(importedTransactions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        external_id: '69f64647-fe33-4fb6-b1eb-60a7e7e7d41b',
        description: 'Resgate RDB',
        type: 'Transferência',
        category: 'Investimentos',
        source: 'Nubank',
      }),
      expect.objectContaining({
        external_id: '69f64a22-1ba6-4d1d-bd8c-80712945a1ff',
        type: 'Despesa',
        category: 'Outros',
        source: 'Nubank',
      }),
      expect.objectContaining({
        external_id: '69f9bf96-d62d-4360-a6c4-9f264769c707',
        type: 'Receita',
        category: 'Outros',
        source: 'Nubank',
      }),
    ]),
  )
})

test('reimporting the same Santander PDF succeeds without duplicating transactions', async ({ page }) => {
  const { email, password, supabase } = await createUserSession()

  await signIn(page, email, password)
  await page.getByRole('link', { name: 'Importar' }).click()

  await page.getByLabel('Tipo de arquivo').selectOption('santander-card-pdf')
  await page.locator('input[type="file"]').setInputFiles(SANTANDER_CARD_IMPORT_FILE)
  await page.getByRole('button', { name: 'Importar arquivo' }).click()

  await expect(
    page.getByText('Importação concluída: 87 linhas identificadas, 87 inseridas, 0 ignoradas, 0 classificadas automaticamente.'),
  ).toBeVisible()
  await expect(page.locator('.feedback.error')).toHaveCount(0)

  const firstImportTransactions = await fetchTransactions(supabase)
  expect(firstImportTransactions.length).toBeGreaterThan(0)

  await page.locator('input[type="file"]').setInputFiles(SANTANDER_CARD_IMPORT_FILE)
  await page.getByRole('button', { name: 'Importar arquivo' }).click()

  await expect(
    page.getByText('Importação concluída: 87 linhas identificadas, 0 inseridas, 87 ignoradas, 0 classificadas automaticamente.'),
  ).toBeVisible()
  await expect(page.locator('.feedback.error')).toHaveCount(0)

  const secondImportTransactions = await fetchTransactions(supabase)
  expect(secondImportTransactions).toHaveLength(firstImportTransactions.length)
})
