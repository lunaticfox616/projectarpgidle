import { renderPassiveTreePlannerPanel } from './passive-tree-planner.mjs';

export function getAllocatedPassiveStatSummary(ctx) {
    const totals = {};
    const specialEffects = [];
    const allocatedIds = Array.isArray(ctx.deps.game.passives) ? ctx.deps.game.passives : [];
    const balanceAttributes = (0, ctx.deps.hasAuthoredPassiveKeystone)('균형의 공명');
    const virtualVoidCount = (0, ctx.deps.getVirtualVoidPassiveCount)();
    let voidCount = 0;
    const add = (stat, value) => {
        if (!ctx.deps.P_STATS[stat] || !Number.isFinite(Number(value)) || (balanceAttributes && stat === 'intelligence')) return;
        totals[stat] = (totals[stat] || 0) + Number(value);
    };
    allocatedIds.forEach(id => {
        const node = ctx.deps.PASSIVE_TREE.nodes[id];
        if (!node) return;
        if (node.kind === 'void') {
            voidCount++;
            const entry = ctx.deps.game.voidPassives && ctx.deps.game.voidPassives[String(id)];
            ctx.deps.passiveRouting.voidStats(entry, ctx.deps.game, (0, ctx.deps.getVoidLinkScale)(id)).forEach(line => add(line && line.id, line && line.val));
            (0, ctx.deps.getTranscendentVoidPassiveStats)(id, entry, virtualVoidCount).forEach(line => add(line.stat, line.val));
            if (entry && entry.transcendent) {
                const def = (typeof ctx.deps.TRANSCENDENT_VOID_PASSIVE_DB !== 'undefined' ? ctx.deps.TRANSCENDENT_VOID_PASSIVE_DB : []).find(row => row.id === entry.transcendent.id);
                specialEffects.push(def ? (0, ctx.deps._t)('초월, {name}', { name: def.name }) : '초월 공허 효과');
            }
            return;
        }
        (0, ctx.deps.getEffectivePassiveNodeEffects)(node, balanceAttributes).forEach(effect => add(effect.stat, effect.val));
    });
    appendSpecialEffectSummary(ctx, totals, specialEffects);
    return {
        allocatedCount: allocatedIds.filter(id => ctx.deps.PASSIVE_TREE.nodes[id] && ctx.deps.PASSIVE_TREE.nodes[id].kind !== 'start').length,
        voidCount,
        totals: Object.entries(totals).sort((a, b) => (0, ctx.deps.getStatName)(a[0]).localeCompare((0, ctx.deps.getStatName)(b[0]), 'ko')),
        specialEffects
    };
}

export function renderPassiveSpecializationControls(ctx) {
    if (typeof ctx.deps.ensurePassiveSpecializationState !== 'function') return '';
    const state = (0, ctx.deps.ensurePassiveSpecializationState)();
    const devotion = typeof ctx.deps.getAllocatedPassiveStatValue === 'function' ? (0, ctx.deps.getAllocatedPassiveStatValue)('devotion') : 0;
    const revelationUnlocked = devotion >= 1;
    const tripleRevelation = typeof ctx.deps.findAllocatedPassiveKeystone === 'function' && !!(0, ctx.deps.findAllocatedPassiveKeystone)('삼중 계시');
    const revelationLabels = { combat: '전투의 계시', guard: '수호의 계시', life: '생명의 성약' };
    const revelationOptions = Object.entries(revelationLabels).map(([id, label]) =>
        `<option value="${id}" ${state.revelation === id ? 'selected' : ''}>${label}</option>`).join('');
    const wisdomNode = typeof ctx.deps.findAllocatedPassiveKeystone === 'function' ? (0, ctx.deps.findAllocatedPassiveKeystone)('지혜의 도약') : null;
    if (!revelationUnlocked && !tripleRevelation && !wisdomNode) return '';
    const renderRevelationSelector = () => {
        if (!revelationUnlocked && !tripleRevelation) return '';
        return `<label>${(0, ctx.deps._t)('계시')}<select onchange="onPassiveRevelationChanged(this.value)" ${tripleRevelation ? 'disabled' : ''}>${revelationOptions}</select></label>`;
    };
    const elementLabels = { fire: '화염', cold: '냉기', lightning: '번개', chaos: '공허(카오스)', '': '속성 노드 미투자' };
    const wisdomElement = (0, ctx.deps.getPassiveWisdomElementFromNodeIds)(ctx.deps.game.passives);
    return `<div class="passive-specialization-controls">${renderRevelationSelector()}
        ${tripleRevelation ? (0, ctx.deps._t)('<span class="passive-specialization-locked">삼중 계시: 세 효과가 40%로 고정 적용</span>') : ''}
        ${wisdomNode ? `<span class="passive-specialization-locked">${(0, ctx.deps._t)('지혜의 도약, {elementLabels}', { elementLabels: elementLabels[wisdomElement] })} <small>${(0, ctx.deps._t)('투자한 노드 기준')}</small></span>` : ''}</div>`;
}

export function onPassiveRevelationChanged(ctx, value) {
    if (typeof ctx.deps.setPassiveRevelation !== 'function' || !(0, ctx.deps.setPassiveRevelation)(value)) {
        (0, ctx.deps.addLog)((0, ctx.deps._t)('헌신이 1 이상일 때만 계시를 선택할 수 있습니다.'), 'attack-monster');
        return;
    }
    (0, ctx.deps.updateStaticUI)();
    (0, ctx.deps.queueImportantSave)(180);
}

