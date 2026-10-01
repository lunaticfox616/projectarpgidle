function formatBeyondBoundarySealStats(definition, level) {
    return definition.stats.map(stat => {
        let value = Number((stat.val * level).toFixed(2));
        let suffix = P_STATS[stat.id] && P_STATS[stat.id].isPct ? '%' : '';
        return `${escapeHTML(getStatName(stat.id))} +${formatValue(stat.id, value)}${suffix}`;
    }).join(' · ');
}

function renderBeyondBoundarySeal(definition, state) {
    let progress = state.seals[definition.id];
    let selected = state.selectedSealId === definition.id;
    let maxed = progress.level >= definition.maxLevel;
    let cost = maxed ? 0 : getBeyondBoundarySealLevelCost(progress.level);
    let progressText = maxed ? '최대 레벨' : `${progress.xp}/${cost} EXP`;
    return `<button type="button" class="beyond-seal ${selected ? 'selected' : ''}" onclick="chooseBeyondBoundarySeal('${definition.id}')" ${state.activeRun ? 'disabled' : ''}>
        <span>${escapeHTML(definition.name)}</span><strong>Lv.${progress.level}/${definition.maxLevel}</strong>
        <small>${escapeHTML(definition.description)}</small><i>${formatBeyondBoundarySealStats(definition, progress.level)}</i>
        <em>${progressText}${selected ? ' · 성장 대상' : ''}</em>
    </button>`;
}

function renderBeyondBoundaryMutators(tier) {
    let profile = getBeyondBoundaryTierProfile(tier);
    let activeIds = new Set(profile.mutatorIds);
    let active = BEYOND_BOUNDARY_MUTATOR_DB.filter(row => activeIds.has(row.id));
    if (active.length <= 0) return '<span class="beyond-mutator empty">추가 변형 없음</span>';
    return active.map(row => `<span class="beyond-mutator"><b>${escapeHTML(row.name)}</b>${escapeHTML(row.description)}</span>`).join('');
}

function formatBeyondBoundaryCosts(costs) {
    if (!Array.isArray(costs) || costs.length === 0) return '소모 없음';
    return costs.map(row => `${escapeHTML((ORB_DB[row.key] || {}).name || row.key)} ${row.amount}`).join(' + ');
}

function renderBeyondBoundaryRewardFocuses(state) {
    let selectedId = state.activeRun ? state.activeRun.rewardFocusId : state.selectedRewardFocusId;
    return BEYOND_BOUNDARY_REWARD_FOCUS_DB.map(row => {
        const status = getBeyondBoundaryRewardFocusStatus(row.id);
        return `<button type="button" class="beyond-farm-option ${selectedId === row.id ? 'selected' : ''}"
            onclick="chooseBeyondBoundaryRewardFocus('${row.id}')" ${state.activeRun || !status.available ? 'disabled' : ''}>
            <strong>${escapeHTML(row.name)}</strong><span>${escapeHTML(row.description)}</span><small>${escapeHTML(status.reason || row.risk)}</small>
        </button>`;
    }).join('');
}

function renderBeyondBoundaryStartAction(state) {
    if (state.activeRun) return `<button class="primary" type="button" onclick="viewBeyondBoundaryCombat()">전투 보기</button><button class="danger" type="button" onclick="leaveBeyondBoundaryRun()">도전 포기</button>`;
    const status = getBeyondBoundaryRewardFocusStatus(state.selectedRewardFocusId);
    const note = status.available ? '' : `<small>${escapeHTML(status.reason)} · 다른 보상을 선택하세요.</small>`;
    return `<button class="primary" type="button" data-exploration-departure onclick="enterBeyondBoundaryRun()" ${status.available ? '' : 'disabled'}>${state.selectedTier}단계 도전 시작</button>${note}`;
}

function renderBeyondBoundaryIntensities(state) {
    let selectedId = state.activeRun ? state.activeRun.intensityId : state.selectedIntensityId;
    return BEYOND_BOUNDARY_INTENSITY_DB.map(row => `<button type="button" class="beyond-farm-option intensity ${selectedId === row.id ? 'selected' : ''}"
        onclick="chooseBeyondBoundaryIntensity('${row.id}')" ${state.activeRun ? 'disabled' : ''}>
        <strong>${escapeHTML(row.name)}</strong><span>${escapeHTML(row.description)}</span><small>${formatBeyondBoundaryCosts(row.costs)}</small>
    </button>`).join('');
}

