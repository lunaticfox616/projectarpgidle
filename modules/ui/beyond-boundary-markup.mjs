export function formatBeyondBoundarySealStats(runtime, definition, level) {
    return definition.stats.map(stat => {
        let value = Number((stat.val * level).toFixed(2));
        let suffix = runtime.deps.P_STATS[stat.id] && runtime.deps.P_STATS[stat.id].isPct ? '%' : '';
        return `${(0, runtime.deps.escapeHTML)((0, runtime.deps.getStatName)(stat.id))} +${(0, runtime.deps.formatValue)(stat.id, value)}${suffix}`;
    }).join(', ');
}

export function renderBeyondBoundarySeal(runtime, definition, state) {
    let progress = state.seals[definition.id];
    let selected = state.selectedSealId === definition.id;
    let maxed = progress.level >= definition.maxLevel;
    let cost = maxed ? 0 : (0, runtime.deps.getBeyondBoundarySealLevelCost)(progress.level);
    let progressText = maxed ? (selected ? '최대 레벨, 경험치가 더 쌓이지 않으니 다른 인장을 고르세요' : '최대 레벨') : (0, runtime.deps._t)('{xp}/{cost} 경험치', { xp: progress.xp, cost });
    return `<button type="button" class="beyond-seal ${selected ? 'selected' : ''}" onclick="chooseBeyondBoundarySeal('${definition.id}')" ${state.activeRun ? 'disabled' : ''}>
        <span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(definition.name))}</span><strong>Lv.${progress.level}/${definition.maxLevel}</strong>
        <small>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(definition.description))}</small><i>${formatBeyondBoundarySealStats(runtime, definition, progress.level)}</i>
        <em>${progressText}${selected ? (0, runtime.deps._t)(', 성장 대상') : ''}</em>
    </button>`;
}

export function renderBeyondBoundaryMutators(runtime, tier) {
    let profile = (0, runtime.deps.getBeyondBoundaryTierProfile)(tier);
    let activeIds = new Set(profile.mutatorIds);
    let active = runtime.deps.BEYOND_BOUNDARY_MUTATOR_DB.filter(row => activeIds.has(row.id));
    if (active.length <= 0) return '<span class="beyond-mutator empty">추가 변형 없음</span>';
    return active.map(row => `<span class="beyond-mutator"><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))}</b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.description))}</span>`).join('');
}

export function formatBeyondBoundaryCosts(runtime, costs) {
    if (!Array.isArray(costs) || costs.length === 0) return '소모 없음';
    return costs.map(row => `${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)((runtime.deps.ORB_DB[row.key] || {}).name) || row.key)} ${row.amount}`).join(' + ');
}

export function renderBeyondBoundaryRewardFocuses(runtime, state) {
    let selectedId = state.activeRun ? state.activeRun.rewardFocusId : state.selectedRewardFocusId;
    return runtime.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB.map(row => {
        const status = (0, runtime.deps.getBeyondBoundaryRewardFocusStatus)(row.id);
        return `<button type="button" class="beyond-farm-option ${selectedId === row.id ? 'selected' : ''}"
            onclick="chooseBeyondBoundaryRewardFocus('${row.id}')" ${state.activeRun || !status.available ? 'disabled' : ''}>
            <strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))}</strong><span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.description))}</span><small>${(0, runtime.deps.escapeHTML)(status.reason || row.risk)}</small>
        </button>`;
    }).join('');
}

export function renderBeyondBoundaryStartAction(runtime, state) {
    if (state.activeRun) return `<button class="primary" type="button" onclick="viewBeyondBoundaryCombat()">${(0, runtime.deps._t)('전투 보기')}</button><button class="danger" type="button" onclick="leaveBeyondBoundaryRun()">${(0, runtime.deps._t)('도전 포기')}</button>`;
    const status = (0, runtime.deps.getBeyondBoundaryRewardFocusStatus)(state.selectedRewardFocusId);
    const note = status.available ? '' : `<small>${(0, runtime.deps._t)('{reason}, 다른 보상을 선택하세요.', { reason: (0, runtime.deps.escapeHTML)(status.reason) })}</small>`;
    return `<button class="primary" type="button" data-exploration-departure onclick="enterBeyondBoundaryRun()" ${status.available ? '' : 'disabled'}>${(0, runtime.deps._t)('{selectedTier}단계 도전 시작', { selectedTier: state.selectedTier })}</button>${note}`;
}

