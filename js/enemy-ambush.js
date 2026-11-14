// GENERATED from modules/enemy-ambush*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/elite-ambush.mjs
  function ambushEligible(rule, enemy) {
    const visual = enemy && (enemy.spriteVariantId || enemy.monsterVisualId);
    return !!enemy && enemy.isElite === true && !enemy.isBoss && enemy.hp > 0 && rule.species.includes(visual);
  }
  function ambushLandings(env2, enemy, target) {
    const blocked = env2.deps.getGridBlockedCells(enemy), footprint = env2.deps.getGridUnitFootprint(enemy), spots = [];
    const box = env2.deps.getGridUnitFootprint(target);
    for (let gy = target.gy - footprint.rows; gy <= target.gy + box.rows; gy++) {
      for (let gx = target.gx - footprint.columns; gx <= target.gx + box.columns; gx++) {
        const probe = { ...enemy, gx, gy };
        if (env2.deps.getGridUnitDistance(probe, target) !== 1 || !env2.deps.canPlaceGridFootprint(blocked, gx, gy, footprint)) continue;
        spots.push({ gx, gy, row: gy === target.gy ? 0 : 1, near: Math.hypot(gx - enemy.gx, gy - enemy.gy) });
      }
    }
    return spots.sort((a, b) => a.row - b.row || a.near - b.near);
  }
  function* ambushTryBlink(env2, enemy, target) {
    if (!ambushEligible(env2.rule, enemy) || !env2.deps.hasGridCell(enemy) || !env2.deps.hasGridCell(target)) return false;
    const now = env2.deps.getCombatTime();
    if (!Number.isFinite(enemy.ambushReadyAt)) {
      enemy.ambushReadyAt = now + env2.rule.firstDelayMs;
      return false;
    }
    if (now < enemy.ambushReadyAt || env2.deps.getGridUnitDistance(enemy, target) < env2.rule.minCells) return false;
    const spot = ambushLandings(env2, enemy, target)[0];
    if (!spot) return false;
    const from = { gx: enemy.gx, gy: enemy.gy };
    Object.assign(enemy, { gx: spot.gx, gy: spot.gy, gridMoveTimer: 0, gridStepFrom: null, ambushReadyAt: now + env2.rule.cooldownMs });
    enemy.attackTimer = Math.max(Number(enemy.attackTimer) || 0, env2.rule.windUp);
    yield { kind: "addBattleFx", args: ["ambushBlink", {
      enemyId: enemy.id,
      from,
      to: { gx: spot.gx, gy: spot.gy },
      footprint: env2.deps.getGridUnitFootprint(enemy),
      duration: env2.rule.vanishMs + env2.rule.hiddenMs + env2.rule.appearMs
    }] };
    return true;
  }

  // modules/enemy-ambush-classic.mjs
  var env = { rule: ELITE_AMBUSH, deps: {
    get getGridBlockedCells() {
      return getGridBlockedCells;
    },
    get getGridUnitFootprint() {
      return getGridUnitFootprint;
    },
    get getGridUnitDistance() {
      return getGridUnitDistance;
    },
    get canPlaceGridFootprint() {
      return canPlaceGridFootprint;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getCombatTime() {
      return getCombatTime;
    }
  } };
  var enemyAmbush = Object.freeze({
    eligible(enemy) {
      return ambushEligible(env.rule, enemy);
    },
    tryBlink(enemy, target) {
      const commands = ambushTryBlink(env, enemy, target);
      let step = commands.next();
      while (!step.done) step = commands.next(addBattleFx(...step.value.args));
      return step.value;
    }
  });
  safeExposeGlobals({ enemyAmbush });
})();
