// 그루터기 함 도메인: 획득·배치·성장·공명·억제·드랍·루프 회귀를 소유한다. DOM·전투 계산·저장 입출력은 모른다.
// 전투는 처치(onEnemyKilled)만 넘기고, 능력치 파이프라인은 applyStats로 계산 결과를 한 번 합산한다.
// 설계: docs/stump-cube-game-design.md, 수치: data/stump-box.js. 공명·억제·능력치는 저장하지 않고 배치에서 계산한다.
// 부적(family 'talisman')은 색 없는 세 번째 계열: 판에서 깨어나고(성장), 공명 · 억제 · 꽃 능력치에 끼지 않는다.
// 부적의 줄과 이웃 효과는 talismans.js / talisman-effects.js가 맡고, 여기서는 보관 · 배치 · 깨어남 · 저장 경계만 다룬다.
// 성장량 필드 이름이 xp인 것은 의도다: 영구 빌드 서명(getPersistentBuildSignature)이 xp를 빼므로 처치마다
// 장비 분석 캐시가 깨지지 않고, 다 자라 능력치가 바뀌는 순간만 ripe가 바뀌어 캐시가 새로 계산된다.
const stumpBox = (() => {
    const CELLS = STUMP_BOX_SIZE * STUMP_BOX_SIZE;
    const FAMILIES = ['seed', 'sap'], PATHS = ['flower', 'fruit'], COLORS = Object.keys(STUMP_BOX_COLORS);
    const FIXED_TARGET = { sap: 'amber', talisman: 'talisman' };
    let memo = { key: null, box: null, value: null };

    function empty() {
        return { version: 1, acquired: false, via: null, starter: { seed: false, sap: false }, nextId: 1, items: [], board: Array(CELLS).fill(null) };
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
    /** What the item gives once grown (a seed needs its path first). */
    function yieldOf(item) {
        const kind = item.family === 'sap' ? 'amber' : item.path;
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
        return Math.round(Math.min(STUMP_BOX_DROPS.roll.max, Math.max(STUMP_BOX_DROPS.roll.min, Number(value) || 1)) * 100) / 100;
    }
    /** Adds a new item to storage; null when storage is full or the input is invalid. */
    function createItem(state, spec) {
        const box = of(state);
        if (!FAMILIES.includes(spec.family) || !COLORS.includes(spec.color)) return null;
        if (storage(state).length >= STUMP_BOX_STORAGE) return null;
        const item = { id: box.nextId++, family: spec.family, color: spec.color, path: null, xp: 0, ripe: false, roll: clampRoll(spec.roll) };
        box.items.push(item);
        return item;
    }
    /** Adds an unsealed talisman (talismans.js fields, normalized here) to storage. force: a boss reward that must not be lost to a full storage. */
    function addTalisman(state, talisman, force) {
        const box = of(state), fields = talismans.normalizeTalisman(talisman);
        if (!box.acquired || !fields || (!force && storage(state).length >= STUMP_BOX_STORAGE)) return null;
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
    function openCount(state) {
        if (!of(state).acquired) return 0;
        const loop = highestLoop(state);
        return STUMP_BOX_UNLOCKS.reduce((count, step) => loop >= step.loop ? step.cells : count, 0);
    }
    function isOpen(state, cell) { return STUMP_BOX_CELL_ORDER.slice(0, openCount(state)).includes(cell); }
    /** The loop that opens a closed cell (the board's hint), or null when it is open. */
    function opensAt(state, cell) {
        if (isOpen(state, cell)) return null;
        const rank = STUMP_BOX_CELL_ORDER.indexOf(cell), step = STUMP_BOX_UNLOCKS.find(row => row.cells > rank);
        return step ? step.loop : null;
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
    function unplace(state, id) {
        const box = of(state), from = box.board.indexOf(id);
        if (!editable(state) || from < 0 || storage(state).length >= STUMP_BOX_STORAGE) return false;
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
        return box.board.map(id => {
            const item = id === null ? null : findItem(box, id);
            return item ? `${item.id}${item.color}${item.path || ''}${item.ripe ? 'R' : ''}${item.roll}` : '-';
        }).join('|');
    }
    function placedItems(box) { return box.board.filter(id => id !== null).map(id => findItem(box, id)).filter(Boolean); }
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
    function itemValue(item, resonant) {
        const boost = resonant.has(item.color) ? 1 + STUMP_BOX_RESONANCE.bonusPct / 100 : 1;
        return Math.round(yieldOf(item).value * item.roll * boost * 100) / 100;
    }
    /** Suppression (opposite colours side by side), resonance (3+ grown, unsuppressed of a colour) and stat totals. */
    function evaluate(state) {
        const box = of(state), key = signature(box);
        if (memo.key === key && memo.box === box) return memo.value;
        const suppressed = suppressedIds(box), counts = Object.fromEntries(COLORS.map(color => [color, 0]));
        const grown = placedItems(box).filter(item => isMature(item) && yieldOf(item) && !suppressed.has(item.id));
        grown.forEach(item => { counts[item.color]++; });
        const resonant = new Set(COLORS.filter(color => counts[color] >= STUMP_BOX_RESONANCE.count));
        const stats = {}, values = {};
        for (const item of grown) {
            const stat = yieldOf(item).stat;
            values[item.id] = itemValue(item, resonant);
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

    // ── 성장·드랍 ───────────────────────────────────────────
    function killKind(enemy) { return enemy && enemy.isBoss ? 'boss' : enemy && enemy.isElite ? 'elite' : 'normal'; }
    /** Grows placed, unsuppressed, unripe items by one kill. @returns {object[]} items that ripened. */
    function grow(state, enemy) {
        const box = of(state), amount = STUMP_BOX_GROWTH.perKill[killKind(enemy)], suppressed = evaluate(state).suppressed, ripened = [];
        for (const item of placedItems(box)) {
            if (suppressed.has(item.id) || isMature(item) || !targetStage(item)) continue;
            item.xp = Math.min(need(item), item.xp + amount);
            if (item.xp >= need(item)) { item.ripe = true; ripened.push(item); }
        }
        return ripened;
    }
    /** The box's own drop roll, independent of gear drops. random() → [0, 1). @returns {?object} the new item. */
    function rollDrop(state, enemy, random) {
        if (random() >= STUMP_BOX_DROPS.chance[killKind(enemy)]) return null;
        const family = random() < STUMP_BOX_DROPS.sapShare ? 'sap' : 'seed';
        const color = COLORS[Math.min(COLORS.length - 1, Math.floor(random() * COLORS.length))];
        const span = STUMP_BOX_DROPS.roll.max - STUMP_BOX_DROPS.roll.min;
        return createItem(state, { family, color, roll: STUMP_BOX_DROPS.roll.min + random() * span });
    }
    /** One call per kill (live and offline replay alike). Story-act expeditions escrow their loot until the act is
     * settled, so the box's drops are not rolled there (growth still counts); generated maps — chaos, realm, the atlas … —
     * roll them as the 9×8 board does. */
    function onEnemyKilled(state, enemy) {
        const box = state.stumpBox;
        if (!box || !box.acquired) return;
        const ripened = grow(state, enemy);
        const storyAct = typeof actExplorationState === 'object' && actExplorationState.current(state)?.act != null;
        const drop = storyAct ? null : rollDrop(state, enemy, Math.random);
        if (!ripened.length && !drop) return;
        if (state.noti) state.noti.stump = true;
        dispatchRuntimeEvent('stump-box-changed', { ripened, drop });
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
    /** New loop: placements and unripe progress stay; grown items return to seed/sap with no growth (a seed keeps its path). */
    function regress(state) {
        const box = state.stumpBox;
        if (!box || !Array.isArray(box.items)) return 0;
        let count = 0;
        box.items.forEach(item => { if (item.ripe) { item.xp = 0; item.ripe = false; count++; } });
        return count;
    }

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
        }
        state.stumpBox = box;
        sync(state, 'migration');
        return box;
    }

    return {
        empty, of, restore, sync, eligible, claimStarter, createItem, addTalisman, discard, storage, place, unplace, setPath,
        evaluate, applyStats, onEnemyKilled, grow, rollDrop, regress, openCount, isOpen, opensAt, neighbors,
        stageOf, isMature, need, yieldOf, targetStage, label, iconPath, cellOf, editable, highestLoop,
        itemById: (state, id) => findItem(of(state), id)
    };
})();
safeExposeGlobals({ stumpBox });
