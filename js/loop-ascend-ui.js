// 루프 패시브와 전직: 노드 조건, 투자와 환급, 전직 고르기와 지난 루프 계획 (2026-11-10에 js/ui.js에서 그대로 옮겼다. js/ui.js 뒤에 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
function isSeasonNodeRequirementMet(node) {
    if (node && node.inner && !isSeasonTreeEvolved()) return false;
    if (!node || !node.req) return true;
    if (Array.isArray(node.req)) return node.req.some(req => game.seasonNodes.includes(req));
    return game.seasonNodes.includes(node.req);
}

function getSeasonNodeLevel(id) {
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    if (game.seasonNodes.includes(id)) return Math.max(1, Math.floor(game.seasonNodeLevels[id] || 1));
    return 0;
}

function isSeasonTreeEvolved() {
    let keys = Object.keys(SEASON_NODES || {});
    if (keys.length <= 0) return false;
    return keys.every(id => getSeasonNodeLevel(id) >= 1);
}

function isAscendNodeRequirementMet(node) {
    if (!node || !node.req) return true;
    if (Array.isArray(node.req)) return node.req.some(req => game.ascendNodes.includes(req));
    return game.ascendNodes.includes(node.req);
}

function canRefundPassiveNode(nodeId) {
    const node = PASSIVE_TREE.nodes[nodeId];
    if (nodeId === getPassiveTreeRootNodeId() || node?.kind === 'start' || !game.passives.includes(nodeId)) return false;
    const remaining = { ...game, passives: game.passives.filter(id => id !== nodeId) };
    const connected = passiveRouting.connected(remaining, PASSIVE_TREE, getPassiveRouting(remaining));
    return connected.length === remaining.passives.length
        && passiveRouting.pointBudget(game) + passiveRouting.paleBonus(remaining) >= remaining.passives.length;
}

function refundPassiveNode(id) { if (!assertBuildEditable()) return;
    game.passives = Array.isArray(game.passives) ? game.passives : [];
    const node = PASSIVE_TREE.nodes[id];
    if (!game.passives.includes(id) || (node && node.kind === 'start')) return;
    if ((game.currencies.blightSpore || 0) < 1) return addLog(_t('패시브 노드 반환에는 마름병 포자 1개가 필요합니다.'), 'attack-monster');
    if (!canRefundPassiveNode(id)) return addLog(_t('연결 유지에 필요한 노드는 반환할 수 없습니다.'), 'attack-monster');
    const budget = passiveRouting.pointBudget(game);
    game.currencies.blightSpore = Math.max(0, Math.floor(game.currencies.blightSpore || 0) - 1);
    game.passives = game.passives.filter(nodeId => nodeId !== id);
    if (typeof clearPassiveAttributeChoice === 'function') clearPassiveAttributeChoice(id);
    game.passivePoints = Math.max(0, Math.floor(game.passivePoints || 0)) + 1;
    passiveRouting.settlePoints(game, budget);
    calculateReachableNodes();
    addLog(_t('패시브 노드 반환: {node} (마름병 포자 1개 소모)', { node: escapeHTML(getPassiveNodeDisplayName(node)) }), 'season-up');
    updateStaticUI();
}

async function askRefundSeasonNode(id) { if (!assertBuildEditable()) return;
    if (!await requestGameConfirmation(_t('선택한 루프 패시브를 반환하고 마름병 포자 1개를 소모합니다.'), {
        title: _t('루프 패시브 반환'),
        tone: 'danger',
        confirmLabel: _t('노드 반환')
    })) return;
    return refundSeasonNode(id);
}

