/** 2026-10-02: 목재 몬스터 넷(수액 응집체 · 뿌리 거미 · 수액 흡충 · 목각 인형)의 그림을 내렸다. 모은 외형은 가장 닮은
 * 새 몬스터로(data/bosses.js RETIRED_WOOD_MONSTER_SKINS), 싸우던 적은 그 지역의 새 외형 · 이름으로 바꾸고 공격 방식을
 * 다시 정하게 한다(그림을 따른다, js/combat-grid.js). 두 번 불러와도 같다. */
export function migrateRetiredWoodMonsters(deps, merged) {
    const skins = merged.unlockedMonsterSkins;
    if (skins && typeof skins === 'object') Object.entries(deps.RETIRED_WOOD_MONSTER_SKINS).forEach(([old, next]) => {
        if (skins[old]) skins[next] = true;
        delete skins[old];
    });
    merged.selectedMonsterSkin = deps.RETIRED_WOOD_MONSTER_SKINS[merged.selectedMonsterSkin] || merged.selectedMonsterSkin;
    const zone = Number.isInteger(merged.currentZoneId) && merged.currentZoneId < deps.ACT_ZONE_COUNT ? deps.MAP_ZONES[merged.currentZoneId] : null;
    const packs = Array.isArray(merged.actExploration?.packs) ? merged.actExploration.packs : [];
    [merged.enemies, ...packs.map(pack => pack?.waiting)].filter(Array.isArray).flat().forEach(enemy => {
        retireWoodMonsterVisual(deps, enemy, zone);
        resetRedrawnRealmAttack(deps, enemy);
    });
}

/** 2026-10-13: 새 그림이 없던 영역 몬스터 열하나를 지웠다(data/bosses.js RETIRED_REALM_MONSTERS). 모은 외형은 대신하는 몬스터의 것이 되고,
 * 싸우던 적은 그 몬스터의 외형과 이름으로 바뀌어 공격 방식을 다시 정한다(그림을 따른다). 두 번 불러와도 같다. */
export function migrateRetiredRealmMonsters(deps, merged) {
    const skins = merged.unlockedMonsterSkins;
    if (skins && typeof skins === 'object') Object.entries(deps.RETIRED_REALM_MONSTERS).forEach(([old, next]) => {
        if (skins[old]) skins[next] = true;
        delete skins[old];
    });
    merged.selectedMonsterSkin = deps.RETIRED_REALM_MONSTERS[merged.selectedMonsterSkin] || merged.selectedMonsterSkin;
    const packs = Array.isArray(merged.actExploration?.packs) ? merged.actExploration.packs : [];
    [merged.enemies, ...packs.map(pack => pack?.waiting)].filter(Array.isArray).flat().forEach(((...args) => retireRealmMonsterVisual(deps, ...args)));
}

export function retireRealmMonsterVisual(deps, enemy) {
    const next = enemy && deps.RETIRED_REALM_MONSTERS[enemy.monsterVisualId], def = next ? (0, deps.getRealmMonsterVisualDefinitionById)(next) : null;
    if (!def) return;
    if (enemy.baseMonsterName && typeof enemy.name === 'string') enemy.name = enemy.name.replace(enemy.baseMonsterName, def.name);
    Object.assign(enemy, { monsterVisualId: def.id, baseMonsterName: def.name });
    ['attackKind', 'attackRange', 'attackDelivery', 'projectileToEdge', 'attackCastMs', 'attackLabel'].forEach(key => delete enemy[key]);
}

/** Realm sets fight as drawn since 2026-10-03: a realm enemy saved with the old per-visual roll picks its attack again. */
export function resetRedrawnRealmAttack(deps, enemy) {
    const kind = enemy && enemy.monsterVisualId ? (0, deps.getMonsterVisualAttackKind)(enemy.monsterVisualId) : null;
    if (!kind || !enemy.attackKind || enemy.isBoss || enemy.attackKind === kind) return;
    ['attackKind', 'attackRange', 'attackDelivery', 'projectileToEdge', 'attackCastMs', 'attackLabel'].forEach(key => delete enemy[key]);
}

export function retireWoodMonsterVisual(deps, enemy, zone) {
    if (!enemy || !/^(woodSlime|rootSpider|sapLeech|woodPuppet)-\d+$/.test(enemy.spriteVariantId || '')) return;
    const pool = (0, deps.getActMonsterPool)(zone), def = deps.ACT_MONSTER_VISUAL_BY_ID[pool[Math.abs(Math.floor(Number(enemy.variantSeed) || 0)) % pool.length]];
    if (enemy.baseMonsterName && typeof enemy.name === 'string') enemy.name = enemy.name.replace(enemy.baseMonsterName, def.name);
    Object.assign(enemy, { spriteVariantId: def.id, baseMonsterName: def.name });
    ['attackKind', 'attackRange', 'attackDelivery', 'projectileToEdge', 'attackCastMs', 'attackLabel'].forEach(key => delete enemy[key]);
}

export function restoreSavedBossPicture(deps, record, state) {
    if (!record.isBoss || record.roomInvader || record.uninvited) return;
    const zoneId = state.currentZoneId;
    if (zoneId === deps.LABYRINTH_ZONE_ID) {
        record.monsterVisualId = (0, deps.getLabyrinthZoneNow)(state.labyrinthFloor).bossVisualId;
        (0, deps.assignEnemyGridCombatProfile)(record);
        return;
    }
    const visual = deps.bossLooks.get(zoneId);
    if (visual && record.monsterVisualId !== visual) {
        record.monsterVisualId = visual;
        record.spriteVariantId = null;
    }
    if (/^bossAct10_[1345]$/.test(record.bossAssetKey)) record.bossAssetKey = deps.ACT_BOSS_ASSET_KEYS[9];
}
