import { setElementAttribute } from './combat-hud-values.mjs';
import { ownCombatHudTrait, releaseCombatHudTrait } from './combat-hud-lifetime.mjs';

export function getUiEnemyTraitLabels(runtime, tags) {
    return (Array.isArray(tags) ? tags : []).filter(tag => {
        let label = String(tag || '').trim();
        return label && label !== '보스' && label !== '정예';
    });
}

export function getUiEnemyTraitDisplayText(runtime, tags) {
    let labels = getUiEnemyTraitLabels(runtime, tags);
    let fullText = labels.join(', ');
    let compactLabels = labels.map(label => String(label)
            .replace(/^패턴:\s*/, '')
            .replace(/^다음:\s*/, '다음 ')
            .split(/\s+[—–]\s+/)[0]
            .replace(/\s+전개$/, ''));
    let compactText = compactLabels.join(', ');
    if (compactText.length > 25) {
        compactText = compactLabels.map(label => label.length > 7 ? `${label.slice(0, 6)}…` : label).join(', ');
    }
    return { fullText, compactText };
}

export function clearUiEnemyTraitRotation(runtime, traitEl) {
    if (!traitEl || traitEl.__traitRotationTimer == null) return;
    (0, runtime.deps.clearInterval)(traitEl.__traitRotationTimer);
    traitEl.__traitRotationTimer = null;
}

/** Trait text with its keywords and numbers in the item tone colours (2026-10-06: the line was one colour). One wrapping span:
* the ticker track is a flex box, and spaces between coloured pieces would be dropped as separate flex items. */
export function setUiEnemyTraitText(runtime, target, text) {
    target.innerHTML = `<span class="enemy-trait-text">${runtime.deps.statToneText.html(text)}</span>`;
}

export function scheduleUiEnemyTraitOverflow(runtime, traitEl, track, content, signature) {
    if (runtime.traitFrame !== null) runtime.deps.cancelAnimationFrame(runtime.traitFrame);
    runtime.traitFrame = null;
    setUiEnemyTraitText(runtime, track, content);
    traitEl.__traitOverflowPending = true;
    if (typeof runtime.deps.document !== 'undefined' && runtime.deps.document.hidden) return;
    let generation = Math.max(0, Math.floor(traitEl.__traitOverflowGeneration || 0)) + 1;
    traitEl.__traitOverflowGeneration = generation;
    const owner = runtime.owner;
    let measure = () => {
        runtime.traitFrame = null;
        if (!runtime.active || runtime.deps.game !== owner) return;
        if (!traitEl.isConnected || traitEl.__traitOverflowGeneration !== generation || traitEl.__traitSignature !== signature) return;
        if (typeof runtime.deps.document !== 'undefined' && runtime.deps.document.hidden) return;
        setUiEnemyTraitText(runtime, track, content);
        let panelWidth = Math.max(0, traitEl.clientWidth);
        let singleWidth = Math.max(0, track.scrollWidth);
        let overflowing = singleWidth > panelWidth + 4;
        traitEl.classList.toggle('is-overflowing', overflowing);
        if (overflowing) {
            let loopText = runtime.deps.statToneText.html(`${content}　　　`);
            track.innerHTML = `<span class="enemy-trait-marquee-copy">${loopText}</span><span class="enemy-trait-marquee-copy" aria-hidden="true">${loopText}</span>`;
            let loopDistance = Math.max(singleWidth, track.scrollWidth / 2);
            track.style.setProperty('--trait-duration', `${Math.max(8, Math.min(20, loopDistance / 20)).toFixed(2)}s`);
        }
        traitEl.__traitOverflowPending = false;
    };
    if (typeof runtime.deps.requestAnimationFrame === 'function') runtime.traitFrame = (0, runtime.deps.requestAnimationFrame)(measure);
    else measure();
}

export function updateUiEnemyTraitMarqueeCopies(runtime, traitEl, track, content) {
    if (!traitEl.classList.contains('is-overflowing')) return false;
    let copies = track.querySelectorAll('.enemy-trait-marquee-copy');
    if (copies.length !== 2) return false;
    let loopText = `${content}　　　`;
    copies.forEach(copy => {
        if (copy.textContent !== loopText) setUiEnemyTraitText(runtime, copy, loopText);
    });
    return true;
}

export function createUpdateUiEnemyTraitPanel(runtime) {
    return function updateUiEnemyTraitPanel(traitEl, labels, display, fullTooltip, isBoss) {
        if (!traitEl) return;
        const track = traitEl.querySelector('.enemy-trait-marquee');
        if (!track) return;
        ownCombatHudTrait(runtime, traitEl);
        const visible = Array.isArray(labels) && labels.length > 0;
        traitEl.style.display = visible ? '' : 'none';
        setTraitAccessibility(runtime, traitEl, fullTooltip || display.fullText || '', isBoss);
        if (!visible) {
            releaseCombatHudTrait(runtime);
            track.textContent = '';
            return;
        }
        const mode = traitDisplayMode(runtime, labels, isBoss);
        if (traitEl.__traitSignature === mode.signature) {
            resumeTraitMeasurement(runtime, traitEl, track, display.fullText, mode);
            return;
        }
        traitEl.__traitSignature = mode.signature;
        paintTraitPresentation(runtime, traitEl, track, { labels, display, isBoss, ...mode });
    };
}

