import { consumeDomainCommands } from './common/consume-commands.mjs';
import { createAscendancyNodeRules } from './domain/ascendancy-node-rules.mjs';

const rules = createAscendancyNodeRules({
    cloneSnapshot: value => structuredClone(value),
    get ASCENDANCY_KEYSTONE_VALUES() { return ASCENDANCY_KEYSTONE_VALUES; },
    get hasKeystone() { return hasKeystone; },
    ascendancyRandom: () => Math.random(),
    get hasGridCell() { return hasGridCell; },
    get getGridUnitDistance() { return getGridUnitDistance; },
    get getSummonRuntimeCap() { return getSummonRuntimeCap; },
    get _t() { return _t; },
    get getPlayerRecoveryHpCap() { return getPlayerRecoveryHpCap; },
    get applyDamageToEnemyResource() { return applyDamageToEnemyResource; },
    get getElementColor() { return getElementColor; },
    get handleEnemyDeath() { return handleEnemyDeath; },
    get getEffectiveEnemyMitigation() { return getEffectiveEnemyMitigation; },
    get getZone() { return getZone; },
    get mobilitySkill() { return typeof mobilitySkill === 'undefined' ? undefined : mobilitySkill; },
    get applyEnemyAilmentFromHit() { return applyEnemyAilmentFromHit; }
});
const effects = { get ascendancyFx() { return addBattleFx.bind(undefined); } };
const ascendancyNodeRules = Object.freeze({
    reset: rules.reset,
    capture: rules.capture,
    restore: rules.restore,
    onAttack: (...args) => rules.onAttack(game, ...args),
    flowStacks: rules.flowStacks,
    unyieldingActive: rules.unyieldingActive,
    onLifeDrop: (...args) => consumeDomainCommands(rules.onLifeDrop(game, ...args), effects),
    storeArmorBlow: (...args) => rules.storeArmorBlow(game, ...args),
    counter: (...args) => consumeDomainCommands(rules.counter(game, ...args), effects),
    beforeHit: (...args) => rules.beforeHit(game, ...args),
    mossSlowPct: (...args) => rules.mossSlowPct(game, ...args),
    armorBreak: (...args) => rules.armorBreak(game, ...args),
    afterHit: (...args) => consumeDomainCommands(rules.afterHit(game, ...args), effects),
    blastMultiplier: (...args) => rules.blastMultiplier(game, ...args),
    tick: (...args) => consumeDomainCommands(rules.tick(game, ...args), effects),
    rooted: (...args) => rules.rooted(game, ...args),
    poisonHeld: (...args) => rules.poisonHeld(game, ...args),
    ailmentStep: rules.ailmentStep,
    dotMultiplier: (...args) => rules.dotMultiplier(game, ...args),
    summonHitMultiplier: (...args) => rules.summonHitMultiplier(game, ...args),
    storeSharedBlow: (...args) => rules.storeSharedBlow(game, ...args),
    takeSharedBlow: rules.takeSharedBlow,
    onSummonKill: (...args) => rules.onSummonKill(game, ...args)
});
safeExposeGlobals({ ascendancyNodeRules });
