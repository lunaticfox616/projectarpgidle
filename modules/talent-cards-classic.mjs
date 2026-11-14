import { TALENT_CARD_LEVEL_THRESHOLDS, TALENT_CARD_MAX_LEVEL, TALENT_BLOOM_DPS_BASE, TALENT_CARD_SLOT_UNLOCKS, TALENT_CARD_SLOT_COUNT } from './data/talent-card-settings.mjs';
import { createTalentCardPresentation } from './ui/talent-card-presentation.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';
import { createTalentCards } from './domain/talent-cards.mjs';

const dependencies = {
    get ASCENDANCIES_BY_PLAYER_CLASS() { return ASCENDANCIES_BY_PLAYER_CLASS; },
    get PLAYER_CLASS_DEFS() { return PLAYER_CLASS_DEFS; },
    get HERO_SELECTION_DEFS() { return HERO_SELECTION_DEFS; },
    get TALENT_BLOOM_CARD_DEFS() { return typeof TALENT_BLOOM_CARD_DEFS === 'undefined' ? undefined : TALENT_BLOOM_CARD_DEFS; },
    get TALENT_PRECISE_CARD_RULES() { return typeof TALENT_PRECISE_CARD_RULES === 'undefined' ? undefined : TALENT_PRECISE_CARD_RULES; },
    get ensureChaosRealmState() { return typeof ensureChaosRealmState === 'undefined' ? undefined : ensureChaosRealmState; },
    get _t() { return _t; },
    get PROJECTILE_PATTERN_MODE_DB() { return typeof PROJECTILE_PATTERN_MODE_DB === 'undefined' ? undefined : PROJECTILE_PATTERN_MODE_DB; },
    get getCombatTime() { return getCombatTime; },
    get forEachActiveKeystoneDef() { return typeof forEachActiveKeystoneDef === 'undefined' ? undefined : forEachActiveKeystoneDef; },
    get collectSocketedJewels() { return typeof collectSocketedJewels === 'undefined' ? undefined : collectSocketedJewels; },
    get UNIQUE_JEWEL_DB() { return typeof UNIQUE_JEWEL_DB === 'undefined' ? undefined : UNIQUE_JEWEL_DB; },
    get P_STATS() { return typeof P_STATS === 'undefined' ? undefined : P_STATS; },
    get getStatName() { return typeof getStatName === 'undefined' ? undefined : getStatName; },
    get getHeroSelectionDef() { return typeof getHeroSelectionDef === 'undefined' ? undefined : getHeroSelectionDef; },
    get CLASS_TEMPLATES() { return typeof CLASS_TEMPLATES === 'undefined' ? undefined : CLASS_TEMPLATES; }
};
const rules = createTalentCards(dependencies);
const presentation = createTalentCardPresentation(dependencies);

