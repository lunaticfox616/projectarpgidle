import { getPassiveNodeAtClientPosition } from './passive-node-hit.mjs';
import { renderPassiveTooltip } from './passive-node-tooltip.mjs';

export async function activateHoveredPassive(runtime, opts) {
    let options = opts || {};
    chooseHoveredNode(runtime, options);
    if (runtime.state.dragDist >= 10 || !runtime.state.hoverNode) return;
    const targetNode = runtime.state.hoverNode;
    const targetNodeId = targetNode.id;
    let activationPath = (0, runtime.deps.getPassiveActivationPath)(targetNodeId);
    let canActivate = activationPath.length === 1 && runtime.deps.reachableNodes.has(targetNodeId);
    let canPathActivate = activationPath.length > 1;
    if (!canActivate && !canPathActivate) {
        return unavailableNodeAction(runtime, options);
    }
    let pointCost = activationPath.length;
    if (runtime.deps.game.passivePoints < pointCost) {
        previewAtPointer(runtime, options);
        return (0, runtime.deps.addLog)((0, runtime.deps._t)('스킬트리 포인트가 부족합니다. (필요: {pointCost})', { pointCost }), "attack-monster", { toast: true });
    }
    if (touchPreviewNeeded(runtime, options)) return;
    await confirmAndActivatePath(runtime, targetNode, activationPath, canPathActivate, pointCost);
}

function chooseHoveredNode(runtime, options) {
    if (options.nodeId) {
        runtime.state.hoverNode = runtime.deps.PASSIVE_TREE.nodes[options.nodeId];
    } else if (Number.isFinite(options.clientX) && Number.isFinite(options.clientY)) {
        runtime.state.hoverNode = getPassiveNodeAtClientPosition(runtime, options.clientX, options.clientY, 0);
    }
}

function unavailableNodeAction(runtime, options) {
    if ((runtime.deps.game.passives || []).includes(runtime.state.hoverNode.id)) {
        if (runtime.state.hoverNode.kind === 'void') {
            runtime.state.pendingTouchPassiveId = null;
            runtime.state.pendingTouchPassiveRefundId = null;
            return (0, runtime.deps.openVoidPassiveCraftOverlay)(runtime.state.hoverNode.id);
        }
        if (options.fromTouch) {
            let now = Date.now();
            if (runtime.state.pendingTouchPassiveRefundId !== runtime.state.hoverNode.id || (now - runtime.state.pendingTouchPassiveRefundAt) > 1200) {
                runtime.state.pendingTouchPassiveRefundId = runtime.state.hoverNode.id;
                runtime.state.pendingTouchPassiveRefundAt = now;
                renderPassiveTooltip(runtime, runtime.state.hoverNode, options.clientX || 0, options.clientY || 0);
                (0, runtime.deps.addLog)((0, runtime.deps._t)('👆 반환 확인: 같은 노드를 한 번 더 탭하면 환불 창이 열립니다.'), 'loot-magic');
                return;
            }
        }
        runtime.state.pendingTouchPassiveId = null;
        runtime.state.pendingTouchPassiveRefundId = null;
        return (0, runtime.deps.askRefundPassiveNode)(runtime.state.hoverNode.id);
    }
    previewAtPointer(runtime, options);
    return (0, runtime.deps.addLog)((0, runtime.deps.describeBlockedPassiveNode)(runtime.state.hoverNode), "attack-monster", { toast: true });
}

async function confirmAndActivatePath(runtime, targetNode, activationPath, canPathActivate, pointCost) {
    const targetNodeId = targetNode.id;
    const attributeNodeCount = activationPath.filter(id => runtime.deps.PASSIVE_TREE.nodes[id] && runtime.deps.PASSIVE_TREE.nodes[id].kind === 'attribute').length;
    if (canPathActivate && !await runtime.deps.passiveSelectionUi.confirmPath(targetNode, activationPath)) return;
    let attributeStat = null;
    if (attributeNodeCount > 0) {
        attributeStat = await (0, runtime.deps.requestGameChoice)(attributeChoices(runtime, attributeNodeCount));
        if (!attributeStat) return;
    }
    runtime.state.pendingTouchPassiveId = null;
    let activationResult = (0, runtime.deps.activatePassivePath)(targetNodeId, { forcePulseNodeId: targetNodeId, attributeStat, expectedPath: activationPath });
    if (!activationResult.activated) {
        (0, runtime.deps.calculateReachableNodes)();
        let reason = activationResult.reason === 'points'
            ? (0, runtime.deps._t)('스킬트리 포인트가 부족합니다. (필요: {cost})', { cost: activationResult.cost })
            : (activationResult.message || '확인 중 패시브 트리 상태가 변경되었습니다. 노드를 다시 선택해 주세요.');
        (0, runtime.deps.addLog)(reason, 'attack-monster');
        (0, runtime.deps.updateStaticUI)();
        return;
    }
    (0, runtime.deps.unlockPassiveStarEvolution)();
    (0, runtime.deps.calculateReachableNodes)();
    let nodeName = (0, runtime.nodes.getPassiveNodeDisplayName)(targetNode);
    let routeText = canPathActivate ? (0, runtime.deps._t)(' (최단 경로 {pointCost}개 노드)', { pointCost }) : '';
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🌟 {nodeName} 활성화!{routeText}', { nodeName, routeText }), "loot-magic");
    (0, runtime.deps.updateStaticUI)();
}

function attributeChoices(runtime, attributeNodeCount) {
    return {
        kicker: (0, runtime.deps._t)('패시브 능력치'),
        title: attributeNodeCount > 1 ? (0, runtime.deps._t)('능력치 노드 {attributeNodeCount}개 선택', { attributeNodeCount }) : '능력치 노드 선택',
        message: attributeNodeCount > 1
            ? '이번 최단 경로에 포함된 모든 능력치 노드에 같은 능력치를 적용합니다.'
            : '이 노드에 저장할 능력치를 선택하세요.',
        confirmLabel: (0, runtime.deps._t)('능력치 적용'),
        choices: [
            { value: 'strength', label: (0, runtime.deps._t)('◆ 힘'), detail: (0, runtime.deps._t)('생명력과 근접 계열 성장에 적합합니다.') },
            { value: 'dexterity', label: (0, runtime.deps._t)('● 민첩'), detail: (0, runtime.deps._t)('회피/공격 속도/투사체 계열 성장에 적합합니다.') },
            { value: 'intelligence', label: (0, runtime.deps._t)('✦ 지능'), detail: (0, runtime.deps._t)('에너지 보호막/주문/원소 계열 성장에 적합합니다.') }
        ]
    };
}

function previewAtPointer(runtime, options) {
    if (Number.isFinite(options.clientX) && Number.isFinite(options.clientY)) renderPassiveTooltip(runtime, runtime.state.hoverNode, options.clientX, options.clientY);
}

function touchPreviewNeeded(runtime, options) {
    if (!options.fromTouch) return false;
    const now = Date.now();
    if (runtime.state.pendingTouchPassiveId !== runtime.state.hoverNode.id || (now - runtime.state.pendingTouchPassiveAt) > 1200) {
        runtime.state.pendingTouchPassiveId = runtime.state.hoverNode.id;
        runtime.state.pendingTouchPassiveAt = now;
        renderPassiveTooltip(runtime, runtime.state.hoverNode, options.clientX || 0, options.clientY || 0);
        (0, runtime.deps.addLog)((0, runtime.deps._t)('👆 패시브 노드 정보 확인됨. 같은 노드를 한 번 더 탭하면 활성화됩니다.'), "loot-magic");
        return true;
    }
    return false;
}
