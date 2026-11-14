import { passiveRuleApplyPassiveKeystoneBucketRules, passiveRuleSumPassiveRuleStat } from './passive-keystone-buckets.mjs';
import { passiveRuleGetPassiveKeystoneCombatFlags } from './passive-combat-flags.mjs';
import { passiveRuleApplyPassiveConditionalAilmentRules } from './passive-ailment-rules.mjs';
import { passiveRuleGetMystiqueAffinity, passiveRuleGetActivePassiveCycleBuffEffects } from './passive-cycle-rules.mjs';
import { passiveRuleEnsurePassiveSpecializationState } from './passive-specialization-state.mjs';
import { passiveRuleFindAllocatedPassiveKeystone } from './passive-keystone-lookup.mjs';
import { passiveRuleGetPassiveWisdomElementFromNodeIds } from './passive-tree-access.mjs';

/** The stat calculator passes its tick; a direct caller (tests, tools) may pass `now` and read the live state. */
export function passiveRuleReadPassiveRuleTickValue(options, name, live) {
    return options.tick ? options.tick.get(name) : live();
}

export function passiveRuleApplyAuthoredPassiveStatRules(env, owner, options) {
    const buckets = options.buckets, passive = buckets.passive, reward = buckets.reward;
    passiveRuleApplyPassiveKeystoneBucketRules(env, owner, buckets);
    const flags = passiveRuleGetPassiveKeystoneCombatFlags(env, owner, options.skillTags);
    passiveRuleApplyPassiveConditionalAilmentRules(passive, flags);
    // Cycle buffs and fanaticism stacks change during a fight: the stat calculator's tick reads them (js/player-stat-cache.js).
    const activeCycleBuffEffects = passiveRuleReadPassiveRuleTickValue(options, 'cycleBuffEffects', () => passiveRuleGetActivePassiveCycleBuffEffects(env, owner, options.now));
    activeCycleBuffEffects.forEach(effect => env.deps.addStatToBucket(reward, effect.stat, effect.val));
    const damageByElement = {
        phys: passiveRuleSumPassiveRuleStat(buckets, 'physPctDmg'), fire: passiveRuleSumPassiveRuleStat(buckets, 'firePctDmg'),
        cold: passiveRuleSumPassiveRuleStat(buckets, 'coldPctDmg'), light: passiveRuleSumPassiveRuleStat(buckets, 'lightPctDmg'),
        chaos: passiveRuleSumPassiveRuleStat(buckets, 'chaosPctDmg')
    };
    if (damageByElement[options.skillElement] !== undefined) damageByElement[options.skillElement] += 0.01;
    const mystique = passiveRuleGetMystiqueAffinity(env, passive.mystique, damageByElement);
    if (flags.singleMystique) {
        mystique.damagePct *= 2;
        mystique.potencyPct *= 2;
        mystique.chancePct *= 2;
    }
    env.deps.addStatToBucket(passive, `${mystique.ailment}Chance`, mystique.chancePct);
    const state = passiveRuleEnsurePassiveSpecializationState(env, owner), corrupted = !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '타락한 복음');
    const triple = !corrupted && !!passiveRuleFindAllocatedPassiveKeystone(env, owner, '삼중 계시');
    const devotion = Math.max(0, passiveRuleSumPassiveRuleStat(buckets, 'devotion'));
    const cycle = Math.max(0, passiveRuleSumPassiveRuleStat(buckets, 'cycle'));
    const revelation = corrupted ? 'fanaticism' : (triple ? 'triple' : state.revelation);
    applyRevelationLifeBonuses(passive, devotion, revelation, triple);
    const wisdomElement = passiveRuleGetPassiveWisdomElementFromNodeIds(env, owner.passives).replace('lightning', 'light');
    return { mystique, devotion, cycle, revelation, wisdomElement,
        ...revelationBonuses(env, devotion, revelation, triple),
        cycleAddedFireFromPhysicalPct: passiveRuleFindAllocatedPassiveKeystone(env, owner, '순환의 원석') ? cycle * 3 : 0,
        fanaticismStacks: corrupted ? Math.min(devotion, Math.max(0, passiveRuleReadPassiveRuleTickValue(options, 'fanaticismStacks', () => state.fanaticism.stacks))) : 0,
        activeCycleBuffEffects, flags };
}

function applyRevelationLifeBonuses(passive, devotion, revelation, triple) {
    if (revelation === 'life') {
        passive.pctHp += devotion * 0.5;
        passive.energyShieldPct += devotion * 0.5;
        passive.regen += devotion * 0.5;
    }
    if (triple) {
        passive.pctHp += devotion * 0.2;
        passive.energyShieldPct += devotion * 0.2;
        passive.regen += devotion * 0.2;
    }
}

function revelationBonuses(env, devotion, revelation, triple) {
    return {
        revelationLabel: triple ? '삼중 계시' : (env.deps.PASSIVE_REVELATION_LABELS[revelation] || '계시'),
        combatDamageMorePct: revelation === 'combat' ? devotion : (triple ? devotion * 0.4 : 0),
        guardTakenLessPct: revelation === 'guard' ? Math.min(50, Math.floor(devotion / 5)) : (triple ? Math.min(20, Math.floor(devotion / 5) * 0.4) : 0),
        lifeBonusPct: revelation === 'life' ? devotion * 0.5 : (triple ? devotion * 0.2 : 0)
    };
}
