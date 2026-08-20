let selectedArcanaCardUid = null;
let selectedPruningNodeId = 'first_ring';

function getArcanaCardDef(cardId) {
    return ARCANA_CARD_DB.find(card => card.id === cardId) || null;
}

function getArcanaCopyView(uid, arcana) {
    let copy = arcana.cards.find(row => row.uid === uid) || null;
    return copy ? { copy, card: getArcanaCardDef(copy.cardId) } : null;
}

function renderArcanaCard(copy, card, options = {}) {
    let selected = selectedArcanaCardUid === copy.uid;
    let classes = ['arcana-card', options.compact ? 'compact' : '', selected ? 'selected' : ''].filter(Boolean).join(' ');
    let action = options.placed
        ? `<button type="button" onclick="removeArcanaCard(${copy.uid})">해제</button>`
        : `<button type="button" onclick="selectArcanaCard(${copy.uid})">${selected ? '선택됨' : '선택'}</button>`;
    return `<article class="${classes}" data-card-uid="${copy.uid}">
        <header><span>${String(card.no).padStart(2, '0')}</span><b>${escapeHTML(card.name)}</b><i>${escapeHTML(card.glyph)}</i></header>
        <div class="arcana-card-effect"><small>덱 효과</small>${escapeHTML(card.deckEffect)}</div>
        <div class="arcana-card-effect slot"><small>장비 각인</small>${escapeHTML(card.slotEffect)}</div>
        ${action}
    </article>`;
}

function getArcanaEquipmentPreviewStats(slotKey) {
    let item = game.equipment && game.equipment[slotKey];
    if (!item) return null;
    let resolved = getResolvedEquipmentStatLists(slotKey, item, game, false);
    return [...resolved.baseStats, ...resolved.explicitStats];
}

function renderArcanaEquipmentPreview(slotKey, uid) {
    let stats = getArcanaEquipmentPreviewStats(slotKey);
    if (!stats) return '<small class="arcana-slot-preview empty">현재 장비 없음</small>';
    let gemRule = getArcanaCardGemDamageRule(uid, game);
    if (gemRule) {
        let skill = SKILL_DB[game.activeSkill];
        if (!skill || !skill.isGem) return `<small class="arcana-slot-preview">젬 레벨 1당 피해 +${gemRule.perLevelPct}% · 최대 ${gemRule.capPct}%</small>`;
        let result = getArcanaGemDamageFromStats(stats, game.activeSkill, gemRule);
        return `<small class="arcana-slot-preview">${escapeHTML(game.activeSkill)} 기준 젬 레벨 ${result.gemLevels} · 피해 +${result.pct}%</small>`;
    }
    let preview = getArcanaAmplificationPreview(stats, getArcanaCardSlotAmplifier(uid, game));
    if (preview.lines.length <= 0) return '<small class="arcana-slot-preview empty">적용되는 옵션 없음</small>';
    let lines = preview.lines.slice(0, 3).map(line => {
        let sign = line.gain >= 0 ? '+' : '';
        return `${escapeHTML(getStatName(line.id))} ${sign}${formatValue(line.id, line.gain)}`;
    }).join(' · ');
    return `<small class="arcana-slot-preview">${preview.lines.length}개 옵션 증폭 · ${lines}</small>`;
}

function renderArcanaDestination(uid, label, destination, key, arcana) {
    let view = uid ? getArcanaCopyView(uid, arcana) : null;
    if (view && view.card) {
        let preview = destination === 'equipment' ? renderArcanaEquipmentPreview(key, view.copy.uid) : '';
        return `<div class="arcana-destination occupied"><span class="arcana-slot-label">${escapeHTML(label)}</span>${renderArcanaCard(view.copy, view.card, { compact: true, placed: true })}${preview}</div>`;
    }
    let target = typeof key === 'string' ? escapeHTML(JSON.stringify(key)) : String(key);
    let preview = destination === 'equipment' && selectedArcanaCardUid
        ? renderArcanaEquipmentPreview(key, selectedArcanaCardUid) : '';
    return `<button class="arcana-destination empty" type="button" onclick="placeSelectedArcanaCard('${destination}',${target})">
        <span class="arcana-slot-label">${escapeHTML(label)}</span><b>빈 자리</b><small>선택한 카드를 배치</small>${preview}
    </button>`;
}

