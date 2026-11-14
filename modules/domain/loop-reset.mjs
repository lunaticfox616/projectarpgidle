import { loopFlowApplyLoopHeroSelection, loopFlowRequestLoopHeroSelection } from './loop-hero-selection.mjs';
import { loopFlowMarkLoopSpecialBossKill, loopFlowAddWoodsmanPendingScore, loopFlowFinishWoodsmanEntrance, loopFlowEnterOutsideChaos, loopFlowDressWoodsmanEchoDummy, loopFlowEnterWoodsmanEchoChallenge } from './loop-woodsman-entry.mjs';
import { loopFlowGetHeldGearLoopBlockReason } from './loop-progress.mjs';
import { loopFlowClearLoopItemStorage } from './loop-preservation.mjs';
import { loopFlowTriggerSeasonReset } from './loop-transition.mjs';
import { loopFlowHandleSeasonLoopConditionMet, loopFlowConfirmLoopReady, loopFlowChooseLoopAdvancePath, loopFlowChooseLoopAdvance } from './loop-gates.mjs';

/** Loop rules receive the target state explicitly and yield synchronous presentation/save commands.
 * Legacy dependency ports are composed at bootstrap; no browser or storage APIs belong here. */
export function createLoopReset(deps) {
    const env = { deps };
    env.WOODSMAN_ENTRANCE_DELAY_SECONDS = 3;
    return Object.freeze({
        applyLoopHeroSelection: (...args) => loopFlowApplyLoopHeroSelection(env, ...args),
        requestLoopHeroSelection: loopFlowRequestLoopHeroSelection,
        markLoopSpecialBossKill: loopFlowMarkLoopSpecialBossKill,
        addWoodsmanPendingScore: loopFlowAddWoodsmanPendingScore,
        finishWoodsmanEntrance: (...args) => loopFlowFinishWoodsmanEntrance(env, ...args),
        enterOutsideChaos: (...args) => loopFlowEnterOutsideChaos(env, ...args),
        dressWoodsmanEchoDummy: loopFlowDressWoodsmanEchoDummy,
        enterWoodsmanEchoChallenge: (...args) => loopFlowEnterWoodsmanEchoChallenge(env, ...args),
        getHeldGearLoopBlockReason: (...args) => loopFlowGetHeldGearLoopBlockReason(env, ...args),
        clearLoopItemStorage: loopFlowClearLoopItemStorage,
        triggerSeasonReset: (...args) => loopFlowTriggerSeasonReset(env, ...args),
        handleSeasonLoopConditionMet: (...args) => loopFlowHandleSeasonLoopConditionMet(env, ...args),
        confirmLoopReady: (...args) => loopFlowConfirmLoopReady(env, ...args),
        chooseLoopAdvancePath: (...args) => loopFlowChooseLoopAdvancePath(env, ...args),
        chooseLoopAdvance: (...args) => loopFlowChooseLoopAdvance(env, ...args)
    });
}
