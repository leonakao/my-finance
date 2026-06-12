import { expect, test } from '@playwright/test'
import { addMonths, monthKeyFor, monthLabel, signIn } from './helpers/app'
import {
  createUserSession,
  fetchProjectionExclusions,
  seedProjectionExclusion,
  seedTransaction,
} from './helpers/supabase'

function probableDayFromNow() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return String(tomorrow.getDate()).padStart(2, '0')
}

async function seedProbableEstimate(
  client: Parameters<typeof seedTransaction>[0],
  userId: string,
  description: string,
  amounts: [number, number],
  type: 'Despesa' | 'Receita' = 'Despesa',
) {
  const now = new Date()
  const previousMonth = addMonths(now, -1)
  const secondPreviousMonth = addMonths(now, -2)
  const day = probableDayFromNow()
  const category = type === 'Despesa' ? 'Moradia' : 'Salário'

  await seedTransaction(client, userId, {
    date: `${monthKeyFor(secondPreviousMonth)}-${day}`,
    description,
    amount: amounts[0],
    type,
    category,
  })
  await seedTransaction(client, userId, {
    date: `${monthKeyFor(previousMonth)}-${day}`,
    description,
    amount: amounts[1],
    type,
    category,
  })

  return {
    currentMonth: monthKeyFor(now),
    nextMonth: monthKeyFor(addMonths(now, 1)),
  }
}

async function openMonthlyPage(page: Parameters<typeof signIn>[0]) {
  await page.getByRole('link', { name: 'Mensal' }).click()
}

test('removes a probable estimate only from the selected month and persists the monthly scope', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const description = 'Internet mensal escopo e2e'
  const { nextMonth } = await seedProbableEstimate(supabase, userId, description, [140, 160])

  await signIn(page, email, password)
  await openMonthlyPage(page)

  await page.getByRole('button', { name: `Remover ${description} da projeção` }).click()
  await page.getByRole('button', { name: 'Remover da projeção' }).click()

  await expect(page.getByRole('button', { name: /Ocultando 1 estimativa/i })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Estimativas prováveis' }).getByText(description)).not.toBeVisible()

  const exclusions = await fetchProjectionExclusions(supabase)
  expect(exclusions).toHaveLength(1)
  expect(exclusions[0]).toMatchObject({
    description,
    scope: 'month',
  })

  await page.goto(`/app/mensal?month=${nextMonth}`)
  await expect(page.getByRole('table', { name: 'Estimativas prováveis' }).getByText(description)).toBeVisible()
})

test('removes a probable estimate from the selected month forward and updates the dashboard projection summary', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const description = 'Academia futuro e2e'
  const { nextMonth } = await seedProbableEstimate(supabase, userId, description, [90, 110])

  await signIn(page, email, password)
  await openMonthlyPage(page)

  await page.getByRole('button', { name: `Remover ${description} da projeção` }).click()
  await page.getByRole('radio', { name: /Neste e nos meses futuros/i }).click()
  await page.getByRole('button', { name: 'Remover da projeção' }).click()

  await page.getByRole('link', { name: 'Dashboard' }).click()

  const nextMonthCard = page.locator('.projection-card').filter({
    has: page.getByRole('link', { name: monthLabel(addMonths(new Date(), 1)) }),
  })
  await expect(nextMonthCard).toContainText('0 prováveis')
  await expect(nextMonthCard).toContainText('R$ 0,00')

  await page.goto(`/app/mensal?month=${nextMonth}`)
  await expect(page.getByRole('button', { name: /Ocultando 1 estimativa/i })).toBeVisible()

  const exclusions = await fetchProjectionExclusions(supabase)
  expect(exclusions[0]).toMatchObject({
    description,
    scope: 'from_month',
  })
})

test('shows a grouped hidden-count disclosure and preserves expanded state in the URL', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const currentMonth = monthKeyFor(new Date())

  await seedProbableEstimate(supabase, userId, 'Internet agrupada e2e', [140, 160])
  await seedProbableEstimate(supabase, userId, 'Streaming agrupado e2e', [50, 70])
  await seedProjectionExclusion(supabase, userId, {
    description: 'Internet agrupada e2e',
    normalized_description: 'internet agrupada e2e',
    month_start: `${currentMonth}-01`,
    scope: 'month',
  })
  await seedProjectionExclusion(supabase, userId, {
    description: 'Internet agrupada e2e',
    normalized_description: 'internet agrupada e2e',
    month_start: `${currentMonth}-01`,
    scope: 'from_month',
  })
  await seedProjectionExclusion(supabase, userId, {
    description: 'Streaming agrupado e2e',
    normalized_description: 'streaming agrupado e2e',
    month_start: `${currentMonth}-01`,
    scope: 'month',
  })

  await signIn(page, email, password)
  await openMonthlyPage(page)

  const toggle = page.getByRole('button', { name: /Ocultando 2 estimativas/i })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page).toHaveURL(new RegExp(`/app/mensal\\?month=${currentMonth}&removed=expanded$`))
  await expect(page.getByRole('region', { name: `Estimativas removidas de ${monthLabel(new Date())}` })).toBeVisible()

  await page.goBack()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('restores a removed estimate from the expanded disclosure', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const description = 'Seguro restaurar e2e'
  const currentMonth = monthKeyFor(new Date())

  await seedProbableEstimate(supabase, userId, description, [180, 220])
  await seedProjectionExclusion(supabase, userId, {
    description,
    normalized_description: description.toLowerCase(),
    month_start: `${currentMonth}-01`,
    scope: 'month',
  })

  await signIn(page, email, password)
  await page.goto(`/app/mensal?month=${currentMonth}&removed=expanded`)

  await page.getByRole('button', { name: `Restaurar ${description} na projeção` }).click()

  await expect(page.getByRole('table', { name: 'Estimativas prováveis' }).getByText(description)).toBeVisible()
  await expect(page.getByRole('button', { name: /Ocultando 1 estimativa/i })).not.toBeVisible()
  expect(await fetchProjectionExclusions(supabase)).toHaveLength(0)
})