function renderArcanaCollection(available) {
    if (available.length <= 0) return '<div class="arcana-empty-copy">배치할 수 있는 미사용 카드가 없습니다.</div>';
    return `<div class="arcana-collection">${available.map(copy => {
        let card = getArcanaCardDef(copy.cardId);
        return card ? renderArcanaCard(copy, card) : '';
    }).join('')}</div>`;
}

function renderArcanaPanel() {
    let panel = document.getElementById('ui-arcana-panel');
    if (!panel) return;
    let arcana = ensureArcanaState(game);
    if (!arcana.unlocked) {
        let quest = getArcanaQuestProgress(game);
        let questText = quest.started ? ` · 봉인 복원 ${quest.current}/${quest.target}` : '';
        let lockedHtml = `<div class="arcana-locked">우주계의 지배자가 남긴 봉인된 카드를 발견하면 아르카나가 열립니다${questText}.</div>`;
        if (panel.__lastHtml !== lockedHtml) panel.innerHTML = lockedHtml;
        panel.__lastHtml = lockedHtml;
        return;
    }
    if (!findArcanaCopy(selectedArcanaCardUid, game) || getArcanaCardPlacement(selectedArcanaCardUid, game)) selectedArcanaCardUid = null;
    let available = arcana.cards.filter(copy => !getArcanaCardPlacement(copy.uid, game));
    let deck = arcana.deckSlots.map((uid, index) => renderArcanaDestination(uid, `덱 ${index + 1}`, 'deck', index, arcana)).join('');
    let equipment = ARCANA_EQUIPMENT_SLOT_KEYS.map(slot => renderArcanaDestination(arcana.equipmentSlots[slot], slot, 'equipment', slot, arcana)).join('');
    let html = `<section class="arcana-vault-head"><div><span>SEALED ARCANA</span><strong>봉인 카드 ${arcana.sealedCards}장</strong></div><button type="button" onclick="openSealedArcanaCard()" ${arcana.sealedCards > 0 ? '' : 'disabled'}>봉인 해제</button></section>
        <p class="arcana-rule">카드 한 장은 덱 또는 장비 슬롯 한 곳에만 놓을 수 있습니다. 덱은 전역 효과, 장비 슬롯은 그 부위에 붙은 지정 옵션을 증폭합니다.</p>
        <section><h3>아르카나 덱 <small>${arcana.deckSlots.filter(Boolean).length}/${ARCANA_DECK_SLOT_COUNT}</small></h3><div class="arcana-deck">${deck}</div></section>
        <section><h3>장비 슬롯 각인</h3><div class="arcana-equipment-grid">${equipment}</div></section>
        <section><h3>미사용 카드 <small>${available.length}장 보유</small></h3>${renderArcanaCollection(available)}</section>`;
    if (panel.__lastHtml !== html) panel.innerHTML = html;
    panel.__lastHtml = html;
}

function selectArcanaCard(uid) {
    let copy = findArcanaCopy(uid, game);
    if (!copy || getArcanaCardPlacement(uid, game)) return;
    selectedArcanaCardUid = selectedArcanaCardUid === copy.uid ? null : copy.uid;
    renderArcanaPanel();
}

function openSealedArcanaCard() {
    let result = unsealArcanaCard(game);
    if (!result.ok) return addLog('봉인된 아르카나 카드가 없습니다.', 'attack-monster');
    selectedArcanaCardUid = result.copy.uid;
    if (typeof unlockJournalEntry === 'function') unlockJournalEntry('arcana_first_seal');
    addLog(`🂠 아르카나 [${result.card.name}]의 봉인을 해제했습니다.`, 'loot-unique');
    renderArcanaPanel();
    if (typeof saveGame === 'function') saveGame();
}