function setTraitAccessibility(runtime, traitEl, detail, isBoss) {
    setElementAttribute(runtime, traitEl, 'data-enemy-trait-tooltip', detail);
    setElementAttribute(runtime, traitEl, 'data-enemy-trait-kind', isBoss ? '보스 특성' : '정예 특성');
    setElementAttribute(runtime, traitEl, 'aria-label', detail);
    setElementAttribute(runtime, traitEl, 'tabindex', '0');
}

function traitDisplayMode(runtime, labels, isBoss) {
    const mobile = isBoss && typeof runtime.deps.matchMedia === 'function' && runtime.deps.uiDisplay.matches('(max-width: 1080px)');
    const reducedMotion = typeof runtime.deps.matchMedia === 'function' && (0, runtime.deps.matchMedia)('(prefers-reduced-motion: reduce)').matches;
    const signature = `${isBoss ? 'boss' : 'elite'}|${mobile}|${reducedMotion}|${labels.join('\u001f')}`;
    return { mobile, reducedMotion, signature, measure: isBoss && (!mobile || reducedMotion || labels.length === 1) };
}

function resumeTraitMeasurement(runtime, traitEl, track, content, mode) {
    if (!traitEl.__traitOverflowPending || !mode.measure || runtime.traitFrame !== null) return;
    if (typeof runtime.deps.document !== 'undefined' && runtime.deps.document.hidden) return;
    scheduleUiEnemyTraitOverflow(runtime, traitEl, track, content, mode.signature);
}

function paintTraitPresentation(runtime, traitEl, track, mode) {
    if (mode.isBoss && !mode.mobile && !mode.reducedMotion
            && updateUiEnemyTraitMarqueeCopies(runtime, traitEl, track, mode.display.fullText)) return;
    clearUiEnemyTraitRotation(runtime, traitEl);
    traitEl.classList.remove('is-overflowing', 'is-rotating');
    if (!mode.isBoss) setUiEnemyTraitText(runtime, track, mode.display.compactText);
    else if (mode.measure) scheduleUiEnemyTraitOverflow(runtime, traitEl, track, mode.display.fullText, mode.signature);
    else rotateTraitLabels(runtime, traitEl, track, mode.labels);
}

function rotateTraitLabels(runtime, traitEl, track, labels) {
    let index = 0;
    const owner = runtime.owner;
    traitEl.classList.add('is-rotating');
    setUiEnemyTraitText(runtime, track, labels[index]);
    traitEl.__traitRotationTimer = (0, runtime.deps.setInterval)(() => {
        if (!runtime.active || runtime.deps.game !== owner) return clearUiEnemyTraitRotation(runtime, traitEl);
        if (!traitEl.isConnected) return clearUiEnemyTraitRotation(runtime, traitEl);
        if (traitEl.matches(':hover') || (typeof runtime.deps.document !== 'undefined' && runtime.deps.document.activeElement === traitEl)) return;
        index = (index + 1) % labels.length;
        setUiEnemyTraitText(runtime, track, labels[index]);
        }, 2600);
}

/** Use the existing information line for the special currently preparing/releasing; ordinary attacks retain traits. */
export function updateFocusedEnemyTraitPanel(runtime, traitEl, enemy, tags) {
    const isBoss = !!(enemy.isBoss || enemy.bossPhase);
    const pending = runtime.deps.window.GameModules.state.combat.pendingEnemyCombatAttacks.find(attack => attack.enemyId === enemy.id);
    const cast = isBoss ? runtime.deps.enemyAttackRules.castBar(enemy, (0, runtime.deps.getCombatTime)(), pending) : null;
    const traits = getUiEnemyTraitLabels(runtime, tags);
    const labels = cast?.label ? [cast.label] : traits;
    const display = getUiEnemyTraitDisplayText(runtime, labels);
    const pattern = enemy.noAttack ? '' : (0, runtime.deps.getBossPatternDescription)(enemy.patternMode);
    const tooltip = [cast?.label, traits.join(', '), pattern].filter(Boolean).join('\n');
    traitEl.classList.toggle('is-casting', !!cast?.label);
    runtime.handlers.updateUiEnemyTraitPanel(traitEl, labels, display, tooltip, isBoss);
    if (cast?.label) setElementAttribute(runtime, traitEl, 'data-enemy-trait-kind', '보스 행동');
    traitEl.closest('.enemy-card').classList.toggle('has-trait-line', labels.length > 0);
}
