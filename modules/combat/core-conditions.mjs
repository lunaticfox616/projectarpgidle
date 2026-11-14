import { WARCRY_PHYSICAL_REDUCTION_CAP_BONUS_PCT, CONDITION_GUARD_PHYSICAL_REDUCTION_CAP_PCT, PLAYER_PHYSICAL_REDUCTION_CAP_PCT } from '../combat/core-values.mjs';

/** Expires talisman curses every combat tick (and in grand breach runs). Rows from the removed condition gems carry no delta and go too. */
export function coreExpireConditionEffects(env, now) {
    let map = env.owner.enemyConditionDebuffs || {};
    Object.keys(map).forEach(id => {
        map[id] = (map[id] || []).filter(deb => deb && deb.delta && (deb.expiresAt || 0) > now);
        if (map[id].length === 0) delete map[id];
    });
    env.owner.enemyConditionDebuffs = map;
}

export function corePruneEnemyRuntimeDebuffMaps(env) {
    let alive = new Set((env.owner.enemies || []).filter(e => e && e.hp > 0).map(e => String(e.id)));
    function pruneMap(obj, maxKeys) {
        let src = (obj && typeof obj === 'object') ? obj : {};
        let keys = Object.keys(src);
        if (keys.length === 0) return {};
        let out = {};
        let kept = 0;
        for (let i = 0; i < keys.length; i++) {
            let k = keys[i];
            if (!alive.has(String(k))) continue;
            out[k] = src[k];
            kept++;
            if (kept >= maxKeys) break;
        }
        return out;
    }
    env.owner.enemyKeystoneDebuffs = pruneMap(env.owner.enemyKeystoneDebuffs, 180);
    env.owner.rangerWeakpointMarks = pruneMap(env.owner.rangerWeakpointMarks, 180);
    env.owner.enemyUniqueChaosResDown = pruneMap(env.owner.enemyUniqueChaosResDown, 180);
    env.owner.enemyUniqueElementalResDown = pruneMap(env.owner.enemyUniqueElementalResDown, 180);
    env.owner.enemyConditionDebuffs = pruneMap(env.owner.enemyConditionDebuffs, 180);
    env.owner.talentButcherMarks = pruneMap(env.owner.talentButcherMarks, 180);
}

/** A curse entry's stat delta (talisman curses carry it). */
export function coreGetConditionDebuffDelta(deb) {
    return deb.delta || {};
}

export function coreGetEnemyConditionDebuffFactor(env, enemy, pStats) {
    let list = (env.owner.enemyConditionDebuffs && enemy) ? (env.owner.enemyConditionDebuffs[enemy.id] || []) : [];
    let fx = { mul: 1, resShred: 0, resFShred: 0, resCShred: 0, resLShred: 0, resChaosShred: 0, physDrShred: 0, projectileTakenMul: 1, lightTakenMul: 1, chaosTakenMul: 1, enemyDmgMul: 1, enemyRegenRateMul: 1, projectileExtraHits: 0, critDmgTakenMul: 1, ailmentChanceAdd: {}, ailmentTakenMul: {} };
    list.forEach(deb => {
        let d = coreGetConditionDebuffDelta(deb);
        coreApplyCurseResistanceDelta(fx, d);
        coreApplyCurseHitDelta(fx, d);
        coreApplyCurseAilmentChance(fx, d);
        coreApplyCurseAilmentDamage(fx, d);
    });
    if (pStats && pStats.uniqueCursedTakenAndRefresh && list.length > 0) fx.mul *= Math.max(1, Number(pStats.uniqueCursedTakenAndRefresh.takenMul) || 1);
    fx.mul = Math.min(1.35, fx.mul);
    fx.resShred = Math.min(20, fx.resShred);
    return fx;
}

function coreApplyCurseResistanceDelta(fx, d) {
    fx.mul *= (d.enemyTakenMul || 1);
    fx.resShred += (d.enemyResShred || 0);
    fx.resFShred += (d.enemyResFShred || 0);
    fx.resCShred += (d.enemyResCShred || 0);
    fx.resLShred += (d.enemyResLShred || 0);
    fx.resChaosShred += (d.enemyResChaosShred || 0);
    fx.physDrShred += (d.enemyPhysDrShred || 0);
}

