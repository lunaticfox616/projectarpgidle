// 생장판 공간 시너지 계산.
// 계산 단계(spec 12): 배치 유효성 → 활성 목록 → 기하 사실 → 조건 판정 → 정적 보너스 → 캐시.
// 공간 효과는 다른 공간 효과를 재증폭하지 않는다: 모든 조건은 "배치 기하와 아이템 정체성"만 읽고,
// 산출된 grant는 어떤 조건에도 다시 입력되지 않는다(단일 패스, 순환 없음).

const GROWTH_DIRECTIONS = ['up', 'right', 'down', 'left'];
const GROWTH_DIR_VECTORS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const GROWTH_ELEMENT_TAGS = ['화염', '냉기', '번개', '카오스'];

let _growthEffectCache = null;

function invalidateGrowthEffects() {
    _growthEffectCache = null;
}

function isGrowthSynergyStageUnlocked(stageKey) {
    if (!stageKey) return true;
    let stage = (typeof GROWTH_SYNERGY_STAGES !== 'undefined' ? GROWTH_SYNERGY_STAGES : []).find(row => row && row.key === stageKey);
    if (!stage) return true;
    let req = stage.req || {};
    if (Number.isFinite(req.maxZoneId) && Math.floor(game.maxZoneId || 0) < req.maxZoneId) return false;
    if (Number.isFinite(req.season) && Math.floor(game.season || 1) < req.season) return false;
    return true;
}

function getGrowthItemTags(item) {
    let base = getGrowthBaseDef(item);
    let tags = new Set((base && Array.isArray(base.tags) ? base.tags : []).concat(Array.isArray(item.growthTags) ? item.growthTags : []));
    (Array.isArray(item.growthRemovedTags) ? item.growthRemovedTags : []).forEach(tag => tags.delete(tag));
    let categoryLabel = (GROWTH_CATEGORY_INFO[item.growthCategory] || {}).label;
    if (categoryLabel) tags.add(categoryLabel);
    return tags;
}

// ── 기하 사실: 조건 판정이 읽는 유일한 입력 ────────────────────────────────
function buildGrowthGeometryFacts(entries) {
    let owner = new Map();
    entries.forEach(entry => entry.cells.forEach(([x, y]) => owner.set(`${x},${y}`, entry.item.id)));
    let byId = new Map(entries.map(entry => [entry.item.id, entry]));
    let facts = new Map();
    entries.forEach(entry => facts.set(entry.item.id, buildGrowthEntryFacts(entry, owner, byId)));
    return { owner, byId, facts };
}

function buildGrowthEntryFacts(entry, owner, byId) {
    let selfKeys = new Set(entry.cells.map(([x, y]) => `${x},${y}`));
    let adjacentIds = new Set();
    let emptyAdjacent = 0;
    let wallDirs = new Set();
    let neighborDirIds = { up: new Set(), right: new Set(), down: new Set(), left: new Set() };
    let emptyDirs = new Set();
    let outOfBoardNeighbors = 0;
    let occupiedNeighbors = 0;
    entry.cells.forEach(([x, y]) => {
        GROWTH_DIRECTIONS.forEach(dir => {
            let [dx, dy] = GROWTH_DIR_VECTORS[dir];
            let nx = x + dx;
            let ny = y + dy;
            let key = `${nx},${ny}`;
            if (selfKeys.has(key)) return;
            if (nx < 0 || ny < 0 || nx >= GROWTH_BOARD_W || ny >= GROWTH_BOARD_H) {
                wallDirs.add(dir);
                outOfBoardNeighbors++;
                return;
            }
            let ownerId = owner.get(key);
            if (ownerId === undefined) {
                emptyAdjacent++;
                emptyDirs.add(dir);
                return;
            }
            occupiedNeighbors++;
            adjacentIds.add(ownerId);
            neighborDirIds[dir].add(ownerId);
        });
    });
    return {
        entry: entry,
        cells: entry.cells,
        size: entry.cells.length,
        rows: new Set(entry.cells.map(([, y]) => y)),
        cols: new Set(entry.cells.map(([x]) => x)),
        adjacentIds: adjacentIds,
        adjacentEntries: Array.from(adjacentIds).map(id => byId.get(id)).filter(Boolean),
        emptyAdjacent: emptyAdjacent,
        wallDirs: wallDirs,
        emptyDirs: emptyDirs,
        neighborDirIds: neighborDirIds,
        outOfBoardNeighbors: outOfBoardNeighbors,
        occupiedNeighbors: occupiedNeighbors
    };
}

