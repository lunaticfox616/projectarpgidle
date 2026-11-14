export function createOceanModCategoryRules(AFFIX_TAG_LISTS, MOD_DB, resolveAffixTagList) {
    return [['공격', 'attack'], ['방어/생명', 'defense'], ['속도/치명', 'speed'], ['저항', 'resistance']]
        .map(([category, key]) => ({ category, ids: resolveAffixTagList(AFFIX_TAG_LISTS.sea[key], MOD_DB) }));
}