function refundSeasonNode(id) { if (!assertBuildEditable()) return;
    game.seasonNodes = Array.isArray(game.seasonNodes) ? game.seasonNodes : [];
    if (!game.seasonNodes.includes(id)) return;
    let nodeDef = getSeasonPassiveNodeDef(id);
    let ownsInnerCircleNode = Object.keys(SEASON_INNER_NODES || {}).some(key => game.seasonNodes.includes(key));
    if (nodeDef && !nodeDef.inner && ownsInnerCircleNode) return addLog(_t('내부 마법진 패시브를 먼저 반환해야 우로보로스 몸통을 해제할 수 있습니다.'), 'attack-monster');
    let blockers = getAllSeasonPassiveNodeIds().filter(key => {
        if (key === id || !game.seasonNodes.includes(key)) return false;
        let req = (getSeasonPassiveNodeDef(key) || {}).req;
        if (!req) return false;
        if (Array.isArray(req)) return req.includes(id) && req.filter(v => v !== id).every(v => !game.seasonNodes.includes(v));
        return req === id;
    });
    if (blockers.length > 0) return addLog(_t('선행 조건으로 연결된 루프 패시브가 있어 반환할 수 없습니다.'), 'attack-monster');
    if ((game.currencies.blightSpore || 0) < 1) return addLog(_t('루프 패시브 반환에는 마름병 포자 1개가 필요합니다.'), 'attack-monster');
    game.currencies.blightSpore = Math.max(0, Math.floor(game.currencies.blightSpore || 0) - 1);
    let lv = getSeasonNodeLevel(id);
    game.seasonNodes = game.seasonNodes.filter(nodeId => nodeId !== id);
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    delete game.seasonNodeLevels[id];
    game.seasonPoints = Math.max(0, Math.floor(game.seasonPoints || 0)) + lv;
    updateStaticUI();
}

async function askRefundAscendNode(id) { if (!assertBuildEditable()) return;
    if (!await requestGameConfirmation(_t('할당한 전직 노드를 반환하고 마름병 포자 1개를 소모합니다.'), {
        title: _t('전직 노드 반환'),
        tone: 'danger',
        confirmLabel: _t('노드 반환')
    })) return;
    return refundAscendNode(id);
}

function refundAscendNode(id) { if (!assertBuildEditable()) return;
    if (!game.ascendClass) return;
    game.ascendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    if (!game.ascendNodes.includes(id)) return;
    let tree = getClassTreeDef(game.ascendClass);
    let blockers = Object.keys(tree).filter(key => {
        if (key === id || !game.ascendNodes.includes(key)) return false;
        let req = tree[key].req;
        let reqAny = Array.isArray(tree[key].reqAny) ? tree[key].reqAny : [];
        let blockedByReq = false;
        if (req) {
            if (Array.isArray(req)) blockedByReq = req.includes(id) && req.filter(v => v !== id).every(v => !game.ascendNodes.includes(v));
            else blockedByReq = req === id;
        }
        let blockedByReqAny = reqAny.includes(id) && reqAny.filter(v => v !== id).every(v => !game.ascendNodes.includes(v));
        return blockedByReq || blockedByReqAny;
    });
    if (blockers.length > 0) return addLog(_t('이 노드를 선행으로 둔 전직 노드가 있어 반환할 수 없습니다.'), 'attack-monster');
    if ((game.currencies.blightSpore || 0) < 1) return addLog(_t('전직 노드 반환에는 마름병 포자 1개가 필요합니다.'), 'attack-monster');
    game.currencies.blightSpore = Math.max(0, Math.floor(game.currencies.blightSpore || 0) - 1);
    game.ascendNodes = game.ascendNodes.filter(nodeId => nodeId !== id);
    game.ascendPoints = Math.max(0, Math.floor(game.ascendPoints || 0)) + 1;
    normalizeSupportLoadout(true);
    updateStaticUI();
}

function canInvestSeasonNode(node, id) {
    return contentProgression.isUnlocked('loopTree') && !!node
        && (game.season || 1) >= getSeasonPassiveUnlockLoop(id) && isSeasonNodeRequirementMet(node);
}

function getSeasonNodeCap(node) {
    return node && node.inner ? 1 : (isSeasonTreeEvolved() ? 5 : 1);
}

/** True when a loop point buys something now: a ring node its loop and links allow below its cap, or a loop-10 stat
 * at its price. The goal notice stays quiet otherwise, e.g. while the next nodes wait for loop 5 (2026-10-04). */
function hasSpendableSeasonPoint() {
    const points = Math.max(0, Math.floor(game.seasonPoints || 0));
    if (points <= 0) return false;
    if ((game.season || 1) >= 10 && ['flatHp', 'flatDmg', 'aspd', 'move'].some(key => getLoop10StatCost(key) <= points)) return true;
    return getAllSeasonPassiveNodeIds().some(id => {
        const node = getSeasonPassiveNodeDef(id);
        return canInvestSeasonNode(node, id) && getSeasonNodeLevel(id) < getSeasonNodeCap(node);
    });
}

function loopOrbitCenterHtml() {
    return isSeasonTreeEvolved() ? '' : `<div class="loop-orbit-center" aria-live="polite">${loopOrbitCenterBody()}</div>`;
}

