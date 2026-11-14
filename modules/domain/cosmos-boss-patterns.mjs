import { COSMOS_GALAXY_BOSS_MECHANICS } from '../data/cosmos-boss-mechanics.mjs';

export function cosmosRuleGetCosmosGalaxyBossMechanic(env, nodeId) {
    return COSMOS_GALAXY_BOSS_MECHANICS[String(nodeId || '')] || null;
}

export function cosmosRuleGetCosmosBossPatternState(env, nodeId, attackNumber) {
    const mechanic = cosmosRuleGetCosmosGalaxyBossMechanic(env, nodeId);
    if (!mechanic) return null;
    const count = Math.max(1, Math.floor(Number(attackNumber) || 1));
    const special = count % mechanic.specialEvery === 0;
    return {
        mode: mechanic.id,
        patternMode: 'cosmosBoss',
        label: special ? mechanic.name : env.deps._t('{name} 전조', { name: mechanic.name }),
        damageMul: special ? mechanic.damageMul : 1,
        isSpecial: special,
        telegraphKind: mechanic.telegraphKind,
        elementRule: mechanic.elementRule,
        ...cosmosSpecialModifiers(mechanic, special),
        attackNumber: count
    };
}

function cosmosSpecialModifiers(mechanic, special) {
    return {
        shieldRestorePct: special ? Number(mechanic.shieldRestorePct || 0) : 0,
        debuffType: special ? mechanic.debuffType || null : null,
        moveCounterPct: special ? Number(mechanic.moveCounterPct || 0) : 0
    };
}
