import { renderAttackGemLibrary, renderLibraryActions, syncPickerHead } from './skill-library-actions.mjs';
import { renderSkillEnhancement } from './skill-enhancement-render.mjs';
function skillScreenStats(runtime, context) {
    return context.pStats || (typeof runtime.deps.getPlayerStats === 'function' ? runtime.deps.getPlayerStats() : {});
}
export function renderSkillGemScreen(runtime, context) {
    let ctx = context || {};
    let pStats = skillScreenStats(runtime, ctx);
    let sf = ctx.searchFilters || (typeof runtime.deps.getSearchFilterState === 'function' ? (0, runtime.deps.getSearchFilterState)() : {});
    let foldAttackInactive = !!runtime.deps.game.gemFoldInactiveAttack;
    let foldSupportInactive = !!runtime.deps.game.gemFoldInactiveSupport;
    let pickerKind = runtime.deps.skillGemBoardUi.currentKind();
    let effectiveResonanceCap = (0, runtime.deps.getEffectiveResonanceCap)(pStats);
    let skyTowerSignatureState = (typeof runtime.deps.ensureSkyTowerState === 'function') ? (0, runtime.deps.ensureSkyTowerState)() : null;
    const skillPanelRenderSignature = skillScreenSignature(runtime, { pStats, sf, foldAttackInactive, foldSupportInactive, pickerKind, effectiveResonanceCap, skyTowerSignatureState });
    if (skillPanelRenderSignature === runtime.state.lastSkillPanelRenderSignature) return;
    runtime.state.lastSkillPanelRenderSignature = skillPanelRenderSignature;
    runtime.deps.skillGemBoardUi.render(pStats);
    let sealedSupports = Array.isArray(runtime.deps.game.sealedSupports) ? runtime.deps.game.sealedSupports : [];
    renderAttackGemLibrary(runtime, pStats, sf.skill, foldAttackInactive);
    let supportHtml = runtime.handlers.renderGemLibrary('support', runtime.deps.game.supports, sealedSupports, pStats, sf.support);
    let supportListEl = runtime.deps.document.getElementById('ui-support-list');
    let supportActions = renderLibraryActions(runtime, 'support', foldSupportInactive);
    let supportRenderSig = `${supportHtml}::${supportActions}`;
    if (supportListEl && supportListEl.dataset.renderSig !== supportRenderSig) {
        (0, runtime.deps.renderSearchSection)('ui-support-list', 'support', '보조스킬룬 이름/효과 검색', supportHtml, '', supportActions);
        supportListEl = runtime.deps.document.getElementById('ui-support-list');
        supportListEl.dataset.renderSig = supportRenderSig;
    }
    syncPickerHead(runtime, pickerKind, pStats);
    renderSkillEnhancement(runtime, pStats);
}
function skillLoadoutSignature(runtime) {
    return {skills: runtime.deps.game.skills || [],
        supports: runtime.deps.game.supports || [],
        equippedSupports: runtime.deps.game.equippedSupports || [],
        equippedSummonSkills: runtime.deps.game.equippedSummonSkills || [],
        summonSkillCounts: runtime.deps.game.summonSkillCounts || {},
        sealedSkills: runtime.deps.game.sealedSkills || [],
        sealedSupports: runtime.deps.game.sealedSupports || []};
}

function skillRecordSignature(runtime) {
    return {gemData: runtime.deps.game.gemData || {},
        supportGemData: runtime.deps.game.supportGemData || {},
        skyGemEnhancements: runtime.deps.game.skyGemEnhancements || {},
        gemEnhanceTargetSkill: runtime.deps.game.gemEnhanceTargetSkill || '',
        runeSpares: runtime.deps.game.runeSpares || {}};
}

function skillResourceSignature(runtime, view) {
    const { skyTowerSignatureState } = view;
    return {currencies: {
            bossCore: runtime.deps.game.currencies.bossCore || 0,
            skyEssence: runtime.deps.game.currencies.skyEssence || 0,
            awakenedEcho: runtime.deps.game.currencies.awakenedEcho || 0,
        },
        skyTower: {
            condensedPower: Math.max(0, Math.floor((skyTowerSignatureState && skyTowerSignatureState.condensedPower) || 0)),
            gemBoosts: (skyTowerSignatureState && skyTowerSignatureState.gemBoosts) || {}
    }};
}

function skillScreenSignature(runtime, view) {
    const { pickerKind, sf, foldAttackInactive, foldSupportInactive, pStats, effectiveResonanceCap } = view;
    return JSON.stringify({libraryPages: runtime.state.libraryPages,
        pickerKind: pickerKind,
        engraving: runtime.deps.contentProgression.isUnlocked('engraving'),
        mobileLibrary: runtime.deps.uiDisplay.matches('(max-width: 1080px)'),
        activeSkill: runtime.deps.game.activeSkill || '',
        mobilitySkill: runtime.deps.game.mobilitySkill,
        buildLocked: !!runtime.deps.game.woodsmanBuildLock,
        ...skillLoadoutSignature(runtime), ...skillRecordSignature(runtime), ...skillResourceSignature(runtime, view),
        filters: { skill: sf.skill || '', support: sf.support || '' },
        foldAttackInactive: foldAttackInactive,
        foldSupportInactive: foldSupportInactive,
        suppCap: pStats.suppCap || 0,
        resonanceCap: effectiveResonanceCap,
        gemEnhanceUnlocked: !!runtime.deps.game.gemEnhanceUnlocked,
        gemAwakening: runtime.deps.contentProgression.isUnlocked('gemAwakening'),
        season: runtime.deps.game.season || 1});
}