function loopOrbitCenterBody() {
    const node = loopOrbitShown ? getSeasonPassiveNodeDef(loopOrbitShown) : null;
    return node ? loopNodeDetailHtml(loopOrbitShown, node) : loopOrbitTotalsHtml();
}

/** 한 노드가 지금 주는 값(단계마다 20%씩 늘어난다) 한 줄. */
function loopNodeValueText(node, lv) {
    const info = P_STATS[node.stat] || {}, value = Number((node.val * (1 + Math.max(0, lv - 1) * 0.2)).toFixed(2));
    return `${_t(String(info.name || node.stat)).replace(/s*(%)$/, '')} +${formatValue(node.stat, value)}${info.isPct ? '%' : ''}`;
}

function loopNodeStateText(id, node, lv) {
    const unlockLoop = getSeasonPassiveUnlockLoop(id);
    if ((game.season || 1) < unlockLoop) return _t('루프 {unlockLoop}에 열립니다', { unlockLoop });
    if (!isSeasonNodeRequirementMet(node)) return '이어진 노드를 먼저 활성화하세요';
    return lv > 0 ? _t('{lv}/{node}단계', { lv, node: getSeasonNodeCap(node) }) : '활성화할 수 있습니다';
}

/** 활성화, 강화(포인트 1), 마름병 포자로 반환. buySeason과 askRefundSeasonNode가 사고 되돌리는 규칙을 그대로 따른다. */
function loopNodeBuyHtml(id, node, lv) {
    const open = (game.season || 1) >= getSeasonPassiveUnlockLoop(id) && isSeasonNodeRequirementMet(node);
    if (!open || lv >= getSeasonNodeCap(node)) return '';
    return `<button type="button" onclick="buySeason('${id}')" ${game.seasonPoints > 0 ? '' : _t('disabled data-tip="루프 포인트가 없습니다"')}>${lv > 0 ? _t('강화') : _t('활성화')}</button>`;
}

function loopNodeActionsHtml(id, node, lv) {
    const buy = loopNodeBuyHtml(id, node, lv);
    const refund = lv > 0 ? `<button type="button" onclick="askRefundSeasonNode('${id}')">${_t('마름병 포자로 반환')}</button>` : '';
    return buy || refund ? `<span class="loop-orbit-actions">${buy}${refund}</span>` : '';
}

function loopNodeDetailHtml(id, node) {
    const lv = getSeasonNodeLevel(id);
    return `<strong>${escapeHTML(_t(node.name))}</strong><small>${statToneText.html(_t(node.desc))}</small>
        ${lv > 1 ? `<em style="color:${getItemStatToneColor(node.stat)}">${_t('지금 {node}', { node: escapeHTML(loopNodeValueText(node, lv)) })}</em>` : ''}<b>${loopNodeStateText(id, node, lv)}</b>${loopNodeActionsHtml(id, node, lv)}`;
}

function loopOrbitTotalsHtml() {
    const sums = new Map();
    Object.keys(SEASON_NODES || {}).forEach(id => {
        const lv = getSeasonNodeLevel(id), node = getSeasonPassiveNodeDef(id);
        if (lv > 0 && node) sums.set(node.stat, (sums.get(node.stat) || 0) + node.val * (1 + (lv - 1) * 0.2));
    });
    const total = [...sums].map(([stat, val]) => loopNodeValueText({ stat, val }, 1)).join(', ');
    return `<strong>${_t('우로보로스 원환')}</strong><small>${total ? `${_t('활성화한 노드의 합계')}: ${statToneText.html(total)}` : _t('노드를 가리키면 그 효과가 여기에 나옵니다.')}</small>`;
}

/** 노드를 가리키거나 고르면 가운데 칸만 고쳐 쓴다(고리는 다시 그리지 않는다). */
function loopPassiveHint(id) {
    loopOrbitShown = id;
    const center = document.querySelector('#ui-season-tree .loop-orbit-center');
    if (center) center.innerHTML = loopOrbitCenterBody();
}

/** 노드 누르기: 넓은 화면의 터치(가리킬 수 없다)에서는 첫 탭이 가운데 칸에 읽기만 하고 같은 노드를 한 번 더 누르면 산다.
 * 목록 배치와 마우스는 전처럼 바로 산다. */
