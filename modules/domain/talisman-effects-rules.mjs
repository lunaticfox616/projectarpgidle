

export function charmItemAt(box, cell) {
    const id = cell >= 0 ? box.board[cell] : null;
    return id === null || id === undefined ? null : box.items.find(item => item.id === id) || null;
}

export function charmIsAwake(item) {
    return !!item && item.family === 'talisman' && item.ripe === true;
}

/** The cell one step in a direction, or -1 off the board. */
export function charmStepCell(env, cell, dir) {
    const [dx, dy] = env.STEP[dir] || env.STEP[1];
    const x = cell % env.deps.STUMP_BOX_SIZE + dx, y = Math.floor(cell / env.deps.STUMP_BOX_SIZE) + dy;
    return x < 0 || y < 0 || x >= env.deps.STUMP_BOX_SIZE || y >= env.deps.STUMP_BOX_SIZE ? -1 : y * env.deps.STUMP_BOX_SIZE + x;
}

export function charmAddStat(result, id, value) {
    result.stats[id] = (result.stats[id] || 0) + value;
}

export function charmAddStats(result, rows) {
    rows.forEach(([id, value]) => charmAddStat(result, id, value));
}

export function charmAddLines(env, result, talisman, mul, statsOnly) {
    talisman.lines.forEach(line => {
        if (line.kind === 'stat') charmAddStat(result, line.id, line.value * mul);
        else if (!statsOnly) result.conditions.push({ ...env.deps.talismans.conditionDef(line.id), value: Number((line.value * mul).toFixed(2)) });
    });
}

export function charmAwakeNeighbors(env, box, cell, off) {
    return env.deps.stumpBox.neighbors(cell).map(next => charmItemAt(box, next)).filter(item => charmIsAwake(item) && !off.has(item.id));
}

export function charmXy(env, cell) { return [cell % env.deps.STUMP_BOX_SIZE, Math.floor(cell / env.deps.STUMP_BOX_SIZE)]; }