// 방향 조건은 아이템 회전과 함께 회전한다.
function resolveGrowthDirection(dir, rotation) {
    let baseIdx = GROWTH_DIRECTIONS.indexOf(dir);
    if (baseIdx < 0) return dir;
    let steps = ((Math.floor(rotation || 0) % 4) + 4) % 4;
    return GROWTH_DIRECTIONS[(baseIdx + steps) % 4];
}

// ── 조건 판정기 ──────────────────────────────────────────────────────────
// 각 판정기는 충족 횟수(0 = 미충족)를 반환한다. per:true면 횟수만큼 grant를 반복 적용한다.
const GROWTH_CONDITION_HANDLERS = {
    adjAny: (facts) => facts.adjacentEntries.length,
    adjCategory: (facts, when) => facts.adjacentEntries.filter(other => other.item.growthCategory === when.category).length,
    adjOtherCategory: (facts) => facts.adjacentEntries.filter(other => other.item.growthCategory !== facts.entry.item.growthCategory).length,
    emptyAdj: (facts) => facts.emptyAdjacent,
    adjBothCategories: (facts, when) => (when.categories || []).every(category => facts.adjacentEntries.some(other => other.item.growthCategory === category)) ? 1 : 0,
    adjTag: (facts, when) => facts.adjacentEntries.filter(other => getGrowthItemTags(other.item).has(when.tag)).length,
    adjDistinctElements: (facts) => {
        let found = new Set();
        facts.adjacentEntries.forEach(other => GROWTH_ELEMENT_TAGS.forEach(tag => { if (getGrowthItemTags(other.item).has(tag)) found.add(tag); }));
        return found.size;
    },
    // 모든 아이템이 1칸이라 "거리"가 크기를 대신하는 배치 축이 된다.
    atDistance: (facts, when, ctx) => {
        let want = Math.max(1, Math.floor(when.distance || 2));
        return ctx.entries.filter(other => other.item.id !== facts.entry.item.id
            && (!when.category || other.item.growthCategory === when.category)
            && getGrowthEntryDistance(facts.entry, other) === want).length;
    },
    isolated: (facts) => facts.adjacentEntries.length === 0 ? 1 : 0,
    // 판정기는 "충족 규모"를 그대로 돌려주고, min/per 해석은 evaluateGrowthCondition이 단독으로 맡는다.
    wallTouch: (facts) => facts.wallDirs.size,
    dirWall: (facts, when) => facts.wallDirs.has(resolveGrowthDirection(when.dir, facts.entry.placement.rotation)) ? 1 : 0,
    dirEmpty: (facts, when) => facts.emptyDirs.has(resolveGrowthDirection(when.dir, facts.entry.placement.rotation)) ? 1 : 0,
    corner: (facts) => {
        let vertical = facts.wallDirs.has('up') || facts.wallDirs.has('down');
        let horizontal = facts.wallDirs.has('left') || facts.wallDirs.has('right');
        return (vertical && horizontal) ? 1 : 0;
    },
    pinched: (facts) => {
        let pairs = [['up', 'down'], ['left', 'right']];
        return pairs.some(([a, b]) => (facts.wallDirs.has(a) && facts.neighborDirIds[b].size > 0) || (facts.wallDirs.has(b) && facts.neighborDirIds[a].size > 0)) ? 1 : 0;
    },
    surroundedByCategory: (facts, when) => {
        if (facts.occupiedNeighbors <= 0 || facts.emptyAdjacent > 0) return 0;
        return facts.adjacentEntries.every(other => other.item.growthCategory === when.category) ? 1 : 0;
    },
    mirrorOccupied: (facts, when, ctx) => {
        let selfId = facts.entry.item.id;
        return facts.cells.some(([x, y]) => {
            let ownerId = ctx.owner.get(`${GROWTH_BOARD_W - 1 - x},${y}`);
            return ownerId !== undefined && ownerId !== selfId;
        }) ? 1 : 0;
    },
    rowCategoryCount: (facts, when, ctx) => countGrowthLineMatches(facts, when, ctx, 'rows'),
    colCategoryCount: (facts, when, ctx) => countGrowthLineMatches(facts, when, ctx, 'cols'),
    rowTagCount: (facts, when, ctx) => countGrowthLineTagMatches(facts, when, ctx, 'rows'),
    colTagCount: (facts, when, ctx) => countGrowthLineTagMatches(facts, when, ctx, 'cols'),
    rowEdgeCategory: (facts, when, ctx) => isGrowthLineEdgeItem(facts, when, ctx) ? 1 : 0,
    colEdge: (facts, when, ctx) => isGrowthColumnEdgeItem(facts, when, ctx) ? 1 : 0,
    rowOneEmpty: (facts, when, ctx) => Array.from(facts.rows).some(y => countGrowthRowEmptyCells(y, ctx) === 1) ? 1 : 0,
    boardTagCount: (facts, when, ctx) => ctx.entries.filter(entry => getGrowthItemTags(entry.item).has(when.tag)).length
};

