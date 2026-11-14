import { readCombatTime, takeCombatSteps } from './common/combat-clock.mjs';

const getCombatTime = () => readCombatTime(window.GameModules.state.game, Date.now);
let stepMultiplier = 1;
const takeForegroundCombatSteps = (clock, nowMs, paused) => takeCombatSteps(clock, nowMs, paused, stepMultiplier);

/*! @dev-only */
// Local test control only. No saved field or production multiplier hook.
function setTestCombatSpeed(multiplier) {
    stepMultiplier = Math.max(1, Math.min(8, Math.floor(Number(multiplier) || 1)));
    return stepMultiplier;
}
safeExposeGlobals({ setTestCombatSpeed });
/*! @end-dev-only */

safeExposeGlobals({ getCombatTime, takeForegroundCombatSteps });
