import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser', testMatch: '**/*.spec.ts', fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:5187', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: { command: 'pnpm exec vite --config vite.browser.config.ts', url: 'http://127.0.0.1:5187', reuseExistingServer: false },
})