function loopPassivePress(id) {
    const again = loopOrbitPressed === id, touch = typeof matchMedia === 'function' && !matchMedia('(hover: hover)').matches;
    loopOrbitPressed = id;
    loopPassiveHint(id);
    if (touch && !loopOrbitListed() && !again) return;
    buySeason(id);
}

function isAscendKeystoneRequirementMet(node) {
    if (!node) return false;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    // 9번째(5차) 키스톤은 선행 키스톤 없이 "이번 루프에 해당 직업으로 재능 개화"만 요구한다(영구 아님).
    if (node.fifthJobOnly) {
        return !!game.ascendClass && game.bloomedClassThisLoop === game.ascendClass;
    }
    if (node.req) return game.ascendKeystones.includes(node.req);
    if (Array.isArray(node.reqAny) && node.reqAny.length > 0) return node.reqAny.some(id => game.ascendKeystones.includes(id));
    return true;
}

function enforceWarriorDualTrainingEquipment(onEnable) {
    if (game.ascendClass !== 'warrior') return true;
    game.equipment = game.equipment || {};
    game.inventory = Array.isArray(game.inventory) ? game.inventory : [];
    let shield = game.equipment['방패'];
    if (onEnable) {
        if (shield && shield.slot === '방패') {
            if (!canStoreEquipmentItems([shield], game)) {
                addLog(_t('쌍수 훈련 활성화를 위해 완갑을 해제해야 하지만 인벤토리가 가득 찼습니다.'), 'attack-monster');
                return false;
            }
            game.inventory.push(shield);
            game.equipment['방패'] = null;
            addLog(_t('🛡️ 쌍수 훈련 활성화: 기존 완갑을 인벤토리로 이동했습니다.'), 'loot-normal');
        }
        return true;
    }
    if (shield && shield.slot === '무기') {
        if (!canStoreEquipmentItems([shield], game)) {
            addLog(_t('쌍수 훈련 해제를 위해 보조 슬롯 무기를 해제해야 하지만 인벤토리가 가득 찼습니다.'), 'attack-monster');
            return false;
        }
        game.inventory.push(shield);
        game.equipment['방패'] = null;
        addLog(_t('🧰 쌍수 훈련 해제: 보조 슬롯 무기를 인벤토리로 이동했습니다.'), 'loot-normal');
    }
    return true;
}

async function refundAscendKeystone(id) { if (!assertBuildEditable()) return;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (!game.ascendKeystones.includes(id)) return;
    let blockers = getClassKeystoneDefs(game.ascendClass).filter(node => {
        if (!game.ascendKeystones.includes(node.id) || node.id === id) return false;
        if (node.req && node.req === id) return true;
        if (Array.isArray(node.reqAny) && node.reqAny.includes(id)) {
            let hasAlt = node.reqAny.some(reqId => reqId !== id && game.ascendKeystones.includes(reqId));
            return !hasAlt;
        }
        return false;
    });
    if (blockers.length > 0) return addLog(_t('이 키스톤을 선행으로 둔 키스톤이 있어 반환할 수 없습니다: {names}', { names: blockers.map(v => _t(v.name)).join(', ') }), 'attack-monster');
    if ((game.currencies.blightSpore || 0) < 1) return addLog(_t('키스톤 반환에는 마름병 포자 1개가 필요합니다.'), 'attack-monster');
    if (!await requestGameConfirmation(_t('할당한 키스톤을 반환하고 마름병 포자 1개를 소모합니다.'), {
        title: _t('키스톤 반환'),
        tone: 'danger',
        confirmLabel: _t('키스톤 반환')
    })) return;
    if (!assertBuildEditable()) return;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (!game.ascendKeystones.includes(id)) return addLog(_t('확인 중 키스톤 상태가 변경되어 반환을 취소했습니다.'), 'attack-monster');
    blockers = getClassKeystoneDefs(game.ascendClass).filter(node => {
        if (!game.ascendKeystones.includes(node.id) || node.id === id) return false;
        if (node.req && node.req === id) return true;
        if (!Array.isArray(node.reqAny) || !node.reqAny.includes(id)) return false;
        return !node.reqAny.some(reqId => reqId !== id && game.ascendKeystones.includes(reqId));
    });
    if (blockers.length > 0) return addLog(_t('확인 중 선행 상태가 변경되었습니다: {names}', { names: blockers.map(v => _t(v.name)).join(', ') }), 'attack-monster');
    if ((game.currencies.blightSpore || 0) < 1) return addLog(_t('확인 중 마름병 포자가 부족해져 반환을 취소했습니다.'), 'attack-monster');
    if (id === 'w3' && !enforceWarriorDualTrainingEquipment(false)) return;
    game.currencies.blightSpore = Math.max(0, Math.floor(game.currencies.blightSpore || 0) - 1);
    game.ascendKeystones = game.ascendKeystones.filter(key => key !== id);
    game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0)) + 1;
    if (typeof clearAscendKeystoneRuntimeState === 'function') clearAscendKeystoneRuntimeState([id]);
    updateStaticUI();
}

