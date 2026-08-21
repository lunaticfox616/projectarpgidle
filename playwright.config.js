const { defineConfig, devices } = require('@playwright/test');
const testPort = Math.max(1, Number(process.env.PLAYWRIGHT_PORT) || 4173);
const localChromePath = process.env.PLAYWRIGHT_SYSTEM_CHROME || '';

module.exports = defineConfig({
    testDir: './tests/browser',
    globalSetup: require.resolve('./scripts/serve-test.js'),
    timeout: 60_000,
    expect: { timeout: 10_000 },
    // CI의 단일 spec 파일도 테스트 단위로 샤딩해 느린 러너 한 대에 몰리지 않게 한다.
    fullyParallel: true,
    // 로컬 정적 서버에 동시 요청이 몰려 검사 자체가 느려지지 않도록 러너당 동시성은 제한한다.
    workers: 2,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: `http://127.0.0.1:${testPort}`,
        launchOptions: localChromePath ? { executablePath: localChromePath } : {},
        // 병렬 페이지가 같은 origin의 서비스 워커를 갱신하며 서로를 새로고침하지 않게 격리한다.
        serviceWorkers: 'block',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    projects: [
        { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
        { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } }
    ]
});
