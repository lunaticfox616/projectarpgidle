export function steps(runtime, level) {
    const pips = Array.from({ length: runtime.state.FORGE.maxLevel }, (_, index) => {
        const kinds = [index < level ? 'filled' : '', index >= runtime.state.FORGE.riskFromLevel ? 'risk' : '', runtime.state.FORGE.runeLevelAt.includes(index + 1) ? 'mile' : ''];
        return `<span class="${kinds.filter(Boolean).join(' ')}"></span>`;
    }).join('');
    return `<div class="gem-forge-steps" aria-label="${(0, runtime.deps._t)('{level}강 / 최대 {maxLevel}강', { level, maxLevel: runtime.state.FORGE.maxLevel })}">${pips}</div>`;
}

export function trackCard(runtime, name) {
    const state = shownState(runtime, name);
    const spares = state.spares ? (0, runtime.deps._t)(', 여분 {spares}개', { spares: state.spares }) : '';
    return `<button type="button" class="gem-forge-track forge-tier-${runtime.deps.gemCoreForge.tierOf(state.level)}" data-forge-open>
            <span class="gem-forge-track-head"><strong>${(0, runtime.deps._t)('룬 강화')}</strong><b>+${state.level}</b></span>
            ${steps(runtime, state.level)}<span class="gem-forge-track-effect">${runtime.deps.gemCoreForge.effectText(state.level)}</span>
            <span class="gem-forge-track-foot"><span>${(0, runtime.deps._t)('창공의 정수 {owned}, 군주의 핵 {coresOwned}{spares}', { owned: state.owned.toLocaleString(), coresOwned: state.coresOwned.toLocaleString(), spares })}</span><b>${state.done ? (0, runtime.deps._t)('강화 완료') : (0, runtime.deps._t)('강화하기')}</b></span>
        </button>`;
}



export function timingMarkup(runtime) {
    // 얼마나 오르는지는 알리지 않는다(2026-11-03 사용자).
    const [from, to] = runtime.state.timing.zone;
    return `<div class="gem-forge-timing"><small>${(0, runtime.deps._t)('담금질: 칸 안에서 멈추면 성공 확률이 오릅니다')}</small><div class="gem-forge-timing-bar"><i class="gem-forge-timing-zone" style="left:${from}%;width:${to - from}%"></i><b class="gem-forge-timing-marker"></b></div>
            <button type="button" data-forge-stop>${(0, runtime.deps._t)('멈추기')}</button></div>`;
}

export function outcomeMarkup(runtime, state) {
    const timed = runtime.state.result.timed ? '<em>담금질 성공</em>' : '';
    if (runtime.state.result.status === 'destroyed') return `<strong>${(0, runtime.deps._t)('룬 파괴')}</strong><span>${runtime.state.result.lost ? (0, runtime.deps._t)('남은 룬이 없습니다.') : (0, runtime.deps._t)('여분 룬으로 +0부터 다시 시작합니다. 남은 여분 {spares}개', { spares: state.spares })}</span>`;
    if (runtime.state.result.status === 'failure') return `<strong>${(0, runtime.deps._t)('강화 실패')}</strong><span>${(0, runtime.deps._t)('다음 성공률')} <b>${percentText(runtime, state.chance)}%</b>${timed}</span>`;
    const milestone = runtime.state.FORGE.runeLevelAt.includes(state.level) ? `<span class="gem-forge-level-bonus">${(0, runtime.deps._t)('+{level} 달성, 룬 레벨 +1', { level: state.level })}</span>` : '';
    return `<strong>${(0, runtime.deps._t)('강화 성공')}</strong>${milestone}<span>${runtime.deps.gemCoreForge.effectText(state.level)}${timed}</span>`;
}

export function resultMarkup(runtime, state) {
    if (runtime.state.timing) return timingMarkup(runtime);
    if (runtime.state.busy) return '<strong>강화 중</strong>';
    if (runtime.state.result?.status === 'blocked') return `<strong>${(0, runtime.deps.escapeHTML)(runtime.state.result.error)}</strong>`;
    if (runtime.state.result) return outcomeMarkup(runtime, state);
    if (state.done) return '<strong>최대 강화 달성</strong>';
    return `<span>${state.nextPityGain ? (0, runtime.deps._t)('실패 시 성공률 +{nextPityGain}%p', { nextPityGain: percentText(runtime, state.nextPityGain) }) : (0, runtime.deps._t)('성공 확정')}</span>`;
}

