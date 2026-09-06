// 9x8 직교 전장 그리드 도메인.
// 좌표/거리/스폰 배치/이동 스텝/스킬 범위 패턴 해석을 소유한다.
// data(COMBAT_GRID_CONFIG, SKILL_GRID_DB)와 game 상태 shape에만 의존하고 UI/렌더링을 호출하지 않는다.
// 그리드 유닛 계약: { gx: 0~8 정수, gy: 0~7 정수, gridMoveTimer: 초 } — 플레이어(game.gridPlayer),
// 적(game.enemies[i]), 소환수(game.summons[i])가 공유한다.
const GRID_CARDINAL_STEPS = Object.freeze([
    Object.freeze({ dx: -1, dy: 0 }), Object.freeze({ dx: 1, dy: 0 }),
    Object.freeze({ dx: 0, dy: -1 }), Object.freeze({ dx: 0, dy: 1 })
]);

function isGridCellInBounds(gx, gy) {
    return Number.isInteger(gx) && Number.isInteger(gy)
        && gx >= 0 && gy >= 0
        && gx < COMBAT_GRID_CONFIG.columns && gy < COMBAT_GRID_CONFIG.rows;
}

function gridCellKey(gx, gy) {
    return gx + ',' + gy;
}

function gridChebyshevDist(ax, ay, bx, by) {
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function getGridUnitFootprint(unit) {
    let bossSize = COMBAT_GRID_CONFIG.bossFootprint || { columns: 2, rows: 2 };
    return unit && unit.isBoss
        ? { columns: bossSize.columns, rows: bossSize.rows }
        : { columns: 1, rows: 1 };
}

function getGridFootprintCells(gx, gy, footprint) {
    let cells = [];
    for (let dx = 0; dx < footprint.columns; dx++) {
        for (let dy = 0; dy < footprint.rows; dy++) {
            if (isGridCellInBounds(gx + dx, gy + dy)) cells.push({ gx: gx + dx, gy: gy + dy });
        }
    }
    return cells;
}

/** 유닛이 유효한 그리드 칸을 가졌는지 확인한다. */
function hasGridCell(unit) {
    if (!unit || !Number.isInteger(unit.gx) || !Number.isInteger(unit.gy)) return false;
    let footprint = getGridUnitFootprint(unit);
    return getGridFootprintCells(unit.gx, unit.gy, footprint).length === footprint.columns * footprint.rows;
}

function getGridUnitCells(unit) {
    return hasGridCell(unit) ? getGridFootprintCells(unit.gx, unit.gy, getGridUnitFootprint(unit)) : [];
}

function getGridUnitCenter(unit) {
    let footprint = getGridUnitFootprint(unit);
    return { gx: unit.gx + (footprint.columns - 1) / 2, gy: unit.gy + (footprint.rows - 1) / 2 };
}

function getGridUnitDistance(first, second) {
    if (!hasGridCell(first) || !hasGridCell(second)) return Infinity;
    let firstSize = getGridUnitFootprint(first), secondSize = getGridUnitFootprint(second);
    let dx = Math.max(0, second.gx - (first.gx + firstSize.columns - 1), first.gx - (second.gx + secondSize.columns - 1));
    let dy = Math.max(0, second.gy - (first.gy + firstSize.rows - 1), first.gy - (second.gy + secondSize.rows - 1));
    return Math.max(dx, dy);
}

/**
 * 캐릭터와 적 사이 직접 타격의 거리 배율을 계산한다.
 * 1칸은 100%, 이후 한 칸마다 5% 감폭하며 50% 아래로 내려가지 않는다.
 * 그리드 밖의 레거시 전투는 기존 피해를 보존한다.
 */
function getGridDirectHitDistanceMultiplier(first, second) {
    let distance = getGridUnitDistance(first, second);
    if (!Number.isFinite(distance)) return 1;
    let reductionPct = Math.min(50, Math.max(0, distance - 1) * 5);
    return 1 - reductionPct / 100;
}

function getClosestGridUnitCell(from, unit) {
    let footprint = getGridUnitFootprint(unit);
    return {
        gx: Math.max(unit.gx, Math.min(from.gx, unit.gx + footprint.columns - 1)),
        gy: Math.max(unit.gy, Math.min(from.gy, unit.gy + footprint.rows - 1))
    };
}

function canPlaceGridFootprint(blocked, gx, gy, footprint) {
    let cells = getGridFootprintCells(gx, gy, footprint);
    if (cells.length !== footprint.columns * footprint.rows) return false;
    return cells.every(cell => !blocked.has(gridCellKey(cell.gx, cell.gy)));
}

function isGridUnitInCellSet(unit, cellKeys) {
    return getGridUnitCells(unit).some(cell => cellKeys.has(gridCellKey(cell.gx, cell.gy)));
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
        getGridUnitCells(unit).forEach(cell => blocked.add(gridCellKey(cell.gx, cell.gy)));
    };
    addUnit(game.gridPlayer);
    (game.enemies || []).forEach(enemy => { if (enemy && enemy.hp > 0) addUnit(enemy); });
    (game.summons || []).forEach(summon => { if (summon && !summon.isGhost && summon.alive && (summon.hp || 0) > 0) addUnit(summon); });
    return blocked;
}

/**
 * 비어 있는 칸 하나를 고른다. near가 주어지면 그 칸에서 가까운 순으로, 없으면 무작위로 고른다.
 * 전부 막혀 있으면 null을 반환한다(호출자가 배치 실패를 처리).
 * @param {Set<string>} blocked
 * @param {{gx:number, gy:number}} [near]
 * @param {{columns:number, rows:number}} [footprint]
 */
function findFreeGridCell(blocked, near, footprint) {
    let size = footprint || { columns: 1, rows: 1 };
    let free = [];
    for (let gx = 0; gx < COMBAT_GRID_CONFIG.columns; gx++) {
        for (let gy = 0; gy < COMBAT_GRID_CONFIG.rows; gy++) {
            if (canPlaceGridFootprint(blocked, gx, gy, size)) free.push({ gx, gy });
        }
    }
    if (free.length === 0) return null;
    if (!near) return free[Math.floor(Math.random() * free.length)];
    let centerOffsetX = (size.columns - 1) / 2, centerOffsetY = (size.rows - 1) / 2;
    free.sort((a, b) => gridChebyshevDist(a.gx + centerOffsetX, a.gy + centerOffsetY, near.gx, near.gy)
        - gridChebyshevDist(b.gx + centerOffsetX, b.gy + centerOffsetY, near.gx, near.gy));
    return free[0];
}