export function charmDistance(env, a, b) {
    const [ax, ay] = charmXy(env, a), [bx, by] = charmXy(env, b);
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

export function charmPieces(box) {
    return box.board.map((id, cell) => ({ item: charmItemAt(box, cell), cell })).filter(entry => entry.item);
}

export function charmNeighborPieces(env, box, cell) {
    return env.deps.stumpBox.neighbors(cell).map(next => charmItemAt(box, next)).filter(Boolean);
}

/** Adds mul × the stat lines of every other awake, switched-on talisman whose cell passes the test. at = { box, cell, off }. */
export function charmBoostAwake(env, result, at, mul, test) {
    charmPieces(at.box).forEach(entry => {
        if (entry.cell !== at.cell && charmIsAwake(entry.item) && !at.off.has(entry.item.id) && test(entry.cell)) charmAddLines(env, result, entry.item, mul, true);
    });
}

/** Grown, unsuppressed seeds and saps (the ones that give their yield). */
export function charmGrownPieces(env, state) {
    const suppressed = env.deps.stumpBox.evaluate(state).suppressed;
    return charmPieces(state.stumpBox).filter(({ item }) => item.family !== 'talisman' && item.ripe === true && !suppressed.has(item.id));
}

export function charmSameLine(env, a, b) {
    const [ax, ay] = charmXy(env, a), [bx, by] = charmXy(env, b);
    return ax === bx || ay === by;
}

export function charmTwoAway(env, a, b) {
    const [ax, ay] = charmXy(env, a), [bx, by] = charmXy(env, b);
    return (ax === bx && Math.abs(ay - by) === 2) || (ay === by && Math.abs(ax - bx) === 2);
}

export function charmBoundaryBonus(env, result, cell) {
    const [x, y] = charmXy(env, cell), last = env.deps.STUMP_BOX_SIZE - 1, side = x === 0 || x === last, edge = y === 0 || y === last;
    const walls = [x === 0, x === last, y === 0, y === last].filter(Boolean).length;
    if (walls) charmAddStats(result, [['resAll', 4 * walls], ['dr', 2 * walls]]);
    if (side && edge) charmAddStat(result, 'pctHp', 10);
}

export function charmAshenSun(env, result, box, cell) {
    const colors = new Set(charmNeighborPieces(env, box, cell).map(item => item.color).filter(Boolean)).size;
    if (colors) charmAddStat(result, 'firePctDmg', 8 * colors);
    if (colors >= 3) charmAddStat(result, 'resPen', 5);
}

export function charmHiveCord(result, box, cell, off) {
    const summonLines = item => item.lines.filter(line => line.kind === 'stat' && line.id.startsWith('summon'));
    const others = charmPieces(box).filter(entry => entry.cell !== cell && charmIsAwake(entry.item) && !off.has(entry.item.id) && summonLines(entry.item).length);
    others.forEach(({ item }) => summonLines(item).forEach(line => charmAddStat(result, line.id, line.value * 0.15)));
    if (others.length >= 4) charmAddStat(result, 'summonCap', 1);
}

export function charmBlueprint(env, result, box, cell) {
    const kinds = charmPieces(box).map(({ item }) => item.family === 'talisman' ? 'talisman' : `${item.family}:${item.color}`);
    if (kinds.length >= 6 && new Set(kinds).size === kinds.length) charmAddLines(env, result, charmItemAt(box, cell), 0.4, true);
}

export function charmDeadStarBonus(env, result, state) {
    const chaos = Math.min(5, charmGrownPieces(env, state).filter(({ item }) => item.color === 'chaos').length);
    if (chaos) charmAddStats(result, [['chaosPctDmg', 8 * chaos], ['dotPctDmg', 8 * chaos]]);
    charmAddStat(result, 'pctHp', -10);
}

/** Awake talismans next to an awake 척력 are switched off (척력 itself never is). */
export function charmRepelled(env, box, awake) {
    const off = new Set();
    awake.forEach(({ item, cell }) => {
        if (item.special !== 'cosmosRepulsion') return;
        charmAwakeNeighbors(env, box, cell, off).forEach(other => { if (other.special !== 'cosmosRepulsion') off.add(other.id); });
    });
    return off;
}

export function charmSignature(box) {
    return box.board.map((id, cell) => {
        const item = id === null ? null : box.items.find(row => row.id === id);
        if (!item) return '-';
        // 씨앗과 흉터는 번호로 센다(색, 갈래, 고대가 번호에 딸려 있다): 머리글자로 세면 씨앗, 수액, 흉터가 같았고 고대가 빠져,
        // 한 칸의 것을 바꿔 놓아도 예전 합계가 남았다(2026-10-20).
        return item.family === 'talisman' ? `${item.id}${item.ripe ? 'R' : ''}${item.dir ?? ''}${item.lines.length}g${box.graft[cell]}`
            : `${item.id}${item.ripe ? 'R' : ''}`;
    }).join('|');
}

export function charmEvaluate(env, box, state) {
    const awake = box.board.map((id, cell) => ({ item: charmItemAt(box, cell), cell })).filter(entry => charmIsAwake(entry.item));
    const off = charmRepelled(env, box, awake);
    const repulsion = awake.some(({ item }) => item.special === 'cosmosRepulsion');
    const result = { stats: {}, conditions: [], bossFinalDmgBonusPct: 0, suppressed: off, amplified: new Set() };
    awake.forEach(({ item, cell }) => {
        if (off.has(item.id)) return;
        const mul = repulsion && item.special !== 'cosmosRepulsion' ? 1.25 : 1;
        if (mul > 1) result.amplified.add(item.id);
        charmAddLines(env, result, item, mul * env.deps.stumpBox.graftMultiplier(box, cell), false);
        if (env.SPECIAL_EFFECTS[item.special]) env.SPECIAL_EFFECTS[item.special](result, box, cell, off, state);
    });
    return result;
}

/** { stats, conditions, bossFinalDmgBonusPct, suppressed, amplified } from the awake talismans on the stump box board. */
export function charmSummarize(env, state) {
    const box = state.stumpBox;
    if (!box || !box.acquired || !Array.isArray(box.board)) return env.EMPTY;
    const key = charmSignature(box);
    if (env.memo.box !== box || env.memo.key !== key) env.memo = { key, box, value: charmEvaluate(env, box, state) };
    return env.memo.value;
}
