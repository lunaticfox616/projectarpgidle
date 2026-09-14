// UI entry adapter: the map selects real zone travel, never simulates clears or rewards.
const worldTreeJourneyUi = (() => {
    let signature = '';
    let via = 'grove';
    let hudSignature = '';
    function select(id) {
        if (!worldTreeJourney.definition(id)) return;
        game.worldTreeJourney.selected = id;
        render();
    }
    function route(value) { via = value === 'breach' ? 'breach' : 'grove'; signature = ''; render(); }
    function stage(value) {
        if (!Number.isInteger(value) || value < 1 || value > worldTreeJourney.unlockedStage(game)) return;
        if (game.worldTreeJourney.active || isBeehiveRunLockedForMapTravel()) return;
        game.worldTreeJourney.stage = value;
        game.worldTreeJourney.selected = 'worldtree_guardian';
        game.worldTreeJourney.plan = null;
        game.worldTreeJourney.notice = null;
        game.worldTreeJourney.lastResult = '';
        render();
    }
    function travel() {
        if (game.worldTreeJourney.active) return;
        const target = game.worldTreeJourney.selected;
        const path = worldTreeJourney.pathTo(game, target, via);
        if (!path.length) return;
        depart(path,{nodes:path,stage:game.worldTreeJourney.stage,index:0},true);
    }
    function depart(path,plan,fresh=false) {
        const reason = getZoneTravelBlockReason(path[0]);
        if (reason) return addLog(reason, 'attack-monster');
        const previousLoot = game.explorationLoot;
        changeZone(path[0]);
        if (game.currentZoneId !== path[0] || !game.worldTreeJourney.active) return;
        if (!fresh && previousLoot) game.explorationLoot = previousLoot;
        game.worldTreeJourney.plan = plan;
        game.worldTreeJourney.queue = path.slice(1);
        queueImportantSave(200);
        render();
    }
    function resume() {
        const ledger = game.worldTreeJourney, plan = ledger.plan;
        if (ledger.active || !plan || plan.stage !== ledger.stage) return;
        const remaining = plan.nodes.slice(plan.index);
        if (!remaining.length) return;
        depart(remaining,plan);
    }
    function openMap() {
        if (!document.getElementById('tab-map').classList.contains('active')) switchTab('tab-map');
        switchMapSubtab('map-tab-zones');
        switchMapExploreSubtab('map-explore-worldtree');
    }
    function nextStage() {
        const next = game.worldTreeJourney.stage + 1;
        if (next > worldTreeJourney.unlockedStage(game)) return;
        stage(next);
        openMap();
    }
    function hive() {
        if (!game.worldTreeJourney.hiveDiscovered || !contentProgression.canOpen('map-explore-beehive')) return;
        if (game.worldTreeJourney.active || game.pendingLoopReady) return;
        switchMapExploreSubtab('map-explore-beehive');
    }
    function pause() {
        if (!game.worldTreeJourney.active) return;
        // Finish this map before pausing. No early-clear reward or free reset of a difficult encounter.
        game.worldTreeJourney.queue = [];
        signature = ''; render();
    }
    function nodeHtml(node) {
        const ledger = game.worldTreeJourney;
        const done = worldTreeJourney.cleared(game, node.id);
        const active = ledger.active?.id === node.id;
        const state = active ? '전투 중' : done ? '탐험 완료' : worldTreeJourney.lockReason(game, node.id) ? '미탐험' : '탐험 가능';
        return `<button class="journey-node ${done ? 'is-cleared' : ''} ${active ? 'is-active' : ''} ${node.kind === 'boss' ? 'is-boss' : ''}"
            style="--node-x:${node.x}%;--node-y:${node.y}%" aria-pressed="${ledger.selected === node.id}"
            aria-label="${node.name} · ${state}" onclick="worldTreeJourneyUi.select('${node.id}')" data-journey-node="${node.id}">
            <strong>${node.name}</strong><small>${nodeCaption(node,active,done)}</small></button>`;
    }
    function nodeCaption(node, active, done) {
        if (active) return '탐험 중';
        if (done) return '탐험 완료';
        return {grove:'벌집의 흔적',breach:'공허 균열',boss:'권역 수호자'}[node.kind] || '';
    }
    function linksHtml() {
        const ledger = game.worldTreeJourney;
        const path = selectedPath(ledger);
        const edges = WORLD_TREE_JOURNEY.nodes.flatMap(node => node.parents.map(id => {
            const from = worldTreeJourney.definition(id);
            const done = worldTreeJourney.cleared(game,id) && worldTreeJourney.cleared(game,node.id);
            const chosenParent = node.parents.find(parent => path.includes(parent))
                || node.parents.find(parent => worldTreeJourney.definition(parent).kind === via) || node.parents[0];
            const selected = path.includes(node.id) && id === chosenParent;
            const curve = `M${from.x} ${from.y} C${(from.x+node.x)/2} ${from.y} ${(from.x+node.x)/2} ${node.y} ${node.x} ${node.y}`;
            return `<path class="${selected ? 'is-route' : done ? 'is-explored' : ''}" d="${curve}"/>`;
        }));
        return `<svg class="journey-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${edges.join('')}</svg>`;
    }
    function planTargetsSelection(ledger) {
        return ledger.plan && ledger.plan.index < ledger.plan.nodes.length && ledger.plan.nodes.at(-1) === ledger.selected;
    }
    function selectedPath(ledger) {
        if (ledger.active) return [ledger.active.id,...ledger.queue];
        if (planTargetsSelection(ledger)) return ledger.plan.nodes.slice(ledger.plan.index);
        return worldTreeJourney.pathTo(game,ledger.selected,via);
    }
    function routeChoiceHtml(node) {
        if (!['worldtree_crossing','worldtree_guardian'].includes(node.id)) return '';
        if (planTargetsSelection(game.worldTreeJourney)) return '';
        if (worldTreeJourney.cleared(game,'worldtree_crossing')) return '';
        const disabled = game.worldTreeJourney.active ? 'disabled' : '';
        return `<div class="journey-route-choice" aria-label="탐험 경로">
            <button aria-label="숲길 경유" aria-pressed="${via === 'grove'}" onclick="worldTreeJourneyUi.route('grove')" ${disabled}><strong>숲길</strong><span>${game.worldTreeJourney.hiveDiscovered ? '벌집 원정' : '벌집 발견'}</span></button>
            <button aria-label="균열 경유" aria-pressed="${via === 'breach'}" onclick="worldTreeJourneyUi.route('breach')" ${disabled}><strong>균열길</strong><span>${contentProgression.canDropCurrency('voidChisel') ? '공허의 끌' : '대균열 발견'}</span></button></div>`;
    }
    function detailHtml(powerHtml) {
        const ledger = game.worldTreeJourney, node = worldTreeJourney.definition(ledger.selected);
        const path = worldTreeJourney.pathTo(game, node.id, via);
        const reason = getZoneTravelBlockReason(path[0]);
        const locked = reason || (isBeehiveRunLockedForMapTravel() ? '벌집 원정을 먼저 마무리하세요.' : '');
        const done = worldTreeJourney.cleared(game, node.id);
        const category = {boss:'권역 수호자',breach:'균열 지역'}[node.kind] || '탐험 지역';
        const reward = rewardLabel(node,ledger.stage);
        return `<aside class="journey-detail"><div class="journey-destination"><span class="journey-eyebrow">${category}</span>
            <h3>${node.name}</h3><p class="journey-reward">${reward}</p>${powerHtml}${traitsHtml(node)}</div>
            ${routeChoiceHtml(node)}<div class="journey-actions">
            ${locked ? `<p class="journey-lock">${escapeHTML(locked)}</p>` : ''}
            ${actionsHtml(ledger,done,locked)}</div></aside>`;
    }
    function rewardLabel(node,stage) {
        if (node.kind === 'breach' && !contentProgression.canDropCurrency('voidChisel')) return '대균열 발견 기회';
        if (node.kind === 'boss' && stage === WORLD_TREE_JOURNEY.maxStage) return '권역 완주 · 혼돈계 고유 드랍 기회';
        return node.reward;
    }
    function traitsHtml(node) {
        const zone = createWorldTreeJourneyZone(node.id,game);
        const guards = node.kind === 'boss' ? `<span>${WORLD_TREE_JOURNEY.stages[zone.worldTreeStage-1].label}</span>` : '';
        return `<div class="journey-zone-traits">${guards}${zone.affixes.map(affix =>
            `<details><summary>${escapeHTML(affix.name)}</summary><p>${escapeHTML(affix.desc)}</p></details>`).join('')}</div>`;
    }
    function actionsHtml(ledger, done, locked) {
        const label = ledger.active ? '탐험 진행 중' : done ? '다시 사냥' : '이곳까지 탐험';
        let html = outcomeActionsHtml(ledger);
        if (html && !done && planTargetsSelection(ledger)) return html;
        html += `<button class="journey-travel" data-journey-travel onclick="worldTreeJourneyUi.travel()" ${locked || ledger.active ? 'disabled' : ''}>${label}</button>`;
        if (ledger.active) html += pauseButtonHtml(ledger.queue.length);
        return html;
    }
    function pauseButtonHtml(queued) {
        return `<button onclick="worldTreeJourneyUi.pause()" ${queued ? '' : 'disabled'}>${queued ? '이 지역 완료 후 정지' : '이 지역 완료 후 정지 예정'}</button>`;
    }
    function outcomeActionsHtml(ledger) {
        if (!ledger.notice || ledger.active || isBeehiveRunLockedForMapTravel()) return '';
        if (ledger.plan && ledger.plan.index < ledger.plan.nodes.length) {
            return '<button class="journey-continue" data-journey-resume onclick="worldTreeJourneyUi.resume()">'+(ledger.notice.kind === 'defeat' ? '이 경로로 재도전' : '남은 탐험 계속')+'</button>'+deathLogActionHtml(ledger);
        }
        if (ledger.notice.kind !== 'guardian' || ledger.stage >= WORLD_TREE_JOURNEY.maxStage) return '';
        return '<button class="journey-continue" onclick="worldTreeJourneyUi.nextStage()">다음 심도 열기</button>';
    }
    function deathLogActionHtml(ledger) {
        if (ledger.notice.kind !== 'defeat' || !game.lastDeathLog) return '';
        return '<button onclick="openLastDeathLog()">사망 기록</button>';
    }
    function noticeText(ledger) {
        const notice = ledger.notice;
        if (!notice) return '';
        return {discovery:'벌집을 발견했습니다',guardian:'수호자 처치 · 심도 완료',arrival:'목적지에 도착했습니다',paused:'이 지역까지 탐험했습니다',defeat:'탐험 실패 · 발견한 길은 유지됩니다'}[notice.kind];
    }
    function receiptSummary() {
        const receipt = game.explorationLoot;
        if (!receipt) return '';
        const count = Object.keys(receipt.currencies).length;
        const rows = [];
        if (count) rows.push(`재화 ${count}종`);
        if (receipt.equipmentCount) rows.push(`장비 ${receipt.equipmentCount}개`);
        return rows.join(' · ') || '획득한 재화·장비 없음';
    }
    function completedReceipt() {
        if (game.beehive.inRun) return null;
        return game.worldTreeJourney.notice ? game.explorationLoot : null;
    }
    function hudReceiptAction() {
        return completedReceipt() ? '<button onclick="worldTreeJourneyUi.showReceipt()">획득 보기</button>'
            : '<button onclick="worldTreeJourneyUi.openMap()">탐험 지도</button>';
    }
    function hudSubtitle(ledger,destination) {
        if (completedReceipt()) return receiptSummary();
        return destination.name + (ledger.active ? '까지' : '');
    }
    function receiptHtml() {
        const receipt = game.explorationLoot;
        if (!game.worldTreeJourney.notice || !receipt) return '';
        const currencies = Object.entries(receipt.currencies).map(([key,amount]) =>
            `<span>${window.getStyledOrbName(key)} <b>+${amount.toLocaleString('ko-KR')}</b></span>`).join('');
        const items = receipt.items.map(item => ({...item,location:'획득 장비',reason:''}));
        return `<details class="journey-receipt"><summary>이번 탐험 획득 <span>${receiptSummary()}</span></summary>
            <div class="journey-receipt-currencies">${currencies}</div>
            ${equipmentLootUi.renderHighlights({items,total:items.length})}</details>`;
    }
    function showReceipt() {
        openMap();
        render();
        const panel = document.querySelector('#ui-world-tree-journey .journey-receipt');
        if (!panel) return;
        panel.open = true;
        panel.scrollIntoView({block:'nearest'});
        panel.querySelector('summary').focus({preventScroll:true});
    }
    function updateHud(zone) {
        const host = document.getElementById('ui-world-tree-combat');
        if (!host) return;
        const ledger = game.worldTreeJourney;
        host.hidden = !hudVisible(zone,ledger);
        if (host.hidden) { hudSignature = ''; return; }
        const key = JSON.stringify([ledger.plan,ledger.notice,ledger.active,ledger.queue,game.beehive.inRun,game.beehive.branchStep,completedReceipt()]);
        if (key !== hudSignature) { host.innerHTML = hudHtml(ledger); hudSignature = key; }
        if (zone.worldTreeNode && !ledger.active && ledger.notice) {
            setTextById('ui-progress-label', ledger.notice.kind === 'defeat' ? '재도전 대기' : '탐험 완료');
            setTextById('ui-move-time-text', ledger.notice.kind === 'discovery' ? '거점 발견' : noticeText(ledger));
            setCombatProgressGaugePercent(ledger.notice.kind === 'defeat' ? 0 : 100);
        }
    }
    function hudVisible(zone,ledger) {
        if (zone.worldTreeNode) return !!(ledger.active || ledger.notice);
        return zone.id === 'beehive_run' && !!ledger.plan;
    }
    function hudHtml(ledger) {
        const plan = ledger.plan;
        const total = plan ? plan.nodes.length : 1;
        const current = plan ? Math.min(total,plan.index + Number(!!ledger.active)) : 1;
        const destination = worldTreeJourney.definition(plan ? plan.nodes[total-1] : ledger.selected);
        const title = game.beehive.inRun ? `벌집 원정 · 갈림길 ${game.beehive.branchStep}/10` : noticeText(ledger) || `심도 ${ledger.stage} · 탐험 ${current}/${total}`;
        const discovery = !game.beehive.inRun && ledger.notice?.kind === 'discovery';
        return `<div class="journey-hud-copy" aria-live="polite"><strong>${title}</strong><span>${hudSubtitle(ledger,destination)}</span></div>
            <div class="journey-hud-actions">${outcomeActionsHtml(ledger)}${discovery ? '<button onclick="worldTreeJourneyUi.openMap();worldTreeJourneyUi.hive()">벌집 살펴보기</button>' : ''}
            ${hudReceiptAction()}</div>`;
    }
    function hiveHtml() {
        if (!game.worldTreeJourney.hiveDiscovered || !contentProgression.canOpen('map-explore-beehive')) return '';
        return '<div class="journey-outpost"><button class="journey-hive" onclick="worldTreeJourneyUi.hive()" '+(game.worldTreeJourney.active || game.pendingLoopReady ? 'disabled' : '')+'><span>발견한 거점</span><strong>벌집 원정</strong></button></div>';
    }
    function headerHtml() {
        const ledger = game.worldTreeJourney;
        const completed = worldTreeJourney.cleared(game, 'worldtree_guardian');
        return `<header class="journey-header"><div><span class="journey-eyebrow">세계수 탐험</span><h2>혼돈의 뿌리</h2><p>${noticeText(ledger) || (completed ? '수호자의 길을 열었습니다' : '혼돈 수호자를 찾아서')}</p></div>
            <div class="journey-navigation"><button class="journey-list" onclick="switchMapExploreSubtab('map-explore-hunting')">사냥터 목록</button><div class="journey-stages" aria-label="탐험 심도"><span>심도</span>${[1,2,3].map(value => `<button aria-label="심도 ${value}" aria-pressed="${ledger.stage === value}" onclick="worldTreeJourneyUi.stage(${value})" ${value > worldTreeJourney.unlockedStage(game) || ledger.active || isBeehiveRunLockedForMapTravel() ? 'disabled' : ''}>${['I','II','III'][value-1]}</button>`).join('')}</div></div></header>`;
    }
    function render() {
        const button = document.getElementById('btn-map-explore-worldtree');
        if (button) button.hidden = !game.chaosRealm.unlocked;
        const panel = document.getElementById('ui-world-tree-journey');
        if (!panel || game.mapExploreSubtab !== 'map-explore-worldtree' || game.mapSubtab !== 'map-tab-zones') return;
        const ledger = game.worldTreeJourney;
        const powerHtml = buildMapPowerEstimateHtml(createWorldTreeJourneyZone(ledger.selected, game));
        const key = JSON.stringify([ledger, ledger.notice && game.explorationLoot, game.currentZoneId, game.pendingLoopReady, game.beehive.inRun,
            contentProgression.canOpen('map-explore-beehive'), contentProgression.canDropCurrency('voidChisel'),
            game.chaosRealm.unlocked, hasCurrentLoopChaos20Clear(), via, powerHtml]);
        if (signature === key && panel.innerHTML) return;
        signature = key;
        updatePanel(panel,powerHtml);
    }
    function updatePanel(panel,powerHtml) {
        const ledger = game.worldTreeJourney;
        const receiptOpen = panel.querySelector('.journey-receipt')?.open;
        const focusedLabel = panel.contains(document.activeElement) ? document.activeElement.getAttribute('aria-label') : null;
        panel.innerHTML = `<div class="journey-layout">${headerHtml()}<div class="journey-map" role="group" aria-label="혼돈의 뿌리 탐험 지도">
            <img class="journey-terrain" src="assets/maps/chaos-roots.webp" alt="" decoding="async">
            ${linksHtml()}${WORLD_TREE_JOURNEY.nodes.map(nodeHtml).join('')}
            ${hiveHtml()}</div>${detailHtml(powerHtml)}${receiptHtml()}</div>
            <footer class="journey-status" aria-live="polite">${escapeHTML(ledger.lastResult || (ledger.active ? '목적지로 향하는 중' : ''))}</footer>`;
        if (receiptOpen && panel.querySelector('.journey-receipt')) panel.querySelector('.journey-receipt').open = true;
        if (focusedLabel) [...panel.querySelectorAll('button[aria-label]')].find(entry => entry.getAttribute('aria-label') === focusedLabel)?.focus({preventScroll:true});
    }
    return { render, select, route, stage, travel, hive, pause, resume, openMap, nextStage, updateHud, showReceipt };
})();
safeExposeGlobals({ worldTreeJourneyUi });
