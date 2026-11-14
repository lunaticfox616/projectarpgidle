/** 새싹 하나로 목표 중 하나가 나올 확률: 1줄과 2줄이 반반이고, 두 줄은 서로 다른 옵션이다. */
export function hitChance(ctx, count) {
    const pool = ctx.deps.VOID_PASSIVE_OPTION_POOL.length;
    return 0.5 * (count / pool) + 0.5 * (1 - ((pool - count) * (pool - count - 1)) / (pool * (pool - 1)));
}

/** 현재 옵션: 목표로 고른 줄은 금빛으로. */
export function effectHtml(ctx, nodeId) {
    const entry = (0, ctx.deps.getVoidPassiveCraft)(nodeId), wanted = targetsOf(ctx, nodeId);
    if (entry.transcendent || !entry.stats.length) return (0, ctx.deps.getVoidPassiveEffectLabel)(nodeId);
    return ctx.deps.passiveRouting.voidStats(entry, ctx.deps.game, (0, ctx.deps.getVoidLinkScale)(nodeId))
        .map(line => `<div class="void-craft-line${wanted.has(line.id) ? ' is-target' : ''}">${(0, ctx.deps.escapeHTML)((0, ctx.deps.formatVoidPassiveStatLine)(line))}</div>`).join('');
}

export function pickerOptionHtml(ctx, option, wanted) {
    const on = wanted.has(option.id), full = !on && wanted.size >= ctx.state.MAX_TARGETS;
    return `<button type="button" class="${chipClass(ctx, option.id)} void-picker-option${on ? ' is-on' : ''}" aria-pressed="${on}"${full ? ' disabled' : ''} onclick="voidCraftUi.toggleTarget('${ctx.state.pickerNode}','${option.id}')"><span>${lineName(ctx, option.id)}</span><small>${rangeText(ctx, option)}</small></button>`;
}

export function pickerTabHtml(ctx, group, wanted) {
    const rows = ctx.deps.VOID_PASSIVE_OPTION_POOL.filter(option => option.group === group), picked = rows.filter(option => wanted.has(option.id)).length;
    return `<button type="button" class="void-picker-tab is-${ctx.state.GROUP_CLASS[group]}${group === ctx.state.pickerGroup ? ' is-active' : ''}${picked ? ' has-picked' : ''}" aria-pressed="${group === ctx.state.pickerGroup}" onclick="voidCraftUi.showGroup('${group}')"><span>${group}</span><small>${picked ? (0, ctx.deps._t)('{picked}개 고름', { picked }) : (0, ctx.deps._t)('{length}종', { length: rows.length })}</small></button>`;
}

export function drawPicker(ctx) {
    const wanted = targetsOf(ctx, ctx.state.pickerNode);
    const tabs = Object.keys(ctx.state.GROUP_CLASS).map(group => pickerTabHtml(ctx, group, wanted)).join('');
    const options = ctx.deps.VOID_PASSIVE_OPTION_POOL.filter(option => option.group === ctx.state.pickerGroup).map(option => pickerOptionHtml(ctx, option, wanted)).join('');
    const picked = [...wanted].map(statId => `<button type="button" class="${chipClass(ctx, statId)} is-on" onclick="voidCraftUi.toggleTarget('${ctx.state.pickerNode}','${statId}')">${lineName(ctx, statId)}<span aria-hidden="true"> ✕</span></button>`).join('');
    ctx.deps.selectionDialog.show({ id: ctx.state.PICKER_ID, title: (0, ctx.deps._t)('목표 옵션 고르기'), panelClass: 'void-target-window', body: `<nav class="void-picker-tabs" aria-label="${(0, ctx.deps._t)('옵션 분류')}">${tabs}</nav>
            <div class="void-picker-grid">${options}</div>
            <footer class="void-picker-foot"><b>${wanted.size}/${ctx.state.MAX_TARGETS}</b><div class="void-target-chips">${picked}</div><span class="void-run-status">${idleStatus(ctx, wanted)}</span><button type="button" class="void-picker-done" data-selection-close>${(0, ctx.deps._t)('완료')}</button></footer>` });
}

