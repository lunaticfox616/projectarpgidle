// 그루터기 함 도메인: 획득·배치·성장·거름·공명·억제·드랍·루프 회귀를 소유한다. DOM·전투 계산·저장 입출력은 모른다.
// 전투는 처치(onEnemyKilled)만 넘기고, 능력치 파이프라인은 applyStats로 계산 결과를 한 번 합산한다.
// 설계: docs/stump-cube-game-design.md, 수치: data/stump-box.js. 공명·억제·능력치는 저장하지 않고 배치에서 계산한다.
// 부적(family 'talisman')은 색 없는 세 번째 계열: 판에서 깨어나고(성장), 공명 · 억제 · 꽃 능력치에 끼지 않는다.
// 부적의 줄과 이웃 효과는 talismans.js / talisman-effects.js가 맡고, 여기서는 보관 · 배치 · 깨어남 · 저장 경계만 다룬다.
// 접붙이기(graft, 칸마다 0~5단계, 루프 45부터 6)는 칸에 붙는다: 아이템을 옮기면 새 칸의 단계를 따른다. 씨앗 · 수액 값은 여기서,
// 부적 줄은 talisman-effects.js가 graftMultiplier로 키운다.
// 16번(2026-10-08): 다 자라는 순간 풍작, 황금, 추가 줄을 굴리고(item.harvest, 새 루프에 지우고 다시 굴린다), 봉인 칸(box.sealed)의 것은
// 그대로 루프를 넘긴다. 불씨의 흉터(family 'scar', 색 없음, 포식이 열릴 때 하나 box.scarGift)는 루프를 넘길 때 둘레 8칸 하나를 먹고 흡수한다(포식). 번식, 씨앗 주머니,
// 일괄 거름 사용과 일괄 버리기, 부적 도감(box.codex)도 여기 있다. 수치는 data/stump-box.js.
// 씨앗이 꽃이 될지 열매가 될지는 생길 때 무작위로 정해진다(2026-10-09, 전에는 놓을 때 골랐다). 판 1 저장의 고르지 않은 씨앗은 id로 나눈다.
// 성장량 필드 이름이 xp인 것은 의도다: 영구 빌드 서명(getPersistentBuildSignature)이 xp를 빼므로 처치마다
// 장비 분석 캐시가 깨지지 않고, 다 자라 능력치가 바뀌는 순간만 ripe가 바뀌어 캐시가 새로 계산된다.
const stumpBox = (() => {
    const CELLS = STUMP_BOX_SIZE * STUMP_BOX_SIZE;
    const FAMILIES = ['seed', 'sap'], PATHS = ['flower', 'fruit'], COLORS = Object.keys(STUMP_BOX_COLORS);
    const FIXED_TARGET = { sap: 'amber', talisman: 'talisman', scar: 'scar' };
    const MOORE = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    /** Every line the box can give: the main lines (STUMP_BOX_YIELDS), then the extra lines (STUMP_BOX_EXTRA_LINES). */
    const LINE_ROWS = Object.freeze(Object.values(STUMP_BOX_YIELDS).flatMap(Object.values)
        .concat(Object.values(STUMP_BOX_EXTRA_LINES).flatMap(Object.values).flat()));
    /** The most one stat can hold on a scar: its largest base value (a main or an extra line) × capMul. */
    const SCAR_CAPS = (() => {
        const out = {};
        LINE_ROWS.forEach(row => { out[row.stat] = Math.max(out[row.stat] || 0, row.value * STUMP_BOX_SCAR.capMul); });
        return Object.freeze(out);
    })();
    const HARVEST_ROWS = Object.keys(STUMP_BOX_HARVEST.rows);
    const HARVEST_KEYS = HARVEST_ROWS.flatMap(row => COLORS.map(color => `${row}-${color}`));
    // 판 2(2026-10-09): 성장 필요량 8배(data/stump-box.js STUMP_BOX_GROWTH). 판 1 저장은 restore가 한 번 옮긴다(upgradeGrowth).
    const BOX_VERSION = 2;
    let memo = { key: null, box: null, value: null };

    function emptyHarvest() {
        return { grown: [], gifts: Object.fromEntries(HARVEST_ROWS.map(row => [row, false])) };
    }
    function empty() {
        return { version: BOX_VERSION, acquired: false, via: null, starter: { seed: false, sap: false }, nextId: 1, items: [], board: Array(CELLS).fill(null),
            graft: Array(CELLS).fill(0), harvest: emptyHarvest(), sealed: [], pouches: { opened: [], offers: {} }, codex: [], scarGift: false };
    }
    /** What a new seed grows into (꽃, 열매), rolled when it is made (2026-10-09 사용자: 고르지 않고 무작위). */
    function seedPath(random = Math.random) { return random() < STUMP_BOX_SEED_PATH.fruitShare ? 'fruit' : 'flower'; }
    /** A seed saved before paths were rolled at birth and never planted: a fixed half by id (restore stays repeatable). */
    function legacyPath(id) { return Number(id) % 2 ? 'fruit' : 'flower'; }
    /** @returns {object} The state's box, created empty when missing. */
    function of(state) {
        if (!state.stumpBox || typeof state.stumpBox !== 'object') state.stumpBox = empty();
        return state.stumpBox;
    }

    // ── 아이템 ─────────────────────────────────────────────
    function need(item) { return STUMP_BOX_GROWTH.need[item.family]; }
    function isMature(item) { return item.ripe === true; }
    /** seed · sprout · flower · fruit / sap · resin · amber */
    // Colourless families: awake under their own stage name, asleep under this one.
    const ASLEEP = Object.freeze({ talisman: 'sealed', scar: 'scarAsleep' });
    function stageOf(item) {
        if (ASLEEP[item.family]) return isMature(item) ? item.family : ASLEEP[item.family];
        const half = item.xp >= need(item) * STUMP_BOX_GROWTH.sproutAt;
        if (item.family === 'sap') return isMature(item) ? 'amber' : half ? 'resin' : 'sap';
        if (isMature(item) && item.path) return item.path;
        return half ? 'sprout' : 'seed';
    }
    /** flower · fruit · amber: what a seed or sap grows into (null for a seed without a path and for talismans). */
    function yieldKind(item) { return item.family === 'sap' ? 'amber' : item.family === 'seed' ? item.path : null; }
    /** What the item gives once grown (a seed needs its path first). */
    function yieldOf(item) {
        const kind = yieldKind(item);
        return kind ? STUMP_BOX_YIELDS[kind][item.color] : null;
    }
    function targetStage(item) { return FIXED_TARGET[item.family] || item.path; }
    /** '황금 화염 꽃': colour and stage without the target (talismans and scars by name). */
    function shortName(item) {
        if (item.family === 'talisman') return isMature(item) ? item.name : `${item.name} (잠듦)`;
        if (item.family === 'scar') return isMature(item) ? STUMP_BOX_SCAR.name : `${STUMP_BOX_SCAR.name} (잠듦)`;
        return `${goldenMul(item) > 1 ? '황금 ' : ''}${item.ancient ? '고대 ' : ''}${STUMP_BOX_COLORS[item.color].label} ${STUMP_BOX_STAGES[stageOf(item)].label}`;
    }
    /** shortName, plus what a growing seed or sap turns into ('화염 새싹 → 꽃'). */
    function label(item) {
        const target = targetStage(item);
        return shortName(item) + (item.color && target && !isMature(item) ? ` → ${STUMP_BOX_STAGES[target].label}` : '');
    }
    /** A stat line in the box's own words ('점화 확률 +3%'): main lines, extra lines and a scar's lines share them. */
    function lineText(stat, value) {
        const row = LINE_ROWS.find(entry => entry.stat === stat), shown = String(Math.round(value * 10) / 10);
        return row ? row.text.replace('{v}', shown) : `${getStatName(stat)} +${shown}`;
    }
    function iconPath(item) {
        const icon = STUMP_BOX_STAGES[stageOf(item)].icon, suffix = item.family === 'talisman' ? item.rarity : item.color;
        return `assets/px/stump/${icon}${suffix ? `-${suffix}` : ''}.png`;
    }
    function findItem(box, id) { return box.items.find(item => item.id === id) || null; }
    function cellOf(state, id) { return of(state).board.indexOf(id); }
    function storage(state) {
        const box = of(state), placed = new Set(box.board.filter(id => id !== null));
        return box.items.filter(item => !placed.has(item.id));
    }
    function clampRoll(value, cap = STUMP_BOX_ROLL_LIMIT.max) {
        return Math.round(Math.min(cap, Math.max(STUMP_BOX_ROLL_LIMIT.min, Number(value) || 1)) * 100) / 100;
    }
    /** Highest stored quality: 130%, raised by the box's unlocks (qualityCap, loops 35 and 45). */
    function rollCap(state) { return Math.max(STUMP_BOX_ROLL_LIMIT.max, ...openUnlocks(state).map(row => row.qualityCap || 0)); }
    /** Adds a new item to storage; null when storage is full or the input is invalid. spec.golden makes a golden seed or sap.
     * A seed grows into spec.path (꽃, 열매) when given, otherwise into one rolled now. */
    function createItem(state, spec) {
        const box = of(state);
        if (!FAMILIES.includes(spec.family) || !COLORS.includes(spec.color)) return null;
        if (storageFull(state)) return null;
        const path = spec.family === 'seed' ? (PATHS.includes(spec.path) ? spec.path : seedPath()) : null;
        const item = { id: box.nextId++, family: spec.family, color: spec.color, path, xp: 0, ripe: false, roll: clampRoll(spec.roll, rollCap(state)) };
        if (spec.golden === true) item.golden = true;
        if (spec.ancient === true && spec.family === 'seed') item.ancient = true;
        box.items.push(item);
        return item;
    }
    /** Adds an unsealed talisman (talismans.js fields, normalized here) to storage. force: a boss reward that must not be lost to a full storage. */
    function addTalisman(state, talisman, force) {
        const box = of(state), fields = talismans.normalizeTalisman(talisman);
        if (!box.acquired || !fields || (!force && storageFull(state))) return null;
        const item = { id: box.nextId++, family: 'talisman', color: null, path: null, xp: 0, ripe: false, roll: 1, ...fields };
        box.items.push(item);
        recordCodex(box, item);
        return item;
    }
    /** Throws away a stored (not placed) item. */
    function discard(state, id) {
        const box = of(state);
        if (box.board.includes(id) || !findItem(box, id)) return false;
        box.items = box.items.filter(item => item.id !== id);
        return true;
    }

    // ── 칸 ─────────────────────────────────────────────────
    function highestLoop(state) {
        const ledger = state.contentProgression && state.contentProgression.highestLoop;
        return Math.max(1, Math.floor(Number(state.season) || 1), Math.floor(Number(ledger) || 1));
    }
    /** Open cells: the centre 3×3 on acquisition, then one more every STUMP_BOX_OPENING.everyLoops reached loops. */
    function openCount(state) {
        if (!of(state).acquired) return 0;
        const steps = Math.floor((highestLoop(state) - 1) / STUMP_BOX_OPENING.everyLoops);
        return Math.min(STUMP_BOX_CELL_ORDER.length, STUMP_BOX_OPENING.start + steps);
    }
    /** The loop that opens the cell at this place in the opening order. */
    function loopForRank(rank) {
        return rank < STUMP_BOX_OPENING.start ? 1 : 1 + (rank + 1 - STUMP_BOX_OPENING.start) * STUMP_BOX_OPENING.everyLoops;
    }
    function isOpen(state, cell) { return STUMP_BOX_CELL_ORDER.slice(0, openCount(state)).includes(cell); }
    /** The loop that opens a closed cell (the board's hint), or null when it is open. */
    function opensAt(state, cell) {
        const rank = STUMP_BOX_CELL_ORDER.indexOf(cell);
        return isOpen(state, cell) || rank < 0 ? null : loopForRank(rank);
    }
    /** The next opening { loop, cells } (cells = the count after it), or null when the whole board is open. */
    function nextOpening(state) {
        const open = openCount(state);
        return open < STUMP_BOX_CELL_ORDER.length ? { loop: loopForRank(open), cells: open + 1 } : null;
    }
    function neighbors(cell) {
        const x = cell % STUMP_BOX_SIZE, y = Math.floor(cell / STUMP_BOX_SIZE), out = [];
        if (x > 0) out.push(cell - 1);
        if (x < STUMP_BOX_SIZE - 1) out.push(cell + 1);
        if (y > 0) out.push(cell - STUMP_BOX_SIZE);
        if (y < STUMP_BOX_SIZE - 1) out.push(cell + STUMP_BOX_SIZE);
        return out;
    }

    // ── 배치(나무꾼 전투 중에는 세팅을 바꾸지 않는다) ─────────────
    function editable(state) { return of(state).acquired && !state.woodsmanBuildLock; }
    /** Places (or moves) an item onto an open, empty cell. */
    function place(state, id, cell) {
        const box = of(state), item = findItem(box, id);
        if (!editable(state) || !item || !isOpen(state, cell) || box.board[cell] !== null) return false;
        const from = box.board.indexOf(id);
        if (from >= 0) box.board[from] = null;
        box.board[cell] = id;
        return true;
    }
    /**
     * Moves an item onto an open cell, empty or not. An item already there trades places: it takes the mover's old
     * cell, or goes to storage when the mover came from storage (storage size stays the same). Returns false and
     * changes nothing when the move is not allowed or goes nowhere.
     */
    function move(state, id, cell) {
        const box = of(state), item = findItem(box, id), from = box.board.indexOf(id), occupant = box.board[cell];
        if (!editable(state) || !item || !isOpen(state, cell) || from === cell) return false;
        if (occupant === null) return place(state, id, cell);
        box.board[cell] = id;
        if (from >= 0) box.board[from] = occupant;
        return true;
    }
    function unplace(state, id) {
        const box = of(state), from = box.board.indexOf(id);
        if (!editable(state) || from < 0 || storageFull(state)) return false;
        box.board[from] = null;
        return true;
    }

    // ── 판정(계산만, 저장하지 않음) ─────────────────────────
    /** Everything an item's effect reads: ripeness, quality, golden, the ripening roll and a scar's absorbed lines. */
    function itemSignature(item) {
        const lines = item.harvest ? `h${item.harvest.bonus}${item.harvest.golden ? 'G' : ''}${item.harvest.lines.map(line => line.stat + line.value).join(',')}` : '';
        const absorbed = item.absorbed ? Object.entries(item.absorbed).map(([stat, value]) => stat + value).join(',') : '';
        return `${item.id}${item.color}${item.path || ''}${item.ripe ? 'R' : ''}${item.roll}${item.golden ? 'G' : ''}${item.ancient ? 'A' : ''}${lines}${absorbed}`;
    }
    function signature(box) {
        return box.board.map((id, cell) => {
            const item = id === null ? null : findItem(box, id);
            return item ? `${itemSignature(item)}g${box.graft[cell]}` : '-';
        }).join('|');
    }
    function placedItems(box) { return box.board.filter(id => id !== null).map(id => findItem(box, id)).filter(Boolean); }
    function placedCells(box) {
        return box.board.map((id, cell) => ({ item: id === null ? null : findItem(box, id), cell })).filter(entry => entry.item);
    }
    function suppressedIds(box) {
        const out = new Set();
        box.board.forEach((id, cell) => {
            const item = id === null ? null : findItem(box, id);
            if (!item || !item.color) return;
            for (const next of neighbors(cell)) {
                const other = box.board[next] === null ? null : findItem(box, box.board[next]);
                if (other && STUMP_BOX_OPPOSITES[item.color] === other.color) { out.add(item.id); out.add(other.id); }
            }
        });
        return out;
    }
    /** Quality this ripening counts: the stored roll plus a bumper harvest's bonus (풍작). */
    function qualityOf(item) { return item.roll + ((item.harvest && item.harvest.bonus) || 0); }
    /** 황금(born golden or golden at ripening): every line × STUMP_BOX_RIPENING.golden.mul. */
    function goldenMul(item) { return item.golden || (item.harvest && item.harvest.golden) ? STUMP_BOX_RIPENING.golden.mul : 1; }
    function itemScale(item, resonant, graft) {
        const boost = resonant.has(item.color) ? 1 + STUMP_BOX_RESONANCE.bonusPct / 100 : 1;
        return qualityOf(item) * goldenMul(item) * boost * graft;
    }
    function itemValue(item, resonant, graft) {
        return Math.round(yieldOf(item).value * itemScale(item, resonant, graft) * 100) / 100;
    }
    /** The ripening roll's extra lines at the item's quality, golden, resonance and graft. */
    function lineValues(item, resonant, graft) {
        const scale = itemScale(item, resonant, graft);
        return ((item.harvest && item.harvest.lines) || []).map(line => ({ stat: line.stat, value: Math.round(line.value * scale * 100) / 100 }));
    }
    /** A placed, awake scar's absorbed lines at its cell's graft (no resonance: it has no colour). */
    function scarValues(item, graft) {
        return Object.entries(item.absorbed || {}).map(([stat, value]) => ({ stat, value: Math.round(value * graft * 100) / 100 }));
    }
    function addLines(stats, lines) {
        lines.forEach(line => { stats[line.stat] = Math.round(((stats[line.stat] || 0) + line.value) * 100) / 100; });
    }
    /** Suppression (opposite colours side by side), resonance (3+ grown, unsuppressed of a colour) and stat totals. */
    function evaluate(state) {
        const box = of(state), key = signature(box);
        if (memo.key === key && memo.box === box) return memo.value;
        const suppressed = suppressedIds(box), counts = Object.fromEntries(COLORS.map(color => [color, 0]));
        const grown = placedCells(box).filter(({ item }) => isMature(item) && yieldOf(item) && !suppressed.has(item.id));
        // 고대 씨앗(루프 42)은 모든 색의 공명에 하나로 센다.
        grown.forEach(({ item }) => (item.ancient ? COLORS : [item.color]).forEach(color => { counts[color]++; }));
        const resonant = new Set(COLORS.filter(color => counts[color] >= STUMP_BOX_RESONANCE.count));
        const stats = {}, values = {}, extras = {};
        for (const { item, cell } of grown) {
            values[item.id] = itemValue(item, resonant, graftMultiplier(box, cell));
            extras[item.id] = lineValues(item, resonant, graftMultiplier(box, cell));
            addLines(stats, [{ stat: yieldOf(item).stat, value: values[item.id] }].concat(extras[item.id]));
        }
        placedCells(box).filter(({ item }) => item.family === 'scar' && isMature(item)).forEach(({ item, cell }) => {
            extras[item.id] = scarValues(item, graftMultiplier(box, cell));
            addLines(stats, extras[item.id]);
        });
        const value = { suppressed, counts, resonant, stats, values, extras };
        memo = { key, box, value };
        return value;
    }
    /** An item's extra lines now: the board's values (evaluate's extras) when placed and working, otherwise a grown seed's or
     * sap's ripening lines at its quality and golden, or what a scar absorbed. */
    function extraLinesOf(item, result) {
        if (result.extras[item.id]) return result.extras[item.id];
        if (item.family === 'scar') return Object.entries(item.absorbed || {}).map(([stat, value]) => ({ stat, value }));
        const scale = qualityOf(item) * goldenMul(item), lines = isMature(item) && item.harvest ? item.harvest.lines : [];
        return lines.map(line => ({ stat: line.stat, value: Math.round(line.value * scale * 100) / 100 }));
    }
    /** Adds the box's grown, unsuppressed yields to a stat bucket (the pipeline's reward bucket). */
    function applyStats(bucket, state) {
        if (!state.stumpBox || !state.stumpBox.acquired) return;
        const stats = evaluate(state).stats;
        Object.keys(stats).forEach(stat => addStatToBucket(bucket, stat, stats[stat]));
    }

    // ── 접붙이기(7단계, 가지치기 자리) ─────────────────────────
    // 점수는 저장하지 않는다: 최고 도달 루프가 startLoop 이상이면 루프마다 pointsPerLoop점, 쓴 점수는 칸 단계의 합(n단계에 n점).
    const graftCost = rank => rank * (rank + 1) / 2;
    function graftRank(box, cell) { return box.graft[cell]; }
    /** The effect multiplier for whatever sits on the cell (1 without a graft). */
    function graftMultiplier(box, cell) { return 1 + (box.graft[cell] + ancientRanks(box, cell)) * STUMP_BOX_GRAFT.pctPerRank / 100; }
    /** Graft ranks the awake, unsuppressed ancient seeds beside a cell lend it (12번 루프 42). */
    function ancientRanks(box, cell) {
        const near = neighbors(cell).map(at => box.board[at]).filter(id => id !== null).map(id => findItem(box, id))
            .filter(item => item && item.ancient && isMature(item));
        if (!near.length) return 0;
        const suppressed = suppressedIds(box);
        return near.filter(item => !suppressed.has(item.id)).length * STUMP_BOX_ANCIENT.graftRanks;
    }
    function graftOpen(state) { return of(state).acquired && highestLoop(state) >= STUMP_BOX_GRAFT.startLoop; }
    /** Points from journal pages (STUMP_BOX_GRAFT.journalPoints), counted once per page. */
    function graftJournalPoints(state) {
        const journal = Array.isArray(state.journalEntries) ? state.journalEntries : [];
        return Object.entries(STUMP_BOX_GRAFT.journalPoints).reduce((sum, [id, points]) => sum + (journal.includes(id) ? points : 0), 0);
    }
    function graftEarned(state) {
        return Math.max(0, highestLoop(state) - STUMP_BOX_GRAFT.startLoop + 1) * STUMP_BOX_GRAFT.pointsPerLoop + graftJournalPoints(state)
            + graftOverflowPoints(state);
    }
    /** 넘치는 해금 포인트(해금 카탈로그를 다 사고 남는 몫, contentProgression.overflow)도 접붙이기 점수가 된다(2026-10-09). */
    function graftOverflowPoints(state) { return contentProgression.overflow(state); }
    /** @returns {{earned: number, spent: number, free: number}} graft points. */
    function graftPoints(state) {
        const earned = graftEarned(state), spent = of(state).graft.reduce((sum, rank) => sum + graftCost(rank), 0);
        return { earned, spent, free: Math.max(0, earned - spent) };
    }
    /** Ranks a cell can take: STUMP_BOX_GRAFT.maxRank plus the box's unlocks (graftRanks, loop 45). */
    function graftMaxRank(state) { return openUnlocks(state).reduce((sum, row) => sum + (row.graftRanks || 0), STUMP_BOX_GRAFT.maxRank); }
    /** '' when the cell can take one more rank, otherwise why not. */
    function graftRaiseReason(state, cell) {
        const next = of(state).graft[cell] + 1;
        if (!graftOpen(state)) return `접붙이기는 루프 ${STUMP_BOX_GRAFT.startLoop}부터 할 수 있습니다.`;
        if (!editable(state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
        if (!isOpen(state, cell)) return '닫힌 칸입니다.';
        if (next > graftMaxRank(state)) return '이미 마지막 단계입니다.';
        return graftPoints(state).free >= next ? '' : `접붙이기 점수가 부족합니다. ${next}단계에는 ${next}점이 필요합니다.`;
    }
    function graftRaise(state, cell) {
        if (graftRaiseReason(state, cell)) return false;
        of(state).graft[cell] += 1;
        return true;
    }
    /** '' when one rank can be taken back for blight spores (its points return). */
    function graftLowerReason(state, cell) {
        if (!editable(state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
        if (of(state).graft[cell] < 1) return '접붙이지 않은 칸입니다.';
        const need = STUMP_BOX_GRAFT.refundSpores;
        return (state.currencies.blightSpore || 0) >= need ? '' : `마름병 포자가 ${need}개 필요합니다.`;
    }
    function graftLower(state, cell) {
        if (graftLowerReason(state, cell)) return false;
        state.currencies.blightSpore -= STUMP_BOX_GRAFT.refundSpores;
        of(state).graft[cell] -= 1;
        return true;
    }

    // ── 성장·드랍 ───────────────────────────────────────────
    function killKind(enemy) { return enemy && enemy.isBoss ? 'boss' : enemy && enemy.isElite ? 'elite' : 'normal'; }
    function isGrowing(item, suppressed) { return !suppressed.has(item.id) && !isMature(item) && !!targetStage(item); }
    /** Placed, unsuppressed, unripe items (seeds, saps and sealed talismans): what a kill or compost feeds. */
    function growingItems(state) {
        const suppressed = evaluate(state).suppressed;
        return placedItems(of(state)).filter(item => isGrowing(item, suppressed));
    }
    /** [none, 1, 2, 3 extra lines] odds at this quality: straight lines between STUMP_BOX_RIPENING.lineOdds rows. */
    function lineOdds(quality) {
        const rows = STUMP_BOX_RIPENING.lineOdds, upper = rows.findIndex(row => row.roll >= quality);
        if (upper <= 0) return rows[upper < 0 ? rows.length - 1 : 0].odds;
        const low = rows[upper - 1], high = rows[upper], t = (quality - low.roll) / (high.roll - low.roll);
        return low.odds.map((odd, index) => odd + (high.odds[index] - odd) * t);
    }
    function pickCount(odds, random) {
        let roll = random();
        for (let count = 0; count < odds.length; count++) {
            roll -= odds[count];
            if (roll < 0) return count;
        }
        return 0;
    }
    /** `count` different lines from the item's pool (STUMP_BOX_EXTRA_LINES), each at a rolled share of its base value. */
    function rollLines(item, count, random) {
        const left = ((STUMP_BOX_EXTRA_LINES[yieldKind(item)] || {})[item.color] || []).slice(), span = STUMP_BOX_RIPENING.lineValue, lines = [];
        while (lines.length < count && left.length) {
            const line = left.splice(Math.floor(random() * left.length), 1)[0];
            lines.push({ stat: line.stat, value: Math.round(line.value * (span.min + random() * (span.max - span.min)) * 100) / 100 });
        }
        return lines;
    }
    /** A seed or sap ripening: 풍작 (quality bonus), 황금 and its extra lines, kept until a new loop sends it back. */
    function ripen(item, random) {
        if (!FAMILIES.includes(item.family)) return;
        const bonus = random() < STUMP_BOX_RIPENING.bumper.chance ? STUMP_BOX_RIPENING.bumper.quality : 0;
        const golden = random() < STUMP_BOX_RIPENING.golden.chance;
        item.harvest = { bonus, golden, lines: rollLines(item, pickCount(lineOdds(item.roll + bonus), random), random) };
    }
    /** Grows every growing item by `amount` and writes first harvests into the journal. @returns {object[]} items that ripened. */
    function growBy(state, amount, random = Math.random) {
        const ripened = [];
        for (const item of growingItems(state)) {
            item.xp = Math.min(need(item), item.xp + amount);
            if (item.xp >= need(item)) {
                item.ripe = true;
                ripen(item, random);
                ripened.push(item);
            }
        }
        recordHarvest(of(state), ripened);
        return ripened;
    }
    /** Grows placed, unsuppressed, unripe items by one kill. @returns {object[]} items that ripened. */
    function grow(state, enemy) { return growBy(state, STUMP_BOX_GROWTH.perKill[killKind(enemy)]); }

    // ── 거름 ───────────────────────────────────────────────
    /** The growth a seed or sap gives as compost (its quality scales it). */
    function compostGrowth(item) { return Math.round(STUMP_BOX_COMPOST.growth * clampRoll(item.roll)); }
    /** '' when the stored seed or sap can go on the board as compost, otherwise why not. */
    function compostReason(state, id) {
        const box = of(state), item = findItem(box, id);
        if (!editable(state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
        if (!item || !FAMILIES.includes(item.family) || box.board.includes(id)) return '보관함의 씨앗이나 수액만 거름으로 쓸 수 있습니다.';
        return growingItems(state).length ? '' : '판에서 자라는 것이 없습니다.';
    }
    /** Spreads a stored seed or sap: it is used up and every growing item gains its compost growth.
     * @returns {?{growth: number, fed: number, ripened: object[]}} null when not allowed. */
    function compost(state, id) {
        if (compostReason(state, id)) return null;
        const box = of(state), item = findItem(box, id), growth = compostGrowth(item), fed = growingItems(state).length;
        box.items = box.items.filter(other => other.id !== id);
        return { growth, fed, ripened: growBy(state, growth) };
    }

    /** Ashes of an item a burning branch burned away (12번 루프 30, js/ember-corruption-ui.js): every growing item gains `growth`,
     * and what ripens is announced as a kill's ripening is. @returns {?{growth: number, fed: number, ripened: object[]}} null when nothing grows. */
    function feedAsh(state, growth) {
        const fed = growingItems(state).length;
        if (!fed) return null;
        const ripened = growBy(state, growth);
        if (ripened.length) dispatchRuntimeEvent('stump-box-changed', { ripened, drop: null, compost: null });
        return { growth, fed, ripened };
    }

    function bulkCompostOpen(state) { return openUnlocks(state).some(row => row.bulkCompost); }
    /** The colours a storage filter covers: one colour, or all four ('all'); none for the talisman filter. */
    function filterColors(filter) { return COLORS.includes(filter) ? [filter] : filter === 'all' ? COLORS : []; }
    /** What a bulk action (일괄 거름 사용, 일괄 버리기) takes of a storage filter: its stored seeds and saps but the best
     * STUMP_BOX_BULK_COMPOST.keep of each colour and kind (merging material) and golden or ancient ones. */
    function bulkItems(state, filter) {
        const colors = filterColors(filter), groups = new Map();
        storage(state).filter(item => FAMILIES.includes(item.family) && colors.includes(item.color)).forEach(item => {
            const key = `${item.color}-${item.family}-${item.path || ''}`;
            groups.set(key, (groups.get(key) || []).concat(item));
        });
        return [...groups.values()].flatMap(list => list.sort((a, b) => b.roll - a.roll || a.id - b.id).slice(STUMP_BOX_BULK_COMPOST.keep))
            .filter(item => !item.golden && !item.ancient);
    }
    /** The bulk-compost items in use order (lowest quality first), cut where everything growing has ripened as pressing them one by
     * one would stop: each compost feeds every growing item alike, so the item furthest from ripe decides. */
    function bulkCompostPlan(state, filter) {
        const growing = growingItems(state), plan = [];
        let left = growing.length ? Math.max(...growing.map(item => need(item) - item.xp)) : 0;
        for (const item of bulkItems(state, filter).sort((a, b) => a.roll - b.roll || a.id - b.id)) {
            if (left <= 0) break;
            plan.push(item);
            left -= compostGrowth(item);
        }
        return plan;
    }
    /** '' when bulk compost of this filter can run now, otherwise why not. */
    function bulkCompostReason(state, filter) {
        if (!bulkCompostOpen(state)) return `수확 일지를 ${STUMP_BOX_UNLOCKS.find(row => row.bulkCompost).when.harvestCells}칸 채우면 열립니다.`;
        if (!editable(state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
        if (!growingItems(state).length) return '판에서 자라는 것이 없습니다.';
        return bulkItems(state, filter).length ? '' : '거름으로 쓸 씨앗이나 수액이 없습니다.';
    }
    /** Spreads the filter's bulk-compost plan one by one. @returns {?{count, growth, fed, ripened}} null when not allowed. */
    function compostMany(state, filter) {
        if (bulkCompostReason(state, filter)) return null;
        const out = { count: 0, growth: 0, fed: growingItems(state).length, ripened: [] };
        for (const item of bulkCompostPlan(state, filter)) {
            const one = compost(state, item.id);
            if (!one) break;
            out.count++;
            out.growth += one.growth;
            out.ripened.push(...one.ripened);
        }
        return out;
    }
    /** '' when the filter's bulk items can be thrown away now (일괄 버리기), otherwise why not. */
    function bulkDiscardReason(state, filter) {
        if (!editable(state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
        return bulkItems(state, filter).length ? '' : '버릴 씨앗이나 수액이 없습니다.';
    }
    /** 일괄 버리기: throws the filter's bulk items away. @returns {?object[]} what went, null when not allowed. */
    function discardMany(state, filter) {
        if (bulkDiscardReason(state, filter)) return null;
        const box = of(state), gone = bulkItems(state, filter), ids = new Set(gone.map(item => item.id));
        box.items = box.items.filter(item => !ids.has(item.id));
        return gone;
    }

    // ── 드랍 ───────────────────────────────────────────────
    /** Half the drops take a colour from the board (weighted by how many sit there), the rest any colour. */
    function dropColor(state, random) {
        const placed = placedItems(of(state)).map(item => item.color).filter(Boolean);
        const pool = placed.length && random() < STUMP_BOX_DROPS.boardColorShare ? placed : COLORS;
        return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
    }
    /**
     * The box's own drop roll, independent of gear drops. random() → [0, 1). A drop that finds the storage full is not
     * lost: it goes on the board as compost (nothing happens when nothing grows).
     * @returns {?{item: ?object, compost: ?object}} null when nothing dropped; compost = { family, color, growth, fed, ripened }.
     */
    function rollDrop(state, enemy, random) {
        if (random() >= STUMP_BOX_DROPS.chance[killKind(enemy)]) return null;
        const family = random() < STUMP_BOX_DROPS.sapShare ? 'sap' : 'seed', color = dropColor(state, random);
        const spec = { family, color, roll: clampRoll(STUMP_BOX_DROPS.roll.min + random() * (STUMP_BOX_DROPS.roll.max - STUMP_BOX_DROPS.roll.min)) };
        spec.golden = random() < STUMP_BOX_RIPENING.golden.dropChance;
        if (family === 'seed') spec.path = seedPath(random);
        const item = createItem(state, spec);
        if (item) return { item, compost: null };
        const growth = compostGrowth(spec), fed = growingItems(state).length;
        return { item: null, compost: { family, color, growth, fed, ripened: growBy(state, growth, random) } };
    }
    const NO_DROP = Object.freeze({ item: null, compost: null });
    function dropsHere(state) { return !(typeof actExplorationState === 'object' && actExplorationState.current(state)?.act != null); }
    /** One call per kill (live and offline replay alike). Story-act expeditions escrow their loot until the act is
     * settled, so the box's drops are not rolled there (growth still counts); generated maps — chaos, realm, the atlas … —
     * roll them as the 9×8 board does. */
    function onEnemyKilled(state, enemy) {
        const box = state.stumpBox;
        if (!box || !box.acquired) return;
        const ripened = grow(state, enemy), rolled = (dropsHere(state) && rollDrop(state, enemy, Math.random)) || NO_DROP;
        if (rolled.compost) ripened.push(...rolled.compost.ripened);
        if (!ripened.length && !rolled.item && !rolled.compost) return;
        if (state.noti) state.noti.stump = true;
        dispatchRuntimeEvent('stump-box-changed', { ripened, drop: rolled.item, compost: rolled.compost });
    }

    // ── 획득·시작 선물·루프 ─────────────────────────────────
    /** Act 10 cleared in any loop (its journal page, the chaos floors it opens, or a later loop). */
    function eligible(state) {
        const journal = Array.isArray(state.journalEntries) && state.journalEntries.includes('act_10');
        const claimed = [state.claimedActRewards, state.claimableActRewards].some(list => Array.isArray(list) && list.includes(9));
        return journal || claimed || Number(state.maxZoneId) >= ABYSS_START_ZONE_ID || highestLoop(state) >= 2 || Number(state.loopCount) >= 1;
    }
    /** Grants the box once when the player qualifies. @returns {boolean} true on the grant. */
    function sync(state, via) {
        const box = of(state);
        if (box.acquired || !eligible(state)) return false;
        box.acquired = true;
        box.via = via;
        return true;
    }
    /** One seed and one sap of the given colour, once each (the receipts are box.starter). A seed grows into `path` when given. */
    function claimStarter(state, family, color, path) {
        const box = of(state);
        if (!box.acquired || !FAMILIES.includes(family) || box.starter[family]) return null;
        const item = createItem(state, { family, color, roll: 1, path });
        if (item) box.starter[family] = true;
        return item;
    }

    // ── 시작 선물(2026-10-07 사용자 결정: 색을 골라 받지 않고, 함을 얻으면 바로 준다) ───────────
    const SKILL_ELEMENT_COLORS = Object.freeze({ fire: 'fire', cold: 'cold', light: 'lightning', chaos: 'chaos' });
    const RESIST_STATS = Object.freeze({ fire: 'resF', cold: 'resC', lightning: 'resL' });
    /** The gift's colours: the seed is a flower of the active skill's element (a physical skill gets a fire fruit, boss damage),
     * the sap the weakest of the fire, cold and lightning resistances that is not the seed's opposite (they may sit side by side). */
    function starterChoice(state, stats) {
        const element = SKILL_ELEMENT_COLORS[(SKILL_DB[state.activeSkill] || {}).ele];
        const seed = element ? { color: element, path: 'flower' } : { color: 'fire', path: 'fruit' };
        const colors = Object.keys(RESIST_STATS).filter(color => color !== STUMP_BOX_OPPOSITES[seed.color]);
        const sap = colors.reduce((low, color) => ((stats[RESIST_STATS[color]] || 0) < (stats[RESIST_STATS[low]] || 0) ? color : low));
        return { seed, sap };
    }
    /** Gives the starter seed (with its path) and sap that are still owed. @returns {object[]} the new items. */
    function grantStarter(state, stats) {
        const choice = starterChoice(state, stats), given = [];
        const seed = claimStarter(state, 'seed', choice.seed.color, choice.seed.path);
        if (seed) given.push(seed);
        const sap = claimStarter(state, 'sap', choice.sap);
        if (sap) given.push(sap);
        return given;
    }
    function touchesOpposite(box, cell, color) {
        return neighbors(cell).some(at => box.board[at] !== null && (findItem(box, box.board[at]) || {}).color === STUMP_BOX_OPPOSITES[color]);
    }
    /** Puts the seeds and saps waiting in storage on open empty cells, centre first, never beside their opposite colour
     * (the starter gift when its guide is closed). @returns {number} how many went on the board. */
    function plantStored(state) {
        const box = of(state);
        let placed = 0;
        for (const item of storage(state).filter(row => FAMILIES.includes(row.family))) {
            const cell = STUMP_BOX_CELL_ORDER.find(at => isOpen(state, at) && box.board[at] === null && !touchesOpposite(box, at, item.color));
            if (cell !== undefined && place(state, item.id, cell)) placed++;
        }
        return placed;
    }
    // ── 봉인 칸(16번, 무료): 그 칸의 다 자란 것은 줄까지 그대로 루프를 넘긴다 ─────────
    function sealLimit(state) { return openUnlocks(state).reduce((sum, row) => sum + (row.sealSlots || 0), 0); }
    function isSealed(box, cell) { return Array.isArray(box.sealed) && box.sealed.includes(cell); }
    /** '' when the cell can be sealed (or unsealed) now, otherwise why not. */
    function sealReason(state, cell) {
        const box = of(state), first = STUMP_BOX_UNLOCKS.find(row => row.sealSlots);
        if (!sealLimit(state)) return `봉인 칸은 루프 ${first.when.loop}부터 열립니다.`;
        if (!editable(state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
        if (!isOpen(state, cell)) return '닫힌 칸입니다.';
        if (isSealed(box, cell)) return '';
        return box.sealed.length < sealLimit(state) ? '' : `봉인 칸은 ${sealLimit(state)}개까지입니다.`;
    }
    function toggleSeal(state, cell) {
        if (sealReason(state, cell)) return false;
        const box = of(state);
        box.sealed = isSealed(box, cell) ? box.sealed.filter(at => at !== cell) : box.sealed.concat(cell);
        return true;
    }

    // ── 포식(16번): 불씨의 흉터 ──────────────────────────────
    function devourOpen(state) { return openUnlocks(state).some(row => row.devour); }
    /** A new 불씨의 흉터 in storage (force: a reward that must not be lost to a full storage); null before devouring opens. */
    function addScar(state, force) {
        const box = of(state);
        if (!box.acquired || !devourOpen(state) || (!force && storageFull(state))) return null;
        const item = { id: box.nextId++, family: 'scar', color: null, path: null, xp: 0, ripe: false, roll: 1, absorbed: {}, meals: 0, misses: 0 };
        box.items.push(item);
        return item;
    }
    /** The first 불씨의 흉터 comes with 포식 (once; box.scarGift is the receipt). @returns {?object} the scar when given now. */
    function grantScar(state) {
        const box = of(state);
        if (box.scarGift || !devourOpen(state)) return null;
        const item = addScar(state, true);
        if (item) box.scarGift = true;
        return item;
    }
    /** An atlas final boss kill: a 불씨의 흉터 now and then (STUMP_BOX_SCAR.bossChance, once devouring is open). */
    function rollScarDrop(state, random = Math.random) {
        if (!devourOpen(state) || random() >= STUMP_BOX_SCAR.bossChance) return null;
        const item = addScar(state, true);
        if (item) dispatchRuntimeEvent('stump-box-changed', { ripened: [], drop: item, compost: null });
        return item;
    }
    /** The cell a scar bites: one of its 8 neighbours, picked evenly; -1 off the board. */
    function biteCell(cell, random) {
        const [dx, dy] = MOORE[Math.floor(random() * MOORE.length)];
        const x = cell % STUMP_BOX_SIZE + dx, y = Math.floor(cell / STUMP_BOX_SIZE) + dy;
        return x < 0 || y < 0 || x >= STUMP_BOX_SIZE || y >= STUMP_BOX_SIZE ? -1 : y * STUMP_BOX_SIZE + x;
    }
    /** What eating a seed or sap gives: its main and extra lines at its quality and golden (no resonance or graft), a share by ripeness. */
    function mealOf(item) {
        const ripe = isMature(item), share = ripe ? STUMP_BOX_SCAR.absorb.ripe : STUMP_BOX_SCAR.absorb.growing;
        const scale = qualityOf(item) * goldenMul(item) * share, gain = yieldOf(item);
        const lines = [{ stat: gain.stat, value: gain.value }].concat(ripe && item.harvest ? item.harvest.lines : []);
        return lines.map(line => ({ stat: line.stat, value: Math.round(line.value * scale * 100) / 100 }));
    }
    function absorb(scar, meal) {
        meal.forEach(line => {
            const total = (scar.absorbed[line.stat] || 0) + line.value;
            scar.absorbed[line.stat] = Math.round(Math.min(SCAR_CAPS[line.stat] || 0, total) * 100) / 100;
        });
    }
    /** One scar's bite at the end of a loop. A seed or sap is eaten and absorbed; anything else spends the chance. */
    function bite(state, scar, cell, random) {
        const box = of(state), target = biteCell(cell, random);
        const preyId = target >= 0 && isOpen(state, target) ? box.board[target] : null, prey = preyId === null ? null : findItem(box, preyId);
        if (!prey || !FAMILIES.includes(prey.family) || !yieldOf(prey)) {
            scar.misses = (scar.misses || 0) + 1;
            return { scar, target, ate: null, gained: [] };
        }
        const meal = mealOf(prey);
        absorb(scar, meal);
        scar.meals = (scar.meals || 0) + 1;
        box.board[target] = null;
        box.items = box.items.filter(item => item.id !== prey.id);
        return { scar, target, ate: shortName(prey), gained: meal };
    }
    /** 포식: every awake scar on the board bites once as a loop ends. @returns {object[]} { scar, target, ate, gained } */
    function devour(state, random) {
        const scars = placedCells(of(state)).filter(({ item }) => item.family === 'scar' && isMature(item));
        return scars.map(({ item, cell }) => bite(state, item, cell, random));
    }

    // ── 번식(16번): 다 자란 열매가 루프를 넘길 때 씨앗을 떨군다 ─────────
    function breedingOpen(state) { return openUnlocks(state).some(row => row.breeding); }
    /** One spec per grown fruit: usually its colour; a mutation gives another colour, a golden seed, or a scar instead. */
    function breedSpec(state, fruit, random) {
        const odds = STUMP_BOX_BREEDING.mutation;
        if (devourOpen(state) && random() < odds.scar) return { scar: true, parent: fruit.color };
        const others = COLORS.filter(color => color !== fruit.color);
        const color = random() < odds.color ? others[Math.floor(random() * others.length)] : fruit.color;
        const roll = STUMP_BOX_DROPS.roll.min + random() * (STUMP_BOX_DROPS.roll.max - STUMP_BOX_DROPS.roll.min);
        return { family: 'seed', color, roll, golden: random() < odds.golden, path: seedPath(random), parent: fruit.color };
    }
    /** Puts the bred seeds in storage (a full storage turns a seed into compost, as drops do). @returns {object[]} { spec, item, compost } */
    function breed(state, specs, random) {
        return specs.map(spec => {
            if (spec.scar) return { spec, item: addScar(state, true), compost: null };
            const item = createItem(state, spec);
            if (item) return { spec, item, compost: null };
            const growth = compostGrowth(spec);
            return { spec, item: null, compost: { growth, fed: growingItems(state).length, ripened: growBy(state, growth, random) } };
        });
    }

    /** Grown items outside sealed cells go back to seed, sap, a sleeping talisman or scar (a seed keeps its path), keeping
     * rootMemoryPct of their growth (뿌리 기억); their ripening roll goes and is rolled again. */
    function sendBack(state, box) {
        const keepPct = rootMemoryPct(state), kept = new Set(box.sealed.map(cell => box.board[cell]).filter(id => id !== null));
        let count = 0;
        box.items.forEach(item => {
            if (!item.ripe || kept.has(item.id)) return;
            item.xp = Math.floor(need(item) * keepPct / 100);
            item.ripe = false;
            delete item.harvest;
            count++;
        });
        return { count, keepPct, sealed: box.items.filter(item => item.ripe && kept.has(item.id)).length };
    }
    /** The grown fruits on the board that leave a seed this loop (번식 open). */
    function grownFruits(state, box) {
        return box.acquired && breedingOpen(state) ? placedItems(box).filter(item => item.path === 'fruit' && isMature(item)) : [];
    }
    /** New loop: awake scars bite (포식), grown fruits are noted for breeding, grown items go back (봉인 칸 aside), then the bred
     * seeds arrive. Placements and unripe progress stay. @returns {number} how many went back. */
    function regress(state, random = Math.random) {
        const box = state.stumpBox;
        if (!box || !Array.isArray(box.items)) return 0;
        if (!Array.isArray(box.sealed)) box.sealed = [];
        const eaten = box.acquired ? devour(state, random) : [], fruits = grownFruits(state, box);
        const back = sendBack(state, box);
        const bred = breed(state, fruits.map(fruit => breedSpec(state, fruit, random)), random);
        if (back.count || back.sealed || eaten.length || bred.length) dispatchRuntimeEvent('stump-box-regressed', { ...back, eaten, bred });
        return back.count;
    }

    // ── 씨앗 주머니(16번): 저널마다 한 번, 무작위 씨앗 셋 가운데 하나 ─────────
    /** Pouches earned (STUMP_BOX_UNLOCKS rows with pouch) and not yet taken. */
    function pendingPouches(state) {
        const opened = of(state).pouches.opened;
        return openUnlocks(state).filter(row => row.pouch && !opened.includes(row.id)).map(row => row.id);
    }
    /** The pouch's offers, rolled once and kept until one is taken (closing the window does not roll again). */
    function pouchOffers(state, id, random = Math.random) {
        const box = of(state), span = STUMP_BOX_SEED_POUCH.roll;
        if (!pendingPouches(state).includes(id)) return [];
        if (!Array.isArray(box.pouches.offers[id])) {
            box.pouches.offers[id] = Array.from({ length: STUMP_BOX_SEED_POUCH.offers }, () => ({ family: 'seed',
                color: COLORS[Math.floor(random() * COLORS.length)], roll: clampRoll(span.min + random() * (span.max - span.min)), path: seedPath(random) }));
        }
        return box.pouches.offers[id];
    }
    /** Takes one offer into storage. @returns {?object} the new seed, null when not allowed or storage is full. */
    function choosePouch(state, id, index) {
        const box = of(state), offer = pouchOffers(state, id)[index];
        const item = offer ? createItem(state, offer) : null;
        if (!item) return null;
        box.pouches.opened.push(id);
        delete box.pouches.offers[id];
        return item;
    }

    // ── 부적 도감(16번): 고유 부적과 야생 고유 부적의 첫 획득 ─────────
    const CODEX_IDS = Object.freeze([...TALISMAN_UNIQUE_DB, ...TALISMAN_WILD_UNIQUE_DB].map(row => row.id));
    function recordCodex(box, talisman) {
        if (!talisman || !CODEX_IDS.includes(talisman.uniqueId) || box.codex.includes(talisman.uniqueId)) return;
        box.codex = CODEX_IDS.filter(id => id === talisman.uniqueId || box.codex.includes(id));
    }
    function codexStorage(state) { return Math.floor(of(state).codex.length / STUMP_BOX_TALISMAN_CODEX.every) * STUMP_BOX_TALISMAN_CODEX.storage; }

    // ── 수확 일지 · 해금(2026-10-07 해금 1차) ───────────────────
    /** 'flower-fire' …: the journal key of a grown seed or sap; null for talismans. */
    function harvestKey(item) {
        const kind = yieldKind(item);
        return kind ? `${kind}-${item.color}` : null;
    }
    /** Adds first-time grown combinations to the journal, in the fixed key order (idempotent). */
    function recordHarvest(box, items) {
        const grown = new Set(box.harvest.grown);
        items.forEach(item => { const key = harvestKey(item); if (key) grown.add(key); });
        if (grown.size !== box.harvest.grown.length) box.harvest.grown = HARVEST_KEYS.filter(key => grown.has(key));
    }
    function rowDone(box, row) { return COLORS.every(color => box.harvest.grown.includes(`${row}-${color}`)); }
    /** Journal rows (flower · fruit · amber) with all four colours grown. */
    function harvestRows(state) { const box = of(state); return HARVEST_ROWS.filter(row => rowDone(box, row)); }
    /** Whether any combination of this kind (flower · fruit · amber) has been grown. */
    function hasHarvested(state, kind) { return of(state).harvest.grown.some(key => key.startsWith(`${kind}-`)); }
    /** Completed rows whose gift has not been taken. */
    function pendingGifts(state) { const box = of(state); return harvestRows(state).filter(row => !box.harvest.gifts[row]); }
    /** The gift of a completed row: one seed or sap of the chosen colour, once (a flower or fruit row's seed grows into that row's
     * kind). null when not allowed or storage is full. */
    function claimHarvestGift(state, row, color) {
        const box = of(state);
        if (!box.acquired || !pendingGifts(state).includes(row)) return null;
        const item = createItem(state, { family: STUMP_BOX_HARVEST.rows[row], color, roll: STUMP_BOX_HARVEST.giftRoll, path: row });
        if (item) box.harvest.gifts[row] = true;
        return item;
    }
    /** A STUMP_BOX_UNLOCKS condition (computed, never saved). */
    function unlockMet(state, when) {
        if (when.loop && highestLoop(state) < when.loop) return false;
        if (when.journal && !(Array.isArray(state.journalEntries) && state.journalEntries.includes(when.journal))) return false;
        return harvestMet(state, when);
    }
    /** The harvest journal conditions: cells written, a given row done, rows done. */
    function harvestMet(state, when) {
        if (when.harvestCells && of(state).harvest.grown.length < when.harvestCells) return false;
        if (when.harvestRow && !harvestRows(state).includes(when.harvestRow)) return false;
        return !when.harvestRows || harvestRows(state).length >= when.harvestRows;
    }
    /** The box's unlocks that hold now (none before the box). */
    function openUnlocks(state) { return of(state).acquired ? STUMP_BOX_UNLOCKS.filter(row => unlockMet(state, row.when)) : []; }
    function storageLimit(state) { return openUnlocks(state).reduce((sum, row) => sum + (row.storage || 0), STUMP_BOX_STORAGE_BASE) + codexStorage(state); }
    function storageFull(state) { return storage(state).length >= storageLimit(state); }
    /** Share of growth (%) a grown item keeps when a new loop starts (뿌리 기억). */
    function rootMemoryPct(state) { return Math.max(0, ...openUnlocks(state).map(row => row.keepPct || 0)); }

    // ── 저장 경계 ───────────────────────────────────────────
    function validItem(raw) {
        const known = raw && (raw.family === 'talisman' || raw.family === 'scar' || (FAMILIES.includes(raw.family) && COLORS.includes(raw.color)));
        return known && Number.isSafeInteger(raw.id) && raw.id > 0;
    }
    /** A scar: growth, known absorbed stats within their caps, meal counts. */
    function cleanScar(raw) {
        const xp = Math.min(STUMP_BOX_GROWTH.need.scar, Math.max(0, Math.floor(Number(raw.xp) || 0))), absorbed = {};
        Object.entries(raw.absorbed && typeof raw.absorbed === 'object' ? raw.absorbed : {}).forEach(([stat, value]) => {
            if (SCAR_CAPS[stat] && Number(value) > 0) absorbed[stat] = Math.round(Math.min(SCAR_CAPS[stat], Number(value)) * 100) / 100;
        });
        const count = value => Math.max(0, Math.floor(Number(value) || 0));
        return { id: raw.id, family: 'scar', color: null, path: null, xp, ripe: xp >= STUMP_BOX_GROWTH.need.scar, roll: 1, absorbed,
            meals: count(raw.meals), misses: count(raw.misses) };
    }
    /** A grown seed's or sap's ripening roll: the bumper bonus, golden, and up to three different lines from its own pool. */
    function cleanHarvest(raw, item) {
        if (!item.ripe || !raw || typeof raw !== 'object') return undefined;
        const pool = (STUMP_BOX_EXTRA_LINES[yieldKind(item)] || {})[item.color] || [], seen = new Set(), span = STUMP_BOX_RIPENING.lineValue;
        const lines = (Array.isArray(raw.lines) ? raw.lines : []).map(line => ({ line, row: pool.find(row => line && row.stat === line.stat) }))
            .filter(({ line, row }) => row && Number(line.value) > 0 && !seen.has(row.stat) && seen.add(row.stat)).slice(0, 3)
            .map(({ line, row }) => ({ stat: row.stat, value: Math.round(Math.min(row.value * span.max, Number(line.value)) * 100) / 100 }));
        return { bonus: raw.bonus === STUMP_BOX_RIPENING.bumper.quality ? raw.bonus : 0, golden: raw.golden === true, lines };
    }
    function cleanTalisman(raw) {
        const fields = talismans.normalizeTalisman(raw);
        if (!fields) return null;
        const xp = Math.min(STUMP_BOX_GROWTH.need.talisman, Math.max(0, Math.floor(Number(raw.xp) || 0)));
        return { id: raw.id, family: 'talisman', color: null, path: null, xp, ripe: xp >= STUMP_BOX_GROWTH.need.talisman, roll: 1, ...fields };
    }
    /** Born marks a seed or sap keeps: golden, and ancient for a seed (12번 루프 42). */
    function cleanMarks(raw, item) {
        if (raw.golden === true) item.golden = true;
        if (raw.ancient === true && raw.family === 'seed') item.ancient = true;
    }
    /** cap: the quality cap the save has reached (rollCap), so a restored roll never tops what it could have been made at. */
    function cleanItem(raw, cap) {
        if (raw.family === 'talisman') return cleanTalisman(raw);
        if (raw.family === 'scar') return cleanScar(raw);
        const path = raw.family !== 'seed' ? null : PATHS.includes(raw.path) ? raw.path : legacyPath(raw.id);
        const xp = Math.min(STUMP_BOX_GROWTH.need[raw.family], Math.max(0, Math.floor(Number(raw.xp) || 0)));
        const ripe = xp >= STUMP_BOX_GROWTH.need[raw.family];
        const item = { id: raw.id, family: raw.family, color: raw.color, path, xp, ripe, roll: clampRoll(raw.roll, cap) };
        cleanMarks(raw, item);
        const harvest = cleanHarvest(raw.harvest, item);
        if (harvest) item.harvest = harvest;
        return item;
    }
    /** Whole ranks 0..graftMaxRank on every cell, never spending more than the reached loops earned (the highest ranks give way). */
    function restoreGraft(raw, state) {
        const source = Array.isArray(raw) ? raw : [], max = graftMaxRank(state);
        const ranks = Array.from({ length: CELLS }, (_, cell) => Math.min(max, Math.max(0, Math.floor(Number(source[cell]) || 0))));
        let over = ranks.reduce((sum, rank) => sum + graftCost(rank), 0) - graftEarned(state);
        while (over > 0) {
            const cell = ranks.lastIndexOf(Math.max(...ranks));
            over -= ranks[cell];
            ranks[cell] -= 1;
        }
        return ranks;
    }
    /** A version-1 box (growth needs before 2026-10-09, STUMP_BOX_GROWTH.v1Need): growing items keep their share of the way,
     * grown ones stay grown at the new need. A current box's items pass through. */
    function upgradeGrowth(raw) {
        const items = Array.isArray(raw.items) ? raw.items : [];
        if (Number(raw.version) >= BOX_VERSION) return items;
        return items.map(item => {
            const old = item && STUMP_BOX_GROWTH.v1Need[item.family], now = item && STUMP_BOX_GROWTH.need[item.family], xp = Number(item && item.xp) || 0;
            return old ? { ...item, xp: item.ripe === true || xp >= old ? now : Math.floor(xp * now / old) } : item;
        });
    }
    function restoreItems(raw, box, cap) {
        const seen = new Set();
        upgradeGrowth(raw).filter(validItem).forEach(item => {
            const clean = seen.has(item.id) ? null : cleanItem(item, cap);
            if (clean) { seen.add(clean.id); box.items.push(clean); }
        });
        const used = new Set();
        (Array.isArray(raw.board) ? raw.board : []).slice(0, CELLS).forEach((id, cell) => {
            if (seen.has(id) && !used.has(id)) { used.add(id); box.board[cell] = id; }
        });
    }
    /** Known journal keys only, plus whatever is grown right now (saves from before the journal); gift receipts stay. */
    function restoreHarvest(raw, box) {
        const source = raw && typeof raw === 'object' ? raw : {};
        box.harvest.grown = HARVEST_KEYS.filter(key => Array.isArray(source.grown) && source.grown.includes(key));
        HARVEST_ROWS.forEach(row => { box.harvest.gifts[row] = !!(source.gifts && source.gifts[row] === true); });
        recordHarvest(box, box.items.filter(isMature));
    }
    /** Sealed cells: distinct open cells, no more than the unlocks allow (the last ones give way). */
    function restoreSealed(raw, state) {
        const cells = (Array.isArray(raw) ? raw : []).filter(cell => Number.isInteger(cell) && isOpen(state, cell));
        return [...new Set(cells)].slice(0, sealLimit(state));
    }
    /** Pouch receipts (known pouch rows) and offers waiting to be chosen (valid seed specs only). */
    function restorePouches(raw) {
        const rows = new Set(STUMP_BOX_UNLOCKS.filter(row => row.pouch).map(row => row.id)), source = raw && typeof raw === 'object' ? raw : {};
        const opened = [...new Set((Array.isArray(source.opened) ? source.opened : []).filter(id => rows.has(id)))], offers = {};
        Object.entries(source.offers && typeof source.offers === 'object' ? source.offers : {}).forEach(([id, list]) => {
            const valid = Array.isArray(list) ? list.filter(spec => spec && spec.family === 'seed' && COLORS.includes(spec.color)) : [];
            if (rows.has(id) && !opened.includes(id) && valid.length) offers[id] = valid.map((spec, index) => ({ family: 'seed', color: spec.color, roll: clampRoll(spec.roll),
                path: PATHS.includes(spec.path) ? spec.path : legacyPath(index) }));
        });
        return { opened, offers };
    }
    /** Known codex ids in their table order, plus every unique talisman held now (saves from before the codex). */
    function restoreCodex(raw, box) {
        const held = box.items.filter(item => item.family === 'talisman').map(item => item.uniqueId);
        const known = new Set((Array.isArray(raw) ? raw : []).concat(held));
        return CODEX_IDS.filter(id => known.has(id));
    }
    /** Save boundary (idempotent; mergeDefaults runs it on every load, cloud apply and replay commit): repairs the box,
     * then grants it to saves that already cleared act 10 or reached loop 2. The repaired box is in place first, because
     * the unlocks (seal cells, graft ranks) read its journal. */
    function restore(state) {
        const raw = state.stumpBox, box = empty();
        state.stumpBox = box;
        if (raw && typeof raw === 'object') {
            box.acquired = raw.acquired === true;
            box.via = typeof raw.via === 'string' ? raw.via : null;
            box.starter = { seed: !!(raw.starter && raw.starter.seed), sap: !!(raw.starter && raw.starter.sap) };
            restoreItems(raw, box, rollCap(state));
            box.nextId = Math.max(Number.isSafeInteger(raw.nextId) ? raw.nextId : 1, ...box.items.map(item => item.id + 1), 1);
            restoreHarvest(raw.harvest, box);
            box.codex = restoreCodex(raw.codex, box);
            box.pouches = restorePouches(raw.pouches);
            box.graft = restoreGraft(raw.graft, state);
            box.sealed = restoreSealed(raw.sealed, state);
            box.scarGift = raw.scarGift === true;
        }
        sync(state, 'migration');
        return box;
    }

    return {
        empty, of, restore, sync, eligible, claimStarter, starterChoice, grantStarter, plantStored, createItem, addTalisman, discard, storage, place, move, unplace,
        evaluate, applyStats, onEnemyKilled, grow, ancientRanks, rollDrop, regress, compost, compostReason, compostGrowth, feedAsh, growingItems, openCount, isOpen, opensAt, nextOpening, neighbors,
        stageOf, isMature, need, yieldOf, targetStage, label, shortName, lineText, extraLinesOf, iconPath, cellOf, editable, highestLoop,
        graftRank, graftMultiplier, graftOpen, graftPoints, graftJournalPoints, graftOverflowPoints, graftRaiseReason, graftRaise, graftLowerReason, graftLower,
        harvestKey, harvestRows, hasHarvested, pendingGifts, claimHarvestGift, openUnlocks, storageLimit, storageFull, rootMemoryPct,
        rollCap, graftMaxRank, qualityOf, goldenMul, sealLimit, isSealed, sealReason, toggleSeal, devourOpen, addScar, grantScar, rollScarDrop, scarCaps: () => SCAR_CAPS,
        breedingOpen, bulkCompostOpen, bulkItems, bulkCompostPlan, bulkCompostReason, compostMany, bulkDiscardReason, discardMany, pendingPouches, pouchOffers, choosePouch,
        codexIds: () => CODEX_IDS,
        itemById: (state, id) => findItem(of(state), id)
    };
})();
safeExposeGlobals({ stumpBox });
