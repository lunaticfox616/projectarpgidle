function createDefaultArcanaQuestState() {
    return { started: false, exploredNodeIds: [], rewarded: false };
}

function createDefaultArcanaState() {
    return {
        version: 2, unlocked: false, sealedCards: 0, totalSealedFound: 0,
        cards: [], deckSlots: Array(ARCANA_DECK_SLOT_COUNT).fill(null),
        equipmentSlots: Object.fromEntries(ARCANA_EQUIPMENT_SLOT_KEYS.map(slot => [slot, null])),
        nextCardUid: 1, quest: createDefaultArcanaQuestState()
    };
}

function normalizeArcanaQuestState(value) {
    let source = value && typeof value === 'object' ? value : {};
    let exploredNodeIds = Array.from(new Set((Array.isArray(source.exploredNodeIds) ? source.exploredNodeIds : [])
        .filter(id => typeof id === 'string' && id.length > 0))).slice(0, 250);
    return {
        started: !!source.started || exploredNodeIds.length > 0,
        exploredNodeIds,
        rewarded: !!source.rewarded
    };
}

function getEndgameProgressLoop(ownerState) {
    let source = ownerState || game;
    return Math.max(1, Math.floor(Number(source.season) || 1), Math.floor(Number(source.loopCount) || 0));
}

function normalizeArcanaCopies(source) {
    let validIds = new Set(ARCANA_CARD_DB.map(card => card.id));
    let seenUids = new Set();
    let cards = [];
    (Array.isArray(source.cards) ? source.cards : []).forEach(raw => {
        if (!raw || !validIds.has(raw.cardId)) return;
        let uid = Math.max(1, Math.floor(Number(raw.uid) || 0));
        if (seenUids.has(uid)) return;
        seenUids.add(uid);
        cards.push({ uid, cardId: raw.cardId, obtainedLoop: Math.max(1, Math.floor(Number(raw.obtainedLoop) || 1)) });
    });
    return cards;
}

function normalizeArcanaState(value) {
    let source = value && typeof value === 'object' ? value : {};
    let normalized = createDefaultArcanaState();
    normalized.cards = normalizeArcanaCopies(source);
    let copiesByUid = new Map(normalized.cards.map(copy => [copy.uid, copy]));
    let usedUids = new Set();
    let deckCardIds = new Set();
    let rawDeck = Array.isArray(source.deckSlots) ? source.deckSlots : [];
    normalized.deckSlots = normalized.deckSlots.map((unused, index) => {
        let uid = Math.floor(Number(rawDeck[index]) || 0);
        let copy = copiesByUid.get(uid);
        if (!copy || usedUids.has(uid) || deckCardIds.has(copy.cardId)) return null;
        usedUids.add(uid);
        deckCardIds.add(copy.cardId);
        return uid;
    });
    let rawEquipment = source.equipmentSlots && typeof source.equipmentSlots === 'object' ? source.equipmentSlots : {};
    ARCANA_EQUIPMENT_SLOT_KEYS.forEach(slot => {
        let uid = Math.floor(Number(rawEquipment[slot]) || 0);
        if (!copiesByUid.has(uid) || usedUids.has(uid)) return;
        normalized.equipmentSlots[slot] = uid;
        usedUids.add(uid);
    });
    normalized.sealedCards = Math.max(0, Math.floor(Number(source.sealedCards) || 0));
    normalized.totalSealedFound = Math.max(normalized.sealedCards, Math.floor(Number(source.totalSealedFound) || 0));
    normalized.unlocked = !!source.unlocked || normalized.totalSealedFound > 0 || normalized.cards.length > 0;
    let maxUid = normalized.cards.reduce((max, copy) => Math.max(max, copy.uid), 0);
    normalized.nextCardUid = Math.max(maxUid + 1, Math.floor(Number(source.nextCardUid) || 1));
    normalized.quest = normalizeArcanaQuestState(source.quest);
    return normalized;
}

