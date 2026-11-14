export function renderPassiveRouteHint(runtime, cost) {
    if (cost <= 0 || runtime.deps.uiDisplay.matches('(max-width: 1080px)')) return '';
    return `<div class="tooltip-line" style="margin-top:6px;color:#f2d88f;">${(0, runtime.deps._t)('현재 경로 기준 {cost}포인트 필요', { cost })}</div>`;
}

/** "이 노드까지 할당 시 DPS 61 → 64, 생명력 170 → 180": the path's untaken nodes taken (js/passives.js previewPassiveNodeStats). */
export function renderPassiveStatPreview(runtime, route) {
    const taken = new Set(runtime.deps.game.passives || []);
    const ids = Array.from(route).filter(id => !taken.has(id) && runtime.deps.PASSIVE_TREE.nodes[id] && runtime.deps.PASSIVE_TREE.nodes[id].kind !== 'start');
    const parts = ids.length ? (0, runtime.deps.buildStatPreviewParts)((0, runtime.deps.previewPassiveNodeStats)(ids)) : '';
    return parts ? `<div class="tooltip-line" style="margin-top:6px;">${(0, runtime.deps._t)('이 노드까지 할당 시 {parts}', { parts })}</div>` : '';
}

/** The node's effect text in the option colours (2026-10-06): each effect line in its own stat's colour (a node with several
* stats showed them all in the first stat's colour), keystone and other prose with coloured keywords and numbers. */
export function renderPassiveEffectToneHtml(runtime, node, label) {
    const effects = Array.isArray(node.effects) && node.effects.length > 0
        ? (node.connectedDevotionPenalty ? (0, runtime.deps.getEffectivePassiveNodeEffects)(node) : node.effects) : null;
    if (!effects) return node.stat ? label : runtime.deps.statToneText.markup(label);
    return String(label).split('<br>').map((line, index) => (index < effects.length
                ? `<span style="color:${(0, runtime.deps.getItemStatToneColor)(effects[index].stat)}">${line}</span>` : runtime.deps.statToneText.markup(line))).join('<br>');
}

export function renderPassiveTooltip(runtime, node, clientX, clientY) {
    if (!runtime.state.canvasTooltip || !node) return;
    let displayStat = typeof runtime.deps.getPassiveNodeDisplayStat === 'function' ? (0, runtime.deps.getPassiveNodeDisplayStat)(node) : node.stat;
    let passiveAccent = (0, runtime.nodes.getPassiveStatAccent)(displayStat);
    let state = (0, runtime.deps.getPassiveVisibility)(node.id);
    let route = (0, runtime.deps.getHoverAllocationNodeIds)(node.id);
    let routeCost = Array.from(route).filter(id => !(runtime.deps.game.passives || []).includes(id)
            && runtime.deps.PASSIVE_TREE.nodes[id] && runtime.deps.PASSIVE_TREE.nodes[id].kind !== 'start').length;
    let ownedApexCount = (0, runtime.deps.getPassiveApexNodeIds)().filter(id => (runtime.deps.game.passives || []).includes(id)).length;
    let msg = initialNodeMessage(runtime, node);

    msg = progressNodeMessage(runtime, node, state, ownedApexCount, msg);

    // 효과 글씨는 능력치 종류의 색(장비 옵션과 같은 getItemStatToneColor): 노드 테두리 색의 옅은 글씨는 흰색과 구분되지 않았다(2026-10-06).
    const { effectHtml, displayedEffectLabels } = nodeEffectMarkup(runtime, node, passiveAccent, displayStat);
    let voidCraftHtml = '';
    if (node.kind === 'void' && (runtime.deps.game.passives || []).includes(node.id)) {
        voidCraftHtml = `<div class="tooltip-line" style="margin-top:8px; color:var(--copy-bright);">${(0, runtime.deps._t)('🕳️ 클릭하면 공허 제작 창이 열립니다.')}</div>`;
    }
    const tooltipDescription = (0, runtime.deps.getPassiveTooltipDescription)(node, displayedEffectLabels);

    runtime.state.canvasTooltip.innerHTML =
    `<div class="tooltip-title" style="color:${emphasizedNodeTitle(node) ? '#e7bf73' : '#b9d0df'}">${(0, runtime.nodes.getPassiveNodeDisplayName)(node)}</div>
             <div class="tooltip-line">${(0, runtime.nodes.getPassiveKindLabel)(node)}</div>
             ${effectHtml}
             ${tooltipDescription ? `<div class="tooltip-line" style="margin-top:6px; color:var(--copy-bright);">${runtime.deps.statToneText.markup(tooltipDescription)}</div>` : ''}
             ${voidCraftHtml}
             ${renderPassiveRouteHint(runtime, routeCost)}
             ${renderPassiveStatPreview(runtime, route)}
             <div class="tooltip-line" style="margin-top:6px;">${msg}</div>`;

    runtime.deps.passiveSelectionUi.present(node, runtime.state.canvasTooltip, { x: clientX, y: clientY });
}