/**
 * 스폰되는 적에게 그리드 칸을 배정한다. 보스는 고정 스폰 칸(점유 시 그 주변)에,
 * 일반/정예는 빈 칸 중 무작위로 배치된다. 배정한 칸은 blocked에 추가한다.
 * @param {object} enemy createEnemy 결과
 * @param {Set<string>} blocked 이번 스폰 동안 누적되는 점유 집합
 */
function assignEnemyGridSpawn(enemy, blocked) {
    let footprint = getGridUnitFootprint(enemy);
    let bossSpawnFree = canPlaceGridFootprint(blocked, COMBAT_GRID_CONFIG.bossSpawn.gx, COMBAT_GRID_CONFIG.bossSpawn.gy, footprint);
    let cell = enemy.isBoss
        ? (!bossSpawnFree
            ? findFreeGridCell(blocked, COMBAT_GRID_CONFIG.bossSpawn, footprint)
            : { gx: COMBAT_GRID_CONFIG.bossSpawn.gx, gy: COMBAT_GRID_CONFIG.bossSpawn.gy })
        : findFreeGridCell(blocked);
    if (!cell) cell = { gx: COMBAT_GRID_CONFIG.bossSpawn.gx, gy: COMBAT_GRID_CONFIG.bossSpawn.gy };
    enemy.gx = cell.gx;
    enemy.gy = cell.gy;
    enemy.gridMoveTimer = 0;
    getGridFootprintCells(cell.gx, cell.gy, footprint).forEach(occupied => blocked.add(gridCellKey(occupied.gx, occupied.gy)));
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
 * 목표 칸을 향한 최단 우회로를 찾아 상하좌우로 한 칸 전진시킨다.
 * 점유 칸은 통과하지 못하고 대각선 이동은 허용하지 않는다.
 * @returns {boolean} 실제로 이동했는지
 */
function gridStepToward(unit, tx, ty, blocked) {
    if (!hasGridCell(unit)) return false;
    let footprint = getGridUnitFootprint(unit);
    let distanceFromPlacement = (gx, gy) => {
        let nearest = getClosestGridUnitCell({ gx: tx, gy: ty }, { gx, gy, isBoss: footprint.columns > 1 || footprint.rows > 1 });
        return gridChebyshevDist(nearest.gx, nearest.gy, tx, ty);
    };
    let start = { gx: unit.gx, gy: unit.gy, first: null };
    let best = start;
    let bestCheb = distanceFromPlacement(start.gx, start.gy);
    let bestMan = Math.abs(getGridUnitCenter(unit).gx - tx) + Math.abs(getGridUnitCenter(unit).gy - ty);
    let queue = [start];
    let visited = new Set([gridCellKey(start.gx, start.gy)]);
    while (queue.length > 0) {
        let current = queue.shift();
        GRID_CARDINAL_STEPS.forEach(direction => {
            let gx = current.gx + direction.dx, gy = current.gy + direction.dy;
            let key = gridCellKey(gx, gy);
            if (visited.has(key) || !canPlaceGridFootprint(blocked, gx, gy, footprint)) return;
            let next = { gx, gy, first: current.first || { gx, gy } };
            let cheb = distanceFromPlacement(gx, gy);
            let man = Math.abs(gx + (footprint.columns - 1) / 2 - tx)
                + Math.abs(gy + (footprint.rows - 1) / 2 - ty);
            if (cheb < bestCheb || (cheb === bestCheb && man < bestMan)) {
                best = next; bestCheb = cheb; bestMan = man;
            }
            visited.add(key);
            queue.push(next);
        });
    }
    if (!best.first) return false;
    unit.gx = best.first.gx;
    unit.gy = best.first.gy;
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

function findNearestSafeGridRoute(unit, hazardCells) {
    if (!hasGridCell(unit)) return null;
    let danger = new Set((hazardCells || [])
        .filter(cell => hasGridCell(cell))
        .map(cell => gridCellKey(cell.gx, cell.gy)));
    let blocked = getGridBlockedCells(unit);
    let start = { gx: unit.gx, gy: unit.gy, first: null, distance: 0 };
    let queue = [start];
    let visited = new Set([gridCellKey(start.gx, start.gy)]);
    while (queue.length > 0) {
        let current = queue.shift();
        let currentKey = gridCellKey(current.gx, current.gy);
        if (!danger.has(currentKey)) {
            return { next: current.first, destination: { gx: current.gx, gy: current.gy }, distance: current.distance };
        }
        GRID_CARDINAL_STEPS.forEach(direction => {
            let gx = current.gx + direction.dx, gy = current.gy + direction.dy;
            let key = gridCellKey(gx, gy);
            if (!isGridCellInBounds(gx, gy) || visited.has(key) || blocked.has(key)) return;
            let first = current.first || { gx, gy };
            visited.add(key);
            queue.push({ gx, gy, first, distance: current.distance + 1 });
        });
    }
    return null;
}

/** 경고된 함정 칸에서 가장 가까운 안전 칸을 향해 상하좌우로 한 칸씩 탈출한다. */
function advanceGridHazardEscape(unit, hazardCells, dtSec, intervalSec) {
    let route = findNearestSafeGridRoute(unit, hazardCells);
    if (!route) return { moved: false, safe: false, blocked: true };
    if (route.distance === 0) return { moved: false, safe: true, blocked: false, distance: 0 };
    let interval = Number.isFinite(intervalSec) && intervalSec > 0 ? intervalSec : COMBAT_GRID_CONFIG.playerMoveIntervalSec;
    unit.gridMoveTimer = (Number(unit.gridMoveTimer) || 0) + Math.max(0, Number(dtSec) || 0);
    if (unit.gridMoveTimer < interval) return { moved: false, safe: false, blocked: false, distance: route.distance };
    let from = { gx: unit.gx, gy: unit.gy };
    unit.gx = route.next.gx;
    unit.gy = route.next.gy;
    unit.gridMoveTimer = 0;
    return {
        moved: true,
        safe: route.distance === 1,
        blocked: false,
        distance: Math.max(0, route.distance - 1),
        from,
        to: { gx: unit.gx, gy: unit.gy }
    };
}

function findGridRetreatCell(unit, target, maxRange, previousCell) {
    let blocked = getGridBlockedCells(unit);
    let footprint = getGridUnitFootprint(unit);
    let currentDist = getGridUnitDistance(unit, target);
    let best = null, bestScore = currentDist;
    GRID_CARDINAL_STEPS.forEach(direction => {
        let gx = unit.gx + direction.dx, gy = unit.gy + direction.dy;
        if (!canPlaceGridFootprint(blocked, gx, gy, footprint)) return;
        let distance = getGridUnitDistance({ gx, gy, isBoss: unit.isBoss }, target);
        if (distance <= currentDist || distance > maxRange) return;
        let backtrack = previousCell && gx === previousCell.gx && gy === previousCell.gy;
        let score = distance - (backtrack ? 0.25 : 0);
        if (score > bestScore) { best = { gx, gy }; bestScore = score; }
    });
    return best;
}

/** 사거리 안 전술 재배치를 한 칸만 수행한다. */
function advanceGridTacticalMovement(unit, target, options) {
    if (!hasGridCell(unit) || !hasGridCell(target)) return { moved: false };
    let config = options || {};
    let interval = Number(config.intervalSec) > 0 ? Number(config.intervalSec) : COMBAT_GRID_CONFIG.playerMoveIntervalSec;
    unit.gridMoveTimer = (Number(unit.gridMoveTimer) || 0) + Math.max(0, Number(config.dtSec) || 0);
    if (unit.gridMoveTimer < interval) return { moved: false };
    let from = { gx: unit.gx, gy: unit.gy };
    let moved = false;
    if (config.direction === 'away') {
        let cell = findGridRetreatCell(unit, target, Math.max(1, Number(config.maxRange) || 1), config.previousCell);
        if (cell) { unit.gx = cell.gx; unit.gy = cell.gy; moved = true; }
    } else {
        moved = gridStepToward(unit, target.gx, target.gy, getGridBlockedCells(unit));
    }
    unit.gridMoveTimer = moved ? 0 : interval;
    return { moved, from, to: { gx: unit.gx, gy: unit.gy }, retreat: moved && config.direction === 'away' };
}

/** 스킬 젬의 그리드 범위 프로필을 조회한다. 정의가 없으면 targetMode/태그 기반 기본값을 쓴다. */
function getSkillGridProfile(skillName, skillDef) {
    let profile = SKILL_GRID_DB[skillName];
    let pattern = skillDef && skillDef.projectilePattern;
    if (profile && pattern && pattern.kind) {
        let resolved = { ...profile, kind: pattern.kind };
        if (pattern.kind === 'fan') resolved.rays = Math.max(1, Math.min(8, Math.floor(Number(pattern.rays) || profile.rays || 1)));
        return resolved;
    }
    if (profile) return profile;
    let mode = skillDef && skillDef.targetMode;
    let isMeleeTag = !!(skillDef && Array.isArray(skillDef.tags) && skillDef.tags.includes('melee'));
    if (mode === 'whirl') return { kind: 'nova', range: 1, radius: 1 };
    if (mode === 'cleave') return isMeleeTag ? { kind: 'arc', range: 1 } : { kind: 'blast', range: 4, radius: 1 };
    if (mode === 'pierce') return { kind: 'line', range: 6 };
    if (mode === 'chain') return { kind: 'chain', range: 4, jump: COMBAT_GRID_CONFIG.chainJumpRange };
    if (mode === 'all') return { kind: 'blast', range: 5, radius: 2 };
    return isMeleeTag ? { kind: 'melee', range: 1 } : { kind: 'blast', range: 5, radius: 0 };
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

function isGridAreaOffset(shape, dx, dy, radius) {
    let ax = Math.abs(dx), ay = Math.abs(dy);
    // Cell centers inside the radius + half-cell edge belong to a filled circular area.
    if (shape === 'circle') return dx * dx + dy * dy <= (radius + 0.5) ** 2;
    if (shape === 'square') return Math.max(ax, ay) <= radius;
    if (shape === 'cross') return (dx === 0 || dy === 0) && Math.max(ax, ay) <= radius;
    if (shape === 'diagonal') return ax === ay && ax <= radius;
    if (shape === 'ring') return Math.max(ax, ay) === 0 || ax + ay === radius;
    return ax + ay <= radius;
}

/** Filled breath triangle in grid coordinates; range is the centerline's Chebyshev reach.
 * @returns {{x:number,y:number,dx:number,dy:number,length:number,halfWidth:number,vertices:Array<{gx:number,gy:number}>}}
 */
function getGridConeGeometry(profile, attacker, target) {
    let dx = target.gx - attacker.gx, dy = target.gy - attacker.gy;
    let distance = Math.hypot(dx, dy);
    if (distance === 0) { dx = 1; distance = 1; }
    dx /= distance; dy /= distance;
    let length = (profile.range + 0.5) / Math.max(Math.abs(dx), Math.abs(dy));
    let halfWidth = length * 0.6;
    let endX = attacker.gx + dx * length, endY = attacker.gy + dy * length;
    return { x: attacker.gx, y: attacker.gy, dx, dy, length, halfWidth, vertices: [
        { gx: attacker.gx, gy: attacker.gy },
        { gx: endX - dy * halfWidth, gy: endY + dx * halfWidth },
        { gx: endX + dy * halfWidth, gy: endY - dx * halfWidth }
    ] };
}

/** Select cell centers within the same triangle used by the renderer, including gaps between rays. */
function getGridConeAreaCells(profile, attacker, target) {
    let cone = getGridConeGeometry(profile, attacker, target);
    let cells = [];
    for (let gx = 0; gx < COMBAT_GRID_CONFIG.columns; gx++) {
        for (let gy = 0; gy < COMBAT_GRID_CONFIG.rows; gy++) {
            let dx = gx - cone.x, dy = gy - cone.y;
            let forward = dx * cone.dx + dy * cone.dy;
            let side = Math.abs(dx * cone.dy - dy * cone.dx);
            if (forward > 0 && forward <= cone.length && side <= forward * 0.6) cells.push({ gx, gy });
        }
    }
    return cells;
}

function getGridFanDirections(attacker, target, rayCount) {
    let ring = [{ gx: 1, gy: 0 }, { gx: 1, gy: 1 }, { gx: 0, gy: 1 }, { gx: -1, gy: 1 },
        { gx: -1, gy: 0 }, { gx: -1, gy: -1 }, { gx: 0, gy: -1 }, { gx: 1, gy: -1 }];
    let aimX = Math.sign(target.gx - attacker.gx), aimY = Math.sign(target.gy - attacker.gy);
    let center = ring.findIndex(direction => direction.gx === aimX && direction.gy === aimY);
    if (center < 0) center = 0;
    let offsets = [0, -1, 1, -2, 2, -3, 3, 4];
    return offsets.slice(0, Math.max(1, Math.min(8, rayCount))).map(offset => ring[(center + offset + 8) % 8]);
}

function getGridDiagonalAttackDirection(attacker, target) {
    let diagonalCell = getGridUnitCells(target).filter(cell => {
        let dx = cell.gx - attacker.gx, dy = cell.gy - attacker.gy;
        return dx !== 0 && dy !== 0 && Math.abs(dx) === Math.abs(dy);
    }).sort((a, b) => gridChebyshevDist(attacker.gx, attacker.gy, a.gx, a.gy)
        - gridChebyshevDist(attacker.gx, attacker.gy, b.gx, b.gy))[0];
    if (!diagonalCell) return null;
    return { gx: Math.sign(diagonalCell.gx - attacker.gx), gy: Math.sign(diagonalCell.gy - attacker.gy) };
}

function isGridUnitOnDiagonalRay(attacker, unit, direction) {
    return getGridUnitCells(unit).some(cell => {
        let dx = cell.gx - attacker.gx, dy = cell.gy - attacker.gy;
        return dx !== 0 && Math.abs(dx) === Math.abs(dy)
            && Math.sign(dx) === direction.gx && Math.sign(dy) === direction.gy;
    });
}

/**
 * 범위 프로필이 실제로 덮는 칸 목록을 계산한다(chain 제외 — 연쇄는 칸이 아니라 유닛 간 점프).
 * @param {{kind:string, range:number, radius?:number, shape?:string}} profile
 * @param {{gx:number, gy:number}} attacker
 * @param {{gx:number, gy:number}} target 1차 대상 칸
 * @returns {Array<{gx:number, gy:number}>}
 */
function getGridAttackAreaCells(profile, attacker, target) {
    let targetCell = getClosestGridUnitCell(attacker, target);
    if (profile.kind === 'cone') return getGridConeAreaCells(profile, attacker, targetCell);
    let cells = ['nova', 'fan'].includes(profile.kind) ? [] : [{ gx: targetCell.gx, gy: targetCell.gy }];
    let pushArea = (center, radius, excludeSelf, shape) => {
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                let gx = center.gx + dx, gy = center.gy + dy;
                if (excludeSelf && gx === center.gx && gy === center.gy) continue;
                if (!isGridAreaOffset(shape, dx, dy, radius)) continue;
                if (profile.kind !== 'nova' && gx === targetCell.gx && gy === targetCell.gy) continue;
                if (isGridCellInBounds(gx, gy)) cells.push({ gx, gy });
            }
        }
    };
    if (profile.kind === 'arc') {
        // 전방 부채꼴: 플레이어와 대상 모두에 인접한 칸까지 휩쓸린다.
        pushArea({ gx: attacker.gx, gy: attacker.gy }, 1, true, 'diamond');
        cells = cells.filter(cell => gridChebyshevDist(cell.gx, cell.gy, targetCell.gx, targetCell.gy) <= 1);
    } else if (profile.kind === 'nova') {
        pushArea({ gx: attacker.gx, gy: attacker.gy }, Math.max(1, profile.radius || 1), true, profile.shape);
    } else if (profile.kind === 'blast') {
        if ((profile.radius || 0) > 0) pushArea(targetCell, profile.radius, false, profile.shape);
    } else if (profile.kind === 'line') {
        let end = gridProjectedLineEnd(attacker.gx, attacker.gy, targetCell.gx, targetCell.gy, profile.range || 7);
        gridLineCells(attacker.gx, attacker.gy, end.gx, end.gy, profile.range || 7).forEach(cell => cells.push(cell));
    } else if (profile.kind === 'fan') {
        getGridFanDirections(attacker, targetCell, profile.rays || 3).forEach(direction => {
            let end = { gx: attacker.gx + direction.gx * profile.range, gy: attacker.gy + direction.gy * profile.range };
            gridLineCells(attacker.gx, attacker.gy, end.gx, end.gy, profile.range).forEach(cell => cells.push(cell));
        });
    }
    return cells;
}

/** Snapshot potential attack geometry at cast time; rendering never recomputes it from victims.
 * @param {string} skillName
 * @param {(typeof SKILL_DB)[string]} skill Resolved skill, including range modifiers.
 * @param {{targets:Array<{enemy:{gx:number,gy:number}}>,impactCells?:Array<{gx:number,gy:number}>}} stage Nonempty confirmed stage.
 * @param {{gx:number,gy:number}} source Cast-time origin.
 * @returns {{cells:Array<{gx:number,gy:number}>,shape:string|undefined,radius:number|undefined,cone:ReturnType<typeof getGridConeGeometry>|null,center:{gx:number,gy:number}}}
 */
function getSkillStageFootprint(skillName, skill, stage, source) {
    let primary = stage.aimCell || stage.targets[0].enemy;
    let profile = stage.gridProfile || getSkillGridProfile(skillName, skill);
    let cells = stage.impactCells;
    if (!cells) cells = getGridAttackAreaCells(profile, source, primary);
    // Melee spill can select additional cells outside the base profile.
    if (['melee', 'arc', 'chain'].includes(profile.kind)) {
        cells = cells.concat(stage.targets.flatMap(entry => getGridUnitCells(entry.enemy)));
    }
    return { cells: Array.from(new Map(cells.map(cell => [`${cell.gx},${cell.gy}`, { gx: cell.gx, gy: cell.gy }])).values()),
        shape: profile.shape, radius: profile.radius,
        cone: profile.kind === 'cone' ? getGridConeGeometry(profile, source, getClosestGridUnitCell(source, primary)) : null,
        center: profile.kind === 'nova' ? { ...source } : { ...getClosestGridUnitCell(source, primary) } };
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
            let dist = getGridUnitDistance(profile.fork ? primaryEnemy : current, enemy);
            if (dist <= jump && dist < bestDist) { bestIdx = idx; bestDist = dist; }
        });
        if (bestIdx < 0) break;
        current = remaining.splice(bestIdx, 1)[0];
        hits.push(current);
    }
    return hits;
}

