// 그루터기 함 부적의 효과 합산(2026-09-30): 판에 놓여 깨어난 부적만 센다. 일반 줄은 능력치로, 조건부 줄은
// talisman-combat.js가 전투 중에 쓰는 목록으로 모은다. 이웃은 판의 상하좌우 칸이다(대각선 아님).
// 척력은 맞닿은 부적을 끄고 나머지 부적을 +25%, 중력은 맞닿은 부적 일반 줄의 25%, 단순한 부적은 표식 방향 부적의
// 일반 줄을 한 번 더, 오만은 맞닿은 조각(계열 무관) 수에 따라, 찰나는 보스 최종 피해, 주베누비아의 선택은 표식이
// 가로(오른쪽 · 왼쪽)면 젬 레벨 +2, 세로면 −2 · 보조 젬 한도 +2, 판결은 번개 피해 변동.
// 야생 고유(예전 생장판 고유)는 판의 거리 · 가장자리 · 맞닿은 조각 · 다 자란 씨앗 · 수액의 색 · 억제를 읽는다(data/talismans.js 설명).
// 접붙이기(7단계): 부적 자신의 줄(일반 · 조건부)은 놓인 칸의 단계만큼 커진다. 다른 부적의 줄을 빌리는 이웃 효과는 그대로다.
const talismanEffects = (() => {
    const PRIDE_BY_NEIGHBORS = [[['gemLevel', 1], ['suppCap', 1]], [['suppCap', 1]], [['pctDmg', 15], ['aspd', 10]]];
    const CHOICE_BY_AXIS = [[['gemLevel', -2], ['suppCap', 2]], [['gemLevel', 2]]];
    const STEP = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const EMPTY = Object.freeze({ stats: Object.freeze({}), conditions: Object.freeze([]), bossFinalDmgBonusPct: 0,
        suppressed: new Set(), amplified: new Set() });
    let memo = { key: null, box: null, value: null };

    function itemAt(box, cell) {
        const id = cell >= 0 ? box.board[cell] : null;
        return id === null || id === undefined ? null : box.items.find(item => item.id === id) || null;
    }

    function isAwake(item) {
        return !!item && item.family === 'talisman' && item.ripe === true;
    }

    /** The cell one step in a direction, or -1 off the board. */
    function stepCell(cell, dir) {
        const [dx, dy] = STEP[dir] || STEP[1];
        const x = cell % STUMP_BOX_SIZE + dx, y = Math.floor(cell / STUMP_BOX_SIZE) + dy;
        return x < 0 || y < 0 || x >= STUMP_BOX_SIZE || y >= STUMP_BOX_SIZE ? -1 : y * STUMP_BOX_SIZE + x;
    }

    function addStat(result, id, value) {
        result.stats[id] = (result.stats[id] || 0) + value;
    }

    function addStats(result, rows) {
        rows.forEach(([id, value]) => addStat(result, id, value));
    }

    function addLines(result, talisman, mul, statsOnly) {
        talisman.lines.forEach(line => {
            if (line.kind === 'stat') addStat(result, line.id, line.value * mul);
            else if (!statsOnly) result.conditions.push({ ...talismans.conditionDef(line.id), value: Number((line.value * mul).toFixed(2)) });
        });
    }

    function awakeNeighbors(box, cell, off) {
        return stumpBox.neighbors(cell).map(next => itemAt(box, next)).filter(item => isAwake(item) && !off.has(item.id));
    }

    const xy = cell => [cell % STUMP_BOX_SIZE, Math.floor(cell / STUMP_BOX_SIZE)];

    function distance(a, b) {
        const [ax, ay] = xy(a), [bx, by] = xy(b);
        return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
    }

    function pieces(box) {
        return box.board.map((id, cell) => ({ item: itemAt(box, cell), cell })).filter(entry => entry.item);
    }

    function neighborPieces(box, cell) {
        return stumpBox.neighbors(cell).map(next => itemAt(box, next)).filter(Boolean);
    }

    /** Adds mul × the stat lines of every other awake, switched-on talisman whose cell passes the test. at = { box, cell, off }. */
    function boostAwake(result, at, mul, test) {
        pieces(at.box).forEach(entry => {
            if (entry.cell !== at.cell && isAwake(entry.item) && !at.off.has(entry.item.id) && test(entry.cell)) addLines(result, entry.item, mul, true);
        });
    }

    /** Grown, unsuppressed seeds and saps (the ones that give their yield). */
    function grownPieces(state) {
        const suppressed = stumpBox.evaluate(state).suppressed;
        return pieces(state.stumpBox).filter(({ item }) => item.family !== 'talisman' && item.ripe === true && !suppressed.has(item.id));
    }

    function sameLine(a, b) {
        const [ax, ay] = xy(a), [bx, by] = xy(b);
        return ax === bx || ay === by;
    }

    function twoAway(a, b) {
        const [ax, ay] = xy(a), [bx, by] = xy(b);
        return (ax === bx && Math.abs(ay - by) === 2) || (ay === by && Math.abs(ax - bx) === 2);
    }

    function boundaryBonus(result, cell) {
        const [x, y] = xy(cell), last = STUMP_BOX_SIZE - 1, side = x === 0 || x === last, edge = y === 0 || y === last;
        const walls = [x === 0, x === last, y === 0, y === last].filter(Boolean).length;
        if (walls) addStats(result, [['resAll', 4 * walls], ['dr', 2 * walls]]);
        if (side && edge) addStat(result, 'pctHp', 10);
    }

    function ashenSun(result, box, cell) {
        const colors = new Set(neighborPieces(box, cell).map(item => item.color).filter(Boolean)).size;
        if (colors) addStat(result, 'firePctDmg', 8 * colors);
        if (colors >= 3) addStat(result, 'resPen', 5);
    }

    function hiveCord(result, box, cell, off) {
        const summonLines = item => item.lines.filter(line => line.kind === 'stat' && line.id.startsWith('summon'));
        const others = pieces(box).filter(entry => entry.cell !== cell && isAwake(entry.item) && !off.has(entry.item.id) && summonLines(entry.item).length);
        others.forEach(({ item }) => summonLines(item).forEach(line => addStat(result, line.id, line.value * 0.15)));
        if (others.length >= 4) addStat(result, 'summonCap', 1);
    }

    function blueprint(result, box, cell) {
        const kinds = pieces(box).map(({ item }) => item.family === 'talisman' ? 'talisman' : `${item.family}:${item.color}`);
        if (kinds.length >= 6 && new Set(kinds).size === kinds.length) addLines(result, itemAt(box, cell), 0.4, true);
    }

    function deadStarBonus(result, state) {
        const chaos = Math.min(5, grownPieces(state).filter(({ item }) => item.color === 'chaos').length);
        if (chaos) addStats(result, [['chaosPctDmg', 8 * chaos], ['dotPctDmg', 8 * chaos]]);
        addStat(result, 'pctHp', -10);
    }

    const WILD_EFFECTS = Object.freeze({
        farReach: (result, box, cell, off) => boostAwake(result, { box, cell, off }, 0.25, other => distance(cell, other) >= 3),
        voidRing: (result, box, cell, off) => boostAwake(result, { box, cell, off }, 0.35, other => distance(cell, other) === 1),
        twinSpore: (result, box, cell, off) => boostAwake(result, { box, cell, off }, 0.2, other => twoAway(cell, other)),
        stormConduit: (result, box, cell, off) => boostAwake(result, { box, cell, off }, 0.18, other => sameLine(cell, other)),
        cradle: (result, box, cell) => addStat(result, 'dr', neighborPieces(box, cell).length),
        bloodTithe: (result, box, cell) => {
            const count = neighborPieces(box, cell).length;
            if (count) addStats(result, [['physPctDmg', 7 * count], ['pctHp', -2 * count]]);
        },
        boundary: (result, box, cell) => boundaryBonus(result, cell),
        ashenSun,
        triElement: (result, box, cell, off, state) => {
            const colors = new Set(grownPieces(state).map(({ item }) => item.color));
            if (['fire', 'cold', 'lightning'].every(color => colors.has(color))) addStats(result, [['elementalPctDmg', 30], ['resPen', 6]]);
        },
        firstHarvest: (result, box, cell) => {
            const seeds = Math.min(3, pieces(box).filter(({ item }) => item.family === 'seed' && item.ripe === true).length);
            if (seeds) addLines(result, itemAt(box, cell), 0.1 * seeds, true);
        },
        invertedRoot: (result, box, cell, off, state) => {
            const count = Math.min(4, stumpBox.evaluate(state).suppressed.size);
            if (count) addStats(result, [['pctHp', 5 * count], ['armor', 25 * count]]);
        },
        hiveCord,
        blueprint,
        deadStar: (result, box, cell, off, state) => deadStarBonus(result, state)
    });

    const SPECIAL_EFFECTS = Object.freeze({
        gravity: (result, box, cell, off) => awakeNeighbors(box, cell, off).forEach(item => addLines(result, item, 0.25, true)),
        simpleCopy: (result, box, cell, off) => {
            const target = itemAt(box, stepCell(cell, itemAt(box, cell).dir));
            if (isAwake(target) && !off.has(target.id)) addLines(result, target, 1, true);
        },
        pride: (result, box, cell) => {
            const count = stumpBox.neighbors(cell).filter(next => itemAt(box, next)).length;
            addStats(result, PRIDE_BY_NEIGHBORS[Math.min(2, count)]);
        },
        moment: (result, box, cell) => { result.bossFinalDmgBonusPct = Math.max(result.bossFinalDmgBonusPct, itemAt(box, cell).moment || 5); },
        cosmosChoice: (result, box, cell) => addStats(result, CHOICE_BY_AXIS[(itemAt(box, cell).dir ?? 1) % 2]),
        cosmosLightningVariance: result => addStat(result, 'cosmosLightningVariance', 1),
        ...WILD_EFFECTS
    });

    /** Awake talismans next to an awake 척력 are switched off (척력 itself never is). */
    function repelled(box, awake) {
        const off = new Set();
        awake.forEach(({ item, cell }) => {
            if (item.special !== 'cosmosRepulsion') return;
            awakeNeighbors(box, cell, off).forEach(other => { if (other.special !== 'cosmosRepulsion') off.add(other.id); });
        });
        return off;
    }

    function signature(box) {
        return box.board.map((id, cell) => {
            const item = id === null ? null : box.items.find(row => row.id === id);
            if (!item) return '-';
            return item.family === 'talisman' ? `${item.id}${item.ripe ? 'R' : ''}${item.dir ?? ''}${item.lines.length}g${box.graft[cell]}`
                : `${item.family[0]}${item.color}${item.ripe ? 'R' : ''}`;
        }).join('|');
    }

    function evaluate(box, state) {
        const awake = box.board.map((id, cell) => ({ item: itemAt(box, cell), cell })).filter(entry => isAwake(entry.item));
        const off = repelled(box, awake);
        const repulsion = awake.some(({ item }) => item.special === 'cosmosRepulsion');
        const result = { stats: {}, conditions: [], bossFinalDmgBonusPct: 0, suppressed: off, amplified: new Set() };
        awake.forEach(({ item, cell }) => {
            if (off.has(item.id)) return;
            const mul = repulsion && item.special !== 'cosmosRepulsion' ? 1.25 : 1;
            if (mul > 1) result.amplified.add(item.id);
            addLines(result, item, mul * stumpBox.graftMultiplier(box, cell), false);
            if (SPECIAL_EFFECTS[item.special]) SPECIAL_EFFECTS[item.special](result, box, cell, off, state);
        });
        return result;
    }

    /** { stats, conditions, bossFinalDmgBonusPct, suppressed, amplified } from the awake talismans on the stump box board. */
    function summarize(state = game) {
        const box = state.stumpBox;
        if (!box || !box.acquired || !Array.isArray(box.board)) return EMPTY;
        const key = signature(box);
        if (memo.box !== box || memo.key !== key) memo = { key, box, value: evaluate(box, state) };
        return memo.value;
    }

    return Object.freeze({ summarize });
})();
safeExposeGlobals({ talismanEffects });
