function getWorldCardRankLabel(rank) {
    return ['미발견', 'I', 'II', 'III'][Math.max(0, Math.min(WORLD_CARD_MAX_RANK, Math.floor(rank || 0)))];
}

function renderWorldCardChoice(card, deck) {
    let rank = Math.floor(deck.collection[card.id] || 0);
    let nextRank = Math.min(WORLD_CARD_MAX_RANK, rank + 1);
    return `<article class="world-card choice family-${card.family}">
        <header><span>WORLD CARD</span><strong>${escapeHTML(card.name)}</strong><small>${getWorldCardRankLabel(rank)} → ${getWorldCardRankLabel(nextRank)}</small></header>
        <div class="world-card-boon"><b>수확</b>${escapeHTML(card.boon)}</div>
        <div class="world-card-burden"><b>부담</b>${escapeHTML(card.burden)}</div>
        <button type="button" onclick="chooseWorldCard('${card.id}')">이 루프에 새기기</button>
    </article>`;
}

function renderOwnedWorldCard(card, deck) {
    let rank = Math.floor(deck.collection[card.id] || 0);
    let active = deck.activeCardId === card.id;
    let pruned = deck.prunedCardIds.includes(card.id);
    let canPrune = deck.pruningUnlocked && !pruned && deck.pruningPoints >= card.pruneCost;
    return `<article class="world-card owned ${active ? 'active' : ''} ${pruned ? 'pruned' : ''}">
        <header><strong>${escapeHTML(card.name)}</strong><small>${getWorldCardRankLabel(rank)}${active ? ' · 적용 중' : ''}</small></header>
        <div class="world-card-boon">${escapeHTML(card.boon)}</div>
        <div class="world-card-burden">${pruned ? '부담 제거 완료' : escapeHTML(card.burden)}</div>
        ${deck.pruningUnlocked && !pruned ? `<button type="button" onclick="pruneWorldCard('${card.id}')" ${canPrune ? '' : 'disabled'}>가지치기 ${card.pruneCost}점</button>` : ''}
    </article>`;
}

function renderWorldDeckPanel() {
    let section = document.getElementById('world-card-section');
    let panel = document.getElementById('ui-world-card-panel');
    if (!section || !panel) return;
    let loop = getWorldDeckProgressLoop(game);
    section.style.display = loop >= WORLD_CARD_UNLOCK_LOOP ? '' : 'none';
    if (loop < WORLD_CARD_UNLOCK_LOOP) return;
    let deck = ensureWorldDeckState(game);
    let choices = deck.pendingChoices.map(id => WORLD_CARD_DB.find(card => card.id === id)).filter(Boolean);
    let owned = WORLD_CARD_DB.filter(card => deck.collection[card.id]);
    let pruning = deck.pruningUnlocked
        ? `<div class="world-card-pruning"><strong>가지치기 ${deck.pruningPoints}점</strong><span>루프마다 1점 · 카드의 부담을 영구 제거</span></div>`
        : `<div class="world-card-pruning locked"><strong>가지치기 잠금</strong><span>루프 ${WORLD_CARD_PRUNING_LOOP}에 해금</span></div>`;
    let choiceHtml = choices.length > 0
        ? `<section><h3>이번 루프의 세 갈래</h3><p>수확과 부담을 함께 보고 하나를 선택하세요. 같은 카드를 다시 고르면 III까지 성장합니다.</p><div class="world-card-grid choices">${choices.map(card => renderWorldCardChoice(card, deck)).join('')}</div></section>`
        : `<div class="world-card-current">${deck.activeCardId ? `현재 적용: <strong>${escapeHTML((WORLD_CARD_DB.find(card => card.id === deck.activeCardId) || {}).name || '')}</strong>` : '선택 가능한 카드가 없습니다.'}</div>`;
    let collectionHtml = owned.length > 0 ? `<details class="world-card-collection"><summary>수집한 카드 ${owned.length}/${WORLD_CARD_DB.length}</summary><div class="world-card-grid">${owned.map(card => renderOwnedWorldCard(card, deck)).join('')}</div></details>` : '';
    let html = `<div class="world-deck-head"><div><span>LOOP ${loop}</span><strong>세계의 규칙을 한 장 고릅니다.</strong></div>${pruning}</div>${choiceHtml}${collectionHtml}`;
    if (panel.__lastHtml === html) return;
    panel.innerHTML = html;
    panel.__lastHtml = html;
}

safeExposeGlobals({ renderWorldDeckPanel });