function compareGridCandidateTie(a, b) {
    if (a.dist !== b.dist) return a.dist - b.dist;
    let aId = Number(a.enemy.id), bId = Number(b.enemy.id);
    if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId;
    return String(a.enemy.id).localeCompare(String(b.enemy.id));
}

function getGridDangerScore(enemy) {
    if (enemy && enemy.isBoss) return 3;
    if (enemy && (enemy.isElite || enemy.elite)) return 2;
    return enemy && enemy.attackKind === 'ranged' ? 1 : 0;
}

function getGridDensityScore(candidate, candidates, profile, attackerCell) {
    let cells = getGridAttackAreaCells(profile, attackerCell, candidate.enemy);
    let areaKeys = new Set(cells.map(cell => gridCellKey(cell.gx, cell.gy)));
    return candidates.reduce((count, row) => count + (isGridUnitInCellSet(row.enemy, areaKeys) ? 1 : 0), 0);
}

function selectGridPrimaryCandidate(candidates, profile, attackerCell, options) {
    let inRange = candidates.filter(row => row.dist <= Math.max(1, profile.range || 1));
    if (inRange.length === 0) return null;
    let preferredId = options && options.preferredEnemyId;
    let preferred = inRange.find(row => String(row.enemy.id) === String(preferredId));
    if (preferred) return preferred;
    let priority = options && options.targetPriority;
    if (priority === 'weakest') {
        return inRange.slice().sort((a, b) => {
            let aRatio = Math.max(0, Number(a.enemy.hp) || 0) / Math.max(1, Number(a.enemy.maxHp) || 1);
            let bRatio = Math.max(0, Number(b.enemy.hp) || 0) / Math.max(1, Number(b.enemy.maxHp) || 1);
            return aRatio - bRatio || compareGridCandidateTie(a, b);
        })[0];
    }
    if (priority === 'dangerous') {
        return inRange.slice().sort((a, b) => getGridDangerScore(b.enemy) - getGridDangerScore(a.enemy) || compareGridCandidateTie(a, b))[0];
    }
    if (priority === 'dense') {
        return inRange.slice().sort((a, b) => getGridDensityScore(b, inRange, profile, attackerCell)
            - getGridDensityScore(a, inRange, profile, attackerCell) || compareGridCandidateTie(a, b))[0];
    }
    return inRange[0];
}