function coreApplyCurseHitDelta(fx, d) {
    fx.projectileTakenMul *= (d.enemyProjectileTakenMul || 1);
    fx.lightTakenMul *= (d.enemyLightTakenMul || 1);
    fx.chaosTakenMul *= (d.enemyChaosTakenMul || 1);
    fx.enemyDmgMul *= (d.enemyDmgMul || 1);
    fx.enemyRegenRateMul *= (d.enemyRegenRateMul || 1);
    fx.projectileExtraHits += (d.projectileExtraHits || 0);
    fx.critDmgTakenMul *= (d.enemyCritDmgTakenMul || 1);
}

const CORE_CURSE_AILMENTS = ['ignite', 'chill', 'freeze', 'shock', 'poison', 'bleed'];
function coreApplyCurseAilmentChance(fx, d) {
    CORE_CURSE_AILMENTS.forEach(type => {
        const field = `${type}ChanceAdd`;
        if (d[field]) fx.ailmentChanceAdd[type] = (fx.ailmentChanceAdd[type] || 0) + d[field];
    });
}

function coreApplyCurseAilmentDamage(fx, d) {
    if (d.igniteTakenMul || d.fireDotTakenMul) fx.ailmentTakenMul.ignite = (fx.ailmentTakenMul.ignite || 1) * (d.igniteTakenMul || 1) * (d.fireDotTakenMul || 1);
    if (d.poisonTakenMul) fx.ailmentTakenMul.poison = (fx.ailmentTakenMul.poison || 1) * d.poisonTakenMul;
    if (d.bleedTakenMul) fx.ailmentTakenMul.bleed = (fx.ailmentTakenMul.bleed || 1) * d.bleedTakenMul;
}

export function coreGetKeystoneEnemyTakenMultiplier(env, enemy) {
    if (!enemy) return 1;
    let now = env.deps.getCombatTime();
    let mul = 1;
    let debuffs = env.owner.enemyKeystoneDebuffs || {};
    let list = debuffs[enemy.id] || [];
    list = list.filter(row => row && (row.expiresAt || 0) > now);
    debuffs[enemy.id] = list;
    env.owner.enemyKeystoneDebuffs = debuffs;
    let a3Stacks = list.filter(row => row.type === 'a3').length;
    if (a3Stacks > 0) mul *= (1 + Math.min(10, a3Stacks) * env.deps.ASCENDANCY_KEYSTONE_VALUES.a3.takenPctPerStack / 100);
    return mul;
}

export function coreGetConditionPhysicalReductionCap(conditionEffects) {
    let hasGuardCap = false;
    let warcryCapBonus = 0;
    conditionEffects.forEach(({ buff, delta }) => {
        if (!delta || !(delta.dr > 0)) return;
        if (buff.type !== 'warcry') {
            hasGuardCap = true;
            return;
        }
        let bonus = Math.min(WARCRY_PHYSICAL_REDUCTION_CAP_BONUS_PCT, Math.max(0, Number(delta.drCapBonus) || 0));
        warcryCapBonus += bonus;
    });
    if (hasGuardCap) return CONDITION_GUARD_PHYSICAL_REDUCTION_CAP_PCT;
    return Math.min(CONDITION_GUARD_PHYSICAL_REDUCTION_CAP_PCT, PLAYER_PHYSICAL_REDUCTION_CAP_PCT + warcryCapBonus);
}

export function coreApplyConditionPhysicalReductionEffects(pStats, conditionEffects) {
    let cap = coreGetConditionPhysicalReductionCap(conditionEffects);
    let rawDr = Number.isFinite(Number(pStats.rawDr)) ? Number(pStats.rawDr) : (Number(pStats.dr) || 0);
    conditionEffects.forEach(({ delta }) => { rawDr += Number(delta && delta.dr) || 0; });
    conditionEffects.forEach(({ delta }) => {
        let armorMultiplier = Number(delta && delta.armorMul) || 0;
        if (armorMultiplier > 0) rawDr += Math.max(0, Math.min(cap, rawDr) * armorMultiplier);
    });
    pStats.rawDr = rawDr;
    pStats.dr = Math.min(cap, rawDr);
    return cap;
}
