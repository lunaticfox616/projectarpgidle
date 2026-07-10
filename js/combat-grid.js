// 8x8 아이소메트릭 전장 그리드 도메인.
// 좌표/거리/스폰 배치/이동 스텝/스킬 범위 패턴 해석을 소유한다.
// data(COMBAT_GRID_CONFIG, SKILL_GRID_DB)와 game 상태 shape에만 의존하고 UI/렌더링을 호출하지 않는다.
// 그리드 유닛 계약: { gx: 0~7 정수, gy: 0~7 정수, gridMoveTimer: 초 } — 플레이어(game.gridPlayer),
// 적(game.enemies[i]), 소환수(game.summons[i])가 공유한다.

function isGridCellInBounds(gx, gy) {
    let size = COMBAT_GRID_CONFIG.size;
    return Number.isInteger(gx) && Number.isInteger(gy) && gx >= 0 && gy >= 0 && gx < size && gy < size;
}

function gridCellKey(gx, gy) {
    return gx + ',' + gy;
}

function gridChebyshevDist(ax, ay, bx, by) {
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

/** 유닛이 유효한 그리드 칸을 가졌는지 확인한다. */
function hasGridCell(unit) {
    return !!unit && isGridCellInBounds(unit.gx, unit.gy);
}

/**
 * 현재 전장에서 점유된 칸 키 집합을 만든다.
 * @param {object} [excludeUnit] 이동 주체 자신은 점유 판정에서 제외한다.
 * @returns {Set<string>}
 */
function getGridBlockedCells(excludeUnit) {
    let blocked = new Set();
    let addUnit = unit => {
        if (unit === excludeUnit || !hasGridCell(unit)) return;
        blocked.add(gridCellKey(unit.gx, unit.gy));
    };
    addUnit(game.gridPlayer);
    (game.enemies || []).forEach(enemy => { if (enemy && enemy.hp > 0) addUnit(enemy); });
    (game.summons || []).forEach(summon => { if (summon && summon.alive && (summon.hp || 0) > 0) addUnit(summon); });
    return blocked;
}

/**
 * 비어 있는 칸 하나를 고른다. near가 주어지면 그 칸에서 가까운 순으로, 없으면 무작위로 고른다.
 * 전부 막혀 있으면 null을 반환한다(호출자가 배치 실패를 처리).
 * @param {Set<string>} blocked
 * @param {{gx:number, gy:number}} [near]
 */
function findFreeGridCell(blocked, near) {
    let size = COMBAT_GRID_CONFIG.size;
    let free = [];
    for (let gx = 0; gx < size; gx++) {
        for (let gy = 0; gy < size; gy++) {
            if (!blocked.has(gridCellKey(gx, gy))) free.push({ gx, gy });
        }
    }
    if (free.length === 0) return null;
    if (!near) return free[Math.floor(Math.random() * free.length)];
    free.sort((a, b) => gridChebyshevDist(a.gx, a.gy, near.gx, near.gy) - gridChebyshevDist(b.gx, b.gy, near.gx, near.gy));
    return free[0];
}

/**
 * 스폰되는 적에게 그리드 칸을 배정한다. 보스는 고정 스폰 칸(점유 시 그 주변)에,
 * 일반/정예는 빈 칸 중 무작위로 배치된다. 배정한 칸은 blocked에 추가한다.
 * @param {object} enemy createEnemy 결과
 * @param {Set<string>} blocked 이번 스폰 동안 누적되는 점유 집합
 */
function assignEnemyGridSpawn(enemy, blocked) {
    let cell = enemy.isBoss
        ? (blocked.has(gridCellKey(COMBAT_GRID_CONFIG.bossSpawn.gx, COMBAT_GRID_CONFIG.bossSpawn.gy))
            ? findFreeGridCell(blocked, COMBAT_GRID_CONFIG.bossSpawn)
            : { gx: COMBAT_GRID_CONFIG.bossSpawn.gx, gy: COMBAT_GRID_CONFIG.bossSpawn.gy })
        : findFreeGridCell(blocked);
    if (!cell) cell = { gx: COMBAT_GRID_CONFIG.bossSpawn.gx, gy: COMBAT_GRID_CONFIG.bossSpawn.gy };
    enemy.gx = cell.gx;
    enemy.gy = cell.gy;
    enemy.gridMoveTimer = 0;
    blocked.add(gridCellKey(cell.gx, cell.gy));
}

/**
 * 적의 근접/원거리 유형과 사거리를 배정한다. 보스는 항상 원거리(사실상 무제한 사거리),
 * 일반/정예는 스폰 시 확률(meleeEnemyChance)로 근접형이 되고 나머지는 3~5칸 사거리 원거리형이 된다.
 */
function assignEnemyGridCombatProfile(enemy) {
    let cfg = COMBAT_GRID_CONFIG;
    if (enemy.isBoss) {
        enemy.attackKind = 'ranged';
        enemy.attackRange = cfg.bossAttackRange;
        return;
    }
    let melee = Math.random() < cfg.meleeEnemyChance;
    enemy.attackKind = melee ? 'melee' : 'ranged';
    enemy.attackRange = melee
        ? cfg.meleeAttackRange
        : cfg.rangedEnemyMinRange + Math.floor(Math.random() * (cfg.rangedEnemyMaxRange - cfg.rangedEnemyMinRange + 1));
}

/** 플레이어를 스폰 칸으로 되돌린다(조우 시작/전장 리셋 시). */
function resetPlayerGridPosition() {
    game.gridPlayer = { gx: COMBAT_GRID_CONFIG.playerSpawn.gx, gy: COMBAT_GRID_CONFIG.playerSpawn.gy, gridMoveTimer: 0 };
}

/**
 * 전투 틱 진입 경계에서 그리드 런타임 불변식을 복구한다.
 * 구버전 저장, spawnEncounterMarker를 거치지 않는 직접 스폰(균열 웨이브 등)으로
 * 칸/유형이 없는 유닛이 생기면 여기서 한 번에 채운다.
 */
function ensureCombatGridRuntime() {
    if (!hasGridCell(game.gridPlayer)) resetPlayerGridPosition();
    let blocked = getGridBlockedCells();
    (game.enemies || []).forEach(enemy => {
        if (!enemy || enemy.hp <= 0) return;
        if (!enemy.attackKind || !Number.isFinite(enemy.attackRange)) assignEnemyGridCombatProfile(enemy);
        if (hasGridCell(enemy)) return;
        assignEnemyGridSpawn(enemy, blocked);
    });
    (game.summons || []).forEach(summon => {
        if (!summon || !summon.alive || (summon.hp || 0) <= 0 || hasGridCell(summon)) return;
        let cell = findFreeGridCell(blocked, game.gridPlayer);
        if (!cell) return;
        summon.gx = cell.gx;
        summon.gy = cell.gy;
        summon.gridMoveTimer = 0;
        blocked.add(gridCellKey(cell.gx, cell.gy));
    });
}

/**
 * (ax,ay)에서 (tx,ty) 방향 브레젠험 직선 칸 목록(시작 칸 제외, 최대 maxLen칸).
 * 전장 밖으로 나가면 중단한다.
 */
function gridLineCells(ax, ay, tx, ty, maxLen) {
    let cells = [];
    let dx = Math.abs(tx - ax), dy = Math.abs(ty - ay);
    let sx = ax < tx ? 1 : -1, sy = ay < ty ? 1 : -1;
    let err = dx - dy;
    let gx = ax, gy = ay;
    while (cells.length < maxLen && (gx !== tx || gy !== ty)) {
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; gx += sx; }
        if (e2 < dx) { err += dx; gy += sy; }
        if (!isGridCellInBounds(gx, gy)) break;
        cells.push({ gx, gy });
    }
    return cells;
}

