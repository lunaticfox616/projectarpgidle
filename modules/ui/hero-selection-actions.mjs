import { syncHeroSelectionState, renderHeroSelectionControls } from './hero-selection-controls.mjs';

export function persistHeroSelectionChange({ deps }, reason) {
    if (!deps.saveGame({ skipCloudSync: true })) return;
    if (typeof deps.requestImmediateCloudSave === 'function') deps.requestImmediateCloudSave(reason || '플레이어 직업 변경');
}

export function applyHeroSelection(runtime, id, options = {}) {
    const { deps } = runtime, owner = deps.game;
    if (!deps.rules.validClass(id)) return false;
    if (options.cosmeticOnly) return applyCosmetic(runtime, id, options);
    const previous = owner.selectedClassId, look = deps.rules.appearance(owner);
    const refunded = deps.rebasePassiveTreeForClassChange(previous, id);
    deps.rules.select(owner, id, options);
    if (previous !== id || refunded > 0) {
        deps.calculateReachableNodes();
        deps.refreshPassiveVisibility();
    }
    syncHeroSelectionState(runtime, null, { recordSelected: true });
    refreshAppearance(runtime, look);
    renderHeroSelectionControls(runtime);
    if (!options.silent) reportClassChange(runtime, id, previous, refunded);
    if (!options.skipSave) persistHeroSelectionChange(runtime, '플레이어 직업 변경');
    return true;
}

function reportClassChange({ deps }, id, previous, refunded) {
    if (previous !== id) deps.addLog(deps._t('직업 변경: {label}', { label: deps._t(deps.rules.definition(id).label) }), 'season-up');
    if (refunded > 0) deps.addLog(deps._t('직업 시작점 변경으로 패시브 {refundedPassiveCount}개를 반환했습니다.', { refundedPassiveCount: refunded }), 'season-up');
}

function applyCosmetic(runtime, id, options) {
    const { deps } = runtime, look = deps.rules.appearance(deps.game);
    if (!deps.rules.cosmetic(deps.game, id)) return false;
    syncHeroSelectionState(runtime);
    refreshAppearance(runtime, look);
    renderHeroSelectionControls(runtime);
    if (!options.silent && look !== id) deps.addLog(deps._t('캐릭터 외형 변경: {label}', { label: deps._t(deps.rules.definition(id).label) }), 'season-up');
    if (!options.skipSave) persistHeroSelectionChange(runtime, '캐릭터 외형 변경');
    return true;
}

export function applyHeroAppearanceMode(runtime, value, options = {}) {
    const { deps } = runtime, look = deps.rules.appearance(deps.game);
    const changed = deps.rules.mode(deps.game, value);
    syncHeroSelectionState(runtime);
    refreshAppearance(runtime, look);
    renderHeroSelectionControls(runtime);
    if (!options.silent && changed) {
        const label = deps.game.settings.heroAppearanceMode === 'fixed' ? deps._t('고정') : deps._t('현재 직업 연동');
        deps.addLog(deps._t('캐릭터 외형 방식: {label}', { label }), 'season-up');
    }
    if (!options.skipSave && changed) persistHeroSelectionChange(runtime, '캐릭터 외형 방식 변경');
    return changed;
}

function refreshAppearance({ deps }, previous) {
    if (previous !== deps.rules.appearance(deps.game) && deps.battleAssets?.ready) deps.battleAssets.atlas = deps.buildBattleAssetAtlas();
}