function ensureArcanaState(ownerState) {
    let source = ownerState || game;
    if (source.arcana && source.arcana.version === 2 && source.arcana.quest) return source.arcana;
    source.arcana = normalizeArcanaState(source.arcana);
    return source.arcana;
}

function grantSealedArcanaCard(count, ownerState) {
    let source = ownerState || game;
    let arcana = ensureArcanaState(source);
    let gained = Math.max(0, Math.floor(Number(count) || 0));
    if (gained <= 0) return { gained: 0, total: arcana.sealedCards };
    let unlockedNow = !arcana.unlocked;
    arcana.sealedCards += gained;
    arcana.totalSealedFound += gained;
    arcana.unlocked = true;
    if (source.unlocks) source.unlocks.arcana = true;
    if (source.noti) source.noti.arcana = true;
    return { gained, total: arcana.sealedCards, unlockedNow };
}

function unsealArcanaCard(ownerState, randomFn) {
    let source = ownerState || game;
    let arcana = ensureArcanaState(source);
    if (arcana.sealedCards <= 0) return { ok: false, code: 'no_sealed_card' };
    let random = typeof randomFn === 'function' ? randomFn : Math.random;
    let index = Math.min(ARCANA_CARD_DB.length - 1, Math.max(0, Math.floor(random() * ARCANA_CARD_DB.length)));
    let card = ARCANA_CARD_DB[index];
    let copy = { uid: arcana.nextCardUid++, cardId: card.id, obtainedLoop: getEndgameProgressLoop(source) };
    arcana.sealedCards--;
    arcana.cards.push(copy);
    return { ok: true, card, copy };
}

function getArcanaQuestStage(progress, rewarded) {
    if (rewarded) return { id: 'complete', name: '첫 아르카나 복원', description: '무명의 패가 복원되었습니다.' };
    if (progress >= 8) return { id: 'restore', name: '무명의 패 복원', description: '남은 봉인의 조각을 맞추세요.' };
    if (progress >= 4) return { id: 'decode', name: '봉인 문양 해독', description: '서로 다른 별길의 문양을 대조하세요.' };
    return { id: 'trace', name: '별길의 잔흔', description: '서로 다른 우주계 노드를 탐사하세요.' };
}

function getArcanaQuestProgress(ownerState) {
    let quest = ensureArcanaState(ownerState || game).quest;
    let current = Math.min(ARCANA_QUEST_EXPLORATION_TARGET, quest.exploredNodeIds.length);
    return {
        started: quest.started,
        rewarded: quest.rewarded,
        current,
        target: ARCANA_QUEST_EXPLORATION_TARGET,
        stage: getArcanaQuestStage(current, quest.rewarded)
    };
}

function completeArcanaQuestIfReady(source, arcana) {
    let quest = arcana.quest;
    if (quest.rewarded || quest.exploredNodeIds.length < ARCANA_QUEST_EXPLORATION_TARGET) return false;
    quest.rewarded = true;
    grantSealedArcanaCard(1, source);
    return true;
}

function recordArcanaQuestCosmosExploration(nodeId, ownerState) {
    let source = ownerState || game;
    let arcana = ensureArcanaState(source);
    let quest = arcana.quest;
    let id = typeof nodeId === 'string' ? nodeId : '';
    if (!id || quest.exploredNodeIds.includes(id)) return { changed: false, completedNow: false, ...getArcanaQuestProgress(source) };
    let startedNow = !quest.started;
    let previousStage = getArcanaQuestStage(quest.exploredNodeIds.length, quest.rewarded).id;
    quest.started = true;
    quest.exploredNodeIds.push(id);
    let completedNow = completeArcanaQuestIfReady(source, arcana);
    let progress = getArcanaQuestProgress(source);
    return { changed: true, startedNow, completedNow, stageChanged: progress.stage.id !== previousStage, ...progress };
}

