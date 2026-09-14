const gemCoreForgeUi = (() => {
    let dialog = null;
    let target = null;
    let material = 'bossCore';
    let busy = false;
    let result = null;

    function steps(level) {
        return `<div class="gem-forge-steps" aria-label="${level}강 / 최대 5강">${Array.from({ length: 5 }, (_, index) => `<span class="${index < level ? 'filled' : ''}">${index + 1}</span>`).join('')}</div>`;
    }

    function effectLine(track, level) {
        return `${track.effect} ${level * track.stepPct}% 증폭`;
    }

    function trackCard(name, key) {
        const state = busy && name === target && key === material ? result : gemCoreForge.inspect(name, key);
        return `<button type="button" class="gem-forge-track ${state.track.tone}" data-forge-material="${key}">
            <span class="gem-forge-track-head"><strong>${state.track.name}</strong><b>+${state.level}</b></span>
            ${steps(state.level)}<span class="gem-forge-track-effect">${effectLine(state.track, state.level)}</span>
            <span class="gem-forge-cap ${state.done ? 'complete' : ''}">5강 보너스 <b>젬 레벨 +1</b></span>
            <span class="gem-forge-track-foot"><span>보유 ${state.owned.toLocaleString()}</span><b>${state.done ? '강화 완료' : '강화하기'}</b></span>
        </button>`;
    }

    function renderSection(name) {
        const container = document.getElementById('ui-gem-core-forge');
        if (!container) return;
        container.innerHTML = name ? Object.keys(GEM_CORE_FORGE.tracks).map(key => trackCard(name, key)).join('') : '<p class="gem-process-empty">장착한 공격 젬을 선택하세요.</p>';
        container.onclick = event => {
            const button = event.target.closest('[data-forge-material]');
            if (button && name) open(name, button.dataset.forgeMaterial);
        };
    }

    function resultMarkup(state) {
        if (busy) return '<strong>강화 중</strong>';
        if (state.done) return `<strong>최대 강화 달성</strong><span class="gem-forge-level-bonus">젬 레벨 +1 ${result?.status === 'success' ? '획득' : '적용 중'}</span>`;
        if (!result) return `<span>${state.nextPityGain ? `실패 시 성공률 +${formatValue('', state.nextPityGain)}%p` : '성공 확정'}</span><span>강화 단계 유지</span>`;
        if (result.status === 'blocked') return `<strong>${escapeHTML(result.error)}</strong>`;
        if (result.status === 'failure') return `<strong>강화 실패</strong><span>다음 성공률 <b>${formatValue('', state.chance)}%</b> <em>+${formatValue('', state.chance - result.chance)}%p</em></span>`;
        return `<strong>강화 성공</strong><span>${effectLine(state.track, state.level)}</span>`;
    }

    function footer(state) {
        return `<div class="gem-forge-chance"><span>${state.done ? '강화 완료' : '성공 확률'}${state.pityBonus ? `<small>실패 보정 +${formatValue('', state.pityBonus)}%p</small>` : ''}</span><strong>${state.done ? 'MAX' : `${formatValue('', state.chance)}%`}</strong></div>
            <div class="gem-forge-chance-bar"><span style="width:${state.chance}%"></span></div>
            <footer class="gem-forge-footer"><div><span>${state.track.name}</span><strong>${state.done ? '추가 소모 없음' : `${state.cost}개 소모`}</strong><small>보유 ${state.owned.toLocaleString()}개</small></div><button type="button" data-forge-attempt ${state.error || busy ? 'disabled' : ''}>${busy ? '강화 중' : state.error || '강화'}</button></footer>`;
    }

    function contents(state) {
        const nextLevel = Math.min(5, state.level + 1);
        return `<header class="gem-forge-header"><div><small>젬 강화</small><h2 id="gem-forge-title">${state.track.name}</h2></div><button type="button" data-forge-close aria-label="젬 강화 닫기" ${busy ? 'disabled' : ''}>닫기</button></header>
            <nav class="gem-forge-materials" aria-label="강화 재료">${Object.entries(GEM_CORE_FORGE.tracks).map(([key, track]) => `<button type="button" class="${track.tone}" data-forge-track="${key}" aria-pressed="${key === material}" ${busy ? 'disabled' : ''}>${track.name}</button>`).join('')}</nav>
            <div class="gem-forge-stage"><div class="gem-forge-halo"></div>${renderSkillGemArt(target, 'gem-forge-art', { eager: true })}<strong>${escapeHTML(target)}</strong><b class="gem-forge-level">+${state.level}</b>${steps(state.level)}</div>
            <div class="gem-forge-effects"><div><small>현재</small><strong>${effectLine(state.track, state.level)}</strong></div><div><small>${state.done ? '최대 강화' : `다음 +${nextLevel}`}</small><strong>${effectLine(state.track, nextLevel)}</strong></div></div>
            <div class="gem-forge-cap ${state.done ? 'complete' : ''}">5강 보너스 <b>젬 레벨 +1</b><span>${state.done ? '적용 중' : ''}</span></div>
            <div class="gem-forge-result" role="status" aria-live="polite">${resultMarkup(state)}</div>
            ${footer(state)}`;
    }

    function renderOverlay() {
        // The attempt is committed and saved immediately, but its pre-roll snapshot
        // stays visible until the charge finishes so neither outcome is revealed early.
        const state = busy ? result : gemCoreForge.inspect(target, material);
        dialog.className = `gem-forge-dialog ${state.track.tone} ${busy ? 'charging' : result?.status || ''} ${state.done ? 'mastered' : ''}`;
        dialog.innerHTML = contents(state);
    }

    function attempt() {
        if (busy) return;
        result = gemCoreForge.attempt(target, material);
        if (result.status === 'blocked') { renderOverlay(); return; }
        busy = true;
        queueImportantSave(200);
        renderOverlay();
        setTimeout(() => {
            busy = false;
            updateStaticUI();
            renderOverlay();
            const button = dialog.querySelector('[data-forge-attempt]');
            (button.disabled ? dialog.querySelector('[data-forge-close]') : button).focus();
        }, 450);
    }

    function handleClick(event) {
        if (busy) return;
        if (event.target.closest('[data-forge-close]')) { dialog.close(); return; }
        const track = event.target.closest('[data-forge-track]');
        if (track) {
            material = track.dataset.forgeTrack; result = null; renderOverlay();
            dialog.querySelector(`[data-forge-track="${material}"]`).focus();
            return;
        }
        if (event.target.closest('[data-forge-attempt]')) attempt();
    }

    function open(name, key) {
        if (busy || !Object.hasOwn(GEM_CORE_FORGE.tracks, key)) return;
        target = name; material = key; result = null;
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.id = 'gem-core-forge-overlay';
            dialog.setAttribute('aria-labelledby', 'gem-forge-title');
            dialog.addEventListener('click', handleClick);
            dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
            dialog.addEventListener('close', () => document.querySelector(`[data-forge-material="${material}"]`)?.focus());
            document.body.appendChild(dialog);
        }
        renderOverlay();
        if (!dialog.open) dialog.showModal();
    }

    return Object.freeze({ renderSection, open });
})();
safeExposeGlobals({ gemCoreForgeUi });
