// 그루터기 함 도메인: 획득·배치·성장·거름·공명·억제·드랍·루프 회귀를 소유한다. DOM·전투 계산·저장 입출력은 모른다.
// 전투는 처치(onEnemyKilled)만 넘기고, 능력치 파이프라인은 applyStats로 계산 결과를 한 번 합산한다.
// 설계: docs/stump-cube-game-design.md, 수치: data/stump-box.js. 공명·억제·능력치는 저장하지 않고 배치에서 계산한다.
// 부적(family 'talisman')은 색 없는 세 번째 계열: 판에서 깨어나고(성장), 공명 · 억제 · 꽃 능력치에 끼지 않는다.
// 부적의 줄과 이웃 효과는 talismans.js / talisman-effects.js가 맡고, 여기서는 보관 · 배치 · 깨어남 · 저장 경계만 다룬다.
// 접붙이기(graft, 칸마다 0~5단계)는 칸에 붙는다: 아이템을 옮기면 새 칸의 단계를 따른다. 씨앗 · 수액 값은 여기서, 부적 줄은
// talisman-effects.js가 graftMultiplier로 키운다.
// 성장량 필드 이름이 xp인 것은 의도다: 영구 빌드 서명(getPersistentBuildSignature)이 xp를 빼므로 처치마다
// 장비 분석 캐시가 깨지지 않고, 다 자라 능력치가 바뀌는 순간만 ripe가 바뀌어 캐시가 새로 계산된다.
const stumpBox = (() => {
    const CELLS = STUMP_BOX_SIZE * STUMP_BOX_SIZE;
    const FAMILIES = ['seed', 'sap'], PATHS = ['flower', 'fruit'], COLORS = Object.keys(STUMP_BOX_COLORS);
    const FIXED_TARGET = { sap: 'amber', talisman: 'talisman' };
    const HARVEST_ROWS = Object.keys(STUMP_BOX_HARVEST.rows);
    const HARVEST_KEYS = HARVEST_ROWS.flatMap(row => COLORS.map(color => `${row}-${color}`));
    let memo = { key: null, box: null, value: null };

    function emptyHarvest() {
        return { grown: [], gifts: Object.fromEntries(HARVEST_ROWS.map(row => [row, false])) };
    }
    function empty() {
        return { version: 1, acquired: false, via: null, starter: { seed: false, sap: false }, nextId: 1, items: [], board: Array(CELLS).fill(null),
            graft: Array(CELLS).fill(0), harvest: emptyHarvest() };
    }
    /** @returns {object} The state's box, created empty when missing. */
    function of(state) {
        if (!state.stumpBox || typeof state.stumpBox !== 'object') state.stumpBox = empty();
        return state.stumpBox;
    }

    // ── 아이템 ─────────────────────────────────────────────
    function need(item) { return STUMP_BOX_GROWTH.need[item.family]; }
    function isMature(item) { return item.ripe === true; }
    /** seed · sprout · flower · fruit / sap · resin · amber */
    function stageOf(item) {
        if (item.family === 'talisman') return isMature(item) ? 'talisman' : 'sealed';
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
    function label(item) {
        if (item.family === 'talisman') return isMature(item) ? item.name : `${item.name} · 잠듦`;
        const target = targetStage(item), now = STUMP_BOX_STAGES[stageOf(item)].label;
        return `${STUMP_BOX_COLORS[item.color].label} ${now}` + (target && !isMature(item) ? ` → ${STUMP_BOX_STAGES[target].label}` : '');
    }
    function iconPath(item) {
        return `assets/px/stump/${STUMP_BOX_STAGES[stageOf(item)].icon}-${item.family === 'talisman' ? item.rarity : item.color}.png`;
    }
    function findItem(box, id) { return box.items.find(item => item.id === id) || null; }
    function cellOf(state, id) { return of(state).board.indexOf(id); }
    function storage(state) {
        const box = of(state), placed = new Set(box.board.filter(id => id !== null));
        return box.items.filter(item => !placed.has(item.id));
    }
    function clampRoll(value) {
        return Math.round(Math.min(STUMP_BOX_ROLL_LIMIT.max, Math.max(STUMP_BOX_ROLL_LIMIT.min, Number(value) || 1)) * 100) / 100;
    }
    /** Adds a new item to storage; null when storage is full or the input is invalid. */
    function createItem(state, spec) {
        const box = of(state);
        if (!FAMILIES.includes(spec.family) || !COLORS.includes(spec.color)) return null;
        if (storageFull(state)) return null;
        const item = { id: box.nextId++, family: spec.family, color: spec.color, path: null, xp: 0, ripe: false, roll: clampRoll(spec.roll) };
        box.items.push(item);
        return item;
    }
    /** Adds an unsealed talisman (talismans.js fields, normalized here) to storage. force: a boss reward that must not be lost to a full storage. */
    function addTalisman(state, talisman, force) {
        const box = of(state), fields = talismans.normalizeTalisman(talisman);
        if (!box.acquired || !fields || (!force && storageFull(state))) return null;
        const item = { id: box.nextId++, family: 'talisman', color: null, path: null, xp: 0, ripe: false, roll: 1, ...fields };
        box.items.push(item);
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
    /** Places (or moves) an item onto an open, empty cell. A seed takes its path here if it has none yet. */
    function place(state, id, cell, path) {
        const box = of(state), item = findItem(box, id);
        if (!editable(state) || !item || !isOpen(state, cell) || box.board[cell] !== null) return false;
        if (item.family === 'seed' && !item.path) {
            if (!PATHS.includes(path)) return false;
            item.path = path;
        }
        const from = box.board.indexOf(id);
        if (from >= 0) box.board[from] = null;
        box.board[cell] = id;
        return true;
    }
    /**
     * Moves an item onto an open cell, empty or not. An item already there trades places: it takes the mover's old
     * cell, or goes to storage when the mover came from storage (storage size stays the same). A seed without a path
     * takes `path` as in place(). Returns false and changes nothing when the move is not allowed or goes nowhere.
     */
    function move(state, id, cell, path) {
        const box = of(state), item = findItem(box, id), from = box.board.indexOf(id), occupant = box.board[cell];
        if (!editable(state) || !item || !isOpen(state, cell) || from === cell) return false;
        if (occupant === null) return place(state, id, cell, path);
        if (item.family === 'seed' && !item.path) {
            if (!PATHS.includes(path)) return false;
            item.path = path;
        }
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
    /** A seed may switch between flower and fruit until it starts growing. */
    function setPath(state, id, path) {
        const item = findItem(of(state), id);
        if (!editable(state) || !item || item.family !== 'seed' || item.xp > 0 || !PATHS.includes(path)) return false;
        item.path = path;
        return true;
    }

    // ── 판정(계산만, 저장하지 않음) ─────────────────────────
    function signature(box) {
        return box.board.map((id, cell) => {
            const item = id === null ? null : findItem(box, id);
            return item ? `${item.id}${item.color}${item.path || ''}${item.ripe ? 'R' : ''}${item.roll}g${box.graft[cell]}` : '-';
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
    function itemValue(item, resonant, graft) {
        const boost = resonant.has(item.color) ? 1 + STUMP_BOX_RESONANCE.bonusPct / 100 : 1;
        return Math.round(yieldOf(item).value * item.roll * boost * graft * 100) / 100;
    }
    /** Suppression (opposite colours side by side), resonance (3+ grown, unsuppressed of a colour) and stat totals. */
    function evaluate(state) {
        const box = of(state), key = signature(box);
        if (memo.key === key && memo.box === box) return memo.value;
        const suppressed = suppressedIds(box), counts = Object.fromEntries(COLORS.map(color => [color, 0]));
        const grown = placedCells(box).filter(({ item }) => isMature(item) && yieldOf(item) && !suppressed.has(item.id));
        grown.forEach(({ item }) => { counts[item.color]++; });
        const resonant = new Set(COLORS.filter(color => counts[color] >= STUMP_BOX_RESONANCE.count));
        const stats = {}, values = {};
        for (const { item, cell } of grown) {
            const stat = yieldOf(item).stat;
            values[item.id] = itemValue(item, resonant, graftMultiplier(box, cell));
            stats[stat] = Math.round(((stats[stat] || 0) + values[item.id]) * 100) / 100;
        }
        const value = { suppressed, counts, resonant, stats, values };
        memo = { key, box, value };
        return value;
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
    function graftMultiplier(box, cell) { return 1 + box.graft[cell] * STUMP_BOX_GRAFT.pctPerRank / 100; }
    function graftOpen(state) { return of(state).acquired && highestLoop(state) >= STUMP_BOX_GRAFT.startLoop; }
    /** Points from journal pages (STUMP_BOX_GRAFT.journalPoints), counted once per page. */
    function graftJournalPoints(state) {
        const journal = Array.isArray(state.journalEntries) ? state.journalEntries : [];
        return Object.entries(STUMP_BOX_GRAFT.journalPoints).reduce((sum, [id, points]) => sum + (journal.includes(id) ? points : 0), 0);
    }
    function graftEarned(state) {
        return Math.max(0, highestLoop(state) - STUMP_BOX_GRAFT.startLoop + 1) * STUMP_BOX_GRAFT.pointsPerLoop + graftJournalPoints(state);
    }
    /** @returns {{earned: number, spent: number, free: number}} graft points. */
    function graftPoints(state) {
        const earned = graftEarned(state), spent = of(state).graft.reduce((sum, rank) => sum + graftCost(rank), 0);
        return { earned, spent, free: Math.max(0, earned - spent) };
    }
    /** '' when the cell can take one more rank, otherwise why not. */
    function graftRaiseReason(state, cell) {
        const next = of(state).graft[cell] + 1;
        if (!graftOpen(state)) return `접붙이기는 루프 ${STUMP_BOX_GRAFT.startLoop}부터 할 수 있습니다.`;
        if (!editable(state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
        if (!isOpen(state, cell)) return '닫힌 칸입니다.';
        if (next > STUMP_BOX_GRAFT.maxRank) return '이미 마지막 단계입니다.';
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
    /** Grows every growing item by `amount` and writes first harvests into the journal. @returns {object[]} items that ripened. */
    function growBy(state, amount) {
        const ripened = [];
        for (const item of growingItems(state)) {
            item.xp = Math.min(need(item), item.xp + amount);
            if (item.xp >= need(item)) { item.ripe = true; ripened.push(item); }
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
        const item = createItem(state, spec);
        if (item) return { item, compost: null };
        const growth = compostGrowth(spec), fed = growingItems(state).length;
        return { item: null, compost: { family, color, growth, fed, ripened: growBy(state, growth) } };
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
    /** One seed and one sap of the player's chosen colour, once each. */
    function claimStarter(state, family, color) {
        const box = of(state);
        if (!box.acquired || !FAMILIES.includes(family) || box.starter[family]) return null;
        const item = createItem(state, { family, color, roll: 1 });
        if (item) box.starter[family] = true;
        return item;
    }
    /** New loop: placements and unripe progress stay; grown items return to seed/sap (a seed keeps its path) and keep
     * rootMemoryPct of their growth (뿌리 기억). @returns {number} how many went back. */
    function regress(state) {
        const box = state.stumpBox;
        if (!box || !Array.isArray(box.items)) return 0;
        const keepPct = rootMemoryPct(state);
        let count = 0;
        box.items.forEach(item => { if (item.ripe) { item.xp = Math.floor(need(item) * keepPct / 100); item.ripe = false; count++; } });
        if (count) dispatchRuntimeEvent('stump-box-regressed', { count, keepPct });
        return count;
    }

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
    /** The gift of a completed row: one seed or sap of the chosen colour, once. null when not allowed or storage is full. */
    function claimHarvestGift(state, row, color) {
        const box = of(state);
        if (!box.acquired || !pendingGifts(state).includes(row)) return null;
        const item = createItem(state, { family: STUMP_BOX_HARVEST.rows[row], color, roll: STUMP_BOX_HARVEST.giftRoll });
        if (item) box.harvest.gifts[row] = true;
        return item;
    }
    /** A STUMP_BOX_UNLOCKS condition (computed, never saved). */
    function unlockMet(state, when) {
        if (when.loop && highestLoop(state) < when.loop) return false;
        if (when.journal && !(Array.isArray(state.journalEntries) && state.journalEntries.includes(when.journal))) return false;
        return !when.harvestRows || harvestRows(state).length >= when.harvestRows;
    }
    /** The box's unlocks that hold now (none before the box). */
    function openUnlocks(state) { return of(state).acquired ? STUMP_BOX_UNLOCKS.filter(row => unlockMet(state, row.when)) : []; }
    function storageLimit(state) { return openUnlocks(state).reduce((sum, row) => sum + (row.storage || 0), STUMP_BOX_STORAGE_BASE); }
    function storageFull(state) { return storage(state).length >= storageLimit(state); }
    /** Share of growth (%) a grown item keeps when a new loop starts (뿌리 기억). */
    function rootMemoryPct(state) { return Math.max(0, ...openUnlocks(state).map(row => row.keepPct || 0)); }

    // ── 저장 경계 ───────────────────────────────────────────
    function validItem(raw) {
        const known = raw && (raw.family === 'talisman' || (FAMILIES.includes(raw.family) && COLORS.includes(raw.color)));
        return known && Number.isSafeInteger(raw.id) && raw.id > 0;
    }
    function cleanTalisman(raw) {
        const fields = talismans.normalizeTalisman(raw);
        if (!fields) return null;
        const xp = Math.min(STUMP_BOX_GROWTH.need.talisman, Math.max(0, Math.floor(Number(raw.xp) || 0)));
        return { id: raw.id, family: 'talisman', color: null, path: null, xp, ripe: xp >= STUMP_BOX_GROWTH.need.talisman, roll: 1, ...fields };
    }
    function cleanItem(raw) {
        if (raw.family === 'talisman') return cleanTalisman(raw);
        const path = raw.family === 'seed' && PATHS.includes(raw.path) ? raw.path : null;
        const xp = Math.min(STUMP_BOX_GROWTH.need[raw.family], Math.max(0, Math.floor(Number(raw.xp) || 0)));
        const ripe = xp >= STUMP_BOX_GROWTH.need[raw.family] && (raw.family === 'sap' || path !== null);
        return { id: raw.id, family: raw.family, color: raw.color, path, xp, ripe, roll: clampRoll(raw.roll) };
    }
    /** Whole ranks 0..maxRank on every cell, never spending more than the reached loops earned (the highest ranks give way). */
    function restoreGraft(raw, state) {
        const source = Array.isArray(raw) ? raw : [];
        const ranks = Array.from({ length: CELLS }, (_, cell) => Math.min(STUMP_BOX_GRAFT.maxRank, Math.max(0, Math.floor(Number(source[cell]) || 0))));
        let over = ranks.reduce((sum, rank) => sum + graftCost(rank), 0) - graftEarned(state);
        while (over > 0) {
            const cell = ranks.lastIndexOf(Math.max(...ranks));
            over -= ranks[cell];
            ranks[cell] -= 1;
        }
        return ranks;
    }
    function restoreItems(raw, box) {
        const seen = new Set();
        (Array.isArray(raw.items) ? raw.items : []).filter(validItem).forEach(item => {
            const clean = seen.has(item.id) ? null : cleanItem(item);
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
    /** Save boundary (idempotent; mergeDefaults runs it on every load, cloud apply and replay commit): repairs the box,
     * then grants it to saves that already cleared act 10 or reached loop 2. */
    function restore(state) {
        const raw = state.stumpBox, box = empty();
        if (raw && typeof raw === 'object') {
            box.acquired = raw.acquired === true;
            box.via = typeof raw.via === 'string' ? raw.via : null;
            box.starter = { seed: !!(raw.starter && raw.starter.seed), sap: !!(raw.starter && raw.starter.sap) };
            restoreItems(raw, box);
            box.nextId = Math.max(Number.isSafeInteger(raw.nextId) ? raw.nextId : 1, ...box.items.map(item => item.id + 1), 1);
            box.graft = restoreGraft(raw.graft, state);
            restoreHarvest(raw.harvest, box);
        }
        state.stumpBox = box;
        sync(state, 'migration');
        return box;
    }

    return {
        empty, of, restore, sync, eligible, claimStarter, createItem, addTalisman, discard, storage, place, move, unplace, setPath,
        evaluate, applyStats, onEnemyKilled, grow, rollDrop, regress, compost, compostReason, compostGrowth, growingItems, openCount, isOpen, opensAt, nextOpening, neighbors,
        stageOf, isMature, need, yieldOf, targetStage, label, iconPath, cellOf, editable, highestLoop,
        graftRank, graftMultiplier, graftOpen, graftPoints, graftJournalPoints, graftRaiseReason, graftRaise, graftLowerReason, graftLower,
        harvestKey, harvestRows, hasHarvested, pendingGifts, claimHarvestGift, openUnlocks, storageLimit, storageFull, rootMemoryPct,
        itemById: (state, id) => findItem(of(state), id)
    };
})();
safeExposeGlobals({ stumpBox });