function reconcileArcanaQuestFromCosmos(ownerState) {
    let source = ownerState || game;
    let arcana = ensureArcanaState(source);
    let cleared = source.cosmosAtlas && Array.isArray(source.cosmosAtlas.cleared) ? source.cosmosAtlas.cleared : [];
    let validIds = cleared.filter(id => typeof id === 'string' && id.length > 0);
    if (validIds.length <= 0) return { changed: false, completedNow: false, ...getArcanaQuestProgress(source) };
    let merged = Array.from(new Set([...arcana.quest.exploredNodeIds, ...validIds])).slice(0, 250);
    let changed = merged.length !== arcana.quest.exploredNodeIds.length || !arcana.quest.started;
    arcana.quest.started = true;
    arcana.quest.exploredNodeIds = merged;
    let completedNow = completeArcanaQuestIfReady(source, arcana);
    return { changed: changed || completedNow, completedNow, ...getArcanaQuestProgress(source) };
}

function findArcanaCopy(uid, ownerState) {
    let arcana = ensureArcanaState(ownerState || game);
    let targetUid = Math.floor(Number(uid) || 0);
    return arcana.cards.find(copy => copy.uid === targetUid) || null;
}

function getArcanaCardPlacement(uid, ownerState) {
    let arcana = ensureArcanaState(ownerState || game);
    let targetUid = Math.floor(Number(uid) || 0);
    let deckIndex = arcana.deckSlots.indexOf(targetUid);
    if (deckIndex >= 0) return { type: 'deck', key: deckIndex };
    let equipmentSlot = ARCANA_EQUIPMENT_SLOT_KEYS.find(slot => arcana.equipmentSlots[slot] === targetUid);
    return equipmentSlot ? { type: 'equipment', key: equipmentSlot } : null;
}

function equipArcanaCard(uid, destination, target, ownerState) {
    let source = ownerState || game;
    let arcana = ensureArcanaState(source);
    let targetUid = Math.floor(Number(uid) || 0);
    let copy = arcana.cards.find(row => row.uid === targetUid) || null;
    if (!copy) return { ok: false, code: 'missing_card' };
    let alreadyEquipped = arcana.deckSlots.includes(copy.uid)
        || ARCANA_EQUIPMENT_SLOT_KEYS.some(slot => arcana.equipmentSlots[slot] === copy.uid);
    if (alreadyEquipped) return { ok: false, code: 'already_equipped' };
    if (destination === 'deck') {
        let index = Number(target);
        if (!Number.isInteger(index)) return { ok: false, code: 'invalid_slot' };
        if (index < 0 || index >= ARCANA_DECK_SLOT_COUNT || arcana.deckSlots[index]) return { ok: false, code: 'invalid_slot' };
        let duplicate = arcana.deckSlots.some(placedUid => {
            let placed = arcana.cards.find(row => row.uid === placedUid);
            return placed && placed.cardId === copy.cardId;
        });
        if (duplicate) return { ok: false, code: 'duplicate_deck_card' };
        arcana.deckSlots[index] = copy.uid;
        return { ok: true, destination, target: index };
    }
    if (destination !== 'equipment' || !ARCANA_EQUIPMENT_SLOT_KEYS.includes(target) || arcana.equipmentSlots[target]) {
        return { ok: false, code: 'invalid_slot' };
    }
    arcana.equipmentSlots[target] = copy.uid;
    return { ok: true, destination, target };
}

function unequipArcanaCard(uid, ownerState) {
    let arcana = ensureArcanaState(ownerState || game);
    let targetUid = Math.floor(Number(uid) || 0);
    let deckIndex = arcana.deckSlots.indexOf(targetUid);
    if (deckIndex >= 0) {
        arcana.deckSlots[deckIndex] = null;
        return true;
    }
    let slot = ARCANA_EQUIPMENT_SLOT_KEYS.find(key => arcana.equipmentSlots[key] === targetUid);
    if (!slot) return false;
    arcana.equipmentSlots[slot] = null;
    return true;
}