export function openPicker(ctx, nodeId) {
    ctx.state.pickerNode = String(nodeId);
    drawPicker(ctx);
}

export function showGroup(ctx, group) {
    if (!ctx.state.GROUP_CLASS[group]) return;
    ctx.state.pickerGroup = group;
    drawPicker(ctx);
}

export function idleStatus(ctx, wanted) {
    if (!wanted.size) return '목표를 고르면 연속으로 쓸 수 있습니다.';
    const chance = hitChance(ctx, wanted.size);
    return (0, ctx.deps._t)('새싹 1개에 {value}%, 평균 {ceil}개', { value: (chance * 100).toFixed(1), ceil: Math.ceil(1 / chance) });
}

export function panelBody(ctx, nodeId) {
    const wanted = targetsOf(ctx, nodeId), running = ctx.state.run && ctx.state.run.nodeId === nodeId;
    const picked = [...wanted].map(statId => `<button type="button" class="${chipClass(ctx, statId)} is-on" onclick="voidCraftUi.toggleTarget('${nodeId}','${statId}')">${lineName(ctx, statId)}<span aria-hidden="true"> ✕</span></button>`).join('');
    const disabled = !running && (!wanted.size || budCount(ctx) <= 0);
    return `<div class="void-target-head"><b>${(0, ctx.deps._t)('목표 옵션')}</b><span>${(0, ctx.deps._t)('{size}/{MAX_TARGETS}, 하나라도 나오면 멈춥니다', { size: wanted.size, MAX_TARGETS: ctx.state.MAX_TARGETS })}</span></div>
            ${picked ? `<div class="void-target-chips">${picked}</div>` : ''}
            ${running ? '' : `<button type="button" class="void-picker-open" onclick="voidCraftUi.openPicker('${nodeId}')">${(0, ctx.deps._t)('옵션 고르기')}</button>`}
            <div class="void-run">
                <button type="button" id="void-run-button" class="void-run-button${running ? ' is-running' : ''}" onclick="voidCraftUi.toggleRun('${nodeId}')" ${disabled ? 'disabled' : ''}>${running ? (0, ctx.deps._t)('멈추기') : (0, ctx.deps._t)('목표까지 연속 사용')}</button>
                <span id="void-run-status" class="void-run-status" role="status">${running ? runStatus(ctx) : idleStatus(ctx, wanted)}</span>
            </div>`;
}

export function panelHtml(ctx, node, entry, active) {
    if (!active || entry.transcendent) return '';
    return `<div class="void-target" id="void-target-panel">${panelBody(ctx, node.id)}</div>`;
}

export function refreshPanel(ctx, nodeId) {
    const panel = ctx.deps.document.getElementById('void-target-panel');
    if (panel) panel.innerHTML = panelBody(ctx, nodeId);
}

export function refreshEffect(ctx, nodeId) {
    const card = ctx.deps.document.getElementById('void-craft-effect');
    if (card) card.innerHTML = effectHtml(ctx, nodeId);
}

export function toggleTarget(ctx, nodeId, statId) {
    if (ctx.state.run || !optionOf(ctx, statId)) return;
    const wanted = new Set(targetsOf(ctx, nodeId));
    if (wanted.has(statId)) wanted.delete(statId);
    else if (wanted.size < ctx.state.MAX_TARGETS) wanted.add(statId);
    ctx.state.targets.set(String(nodeId), wanted);
    refreshPanel(ctx, nodeId);
    refreshEffect(ctx, nodeId);
    if (ctx.deps.selectionDialog.isOpen(ctx.state.PICKER_ID)) drawPicker(ctx);
}

export function setRolling(ctx, on) {
    const dialog = ctx.deps.document.querySelector('#void-passive-craft-overlay .void-craft-dialog');
    if (dialog) dialog.classList.toggle('is-rolling', on);
}