// 기본은 자기 자신을 포함한다("같은 열에 가지가 3개 이상" 같은 조건은 자신도 한 개로 센다).
// 자신을 빼야 하는 조건만 when.excludeSelf === true로 명시한다.
function countGrowthLineMatches(facts, when, ctx, axis) {
    let lines = facts[axis];
    let matched = new Set();
    ctx.entries.forEach(entry => {
        if (when.excludeSelf === true && entry.item.id === facts.entry.item.id) return;
        if (when.category && entry.item.growthCategory !== when.category) return;
        let otherFacts = ctx.facts.get(entry.item.id);
        if (!otherFacts) return;
        let shares = Array.from(otherFacts[axis]).some(line => lines.has(line));
        if (shares) matched.add(entry.item.id);
    });
    return matched.size;
}

function countGrowthLineTagMatches(facts, when, ctx, axis) {
    let lines = facts[axis];
    let matched = new Set();
    ctx.entries.forEach(entry => {
        if (!getGrowthItemTags(entry.item).has(when.tag)) return;
        let otherFacts = ctx.facts.get(entry.item.id);
        if (!otherFacts) return;
        if (Array.from(otherFacts[axis]).some(line => lines.has(line))) matched.add(entry.item.id);
    });
    return matched.size;
}

/**
 * 한 줄(행 또는 열)에서 가장 끝에 있는 아이템의 id.
 * @param {Array} entries 판 위 배치 목록
 * @param {{axis:'row'|'col', line:number, wantMax:boolean, category?:string}} query
 * @returns {number|null} 끝 아이템 id (그 줄에 아무것도 없으면 null)
 */
function findGrowthEdgeItemId(entries, query) {
    let best = null;
    entries.forEach(entry => {
        if (query.category && entry.item.growthCategory !== query.category) return;
        let extreme = getGrowthEntryExtremeOnLine(entry, query);
        if (extreme === null) return;
        if (best === null || (query.wantMax ? extreme > best.value : extreme < best.value)) {
            best = { value: extreme, id: entry.item.id };
        }
    });
    return best ? best.id : null;
}

/** 아이템이 그 줄에서 차지한 가장 바깥 좌표. 그 줄에 없으면 null. */
function getGrowthEntryExtremeOnLine(entry, query) {
    let values = collectGrowthCellsOnLine(entry, query.axis, query.line);
    if (values.length === 0) return null;
    return query.wantMax ? Math.max(...values) : Math.min(...values);
}