function getArcanaDeckStats(ownerState) {
    let arcana = ensureArcanaState(ownerState || game);
    let copiesByUid = new Map(arcana.cards.map(copy => [copy.uid, copy]));
    return arcana.deckSlots.flatMap(uid => {
        let copy = copiesByUid.get(uid);
        let card = copy ? ARCANA_CARD_DB.find(row => row.id === copy.cardId) : null;
        return card ? card.deckStats.map(stat => ({ id: stat.id, val: stat.val })) : [];
    });
}

function getArcanaEquipmentSlotAmplifier(slotKey, ownerState) {
    let arcana = ensureArcanaState(ownerState || game);
    let uid = arcana.equipmentSlots[slotKey];
    let copy = uid ? arcana.cards.find(row => row.uid === uid) : null;
    let card = copy ? ARCANA_CARD_DB.find(row => row.id === copy.cardId) : null;
    if (!card || !card.slotAmp) return null;
    return { uid, cardId: card.id, pct: card.slotAmp.pct, statIds: card.slotAmp.statIds.slice() };
}

function getArcanaCardSlotAmplifier(uid, ownerState) {
    let arcana = ensureArcanaState(ownerState || game);
    let copy = arcana.cards.find(row => row.uid === Math.floor(Number(uid) || 0));
    let card = copy ? ARCANA_CARD_DB.find(row => row.id === copy.cardId) : null;
    return card && card.slotAmp ? { uid: copy.uid, cardId: card.id, pct: card.slotAmp.pct, statIds: card.slotAmp.statIds.slice() } : null;
}

function getArcanaCardGemDamageRule(uid, ownerState) {
    let arcana = ensureArcanaState(ownerState || game);
    let copy = arcana.cards.find(row => row.uid === Math.floor(Number(uid) || 0));
    let card = copy ? ARCANA_CARD_DB.find(row => row.id === copy.cardId) : null;
    let rule = card && card.slotGemDamage;
    if (!rule) return null;
    return { uid: copy.uid, cardId: card.id, perLevelPct: Number(rule.perLevelPct) || 0, capPct: Number(rule.capPct) || 0 };
}

function getArcanaEquipmentGemDamageRule(slotKey, ownerState) {
    let source = ownerState || game;
    let arcana = ensureArcanaState(source);
    let uid = arcana.equipmentSlots[slotKey];
    return uid ? getArcanaCardGemDamageRule(uid, source) : null;
}

function getArcanaAmplificationPreview(stats, amplifier) {
    if (!amplifier) return { pct: 0, lines: [] };
    let affected = new Set(amplifier.statIds);
    let lines = [];
    let visit = list => (Array.isArray(list) ? list : []).forEach(stat => {
        if (!stat || typeof stat !== 'object') return;
        if (affected.has(stat.id) && Number.isFinite(Number(stat.val))) {
            lines.push({ id: stat.id, value: Number(stat.val), gain: Number((Number(stat.val) * amplifier.pct / 100).toFixed(4)) });
        }
        visit(stat.extraStats);
    });
    visit(stats);
    return { pct: amplifier.pct, lines };
}

function amplifyArcanaStatLine(stat, affected, multiplier) {
    if (!stat || typeof stat !== 'object') return stat;
    let next = stat;
    if (affected.has(stat.id) && Number.isFinite(Number(stat.val))) {
        next = { ...next, val: Number((Number(stat.val) * multiplier).toFixed(4)) };
    }
    if (Array.isArray(stat.extraStats)) {
        next = { ...next, extraStats: stat.extraStats.map(extra => amplifyArcanaStatLine(extra, affected, multiplier)) };
    }
    return next;
}

function applyArcanaSlotAmplification(stats, slotKey, ownerState) {
    let list = Array.isArray(stats) ? stats : [];
    let amplifier = getArcanaEquipmentSlotAmplifier(slotKey, ownerState || game);
    if (!amplifier) return list;
    let affected = new Set(amplifier.statIds);
    let multiplier = 1 + Math.max(0, Number(amplifier.pct) || 0) / 100;
    return list.map(stat => amplifyArcanaStatLine(stat, affected, multiplier));
}

