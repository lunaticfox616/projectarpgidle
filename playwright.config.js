const { defineConfig, devices } = require('@playwright/test');
const testPort = Math.max(1, Number(process.env.PLAYWRIGHT_PORT) || 4173);
const localChromePath = process.env.PLAYWRIGHT_SYSTEM_CHROME || '';

module.exports = defineConfig({
    testDir: './tests/browser',
    globalSetup: require.resolve('./scripts/serve-test.js'),
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: `http://127.0.0.1:${testPort}`,
        launchOptions: localChromePath ? { executablePath: localChromePath } : {},
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    projects: [
        { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
        { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } }
    ]
});