/** 성공, 유지, 파괴의 몫. 올려 주는 값은 그 아래 작게 적는다. */
export function oddsMarkup(runtime, state) {
    if (state.done) return '';
    const keep = Math.max(0, 100 - state.chance - state.destroy);
    const rows = [['success', '성공', state.chance], ['keep', '유지', keep], ['destroy', '파괴', state.destroy]].filter(([, , value]) => value > 0);
    const bonus = [state.pityBonus ? (0, runtime.deps._t)('실패 보정 +{pityBonus}%p', { pityBonus: percentText(runtime, state.pityBonus) }) : '', state.coreBonus ? (0, runtime.deps._t)('군주의 핵 +{coreBonus}%p', { coreBonus: percentText(runtime, state.coreBonus) }) : ''].filter(Boolean).join(', ');
    return `<div class="gem-forge-odds">${rows.map(([key, label, value]) => `<span class="is-${key}">${label} <b>${percentText(runtime, value)}%</b></span>`).join('')}</div>
            <div class="gem-forge-odds-bar" aria-hidden="true">${rows.map(([key, , value]) => `<i class="is-${key}" style="width:${value}%"></i>`).join('')}</div>
            ${bonus ? `<small class="gem-forge-odds-bonus">${bonus}</small>` : ''}`;
}

export function boosterMarkup(runtime, state) {
    if (state.done) return '';
    const locked = runtime.state.busy || !!runtime.state.timing, top = Math.min(runtime.state.FORGE.boosterMax, state.coresOwned);
    return `<div class="gem-forge-booster"><span><strong>${(0, runtime.deps._t)('군주의 핵')}</strong><small>${(0, runtime.deps._t)('보유 {coresOwned}', { coresOwned: state.coresOwned.toLocaleString() })}</small></span>
            <div class="gem-forge-stepper"><button type="button" data-forge-cores="-1" aria-label="${(0, runtime.deps._t)('군주의 핵 하나 덜 쓰기')}" ${locked || state.coresUsed <= 0 ? 'disabled' : ''}>-</button><output>${state.coresUsed}</output>
            <button type="button" data-forge-cores="1" aria-label="${(0, runtime.deps._t)('군주의 핵 하나 더 쓰기')}" ${locked || state.coresUsed >= top ? 'disabled' : ''}>+</button>
            <button type="button" data-forge-cores="${runtime.state.FORGE.boosterMax}" ${locked || state.coresUsed >= top ? 'disabled' : ''}>${(0, runtime.deps._t)('최대')}</button></div></div>`;
}

export function footer(runtime, state) {
    const spareClass = state.destroy > 0 && !state.spares ? ' class="is-none"' : '';
    const label = runtime.state.busy ? '강화 중' : state.error || '강화';
    return `<footer class="gem-forge-footer"><div><span>${(0, runtime.deps._t)('창공의 정수')}</span><strong>${state.done ? (0, runtime.deps._t)('추가 소모 없음') : (0, runtime.deps._t)('{cost}개 소모', { cost: state.cost })}</strong><small>${(0, runtime.deps._t)('보유 {owned}개,', { owned: state.owned.toLocaleString() })} <span${spareClass}>${(0, runtime.deps._t)('여분 룬 {spares}개', { spares: state.spares })}</span></small></div>
            <button type="button" data-forge-attempt ${state.error || runtime.state.busy || runtime.state.timing ? 'disabled' : ''}>${label}</button></footer>
            <label class="gem-forge-skip"><input type="checkbox" data-forge-skip ${runtime.deps.game.settings.runeTimingOff ? 'checked' : ''}>${(0, runtime.deps._t)('담금질 건너뛰기')}</label>`;
}

