import { releaseViewEvents, releaseViewTarget } from './view-events.mjs';

/** A HUD belongs to the current save; timers and DOM handles never cross that boundary. */
export function syncCombatHudOwner(runtime) {
    if (!runtime.active) return false;
    if (runtime.owner !== runtime.deps.game) {
        clearCombatHudWork(runtime);
        runtime.owner = runtime.deps.game;
    }
    return true;
}

export function releaseCombatHudSkills(runtime) {
    for (const target of new Set(runtime.listeners.map(binding => binding.target))) {
        if (runtime.deps.activeInfoTooltipToken === target) runtime.deps.hideInfoTooltip();
        releaseViewTarget(runtime, target);
    }
    if (runtime.skillHost) delete runtime.skillHost.dataset.signature;
    runtime.skillHost = null;
}

export function releaseCombatHudTrait(runtime) {
    const element = runtime.trait;
    if (!element) return;
    if (element.__traitRotationTimer != null) runtime.deps.clearInterval(element.__traitRotationTimer);
    if (runtime.traitFrame !== null) runtime.deps.cancelAnimationFrame(runtime.traitFrame);
    element.__traitRotationTimer = null;
    element.__traitSignature = '';
    element.__traitOverflowPending = false;
    element.__traitOverflowGeneration = Math.max(0, Math.floor(element.__traitOverflowGeneration || 0)) + 1;
    element.classList.remove('is-overflowing', 'is-rotating');
    runtime.trait = null;
    runtime.traitFrame = null;
}

export function ownCombatHudTrait(runtime, element) {
    if (runtime.trait === element) return;
    releaseCombatHudTrait(runtime);
    runtime.trait = element;
}

function clearCombatHudWork(runtime) {
    releaseCombatHudTrait(runtime);
    releaseCombatHudSkills(runtime);
    runtime.handlers.hideEnemyTraitTooltip();
    if (runtime.levelAnimation) runtime.levelAnimation.cancel();
    runtime.levelAnimation = null;
    Object.assign(runtime.state, { playerHpDamageGhostPct: null, playerHpDamageGhostLastPct: null,
        playerHpDamageGhostLastAt: 0, playerHpDamageGhostHoldUntil: 0, hudShownLevel: 0 });
    runtime.state.enemyHpDamageGhostStates.clear();
    runtime.state.combatSkillCooldownSpans.clear();
}

export function disposeCombatHud(runtime) {
    if (!runtime.active) return;
    clearCombatHudWork(runtime);
    releaseViewEvents(runtime);
}
