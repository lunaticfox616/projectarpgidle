

/** '' when the burning branch can go on this item, otherwise why not. */
export function emberBurnReason(env, item) {
    if (!item) return '아이템을 선택하세요.';
    if (!env.SLOTS.includes(item.slot)) return '장비에만 쓸 수 있습니다.';
    return item.burned ? '이미 한 번 타오른 장비입니다.' : '';
}

/** Lines a scale outcome bakes again: a unique's own lines or the explicit lines. Honey and rift locks and the rift marks stay. */
export function emberScalableLines(item) {
    return (Array.isArray(item.stats) ? item.stats : []).filter(stat => stat && Number.isFinite(Number(stat.val)) && Number(stat.val) !== 0
        && !stat.lockedByHoney && !stat.lockedByRift && !String(stat.id).startsWith('fossilRift'));
}

/** The slot's corruption-only lines the item does not carry yet. */
export function emberLinePool(env, item) {
    const taken = new Set((item.emberLines || []).map(line => line.id));
    return env.deps.EMBER_CORRUPTION_LINES.filter(row => row.slots.includes(item.slot) && !taken.has(row.id));
}

/** The outcome rows (kind, weight) this item can take: uniques and the rest have their own table. */
export function emberOutcomes(env, item) {
    return env.deps.EMBER_BURN_OUTCOMES[item.rarity === 'unique' ? 'unique' : 'other'].filter(([kind]) => !env.CAN[kind] || env.CAN[kind](item));
}

export function emberPick(env, item, random) {
    const rows = emberOutcomes(env, item);
    let roll = random() * rows.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [kind, weight] of rows) {
        if (roll < weight) return kind;
        roll -= weight;
    }
    return 'nothing';
}

export function emberRescale(value, mul) {
    return Number.isInteger(value) ? Math.round(value * mul) : Math.round(value * mul * 100) / 100;
}

/** Every scalable line ×0.8~1.2 on its own (a compound line's second stat with it). The share stays on the line (emberScale)
 * for the tooltip. @returns {number} the average share */
export function emberBakeLines(env, item, random) {
    const { min, max } = env.deps.EMBER_CORRUPTION_RULES.scale, shares = [];
    for (const stat of emberScalableLines(item)) {
        const mul = Math.round((min + random() * (max - min)) * 100) / 100;
        stat.val = emberRescale(Number(stat.val), mul);
        (stat.extraStats || []).filter(extra => Number.isFinite(Number(extra.val))).forEach(extra => { extra.val = emberRescale(Number(extra.val), mul); });
        stat.emberScale = mul;
        shares.push(mul);
    }
    return shares.reduce((sum, mul) => sum + mul, 0) / Math.max(1, shares.length);
}

export function emberMakeLine(env, row, val) {
    return { id: row.id, val, valMin: row.min, valMax: row.max, statName: env.deps.getStatName(row.id), emberLine: true };
}

/** `count` different corruption-only lines of the item's slot, each a whole number in its range. */
export function emberAddLines(env, item, count, random) {
    const pool = emberLinePool(env, item), added = [];
    while (added.length < count && pool.length) {
        const row = pool.splice(Math.floor(random() * pool.length), 1)[0];
        added.push(emberMakeLine(env, row, row.min + Math.floor(random() * (row.max - row.min + 1))));
    }
    item.emberLines = [...(item.emberLines || []), ...added];
    return added;
}

export function emberShareText(share) { return `${share >= 1 ? '+' : ''}${Math.round((share - 1) * 100)}%`; }

export function emberLinesText(env, lines) { return lines.map(line => `${line.statName} +${env.deps.formatValue(line.id, line.val)}`).join(', '); }

export function emberResult(kind, text, extra) { return { kind, text, lines: [], share: 1, ...extra }; }

/** Burns the item once: it becomes burned and corrupted and takes one outcome. 'ash' leaves the item for the caller to remove.
 * @returns {{kind: string, text: string, lines: object[], share: number}} */
export function emberBurn(env, item, random = Math.random) {
    const kind = emberPick(env, item, random);
    item.burned = true;
    item.corrupted = true;
    return env.APPLY[kind](item, random);
}

/** The stump growth an item's ashes give (uniques give more). */
export function emberAshGrowth(env, item) {
    return env.deps.EMBER_CORRUPTION_RULES.ashGrowth[item && item.rarity === 'unique' ? 'unique' : 'other'];
}

/** Save boundary: only known lines of the item's slot with whole values in range, at most two of them (three are never rolled). */
export function emberNormalize(env, item) {
    const lines = (Array.isArray(item.emberLines) ? item.emberLines : []).map(line => {
        const row = line && env.BY_ID.get(line.id), val = Math.floor(Number(line && line.val));
        return row && row.slots.includes(item.slot) && Number.isFinite(val) ? emberMakeLine(env, row, Math.max(row.min, Math.min(row.max, val))) : null;
    }).filter(Boolean);
    const unique = lines.filter((line, index) => lines.findIndex(other => other.id === line.id) === index).slice(0, 2);
    if (unique.length) item.emberLines = unique;
    else delete item.emberLines;
    if (item.burned === true) item.corrupted = true;
    else delete item.burned;
}

/** The burning-branch drops of one ember pack kill (data/ember-corruption.js EMBER_KILL_DROPS): [[key, 1], ...]. */
export function emberKillDrops(env, enemy, random = Math.random) {
    if (!enemy || enemy.atlasEncounter !== 'emberField' || enemy.isBoss) return [];
    const kind = enemy.isElite ? 'elite' : 'normal';
    return env.deps.EMBER_KILL_DROPS.filter(row => random() < row[kind]).map(row => [row.key, 1]);
}
