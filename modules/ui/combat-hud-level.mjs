import { setTextById } from './combat-hud-values.mjs';

/** 모바일 HUD는 보호막이 없으면 생명력 아래 보호막 줄 자리를 접는다(css/components/bars.css). */
export function markPlayerEnergyShieldRow(runtime, hpTrack, hasEnergyShield) {
    let frame = hpTrack && hpTrack.closest && hpTrack.closest('.player-health-frame');
    if (frame) frame.toggleAttribute('data-energy-shield', hasEnergyShield);
}

/** 경험치 구슬의 레벨 글자. 레벨이 오르면 구슬 위에 "레벨 업 · Lv N"을 잠깐 띄운다 — 기록 한 줄 · 0.5초 이펙트 · 메뉴 점만으로는
* 놓치기 쉬웠다(검토 2026-10-01). 처음 그릴 때와 방치 정산 중에는 띄우지 않는다. */
export function showHudLevel(runtime, level) {
    setTextById(runtime, 'ui-exp-level-label', `Lv.${level}`);
    const previous = runtime.state.hudShownLevel;
    runtime.state.hudShownLevel = level;
    if (!previous || level <= previous || runtime.deps.game.isBackgroundCalculation) return;
    playLevelUpCallout(runtime, level);
}

export function playLevelUpCallout(runtime, level) {
    const orb = runtime.deps.document.querySelector('#battle-column .combat-exp-bar');
    if (!orb || typeof orb.animate !== 'function') return;
    let label = orb.querySelector('.level-up-callout');
    if (!label) {
        label = runtime.deps.document.createElement('span');
        label.className = 'level-up-callout';
        label.setAttribute('aria-hidden', 'true');
        orb.appendChild(label);
    }
    label.textContent = (0, runtime.deps._t)('레벨 업 Lv {level}', { level });
    if (runtime.levelAnimation) runtime.levelAnimation.cancel();
    label.getAnimations().forEach(animation => animation.cancel());
    runtime.levelAnimation = label.animate([
        { opacity: 0, translate: '0 6px' },
        { opacity: 1, translate: '0 0', offset: 0.1 },
        { opacity: 1, translate: '0 0', offset: 0.8 },
        { opacity: 0, translate: '0 -6px' }
        ], { duration: 2000, easing: 'steps(20, end)', fill: 'forwards' });
}
