import { buildPlayerCombatEffectIcons } from './combat-hud-realm-effects.mjs';

/** An effect icon strip's new markup. Its timer rings turn every tick (--effect-remaining-angle), and rebuilding the strip for that
* removed and re-added its elements ten times a second, so the page re-checked every body:has() rule each time (2026-10-07 frame
* drops: the costliest style passes of the endgame). While the icons keep their shape, only the changed attributes and texts move. */
export function patchCombatEffectStrip(runtime, host, markup) {
    if (!host || host.__lastHtml === markup) return;
    host.__lastHtml = markup;
    const parsed = runtime.deps.document.createElement('template');
    parsed.innerHTML = markup;
    if (!parsed.content || !host.children) { host.innerHTML = markup; return; } // no template parsing here (script tests' stand-in DOM)
    const fresh = [...parsed.content.children], live = [...host.children];
    if (fresh.length === live.length && fresh.every((node, index) => sameEffectShape(runtime, node, live[index]))) {
        fresh.forEach((node, index) => syncEffectNode(runtime, live[index], node));
    } else host.innerHTML = markup;
}

/** Same tags and classes all the way down (a new icon, a timer appearing, or a badge coming means a rebuild). */
export function sameEffectShape(runtime, fresh, live) {
    const pairs = [[fresh, live]];
    while (pairs.length) {
        const [a, b] = pairs.pop();
        if (a.tagName !== b.tagName || a.className !== b.className || a.children.length !== b.children.length) return false;
        for (let index = 0; index < a.children.length; index++) pairs.push([a.children[index], b.children[index]]);
    }
    return true;
}

export function syncEffectNode(runtime, live, fresh) {
    const pairs = [[live, fresh]];
    while (pairs.length) {
        const [to, from] = pairs.pop();
        for (const { name, value } of from.attributes) if (to.getAttribute(name) !== value) to.setAttribute(name, value);
        if (from.children.length) for (let index = 0; index < from.children.length; index++) pairs.push([to.children[index], from.children[index]]);
        else if (to.textContent !== from.textContent) to.textContent = from.textContent;
    }
}

export function updatePlayerCombatEffectHud(runtime, pStats, hpAilBar) {
    let markup = buildPlayerCombatEffectIcons(runtime, pStats, (0, runtime.deps.getCombatTime)());
    patchCombatEffectStrip(runtime, runtime.deps.document.getElementById('ui-player-ailments-under'), markup);
    let projectedDamage = (runtime.deps.game.playerAilments || []).reduce((sum, ail) => {
        if (!ail || (ail.time || 0) <= 0 || !(0, runtime.deps.isUiDamageAilmentType)(ail.type)) return sum;
        return sum + Math.floor((0, runtime.deps.getUiPlayerDamageAilmentDps)(ail, pStats) * Math.max(0, ail.time || 0));
        }, 0);
    let playerHpPct = Math.max(0, Math.min(100, (runtime.deps.game.playerHp / Math.max(1, pStats.maxHp)) * 100));
    let pendingPct = Math.max(0, Math.min(playerHpPct, projectedDamage / Math.max(1, pStats.maxHp) * 100));
    if (!hpAilBar) return;
    hpAilBar.style.width = `${pendingPct}%`;
    hpAilBar.style.left = 'auto';
    hpAilBar.style.right = `${Math.max(0, 100 - playerHpPct)}%`;
    hpAilBar.style.display = pendingPct > 0.05 ? 'block' : 'none';
}
