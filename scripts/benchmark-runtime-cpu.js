// 실제 브라우저에서 "손대지 않고 켜 둔" 전투의 메인 스레드 사용량을 잰다.
// 정확성 검사가 아니라 측정용이다. 결과는 기계·브라우저마다 다르므로 같은 기계에서 전후를 비교한다.
//
//   node scripts/benchmark-runtime-cpu.js                 초반(액트 1) + 엔드게임 둘 다
//   node scripts/benchmark-runtime-cpu.js --only=endgame  엔드게임만
//   node scripts/benchmark-runtime-cpu.js --profile       CPU 프로필 상위 함수도 출력
//   node scripts/benchmark-runtime-cpu.js --out=artifacts/runtime-cpu-after.json
//   node scripts/benchmark-runtime-cpu.js --states=active   입력 중(마우스 움직임) 상태만
//
// 상태
//   active  : 측정 내내 마우스를 조금씩 움직인다(플레이어가 보고 조작하는 중)
//   resting : 20초 넘게 입력이 없다(켜 두고 손대지 않음)
//
// 측정값
//   busyPct   : 측정 구간 동안 메인 스레드가 일한 비율(CDP TaskDuration / 경과 시간)
//   scriptPct : 그중 JS 실행 비율(ScriptDuration)
//   layoutMs / styleMs : 측정 구간의 레이아웃·스타일 재계산 시간 합
//   fps       : requestAnimationFrame 콜백 횟수 / 초
const fs = require('node:fs');
const { chromium } = require('playwright');
process.env.PLAYWRIGHT_PORT ||= '4203';

const args = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const MEASURE_MS = Number(args.seconds || 12) * 1000;
const WARMUP_MS = 4000;
const scenarios = args.only ? String(args.only).split(',') : ['starter', 'endgame'];
const states = args.states ? String(args.states).split(',') : ['active', 'resting'];
const RESTING_WAIT_MS = 21000;
const executablePath = process.env.PLAYWRIGHT_SYSTEM_CHROME || undefined;

async function metrics(cdp) {
    const { metrics: list } = await cdp.send('Performance.getMetrics');
    return Object.fromEntries(list.map(m => [m.name, m.value]));
}

function topFunctions(profile, limit = 15) {
    const byId = new Map(profile.nodes.map(node => [node.id, node]));
    const self = new Map();
    const dt = profile.timeDeltas || [];
    profile.samples.forEach((id, i) => {
        const node = byId.get(id); if (!node) return;
        const { functionName, url, lineNumber } = node.callFrame;
        const file = (url || '').split('/').pop().split('?')[0];
        const key = `${functionName || '(anonymous)'} ${file}:${lineNumber + 1}`;
        self.set(key, (self.get(key) || 0) + (dt[i] || 0) / 1000);
    });
    const total = [...self.values()].reduce((a, b) => a + b, 0);
    return [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
        .map(([name, ms]) => ({ name, ms: Math.round(ms), pct: +(ms / total * 100).toFixed(1) }));
}

async function measure(browser, name, inputState) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto(`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT}/`);
    await page.evaluate(() => { let seed = 29; Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000); });
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready);
    await page.evaluate(() => { tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); });
    let scenario = { name };
    if (name === 'endgame') {
        // 합성 엔드게임 빌드(레벨 100, 소환수 8, 장비·생장판 가득)로 혼돈 지역에서 몹을 계속 상대한다.
        await page.evaluate(() => { clearInterval(gameTickHandle); gameTickHandle = null; });
        scenario = { name, ...(await page.evaluate(require('./lib/offline-endgame-fixture'))) };
        await page.evaluate(() => {
            game.settings.pauseGameOnOverlay = false;
            if (isDeathOverlayOpen()) closeDeathOverlay();
            updateStaticUI(); changeZone(20); syncGameplayTimers();
        });
    }
    // 측정 장치: 튜토리얼·사망 창이 전투를 멈추면 부하가 사라지므로 계속 닫아 전투가 이어지게 한다.
    await page.evaluate(() => {
        game.settings.pauseGameOnOverlay = false;
        window.showNextTutorial = () => {};
        setInterval(() => {
            tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
            if (isDeathOverlayOpen()) closeDeathOverlay();
        }, 250);
    });
    await page.bringToFront();
    await page.mouse.move(720, 450);
    await page.waitForTimeout(inputState === 'resting' ? RESTING_WAIT_MS : WARMUP_MS);
    let wiggle = null;
    if (inputState === 'active') {
        let step = 0;
        wiggle = setInterval(() => { step++; page.mouse.move(700 + (step % 5) * 8, 440 + (step % 3) * 6).catch(() => {}); }, 400);
    }
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable', { timeDomain: 'timeTicks' });
    if (args.profile) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); }
    await page.evaluate(() => { window.__rafCount = 0; const tick = () => { window.__rafCount++; window.__rafId = requestAnimationFrame(tick); }; window.__rafId = requestAnimationFrame(tick); });
    const before = await metrics(cdp);
    const t0 = Date.now();
    await page.waitForTimeout(MEASURE_MS);
    const after = await metrics(cdp);
    if (wiggle) clearInterval(wiggle);
    const elapsed = (Date.now() - t0) / 1000;
    const frames = await page.evaluate(() => { cancelAnimationFrame(window.__rafId); return window.__rafCount; });
    const state = await page.evaluate(() => ({
        enemies: (game.enemies || []).filter(enemy => enemy.hp > 0).length,
        combatPaused: isForegroundGameplayPausedForBackground(),
        summons: (game.summons || []).length,
        domNodes: document.getElementsByTagName('*').length,
        logRows: (document.getElementById('log') || { children: [] }).children.length,
    }));
    const delta = key => (after[key] || 0) - (before[key] || 0);
    const result = {
        scenario, inputState, focused: await page.evaluate(() => document.hasFocus()), elapsedS: +elapsed.toFixed(1), ...state,
        busyPct: +(delta('TaskDuration') / elapsed * 100).toFixed(1),
        scriptPct: +(delta('ScriptDuration') / elapsed * 100).toFixed(1),
        layoutMs: Math.round(delta('LayoutDuration') * 1000),
        styleMs: Math.round(delta('RecalcStyleDuration') * 1000),
        layouts: delta('LayoutCount'), styleRecalcs: delta('RecalcStyleCount'),
        fps: +(frames / elapsed).toFixed(1), heapMB: +((after.JSHeapUsedSize || 0) / 1048576).toFixed(1), errors,
    };
    if (args.profile) { const { profile } = await cdp.send('Profiler.stop'); result.top = topFunctions(profile); }
    await page.close();
    return result;
}

(async () => {
    const stop = await require('./serve-test')();
    let browser;
    try {
        browser = await chromium.launch({ executablePath });
        const results = [];
        for (const name of scenarios) for (const inputState of states) {
            const result = await measure(browser, name, inputState);
            results.push(result);
            const { top, ...summary } = result;
            console.log(JSON.stringify(summary));
            if (top) console.log(top.map(row => `  ${String(row.pct).padStart(5)}% ${String(row.ms).padStart(6)}ms ${row.name}`).join('\n'));
        }
        if (args.out) fs.writeFileSync(args.out, JSON.stringify(results, null, 2) + '\n');
    } finally {
        if (browser) await browser.close();
        await stop();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
