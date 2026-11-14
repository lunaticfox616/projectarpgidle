import { preparePlayerCast } from './player-attack-preparation.mjs';
import { selectPlayerContact } from './player-attack-target.mjs';
import { rollPlayerContact } from './player-attack-damage-base.mjs';
import { mitigatePlayerContact } from './player-attack-mitigation.mjs';
import { applyPlayerContact } from './player-attack-on-hit.mjs';
import { finishPlayerContact } from './player-attack-hit-effects.mjs';
import { showAttackFeedback, applyPierceOverkillCarry } from './player-attack-carry.mjs';
import { finishAttackRecovery } from './player-attack-finish.mjs';

/** One synchronous attack. c is private cast scratch; h is private per-contact scratch.
 * Neither is serialized. false aborts only that cast/contact. Stage order preserves RNG and damage rounding. */
function resolvePlayerAttack(owner, pStats, attackOptions, deps) {
    const c = { owner, pStats, attackOptions, deps };
    if (preparePlayerCast(c) === false) return;
    c.showAttackFeedback = (enemy, cue) => showAttackFeedback(c, enemy, cue);
    c.applyPierceOverkillCarry = (sourceEnemy, carryDamage, hitElement, hitCrit, ailmentCarrySourceDamage) =>
        applyPierceOverkillCarry(c, { sourceEnemy, carryDamage, hitElement, hitCrit, ailmentCarrySourceDamage });
    c.randomTargetCapFallbackUsed = false;
    for (let hitIdx = 0; hitIdx < c.repeats; hitIdx++) {
        const hitEntries = c.pStats.sSkill.randomTargetEachHit ? [{ mult: 1 }] : c.targets;
        hitEntries.forEach((hit, targetIndex) => {
            const h = { hitIdx, hitEntries, hit, targetIndex };
            resolvePlayerContact(c, h);
        });
    }
    finishAttackRecovery(c);
    return { pStats: c.pStats, options: c.options, hitLog: c.hitLog, talentMoonPrimaryHit: c.talentMoonPrimaryHit };
}

export function createPlayerAttackResolver(deps) {
    return Object.freeze({ resolve: (owner, stats, options) => resolvePlayerAttack(owner, stats, options, deps) });
}

function resolvePlayerContact(c, h) {
    if (selectPlayerContact(c, h) === false) return;
    rollPlayerContact(c, h);
    if (mitigatePlayerContact(c, h) === false) return;
    applyPlayerContact(c, h);
    finishPlayerContact(c, h);
}