/**
 * 그리드 기반 스킬 대상 선택. 사거리 안의 가장 가까운 적을 1차 대상으로 삼고,
 * 범위 패턴이 덮는 칸의 다른 적을 targets 수까지 함께 타격한다.
 * 사거리 안에 적이 없으면 빈 배열을 반환한다(호출자가 이동 처리).
 * @param {string} skillName SKILL_GRID_DB 키
 * @param {{targets?:number, targetMode?:string}} skill 스킬 정의(레벨 반영본)
 * @param {{gx:number, gy:number}} attackerCell
 * @param {Array<object>} enemies 살아 있는 적 목록
 * @param {{targetPriority?:string, preferredEnemyId?:number|string}} [options]
 * @returns {Array<{enemy:object, mult:number}>}
 */
function selectGridSkillTargets(skillName, skill, attackerCell, enemies, options) {
    if (!attackerCell || !isGridCellInBounds(attackerCell.gx, attackerCell.gy)) return [];
    let profile = getSkillGridProfile(skillName, skill);
    let candidates = (enemies || []).filter(hasGridCell)
        .map(enemy => ({ enemy, dist: getGridUnitDistance(attackerCell, enemy) }))
        .sort(compareGridCandidateTie);
    let primary = selectGridPrimaryCandidate(candidates, profile, attackerCell, options);
    if (!primary) return [];
    let orderedCandidates = [primary].concat(candidates.filter(row => row !== primary));
    let targetCount = Math.max(1, Math.floor(skill.targets || 1));
    let mode = skill.targetMode || 'single';
    let hits;
    if (profile.kind === 'chain') {
        hits = buildGridChainTargets(profile, targetCount, primary.enemy, orderedCandidates.map(row => row.enemy));
    } else if (profile.kind === 'fan') {
        let primaryCell = getClosestGridUnitCell(attackerCell, primary.enemy);
        hits = getGridFanDirections(attackerCell, primaryCell, profile.rays || 3).map(direction => {
            let match = orderedCandidates.find(row => {
                return getGridUnitCells(row.enemy).some(cell => {
                    let dx = cell.gx - attackerCell.gx, dy = cell.gy - attackerCell.gy;
                    let steps = direction.gx !== 0 ? dx / direction.gx : dy / direction.gy;
                    return Number.isInteger(steps) && steps >= 1 && steps <= profile.range
                        && attackerCell.gx + direction.gx * steps === cell.gx
                        && attackerCell.gy + direction.gy * steps === cell.gy;
                });
            });
            return match && match.enemy;
        }).filter(Boolean).slice(0, targetCount);
    } else {
        let areaKeys = new Set(getGridAttackAreaCells(profile, attackerCell, primary.enemy).map(cell => gridCellKey(cell.gx, cell.gy)));
        hits = orderedCandidates.filter(row => isGridUnitInCellSet(row.enemy, areaKeys))
            .slice(0, targetCount).map(row => row.enemy);
    }
    if (profile.kind === 'melee' || profile.kind === 'arc') {
        let spillCandidates = orderedCandidates.map(row => row.enemy);
        let diagonalDirection = profile.kind === 'melee'
            ? getGridDiagonalAttackDirection(attackerCell, primary.enemy) : null;
        if (diagonalDirection) {
            spillCandidates = spillCandidates.filter(enemy => isGridUnitOnDiagonalRay(attackerCell, enemy, diagonalDirection));
        }
        extendGridTargetsBySpill(hits, targetCount, spillCandidates);
    }
    let fanDamage = skill.projectilePattern && skill.projectilePattern.kind === 'fan'
        ? Math.max(0, Number(skill.extraProjectileDamagePct) || PROJECTILE_BONUS_SHOT_DAMAGE_PCT) / 100 : null;
    return hits.map((enemy, idx) => ({ enemy, mult: fanDamage !== null && idx > 0 ? fanDamage : getGridSkillTargetMult(mode, idx) }));
}

