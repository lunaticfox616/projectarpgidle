// 스킬트리 창: 검색과 필터, 투자 요약, 프리셋, 초기화, 공허 노드 제작, 노드 설명 (2026-11-10에 js/ui.js에서 그대로 옮겼다. js/ui.js 뒤에 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
function ensurePassiveTreeSearchSettings() {
    if (typeof game !== 'undefined' && game) {
        if (!game.settings || typeof game.settings !== 'object') game.settings = {};
        if (typeof game.settings.passiveTreeSearch !== 'string') game.settings.passiveTreeSearch = passiveTreeSearch || '';
        if (typeof game.settings.passiveTreeFilter !== 'string') game.settings.passiveTreeFilter = passiveTreeFilter || 'all';
        passiveTreeSearch = game.settings.passiveTreeSearch;
        passiveTreeFilter = game.settings.passiveTreeFilter;
    }
    return { search: passiveTreeSearch || '', filter: passiveTreeFilter || 'all' };
}

function getPassiveTreeSearchState() {
    return ensurePassiveTreeSearchSettings();
}

function getPassiveTreeNodeSearchText(node) {
    if (!node) return '';
    let parts = [
        node.id,
        _t(node.title),
        getPassiveNodeDisplayName(node),
        getPassiveEffectLabel(node),
        getStatName(node.stat)
    ];
    return parts.filter(Boolean).join(' ').toLowerCase();
}

function getPassiveTreeNodeCategory(node) {
    let stat = node && node.stat;
    if (node && node.kind === 'void') return 'utility';
    if (['flatDmg', 'pctDmg', 'meleePctDmg', 'physPctDmg', 'aoePctDmg', 'projectilePctDmg', 'crit', 'critDmg', 'ds', 'physIgnore', 'igniteChance', 'chillChance', 'freezeChance', 'shockChance', 'poisonChance', 'bleedChance'].includes(stat)) return 'offense';
    if (['flatHp', 'pctHp', 'regen', 'leech', 'armor', 'armorPct', 'evasion', 'evasionPct', 'energyShield', 'energyShieldPct', 'energyShieldRegen', 'deflectChance', 'dr', 'blockChance', 'blockChancePct', 'resF', 'resC', 'resL', 'resAll', 'resChaos', 'ailResIgnite', 'ailResShock', 'ailResFreeze', 'ailResPoison', 'ailResBleed'].includes(stat)) return 'defense';
    if (['firePctDmg', 'coldPctDmg', 'lightPctDmg', 'chaosPctDmg', 'elementalPctDmg', 'dotPctDmg', 'resPen'].includes(stat)) return 'element';
    if (['aspd', 'move', 'suppCap', 'gemLevel', 'expGain'].includes(stat)) return 'utility';
    return 'other';
}

function doesPassiveNodeMatchSearch(node, query) {
    let q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    return q.split(/\s+/).filter(Boolean).every(token => getPassiveTreeNodeSearchText(node).includes(token));
}

function doesPassiveNodeMatchFilter(node, filter) {
    let f = filter || 'all';
    if (f === 'all') return true;
    if (f === 'offense') return getPassiveTreeNodeCategory(node) === 'offense' || getPassiveTreeNodeCategory(node) === 'element';
    return getPassiveTreeNodeCategory(node) === f;
}

function getPassiveNodeSearchMatch(node) {
    let state = getPassiveTreeSearchState();
    let query = String(state.search || '').trim();
    let filter = state.filter || 'all';
    let active = !!query || filter !== 'all';
    if (!active) return { active: false, matches: true, query, filter };
    if (node && typeof getPassiveVisibility === 'function' && getPassiveVisibility(node.id) === 'hidden') {
        return { active: true, matches: false, query, filter };
    }
    return {
        active: true,
        matches: doesPassiveNodeMatchSearch(node, query) && doesPassiveNodeMatchFilter(node, filter),
        query,
        filter
    };
}

function setPassiveTreeSearchState(next) {
    let cur = ensurePassiveTreeSearchSettings();
    let search = next && next.search !== undefined ? String(next.search || '') : cur.search;
    let filter = next && next.filter !== undefined ? String(next.filter || 'all') : cur.filter;
    if (!['all', 'offense', 'defense', 'element', 'utility'].includes(filter)) filter = 'all';
    passiveTreeSearch = search;
    passiveTreeFilter = filter;
    if (typeof game !== 'undefined' && game) {
        if (!game.settings || typeof game.settings !== 'object') game.settings = {};
        game.settings.passiveTreeSearch = passiveTreeSearch;
        game.settings.passiveTreeFilter = passiveTreeFilter;
    }
    syncPassiveTreeSearchControls();
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('state');
    if (document.getElementById('tab-char') && document.getElementById('tab-char').classList.contains('active')) {
        resizePassiveTreeCanvas(false);
        drawPassiveTree();
    }
}

