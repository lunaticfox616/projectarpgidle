// 타오른 잿불가지(12번 루프 30, 2026-10-08, data/ember-corruption.js): 장비 하나에 한 번 쓰는 두 번째 타락. 이미 타락한 장비와
// 고유 장비에도 쓴다. 결과를 고르고 장비를 바꾼다. 재가 되는 결과는 장비를 지우지 않고 알리기만 한다: 지우기와 그루터기 함 거름은
// 제작실 화면(js/ember-corruption-ui.js)이 한다. 타락 전용 줄은 item.emberLines에 따로 둔다(접두, 접미 자리를 차지하지 않는다).
const emberCorruption = (() => {
    const SLOTS = Object.freeze([...new Set(EMBER_CORRUPTION_LINES.flatMap(row => row.slots))]);
    const BY_ID = new Map(EMBER_CORRUPTION_LINES.map(row => [row.id, row]));

    /** '' when the burning branch can go on this item, otherwise why not. */
    function burnReason(item) {
        if (!item) return '아이템을 선택하세요.';
        if (!SLOTS.includes(item.slot)) return '장비에만 쓸 수 있습니다.';
        return item.burned ? '이미 한 번 타오른 장비입니다.' : '';
    }
    /** Lines a scale outcome bakes again: a unique's own lines or the explicit lines. Honey and rift locks and the rift marks stay. */
    function scalableLines(item) {
        return (Array.isArray(item.stats) ? item.stats : []).filter(stat => stat && Number.isFinite(Number(stat.val)) && Number(stat.val) !== 0
            && !stat.lockedByHoney && !stat.lockedByRift && !String(stat.id).startsWith('fossilRift'));
    }
    /** The slot's corruption-only lines the item does not carry yet. */
    function linePool(item) {
        const taken = new Set((item.emberLines || []).map(line => line.id));
        return EMBER_CORRUPTION_LINES.filter(row => row.slots.includes(item.slot) && !taken.has(row.id));
    }
    const CAN = Object.freeze({
        scale: item => scalableLines(item).length > 0,
        twoLines: item => linePool(item).length >= 2,
        scaleAndLine: item => scalableLines(item).length > 0 && linePool(item).length > 0,
        quality: item => Math.floor(Number(item.quality) || 0) < EMBER_CORRUPTION_RULES.quality
    });
    /** The outcome rows (kind, weight) this item can take: uniques and the rest have their own table. */
    function outcomes(item) {
        return EMBER_BURN_OUTCOMES[item.rarity === 'unique' ? 'unique' : 'other'].filter(([kind]) => !CAN[kind] || CAN[kind](item));
    }
    function pick(item, random) {
        const rows = outcomes(item);
        let roll = random() * rows.reduce((sum, [, weight]) => sum + weight, 0);
        for (const [kind, weight] of rows) {
            if (roll < weight) return kind;
            roll -= weight;
        }
        return 'nothing';
    }
    function rescale(value, mul) {
        return Number.isInteger(value) ? Math.round(value * mul) : Math.round(value * mul * 100) / 100;
    }
    /** Every scalable line ×0.8~1.2 on its own (a compound line's second stat with it). The share stays on the line (emberScale)
     * for the tooltip. @returns {number} the average share */
    function bakeLines(item, random) {
        const { min, max } = EMBER_CORRUPTION_RULES.scale, shares = [];
        for (const stat of scalableLines(item)) {
            const mul = Math.round((min + random() * (max - min)) * 100) / 100;
            stat.val = rescale(Number(stat.val), mul);
            (stat.extraStats || []).filter(extra => Number.isFinite(Number(extra.val))).forEach(extra => { extra.val = rescale(Number(extra.val), mul); });
            stat.emberScale = mul;
            shares.push(mul);
        }
        return shares.reduce((sum, mul) => sum + mul, 0) / Math.max(1, shares.length);
    }
    function makeLine(row, val) {
        return { id: row.id, val, valMin: row.min, valMax: row.max, statName: getStatName(row.id), emberLine: true };
    }
    /** `count` different corruption-only lines of the item's slot, each a whole number in its range. */
    function addLines(item, count, random) {
        const pool = linePool(item), added = [];
        while (added.length < count && pool.length) {
            const row = pool.splice(Math.floor(random() * pool.length), 1)[0];
            added.push(makeLine(row, row.min + Math.floor(random() * (row.max - row.min + 1))));
        }
        item.emberLines = [...(item.emberLines || []), ...added];
        return added;
    }
    const shareText = share => `${share >= 1 ? '+' : ''}${Math.round((share - 1) * 100)}%`;
    const linesText = lines => lines.map(line => `${line.statName} +${formatValue(line.id, line.val)}`).join(', ');
    const result = (kind, text, extra) => ({ kind, text, lines: [], share: 1, ...extra });
    const APPLY = Object.freeze({
        ash: () => result('ash', '장비가 타서 재가 되었습니다.'),
        scale: (item, random) => {
            const share = bakeLines(item, random);
            return result('scale', `옵션 수치가 다시 구워졌습니다(평균 ${shareText(share)}).`, { share });
        },
        twoLines: (item, random) => {
            const lines = addLines(item, 2, random);
            return result('twoLines', `타락 전용 줄이 생겼습니다: ${linesText(lines)}`, { lines });
        },
        scaleAndLine: (item, random) => {
            const share = bakeLines(item, random), lines = addLines(item, 1, random);
            return result('scaleAndLine', `옵션 수치가 다시 구워지고(평균 ${shareText(share)}) 타락 전용 줄이 생겼습니다: ${linesText(lines)}`, { share, lines });
        },
        quality: item => {
            const before = Math.floor(Number(item.quality) || 0);
            item.quality = EMBER_CORRUPTION_RULES.quality;
            return result('quality', `품질이 ${before}% → ${item.quality}%로 올랐습니다.`);
        },
        nothing: () => result('nothing', '불길이 잦아들었습니다. 변화가 없습니다.')
    });
    /** Burns the item once: it becomes burned and corrupted and takes one outcome. 'ash' leaves the item for the caller to remove.
     * @returns {{kind: string, text: string, lines: object[], share: number}} */
    function burn(item, random = Math.random) {
        const kind = pick(item, random);
        item.burned = true;
        item.corrupted = true;
        return APPLY[kind](item, random);
    }
    /** The stump growth an item's ashes give (uniques give more). */
    function ashGrowth(item) {
        return EMBER_CORRUPTION_RULES.ashGrowth[item && item.rarity === 'unique' ? 'unique' : 'other'];
    }
    /** Save boundary: only known lines of the item's slot with whole values in range, at most two of them (three are never rolled). */
    function normalize(item) {
        const lines = (Array.isArray(item.emberLines) ? item.emberLines : []).map(line => {
            const row = line && BY_ID.get(line.id), val = Math.floor(Number(line && line.val));
            return row && row.slots.includes(item.slot) && Number.isFinite(val) ? makeLine(row, Math.max(row.min, Math.min(row.max, val))) : null;
        }).filter(Boolean);
        const unique = lines.filter((line, index) => lines.findIndex(other => other.id === line.id) === index).slice(0, 2);
        if (unique.length) item.emberLines = unique;
        else delete item.emberLines;
        if (item.burned === true) item.corrupted = true;
        else delete item.burned;
    }
    /** The burning-branch drops of one ember pack kill (data/ember-corruption.js EMBER_KILL_DROPS): [[key, 1], ...]. */
    function killDrops(enemy, random = Math.random) {
        if (!enemy || enemy.atlasEncounter !== 'emberField' || enemy.isBoss) return [];
        const kind = enemy.isElite ? 'elite' : 'normal';
        return EMBER_KILL_DROPS.filter(row => random() < row[kind]).map(row => [row.key, 1]);
    }
    return Object.freeze({ burnReason, outcomes, burn, ashGrowth, normalize, killDrops, linePool, scalableLines });
})();
safeExposeGlobals({ emberCorruption });