async function resetAscendKeystones() { if (!assertBuildEditable()) return;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (game.ascendKeystones.length <= 0) return;
    let cost = game.ascendKeystones.length;
    if ((game.currencies.blightSpore || 0) < cost) return addLog(_t('키스톤 전체 초기화에는 마름병 포자 {cost}개가 필요합니다.', { cost }), 'attack-monster');
    if (!await requestGameConfirmation(_t('할당한 키스톤을 모두 반환하고 마름병 포자 {cost}개를 소모합니다.', { cost }), {
        title: _t('키스톤 전체 초기화'),
        tone: 'danger',
        confirmLabel: _t('전체 초기화')
    })) return;
    if (!assertBuildEditable()) return;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (game.ascendKeystones.length <= 0) return addLog(_t('확인 중 키스톤 상태가 변경되어 초기화를 취소했습니다.'), 'attack-monster');
    cost = game.ascendKeystones.length;
    if ((game.currencies.blightSpore || 0) < cost) return addLog(_t('확인 중 마름병 포자가 부족해졌습니다. (필요: {cost})', { cost }), 'attack-monster');
    if (game.ascendKeystones.includes('w3') && !enforceWarriorDualTrainingEquipment(false)) return;
    game.currencies.blightSpore = Math.max(0, Math.floor(game.currencies.blightSpore || 0) - cost);
    game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0)) + game.ascendKeystones.length;
    let removedKeystones = game.ascendKeystones.slice();
    game.ascendKeystones = [];
    if (typeof clearAscendKeystoneRuntimeState === 'function') clearAscendKeystoneRuntimeState(removedKeystones);
    updateStaticUI();
}

async function resetSeasonNodes() { if (!assertBuildEditable()) return;
    game.seasonNodes = Array.isArray(game.seasonNodes) ? game.seasonNodes : [];
    if (game.seasonNodes.length <= 0) return;
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    let totalLv = game.seasonNodes.reduce((s, id) => s + Math.max(1, Math.floor(game.seasonNodeLevels[id] || 1)), 0);
    let cost = game.seasonNodes.length;
    if ((game.currencies.blightSpore || 0) < cost) return addLog(_t('루프 패시브 전체 초기화에는 마름병 포자 {cost}개가 필요합니다.', { cost }), 'attack-monster');
    if (!await requestGameConfirmation(_t('루프 패시브를 모두 초기화하고 마름병 포자 {cost}개를 소모합니다.', { cost }), {
        title: _t('루프 패시브 전체 초기화'),
        tone: 'danger',
        confirmLabel: _t('전체 초기화')
    })) return;
    if (!assertBuildEditable()) return;
    game.seasonNodes = Array.isArray(game.seasonNodes) ? game.seasonNodes : [];
    if (game.seasonNodes.length <= 0) return addLog(_t('확인 중 루프 패시브 상태가 변경되어 초기화를 취소했습니다.'), 'attack-monster');
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    totalLv = game.seasonNodes.reduce((sum, nodeId) => sum + Math.max(1, Math.floor(game.seasonNodeLevels[nodeId] || 1)), 0);
    cost = game.seasonNodes.length;
    if ((game.currencies.blightSpore || 0) < cost) return addLog(_t('확인 중 마름병 포자가 부족해졌습니다. (필요: {cost})', { cost }), 'attack-monster');
    game.currencies.blightSpore = Math.max(0, Math.floor(game.currencies.blightSpore || 0) - cost);
    game.seasonPoints = Math.max(0, Math.floor(game.seasonPoints || 0)) + totalLv;
    game.seasonNodes = [];
    game.seasonNodeLevels = {};
    updateStaticUI();
}

