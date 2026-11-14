import { captureInvestmentSession, investmentSessionIsCurrent, investmentMayEdit, investmentLog } from './loop-investment-session.mjs';
import { buyAscend } from './loop-investment-actions.mjs';
import { buyAscendKeystone } from './ascend-keystone-actions.mjs';

export async function selectClass(runtime, key) {
    const session = captureInvestmentSession(runtime);
    if (!(0, runtime.deps.isAscendancyOfClass)(key, session.owner.selectedClassId)) return;
    const yes = await (0, runtime.deps.requestGameConfirmation)(`[${runtime.deps.CLASS_TEMPLATES[key].name}] 전직을 선택합니다.\n이번 루프에는 다시 변경할 수 없습니다.`, {
        title: (0, runtime.deps._t)('전직 선택'), confirmLabel: (0, runtime.deps._t)('이 전직 선택')
    });
    if (!yes || !investmentSessionIsCurrent(runtime, session)) return;
    const removed = runtime.deps.ascend.select(session.owner, key);
    if (!removed) return;
    if (typeof runtime.deps.clearAscendKeystoneRuntimeState === 'function') (0, runtime.deps.clearAscendKeystoneRuntimeState)(removed, { force: true });
    (0, runtime.deps.updateStaticUI)();
}

/** Keep purchase order and per-node loadout refreshes; skip entries the current points/links cannot buy. */
function allocateLastLoopAscendPlan(runtime, plan) {
    const owner = runtime.deps.game;
    let placed = 0;
    for (const id of plan.nodes) {
        const node = (0, runtime.deps.getClassTreeDef)(owner.ascendClass)[id];
        if (!canReplayAscendNode(runtime, owner, id, node)) continue;
        buyAscend(runtime, id);
        placed += owner.ascendNodes.includes(id) ? 1 : 0;
    }
    for (const id of plan.keystones) {
        const node = (0, runtime.deps.getClassKeystoneDefs)(owner.ascendClass).find(row => row.id === id);
        if (!canReplayAscendKeystone(runtime, owner, id, node)) continue;
        buyAscendKeystone(runtime, id);
        placed += owner.ascendKeystones.includes(id) ? 1 : 0;
    }
    return placed;
}

function canReplayAscendNode(runtime, owner, id, node) {
    if (!node || owner.ascendPoints <= 0 || owner.ascendNodes.includes(id)) return false;
    if (node.exclusive && owner.ascendNodes.includes(node.exclusive)) return false;
    return runtime.deps.ascend.required(owner, node);
}

function canReplayAscendKeystone(runtime, owner, id, node) {
    if (!node || owner.ascendKeystonePoints <= 0 || owner.ascendKeystones.includes(id)) return false;
    if (owner.ascendKeystones.length >= runtime.deps.CLASS_KEYSTONE_PICK_LIMIT) return false;
    return runtime.deps.ascend.keystoneRequired(owner, node);
}

export async function chooseLastLoopAscendPlan(runtime) {
    const session = captureInvestmentSession(runtime), plan = runtime.deps.ascend.lastPlan(session.owner);
    if (!plan || session.owner.ascendClass || !investmentMayEdit(runtime)) return;
    const name = runtime.deps.CLASS_TEMPLATES[plan.ascendClass].name;
    const yes = await (0, runtime.deps.requestGameConfirmation)(`[${name}] 전직을 선택하고 지난 루프의 배치를 다시 할당합니다.\n이번 루프에는 전직을 다시 변경할 수 없습니다.`, {
        title: (0, runtime.deps._t)('지난 루프처럼'), confirmLabel: (0, runtime.deps._t)('이 전직 선택')
    });
    if (!yes || !investmentSessionIsCurrent(runtime, session) || !investmentMayEdit(runtime)) return;
    if (runtime.deps.ascend.lastPlan(session.owner) !== plan) return;
    if (!runtime.deps.ascend.select(session.owner, plan.ascendClass, true)) return;
    const placed = allocateLastLoopAscendPlan(runtime, plan);
    investmentLog(runtime, '[{name}] 지난 루프 배치: {placed}개를 다시 골랐습니다.', 'season-up', { name, placed });
    (0, runtime.deps.updateStaticUI)();
}

export function continueLastLoopAscendPlan(runtime) {
    const plan = runtime.deps.ascend.lastPlan(runtime.deps.game);
    if (!plan || plan.ascendClass !== runtime.deps.game.ascendClass || !investmentMayEdit(runtime)) return;
    const placed = allocateLastLoopAscendPlan(runtime, plan);
    investmentLog(runtime, placed > 0 ? '지난 루프 배치: {placed}개를 더 할당했습니다.' : '지금 할당할 수 있는 다음 노드나 키스톤이 없습니다.',
        placed > 0 ? 'season-up' : 'attack-monster', { placed });
    (0, runtime.deps.updateStaticUI)();
}