/** 멈출 까닭: 전투 잠금, 초월, 노드 반환. 재화가 떨어진 것은 따로 알린다. */
export function canKeepRolling(ctx, nodeId, entry) {
    return !ctx.deps.game.woodsmanBuildLock && !entry.transcendent && (ctx.deps.game.passives || []).includes(nodeId);
}

export function tick(ctx) {
    const { nodeId } = ctx.state.run, entry = (0, ctx.deps.getVoidPassiveCraft)(nodeId);
    if (!canKeepRolling(ctx, nodeId, entry)) return endRun(ctx, 'stopped', true);
    if (budCount(ctx) <= 0) return endRun(ctx, 'empty', true);
    ctx.deps.game.currencies.magicBud = budCount(ctx) - 1;
    (0, ctx.deps.rollMagicBudOnVoid)(entry);
    ctx.state.run.used++;
    refreshEffect(ctx, nodeId);
    const status = ctx.deps.document.getElementById('void-run-status'), count = ctx.deps.document.getElementById('void-bud-count');
    if (status) status.textContent = runStatus(ctx);
    if (count) count.textContent = (0, ctx.deps._t)('보유 {budCount}', { budCount: budCount(ctx) });
    const wanted = targetsOf(ctx, nodeId);
    if (entry.stats.some(line => wanted.has(line.id))) endRun(ctx, 'hit', true);
}

export function resultText(ctx, outcome, nodeId, used) {
    const bud = ctx.deps.ORB_DB.magicBud.name;
    if (outcome === 'hit') return (0, ctx.deps._t)('목표 옵션 획득, {bud} {used}개 사용: {nodeId}', { bud, used, nodeId: plainEffect(ctx, nodeId) });
    if (outcome === 'empty') return (0, ctx.deps._t)('{bud}이 떨어졌습니다, {used}개 사용: {nodeId}', { bud, used, nodeId: plainEffect(ctx, nodeId) });
    return (0, ctx.deps._t)('연속 사용을 멈췄습니다, {bud} {used}개 사용: {nodeId}', { bud, used, nodeId: plainEffect(ctx, nodeId) });
}

/** Stop the timer and settle the used buds before any overlay is refreshed. */
function settleRun(ctx, outcome) {
    const { nodeId, used, timer } = ctx.state.run;
    (0, ctx.deps.clearInterval)(timer);
    ctx.state.run = null;
    ctx.deps.playerStatCache.invalidate();
    const text = resultText(ctx, outcome, nodeId, used);
    if (used > 0) {
        (0, ctx.deps.addLog)(`🕳️ ${text}`, outcome === 'hit' ? 'loot-rare' : 'loot-magic');
        (0, ctx.deps.queueImportantSave)(200); // 쓴 새싹과 바뀐 옵션을 바로 저장한다(한 번 쓰기와 같다)
    }
    (0, ctx.deps.updateStaticUI)();
    return { nodeId, text };
}

/** 끝낸다: 기록과 알림은 한 번만, 창은 새 값으로 다시 그린다. reopen이 거짓이면 창을 닫는 중이다. */
export function endRun(ctx, outcome, reopen) {
    const { nodeId, text } = settleRun(ctx, outcome);
    if (!reopen) return;
    openVoidPassiveCraftOverlay(ctx, nodeId, text);
    if (outcome === 'hit') celebrate(ctx);
    else (0, ctx.deps.showGameToast)(text, { tone: 'info' });
}

export function toggleRun(ctx, nodeId) {
    if (ctx.state.run) return endRun(ctx, 'stopped', true);
    if (!targetsOf(ctx, nodeId).size || budCount(ctx) <= 0) return;
    ctx.state.run = { nodeId, used: 0, timer: (0, ctx.deps.setInterval)(ctx.handlers.tick, ctx.state.RUN_INTERVAL_MS) };
    refreshPanel(ctx, nodeId);
    setRolling(ctx, true);
}

export function stopRun(ctx) {
    if (ctx.state.run) settleRun(ctx, 'stopped');
}