/** 아이템이 지정한 행/열 위에 놓은 칸들의 좌표(행이면 x, 열이면 y). */
function collectGrowthCellsOnLine(entry, axis, line) {
    let values = [];
    entry.cells.forEach(([cx, cy]) => {
        if (axis === 'row' ? cy === line : cx === line) values.push(axis === 'row' ? cx : cy);
    });
    return values;
}

function isGrowthLineEdgeItem(facts, when, ctx) {
    let wantMax = when.side !== 'left';
    return Array.from(facts.rows).some(y =>
        findGrowthEdgeItemId(ctx.entries, { axis: 'row', line: y, wantMax, category: when.category })
            === facts.entry.item.id);
}

function isGrowthColumnEdgeItem(facts, when, ctx) {
    let wantMax = when.side !== 'top';
    return Array.from(facts.cols).some(x =>
        findGrowthEdgeItemId(ctx.entries, { axis: 'col', line: x, wantMax })
            === facts.entry.item.id);
}

function countGrowthRowEmptyCells(y, ctx) {
    let empty = 0;
    for (let x = 0; x < GROWTH_BOARD_W; x++) {
        if (!isGrowthCellUnlocked(x, y)) continue;
        if (!ctx.owner.has(`${x},${y}`)) empty++;
    }
    return empty;
}

function evaluateGrowthCondition(when, facts, ctx) {
    if (!when || !when.type) return 0;
    let handler = GROWTH_CONDITION_HANDLERS[when.type];
    if (!handler) return 0;
    let count = Math.max(0, Math.floor(Number(handler(facts, when, ctx)) || 0));
    if (count <= 0) return 0;
    let min = Number.isFinite(Number(when.min)) ? Math.max(1, Math.floor(when.min)) : 1;
    if (count < min) return 0;
    return when.per ? count : 1;
}

// ── 전역 시너지 판정기 (판 전체 조건) ────────────────────────────────────
const GROWTH_GLOBAL_HANDLERS = {
    rowFilled: (ctx) => {
        let count = 0;
        for (let y = 0; y < GROWTH_BOARD_H; y++) {
            let unlocked = 0;
            let filled = 0;
            for (let x = 0; x < GROWTH_BOARD_W; x++) {
                if (!isGrowthCellUnlocked(x, y)) continue;
                unlocked++;
                if (ctx.owner.has(`${x},${y}`)) filled++;
            }
            if (unlocked > 0 && unlocked === filled) count++;
        }
        return count;
    },
    mirrorSymmetry: (ctx) => {
        if (ctx.owner.size <= 0) return 0;
        let keys = Array.from(ctx.owner.keys());
        return keys.every(key => {
            let [x, y] = key.split(',').map(Number);
            return ctx.owner.has(`${GROWTH_BOARD_W - 1 - x},${y}`);
        }) ? 1 : 0;
    },
    distinctElementTags: (ctx, rule) => {
        let found = new Set();
        ctx.entries.forEach(entry => GROWTH_ELEMENT_TAGS.forEach(tag => { if (getGrowthItemTags(entry.item).has(tag)) found.add(tag); }));
        return found.size >= Math.max(1, Math.floor(rule.min || 1)) ? 1 : 0;
    },
    tagItemCount: (ctx, rule) => ctx.entries.filter(entry => getGrowthItemTags(entry.item).has(rule.tag)).length >= Math.max(1, Math.floor(rule.min || 1)) ? 1 : 0,
    cornersOccupied: (ctx) => {
        let corners = [[0, 0], [GROWTH_BOARD_W - 1, 0], [0, GROWTH_BOARD_H - 1], [GROWTH_BOARD_W - 1, GROWTH_BOARD_H - 1]];
        return corners.every(([x, y]) => ctx.owner.has(`${x},${y}`)) ? 1 : 0;
    },
    allUniqueBases: (ctx, rule) => {
        if (ctx.entries.length < Math.max(1, Math.floor(rule.min || 1))) return 0;
        let seen = new Set(ctx.entries.map(entry => entry.item.growthBaseId));
        return seen.size === ctx.entries.length ? 1 : 0;
    },
    categoryBalance: (ctx, rule) => {
        let min = Math.max(1, Math.floor(rule.min || 1));
        return ['flower', 'branch', 'leaf'].every(category =>
            ctx.entries.filter(entry => entry.item.growthCategory === category).length >= min) ? 1 : 0;
    },
    emptyUnlockedCells: (ctx, rule) => {
        let board = ensureGrowthBoardState();
        let empty = board.unlockedCellCount - ctx.owner.size;
        return empty >= Math.max(0, Math.floor(rule.min || 0)) ? 1 : 0;
    },
    colCategoryCountPer: (ctx, rule) => {
        let hits = 0;
        for (let x = 0; x < GROWTH_BOARD_W; x++) {
            let ids = new Set();
            ctx.entries.forEach(entry => {
                if (entry.item.growthCategory !== rule.category) return;
                if (entry.cells.some(([cx]) => cx === x)) ids.add(entry.item.id);
            });
            if (ids.size >= Math.max(1, Math.floor(rule.min || 1))) hits++;
        }
        return hits;
    }
};

