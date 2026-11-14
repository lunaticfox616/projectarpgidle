import { clampFiniteNumber } from './saved-number.mjs';
import { normalizeTabLayoutSettings, normalizeAutomationSettings } from './saved-settings.mjs';
import { normalizeLoopMutationState } from './saved-combat-values.mjs';

export function restorePassiveEvolution(context) {
    context.merged.passiveStarEvolution = !!context.merged.passiveStarEvolution;
    // outer_constellation: 별쐐기 성률로 각성한 옛 저장(각성은 영구히 유지). outer_void: 외곽 공허 소켓 여섯의 초월.
    const awakeningSources = new Set(['legacy_migrated', 'legacy_apex', 'outer_constellation', 'outer_void']);
    context.merged.passiveStarEvolutionSource = context.merged.passiveStarEvolution
        ? (awakeningSources.has(context.merged.passiveStarEvolutionSource) ? context.merged.passiveStarEvolutionSource : 'legacy_migrated')
        : null;
}

export function restoreDisplaySettings(deps, context) {
    context.merged.settings.showDeathNotice = context.merged.settings.showDeathNotice !== false;
    context.merged.settings.uiSounds = context.merged.settings.uiSounds !== false;
    context.merged.settings.runeTimingOff = context.merged.settings.runeTimingOff === true;
    context.merged.settings.soundVolume = clampFiniteNumber(context.merged.settings.soundVolume, 100, 0, 100);
    context.merged.settings.bgm = context.merged.settings.bgm !== false;
    context.merged.settings.bgmVolume = clampFiniteNumber(context.merged.settings.bgmVolume, 70, 0, 100);
    // 라이트 모드는 2026-09 UI 개편에서 제거됐다(다크 전용). 이전 저장의 설정값은 버린다.
    delete context.merged.settings.themeMode;
    context.merged.settings.uiSkin = (0, deps.normalizeUiSkin)(context.merged.settings.uiSkin);
    context.merged.settings.highContrast = context.merged.settings.highContrast === true;
    context.merged.settings.hotkeyOverrides = deps.hotkeyBindings.normalize(context.merged.settings.hotkeyOverrides);
    context.merged.settings.uiScale = (0, deps.normalizeUiScale)(context.merged.settings.uiScale);
    context.merged.settings.uiScaleChosen = context.merged.settings.uiScaleChosen === true ? true : null;
    context.merged.settings.language = deps.i18n.normalizeLanguage(context.merged.settings.language);
    // 표현 선택은 폐기: 갈무리·원화·플레이어 외형으로 고정한다. 획득 기록은 보존한다.
    delete context.merged.settings.uiFont;
    delete context.merged.settings.iconArtStyle;
    delete context.merged.selectedMonsterSkin;
    context.merged.settings.tabLayouts = normalizeTabLayoutSettings(context.save.settings || {});
    ['tabOrder', 'tabPlacement', 'tabGroupOrder', 'tabPlacementInitialized'].forEach(key => delete context.merged.settings[key]);
    context.merged.settings.twoRowTabs = false;
    context.merged.settings.leftPaneCollapsed = !!context.merged.settings.leftPaneCollapsed;
    context.merged.settings.combatLogCollapsed = !!context.merged.settings.combatLogCollapsed;
    context.merged.settings.mobileCombatLogExpanded = context.merged.settings.mobileCombatLogExpanded === true;
    context.merged.settings.hitEmphasis = context.merged.settings.hitEmphasis === 'mild' ? 'mild' : 'normal';
    context.merged.settings.effectIntensity = ['system', 'reduced', 'full'].includes(context.merged.settings.effectIntensity) ? context.merged.settings.effectIntensity : 'system';
}

export function restoreAutomation(deps, context) {
    deps.equipmentLootPolicy.normalizeSettings(context.merged.settings);
    context.merged.settings.autoEnterGrandBreach = !!context.merged.settings.autoEnterGrandBreach;
    context.merged.settings.inventoryViewRarities = { ...(deps.defaultGame.settings.inventoryViewRarities || {}), ...(context.merged.settings.inventoryViewRarities || {}) };
    delete context.merged.settings.jewelAutoSalvageEnabled;
    delete context.merged.settings.jewelAutoSalvageRarities;
    // 주얼 자동 해체는 주얼 창과 함께 없어졌다.
    context.merged.settings.mapCompleteAction = ['nextZone', 'repeatZone', 'nextLoopBestPlusOne', 'stop'].includes(context.merged.settings.mapCompleteAction) ? context.merged.settings.mapCompleteAction : 'nextZone';
    context.merged.settings.actExplorationMode = context.merged.settings.actExplorationMode === 'full' ? 'full' : 'direct';
    normalizeAutomationSettings(context.merged.settings);
    context.merged.settings.disableItemAutomationAfterLoop = context.merged.settings.disableItemAutomationAfterLoop !== false;
    context.merged.settings.postLoopMapCompleteAction = ['nextZone', 'repeatZone', 'nextLoopBestPlusOne', 'stop'].includes(context.merged.settings.postLoopMapCompleteAction) ? context.merged.settings.postLoopMapCompleteAction : 'nextLoopBestPlusOne';
    context.merged.settings.townReturnAction = ['retry', 'stop'].includes(context.merged.settings.townReturnAction) ? context.merged.settings.townReturnAction : 'retry';
}

