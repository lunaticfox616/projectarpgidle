import { releaseViewEvents } from './view-events.mjs';
import { openGemEngraveSlotOverlay, closeGemEngraveSlotOverlay } from './gem-engrave-dialog.mjs';
import { changeSkill } from './gem-loadout-actions.mjs';
import { getSkillGemArtPath } from './gem-card-markup.mjs';
import { toggleGemFoldMode, getGemCardMeta, renderSkillGemArt, renderGemTagChips, getGemTileSummary, renderGemTileLevel, renderAttackGemCard, renderSupportGemCard, showGemCardHint, getGemGrowthSummaryHtml, renderGemEnhanceTargetCard, renderGemResourceStrip } from './gem-card-markup.mjs';
import { renderGemEngraveSlots, renderSkyEnhancementIcon, renderPixelIcon, getSkyEnhancementGroup, renderSkyEnhancementOption, renderGemEngraveOverlayOption } from './gem-engraving-markup.mjs';
import { normalizeEquippedSummonAttackSkills, getSummonSkillCount, getEquippedSummonCount, getSummonEquipCapFromStats, getSupportTierResonanceCost, getSupportActiveTier } from './../domain/gem-loadout-state.mjs';
import { changeSummonSkillCount, toggleSummonAttackGem, wearMobilityGem, wearMobilityRune, openEquippedGemManagement, getEffectiveResonanceCap, setSupportActiveTier, toggleSupport } from './gem-loadout-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createGemCardsView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { toggleGemFoldMode, getGemCardMeta, renderSkillGemArt, renderGemTagChips, getGemTileSummary, renderGemTileLevel, renderAttackGemCard, renderSupportGemCard, showGemCardHint, getGemGrowthSummaryHtml, renderGemEnhanceTargetCard, renderGemResourceStrip, renderGemEngraveSlots, renderSkyEnhancementIcon, renderPixelIcon, getSkyEnhancementGroup, renderSkyEnhancementOption, renderGemEngraveOverlayOption, normalizeEquippedSummonAttackSkills, getSummonSkillCount, getEquippedSummonCount, getSummonEquipCapFromStats, changeSummonSkillCount, toggleSummonAttackGem, wearMobilityGem, wearMobilityRune, openEquippedGemManagement, getEffectiveResonanceCap, getSupportTierResonanceCost, getSupportActiveTier, setSupportActiveTier, toggleSupport };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);

    runtime.api = { toggleGemFoldMode: runtime.handlers.toggleGemFoldMode, getGemCardMeta: runtime.handlers.getGemCardMeta, renderSkillGemArt: runtime.handlers.renderSkillGemArt, renderGemTagChips: runtime.handlers.renderGemTagChips, getGemTileSummary: runtime.handlers.getGemTileSummary, renderGemTileLevel: runtime.handlers.renderGemTileLevel, renderAttackGemCard: runtime.handlers.renderAttackGemCard, renderSupportGemCard: runtime.handlers.renderSupportGemCard, showGemCardHint: runtime.handlers.showGemCardHint, getGemGrowthSummaryHtml: runtime.handlers.getGemGrowthSummaryHtml, renderGemEnhanceTargetCard: runtime.handlers.renderGemEnhanceTargetCard, renderGemResourceStrip: runtime.handlers.renderGemResourceStrip, renderGemEngraveSlots: runtime.handlers.renderGemEngraveSlots, renderSkyEnhancementIcon: runtime.handlers.renderSkyEnhancementIcon, renderPixelIcon: runtime.handlers.renderPixelIcon, getSkyEnhancementGroup: runtime.handlers.getSkyEnhancementGroup, renderSkyEnhancementOption: runtime.handlers.renderSkyEnhancementOption, renderGemEngraveOverlayOption: runtime.handlers.renderGemEngraveOverlayOption, normalizeEquippedSummonAttackSkills: runtime.handlers.normalizeEquippedSummonAttackSkills, getSummonSkillCount: runtime.handlers.getSummonSkillCount, getEquippedSummonCount: runtime.handlers.getEquippedSummonCount, getSummonEquipCapFromStats: runtime.handlers.getSummonEquipCapFromStats, changeSummonSkillCount: runtime.handlers.changeSummonSkillCount, toggleSummonAttackGem: runtime.handlers.toggleSummonAttackGem, wearMobilityGem: runtime.handlers.wearMobilityGem, wearMobilityRune: runtime.handlers.wearMobilityRune, openEquippedGemManagement: runtime.handlers.openEquippedGemManagement, getEffectiveResonanceCap: runtime.handlers.getEffectiveResonanceCap, getSupportTierResonanceCost: runtime.handlers.getSupportTierResonanceCost, getSupportActiveTier: runtime.handlers.getSupportActiveTier, setSupportActiveTier: runtime.handlers.setSupportActiveTier, toggleSupport: runtime.handlers.toggleSupport , dispose: () => disposeGemCards(runtime) };

    runtime.handlers.openGemEngraveSlotOverlay = index => openGemEngraveSlotOverlay(runtime, index);
    runtime.api.openGemEngraveSlotOverlay = runtime.handlers.openGemEngraveSlotOverlay;
    runtime.api.closeGemEngraveSlotOverlay = () => closeGemEngraveSlotOverlay(runtime);
    runtime.api.changeSkill = (name, slotKind) => changeSkill(runtime, name, slotKind);
    runtime.api.getSkillGemArtPath = name => getSkillGemArtPath(runtime, name);
    return runtime.api;
}

function disposeGemCards(runtime) {
    closeGemEngraveSlotOverlay(runtime, false);
    releaseViewEvents(runtime); if (runtime.state.engraveRoot) delete runtime.state.engraveRoot.dataset.engraveSlotControlsBound; runtime.state.engraveRoot = null;
}
