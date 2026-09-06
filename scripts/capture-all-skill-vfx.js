// Disposable browser fixture: real skill scheduling, hit resolution and battlefield renderer.
// Each PNG is a game frame, not a generated concept or a composited asset mockup.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium, devices } = require('@playwright/test');
process.env.PLAYWRIGHT_PORT = process.env.PLAYWRIGHT_PORT || '4212';
const startServer = require('./serve-test');
const output = path.resolve(process.env.VFX_CAPTURE_OUTPUT || 'artifacts/all-skill-vfx');

function captureSkill(request) {
    const name = typeof request === 'string' ? request : request.name;
    clearBattleVisualBacklog();
    pendingSkillStageHits = [];
    game.activeSkill = name;
    game.summons = [];
    game.gridPlayer = { gx: 3, gy: 4, gridMoveTimer: 0 };
    const enemyCells = [[4, 4], [4, 3], [5, 4], [5, 5]].slice(0, request.targetCount || 4);
    game.enemies = enemyCells.map(([gx, gy], index) =>
        Object.assign(createEnemy(getZone(1), { at: 20, count: 4 }, index),
            { gx, gy, hp: 100000, maxHp: 100000, spriteVariantId: 'woodPuppet-0', spawnStamp: 0 }));
    battleVisualState.enemySmoothPos = {};
    battleVisualState.playerGridMotion = null;
    battleVisualState.playerFacingDirection = 'east';
    battleVisualState.visualNow = 1000;
    battleVisualState.lastWallNow = performance.now();
    renderBattlefield(true);
    const stats = getPlayerStats();
    stats.sSkill = { ...stats.sSkill, ...SKILL_DB[name], finalLevel: 1, dmg: 1, spd: 1 };
    const profile = SKILL_GEM_VFX_PROFILES[name];
    if (profile.family === 'summon') {
        const summon = buildSummonRuntimeStats({ name, source: 'skill', slotIdx: 0 }, stats, getCombatTime());
        summon.id = 1;
        resolveSummonHit(summon, stats, game.enemies[0], false);
    } else performPlayerAttack(stats, { skillName: name, forcedCrit: false });
    const initial = battleFx.map(fx => ({ type: fx.type, pattern: fx.patternKind, footprint: fx.attackFootprint }));
    const baseTime = getCombatTime();
    const firstArrival = pendingSkillStageHits.length ? Math.min(...pendingSkillStageHits.map(row => row.at)) - baseTime : 0;
    if (request.prepareOnly) return {baseTime, firstArrival};
    const samples = name === '지진 파쇄'
        ? [firstArrival + 70, firstArrival + SKILL_DB[name].aftershockDelayMs + 70, firstArrival + SKILL_DB[name].aftershockDelayMs + 220]
        : [Math.max(40, firstArrival - 80), firstArrival + 70, firstArrival + (SKILL_DB[name].combatPattern?.stages?.at(-1).delayMs || 0) + 180];
    const frames = [];
    const renderMs = [];
    let hits = 0;
    const seen = new Set();
    for (let time = 0; time <= Math.max(...samples) + 20; time += 20) {
        game.combatTimeMs = baseTime + time;
        battleVisualState.visualNow = 1000 + time;
        battleVisualState.lastWallNow = performance.now();
        processPendingSkillStageHits();
        const renderStart = performance.now();
        renderBattlefield(true);
        renderMs.push(performance.now() - renderStart);
        for (const fx of battleFx.filter(row => row.type === 'hit')) {
            if (!seen.has(fx.id)) { seen.add(fx.id); hits++; }
        }
        if (frames.length < samples.length && time >= samples[frames.length]) {
            frames.push(document.getElementById('battlefield-canvas').toDataURL('image/png'));
        }
    }
    renderMs.sort((a, b) => a - b);
    return { name, family: profile.family, firstArrival, hits, initial, frames,
        renderP95Ms: renderMs[Math.floor(renderMs.length * 0.95)] };
}

