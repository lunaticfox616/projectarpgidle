/** Incoming ailments own duration/refresh and DoT resource order; c is per call and never saved. */
const DURATION_STATS = Object.freeze({ ignite: 'igniteTakenDurationReducePct', shock: 'shockTakenDurationReducePct',
    chill: 'coldTakenDurationReducePct', freeze: 'coldTakenDurationReducePct', poison: 'poisonTakenDurationReducePct', bleed: 'bleedTakenDurationReducePct' });
const RESIST_STATS = Object.freeze({ ignite: 'ailResIgnite', chill: 'ailResFreeze', freeze: 'ailResFreeze',
    shock: 'ailResShock', poison: 'ailResPoison', bleed: 'ailResBleed' });
const IMMUNITIES = Object.freeze({ ignite: 'immuneIgnite', chill: 'immuneChill', freeze: 'immuneFreeze', shock: 'immuneShock', bleed: 'immuneBleed' });
const DOT_STATS = Object.freeze({ ignite: ['resF', 'igniteDamageReducePct'], bleed: ['dr', 'bleedDamageReducePct'], poison: ['resChaos', 'poisonDamageReducePct'] });

function getPlayerAilmentResistChance(type, stats) {
    if (!stats) return 0;
    const res = Object.hasOwn(RESIST_STATS, type) ? stats[RESIST_STATS[type]] || 0 : 0;
    const chance = Math.max(0, Math.min(1, (res + (stats.ailmentResistBonusPct || 0)) / 100));
    return stats.passiveKeystoneFlags && stats.passiveKeystoneFlags.selfExperiment ? 1 - (1 - chance) * 0.5 : chance;
}

function incomingDuration(c, type, duration, stats) {
    const extended = stats.passiveKeystoneFlags && stats.passiveKeystoneFlags.selfExperiment ? duration * 2 : duration;
    return extended * (1 - c.deps.clampNumber(stats[DURATION_STATS[type]] || 0, 0, 75) / 100);
}

function incomingSource(c, input) {
    const opts = input.options && typeof input.options === 'object' ? input.options : {};
    const hit = Math.max(0, Math.floor(Number(opts.ailmentSourceDamage !== undefined ? opts.ailmentSourceDamage : input.sourceHitDamage) || 0));
    const crit = Math.max(0, Number(opts.critDotBonusPct) || 0);
    return { sourceHitDamage: hit, critDotBonusPct: crit, ailmentDotScore: c.deps.getDamageAilmentScore(hit, crit, 1, 1),
        sourceEnemyId: opts.sourceEnemyId === undefined ? null : opts.sourceEnemyId, sourceEnemyName: opts.sourceEnemyName || '' };
}

function refreshedAilment(rows, type) {
    const existing = rows.find(row => row.type === type);
    if (type !== 'poison') return existing;
    // Incoming poison has one stack even when the player's offensive poison allows more.
    const poisons = rows.filter(row => row && row.type === 'poison');
    return poisons.length ? poisons.reduce((a, b) => ((a.time || 0) <= (b.time || 0) ? a : b), poisons[0]) : null;
}

function refreshAilment(c, row, input, duration, source) {
    row.time = Math.max(row.time || 0, duration);
    row.duration = row.time;
    row.power = Math.max(row.power || 0, input.power || 0.1);
    if (!c.deps.isDamageAilmentType(input.type)) return;
    const score = Math.max(0, Number(row.ailmentDotScore) || c.deps.getStoredAilmentHitDamage(row));
    if (source.ailmentDotScore >= score) Object.assign(row, source);
}

function storeIncomingAilment(c, input, time) {
    const {type, power} = input;
    c.owner.playerAilments = Array.isArray(c.owner.playerAilments) ? c.owner.playerAilments : [];
    const source = incomingSource(c, input), existing = refreshedAilment(c.owner.playerAilments, type);
    if (existing) refreshAilment(c, existing, input, time, source);
    else {
        const row = {type, time, duration: time, power: Math.max(0.1, power || 0.1)};
        if (c.deps.isDamageAilmentType(type)) Object.assign(row, source);
        c.owner.playerAilments.push(row);
    }
}

function applyPlayerAilment(c, input) {
    const {type, duration, pStats} = input;
    if (!type || duration <= 0) return;
    const time = incomingDuration(c, type, duration, pStats);
    if (Object.hasOwn(IMMUNITIES, type) && pStats[IMMUNITIES[type]]) return;
    if (c.deps.random() < getPlayerAilmentResistChance(type, pStats)) return;
    storeIncomingAilment(c, input, time);
    if (typeof c.deps.recordPassiveCycleAilmentStart === 'function') c.deps.recordPassiveCycleAilmentStart(type, pStats.cycle, c.deps.getCombatTime());
}

