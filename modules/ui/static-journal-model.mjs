export function getStaticJournalModel(runtime) {
    let unlocked = new Set((runtime.deps.game.journalEntries || []).filter(id => runtime.deps.JOURNAL_DB[id]));
    let orderedIds = runtime.deps.JOURNAL_ENTRY_ORDER.filter(id => runtime.deps.JOURNAL_DB[id] && (!runtime.deps.JOURNAL_DB[id].discoveryOnly || unlocked.has(id)));
    let entries = orderedIds.map(id => ({ id: id, def: runtime.deps.JOURNAL_DB[id] }));
    let availabilityById = new Map(entries.map(entry => [entry.id, runtime.deps.storyJournalUi.getJournalEntryAvailability(entry, Array.from(unlocked))]));
    let categoryCounts = {};
    entries.forEach(({ id }) => {
        let category = runtime.deps.storyJournalUi.getJournalCategory(id);
        if (!categoryCounts[category]) categoryCounts[category] = { total: 0, unlocked: 0 };
        categoryCounts[category].total++;
        if (unlocked.has(id)) categoryCounts[category].unlocked++;
    });
    let standardEntries = entries.filter(({ def }) => !def.hidden);
    let hiddenEntries = entries.filter(({ id }) => runtime.deps.storyJournalUi.getJournalCategory(id) === '숨겨진 기록'); // 기억의 잎은 제 분류에서 센다
    let unlockedCount = entries.filter(({ id }) => unlocked.has(id)).length;
    let standardUnlockedCount = standardEntries.filter(({ id }) => unlocked.has(id)).length;
    let hiddenUnlockedCount = hiddenEntries.filter(({ id }) => unlocked.has(id)).length;
    let rewardCount = entries.filter(({ id, def }) => unlocked.has(id) && !!(def.bonus || def.displayEffect)).length;
    let progressPct = standardEntries.length > 0 ? Math.floor(standardUnlockedCount / standardEntries.length * 100) : 0;
    let availableEntries = entries.filter(({ id }) => availabilityById.get(id) === 'available');
    return { unlocked, entries, availabilityById, categoryCounts, standardEntries, hiddenEntries, unlockedCount, standardUnlockedCount, hiddenUnlockedCount, rewardCount, progressPct, availableEntries };
}
