// 공허 제작 창의 목표 옵션과 마법의 새싹 연속 사용(2026-11-01 사용자). 목표는 저장하지 않는 창 상태로, 소켓마다 이번 접속 동안만 기억한다.
const voidCraftUi = (() => {
    const RUN_INTERVAL_MS = 130, MAX_TARGETS = 3, HIT_FX_MS = 1900, SPARKS = 22;
    const GROUP_CLASS = { 피해: 'damage', '치명타와 속도': 'speed', 상태이상: 'ailment', 방어: 'defence', 능력치: 'attribute', 무기: 'weapon' };
    const PICKER_ID = 'void-target-dialog';
    const targets = new Map();
    let run = null, pickerNode = null, pickerGroup = Object.keys(GROUP_CLASS)[0];

    const targetsOf = nodeId => targets.get(String(nodeId)) || new Set();
    const lineName = statId => escapeHTML(String(getStatName(statId)).replace(/\s*\((\+%p|%)\)\s*/g, '').trim());
    const optionOf = statId => VOID_PASSIVE_OPTION_POOL.find(option => option.id === statId);
    const chipClass = statId => `void-chip is-${GROUP_CLASS[optionOf(statId).group]}`;
    const budCount = () => Math.max(0, Math.floor(game.currencies.magicBud || 0));

    /** 새싹 하나로 목표 중 하나가 나올 확률: 1줄과 2줄이 반반이고, 두 줄은 서로 다른 옵션이다. */
    function hitChance(count) {
        const pool = VOID_PASSIVE_OPTION_POOL.length;
        return 0.5 * (count / pool) + 0.5 * (1 - ((pool - count) * (pool - count - 1)) / (pool * (pool - 1)));
    }

    /** 현재 옵션: 목표로 고른 줄은 금빛으로. */
    function effectHtml(nodeId) {
        const entry = getVoidPassiveCraft(nodeId), wanted = targetsOf(nodeId);
        if (entry.transcendent || !entry.stats.length) return getVoidPassiveEffectLabel(nodeId);
        return passiveRouting.voidStats(entry, game, getVoidLinkScale(nodeId))
            .map(line => `<div class="void-craft-line${wanted.has(line.id) ? ' is-target' : ''}">${escapeHTML(formatVoidPassiveStatLine(line))}</div>`).join('');
    }

    // 목표 고르기 창(2026-11-02 사용자: 옵션이 한 줄로 쭉 늘어서 스크롤이 길었다): 분류 탭 하나에 그 분류의 옵션만, 값 범위와 함께.
    const rangeText = option => `${option.min}~${option.max}${String(getStatName(option.id)).includes('%') ? '%' : ''}`;
    function pickerOptionHtml(option, wanted) {
        const on = wanted.has(option.id), full = !on && wanted.size >= MAX_TARGETS;
        return `<button type="button" class="${chipClass(option.id)} void-picker-option${on ? ' is-on' : ''}" aria-pressed="${on}"${full ? ' disabled' : ''} onclick="voidCraftUi.toggleTarget('${pickerNode}','${option.id}')"><span>${lineName(option.id)}</span><small>${rangeText(option)}</small></button>`;
    }
    function pickerTabHtml(group, wanted) {
        const rows = VOID_PASSIVE_OPTION_POOL.filter(option => option.group === group), picked = rows.filter(option => wanted.has(option.id)).length;
        return `<button type="button" class="void-picker-tab is-${GROUP_CLASS[group]}${group === pickerGroup ? ' is-active' : ''}${picked ? ' has-picked' : ''}" aria-pressed="${group === pickerGroup}" onclick="voidCraftUi.showGroup('${group}')"><span>${group}</span><small>${picked ? _t('{picked}개 고름', { picked }) : _t('{length}종', { length: rows.length })}</small></button>`;
    }
    function drawPicker() {
        const wanted = targetsOf(pickerNode);
        const tabs = Object.keys(GROUP_CLASS).map(group => pickerTabHtml(group, wanted)).join('');
        const options = VOID_PASSIVE_OPTION_POOL.filter(option => option.group === pickerGroup).map(option => pickerOptionHtml(option, wanted)).join('');
        const picked = [...wanted].map(statId => `<button type="button" class="${chipClass(statId)} is-on" onclick="voidCraftUi.toggleTarget('${pickerNode}','${statId}')">${lineName(statId)}<span aria-hidden="true"> ✕</span></button>`).join('');
        selectionDialog.show({ id: PICKER_ID, title: _t('목표 옵션 고르기'), panelClass: 'void-target-window', body: `<nav class="void-picker-tabs" aria-label="${_t('옵션 분류')}">${tabs}</nav>
            <div class="void-picker-grid">${options}</div>
            <footer class="void-picker-foot"><b>${wanted.size}/${MAX_TARGETS}</b><div class="void-target-chips">${picked}</div><span class="void-run-status">${idleStatus(wanted)}</span><button type="button" class="void-picker-done" data-selection-close>${_t('완료')}</button></footer>` });
    }
    function openPicker(nodeId) {
        pickerNode = String(nodeId);
        drawPicker();
    }
    function showGroup(group) {
        if (!GROUP_CLASS[group]) return;
        pickerGroup = group;
        drawPicker();
    }

    function idleStatus(wanted) {
        if (!wanted.size) return '목표를 고르면 연속으로 쓸 수 있습니다.';
        const chance = hitChance(wanted.size);
        return _t('새싹 1개에 {value}%, 평균 {ceil}개', { value: (chance * 100).toFixed(1), ceil: Math.ceil(1 / chance) });
    }

    function panelBody(nodeId) {
        const wanted = targetsOf(nodeId), running = run && run.nodeId === nodeId;
        const picked = [...wanted].map(statId => `<button type="button" class="${chipClass(statId)} is-on" onclick="voidCraftUi.toggleTarget('${nodeId}','${statId}')">${lineName(statId)}<span aria-hidden="true"> ✕</span></button>`).join('');
        const disabled = !running && (!wanted.size || budCount() <= 0);
        return `<div class="void-target-head"><b>${_t('목표 옵션')}</b><span>${_t('{size}/{MAX_TARGETS}, 하나라도 나오면 멈춥니다', { size: wanted.size, MAX_TARGETS })}</span></div>
            ${picked ? `<div class="void-target-chips">${picked}</div>` : ''}
            ${running ? '' : `<button type="button" class="void-picker-open" onclick="voidCraftUi.openPicker('${nodeId}')">${_t('옵션 고르기')}</button>`}
            <div class="void-run">
                <button type="button" id="void-run-button" class="void-run-button${running ? ' is-running' : ''}" onclick="voidCraftUi.toggleRun('${nodeId}')" ${disabled ? 'disabled' : ''}>${running ? _t('멈추기') : _t('목표까지 연속 사용')}</button>
                <span id="void-run-status" class="void-run-status" role="status">${running ? runStatus() : idleStatus(wanted)}</span>
            </div>`;
    }

    function panelHtml(node, entry, active) {
        if (!active || entry.transcendent) return '';
        return `<div class="void-target" id="void-target-panel">${panelBody(node.id)}</div>`;
    }

    function refreshPanel(nodeId) {
        const panel = document.getElementById('void-target-panel');
        if (panel) panel.innerHTML = panelBody(nodeId);
    }

    function refreshEffect(nodeId) {
        const card = document.getElementById('void-craft-effect');
        if (card) card.innerHTML = effectHtml(nodeId);
    }

    function toggleTarget(nodeId, statId) {
        if (run || !optionOf(statId)) return;
        const wanted = new Set(targetsOf(nodeId));
        if (wanted.has(statId)) wanted.delete(statId);
        else if (wanted.size < MAX_TARGETS) wanted.add(statId);
        targets.set(String(nodeId), wanted);
        refreshPanel(nodeId);
        refreshEffect(nodeId);
        if (selectionDialog.isOpen(PICKER_ID)) drawPicker();
    }

    const runStatus = () => _t('{used}개 사용, 남은 새싹 {budCount}개', { used: run.used, budCount: budCount() });

    const plainEffect = nodeId => getVoidPassiveEffectLabel(nodeId).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    function setRolling(on) {
        const dialog = document.querySelector('#void-passive-craft-overlay .void-craft-dialog');
        if (dialog) dialog.classList.toggle('is-rolling', on);
    }

    /** 멈출 까닭: 전투 잠금, 초월, 노드 반환. 재화가 떨어진 것은 따로 알린다. */
    function canKeepRolling(nodeId, entry) {
        return !game.woodsmanBuildLock && !entry.transcendent && (game.passives || []).includes(nodeId);
    }

    function tick() {
        const { nodeId } = run, entry = getVoidPassiveCraft(nodeId);
        if (!canKeepRolling(nodeId, entry)) return endRun('stopped', true);
        if (budCount() <= 0) return endRun('empty', true);
        game.currencies.magicBud = budCount() - 1;
        rollMagicBudOnVoid(entry);
        run.used++;
        refreshEffect(nodeId);
        const status = document.getElementById('void-run-status'), count = document.getElementById('void-bud-count');
        if (status) status.textContent = runStatus();
        if (count) count.textContent = _t('보유 {budCount}', { budCount: budCount() });
        const wanted = targetsOf(nodeId);
        if (entry.stats.some(line => wanted.has(line.id))) endRun('hit', true);
    }

    function resultText(outcome, nodeId, used) {
        const bud = ORB_DB.magicBud.name;
        if (outcome === 'hit') return _t('목표 옵션 획득, {bud} {used}개 사용: {nodeId}', { bud, used, nodeId: plainEffect(nodeId) });
        if (outcome === 'empty') return _t('{bud}이 떨어졌습니다, {used}개 사용: {nodeId}', { bud, used, nodeId: plainEffect(nodeId) });
        return _t('연속 사용을 멈췄습니다, {bud} {used}개 사용: {nodeId}', { bud, used, nodeId: plainEffect(nodeId) });
    }

    /** 끝낸다: 기록과 알림은 한 번만, 창은 새 값으로 다시 그린다. reopen이 거짓이면 창을 닫는 중이다. */
    function endRun(outcome, reopen) {
        const { nodeId, used, timer } = run;
        clearInterval(timer);
        run = null;
        playerStatCache.invalidate();
        const text = resultText(outcome, nodeId, used);
        if (used > 0) addLog(`🕳️ ${text}`, outcome === 'hit' ? 'loot-rare' : 'loot-magic');
        updateStaticUI();
        if (!reopen) return;
        openVoidPassiveCraftOverlay(nodeId, text);
        if (outcome === 'hit') celebrate();
        else showGameToast(text, { tone: 'info' });
    }

    function toggleRun(nodeId) {
        if (run) return endRun('stopped', true);
        if (!targetsOf(nodeId).size || budCount() <= 0) return;
        run = { nodeId, used: 0, timer: setInterval(tick, RUN_INTERVAL_MS) };
        refreshPanel(nodeId);
        setRolling(true);
    }

    function stopRun() {
        if (run) endRun('stopped', false);
    }

    /** 목표가 뜬 순간: 고리 두 겹, 빛 조각, 금빛 글자, 큰 전리품 소리. 창 안 스크롤을 건드리지 않게 창 바깥 층에 그린다. */
    function celebrate() {
        const overlay = document.getElementById('void-passive-craft-overlay'), card = document.getElementById('void-craft-effect');
        if (!overlay || !card) return;
        const dialog = overlay.querySelector('.void-craft-dialog'), box = overlay.getBoundingClientRect(), rect = card.getBoundingClientRect();
        const scale = box.width / (overlay.offsetWidth || box.width);
        const fx = document.createElement('div');
        fx.className = 'void-hit-fx';
        fx.setAttribute('aria-hidden', 'true');
        fx.style.left = `${(rect.left + rect.width / 2 - box.left) / scale}px`;
        fx.style.top = `${(rect.top + rect.height / 2 - box.top) / scale}px`;
        const sparks = Array.from({ length: SPARKS }, (_, i) => `<i style="--a:${Math.round(i * 360 / SPARKS)}deg;--r:${90 + (i % 4) * 34}px;--d:${(i % 5) * 45}ms"></i>`).join('');
        fx.innerHTML = `<span class="void-hit-ring"></span><span class="void-hit-ring is-late"></span>${sparks}<b class="void-hit-banner">${_t('목표 옵션 획득')}</b>`;
        overlay.appendChild(fx);
        dialog.classList.add('is-hit');
        card.classList.add('is-hit');
        playUiFeedbackSound('lootMajor');
        setTimeout(() => {
            fx.remove();
            dialog.classList.remove('is-hit');
            card.classList.remove('is-hit');
        }, HIT_FX_MS);
    }

    return { effectHtml, panelHtml, toggleTarget, openPicker, showGroup, toggleRun, stopRun };
})();
safeExposeGlobals({ voidCraftUi });
