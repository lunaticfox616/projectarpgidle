

export function itemFlowRollUpgradedBaseStats(env, item, nextBase) {
    let previousStats = item.baseStats || [];
    item.baseStats = env.deps.rollBaseStats(nextBase, nextBase.reqTier || 1);
    itemFlowCarryUpgradedBaseMarks(env, item, previousStats);
    if (nextBase.slot !== '방패') return;
    preserveBlockRoll(previousStats, item.baseStats);
}

function preserveBlockRoll(previousStats, nextStats) {
    let previous = previousStats.find(stat => stat && stat.id === 'baseBlockChance');
    let next = nextStats.find(stat => stat && stat.id === 'baseBlockChance');
    let floor = Math.max(0, Number(previous && previous.val) || 0);
    if (!next || floor <= 0 || Number(next.val || 0) >= floor) return;
    next.val = floor;
    for (const key of ['valMin', 'valMax', 'baseRollMin', 'baseRollMax']) next[key] = Math.max(Number(next[key] || 0), floor);
}

export function itemFlowCarryUpgradedBaseMarks(env, item, previousStats) {
    const exceptionalIds = new Set(previousStats.filter(stat => stat && stat.exceptional && !stat.altar).map(stat => stat.id));
    previousStats.filter(stat => stat && stat.altar).forEach(line => itemFlowCarryAltarLineToUpgradedBase(env, item.baseStats, line, exceptionalIds));
    env.EXCEPTIONAL_BASE_ITEM_FIELDS.forEach(key => delete item[key]);
    item.baseStats.forEach(stat => { if (stat && !stat.altar && exceptionalIds.has(stat.id)) env.deps.boostExceptionalBaseLine(item, stat); });
}

export function itemFlowCarryAltarLineToUpgradedBase(env, stats, line, exceptionalIds) {
    const open = stat => !!stat && !stat.altar && !exceptionalIds.has(stat.id) && !env.UPGRADE_ALTAR_KEPT_LINE_IDS.includes(stat.id);
    const replacedId = line.replaced ? line.replaced.id : null;
    let index = stats.findIndex(stat => open(stat) && stat.id === line.id);
    if (index < 0) index = stats.findIndex(stat => open(stat) && stat.id === replacedId);
    if (index < 0) index = stats.map(open).lastIndexOf(true);
    const carried = Object.assign({}, line);
    delete carried.replaced;
    if (index < 0) stats.push(carried);
    else stats[index] = Object.assign(carried, { replaced: { id: stats[index].id, statName: stats[index].statName || env.deps.getStatName(stats[index].id) } });
}
