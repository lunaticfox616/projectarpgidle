// GENERATED from modules/combat-clock*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/combat-clock.mjs
  function readCombatTime(game, wallClockNow) {
    return typeof game !== "undefined" && game && Number.isFinite(game.combatTimeMs) && game.combatTimeMs > 0 ? game.combatTimeMs : wallClockNow();
  }
  function takeCombatSteps(clock, nowMs, paused, multiplier = 1) {
    if (!Number.isFinite(nowMs)) throw new TypeError("Combat scheduler requires a finite timestamp");
    let elapsed = clock.lastAtMs === null ? 0 : Math.max(0, nowMs - clock.lastAtMs);
    clock.lastAtMs = nowMs;
    if (paused) {
      clock.remainderMs = 0;
      return 0;
    }
    clock.remainderMs += Math.min(1e3, elapsed) * multiplier;
    let steps = Math.floor(clock.remainderMs / 100);
    clock.remainderMs -= steps * 100;
    return steps;
  }

  // modules/combat-clock-classic.mjs
  var getCombatTime = () => readCombatTime(window.GameModules.state.game, Date.now);
  var stepMultiplier = 1;
  var takeForegroundCombatSteps = (clock, nowMs, paused) => takeCombatSteps(clock, nowMs, paused, stepMultiplier);
  /* @dev-only */
  function setTestCombatSpeed(multiplier) {
    stepMultiplier = Math.max(1, Math.min(8, Math.floor(Number(multiplier) || 1)));
    return stepMultiplier;
  }
  safeExposeGlobals({ setTestCombatSpeed });
  /* @end-dev-only */
  safeExposeGlobals({ getCombatTime, takeForegroundCombatSteps });
})();
