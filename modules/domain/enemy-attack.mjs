import { prepareEnemyTurn } from './enemy-attack-prepare.mjs';
import { prepareEnemyHit } from './enemy-attack-strike.mjs';
import { calculateEnemyHit } from './enemy-attack-damage.mjs';
import { avoidEnemyHit } from './enemy-attack-avoidance.mjs';
import { redirectEnemyHit } from './enemy-attack-redirect.mjs';
import { commitEnemyHit } from './enemy-attack-resources.mjs';
import { applyHitAilment, recoverBeforeHit, showReceivedHit } from './enemy-attack-effects.mjs';

/** c/e/h are private tick/enemy/contact scratch, never saved. stop aborts the tick; break ends one enemy's strikes. */
function resolveMonsterAttacks(owner, pStats, deps) {
    const c = {owner, pStats, deps};
    c.zone = c.deps.getZone(c.owner.currentZoneId);
    c.abyssScale = c.deps.getAbyssMonsterScales(c.zone);
    c.deps.engagement.prepareMonsterAttackShield(c.owner, c.pStats);
    c.aliveCount = (c.owner.enemies || []).filter(enemy => enemy.hp > 0).length;
    c.crowdPenalty = Math.max(0.34, 1 - Math.max(0, c.aliveCount - 1) * 0.055);
    c.attackSources = c.deps.flights.sources(c.owner);
    for (const enemy of c.attackSources) {
        const e = {enemy}, prepared = prepareEnemyTurn(c, e);
        if (prepared === 'stop') return;
        if (prepared) continue;
        while (e.pendingAttack || (e.enemy.hp > 0 && e.enemy.attackTimer >= 1)) {
            const result = resolveEnemyContact(c, e, {});
            if (result === 'stop') return;
            if (result === 'break') break;
        }
    }
}

function resolveEnemyContact(c, e, h) {
    const released = prepareEnemyHit(c, e, h);if (released) return released;
    calculateEnemyHit(c, e, h);
    const avoided = avoidEnemyHit(c, e, h);if (avoided) return avoided;
    applyHitAilment(c, e, h);
    recoverBeforeHit(c, e, h);
    redirectEnemyHit(c, e, h);
    commitEnemyHit(c, e, h);
    return showReceivedHit(c, e, h);
}

export function createMonsterAttackResolver(deps) {return Object.freeze({resolve:(owner, stats)=>resolveMonsterAttacks(owner, stats, deps)});}