function initialNodeMessage(runtime, node) {
    return (runtime.deps.game.passives || []).includes(node.id)
        ? '활성화됨'
        : (runtime.deps.reachableNodes.has(node.id)
            ? (0, runtime.deps.describeReachablePassiveNode)(node)
            : '아직 길이 이어지지 않은 노드');
}

function progressNodeMessage(runtime, node, state, ownedApexCount, msg) {
    if (state === 'preview' && !runtime.deps.discoveredPassiveNodes.has(node.id)) {
        msg = '안개 속 노드입니다. 활성화하여 주변을 밝힐 수 있습니다.';
    }
    if (node.kind === 'apex' && !ownsNode(runtime, node)) {
        msg = (0, runtime.deps._t)('★ 별끝 특수 노드 {ownedApexCount}/5. 다섯 개를 모두 잇면 외곽 성좌가 별 모양으로 각성합니다.', { ownedApexCount });
    } else if (isEvolvedNode(runtime, node)) {
        msg = ownsNode(runtime, node)
            ? '✔️ 각성된 별자리를 이미 받아들였습니다.'
            : '✨ 성좌 진화 이후 드러난 강력한 외곽 노드입니다.';
    } else if (node.voidRing === 'outer' && !runtime.deps.game.passiveStarEvolution) {
        const progress = (0, runtime.deps.getPassiveConstellationAwakeningProgress)();
        msg += (0, runtime.deps._t)(', 성좌 각성 {completed}/{required}: 직업 공허 소켓 여섯을 모두 활성화하면 각성합니다.', { completed: progress.completed, required: progress.required });
    }
    return msg;
}

function ownsNode(runtime, node) {
    return (runtime.deps.game.passives || []).includes(node.id);
}

function isEvolvedNode(runtime, node) {
    return (node.kind === 'evolved' || node.kind === 'transcendent') && runtime.deps.game.passiveStarEvolution;
}

function nodeEffectMarkup(runtime, node, passiveAccent, displayStat) {
    let effectTextColor = (0, runtime.deps.getItemStatToneColor)(displayStat);
    let effectBadge = (label, accent, caption) => {
        let tone = accent || passiveAccent;
        return `<div class="tooltip-line passive-effect-badge" style="--badge-edge:${tone.activeOuter}; color:${effectTextColor};">
                <div class="passive-effect-caption">${caption}</div>
                ${label}
            </div>`;
    };
    const primaryEffectLabel = (0, runtime.nodes.getPassiveEffectLabel)(node);
    const displayedEffectLabels = [primaryEffectLabel].filter(Boolean);
    let effectHtml = primaryEffectLabel ? effectBadge(renderPassiveEffectToneHtml(runtime, node, primaryEffectLabel), passiveAccent, '효과') : '';
    const activationState = (0, runtime.deps.getPassiveNodeActivationState)(node);
    if (node.activationRequirement && !activationState.active) {
        const requiredName = activationState.statId === 'devotion' ? '계시' : (0, runtime.deps.getStatName)(activationState.statId);
        effectHtml += `<div class="tooltip-line" style="margin-top:7px; padding:7px 9px; border:1px solid rgba(255,184,106,.48); border-radius:8px; color:#ffd0a2; background:rgba(91,52,20,.28);">${(0, runtime.deps._t)('{requiredName} {required} 미만이면 이 노드의 모든 효과가 비활성화됩니다. 현재 {available}', { requiredName: (0, runtime.deps.withSubjectParticle)(requiredName), required: activationState.required, available: activationState.available })}</div>`;
    }
    return { effectHtml, displayedEffectLabels };
}

function emphasizedNodeTitle(node) {
    return node.tier >= 3 || node.kind === 'apex' || node.kind === 'transcendent';
}
