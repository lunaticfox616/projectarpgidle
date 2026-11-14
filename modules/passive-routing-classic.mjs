// Temporary boundary for classic callers in passives, rendering and save restoration.
// Remove this adapter and its build entry after those consumers import the module.
// The existing global name and script position are preserved; no async startup.
import { transcendentNodeIds, transcendentValue, freeNodes, paleBonus, pointBudget,
    settlePoints, connected, reconcile, voidStats } from './passive-routing.mjs';

function freeNodesForGame(tree, state) {
    return freeNodes(tree, state, TRANSCENDENT_ANDROMEDA_RADIUS);
}
const passiveRouting = { transcendentNodeIds, transcendentValue, freeNodes: freeNodesForGame,
    paleBonus, pointBudget, settlePoints, connected, reconcile, voidStats };
safeExposeGlobals({ passiveRouting });
