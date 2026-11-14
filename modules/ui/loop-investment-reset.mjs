import { captureInvestmentSession, investmentSessionIsCurrent, investmentMayEdit, investmentLog } from './loop-investment-session.mjs';
import { reportDualEquipmentChange } from './ascend-keystone-actions.mjs';

const resetMessages = Object.freeze({
    season: {
        title: '루프 패시브 전체 초기화',
        shortage: '루프 패시브 전체 초기화에는 마름병 포자 {cost}개가 필요합니다.',
        prompt: '루프 패시브를 모두 초기화하고 마름병 포자 {cost}개를 소모합니다.',
        empty: '확인 중 루프 패시브 상태가 변경되어 초기화를 취소했습니다.'
    },
    ascend: {
        title: '전직 노드 전체 초기화',
        shortage: '전직 노드 전체 초기화에는 마름병 포자 {cost}개가 필요합니다.',
        prompt: '전직 노드를 모두 초기화하고 마름병 포자 {cost}개를 소모합니다.',
        empty: '확인 중 전직 노드 상태가 변경되어 초기화를 취소했습니다.'
    },
    keystones: {
        title: '키스톤 전체 초기화',
        shortage: '키스톤 전체 초기화에는 마름병 포자 {cost}개가 필요합니다.',
        prompt: '할당한 키스톤을 모두 반환하고 마름병 포자 {cost}개를 소모합니다.',
        empty: '확인 중 키스톤 상태가 변경되어 초기화를 취소했습니다.'
    }
});

export async function resetInvestmentGroup(runtime, kind) {
    if (!investmentMayEdit(runtime)) return;
    const session = captureInvestmentSession(runtime), messages = resetMessages[kind];
    const rules = kind === 'season' ? runtime.deps.season : runtime.deps.ascend;
    const keystones = kind === 'keystones', cost = rules.resetCost(session.owner, keystones);
    if (!cost) return;
    if ((session.owner.currencies.blightSpore || 0) < cost) return investmentLog(runtime, messages.shortage, 'attack-monster', { cost });
    const yes = await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)(messages.prompt, { cost }), {
        title: (0, runtime.deps._t)(messages.title), tone: 'danger', confirmLabel: (0, runtime.deps._t)('전체 초기화')
    });
    if (!yes || !investmentSessionIsCurrent(runtime, session) || !investmentMayEdit(runtime)) return;
    const result = rules.reset(session.owner, keystones);
    return presentInvestmentReset(runtime, kind, result);
}

function presentInvestmentReset(runtime, kind, result) {
    const messages = resetMessages[kind];
    if (result.status === 'empty') return investmentLog(runtime, messages.empty);
    if (result.status === 'no-spores') return investmentLog(runtime, '확인 중 마름병 포자가 부족해졌습니다. (필요: {cost})', 'attack-monster', { cost: result.cost });
    if (result.status === 'full') return reportDualEquipmentChange(runtime, 'full', false);
    if (result.status !== 'changed') return;
    finishInvestmentReset(runtime, kind, result);
}

function finishInvestmentReset(runtime, kind, result) {
    if (kind === 'keystones') {
        reportDualEquipmentChange(runtime, result.equipment, false);
        if (typeof runtime.deps.clearAscendKeystoneRuntimeState === 'function') (0, runtime.deps.clearAscendKeystoneRuntimeState)(result.removed);
    } else if (kind === 'ascend') (0, runtime.deps.normalizeSupportLoadout)(true);
    (0, runtime.deps.updateStaticUI)();
}