/** 대상 방향 직선을 range칸까지 연장한 끝 칸을 구한다(관통 스킬용). */
function gridProjectedLineEnd(ax, ay, tx, ty, range) {
    let dx = tx - ax, dy = ty - ay;
    let len = Math.max(Math.abs(dx), Math.abs(dy));
    if (len <= 0) return { gx: tx, gy: ty };
    let scale = range / len;
    return { gx: ax + Math.round(dx * scale), gy: ay + Math.round(dy * scale) };
}

/**
 * 목표 칸을 향해 유닛을 한 칸(8방향) 전진시킨다. 점유 칸은 통과하지 못하며,
 * 거리(체비셰프, 동률이면 맨해튼)가 줄어드는 칸이 없으면 제자리에 머문다.
 * @returns {boolean} 실제로 이동했는지
 */
function gridStepToward(unit, tx, ty, blocked) {
    if (!hasGridCell(unit)) return false;
    let bestCell = null, bestCheb = gridChebyshevDist(unit.gx, unit.gy, tx, ty), bestMan = Math.abs(unit.gx - tx) + Math.abs(unit.gy - ty);
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            let gx = unit.gx + dx, gy = unit.gy + dy;
            if (!isGridCellInBounds(gx, gy) || blocked.has(gridCellKey(gx, gy))) continue;
            let cheb = gridChebyshevDist(gx, gy, tx, ty);
            let man = Math.abs(gx - tx) + Math.abs(gy - ty);
            if (cheb < bestCheb || (cheb === bestCheb && man < bestMan)) {
                bestCell = { gx, gy };
                bestCheb = cheb;
                bestMan = man;
            }
        }
    }
    if (!bestCell) return false;
    unit.gx = bestCell.gx;
    unit.gy = bestCell.gy;
    return true;
}

