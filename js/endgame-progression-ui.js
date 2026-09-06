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
    let growthRefund = getPruningRefundPlan(node.id, 'growth', game);
    let burdenRefund = getPruningRefundPlan(node.id, 'burden', game);
    let lockText = requirementsMet ? '' : '<small>이어진 선행 가지를 3단계까지 성장시켜야 합니다.</small>';
    return `<section class="pruning-choice-panel">
        <div><span>선택한 가지</span><strong>${escapeHTML(node.name)} ${rank}/${node.maxRank}</strong>${lockText}</div>
        <div class="pruning-choice-effects"><span class="gain">성장 · ${escapeHTML(node.effect)}</span><span class="burden">부담 ${penaltyRank}단계 · ${escapeHTML(node.penaltyEffect)}</span></div>
        <div class="pruning-choice-actions"><button type="button" onclick="investInPruningNode('${node.id}')" ${canGrow ? '' : 'disabled'}>부담을 안고 성장 <small>${node.cost}점</small></button><button type="button" onclick="pruneSelectedPruningPenalty('${node.id}')" ${canPrune ? '' : 'disabled'}>부담 가지치기 <small>${node.cost}점</small></button>
        <button type="button" onclick="askRefundPruningNode('${node.id}', 'growth')" ${growthRefund.ok ? '' : 'disabled'}>성장 1단계 반환 <small>${growthRefund.ok ? `포자 ${growthRefund.cost}개 · ${growthRefund.points}점 회수` : '투자한 성장 없음'}</small></button>
        <button type="button" onclick="askRefundPruningNode('${node.id}', 'burden')" ${burdenRefund.ok ? '' : 'disabled'}>가지치기 1단계 반환 <small>${burdenRefund.ok ? `포자 ${burdenRefund.cost}개 · 부담 1단계 복원` : '가지친 부담 없음'}</small></button></div>
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
    let html = `<div class="pruning-head"><div><span>LOOP ${getEndgameProgressLoop(game)} · 루프당 ${PRUNING_TREE_POINTS_PER_LOOP}점</span><strong>남은 성장점 ${tree.growthPoints}</strong><small>마름병 포자 ${game.currencies.blightSpore || 0}개</small></div><p>성장점으로 능력을 키우거나 부담을 잘라냅니다. 반환 성장점 1점당 마름병 포자 1개가 필요합니다.</p><button type="button" onclick="askRefundPruningNode(null, 'all')">전체 반환</button></div>
        ${renderPruningTreeSummary()}<div class="pruning-workspace"><div class="pruning-tree-scroll" tabindex="0" role="region" aria-label="성장 나무 · 상하좌우 스크롤"><div class="pruning-tree" aria-label="가지치기 성장 나무">${renderPruningConnections()}${nodes}</div></div>${renderPruningChoicePanel(tree)}</div>`;
    if (panel.__lastHtml !== html) {
        let previous = panel.querySelector('.pruning-tree-scroll');
        let scrollPosition = previous && previous.clientWidth > 0 ? { left: previous.scrollLeft, top: previous.scrollTop } : null;
        panel.innerHTML = html;
        if (scrollPosition) {
            let viewport = panel.querySelector('.pruning-tree-scroll');
            viewport.scrollLeft = scrollPosition.left;
            viewport.scrollTop = scrollPosition.top;
            viewport.dataset.positioned = 'true';
        }
    }
    let viewport = panel.querySelector('.pruning-tree-scroll');
    // updateStaticUI also renders hidden tabs, whose scroll dimensions are zero.
    if (viewport.clientWidth > 0 && !viewport.dataset.positioned) {
        viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
        viewport.scrollTop = viewport.scrollHeight;
        viewport.dataset.positioned = 'true';
    }
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

async function askRefundPruningNode(nodeId, kind) {
    let plan = getPruningRefundPlan(nodeId, kind, game);
    if (!plan.ok) return addLog('반환할 성장점이 없습니다.', 'attack-monster');
    if ((game.currencies.blightSpore || 0) < plan.cost) return addLog(`마름병 포자가 ${plan.cost}개 필요합니다.`, 'attack-monster');
    let consequence = kind === 'burden' ? '가지친 부담 1단계가 다시 적용됩니다.'
        : '선행 조건이 부족해지는 상위 가지와 해당 가지치기 비용도 함께 반환됩니다.';
    let message = `${plan.affected.join(', ')}\n${consequence}\n성장점 ${plan.points}점 반환 / 마름병 포자 ${plan.cost}개 소모`;
    if (!await requestGameConfirmation(message, { title: '가지치기 반환', confirmLabel: '반환', tone: 'danger' })) return;
    let result = refundPruningNode(nodeId, kind, game, plan.signature);
    if (!result.ok) {
        renderPruningTreePanel();
        return addLog(result.code === 'currency' ? '마름병 포자가 부족합니다.' : '투자 상태가 바뀌었습니다. 반환 범위를 다시 확인하세요.', 'attack-monster');
    }
    addLog(`성장점 ${result.refunded}점을 반환했습니다. (마름병 포자 ${result.cost}개 소모)`, 'season-up');
    updateStaticUI();
    saveGame();
}

function formatBeyondBoundarySealStats(definition, level) {
    return definition.stats.map(stat => {
        let value = Number((stat.val * level).toFixed(2));
        let suffix = P_STATS[stat.id] && P_STATS[stat.id].isPct ? '%' : '';
        return `${escapeHTML(getStatName(stat.id))} +${formatValue(stat.id, value)}${suffix}`;
    }).join(' · ');
}

function renderBeyondBoundarySeal(definition, state) {
    let progress = state.seals[definition.id];
    let selected = state.selectedSealId === definition.id;
    let maxed = progress.level >= definition.maxLevel;
    let cost = maxed ? 0 : getBeyondBoundarySealLevelCost(progress.level);
    let progressText = maxed ? '최대 레벨' : `${progress.xp}/${cost} EXP`;
    return `<button type="button" class="beyond-seal ${selected ? 'selected' : ''}" onclick="chooseBeyondBoundarySeal('${definition.id}')" ${state.activeRun ? 'disabled' : ''}>
        <span>${escapeHTML(definition.name)}</span><strong>Lv.${progress.level}/${definition.maxLevel}</strong>
        <small>${escapeHTML(definition.description)}</small><i>${formatBeyondBoundarySealStats(definition, progress.level)}</i>
        <em>${progressText}${selected ? ' · 성장 대상' : ''}</em>
    </button>`;
}

function renderBeyondBoundaryMutators(tier) {
    let profile = getBeyondBoundaryTierProfile(tier);
    let activeIds = new Set(profile.mutatorIds);
    let active = BEYOND_BOUNDARY_MUTATOR_DB.filter(row => activeIds.has(row.id));
    if (active.length <= 0) return '<span class="beyond-mutator empty">추가 변형 없음</span>';
    return active.map(row => `<span class="beyond-mutator"><b>${escapeHTML(row.name)}</b>${escapeHTML(row.description)}</span>`).join('');
}

function formatBeyondBoundaryCosts(costs) {
    if (!Array.isArray(costs) || costs.length === 0) return '소모 없음';
    return costs.map(row => `${escapeHTML((ORB_DB[row.key] || {}).name || row.key)} ${row.amount}`).join(' + ');
}

function renderBeyondBoundaryRewardFocuses(state) {
    let selectedId = state.activeRun ? state.activeRun.rewardFocusId : state.selectedRewardFocusId;
    return BEYOND_BOUNDARY_REWARD_FOCUS_DB.map(row => {
        const status = getBeyondBoundaryRewardFocusStatus(row.id);
        return `<button type="button" class="beyond-farm-option ${selectedId === row.id ? 'selected' : ''}"
            onclick="chooseBeyondBoundaryRewardFocus('${row.id}')" ${state.activeRun || !status.available ? 'disabled' : ''}>
            <strong>${escapeHTML(row.name)}</strong><span>${escapeHTML(row.description)}</span><small>${escapeHTML(status.reason || row.risk)}</small>
        </button>`;
    }).join('');
}

function renderBeyondBoundaryStartAction(state) {
    if (state.activeRun) return `<button class="primary" type="button" onclick="viewBeyondBoundaryCombat()">전투 보기</button><button class="danger" type="button" onclick="leaveBeyondBoundaryRun()">도전 포기</button>`;
    const status = getBeyondBoundaryRewardFocusStatus(state.selectedRewardFocusId);
    const note = status.available ? '' : `<small>${escapeHTML(status.reason)} · 다른 보상을 선택하세요.</small>`;
    return `<button class="primary" type="button" onclick="enterBeyondBoundaryRun()" ${status.available ? '' : 'disabled'}>${state.selectedTier}단계 도전 시작</button>${note}`;
}

function renderBeyondBoundaryIntensities(state) {
    let selectedId = state.activeRun ? state.activeRun.intensityId : state.selectedIntensityId;
    return BEYOND_BOUNDARY_INTENSITY_DB.map(row => `<button type="button" class="beyond-farm-option intensity ${selectedId === row.id ? 'selected' : ''}"
        onclick="chooseBeyondBoundaryIntensity('${row.id}')" ${state.activeRun ? 'disabled' : ''}>
        <strong>${escapeHTML(row.name)}</strong><span>${escapeHTML(row.description)}</span><small>${formatBeyondBoundaryCosts(row.costs)}</small>
    </button>`).join('');
}

function renderBeyondBoundaryPanel() {
    let panel = document.getElementById('ui-beyond-boundary-panel');
    if (!panel) return;
    let state = ensureBeyondBoundaryState(game);
    if (!state.unlocked) { panel.innerHTML = ''; return; }
    let run = state.activeRun;
    let selectedTier = run ? run.tier : state.selectedTier;
    let zone = getZone(BEYOND_BOUNDARY_ZONE_ID);
    let estimate = typeof buildMapPowerEstimateHtml === 'function' ? buildMapPowerEstimateHtml(zone) : '';
    let tierControls = run
        ? `<div class="beyond-run-state"><strong>${run.tier}단계 진행 중</strong><span>${run.wave}/${BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER} 조우</span></div>`
        : `<div class="beyond-tier-controls"><button type="button" onclick="stepBeyondBoundaryTier(-1)" ${state.selectedTier <= 1 ? 'disabled' : ''}>−</button><label>도전 단계<input type="number" min="1" max="${state.highestTier}" value="${state.selectedTier}" onchange="setBeyondBoundaryTier(this.value)"></label><button type="button" onclick="stepBeyondBoundaryTier(1)" ${state.selectedTier >= state.highestTier ? 'disabled' : ''}>＋</button></div>`;
    let action = renderBeyondBoundaryStartAction(state);
    panel.innerHTML = `<section class="beyond-head"><div><span>BEYOND THE BOUNDARY</span><h3>경계 너머</h3><p>다섯 조우를 연속 돌파해 빌드의 한계를 시험합니다. 마지막 조우는 보스전입니다.</p></div><dl><div><dt>최고 도달</dt><dd>${state.bestTier}단계</dd></div><div><dt>도전 가능</dt><dd>${state.highestTier}단계</dd></div><div><dt>완료</dt><dd>${state.completions}회</dd></div></dl></section>
        <section class="beyond-challenge"><div>${tierControls}<div class="beyond-mutators">${renderBeyondBoundaryMutators(selectedTier)}</div>${estimate}</div><div class="beyond-actions">${action}</div></section>
        <section class="beyond-farming"><header><div><span>FARMING FOCUS</span><h3>완료 보상 집중</h3></div><p>원하는 파밍 계열을 고릅니다. 위험은 보상 계열에 따라 달라지고, 조율 재화는 도전 시작 때 한 번만 소모됩니다.</p></header><div class="beyond-focus-grid">${renderBeyondBoundaryRewardFocuses(state)}</div><div class="beyond-intensity-grid">${renderBeyondBoundaryIntensities(state)}</div></section>
        <section class="beyond-seals"><header><div><span>완료 보상</span><h3>경계 인장 성장</h3></div><p>선택한 인장에 완료 경험치가 들어갑니다. 획득한 모든 인장 효과는 누적 적용됩니다.</p></header><div>${BEYOND_BOUNDARY_SEAL_DB.map(seal => renderBeyondBoundarySeal(seal, state)).join('')}</div></section>`;
}

function setBeyondBoundaryTier(value) {
    selectBeyondBoundaryTier(value, game);
    renderBeyondBoundaryPanel();
}

function stepBeyondBoundaryTier(delta) {
    let state = ensureBeyondBoundaryState(game);
    setBeyondBoundaryTier(state.selectedTier + Math.sign(Number(delta) || 0));
}

function chooseBeyondBoundarySeal(sealId) {
    if (!selectBeyondBoundarySeal(sealId, game)) return;
    renderBeyondBoundaryPanel();
    if (typeof saveGame === 'function') saveGame();
}

function chooseBeyondBoundaryRewardFocus(focusId) {
    if (!selectBeyondBoundaryRewardFocus(focusId, game)) return;
    renderBeyondBoundaryPanel();
    if (typeof saveGame === 'function') saveGame();
}

function chooseBeyondBoundaryIntensity(intensityId) {
    if (!selectBeyondBoundaryIntensity(intensityId, game)) return;
    renderBeyondBoundaryPanel();
    if (typeof saveGame === 'function') saveGame();
}

function enterBeyondBoundaryRun() {
    let state = ensureBeyondBoundaryState(game);
    let result = startBeyondBoundaryRun(state.selectedTier, game);
    if (!result.ok) {
        let message = result.code === 'locked' ? '경계 너머가 아직 잠겨 있습니다.'
            : result.code === 'cost' ? `조율 재화가 부족합니다. (필요: ${formatBeyondBoundaryCosts(result.costs)})`
                : '이미 경계 너머에 도전 중입니다.';
        return addLog(result.reason || message, 'attack-monster');
    }
    changeZone(BEYOND_BOUNDARY_ZONE_ID);
    switchTab('tab-battle');
    if (typeof saveGame === 'function') saveGame();
}

function viewBeyondBoundaryCombat() {
    if (!ensureBeyondBoundaryState(game).activeRun) return;
    if (game.currentZoneId !== BEYOND_BOUNDARY_ZONE_ID) changeZone(BEYOND_BOUNDARY_ZONE_ID);
    switchTab('tab-battle');
}

function leaveBeyondBoundaryRun() {
    let returnZoneId = abandonBeyondBoundaryRun(game);
    if (returnZoneId === null || returnZoneId === undefined) return;
    game.currentZoneId = returnZoneId;
    game.killsInZone = 0;
    startMoving(false);
    addLog('경계 너머 도전을 포기했습니다.', 'attack-monster');
    updateStaticUI();
    if (typeof saveGame === 'function') saveGame();
}

safeExposeGlobals({
    renderArcanaPanel, selectArcanaCard, openSealedArcanaCard, placeSelectedArcanaCard, removeArcanaCard,
    renderPruningTreePanel, selectPruningNode, investInPruningNode, pruneSelectedPruningPenalty, askRefundPruningNode,
    renderBeyondBoundaryPanel, setBeyondBoundaryTier, stepBeyondBoundaryTier,
    chooseBeyondBoundarySeal, chooseBeyondBoundaryRewardFocus, chooseBeyondBoundaryIntensity,
    enterBeyondBoundaryRun, viewBeyondBoundaryCombat, leaveBeyondBoundaryRun
});