const SKILL_HIT_SEQUENCE_CONFIG = Object.freeze({
    whirlIntervalMs: 80,
    chainIntervalMs: 110,
    pierceIntervalMs: 30,
    slamAftershockDelayMs: 360,
    slamAftershockDamagePct: 32
});

function getSkillHitSequenceProfile(skillName, skill) {
    let tags = skill && Array.isArray(skill.tags) ? skill.tags : [];
    let mode = skill && skill.targetMode;
    if (mode === 'whirl') return { kind: 'whirl', intervalMs: SKILL_HIT_SEQUENCE_CONFIG.whirlIntervalMs };
    if (mode === 'chain') return { kind: 'chain', intervalMs: SKILL_HIT_SEQUENCE_CONFIG.chainIntervalMs, fork: getSkillGridProfile(skillName, skill).fork };
    let gridProfile = getSkillGridProfile(skillName, skill || {});
    if (mode === 'pierce' || (gridProfile && gridProfile.kind === 'line')) return { kind: 'pierce', intervalMs: SKILL_HIT_SEQUENCE_CONFIG.pierceIntervalMs };
    if (tags.includes('slam')) {
        return {
            kind: 'slam',
            delayMs: Math.max(120, Math.floor(Number(skill.aftershockDelayMs) || SKILL_HIT_SEQUENCE_CONFIG.slamAftershockDelayMs)),
            damageMultiplier: Math.max(0, Number(skill.aftershockDamagePct) || SKILL_HIT_SEQUENCE_CONFIG.slamAftershockDamagePct) / 100
        };
    }
    return { kind: 'instant' };
}

