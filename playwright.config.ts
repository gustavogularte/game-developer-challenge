import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', workers: 1, timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4187', trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--no-zygote', '--in-process-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {} },
  projects: [
    { name: 'rules', testMatch: '**/*.rules.spec.ts' },
    { name: 'desktop', testMatch: '**/*.browser.spec.ts', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', testMatch: '**/*.browser.spec.ts', use: { ...devices['Pixel 7'], viewport: { width: 915, height: 412 } } },
  ],
  webServer: { command: 'pnpm dev --host 127.0.0.1 --port 4187 --strictPort', url: 'http://127.0.0.1:4187', reuseExistingServer: !process.env.CI },
});
