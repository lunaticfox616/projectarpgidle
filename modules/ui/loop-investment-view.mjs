import { buySeason, refundSeasonNode, buyAscend, askRefundSeasonNode, askRefundAscendNode, refundPassiveNode } from './loop-investment-actions.mjs';
import { buyAscendKeystone, refundAscendKeystone, enforceWarriorDualTrainingEquipment } from './ascend-keystone-actions.mjs';
import { resetInvestmentGroup } from './loop-investment-reset.mjs';
import { selectClass, chooseLastLoopAscendPlan, continueLastLoopAscendPlan } from './ascend-plan-actions.mjs';
import { fillAscendancyPickScreen, getAscendancyPlanContinueHtml } from './ascend-plan-markup.mjs';
import { loopOrbitCenterHtml, loopPassiveHint, loopPassivePress } from './loop-investment-markup.mjs';
import { syncInvestmentSelection } from './loop-investment-session.mjs';
import { installLoopInvestmentEvents } from './loop-investment-events.mjs';
import { releaseViewEvents } from './view-events.mjs';

export function createLoopInvestmentView(deps) {
    const runtime = { deps, active: true, shown: null, pressed: null, selectionSession: null, listeners: [], handlers: {} };
    const actions = { buySeason, refundSeasonNode, buyAscend, askRefundSeasonNode, askRefundAscendNode, refundPassiveNode,
        buyAscendKeystone, refundAscendKeystone, enforceWarriorDualTrainingEquipment, selectClass,
        chooseLastLoopAscendPlan, continueLastLoopAscendPlan, fillAscendancyPickScreen, getAscendancyPlanContinueHtml,
        loopOrbitCenterHtml, loopPassiveHint, loopPassivePress };
    for (const [name, action] of Object.entries(actions)) {
        runtime.handlers[name] = (...args) => {
            if (!runtime.active) return;
            syncInvestmentSelection(runtime);
            return action(runtime, ...args);
        };
    }
    Object.assign(runtime.handlers, investmentQueries(deps), {
        resetSeasonNodes: () => resetInvestmentGroup(runtime, 'season'),
        resetAscendNodes: () => resetInvestmentGroup(runtime, 'ascend'),
        resetAscendKeystones: () => resetInvestmentGroup(runtime, 'keystones')
    });
    installLoopInvestmentEvents(runtime);
    return Object.freeze({ ...runtime.handlers, dispose() { releaseViewEvents(runtime); runtime.selectionSession = null; } });
}

function investmentQueries(deps) {
    return {
        isSeasonNodeRequirementMet: node => deps.season.required(deps.game, node),
        getSeasonNodeLevel: id => deps.season.level(deps.game, id),
        isSeasonTreeEvolved: () => deps.season.evolved(deps.game),
        canInvestSeasonNode: (node, id) => deps.season.canInvest(deps.game, node, id),
        getSeasonNodeCap: node => deps.season.cap(deps.game, node),
        hasSpendableSeasonPoint: () => deps.season.spendable(deps.game),
        isAscendNodeRequirementMet: node => deps.ascend.required(deps.game, node),
        isAscendKeystoneRequirementMet: node => deps.ascend.keystoneRequired(deps.game, node),
        canRefundPassiveNode: id => deps.passive.canRefund(deps.game, id)
    };
}
