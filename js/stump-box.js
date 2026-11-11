// 그루터기 함 도메인: 획득·배치·성장·거름·공명·억제·드랍·루프 회귀를 소유한다. DOM·전투 계산·저장 입출력은 모른다.
// 전투는 처치(onEnemyKilled)만 넘기고, 능력치 파이프라인은 applyStats로 계산 결과를 한 번 합산한다.
// 설계: docs/stump-cube-game-design.md, 수치: data/stump-box.js. 공명·억제·능력치는 저장하지 않고 배치에서 계산한다.
// 부적(family 'talisman')은 색 없는 세 번째 계열: 판에서 깨어나고(성장), 공명 · 억제 · 꽃 능력치에 끼지 않는다.
// 부적의 줄과 이웃 효과는 talismans.js / talisman-effects.js가 맡고, 여기서는 보관 · 배치 · 깨어남 · 저장 경계만 다룬다.
// 접붙이기(graft, 칸마다 0~5단계, 루프 45부터 6)는 칸에 붙는다: 아이템을 옮기면 새 칸의 단계를 따른다. 씨앗 값은 여기서,
// 부적 줄은 talisman-effects.js가 graftMultiplier로 키운다.
// 화폐화(2026-11-03): 다 자란 꽃, 열매, 덩굴, 뿌리는 칸을 차지하지 않는 재화(box.wallet)가 될 수 있고, 실물로는 돌아오지 않는다. 루프가 바뀌면 사라진다.
// 생육함(2026-11-03, box.nursery): 판처럼 놓지만 효과, 공명, 비활성화, 접붙이기가 없고 경험치만 일부 받는다. 보관함 칸을 차지하지 않는다.
// 16번(2026-10-08): 다 자라는 순간 풍작, 황금, 추가 줄을 굴리고(item.harvest, 새 루프에 지우고 다시 굴린다), 봉인 칸(box.sealed)의 것은
// 그대로 루프를 넘긴다. 불씨의 흉터(family 'scar', 색 없음, 포식이 열릴 때 하나 box.scarGift)는 루프를 넘길 때 둘레 8칸 하나를 먹고 흡수한다(포식). 번식, 씨앗 주머니,
// 일괄 거름 사용과 일괄 버리기, 부적 도감(box.codex)도 여기 있다. 수치는 data/stump-box.js.
// 씨앗이 꽃, 열매, 덩굴, 뿌리 가운데 무엇이 될지는 다 자라는 순간 무작위로 정해진다(2026-11-04 사용자, 전에는 생길 때 꽃이나 열매로 정했다).
// 수액은 없앴다: 옛 저장의 수액은 같은 색 씨앗, 다 자란 호박석은 같은 색 뿌리가 된다(cleanLegacySap). item.path는 다 자란 씨앗의 종류다.
// 성장량 필드 이름이 xp인 것은 의도다: 영구 빌드 서명(getPersistentBuildSignature)이 xp를 빼므로 처치마다
// 장비 분석 캐시가 깨지지 않고, 다 자라 능력치가 바뀌는 순간만 ripe가 바뀌어 캐시가 새로 계산된다.
const stumpBox = (() => {
    const CELLS = STUMP_BOX_SIZE * STUMP_BOX_SIZE;
    const FAMILIES = ['seed'], KINDS = STUMP_BOX_KINDS, COLORS = Object.keys(STUMP_BOX_COLORS);
    const FIXED_TARGET = { talisman: 'talisman', scar: 'scar' };
    /** 오행(data/stump-box.js): the colour that overcomes each colour (상극) and the colour that feeds it (상생). */
    const OVERCOMER = Object.freeze(Object.fromEntries(Object.entries(STUMP_BOX_OVERCOMES).map(([winner, loser]) => [loser, winner])));
    const FEEDER = Object.freeze(Object.fromEntries(Object.entries(STUMP_BOX_FEEDS).map(([mother, child]) => [child, mother])));
    const MOORE = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    /** Every line the box can give: the main lines (STUMP_BOX_YIELDS), then the extra lines (STUMP_BOX_EXTRA_LINES). */
    const LINE_ROWS = Object.freeze(Object.values(STUMP_BOX_YIELDS).flatMap(Object.values)
        .concat(Object.values(STUMP_BOX_EXTRA_LINES).flatMap(Object.values).flat()));
    const ALBINO_ROWS = Object.freeze(Object.values(STUMP_BOX_RIPENING.albino.variants).flatMap(Object.values).flat());
    /** The most one stat can hold on a scar: its largest base value (a main or an extra line) × capMul. */
    const SCAR_CAPS = (() => {
        const out = {};
        LINE_ROWS.concat(ALBINO_ROWS).forEach(row => { out[row.stat] = Math.max(out[row.stat] || 0, row.value * STUMP_BOX_SCAR.capMul); });
        return Object.freeze(out);
    })();
    const HARVEST_ROWS = STUMP_BOX_HARVEST.rows;
    const HARVEST_KEYS = HARVEST_ROWS.flatMap(row => COLORS.map(color => `${row}-${color}`));
    // 판 2(2026-10-09): 성장 필요량 8배(data/stump-box.js STUMP_BOX_GROWTH). 판 1 저장은 restore가 한 번 옮긴다(upgradeGrowth).
    // 판 3(2026-11-04): 물리가 더해져 수확 일지 줄은 다섯 색을 채워야 한다. 판 2까지 네 색으로 채운 줄은 채운 줄로 남는다(legacyRows).
    const BOX_VERSION = 3;
    const OLD_COLORS = COLORS.filter(color => color !== 'physical');
    let memo = { key: null, box: null, value: null };
    // Session-only position history. Growth, item fields, grafts and currency are never rolled back.
    const placementUndos = new WeakMap();

    function emptyHarvest() {
        return { grown: [], gifts: Object.fromEntries(HARVEST_ROWS.map(row => [row, false])), legacyRows: [] };
    }
    function empty() {
        return { version: BOX_VERSION, acquired: false, via: null, starter: { seed: false, second: false }, nextId: 1, items: [], board: Array(CELLS).fill(null),
            graft: Array(CELLS).fill(0), harvest: emptyHarvest(), sealed: [], pouches: { opened: [], offers: {} }, codex: [], scarGift: false, wallet: {}, nursery: Array(CELLS).fill(null) };
    }
    /** What a ripening seed becomes (꽃, 열매, 덩굴, 뿌리), evenly (2026-11-04 사용자: 키우기 전에는 모른다). */
    function growKind(random = Math.random) { return KINDS[Math.min(KINDS.length - 1, Math.floor(random() * KINDS.length))]; }
    /** A grown seed saved without its kind: a fixed one by id (restore stays repeatable). */
    function legacyKind(id) { return KINDS[Number(id) % KINDS.length]; }
    function fillLaterShapes(box) {
        if (!Array.isArray(box.codex)) box.codex = [];
        if (!box.wallet || typeof box.wallet !== 'object') box.wallet = {};
        if (!Array.isArray(box.nursery)) box.nursery = Array(CELLS).fill(null);
    }
    function fillHarvestShape(box) {
        if (!box.harvest || !Array.isArray(box.harvest.grown) || !box.harvest.gifts) box.harvest = { ...emptyHarvest(), ...(box.harvest && typeof box.harvest === 'object' ? box.harvest : {}) };
        if (!Array.isArray(box.harvest.grown)) box.harvest.grown = [];
        if (!Array.isArray(box.harvest.legacyRows)) box.harvest.legacyRows = [];
    }
    /** @returns {object} The state's box, created empty when missing. A box from an older save without the harvest journal or the
     * codex gets their empty shapes here (restore fills the rest later): a load that stored a floor talisman before restore read them
     * and threw (2026-10-20). */
    function of(state) {
        if (!state.stumpBox || typeof state.stumpBox !== 'object') state.stumpBox = empty();
        const box = state.stumpBox;
        fillHarvestShape(box);
        fillLaterShapes(box);
        return box;
    }

    // ── 아이템 ─────────────────────────────────────────────
    function need(item) { return STUMP_BOX_GROWTH.need[item.family]; }
    function isMature(item) { return item.ripe === true; }
    /** seed, then flower · fruit · vine · root (no half stage: 2026-11-04 사용자, 새싹을 없앴다) */
    // Colourless families: awake under their own stage name, asleep under this one.
    const ASLEEP = Object.freeze({ talisman: 'sealed', scar: 'scarAsleep' });
    function stageOf(item) {
        if (ASLEEP[item.family]) return isMature(item) ? item.family : ASLEEP[item.family];
        return isMature(item) && item.path ? item.path : 'seed';
    }
    /** flower · fruit · vine · root: what a grown seed became (null while it grows, and for talismans and scars). */
    function yieldKind(item) { return item.family === 'seed' && isMature(item) ? item.path : null; }
    /** Seeds grow until they ripen, talismans and scars until they wake. */
    const grows = item => FAMILIES.includes(item.family) || !!FIXED_TARGET[item.family];
    /** What the item gives once grown (nothing while a seed grows: its kind is not known yet). */
    function yieldOf(item) {
        const kind = yieldKind(item);
        return kind ? STUMP_BOX_YIELDS[kind][item.color] : null;
    }
    function targetStage(item) { return FIXED_TARGET[item.family] || item.path; }
    /** '황금 화염 꽃': colour and stage without the target (talismans and scars by name). */
    function shortName(item) {
        if (item.family === 'talisman') return isMature(item) ? item.name : _t('{name} (잠듦)', { name: item.name });
        if (item.family === 'scar') return isMature(item) ? STUMP_BOX_SCAR.name : _t('{name} (잠듦)', { name: STUMP_BOX_SCAR.name });
        return `${item.albino ? _t('알비노 ') : ''}${goldenMul(item) > 1 ? _t('황금 ') : ''}${item.ancient ? _t('고대 ') : ''}${STUMP_BOX_COLORS[item.color].label} ${STUMP_BOX_STAGES[stageOf(item)].label}`;
    }
    /** The item's name: a growing seed does not tell what it becomes. */
    const label = item => shortName(item);
    /** A stat line in the box's own words ('점화 확률 +3%'): main lines, extra lines and a scar's lines share them. */
    function lineText(stat, value) {
        const row = LINE_ROWS.concat(ALBINO_ROWS).find(entry => entry.stat === stat);
        const shown = String(Math.round(value * 10) / 10);
        return row ? row.text.replace('{v}', shown) : `${getStatName(stat)} +${shown}`;
    }
    function iconPath(item) {
        if (item.albino) return `assets/items/stump-albino-v1/${yieldKind(item)}-${item.color}.png`;
        if (item.family === 'scar' && isMature(item)) return 'assets/items/stump-albino-v1/scar-ember.png';
        const icon = STUMP_BOX_STAGES[stageOf(item)].icon, suffix = item.family === 'talisman' ? item.rarity : item.color;
        return `assets/items/stump-pixel-v1/${icon}${suffix ? `-${suffix}` : ''}.png`;
    }
    function findItem(box, id) { return box.items.find(item => item.id === id) || null; }
    function cellOf(state, id) { return of(state).board.indexOf(id); }
    /** On the board or in the nursery: not in storage. */
    function isPlaced(state, id) { const box = of(state); return box.board.includes(id) || box.nursery.includes(id); }
    function storage(state) {
        const box = of(state), placed = new Set([...box.board, ...box.nursery].filter(id => id !== null));
        return box.items.filter(item => !placed.has(item.id));
    }
    // ── 보관함 자리 ─────────────────────────────────────────
    // 끌어서 위치 조절(2026-11-02 사용자): item.slot은 보관함 칸 번호(쪽을 넘어 센다). 판에 놓인 동안 번호는 남고, 돌아올 때 그 칸이 차 있으면 앞의 빈칸으로 간다.
    // 번호가 없는 것(새 아이템, 이 기능 전의 저장)도 앞의 빈칸으로 간다. 옛 저장의 첫 모습이 전과 같도록 품질 높은 순으로 채운다.
    const storageSeedOrder = (a, b) => (!!b.color - !!a.color) || (a.color ? b.roll - a.roll : 0) || a.id - b.id;
    const hasSlot = item => Number.isInteger(item.slot) && item.slot >= 0;
    function settleStorageSlots(state) {
        const taken = new Set(), waiting = [], items = storage(state);
        // 잠근 것이 먼저 제 칸을 갖는다(판에서 돌아온 잠근 것도 제 칸으로): 겹치면 잠그지 않은 쪽이 빈칸으로 간다.
        [...items.filter(item => item.locked), ...items.filter(item => !item.locked)].forEach(item => {
            if (hasSlot(item) && !taken.has(item.slot)) taken.add(item.slot);
            else waiting.push(item);
        });
        let free = 0;
        waiting.sort(storageSeedOrder).forEach(item => {
            while (taken.has(free)) free++;
            item.slot = free;
            taken.add(free);
        });
    }
    /** 지금 보이는 칸(다른 정렬)을 그대로 자리로 삼는다. cells: 칸마다 아이템 또는 null. */
    function orderStorage(state, cells) {
        cells.forEach((item, index) => { if (item) item.slot = index; });
    }
    /** 보관함 안에서 옮긴다. 그 칸에 다른 것이 있으면 자리를 바꾼다(잠근 것도 끌어서 옮긴다). @returns {boolean} 옮겼는지 */
    function moveInStorage(state, id, slot) {
        settleStorageSlots(state);
        const items = storage(state), item = items.find(row => row.id === id);
        if (!item || !Number.isInteger(slot) || slot < 0 || item.slot === slot) return false;
        const other = items.find(row => row.slot === slot);
        if (other) other.slot = item.slot;
        item.slot = slot;
        return true;
    }

    // ── 상점 값 ─────────────────────────────────────────────
    // 하켄의 모든 룬 진열대(2026-11-02 사용자): 룬 하나의 값이 다 자란 꽃, 열매, 덩굴, 뿌리 하나다. 값 키는 'harvest:flower:fire'처럼 쓰고, 색이 없으면
    // 어느 색이든 된다. 종류 자리의 any는 꽃, 열매, 덩굴, 뿌리 어느 것이든이다('harvest:any:fire', 수확 제작). 조합창처럼 판에 놓이지 않은 것만
    // 쓰고, 잠근 것은 쓰지 않는다. 평범하고 품질이 낮은 것부터 나간다.
    const HARVEST_PRICE = /^harvest:(flower|fruit|vine|root|any)(?::(\w+))?$/;
    const ANY_KIND = 'any', ANY_KIND_LABEL = '식물';
    const harvestPriceKey = (kind, color) => `harvest:${kind}${color ? `:${color}` : ''}`;
    const isHarvestPrice = key => HARVEST_PRICE.test(key);
    function parseHarvestPrice(key) {
        const [, kind, color] = HARVEST_PRICE.exec(key);
        return { kind, color: color || null };
    }
    function harvestPriceName(key) {
        const { kind, color } = parseHarvestPrice(key), name = kind === ANY_KIND ? ANY_KIND_LABEL : STUMP_BOX_STAGES[kind].label;
        return color ? `${_t(STUMP_BOX_COLORS[color].label)} ${_t(name)}` : _t(name);
    }
    /** 값 그림: 색이 없는 값은 화염 그림을 쓰고 화면이 무채색으로 칠한다(css/shop-view.css .is-any-colour). 종류가 any면 꽃 그림이다. */
    function harvestPriceIcon(key) {
        const { kind, color } = parseHarvestPrice(key);
        return `assets/items/stump-pixel-v1/${STUMP_BOX_STAGES[kind === ANY_KIND ? 'flower' : kind].icon}-${color || 'fire'}.png`;
    }
    const harvestWalletKeys = () => [...COLORS.map(color => harvestPriceKey('flower', color)), harvestPriceKey('root'), harvestPriceKey('vine'), harvestPriceKey('fruit')];
    const isPlainHarvest = item => !item.albino && !item.ancient && goldenMul(item) === 1;
    function harvestForPrice(state, key) {
        const { kind, color } = parseHarvestPrice(key);
        return storage(state).filter(item => isMature(item) && !item.locked && (kind === ANY_KIND || yieldKind(item) === kind) && (!color || item.color === color))
            .sort((a, b) => isPlainHarvest(b) - isPlainHarvest(a) || qualityOf(a) - qualityOf(b));
    }
    const harvestPriceHeld = (state, key) => harvestForPrice(state, key).length + walletForPrice(state, key).reduce((sum, stack) => sum + walletCount(state, stack), 0);
    /** 값을 치른다: 화폐화한 재화부터 내고, 없으면 보관함의 실물을 낸다. 낸 것을 돌려주고, 가진 것이 없으면 null. */
    function payHarvestPrice(state, key) {
        const stack = walletForPrice(state, key)[0];
        if (stack) return spendWallet(state, stack) ? { walletKey: stack } : null;
        const item = harvestForPrice(state, key)[0];
        return item && discard(state, item.id) ? item : null;
    }

    // ── 화폐화(2026-11-03 사용자: 보관함 칸 이득) ───────────────
    // box.wallet은 'flower-fire': 개수. 실물의 품질과 황금 같은 표식은 남지 않고, 루프가 바뀌면 사라진다(2026-11-03 사용자). 값을 치를 때 실물보다 먼저 나간다.
    // 조합창은 재화 조각(walletPiece)을 가리키기만 해서, 꺼내면 그대로이고 조합할 때만 줄어든다(js/stump-cube.js).
    const walletCount = (state, key) => Number(of(state).wallet[key]) || 0;
    const walletTotal = state => HARVEST_KEYS.reduce((sum, key) => sum + walletCount(state, key), 0);
    function addToWallet(box, item) {
        const key = `${yieldKind(item)}-${item.color}`;
        box.wallet[key] = (Number(box.wallet[key]) || 0) + 1;
    }
    /** The stacks a price can take: its colour's (every kind's for any), or with no colour the biggest first. */
    function walletForPrice(state, key) {
        const { kind, color } = parseHarvestPrice(key), kinds = kind === ANY_KIND ? KINDS : [kind];
        return kinds.flatMap(one => (color ? [color] : COLORS).map(tone => `${one}-${tone}`)).filter(stack => walletCount(state, stack) > 0)
            .sort((a, b) => walletCount(state, b) - walletCount(state, a));
    }
    function spendWallet(state, key) {
        const left = walletCount(state, key);
        if (left < 1) return false;
        if (left === 1) delete of(state).wallet[key];
        else of(state).wallet[key] = left - 1;
        return true;
    }
    /** A grown seed in storage, not locked. */
    function canMonetize(state, item) {
        return !!item && editable(state) && FAMILIES.includes(item.family) && isMature(item) && !item.locked && !isPlaced(state, item.id);
    }
    /** Turns one stored grown item into currency for good. @returns {boolean} whether it went */
    function monetize(state, id) {
        const box = of(state), item = findItem(box, id);
        if (!canMonetize(state, item)) return false;
        box.items = box.items.filter(row => row !== item);
        addToWallet(box, item);
        return true;
    }
    /** What one kind and colour ('flower-fire') comes to as money: stored unlocked items and currency. */
    function harvestHoldings(state, key) {
        const [kind, color] = key.split('-');
        return { real: harvestForPrice(state, harvestPriceKey(kind, color)).length, wallet: walletCount(state, key) };
    }
    const walletPieceMemo = new Map();
    /** A cube material standing for one unit of a stack: always the same object for one id. */
    function walletPiece(key, index) {
        const id = `${key}#${index}`;
        if (!walletPieceMemo.has(id)) {
            const [kind, color] = key.split('-');
            walletPieceMemo.set(id, Object.freeze({ id, walletKey: key, family: 'seed', path: kind, color, xp: 0, ripe: true, roll: STUMP_BOX_ROLL_LIMIT.min }));
        }
        return walletPieceMemo.get(id);
    }
    /** The piece of this id while the stack still holds it, else null. */
    function walletPieceById(state, id) {
        const [key, index] = String(id).split('#');
        return HARVEST_KEYS.includes(key) && Number(index) < walletCount(state, key) ? walletPiece(key, Number(index)) : null;
    }
    /** Up to limit pieces of each stack. */
    const walletPieces = (state, limit) => HARVEST_KEYS.flatMap(key => Array.from({ length: Math.min(limit, walletCount(state, key)) }, (_, index) => walletPiece(key, index)));
    // 지도석 기운 바꾸기(js/atlas.js changeOmen): 평범한 꽃은 다시 굴리고 황금 꽃은 고른다. 둘은 서로의 값을 대신하지 않고, 알비노와 고대 씨앗은 쓰지 않는다.
    // 화폐화한 꽃은 표식이 없어 평범한 꽃으로 세고, 다른 값처럼 실물보다 먼저 낸다.
    const isGoldenHarvest = item => !item.albino && !item.ancient && goldenMul(item) > 1;
    const storedFlowers = (state, color, golden) => harvestForPrice(state, harvestPriceKey('flower', color)).filter(golden ? isGoldenHarvest : isPlainHarvest);
    const storedFlowerCount = (state, color, golden) => storedFlowers(state, color, golden).length + (golden ? 0 : walletCount(state, `flower-${color}`));
    /** 꽃 하나를 쓴다: 화폐화한 꽃이면 { walletKey }, 실물이면 낸 꽃을 돌려주고, 가진 것이 없으면 null. */
    function payFlower(state, color, golden) {
        const stack = `flower-${color}`;
        if (!golden && spendWallet(state, stack)) return { walletKey: stack };
        const item = storedFlowers(state, color, golden)[0];
        return item && discard(state, item.id) ? item : null;
    }
    function clampRoll(value, cap = STUMP_BOX_ROLL_LIMIT.max) {
        return Math.round(Math.min(cap, Math.max(STUMP_BOX_ROLL_LIMIT.min, Number(value) || 1)) * 100) / 100;
    }
    /** Highest stored quality: 130%, raised by the box's unlocks (qualityCap, loops 35 and 45). */
    function rollCap(state) { return Math.max(STUMP_BOX_ROLL_LIMIT.max, ...openUnlocks(state).map(row => row.qualityCap || 0)); }
    /** The most a quality can be: the cap, or past it by the rare merge that may (data/stump-cube.js STUMP_CUBE_MERGE.over). */
    function rollCeiling(state) { return Math.round((rollCap(state) + STUMP_CUBE_MERGE.over) * 100) / 100; }
    /** The cap a new item's quality is held to: the ceiling for the rare merge past the cap (spec.overCap), else the cap. */
    const specRollCap = (state, spec) => (spec.overCap === true ? rollCeiling(state) : rollCap(state));
    /** Adds a new seed to storage; null when storage is full or the input is invalid. spec.golden makes a golden seed. What it becomes
     * is rolled when it ripens. force: a result or reward that must not be lost to a full storage (a cube merge, an ancient seed), as
     * addTalisman and addScar take it. */
    function createItem(state, spec, force) {
        const box = of(state);
        if (!FAMILIES.includes(spec.family) || !COLORS.includes(spec.color)) return null;
        if (!force && storageFull(state)) return null;
        const item = { id: box.nextId++, family: spec.family, color: spec.color, path: null, xp: 0, ripe: false, roll: clampRoll(spec.roll, specRollCap(state, spec)) };
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
        const box = of(state), item = findItem(box, id);
        if (isPlaced(state, id) || !item || item.locked) return false;
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
    /** The albino on the board, or null. */
    const wornAlbinoId = state => placedItems(of(state)).find(item => item.albino)?.id ?? null;
    /** What the board holds one of (알비노; 2026-11-04 사용자: 불씨의 흉터도 하나, 새 흉터는 옵션을 다시 뽑을 때 바꿔 쓴다). */
    const ONE_ON_BOARD = Object.freeze([
        Object.freeze({ test: item => !!item.albino, reason: '알비노는 그루터기 함 전체에 하나만 놓을 수 있습니다.' }),
        Object.freeze({ test: item => item.family === 'scar', reason: '불씨의 흉터는 그루터기 함에 하나만 놓을 수 있습니다.' })]);
    /** The other placed item of the item's one-on-the-board kind (albino or scar), or null. */
    function wornOneId(state, item) {
        const rule = item ? ONE_ON_BOARD.find(row => row.test(item)) : null;
        return rule ? placedItems(of(state)).find(other => other.id !== item.id && rule.test(other))?.id ?? null : null;
    }
    /** One albino and one scar across the board; a stored one may replace the worn one directly. */
    function onePerBoardReason(state, id, cell) {
        const box = of(state), item = findItem(box, id), rule = item ? ONE_ON_BOARD.find(row => row.test(item)) : null;
        if (!rule) return '';
        const from = box.board.indexOf(id);
        const conflict = box.board.some((other, at) => other !== null && other !== id && (from >= 0 || at !== cell) && rule.test(findItem(box, other) || {}));
        return conflict ? rule.reason : '';
    }
    function placeOnBoard(state, id, cell) {
        const box = of(state), item = findItem(box, id);
        if (!editable(state) || !item || !isOpen(state, cell) || box.board[cell] !== null || box.nursery.includes(id) || onePerBoardReason(state, id, cell)) return false;
        const from = box.board.indexOf(id);
        if (from >= 0) box.board[from] = null;
        box.board[cell] = id;
        return true;
    }
    /** Direct placements (starter gifts and other domain actions) supersede any manual move history. */
    function place(state, id, cell) {
        if (!placeOnBoard(state, id, cell)) return false;
        invalidatePlacementUndo(state);
        return true;
    }
    /**
     * Moves an item onto an open cell, empty or not. An item already there trades places: it takes the mover's old
     * cell, or goes to storage when the mover came from storage (storage size stays the same). Returns false and
     * changes nothing when the move is not allowed or goes nowhere.
     */
    function moveOnBoard(state, id, cell) {
        const box = of(state), item = findItem(box, id), from = box.board.indexOf(id), occupant = box.board[cell];
        if (!editable(state) || !item || !isOpen(state, cell) || from === cell || box.nursery.includes(id) || onePerBoardReason(state, id, cell)) return false;
        if (occupant === null) return placeOnBoard(state, id, cell);
        box.board[cell] = id;
        if (from >= 0) box.board[from] = occupant;
        return true;
    }
    function rememberPlacement(state, before) {
        const box = state.stumpBox;
        placementUndos.set(state, { box, items: box.items, season: state.season, before, after: box.board.slice() });
    }
    /** Manual moves, including swaps and moves from storage, keep exactly one position-only undo. */
    function move(state, id, cell) {
        const before = of(state).board.slice();
        if (!moveOnBoard(state, id, cell)) return false;
        rememberPlacement(state, before);
        return true;
    }
    function unplace(state, id) {
        const box = of(state), from = box.board.indexOf(id);
        if (!editable(state) || from < 0 || storageFull(state)) return false;
        const before = box.board.slice();
        box.board[from] = null;
        rememberPlacement(state, before);
        return true;
    }
    /** '' when every board item can go back to storage at once (전체 해제), otherwise why not. */
    function unplaceAllReason(state) {
        const placed = of(state).board.filter(id => id !== null).length;
        if (!editable(state)) return '나무꾼 전투 중에는 그루터기 함 배치를 바꿀 수 없습니다.';
        if (!placed) return '그루터기 함에 놓인 아이템이 없습니다.';
        const room = storageLimit(state) - storage(state).length;
        return room < placed ? _t('보관함에 {value}칸이 더 필요합니다.', { value: placed - room }) : '';
    }
    /** Every board item back to storage as one move ([배치 되돌리기] puts them back). @returns {number} how many moved (0 when refused). */
    function unplaceAll(state) {
        if (unplaceAllReason(state)) return 0;
        const box = of(state), before = box.board.slice();
        box.board = before.map(() => null);
        rememberPlacement(state, before);
        return before.filter(id => id !== null).length;
    }

    // ── 생육함 ─────────────────────────────────────────────
    const nurseryOpen = state => contentProgression.holds('stumpNursery', state);
    /** The share of the board's growth a nursery item gets. */
    const nurseryRate = state => Math.min(1, Math.round((STUMP_BOX_NURSERY.rate + STUMP_BOX_NURSERY.ratePerRank * contentProgression.rank('stumpNurseryRate', state)) * 100) / 100);
    const inNursery = (state, id) => of(state).nursery.includes(id);
    /** The first open empty cell, or null. */
    function firstNurseryCell(state) {
        const cell = STUMP_BOX_CELL_ORDER.find(at => isOpen(state, at) && of(state).nursery[at] === null);
        return cell === undefined ? null : cell;
    }
    /** Puts an item on a nursery cell. A filled cell trades places: its item takes the mover's old nursery cell, or goes to storage. */
    function nurseryMove(state, id, cell) {
        const box = of(state), item = findItem(box, id), from = box.nursery.indexOf(id), occupant = box.nursery[cell];
        if (!editable(state) || !item || !isOpen(state, cell) || from === cell) return false;
        const onBoard = box.board.indexOf(id);
        if (onBoard >= 0 && occupant !== null && storageFull(state)) return false;
        if (onBoard >= 0) box.board[onBoard] = null;
        if (from >= 0) box.nursery[from] = occupant;
        box.nursery[cell] = id;
        invalidatePlacementUndo(state);
        return true;
    }
    function nurseryUnplace(state, id) {
        const box = of(state), from = box.nursery.indexOf(id);
        if (!editable(state) || from < 0 || storageFull(state)) return false;
        box.nursery[from] = null;
        return true;
    }
    /** '' when every nursery item can go back to storage at once, otherwise why not. */
    function nurseryClearReason(state) {
        const placed = of(state).nursery.filter(id => id !== null).length;
        if (!editable(state)) return '나무꾼 전투 중에는 생육함 배치를 바꿀 수 없습니다.';
        if (!placed) return '생육함에 놓인 아이템이 없습니다.';
        const room = storageLimit(state) - storage(state).length;
        return room < placed ? _t('보관함에 {value}칸이 더 필요합니다.', { value: placed - room }) : '';
    }
    /** @returns {number} how many went back (0 when refused). */
    function nurseryClear(state) {
        if (nurseryClearReason(state)) return 0;
        const box = of(state), count = box.nursery.filter(id => id !== null).length;
        box.nursery = box.nursery.map(() => null);
        return count;
    }

    function invalidatePlacementUndo(state) { placementUndos.delete(state); }
    function placementUnchanged(state, record) {
        const box = state.stumpBox;
        // Removing/consuming an item replaces items; new drops append and can keep a valid position undo.
        return box === record.box && box.items === record.items && state.season === record.season
            && box.acquired && !state.woodsmanBuildLock && record.after.every((id, cell) => box.board[cell] === id);
    }
    /** No persistent writes. A full storage only blocks undo when it would put another item there. */
    function canUndoPlacement(state) {
        const record = placementUndos.get(state);
        if (!record) return false;
        if (!placementUnchanged(state, record) || !record.before.every((id, cell) => id === null || isOpen(state, cell))) {
            invalidatePlacementUndo(state);
            return false;
        }
        const placedBefore = record.before.filter(id => id !== null).length;
        const placedAfter = record.after.filter(id => id !== null).length;
        return placedBefore >= placedAfter || state.stumpBox.items.length - placedBefore <= storageLimit(state);
    }
    /** Restores positions once; current XP, ripening rolls, item locks and currency stay untouched. */
    function undoPlacement(state) {
        if (!canUndoPlacement(state)) return false;
        state.stumpBox.board = placementUndos.get(state).before.slice();
        invalidatePlacementUndo(state);
        return true;
    }

    /** A prospective move on a copied board. Shared items are read-only; no saves, growth or live state writes.
     * @returns {object|null} A state for evaluate/talismanEffects.summarize, or null for a refused/no-op move. */
    function previewMove(state, id, cell) {
        if (!state.stumpBox || !Number.isInteger(cell)) return null;
        const preview = { ...state, stumpBox: { ...state.stumpBox, board: state.stumpBox.board.slice() } };
        return moveOnBoard(preview, id, cell) ? preview : null;
    }

    // ── 판정(계산만, 저장하지 않음) ─────────────────────────
    /** Everything an item's effect reads: ripeness, quality, golden, the ripening roll and a scar's absorbed lines. */
    function itemSignature(item) {
        const lines = item.harvest ? `h${item.harvest.bonus}${item.harvest.golden ? 'G' : ''}${item.harvest.lines.map(line => line.stat + line.value).join(',')}` : '';
        const absorbed = item.absorbed ? Object.entries(item.absorbed).map(([stat, value]) => stat + value).join(',') : '';
        return `${item.id}${item.color}${item.path || ''}${item.ripe ? 'R' : ''}${item.roll}${item.golden ? 'G' : ''}${item.ancient ? 'A' : ''}${item.albino ? 'U' : ''}${lines}${absorbed}`;
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
    // ── 판 시너지(2026-11-04 사용자): 공명, 반극, 상생, 규율. 저장하지 않고 배치에서 계산한다 ─────────
    // 공명: 다 자란 같은 색 셋이 가로나 세로로 곧게 이어지면 그 셋 +10%. 셋의 상하좌우에 같은 색이 하나라도 더 있으면(자라는 중이어도) 없다.
    // 반극: 공명 줄의 아이템은 상극에 멈추지 않고, 곁에서 그것을 이기는 색이 대신 멈춘다(그 색을 낳는 색이 곁에 있으면 풀린다).
    // 상생: 상극(이나 반극)으로 멈출 아이템 곁에 그 색을 낳는 색이 있어 멈추지 않으면, 구해진 쪽과 구한 쪽이 +10%(몇 번 구해도 한 번).
    // 규율: 다섯 색이 가로나 세로 한 줄(다섯 칸)을 채우고 모두 다 자라 일하면 그 다섯 +15%(가로와 세로가 겹친 칸도 한 번). 가로줄은
    // 위아래, 세로줄은 양옆에 같은 색이 있으면 없다. 고대 씨앗은 줄을 셀 때 어느 색이든 되고, 곁에 있어도 줄을 깨지 않는다.
    // 한 아이템의 보너스는 더한다(규율 15 + 상생 10 = +25%).
    const SYNERGY_ORDER = Object.freeze(['resonance', 'feed', 'discipline']);
    const LINES = Object.freeze([...Array(STUMP_BOX_SIZE).keys()].flatMap(at => [
        { axis: 'row', cells: [...Array(STUMP_BOX_SIZE).keys()].map(step => at * STUMP_BOX_SIZE + step) },
        { axis: 'col', cells: [...Array(STUMP_BOX_SIZE).keys()].map(step => step * STUMP_BOX_SIZE + at) }]));
    const rowOf = cell => Math.floor(cell / STUMP_BOX_SIZE);
    /** The neighbours across a line: above and below a row's cell, left and right of a column's. */
    const crossNeighbors = (cell, axis) => neighbors(cell).filter(at => (rowOf(at) === rowOf(cell)) === (axis === 'col'));
    /** Each board cell as the synergies read it: its item, colour, grown and ancient; null for empty cells, talismans and scars. */
    function synergyCells(box) {
        return box.board.map(id => {
            const item = id === null ? null : findItem(box, id);
            return item && item.color ? { item, color: item.color, grown: isMature(item), ancient: !!item.ancient } : null;
        });
    }
    /** The colour a run shares (ancient seeds stand for any): '' when all are ancient, null when two colours meet. */
    function sharedColor(run) {
        const colors = new Set(run.filter(at => !at.ancient).map(at => at.color));
        return colors.size > 1 ? null : [...colors][0] || '';
    }
    /** A same colour (not ancient) touching the run from outside it. */
    function crowded(cells, run, color) {
        return run.some(cell => neighbors(cell).some(at => !run.includes(at) && cells[at] && !cells[at].ancient && cells[at].color === color));
    }
    /** 공명 lines: { color (null for three ancients), cells }. */
    function resonanceLines(cells) {
        const length = STUMP_BOX_SYNERGY.resonance.length;
        return LINES.flatMap(line => [...Array(STUMP_BOX_SIZE - length + 1).keys()].map(start => line.cells.slice(start, start + length)))
            .filter(run => run.every(cell => cells[cell] && cells[cell].grown))
            .map(run => ({ cells: run, color: sharedColor(run.map(cell => cells[cell])) }))
            .filter(run => run.color === '' || (run.color !== null && !crowded(cells, run.cells, run.color)))
            .map(run => ({ color: run.color || null, cells: run.cells }));
    }
    /** 오행 for one coloured cell: what stops it (상극 beside, or 반극: it overcomes a resonance cell beside) and the cells that feed it. */
    function fiveElementsAt(cells, immune, cell) {
        const at = cells[cell], near = neighbors(cell).filter(next => cells[next]);
        const threat = near.find(next => cells[next].color === OVERCOMER[at.color]);
        const counter = near.find(next => immune.has(next) && cells[next].color === STUMP_BOX_OVERCOMES[at.color]);
        const by = threat !== undefined ? threat : counter;
        return by === undefined ? null : { why: { color: cells[by].color, counter: threat === undefined },
            feeders: near.filter(next => cells[next].color === FEEDER[at.color]) };
    }
    /** Stopped cells (with why) and the 상생 rescues ([rescued, rescuer] cell pairs). Resonance cells never stop. */
    function fiveElements(cells, immune) {
        const stopped = new Map(), links = [];
        cells.forEach((at, cell) => {
            const hit = at && !immune.has(cell) ? fiveElementsAt(cells, immune, cell) : null;
            if (!hit) return;
            if (hit.feeders.length) hit.feeders.forEach(feeder => links.push([cell, feeder]));
            else stopped.set(cell, hit.why);
        });
        return { stopped, links };
    }
    /** Five different colours (ancient seeds fill any gap). */
    const allColors = run => { const real = run.filter(at => !at.ancient).map(at => at.color); return new Set(real).size === real.length; };
    /** 규율 lines: a full row or column of five colours, all grown and working, no same colour across it. */
    function disciplineLines(cells, stopped) {
        const sameAcross = (cell, axis) => !cells[cell].ancient
            && crossNeighbors(cell, axis).some(at => cells[at] && !cells[at].ancient && cells[at].color === cells[cell].color);
        return LINES.filter(line => line.cells.every(cell => cells[cell] && cells[cell].grown && !stopped.has(cell))
            && allColors(line.cells.map(cell => cells[cell])) && !line.cells.some(cell => sameAcross(cell, line.axis)));
    }
    /** Item id → its synergies in SYNERGY_ORDER. */
    function synergyTags(cells, resonance, links, discipline) {
        const tags = {}, add = name => cell => { const id = cells[cell].item.id; (tags[id] = tags[id] || new Set()).add(name); };
        resonance.forEach(line => line.cells.forEach(add('resonance')));
        links.flat().forEach(add('feed'));
        discipline.forEach(line => line.cells.forEach(add('discipline')));
        return Object.fromEntries(Object.entries(tags).map(([id, set]) => [id, SYNERGY_ORDER.filter(name => set.has(name))]));
    }
    let effectsMemo = { key: null, box: null, value: null };
    /** The board's 오행 and synergies now: suppressed ids, stoppedBy (id → { color, counter }), synergy (id → tags),
     * groups (resonance and discipline lines, feed cell pairs) and resonant (colours with a resonance line). */
    function boardEffects(box) {
        const key = signature(box);
        if (effectsMemo.key === key && effectsMemo.box === box) return effectsMemo.value;
        const cells = synergyCells(box), resonance = resonanceLines(cells);
        const { stopped, links } = fiveElements(cells, new Set(resonance.flatMap(line => line.cells)));
        const discipline = disciplineLines(cells, stopped).map(line => ({ axis: line.axis, cells: line.cells }));
        const idOf = cell => cells[cell].item.id;
        const value = { suppressed: new Set([...stopped.keys()].map(idOf)),
            stoppedBy: Object.fromEntries([...stopped].map(([cell, why]) => [idOf(cell), why])),
            synergy: synergyTags(cells, resonance, links, discipline), groups: { resonance, discipline, feed: links },
            resonant: new Set(resonance.map(line => line.color).filter(Boolean)) };
        effectsMemo = { key, box, value };
        return value;
    }
    function suppressedIds(box) { return boardEffects(box).suppressed; }
    /** The colours of the items beside a cell (상하좌우). */
    function neighbourColors(box, cell) {
        return neighbors(cell).map(at => box.board[at]).filter(id => id !== null).map(id => (findItem(box, id) || {}).color).filter(Boolean);
    }
    /** The bonus multiplier an item's synergies give (1 without any). */
    function synergyMul(effects, item) {
        return 1 + (effects.synergy[item.id] || []).reduce((sum, name) => sum + STUMP_BOX_SYNERGY[name].bonusPct, 0) / 100;
    }
    /** What changes a placed item's effect now, in the box's words: what stops it, or its bonuses while grown. null otherwise. */
    function boardNote(item, result) {
        const why = result.stoppedBy[item.id];
        if (why) return { text: _t('비활성화: {label}{value} 인접', { label: STUMP_BOX_COLORS[why.color].label, value: why.counter ? _t(' 공명') : '' }), bad: true };
        const tags = isMature(item) ? result.synergy[item.id] || [] : [];
        return tags.length ? { text: tags.map(name => `${STUMP_BOX_SYNERGY[name].label} +${STUMP_BOX_SYNERGY[name].bonusPct}%`).join(', '), bad: false } : null;
    }
    /** Quality this ripening counts: the stored roll plus a bumper harvest's bonus (풍작). */
    function qualityOf(item) { return item.roll + ((item.harvest && item.harvest.bonus) || 0); }
    /** 황금(born golden or golden at ripening): every line × STUMP_BOX_RIPENING.golden.mul. */
    function goldenMul(item) { return item.golden || (item.harvest && item.harvest.golden) ? STUMP_BOX_RIPENING.golden.mul : 1; }
    /** Quality × golden × the board's multiplier (synergies × graft). */
    function itemScale(item, boardMul) { return qualityOf(item) * goldenMul(item) * boardMul; }
    function itemValue(item, boardMul) {
        return Math.round(yieldOf(item).value * itemScale(item, boardMul) * 100) / 100;
    }
    /** The ripening roll's extra lines at the item's quality, golden, synergies and graft. */
    function lineValues(item, boardMul) {
        const scale = itemScale(item, boardMul);
        return ((item.harvest && item.harvest.lines) || []).map(line => ({ stat: line.stat, value: Math.round(line.value * scale * 100) / 100 })).concat(albinoLines(item));
    }
    /** Fixed unique options, also shown in storage. */
    function albinoLines(item) {
        return item.albino && isMature(item) ? STUMP_BOX_RIPENING.albino.variants[yieldKind(item)][item.color] : [];
    }
    /** A placed, awake scar's absorbed lines at its cell's graft (no resonance: it has no colour). */
    function scarValues(item, graft) {
        return Object.entries(item.absorbed || {}).map(([stat, value]) => ({ stat, value: Math.round(value * graft * 100) / 100 }));
    }
    function addLines(stats, lines) {
        lines.forEach(line => { stats[line.stat] = Math.round(((stats[line.stat] || 0) + line.value) * 100) / 100; });
    }
    /** The board's 오행 and synergies (boardEffects), grown working items per colour (counts) and stat totals. */
    function evaluate(state) {
        const box = of(state), key = signature(box);
        if (memo.key === key && memo.box === box) return memo.value;
        const effects = boardEffects(box), counts = Object.fromEntries(COLORS.map(color => [color, 0]));
        const grown = placedCells(box).filter(({ item }) => isMature(item) && yieldOf(item) && !effects.suppressed.has(item.id));
        grown.forEach(({ item }) => { counts[item.color]++; });
        const stats = {}, values = {}, extras = {};
        for (const { item, cell } of grown) {
            const boardMul = synergyMul(effects, item) * graftMultiplier(box, cell);
            values[item.id] = itemValue(item, boardMul);
            extras[item.id] = lineValues(item, boardMul);
            addLines(stats, [{ stat: yieldOf(item).stat, value: values[item.id] }].concat(extras[item.id]));
        }
        placedCells(box).filter(({ item }) => item.family === 'scar' && isMature(item)).forEach(({ item, cell }) => {
            extras[item.id] = scarValues(item, graftMultiplier(box, cell));
            addLines(stats, extras[item.id]);
        });
        const value = { ...effects, counts, stats, values, extras };
        memo = { key, box, value };
        return value;
    }
    /** An item's extra lines now: the board's values (evaluate's extras) when placed and working, otherwise a grown seed's or
     * ripening lines at its quality and golden, or what a scar absorbed. */
    function extraLinesOf(item, result) {
        if (result.extras[item.id]) return result.extras[item.id];
        if (item.family === 'scar') return Object.entries(item.absorbed || {}).map(([stat, value]) => ({ stat, value }));
        const scale = qualityOf(item) * goldenMul(item), lines = isMature(item) && item.harvest ? item.harvest.lines : [];
        return lines.map(line => ({ stat: line.stat, value: Math.round(line.value * scale * 100) / 100 })).concat(albinoLines(item));
    }
    // ── 고유 장비의 수확물 소켓(2026-11-03 사용자, js/equipment-sockets.js) ─────────
    // 소켓에 든 꽃, 열매, 덩굴, 뿌리는 함을 떠나 장비에 산다(판의 공명과 접붙이기는 없다). 새 루프에 사라지는 것은 함의 것뿐이라 소켓의 것은 다 자란 채 남는다.
    /** A stored, unlocked grown flower, fruit, vine or root that may go into a gear socket, else null. */
    function socketable(state, id) {
        const item = findItem(of(state), id);
        return item && !isPlaced(state, item.id) && !item.locked && FAMILIES.includes(item.family) && isMature(item) && yieldKind(item) ? item : null;
    }
    /** Stored grown items of these kinds ('flower', 'fruit', 'vine', 'root') a socket could take, best quality first. */
    const socketCandidates = (state, kinds) => storage(state).filter(item => socketable(state, item.id) && kinds.includes(yieldKind(item)))
        .sort((a, b) => qualityOf(b) * goldenMul(b) - qualityOf(a) * goldenMul(a));
    /** Out of the box: it now lives in the socket. */
    function takeForSocket(state, item) {
        const box = of(state);
        box.items = box.items.filter(row => row !== item);
    }
    /** Back into storage from a socket. false when storage is full, unless forced (the gear is being destroyed): then it goes in past
     * the limit, never lost (2026-11-03 사용자). */
    function returnFromSocket(state, item, force = false) {
        if (!force && storageFull(state)) return false;
        delete item.slot;
        of(state).items.push(item);
        return true;
    }
    /** A socketed grown item's lines: its yield and ripening lines at its quality and golden, as on the board (no resonance, no graft). */
    function socketLines(item) {
        const made = isMature(item) ? yieldOf(item) : null;
        if (!made) return [];
        const scale = qualityOf(item) * goldenMul(item), round = value => Math.round(value * scale * 100) / 100;
        return [{ stat: made.stat, value: round(made.value) }]
            .concat(((item.harvest && item.harvest.lines) || []).map(line => ({ stat: line.stat, value: round(line.value) })), albinoLines(item));
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
    function graftOpen(state) { return of(state).acquired && contentProgression.holds('graft', state); }
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
        if (!graftOpen(state)) return _t('접붙이기는 루프 {startLoop}부터 할 수 있습니다.', { startLoop: STUMP_BOX_GRAFT.startLoop });
        if (!editable(state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
        if (!isOpen(state, cell)) return '닫힌 칸입니다.';
        if (next > graftMaxRank(state)) return '이미 마지막 단계입니다.';
        return graftPoints(state).free >= next ? '' : _t('접붙이기 점수가 부족합니다. {next}단계에는 {next2}점이 필요합니다.', { next, next2: next });
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
        return (state.currencies.blightSpore || 0) >= need ? '' : _t('마름병 포자가 {need}개 필요합니다.', { need });
    }
    function graftLower(state, cell) {
        if (graftLowerReason(state, cell)) return false;
        state.currencies.blightSpore -= STUMP_BOX_GRAFT.refundSpores;
        of(state).graft[cell] -= 1;
        return true;
    }

    // ── 성장·드랍 ───────────────────────────────────────────
    function killKind(enemy) { return enemy && enemy.isBoss ? 'boss' : enemy && enemy.isElite ? 'elite' : 'normal'; }
    function isGrowing(item, suppressed) { return !suppressed.has(item.id) && !isMature(item) && grows(item); }
    /** Placed, unsuppressed, unripe items (seeds, sleeping talismans and scars): what a kill or compost feeds. */
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
    /** A place in the pool by the lines' weights (1 unless a line says otherwise). */
    function pickLineAt(left, random) {
        let roll = random() * left.reduce((sum, line) => sum + (line.weight || 1), 0);
        const at = left.findIndex(line => (roll -= line.weight || 1) < 0);
        return at < 0 ? left.length - 1 : at;
    }
    /** `count` different lines from the item's pool (STUMP_BOX_EXTRA_LINES), each at a rolled share of its base value. */
    function rollLines(item, count, random) {
        const left = ((STUMP_BOX_EXTRA_LINES[yieldKind(item)] || {})[item.color] || []).slice(), lines = [];
        while (lines.length < count && left.length) {
            const line = left.splice(pickLineAt(left, random), 1)[0], span = line.span || STUMP_BOX_RIPENING.lineValue;
            lines.push({ stat: line.stat, value: Math.round(line.value * (span.min + random() * (span.max - span.min)) * 100) / 100 });
        }
        return lines;
    }
    /** A seed ripening: 풍작 (quality bonus), 황금 and its extra lines from its kind's pool, kept until a new loop sends it back. */
    function ripen(item, random) {
        if (!FAMILIES.includes(item.family)) return;
        const bonus = random() < STUMP_BOX_RIPENING.bumper.chance ? STUMP_BOX_RIPENING.bumper.quality : 0;
        const golden = random() < STUMP_BOX_RIPENING.golden.chance;
        item.harvest = { bonus, golden, lines: rollLines(item, pickCount(lineOdds(item.roll + bonus), random), random) };
        if (random() < STUMP_BOX_RIPENING.albino.chance) item.albino = true;
    }
    /** Preserve surplus albinos in storage, even when full; applies to simultaneous blooms and save repair. */
    function enforceAlbinoLimit(box, wornId = null) {
        let kept = wornId !== null;
        box.board.forEach((id, cell) => {
            if (id === wornId || !findItem(box, id)?.albino) return;
            if (kept) box.board[cell] = null;
            kept = true;
        });
    }
    /** One item gains `amount` (a nursery share may be a fraction); ripening rolls it and adds it to `ripened`. */
    function growItem(item, amount, random, ripened) {
        item.xp = Math.min(need(item), Math.round((item.xp + amount) * 100) / 100);
        if (item.xp < need(item)) return;
        item.ripe = true;
        if (FAMILIES.includes(item.family)) item.path = growKind(random);
        ripen(item, random);
        ripened.push(item);
    }
    /** Nursery items still growing (nothing suppresses them). */
    function nurseryGrowing(state) {
        const box = of(state);
        return box.nursery.filter(id => id !== null).map(id => findItem(box, id)).filter(item => item && !isMature(item) && grows(item));
    }
    /** Grows every growing item by `amount`, the nursery by its share, and writes first harvests into the journal. @returns {object[]} items that ripened. */
    function growBy(state, amount, random = Math.random) {
        const ripened = [];
        const wornId = wornAlbinoId(state);
        growingItems(state).forEach(item => growItem(item, amount, random, ripened));
        const share = amount * nurseryRate(state);
        nurseryGrowing(state).forEach(item => growItem(item, share, random, ripened));
        if (ripened.some(item => item.albino)) {
            enforceAlbinoLimit(of(state), wornId);
            invalidatePlacementUndo(state);
        }
        recordHarvest(of(state), ripened);
        return ripened;
    }
    /** Grows placed, unsuppressed, unripe items by one kill. @returns {object[]} items that ripened. */
    function grow(state, enemy) { return growBy(state, STUMP_BOX_GROWTH.perKill[killKind(enemy)]); }

    // ── 거름 ───────────────────────────────────────────────
    /** The growth a seed gives as compost (its quality scales it, up to the box's cap: past 130% from loop 35, 2026-10-20). */
    function compostGrowth(item, state = game) { return Math.round(STUMP_BOX_COMPOST.growth * clampRoll(item.roll, rollCap(state))); }
    /** '' when the stored seed can go on the board as compost, otherwise why not. */
    function compostReason(state, id) {
        const box = of(state), item = findItem(box, id);
        if (!editable(state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
        if (item && item.locked) return '잠긴 아이템은 거름으로 쓸 수 없습니다.';
        if (item && item.albino) return '알비노는 거름 대신 조합 재료로 사용할 수 있습니다.';
        if (!item || !FAMILIES.includes(item.family) || isPlaced(state, id)) return '보관함의 씨앗만 거름으로 쓸 수 있습니다.';
        return growingItems(state).length ? '' : '그루터기 함에서 성장 중인 그루터기 아이템이 없습니다.';
    }
    /** Spreads a stored seed: it is used up and every growing item gains its compost growth.
     * @returns {?{growth: number, fed: number, ripened: object[]}} null when not allowed. */
    function compost(state, id) {
        if (compostReason(state, id)) return null;
        const box = of(state), item = findItem(box, id), growth = compostGrowth(item, state), fed = growingItems(state).length;
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
    /** The colours a storage filter covers: one colour, or all five ('all'); none for the talisman filter. */
    function filterColors(filter) { return COLORS.includes(filter) ? [filter] : filter === 'all' ? COLORS : []; }
    /** The stored seeds a storage filter covers. */
    function storedSeeds(state, filter) {
        const colors = filterColors(filter);
        return storage(state).filter(item => FAMILIES.includes(item.family) && colors.includes(item.color));
    }
    /** What 일괄 거름 사용 takes of a storage filter: its stored seeds but the best STUMP_BOX_BULK_COMPOST.keep of each colour
     * and kind (merging material) and golden or ancient ones. */
    function bulkItems(state, filter) {
        const groups = new Map();
        storedSeeds(state, filter).forEach(item => {
            const key = `${item.color}-${item.path || 'seed'}`;
            groups.set(key, (groups.get(key) || []).concat(item));
        });
        return [...groups.values()].flatMap(list => list.sort((a, b) => b.roll - a.roll || a.id - b.id).slice(STUMP_BOX_BULK_COMPOST.keep))
            .filter(item => !item.golden && !item.ancient && !item.albino && !item.locked);
    }
    /** What 일괄 버리기 takes of a storage filter: every stored seed but golden, ancient and growing ones, plain grown ones (they
     * become currency, discardMany), and under 전체 and 부적 the stored talismans but unique and grown ones (2026-10-23 사용자: 부적이 빠져 있었다).
     * Locked items always stay. It used to keep the best three of each kind as compost does (2026-10-17 사용자: 75개 중 25개만). */
    function bulkDiscardItems(state, filter) {
        const seeds = storedSeeds(state, filter).filter(item => (isMature(item) ? isPlainHarvest(item) : !item.golden && !item.ancient && !item.albino && !item.xp));
        const talismanItems = filter === 'all' || filter === 'talisman'
            ? storage(state).filter(item => item.family === 'talisman' && item.rarity !== 'unique' && !item.xp && !isMature(item)) : [];
        return seeds.concat(talismanItems).filter(item => !item.locked);
    }
    /** The bulk-compost items in use order (lowest quality first), cut where everything growing has ripened as pressing them one by
     * one would stop: each compost feeds every growing item alike, so the item furthest from ripe decides. */
    function bulkCompostPlan(state, filter) {
        const growing = growingItems(state), plan = [];
        let left = growing.length ? Math.max(...growing.map(item => need(item) - item.xp)) : 0;
        for (const item of bulkItems(state, filter).sort((a, b) => a.roll - b.roll || a.id - b.id)) {
            if (left <= 0) break;
            plan.push(item);
            left -= compostGrowth(item, state);
        }
        return plan;
    }
    /** '' when bulk compost of this filter can run now, otherwise why not. */
    function bulkCompostReason(state, filter) {
        if (!bulkCompostOpen(state)) return `수확 일지를 ${STUMP_BOX_UNLOCKS.find(row => row.bulkCompost).when.harvestCells}칸 채우면 열립니다.`;
        if (!editable(state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
        if (!growingItems(state).length) return '그루터기 함에서 성장 중인 그루터기 아이템이 없습니다.';
        return bulkItems(state, filter).length ? '' : '거름으로 쓸 씨앗이 없습니다.';
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
    /** '' when the filter's bulkDiscardItems can be thrown away now (일괄 버리기), otherwise why not. */
    function bulkDiscardReason(state, filter) {
        if (!editable(state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
        return bulkDiscardItems(state, filter).length ? '' : '버릴 아이템이 없습니다.';
    }
    /** 잠금(2026-10-23): a locked item stays out of 일괄 거름 사용 and 일괄 버리기 and cannot be composted or thrown away one by
     * one. @returns {boolean} whether it turned */
    function toggleLock(state, id) {
        const item = findItem(of(state), id);
        if (!item || !editable(state)) return false;
        if (item.locked) delete item.locked;
        else item.locked = true;
        return true;
    }
    /** 일괄 버리기: throws the filter's bulkDiscardItems away, the grown ones into currency (2026-11-03 사용자). @returns {?object[]} what went, null when not allowed. */
    function discardMany(state, filter) {
        if (bulkDiscardReason(state, filter)) return null;
        const box = of(state), gone = bulkDiscardItems(state, filter), ids = new Set(gone.map(item => item.id));
        box.items = box.items.filter(item => !ids.has(item.id));
        gone.filter(item => FAMILIES.includes(item.family) && isMature(item)).forEach(item => addToWallet(box, item));
        return gone;
    }

    // ── 드랍 ───────────────────────────────────────────────
    /** Half the drops take a colour from the board (weighted by how many sit there), the rest any colour. */
    function dropColor(state, random) {
        const placed = placedItems(of(state)).map(item => item.color).filter(Boolean);
        const pool = placed.length && random() < STUMP_BOX_DROPS.boardColorShare ? placed : COLORS;
        return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
    }
    /** A dropped seed, not yet in the box: { family, color, roll, golden }. random() → [0, 1). The 씨앗 비 omen drops one as it is. */
    function seedDropSpec(state, random) {
        const spec = { family: 'seed', color: dropColor(state, random), roll: clampRoll(STUMP_BOX_DROPS.roll.min + random() * (STUMP_BOX_DROPS.roll.max - STUMP_BOX_DROPS.roll.min)) };
        spec.golden = random() < STUMP_BOX_RIPENING.golden.dropChance;
        return spec;
    }
    /** What a kill dropped (seedDropSpec at the kill's chance), or null. */
    function rollDropSpec(state, enemy, random) {
        return random() < STUMP_BOX_DROPS.chance[killKind(enemy)] ? seedDropSpec(state, random) : null;
    }
    /** A rolled drop reaches the box. One that finds the storage full is not lost: it goes on the board as compost (nothing
     * happens when nothing grows). @returns {{item: ?object, compost: ?object}} compost = { family, color, growth, fed, ripened }. */
    function receiveDrop(state, spec, random = Math.random) {
        const item = createItem(state, spec);
        if (item) return { item, compost: null };
        return { item: null, compost: compostOverflow(state, spec, random) };
    }
    /** The box's own drop roll, independent of gear drops. @returns {?{item: ?object, compost: ?object}} null when nothing dropped. */
    function rollDrop(state, enemy, random) {
        const spec = rollDropSpec(state, enemy, random);
        return spec ? receiveDrop(state, spec, random) : null;
    }
    /** A floor row's rolled drop as a look-only item: its picture and name on the ground (js/battle-ground-loot-ui.js). */
    const dropView = spec => ({ ...spec, xp: 0, ripe: false });
    const dropIcon = spec => iconPath(dropView(spec));
    const dropName = spec => label(dropView(spec));
    const validDrop = spec => !!spec && FAMILIES.includes(spec.family) && COLORS.includes(spec.color) && Number.isFinite(spec.roll);
    /** A seed a full storage could not take feeds the growing items as compost instead (drops, breeding, nursery gifts).
     * @returns {{family:string, color:string, growth:number, fed:number, ripened:object[]}} fed: growing items that got it */
    function compostOverflow(state, spec, random = Math.random) {
        const growth = compostGrowth(spec, state), fed = growingItems(state).length;
        return { family: spec.family, color: spec.color, growth, fed, ripened: growBy(state, growth, random) };
    }
    const NO_DROP = Object.freeze({ item: null, compost: null });
    function dropsHere(state) { return !(typeof actExplorationState === 'object' && actExplorationState.current(state)?.act != null); }
    /** A kill's drop roll, where the box drops: story-act expeditions do not roll it (growth still counts); generated maps
     * (chaos, realm, the atlas) and places without a map do. */
    function rollKillDrop(state, enemy) {
        return state.stumpBox && state.stumpBox.acquired && dropsHere(state) ? rollDropSpec(state, enemy, Math.random) : null;
    }
    /** One call per kill (live and offline replay alike). drop: what reaches the box from this kill; a live map's kill lays it on the
     * floor instead and passes null (js/combat-skill-effects.js layStumpDrop, 2026-11-02 사용자: 그냥 획득되어 뭘 먹었는지 몰랐다). */
    function onEnemyKilled(state, enemy, drop = rollKillDrop(state, enemy)) {
        const box = state.stumpBox;
        if (!box || !box.acquired) return;
        const ripened = grow(state, enemy), rolled = drop ? receiveDrop(state, drop) : NO_DROP;
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
    const STARTER_SLOTS = Object.freeze(['seed', 'second']);
    /** One of the two starter seeds (slot 'seed' or 'second'), once each: the receipts are box.starter. */
    function claimStarter(state, slot, color) {
        const box = of(state);
        if (!box.acquired || !STARTER_SLOTS.includes(slot) || box.starter[slot]) return null;
        const item = createItem(state, { family: 'seed', color, roll: 1 });
        if (item) box.starter[slot] = true;
        return item;
    }

    // ── 시작 선물(2026-10-07 사용자 결정: 색을 골라 받지 않고, 함을 얻으면 바로 준다) ───────────
    const SKILL_ELEMENT_COLORS = Object.freeze({ phys: 'physical', fire: 'fire', cold: 'cold', light: 'lightning', chaos: 'chaos' });
    const RESIST_STATS = Object.freeze({ fire: 'resF', cold: 'resC', lightning: 'resL' });
    /** Whether two colours meet in 상극 (either overcomes the other). */
    const clash = (a, b) => OVERCOMER[a] === b || OVERCOMER[b] === a;
    /** The gift's colours (2026-11-04: two seeds, what they become is rolled when they ripen): the active skill's element, and the
     * weakest of the fire, cold and lightning resistances, one that does not clash with the first when there is one (they may sit side by side). */
    function starterChoice(state, stats) {
        const seed = SKILL_ELEMENT_COLORS[(SKILL_DB[state.activeSkill] || {}).ele] || 'physical';
        const others = Object.keys(RESIST_STATS).filter(color => color !== seed), calm = others.filter(color => !clash(color, seed));
        const second = (calm.length ? calm : others).reduce((low, color) => ((stats[RESIST_STATS[color]] || 0) < (stats[RESIST_STATS[low]] || 0) ? color : low));
        return { seed, second };
    }
    /** Whether a starter seed is still owed (grantStarter would give one): the box is held and a receipt is missing. */
    function starterOwed(state) {
        const box = of(state);
        return box.acquired && STARTER_SLOTS.some(slot => !box.starter[slot]);
    }
    /** Gives the starter seeds that are still owed. @returns {object[]} the new items. */
    function grantStarter(state, stats) {
        const choice = starterChoice(state, stats);
        return STARTER_SLOTS.map(slot => claimStarter(state, slot, choice[slot])).filter(Boolean);
    }
    function touchesClash(box, cell, color) {
        return neighbourColors(box, cell).some(other => clash(other, color));
    }
    /** Puts the seeds waiting in storage on open empty cells, centre first, never beside a colour they clash with (상극)
     * (the starter gift when its guide is closed). @returns {number} how many went on the board. */
    function plantStored(state) {
        const box = of(state);
        let placed = 0;
        for (const item of storage(state).filter(row => FAMILIES.includes(row.family))) {
            const cell = STUMP_BOX_CELL_ORDER.find(at => isOpen(state, at) && box.board[at] === null && !touchesClash(box, at, item.color));
            if (cell !== undefined && place(state, item.id, cell)) placed++;
        }
        return placed;
    }
    // ── 봉인 칸(16번, 무료): 그 칸의 다 자란 것은 줄까지 그대로 루프를 넘긴다 ─────────
    function sealLimit(state) { return openUnlocks(state).reduce((sum, row) => sum + (row.sealSlots || 0), 0); }
    function isSealed(box, cell) { return Array.isArray(box.sealed) && box.sealed.includes(cell); }
    /** '' when the cell can be sealed (or unsealed) now, otherwise why not. */
    function sealReason(state, cell) {
        const box = of(state);
        if (!sealLimit(state)) return '봉인 칸 해금 뒤에 열립니다.';
        if (!editable(state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
        if (!isOpen(state, cell)) return '닫힌 칸입니다.';
        if (isSealed(box, cell)) return '';
        return box.sealed.length < sealLimit(state) ? '' : _t('봉인 칸은 {state}개까지입니다.', { state: sealLimit(state) });
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
    /** What eating a seed gives: its main, extra and albino lines at its quality and golden (no synergy or graft) × absorb.ripe.
     * A growing seed gives nothing (2026-11-04 사용자: 효과가 없으므로 흡수해도 능력치를 얻지 못한다). */
    function mealOf(item) {
        const made = isMature(item) ? yieldOf(item) : null;
        if (!made) return [];
        const share = STUMP_BOX_SCAR.absorb.ripe, scale = qualityOf(item) * goldenMul(item) * share;
        const lines = [{ stat: made.stat, value: made.value }].concat(item.harvest ? item.harvest.lines : []);
        return lines.map(line => ({ stat: line.stat, value: Math.round(line.value * scale * 100) / 100 }))
            .concat(albinoLines(item).map(line => ({ stat: line.stat, value: line.value * share })));
    }
    /** Adds a meal in its order, each stat up to its cap. A scar holds maxLines stats (2026-11-04 사용자): once full, a new stat is lost.
     * A save holding more keeps them and takes no new one. @returns {{kept: object[], lost: object[]}} */
    function absorb(scar, meal) {
        const kept = [], lost = [];
        meal.forEach(line => {
            const held = Object.hasOwn(scar.absorbed, line.stat);
            if (!held && Object.keys(scar.absorbed).length >= STUMP_BOX_SCAR.maxLines) return lost.push(line);
            const total = (scar.absorbed[line.stat] || 0) + line.value;
            scar.absorbed[line.stat] = Math.round(Math.min(SCAR_CAPS[line.stat] || 0, total) * 100) / 100;
            kept.push(line);
        });
        return { kept, lost };
    }
    /** One scar's bite at the end of a loop. A seed is eaten (a growing one for nothing); anything else spends the chance. */
    function bite(state, scar, cell, random) {
        const box = of(state), target = biteCell(cell, random);
        const preyId = target >= 0 && isOpen(state, target) ? box.board[target] : null, prey = preyId === null ? null : findItem(box, preyId);
        if (!prey || !FAMILIES.includes(prey.family)) {
            scar.misses = (scar.misses || 0) + 1;
            return { scar, target, ate: null, gained: [], lost: [] };
        }
        const { kept, lost } = absorb(scar, mealOf(prey));
        scar.meals = (scar.meals || 0) + 1;
        box.board[target] = null;
        box.items = box.items.filter(item => item.id !== prey.id);
        return { scar, target, ate: shortName(prey), gained: kept, lost };
    }
    /** 포식: a grown scar in a seal cell bites once as a loop ends (2026-11-04 사용자: the rest of the box is gone with the loop).
     * @returns {object[]} { scar, target, ate, gained, lost } */
    function devour(state, random) {
        const box = of(state);
        const scars = placedCells(box).filter(({ item, cell }) => item.family === 'scar' && isMature(item) && isSealed(box, cell));
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
        return { family: 'seed', color, roll, golden: random() < odds.golden, parent: fruit.color };
    }
    /** Puts the bred seeds in storage (a full storage turns a seed into compost, as drops do). @returns {object[]} { spec, item, compost } */
    function breed(state, specs, random) {
        return specs.map(spec => {
            if (spec.scar) return { spec, item: addScar(state, true), compost: null };
            const item = createItem(state, spec);
            if (item) return { spec, item, compost: null };
            return { spec, item: null, compost: compostOverflow(state, spec, random) };
        });
    }

    /** New loop (2026-11-04 사용자): every item outside the seal cells goes, on the board, in storage and in the nursery (seeds,
     * talismans and scars); what the seal cells hold stays as it is. Gear sockets are not the box and keep theirs.
     * @returns {{count: number, sealed: number}} items gone and items kept */
    function clearUnsealed(box) {
        const kept = new Set(box.sealed.map(cell => box.board[cell]).filter(id => id !== null));
        const count = box.items.filter(item => !kept.has(item.id)).length;
        box.items = box.items.filter(item => kept.has(item.id));
        box.board = box.board.map(id => (id !== null && kept.has(id) ? id : null));
        box.nursery = box.nursery.map(() => null);
        return { count, sealed: box.items.length };
    }
    /** The grown fruits on the board that leave a seed this loop (번식 open). */
    function grownFruits(state, box) {
        return box.acquired && breedingOpen(state) ? placedItems(box).filter(item => item.path === 'fruit' && isMature(item)) : [];
    }
    /** New loop: grown scars in seal cells bite (포식), grown fruits are noted for breeding, everything outside the seal cells goes,
     * then the bred seeds arrive in storage. @returns {number} how many items went. */
    function regress(state, random = Math.random) {
        invalidatePlacementUndo(state);
        const box = state.stumpBox;
        if (!box || !Array.isArray(box.items)) return 0;
        if (!Array.isArray(box.sealed)) box.sealed = [];
        const eaten = box.acquired ? devour(state, random) : [], fruits = grownFruits(state, box);
        const back = clearUnsealed(box);
        box.wallet = {}; // 화폐화한 재화도 초기화(2026-11-03 사용자)
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
                color: COLORS[Math.floor(random() * COLORS.length)], roll: clampRoll(span.min + random() * (span.max - span.min)) }));
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
    /** 'flower-fire' …: the journal key of a grown seed; null for talismans. */
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
    function rowDone(box, row) { return box.harvest.legacyRows.includes(row) || COLORS.every(color => box.harvest.grown.includes(`${row}-${color}`)); }
    /** Journal rows (flower · fruit · vine · root) with all five colours grown, or the four of an older box (legacyRows). */
    function harvestRows(state) { const box = of(state); return HARVEST_ROWS.filter(row => rowDone(box, row)); }
    /** Whether any combination of this kind (flower · fruit · vine · root) has been grown. */
    function hasHarvested(state, kind) { return of(state).harvest.grown.some(key => key.startsWith(`${kind}-`)); }
    /** Completed rows whose gift has not been taken. */
    function pendingGifts(state) { const box = of(state); return harvestRows(state).filter(row => !box.harvest.gifts[row]); }
    /** The gift of a completed row: one seed of the chosen colour, once. null when not allowed or storage is full. */
    function claimHarvestGift(state, row, color) {
        const box = of(state);
        if (!box.acquired || !pendingGifts(state).includes(row)) return null;
        const item = createItem(state, { family: 'seed', color, roll: STUMP_BOX_HARVEST.giftRoll });
        if (item) box.harvest.gifts[row] = true;
        return item;
    }
    /** A STUMP_BOX_UNLOCKS condition (computed, never saved). */
    function unlockMet(state, when) {
        if (when.loop && highestLoop(state) < when.loop) return false;
        if (when.content && !contentProgression.holds(when.content, state)) return false;
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
    /** Base, the box's unlocks, the talisman codex and the unlock tab's 그루터기 보관함 steps (2026-10-25 사용자: 25칸씩 늘리는 해금). */
    const SERIES_STORAGE = CONTENT_UNLOCK_SERIES.find(spec => spec.series === 'stumpStorage').storage;
    function storageLimit(state) {
        return openUnlocks(state).reduce((sum, row) => sum + (row.storage || 0), STUMP_BOX_STORAGE_BASE) + codexStorage(state)
            + contentProgression.rank('stumpStorage', state) * SERIES_STORAGE;
    }
    function storageFull(state) { return storage(state).length >= storageLimit(state); }

    // ── 저장 경계 ───────────────────────────────────────────
    function validItem(raw) {
        const colored = raw && (FAMILIES.includes(raw.family) || raw.family === 'sap') && COLORS.includes(raw.color);
        const known = raw && (raw.family === 'talisman' || raw.family === 'scar' || colored);
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
    /** A grown seed's ripening roll: the bumper bonus, golden, and up to three different lines from its kind's pool. */
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
    /** Born marks a seed keeps: golden and ancient (12번 루프 42). */
    function cleanMarks(raw, item) {
        if (raw.golden === true) item.golden = true;
        if (raw.ancient === true && raw.family === 'seed') item.ancient = true;
        if (raw.albino === true) {
            item.albino = true;
            item.xp = need(item);
            item.ripe = true;
        }
    }
    /** cap: the most the save could have made (rollCeiling), so a restored roll never tops what it could have been made at. */
    /** A saved item read back, keeping its lock (toggleLock). An old sap is read as the seed or root it became (legacySap). */
    function cleanItem(raw, cap) {
        const item = cleanItemFields(raw.family === 'sap' ? legacySap(raw) : raw, cap);
        if (item && raw.locked === true) item.locked = true;
        if (item && Number.isInteger(raw.slot) && raw.slot >= 0) item.slot = raw.slot;
        return item;
    }
    function cleanItemFields(raw, cap) {
        if (raw.family === 'talisman') return cleanTalisman(raw);
        if (raw.family === 'scar') return cleanScar(raw);
        const xp = Math.min(STUMP_BOX_GROWTH.need.seed, Math.max(0, Math.floor(Number(raw.xp) || 0)));
        const ripe = xp >= STUMP_BOX_GROWTH.need.seed;
        // 자라는 씨앗은 무엇이 될지 모른다(옛 저장에 정해 둔 꽃, 열매는 지운다). 종류 없이 저장된 다 자란 씨앗은 id로 정한다.
        const path = ripe ? (KINDS.includes(raw.path) ? raw.path : legacyKind(raw.id)) : null;
        const item = { id: raw.id, family: 'seed', color: raw.color, path, xp, ripe, roll: clampRoll(raw.roll, cap) };
        cleanMarks(raw, item);
        const harvest = cleanHarvest(raw.harvest, item);
        if (harvest) item.harvest = harvest;
        return item;
    }
    /** 옛 수액(2026-11-04에 없앴다, 사용자 결정): 자라던 것은 같은 색 씨앗(품질은 남고 성장은 처음부터), 다 자란 호박석은 같은 색 뿌리
     * (다 자란 채, 추가 줄과 알비노도 그대로: 뿌리의 줄은 호박석의 줄이다). */
    function legacySap(raw) {
        const ripe = raw.ripe === true || Number(raw.xp) >= STUMP_BOX_GROWTH.legacySapNeed;
        return { ...raw, family: 'seed', xp: ripe ? STUMP_BOX_GROWTH.need.seed : 0, path: ripe ? 'root' : null };
    }
    /** A grown item living in a gear socket, in today's shape: an old 호박석 becomes its colour's 뿌리 with its quality and lines
     * (js/equipment-sockets.js migrateHarvest). Anything else passes through. */
    function currentSocketItem(raw) {
        if (!raw || typeof raw !== 'object' || raw.family !== 'sap' || !COLORS.includes(raw.color)) return raw;
        return cleanItem(legacySap(raw), Math.max(STUMP_BOX_ROLL_LIMIT.max, Number(raw.roll) || 0));
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
     * grown ones stay grown at the new need. A later box's items pass through. */
    function upgradeGrowth(raw) {
        const items = Array.isArray(raw.items) ? raw.items : [];
        if (Number(raw.version) >= 2) return items;
        return items.map(item => {
            const old = item && STUMP_BOX_GROWTH.v1Need[item.family], now = item && STUMP_BOX_GROWTH.need[item.family], xp = Number(item && item.xp) || 0;
            return old ? { ...item, xp: item.ripe === true || xp >= old ? now : Math.floor(xp * now / old) } : item;
        });
    }
    /** Known ids onto target's cells, each id once across the board and the nursery. */
    function restoreCells(list, target, seen, used) {
        (Array.isArray(list) ? list : []).slice(0, CELLS).forEach((id, cell) => {
            if (seen.has(id) && !used.has(id)) { used.add(id); target[cell] = id; }
        });
    }
    function restoreItems(raw, box, cap) {
        const seen = new Set();
        upgradeGrowth(raw).filter(validItem).forEach(item => {
            const clean = seen.has(item.id) ? null : cleanItem(item, cap);
            if (clean) { seen.add(clean.id); box.items.push(clean); }
        });
        const used = new Set();
        restoreCells(raw.board, box.board, seen, used);
        restoreCells(raw.nursery, box.nursery, seen, used);
        enforceAlbinoLimit(box);
    }
    /** An old journal or wallet key in today's words: 호박석 became 뿌리 (2026-11-04). */
    const currentKey = key => String(key).replace(/^amber(?=-|$)/, 'root');
    /** Known journal keys only, plus whatever is grown right now (saves from before the journal); gift receipts stay. A box before
     * version 3 keeps the rows it filled with four colours as filled (their unlocks and gifts stay), later boxes keep their list. */
    function restoreHarvest(raw, box, version) {
        const source = raw && typeof raw === 'object' ? raw : {}, grown = new Set((Array.isArray(source.grown) ? source.grown : []).map(currentKey));
        const gifts = Object.fromEntries(Object.entries(source.gifts && typeof source.gifts === 'object' ? source.gifts : {}).map(([row, taken]) => [currentKey(row), taken]));
        box.harvest.grown = HARVEST_KEYS.filter(key => grown.has(key));
        const kept = Number(version) >= 3 ? new Set(Array.isArray(source.legacyRows) ? source.legacyRows : [])
            : new Set(HARVEST_ROWS.filter(row => OLD_COLORS.every(color => grown.has(`${row}-${color}`))));
        box.harvest.legacyRows = HARVEST_ROWS.filter(row => kept.has(row));
        HARVEST_ROWS.forEach(row => { box.harvest.gifts[row] = gifts[row] === true; });
        recordHarvest(box, box.items.filter(isMature));
    }
    /** Known stacks with whole positive counts (an old 호박석 stack is counted into its colour's 뿌리). */
    function restoreWallet(raw) {
        const out = {};
        Object.entries(raw && typeof raw === 'object' ? raw : {}).forEach(([stack, value]) => {
            const key = currentKey(stack), count = Math.floor(Number(value));
            if (HARVEST_KEYS.includes(key) && Number.isFinite(count) && count > 0) out[key] = (out[key] || 0) + count;
        });
        return out;
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
            if (rows.has(id) && !opened.includes(id) && valid.length) offers[id] = valid.map(spec => ({ family: 'seed', color: spec.color, roll: clampRoll(spec.roll) }));
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
        invalidatePlacementUndo(state);
        const raw = state.stumpBox, box = empty();
        state.stumpBox = box;
        if (raw && typeof raw === 'object') {
            box.acquired = raw.acquired === true;
            box.via = typeof raw.via === 'string' ? raw.via : null;
            // 둘째 시작 씨앗의 영수증은 옛 저장에서 수액의 것이었다(2026-11-04)
            box.starter = { seed: !!(raw.starter && raw.starter.seed), second: !!(raw.starter && (raw.starter.second || raw.starter.sap)) };
            restoreItems(raw, box, rollCeiling(state));
            box.nextId = Math.max(Number.isSafeInteger(raw.nextId) ? raw.nextId : 1, ...box.items.map(item => item.id + 1), 1);
            restoreHarvest(raw.harvest, box, raw.version);
            box.codex = restoreCodex(raw.codex, box);
            box.pouches = restorePouches(raw.pouches);
            box.graft = restoreGraft(raw.graft, state);
            box.sealed = restoreSealed(raw.sealed, state);
            box.scarGift = raw.scarGift === true;
            box.wallet = restoreWallet(raw.wallet);
        }
        sync(state, 'migration');
        return box;
    }

    return {
        empty, of, restore, sync, eligible, claimStarter, starterChoice, starterOwed, grantStarter, plantStored, createItem, addTalisman, discard, storage, place, move, previewMove, unplace, onePerBoardReason, wornAlbinoId, wornOneId,
        unplaceAll, unplaceAllReason, canUndoPlacement, undoPlacement, invalidatePlacementUndo,
        evaluate, boardNote, applyStats, onEnemyKilled, rollKillDrop, seedDropSpec, receiveDrop, dropIcon, dropName, validDrop, grow, ancientRanks, rollDrop, regress, compost, compostReason, compostGrowth, compostOverflow, feedAsh, growingItems, openCount, isOpen, opensAt, nextOpening, neighbors,
        stageOf, isMature, need, yieldOf, targetStage, label, shortName, lineText, extraLinesOf, iconPath, cellOf, editable, highestLoop,
        graftRank, graftMultiplier, graftOpen, graftPoints, graftJournalPoints, graftOverflowPoints, graftRaiseReason, graftRaise, graftLowerReason, graftLower,
        harvestKey, harvestRows, hasHarvested, pendingGifts, claimHarvestGift, openUnlocks, storageLimit, storageFull,
        rollCap, graftMaxRank, qualityOf, goldenMul, sealLimit, isSealed, sealReason, toggleSeal, devourOpen, addScar, grantScar, rollScarDrop, scarCaps: () => SCAR_CAPS,
        breedingOpen, bulkCompostOpen, bulkItems, bulkCompostPlan, bulkCompostReason, compostMany, bulkDiscardItems, bulkDiscardReason, discardMany, toggleLock, pendingPouches, pouchOffers, choosePouch,
        codexIds: () => CODEX_IDS,
        itemById: (state, id) => findItem(of(state), id),
        settleStorageSlots, orderStorage, moveInStorage, harvestPriceKey, isHarvestPrice, harvestPriceName, harvestPriceIcon, harvestPriceHeld, payHarvestPrice, harvestWalletKeys,
        canMonetize, monetize, spendWallet, walletCount, walletTotal, harvestHoldings, walletPieceById, walletPieces,
        isPlaced, nurseryOpen, nurseryRate, inNursery, firstNurseryCell, nurseryMove, nurseryUnplace, nurseryClearReason, nurseryClear, storedFlowerCount, payFlower, yieldKind, socketable, socketCandidates, takeForSocket, returnFromSocket, socketLines, currentSocketItem,
        overcomerOf: color => OVERCOMER[color] || null, feederOf: color => FEEDER[color] || null
    };
})();
safeExposeGlobals({ stumpBox });
