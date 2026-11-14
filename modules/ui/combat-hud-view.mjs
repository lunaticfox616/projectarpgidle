import { COMBAT_EFFECT_PRESENTATION, createRuntimeEffectDetails } from './combat-hud-definitions.mjs';
import { renderCombatSkillSlot, bindCombatSkillSlot, renderCombatSkillHud } from './combat-hud-skills.mjs';
import { createUpdateUiEnemyTraitPanel } from './combat-hud-traits.mjs';
import { showEnemyTraitTooltip, onEnemyTraitKey, syncEnemyTraitTooltip, hideEnemyTraitTooltip } from './combat-hud-tooltip.mjs';
import { setTextById, setElementText, formatSettingNumber, formatCappedResistanceValue, renderEnergyShieldInline } from './combat-hud-values.mjs';
import { primeEnemyHpDamageGhost, updateEnemyHpDamageGhost } from './combat-hud-hp-ghost.mjs';
import { setCombatProgressGaugePercent, getUiExperienceProgress } from './combat-hud-progress.mjs';
import { getUiCombatEffectPresentation, getUiRuntimeEffectDetail } from './combat-hud-effect-icons.mjs';
import { getConditionEffectTitle } from './combat-hud-effect-details.mjs';
import { updatePlayerCombatEffectHud } from './combat-hud-effect-strip.mjs';
import { updateCombatUI } from './combat-hud-update.mjs';
import { syncCombatHudOwner, disposeCombatHud } from './combat-hud-lifetime.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createCombatHudView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, owner: null,
        listeners: [], skillHost: null, trait: null, traitFrame: null, levelAnimation: null };
    const handlers = { renderCombatSkillSlot, bindCombatSkillSlot, showEnemyTraitTooltip, setTextById, setElementText, primeEnemyHpDamageGhost, updateEnemyHpDamageGhost, formatSettingNumber, formatCappedResistanceValue, renderCombatSkillHud, setCombatProgressGaugePercent, getUiCombatEffectPresentation, getUiRuntimeEffectDetail, getUiExperienceProgress, getConditionEffectTitle, updatePlayerCombatEffectHud, renderEnergyShieldInline, updateCombatUI, onEnemyTraitKey, syncEnemyTraitTooltip, hideEnemyTraitTooltip };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    for (const name of ['primeEnemyHpDamageGhost', 'updateEnemyHpDamageGhost', 'renderCombatSkillHud', 'updatePlayerCombatEffectHud', 'updateCombatUI', 'showEnemyTraitTooltip', 'syncEnemyTraitTooltip']) {
        const handler = runtime.handlers[name];
        runtime.handlers[name] = function combatHudCall(...args) {
            if (syncCombatHudOwner(runtime)) return handler(...args);
        };
    }
    initialize(runtime);
    runtime.handlers.updateUiEnemyTraitPanel = createUpdateUiEnemyTraitPanel(runtime);
    runtime.api = { setTextById: runtime.handlers.setTextById, setElementText: runtime.handlers.setElementText, primeEnemyHpDamageGhost: runtime.handlers.primeEnemyHpDamageGhost, updateEnemyHpDamageGhost: runtime.handlers.updateEnemyHpDamageGhost, formatSettingNumber: runtime.handlers.formatSettingNumber, formatCappedResistanceValue: runtime.handlers.formatCappedResistanceValue, renderCombatSkillHud: runtime.handlers.renderCombatSkillHud, setCombatProgressGaugePercent: runtime.handlers.setCombatProgressGaugePercent, getUiCombatEffectPresentation: runtime.handlers.getUiCombatEffectPresentation, getUiRuntimeEffectDetail: runtime.handlers.getUiRuntimeEffectDetail, getUiExperienceProgress: runtime.handlers.getUiExperienceProgress, getConditionEffectTitle: runtime.handlers.getConditionEffectTitle, updatePlayerCombatEffectHud: runtime.handlers.updatePlayerCombatEffectHud, showEnemyTraitTooltip: runtime.handlers.showEnemyTraitTooltip, renderEnergyShieldInline: runtime.handlers.renderEnergyShieldInline, updateCombatUI: runtime.handlers.updateCombatUI };
    runtime.handlers.showEnemyTraitTooltip.onKey = runtime.handlers.onEnemyTraitKey;
    runtime.handlers.showEnemyTraitTooltip.sync = runtime.handlers.syncEnemyTraitTooltip;
    runtime.handlers.showEnemyTraitTooltip.hide = runtime.handlers.hideEnemyTraitTooltip;
    runtime.api.dispose = () => disposeCombatHud(runtime);
    return Object.freeze(runtime.api);
}

function initialize(runtime) {
    runtime.state.playerHpDamageGhostPct = null;
    runtime.state.playerHpDamageGhostLastPct = null;
    runtime.state.playerHpDamageGhostLastAt = 0;
    runtime.state.playerHpDamageGhostHoldUntil = 0;
    runtime.state.enemyHpDamageGhostStates = new Map();
    runtime.state.PLAYER_HP_DAMAGE_GHOST_HOLD_MS = 260;
    runtime.state.PLAYER_HP_DAMAGE_GHOST_DECAY_PCT_PER_SEC = 34;
    runtime.state.ENEMY_HP_DAMAGE_GHOST_SNAP_MS = 680;
    runtime.state.COMBAT_SKILL_HUD_LIMIT = 6;
    runtime.state.COMBAT_SKILL_SLOT_LABELS = Object.freeze({ primary: '주 공격', mobility: '이동 스킬', summon: '소환' });
    runtime.state.combatSkillCooldownSpans = new Map();
    runtime.state.MAP_PROGRESS_SPEAKING_TYPES = Object.freeze(['grandBreach', 'woodsmanEcho', 'colony', 'oceanDepth']);
    runtime.state.UI_COMBAT_EFFECT_PRESENTATION = COMBAT_EFFECT_PRESENTATION;
    runtime.state.UI_RUNTIME_EFFECT_DETAILS = createRuntimeEffectDetails(runtime);
    runtime.state.hudShownLevel = 0;
}
