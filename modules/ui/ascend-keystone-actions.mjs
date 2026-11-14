import { captureInvestmentSession, investmentSessionIsCurrent, investmentMayEdit, investmentLog } from './loop-investment-session.mjs';

export function reportDualEquipmentChange(runtime, result, enable) {
    if (result === 'full') {
        investmentLog(runtime, enable
            ? '쌍수 훈련 활성화를 위해 완갑을 해제해야 하지만 인벤토리가 가득 찼습니다.'
            : '쌍수 훈련 해제를 위해 보조 슬롯 무기를 해제해야 하지만 인벤토리가 가득 찼습니다.');
        return false;
    }
    if (result === 'moved') investmentLog(runtime, enable
        ? '🛡️ 쌍수 훈련 활성화: 기존 완갑을 인벤토리로 이동했습니다.'
        : '🧰 쌍수 훈련 해제: 보조 슬롯 무기를 인벤토리로 이동했습니다.', 'loot-normal');
    return true;
}

export function enforceWarriorDualTrainingEquipment(runtime, enable) {
    return reportDualEquipmentChange(runtime, runtime.deps.ascend.moveDualEquipment(runtime.deps.game, enable), enable);
}

export function buyAscendKeystone(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const result = runtime.deps.ascend.buyKeystone(runtime.deps.game, id);
    if (result.status === 'no-points') return investmentLog(runtime, '키스톤 포인트가 부족합니다.');
    if (result.status === 'pick-limit') return investmentLog(runtime, '키스톤은 최대 {CLASS_KEYSTONE_PICK_LIMIT}개 할당할 수 있습니다.', 'attack-monster', {
        CLASS_KEYSTONE_PICK_LIMIT: runtime.deps.CLASS_KEYSTONE_PICK_LIMIT
    });
    if (result.status === 'prerequisite') return investmentLog(runtime, '선행 키스톤이 필요합니다.');
    if (result.status === 'full') return reportDualEquipmentChange(runtime, 'full', true);
    if (result.status !== 'changed') return;
    reportDualEquipmentChange(runtime, result.equipment, true);
    (0, runtime.deps.updateStaticUI)();
}

function reportKeystoneRefundIssue(runtime, result, confirmed) {
    if (result.status === 'unavailable') {
        if (confirmed) investmentLog(runtime, '확인 중 키스톤 상태가 변경되어 반환을 취소했습니다.');
    } else if (result.status === 'dependent') {
        investmentLog(runtime, confirmed ? '확인 중 선행 상태가 변경되었습니다: {names}'
            : '이 키스톤을 선행으로 둔 키스톤이 있어 반환할 수 없습니다: {names}', 'attack-monster', {
            names: result.blockers.map(node => (0, runtime.deps._t)(node.name)).join(', ')
        });
    } else if (result.status === 'no-spores') {
        investmentLog(runtime, confirmed ? '확인 중 마름병 포자가 부족해져 반환을 취소했습니다.' : '키스톤 반환에는 마름병 포자 1개가 필요합니다.');
    } else if (result.status === 'full') reportDualEquipmentChange(runtime, 'full', false);
}

export async function refundAscendKeystone(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const session = captureInvestmentSession(runtime);
    const issue = runtime.deps.ascend.keystoneRefundIssue(session.owner, id);
    if (issue.status !== 'ready') return reportKeystoneRefundIssue(runtime, issue, false);
    const yes = await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)('할당한 키스톤을 반환하고 마름병 포자 1개를 소모합니다.'), {
        title: (0, runtime.deps._t)('키스톤 반환'), tone: 'danger', confirmLabel: (0, runtime.deps._t)('키스톤 반환')
    });
    if (!yes || !investmentSessionIsCurrent(runtime, session) || !investmentMayEdit(runtime)) return;
    const result = runtime.deps.ascend.refundKeystone(session.owner, id);
    if (result.status !== 'changed') return reportKeystoneRefundIssue(runtime, result, true);
    reportDualEquipmentChange(runtime, result.equipment, false);
    if (typeof runtime.deps.clearAscendKeystoneRuntimeState === 'function') (0, runtime.deps.clearAscendKeystoneRuntimeState)(result.removed);
    (0, runtime.deps.updateStaticUI)();
}