/** 목표가 뜬 순간: 고리 두 겹, 빛 조각, 금빛 글자, 큰 전리품 소리. 창 안 스크롤을 건드리지 않게 창 바깥 층에 그린다. */
export function celebrate(ctx) {
    const overlay = ctx.deps.document.getElementById('void-passive-craft-overlay'), card = ctx.deps.document.getElementById('void-craft-effect');
    if (!overlay || !card) return;
    const dialog = overlay.querySelector('.void-craft-dialog'), box = overlay.getBoundingClientRect(), rect = card.getBoundingClientRect();
    const scale = box.width / (overlay.offsetWidth || box.width);
    const fx = ctx.deps.document.createElement('div');
    fx.className = 'void-hit-fx';
    fx.setAttribute('aria-hidden', 'true');
    fx.style.left = `${(rect.left + rect.width / 2 - box.left) / scale}px`;
    fx.style.top = `${(rect.top + rect.height / 2 - box.top) / scale}px`;
    const sparks = Array.from({ length: ctx.state.SPARKS }, (_, i) => `<i style="--a:${Math.round(i * 360 / ctx.state.SPARKS)}deg;--r:${90 + (i % 4) * 34}px;--d:${(i % 5) * 45}ms"></i>`).join('');
    fx.innerHTML = `<span class="void-hit-ring"></span><span class="void-hit-ring is-late"></span>${sparks}<b class="void-hit-banner">${(0, ctx.deps._t)('목표 옵션 획득')}</b>`;
    overlay.appendChild(fx);
    dialog.classList.add('is-hit');
    card.classList.add('is-hit');
    (0, ctx.deps.playUiFeedbackSound)('lootMajor');
    (0, ctx.deps.setTimeout)(() => {
        fx.remove();
        dialog.classList.remove('is-hit');
        card.classList.remove('is-hit');
        }, ctx.state.HIT_FX_MS);
}

export function closeVoidPassiveCraftOverlay(ctx) {
    stopRun(ctx);
    let overlay = ctx.deps.document.getElementById('void-passive-craft-overlay');
    if (overlay) overlay.remove();
}

export function getVoidPassiveRefundState(ctx, nodeId) {
    let active = (ctx.deps.game.passives || []).includes(nodeId);
    let hasScour = (ctx.deps.game.currencies.blightSpore || 0) >= 1;
    let connected = typeof ctx.deps.canRefundPassiveNode === 'function' && (0, ctx.deps.canRefundPassiveNode)(nodeId);
    return {
        enabled: active && hasScour && connected,
        reason: !active ? '활성화된 공허 패시브만 반환할 수 있습니다.'
            : (!connected ? '연결 유지에 필요한 노드는 반환할 수 없습니다.'
                : (!hasScour ? '마름병 포자가 부족합니다.' : '마름병 포자 1개를 소모해 반환합니다.'))
    };
}

/** 제작 창은 쓴 결과를 창 안 한 줄과 알림으로 보여 준다(전투 기록만으로는 아무 일도 없던 것처럼 보였다 — 검토 4차). */
export function craftVoidPassiveFromOverlay(ctx, nodeId, currencyKey) {
    const before = ctx.deps.game.currencies[currencyKey] || 0;
    (0, ctx.deps.applyVoidPassiveCurrency)(nodeId, currencyKey);
    const result = (ctx.deps.game.currencies[currencyKey] || 0) < before ? getVoidCraftResultText(ctx, nodeId, currencyKey) : '';
    if (result) (0, ctx.deps.showGameToast)(result, { tone: 'info' });
    openVoidPassiveCraftOverlay(ctx, nodeId, result);
}

export function canUseFairyRingOnVoid(ctx, entry, active) {
    return active && !entry.fairyLocked && (ctx.deps.game.currencies.fairyRing || 0) > 0 && (!!entry.transcendent || (entry.stats || []).length > 0);
}

