import { renderCombatEffectIcon } from './combat-hud-effect-icons.mjs';
import { buildPlayerAilmentEffectIcons, buildPlayerConditionEffectIcons, buildPlayerUniqueEffectIcons, buildPlayerRecoveryEffectIcons } from './combat-hud-player-effects.mjs';
import { buildPlayerAscendStackEffectIcons, buildPlayerAscendReadyEffectIcons, buildPlayerTalentAndSummonEffectIcons } from './combat-hud-ascend-effects.mjs';

export function buildPlayerRealmEffectIcons(runtime, pStats, now) {
    let icons = [];
    appendRealmDeathWardIcon(runtime, pStats, icons);
    if ((runtime.deps.game.realmInvulnerableBarrierUntil || 0) > now) {
        let remain = Math.ceil((runtime.deps.game.realmInvulnerableBarrierUntil - now) / 1000);
        icons.push(renderCombatEffectIcon(runtime, { key: 'invulnerableBarrier', tooltip: `showPlayerRuntimeEffectTooltip(event,'invulnerableBarrier',0,0,${remain})`, remainingSec: remain, durationSec: 1.5 }));
    }
    if (typeof runtime.deps.hasKeystone === 'function' && (0, runtime.deps.hasKeystone)('w5')) {
        let stacks = typeof runtime.deps.getWarriorRageStacks === 'function' ? (0, runtime.deps.getWarriorRageStacks)(now) : 0;
        if (stacks > 0) {
            let remain = Math.ceil(Math.max(0, (runtime.deps.game.warriorRageExpiresAt - now) / 1000));
            icons.push(renderCombatEffectIcon(runtime, { key: 'warriorRage', tooltip: `showPlayerRuntimeEffectTooltip(event,'warriorRage',${stacks},5,${remain})`, badge: `${stacks}`, remainingSec: remain, durationSec: 5 }));
        }
    }
    return icons.join('');
}

export function buildPlayerCombatEffectIcons(runtime, pStats, now) {
    return buildPlayerAilmentEffectIcons(runtime)
        + buildPlayerConditionEffectIcons(runtime, now)
        + buildPlayerUniqueEffectIcons(runtime, pStats, now)
        + buildPlayerRecoveryEffectIcons(runtime, pStats)
        + buildPlayerAscendStackEffectIcons(runtime, now)
        + buildPlayerAscendReadyEffectIcons(runtime, now)
        + buildPlayerTalentAndSummonEffectIcons(runtime, now)
        + buildPlayerRealmEffectIcons(runtime, pStats, now);
}


function appendRealmDeathWardIcon(runtime, pStats, icons) {
    if (pStats.uniqueDeathWard && runtime.deps.game.realmDeathWard && Number(runtime.deps.game.realmDeathWard.amount) > 0) {
        let amount = Math.max(0, Math.floor(Number(runtime.deps.game.realmDeathWard.amount) || 0));
        let maximum = Math.max(amount, Math.floor(Number(runtime.deps.game.realmDeathWard.maxAmount) || 0));
        icons.push(renderCombatEffectIcon(runtime, { key: 'deathWard', tooltip: `showPlayerRuntimeEffectTooltip(event,'deathWard',${amount},${maximum},0)` }));
    }
}