async function capture(browser, mobile) {
    const context = await browser.newContext({
        ...(mobile ? devices['Pixel 5'] : { viewport: { width: 1440, height: 900 } }),
        serviceWorkers: 'block'
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto(`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT}/`);
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    const names = await page.evaluate(() => {
        // The fixture owns the clock. combatHalted alone is cleared by normal-zone recovery.
        clearInterval(gameTickHandle);
        gameTickHandle = null;
        const requestFrame = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = callback => callback === gameLoop ? 0 : requestFrame(callback);
        const image = battleAssets.images.skillFxImpactFlare;
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let transparent = 0;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 0) transparent++;
        if (transparent / (pixels.length / 4) < 0.6) throw new Error('Impact flare must retain real transparent alpha');
        tutorialQueue.length = 0;
        if (activeTutorial) dismissTutorial(false);
        game.settings.pauseGameOnOverlay = false;
        game.combatHalted = true;
        Math.random = () => 0.5;
        switchTab('tab-battle');
        return Object.keys(SKILL_GEM_VFX_PROFILES);
    });
    const rows = [];
    for (const [index, name] of names.entries()) {
        const result = await page.evaluate(captureSkill, { name, targetCount: Number(process.env.VFX_TARGET_COUNT) || 4 });
        assert(result.initial.length > 0 && result.hits > 0, `${name}: real combat must resolve hits and emit effects`);
        const files = result.frames.map((frame, phase) => {
            const file = `${mobile ? 'mobile' : 'desktop'}-${String(index).padStart(2, '0')}-${phase}.png`;
            fs.writeFileSync(path.join(output, file), Buffer.from(frame.split(',')[1], 'base64'));
            return file;
        });
        rows.push({ ...result, frames: files });
    }
    if (!mobile && !process.env.VFX_STILLS_ONLY) await capturePixelMotion(page);
    assert.deepStrictEqual(errors, [], 'all skills must render without browser errors');
    await context.close();
    return rows;
}

/** Capture real rendered game frames, including damage timing, into a silent browser-native video. */
async function recordPixelMotion({baseTime}) {
    const canvas = document.getElementById('battlefield-canvas');
    const stream = canvas.captureStream(20);
    const recorder = new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:2200000});
    const chunks = [];
    recorder.ondataavailable = event => chunks.push(event.data);
    const finished = new Promise(resolve => {recorder.onstop=resolve;});
    recorder.start();
    const wallStart=performance.now();
    for (let time=0;time<=2200;time=performance.now()-wallStart) {
        const frameStart=performance.now();
        game.combatTimeMs=baseTime+time;
        battleVisualState.visualNow=1000+time;
        battleVisualState.lastWallNow=performance.now();
        processPendingSkillStageHits();
        renderBattlefield(true);
        await new Promise(resolve=>setTimeout(resolve,Math.max(0,50-(performance.now()-frameStart))));
    }
    recorder.stop();
    await finished;
    stream.getTracks().forEach(track=>track.stop());
    const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());
    let binary='';
    for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(binary);
}

async function capturePixelMotion(page) {
    const names=['중력 붕괴','빙결 침식','화염 부패','심연 전염','화염 폭풍핵','지진 파쇄',
        '용암 강타','공허 베기','혈기 폭쇄','연쇄 폭풍','불멸의 진동','천뢰 분기','삼원 파동',
        '뇌격 삼연타','난타 눈보라','룬 지뢰','원소 포션 투척','방패 돌진','그림자 점멸','공허 절삭광'];
    const cards=[];
    for(const [index,name] of names.entries()) {
        const prepared=await page.evaluate(captureSkill,{name,prepareOnly:true});
        const video=await page.evaluate(recordPixelMotion,prepared);
        fs.writeFileSync(path.join(output,`pixel-${index}.webm`),Buffer.from(video,'base64'));
        const skillIndex=await page.evaluate(name=>Object.keys(SKILL_GEM_VFX_PROFILES).indexOf(name),name);
        cards.push(`<article><h2>${name}</h2><video controls muted loop playsinline preload="none" poster="desktop-${String(skillIndex).padStart(2,'0')}-1.png" src="pixel-${index}.webm"></video></article>`);
    }
    fs.writeFileSync(path.join(output,'pixel-motion.html'),`<!doctype html><html lang="ko"><meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1"><title>픽셀 스킬 실제 전투</title>
        <style>body{background:#151519;color:#eee6d7;font:16px system-ui;margin:24px}h1{font-size:25px}
        main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,560px),1fr));gap:20px}
        article{background:#232327;border:1px solid #3c3933;border-radius:8px;overflow:hidden}h2{font-size:18px;margin:16px}
        video{width:100%;display:block}a{color:#d7b979}p{max-width:850px;line-height:1.7}</style>
        <h1>이미지 스프라이트 · 실제 전투 20종</h1><p>준비 → 적중 → 소멸을 실제 게임에서 녹화했습니다.
        재생을 누른 영상 하나만 실행됩니다. 다른 영상을 재생하면 이전 영상은 멈춥니다.</p>
        <p>지면 장판은 캐릭터 아래, 불기둥은 앞에 표시됩니다. 지진은 적을 친 뒤 주변에 쐐기가 솟고, 플레이어 칸은 비웁니다.
        <a href="index.html">전체 52종 · 데스크톱/모바일 정지 화면</a></p><main>${cards.join('')}</main>
        <script>document.addEventListener('play',event=>{document.querySelectorAll('video').forEach(video=>{if(video!==event.target)video.pause();});},true);</script></html>`);
}