// ── 생장 고유 전용 효과 ──────────────────────────────────────────────────
function applyGrowthUniqueEffect(entry, facts, ctx, out) {
    let key = entry.item.growthEffectKey;
    if (!key) return;
    let handler = GROWTH_UNIQUE_EFFECT_HANDLERS[key];
    if (!handler) return;
    handler(entry, facts, ctx, out);
}

const GROWTH_UNIQUE_EFFECT_HANDLERS = {
    worldTreeHeart: (entry, facts, ctx, out) => {
        ctx.entries.forEach(other => {
            if (other.item.id === entry.item.id || other.item.growthCategory !== 'flower') return;
            if (getGrowthEntryDistance(entry, other) < 5) return;
            multiplyGrowthItemStats(out, other.item.id, 1.25);
        });
    },
    cradleBranch: (entry, facts, ctx, out) => {
        if (facts.adjacentEntries.length > 0) pushGrowthGrant(out, entry, 'dr', facts.adjacentEntries.length, '요람 가지: 인접 수만큼 물리 피해 감소');
    },
    voidRing: (entry, facts, ctx, out) => {
        getGrowthSurroundingEntries(entry, ctx).forEach(other => multiplyGrowthItemStats(out, other.item.id, 1.35));
    },
    twinSpore: (entry, facts, ctx, out) => {
        ctx.entries.forEach(other => {
            if (other.item.id === entry.item.id || getGrowthEntryDistance(entry, other) !== 2) return;
            (Array.isArray(other.item.stats) ? other.item.stats : []).forEach(stat => {
                if (!stat || !stat.id || !Number.isFinite(Number(stat.val))) return;
                pushGrowthGrant(out, entry, stat.id, Number(stat.val) * 0.2, '쌍둥이 홀씨: 2칸 거리 옵션 복사');
            });
        });
    },
    triElementCore: (entry, facts, ctx, out) => {
        let found = new Set();
        ctx.entries.forEach(other => ['화염', '냉기', '번개'].forEach(tag => { if (getGrowthItemTags(other.item).has(tag)) found.add(tag); }));
        if (found.size < 3) return;
        pushGrowthGrant(out, entry, 'elementalPctDmg', 30, '삼원소 공명핵');
        pushGrowthGrant(out, entry, 'resPen', 6, '삼원소 공명핵');
    },
    boundaryStone: (entry, facts, ctx, out) => {
        if (facts.wallDirs.size > 0) {
            pushGrowthGrant(out, entry, 'resAll', facts.wallDirs.size * 4, '경계석: 외벽 면');
            pushGrowthGrant(out, entry, 'dr', facts.wallDirs.size * 2, '경계석: 외벽 면');
        }
        let vertical = facts.wallDirs.has('up') || facts.wallDirs.has('down');
        let horizontal = facts.wallDirs.has('left') || facts.wallDirs.has('right');
        if (vertical && horizontal) pushGrowthGrant(out, entry, 'pctHp', 10, '경계석: 모서리');
    }
};