export function renderBeyondBoundaryIntensities(runtime, state) {
    let selectedId = state.activeRun ? state.activeRun.intensityId : state.selectedIntensityId;
    return runtime.deps.BEYOND_BOUNDARY_INTENSITY_DB.map(row => `<button type="button" class="beyond-farm-option intensity ${selectedId === row.id ? 'selected' : ''}"
        onclick="chooseBeyondBoundaryIntensity('${row.id}')" ${state.activeRun ? 'disabled' : ''}>
        <strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))}</strong><span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.description))}</span><small>${formatBeyondBoundaryCosts(runtime, row.costs)}</small>
    </button>`).join('');
}

export function renderBeyondBoundaryPanel(runtime) {
    let panel = runtime.deps.document.getElementById('ui-beyond-boundary-panel');
    if (!panel) return;
    let state = (0, runtime.deps.ensureBeyondBoundaryState)(runtime.deps.game);
    if (!state.unlocked) { panel.innerHTML = ''; return; }
    let run = state.activeRun;
    let selectedTier = run ? run.tier : state.selectedTier;
    let zone = (0, runtime.deps.getZone)(runtime.deps.BEYOND_BOUNDARY_ZONE_ID);
    let estimate = typeof runtime.deps.buildMapPowerEstimateHtml === 'function' ? (0, runtime.deps.buildMapPowerEstimateHtml)(zone) : '';
    let tierControls = run
        ? `<div class="beyond-run-state"><strong>${(0, runtime.deps._t)('{tier}단계 진행 중', { tier: run.tier })}</strong><span>${(0, runtime.deps._t)('{wave}/{value} 조우', { wave: run.wave, value: runtime.deps.BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER })}</span></div>`
        : `<div class="beyond-tier-controls"><button type="button" onclick="stepBeyondBoundaryTier(-1)" ${state.selectedTier <= 1 ? 'disabled' : ''}>−</button><label>${(0, runtime.deps._t)('도전 단계')}<input type="number" min="1" max="${state.highestTier}" value="${state.selectedTier}" onchange="setBeyondBoundaryTier(this.value)"></label><button type="button" onclick="stepBeyondBoundaryTier(1)" ${state.selectedTier >= state.highestTier ? 'disabled' : ''}>＋</button></div>`;
    let action = renderBeyondBoundaryStartAction(runtime, state);
    panel.innerHTML = `<section class="beyond-head"><div><span>${(0, runtime.deps._t)('연속 조우 도전')}</span><h3>${(0, runtime.deps._t)('경계 너머')}</h3><p>${(0, runtime.deps._t)('다섯 조우를 연속 돌파해 빌드의 한계를 시험합니다. 마지막 조우는 보스전입니다.')}</p></div><dl><div><dt>${(0, runtime.deps._t)('최고 도달')}</dt><dd>${(0, runtime.deps._t)('{bestTier}단계', { bestTier: state.bestTier })}</dd></div><div><dt>${(0, runtime.deps._t)('도전 가능')}</dt><dd>${(0, runtime.deps._t)('{highestTier}단계', { highestTier: state.highestTier })}</dd></div><div><dt>${(0, runtime.deps._t)('완료')}</dt><dd>${(0, runtime.deps._t)('{completions}회', { completions: state.completions })}</dd></div></dl></section>
        <section class="beyond-challenge"><div>${tierControls}<div class="beyond-mutators">${renderBeyondBoundaryMutators(runtime, selectedTier)}</div>${estimate}</div><div class="beyond-actions">${action}</div></section>
        <section class="beyond-farming"><header><div><span>${(0, runtime.deps._t)('파밍 집중')}</span><h3>${(0, runtime.deps._t)('완료 보상 집중')}</h3></div><p>${(0, runtime.deps._t)('원하는 파밍 계열을 고릅니다. 위험은 보상 계열에 따라 달라지고, 조율 재화는 도전 시작 때 한 번만 소모됩니다.')}</p></header><div class="beyond-focus-grid">${renderBeyondBoundaryRewardFocuses(runtime, state)}</div><div class="beyond-intensity-grid">${renderBeyondBoundaryIntensities(runtime, state)}</div></section>
        <section class="beyond-seals"><header><div><span>${(0, runtime.deps._t)('완료 보상')}</span><h3>${(0, runtime.deps._t)('경계 인장 성장')}</h3></div><p>${(0, runtime.deps._t)('선택한 인장에 완료 경험치가 들어갑니다. 획득한 모든 인장 효과는 누적 적용됩니다.')}</p></header><div>${runtime.deps.BEYOND_BOUNDARY_SEAL_DB.map(seal => renderBeyondBoundarySeal(runtime, seal, state)).join('')}</div></section>`;
}