function syncPassiveTreeSearchControls() {
    let state = ensurePassiveTreeSearchSettings();
    let input = document.getElementById('passive-search-input');
    if (input && input.value !== state.search) input.value = state.search;
    document.querySelectorAll('[data-passive-filter]').forEach(btn => {
        let active = btn.dataset.passiveFilter === state.filter;
        // 고른 필터 모양은 스킨 CSS가 그린다(예전에는 남색 판 · 파란 광택을 여기서 직접 칠했다).
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
}

function getAllocatedPassiveStatSummary() {
    const totals = {};
    const specialEffects = [];
    const allocatedIds = Array.isArray(game.passives) ? game.passives : [];
    const virtualVoidCount = getVirtualVoidPassiveCount();
    let voidCount = 0;
    const add = (stat, value) => {
        if (!stat || !P_STATS[stat] || !Number.isFinite(Number(value))) return;
        totals[stat] = (totals[stat] || 0) + Number(value);
    };
    allocatedIds.forEach(id => {
        const node = PASSIVE_TREE.nodes[id];
        if (!node) return;
        if (node.kind === 'void') {
            voidCount++;
            const entry = game.voidPassives && game.voidPassives[String(id)];
            passiveRouting.voidStats(entry, game, getVoidLinkScale(id)).forEach(line => add(line && line.id, line && line.val));
            getTranscendentVoidPassiveStats(id, entry, virtualVoidCount).forEach(line => add(line.stat, line.val));
            if (entry && entry.transcendent) {
                const def = (typeof TRANSCENDENT_VOID_PASSIVE_DB !== 'undefined' ? TRANSCENDENT_VOID_PASSIVE_DB : []).find(row => row.id === entry.transcendent.id);
                specialEffects.push(def ? _t('초월, {name}', { name: def.name }) : '초월 공허 효과');
            }
            return;
        }
        getEffectivePassiveNodeEffects(node).forEach(effect => add(effect.stat, effect.val));
    });
    const specialization = typeof ensurePassiveSpecializationState === 'function' ? ensurePassiveSpecializationState() : null;
    if ((totals.mystique || 0) > 0) specialEffects.push(`신비 ${formatValue('mystique', totals.mystique)}, 최고 피해 속성 상태이상 강화`);
    if ((totals.devotion || 0) > 0 && specialization) {
        const revelationLabel = { combat: '전투', guard: '수호', life: '생명' }[specialization.revelation] || '전투';
        specialEffects.push(`${revelationLabel}의 계시, 헌신 ${formatValue('devotion', totals.devotion)}`);
    }
    if ((totals.cycle || 0) > 0) specialEffects.push(`순환 ${formatValue('cycle', totals.cycle)}, 상태이상 종료 시 6초 강화`);
    if (game.passiveStarEvolution) {
        specialEffects.push(game.passiveStarEvolutionSource === 'legacy_migrated'
            ? '성좌 각성, 기존 트리에서 영구 계승'
            : '성좌 각성, 별의 공명 영구 활성');
    } else if (typeof getPassiveConstellationAwakeningProgress === 'function') {
        const progress = getPassiveConstellationAwakeningProgress();
        if (progress.mode === 'outer_void' && progress.allocated > 0) {
            specialEffects.push(`성좌 각성 ${progress.completed}/${progress.required}, 직업 공허 소켓을 모두 활성화`);
        }
    }
    return {
        allocatedCount: allocatedIds.filter(id => PASSIVE_TREE.nodes[id] && PASSIVE_TREE.nodes[id].kind !== 'start').length,
        voidCount,
        totals: Object.entries(totals).sort((a, b) => getStatName(a[0]).localeCompare(getStatName(b[0]), 'ko')),
        specialEffects
    };
}

function renderPassiveSpecializationControls() {
    if (typeof ensurePassiveSpecializationState !== 'function') return '';
    const state = ensurePassiveSpecializationState();
    const devotion = typeof getAllocatedPassiveStatValue === 'function' ? getAllocatedPassiveStatValue('devotion') : 0;
    const revelationUnlocked = devotion >= 1;
    const tripleRevelation = typeof findAllocatedPassiveKeystone === 'function' && !!findAllocatedPassiveKeystone('삼중 계시');
    const revelationLabels = { combat: '전투의 계시', guard: '수호의 계시', life: '생명의 성약' };
    const revelationOptions = Object.entries(revelationLabels).map(([id, label]) =>
        `<option value="${id}" ${state.revelation === id ? 'selected' : ''}>${label}</option>`).join('');
    const wisdomNode = typeof findAllocatedPassiveKeystone === 'function' ? findAllocatedPassiveKeystone('지혜의 도약') : null;
    if (!revelationUnlocked && !tripleRevelation && !wisdomNode) return '';
    const renderRevelationSelector = () => {
        if (!revelationUnlocked && !tripleRevelation) return '';
        return `<label>${_t('계시')}<select onchange="onPassiveRevelationChanged(this.value)" ${tripleRevelation ? 'disabled' : ''}>${revelationOptions}</select></label>`;
    };
    const elementLabels = { fire: '화염', cold: '냉기', lightning: '번개', chaos: '공허(카오스)', '': '속성 노드 미투자' };
    const wisdomElement = getPassiveWisdomElementFromNodeIds(game.passives);
    return `<div class="passive-specialization-controls">${renderRevelationSelector()}
        ${tripleRevelation ? _t('<span class="passive-specialization-locked">삼중 계시: 세 효과가 40%로 고정 적용</span>') : ''}
        ${wisdomNode ? `<span class="passive-specialization-locked">${_t('지혜의 도약, {elementLabels}', { elementLabels: elementLabels[wisdomElement] })} <small>${_t('투자한 노드 기준')}</small></span>` : ''}</div>`;
}

function onPassiveRevelationChanged(value) {
    if (typeof setPassiveRevelation !== 'function' || !setPassiveRevelation(value)) {
        addLog(_t('헌신이 1 이상일 때만 계시를 선택할 수 있습니다.'), 'attack-monster');
        return;
    }
    updateStaticUI();
    queueImportantSave(180);
}

function renderPassiveInvestmentSummary() {
    const panel = document.getElementById('passive-investment-summary');
    const body = document.getElementById('passive-investment-summary-body');
    if (!panel || !body) return;
    if (typeof syncPassiveAttributePreferenceControls === 'function') syncPassiveAttributePreferenceControls();
    if (!game.settings || typeof game.settings !== 'object') game.settings = {};
    const collapsed = !!game.settings.passiveInvestmentSummaryCollapsed;
    panel.classList.toggle('collapsed', collapsed);
    const toggle = panel.querySelector('.passive-investment-summary-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    const summary = getAllocatedPassiveStatSummary();
    const rows = summary.totals.length
        ? summary.totals.map(([stat, value]) => `<span>${getStatName(stat)}</span><strong style="color:${getItemStatToneColor(stat)}">+${formatValue(stat, value)}${P_STATS[stat] && P_STATS[stat].isPct ? '%' : ''}</strong>`).join('')
        : '<span>아직 투자한 효과가 없습니다.</span><strong>-</strong>';
    const specials = summary.specialEffects.length
        ? `<div class="passive-summary-specials">${_t('조건부 효과, {specialEffects}', { specialEffects: summary.specialEffects.join(', ') })}</div>`
        : '';
    writeHtmlIfChanged(body, `<div class="passive-summary-meta">투자 ${summary.allocatedCount}개${summary.voidCount ? _t(', 공허 {voidCount}개', { voidCount: summary.voidCount }) : ''}</div>${renderPassiveSpecializationControls()}<div class="passive-summary-grid">${rows}</div>${specials}`);
    renderPassiveTreePlannerPanel();
}

function togglePassiveInvestmentSummary() {
    if (!game.settings || typeof game.settings !== 'object') game.settings = {};
    game.settings.passiveInvestmentSummaryCollapsed = !game.settings.passiveInvestmentSummaryCollapsed;
    renderPassiveInvestmentSummary();
}

/** 스킬트리 머리: 남은 포인트와 초기화 단추(resetPassiveTreeByGoldenRule, 2026-10-22 거래소에서 옮김). 단추는 기본 트리에 찍은 노드가
 * 있을 때만 보인다. 누르면 확인 창이 돌려받을 점수를 묻고, 황금률이 없으면 그렇다고 알린다. */
function syncPassiveTreeHeader() {
    document.getElementById('ui-passive-points').innerText = game.passivePoints;
    const button = document.getElementById('btn-passive-tree-reset');
    if (!button) return;
    const count = getPaidPassiveNodeIds(game.passives).length, title = _t('황금률 1개로 찍은 {count}점을 모두 돌려받습니다. 루프 패시브, 심화 패시브와 전직은 그대로입니다.', { count });
    if (button.hidden !== count <= 0) button.hidden = count <= 0;
    if (button.dataset.tip !== title) button.dataset.tip = title;
}

/** 기본 스킬트리 초기화를 지금 못 하는 까닭('' 이면 된다): 방치 전투 정산(끝나면 game이 바뀌어 초기화가 사라진다), 나무꾼 전투,
 * 황금률, 찍은 노드. */
function getPassiveTreeResetBlockReason() {
    const replay = shopView.busyReason();
    if (replay) return replay;
    if (game.woodsmanBuildLock) return '☠️ 나무꾼 전투 중에는 스킬트리를 초기화할 수 없습니다.';
    if ((game.currencies.goldenRule || 0) < 1) return '황금률이 부족합니다.';
    return getPaidPassiveNodeIds(game.passives).length > 0 ? '' : '초기화할 스킬트리 노드가 없습니다.';
}

/** 기본 스킬트리 초기화(스킬트리 머리의 단추, 2026-10-22 거래소 특수 서비스에서 옮김): 황금률 1개로 기본 트리에 찍은 점수를 모두
 * 돌려받는다. 루프 패시브, 심화 패시브와 전직은 그대로다. 직업 시작점은 소유 목록에 넣지 않아도 늘 무료 연결점이다. */
async function resetPassiveTreeByGoldenRule() {
    const button = document.getElementById('btn-passive-tree-reset');
    if (button && button.disabled) return;
    const blocked = getPassiveTreeResetBlockReason();
    if (blocked) return addLog(blocked, 'attack-monster');
    const owner = game, spentNodes = getPaidPassiveNodeIds(game.passives).length, before = game.passives.join('|');
    // 확인 창이 열린 동안 단추를 잠가 두 번째 확인 창이 줄 서지 않게 한다. 기다리는 사이 방치 정산이나 저장 불러오기가 game을
    // 바꿀 수 있어, 확인 뒤에는 같은 game인지부터 다시 본다.
    if (button) button.disabled = true;
    let accepted = false;
    try {
        accepted = await requestGameConfirmation(`황금률 1개로 기본 스킬트리를 초기화하고 ${spentNodes}점을 돌려받습니다.\n루프 패시브, 심화 패시브와 전직은 그대로입니다.`, {
            title: _t('스킬트리 초기화'),
            tone: 'danger',
            confirmLabel: _t('초기화')
        });
    } finally {
        if (button) button.disabled = false;
    }
    if (!accepted) return;
    if (game !== owner || getPassiveTreeResetBlockReason() || game.passives.join('|') !== before) {
        return addLog(_t('확인하는 사이 게임 상태, 스킬트리나 재화가 바뀌어 초기화를 취소했습니다.'), 'attack-monster');
    }
    game.currencies.goldenRule -= 1;
    const grantedPoints = passiveRouting.paleBonus(game);
    game.passives = [];
    game.passiveAttributeChoices = {};
    game.passivePoints = Math.max(0, game.passivePoints + spentNodes - grantedPoints);
    calculateReachableNodes();
    refreshPassiveVisibility();
    addLog(_t('🧠 스킬트리 초기화: {spentNodes}점을 돌려받았습니다.', { spentNodes }), 'season-up');
    updateStaticUI();
}

function renderPassiveTreePlannerPanel() {
    let host = document.getElementById('passive-tree-planner');
    if (!host || typeof ensurePassiveTreePlannerState !== 'function') return;
    let planner = ensurePassiveTreePlannerState();
    let active = planner.presets[planner.activeSlot];
    let owned = new Set(game.passives || []);
    let completed = active ? active.nodeIds.filter(id => owned.has(id)).length : 0;
    let signature = JSON.stringify([planner.activeSlot, planner.autoInvest, game.settings.passiveTreeShowLabels !== false,
        completed, planner.presets.map(preset => preset ? [preset.name, preset.nodeIds.length] : null)]);
    if (host.dataset.plannerSignature === signature) return;
    let options = planner.presets.map((preset, index) => {
        let label = preset ? `${index + 1}. ${preset.name} (${preset.nodeIds.length})` : _t('{value}. 빈 프리셋', { value: index + 1 });
        return `<option value="${index}" ${index === planner.activeSlot ? 'selected' : ''}>${escapeHTML(label)}</option>`;
    }).join('');
    host.innerHTML = `
        <div class="passive-planner-row passive-planner-primary">
            <strong>${_t('트리 프리셋')}</strong>
            <select id="passive-preset-slot" onchange="selectPassiveTreePresetSlot(this.value)">${options}</select>
            <input id="passive-preset-name" class="passive-preset-name" type="text" maxlength="24" value="${escapeHTML(active ? active.name : _t('프리셋 {value}', { value: planner.activeSlot + 1 }))}" aria-label="${_t('프리셋 이름')}">
            <button type="button" onclick="savePassiveTreePresetFromUi()">${_t('현재 트리 저장')}</button>
            <label class="passive-planner-toggle"><input type="checkbox" ${planner.autoInvest ? 'checked' : ''} onchange="togglePassiveTreeAutoInvest(this.checked)"> ${_t('환생 후 자동 투자')}</label>
            <label class="passive-planner-toggle"><input type="checkbox" ${game.settings.passiveTreeShowLabels === true ? 'checked' : ''} onchange="togglePassiveTreeLabels(this.checked)"> ${_t('상시 문구')}</label>
            <span class="passive-planner-progress">${active ? _t('{completed}/{length} 투자', { completed, length: active.nodeIds.length }) : _t('저장된 경로 없음')}</span>
        </div>
        <div class="passive-planner-row passive-planner-share">
            <input id="passive-preset-code" type="text" placeholder="${_t('공유 코드를 붙여넣으세요')}" autocomplete="off">
            <button type="button" onclick="copyPassiveTreePresetCode()" ${active ? '' : 'disabled'}>${_t('공유 코드 복사')}</button>
            <button type="button" onclick="importPassiveTreePresetFromUi()">${_t('코드 불러오기')}</button>
        </div>`;
    host.dataset.plannerSignature = signature;
}

function selectPassiveTreePresetSlot(slotIndex) {
    if (setActivePassiveTreePreset(slotIndex)) renderPassiveTreePlannerPanel();
}

function savePassiveTreePresetFromUi() {
    let planner = ensurePassiveTreePlannerState();
    let allocated = (game.passives || []).filter(id => PASSIVE_TREE.nodes[id] && PASSIVE_TREE.nodes[id].kind !== 'start');
    if (allocated.length === 0) return addLog(_t('저장할 패시브 경로가 없습니다.'), 'attack-monster');
    let nameInput = document.getElementById('passive-preset-name');
    let name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : _t('프리셋 {value}', { value: planner.activeSlot + 1 });
    let preset = saveCurrentPassiveTreePreset(planner.activeSlot, name);
    addLog(_t('🧭 {name}에 현재 패시브 {length}개를 저장했습니다.', { name: _t(preset.name), length: preset.nodeIds.length }), 'season-up');
    renderPassiveTreePlannerPanel();
}

function togglePassiveTreeAutoInvest(enabled) {
    setPassiveTreeAutoInvest(enabled);
    let result = enabled ? runPassiveTreeAutoInvest() : { nodes: 0 };
    if (result.nodes > 0) addLog(_t('🧭 프리셋 자동 투자: {nodes}개 노드 활성화', { nodes: result.nodes }), 'season-up');
    updateStaticUI();
}

function togglePassiveTreeLabels(enabled) {
    game.settings.passiveTreeShowLabels = !!enabled;
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('labels');
    drawPassiveTree();
}

async function copyPassiveTreePresetCode() {
    let planner = ensurePassiveTreePlannerState();
    let code = encodePassiveTreePreset(planner.activeSlot);
    let input = document.getElementById('passive-preset-code');
    if (!code || !input) return;
    input.value = code;
    input.select();
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(code);
        else if (document.execCommand) document.execCommand('copy');
        addLog(_t('📋 패시브 트리 공유 코드를 복사했습니다.'), 'loot-magic');
    } catch (error) {
        addLog(_t('공유 코드를 입력칸에 만들었습니다. 직접 복사해 주세요.'), 'attack-monster');
    }
}

function importPassiveTreePresetFromUi() {
    let planner = ensurePassiveTreePlannerState();
    let input = document.getElementById('passive-preset-code');
    try {
        let preset = importPassiveTreePreset(planner.activeSlot, input ? input.value : '');
        addLog(_t('🧭 공유 프리셋 [{name}]{particle} 불러왔습니다.', { name: _t(preset.name), particle: pickParticle(preset.name, '을', '를') }), 'season-up');
        renderPassiveTreePlannerPanel();
    } catch (error) {
        addLog(_t('프리셋을 불러오지 못했습니다: {message}', { message: error.message }), 'attack-monster');
    }
}

function setupPassiveTreeSearchControls() {
    if (typeof syncPassiveAttributePreferenceControls === 'function') syncPassiveAttributePreferenceControls();
    if (window.__passiveTreeSearchControlsBound) {
        syncPassiveTreeSearchControls();
        return;
    }
    window.__passiveTreeSearchControlsBound = true;
    let input = document.getElementById('passive-search-input');
    if (input) {
        input.addEventListener('input', () => setPassiveTreeSearchState({ search: input.value }));
    }
    document.querySelectorAll('[data-passive-filter]').forEach(btn => {
        btn.addEventListener('click', () => setPassiveTreeSearchState({ filter: btn.dataset.passiveFilter || 'all' }));
    });
    let clear = document.getElementById('passive-search-clear');
    if (clear) {
        clear.addEventListener('click', () => setPassiveTreeSearchState({ search: '', filter: 'all' }));
    }
    syncPassiveTreeSearchControls();
}

function closeVoidPassiveCraftOverlay() {
    voidCraftUi.stopRun();
    let overlay = document.getElementById('void-passive-craft-overlay');
    if (overlay) overlay.remove();
}

function getVoidPassiveRefundState(nodeId) {
    let active = (game.passives || []).includes(nodeId);
    let hasScour = (game.currencies.blightSpore || 0) >= 1;
    let connected = typeof canRefundPassiveNode === 'function' && canRefundPassiveNode(nodeId);
    return {
        enabled: active && hasScour && connected,
        reason: !active ? '활성화된 공허 패시브만 반환할 수 있습니다.'
            : (!connected ? '연결 유지에 필요한 노드는 반환할 수 없습니다.'
                : (!hasScour ? '마름병 포자가 부족합니다.' : '마름병 포자 1개를 소모해 반환합니다.'))
    };
}

/** 제작 창은 쓴 결과를 창 안 한 줄과 알림으로 보여 준다(전투 기록만으로는 아무 일도 없던 것처럼 보였다 — 검토 4차). */
function craftVoidPassiveFromOverlay(nodeId, currencyKey) {
    const before = game.currencies[currencyKey] || 0;
    applyVoidPassiveCurrency(nodeId, currencyKey);
    const result = (game.currencies[currencyKey] || 0) < before ? getVoidCraftResultText(nodeId, currencyKey) : '';
    if (result) showGameToast(result, { tone: 'info' });
    openVoidPassiveCraftOverlay(nodeId, result);
}

function canUseFairyRingOnVoid(entry, active) {
    return active && !entry.fairyLocked && (game.currencies.fairyRing || 0) > 0 && (!!entry.transcendent || (entry.stats || []).length > 0);
}

function getVoidCraftResultText(nodeId, currencyKey) {
    const entry = getVoidPassiveCraft(nodeId), name = _t(ORB_DB[currencyKey].name);
    if (entry.transcendent) return `${name}, ${formatTranscendentVoidPassive(entry.transcendent).replace(/<[^>]*>/g, '')}`;
    if (currencyKey === 'fairyRing') return _t('{name}, 초월 실패, 옵션이 지워졌습니다.', { name });
    return _t('{name}, 새 옵션: {replace}', { name, replace: getVoidPassiveEffectLabel(nodeId).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() });
}

function refundVoidPassiveFromOverlay(nodeId) {
    let state = getVoidPassiveRefundState(nodeId);
    if (!state.enabled) return addLog(state.reason, 'attack-monster');
    closeVoidPassiveCraftOverlay();
    refundPassiveNode(nodeId);
}

async function askRefundPassiveNode(id) {
    if (!await requestGameConfirmation(_t('선택한 패시브 노드를 반환하고 마름병 포자 1개를 소모합니다.'), {
        title: _t('패시브 노드 반환'),
        tone: 'danger',
        confirmLabel: _t('노드 반환')
    })) return;
    refundPassiveNode(id);
}

/** 공허 제작 창 안내: 세 재화가 하는 일과, 직업 공허 소켓이면 성좌 각성 진행. */
function getVoidCraftGuide(node, active) {
    if (!active) return '먼저 패시브 트리에서 이 공허 패시브를 활성화해야 제작할 수 있습니다.';
    const base = '마법의 새싹은 현재 옵션을 지우고 공허 옵션 1~2줄을 다시 굴립니다. 요정의 고리는 옵션이 있는 공허를 25% 확률로 초월시키고, 실패하면 옵션이 지워지며 이번 루프에는 이 소켓에 다시 쓸 수 없습니다. 황금률은 초월 수치를 다시 굴립니다.';
    if (node.voidRing !== 'outer' || game.passiveStarEvolution) return base;
    const progress = getPassiveConstellationAwakeningProgress();
    return `${base}<br>${_t('직업 공허 소켓, 성좌 각성 {completed}/{required}: 여섯을 모두 활성화하면 성좌가 각성합니다.', { completed: progress.completed, required: progress.required })}`;
}

/** 초월 하나의 설명을 수치 범위로(카멜레온 목록): "5~10", 고정값은 그 값. */
function describeTranscendentRange(def) {
    const range = (min, max, fixed) => (fixed !== undefined ? fixed : Number.isFinite(Number(min)) && Number.isFinite(Number(max)) ? (min === max ? min : `${min}~${max}`) : '');
    return def.desc(range(def.min, def.max, def.fixed), range(def.min2, def.max2));
}

/** 카멜레온 공허 패시브(활성화한 노드): 바꿀 수 있는 초월 목록. 고르면 묻고 바꾼다(convertChameleonFromOverlay). */
function chameleonChoicesHtml(node, entry, active) {
    if (!active || !entry.transcendent || entry.transcendent.id !== 'chameleon') return '';
    const rows = getChameleonChoices(node.id).map(def => `<button type="button" class="void-chameleon-choice" onclick="convertChameleonFromOverlay('${node.id}','${def.id}')">`
        + `<b>${escapeHTML(_t(def.name))}</b><span>${escapeHTML(describeTranscendentRange(def))}</span></button>`).join('');
    return `<div class="void-chameleon"><div class="void-craft-hint">${_t('카멜레온: 바꿀 초월을 고르세요. 수치는 새로 굴리고, 바꾼 뒤에는 되돌릴 수 없습니다.')}</div>`
        + `<div class="void-chameleon-list">${rows || _t('<div class="void-craft-hint">고를 수 있는 초월이 없습니다.</div>')}</div></div>`;
}

async function convertChameleonFromOverlay(nodeId, targetId) {
    const def = TRANSCENDENT_VOID_PASSIVE_DB.find(row => row.id === targetId);
    if (!def || !await requestGameConfirmation(_t('카멜레온을 「{name}」 초월로 바꿉니다. 수치는 새로 굴리고, 되돌릴 수 없습니다.', { name: def.name }), { title: _t('카멜레온 변환'), confirmLabel: _t('바꾸기') })) return;
    const reason = convertChameleonVoidPassive(nodeId, targetId);
    if (reason) return addLog(reason, 'attack-monster');
    const result = _t('카멜레온 변환, {replace}', { replace: formatTranscendentVoidPassive(getVoidPassiveCraft(nodeId).transcendent).replace(/<[^>]*>/g, '') });
    addLog(`🦎 ${result}`, 'loot-unique');
    showGameToast(result, { tone: 'info' });
    updateStaticUI();
    openVoidPassiveCraftOverlay(nodeId, result);
}

function openVoidPassiveCraftOverlay(nodeId, result = '') {
    closeVoidPassiveCraftOverlay();
    let node = PASSIVE_TREE.nodes[nodeId];
    if (!node || node.kind !== 'void') return addLog(_t('공허 패시브만 제작할 수 있습니다.'), 'attack-monster');
    let active = (game.passives || []).includes(node.id);
    let entry = typeof getVoidPassiveCraft === 'function' ? getVoidPassiveCraft(node.id) : { stats: [] };
    let refundState = getVoidPassiveRefundState(node.id);
    let overlay = document.createElement('div');
    overlay.id = 'void-passive-craft-overlay';
    overlay.className = 'void-craft-overlay';
    overlay.onclick = event => { if (event.target === overlay) closeVoidPassiveCraftOverlay(); };
    overlay.innerHTML = `<div class="void-craft-dialog" role="dialog" aria-modal="true" aria-labelledby="void-craft-title" tabindex="-1">
        <div class="void-craft-header">
            <div><div id="void-craft-title">${escapeHTML(getPassiveNodeDisplayName(node))}</div><div class="void-craft-subtitle">${_t('공허 패시브 제작')}</div></div>
            <button type="button" onclick="closeVoidPassiveCraftOverlay()">${_t('닫기')}</button>
        </div>
        <div class="void-craft-effect" id="void-craft-effect">${voidCraftUi.effectHtml(node.id)}</div>${chameleonChoicesHtml(node, entry, active)}
        ${result ? `<div class="void-craft-result" role="status">${escapeHTML(result)}</div>` : ''}
        <div class="void-craft-hint">${getVoidCraftGuide(node, active)}</div>
        <div class="void-craft-actions">
            <button type="button" class="void-currency is-bud" onclick="craftVoidPassiveFromOverlay('${node.id}','magicBud')" ${active && !entry.transcendent && (game.currencies.magicBud || 0) > 0 ? '' : 'disabled'}>${_t('마법의 새싹, 1~2줄 재굴림')}<br><span id="void-bud-count">${_t('보유 {magicBud}', { magicBud: game.currencies.magicBud || 0 })}</span></button>
            <button type="button" class="void-currency is-ring" onclick="craftVoidPassiveFromOverlay('${node.id}','fairyRing')" ${canUseFairyRingOnVoid(entry, active) ? '' : 'disabled'}>${_t('요정의 고리')}<br><span>${entry.fairyLocked ? _t('이번 루프 사용 불가') : _t('보유 {fairyRing}', { fairyRing: game.currencies.fairyRing || 0 })}</span></button>
            <button type="button" class="void-currency is-rule" onclick="craftVoidPassiveFromOverlay('${node.id}','goldenRule')" ${active && entry.transcendent && typeof TRANSCENDENT_VOID_PASSIVE_DB !== 'undefined' && TRANSCENDENT_VOID_PASSIVE_DB.some(def => def.id === entry.transcendent.id && Number.isFinite(Number(def.min))) && (game.currencies.goldenRule || 0) > 0 ? '' : 'disabled'}>${_t('황금률')}<br><span>${_t('보유 {goldenRule}', { goldenRule: game.currencies.goldenRule || 0 })}</span></button>
        </div>
        ${voidCraftUi.panelHtml(node, entry, active)}
        <div class="void-craft-footer">
            <div class="void-craft-hint">${refundState.reason}</div>
            <button type="button" onclick="refundVoidPassiveFromOverlay('${node.id}')" ${refundState.enabled ? '' : 'disabled'}>${_t('공허 패시브 반환 (마름병 포자 1)')}</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
}

function normalizePassiveTooltipText(value) {
    return String(value || '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/초당 생명력 재생/g, '초당 재생')
        .replace(/\(\s*%\s*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getPassiveTooltipDescription(node, effectLabels) {
    if (!node || !node.desc) return '';
    if (Array.isArray(node.effects) && node.effects.length > 0) return '';
    const description = normalizePassiveTooltipText(node.desc);
    if (!description) return '';
    const labels = Array.isArray(effectLabels) ? effectLabels : [effectLabels];
    const repeatsEffect = labels.some(label => {
        const effect = normalizePassiveTooltipText(label);
        return effect === description || effect.startsWith(`${description} `);
    });
    return repeatsEffect ? '' : node.desc;
}

/** 직업 시작점은 늘 무료로 열려 있는 출발점이다(소유 목록에 넣지 않는다). */
function describeReachablePassiveNode(node) {
    return node.kind === 'start' ? '시작점, 여기서 이어진 노드부터 포인트를 씁니다.' : '활성화하면 주변 노드가 밝혀집니다.';
}

function describeBlockedPassiveNode(node) {
    return node.kind === 'start' ? '시작점은 이미 열려 있습니다. 이어진 노드를 눌러 포인트를 쓰세요.' : '연결된 노드가 아니라 활성화할 수 없습니다.';
}

exposeFileGlobals({ getPassiveTreeSearchState, getPassiveNodeSearchMatch, setPassiveTreeSearchState, renderPassiveSpecializationControls, onPassiveRevelationChanged, renderPassiveInvestmentSummary, togglePassiveInvestmentSummary, syncPassiveTreeHeader, resetPassiveTreeByGoldenRule, renderPassiveTreePlannerPanel, selectPassiveTreePresetSlot, savePassiveTreePresetFromUi, togglePassiveTreeAutoInvest, togglePassiveTreeLabels, copyPassiveTreePresetCode, importPassiveTreePresetFromUi, setupPassiveTreeSearchControls, closeVoidPassiveCraftOverlay, craftVoidPassiveFromOverlay, refundVoidPassiveFromOverlay, askRefundPassiveNode, convertChameleonFromOverlay, openVoidPassiveCraftOverlay, normalizePassiveTooltipText, getPassiveTooltipDescription, describeReachablePassiveNode, describeBlockedPassiveNode });
})();

safeExposeGlobals({ togglePassiveInvestmentSummary, renderPassiveInvestmentSummary, onPassiveRevelationChanged, resetPassiveTreeByGoldenRule, renderPassiveTreePlannerPanel, selectPassiveTreePresetSlot, savePassiveTreePresetFromUi, togglePassiveTreeAutoInvest, togglePassiveTreeLabels, copyPassiveTreePresetCode, importPassiveTreePresetFromUi });

Object.assign(window, { getPassiveTreeSearchState, getPassiveNodeSearchMatch, setupPassiveTreeSearchControls, setPassiveTreeSearchState });
