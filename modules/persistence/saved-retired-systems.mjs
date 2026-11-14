import { METEOR_SITE_SAVE_KEYS, RETIRED_STAR_WEDGE_CURRENCIES, RETIRED_SPORE_CURRENCIES, RETIRED_EXPERT_ACCESS, REMOVED_AFFIX_KEEP_REFUND } from './saved-retired-definitions.mjs';
import { savedItemsOf } from './saved-equipment.mjs';

/** 생장판 제거(2026-09-30): 판 · 보관함 · 확장 · 생장 정수 · 설정 · 해금 표시는 보상 없이 지운다(결정 4). 두 번 불러와도 같다. */
export function stripRemovedGrowthBoard(merged) {
    ['growthBoard', 'growthInventory', 'recentGrowthDrops', 'growthInventoryExpandLevel', 'growthEssenceExpandLevel', 'growthCodex']
        .forEach(key => delete merged[key]);
    ['growthSortMode', 'growthAutoSalvageEnabled', 'growthAutoSalvageRarities', 'growthUseItemFilter', 'growthInventoryFilter']
        .forEach(key => delete merged.settings[key]);
    [[merged.settings.searchFilters, 'growth'], [merged.currencies, 'growthEssence'], [merged.unlocks, 'growthboard'], [merged.noti, 'growthboard']]
        .forEach(([row, key]) => { if (row && typeof row === 'object') delete row[key]; });
}

/** 6단계(2026-10-01): 운석 낙하 지점 상태(게이지 · 단계 · 돌아갈 곳 · 별자리 관측)를 별쐐기 저장에서 meteorSite로 옮기고,
 * 별쐐기 · 장착 · 변성 기록은 보상 없이 지운다(결정 4 · 8). 별쐐기 저널은 운석 낙하 지점 저널이 된다. 두 번 불러와도 같다. */
export function moveStarWedgeSaveToMeteorSite(deps, merged, save) {
    const legacy = save.starWedge && typeof save.starWedge === 'object' ? save.starWedge : null;
    if (legacy && !(save.meteorSite && typeof save.meteorSite === 'object')) {
        merged.meteorSite = Object.fromEntries(METEOR_SITE_SAVE_KEYS.filter(key => key in legacy).map(key => [key, legacy[key]]));
    }
    delete merged.starWedge;
    (0, deps.ensureMeteorSiteState)(merged);
    if (Array.isArray(merged.journalEntries)) merged.journalEntries = merged.journalEntries.map(id => id === 'star_wedge' ? 'meteor_fall' : id);
}

/** 6단계(2026-10-01): 운석 파편 · 불완전한 별쐐기 · 별쐐기 · 성핵 조각과 나무꾼 잠금 사진의 별쐐기, 명왕성 별쐐기가 만들던
 * 공허 노드(star_pluto_*)의 보관된 제작 기록을 지운다. 그 노드는 다시 생기지 않는다. */
export function stripRemovedStarWedges(merged) {
    RETIRED_STAR_WEDGE_CURRENCIES.forEach(key => delete merged.currencies[key]);
    if (merged.woodsmanBuildSnapshot && typeof merged.woodsmanBuildSnapshot === 'object') delete merged.woodsmanBuildSnapshot.starWedge;
    Object.keys(merged.retiredVoidPassives || {}).filter(id => id.startsWith('star_')).forEach(id => delete merged.retiredVoidPassives[id]);
}

export function stripRetiredSpores(merged) {
    RETIRED_SPORE_CURRENCIES.forEach(key => delete merged.currencies[key]);
}

/** 7단계(2026-10-01): 아르카나 · 가지치기 · 전문가와 별가루를 보상 없이 지운다(결정 4 · 10 · 11). 해금 원장의 세 항목은
 * content-progression이 모르는 항목으로 버리고 포인트를 돌려준다. 벌집 갈림길에 저장된 양봉업자 레벨도 지운다. 두 번 불러와도 같다. */
export function stripRemovedAuxSystems(deps, merged) {
    ['arcana', 'pruningTree', 'expertise'].forEach(key => delete merged[key]);
    ['arcana', 'pruning', 'expertise'].forEach(key => { delete merged.unlocks[key]; delete merged.noti[key]; });
    delete merged.currencies.starDust;
    const choice = merged.beehive && merged.beehive.pendingChoice;
    if (choice && typeof choice === 'object') {
        delete choice.expertLevel;
        ['a', 'b', 'c'].forEach(key => { if (choice[key] && typeof choice[key] === 'object') delete choice[key].expertLevel; });
    }
    // 2026-10-10: 군락지 액막이 보관함과 칸은 가방과 장비의 액막이 칸으로, 주얼 보관함과 코어 보관함은 가방으로, 끼운 코어는
    // 장비 칸 '코어'로 옮긴다(js/colony-wards.js, js/bag-items.js migrate).
    deps.colonyWards.migrate(merged);
    deps.bagItems.migrate(merged);
    refundRemovedAffixKeep(merged);
}