export function getVoidCraftResultText(ctx, nodeId, currencyKey) {
    const entry = (0, ctx.deps.getVoidPassiveCraft)(nodeId), name = (0, ctx.deps._t)(ctx.deps.ORB_DB[currencyKey].name);
    if (entry.transcendent) return `${name}, ${(0, ctx.deps.formatTranscendentVoidPassive)(entry.transcendent).replace(/<[^>]*>/g, '')}`;
    if (currencyKey === 'fairyRing') return (0, ctx.deps._t)('{name}, 초월 실패, 옵션이 지워졌습니다.', { name });
    return (0, ctx.deps._t)('{name}, 새 옵션: {replace}', { name, replace: (0, ctx.deps.getVoidPassiveEffectLabel)(nodeId).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() });
}

export function refundVoidPassiveFromOverlay(ctx, nodeId) {
    let state = getVoidPassiveRefundState(ctx, nodeId);
    if (!state.enabled) return (0, ctx.deps.addLog)(state.reason, 'attack-monster');
    closeVoidPassiveCraftOverlay(ctx);
    (0, ctx.deps.refundPassiveNode)(nodeId);
}

export async function askRefundPassiveNode(ctx, id) {
    if (!await (0, ctx.deps.requestGameConfirmation)((0, ctx.deps._t)('선택한 패시브 노드를 반환하고 마름병 포자 1개를 소모합니다.'), {
        title: (0, ctx.deps._t)('패시브 노드 반환'),
        tone: 'danger',
        confirmLabel: (0, ctx.deps._t)('노드 반환')
    })) return;
    (0, ctx.deps.refundPassiveNode)(id);
}

/** 공허 제작 창 안내: 세 재화가 하는 일과, 직업 공허 소켓이면 성좌 각성 진행. */
export function getVoidCraftGuide(ctx, node, active) {
    if (!active) return '먼저 패시브 트리에서 이 공허 패시브를 활성화해야 제작할 수 있습니다.';
    const base = '마법의 새싹은 현재 옵션을 지우고 공허 옵션 1~2줄을 다시 굴립니다. 요정의 고리는 옵션이 있는 공허를 25% 확률로 초월시키고, 실패하면 옵션이 지워지며 이번 루프에는 이 소켓에 다시 쓸 수 없습니다. 황금률은 초월 수치를 다시 굴립니다.';
    if (node.voidRing !== 'outer' || ctx.deps.game.passiveStarEvolution) return base;
    const progress = (0, ctx.deps.getPassiveConstellationAwakeningProgress)();
    return `${base}<br>${(0, ctx.deps._t)('직업 공허 소켓, 성좌 각성 {completed}/{required}: 여섯을 모두 활성화하면 성좌가 각성합니다.', { completed: progress.completed, required: progress.required })}`;
}

/** 초월 하나의 설명을 수치 범위로(카멜레온 목록): "5~10", 고정값은 그 값. */
export function describeTranscendentRange(ctx, def) {
    const range = (min, max, fixed) => (fixed !== undefined ? fixed : Number.isFinite(Number(min)) && Number.isFinite(Number(max)) ? (min === max ? min : `${min}~${max}`) : '');
    return def.desc(range(def.min, def.max, def.fixed), range(def.min2, def.max2));
}

/** 카멜레온 공허 패시브(활성화한 노드): 바꿀 수 있는 초월 목록. 고르면 묻고 바꾼다(convertChameleonFromOverlay). */
export function chameleonChoicesHtml(ctx, node, entry, active) {
    if (!active || !entry.transcendent || entry.transcendent.id !== 'chameleon') return '';
    const rows = (0, ctx.deps.getChameleonChoices)(node.id).map(def => `<button type="button" class="void-chameleon-choice" onclick="convertChameleonFromOverlay('${node.id}','${def.id}')">`
            + `<b>${(0, ctx.deps.escapeHTML)((0, ctx.deps._t)(def.name))}</b><span>${(0, ctx.deps.escapeHTML)(describeTranscendentRange(ctx, def))}</span></button>`).join('');
    return `<div class="void-chameleon"><div class="void-craft-hint">${(0, ctx.deps._t)('카멜레온: 바꿀 초월을 고르세요. 수치는 새로 굴리고, 바꾼 뒤에는 되돌릴 수 없습니다.')}</div>`
        + `<div class="void-chameleon-list">${rows || (0, ctx.deps._t)('<div class="void-craft-hint">고를 수 있는 초월이 없습니다.</div>')}</div></div>`;
}