/** 주변 8칸(대각선 포함)에 놓인 다른 아이템들. 인접 판정(상하좌우)보다 넓다. */
function getGrowthSurroundingEntries(entry, ctx) {
    let [ox, oy] = entry.cells[0] || [0, 0];
    let found = new Set();
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            let ownerId = ctx.owner.get(`${ox + dx},${oy + dy}`);
            if (ownerId !== undefined && ownerId !== entry.item.id) found.add(ownerId);
        }
    }
    return Array.from(found).map(id => ctx.byId.get(id)).filter(Boolean);
}

function getGrowthEntryDistance(a, b) {
    let best = Infinity;
    a.cells.forEach(([ax, ay]) => b.cells.forEach(([bx, by]) => {
        best = Math.min(best, Math.abs(ax - bx) + Math.abs(ay - by));
    }));
    return best;
}

function pushGrowthGrant(out, entry, statId, val, label) {
    if (!statId || !Number.isFinite(Number(val)) || Number(val) === 0) return;
    out.grants.push({ sourceItemId: entry.item.id, id: statId, val: Number(val), label: label || '' });
}

function multiplyGrowthItemStats(out, itemId, multiplier) {
    out.itemMultipliers.set(itemId, (out.itemMultipliers.get(itemId) || 1) * multiplier);
}

// ── 석판 레벨 레이어 ─────────────────────────────────────────────────────
// 석판이 칸에 레벨을 뿌리고, 아이템은 자신이 점유한 칸 중 최댓값을 받는다.
// 최댓값을 쓰는 이유: 합계로 하면 칸이 많은 대형 아이템이 자동으로 유리해져
// "정밀 배치"라는 소형 아이템의 정체성이 사라진다.

function getGrowthSlabDef(item) {
    if (!isGrowthSlab(item) || typeof GROWTH_SLAB_DB === 'undefined') return null;
    return GROWTH_SLAB_DB.find(row => row && row.id === item.growthSlabId) || null;
}

/** 석판 하나가 영향을 주는 칸 좌표들. 회전은 대칭 패턴이라 영향을 주지 않는다. */
function getGrowthSlabPatternCells(patternKey, originX, originY) {
    let pattern = (typeof GROWTH_SLAB_PATTERNS !== 'undefined' && GROWTH_SLAB_PATTERNS[patternKey]) || null;
    if (!pattern) return [];
    if (pattern.axis === 'row') {
        let cells = [];
        for (let x = 0; x < GROWTH_BOARD_W; x++) if (x !== originX) cells.push([x, originY]);
        return cells;
    }
    if (pattern.axis === 'col') {
        let cells = [];
        for (let y = 0; y < GROWTH_BOARD_H; y++) if (y !== originY) cells.push([originX, y]);
        return cells;
    }
    return (pattern.cells || []).map(([dx, dy]) => [originX + dx, originY + dy])
        .filter(([x, y]) => x >= 0 && y >= 0 && x < GROWTH_BOARD_W && y < GROWTH_BOARD_H);
}

/** 배치된 석판들이 만드는 칸별 레벨 맵. @returns {Map<string, number>} 'x,y' → 레벨 */
/** 석판 하나가 뿌리는 레벨을 칸 맵에 더한다. */
function addGrowthSlabLevels(levels, entry, def) {
    let [originX, originY] = entry.cells[0] || [0, 0];
    (def.grants || []).forEach(grant => {
        let cells = getGrowthSlabPatternCells(grant.pattern, originX, originY);
        cells.forEach(([x, y]) => {
            let key = `${x},${y}`;
            levels.set(key, (levels.get(key) || 0) + Number(grant.level || 0));
        });
    });
}