const effects = {
    // Resolve optional browser consumers only when their command is reached.
    // The native iterator owns ordering; it never imports or calls UI/save functions.
    get talentLog() { return typeof addLog === 'function' ? addLog.bind(undefined) : () => undefined; },
    get talentRefresh() { return typeof updateStaticUI === 'function' ? updateStaticUI.bind(undefined) : () => undefined; },
    get talentSave() { return typeof queueImportantSave === 'function' ? queueImportantSave.bind(undefined) : () => undefined; }
};
const getTalentBloomHeroIdForAscendancy = rules.getTalentBloomHeroIdForAscendancy;
const getTalentBloomCardKeyForAscendancy = rules.getTalentBloomCardKeyForAscendancy;
const getTalentBloomCardKeys = rules.getTalentBloomCardKeys;
const parseTalentComboKey = rules.parseTalentComboKey;
const getTalentBloomScore = (...args) => rules.getTalentBloomScore(game, ...args);
const getTalentBloomScoreBreakdown = (...args) => rules.getTalentBloomScoreBreakdown(game, ...args);
const getTalentCardLevel = rules.getTalentCardLevel;
const recordTalentBloomCard = (...args) => rules.recordTalentBloomCard(game, ...args);
const getTalentCardEffectParts = presentation.getTalentCardEffectParts;
const getTalentCardName = presentation.getTalentCardName;
const ensureTalentCardLoadout = (...args) => rules.ensureTalentCardLoadout(game, ...args);
const getUnlockedTalentSlotCount = (...args) => rules.getUnlockedTalentSlotCount(game, ...args);
const getTalentCardSlotIndex = (...args) => rules.getTalentCardSlotIndex(game, ...args);
const equipTalentCard = (...args) => consumeDomainCommands(rules.equipTalentCard(game, ...args), effects);
const getActiveTalentCardStatBonuses = (...args) => rules.getActiveTalentCardStatBonuses(game, ...args);
const getTalentMistralStackCount = (...args) => rules.getTalentMistralStackCount(game, ...args);
const grantTalentStoneShield = (...args) => rules.grantTalentStoneShield(game, ...args);
const getTalentMoonReturnConfig = (...args) => rules.getTalentMoonReturnConfig(game, ...args);
const canTalentCardApplyEnemyAilment = (...args) => rules.canTalentCardApplyEnemyAilment(game, ...args);
const isTalentInstantWarcryActive = (...args) => rules.isTalentInstantWarcryActive(game, ...args);
const clearTalentCardRuntimeState = (...args) => rules.clearTalentCardRuntimeState(game, ...args);
const isTalentCardActive = (comboKey, owner = game) => rules.isTalentCardActive(owner, comboKey);
const refreshGrantedBloomMechanics = (owner = game) => rules.refreshGrantedBloomMechanics(owner);
const getGrantedBloomMechanics = (owner = game) => rules.getGrantedBloomMechanics(owner);
const talentOnPlayerAttack = (...args) => rules.talentOnPlayerAttack(game, ...args);
const getTalentAlwaysHit = (...args) => rules.getTalentAlwaysHit(game, ...args);
const getTalentAttackDamageMul = (...args) => rules.getTalentAttackDamageMul(game, ...args);
const getActiveTalentStatMap = (...args) => rules.getActiveTalentStatMap(game, ...args);
const getActiveTalentKeystoneUniqueEffects = (...args) => rules.getActiveTalentKeystoneUniqueEffects(game, ...args);
const TALENT_BLOOM_TOTAL_CARDS = typeof ASCENDANCIES_BY_PLAYER_CLASS === 'object' && typeof PLAYER_CLASS_DEFS === 'object'
    ? getTalentBloomCardKeys().length : Object.keys(TALENT_BLOOM_CARD_DEFS).length;
safeExposeGlobals({ getTalentBloomHeroIdForAscendancy, getTalentBloomCardKeyForAscendancy, getTalentBloomCardKeys, parseTalentComboKey, getTalentBloomScore, getTalentBloomScoreBreakdown, getTalentCardLevel, recordTalentBloomCard, getTalentCardEffectParts, getTalentCardName, ensureTalentCardLoadout, getUnlockedTalentSlotCount, getTalentCardSlotIndex, equipTalentCard, getActiveTalentCardStatBonuses, getTalentMistralStackCount, grantTalentStoneShield, getTalentMoonReturnConfig, canTalentCardApplyEnemyAilment, isTalentInstantWarcryActive, clearTalentCardRuntimeState, isTalentCardActive, refreshGrantedBloomMechanics, getGrantedBloomMechanics, talentOnPlayerAttack, getTalentAlwaysHit, getTalentAttackDamageMul, getActiveTalentStatMap, getActiveTalentKeystoneUniqueEffects, TALENT_CARD_LEVEL_THRESHOLDS, TALENT_CARD_MAX_LEVEL, TALENT_BLOOM_DPS_BASE, TALENT_CARD_SLOT_UNLOCKS, TALENT_CARD_SLOT_COUNT, TALENT_BLOOM_TOTAL_CARDS });
