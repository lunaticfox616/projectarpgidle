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
    const size=getCombatGridSize();
    return Number.isInteger(gx) && Number.isInteger(gy)
        && gx >= 0 && gy >= 0
        && gx < size.columns && gy < size.rows;
}

/** Reads the passed snapshot, so offline replay never changes the live world's dimensions. */
function getCombatGridSize(state=game) {
    const exploration=state.actExploration;
    if(!exploration||exploration.zoneId!==state.currentZoneId)return COMBAT_GRID_CONFIG;
    return actExplorationMap.forRun(exploration) || COMBAT_GRID_CONFIG;
}

function gridCellKey(gx, gy) {
    return gx + ',' + gy;
}

function gridChebyshevDist(ax, ay, bx, by) {
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function getGridUnitFootprint(unit) {
    let bossSize = (unit && unit.footprint) || COMBAT_GRID_CONFIG.bossFootprint || { columns: 2, rows: 2 };
    return unit && unit.isBoss
        ? { columns: bossSize.columns, rows: bossSize.rows }
        : { columns: 1, rows: 1 };
}

const HERO_HALF_CELLS = 0.45;   // half the hero's drawn body with its weapon, in cells (fitBossFootprint)

/** The stage picture a boss shows (data/monster-stage-roster.js, as js/canvas-stage-roster.js actorFor), or null without the table. */
function getBossStageActor(enemy) {
    if (typeof MONSTER_STAGE_ROSTER !== 'object') return null;
    const roster = MONSTER_STAGE_ROSTER, look = enemy.spriteVariantId || enemy.monsterVisualId;
    return roster.actors[roster.wears[look] || look] || roster.actors[enemy.bossAssetKey] || null;
}

/** A boss as wide as its picture on the stage (2026-10-16 사용자: "크기가 큰 보스들은 차지하는 칸을 늘리던지 해서 플레이어랑
 * 안겹치도록"): the picture stands on the footprint's middle and reaches reach dots to either side (data/monster-stage-roster.js, the
 * standing picture; × STAGE_MONSTER_SCALE, drawn at STAGE_VIEW.heroTile dots a cell ÷ BOSS_DRAW_SCALE). The footprint is wide enough
 * that a hero in the next cell (its body about HERO_HALF_CELLS to each side of its middle) stands clear of the farther-reaching
 * side, whichever way the boss faces: columns ≥ 2 × (reach − 0.5 + HERO_HALF_CELLS); 2 to 6 wide, 2 deep. A strike may still reach over.
 * Fixed when the boss is placed (enemy.footprint, saved with it: a boss from an older save keeps 2×2). Without the stage pictures'
 * table (tests) it stays 2×2. */
function fitBossFootprint(enemy) {
    const actor = enemy && enemy.isBoss && !enemy.footprint ? getBossStageActor(enemy) : null;
    if (!actor) return;
    const rule = typeof STAGE_MONSTER_SCALE === 'object' ? STAGE_MONSTER_SCALE : {}, prefix = Object.keys(rule).find(head => actor.id.startsWith(head));
    const reach = Math.max(...(actor.reach || [actor.width / 2, 0])) * (prefix ? rule[prefix] : 1) / (BOSS_DRAW_SCALE * STAGE_VIEW.heroTile);
    const columns = Math.max(2, Math.min(6, Math.ceil(2 * (reach - 0.5 + HERO_HALF_CELLS) - 0.01)));
    if (columns > 2) enemy.footprint = { columns, rows: 2 };
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

/** The map and whether the boss gate is still sealed: the same for every cell of one search, so the searches below read it once
 * (each neighbour of a path search counted the living elites again, 2026-10-07 frame drops). */
function getGridPlacementTerrain() {
    const run=actExplorationState.current(game);
    return { map: getCombatGridSize(), sealed: !!run && actExplorationState.gateSealed(run) };
}

function canPlaceGridFootprint(blocked, gx, gy, footprint, terrain = getGridPlacementTerrain()) {
    let cells = getGridFootprintCells(gx, gy, footprint);
    if (cells.length !== footprint.columns * footprint.rows) return false;
    return cells.every(cell => !blocked.has(gridCellKey(cell.gx, cell.gy))
        && (!terrain.map.tiles || actExplorationMap.walkable(terrain.map,cell,terrain.sealed)));
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
    addExplorationGridReservations(blocked,excludeUnit);
    (game.summons || []).forEach(summon => { if (summon && !summon.isGhost && summon.alive && (summon.hp || 0) > 0) addUnit(summon); });
    return blocked;
}

function addExplorationGridReservations(blocked,excludeUnit) {
    const run=actExplorationState.current(game);if(!run)return;
    actExplorationState.objects.solidCells(run).forEach(key=>blocked.add(key));
    actExplorationDoors.guideCells(run).forEach(key=>blocked.add(key)); // 이야기 NPC가 선 칸과 그 앞뒤: 아무도 NPC 그림 위에 서지 않는다
    // 기다리는 무리의 자리는 비워 둔다. 다만 그 자리에 이미 서 있는 유닛(같은 자리에서 차례를 기다리는 다음 단계의 보스 위에 선 지금의
    // 보스: 액트 4)은 가두지 않는다. 가두면 어느 쪽으로 한 칸을 가도 그 자리와 겹쳐 한 걸음도 떼지 못했다(2026-10-14, 보스가 걷게 되며 드러남).
    const own=excludeUnit && hasGridCell(excludeUnit)?new Set(getGridUnitCells(excludeUnit).map(cell=>gridCellKey(cell.gx,cell.gy))):new Set();
    run.packs.forEach(pack=>pack.waiting.forEach(enemy=>{
        const keys=getGridUnitCells(enemy).map(cell=>gridCellKey(cell.gx,cell.gy));
        if(!keys.some(key=>own.has(key)))keys.forEach(key=>blocked.add(key));
    }));
    if(run.motion && excludeUnit!==game.gridPlayer)blocked.add(gridCellKey(run.motion.to.gx,run.motion.to.gy));
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
    if (isOneTileNear(near, size)) return findFreeGridCellNear(blocked, near);
    let free = [], terrain = getGridPlacementTerrain();
    for (let gx = 0; gx < terrain.map.columns; gx++) {
        for (let gy = 0; gy < terrain.map.rows; gy++) {
            if (canPlaceGridFootprint(blocked, gx, gy, size, terrain)) free.push({ gx, gy });
        }
    }
    if (free.length === 0) return null;
    if (!near) return free[Math.floor(Math.random() * free.length)];
    return nearestGridCell(free, near, size);
}

const isOneTileNear = (near, size) => !!near && size.columns === 1 && size.rows === 1 && isGridCellInBounds(near.gx, near.gy);

/** findFreeGridCell for a one-tile unit near an integer cell: rings outward from near, the first free cell in scan order (column,
 * then row) on the nearest ring. The same cell the full scan picks, from a few dozen checks instead of every tile of the map. */
function findFreeGridCellNear(blocked, near) {
    const terrain = getGridPlacementTerrain(), reach = Math.max(terrain.map.columns, terrain.map.rows);
    for (let ring = 0; ring <= reach; ring++) {
        const cell = firstFreeOnRing(blocked, near, ring, terrain);
        if (cell) return cell;
    }
    return null;
}
/** The cells at exactly ring from near, in scan order (column, then row); the first one a unit can stand on. */
function firstFreeOnRing(blocked, near, ring, terrain) {
    const size = { columns: 1, rows: 1 };
    const rows = gx => (Math.abs(gx - near.gx) === ring
        ? Array.from({ length: 2 * ring + 1 }, (_, index) => near.gy - ring + index) : [near.gy - ring, near.gy + ring]);
    for (let gx = Math.max(0, near.gx - ring); gx <= Math.min(terrain.map.columns - 1, near.gx + ring); gx++) {
        const cell = rows(gx).filter(gy => gy >= 0 && gy < terrain.map.rows).find(gy => canPlaceGridFootprint(blocked, gx, gy, size, terrain));
        if (cell !== undefined) return { gx, gy: cell };
    }
    return null;
}

/** The first cell in scan order at the least distance from near: what a stable sort by distance put first, in one pass (a summoner
 * map recalls eight wisps per map, and sorting every free tile of an exploration map for each was 38% of a projected settlement). */
function nearestGridCell(cells, near, size) {
    let centerOffsetX = (size.columns - 1) / 2, centerOffsetY = (size.rows - 1) / 2;
    let best = cells[0], bestDistance = Infinity;
    for (const cell of cells) {
        const distance = gridChebyshevDist(cell.gx + centerOffsetX, cell.gy + centerOffsetY, near.gx, near.gy);
        if (distance < bestDistance) { best = cell; bestDistance = distance; }
    }
    return best;
}

/**
 * 스폰되는 적에게 그리드 칸을 배정한다. 보스는 고정 스폰 칸(점유 시 그 주변)에,
 * 일반/정예는 빈 칸 중 무작위로 배치된다. 배정한 칸은 blocked에 추가한다.
 * @param {object} enemy createEnemy 결과
 * @param {Set<string>} blocked 이번 스폰 동안 누적되는 점유 집합
 */
function assignEnemyGridSpawn(enemy, blocked) {
    fitBossFootprint(enemy);
    let footprint = getGridUnitFootprint(enemy);
    let bossSpawnFree = canPlaceGridFootprint(blocked, COMBAT_GRID_CONFIG.bossSpawn.gx, COMBAT_GRID_CONFIG.bossSpawn.gy, footprint);
    let cell = enemy.isBoss
        ? (!bossSpawnFree
            ? findFreeGridCell(blocked, COMBAT_GRID_CONFIG.bossSpawn, footprint)
            : { gx: COMBAT_GRID_CONFIG.bossSpawn.gx, gy: COMBAT_GRID_CONFIG.bossSpawn.gy })
        // A wide map spawns reinforcements (void breach, swarms) beside the hero, not in some far room.
        : findFreeGridCell(blocked, actExplorationState.current(game) ? game.gridPlayer : undefined);
    if (!cell) cell = { gx: COMBAT_GRID_CONFIG.bossSpawn.gx, gy: COMBAT_GRID_CONFIG.bossSpawn.gy };
    enemy.gx = cell.gx;
    enemy.gy = cell.gy;
    enemy.gridMoveTimer = 0;
    getGridFootprintCells(cell.gx, cell.gy, footprint).forEach(occupied => blocked.add(gridCellKey(occupied.gx, occupied.gy)));
}

/** 그림이 공격 방식을 정한 외형이면 true(근접) · false(원거리), 아니면 null(외형 표는 data/bosses.js). */
function getEnemyPictureMelee(enemy) {
    const kind = typeof getMonsterVisualAttackKind === 'function' ? getMonsterVisualAttackKind(enemy.spriteVariantId || enemy.monsterVisualId) : null;
    return kind ? kind === 'melee' : null;
}

/**
 * 적의 근접/원거리 유형과 사거리를 배정한다. 보스는 보스마다 정해진 싸우는 거리를 따른다(data/bosses.js BOSS_REACH: 근접,
 * 사거리 있음, 사거리 무한). 일반/정예는 그림이 정한 방식을 따르고(2026-10-02), 정하지 않은 외형은 외형 종류마다 같은 확률 유형을 쓴다.
 * 외형 정보 없는 이전 적은 기존 확률을 사용한다.
 */
function rollEnemyGridCombatProfile(enemy) {
    const cfg = COMBAT_GRID_CONFIG;
    if (enemy.monsterArchetype === 'wisp') return {melee:false,range:cfg.rangedEnemyMinRange};
    const identity = enemy.monsterVisualId || enemy.spriteVariantId;
    const random = identity ? createSeededRng('enemy-attack:' + identity) : Math.random;
    const rolled = random() < cfg.meleeEnemyChance, picture = getEnemyPictureMelee(enemy);
    const melee = picture === null ? rolled : picture;
    return {melee,range:melee ? cfg.meleeAttackRange
        : cfg.rangedEnemyMinRange+Math.floor(random()*(cfg.rangedEnemyMaxRange-cfg.rangedEnemyMinRange+1))};
}

function assignEnemyGridCombatProfile(enemy) {
    let cfg = COMBAT_GRID_CONFIG;
    if (enemy.isBoss) {
        const reach = getBossReach(enemy);
        enemy.attackKind = reach.id === 'melee' ? 'melee' : 'ranged';
        enemy.attackRange = reach.range;
        return;
    }
    const {melee,range} = rollEnemyGridCombatProfile(enemy);
    enemy.attackKind = melee ? 'melee' : 'ranged';
    enemy.attackRange = range;
    enemy.attackDelivery = melee ? 'instantTarget' : (enemy.attackRange === cfg.rangedEnemyMinRange ? 'projectileTarget' : 'projectileCell');
    enemy.projectileToEdge = !melee && enemy.attackRange === cfg.rangedEnemyMaxRange;
    enemy.attackCastMs = enemy.isElite && enemy.projectileToEdge ? 900 : 0;
    if (enemy.attackCastMs) enemy.attackLabel = '관통 사격';
}

/** 플레이어를 스폰 칸으로 되돌린다(조우 시작/전장 리셋 시). */
function resetPlayerGridPosition() {
    const cell=getCombatGridSize().entry || COMBAT_GRID_CONFIG.playerSpawn;
    game.gridPlayer = { gx: cell.gx, gy: cell.gy, gridMoveTimer: 0 };
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
    // 접근 점수는 저장된 footprint 없이 설정 보스 크기로 매기는 기존 규칙이다. 충돌·중심 거리는 실제 footprint를 쓴다.
    let scoring = getGridUnitFootprint({ isBoss: footprint.columns > 1 || footprint.rows > 1 });
    let distanceFromPlacement = (gx, gy) => Math.max(0,
        gx - tx, tx - (gx + scoring.columns - 1),
        gy - ty, ty - (gy + scoring.rows - 1));
    let start = { gx: unit.gx, gy: unit.gy, first: null };
    let best = start;
    let bestCheb = distanceFromPlacement(start.gx, start.gy);
    let bestMan = Math.abs(getGridUnitCenter(unit).gx - tx) + Math.abs(getGridUnitCenter(unit).gy - ty);
    let queue = [start], head = 0, terrain = getGridPlacementTerrain();
    let visited = new Set([gridCellKey(start.gx, start.gy)]);
    while (head < queue.length) {
        let current = queue[head++];
        GRID_CARDINAL_STEPS.forEach(direction => {
            let gx = current.gx + direction.dx, gy = current.gy + direction.dy;
            let key = gridCellKey(gx, gy);
            if (visited.has(key) || !canPlaceGridFootprint(blocked, gx, gy, footprint, terrain)) return;
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
function advanceGridUnitMovement(unit, target, dtSec, intervalSec, avoid) {
    if (!hasGridCell(unit) || !target) return false;
    let interval = Number.isFinite(intervalSec) && intervalSec > 0 ? intervalSec : COMBAT_GRID_CONFIG.enemyMoveIntervalSec;
    if (actExplorationState.current(game) && unit===game.gridPlayer) return beginExplorationGridStep(target,interval,avoid);
    unit.gridMoveTimer = (Number(unit.gridMoveTimer) || 0) + dtSec;
    if (unit.gridMoveTimer < interval) return false;
    let from = { gx: unit.gx, gy: unit.gy };
    let moved = stepAroundDanger(getGridBlockedCells(unit), avoid, blocked => gridStepToward(unit, target.gx, target.gy, blocked));
    unit.gridMoveTimer = moved ? 0 : interval;
    markGridStep(unit, from, moved);
    return moved;
}

/** 적이 한 칸을 걷는 데 걸리는 기본 시간(초): 보스는 BOSS_REACH.stepSec, 그 밖에는 enemyMoveIntervalSec. 다가가는 규칙(js/combat.js)과
 * 걷는 모습(js/canvas-stage-stride.js)이 같은 값을 읽는다. */
function getGridUnitStepSec(unit) {
    return unit && unit.isBoss ? BOSS_REACH.stepSec : COMBAT_GRID_CONFIG.enemyMoveIntervalSec;
}

/** A unit that stepped remembers the cell it left and when: the drawn unit glides between the two for a moment (getGridUnitDrawnDelta). */
function markGridStep(unit, from, moved) {
    if (moved) Object.assign(unit, { gridStepFrom: from, gridStepAt: getCombatTime() });
}

function withAvoidedGridCells(blocked, cells) {
    for (const cell of cells || []) blocked.add(gridCellKey(cell.gx, cell.gy));
    return blocked;
}
/** One step (step(blocked) → moved) around danger. avoid: { hard, soft } (an array is hard). Hard cells (a telegraphed attack) are never
 * stepped into; soft ones (lasting ground) only when no other step leads on (2026-10-18: as walls they kept a melee hero from its boss). */
function stepAroundDanger(blocked, avoid, stepThrough) {
    const { hard = [], soft = [] } = Array.isArray(avoid) ? { hard: avoid } : (avoid || {});
    withAvoidedGridCells(blocked, hard);
    return (soft.length > 0 && stepThrough(withAvoidedGridCells(new Set(blocked), soft))) || stepThrough(blocked);
}
function beginExplorationGridStep(target,interval,avoid) {
    const run=actExplorationState.current(game);if(!run || run.motion)return false;
    const next={gx:game.gridPlayer.gx,gy:game.gridPlayer.gy};
    if(!stepAroundDanger(getExplorationPlanningBlockedCells(run),avoid,blocked=>gridStepToward(next,target.gx,target.gy,blocked)))return false;
    return actExplorationMotion.start(run,game.gridPlayer,next,interval/actExplorationDoors.pace(run),run.motionTimeMs);
}
/** Whether a step toward target is free for unit now, by the rule advanceGridUnitMovement steps by, without moving it. */
function canGridUnitStepToward(unit, target, avoid) {
    if (!hasGridCell(unit) || !target) return false;
    const run = actExplorationState.current(game);
    const exploring = !!run && unit === game.gridPlayer;
    const probe = exploring ? { gx: unit.gx, gy: unit.gy } : { ...unit };
    const blocked = exploring ? getExplorationPlanningBlockedCells(run) : getGridBlockedCells(unit);
    return stepAroundDanger(blocked, avoid, cells => gridStepToward(probe, target.gx, target.gy, cells));
}

/** The hero plans its exploration step around fighters and its own reserved tile, but not around dormant packs: they wake
 * as soon as they are seen, so a narrow passage (a maze chamber) they stand in must not look like a dead end. Stepping into a
 * tile a dormant enemy still holds is refused at the half-way check (canEnterMotionTile). Nor around its own summons: they
 * stand still with nothing to fight, and eight idle wisps once shut a summoner in a side room for good (2026-10-08); the hero
 * walks through and the summon takes the tile it left (swapSummonOutOfHeroTile). */
function getExplorationPlanningBlockedCells(run) {
    const blocked=getHeroStepBlockedCells();
    run.packs.forEach(pack=>pack.waiting.forEach(enemy=>getGridUnitCells(enemy).forEach(cell=>blocked.delete(gridCellKey(cell.gx,cell.gy)))));
    return blocked;
}

/** Cells the hero cannot step into: everything getGridBlockedCells holds except the hero's own summons. */
function getHeroStepBlockedCells() {
    const blocked=getGridBlockedCells(game.gridPlayer);
    (game.summons||[]).forEach(summon=>{if(summon && hasGridCell(summon))getGridUnitCells(summon).forEach(cell=>blocked.delete(gridCellKey(cell.gx,cell.gy)));});
    return blocked;
}

/** A summon on the tile the hero just entered takes the tile the hero left. */
function swapSummonOutOfHeroTile(from) {
    const hero=game.gridPlayer;
    if(!from || (hero.gx===from.gx && hero.gy===from.gy))return;
    const summon=(game.summons||[]).find(row=>row && hasGridCell(row) && getGridUnitCells(row).some(cell=>cell.gx===hero.gx && cell.gy===hero.gy));
    if(summon)Object.assign(summon,{gx:from.gx,gy:from.gy,gridMoveTimer:0});
}

function findNearestSafeGridRoute(unit, hazardCells) {
    if (!hasGridCell(unit)) return null;
    const footprint = getGridUnitFootprint(unit);
    let danger = new Set((hazardCells || [])
        .filter(cell => hasGridCell(cell))
        .map(cell => gridCellKey(cell.gx, cell.gy)));
    let blocked = getGridBlockedCells(unit);
    let start = { gx: unit.gx, gy: unit.gy, first: null, distance: 0 };
    let queue = [start], terrain = getGridPlacementTerrain();
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
            if (visited.has(key) || !canPlaceGridFootprint(blocked, gx, gy, footprint, terrain)) return;
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
    if (actExplorationState.current(game) && unit===game.gridPlayer) {
        return {moved:beginExplorationGridStep(route.next,interval),safe:false,blocked:false,distance:route.distance};
    }
    unit.gridMoveTimer = (Number(unit.gridMoveTimer) || 0) + Math.max(0, Number(dtSec) || 0);
    if (unit.gridMoveTimer < interval) return { moved: false, safe: false, blocked: false, distance: route.distance };
    let from = { gx: unit.gx, gy: unit.gy };
    unit.gx = route.next.gx;
    unit.gy = route.next.gy;
    unit.gridMoveTimer = 0;
    markGridStep(unit, from, true);
    return {
        moved: true,
        safe: route.distance === 1,
        blocked: false,
        distance: Math.max(0, route.distance - 1),
        from,
        to: { gx: unit.gx, gy: unit.gy }
    };
}

/** keepRows: 옆으로만 치는 룬(getSkillBand)이면 대상을 위아래 그 줄 수 안에 둔 채 물러선다. 띠 밖으로 물러서면 칠 대상이 없어져
 * 다시 다가가기를 되풀이했다. */
function findGridRetreatCell(unit, target, maxRange, previousCell, keepRows) {
    let blocked = getGridBlockedCells(unit);
    let footprint = getGridUnitFootprint(unit);
    let currentDist = getGridUnitDistance(unit, target);
    let best = null, bestScore = currentDist;
    // 방 단위 무대: 주인공은 벽에 파인 문 칸(한 칸짜리 막다른 곳)으로 물러서지 않는다. 2026-10-17 사용자 "거리유지 전술에서 방 입구의
    // 1칸 막다른길로는 안 들어가게 해줘": 몰린 채 그 칸에 갇혀 싸웠다.
    let stage = unit === game.gridPlayer ? actExplorationDoors.stageMap(actExplorationState.current(game)) : null;
    let open = cell => canPlaceGridFootprint(blocked, cell.gx, cell.gy, footprint) && !(stage && actExplorationRooms.doorAt(stage, cell))
        && (!keepRows || getGridUnitCells(target).some(row => Math.abs(row.gy - cell.gy) <= keepRows));
    GRID_CARDINAL_STEPS.forEach(direction => {
        let gx = unit.gx + direction.dx, gy = unit.gy + direction.dy;
        if (!open({ gx, gy })) return;
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
    if (![unit,target].every(hasGridCell)) return { moved: false };
    let config = options || {};
    let interval = Number(config.intervalSec) > 0 ? Number(config.intervalSec) : COMBAT_GRID_CONFIG.playerMoveIntervalSec;
    if (actExplorationState.current(game) && unit===game.gridPlayer) return beginExplorationTacticalStep(target,config,interval);
    unit.gridMoveTimer = (Number(unit.gridMoveTimer) || 0) + Math.max(0, Number(config.dtSec) || 0);
    if (unit.gridMoveTimer < interval) return { moved: false };
    let from = { gx: unit.gx, gy: unit.gy };
    const cell = findGridTacticalDestination(unit,target,config);
    const moved = !!cell;
    if (cell) Object.assign(unit,cell);
    unit.gridMoveTimer = moved ? 0 : interval;
    markGridStep(unit, from, moved);
    return { moved, from, to: { gx: unit.gx, gy: unit.gy }, retreat: moved && config.direction === 'away' };
}

function beginExplorationTacticalStep(target,config,interval) {
    const from={gx:game.gridPlayer.gx,gy:game.gridPlayer.gy};
    const away=config.direction==='away';
    const next=findGridTacticalDestination(game.gridPlayer,target,config);
    const moved=!!next && beginExplorationGridStep(next,interval);
    return {moved,from,to:moved?game.actExploration.motion.to:from,retreat:moved && away};
}

function findGridTacticalDestination(unit,target,config) {
    if(config.direction==='away')return findGridRetreatCell(unit,target,Math.max(1,Number(config.maxRange)||1),config.previousCell,config.keepRows);
    const next={gx:unit.gx,gy:unit.gy};
    return gridStepToward(next,target.gx,target.gy,getGridBlockedCells(unit))?next:null;
}

/** 스킬룬의 그리드 범위 프로필을 조회한다. 정의가 없으면 targetMode/태그 기반 기본값을 쓴다.
 * The resolved active skill's 효과 확장 grows it (js/skill-effect-expansion.js); at +0 the table row itself comes back. */
function getSkillGridProfile(skillName, skillDef) {
    let profile = getAuthoredSkillGridProfile(skillName, skillDef) || getDefaultSkillGridProfile(skillDef);
    return skillEffectExpansion.grid(profile, skillDef);
}

/** The SKILL_GRID_DB row, reshaped when an engraved projectile pattern changes its kind. */
function getAuthoredSkillGridProfile(skillName, skillDef) {
    let profile = SKILL_GRID_DB[skillName];
    let pattern = skillDef && skillDef.projectilePattern;
    if (!profile || !(pattern && pattern.kind)) return profile || null;
    let resolved = { ...profile, kind: pattern.kind };
    if (pattern.kind === 'fan') Object.assign(resolved, getEngravedFanShape(pattern, profile));
    return resolved;
}

/** An engraved fan (삼갈래 분산): its ray count and spread. With spreadDeg the middle ray aims at the target (getGridFanRayEnds). */
function getEngravedFanShape(pattern, profile) {
    const spreadDeg = Number(pattern.spreadDeg) > 0 ? pattern.spreadDeg : profile.spreadDeg;
    return { rays: Math.max(1, Math.min(8, Math.floor(Number(pattern.rays) || profile.rays || 1))), spreadDeg };
}

function getDefaultSkillGridProfile(skillDef) {
    let mode = skillDef && skillDef.targetMode;
    let melee = !!(skillDef && Array.isArray(skillDef.tags) && skillDef.tags.includes('melee'));
    let byMode = {
        whirl: { kind: 'nova', range: 1, radius: 1 },
        cleave: melee ? { kind: 'arc', range: 1 } : { kind: 'blast', range: 4, radius: 1 },
        pierce: { kind: 'line', range: 6 },
        chain: { kind: 'chain', range: 4, jump: COMBAT_GRID_CONFIG.chainJumpRange },
        all: { kind: 'blast', range: 5, radius: 2 }
    };
    if (Object.hasOwn(byMode, mode)) return byMode[mode];
    return melee ? { kind: 'melee', range: 1 } : { kind: 'blast', range: 5, radius: 0 };
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
    for (let gx = 0; gx < getCombatGridSize().columns; gx++) {
        for (let gy = 0; gy < getCombatGridSize().rows; gy++) {
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

/** The far cell of each fan ray. A fan with spreadDeg (연발 사격, 삼갈래 분산, 2026-10-07) aims its middle ray straight at the target
 * and opens the others spreadDeg apart on both sides; without it the rays follow the eight grid directions (boss fans).
 * Ends lie `range` cells out in the larger axis, like the grid-direction rays. */
function getGridFanRayEnds(attacker, target, profile) {
    const rays = Math.max(1, Math.min(8, profile.rays || 3)), range = Math.max(1, profile.range || 1);
    const step = Number(profile.spreadDeg) * Math.PI / 180;
    if (!(step > 0)) return getGridFanDirections(attacker, target, rays)
        .map(direction => ({ gx: attacker.gx + direction.gx * range, gy: attacker.gy + direction.gy * range }));
    const aim = Math.atan2(target.gy - attacker.gy, target.gx - attacker.gx);
    return [0, -1, 1, -2, 2, -3, 3, 4].slice(0, rays).map(k => {
        const dx = Math.cos(aim + k * step), dy = Math.sin(aim + k * step), reach = range / Math.max(Math.abs(dx), Math.abs(dy));
        return { gx: attacker.gx + Math.round(dx * reach), gy: attacker.gy + Math.round(dy * reach) };
    });
}

/** The last cell on the board of each fan ray, where its arrow is drawn to. */
function getGridFanRayTips(attacker, target, profile) {
    return getGridFanRayEnds(attacker, target, profile)
        .map(end => gridLineCells(attacker.gx, attacker.gy, end.gx, end.gy, profile.range).pop())
        .filter(Boolean);
}

/** A fan's hits: an aimed fan (spreadDeg) per selectGridAimedFanHits; a grid-direction fan, per ray, the first candidate standing
 * exactly on that direction's line within range. */
function selectGridFanHits(attackerCell, primaryEnemy, profile, orderedCandidates) {
    if (Number(profile.spreadDeg) > 0) return selectGridAimedFanHits(attackerCell, primaryEnemy, profile, orderedCandidates);
    const primaryCell = getClosestGridUnitCell(attackerCell, primaryEnemy);
    return getGridFanDirections(attackerCell, primaryCell, profile.rays || 3).map(direction => {
        const match = orderedCandidates.find(row => getGridUnitCells(row.enemy).some(cell => {
            const dx = cell.gx - attackerCell.gx, dy = cell.gy - attackerCell.gy;
            const steps = direction.gx !== 0 ? dx / direction.gx : dy / direction.gy;
            return Number.isInteger(steps) && steps >= 1 && steps <= profile.range
                && attackerCell.gx + direction.gx * steps === cell.gx
                && attackerCell.gy + direction.gy * steps === cell.gy;
        }));
        return match && match.enemy;
    }).filter(Boolean);
}

/** An aimed fan's volley: the middle arrow strikes the target it aims at, every other arrow the first enemy on its line, and no
 * enemy takes two arrows. The old grid-direction fan missed a target off the eight lines with every arrow (2026-10-07). */
function selectGridAimedFanHits(attackerCell, primaryEnemy, profile, orderedCandidates) {
    const hits = [primaryEnemy];
    getGridFanRayEnds(attackerCell, getClosestGridUnitCell(attackerCell, primaryEnemy), profile).slice(1).forEach(end => {
        const keys = new Set(gridLineCells(attackerCell.gx, attackerCell.gy, end.gx, end.gy, profile.range).map(cell => gridCellKey(cell.gx, cell.gy)));
        const match = orderedCandidates.find(row => !hits.includes(row.enemy) && isGridUnitInCellSet(row.enemy, keys));
        if (match) hits.push(match.enemy);
    });
    return hits;
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

/** 옆으로만 치는 룬(SKILL_GRID_DB band, 2026-10-17 사용자 "넓히기로 고쳐줘. 옆으로 두툼하게, 위아래 한 줄까지 맞게"): 무대의 그림은
 * 주인공 높이에서 옆으로만 나가는데 판정은 위아래로 3칸 떨어진 적도 쳐서 허공을 치는 것처럼 보였다. 이 룬은 주인공 줄과 위아래
 * band줄 안에서 한쪽 옆으로 range칸까지 친다(바로 위나 아래 칸도 든다). 칠 쪽은 대상이 선 쪽이고, 대상이 바로 위나 아래면 대상을
 * 고를 때 정해 둔 쪽(noteGridBandSide)이다. 같은 공격의 판정 칸, 그림이 읽는 겨냥, 주인공이 보는 쪽이 모두 이 값을 쓴다. */
let gridBandSide = 1;
const getGridBandOf = profile => ({ rows: profile.band || 0, reach: Math.max(1, profile.range || 1) });
const getGridBandSide = (attacker, target) => Math.sign(target.gx - attacker.gx) || gridBandSide;

/** 그 룬의 띠({rows, reach}): 판정 표의 것이나, 없으면 band가 있는 단계 판정(혹한의 지진의 얼음 기둥)의 것. 옆으로 치지 않으면 rows 0. */
function getSkillBand(skillName, skill) {
    const base = getSkillGridProfile(skillName, skill);
    if (base.band) return getGridBandOf(base);
    const stage = ((skill.combatPattern || {}).stages || []).find(row => row.grid && row.grid.band);
    return stage ? getGridBandOf({ ...base, ...skillEffectExpansion.stageGrid(stage.grid, skill) }) : { rows: 0, reach: 0 };
}

/** 이번 공격의 칠 쪽(1 오른쪽, -1 왼쪽). 옆으로 치지 않는 룬이면 0. 무대의 주인공이 휘두르는 동안 이 쪽을 본다. */
function getSkillBandSide(skillName, skill) {
    return getSkillBand(skillName, skill).rows ? gridBandSide : 0;
}

/** 적의 칸 가운데 하나가 띠 안에 있는가. side가 있으면 그 쪽 옆 칸만(바로 위나 아래는 빼고), 없으면 양쪽과 바로 위나 아래. */
function isGridUnitInBand(attacker, unit, band, side) {
    return getGridUnitCells(unit).some(cell => {
        const dx = cell.gx - attacker.gx, dy = Math.abs(cell.gy - attacker.gy), ahead = side ? dx * side : Math.abs(dx);
        return dy <= band.rows && ahead <= band.reach && (side ? ahead > 0 : ahead + dy > 0);
    });
}

/** 대상을 고르며 칠 쪽을 정해 둔다: 대상이 선 쪽, 대상이 바로 위나 아래면 띠 안의 적이 더 많은 쪽(같으면 지난번 쪽). */
function noteGridBandSide(skillName, skill, attackerCell, primaryEnemy, candidates) {
    const band = getSkillBand(skillName, skill);
    if (!band.rows) return;
    const dx = getClosestGridUnitCell(attackerCell, primaryEnemy).gx - attackerCell.gx;
    const lead = dx || candidates.reduce((sum, row) => sum + isGridUnitInBand(attackerCell, row.enemy, band, 1) - isGridUnitInBand(attackerCell, row.enemy, band, -1), 0);
    if (lead) gridBandSide = Math.sign(lead);
}

/** 띠의 칸: 칠 쪽으로 0..reach칸, 주인공 줄이 먼저이고 위아래 줄이 뒤다(가장 먼 칸을 고르는 그림이 주인공 줄의 끝을 잡는다). */
function getGridBandAreaCells(profile, attacker, target) {
    const side = getGridBandSide(attacker, target), band = getGridBandOf(profile), rows = [0], cells = [];
    for (let dy = 1; dy <= band.rows; dy++) rows.push(-dy, dy);
    for (let d = 0; d <= band.reach; d++) {
        rows.forEach(dy => {
            const gx = attacker.gx + side * d, gy = attacker.gy + dy;
            if ((d || dy) && isGridCellInBounds(gx, gy)) cells.push({ gx, gy });
        });
    }
    return cells;
}

/** 그 적이 띠 안에 드는, 걸어서 닿는 가장 가까운 칸(걸음 수로). 붙으러 가면 옆으로 먼저 걸어 줄을 늦게 맞췄다. 이미 띠 안에 섰거나
 * 그런 칸이 없으면 적 자신(예전처럼 붙으러 간다): 막힌 자리를 겨누면 그 앞에서 멈춘 채 치지도 걷지도 못했다. */
function getGridBandApproachCell(hero, enemy, band) {
    if (isGridUnitInBand(hero, enemy, band, 0)) return enemy;
    const blocked = getHeroStepBlockedCells(), terrain = getGridPlacementTerrain(), footprint = getGridUnitFootprint(hero);
    const seen = new Set([gridCellKey(hero.gx, hero.gy)]), queue = [{ gx: hero.gx, gy: hero.gy }];
    for (let head = 0; head < queue.length; head++) {
        const at = queue[head];
        if (head && isGridUnitInBand(at, enemy, band, 0)) return at;
        for (const step of GRID_CARDINAL_STEPS) {
            const gx = at.gx + step.dx, gy = at.gy + step.dy, key = gridCellKey(gx, gy);
            if (seen.has(key) || !canPlaceGridFootprint(blocked, gx, gy, footprint, terrain)) continue;
            seen.add(key);
            queue.push({ gx, gy });
        }
    }
    return enemy;
}

/** 모양이 따로 정해진 범위: 옆으로 치는 띠, 부채꼴 숨결. 아니면 null. */
function getGridShapedAreaCells(profile, attacker, targetCell) {
    if (profile.band) return getGridBandAreaCells(profile, attacker, targetCell);
    return profile.kind === 'cone' ? getGridConeAreaCells(profile, attacker, targetCell) : null;
}

/** 1차 대상이 될 수 있는 거리: 띠가 있으면 띠 안, 아니면 사거리 안. */
function isGridPrimaryInReach(row, profile, attackerCell) {
    return profile.band ? isGridUnitInBand(attackerCell, row.enemy, getGridBandOf(profile), 0) : row.dist <= Math.max(1, profile.range || 1);
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
    let shaped = getGridShapedAreaCells(profile, attacker, targetCell);
    if (shaped) return shaped;
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
        getGridFanRayEnds(attacker, targetCell, profile).forEach(end => {
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
 * @returns {{kind:string,cells:Array<{gx:number,gy:number}>,shape:string|undefined,radius:number|undefined,cone:ReturnType<typeof getGridConeGeometry>|null,band:{side:number,rows:number,reach:number}|null,center:{gx:number,gy:number}}}
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
        kind: profile.kind, shape: profile.shape, radius: profile.radius,
        ...getGridFootprintAim(profile, source, getClosestGridUnitCell(source, primary)),
        // 부채꼴은 화살마다 끝 칸(그림이 화살 하나씩 그린다: js/canvas-world-tree-fx.js fanRays)
        rays: profile.kind === 'fan' ? getGridFanRayTips(source, getClosestGridUnitCell(source, primary), profile) : undefined,
        // 중심은 칸 좌표만: 보스 예고에서는 source가 보스 자신이라 { ...source }가 보스 전체(이전 예고 포함)를 겹겹이 복사했다(검토 5차).
        center: profile.kind === 'nova' ? { gx: source.gx, gy: source.gy } : { ...getClosestGridUnitCell(source, primary) } };
}

/** 그림이 읽는 겨냥: 부채꼴 숨결의 모양(cone), 옆으로 치는 룬의 칠 쪽과 띠(band: {side, rows, reach}). 옆으로 치는 부채꼴은
 * 칠 쪽으로 곧게 그린다. */
function getGridFootprintAim(profile, source, aim) {
    const band = profile.band ? { side: getGridBandSide(source, aim), ...getGridBandOf(profile) } : null;
    const toward = band ? { gx: source.gx + band.side, gy: source.gy } : aim;
    return { band, cone: profile.kind === 'cone' ? getGridConeGeometry(profile, source, toward) : null };
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
    let inRange = candidates.filter(row => isGridPrimaryInReach(row, profile, attackerCell));
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
/** Monsters that have not noticed the hero (options.splashOnly) can be caught by an area, a chain or a spill, never aimed at. */
function getGridPrimaryPool(candidates, options) {
    let splashOnly = options && options.splashOnly;
    return splashOnly ? candidates.filter(row => !splashOnly.has(row.enemy)) : candidates;
}

function selectGridSkillTargets(skillName, skill, attackerCell, enemies, options) {
    if (!attackerCell || !isGridCellInBounds(attackerCell.gx, attackerCell.gy)) return [];
    let profile = getSkillGridProfile(skillName, skill);
    let candidates = (enemies || []).filter(hasGridCell)
        .map(enemy => ({ enemy, dist: getGridUnitDistance(attackerCell, enemy) }))
        .sort(compareGridCandidateTie);
    let primary = selectGridPrimaryCandidate(getGridPrimaryPool(candidates, options), profile, attackerCell, options);
    if (!primary) return [];
    noteGridBandSide(skillName, skill, attackerCell, primary.enemy, candidates);
    let orderedCandidates = [primary].concat(candidates.filter(row => row !== primary));
    let targetCount = Math.max(1, Math.floor(skill.targets || 1));
    let mode = skill.targetMode || 'single';
    let hits;
    if (profile.kind === 'chain') {
        hits = buildGridChainTargets(profile, targetCount, primary.enemy, orderedCandidates.map(row => row.enemy));
    } else if (profile.kind === 'fan') {
        hits = selectGridFanHits(attackerCell, primary.enemy, profile, orderedCandidates).slice(0, targetCount);
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

/** 강타 룬 가운데 여진 수치(aftershockDamagePct)를 가진 것(강타)만 본 타격 뒤 여진으로 나눠 친다. 강타 태그만 있는 룬(불사르기, 혹한의 지진,
 * 도약 강타: 2026-10-17 강타 피해와 여진이 닿도록 붙인 태그)은 제 판정 그대로 한 번에 친다. */
function getSlamAftershockProfile(skill) {
    if (!(Number(skill.aftershockDamagePct) > 0)) return null;
    return {
        kind: 'slam',
        delayMs: Math.max(120, Math.floor(Number(skill.aftershockDelayMs) || SKILL_HIT_SEQUENCE_CONFIG.slamAftershockDelayMs)),
        damageMultiplier: Math.max(0, Number(skill.aftershockDamagePct)) / 100
    };
}

function getSkillHitSequenceProfile(skillName, skill) {
    let tags = skill && Array.isArray(skill.tags) ? skill.tags : [];
    let mode = skill && skill.targetMode;
    if (mode === 'whirl') return { kind: 'whirl', intervalMs: SKILL_HIT_SEQUENCE_CONFIG.whirlIntervalMs };
    if (mode === 'chain') return { kind: 'chain', intervalMs: SKILL_HIT_SEQUENCE_CONFIG.chainIntervalMs, fork: getSkillGridProfile(skillName, skill).fork };
    let gridProfile = getSkillGridProfile(skillName, skill || {});
    if (mode === 'pierce' || (gridProfile && gridProfile.kind === 'line')) return { kind: 'pierce', intervalMs: SKILL_HIT_SEQUENCE_CONFIG.pierceIntervalMs };
    if (tags.includes('slam')) return getSlamAftershockProfile(skill) || { kind: 'instant' };
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

/** 대지의 함성 · 서리바람 내지르기: the wave hurts where its drawn ring touches a monster, in the order it spreads (js/combat.js
 * pickWaveFrontTargets). The ring grows one cell per msPerCell up to reach; the stages, every half cell, are only the moments it is
 * checked. One wave strikes a monster once (shared state). The hits used to be fixed on the cells the targets stood on at the cast,
 * so a monster that stepped to another cell inside the burst right after the cast was missed as if it had dodged (2026-10-02).
 * @param {{attacker:object, primary:object, impactCells:Array<{gx:number,gy:number}>}} area */
function buildRadialBurstHitSequence(skillName, skill, targets, area) {
    if (!area.attacker || !area.primary) return null;
    let gridProfile = getSkillGridProfile(skillName, skill), { center, reach, cells } = getRadialWaveShape(gridProfile, area);
    let msPerCell = Math.max(50, Math.floor(Number(skill.combatPattern.waveMsPerCell) || 90)), waveDurationMs = Math.round(reach * msPerCell);
    let wave = { center, shape: gridProfile.shape, reach, msPerCell, struck: [], checkedAt: null, cells,
        limit: Math.max(1, Number(skill.targets) || targets.length), mults: Object.fromEntries(targets.map(entry => [entry.enemy.id, entry.mult])) };
    let checks = Array.from({ length: Math.round(reach * 2) + 1 }, (_, step) => step / 2);
    return checks.map((front, index) => ({
        kind: 'radialBurstWave', label: `서리 파동 ${index + 1}단계`, delayMs: Math.round(front * msPerCell), damageMultiplier: 1,
        singleRepeat: true, aimCell: center, waveDurationMs, targets, wave, impactCells: area.impactCells
    }));
}

/** Where a round wave starts, how far it spreads (cells) and, for a cone, the only cells it strikes (null: everything it reaches).
 * 자신 중심(nova)과 원뿔(cone: 서리바람 내지르기)은 시전자에서 퍼지고, 그 밖은 겨눈 대상에서 퍼진다. 둥근 파동의 거리는 반지름이다
 * (원은 그려지는 고리처럼 반 칸 더). 원뿔 파동은 시전 때 대상을 고른 칸(지금은 옆으로 치는 띠, getGridBandAreaCells) 안만 치고 그 가장 먼
 * 칸까지 퍼진다: 원뿔 길이만큼
 * 시전자 둘레를 모두 치면서 원뿔의 먼 귀퉁이(앞 네 칸, 옆 세 줄)는 닿지 않아, 그곳의 몬스터를 고른 주인공이 맞히지 못한 채 거듭
 * 휘둘렀다(2026-10-17 사용자 "범위 안에 몬스터가 없는데 계속 공격함").
 * @returns {{center:{gx:number,gy:number}, reach:number, cells:?Set<string>}} */
function getRadialWaveShape(gridProfile, area) {
    const fromCaster = gridProfile.kind === 'nova' || gridProfile.kind === 'cone';
    const center = fromCaster ? { ...area.attacker } : getClosestGridUnitCell(area.attacker, area.primary);
    if (gridProfile.kind === 'cone') {
        const cells = area.impactCells || [];
        return { center, cells: new Set(cells.map(cell => gridCellKey(cell.gx, cell.gy))),
            reach: Math.max(1, ...cells.map(cell => Math.hypot(cell.gx - center.gx, cell.gy - center.gy))) };
    }
    const radius = Math.max(1, Number(gridProfile.radius) || 1);
    return { center, cells: null, reach: gridProfile.shape === 'circle' ? radius + 0.5 : radius };
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

/** How far the drawn unit still trails its cell at time t (combat ms): the renderer glides it from the cell it left
 * (js/canvas-battlefield.js approachNumber at COMBAT_GRID_CONFIG.enemyGlideRate), so just after a step it stands between the two. */
function getGridUnitDrawnDelta(unit, t) {
    const from = unit.gridStepFrom, at = Number(unit.gridStepAt);
    if (!from || !Number.isFinite(at)) return { dx: 0, dy: 0 };
    // 옆에서 보는 무대에서는 한 걸음을 고른 빠르기로 걸어간다(js/canvas-stage-stride.js): 그려지는 자리를 같은 식으로 센다
    const walked = typeof stageStride === 'object' && typeof stageView === 'object' && stageView.enabled();
    const lag = walked ? stageStride.lag(t - at, unit) : Math.exp(-COMBAT_GRID_CONFIG.enemyGlideRate * Math.max(0, t - at) / 1000);
    return { dx: (from.gx - unit.gx) * lag, dy: (from.gy - unit.gy) * lag };
}

/** The wave's distance to the drawn unit at time t, in the drawn ring's metric (circle or diamond), to its nearest cell. */
function getGridWaveDrawnDistance(wave, unit, t) {
    const delta = getGridUnitDrawnDelta(unit, t);
    return Math.min(...getGridUnitCells(unit).map(cell => {
        const x = cell.gx + delta.dx - wave.center.gx, y = cell.gy + delta.dy - wave.center.gy;
        return wave.shape === 'diamond' ? Math.abs(x) + Math.abs(y) : Math.hypot(x, y);
    }));
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
        // 제 판정을 가진 단계는 판정 표의 띠를 물려받지 않는다(공허 가르기의 틈 닫힘은 둘레 2칸 원)
        let gridProfile = { ...base, ...(phase.grid && { band: 0 }), ...skillEffectExpansion.stageGrid(phase.grid, skill) };
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

/** 집중(channel): hits번의 시간차 타격. finisher가 있으면 마지막에 제 피해와 범위로 한 번 더(2026-10-17 인계의 전도성 난격이 썼다),
 * advanceCells가 있으면 중간 타격 때 주인공이 겨눈 쪽으로 한 칸 걸어 나간다(js/combat.js advanceHeroForStage). */
function buildChannelSkillHitSequence(skillName, skill, targets, area) {
    const pattern = skill.combatPattern, { attacker, primary, impactCells, intervalMs } = area;
    const hits = Math.max(2, Math.min(8, Math.floor(Number(pattern.hits) || 3)));
    const damageMultiplier = Math.max(0.01, Number(pattern.damagePct) || 100) / 100, advanceAt = pattern.advanceCells ? Math.floor(hits / 2) : -1;
    const stages = Array.from({ length: hits }, (_, idx) => ({
        kind: idx === 0 ? 'channelStart' : 'channelTick', label: `집중 ${idx + 1}회`,
        delayMs: idx * intervalMs, damageMultiplier, singleRepeat: true, impactCells, targets, advanceHero: idx === advanceAt
    }));
    const finisher = pattern.finisher;
    if (!finisher) return stages;
    const profile = { ...getSkillGridProfile(skillName, skill), ...(finisher.grid || {}) };
    stages.push({ kind: 'channelFinisher', label: finisher.label || '마무리', delayMs: hits * intervalMs,
        damageMultiplier: Math.max(0.01, Number(finisher.damagePct) || 100) / 100, singleRepeat: true, targets,
        impactCells: attacker && primary ? getGridAttackAreaCells(profile, attacker, primary) : impactCells });
    return stages;
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
        return buildRadialBurstHitSequence(skillName, skill, targets, { attacker, primary, impactCells });
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
            kind: 'mineDetonate', label: '번개 각인 폭발', delayMs,
            damageMultiplier: 1, singleRepeat: true, impactCells, targets
        }];
    }
    if (pattern.kind === 'channel') return buildChannelSkillHitSequence(skillName, skill, targets, { attacker, primary, impactCells, intervalMs });
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

/** 회오리: as many spins as the skill has targets, one per interval. A spin picks its victim when it lands — the nearest
 * enemy not yet struck around the cell the caster stands in then — so the blade keeps cutting while they move
 * (combat.js pickWhirlSpinTargets). The cast-time primary only anchors the stage. */
function buildWhirlSkillHitSequence(skill, targets, intervalMs) {
    let spins = Math.max(1, Math.floor(Number(skill && skill.targets) || targets.length));
    let whirl = { struck: [] };
    return Array.from({ length: spins }, (_, idx) => ({
        kind: idx === 0 ? 'whirlPrimary' : 'whirlSweep',
        label: idx === 0 ? '회전 시작' : `회전 ${idx + 1}타`,
        delayMs: idx * intervalMs, damageMultiplier: 1, whirl,
        targets: targets.slice(0, 1)
    }));
}

/** 한 번의 스킬 사용을 실제 시간차가 있는 타격 단계로 분해한다. */
function buildSkillHitSequence(skillName, skill, targetEntries) {
    let targets = (targetEntries || []).filter(entry => entry && entry.enemy && entry.enemy.hp > 0);
    if (targets.length <= 0) return [];
    let configured = buildConfiguredSkillHitSequence(skillName, skill, targets);
    if (configured) return configured;
    let profile = getSkillHitSequenceProfile(skillName, skill || {});
    if (profile.kind === 'whirl') return buildWhirlSkillHitSequence(skill, targets, profile.intervalMs);
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

/** 집중의 마무리 일격 배율, 없으면 0. */
function getChannelFinisherMultiplier(pattern) {
    return pattern.kind === 'channel' && pattern.finisher ? Math.max(0.01, Number(pattern.finisher.damagePct) || 100) / 100 : 0;
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
        return hits * Math.max(0.01, Number(pattern.damagePct) || 100) / 100 + getChannelFinisherMultiplier(pattern);
    }
    return null;
}

/** Expected extra count: 5.5 means five guaranteed shots and a 50% sixth shot. */
function rollProjectileExtraShots(expectedShots) {
    const value = Math.max(0, Number(expectedShots) || 0);
    const whole = Math.floor(value);
    const fraction = value - whole;
    return whole + Number(fraction > 0 && Math.random() < fraction);
}

function getProjectileExtraShotDpsMultiplier(skill, expectedShots) {
    if (skill.nativeCastId) return getNativeGemProjectileDpsMultiplier(skill.nativeCastId, expectedShots);
    if (!(skill.tags || []).includes('projectile')) return 1;
    const pct = Math.max(0, Number(skill.extraProjectileDamagePct) || PROJECTILE_BONUS_SHOT_DAMAGE_PCT) / 100;
    const extra = Math.max(0, Number(expectedShots) || 0);
    if (skill.projectilePattern?.kind === 'fan') {
        return getFanProjectileDpsMultiplier(skill.projectilePattern, extra, pct);
    }
    const native = Math.max(1, Math.min(12, Math.floor(skill.multiHit || 1)));
    const baseMultiplier = Number.isFinite(skill.repeatHitDamagePct) ? 1 + (native - 1) * skill.repeatHitDamagePct / 100 : native;
    return 1 + Math.min(extra, 12 - native) * pct / Math.max(0.01, baseMultiplier);
}

function getFanProjectileDpsMultiplier(pattern,extra,pct) {
    const baseRays=Math.max(1,Math.min(8,pattern.rays || 1));
    return (1+(Math.min(8,baseRays+extra)-1)*pct)/(1+(baseRays-1)*pct);
}

/**
 * DPS shares of a fan (연발 사격): one target takes only the middle arrow, the side arrows and extra shots land on other enemies.
 * The shown DPS is that one target's share; packMul brings every arrow back for a pack that takes them all (packDps). Shown
 * numbers used to count every arrow on one target, so the archer's starter gem read as an upgrade while it dealt less than a
 * basic attack (2026-10-07 user decision). Other skills keep their multipliers (packMul 1).
 */
function splitFanSpreadDps(skill, extraShotDpsMul, sequenceDpsMul) {
    if (skill?.projectilePattern?.kind !== 'fan' || skill.nativeCastId) return { extraShotDpsMul, sequenceDpsMul, packMul: 1 };
    return { extraShotDpsMul: 1, sequenceDpsMul: 1, packMul: Math.max(1, sequenceDpsMul) * Math.max(1, extraShotDpsMul) };
}

/** The DPS breakdown's note for a fan: what one target takes, and the most a pack can. */
function getFanSpreadDpsLines(fanSpread, singleTargetDps) {
    if (!(fanSpread.packMul > 1)) return [];
    return [`부채꼴: 한 대상은 가운데 화살만 맞습니다. 옆 화살까지 모두 맞으면 최대 ${Math.floor(singleTargetDps * fanSpread.packMul)} DPS`];
}

// Empty-flask shards roll the fractional bonus independently, with eleven total shards.
function getNativeGemProjectileDpsMultiplier(id, expectedShots) {
    if (id!==49) return 1;
    const extra=Math.max(0,Number(expectedShots)||0),whole=Math.floor(extra),fraction=extra-whole;
    let sum=0;
    for(let base=1;base<=4;base++) {
        let probabilities=[1];
        for(let i=0;i<base;i++) {
            const next=Array(probabilities.length+1).fill(0);
            probabilities.forEach((p,k)=>{next[k]+=p*(1-fraction);next[k+1]+=p*fraction;});
            probabilities=next;
        }
        sum+=probabilities.reduce((value,p,k)=>value+p*Math.min(11-base,base*whole+k),0);
    }
    return 1+(sum/4)*(PROJECTILE_BONUS_SHOT_DAMAGE_PCT/100)/3.5;
}

function getSkillHitSequenceDpsMultiplier(skillName, skill) {
    // 탄성 플라스크(44): 네 번 떨어질 때마다 대상 100%와 둘레 1칸 폭발 30%(js/skill-gem-casts.js stepBounce, 2026-10-17 스킬룬 인계)
    if (skill?.nativeCastId) return ({44:4*1.3,49:3.5})[skill.nativeCastId] || 1;
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


const GRID_PROFILE_KIND_LABELS = Object.freeze({ melee: '인접 단일', arc: '전방 부채꼴', nova: '자신 중심 광역', line: '직선 관통', chain: '연쇄',
    blast: '대상 지점 폭발', fan: '부채꼴 투사체', cone: '전방 부채꼴', summon: '소환수 공격', band: '옆으로 곧게' });
/** 범위 종류의 이름. 'band'는 옆으로만 치는 룬(SKILL_GRID_DB band)이다: 호출부가 profile.band면 'band'를 넘긴다. */
function getSkillGridProfileKindLabel(kind) {
    return Object.hasOwn(GRID_PROFILE_KIND_LABELS, kind) ? GRID_PROFILE_KIND_LABELS[kind] : '그리드 공격';
}

function describeSkillGridProfile(skillName, skillDef) {
    let profile = getSkillGridProfile(skillName, skillDef || {});
    let tags = Array.isArray(skillDef && skillDef.tags) ? skillDef.tags : [];
    let parts = [describeGridAreaTitle(profile, tags, skillDef)];
    parts.push(`사거리 ${Math.max(1, profile.range || 1)}칸`);
    if (profile.band) parts.push(`위아래 ${profile.band}줄까지`);
    if (profile.kind === 'blast' && (profile.radius || 0) > 0) parts.push(`반경 ${profile.radius}칸`);
    if (profile.kind === 'nova') parts.push(`반경 ${Math.max(1, profile.radius || 1)}칸`);
    let shapeLabels = { circle: '원형', diamond: '마름모형', square: '사각형', cross: '십자형', diagonal: 'X자형', ring: '고리형' };
    if (shapeLabels[profile.shape]) parts.push(shapeLabels[profile.shape]);
    if (profile.kind === 'chain') parts.push(`연쇄 ${Math.max(1, profile.jump || COMBAT_GRID_CONFIG.chainJumpRange)}칸`);
    if (profile.kind === 'fan') parts.push(describeGridFanRays(profile));
    if (tags.includes('projectile')) parts.push(skillDef.projectilePatternSource ? `적용: ${skillDef.projectilePatternSource}` : '발사 방식 변경 가능');
    parts.push(...describeWiderStageAreas(skillDef, profile));
    return getSkillGridDescriptionText(skillDef,parts);
}

/** 첫 줄: 투사체는 발사 방식, 그 밖은 공격 범위의 이름(옆으로만 치는 룬은 '옆으로 곧게'). */
function describeGridAreaTitle(profile, tags, skillDef) {
    const kind = getSkillGridProfileKindLabel(profile.band ? 'band' : profile.kind);
    if (!tags.includes('projectile')) return `공격 범위: ${kind}`;
    const mode = skillDef.projectilePattern && skillDef.projectilePattern.mode;
    const modeDef = typeof PROJECTILE_PATTERN_MODE_DB !== 'undefined' && PROJECTILE_PATTERN_MODE_DB[mode];
    return `발사 방식: ${modeDef ? modeDef.label : kind}`;
}

/** 여러 단계로 치는 룬(combatPattern authored)에서 첫 판정보다 넓게 치는 단계: ['얼음 기둥: 전방 부채꼴 3칸'] 같은 줄. 공격 범위가 첫 타격만
 * 말해, 부채꼴 3칸에서 적 여섯을 치는 혹한의 지진이 인접 단일로 보였다(2026-10-17). 모양이 다르거나 반경, 사거리가 더 큰 단계만. */
function describeWiderStageAreas(skillDef, base) {
    const pattern = skillDef && skillDef.combatPattern;
    const stages = pattern && pattern.kind === 'authored' ? pattern.stages : [];
    const wider = grid => grid.kind !== base.kind || (grid.radius || 0) > (base.radius || 0) || (grid.range || 0) > (base.range || 0);
    return stages.filter(stage => stage.grid && stage.grid.kind && wider(stage.grid)).map(stage => {
        const grid = stage.grid, round = grid.kind === 'blast' || grid.kind === 'nova';
        const size = `${round ? '반경 ' + Math.max(1, grid.radius || 1) : Math.max(1, grid.range || 1)}칸${grid.band ? `, 위아래 ${grid.band}줄까지` : ''}`;
        return `${stage.label}: ${getSkillGridProfileKindLabel(grid.band ? 'band' : grid.kind)} ${size}`;
    });
}

/** '5방향', or '5방향(15도 간격)' for an aimed fan. */
function describeGridFanRays(profile) {
    const rays = `${Math.max(1, Math.min(8, Math.floor(Number(profile.rays) || 1)))}방향`;
    return Number(profile.spreadDeg) > 0 ? `${rays}(${profile.spreadDeg}도 간격)` : rays;
}

function getSkillGridDescriptionText(skill,parts) {
    return skill?.rangeText || parts.join(', ');
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
    getCombatGridSize, isGridCellInBounds, gridCellKey, gridChebyshevDist, hasGridCell,
    getGridUnitFootprint, getGridUnitCells, getGridUnitCenter, getGridUnitDistance, fitBossFootprint,
    getGridDirectHitDistanceMultiplier,
    getGridBlockedCells, getHeroStepBlockedCells, swapSummonOutOfHeroTile, findFreeGridCell, assignEnemyGridSpawn, assignEnemyGridCombatProfile,
    resetPlayerGridPosition, ensureCombatGridRuntime, gridLineCells, gridProjectedLineEnd,
    gridStepToward, advanceGridUnitMovement, canGridUnitStepToward, findNearestSafeGridRoute, advanceGridHazardEscape, advanceGridTacticalMovement, getSkillGridProfile, getSkillGridProfileKindLabel,
    describeSkillGridProfile, getGridSkillTargetMult, getGridAttackAreaCells,
    selectGridSkillTargets, findNearestGridEnemy, extendGridTargetsBySpill,
    getSkillHitSequenceProfile, buildSkillHitSequence, getSkillHitSequenceDpsMultiplier, splitFanSpreadDps, getFanSpreadDpsLines
});