function sortSkillHitTargetsByDistance(targets) {
    let attacker = (typeof game !== 'undefined' && game.gridPlayer) ? game.gridPlayer : null;
    return targets.slice().sort((a, b) => {
        if (!attacker || !a.enemy || !b.enemy) return 0;
        return getGridUnitDistance(attacker, a.enemy) - getGridUnitDistance(attacker, b.enemy);
    });
}

function getSkillChainDamageMultiplier(skill, jumpIndex) {
    let stepPct = Number(skill && skill.chainStepDamagePct) || 0;
    return Math.max(0.1, 1 + Math.max(0, jumpIndex) * stepPct / 100);
}

function getGridUnitDistanceFromCell(origin, unit) {
    if (!origin || !unit) return 0;
    return getGridUnitCells(unit).reduce((closest, cell) => Math.min(closest,
        Math.hypot(cell.gx - origin.gx, cell.gy - origin.gy)), Infinity);
}

function buildRadialBurstHitSequence(skillName, skill, targets, attacker, primary) {
    if (!attacker || !primary) return null;
    let gridProfile = getSkillGridProfile(skillName, skill);
    let center = gridProfile.kind === 'nova' ? { ...attacker } : getClosestGridUnitCell(attacker, primary);
    let radius = Math.max(1, Number(gridProfile && gridProfile.radius) || 1);
    let msPerCell = Math.max(50, Math.floor(Number(skill.combatPattern.waveMsPerCell) || 90));
    let waveDurationMs = Math.round((gridProfile.shape === 'circle' ? radius + 0.5 : radius) * msPerCell);
    let groups = new Map();
    targets.forEach(entry => {
        let distance = getGridWaveDistance(center, entry.enemy, gridProfile.shape);
        let delayMs = Math.round(distance * msPerCell);
        if (!groups.has(delayMs)) groups.set(delayMs, []);
        groups.get(delayMs).push(entry);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]).map(([delayMs, rows], index) => ({
        kind: 'radialBurstWave', label: `서리 파동 ${index + 1}단계`,
        delayMs, damageMultiplier: 1, singleRepeat: true,
        aimCell: center, waveDurationMs, targets: rows
    }));
}

/** Targeted impact followed by a fixed ground eruption, even if the first victim dies or moves. */
function buildEarthSpikeHitSequence(skill, targets, primary, impactCells) {
    let shock = Math.max(0, Number(skill.aftershockDamagePct)) / 100;
    let aimCell = getClosestGridUnitCell(game.gridPlayer, primary);
    return [
        { kind: 'slamPrimary', label: '내려찍기', delayMs: 0, damageMultiplier: 1 - shock,
            targets: targets.slice(0, 1), aimCell, impactCells: getGridUnitCells(primary) },
        { kind: 'earthSpikes', label: '지진 쐐기', delayMs: skill.aftershockDelayMs, damageMultiplier: shock,
            singleRepeat: true, delivery: 'magicCell', targetLimit: skill.targets, targets, aimCell, impactCells }
    ];
}

/** Wavefront timing follows the same diamond/circular metric as its drawn expansion. */
function getGridWaveDistance(center, unit, shape) {
    if (shape !== 'diamond') return getGridUnitDistanceFromCell(center, unit);
    return Math.min(...getGridUnitCells(unit).map(cell => Math.abs(cell.gx-center.gx)+Math.abs(cell.gy-center.gy)));
}

/** Authored phases share one frozen aim; each phase owns its collision and visual geometry.
 * @param {string} skillName
 * @param {(typeof SKILL_DB)[string]} skill
 * @param {Array<{enemy:{id:number,gx:number,gy:number,hp:number},mult:number}>} targets Nonempty cast selection.
 * @returns {Array<{kind:string,label:string,delayMs:number,damageMultiplier:number,delivery:string,singleRepeat:boolean,targetLimit:number,targets:typeof targets,aimCell:{gx:number,gy:number},gridProfile:ReturnType<typeof getSkillGridProfile>,impactCells:Array<{gx:number,gy:number}>,element:string|undefined,skipGridControl:boolean|undefined}>}
 */
function buildAuthoredSkillHitSequence(skillName, skill, targets) {
    let source = game.gridPlayer;
    let aimCell = getClosestGridUnitCell(source, targets[0].enemy);
    let base = getSkillGridProfile(skillName, skill);
    return skill.combatPattern.stages.map(phase => {
        let gridProfile = { ...base, ...phase.grid };
        return { kind: 'authored', label: phase.label, delayMs: phase.delayMs,
            damageMultiplier: phase.damagePct / 100, singleRepeat: true, delivery: 'magicCell',
            targetLimit: skill.targets, targets, aimCell: { ...aimCell }, gridProfile,
            impactCells: getGridAttackAreaCells(gridProfile, source, aimCell),
            element: phase.element, skipGridControl: phase.skipGridControl };
    });
}

function buildMeteorSkillHitSequence(pattern, impactCells, targets) {
    let groundHits = Math.max(1, Math.min(5, Math.floor(Number(pattern.groundHits) || 3)));
    let groundIntervalMs = Math.max(160, Math.floor(Number(pattern.groundIntervalMs) || 600));
    let groundDamageMultiplier = Math.max(0.01, Number(pattern.groundDamagePct) || 8) / 100;
    let impact = {
        kind: 'meteorImpact', label: '유성 충돌', delayMs: 0,
        damageMultiplier: 1, impactCells, targets
    };
    let ground = Array.from({ length: groundHits }, (_, idx) => ({
        kind: 'meteorGroundTick', label: `불길 지대 ${idx + 1}회`,
        delayMs: (idx + 1) * groundIntervalMs,
        damageMultiplier: groundDamageMultiplier, singleRepeat: true,
        primaryAilmentChance: idx === 0 ? 1 : undefined, impactCells, targets
    }));
    return [impact, ...ground];
}