function getSealedArcanaCardDropChance(zone, enemy) {
    if (!zone || !enemy || !enemy.isBoss) return 0;
    if (zone.cosmosCapstone || zone.id === 'cosmos_astra') return ARCANA_CAPSTONE_DROP_CHANCE;
    if (zone.type !== 'cosmos') return 0;
    let galaxyBoss = enemy.cosmosBossId && typeof getCosmosGalaxyBossMechanic === 'function'
        ? getCosmosGalaxyBossMechanic(enemy.cosmosBossId) : null;
    return galaxyBoss ? ARCANA_GALAXY_BOSS_DROP_CHANCE : ARCANA_SEALED_CARD_DROP_CHANCE;
}

function tryDropSealedArcanaCard(zone, enemy, ownerState, randomFn) {
    let chance = getSealedArcanaCardDropChance(zone, enemy);
    let random = typeof randomFn === 'function' ? randomFn : Math.random;
    if (chance <= 0 || random() >= chance) return { dropped: false, chance };
    let result = grantSealedArcanaCard(1, ownerState || game);
    return { dropped: result.gained > 0, chance, total: result.total, unlockedNow: !!result.unlockedNow };
}

function createDefaultPruningTreeState() {
    return { version: 2, unlocked: false, growthPoints: 0, nodeRanks: {}, prunedPenaltyRanks: {}, lastGrantedLoop: PRUNING_TREE_UNLOCK_LOOP - 1 };
}

function normalizePruningTreeState(value, ownerState) {
    let source = value && typeof value === 'object' ? value : {};
    let normalized = createDefaultPruningTreeState();
    PRUNING_TREE_DB.forEach(node => {
        let rank = Math.max(0, Math.min(node.maxRank, Math.floor(Number((source.nodeRanks || {})[node.id]) || 0)));
        if (rank > 0) normalized.nodeRanks[node.id] = rank;
        let pruned = Math.max(0, Math.min(rank, Math.floor(Number((source.prunedPenaltyRanks || {})[node.id]) || 0)));
        if (pruned > 0) normalized.prunedPenaltyRanks[node.id] = pruned;
    });
    normalized.growthPoints = Math.max(0, Math.floor(Number(source.growthPoints) || 0));
    normalized.lastGrantedLoop = Math.max(PRUNING_TREE_UNLOCK_LOOP - 1, Math.floor(Number(source.lastGrantedLoop) || PRUNING_TREE_UNLOCK_LOOP - 1));
    normalized.unlocked = !!source.unlocked || getEndgameProgressLoop(ownerState || game) >= PRUNING_TREE_UNLOCK_LOOP;
    return normalized;
}

function advancePruningTreeForLoop(ownerState) {
    let source = ownerState || game;
    let loop = getEndgameProgressLoop(source);
    let wasUnlocked = !!(source.unlocks && source.unlocks.pruning);
    let tree = normalizePruningTreeState(source.pruningTree, source);
    let granted = 0;
    if (loop >= PRUNING_TREE_UNLOCK_LOOP && tree.lastGrantedLoop < loop) {
        granted = loop - Math.max(PRUNING_TREE_UNLOCK_LOOP - 1, tree.lastGrantedLoop);
        tree.growthPoints += granted;
        tree.lastGrantedLoop = loop;
        tree.unlocked = true;
    }
    source.pruningTree = tree;
    if (tree.unlocked && source.unlocks) source.unlocks.pruning = true;
    if (tree.unlocked && !wasUnlocked && source.noti) source.noti.pruning = true;
    return { changed: granted > 0, granted, tree };
}

function ensurePruningTreeState(ownerState) {
    let source = ownerState || game;
    if (source.pruningTree && source.pruningTree.version === 2 && source.pruningTree.prunedPenaltyRanks) return source.pruningTree;
    return advancePruningTreeForLoop(source).tree;
}

function isPruningNodeRequirementMet(node, tree) {
    return Object.entries((node && node.requires) || {}).every(([id, rank]) => {
        return Math.floor(Number((tree.nodeRanks || {})[id]) || 0) >= rank;
    });
}

