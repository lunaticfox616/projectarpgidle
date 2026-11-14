// Tick-only game inputs. owner is the explicit state whose current evaluation records these reads.
function timedStacks(expiresAt, stacks, max, now) { return (expiresAt || 0) > now ? Math.max(0, Math.min(max, Math.floor(stacks || 0))) : 0; }
function countInventoryRarity(owner) {
    const inventory=Array.isArray(owner.inventory)?owner.inventory:[],result={normal:0,magic:0,rare:0,unique:0};
    inventory.forEach(item=>{const rarity=(item&&item.rarity)||'normal';if(result[rarity]!==undefined)result[rarity]++;});
    return result;
}
export const PLAYER_STAT_READERS = Object.freeze({
    inventoryRarity: owner => countInventoryRarity(owner),
    eliteTraitBuff: (owner, now) => {
            const buff = owner.uniqueEliteTraitBuff;
            return buff && (buff.expiresAt || 0) > now ? buff : null;
        },
    incidentBreath: (owner, now) => {
            const breath = owner.incidentBreath; // 세계수의 숨결(js/combat-incidents.js breathe)
            return breath && (breath.until || 0) > now ? breath : null;
        },
    cycleBuffEffects: (owner, now, deps) => deps.cycleBuffEffects(owner, now),
    fanaticismStacks: (owner, now, deps) => deps.specialization(owner).fanaticism.stacks,
    playerAilmentCount: owner => (owner.playerAilments || []).filter(row => row && row.time > 0).length,
    leechActive: owner => Array.isArray(owner.playerLeechInstances)
            && owner.playerLeechInstances.some(instance => instance && Number(instance.remaining) > 0),
    evasionDanceStacks: (owner, now) => {
            const state = owner.uniqueEvasionDanceState || {};
            return (state.expiresAt || 0) > now ? Math.floor(state.stacks || 0) : null;
        },
    shadowStealth: (owner, now) => (owner.shadowStealthExpiresAt || 0) > now,
    killMoveStacks: (owner, now) => {
            const state = owner.uniqueKillMoveStacksState;
            return state && (state.expiresAt || 0) > now ? Math.max(0, Math.floor(state.stacks || 0)) : null;
        },
    regionMoveBonus: (owner, now, deps) => deps.regionAffixEffects.moveBonus(owner, now),
    leechEfficiency: (owner, now) => !!owner.uniqueLeechEfficiencyUntil && now < owner.uniqueLeechEfficiencyUntil,
    aliveEnemies: owner => (owner.enemies || []).filter(e => e && e.hp > 0).length,
    meleeArmorAmpStacks: (owner, now) => (owner.uniqueMeleeArmorAmpExpiresAt || 0) > now ? Math.floor(owner.uniqueMeleeArmorAmpStacks || 0) : null,
    targetCurseCount: owner => {
            const target = (owner.enemies || []).find(x => x && x.hp > 0), debuffs = owner.enemyConditionDebuffs;
            return target && debuffs && Array.isArray(debuffs[target.id]) ? debuffs[target.id].length : 0;
        },
    warriorRhythmStacks: (owner, now) => timedStacks(owner.warriorRhythmExpiresAt, owner.warriorRhythmStacks, 5, now)
            + timedStacks(owner.warriorRhythmDoubleExpiresAt, owner.warriorRhythmDoubleStacks, 5, now),
    warriorRageStacks: (owner, now, deps) => deps.rageStacks(owner, now),
    warriorRageMultiplier: (owner, now, deps) => deps.rageMultiplier(owner, now),
    gladiatorFlurryStacks: (owner, now) => timedStacks(owner.gladiatorFlurryExpiresAt, owner.gladiatorFlurryStacks, 12, now),
    gladiatorVeteranCrit: owner => Math.max(0, Math.floor(owner.gladiatorVeteranCritBonus || 0)),
    gladiatorSwiftGuard: owner => !!owner.gladiatorSwiftGuardReady,
    assassinBlurred: owner => !!owner.assassinBlurred,
    sinceHitSeconds: (owner, now) => {
            if (!Number.isFinite(owner.playerLastHitAt) || owner.playerLastHitAt <= 0) owner.playerLastHitAt = now;
            return Math.floor(Math.max(0, (now - Math.floor(owner.playerLastHitAt || 0)) / 1000));
        },
    crusaderAegis: (owner, now) => (owner.crusaderLightningAegisUntil || 0) > now,
    elementalistOverload: (owner, now, deps) => deps.overload(owner),
    guardianEnduranceStacks: (owner, now) => timedStacks(owner.guardianEnduranceExpiresAt, owner.guardianEnduranceStacks, 5, now),
    warriorUnyielding: (owner, now, deps) => deps.ascendancyNodeRules.unyieldingActive(owner, now),
    bladedancerFlowStacks: (owner, now, deps) => deps.ascendancyNodeRules.flowStacks(owner, now),
    grovewardenRooted: (owner, now, deps) => deps.ascendancyNodeRules.rooted(owner, now),
    playerHp: owner => owner.playerHp,
    playerEnergyShield: owner => owner.playerEnergyShield || 0,
    summonDeathDamagePct: (owner, now) => (owner.summonDeathDamageBuffExpiresAt || 0) > now ? Math.max(0, Number(owner.summonDeathDamageBuffPct || 0)) : 0,
    summonCritAspd: (owner, now) => (owner.summonCritAspdExpiresAt || 0) > now
            ? Math.max(0, Math.floor(owner.summonCritAspdStacks || 0)) * Math.max(0, Number(owner.summonCritAspdPerStack || 0)) : 0,
    mistralStacks: (owner, now, deps) => deps.mistralStacks(owner, now),
    mossRecoveryOccupied: (owner, now, deps) => deps.mossRecovery(owner)
});