async function resetAscendNodes() { if (!assertBuildEditable()) return;
    game.ascendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    if (game.ascendNodes.length <= 0) return;
    let cost = game.ascendNodes.length;
    if ((game.currencies.blightSpore || 0) < cost) return addLog(_t('전직 노드 전체 초기화에는 마름병 포자 {cost}개가 필요합니다.', { cost }), 'attack-monster');
    if (!await requestGameConfirmation(_t('전직 노드를 모두 초기화하고 마름병 포자 {cost}개를 소모합니다.', { cost }), {
        title: _t('전직 노드 전체 초기화'),
        tone: 'danger',
        confirmLabel: _t('전체 초기화')
    })) return;
    if (!assertBuildEditable()) return;
    game.ascendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    if (game.ascendNodes.length <= 0) return addLog(_t('확인 중 전직 노드 상태가 변경되어 초기화를 취소했습니다.'), 'attack-monster');
    cost = game.ascendNodes.length;
    if ((game.currencies.blightSpore || 0) < cost) return addLog(_t('확인 중 마름병 포자가 부족해졌습니다. (필요: {cost})', { cost }), 'attack-monster');
    game.currencies.blightSpore = Math.max(0, Math.floor(game.currencies.blightSpore || 0) - cost);
    game.ascendPoints = Math.max(0, Math.floor(game.ascendPoints || 0)) + game.ascendNodes.length;
    game.ascendNodes = [];
    normalizeSupportLoadout(true);
    updateStaticUI();
}

async function selectClass(key) {
    // 직업마다 전직 셋 중에서 고른다(2026-10-02 전직 18종).
    if (!isAscendancyOfClass(key, game.selectedClassId)) return;
    if (await requestGameConfirmation(`[${CLASS_TEMPLATES[key].name}] 전직을 선택합니다.\n이번 루프에는 다시 변경할 수 없습니다.`, {
        title: _t('전직 선택'),
        confirmLabel: _t('이 전직 선택')
    })) {
        let previousKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones.slice() : [];
        game.ascendClass = key;
        game.ascendKeystones = [];
        if (typeof clearAscendKeystoneRuntimeState === 'function') clearAscendKeystoneRuntimeState(previousKeystones, { force: true });
        updateStaticUI();
    }
}

function renderAscendancyPickCard(key) {
    return ascendancyTreeUi.pickCardHtml(key);
}

/** 전직 고르기 화면: 지난 루프의 전직이 이 직업의 것이면 격자 위에 '지난 루프처럼' 카드, 격자에는 전직 셋. */
function fillAscendancyPickScreen() {
    const planBox = document.getElementById('ui-class-plan');
    if (planBox) planBox.innerHTML = renderLastLoopPlanCard();
    document.getElementById('ui-class-grid').innerHTML = getAscendanciesForClass(game.selectedClassId).map(renderAscendancyPickCard).join('');
}

function renderLastLoopPlanCard() {
    const plan = getUsableLastLoopAscendPlan();
    return plan ? `<button type="button" class="class-card ascend-plan-card" onclick="chooseLastLoopAscendPlan()"><strong>${_t('지난 루프처럼: {name}', { name: CLASS_TEMPLATES[plan.ascendClass].name })}</strong><span>${_t('노드 {length}개와 키스톤 {length2}개를 포인트만큼 같은 순서로 다시 할당합니다.', { length: plan.nodes.length, length2: plan.keystones.length })}</span></button>` : '';
}

/** 루프 초기화 때 기억한 전직 배치(state.js rememberLoopAscendancyPlan). 지금 직업이 고를 수 있는 전직일 때만 쓴다. */
function getUsableLastLoopAscendPlan() {
    const plan = game.lastLoopAscendPlan;
    return plan && CLASS_TEMPLATES[plan.ascendClass] && isAscendancyOfClass(plan.ascendClass, game.selectedClassId) ? plan : null;
}

/** 계획의 노드와 키스톤을 순서대로, 포인트와 선행 조건이 허락하는 것만 산다(살 수 없는 줄은 건너뛰어 기록을 남기지 않는다). */
function allocateLastLoopAscendPlan(plan) {
    let placed = 0;
    plan.nodes.forEach(id => {
        const node = getClassTreeDef(game.ascendClass)[id];
        const blocked = !node || game.ascendPoints <= 0 || game.ascendNodes.includes(id) || (node.exclusive && game.ascendNodes.includes(node.exclusive));
        if (blocked || !isAscendNodeRequirementMet(node)) return;
        buyAscend(id);
        placed += game.ascendNodes.includes(id) ? 1 : 0;
    });
    plan.keystones.forEach(id => {
        const node = getClassKeystoneDefs(game.ascendClass).find(row => row.id === id);
        const blocked = !node || game.ascendKeystonePoints <= 0 || game.ascendKeystones.includes(id) || game.ascendKeystones.length >= CLASS_KEYSTONE_PICK_LIMIT;
        if (blocked || !isAscendKeystoneRequirementMet(node)) return;
        buyAscendKeystone(id);
        placed += game.ascendKeystones.includes(id) ? 1 : 0;
    });
    return placed;
}