/** 터지는 조각: 성공은 단계가 높을수록 많고 멀리, 파괴는 룬이 조각나 흩어진다. 그린 뒤 한 번만 돈다. */
export function burstMarkup(runtime, state) {
    if (runtime.state.busy || !runtime.state.result) return '';
    const broke = runtime.state.result.status === 'destroyed';
    if (!broke && runtime.state.result.status !== 'success') return '';
    const count = broke ? 18 + runtime.state.result.level : 8 + state.level * 2;
    const reach = broke ? 120 : 60 + state.level * 6, big = broke ? 5 : 3 + Math.floor(state.level / 5);
    const pieces = Array.from({ length: count }, (_, index) => {
        const angle = Math.round(index * 360 / count + Math.random() * 18);
        const far = Math.round(reach * (0.6 + Math.random() * 0.5)), size = big + Math.floor(Math.random() * 4);
        return `<i style="--angle:${angle}deg;--reach:${far}px;--size:${size}px;--delay:${Math.floor(Math.random() * 110)}ms"></i>`;
    }).join('');
    return `<div class="gem-forge-fx" aria-hidden="true">${pieces}</div>`;
}

export function contents(runtime, state) {
    const nextLevel = Math.min(runtime.state.FORGE.maxLevel, state.level + 1);
    return `<div class="gem-forge-flash" aria-hidden="true"></div>
            <header class="gem-forge-header"><div><small>${(0, runtime.deps._t)('룬 강화')}</small><h2 id="gem-forge-title">${(0, runtime.deps.escapeHTML)(runtime.state.target)}</h2></div><button type="button" data-forge-close aria-label="${(0, runtime.deps._t)('룬 강화 닫기')}" ${runtime.state.busy ? 'disabled' : ''}>${(0, runtime.deps._t)('닫기')}</button></header>
            <div class="gem-forge-stage"><div class="gem-forge-halo"></div>${burstMarkup(runtime, state)}${(0, runtime.deps.renderSkillGemArt)(runtime.state.target, 'gem-forge-art', { eager: true, plain: true })}<b class="gem-forge-level">+${state.level}</b>${steps(runtime, state.level)}</div>
            <div class="gem-forge-effects"><div><small>${(0, runtime.deps._t)('현재')}</small><strong>${runtime.deps.gemCoreForge.effectText(state.level)}</strong></div><div><small>${state.done ? (0, runtime.deps._t)('최대 강화') : (0, runtime.deps._t)('다음 +{nextLevel}', { nextLevel })}</small><strong>${runtime.deps.gemCoreForge.effectText(nextLevel)}</strong></div></div>
            <div class="gem-forge-result" role="status" aria-live="polite">${resultMarkup(runtime, state)}</div>
            ${oddsMarkup(runtime, state)}${boosterMarkup(runtime, state)}${footer(runtime, state)}`;
}

export function renderOverlay(runtime) {
    // The attempt is committed and saved immediately, but its pre-roll snapshot
    // stays visible until the charge finishes so neither outcome is revealed early.
    const state = shownState(runtime, runtime.state.target, { cores: runtime.state.cores });
    const status = runtime.state.timing ? 'timing' : runtime.state.busy ? 'charging' : runtime.state.result?.status || '';
    runtime.state.dialog.className = `gem-forge-dialog forge-tier-${runtime.deps.gemCoreForge.tierOf(state.level)} ${status} ${state.done ? 'mastered' : ''}`;
    runtime.state.dialog.style.setProperty('--forge-heat', String(state.level / runtime.state.FORGE.maxLevel));
    runtime.state.dialog.style.setProperty('--forge-reveal', `${revealMs(runtime, state.level)}ms`);
    runtime.state.dialog.innerHTML = contents(runtime, state);
}

export function percentText(runtime, value) { return (0, runtime.deps.formatValue)('', value); }

export function lerp(runtime, [from, to], t) { return from + (to - from) * t; }

export function shownState(runtime, name, options) { return (runtime.state.busy && name === runtime.state.target && runtime.state.result) || runtime.deps.gemCoreForge.inspect(name, options); }

export function revealMs(runtime, level) { return runtime.state.REVEAL_MS[runtime.deps.gemCoreForge.tierOf(level + 1)]; }
