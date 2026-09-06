// Artifact-only platform boundary. Installed before every production script, never loaded by index.html.
(() => {
    const labOrigin = new URL(document.baseURI).origin;
    function memoryStorage() {
        const storage = Object.create(null);
        Object.defineProperties(storage, {
            getItem: { value:key => Object.hasOwn(storage, key) ? storage[key] : null },
            setItem: { value:(key, value) => { storage[String(key)] = String(value); } },
            removeItem: { value:key => { delete storage[key]; } },
            clear: { value:() => Object.keys(storage).forEach(key => delete storage[key]) },
            key: { value:index => Object.keys(storage)[index] ?? null },
            length: { get:() => Object.keys(storage).length }
        });
        return storage;
    }
    Object.defineProperty(window, 'localStorage', { value:memoryStorage(), configurable:false });
    Object.defineProperty(window, 'sessionStorage', { value:memoryStorage(), configurable:false });
    let ready = false;
    function report(message) { parent.postMessage({ type:'unlock-lab-status', ready, message }, labOrigin); }
    function skipNotices() {
        game.seenTutorials = [...new Set([...game.seenTutorials, ...tutorialQueue.map(notice => notice.key)])];
        tutorialQueue.length = 0;
        if (activeTutorial) dismissTutorial(false);
    }
    function refresh() {
        checkUnlocks(); skipNotices();
        if (game.season >= 2 && !getRenderingUiTabIds().has('tab-unlocks')) switchTab('tab-unlocks');
        updateStaticUI();
    }
    function discover() {
        game.maxZoneId = Math.max(game.maxZoneId, 10);
        game.loopProgressCurrent.chaos20Cleared = true;
        game.loopProgressCurrent.bestAbyssDepth = 30;
        game.abyssUnlockedDepths = [...new Set([...game.abyssUnlockedDepths, 30])];
        game.chaosRealm.unlocked = true;
        game.clearedRootBosses = [...new Set([...game.clearedRootBosses, 's6_beast_cerberus', BEYOND_BOUNDARY_UNLOCK_BOSS_ID])];
        game.labyrinthUnlockedMaxFloor = Math.max(game.labyrinthUnlockedMaxFloor, 100);
        game.underworldProgress.highestFloor = Math.max(game.underworldProgress.highestFloor, 30);
        game.journalEntries = [...new Set([...game.journalEntries, 'woodsman'])];
        game.skyTower.unlocked = true; game.arcana.unlocked = true;
        game.talentBloomClears = Math.max(game.talentBloomClears, 1);
    }
    function command(action, value) {
        if (action === 'loop') {
            if (!Number.isInteger(value) || value < 1 || value > 50) return;
            game.season = value;
        } else if (action === 'point') game.contentProgression.highestLoop++;
        else if (action === 'investment') { game.seasonPoints += 10; game.loopDeepPoints += 10; }
        else if (action === 'discover') discover();
        else if (action !== 'open') return;
        refresh();
        const note = action === 'discover' ? '발견 기록을 채웠습니다. 최소 루프·선행 선택 조건은 그대로입니다.' : '이 페이지 안에서만 반영됩니다.';
        report(`루프 ${game.season} · 해금 ${contentProgression.balance()}P · 루프 패시브 ${game.seasonPoints}P · 심화 ${game.loopDeepPoints}P — ${note}`);
    }
    window.addEventListener('message', event => {
        if (!ready || event.source !== parent || event.origin !== labOrigin || event.data?.type !== 'unlock-lab-command') return;
        try { command(event.data.action, event.data.value); }
        catch (error) { console.error('Unlock test command failed', error); report('테스트 조작 실패: ' + error.message); }
    });
    async function waitFor(check) {
        const deadline = Date.now() + 60000;
        while (!check()) {
            if (Date.now() >= deadline) throw new Error('게임 준비 시간이 초과되었습니다.');
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    async function start() {
        await waitFor(() => window.__startupFirstPaintDone && document.getElementById('btn-startup-guest'));
        document.getElementById('btn-startup-guest').click();
        await waitFor(() => document.querySelector('#loop-hero-select-overlay [data-class-id="warrior"]'));
        document.querySelector('#loop-hero-select-overlay [data-class-id="warrior"]').click();
        await waitFor(() => battleAssets.ready && !isStartupOverlayOpen() && !isLoadingOverlayOpen() && !uiRefreshRunning && !uiRefreshQueued);
        clearInterval(gameTickHandle); gameTickHandle = null;
        new MutationObserver(skipNotices).observe(document.getElementById('tutorial-overlay'), { attributes:true, attributeFilter:['class'] });
        game.season = 2; game.seasonPoints = 10; game.loopDeepPoints = 10;
        ready = true; refresh();
        report(`루프 2 · 해금 ${contentProgression.balance()}P — 장비 제련 뒤 플라스크를 바로 열거나, 다음 성장에 포인트를 모아두세요. 전투는 일시 정지 상태입니다.`);
    }
    document.addEventListener('DOMContentLoaded', () => start().catch(error => {
        console.error('Unlock test initialization failed', error); report(error.message + ' · 초기화하려면 새로고침하세요.');
    }), { once:true });
})();
