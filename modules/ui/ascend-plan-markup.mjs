import { ascendTreePickCardHtml } from './ascend-tree-pick.mjs';

export function renderAscendancyPickCard(runtime, key) {
    return ascendTreePickCardHtml(runtime, key);
}

export function fillAscendancyPickScreen(runtime) {
    const planBox = runtime.deps.document.getElementById('ui-class-plan');
    if (planBox) planBox.innerHTML = renderLastLoopPlanCard(runtime);
    runtime.deps.document.getElementById('ui-class-grid').innerHTML = runtime.deps.getAscendanciesForClass(runtime.deps.game.selectedClassId).map(key => renderAscendancyPickCard(runtime, key)).join('');
}

export function renderLastLoopPlanCard(runtime) {
    const plan = runtime.deps.ascend.lastPlan(runtime.deps.game);
    return plan ? `<button type="button" class="class-card ascend-plan-card" data-loop-plan="restore"><strong>${runtime.deps._t('지난 루프처럼: {name}', { name: runtime.deps.CLASS_TEMPLATES[plan.ascendClass].name })}</strong><span>${runtime.deps._t('노드 {length}개와 키스톤 {length2}개를 포인트만큼 같은 순서로 다시 할당합니다.', { length: plan.nodes.length, length2: plan.keystones.length })}</span></button>` : '';
}

export function getAscendancyPlanContinueHtml(runtime) {
    const plan = runtime.deps.ascend.lastPlan(runtime.deps.game);
    if (!plan || plan.ascendClass !== runtime.deps.game.ascendClass) return '';
    const nodesLeft = runtime.deps.game.ascendPoints > 0 && plan.nodes.some(id => !runtime.deps.game.ascendNodes.includes(id));
    const keystonesLeft = runtime.deps.game.ascendKeystonePoints > 0 && plan.keystones.some(id => !runtime.deps.game.ascendKeystones.includes(id));
    return nodesLeft || keystonesLeft ? `<button type="button" class="ascend-plan-continue" data-ascend-action="continue-plan">${runtime.deps._t('지난 루프 배치 이어 하기')}</button>` : '';
}