test('supports undo immediately after a removal', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const description = 'Telefone desfazer e2e'

  await seedProbableEstimate(supabase, userId, description, [80, 100])
  await signIn(page, email, password)
  await openMonthlyPage(page)

  await page.getByRole('button', { name: `Remover ${description} da projeção` }).click()
  await page.getByRole('button', { name: 'Remover da projeção' }).click()
  await page.getByRole('button', { name: 'Desfazer' }).click()

  await expect(page.getByRole('table', { name: 'Estimativas prováveis' }).getByText(description)).toBeVisible()
  expect(await fetchProjectionExclusions(supabase)).toHaveLength(0)
})

test('loads removed estimates expanded from a direct URL', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const description = 'Assinatura deep link e2e'
  const currentMonth = monthKeyFor(new Date())

  await seedProbableEstimate(supabase, userId, description, [30, 60])
  await seedProjectionExclusion(supabase, userId, {
    description,
    normalized_description: description.toLowerCase(),
    month_start: `${currentMonth}-01`,
  })

  await signIn(page, email, password)
  await page.goto(`/app/mensal?month=${currentMonth}&removed=expanded`)

  await expect(page.getByRole('button', { name: /Ocultando 1 estimativa/i })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('region', { name: `Estimativas removidas de ${monthLabel(new Date())}` })).toBeVisible()
})

test('supports the removal flow with keyboard interaction', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const description = 'Teclado projeção e2e'

  await seedProbableEstimate(supabase, userId, description, [55, 75])
  await signIn(page, email, password)
  await openMonthlyPage(page)

  await page.getByRole('button', { name: `Remover ${description} da projeção` }).focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Remover da projeção' }).focus()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('button', { name: /Ocultando 1 estimativa/i })).toBeVisible()
})

test('keeps removal controls usable on mobile touch targets', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const description = 'Mobile projeção e2e'

  await seedProbableEstimate(supabase, userId, description, [120, 160])
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, email, password)
  await page.goto(`/app/mensal?month=${monthKeyFor(new Date())}`)

  const button = page.getByRole('button', { name: `Remover ${description} da projeção` })
  const box = await button.boundingBox()
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)

  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  expect(hasOverflow).toBe(false)
})

test('persists projection exclusions after reload', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const description = 'Persistência projeção e2e'

  await seedProbableEstimate(supabase, userId, description, [45, 55])
  await signIn(page, email, password)
  await openMonthlyPage(page)

  await page.getByRole('button', { name: `Remover ${description} da projeção` }).click()
  await page.getByRole('button', { name: 'Remover da projeção' }).click()
  await expect.poll(async () => (await fetchProjectionExclusions(supabase)).length).toBe(1)
  await page.reload()

  await expect(page).toHaveURL(new RegExp(`/app/mensal\\?month=${monthKeyFor(new Date())}$`))
  await expect(page.getByRole('heading', { name: 'Itens que compõem a projeção' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Ocultando 1 estimativa/i })).toBeVisible({ timeout: 15000 })
  expect((await fetchProjectionExclusions(supabase)).length).toBe(1)
})

test('rolls back the optimistic removal when the network request fails', async ({ page }) => {
  const { email, password, supabase, userId } = await createUserSession()
  const description = 'Rollback projeção e2e'

  await seedProbableEstimate(supabase, userId, description, [70, 90])
  await signIn(page, email, password)
  await openMonthlyPage(page)

  await page.route('**/rest/v1/projection_exclusions*', async (route) => {
    if (route.request().method() === 'POST') {
      await route.abort('failed')
      return
    }

    await route.continue()
  })

  await page.getByRole('button', { name: `Remover ${description} da projeção` }).click()
  await page.getByRole('button', { name: 'Remover da projeção' }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByRole('table', { name: 'Estimativas prováveis' }).getByText(description)).toBeVisible()
  expect(await fetchProjectionExclusions(supabase)).toHaveLength(0)
})
