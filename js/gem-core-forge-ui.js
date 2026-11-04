const gemCoreForgeUi = (() => {
    const FORGE = GEM_CORE_FORGE;
    const REVEAL_MS = Object.freeze([450, 650, 900, 1250, 1600]);   // 결과를 열기까지(연출 단계별): 높을수록 오래 모은다
    const TIMING_IDLE_MS = 20000;   // 담금질을 두고 가면 값을 치르지 않고 접는다
    let dialog = null;
    let target = null;
    let busy = false;
    let result = null;
    let cores = 0;                  // 이번 시도에 쓸 군주의 핵
    let timing = null;              // 담금질 중: { zone: [시작 %, 끝 %], periodMs, startedAt, frame, at }

    const percentText = value => formatValue('', value);
    const lerp = ([from, to], t) => from + (to - from) * t;

    function steps(level) {
        const pips = Array.from({ length: FORGE.maxLevel }, (_, index) => {
            const kinds = [index < level ? 'filled' : '', index >= FORGE.riskFromLevel ? 'risk' : '', FORGE.runeLevelAt.includes(index + 1) ? 'mile' : ''];
            return `<span class="${kinds.filter(Boolean).join(' ')}"></span>`;
        }).join('');
        return `<div class="gem-forge-steps" aria-label="${_t('{level}강 / 최대 {maxLevel}강', { level, maxLevel: FORGE.maxLevel })}">${pips}</div>`;
    }

    function trackCard(name) {
        const state = busy && name === target ? result : gemCoreForge.inspect(name);
        const spares = state.spares ? _t(', 여분 {spares}개', { spares: state.spares }) : '';
        return `<button type="button" class="gem-forge-track forge-tier-${gemCoreForge.tierOf(state.level)}" data-forge-open>
            <span class="gem-forge-track-head"><strong>${_t('룬 강화')}</strong><b>+${state.level}</b></span>
            ${steps(state.level)}<span class="gem-forge-track-effect">${gemCoreForge.effectText(state.level)}</span>
            <span class="gem-forge-track-foot"><span>${_t('창공의 정수 {owned}, 군주의 핵 {coresOwned}{spares}', { owned: state.owned.toLocaleString(), coresOwned: state.coresOwned.toLocaleString(), spares })}</span><b>${state.done ? _t('강화 완료') : _t('강화하기')}</b></span>
        </button>`;
    }

    function renderSection(name) {
        const container = document.getElementById('ui-gem-core-forge');
        if (!container) return;
        container.innerHTML = name ? trackCard(name) : '<p class="gem-process-empty">장착한 공격 룬을 선택하세요.</p>';
        container.onclick = event => { if (name && event.target.closest('[data-forge-open]')) open(name); };
    }

    function timingMarkup() {
        // 얼마나 오르는지는 알리지 않는다(2026-11-03 사용자).
        const [from, to] = timing.zone;
        return `<div class="gem-forge-timing"><small>${_t('담금질: 칸 안에서 멈추면 성공 확률이 오릅니다')}</small><div class="gem-forge-timing-bar"><i class="gem-forge-timing-zone" style="left:${from}%;width:${to - from}%"></i><b class="gem-forge-timing-marker"></b></div>
            <button type="button" data-forge-stop>${_t('멈추기')}</button></div>`;
    }

    function outcomeMarkup(state) {
        const timed = result.timed ? '<em>담금질 성공</em>' : '';
        if (result.status === 'destroyed') return `<strong>${_t('룬 파괴')}</strong><span>${result.lost ? _t('남은 룬이 없습니다.') : _t('여분 룬으로 +0부터 다시 시작합니다. 남은 여분 {spares}개', { spares: state.spares })}</span>`;
        if (result.status === 'failure') return `<strong>${_t('강화 실패')}</strong><span>${_t('다음 성공률')} <b>${percentText(state.chance)}%</b>${timed}</span>`;
        const milestone = FORGE.runeLevelAt.includes(state.level) ? `<span class="gem-forge-level-bonus">${_t('+{level} 달성, 룬 레벨 +1', { level: state.level })}</span>` : '';
        return `<strong>${_t('강화 성공')}</strong>${milestone}<span>${gemCoreForge.effectText(state.level)}${timed}</span>`;
    }

    function resultMarkup(state) {
        if (timing) return timingMarkup();
        if (busy) return '<strong>강화 중</strong>';
        if (result?.status === 'blocked') return `<strong>${escapeHTML(result.error)}</strong>`;
        if (result) return outcomeMarkup(state);
        if (state.done) return '<strong>최대 강화 달성</strong>';
        return `<span>${state.nextPityGain ? _t('실패 시 성공률 +{nextPityGain}%p', { nextPityGain: percentText(state.nextPityGain) }) : _t('성공 확정')}</span>`;
    }

    /** 성공, 유지, 파괴의 몫. 올려 주는 값은 그 아래 작게 적는다. */
    function oddsMarkup(state) {
        if (state.done) return '';
        const keep = Math.max(0, 100 - state.chance - state.destroy);
        const rows = [['success', '성공', state.chance], ['keep', '유지', keep], ['destroy', '파괴', state.destroy]].filter(([, , value]) => value > 0);
        const bonus = [state.pityBonus ? _t('실패 보정 +{pityBonus}%p', { pityBonus: percentText(state.pityBonus) }) : '', state.coreBonus ? _t('군주의 핵 +{coreBonus}%p', { coreBonus: percentText(state.coreBonus) }) : ''].filter(Boolean).join(', ');
        return `<div class="gem-forge-odds">${rows.map(([key, label, value]) => `<span class="is-${key}">${label} <b>${percentText(value)}%</b></span>`).join('')}</div>
            <div class="gem-forge-odds-bar" aria-hidden="true">${rows.map(([key, , value]) => `<i class="is-${key}" style="width:${value}%"></i>`).join('')}</div>
            ${bonus ? `<small class="gem-forge-odds-bonus">${bonus}</small>` : ''}`;
    }

    function boosterMarkup(state) {
        if (state.done) return '';
        const locked = busy || !!timing, top = Math.min(FORGE.boosterMax, state.coresOwned);
        return `<div class="gem-forge-booster"><span><strong>${_t('군주의 핵')}</strong><small>${_t('보유 {coresOwned}', { coresOwned: state.coresOwned.toLocaleString() })}</small></span>
            <div class="gem-forge-stepper"><button type="button" data-forge-cores="-1" aria-label="${_t('군주의 핵 하나 덜 쓰기')}" ${locked || state.coresUsed <= 0 ? 'disabled' : ''}>-</button><output>${state.coresUsed}</output>
            <button type="button" data-forge-cores="1" aria-label="${_t('군주의 핵 하나 더 쓰기')}" ${locked || state.coresUsed >= top ? 'disabled' : ''}>+</button>
            <button type="button" data-forge-cores="${FORGE.boosterMax}" ${locked || state.coresUsed >= top ? 'disabled' : ''}>${_t('최대')}</button></div></div>`;
    }

    function footer(state) {
        const spareClass = state.destroy > 0 && !state.spares ? ' class="is-none"' : '';
        const label = busy ? '강화 중' : state.error || '강화';
        return `<footer class="gem-forge-footer"><div><span>${_t('창공의 정수')}</span><strong>${state.done ? _t('추가 소모 없음') : _t('{cost}개 소모', { cost: state.cost })}</strong><small>${_t('보유 {owned}개,', { owned: state.owned.toLocaleString() })} <span${spareClass}>${_t('여분 룬 {spares}개', { spares: state.spares })}</span></small></div>
            <button type="button" data-forge-attempt ${state.error || busy || timing ? 'disabled' : ''}>${label}</button></footer>
            <label class="gem-forge-skip"><input type="checkbox" data-forge-skip ${game.settings.runeTimingOff ? 'checked' : ''}>${_t('담금질 건너뛰기')}</label>`;
    }

    /** 터지는 조각: 성공은 단계가 높을수록 많고 멀리, 파괴는 룬이 조각나 흩어진다. 그린 뒤 한 번만 돈다. */
    function burstMarkup(state) {
        if (busy || !result) return '';
        const broke = result.status === 'destroyed';
        if (!broke && result.status !== 'success') return '';
        const count = broke ? 18 + result.level : 8 + state.level * 2;
        const reach = broke ? 120 : 60 + state.level * 6, big = broke ? 5 : 3 + Math.floor(state.level / 5);
        const pieces = Array.from({ length: count }, (_, index) => {
            const angle = Math.round(index * 360 / count + Math.random() * 18);
            const far = Math.round(reach * (0.6 + Math.random() * 0.5)), size = big + Math.floor(Math.random() * 4);
            return `<i style="--angle:${angle}deg;--reach:${far}px;--size:${size}px;--delay:${Math.floor(Math.random() * 110)}ms"></i>`;
        }).join('');
        return `<div class="gem-forge-fx" aria-hidden="true">${pieces}</div>`;
    }

    function contents(state) {
        const nextLevel = Math.min(FORGE.maxLevel, state.level + 1);
        return `<div class="gem-forge-flash" aria-hidden="true"></div>
            <header class="gem-forge-header"><div><small>${_t('룬 강화')}</small><h2 id="gem-forge-title">${escapeHTML(target)}</h2></div><button type="button" data-forge-close aria-label="${_t('룬 강화 닫기')}" ${busy ? 'disabled' : ''}>${_t('닫기')}</button></header>
            <div class="gem-forge-stage"><div class="gem-forge-halo"></div>${burstMarkup(state)}${renderSkillGemArt(target, 'gem-forge-art', { eager: true, plain: true })}<b class="gem-forge-level">+${state.level}</b>${steps(state.level)}</div>
            <div class="gem-forge-effects"><div><small>${_t('현재')}</small><strong>${gemCoreForge.effectText(state.level)}</strong></div><div><small>${state.done ? _t('최대 강화') : _t('다음 +{nextLevel}', { nextLevel })}</small><strong>${gemCoreForge.effectText(nextLevel)}</strong></div></div>
            <div class="gem-forge-result" role="status" aria-live="polite">${resultMarkup(state)}</div>
            ${oddsMarkup(state)}${boosterMarkup(state)}${footer(state)}`;
    }

    function renderOverlay() {
        // The attempt is committed and saved immediately, but its pre-roll snapshot
        // stays visible until the charge finishes so neither outcome is revealed early.
        const state = busy ? result : gemCoreForge.inspect(target, { cores });
        const status = timing ? 'timing' : busy ? 'charging' : result?.status || '';
        dialog.className = `gem-forge-dialog forge-tier-${gemCoreForge.tierOf(state.level)} ${status} ${state.done ? 'mastered' : ''}`;
        dialog.style.setProperty('--forge-heat', String(state.level / FORGE.maxLevel));
        dialog.style.setProperty('--forge-reveal', `${revealMs(state.level)}ms`);
        dialog.innerHTML = contents(state);
    }

    const revealMs = level => REVEAL_MS[gemCoreForge.tierOf(level + 1)];

    function announce(name, { status, level, lost }) {
        if (status === 'destroyed') {
            playUiFeedbackSound('danger');
            addLog(_t('💥 [{name}] +{level} 강화 중 룬이 파괴되었습니다.{lost}', { name: escapeHTML(_t(name)), level, lost: lost ? ` ${_t('남은 룬이 없습니다.')}` : '' }), 'attack-monster');
            return;
        }
        if (status === 'failure') { playUiFeedbackSound('cancel'); return; }
        const next = level + 1;
        playUiFeedbackSound(next >= 15 ? 'lootBurst' : next >= 10 ? 'levelUp' : 'success');
        if (next >= FORGE.riskFromLevel) addLog(_t('✨ [{name}] 룬 강화 +{next} 달성!', { name: escapeHTML(name), next }), 'loot-unique');
    }

    function reveal() {
        busy = false;
        updateStaticUI();
        renderOverlay();
        announce(target, result);
        const button = dialog.querySelector('[data-forge-attempt]');
        (button.disabled ? dialog.querySelector('[data-forge-close]') : button).focus();
    }

    function commit(timed) {
        timing = null;
        result = { ...gemCoreForge.attempt(target, { cores, timed }), timed };
        if (result.status === 'blocked') { busy = false; renderOverlay(); return; }
        busy = true;
        queueImportantSave(200);
        renderOverlay();
        setTimeout(reveal, revealMs(result.level));
    }

    function cancelTiming() {
        if (!timing) return;
        cancelAnimationFrame(timing.frame);
        timing = null;
    }

    function moveMarker(now) {
        if (!timing) return;
        if (!dialog.open || now - timing.startedAt > TIMING_IDLE_MS) { cancelTiming(); if (dialog.open) renderOverlay(); return; }
        const phase = ((now - timing.startedAt) / timing.periodMs) % 2;
        timing.at = (phase < 1 ? phase : 2 - phase) * 100;
        dialog.querySelector('.gem-forge-timing-marker').style.left = `${timing.at}%`;
        timing.frame = requestAnimationFrame(moveMarker);
    }

    /** 담금질: 값은 멈춘 뒤에 치른다. 칸과 표시는 단계에 따라 좁아지고 빨라진다. */
    function startTiming() {
        const state = gemCoreForge.inspect(target, { cores });
        const t = state.level / (FORGE.maxLevel - 1), width = lerp(FORGE.timing.zonePct, t);
        const from = 8 + Math.random() * (84 - width);
        result = null;
        timing = { zone: [from, from + width], periodMs: lerp(FORGE.timing.periodMs, t), startedAt: performance.now(), frame: 0, at: 0 };
        renderOverlay();
        dialog.querySelector('[data-forge-stop]').focus();
        timing.frame = requestAnimationFrame(moveMarker);
    }

    function stopTiming() {
        if (!timing) return;
        cancelAnimationFrame(timing.frame);
        const hit = timing.at >= timing.zone[0] && timing.at <= timing.zone[1];
        dialog.querySelector('.gem-forge-timing').classList.add(hit ? 'is-hit' : 'is-miss');
        busy = true;     // 맞혔는지 보여 주는 동안은 닫거나 다시 누를 수 없다
        setTimeout(() => commit(hit), 320);
    }

    function pressAttempt() {
        if (timing) return;
        if (game.settings.runeTimingOff) commit(false);
        else startTiming();
    }

    function stepCores(button) {
        const state = gemCoreForge.inspect(target, { cores });
        cores = Math.max(0, state.coresUsed + Number(button.dataset.forgeCores));
        result = null;
        renderOverlay();
    }

    function toggleSkip(input) { game.settings.runeTimingOff = input.checked; }

    const CLICK_ACTIONS = Object.freeze([['[data-forge-close]', () => dialog.close()], ['[data-forge-stop]', stopTiming], ['[data-forge-cores]', stepCores],
        ['[data-forge-attempt]', pressAttempt], ['[data-forge-skip]', toggleSkip]]);

    function handleClick(event) {
        if (busy) return;
        for (const [selector, run] of CLICK_ACTIONS) {
            const hit = event.target.closest(selector);
            if (hit) { run(hit); return; }
        }
    }

    function open(name) {
        if (busy) return;
        target = name; result = null; cores = 0;
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.id = 'gem-core-forge-overlay';
            dialog.setAttribute('aria-labelledby', 'gem-forge-title');
            dialog.addEventListener('click', handleClick);
            dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
            dialog.addEventListener('close', () => { cancelTiming(); document.querySelector('[data-forge-open]')?.focus(); });
            document.body.appendChild(dialog);
        }
        renderOverlay();
        if (!dialog.open) dialog.showModal();
    }

    return Object.freeze({ renderSection, open });
})();
safeExposeGlobals({ gemCoreForgeUi });
