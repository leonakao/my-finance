import { defineConfig } from '@playwright/test'

const webPort = process.env.PLAYWRIGHT_WEB_PORT ?? '4174'
const baseURL = `http://127.0.0.1:${webPort}`

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${webPort}`,
    url: baseURL,
    reuseExistingServer: false,
  },
})
