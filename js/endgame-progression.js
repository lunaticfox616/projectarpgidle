function createDefaultWorldDeckState() {
    return {
        unlocked: false, pruningUnlocked: false, collection: {}, activeCardId: null,
        pendingChoices: [], pruningPoints: 0, prunedCardIds: [], lastOfferLoop: 0,
        lastPruningGrantLoop: WORLD_CARD_PRUNING_LOOP - 1
    };
}

function getWorldDeckProgressLoop(ownerState) {
    let source = ownerState || game;
    return Math.max(1, Math.floor(Number(source.season) || 1), Math.floor(Number(source.loopCount) || 0));
}

function normalizeWorldDeckState(value, ownerState) {
    let source = value && typeof value === 'object' ? value : {};
    let validIds = new Set(WORLD_CARD_DB.map(card => card.id));
    let normalized = createDefaultWorldDeckState();
    Object.entries(source.collection || {}).forEach(([id, rank]) => {
        if (validIds.has(id)) normalized.collection[id] = Math.max(1, Math.min(WORLD_CARD_MAX_RANK, Math.floor(Number(rank) || 1)));
    });
    normalized.activeCardId = validIds.has(source.activeCardId) ? source.activeCardId : null;
    normalized.pendingChoices = Array.from(new Set(Array.isArray(source.pendingChoices) ? source.pendingChoices : [])).filter(id => validIds.has(id)).slice(0, 3);
    normalized.pruningPoints = Math.max(0, Math.floor(Number(source.pruningPoints) || 0));
    normalized.prunedCardIds = Array.from(new Set(Array.isArray(source.prunedCardIds) ? source.prunedCardIds : [])).filter(id => validIds.has(id));
    normalized.lastOfferLoop = Math.max(0, Math.floor(Number(source.lastOfferLoop) || 0));
    normalized.lastPruningGrantLoop = Math.max(WORLD_CARD_PRUNING_LOOP - 1, Math.floor(Number(source.lastPruningGrantLoop) || WORLD_CARD_PRUNING_LOOP - 1));
    let loop = getWorldDeckProgressLoop(ownerState || game);
    normalized.unlocked = !!source.unlocked || loop >= WORLD_CARD_UNLOCK_LOOP;
    normalized.pruningUnlocked = !!source.pruningUnlocked || loop >= WORLD_CARD_PRUNING_LOOP;
    return normalized;
}

function rollWorldCardChoices(deck, randomFn) {
    let random = typeof randomFn === 'function' ? randomFn : Math.random;
    let state = deck || createDefaultWorldDeckState();
    let candidates = WORLD_CARD_DB.map(card => ({
        card,
        rank: Math.floor(Number((state.collection || {})[card.id]) || 0),
        order: random()
    })).sort((left, right) => left.rank - right.rank || left.order - right.order).map(row => row.card);
    let nonActive = candidates.filter(card => card.id !== state.activeCardId);
    return (nonActive.length >= 3 ? nonActive : candidates).slice(0, 3).map(card => card.id);
}

function advanceWorldDeckForLoop(ownerState, randomFn) {
    let source = ownerState || game;
    let loop = getWorldDeckProgressLoop(source);
    let deck = normalizeWorldDeckState(source.worldDeck, source);
    let changed = false;
    if (loop >= WORLD_CARD_UNLOCK_LOOP && deck.lastOfferLoop < loop) {
        deck.pendingChoices = rollWorldCardChoices(deck, randomFn);
        deck.lastOfferLoop = loop;
        changed = true;
    }
    if (loop >= WORLD_CARD_PRUNING_LOOP && deck.lastPruningGrantLoop < loop) {
        deck.pruningPoints += loop - Math.max(WORLD_CARD_PRUNING_LOOP - 1, deck.lastPruningGrantLoop);
        deck.lastPruningGrantLoop = loop;
        changed = true;
    }
    source.worldDeck = deck;
    return { changed, deck };
}

function ensureWorldDeckState(ownerState) {
    return advanceWorldDeckForLoop(ownerState || game).deck;
}

