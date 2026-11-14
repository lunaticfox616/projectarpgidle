/** Application effects run between domain steps; presentation is never evaluated by the crafting rules. */
export function createOceanWorkshopEffects(deps) {
    return Object.freeze({
        oceanCraftCurrency: (...args) => deps.awardCurrency(...args),
        oceanCraftLog: (...args) => deps.addLog(...args),
        oceanCraftNormalize: item => deps.normalizeItem(item),
        oceanCraftSave: delay => deps.queueImportantSave(delay),
        oceanShardApplied: item => deps.addLog(deps._t('🌊 {name}의 봉인되지 않은 무작위 추가 옵션 1줄의 종류와 수치를 교체했습니다.',
            { name: deps.getItemDisplayName(item) || deps._t('장비') }), 'loot-rare')
    });
}