function writeGallery(rows) {
    fs.writeFileSync(path.join(output, 'coverage.json'), JSON.stringify(rows, null, 2));
    const cards = rows.map(row => `<article><h2>${row.name}</h2><p>${row.family} · 적중 ${row.hits}회</p>
        <a href="${row.frames[1]}"><img src="${row.frames[1]}" loading="lazy"></a>
        <nav>${row.frames.map((frame, i) => `<a href="${frame}">${['발사/예열', '적중', '잔상'][i]}</a>`).join(' · ')}</nav></article>`).join('');
    fs.writeFileSync(path.join(output, 'index.html'), `<!doctype html><meta charset="utf-8">
        <title>스킬 이펙트 전체 검수</title><style>body{background:#12151a;color:#e8e3d5;font:16px sans-serif;margin:24px}
        main{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px}article{background:#20242a;padding:12px;border-radius:8px}
        img{width:100%}h2{font-size:18px;margin:0}p,nav{font-size:13px}a{color:#dfc887}</style>
        <h1>스킬 이펙트 전체 검수</h1><p>실제 게임 렌더러 · 고정된 검수용 전장 · 이미지 클릭 시 원본. 플레이테스트 결과가 아닙니다.</p><main>${cards}</main>`);
}

async function writeContactSheets(browser, rows, mobile) {
    const page = await browser.newPage({ viewport: { width: 1320, height: 1120 } });
    for (let index = 0; index < Math.ceil(rows.length / 16); index++) {
        const cards = rows.slice(index * 16, index * 16 + 16).map(row => {
            const png = fs.readFileSync(path.join(output, row.frames[1])).toString('base64');
            return `<article><h3>${row.name}</h3><div><img src="data:image/png;base64,${png}"></div></article>`;
        }).join('');
        const imageStyle = mobile ? 'width:574px;left:-100px;top:-115px' : 'width:782px;left:-250px;top:-185px';
        await page.setContent(`<style>body{margin:8px;background:#18191d;color:#ddd;font:14px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
            h3{margin:5px}article{background:#29292e}div{position:relative;height:245px;overflow:hidden}img{position:absolute;${imageStyle}}</style>${cards}`);
        await page.evaluate(() => Promise.all(Array.from(document.images, image => image.decode())));
        await page.screenshot({ path: path.join(output, `${mobile ? 'mobile-' : ''}contact-${index}.png`) });
    }
    await page.close();
}

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const stopServer = await startServer();
    const browser = await chromium.launch();
    try {
        const desktop = await capture(browser, false);
        const mobile = await capture(browser, true);
        writeGallery([...desktop, ...mobile]);
        await writeContactSheets(browser, desktop, false);
        await writeContactSheets(browser, mobile, true);
        console.log(`Captured ${desktop.length} skills on desktop and ${mobile.length} on mobile: ${output}`);
    } finally {
        await browser.close();
        await stopServer();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
