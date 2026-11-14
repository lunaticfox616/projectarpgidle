export function updateSearchFilter(runtime, key, value) {

    const d = (0, runtime.deps.getSearchFilterState)();
    d[key] = String(value || '');
    const { cursor, activeTabId } = captureSearchCursor(runtime, key, value);
    if (typeof runtime.deps.updateStaticUI === 'function') (0, runtime.deps.updateStaticUI)();
    restoreSearchCursor(runtime, key, cursor, activeTabId);
}

function captureSearchCursor(runtime, key, value) {
    let cursor = null;
    let active = runtime.deps.document.activeElement;
    let activeTabId = null;
    if (active && active.tagName === 'INPUT' && active.dataset && active.dataset.searchKey === key) {
        let pos = Number(active.selectionStart);
        cursor = Number.isFinite(pos) ? pos : String(value || '').length;
        let activeTab = active.closest('.tab-content.active');
        activeTabId = activeTab ? activeTab.id : null;
    }
    return { cursor, activeTabId };
}

function restoreSearchCursor(runtime, key, cursor, activeTabId) {
    if (cursor !== null) {
        let scope = activeTabId ? runtime.deps.document.getElementById(activeTabId) : null;
        let next = scope ? scope.querySelector(`input[data-search-key="${key}"]`) : runtime.deps.document.querySelector(`input[data-search-key="${key}"]`);
        if (next) {
            next.focus();
            let len = next.value.length;
            let pos = Math.max(0, Math.min(cursor, len));
            next.setSelectionRange(pos, pos);
        }
    }

}

export function isGemLibraryMatchVisible(runtime, searchable, query, foldInactive, isActive) {

    if (!(0, runtime.deps.matchSearchQuery)(searchable, query)) return false;
    return !foldInactive || !!String(query || '').trim() || !!isActive;

}

export function getGemSearchText(runtime, name, definition) {

    let def = definition || {};
    let tags = Array.isArray(def.tags) ? def.tags : [];
    let localizedTags = tags.map(tag => (0, runtime.deps.translateSkillTag)(tag));
    let statIds = Array.isArray(def.stats)
        ? def.stats.map(stat => stat.id || stat.stat || '').filter(Boolean)
        : [];
    if (def.stat) statIds.push(def.stat);
    let statNames = statIds.map(statId => (0, runtime.deps.getStatName)(statId));
    return [name, def.name || '', tags.join(' '), localizedTags.join(' '), def.desc || '',
        def.type || '', def.ele || '', def.targetMode || '', statIds.join(' '), statNames.join(' ')].join(' ');

}

export function shouldBulkSalvageBySearch(runtime, isMatched, salvageUnmatched) {
    return salvageUnmatched ? !isMatched : isMatched;
}

export async function bulkSalvageEquipBySearch(runtime, salvageUnmatched) {

    if (!(0, runtime.deps.assertBuildEditable)()) return;
    const owner = runtime.deps.game;
    const sf = (0, runtime.deps.getSearchFilterState)();
    const targetItems = (runtime.deps.game.inventory || []).filter(item => {
        if (!item) return false;
        // 가방 검색이 밝게 보이는 장비와 같은 글로 맞춘다(베이스 이름, 한글 등급 포함): 다르면 일치로 보이던 장비가 미검색 해체에 들어갔다
        const hay = (0, runtime.deps.getEquipmentSearchText)(item);
        const matched = (0, runtime.deps.matchSearchQuery)(hay, sf.equip);
        return shouldBulkSalvageBySearch(runtime, matched, !!salvageUnmatched) && !(0, runtime.deps.isBulkSalvageProtectedItem)(item);
    });
    const targetCount = targetItems.length;
    if (targetCount <= 0) return (0, runtime.deps.addLog)((0, runtime.deps._t)('해체 대상이 없습니다.'), 'attack-monster');
    const note = runtime.deps.bagItems.countNote(targetItems);
    if (!await (0, runtime.deps.requestGameConfirmation)(`검색 조건에 해당하는 장비 ${targetCount}개를 해체합니다.${note ? `\n${note} 포함` : ''}\n잠금, 세팅, 우선 보관 장비는 빼고 해체합니다.`, {
        title: (0, runtime.deps._t)('검색 장비 일괄 해체'),
        tone: 'danger',
        confirmLabel: (0, runtime.deps._t)('{targetCount}개 해체', { targetCount })
    })) return;
    // 끼운 주얼이 가방으로 돌아오므로 가방은 해체하는 쪽에서 다시 맞춘다(js/item-rolls.js salvageBagItems)
    if (!runtime.active || owner !== runtime.deps.game) return;
    const targets = (0, runtime.deps.confirmedSalvageTargets)(targetItems), lockedSkipped = targetCount - targets.length;
    const rewards = (0, runtime.deps.salvageBagItems)(targets);
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🧪 장비 {count}개 해체 완료, {rewards}{kept}', { count: targets.length, rewards: (0, runtime.deps.formatSalvageRewardSummary)(rewards), kept: lockedSkipped > 0 ? ` ${(0, runtime.deps._t)('(잠금, 세팅, 우선 보관 {n}개는 남김)', { n: lockedSkipped })}` : '' }), 'loot-normal');
    (0, runtime.deps.updateStaticUI)();

}