function renderBeyondBoundaryPanel() {
    let panel = document.getElementById('ui-beyond-boundary-panel');
    if (!panel) return;
    let state = ensureBeyondBoundaryState(game);
    if (!state.unlocked) { panel.innerHTML = ''; return; }
    let run = state.activeRun;
    let selectedTier = run ? run.tier : state.selectedTier;
    let zone = getZone(BEYOND_BOUNDARY_ZONE_ID);
    let estimate = typeof buildMapPowerEstimateHtml === 'function' ? buildMapPowerEstimateHtml(zone) : '';
    let tierControls = run
        ? `<div class="beyond-run-state"><strong>${run.tier}단계 진행 중</strong><span>${run.wave}/${BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER} 조우</span></div>`
        : `<div class="beyond-tier-controls"><button type="button" onclick="stepBeyondBoundaryTier(-1)" ${state.selectedTier <= 1 ? 'disabled' : ''}>−</button><label>도전 단계<input type="number" min="1" max="${state.highestTier}" value="${state.selectedTier}" onchange="setBeyondBoundaryTier(this.value)"></label><button type="button" onclick="stepBeyondBoundaryTier(1)" ${state.selectedTier >= state.highestTier ? 'disabled' : ''}>＋</button></div>`;
    let action = renderBeyondBoundaryStartAction(state);
    panel.innerHTML = `<section class="beyond-head"><div><span>연속 조우 도전</span><h3>경계 너머</h3><p>다섯 조우를 연속 돌파해 빌드의 한계를 시험합니다. 마지막 조우는 보스전입니다.</p></div><dl><div><dt>최고 도달</dt><dd>${state.bestTier}단계</dd></div><div><dt>도전 가능</dt><dd>${state.highestTier}단계</dd></div><div><dt>완료</dt><dd>${state.completions}회</dd></div></dl></section>
        <section class="beyond-challenge"><div>${tierControls}<div class="beyond-mutators">${renderBeyondBoundaryMutators(selectedTier)}</div>${estimate}</div><div class="beyond-actions">${action}</div></section>
        <section class="beyond-farming"><header><div><span>파밍 집중</span><h3>완료 보상 집중</h3></div><p>원하는 파밍 계열을 고릅니다. 위험은 보상 계열에 따라 달라지고, 조율 재화는 도전 시작 때 한 번만 소모됩니다.</p></header><div class="beyond-focus-grid">${renderBeyondBoundaryRewardFocuses(state)}</div><div class="beyond-intensity-grid">${renderBeyondBoundaryIntensities(state)}</div></section>
        <section class="beyond-seals"><header><div><span>완료 보상</span><h3>경계 인장 성장</h3></div><p>선택한 인장에 완료 경험치가 들어갑니다. 획득한 모든 인장 효과는 누적 적용됩니다.</p></header><div>${BEYOND_BOUNDARY_SEAL_DB.map(seal => renderBeyondBoundarySeal(seal, state)).join('')}</div></section>`;
}

function setBeyondBoundaryTier(value) {
    selectBeyondBoundaryTier(value, game);
    renderBeyondBoundaryPanel();
}

function stepBeyondBoundaryTier(delta) {
    let state = ensureBeyondBoundaryState(game);
    setBeyondBoundaryTier(state.selectedTier + Math.sign(Number(delta) || 0));
}

function chooseBeyondBoundarySeal(sealId) {
    if (!selectBeyondBoundarySeal(sealId, game)) return;
    renderBeyondBoundaryPanel();
    if (typeof saveGame === 'function') saveGame();
}

function chooseBeyondBoundaryRewardFocus(focusId) {
    if (!selectBeyondBoundaryRewardFocus(focusId, game)) return;
    renderBeyondBoundaryPanel();
    if (typeof saveGame === 'function') saveGame();
}

function chooseBeyondBoundaryIntensity(intensityId) {
    if (!selectBeyondBoundaryIntensity(intensityId, game)) return;
    renderBeyondBoundaryPanel();
    if (typeof saveGame === 'function') saveGame();
}

function enterBeyondBoundaryRun() {
    let state = ensureBeyondBoundaryState(game);
    let result = startBeyondBoundaryRun(state.selectedTier, game);
    if (!result.ok) {
        let message = result.code === 'locked' ? '경계 너머가 아직 잠겨 있습니다.'
            : result.code === 'cost' ? `조율 재화가 부족합니다. (필요: ${formatBeyondBoundaryCosts(result.costs)})`
                : '이미 경계 너머에 도전 중입니다.';
        return addLog(result.reason || message, 'attack-monster');
    }
    changeZone(BEYOND_BOUNDARY_ZONE_ID);
    switchTab('tab-battle');
    if (typeof saveGame === 'function') saveGame();
}

function viewBeyondBoundaryCombat() {
    if (!ensureBeyondBoundaryState(game).activeRun) return;
    if (game.currentZoneId !== BEYOND_BOUNDARY_ZONE_ID) changeZone(BEYOND_BOUNDARY_ZONE_ID);
    switchTab('tab-battle');
}

function leaveBeyondBoundaryRun() {
    let returnZoneId = abandonBeyondBoundaryRun(game);
    if (returnZoneId === null || returnZoneId === undefined) return;
    game.currentZoneId = returnZoneId;
    game.killsInZone = 0;
    startMoving(false);
    addLog('경계 너머 도전을 포기했습니다.', 'attack-monster');
    updateStaticUI();
    if (typeof saveGame === 'function') saveGame();
}

safeExposeGlobals({
    renderBeyondBoundaryPanel, setBeyondBoundaryTier, stepBeyondBoundaryTier,
    chooseBeyondBoundarySeal, chooseBeyondBoundaryRewardFocus, chooseBeyondBoundaryIntensity,
    enterBeyondBoundaryRun, viewBeyondBoundaryCombat, leaveBeyondBoundaryRun
});