function chooseWorldCard(cardId) {
    let deck = ensureWorldDeckState(game);
    if (!deck.pendingChoices.includes(cardId)) return false;
    deck.collection[cardId] = Math.min(WORLD_CARD_MAX_RANK, Math.max(0, Math.floor(deck.collection[cardId] || 0)) + 1);
    deck.activeCardId = cardId;
    deck.pendingChoices = [];
    let card = WORLD_CARD_DB.find(row => row.id === cardId);
    addLog(`🃏 세계 카드 [${card.name}] 선택 · 등급 ${deck.collection[cardId]}/${WORLD_CARD_MAX_RANK}`, 'loot-unique');
    if (typeof updateStaticUI === 'function') updateStaticUI();
    return true;
}

function pruneWorldCard(cardId) {
    let deck = ensureWorldDeckState(game);
    let card = WORLD_CARD_DB.find(row => row.id === cardId);
    if (!deck.pruningUnlocked || !card || !deck.collection[cardId] || deck.prunedCardIds.includes(cardId)) return false;
    if (deck.pruningPoints < card.pruneCost) return false;
    deck.pruningPoints -= card.pruneCost;
    deck.prunedCardIds.push(cardId);
    addLog(`✂️ [${card.name}]의 불리한 가지를 잘라냈습니다. 이 카드의 부담이 영구 제거됩니다.`, 'loot-unique');
    if (typeof updateStaticUI === 'function') updateStaticUI();
    return true;
}

function scaleWorldCardModifiers(modifiers, rank) {
    let scale = 1 + Math.max(0, rank - 1) * 0.25;
    return Object.fromEntries(Object.entries(modifiers || {}).map(([key, value]) => [key, 1 + (Number(value) - 1) * scale]));
}

function getActiveWorldCardModifiers(ownerState) {
    let source = ownerState || game;
    let deck = normalizeWorldDeckState(source.worldDeck, source);
    let card = WORLD_CARD_DB.find(row => row.id === deck.activeCardId);
    if (!card) return {};
    let rank = Math.max(1, Math.floor(deck.collection[card.id] || 1));
    let boon = scaleWorldCardModifiers(card.boonMods, rank);
    let burden = deck.prunedCardIds.includes(card.id) ? {} : scaleWorldCardModifiers(card.burdenMods, rank);
    return { ...boon, ...burden, cardId: card.id, rank, pruned: deck.prunedCardIds.includes(card.id) };
}

function getWorldCardEnemyMultipliers(enemy, ownerState) {
    let mods = getActiveWorldCardModifiers(ownerState || game);
    let hp = Number(mods.enemyHpMul) || 1;
    let damage = Number(mods.enemyDamageMul) || 1;
    if (enemy && enemy.isBoss) {
        hp *= Number(mods.bossHpMul) || 1;
        damage *= Number(mods.bossDamageMul) || 1;
    }
    if (enemy && (enemy.isElite || enemy.isBoss)) {
        hp *= Number(mods.eliteBossHpMul) || 1;
    }
    if (enemy && enemy.isElite) {
        damage *= Number(mods.eliteDamageMul) || 1;
    }
    return { hp, damage };
}

function getWorldCardDropMultipliers(enemy, ownerState) {
    let mods = getActiveWorldCardModifiers(ownerState || game);
    let equipment = Number(mods.equipmentDropMul) || 1;
    let growth = Number(mods.growthDropMul) || 1;
    if (enemy && enemy.isBoss) equipment *= Number(mods.bossDropMul) || 1;
    else equipment *= Number(mods.nonBossDropMul) || 1;
    if (enemy && enemy.isElite) equipment *= Number(mods.eliteDropMul) || 1;
    if (enemy && (enemy.isElite || enemy.isBoss)) growth *= Number(mods.eliteBossGrowthDropMul) || 1;
    return { equipment, growth };
}

safeExposeGlobals({
    createDefaultWorldDeckState, getWorldDeckProgressLoop, normalizeWorldDeckState, rollWorldCardChoices, advanceWorldDeckForLoop,
    ensureWorldDeckState, chooseWorldCard, pruneWorldCard, scaleWorldCardModifiers,
    getActiveWorldCardModifiers, getWorldCardEnemyMultipliers, getWorldCardDropMultipliers
});