export function restoreHeroIdentity(deps, context) {
    context.merged.heroSelectionInitialized = !!context.merged.heroSelectionInitialized;
    let hasSavedTalentHero = !!deps.HERO_SELECTION_DEFS[context.save && context.save.selectedHeroId];
    context.merged.selectedHeroId = hasSavedTalentHero ? context.save.selectedHeroId : 'hero1';
    restoreClassFromSavedMotion(deps, context, hasSavedTalentHero);
    restoreClassTalentAlignment(deps, context, hasSavedTalentHero);
}

function restoreClassFromSavedMotion(deps, context, hasSavedTalentHero) {
    let legacyMotionId = context.save && context.save.settings && typeof context.save.settings.testCharacterMotionId === 'string'
        ? context.save.settings.testCharacterMotionId.replace(/^motion_/, '') : '';
    let migratedClassId = deps.PLAYER_CLASS_DEFS[context.save && context.save.selectedClassId]
        ? context.save.selectedClassId
        : (deps.PLAYER_CLASS_DEFS[legacyMotionId] ? legacyMotionId : deps.LEGACY_HERO_TO_PLAYER_CLASS[context.merged.selectedHeroId]);
    context.merged.selectedClassId = deps.PLAYER_CLASS_DEFS[migratedClassId] ? migratedClassId : 'archer';
    if (!hasSavedTalentHero) context.merged.selectedHeroId = deps.PLAYER_CLASS_DEFS[context.merged.selectedClassId].recommendedTalentHeroId;
}

function restoreClassTalentAlignment(deps, context, hasSavedTalentHero) {
    let classTalentAlignmentVersion = Math.max(0, Math.floor(Number(context.save && context.save.classTalentAlignmentVersion) || 0));
    if (classTalentAlignmentVersion < 1 && context.save && context.save.heroSelectionInitialized) {
        context.merged.selectedHeroId = deps.PLAYER_CLASS_DEFS[context.merged.selectedClassId].recommendedTalentHeroId;
    }
    context.merged.classTalentAlignmentVersion = 1;
    let hasSavedTalentInitializedFlag = !!context.save
        && Object.prototype.hasOwnProperty.call(context.save, 'talentSelectionInitialized');
    context.merged.talentSelectionInitialized = hasSavedTalentInitializedFlag
        ? !!context.save.talentSelectionInitialized
        : (hasSavedTalentHero || !!context.merged.heroSelectionInitialized);
}

export function restoreHeroAppearance(deps, context) {
    restoreFixedAppearanceClass(deps, context);
    restoreDiscoveredClasses(deps, context);
    restoreAppearanceMode(deps, context);
}

function restoreFixedAppearanceClass(deps, context) {
    let legacyAppearanceClassId = deps.LEGACY_HERO_TO_PLAYER_CLASS[context.save && context.save.appearanceHeroId];
    context.merged.appearanceClassId = deps.PLAYER_CLASS_DEFS[context.save && context.save.appearanceClassId]
        ? context.save.appearanceClassId
        : (deps.PLAYER_CLASS_DEFS[legacyAppearanceClassId] ? legacyAppearanceClassId : null);
}

function restoreDiscoveredClasses(deps, context) {
    let savedDiscoveredClasses = Array.isArray(context.save && context.save.discoveredClassIds)
        ? context.save.discoveredClassIds
        : (Array.isArray(context.save && context.save.discoveredHeroIds) ? context.save.discoveredHeroIds.map(id => deps.LEGACY_HERO_TO_PLAYER_CLASS[id]) : []);
    context.merged.discoveredClassIds = [...new Set(savedDiscoveredClasses.filter(id => deps.PLAYER_CLASS_DEFS[id]))];
    context.merged.classFreeSwitchUnlocked = !!(context.save && (context.save.classFreeSwitchUnlocked || context.save.heroFreeSwitchUnlocked));
}

function restoreAppearanceMode(deps, context) {
    if ((context.merged.heroSelectionInitialized || context.merged.classFreeSwitchUnlocked) && !context.merged.discoveredClassIds.includes(context.merged.selectedClassId)) {
        context.merged.discoveredClassIds.push(context.merged.selectedClassId);
    }
    context.merged.classFreeSwitchUnlocked = context.merged.classFreeSwitchUnlocked || context.merged.discoveredClassIds.length >= deps.PLAYER_CLASS_ORDER.length;
    context.merged.settings.heroAppearanceMode = ['fixed', 'loop'].includes(context.savedHeroAppearanceMode)
        ? context.savedHeroAppearanceMode
        : (context.merged.appearanceClassId ? 'fixed' : 'loop');
    if (context.merged.settings.heroAppearanceMode === 'fixed' && !context.merged.appearanceClassId) context.merged.appearanceClassId = context.merged.selectedClassId;
    delete context.merged.appearanceHeroId;
    delete context.merged.discoveredHeroIds;
    delete context.merged.heroFreeSwitchUnlocked;
    context.merged.pendingLoopHeroSelection = !!context.merged.pendingLoopHeroSelection;
    normalizeLoopMutationState(context.merged);
}
