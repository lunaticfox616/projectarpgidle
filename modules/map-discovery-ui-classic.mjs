import { MapDiscovery, hasTalentBloomTrialKey } from './domain/map-discovery.mjs';
import { MapTabReveals } from './ui/map-tab-reveals.mjs';
import { MapDiscoveryView } from './ui/map-discovery-view.mjs';

const deps = {
    get CONTENT_UNLOCK_CATALOG() { return CONTENT_UNLOCK_CATALOG; },
    get LAST_STORY_ZONE_ID() { return typeof LAST_STORY_ZONE_ID === 'undefined' ? undefined : LAST_STORY_ZONE_ID; },
    get MAP_PRIMARY_CONTENTS() { return MAP_PRIMARY_CONTENTS; },
    get SEASON_BOSS_ZONES() { return typeof SEASON_BOSS_ZONES === 'undefined' ? undefined : SEASON_BOSS_ZONES; },
    get TRIAL_ZONES() { return TRIAL_ZONES; },
    get atlasUi() { return atlasUi; },
    get clearTimeout() { return clearTimeout.bind(globalThis); },
    get contentProgression() { return contentProgression; },
    get contentUnlockUi() { return contentUnlockUi; },
    get document() { return document; },
    get explorationAtlasUi() { return explorationAtlasUi; },
    get game() { return window.GameModules.state.game; },
    get getAvailableActRewardZoneIds() { return getAvailableActRewardZoneIds; },
    get getMapPrimaryContentEntryCondition() { return getMapPrimaryContentEntryCondition; },
    get getMyNickname() { return typeof getMyNickname === 'undefined' ? undefined : getMyNickname; },
    get isMapPrimaryContentUnlocked() { return isMapPrimaryContentUnlocked; },
    get isNotiEnabled() { return isNotiEnabled; },
    get isSelectedSubtab() { return isSelectedSubtab; },
    get reconcileMapPrimaryContentUnlocks() { return reconcileMapPrimaryContentUnlocks; },
    get renderBeyondBoundaryPanel() { return renderBeyondBoundaryPanel; },
    get renderLoop15ColonyPanel() { return renderLoop15ColonyPanel; },
    get renderLoop8BeehivePanel() { return renderLoop8BeehivePanel; },
    get renderMobileMapNavigation() { return renderMobileMapNavigation; },
    get setTimeout() { return setTimeout.bind(globalThis); },
    get socialCloudReady() { return typeof socialCloudReady === 'undefined' ? undefined : socialCloudReady; },
    get switchMapSubtab() { return switchMapSubtab; },
    get worldMapUi() { return worldMapUi; },
};
const discovery = new MapDiscovery(deps);
const reveals = new MapTabReveals(deps);
const navigation = new MapDiscoveryView(deps, discovery, reveals);

// Remove the named bridge when legacy and inline consumers use the composed view.
const mapNavigation = Object.freeze({
    syncMapPrimaryContentTabs: navigation.syncMapPrimaryContentTabs.bind(navigation),
    announceMapPrimaryContentUnlocks: navigation.announceMapPrimaryContentUnlocks.bind(navigation),
    switchMapExploreSubtab: navigation.switchMapExploreSubtab.bind(navigation),
    detectNewMapUnlockAlarms: navigation.detectNewMapUnlockAlarms.bind(navigation),
    acknowledgeMapMainAlarm: navigation.acknowledgeMapMainAlarm.bind(navigation),
    renderMapExploreNotiDots: navigation.renderMapExploreNotiDots.bind(navigation),
    isMapExploreSubtabOpenable: navigation.isMapExploreSubtabOpenable.bind(navigation),
    focusMapAlarmSourceSubtab: navigation.focusMapAlarmSourceSubtab.bind(navigation),
    setExploreSubtabAvailable: navigation.setExploreSubtabAvailable.bind(navigation),
    canSeeTalentBloomTrial: () => hasTalentBloomTrialKey(deps.game),
    dispose: navigation.dispose.bind(navigation)
});
window.GameModules.mapDiscoveryView = mapNavigation;
safeExposeGlobals({
    syncMapPrimaryContentTabs: mapNavigation.syncMapPrimaryContentTabs,
    announceMapPrimaryContentUnlocks: mapNavigation.announceMapPrimaryContentUnlocks,
    switchMapExploreSubtab: mapNavigation.switchMapExploreSubtab,
    detectNewMapUnlockAlarms: mapNavigation.detectNewMapUnlockAlarms,
    acknowledgeMapMainAlarm: mapNavigation.acknowledgeMapMainAlarm,
    renderMapExploreNotiDots: mapNavigation.renderMapExploreNotiDots,
    isMapExploreSubtabOpenable: mapNavigation.isMapExploreSubtabOpenable,
    focusMapAlarmSourceSubtab: mapNavigation.focusMapAlarmSourceSubtab,
    setExploreSubtabAvailable: mapNavigation.setExploreSubtabAvailable,
    canSeeTalentBloomTrial: mapNavigation.canSeeTalentBloomTrial
});
