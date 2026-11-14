import { bloomGetTalentBloomHeroIdForAscendancy, bloomGetTalentBloomCardKeyForAscendancy, bloomGetTalentBloomCardKeys, bloomParseTalentComboKey } from './talent-card-definitions.mjs';
import { bloomGetTalentBloomScore, bloomGetTalentBloomScoreBreakdown, bloomGetTalentCardLevel, bloomRecordTalentBloomCard } from './talent-card-progress.mjs';
import { bloomEquipTalentCard } from './talent-card-loadout.mjs';
import { bloomEnsureTalentCardLoadout, bloomGetUnlockedTalentSlotCount, bloomGetTalentCardSlotIndex } from './talent-card-slots.mjs';
import { bloomGetActiveTalentCardStatBonuses, bloomGetActiveTalentStatMap, bloomGetActiveTalentKeystoneUniqueEffects } from './talent-card-stats.mjs';
import { bloomGetTalentMistralStackCount, bloomGrantTalentStoneShield, bloomGetTalentMoonReturnConfig, bloomCanTalentCardApplyEnemyAilment, bloomIsTalentInstantWarcryActive, bloomClearTalentCardRuntimeState, bloomTalentOnPlayerAttack, bloomGetTalentAlwaysHit, bloomGetTalentAttackDamageMul } from './talent-card-runtime.mjs';
import { bloomIsTalentCardActive, bloomRefreshGrantedBloomMechanics, bloomGetGrantedBloomMechanics } from './talent-card-mechanics.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createTalentCards(deps) {
    const env = { deps };
    env.talentGrantedMechanicsByOwner = new WeakMap();
    return Object.freeze({
        getTalentBloomHeroIdForAscendancy: (...args) => bloomGetTalentBloomHeroIdForAscendancy(env, ...args),
        getTalentBloomCardKeyForAscendancy: (...args) => bloomGetTalentBloomCardKeyForAscendancy(env, ...args),
        getTalentBloomCardKeys: (...args) => bloomGetTalentBloomCardKeys(env, ...args),
        parseTalentComboKey: bloomParseTalentComboKey,
        getTalentBloomScore: (...args) => bloomGetTalentBloomScore(env, ...args),
        getTalentBloomScoreBreakdown: (...args) => bloomGetTalentBloomScoreBreakdown(env, ...args),
        getTalentCardLevel: (...args) => bloomGetTalentCardLevel(...args),
        recordTalentBloomCard: (...args) => bloomRecordTalentBloomCard(env, ...args),
        ensureTalentCardLoadout: (...args) => bloomEnsureTalentCardLoadout(...args),
        getUnlockedTalentSlotCount: (...args) => bloomGetUnlockedTalentSlotCount(...args),
        getTalentCardSlotIndex: (...args) => bloomGetTalentCardSlotIndex(...args),
        equipTalentCard: (...args) => bloomEquipTalentCard(env, ...args),
        getActiveTalentCardStatBonuses: (...args) => bloomGetActiveTalentCardStatBonuses(env, ...args),
        getTalentMistralStackCount: (...args) => bloomGetTalentMistralStackCount(env, ...args),
        grantTalentStoneShield: (...args) => bloomGrantTalentStoneShield(env, ...args),
        getTalentMoonReturnConfig: (...args) => bloomGetTalentMoonReturnConfig(env, ...args),
        canTalentCardApplyEnemyAilment: (...args) => bloomCanTalentCardApplyEnemyAilment(env, ...args),
        isTalentInstantWarcryActive: (...args) => bloomIsTalentInstantWarcryActive(env, ...args),
        clearTalentCardRuntimeState: bloomClearTalentCardRuntimeState,
        isTalentCardActive: (...args) => bloomIsTalentCardActive(env, ...args),
        refreshGrantedBloomMechanics: (...args) => bloomRefreshGrantedBloomMechanics(env, ...args),
        getGrantedBloomMechanics: (...args) => bloomGetGrantedBloomMechanics(env, ...args),
        talentOnPlayerAttack: (...args) => bloomTalentOnPlayerAttack(env, ...args),
        getTalentAlwaysHit: (...args) => bloomGetTalentAlwaysHit(env, ...args),
        getTalentAttackDamageMul: (...args) => bloomGetTalentAttackDamageMul(env, ...args),
        getActiveTalentStatMap: (...args) => bloomGetActiveTalentStatMap(env, ...args),
        getActiveTalentKeystoneUniqueEffects: (...args) => bloomGetActiveTalentKeystoneUniqueEffects(env, ...args)
    });
}
