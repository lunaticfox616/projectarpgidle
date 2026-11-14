export function getJournalEntryAction(runtime, id) {
    const { deps } = runtime, owner = deps.game;
    if (['level_200', 'passive_star_evolution'].includes(id)) return journalCharacterRoute(runtime, id);
    if (!owner?.unlocks?.map) return null;
    const loop = Math.max(1, Math.floor(Number(owner.season || 1)));
    const maxZoneId = Math.max(0, Math.floor(Number(owner.maxZoneId || 0)));
    const context = { loop, maxZoneId };
    return journalStoryRoute(runtime, id, context) || journalExplorationRoute(runtime, id, context) || journalEndgameRoute(runtime, id, context);
}

function journalCharacterRoute({ deps }, id) {
    if (id === 'level_200') return { label: deps._t('캐릭터 성장 확인'), tabId: 'tab-character' };
    return deps.game?.unlocks?.char ? { label: deps._t('성좌 확인'), tabId: 'tab-char' } : null;
}

function journalStoryRoute(runtime, id, { maxZoneId }) {
    const { deps } = runtime;
    if (/^act_\d+$/.test(id) || id === 'immortal') return { label: deps._t('사냥터 보기'), tabId: 'tab-map', subtabId: 'map-explore-hunting' };
    if (['woodsman', 'woodsman_echo'].includes(id)) return journalChaosRoute(runtime, id, maxZoneId);
    if (id === 'meteor_fall') return deps.game.meteorSite?.unlocked ? { label: deps._t('운석 낙하 지점 보기'), tabId: 'tab-map', subtabId: 'map-explore-meteor' } : null;
    return null;
}

function journalChaosRoute({ deps }, id, maxZoneId) {
    const owner = deps.game;
    if (id === 'woodsman') {
        const ready = typeof deps.hasCurrentLoopChaosAccess === 'function' ? deps.hasCurrentLoopChaosAccess(owner) : maxZoneId >= deps.ABYSS_START_ZONE_ID;
        return ready ? { label: deps._t('혼돈 등반 보기'), tabId: 'tab-map', subtabId: 'map-explore-chaos' } : null;
    }
    return owner.chaosRealm?.unlocked ? { label: deps._t('혼돈계 보기'), tabId: 'tab-map', subtabId: 'map-tab-chaos-realm' } : null;
}

function journalExplorationRoute({ deps }, id, { loop, maxZoneId }) {
    const rows = {
        beehive_queen: [8, '벌집 원정 보기', 'map-explore-beehive'],
        void_grand_breach: [9, '대균열 보기', 'map-explore-voidrift'],
        labyrinth_10: [3, '고대 미궁 보기', 'map-explore-labyrinth'],
        ocean_500: [deps.OCEAN_UNLOCK_LOOP, '심해 보기', 'map-tab-ocean'],
        time_rift_fusion: [deps.TIME_RIFT_UNLOCK_LOOP, '시간의 균열 보기', 'map-explore-timerift'],
        colony_wave_10: [15, '군락지 보기', 'map-explore-colony']
    };
    if (id === 'sky_tower_10') return deps.game.skyTower?.unlocked ? { label: deps._t('창공의 탑 보기'), tabId: 'tab-map', subtabId: 'map-tab-sky' } : null;
    const row = rows[id];
    if (!row || !(loop >= row[0]) || (id === 'labyrinth_10' && !(maxZoneId >= 5))) return null;
    return { label: deps._t(row[1]), tabId: 'tab-map', subtabId: row[2] };
}

function journalEndgameRoute(runtime, id, { loop }) {
    const { deps } = runtime;
    if (/^rival_/.test(id)) return loop >= 31 ? { label: deps._t('버려진 날 보기'), tabId: 'tab-map', subtabId: 'map-explore-root-boss' } : null;
    if (/^pinnacle_/.test(id)) return loop >= 31 ? { label: deps._t('최종 관문 보기'), tabId: 'tab-map', subtabId: 'map-explore-root-boss' } : null;
    if (id !== 'cosmos_astra' || loop < 31) return null;
    return journalCosmosRoute(runtime);
}

function journalCosmosRoute({ deps }) {
    const progress = typeof deps.getCosmosCapstoneProgress === 'function' ? deps.getCosmosCapstoneProgress(deps.game.cosmosAtlas || {}) : null;
    return progress?.canChallenge ? { label: deps._t('아스트라 도전 보기'), tabId: 'tab-map', subtabId: 'map-explore-root-boss' }
        : { label: deps._t('우주계 진행 보기'), tabId: 'tab-map', subtabId: 'map-tab-cosmos' };
}

export function openJournalEntryAction(runtime, id) {
    const { deps } = runtime, action = getJournalEntryAction(runtime, id);
    if (!action?.tabId) return;
    deps.switchTab(action.tabId);
    if (action.tabId !== 'tab-map' || !action.subtabId) return;
    if (action.subtabId.startsWith('map-tab-')) deps.switchMapSubtab(action.subtabId);
    else {
        deps.switchMapSubtab('map-tab-zones');
        deps.switchMapExploreSubtab(action.subtabId);
    }
}