function buildGrowthCellLevelMap(entries) {
    let levels = new Map();
    entries.forEach(entry => {
        let def = getGrowthSlabDef(entry.item);
        if (def) addGrowthSlabLevels(levels, entry, def);
    });
    return levels;
}

/** 아이템이 받는 레벨 = 점유 칸 레벨의 최댓값. 음수는 0으로 깎지 않고 그대로 둔다(페널티 체감). */
function computeGrowthItemLevel(entry, levelMap) {
    if (isGrowthSlab(entry.item)) return 0;
    let best = null;
    entry.cells.forEach(([x, y]) => {
        let level = levelMap.get(`${x},${y}`) || 0;
        if (best === null || level > best) best = level;
    });
    let resolved = best === null ? 0 : best;
    return Math.max(-GROWTH_LEVEL_CAP, Math.min(GROWTH_LEVEL_CAP, resolved));
}

function getGrowthLevelMultiplier(level) {
    return Math.max(0.1, 1 + (Number(level) || 0) * (GROWTH_LEVEL_STAT_PCT / 100));
}

// ── 스냅샷 계산 + 캐시 ───────────────────────────────────────────────────
function getGrowthEffectSignature(entries) {
    let board = ensureGrowthBoardState();
    let placementKey = entries
        .map(entry => `${entry.item.id}:${entry.placement.x},${entry.placement.y},${entry.placement.rotation}`)
        .sort()
        .join('|');
    return `${board.activeLoadout}#${board.unlockedCellCount}#${game.maxZoneId || 0}#${game.season || 1}#${placementKey}`;
}

function computeGrowthEffectSnapshot() {
    let entries = getPlacedGrowthEntries();
    let geometry = buildGrowthGeometryFacts(entries);
    let ctx = { entries, owner: geometry.owner, byId: geometry.byId, facts: geometry.facts };
    let levelMap = buildGrowthCellLevelMap(entries);
    let out = {
        signature: getGrowthEffectSignature(entries),
        grants: [],
        itemMultipliers: new Map(),
        baseMultipliers: new Map(),
        conditions: new Map(),
        activeGlobals: [],
        cellLevels: levelMap,
        itemLevels: new Map(),
        entryCount: entries.length
    };
    // 석판 레벨은 공간 조건과 독립적으로 먼저 확정된다 — 레벨이 조건 판정에 입력되지 않으므로
    // "레벨이 조건을 바꾸고 조건이 다시 레벨을 바꾸는" 순환이 생기지 않는다.
    entries.forEach(entry => {
        let level = computeGrowthItemLevel(entry, levelMap);
        out.itemLevels.set(entry.item.id, level);
        if (level !== 0) multiplyGrowthItemStats(out, entry.item.id, getGrowthLevelMultiplier(level));
    });
    entries.forEach(entry => {
        let facts = geometry.facts.get(entry.item.id);
        if (facts) evaluateGrowthEntryEffects(entry, facts, ctx, out);
    });
    evaluateGrowthGlobalSynergies(ctx, out);
    // growthSelfBasePct는 스탯이 아니라 "자신의 베이스 옵션 배율"이므로 grants에서 분리한다.
    out.grants = out.grants.filter(grant => {
        if (grant.id !== 'growthSelfBasePct') return true;
        let current = out.baseMultipliers.get(grant.sourceItemId) || 1;
        out.baseMultipliers.set(grant.sourceItemId, current + (grant.val / 100));
        return false;
    });
    return out;
}

function evaluateGrowthEntryEffects(entry, facts, ctx, out) {
    let base = getGrowthBaseDef(entry.item);
    let spatial = (base && base.spatial) ? base.spatial : null;
    let met = [];
    let unmet = [];
    (spatial && Array.isArray(spatial.effects) ? spatial.effects : []).forEach(effect => {
        let stageOpen = isGrowthSynergyStageUnlocked(effect.stage);
        let times = stageOpen ? evaluateGrowthCondition(effect.when, facts, ctx) : 0;
        let label = spatial.desc || '';
        if (!stageOpen) { unmet.push({ label, reason: '시너지 계층 미해금' }); return; }
        if (times <= 0) { unmet.push({ label, reason: '조건 미충족' }); return; }
        met.push({ label, times });
        (effect.grant || []).forEach(grant => pushGrowthGrant(out, entry, grant.id, Number(grant.val || 0) * times, label));
    });
    applyGrowthUniqueEffect(entry, facts, ctx, out);
    out.conditions.set(entry.item.id, { met, unmet });
}

