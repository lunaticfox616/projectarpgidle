import { ambushEligible, ambushTryBlink } from './combat/elite-ambush.mjs';

// Retain the authored rule reference until the native application owns data and combat together.
const env = { rule: ELITE_AMBUSH, deps: {
    get getGridBlockedCells() { return getGridBlockedCells; },
    get getGridUnitFootprint() { return getGridUnitFootprint; },
    get getGridUnitDistance() { return getGridUnitDistance; },
    get canPlaceGridFootprint() { return canPlaceGridFootprint; },
    get hasGridCell() { return hasGridCell; },
    get getCombatTime() { return getCombatTime; }
} };

const enemyAmbush = Object.freeze({
    eligible(enemy) { return ambushEligible(env.rule, enemy); },
    tryBlink(enemy, target) {
        const commands = ambushTryBlink(env, enemy, target);
        let step = commands.next();
        while (!step.done) step = commands.next(addBattleFx(...step.value.args));
        return step.value;
    }
});
safeExposeGlobals({ enemyAmbush });