export function inheritRetiredExpertAccess(ledger, save) {
    const levels = save && save.expertise && save.expertise.levels;
    if (!levels || typeof levels !== 'object') return;
    RETIRED_EXPERT_ACCESS.forEach(([expert, level, id]) => {
        const owned = ledger.unlocked.includes(id) || ledger.inherited.includes(id);
        if (!owned && (Number(levels[expert]) || 0) >= level) ledger.inherited.push(id);
    });
}

/** The kept side left in a waiting 성화 pick's saved results (they put their fields back on the item when picked). */
export function stripCraftChoiceAffixKeep(merged) {
    ((merged.craftChoice || {}).options || []).forEach(fields => { if (fields && typeof fields === 'object') delete fields.affixKeep; });
}

export function refundRemovedAffixKeep(merged) {
    const refunded = new Set();
    for (const item of savedItemsOf(merged)) {
        if (!Object.hasOwn(item, 'affixKeep')) continue;
        if (item.affixKeep === 'prefix' || item.affixKeep === 'suffix') refunded.add(String(item.id));
        delete item.affixKeep;
    }
    stripCraftChoiceAffixKeep(merged);
    if (!refunded.size || !merged.currencies || typeof merged.currencies !== 'object') return;
    merged.currencies.goldenRule = Math.max(0, Math.floor(Number(merged.currencies.goldenRule) || 0)) + REMOVED_AFFIX_KEEP_REFUND * refunded.size;
}

/** 2단계(2026-10-01): 플라스크 삭제 — 물약 상태(연금 유리 포함) · 알림을 보상 없이 지운다(결정 4 · 7).
 * 단축키 배정 · 히든 저널 · 보스 도전 기록은 불러올 때 이미 모르는 항목을 버리거나 새로 시작한다. */
export function stripRemovedFlasks(merged) {
    delete merged.flasks;
    [[merged.settings && merged.settings.notiFilters, 'flask'], [merged.noti, 'flask']]
        .forEach(([row, key]) => { if (row && typeof row === 'object') delete row[key]; });
}

/** 2026-10-25 사용자: 영구 방치 성장을 해금 탭의 강화로 옮겼다. 시간 인식과 전투 효율 단계는 장부가 먼저 물려받고
 * (js/content-progression.js inheritGrowthSeries), 여기서 방치 보관함의 장비를 가방으로 돌려보낸다(가방이 차면 임시 보관,
 * equipmentInventoryGridRuntime). 시간의 잔재와 남은 필드는 지운다. 지운 뒤에는 할 것이 없어 두 번 불러와도 같다. */
export function retireOfflineGrowth(state) {
    const offline = state.offlineProgress && typeof state.offlineProgress === 'object' ? state.offlineProgress : {};
    const items = [offline.stash, offline.protectedOverflow].flat().filter(item => item && typeof item === 'object');
    if (items.length) state.inventory.push(...items);
    delete state.offlineProgress;
    delete state.currencies.timeRemnant;
}

/** 해금 칸의 ! (2026-11-06, js/unlock-tab-ui.js unseenIds): 이 기록이 없던 저장은 이미 가진 해금을 본 것으로 시작한다. */
export function restoreSeenUnlocks(deps, merged, save) {
    const saved = Array.isArray(save.seenUnlocks) ? save.seenUnlocks.filter(id => typeof id === 'string') : null;
    merged.seenUnlocks = saved ? [...new Set(saved)] : deps.CONTENT_UNLOCK_CATALOG.filter(def => deps.contentProgression.isUnlocked(def.id, merged)).map(def => def.id);
}

/** Save boundary: retain prior access except locked trial bypasses. */
export function normalizeContentProgressionSave(deps, merged, save) {
    merged.contentProgression = deps.contentProgression.restore(save.contentProgression, merged, Object.keys(save).length > 0);
    retireOfflineGrowth(merged);
    inheritRetiredExpertAccess(merged.contentProgression, save);
    deps.contentProgression.sync(merged);
    restoreSeenUnlocks(deps, merged, save);
    if (deps.TRIAL_ZONES.some(zone => zone.id === merged.currentZoneId) && !deps.contentProgression.isUnlocked('battleTrials', merged)) {
        merged.currentZoneId = 0;
        merged.enemies = []; merged.encounterPlan = []; merged.killsInZone = 0;
        merged.inTicketBossFight = false; merged.moveTimer = 0;
    }
    return merged;
}
