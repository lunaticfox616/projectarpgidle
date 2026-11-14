export function getSocketRows(ctx, before, after) {
    return after.sockets > before.sockets ? [(0, ctx.deps._t)('소켓 {sockets} → {sockets2}', { sockets: before.sockets, sockets2: after.sockets })] : [];
}

/** 허리띠의 액막이 칸 수가 바뀌었을 때 한 줄(축복의 꽃잎이 다시 굴린다, js/colony-wards.js rerollBelt). */
export function getWardRows(ctx, before, after) {
    return before.wardSlots !== after.wardSlots ? [(0, ctx.deps._t)('액막이 칸 {wardSlots} → {wardSlots2}', { wardSlots: before.wardSlots || 0, wardSlots2: after.wardSlots || 0 })] : [];
}

function appendRarityRow(ctx, rows, before, after) {
    let rarityLabels = ctx.deps.ITEM_RARITY_LABELS;
    if (before.rarity !== after.rarity) rows.push(`등급 ${rarityLabels[before.rarity] || before.rarity} → ${rarityLabels[after.rarity] || after.rarity}`);
}

export function getMetaRows(ctx, result) {
    let before = result.before;
    let after = result.after;
    let rows = [];
    appendRarityRow(ctx, rows, before, after);
    if (before.quality !== after.quality) rows.push(`품질 ${before.quality}% → ${after.quality}%`);
    if (before.baseName !== after.baseName) rows.push(`베이스 ${before.baseName || (0, ctx.deps._t)('없음')} → ${after.baseName || (0, ctx.deps._t)('없음')}`);
    if (!before.corrupted && after.corrupted) rows.push('타락됨');
    rows.push(...getSocketRows(ctx, before, after), ...getWardRows(ctx, before, after));
    if (before.uniqueEffect !== after.uniqueEffect) rows.push('고유 효과 변경');
    return rows;
}
