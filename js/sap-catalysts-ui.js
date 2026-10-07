// 기폭제의 화면(12번 루프 32, js/sap-catalysts.js): 제작실에서 쓸 수 있는지와 쓰기(결과 카드와 기록), 툴팁의 품질 줄(품질과 그 속성이
// 무엇을 키우는지. 툴팁에 품질이 보이지 않던 것을 함께 채운다).
const sapCatalystsUi = (() => {
    /** The crafting workspace's use state for the selected item: { enabled, reason }. */
    function useState(key, item) {
        if (game.woodsmanBuildLock) return { enabled: false, reason: '나무꾼 전투 중에는 쓸 수 없습니다.' };
        if ((game.currencies[key] || 0) <= 0) return { enabled: false, reason: '재화 부족' };
        const reason = sapCatalysts.useReason(item, key);
        return { enabled: !reason, reason: reason || '사용 가능' };
    }
    /** Uses one catalyst on the selected item (crafting workspace action). @returns {true|undefined} */
    function use(key) {
        const item = getSelectedCraftItem(), state = useState(key, item);
        if (!state.enabled) return addLog(state.reason, 'attack-monster');
        game.currencies[key] -= 1;
        const token = craftingResultLedger.begin(item, { currencyKey: key });
        const out = sapCatalysts.apply(item, key);
        token.meta.outcome = `품질 속성 ${getItemQualityAttributeLabel(out.mode)}, 품질 ${out.before}% → ${out.after}%`;
        craftingResultLedger.commit(token, item);
        addLog(`💧 ${ORB_DB[key].name}: [${escapeHTML(item.name)}] ${token.meta.outcome}`, 'loot-magic');
        updateStaticUI();
        queueImportantSave(200);
        return true;
    }
    /** The tooltip's quality line: its percent and what it grows (base options, or the lines of its tag). '' without quality. */
    function qualityHtml(item) {
        const value = Math.max(0, Math.floor(Number(item && item.quality) || 0));
        if (!value) return '';
        const mode = getItemQualityAttributeMode(item);
        const grows = mode === 'base' ? '베이스 옵션' : `${getItemQualityAttributeLabel(mode)} 태그 줄`;
        return `<div class="tooltip-line" style="margin-top:6px; color:#9fd3ff;">💧 품질 ${value}%: ${grows} +${value}%</div>`;
    }
    return Object.freeze({ useState, use, qualityHtml });
})();
safeExposeGlobals({ sapCatalystsUi });
