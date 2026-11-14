import { ELEMENTALIST_OVERLOAD_STACK_MAX, WARRIOR_RAGE_STACK_MAX, WARRIOR_RAGE_STACK_DAMAGE_PCT, WARRIOR_RAGE_DURATION_MS } from '../combat/core-values.mjs';

/** 키스톤 id → 전직. 정의 객체가 바뀌면 다시 만든다(정의는 불러올 때 한 번 정해진다). */
export function coreGetAscendKeystoneOwnerClass(env, id) {
    if (typeof env.deps.CLASS_KEYSTONE_DEFS === 'undefined' || !env.deps.CLASS_KEYSTONE_DEFS || !id) return null;
    if (!env.memo.ascendKeystoneOwnerIndex || env.memo.ascendKeystoneOwnerIndex.source !== env.deps.CLASS_KEYSTONE_DEFS) env.memo.ascendKeystoneOwnerIndex = coreBuildAscendKeystoneOwnerIndex(env.deps.CLASS_KEYSTONE_DEFS);
    return env.memo.ascendKeystoneOwnerIndex.byId.get(id) || null;
}

export function coreBuildAscendKeystoneOwnerIndex(defs) {
    const byId = new Map();
    Object.keys(defs).forEach(classKey => (defs[classKey] || []).forEach(node => { if (node && node.id && !byId.has(node.id)) byId.set(node.id, classKey); }));
    return { source: defs, byId };
}

/** 고른 키스톤은 그 전직일 때만, 우주계 쌍둥이 키스톤은 전직과 상관없이 켜진다. */
export function coreHasKeystone(env, id, owner = env.owner) {
    if (Array.isArray(owner.cosmosTwinKeystones) && owner.cosmosTwinKeystones.includes(id)) return true;
    if (!Array.isArray(owner.ascendKeystones) || !owner.ascendKeystones.includes(id)) return false;
    return coreGetAscendKeystoneOwnerClass(env, id) === owner.ascendClass;
}

export function coreGetElementalistOverloadStacks(env) {
    return Math.max(0, Math.min(ELEMENTALIST_OVERLOAD_STACK_MAX,
        Math.floor(env.owner.elementalistOverloadStacks || 0)));
}

export function coreRecordElementalistOverloadAttack(env, isCrit) {
    if (!coreHasKeystone(env, 'e8')) return coreGetElementalistOverloadStacks(env);
    env.owner.elementalistOverloadStacks = isCrit
        ? Math.min(ELEMENTALIST_OVERLOAD_STACK_MAX, coreGetElementalistOverloadStacks(env) + 1)
        : 0;
    env.owner.elementalistOverloadExpiresAt = 0;
    return env.owner.elementalistOverloadStacks;
}

export function coreGetWarriorRageStacks(env, now) {
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : env.deps.getCombatTime();
    if ((env.owner.warriorRageExpiresAt || 0) <= timestamp) return 0;
    return Math.max(0, Math.min(WARRIOR_RAGE_STACK_MAX, Math.floor(env.owner.warriorRageStacks || 0)));
}

export function coreGetWarriorRagePhysicalDamageMultiplier(env, now) {
    return 1 + coreGetWarriorRageStacks(env, now) * WARRIOR_RAGE_STACK_DAMAGE_PCT / 100;
}

export function coreGrantWarriorRageOnHit(env, now) {
    if (!coreHasKeystone(env, 'w5')) return 0;
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : env.deps.getCombatTime();
    env.owner.warriorRageStacks = Math.min(WARRIOR_RAGE_STACK_MAX, coreGetWarriorRageStacks(env, timestamp) + 1);
    env.owner.warriorRageExpiresAt = timestamp + WARRIOR_RAGE_DURATION_MS;
    return env.owner.warriorRageStacks;
}

// In the original reset order. Object-valued marks are allocated separately for each reset.
const CORE_KEYSTONE_RESETS = [
    ['w2', ['warriorRhythmStacks', 'warriorRhythmExpiresAt', 'warriorRhythmDoubleStacks', 'warriorRhythmDoubleExpiresAt'], 0],
    ['w5', ['warriorRageStacks', 'warriorRageExpiresAt'], 0],
    ['g2', ['gladiatorFlurryStacks', 'gladiatorFlurryExpiresAt'], 0],
    ['g3', ['gladiatorVeteranCritBonus'], 0],
    ['g5', ['gladiatorSwiftOpeningReady', 'gladiatorSwiftGuardReady'], false],
    ['a2', ['assassinBlurred'], false], ['r5', ['rangerWeakpointMarks'], 'object'],
    ['e8', ['elementalistOverloadStacks', 'elementalistOverloadExpiresAt'], 0],
    ['ct4', ['catalystEvadeBoostReady'], false], ['ct8', ['catalystBurstReadyAt'], 0],
    ['cr8', ['crusaderEsRegenUntil', 'crusaderLightningAegisUntil', 'crusaderEsRegenCooldownUntil'], 0],
    ['gd6', ['guardianEnduranceStacks', 'guardianEnduranceExpiresAt'], 0],
    ['gd7', ['guardianLastStandCleanseAt'], 0], ['wlk9', ['enemyWitherStacks'], 'object']
];

function coreRemoveKeystoneAilment(env, type) {
    (env.owner.enemies || []).forEach(enemy => {
        if (!enemy || !Array.isArray(enemy.ailments)) return;
        enemy.ailments = enemy.ailments.filter(ailment => !ailment || ailment.type !== type);
    });
}

function coreRemoveAssassinDebuffs(env) {
    let debuffs = env.owner.enemyKeystoneDebuffs && typeof env.owner.enemyKeystoneDebuffs === 'object'
        ? env.owner.enemyKeystoneDebuffs : {};
    Object.keys(debuffs).forEach(enemyId => {
        let next = Array.isArray(debuffs[enemyId]) ? debuffs[enemyId].filter(row => !row || row.type !== 'a3') : [];
        if (next.length > 0) debuffs[enemyId] = next;
        else delete debuffs[enemyId];
    });
    env.owner.enemyKeystoneDebuffs = debuffs;
    coreRemoveKeystoneAilment(env, 'assassinWeakness');
}

export function coreClearAscendKeystoneRuntimeState(env, removedIds, options) {
    let opts = options && typeof options === 'object' ? options : {};
    let ids = Array.isArray(removedIds) ? removedIds.filter(Boolean) : [];
    if (ids.length === 0 && !opts.forceAll) return;
    let removed = new Set(ids);
    let shouldClear = id => (opts.forceAll || removed.has(id)) && (opts.force || !coreHasKeystone(env, id));
    CORE_KEYSTONE_RESETS.forEach(([id, fields, value]) => {
        if (shouldClear(id)) fields.forEach(field => { env.owner[field] = value === 'object' ? {} : value; });
    });
    if (shouldClear('a3')) coreRemoveAssassinDebuffs(env);
    if (shouldClear('h2')) coreRemoveKeystoneAilment(env, 'hunterExpose');
}
