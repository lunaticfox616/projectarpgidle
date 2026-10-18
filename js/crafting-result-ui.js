// 제작 경과의 옵션 줄 밖 변화(js/crafting-workspace-ui.js 제작 경과): 등급, 품질, 베이스, 타락, 소켓, 액막이 칸, 고유 효과. 아이템
// 스냅숏은 js/items.js craftingResultLedger가 만든다. 옵션 줄의 변화는 제작실이 줄마다 표시한다.

const craftingResultUi = (() => {
    function getSocketRows(before, after) {
        return after.sockets > before.sockets ? [`소켓 ${before.sockets} → ${after.sockets}`] : [];
    }

    /** 허리띠의 액막이 칸 수가 바뀌었을 때 한 줄(축복의 꽃잎이 다시 굴린다, js/colony-wards.js rerollBelt). */
    function getWardRows(before, after) {
        return before.wardSlots !== after.wardSlots ? [`액막이 칸 ${before.wardSlots || 0} → ${after.wardSlots || 0}`] : [];
    }

    function getMetaRows(result) {
        let before = result.before;
        let after = result.after;
        let rows = [];
        let rarityLabels = ITEM_RARITY_LABELS;
        if (before.rarity !== after.rarity) rows.push(`등급 ${rarityLabels[before.rarity] || before.rarity} → ${rarityLabels[after.rarity] || after.rarity}`);
        if (before.quality !== after.quality) rows.push(`품질 ${before.quality}% → ${after.quality}%`);
        if (before.baseName !== after.baseName) rows.push(`베이스 ${before.baseName || '없음'} → ${after.baseName || '없음'}`);
        if (!before.corrupted && after.corrupted) rows.push('타락됨');
        rows.push(...getSocketRows(before, after), ...getWardRows(before, after));
        if (before.uniqueEffect !== after.uniqueEffect) rows.push('고유 효과 변경');
        return rows;
    }

    return { getMetaRows };
})();

safeExposeGlobals({ craftingResultUi });