function recordPlayerAilmentIncomingDamage(c, ailment, element, amount) {
    const label = c.deps.getAilmentDisplayLabel(ailment && ailment.type);
    const hasMonster = ailment && ailment.sourceEnemyId !== null && ailment.sourceEnemyId !== undefined;
    const sourceName = (ailment && ailment.sourceEnemyName) || label;
    c.deps.recordIncomingDamage(element, amount, sourceName, {
        sourceType: hasMonster ? 'monster' : 'ailment', sourceId: hasMonster ? ailment.sourceEnemyId : null,
        sourceName, ailmentType: ailment && ailment.type
    });
}

function takeAilmentDamageFromEnergyShield(c, damage) {
    c.owner.playerEnergyShield = Math.max(0, Math.floor(Number(c.owner.playerEnergyShield) || 0));
    const absorbed = Math.min(c.owner.playerEnergyShield, Math.max(0, damage));
    if (absorbed <= 0) return damage;
    c.owner.playerEnergyShield -= absorbed;
    c.owner.playerEsLastHitAt = c.deps.getCombatTime();
    return damage - absorbed;
}

/** null skips a non-damaging ailment; zero still follows the original ward/recording path. */
function ailmentTickDamage(c, ailment, stats, dt) {
    let damage = c.deps.getPlayerDamageAilmentDps(ailment, stats);
    if (!(damage > 0)) return null;
    const [resist, reduction] = DOT_STATS[ailment.type];
    damage = Math.max(1, Math.floor(damage * dt * (1 - Math.max(0, Math.min(0.75, (stats[resist] || 0) / 100))) * c.deps.getWoodsmanCurseDamageTakenMul()));
    damage = Math.max(0, Math.floor(damage * (1 - Math.max(0, Math.min(0.9, (stats.dotTakenDamageReducePct || 0) / 100)))));
    return Math.max(0, Math.floor(damage * (1 - Math.max(0, Math.min(0.9, (stats[reduction] || 0) / 100)))));
}

function tickShieldedAilment(c, ailment, stats, damage) {
    if (c.deps.getCombatTime() < Math.max(0, Number(c.owner.realmInvulnerableBarrierUntil) || 0)) damage = 0;
    damage = c.deps.floorIncomingDamage(damage);
    const beforeShields = damage;
    damage = c.deps.absorbDamageWithTalentStoneShield(takeAilmentDamageFromEnergyShield(c, damage));
    damage = c.deps.absorbDamageWithRealmDeathWard(damage, stats);
    c.owner.playerHp -= damage;
    c.deps.trackHiddenJournalPlayerDamage(damage);
    recordPlayerAilmentIncomingDamage(c, ailment, ailment.type === 'ignite' ? 'fire' : 'phys', beforeShields);
}

function tickPoison(c, ailment, stats, damage) {
    if (stats.poisonToHeal) {
        c.owner.playerHp = Math.min(c.deps.getPlayerRecoveryHpCap(stats), c.owner.playerHp + damage);
        return;
    }
    if (c.deps.getCombatTime() < Math.max(0, Number(c.owner.realmInvulnerableBarrierUntil) || 0)) damage = 0;
    damage = c.deps.floorIncomingDamage(damage);
    damage = c.deps.absorbDamageWithTalentStoneShield(damage);
    damage = c.deps.absorbDamageWithRealmDeathWard(damage, stats);
    c.owner.playerHp -= damage;
    c.deps.trackHiddenJournalPlayerDamage(damage);
    // Poison records life damage after wards; ignite/bleed record before shields. Keep this existing distinction.
    recordPlayerAilmentIncomingDamage(c, ailment, 'chaos', damage);
}

function tickPlayerAilment(c, ailment, stats, dt) {
    if (!Object.hasOwn(DOT_STATS, ailment.type)) return;
    const damage = ailmentTickDamage(c, ailment, stats, dt);
    if (damage === null) return;
    if (ailment.type === 'poison') tickPoison(c, ailment, stats, damage);
    else tickShieldedAilment(c, ailment, stats, damage);
}

function tickAilments(c, stats, dt) {
    c.owner.playerAilments = Array.isArray(c.owner.playerAilments) ? c.owner.playerAilments : [];
    const next = [];
    c.owner.playerAilments.forEach(ailment => {
        const previousTime = Math.max(0, Number(ailment.time) || 0);
        ailment.time = Math.max(0, (ailment.time || 0) - dt);
        tickPlayerAilment(c, ailment, stats, dt);
        if (ailment.time > 0) next.push(ailment);
        else if (previousTime > 0 && typeof c.deps.recordPassiveCycleAilmentEnd === 'function') {
            c.deps.recordPassiveCycleAilmentEnd(ailment.type, stats && stats.cycle, c.deps.getCombatTime());
        }
    });
    c.owner.playerAilments = next;
}

export function createPlayerAilments(deps) {
    return Object.freeze({
        apply: (owner, input) => applyPlayerAilment({owner, deps}, input),
        tick: (owner, stats, dt) => tickAilments({owner, deps}, stats, dt),
        resist: getPlayerAilmentResistChance
    });
}