function buildConfiguredSkillHitSequence(skillName, skill, targets) {
    let pattern = skill && skill.combatPattern;
    if (!pattern) return null;
    if (pattern.kind === 'authored') return buildAuthoredSkillHitSequence(skillName, skill, targets);
    let intervalMs = Math.max(40, Math.floor(Number(pattern.intervalMs) || 160));
    let attacker = (typeof game !== 'undefined' && game.gridPlayer) ? game.gridPlayer : null;
    let primary = targets[0].enemy;
    let impactCells = attacker && primary
        ? getGridAttackAreaCells(getSkillGridProfile(skillName, skill), attacker, primary) : [];
    if (pattern.kind === 'earthSpikes') return buildEarthSpikeHitSequence(skill, targets, primary, impactCells);
    if (pattern.kind === 'radialBurst') {
        return buildRadialBurstHitSequence(skillName, skill, targets, attacker, primary);
    }
    if (pattern.kind === 'meteor') return buildMeteorSkillHitSequence(pattern, impactCells, targets);
    if (pattern.kind === 'field') {
        let hits = Math.max(1, Math.min(12, Math.floor(Number(pattern.hits) || 1)));
        let damageMultiplier = Math.max(0.01, Number(pattern.damagePct) || 100) / 100;
        return Array.from({ length: hits }, (_, idx) => ({
            kind: idx === 0 ? 'fieldStart' : 'fieldTick', label: `장판 ${idx + 1}회`,
            delayMs: idx * intervalMs, damageMultiplier, singleRepeat: true, delivery: 'magicCell', impactCells, targets
        }));
    }
    if (pattern.kind === 'mine') {
        let delayMs = Math.max(120, Math.floor(Number(pattern.armDelayMs) || 420));
        return [{
            kind: 'mineDetonate', label: '룬 지뢰 폭발', delayMs,
            damageMultiplier: 1, singleRepeat: true, impactCells, targets
        }];
    }
    if (pattern.kind === 'channel') {
        let hits = Math.max(2, Math.min(8, Math.floor(Number(pattern.hits) || 3)));
        let damageMultiplier = Math.max(0.01, Number(pattern.damagePct) || 100) / 100;
        return Array.from({ length: hits }, (_, idx) => ({
            kind: idx === 0 ? 'channelStart' : 'channelTick', label: `집중 ${idx + 1}회`,
            delayMs: idx * intervalMs, damageMultiplier, singleRepeat: true, impactCells, targets
        }));
    }
    if (pattern.kind !== 'moving') return null;
    return sortSkillHitTargetsByDistance(targets).map((entry, idx, ordered) => ({
        kind: idx === 0 ? 'movingStart' : 'movingStep', label: `이동 파동 ${idx + 1}칸`,
        delayMs: idx * intervalMs, damageMultiplier: 1,
        chainFromEnemyId: idx > 0 ? ordered[idx - 1].enemy.id : null,
        targets: [entry]
    }));
}

function buildPierceSkillHitSequence(profile, skill, targets) {
    let ordered = sortSkillHitTargetsByDistance(targets);
    let boomerang = skill && skill.combatPattern && skill.combatPattern.kind === 'boomerang';
    let outbound = ordered.map((entry, idx) => ({
        kind: idx === 0 ? 'piercePrimary' : 'pierceThrough',
        label: idx === 0 ? '관통 직격' : `${idx + 1}번째 관통`,
        delayMs: idx * profile.intervalMs, damageMultiplier: 1,
        chainFromEnemyId: idx > 0 ? ordered[idx - 1].enemy.id : null,
        targets: [entry]
    }));
    if (!boomerang) return outbound;
    let returnDelay = Math.max(80, Math.floor(Number(skill.combatPattern.returnDelayMs) || 160));
    let returnStart = Math.max(0, ordered.length - 1) * profile.intervalMs + returnDelay;
    return [{
        kind: 'boomerangOutbound', label: '관통 왕복', delayMs: 0, damageMultiplier: 0.5,
        chainFromEnemyId: null, targets: ordered
    }, {
        kind: 'boomerangReturn', label: '귀환 타격', delayMs: returnStart, damageMultiplier: 0.5,
        chainFromEnemyId: ordered.at(-1).enemy.id, targets: ordered.slice().reverse()
    }];
}

/** 한 번의 스킬 사용을 실제 시간차가 있는 타격 단계로 분해한다. */
function buildSkillHitSequence(skillName, skill, targetEntries) {
    let targets = (targetEntries || []).filter(entry => entry && entry.enemy && entry.enemy.hp > 0);
    if (targets.length <= 0) return [];
    let configured = buildConfiguredSkillHitSequence(skillName, skill, targets);
    if (configured) return configured;
    let profile = getSkillHitSequenceProfile(skillName, skill || {});
    if (profile.kind === 'whirl') {
        return targets.map((entry, idx) => ({
            kind: idx === 0 ? 'whirlPrimary' : 'whirlSweep',
            label: idx === 0 ? '회전 시작' : `회전 ${idx + 1}타`,
            delayMs: idx * profile.intervalMs,
            damageMultiplier: 1,
            targets: [entry]
        }));
    }
    if (profile.kind === 'chain') {
        return targets.map((entry, idx) => ({
            kind: idx === 0 ? 'chainPrimary' : 'chainJump',
            label: idx === 0 ? '1차 공격' : `${idx + 1}차 연쇄`,
            delayMs: (profile.fork ? Math.min(1, idx) : idx) * profile.intervalMs,
            damageMultiplier: getSkillChainDamageMultiplier(skill, idx),
            chainFromEnemyId: idx > 0 ? targets[profile.fork ? 0 : idx - 1].enemy.id : null,
            targets: [entry]
        }));
    }
    if (profile.kind === 'pierce') {
        return buildPierceSkillHitSequence(profile, skill, targets);
    }
    if (profile.kind === 'slam') {
        return [
            { kind: 'slamPrimary', label: '강타', delayMs: 0, damageMultiplier: Math.max(0, 1 - profile.damageMultiplier), targets },
            { kind: 'slamAftershock', label: '여진', delayMs: profile.delayMs, damageMultiplier: profile.damageMultiplier, targets }
        ];
    }
    return [{ kind: 'primary', label: '직격', delayMs: 0, damageMultiplier: 1, targets }];
}

function getConfiguredSkillDpsMultiplier(pattern) {
    if (!pattern) return null;
    if (pattern.kind === 'authored') return pattern.stages.reduce((sum, stage) => sum + stage.damagePct / 100, 0);
    if (pattern.kind === 'meteor') {
        let hits = Math.max(1, Math.min(5, Math.floor(Number(pattern.groundHits) || 3)));
        return 1 + hits * Math.max(0.01, Number(pattern.groundDamagePct) || 8) / 100;
    }
    if (['field', 'channel'].includes(pattern.kind)) {
        let hits = Math.max(1, Math.min(12, Math.floor(Number(pattern.hits) || 1)));
        return hits * Math.max(0.01, Number(pattern.damagePct) || 100) / 100;
    }
    return null;
}