function getArcanaPlacementError(code) {
    return ({ missing_card:'카드를 찾을 수 없습니다.', already_equipped:'이미 다른 곳에 배치된 카드입니다.', invalid_slot:'비어 있는 올바른 슬롯을 선택하세요.', duplicate_deck_card:'같은 아르카나는 덱에 한 장만 넣을 수 있습니다.' })[code] || '카드를 배치할 수 없습니다.';
}

function placeSelectedArcanaCard(destination, target) {
    if (!selectedArcanaCardUid) return addLog('먼저 미사용 카드를 선택하세요.', 'attack-monster');
    let result = equipArcanaCard(selectedArcanaCardUid, destination, target, game);
    if (!result.ok) return addLog(getArcanaPlacementError(result.code), 'attack-monster');
    selectedArcanaCardUid = null;
    renderArcanaPanel();
    if (typeof saveGame === 'function') saveGame();
}

function removeArcanaCard(uid) {
    if (!unequipArcanaCard(uid, game)) return;
    selectedArcanaCardUid = uid;
    renderArcanaPanel();
    if (typeof saveGame === 'function') saveGame();
}

function renderPruningConnections() {
    let byId = Object.fromEntries(PRUNING_TREE_DB.map(node => [node.id, node]));
    let lines = PRUNING_TREE_DB.flatMap(node => Object.keys(node.requires || {}).map(parentId => {
        let parent = byId[parentId];
        return parent ? `<line x1="${parent.x}" y1="${parent.y}" x2="${node.x}" y2="${node.y}"></line>` : '';
    }));
    return `<svg class="pruning-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines.join('')}</svg>`;
}

function renderPruningNode(node, tree) {
    let rank = Math.max(0, Math.floor(tree.nodeRanks[node.id] || 0));
    let requirementsMet = isPruningNodeRequirementMet(node, tree);
    let activePenaltyRank = getPruningNodeActivePenaltyRank(node.id, tree);
    let state = rank >= node.maxRank ? 'maxed' : rank > 0 ? 'owned' : requirementsMet ? 'available' : 'locked';
    let selected = selectedPruningNodeId === node.id ? 'selected' : '';
    return `<button class="pruning-node ${state} ${selected}" type="button" style="--node-x:${node.x}%;--node-y:${node.y}%;" onclick="selectPruningNode('${node.id}')" aria-pressed="${selected ? 'true' : 'false'}">
        <b>${escapeHTML(node.name)}</b><span>${rank}/${node.maxRank} · 부담 ${activePenaltyRank}</span><small>${escapeHTML(node.effect)}</small>
    </button>`;
}

function formatPruningStatValue(stat) {
    let value = Math.abs(Number(stat.val) || 0);
    return value > 0 && value < 1 ? String(Number(value.toFixed(4))) : formatValue(stat.id, value);
}

function renderPruningStatPills(stats, emptyText) {
    if (stats.length <= 0) return `<small>${emptyText}</small>`;
    return stats.map(stat => {
        let sign = stat.val > 0 ? '+' : '-';
        return `<span>${escapeHTML(getStatName(stat.id))} <b>${sign}${formatPruningStatValue(stat)}</b></span>`;
    }).join('');
}

function renderPruningTreeSummary() {
    let stats = getPruningTreeStats(game);
    let gains = stats.filter(stat => stat.val > 0);
    let burdens = stats.filter(stat => stat.val < 0);
    return `<section class="pruning-stat-summary">
        <div class="gain"><strong>현재 성장 효과</strong><p>${renderPruningStatPills(gains, '아직 성장한 가지가 없습니다.')}</p></div>
        <div class="burden"><strong>남은 부담</strong><p>${renderPruningStatPills(burdens, '현재 남은 부담이 없습니다.')}</p></div>
    </section>`;
}

