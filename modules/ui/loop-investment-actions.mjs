import { captureInvestmentSession, investmentSessionIsCurrent, investmentMayEdit, investmentLog } from './loop-investment-session.mjs';

export async function buySeason(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const session = captureInvestmentSession(runtime);
    const result = runtime.deps.season.buy(session.owner, id);
    if (result === 'changed') return (0, runtime.deps.updateStaticUI)();
    if (result !== 'maximum') return;
    const yes = await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)('이미 최대 단계인 노드입니다.\n마름병 포자 1개를 사용해 반환하시겠습니까?'), {
        title: (0, runtime.deps._t)('최대 단계 노드 반환'), tone: 'danger', confirmLabel: (0, runtime.deps._t)('노드 반환')
    });
    if (yes && investmentSessionIsCurrent(runtime, session)) return refundSeasonNode(runtime, id);
}

export function refundSeasonNode(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const status = runtime.deps.season.refund(runtime.deps.game, id);
    const messages = {
        'inner-owned': '내부 마법진 패시브를 먼저 반환해야 우로보로스 몸통을 해제할 수 있습니다.',
        dependent: '선행 조건으로 연결된 루프 패시브가 있어 반환할 수 없습니다.',
        'no-spores': '루프 패시브 반환에는 마름병 포자 1개가 필요합니다.'
    };
    if (messages[status]) return investmentLog(runtime, messages[status]);
    if (status === 'changed') (0, runtime.deps.updateStaticUI)();
}

export function buyAscend(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const status = runtime.deps.ascend.buy(runtime.deps.game, id);
    if (status === 'exclusive') return investmentLog(runtime, '같은 계열의 노드는 둘 중 하나만 할당할 수 있습니다.');
    if (status !== 'changed') return;
    (0, runtime.deps.normalizeSupportLoadout)(true);
    (0, runtime.deps.updateStaticUI)();
}

function refundAscendNode(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const status = runtime.deps.ascend.refund(runtime.deps.game, id);
    if (status === 'dependent') return investmentLog(runtime, '이 노드를 선행으로 둔 전직 노드가 있어 반환할 수 없습니다.');
    if (status === 'no-spores') return investmentLog(runtime, '전직 노드 반환에는 마름병 포자 1개가 필요합니다.');
    if (status !== 'changed') return;
    (0, runtime.deps.normalizeSupportLoadout)(true);
    (0, runtime.deps.updateStaticUI)();
}

export async function askRefundSeasonNode(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const session = captureInvestmentSession(runtime);
    const yes = await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)('선택한 루프 패시브를 반환하고 마름병 포자 1개를 소모합니다.'), {
        title: (0, runtime.deps._t)('루프 패시브 반환'), tone: 'danger', confirmLabel: (0, runtime.deps._t)('노드 반환')
    });
    if (yes && investmentSessionIsCurrent(runtime, session)) return refundSeasonNode(runtime, id);
}

export async function askRefundAscendNode(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const session = captureInvestmentSession(runtime);
    const yes = await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)('할당한 전직 노드를 반환하고 마름병 포자 1개를 소모합니다.'), {
        title: (0, runtime.deps._t)('전직 노드 반환'), tone: 'danger', confirmLabel: (0, runtime.deps._t)('노드 반환')
    });
    if (yes && investmentSessionIsCurrent(runtime, session)) return refundAscendNode(runtime, id);
}

export function refundPassiveNode(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const hadOverflow = (0, runtime.deps.hasAuthoredPassiveKeystone)('의지의 공명');
    const result = runtime.deps.passive.refund(runtime.deps.game, id);
    if (result.status === 'no-spores') return investmentLog(runtime, '패시브 노드 반환에는 마름병 포자 1개가 필요합니다.');
    if (result.status === 'dependent') return investmentLog(runtime, '연결 유지에 필요한 노드는 반환할 수 없습니다.');
    if (result.status !== 'changed') return;
    (0, runtime.deps.calculateReachableNodes)();
    (0, runtime.deps.normalizeSupportLoadout)(true, null, hadOverflow);
    investmentLog(runtime, '패시브 노드 반환: {node} (마름병 포자 1개 소모)', 'season-up', {
        node: (0, runtime.deps.escapeHTML)(runtime.deps.passiveNodePresentation.getPassiveNodeDisplayName(result.node))
    });
    (0, runtime.deps.updateStaticUI)();
}