export async function convertChameleonFromOverlay(ctx, nodeId, targetId) {
    const def = ctx.deps.TRANSCENDENT_VOID_PASSIVE_DB.find(row => row.id === targetId);
    if (!def || !await (0, ctx.deps.requestGameConfirmation)((0, ctx.deps._t)('카멜레온을 「{name}」 초월로 바꿉니다. 수치는 새로 굴리고, 되돌릴 수 없습니다.', { name: def.name }), { title: (0, ctx.deps._t)('카멜레온 변환'), confirmLabel: (0, ctx.deps._t)('바꾸기') })) return;
    const reason = (0, ctx.deps.convertChameleonVoidPassive)(nodeId, targetId);
    if (reason) return (0, ctx.deps.addLog)(reason, 'attack-monster');
    const result = (0, ctx.deps._t)('카멜레온 변환, {replace}', { replace: (0, ctx.deps.formatTranscendentVoidPassive)((0, ctx.deps.getVoidPassiveCraft)(nodeId).transcendent).replace(/<[^>]*>/g, '') });
    (0, ctx.deps.addLog)(`🦎 ${result}`, 'loot-unique');
    (0, ctx.deps.showGameToast)(result, { tone: 'info' });
    (0, ctx.deps.updateStaticUI)();
    openVoidPassiveCraftOverlay(ctx, nodeId, result);
}

export function openVoidPassiveCraftOverlay(ctx, nodeId, result = '') {
    closeVoidPassiveCraftOverlay(ctx);
    let node = ctx.deps.PASSIVE_TREE.nodes[nodeId];
    if (!node || node.kind !== 'void') return (0, ctx.deps.addLog)((0, ctx.deps._t)('공허 패시브만 제작할 수 있습니다.'), 'attack-monster');
    let active = (ctx.deps.game.passives || []).includes(node.id);
    let entry = voidOverlayEntry(ctx, node);
    let refundState = getVoidPassiveRefundState(ctx, node.id);
    let overlay = ctx.deps.document.createElement('div');
    overlay.id = 'void-passive-craft-overlay';
    overlay.className = 'void-craft-overlay';
    overlay.onclick = event => { if (event.target === overlay) closeVoidPassiveCraftOverlay(ctx); };
    overlay.innerHTML = voidOverlayHtml(ctx, { node, active, entry, refundState, result });
    ctx.deps.document.body.appendChild(overlay);
}

export function targetsOf(ctx, nodeId) { return ctx.state.targets.get(String(nodeId)) || new Set(); }

export function lineName(ctx, statId) { return (0, ctx.deps.escapeHTML)(String((0, ctx.deps.getStatName)(statId)).replace(/\s*\((\+%p|%)\)\s*/g, '').trim()); }

export function optionOf(ctx, statId) { return ctx.deps.VOID_PASSIVE_OPTION_POOL.find(option => option.id === statId); }

export function chipClass(ctx, statId) { return `void-chip is-${ctx.state.GROUP_CLASS[optionOf(ctx, statId).group]}`; }

export function budCount(ctx) { return Math.max(0, Math.floor(ctx.deps.game.currencies.magicBud || 0)); }

export function rangeText(ctx, option) { return `${option.min}~${option.max}${String((0, ctx.deps.getStatName)(option.id)).includes('%') ? '%' : ''}`; }

export function runStatus(ctx) { return (0, ctx.deps._t)('{used}개 사용, 남은 새싹 {budCount}개', { used: ctx.state.run.used, budCount: budCount(ctx) }); }