/**
 * 이동 타이머를 누적하고 주기가 차면 목표를 향해 한 칸 이동한다.
 * 막혀서 못 움직이면 타이머를 주기 직전 값으로 유지해 다음 틱에 즉시 재시도한다.
 * @param {object} unit 그리드 유닛
 * @param {{gx:number, gy:number}} target 목표 칸
 * @param {number} dtSec 이번 틱 경과 시간(초)
 * @param {number} intervalSec 1칸 이동 주기(초)
 * @returns {boolean} 실제로 이동했는지
 */
function advanceGridUnitMovement(unit, target, dtSec, intervalSec) {
    if (!hasGridCell(unit) || !target) return false;
    let interval = Number.isFinite(intervalSec) && intervalSec > 0 ? intervalSec : COMBAT_GRID_CONFIG.enemyMoveIntervalSec;
    unit.gridMoveTimer = (Number(unit.gridMoveTimer) || 0) + dtSec;
    if (unit.gridMoveTimer < interval) return false;
    let moved = gridStepToward(unit, target.gx, target.gy, getGridBlockedCells(unit));
    unit.gridMoveTimer = moved ? 0 : interval;
    return moved;
}

/** 스킬 젬의 그리드 범위 프로필을 조회한다. 정의가 없으면 targetMode/태그 기반 기본값을 쓴다. */
function getSkillGridProfile(skillName, skillDef) {
    let profile = SKILL_GRID_DB[skillName];
    if (profile) return profile;
    let mode = skillDef && skillDef.targetMode;
    let isMeleeTag = !!(skillDef && Array.isArray(skillDef.tags) && skillDef.tags.includes('melee'));
    if (mode === 'whirl') return { kind: 'nova', range: 1, radius: 1 };
    if (mode === 'cleave') return isMeleeTag ? { kind: 'arc', range: 1 } : { kind: 'blast', range: 5, radius: 1 };
    if (mode === 'pierce') return { kind: 'line', range: 7 };
    if (mode === 'chain') return { kind: 'chain', range: 5, jump: COMBAT_GRID_CONFIG.chainJumpRange };
    if (mode === 'all') return { kind: 'blast', range: 6, radius: 2 };
    return isMeleeTag ? { kind: 'melee', range: 1 } : { kind: 'blast', range: 6, radius: 0 };
}

/** 기존 targetMode별 부가 타격 감쇄 배율(1타는 항상 1.0). */
function getGridSkillTargetMult(mode, idx) {
    if (idx === 0) return 1;
    if (mode === 'all') return 1;
    if (mode === 'whirl') return idx < 3 ? 0.82 : (idx < 5 ? 0.68 : 0.56);
    if (mode === 'cleave') return 0.72;
    if (mode === 'chain') return Math.max(0.45, 1 - idx * 0.2);
    if (mode === 'pierce') return 0.65;
    return 0.7;
}

/**
 * 범위 프로필이 실제로 덮는 칸 목록을 계산한다(chain 제외 — 연쇄는 칸이 아니라 유닛 간 점프).
 * @param {{kind:string, range:number, radius?:number}} profile
 * @param {{gx:number, gy:number}} attacker
 * @param {{gx:number, gy:number}} target 1차 대상 칸
 * @returns {Array<{gx:number, gy:number}>}
 */
function getGridAttackAreaCells(profile, attacker, target) {
    let cells = [{ gx: target.gx, gy: target.gy }];
    let pushRing = (center, radius, excludeSelf) => {
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                let gx = center.gx + dx, gy = center.gy + dy;
                if (excludeSelf && gx === center.gx && gy === center.gy) continue;
                if (gx === target.gx && gy === target.gy) continue;
                if (isGridCellInBounds(gx, gy)) cells.push({ gx, gy });
            }
        }
    };
    if (profile.kind === 'arc') {
        // 전방 부채꼴: 플레이어와 대상 모두에 인접한 칸까지 휩쓸린다.
        pushRing({ gx: attacker.gx, gy: attacker.gy }, 1, true);
        cells = cells.filter(cell => gridChebyshevDist(cell.gx, cell.gy, target.gx, target.gy) <= 1);
    } else if (profile.kind === 'nova') {
        pushRing({ gx: attacker.gx, gy: attacker.gy }, Math.max(1, profile.radius || 1), true);
    } else if (profile.kind === 'blast') {
        if ((profile.radius || 0) > 0) pushRing({ gx: target.gx, gy: target.gy }, profile.radius, false);
    } else if (profile.kind === 'line') {
        let end = gridProjectedLineEnd(attacker.gx, attacker.gy, target.gx, target.gy, profile.range || 7);
        gridLineCells(attacker.gx, attacker.gy, end.gx, end.gy, profile.range || 7).forEach(cell => cells.push(cell));
    }
    return cells;
}