export function renderPassiveInvestmentSummary(ctx) {
    const panel = ctx.deps.document.getElementById('passive-investment-summary');
    const body = ctx.deps.document.getElementById('passive-investment-summary-body');
    if (!panel || !body) return;
    if (typeof ctx.deps.syncPassiveAttributePreferenceControls === 'function') (0, ctx.deps.syncPassiveAttributePreferenceControls)();
    if (!ctx.deps.game.settings || typeof ctx.deps.game.settings !== 'object') ctx.deps.game.settings = {};
    const collapsed = !!ctx.deps.game.settings.passiveInvestmentSummaryCollapsed;
    panel.classList.toggle('collapsed', collapsed);
    const toggle = panel.querySelector('.passive-investment-summary-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    const summary = getAllocatedPassiveStatSummary(ctx);
    const rows = passiveSummaryTotalsHtml(ctx, summary);
    const specials = summary.specialEffects.length
        ? `<div class="passive-summary-specials">${(0, ctx.deps._t)('조건부 효과, {specialEffects}', { specialEffects: summary.specialEffects.join(', ') })}</div>`
        : '';
    (0, ctx.deps.writeHtmlIfChanged)(body, `<div class="passive-summary-meta">투자 ${summary.allocatedCount}개${summary.voidCount ? (0, ctx.deps._t)(', 공허 {voidCount}개', { voidCount: summary.voidCount }) : ''}</div>${renderPassiveSpecializationControls(ctx)}<div class="passive-summary-grid">${rows}</div>${specials}`);
    renderPassiveTreePlannerPanel(ctx);
}

export function togglePassiveInvestmentSummary(ctx) {
    if (!ctx.deps.game.settings || typeof ctx.deps.game.settings !== 'object') ctx.deps.game.settings = {};
    ctx.deps.game.settings.passiveInvestmentSummaryCollapsed = !ctx.deps.game.settings.passiveInvestmentSummaryCollapsed;
    renderPassiveInvestmentSummary(ctx);
}

/** 스킬트리 머리: 남은 포인트와 초기화 단추(resetPassiveTreeByGoldenRule, 2026-10-22 거래소에서 옮김). 단추는 기본 트리에 찍은 노드가
* 있을 때만 보인다. 누르면 확인 창이 돌려받을 점수를 묻고, 황금률이 없으면 그렇다고 알린다. */
export function syncPassiveTreeHeader(ctx) {
    ctx.deps.document.getElementById('ui-passive-points').innerText = ctx.deps.game.passivePoints;
    const button = ctx.deps.document.getElementById('btn-passive-tree-reset');
    if (!button) return;
    const count = (0, ctx.deps.getPaidPassiveNodeIds)(ctx.deps.game.passives).length, title = (0, ctx.deps._t)('황금률 1개로 찍은 {count}점을 모두 돌려받습니다. 루프 패시브, 심화 패시브와 전직은 그대로입니다.', { count });
    if (button.hidden !== count <= 0) button.hidden = count <= 0;
    if (button.dataset.tip !== title) button.dataset.tip = title;
}

function appendConstellationSummary(ctx, specialEffects) {
    if (ctx.deps.game.passiveStarEvolution) {
        specialEffects.push(ctx.deps.game.passiveStarEvolutionSource === 'legacy_migrated'
                ? '성좌 각성, 기존 트리에서 영구 계승'
                : '성좌 각성, 별의 공명 영구 활성');
    } else if (typeof ctx.deps.getPassiveConstellationAwakeningProgress === 'function') {
        const progress = (0, ctx.deps.getPassiveConstellationAwakeningProgress)();
        if (progress.mode === 'outer_void' && progress.allocated > 0) {
            specialEffects.push(`성좌 각성 ${progress.completed}/${progress.required}, 직업 공허 소켓을 모두 활성화`);
        }
    }
}

function appendSpecialEffectSummary(ctx, totals, specialEffects) {
    const specialization = typeof ctx.deps.ensurePassiveSpecializationState === 'function' ? (0, ctx.deps.ensurePassiveSpecializationState)() : null;
    if ((totals.mystique || 0) > 0) specialEffects.push(`신비 ${(0, ctx.deps.formatValue)('mystique', totals.mystique)}, 최고 피해 속성 상태이상 강화`);
    if ((totals.devotion || 0) > 0 && specialization) {
        const revelationLabel = { combat: '전투', guard: '수호', life: '생명' }[specialization.revelation] || '전투';
        specialEffects.push(`${revelationLabel}의 계시, 헌신 ${(0, ctx.deps.formatValue)('devotion', totals.devotion)}`);
    }
    if ((totals.cycle || 0) > 0) specialEffects.push(`순환 ${(0, ctx.deps.formatValue)('cycle', totals.cycle)}, 상태이상 종료 시 6초 강화`);
    appendConstellationSummary(ctx, specialEffects);
}

function passiveSummaryTotalsHtml(ctx, summary) {
    return summary.totals.length
        ? summary.totals.map(([stat, value]) => `<span>${(0, ctx.deps.getStatName)(stat)}</span><strong style="color:${(0, ctx.deps.getItemStatToneColor)(stat)}">+${(0, ctx.deps.formatValue)(stat, value)}${ctx.deps.P_STATS[stat] && ctx.deps.P_STATS[stat].isPct ? '%' : ''}</strong>`).join('')
        : '<span>아직 투자한 효과가 없습니다.</span><strong>-</strong>';
}
