import { addStatToBucket, addPassiveLineToBucket } from '../common/stat-bucket.mjs';

function eliteTraitStats(buff, bucket) {
    if (!buff) return;
    const trait = buff.trait || {};
    for (const [key, stat] of [['atkMul', 'pctDmg'], ['attackSpeedVarMul', 'aspd'], ['hpMul', 'pctHp']]) {
        if (trait[key]) addStatToBucket(bucket, stat, Math.max(0, (Number(trait[key]) - 1) * 100));
    }
    if (trait.critChanceBonus) addStatToBucket(bucket, 'crit', Number(trait.critChanceBonus));
    if (trait.dr) addStatToBucket(bucket, 'dr', Number(trait.dr));
    ['resF', 'resC', 'resL', 'resChaos'].forEach(stat => {
        if (trait[stat]) addStatToBucket(bucket, stat, Number(trait[stat] || 0));
    });
    if (trait.hitRateGuard) addStatToBucket(bucket, 'evasionPct', Math.max(0, Number(trait.hitRateGuard) * 100));
}

class PlayerGrowthStats {
    constructor(deps) { this.deps = deps; }

    passives(owner, passive, ids) {
        const d = this.deps;
        const virtualVoidCount = d.voidCount(owner), weaponStance = d.weaponStance(owner);
        const balanceAttributes = d.hasAuthoredKeystone('균형의 공명', owner);
        const addLine = (stat, value) => addPassiveLineToBucket(passive, stat, value, weaponStance, d.weaponConditions);
        ids.forEach(id => {
            const node = d.passiveTree.nodes[id];
            if (!node) return;
            if (node.kind === 'void') {
                const entry = d.voidCraft(id, owner);
                d.voidStats(entry, owner, d.voidLinkScale(id, owner)).forEach(line => addLine(line.id, line.val));
                d.transcendentStats(id, entry, virtualVoidCount, owner).forEach(line => addStatToBucket(passive, line.stat, line.val));
                return;
            }
            d.nodeEffects(node, balanceAttributes).forEach(effect => addLine(effect.stat, effect.val));
        });
        return weaponStance;
    }

    timed(tick, bucket) {
        eliteTraitStats(tick.get('eliteTraitBuff'), bucket);
        this.deps.breathStats(tick.get('incidentBreath')).forEach(([stat, value]) => addStatToBucket(bucket, stat, value));
    }

    journalAndHero(owner, buckets, journalBonuses) {
        const { reward, starBlessing } = buckets, d = this.deps;
        journalBonuses.forEach(entry => {
            if (entry && entry.stat) addStatToBucket(reward, entry.stat, entry.value);
        });
        d.boundaryStats(owner).forEach(stat => addStatToBucket(reward, stat.id, stat.val));
        const hero = owner.bloomedClassThisLoop === owner.ascendClass ? d.heroDefs[owner.bloomedTalentThisLoop] : null;
        (hero && Array.isArray(hero.stats) ? hero.stats : []).forEach(row => {
            if (row && row.stat) addStatToBucket(reward, row.stat, row.value);
        });
        if (owner.passiveStarEvolution && Array.isArray(owner.journalEntries) && owner.journalEntries.includes('passive_star_evolution')) {
            Object.keys(d.starBlessing).forEach(id => addStatToBucket(starBlessing, id, d.starBlessing[id]));
        }
        const talismanSummary = d.talismanSummary(owner);
        Object.keys(talismanSummary.stats).forEach(stat => addStatToBucket(reward, stat, talismanSummary.stats[stat]));
        return talismanSummary;
    }

    /** Keeps source order: season, class, act, loop, chaos, runes, timed/account/relic, journal/hero/star, talisman. */
    rewards(owner, buckets, tick, lists) {
        const { season, ascend, reward } = buckets, d = this.deps;
        d.seasonStats(season, lists.season, owner.seasonNodeLevels);
        d.ascendStats(ascend, lists.ascend, owner.ascendClass);
        lists.act.forEach(entry => {
            if (entry && entry.stat) addStatToBucket(reward, entry.stat, entry.value);
        });
        d.loopStats(reward, owner.loop10BonusStats, owner.loopDeepStats, owner.season);
        const chaos = d.chaosState(owner).permanentBonuses || {};
        Object.keys(chaos).forEach(stat => addStatToBucket(reward, stat, chaos[stat] || 0));
        const runes = d.runeStats(reward, owner.underworldRunes);
        this.timed(tick, reward);
        d.accountStats(reward, owner);
        if (typeof d.relicStats === 'function') {
            const relicStats = d.relicStats(owner);
            Object.keys(relicStats).forEach(stat => addStatToBucket(reward, stat, relicStats[stat]));
        }
        const talismanSummary = this.journalAndHero(owner, buckets, lists.journal);
        return { ...runes, talismanSummary };
    }
}

export function createPlayerGrowthStats(deps) {
    const rules = new PlayerGrowthStats(deps);
    return Object.freeze({ passives: rules.passives.bind(rules), rewards: rules.rewards.bind(rules), timed: rules.timed.bind(rules) });
}