function investPruningNode(nodeId, ownerState) {
    let source = ownerState || game;
    let tree = ensurePruningTreeState(source);
    let node = PRUNING_TREE_DB.find(row => row.id === nodeId);
    if (!tree.unlocked || !node) return { ok: false, code: 'locked' };
    let rank = Math.max(0, Math.floor(tree.nodeRanks[node.id] || 0));
    if (rank >= node.maxRank) return { ok: false, code: 'max_rank' };
    if (!isPruningNodeRequirementMet(node, tree)) return { ok: false, code: 'requirements' };
    if (tree.growthPoints < node.cost) return { ok: false, code: 'points' };
    tree.growthPoints -= node.cost;
    tree.nodeRanks[node.id] = rank + 1;
    return { ok: true, rank: rank + 1, points: tree.growthPoints };
}

function getPruningNodeActivePenaltyRank(nodeId, tree) {
    let rank = Math.max(0, Math.floor((tree.nodeRanks || {})[nodeId] || 0));
    let pruned = Math.max(0, Math.min(rank, Math.floor((tree.prunedPenaltyRanks || {})[nodeId] || 0)));
    return rank - pruned;
}

function prunePruningNodePenalty(nodeId, ownerState) {
    let tree = ensurePruningTreeState(ownerState || game);
    let node = PRUNING_TREE_DB.find(row => row.id === nodeId);
    if (!tree.unlocked || !node) return { ok: false, code: 'locked' };
    let activePenaltyRank = getPruningNodeActivePenaltyRank(node.id, tree);
    if (activePenaltyRank <= 0) return { ok: false, code: 'no_penalty' };
    if (tree.growthPoints < node.cost) return { ok: false, code: 'points' };
    tree.growthPoints -= node.cost;
    tree.prunedPenaltyRanks[node.id] = Math.max(0, Math.floor(tree.prunedPenaltyRanks[node.id] || 0)) + 1;
    return { ok: true, activePenaltyRank: activePenaltyRank - 1, points: tree.growthPoints };
}

function getPruningTreeStats(ownerState) {
    let tree = ensurePruningTreeState(ownerState || game);
    let totals = {};
    PRUNING_TREE_DB.forEach(node => {
        let rank = Math.max(0, Math.floor(tree.nodeRanks[node.id] || 0));
        if (rank <= 0) return;
        node.stats.forEach(stat => { totals[stat.id] = (totals[stat.id] || 0) + Number(stat.val || 0) * rank; });
        let penaltyRank = getPruningNodeActivePenaltyRank(node.id, tree);
        (node.penaltyStats || []).forEach(stat => {
            totals[stat.id] = (totals[stat.id] || 0) + Number(stat.val || 0) * penaltyRank;
        });
    });
    return Object.entries(totals)
        .map(([id, val]) => ({ id, val: Number(val.toFixed(4)) }))
        .filter(stat => stat.val !== 0);
}

safeExposeGlobals({
    createDefaultArcanaState, normalizeArcanaState, ensureArcanaState, grantSealedArcanaCard,
    unsealArcanaCard, findArcanaCopy, getArcanaCardPlacement, equipArcanaCard, unequipArcanaCard,
    getArcanaQuestProgress, recordArcanaQuestCosmosExploration, reconcileArcanaQuestFromCosmos,
    getArcanaDeckStats, getArcanaEquipmentSlotAmplifier, getArcanaCardSlotAmplifier,
    getArcanaAmplificationPreview, applyArcanaSlotAmplification,
    getArcanaCardGemDamageRule, getArcanaEquipmentGemDamageRule,
    getSealedArcanaCardDropChance, tryDropSealedArcanaCard,
    createDefaultPruningTreeState, normalizePruningTreeState, advancePruningTreeForLoop,
    ensurePruningTreeState, isPruningNodeRequirementMet, investPruningNode,
    getPruningNodeActivePenaltyRank, prunePruningNodePenalty, getPruningTreeStats,
    getEndgameProgressLoop
});
