// 그루터기 함 부적의 효과 합산(2026-09-30): 판에 놓여 깨어난 부적만 센다. 일반 줄은 능력치로, 조건부 줄은
// talisman-combat.js가 전투 중에 쓰는 목록으로 모은다. 이웃은 판의 상하좌우 칸이다(대각선 아님).
// 척력은 맞닿은 부적을 끄고 나머지 부적을 +25%, 중력은 맞닿은 부적 일반 줄의 25%, 단순한 부적은 표식 방향 부적의
// 일반 줄을 한 번 더, 오만은 맞닿은 조각(계열 무관) 수에 따라, 찰나는 보스 최종 피해, 주베누비아의 선택은 표식이
// 가로(오른쪽 · 왼쪽)면 젬 레벨 +2, 세로면 −2 · 보조 젬 한도 +2, 판결은 번개 피해 변동.
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
        cosmosLightningVariance: result => addStat(result, 'cosmosLightningVariance', 1)
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
        return box.board.map(id => {
            const item = id === null ? null : box.items.find(row => row.id === id);
            if (!item) return '-';
            return item.family === 'talisman' ? `${item.id}${item.ripe ? 'R' : ''}${item.dir ?? ''}${item.lines.length}` : 'x';
        }).join('|');
    }

    function evaluate(box) {
        const awake = box.board.map((id, cell) => ({ item: itemAt(box, cell), cell })).filter(entry => isAwake(entry.item));
        const off = repelled(box, awake);
        const repulsion = awake.some(({ item }) => item.special === 'cosmosRepulsion');
        const result = { stats: {}, conditions: [], bossFinalDmgBonusPct: 0, suppressed: off, amplified: new Set() };
        awake.forEach(({ item, cell }) => {
            if (off.has(item.id)) return;
            const mul = repulsion && item.special !== 'cosmosRepulsion' ? 1.25 : 1;
            if (mul > 1) result.amplified.add(item.id);
            addLines(result, item, mul, false);
            if (SPECIAL_EFFECTS[item.special]) SPECIAL_EFFECTS[item.special](result, box, cell, off);
        });
        return result;
    }

    /** { stats, conditions, bossFinalDmgBonusPct, suppressed, amplified } from the awake talismans on the stump box board. */
    function summarize(state = game) {
        const box = state.stumpBox;
        if (!box || !box.acquired || !Array.isArray(box.board)) return EMPTY;
        const key = signature(box);
        if (memo.box !== box || memo.key !== key) memo = { key, box, value: evaluate(box) };
        return memo.value;
    }

    return Object.freeze({ summarize });
})();
safeExposeGlobals({ talismanEffects });