function evaluateGrowthGlobalSynergies(ctx, out) {
    (typeof GROWTH_GLOBAL_SYNERGY_DB !== 'undefined' ? GROWTH_GLOBAL_SYNERGY_DB : []).forEach(rule => {
        if (!isGrowthSynergyStageUnlocked(rule.stage)) return;
        let handler = GROWTH_GLOBAL_HANDLERS[rule.type];
        if (!handler) return;
        let times = Math.max(0, Math.floor(Number(handler(ctx, rule)) || 0));
        if (times <= 0) return;
        let applied = rule.per ? times : 1;
        out.activeGlobals.push({ id: rule.id, label: rule.label, desc: rule.desc, times: applied });
        (rule.grant || []).forEach(grant => {
            out.grants.push({ sourceItemId: null, id: grant.id, val: Number(grant.val || 0) * applied, label: rule.label });
        });
    });
}

// 배치가 바뀔 때만 전체 재계산한다. 전투 틱은 캐시된 결과만 읽는다.
function getGrowthEffectSnapshot() {
    let entries = getPlacedGrowthEntries();
    let signature = getGrowthEffectSignature(entries);
    if (_growthEffectCache && _growthEffectCache.signature === signature) return _growthEffectCache;
    _growthEffectCache = computeGrowthEffectSnapshot();
    return _growthEffectCache;
}

/** 공간 보너스를 스탯 버킷에 적용한다 (getPlayerStats의 reward 버킷 경유). */
function applyGrowthSpatialStats(bucket) {
    let snapshot = getGrowthEffectSnapshot();
    snapshot.grants.forEach(grant => addStatToBucket(bucket, grant.id, grant.val));
    return snapshot;
}

/** 공간 효과로 인한 아이템 전체 효과 배율(공허 고리·세계수의 심장 등). */
function getGrowthItemStatMultiplier(itemId) {
    return getGrowthEffectSnapshot().itemMultipliers.get(itemId) || 1;
}

/** 자신의 베이스 옵션만 증폭하는 배율(중계 덩굴손 등). */
function getGrowthItemBaseMultiplier(itemId) {
    return getGrowthEffectSnapshot().baseMultipliers.get(itemId) || 1;
}

function getGrowthItemConditionReport(itemId) {
    return getGrowthEffectSnapshot().conditions.get(itemId) || { met: [], unmet: [] };
}

function getActiveGrowthGlobalSynergies() {
    return getGrowthEffectSnapshot().activeGlobals;
}

/** 석판으로 아이템이 받은 레벨(음수 가능). */
function getGrowthItemLevel(itemId) {
    return getGrowthEffectSnapshot().itemLevels.get(itemId) || 0;
}

/** 칸이 받는 레벨. 보드 UI가 칸마다 표시한다. */
function getGrowthCellLevel(x, y) {
    return getGrowthEffectSnapshot().cellLevels.get(`${x},${y}`) || 0;
}

safeExposeGlobals({
    invalidateGrowthEffects, isGrowthSynergyStageUnlocked, getGrowthItemTags, resolveGrowthDirection,
    evaluateGrowthCondition, getGrowthEffectSnapshot, applyGrowthSpatialStats,
    getGrowthItemStatMultiplier, getGrowthItemBaseMultiplier, getGrowthItemConditionReport,
    getActiveGrowthGlobalSynergies, getGrowthSlabDef, getGrowthSlabPatternCells,
    getGrowthItemLevel, getGrowthCellLevel, getGrowthLevelMultiplier
});