/** 연쇄 스킬: 1차 대상에서 jump칸 이내 가장 가까운 적으로 targetCount까지 튄다. */
function buildGridChainTargets(profile, targetCount, primaryEnemy, candidates) {
    let jump = Math.max(1, profile.jump || COMBAT_GRID_CONFIG.chainJumpRange);
    let hits = [primaryEnemy];
    let remaining = candidates.filter(enemy => enemy !== primaryEnemy);
    let current = primaryEnemy;
    while (hits.length < targetCount && remaining.length > 0) {
        let bestIdx = -1, bestDist = Infinity;
        remaining.forEach((enemy, idx) => {
            let dist = gridChebyshevDist(current.gx, current.gy, enemy.gx, enemy.gy);
            if (dist <= jump && dist < bestDist) { bestIdx = idx; bestDist = dist; }
        });
        if (bestIdx < 0) break;
        current = remaining.splice(bestIdx, 1)[0];
        hits.push(current);
    }
    return hits;
}

/**
 * 그리드 기반 스킬 대상 선택. 사거리 안의 가장 가까운 적을 1차 대상으로 삼고,
 * 범위 패턴이 덮는 칸의 다른 적을 targets 수까지 함께 타격한다.
 * 사거리 안에 적이 없으면 빈 배열을 반환한다(호출자가 이동 처리).
 * @param {string} skillName SKILL_GRID_DB 키
 * @param {{targets?:number, targetMode?:string}} skill 스킬 정의(레벨 반영본)
 * @param {{gx:number, gy:number}} attackerCell
 * @param {Array<object>} enemies 살아 있는 적 목록
 * @returns {Array<{enemy:object, mult:number}>}
 */
function selectGridSkillTargets(skillName, skill, attackerCell, enemies) {
    if (!attackerCell || !isGridCellInBounds(attackerCell.gx, attackerCell.gy)) return [];
    let profile = getSkillGridProfile(skillName, skill);
    let candidates = (enemies || []).filter(hasGridCell)
        .map(enemy => ({ enemy, dist: gridChebyshevDist(attackerCell.gx, attackerCell.gy, enemy.gx, enemy.gy) }))
        .sort((a, b) => a.dist - b.dist || a.enemy.id - b.enemy.id);
    let primary = candidates.find(row => row.dist <= Math.max(1, profile.range || 1));
    if (!primary) return [];
    let targetCount = Math.max(1, Math.floor(skill.targets || 1));
    let mode = skill.targetMode || 'single';
    let hits;
    if (profile.kind === 'chain') {
        hits = buildGridChainTargets(profile, targetCount, primary.enemy, candidates.map(row => row.enemy));
    } else {
        let areaKeys = new Set(getGridAttackAreaCells(profile, attackerCell, primary.enemy).map(cell => gridCellKey(cell.gx, cell.gy)));
        hits = [primary.enemy];
        candidates.forEach(row => {
            if (hits.length >= targetCount || row.enemy === primary.enemy) return;
            if (areaKeys.has(gridCellKey(row.enemy.gx, row.enemy.gy))) hits.push(row.enemy);
        });
    }
    return hits.map((enemy, idx) => ({ enemy, mult: getGridSkillTargetMult(mode, idx) }));
}

/** 사거리 안 가장 가까운 살아 있는 적(그리드 칸 보유)을 찾는다. range 생략 시 전장 전체. */
function findNearestGridEnemy(fromCell, enemies, range) {
    if (!fromCell) return null;
    let best = null, bestDist = Infinity;
    (enemies || []).forEach(enemy => {
        if (!enemy || enemy.hp <= 0 || !hasGridCell(enemy)) return;
        let dist = gridChebyshevDist(fromCell.gx, fromCell.gy, enemy.gx, enemy.gy);
        if (dist < bestDist && (!Number.isFinite(range) || dist <= range)) { best = enemy; bestDist = dist; }
    });
    return best;
}

safeExposeGlobals({
    isGridCellInBounds, gridCellKey, gridChebyshevDist, hasGridCell,
    getGridBlockedCells, findFreeGridCell, assignEnemyGridSpawn, assignEnemyGridCombatProfile,
    resetPlayerGridPosition, ensureCombatGridRuntime, gridLineCells, gridProjectedLineEnd,
    gridStepToward, advanceGridUnitMovement, getSkillGridProfile, getGridSkillTargetMult,
    getGridAttackAreaCells, selectGridSkillTargets, findNearestGridEnemy
});