export function plainEffect(ctx, nodeId) { return (0, ctx.deps.getVoidPassiveEffectLabel)(nodeId).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }

function voidOverlayEntry(ctx, node) {
    return typeof ctx.deps.getVoidPassiveCraft === 'function' ? (0, ctx.deps.getVoidPassiveCraft)(node.id) : { stats: [] };
}

function canRollMagicBud(ctx, active, entry) {
    return active && !entry.transcendent && (ctx.deps.game.currencies.magicBud || 0) > 0;
}

function canRerollTranscendent(ctx, active, entry) {
    return active && entry.transcendent && typeof ctx.deps.TRANSCENDENT_VOID_PASSIVE_DB !== 'undefined' && ctx.deps.TRANSCENDENT_VOID_PASSIVE_DB.some(def => def.id === entry.transcendent.id && Number.isFinite(Number(def.min))) && (ctx.deps.game.currencies.goldenRule || 0) > 0;
}

function voidOverlayHtml(ctx, { node, active, entry, refundState, result }) {
    return `<div class="void-craft-dialog" role="dialog" aria-modal="true" aria-labelledby="void-craft-title" tabindex="-1">
        <div class="void-craft-header">
            <div><div id="void-craft-title">${(0, ctx.deps.escapeHTML)((0, ctx.deps.passiveNodePresentation.getPassiveNodeDisplayName)(node))}</div><div class="void-craft-subtitle">${(0, ctx.deps._t)('공허 패시브 제작')}</div></div>
            <button type="button" onclick="closeVoidPassiveCraftOverlay()">${(0, ctx.deps._t)('닫기')}</button>
        </div>
        <div class="void-craft-effect" id="void-craft-effect">${effectHtml(ctx, node.id)}</div>${chameleonChoicesHtml(ctx, node, entry, active)}
        ${result ? `<div class="void-craft-result" role="status">${(0, ctx.deps.escapeHTML)(result)}</div>` : ''}
        <div class="void-craft-hint">${getVoidCraftGuide(ctx, node, active)}</div>
        <div class="void-craft-actions">
            <button type="button" class="void-currency is-bud" onclick="craftVoidPassiveFromOverlay('${node.id}','magicBud')" ${canRollMagicBud(ctx, active, entry) ? '' : 'disabled'}>${(0, ctx.deps._t)('마법의 새싹, 1~2줄 재굴림')}<br><span id="void-bud-count">${(0, ctx.deps._t)('보유 {magicBud}', { magicBud: ctx.deps.game.currencies.magicBud || 0 })}</span></button>
            <button type="button" class="void-currency is-ring" onclick="craftVoidPassiveFromOverlay('${node.id}','fairyRing')" ${canUseFairyRingOnVoid(ctx, entry, active) ? '' : 'disabled'}>${(0, ctx.deps._t)('요정의 고리')}<br><span>${entry.fairyLocked ? (0, ctx.deps._t)('이번 루프 사용 불가') : (0, ctx.deps._t)('보유 {fairyRing}', { fairyRing: ctx.deps.game.currencies.fairyRing || 0 })}</span></button>
            <button type="button" class="void-currency is-rule" onclick="craftVoidPassiveFromOverlay('${node.id}','goldenRule')" ${canRerollTranscendent(ctx, active, entry) ? '' : 'disabled'}>${(0, ctx.deps._t)('황금률')}<br><span>${(0, ctx.deps._t)('보유 {goldenRule}', { goldenRule: ctx.deps.game.currencies.goldenRule || 0 })}</span></button>
        </div>
        ${panelHtml(ctx, node, entry, active)}
        <div class="void-craft-footer">
            <div class="void-craft-hint">${refundState.reason}</div>
            <button type="button" onclick="refundVoidPassiveFromOverlay('${node.id}')" ${refundState.enabled ? '' : 'disabled'}>${(0, ctx.deps._t)('공허 패시브 반환 (마름병 포자 1)')}</button>
        </div>
    </div>`;
}