async function chooseLastLoopAscendPlan() {
    const plan = getUsableLastLoopAscendPlan();
    if (!plan || game.ascendClass || !assertBuildEditable()) return;
    const name = CLASS_TEMPLATES[plan.ascendClass].name;
    if (!await requestGameConfirmation(`[${name}] 전직을 선택하고 지난 루프의 배치를 다시 할당합니다.\n이번 루프에는 전직을 다시 변경할 수 없습니다.`, { title: _t('지난 루프처럼'), confirmLabel: _t('이 전직 선택') })) return;
    game.ascendClass = plan.ascendClass;
    game.ascendKeystones = [];
    game.ascendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    const placed = allocateLastLoopAscendPlan(plan);
    addLog(_t('[{name}] 지난 루프 배치: {placed}개를 다시 골랐습니다.', { name, placed }), 'season-up');
    updateStaticUI();
}

/** 트리 요약 아래 '이어 하기': 지난 루프와 같은 전직이고, 계획에 남은 줄과 쓸 포인트가 있을 때만. */
function getAscendancyPlanContinueHtml() {
    const plan = getUsableLastLoopAscendPlan();
    if (!plan || plan.ascendClass !== game.ascendClass) return '';
    const nodesLeft = game.ascendPoints > 0 && plan.nodes.some(id => !game.ascendNodes.includes(id));
    const keystonesLeft = game.ascendKeystonePoints > 0 && plan.keystones.some(id => !game.ascendKeystones.includes(id));
    return nodesLeft || keystonesLeft ? '<button type="button" class="ascend-plan-continue" onclick="continueLastLoopAscendPlan()">지난 루프 배치 이어 하기</button>' : '';
}

function continueLastLoopAscendPlan() {
    const plan = getUsableLastLoopAscendPlan();
    if (!plan || plan.ascendClass !== game.ascendClass || !assertBuildEditable()) return;
    const placed = allocateLastLoopAscendPlan(plan);
    addLog(placed > 0 ? _t('지난 루프 배치: {placed}개를 더 할당했습니다.', { placed }) : '지금 할당할 수 있는 다음 노드나 키스톤이 없습니다.', placed > 0 ? 'season-up' : 'attack-monster');
    updateStaticUI();
}

function buyAscend(id) { if (!assertBuildEditable()) return;
    if (!game.ascendClass) return;
    let tree = getClassTreeDef(game.ascendClass);
    let node = tree[id];
    let reqMet = isAscendNodeRequirementMet(node);
    if (node && node.exclusive && game.ascendNodes.includes(node.exclusive)) return addLog(_t('같은 계열의 노드는 둘 중 하나만 할당할 수 있습니다.'), 'attack-monster');
    if (!node || game.ascendPoints <= 0 || game.ascendNodes.includes(id) || !reqMet) return;
    game.ascendNodes.push(id);
    game.ascendPoints--;
    normalizeSupportLoadout(true);
    updateStaticUI();
}

exposeFileGlobals({ isSeasonNodeRequirementMet, getSeasonNodeLevel, isSeasonTreeEvolved, isAscendNodeRequirementMet, canRefundPassiveNode, refundPassiveNode, askRefundSeasonNode, refundSeasonNode, askRefundAscendNode, canInvestSeasonNode, getSeasonNodeCap, hasSpendableSeasonPoint, loopOrbitCenterHtml, loopPassiveHint, loopPassivePress, isAscendKeystoneRequirementMet, enforceWarriorDualTrainingEquipment, refundAscendKeystone, resetAscendKeystones, resetSeasonNodes, resetAscendNodes, selectClass, fillAscendancyPickScreen, chooseLastLoopAscendPlan, getAscendancyPlanContinueHtml, continueLastLoopAscendPlan, buyAscend });
})();

safeExposeGlobals({ loopPassiveHint, loopPassivePress });
