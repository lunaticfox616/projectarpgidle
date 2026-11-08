// 기습 정예(2026-11-08 사용자: Codex가 만든 기습 몬스터를 넣되 정예 이상에서만, "기습이란 순간이동해서 플레이어에게 바로 붙는 것"):
// data/bosses.js ELITE_AMBUSH의 외형이 정예면, 멀리 있는 목표에게 걸어가는 대신 사라졌다가 목표 옆 칸에 나타나 곧 친다.
// 칸은 사라지는 순간 옮기고(사이 길을 미끄러지지 않는다), 몸을 숨기고 드러내는 것과 두 효과는 js/canvas-enemy-ambush.js가 그린다.
// 판정은 전투 시계(getCombatTime)로 하므로 방치 정산에서도 같다. 효과는 화면이 보일 때만 남는다(addBattleFx).
const enemyAmbush = (() => {
    const RULE = ELITE_AMBUSH;
    const visualOf = enemy => enemy.spriteVariantId || enemy.monsterVisualId;
    /** 정예(보스가 아닌)이고 살아 있는 기습 외형인가. */
    function eligible(enemy) {
        return !!enemy && enemy.isElite === true && !enemy.isBoss && enemy.hp > 0 && RULE.species.includes(visualOf(enemy));
    }
    /** 목표 옆(거리 1)에 이 몬스터가 설 수 있는 칸들: 같은 줄(옆에서 보는 무대의 근접)이 먼저, 그다음 지금 자리에서 가까운 칸. */
    function landings(enemy, target) {
        const blocked = getGridBlockedCells(enemy), footprint = getGridUnitFootprint(enemy), spots = [];
        const box = getGridUnitFootprint(target);
        for (let gy = target.gy - footprint.rows; gy <= target.gy + box.rows; gy++) {
            for (let gx = target.gx - footprint.columns; gx <= target.gx + box.columns; gx++) {
                const probe = { ...enemy, gx, gy };
                if (getGridUnitDistance(probe, target) !== 1 || !canPlaceGridFootprint(blocked, gx, gy, footprint)) continue;
                spots.push({ gx, gy, row: gy === target.gy ? 0 : 1, near: Math.hypot(gx - enemy.gx, gy - enemy.gy) });
            }
        }
        return spots.sort((a, b) => a.row - b.row || a.near - b.near);
    }
    /** 멀리 있는 목표에게 걸어가는 대신 순간이동할 때 true(이번 접근은 끝났다). 처음 싸움에 든 뒤 firstDelayMs, 그 뒤로는 cooldownMs마다. */
    function tryBlink(enemy, target) {
        if (!eligible(enemy) || !hasGridCell(enemy) || !hasGridCell(target)) return false;
        const now = getCombatTime();
        if (!Number.isFinite(enemy.ambushReadyAt)) { enemy.ambushReadyAt = now + RULE.firstDelayMs; return false; }
        if (now < enemy.ambushReadyAt || getGridUnitDistance(enemy, target) < RULE.minCells) return false;
        const spot = landings(enemy, target)[0];
        if (!spot) return false;
        const from = { gx: enemy.gx, gy: enemy.gy };
        Object.assign(enemy, { gx: spot.gx, gy: spot.gy, gridMoveTimer: 0, gridStepFrom: null, ambushReadyAt: now + RULE.cooldownMs });
        enemy.attackTimer = Math.max(Number(enemy.attackTimer) || 0, RULE.windUp);
        addBattleFx('ambushBlink', { enemyId: enemy.id, from, to: { gx: spot.gx, gy: spot.gy }, footprint: getGridUnitFootprint(enemy), duration: RULE.vanishMs + RULE.hiddenMs + RULE.appearMs });
        return true;
    }
    return Object.freeze({ eligible, tryBlink });
})();
safeExposeGlobals({ enemyAmbush });