function getSkillHitSequenceDpsMultiplier(skillName, skill) {
    let configured = getConfiguredSkillDpsMultiplier(skill && skill.combatPattern);
    if (configured !== null) return configured;
    let profile = getSkillHitSequenceProfile(skillName, skill || {});
    if (profile.kind === 'slam') return Math.max(0, 1 - profile.damageMultiplier) + profile.damageMultiplier;
    let projectilePattern = skill && skill.projectilePattern;
    if (projectilePattern && projectilePattern.kind === 'fan') {
        let rays = Math.max(1, Math.min(8, Math.floor(Number(projectilePattern.rays) || 1)));
        return 1 + (rays - 1) * Math.max(0, Number(skill.extraProjectileDamagePct) || PROJECTILE_BONUS_SHOT_DAMAGE_PCT) / 100;
    }
    let repeats = Math.max(1, Math.floor(Number(skill && skill.multiHit) || 1));
    if (repeats <= 1) return 1;
    let repeatPct = Number(skill.repeatHitDamagePct);
    return Number.isFinite(repeatPct) ? 1 + (repeats - 1) * Math.max(0, repeatPct) / 100 : repeats;
}


function getSkillGridProfileKindLabel(kind) {
    if (kind === 'melee') return '인접 단일';
    if (kind === 'arc') return '전방 부채꼴';
    if (kind === 'nova') return '자신 중심 광역';
    if (kind === 'line') return '직선 관통';
    if (kind === 'chain') return '연쇄';
    if (kind === 'blast') return '대상 지점 폭발';
    if (kind === 'fan') return '부채꼴 투사체';
    if (kind === 'cone') return '전방 부채꼴';
    if (kind === 'summon') return '소환수 공격';
    return '그리드 공격';
}

function describeSkillGridProfile(skillName, skillDef) {
    let profile = getSkillGridProfile(skillName, skillDef || {});
    let tags = Array.isArray(skillDef && skillDef.tags) ? skillDef.tags : [];
    let projectileMode = skillDef && skillDef.projectilePattern && skillDef.projectilePattern.mode;
    let projectileModeDef = typeof PROJECTILE_PATTERN_MODE_DB !== 'undefined' && PROJECTILE_PATTERN_MODE_DB[projectileMode];
    let title = tags.includes('projectile')
        ? `발사 방식: ${projectileModeDef ? projectileModeDef.label : getSkillGridProfileKindLabel(profile.kind)}`
        : `공격 범위: ${getSkillGridProfileKindLabel(profile.kind)}`;
    let parts = [title];
    parts.push(`사거리 ${Math.max(1, profile.range || 1)}칸`);
    if (profile.kind === 'blast' && (profile.radius || 0) > 0) parts.push(`반경 ${profile.radius}칸`);
    if (profile.kind === 'nova') parts.push(`반경 ${Math.max(1, profile.radius || 1)}칸`);
    let shapeLabels = { circle: '원형', diamond: '마름모형', square: '사각형', cross: '십자형', diagonal: 'X자형', ring: '고리형' };
    if (shapeLabels[profile.shape]) parts.push(shapeLabels[profile.shape]);
    if (profile.kind === 'chain') parts.push(`연쇄 ${Math.max(1, profile.jump || COMBAT_GRID_CONFIG.chainJumpRange)}칸`);
    if (profile.kind === 'fan') parts.push(`${Math.max(1, Math.min(8, Math.floor(Number(profile.rays) || 1)))}방향`);
    if (tags.includes('projectile')) parts.push(skillDef.projectilePatternSource ? `적용: ${skillDef.projectilePatternSource}` : '발사 방식 변경 가능');
    return parts.join(' · ');
}

/**
 * 남는 타겟 수를 '전이 타격'으로 소모한다: 이미 타격된 적의 주변 1칸에 있는 적에게
 * 타격이 번져 나간다. 범위가 좁은 스킬(근접 단일/부채꼴 등)에서도 타겟 수
 * 옵션·각인이 실제 추가 타격으로 이어지게 하는 규칙이다.
 * @param {Array<object>} hits 이미 타격이 확정된 적 목록(제자리 수정)
 * @param {number} targetCount 스킬의 최종 타겟 수
 * @param {Array<object>} candidates 후보 적(공격자 기준 거리 오름차순 정렬)
 */
function extendGridTargetsBySpill(hits, targetCount, candidates) {
    let added = true;
    while (hits.length < targetCount && added) {
        added = false;
        for (let i = 0; i < candidates.length; i++) {
            let enemy = candidates[i];
            if (hits.includes(enemy)) continue;
            if (!hits.some(hit => getGridUnitDistance(hit, enemy) <= 1)) continue;
            hits.push(enemy);
            added = true;
            break;
        }
    }
}

/** 사거리 안 가장 가까운 살아 있는 적(그리드 칸 보유)을 찾는다. range 생략 시 전장 전체. */
function findNearestGridEnemy(fromCell, enemies, range) {
    if (!fromCell) return null;
    let best = null, bestDist = Infinity;
    (enemies || []).forEach(enemy => {
        if (!enemy || enemy.hp <= 0 || !hasGridCell(enemy)) return;
        let dist = getGridUnitDistance(fromCell, enemy);
        if (dist < bestDist && (!Number.isFinite(range) || dist <= range)) { best = enemy; bestDist = dist; }
    });
    return best;
}

safeExposeGlobals({
    isGridCellInBounds, gridCellKey, gridChebyshevDist, hasGridCell,
    getGridUnitFootprint, getGridUnitCells, getGridUnitCenter, getGridUnitDistance,
    getGridDirectHitDistanceMultiplier,
    getGridBlockedCells, findFreeGridCell, assignEnemyGridSpawn, assignEnemyGridCombatProfile,
    resetPlayerGridPosition, ensureCombatGridRuntime, gridLineCells, gridProjectedLineEnd,
    gridStepToward, advanceGridUnitMovement, findNearestSafeGridRoute, advanceGridHazardEscape, advanceGridTacticalMovement, getSkillGridProfile, getSkillGridProfileKindLabel,
    describeSkillGridProfile, getGridSkillTargetMult, getGridAttackAreaCells,
    selectGridSkillTargets, findNearestGridEnemy, extendGridTargetsBySpill,
    getSkillHitSequenceProfile, buildSkillHitSequence, getSkillHitSequenceDpsMultiplier
});