function renderPruningChoicePanel(tree) {
    let node = PRUNING_TREE_DB.find(row => row.id === selectedPruningNodeId) || PRUNING_TREE_DB[0];
    selectedPruningNodeId = node.id;
    let rank = Math.max(0, Math.floor(tree.nodeRanks[node.id] || 0));
    let penaltyRank = getPruningNodeActivePenaltyRank(node.id, tree);
    let requirementsMet = isPruningNodeRequirementMet(node, tree);
    let canGrow = requirementsMet && rank < node.maxRank && tree.growthPoints >= node.cost;
    let canPrune = penaltyRank > 0 && tree.growthPoints >= node.cost;
    let lockText = requirementsMet ? '' : '<small>이어진 선행 가지를 3단계까지 성장시켜야 합니다.</small>';
    return `<section class="pruning-choice-panel">
        <div><span>선택한 가지</span><strong>${escapeHTML(node.name)} ${rank}/${node.maxRank}</strong>${lockText}</div>
        <div class="pruning-choice-effects"><span class="gain">성장 · ${escapeHTML(node.effect)}</span><span class="burden">부담 ${penaltyRank}단계 · ${escapeHTML(node.penaltyEffect)}</span></div>
        <div class="pruning-choice-actions"><button type="button" onclick="investInPruningNode('${node.id}')" ${canGrow ? '' : 'disabled'}>부담을 안고 성장 <small>${node.cost}점</small></button><button type="button" onclick="pruneSelectedPruningPenalty('${node.id}')" ${canPrune ? '' : 'disabled'}>부담 가지치기 <small>${node.cost}점</small></button></div>
    </section>`;
}

function selectPruningNode(nodeId) {
    if (!PRUNING_TREE_DB.some(node => node.id === nodeId)) return;
    selectedPruningNodeId = nodeId;
    renderPruningTreePanel();
}

function renderPruningTreePanel() {
    let section = document.getElementById('pruning-tree-section');
    let panel = document.getElementById('ui-pruning-tree-panel');
    if (!section || !panel) return;
    let tree = ensurePruningTreeState(game);
    section.style.display = tree.unlocked ? '' : 'none';
    if (!tree.unlocked) return;
    let nodes = PRUNING_TREE_DB.map(node => renderPruningNode(node, tree)).join('');
    let html = `<div class="pruning-head"><div><span>LOOP ${getEndgameProgressLoop(game)}</span><strong>남은 성장점 ${tree.growthPoints}</strong></div><p>성장하면 능력과 부담이 함께 자랍니다. 부담을 유지하고 더 성장하거나, 성장점으로 부담 한 단계를 잘라낼 수 있습니다.</p></div>
        ${renderPruningTreeSummary()}<div class="pruning-workspace"><div class="pruning-tree" aria-label="가지치기 성장 나무">${renderPruningConnections()}${nodes}</div>${renderPruningChoicePanel(tree)}</div>`;
    if (panel.__lastHtml !== html) panel.innerHTML = html;
    panel.__lastHtml = html;
}

function investInPruningNode(nodeId) {
    let result = investPruningNode(nodeId, game);
    if (!result.ok) return addLog(result.code === 'points' ? '성장점이 부족합니다.' : '먼저 이어진 가지를 충분히 성장시키세요.', 'attack-monster');
    let node = PRUNING_TREE_DB.find(row => row.id === nodeId);
    addLog(`🌿 ${node.name} ${result.rank}단계로 성장했습니다.`, 'season-up');
    renderPruningTreePanel();
    if (typeof saveGame === 'function') saveGame();
}

function pruneSelectedPruningPenalty(nodeId) {
    let result = prunePruningNodePenalty(nodeId, game);
    if (!result.ok) return addLog(result.code === 'points' ? '성장점이 부족합니다.' : '잘라낼 부담이 없습니다.', 'attack-monster');
    let node = PRUNING_TREE_DB.find(row => row.id === nodeId);
    addLog(`✂️ ${node.name}의 부담을 가지쳐 남은 부담이 ${result.activePenaltyRank}단계가 되었습니다.`, 'season-up');
    renderPruningTreePanel();
    if (typeof saveGame === 'function') saveGame();
}

safeExposeGlobals({
    renderArcanaPanel, selectArcanaCard, openSealedArcanaCard, placeSelectedArcanaCard, removeArcanaCard,
    renderPruningTreePanel, selectPruningNode, investInPruningNode, pruneSelectedPruningPenalty
});
