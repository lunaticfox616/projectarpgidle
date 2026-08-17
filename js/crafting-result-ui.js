// Runtime-only crafting comparison UI. Item snapshots are owned by js/items.js;
// this adapter only formats the latest result and routes repeat requests back
// through the existing validated crafting action.

const craftingResultUi = (() => {
    function appendStatEntries(target, stats, group, counts) {
        (stats || []).forEach(stat => {
            if (!stat) return;
            let baseKey = `${group}:${stat.id || stat.statName || 'unknown'}`;
            let occurrence = counts.get(baseKey) || 0;
            counts.set(baseKey, occurrence + 1);
            target.push({ key: `${baseKey}:${occurrence}`, group, stat });
        });
    }

    function getStatEntries(snapshot) {
        if (!snapshot) return [];
        let entries = [];
        let counts = new Map();
        appendStatEntries(entries, snapshot.baseStats, 'base', counts);
        appendStatEntries(entries, snapshot.stats, 'explicit', counts);
        appendStatEntries(entries, snapshot.chaosInfusion ? [snapshot.chaosInfusion] : [], 'infusion', counts);
        appendStatEntries(entries, snapshot.encroachedStat ? [snapshot.encroachedStat] : [], 'encroached', counts);
        return entries;
    }

    function getChangeRows(result) {
        let beforeEntries = getStatEntries(result.before);
        let afterEntries = getStatEntries(result.after);
        let beforeMap = new Map(beforeEntries.map(entry => [entry.key, entry]));
        let afterMap = new Map(afterEntries.map(entry => [entry.key, entry]));
        let rows = [];
        beforeEntries.forEach(before => {
            let after = afterMap.get(before.key);
            if (!after) rows.push({ kind: 'removed', before });
            else if (JSON.stringify(before.stat) !== JSON.stringify(after.stat)) rows.push({ kind: 'changed', before, after });
        });
        afterEntries.forEach(after => {
            if (!beforeMap.has(after.key)) rows.push({ kind: 'added', after });
        });
        return rows;
    }

    function getStatText(entry) {
        let stat = entry.stat;
        let groupLabels = { base: '베이스 · ', infusion: '주입 · ', encroached: '잠식 · ', explicit: '' };
        let name = stat.statName || getStatName(stat.id);
        let value = Number.isFinite(Number(stat.val)) ? ` +${formatValue(stat.id, stat.val)}` : '';
        let tier = Number.isFinite(Number(stat.tier)) ? ` T${Math.floor(Number(stat.tier))}` : '';
        return `${groupLabels[entry.group] || ''}${name}${value}${tier}`;
    }

    function getMetaRows(result) {
        let before = result.before;
        let after = result.after;
        let rows = [];
        let rarityLabels = { normal: '일반', magic: '매직', rare: '레어', unique: '고유' };
        if (before.rarity !== after.rarity) rows.push(`등급 ${rarityLabels[before.rarity] || before.rarity} → ${rarityLabels[after.rarity] || after.rarity}`);
        if (before.quality !== after.quality) rows.push(`품질 ${before.quality}% → ${after.quality}%`);
        if (before.baseName !== after.baseName) rows.push(`베이스 ${before.baseName || '없음'} → ${after.baseName || '없음'}`);
        if (!before.corrupted && after.corrupted) rows.push('타락됨');
        if (before.uniqueEffect !== after.uniqueEffect) rows.push('고유 효과 변경');
        return rows;
    }

    function getRowHtml(row) {
        if (row.kind === 'changed') {
            return `<li class="changed"><span>↻</span><span>${escapeHTML(getStatText(row.before))}<b>→</b>${escapeHTML(getStatText(row.after))}</span></li>`;
        }
        let entry = row.kind === 'added' ? row.after : row.before;
        let mark = row.kind === 'added' ? '+' : '−';
        return `<li class="${row.kind}"><span>${mark}</span><span>${escapeHTML(getStatText(entry))}</span></li>`;
    }

    function getLedgerHtml(item) {
        let result = craftingResultLedger.getForItem(item);
        if (!result) return '';
        let currency = ORB_DB[result.meta.currencyKey];
        let rowsHtml = getChangeRows(result).map(getRowHtml).join('');
        rowsHtml += getMetaRows(result).map(text => `<li class="changed"><span>◆</span><span>${escapeHTML(text)}</span></li>`).join('');
        if (!rowsHtml) rowsHtml = '<li class="unchanged"><span>•</span><span>옵션 변화 없음</span></li>';
        let repeatable = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'deepWhetstone', 'rootIron', 'jewelPolish'].includes(result.meta.currencyKey);
        let remaining = Math.max(0, Math.floor(game.currencies[result.meta.currencyKey] || 0));
        let button = repeatable ? `<button type="button" data-repeat-craft="${result.meta.currencyKey}" onclick="craftingResultUi.repeat()" ${remaining > 0 ? '' : 'disabled'}>${escapeHTML(currency ? currency.name : result.meta.currencyKey)} 다시 사용 · ${remaining}</button>` : '';
        return `<section class="craft-result-ledger" aria-live="polite"><div class="craft-result-head"><div><small>방금 제작 결과</small><strong>${escapeHTML(currency ? currency.name : result.meta.currencyKey)}</strong></div>${button}</div><ul>${rowsHtml}</ul></section>`;
    }

    async function repeat() {
        let item = getSelectedCraftItem();
        let result = craftingResultLedger.getForItem(item);
        if (!result) return addLog('다시 사용할 수 있는 최근 제작 결과가 없습니다.', 'attack-monster');
        if ((game.currencies[result.meta.currencyKey] || 0) <= 0) return addLog('같은 제작 재화가 부족합니다.', 'attack-monster');
        return useCurrency(result.meta.currencyKey);
    }

    return { getLedgerHtml, repeat };
})();

safeExposeGlobals({ craftingResultUi });
