/** Saved menu layouts are independent value copies; legacy shared layouts seed both once. */
function normalizeTabLayoutSettings(settings) {
    const normalizeOrder = (list, pattern) => Array.from(new Set(
        (Array.isArray(list) ? list : []).filter(id => typeof id === 'string' && pattern.test(id))
    ));
    const buttonId = /^btn-(tab-[a-z]+|map-complete-action-picker)$/;
    const layouts = {};
    for (const platform of ['desktop', 'mobile']) {
        const candidate = settings.tabLayouts && settings.tabLayouts[platform];
        const source = candidate && typeof candidate === 'object' ? candidate : settings;
        const placements = source.tabPlacement && typeof source.tabPlacement === 'object' ? source.tabPlacement : {};
        layouts[platform] = {
            tabOrder: normalizeOrder(source.tabOrder, buttonId),
            tabPlacement: Object.fromEntries(Object.entries(placements)
                .filter(([id, place]) => buttonId.test(id) && ['top', 'bottom'].includes(place))
                .map(([id, place]) => [id, id === 'btn-tab-pruning' ? 'top' : place])),
            tabGroupOrder: normalizeOrder(source.tabGroupOrder, /^(character|growth|content|gear|etc)$/)
        };
    }
    return layouts;
}

/** Save boundary: missing ledger denotes a pre-choice save; never revoke its existing access. */
function normalizeContentProgressionSave(merged, save) {
    if (!merged.conditionGemLevels || typeof merged.conditionGemLevels !== 'object') merged.conditionGemLevels = {};
    merged.contentProgression = contentProgression.restore(save.contentProgression, merged, Object.keys(save).length > 0);
    contentProgression.sync(merged);
    return merged;
}

function mergeDefaults(save) {
    function clampFiniteNumber(value, fallback, min, max) {
        let num = Number(value);
        if (!Number.isFinite(num)) num = fallback;
        if (Number.isFinite(min)) num = Math.max(min, num);
        if (Number.isFinite(max)) num = Math.min(max, num);
        return num;
    }
    function normalizePassiveNodeId(rawId) {
        if (typeof rawId === 'string') {
            let currentId = typeof getCurrentPassiveNodeId === 'function' ? getCurrentPassiveNodeId(rawId) : rawId;
            if (PASSIVE_TREE.nodes[currentId]) return currentId;
            if (/^\d+$/.test(currentId)) {
                let converted = 'n' + currentId;
                if (PASSIVE_TREE.nodes[converted]) return converted;
            }
            return null;
        }
        if (typeof rawId === 'number' && Number.isFinite(rawId)) {
            let converted = 'n' + Math.floor(rawId);
            return PASSIVE_TREE.nodes[converted] ? converted : null;
        }
        return null;
    }
    function normalizeAllocatedPassiveTreeNodes(rawIds, passiveStarEvolution, passiveSaveState) {
        const rootId = typeof getPassiveTreeRootNodeId === 'function' ? getPassiveTreeRootNodeId(save) : 'n0';
        let rawList = Array.isArray(rawIds) ? rawIds : [];
        let seen = new Set();
        let kept = [];
        let refunded = 0;
        rawList.forEach(rawId => {
            let id = normalizePassiveNodeId(rawId);
            if (!id) { refunded++; return; }
            if (seen.has(id)) return;
            seen.add(id);
            let node = PASSIVE_TREE.nodes[id];
            if (!node || (node.requiresEvolution && !passiveStarEvolution)) {
                if (id !== rootId) refunded++;
                return;
            }
            if (node.kind === 'start') return;
            kept.push(id);
        });
        let owned = new Set(kept);
        owned.add(rootId);
        let savedStarWedge = passiveSaveState && passiveSaveState.starWedge && typeof passiveSaveState.starWedge === 'object'
            ? passiveSaveState.starWedge : {};
        let savedWedges = new Map((Array.isArray(savedStarWedge.wedges) ? savedStarWedge.wedges : [])
            .filter(wedge => wedge && Number.isFinite(Number(wedge.id)))
            .map(wedge => [Number(wedge.id), wedge]));
        let savedSocketWedges = new Map((Array.isArray(savedStarWedge.sockets) ? savedStarWedge.sockets : [])
            .map(socket => [String(socket && socket.nodeId || ''), savedWedges.get(Number(socket && socket.wedgeId))]));
        const isActiveSavedStarOption = node => {
            if (!node || node.kind !== 'star_option') return false;
            let wedge = savedSocketWedges.get(String(node.requiresStarWedgeSocketNodeId || ''));
            let line = wedge && Array.isArray(wedge.lines) ? wedge.lines[node.starWedgeLineIndex] : null;
            return !!(line && line.stat && !line.disabled);
        };
        let virtualRoots = new Set();
        (Array.isArray(savedStarWedge.sockets) ? savedStarWedge.sockets : []).forEach(socket => {
            let wedge = socket && savedWedges.get(Number(socket.wedgeId));
            let recordedId = wedge && wedge.unique && wedge.uniqueType === 'black_hole' ? normalizePassiveNodeId(wedge.recordedHubNodeId) : null;
            if (recordedId && PASSIVE_TREE.nodes[recordedId] && PASSIVE_TREE.nodes[recordedId].kind === 'hub') virtualRoots.add(recordedId);
        });
        virtualRoots.forEach(id => owned.add(id));
        let traversalRoots = [rootId, ...virtualRoots];
        let connected = new Set(traversalRoots);
        let queue = traversalRoots.slice();
        let passiveEdges = (PASSIVE_TREE && Array.isArray(PASSIVE_TREE.edges)) ? PASSIVE_TREE.edges : [];
        while (queue.length > 0) {
            let current = queue.shift();
            passiveEdges.forEach(edge => {
                let next = null;
                if (edge.from === current && owned.has(edge.to)) next = edge.to;
                else if (edge.to === current && owned.has(edge.from)) next = edge.from;
                if (next && !connected.has(next)) {
                    connected.add(next);
                    queue.push(next);
                }
            });
        }
        let connectedPassives = [];
        kept.forEach(id => {
            let node = PASSIVE_TREE.nodes[id];
            if (node && node.kind === 'star_option' && isActiveSavedStarOption(node)) connectedPassives.push(id);
            else if (node && node.kind === 'star_option') refunded++;
            else if (connected.has(id)) connectedPassives.push(id);
            else refunded++;
        });
        return { passives: connectedPassives, refunded: refunded };
    }
    function migratePassiveSaveNodeReferences(state) {
        if (typeof migratePassiveNodeIdList !== 'function' || typeof migratePassiveNodeIdRecord !== 'function') return;
        state.passives = migratePassiveNodeIdList(state.passives);
        state.discoveredPassives = migratePassiveNodeIdList(state.discoveredPassives);
        state.passiveAttributeChoices = migratePassiveNodeIdRecord(state.passiveAttributeChoices);
        state.voidPassives = migratePassiveNodeIdRecord(state.voidPassives);
        state.retiredVoidPassives = migratePassiveNodeIdRecord(state.retiredVoidPassives);
        let star = state.starWedge && typeof state.starWedge === 'object' ? { ...state.starWedge } : {};
        star.wedges = (Array.isArray(star.wedges) ? star.wedges : []).map(wedge => wedge && typeof wedge === 'object'
            ? { ...wedge, recordedHubNodeId: getCurrentPassiveNodeId(wedge.recordedHubNodeId) } : wedge);
        star.sockets = (Array.isArray(star.sockets) ? star.sockets : []).map(socket => socket && typeof socket === 'object'
            ? { ...socket, nodeId: getCurrentPassiveNodeId(socket.nodeId) } : socket);
        ['nodeMutations', 'virtualLearnNodes', 'virtualLearnSources', 'disabledNodeEffects',
            'disabledNodeEffectSources', 'mutationConflictSources'].forEach(key => {
            star[key] = migratePassiveNodeIdRecord(star[key]);
        });
        delete star._mutationSignature;
        state.starWedge = star;
    }
    function normalizeEncounterMarker(marker) {
        if (!marker || typeof marker !== 'object') return null;
        let at = clampFiniteNumber(marker.at, NaN, 0, 100);
        if (!Number.isFinite(at)) return null;
        let normalized = {
            at: at,
            count: Math.max(1, Math.floor(clampFiniteNumber(marker.count, 1, 1, 99))),
            elite: !!marker.elite,
            boss: !!marker.boss
        };
        // Pre-treasure hunt markers resume as ordinary elites; the unfinished hunt becomes a ready treasure.
        return normalized;
    }
    function normalizeEnemyRecord(enemy) {
        if (!enemy || typeof enemy !== 'object') return null;
        let hp = clampFiniteNumber(enemy.hp, NaN, 0);
        let maxHp = clampFiniteNumber(enemy.maxHp, clampFiniteNumber(hp, 1, 1), 1);
        if (!Number.isFinite(hp)) hp = maxHp;
        return normalizeEnemyGridFields({
            ...enemy,
            id: Math.max(1, Math.floor(clampFiniteNumber(enemy.id, 1, 1))),
            hp: Math.min(maxHp, hp),
            maxHp: maxHp,
            attackTimer: clampFiniteNumber(enemy.attackTimer, 0, 0),
            regenBank: Math.round(clampFiniteNumber(enemy.regenBank, 0, 0) * 10) / 10,
            spawnAt: clampFiniteNumber(enemy.spawnAt, 0, 0, 100),
            spawnStamp: 0,
            groupIndex: Math.max(0, Math.floor(clampFiniteNumber(enemy.groupIndex, 0, 0))),
            variantSeed: Math.floor(clampFiniteNumber(enemy.variantSeed, 1)),
            ele: enemy.ele || 'phys',
            name: enemy.name || '이름 없는 적',
            atkMul: clampFiniteNumber(enemy.atkMul, 1, 0.1),
            dr: clampFiniteNumber(enemy.dr, 0, 0),
            resF: clampFiniteNumber(enemy.resF, 0),
            resC: clampFiniteNumber(enemy.resC, 0),
            resL: clampFiniteNumber(enemy.resL, 0),
            resChaos: clampFiniteNumber(enemy.resChaos, 0),
            isElite: !!enemy.isElite,
            isBoss: !!enemy.isBoss
        });
    }

    // 그리드 필드 정리: 잘못된 좌표/유형은 버려서 다음 전투 틱의 그리드 복구가 다시 배치하게 한다.
    function normalizeEnemyGridFields(record) {
        delete record.battleSlot;
        let gx = Math.floor(clampFiniteNumber(record.gx, NaN, 0, COMBAT_GRID_CONFIG.columns - 1));
        let gy = Math.floor(clampFiniteNumber(record.gy, NaN, 0, COMBAT_GRID_CONFIG.rows - 1));
        if (Number.isFinite(gx) && Number.isFinite(gy)) {
            record.gx = gx;
            record.gy = gy;
        } else {
            delete record.gx;
            delete record.gy;
        }
        record.gridMoveTimer = 0;
        if (record.attackKind !== 'melee' && record.attackKind !== 'ranged') {
            delete record.attackKind;
            delete record.attackRange;
        } else {
            record.attackRange = Math.max(1, Math.floor(clampFiniteNumber(record.attackRange, 1, 1, 99)));
        }
        return record;
    }
    function normalizeRecentDamageEvent(entry) {
        if (!entry || typeof entry !== 'object') return null;
        let ele = normalizeDamageElementKey(entry.ele);
        let amount = Math.max(0, Math.floor(clampFiniteNumber(entry.amount, 0, 0)));
        return {
            at: clampFiniteNumber(entry.at, Date.now(), 0),
            ele: ele,
            amount: amount,
            source: typeof entry.source === 'string' ? entry.source : '',
            sourceType: ['monster', 'hazard', 'ailment'].includes(entry.sourceType) ? entry.sourceType : 'hazard',
            sourceId: typeof entry.sourceId === 'string' || Number.isFinite(entry.sourceId) ? entry.sourceId : null,
            sourceName: typeof entry.sourceName === 'string' ? entry.sourceName : '',
            ailmentType: typeof entry.ailmentType === 'string' ? entry.ailmentType : ''
        };
    }
    function normalizeDeathDamageSummaryRows(rows) {
        let damageSummary = Array.isArray(rows) ? rows.map(entry => {
            if (!entry || typeof entry !== 'object') return null;
            let ele = normalizeDamageElementKey(entry.ele);
            let value = Math.max(0, Math.floor(clampFiniteNumber(entry.value, entry.amount, 0)));
            return { ele: ele, value: value };
        }).filter(Boolean) : [];
        let totals = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0, other: 0 };
        damageSummary.forEach(entry => {
            totals[entry.ele] += Math.max(0, Math.floor(entry.value || 0));
        });
        return Object.keys(totals)
            .map(ele => ({ ele: ele, value: totals[ele] }))
            .filter(entry => entry.value > 0)
            .sort((a, b) => b.value - a.value);
    }
    function normalizeDeathMonsterSummaryRows(rows) {
        return Array.isArray(rows) ? rows.map(row => {
            if (!row || typeof row !== 'object') return null;
            let byElement = {};
            ['phys', 'fire', 'cold', 'light', 'chaos', 'other'].forEach(ele => {
                let value = Math.max(0, Math.floor(clampFiniteNumber(row.byElement && row.byElement[ele], 0, 0)));
                if (value > 0) byElement[ele] = value;
            });
            return {
                sourceId: typeof row.sourceId === 'string' || Number.isFinite(row.sourceId) ? row.sourceId : null,
                name: typeof row.name === 'string' && row.name ? row.name : '알 수 없는 몬스터',
                value: Math.max(0, Math.floor(clampFiniteNumber(row.value, 0, 0))),
                byElement: byElement,
                primaryElement: normalizeDamageElementKey(row.primaryElement)
            };
        }).filter(row => row && row.value > 0).sort((a, b) => b.value - a.value) : [];
    }
    function normalizeDeathLog(log) {
        if (!log || typeof log !== 'object') return null;
        let primaryElement = normalizeDamageElementKey(log.primaryElement);
        let damageSummary = normalizeDeathDamageSummaryRows(log.damageSummary);
        let ailmentDamageSummary = normalizeDeathDamageSummaryRows(log.ailmentDamageSummary);
        let monsterSummary = normalizeDeathMonsterSummaryRows(log.monsterSummary);
        let activeAilments = Array.isArray(log.activeAilments) ? log.activeAilments.map(row => {
            if (!row || typeof row !== 'object') return null;
            let type = typeof row.type === 'string' && row.type ? row.type : 'unknown';
            return {
                type: type,
                label: typeof row.label === 'string' && row.label ? row.label : getAilmentDisplayLabel(type),
                time: Math.max(0, Math.ceil(clampFiniteNumber(row.time, 0, 0, 30))),
                power: Math.max(0, clampFiniteNumber(row.power, 0, 0, 1.5)),
                sourceHitDamage: Math.max(0, Math.floor(clampFiniteNumber(row.sourceHitDamage || row.hitDamage, 0, 0))),
                sourceEnemyName: typeof row.sourceEnemyName === 'string' ? row.sourceEnemyName : ''
            };
        }).filter(Boolean) : [];
        return {
            primaryElement: primaryElement,
            reasonText: typeof log.reasonText === 'string' && log.reasonText.trim() ? log.reasonText : (DEATH_REASON_TEXT[primaryElement] || DEATH_REASON_TEXT.phys),
            expLost: Math.max(0, Math.floor(clampFiniteNumber(log.expLost, 0, 0))),
            damageSummary: damageSummary,
            ailmentDamageSummary: ailmentDamageSummary,
            monsterSummary: monsterSummary,
            activeAilments: activeAilments,
            sourceName: typeof log.sourceName === 'string' ? log.sourceName : '',
            at: clampFiniteNumber(log.at, Date.now(), 0)
        };
    }
    function estimateSummonEquipCapForMergedSave(state) {
        let bonus = 0;
        function statValue(stat) {
            if (!stat || typeof stat !== 'object') return 0;
            if (Number.isFinite(stat.val)) return stat.val;
            if (Number.isFinite(stat.value)) return stat.value;
            if (Number.isFinite(stat.base)) return stat.base;
            return 0;
        }
        Object.entries((state && state.equipment) || {}).forEach(([slot, item]) => {
            if (!item) return;
            [...(item.baseStats || []), ...(item.stats || []), ...(typeof getImmutableItemSpecialStats === 'function' ? getImmutableItemSpecialStats(item) : [])].forEach(stat => {
                if (stat && stat.id === 'summonCap') bonus += statValue(stat);
            });
            if (item.uniqueEffectKey === 'summonCapBonus') bonus += Number((item.uniqueEffectParams || {}).cap) || 1;
            if (item.uniqueEffectKey === 'rightRingSummonCap' && slot === '반지2') bonus += Number((item.uniqueEffectParams || {}).cap) || 1;
        });
        (state && Array.isArray(state.passives) ? state.passives : []).forEach(id => {
            if (state.starWedge && state.starWedge.disabledNodeEffects && state.starWedge.disabledNodeEffects[String(id)]) return;
            let node = PASSIVE_TREE.nodes[id];
            let mut = state.starWedge && state.starWedge.nodeMutations ? state.starWedge.nodeMutations[id] : null;
            let statId = mut && mut.currentStat ? mut.currentStat : (node && node.stat);
            let statVal = mut && Number.isFinite(mut.currentVal) ? mut.currentVal : (node && node.val);
            if (node && statId === 'summonCap') bonus += statVal || 0;
        });
        let ownedPassiveIds = new Set(state && Array.isArray(state.passives) ? state.passives.map(String) : []);
        Object.keys((state && state.starWedge && state.starWedge.nodeMutations) || {}).forEach(id => {
            let mut = state.starWedge.nodeMutations[id];
            if (!mut || mut.lineIndex !== 3 || mut.currentStat !== 'summonCap' || ownedPassiveIds.has(String(id))) return;
            if (state.starWedge.disabledNodeEffects && state.starWedge.disabledNodeEffects[String(id)]) return;
            bonus += Number(mut.currentVal) || 0;
        });
        (state && Array.isArray(state.actRewardBonuses) ? state.actRewardBonuses : []).forEach(entry => { if (entry && entry.stat === 'summonCap') bonus += Number(entry.value) || 0; });
        (state && Array.isArray(state.journalBonuses) ? state.journalBonuses : []).forEach(entry => { if (entry && entry.stat === 'summonCap') bonus += Number(entry.value) || 0; });
        let keystones = (state && Array.isArray(state.ascendKeystones)) ? state.ascendKeystones : [];
        if (state && state.ascendClass === 'soulbinder') {
            if (keystones.includes('sb4')) bonus += 1;
            if (keystones.includes('sb8')) bonus += 3;
        }
        let ownedCards = Object.keys((state && state.talentCards) || {});
        let unlockedSlots = (typeof TALENT_CARD_SLOT_UNLOCKS !== 'undefined' ? TALENT_CARD_SLOT_UNLOCKS : [])
            .filter(requirement => ownedCards.length >= requirement).length;
        (state && Array.isArray(state.talentCardLoadout) ? state.talentCardLoadout.slice(0, unlockedSlots) : []).forEach(comboKey => {
            let rule = typeof TALENT_PRECISE_CARD_RULES !== 'undefined' ? TALENT_PRECISE_CARD_RULES[comboKey] : null;
            ((rule && rule.uniques) || []).forEach(effect => {
                if (effect && effect.key === 'summonCapBonus') bonus += Number((effect.params || {}).cap) || 1;
            });
        });
        let cap = Math.max(1, Math.floor(1 + bonus));
        let expandedCap = state && state.ascendClass === 'soulbinder' && keystones.includes('sb9');
        if (expandedCap) cap = Math.floor(cap * 1.5);
        return Math.min(expandedCap ? 12 : 8, cap);
    }

    let savedHeroAppearanceMode = save && save.settings && save.settings.heroAppearanceMode;
    let savedColony = (save && save.colony && typeof save.colony === 'object') ? save.colony : null;
    let savedColonyHadWardSlotVersion = !!(savedColony && Object.prototype.hasOwnProperty.call(savedColony, 'wardSlotVersion'));
    let merged = {
        ...JSON.parse(JSON.stringify(defaultGame)),
        ...save,
        equipmentDropProgress: clampFiniteNumber(save.equipmentDropProgress, 0, 0, EQUIPMENT_DROUGHT_RULES.threshold - 0.5),
        settings: { ...defaultGame.settings, ...(save.settings || {}) },
        unlocks: { ...defaultGame.unlocks, ...(save.unlocks || {}) },
        noti: { ...defaultGame.noti, ...(save.noti || {}) },
        currencies: { ...defaultGame.currencies, ...(save.currencies || {}) },
        equipment: { ...defaultGame.equipment, ...(save.equipment || {}) },
        saveMeta: { ...defaultGame.saveMeta, ...(save.saveMeta || {}) }
    };
    delete merged.hideout;
    delete merged.abyssPassivePoints;
    delete merged.abyssPassives;
    delete merged.unlocks.hideout;
    delete merged.noti.hideout;
    migratePassiveSaveNodeReferences(merged);
    delete merged.talentCardRuntime;
    Object.entries(typeof CURRENCY_LEGACY_MERGE === 'object' ? CURRENCY_LEGACY_MERGE : {}).forEach(([currentKey, legacyKeys]) => {
        let legacyAmount = (legacyKeys || []).reduce((sum, legacyKey) => sum + Math.max(0, Math.floor(Number(merged.currencies[legacyKey]) || 0)), 0);
        merged.currencies[currentKey] = Math.max(0, Math.floor(Number(merged.currencies[currentKey]) || 0)) + legacyAmount;
        (legacyKeys || []).forEach(legacyKey => delete merged.currencies[legacyKey]);
        (legacyKeys || []).forEach(legacyKey => Object.defineProperty(merged.currencies, legacyKey, {
            configurable: true,
            enumerable: false,
            get() { return this[currentKey] || 0; },
            set(value) { this[currentKey] = Math.max(0, Math.floor(Number(value) || 0)); }
        }));
    });
    // Removed contracts must not survive in legacy saves or later serialization.
    delete merged.challengeContract;
    delete merged.activeChallengeContract;
    const legacyHiveTrace = Math.max(0, Math.floor(Number(merged.currencies.hiveTrace) || 0));
    if (legacyHiveTrace > 0) {
        merged.currencies.colonyTrace = Math.max(0, Math.floor(Number(merged.currencies.colonyTrace) || 0)) + legacyHiveTrace;
    }
    delete merged.currencies.hiveTrace;
    merged.cosmosAtlas = (merged.cosmosAtlas && typeof merged.cosmosAtlas === 'object') ? { ...merged.cosmosAtlas } : {};
    const legacyAtlasStarDust = Math.max(0, Math.floor(Number(merged.cosmosAtlas.starDust) || 0));
    const hasSavedStarDustWallet = !!(save && save.currencies && Object.prototype.hasOwnProperty.call(save.currencies, 'starDust'));
    merged.currencies.starDust = hasSavedStarDustWallet
        ? Math.max(0, Math.floor(Number(merged.currencies.starDust) || 0))
        : legacyAtlasStarDust;
    delete merged.cosmosAtlas.starDust;
    merged.saveMeta.lastCloudUploadProfile = normalizeCloudUploadProfile(merged.saveMeta.lastCloudUploadProfile);
    merged.saveMeta.cloudUserId = typeof merged.saveMeta.cloudUserId === 'string' && merged.saveMeta.cloudUserId.trim()
        ? merged.saveMeta.cloudUserId
        : null;
    merged.ocean = mergeOceanState(save && save.ocean);
    merged.unlocks.jewel = !!merged.unlocks.jewel;
    merged.unlocks.cube = !!merged.unlocks.cube;
    if (typeof syncPermanentTalentTabUnlock === 'function') syncPermanentTalentTabUnlock(merged);
    if (!save.currencies && save.materials) {
        merged.currencies.magicBud += Math.floor(save.materials / 2) + Math.floor(save.materials / 4);
        merged.currencies.formlessDew += Math.floor(save.materials / 10);
    }
    let normalizedEquipment = { ...defaultGame.equipment };
    Object.keys(normalizedEquipment).forEach(slot => {
        normalizedEquipment[slot] = merged.equipment[slot] || null;
    });
    if (save && save.equipment && save.equipment['장갑'] && !save.equipment['장갑1'] && !save.equipment['장갑2']) {
        normalizedEquipment['장갑1'] = save.equipment['장갑'];
    }
    merged.equipment = normalizedEquipment;
    if (window.equipmentLoadoutRuntime) window.equipmentLoadoutRuntime.ensureState(merged);
    merged.inventory = (merged.inventory || []).map(normalizeItem);
    merged.equipmentTemporaryStorage = Array.isArray(merged.equipmentTemporaryStorage)
        ? merged.equipmentTemporaryStorage.map(normalizeItem) : [];
    Object.keys(merged.equipment).forEach(slot => merged.equipment[slot] = normalizeItem(merged.equipment[slot]));
    if (typeof equipmentInventoryGridRuntime !== 'undefined') equipmentInventoryGridRuntime.ensureState(merged);
    merged.growthInventory = (merged.growthInventory || []).map(normalizeGrowthOptionValues);
    merged.recentGrowthDrops = (merged.recentGrowthDrops || []).map(normalizeGrowthOptionValues);
    merged.gemData = (merged.gemData && typeof merged.gemData === 'object') ? merged.gemData : {};
    merged.gemData['기본 공격'] = normalizeGemRecord(merged.gemData['기본 공격']);
    Object.keys(merged.gemData).forEach(name => merged.gemData[name] = normalizeGemRecord(merged.gemData[name]));
    merged.supportGemData = (merged.supportGemData && typeof merged.supportGemData === 'object') ? merged.supportGemData : {};
    Object.keys(merged.supportGemData).forEach(name => merged.supportGemData[name] = normalizeGemRecord(merged.supportGemData[name]));
    if ((save.saveVersion || 0) < 9) {
        merged.passives = [];
        merged.discoveredPassives = [getPassiveTreeRootNodeId(merged)];
    }
    if ((save.saveVersion || 0) < 13) {
        if (typeof merged.currentZoneId === 'number' && merged.currentZoneId >= 10) merged.currentZoneId += (ABYSS_START_ZONE_ID - 10);
        if (typeof merged.maxZoneId === 'number' && merged.maxZoneId >= 10) merged.maxZoneId += (ABYSS_START_ZONE_ID - 10);
    } else if ((save.saveVersion || 0) < 14) {
        if (typeof merged.currentZoneId === 'number' && merged.currentZoneId >= 11) merged.currentZoneId -= 1;
        if (typeof merged.maxZoneId === 'number' && merged.maxZoneId >= 11) merged.maxZoneId -= 1;
    } else if ((save.saveVersion || 0) < 15) {
        if (typeof merged.currentZoneId === 'number' && merged.currentZoneId >= 5) merged.currentZoneId -= 1;
        if (typeof merged.maxZoneId === 'number' && merged.maxZoneId >= 5) merged.maxZoneId -= 1;
    }
    const legacyPassiveRefundCount = Number(merged.passiveLayoutVersion || 0) < 22
        ? (Array.isArray(save.passives) ? save.passives.filter(id => id !== 'n0').length : 0)
        : 0;
    let passiveAllocationNormalization = normalizeAllocatedPassiveTreeNodes(merged.passives, !!merged.passiveStarEvolution, merged);
    merged.passives = passiveAllocationNormalization.passives;
    merged.autoRefundedPassivePoints = Math.max(0, Math.floor(passiveAllocationNormalization.refunded || 0));
    function getPassiveTierValueForLoad(statKey, tier) {
        let statDef = P_STATS[statKey];
        if (!statDef) return tier === 3 ? 8 : (tier === 2 ? 4 : 2);
        if (tier === 0) return 10;
        if (tier === 1) return statDef.s !== undefined ? statDef.s : (statDef.m !== undefined ? statDef.m : (statDef.k !== undefined ? statDef.k : 2));
        if (tier === 2) return statDef.m !== undefined ? statDef.m : (statDef.s !== undefined ? statDef.s : (statDef.k !== undefined ? statDef.k : 4));
        return statDef.k !== undefined ? statDef.k : (statDef.m !== undefined ? statDef.m : (statDef.s !== undefined ? statDef.s : 8));
    }
    Object.values(PASSIVE_TREE.nodes || {}).forEach(node => {
        if (!node || node.stat !== 'critDmg') return;
        node.val = getPassiveTierValueForLoad('critDmg', Math.max(0, Math.floor(node.tier || 1)));
    });
    merged.discoveredPassives = Array.from(new Set((merged.discoveredPassives || []).map(normalizePassiveNodeId).filter(Boolean)));
    const passiveAttributeStats = new Set(['strength', 'dexterity', 'intelligence']);
    merged.passiveAttributePreference = passiveAttributeStats.has(merged.passiveAttributePreference) ? merged.passiveAttributePreference : 'strength';
    const rawPassiveAttributeChoices = merged.passiveAttributeChoices && typeof merged.passiveAttributeChoices === 'object' && !Array.isArray(merged.passiveAttributeChoices)
        ? merged.passiveAttributeChoices
        : {};
    merged.passiveAttributeChoices = Object.fromEntries(Object.entries(rawPassiveAttributeChoices)
        .filter(([nodeId, stat]) => passiveAttributeStats.has(stat)
            && PASSIVE_TREE.nodes[nodeId]
            && PASSIVE_TREE.nodes[nodeId].kind === 'attribute'
            && (merged.passives || []).includes(nodeId)));
    const passiveSpecializationOptions = { migrateWisdomBranchChoice: true, passiveIds: merged.passives };
    merged.passiveSpecialization = typeof normalizePassiveSpecializationState === 'function'
        ? normalizePassiveSpecializationState(merged.passiveSpecialization, passiveSpecializationOptions)
        : JSON.parse(JSON.stringify(defaultGame.passiveSpecialization));
    if (merged.passiveLayoutVersion !== PASSIVE_LAYOUT_VERSION) {
        // Version 22 replaces the generated tree with the authored six-class layout.
        // Refund once rather than silently mapping old node ids onto unrelated effects.
        if (Number(merged.passiveLayoutVersion || 0) < 22) {
            merged.autoRefundedPassivePoints = Math.max(merged.autoRefundedPassivePoints, legacyPassiveRefundCount);
            merged.passives = [];
            merged.passiveAttributeChoices = {};
        }
        merged.discoveredPassives = Array.from(new Set([getPassiveTreeRootNodeId(merged)].concat(merged.passives || [])));
        merged.passiveLayoutVersion = PASSIVE_LAYOUT_VERSION;
    }
    merged.claimableActRewards = (merged.claimableActRewards || []).filter(id => typeof id === 'number' && id >= 0 && id <= 9);
    merged.claimedActRewards = (merged.claimedActRewards || []).filter(id => typeof id === 'number' && id >= 0 && id <= 9);
    merged.actRewardBonuses = (merged.actRewardBonuses || []).filter(entry => entry && entry.stat);
    merged.seasonChaseUniqueDrops = Array.from(new Set((Array.isArray(merged.seasonChaseUniqueDrops) ? merged.seasonChaseUniqueDrops : []).filter(name => typeof name === 'string' && name)));
    // Old saves only had a boolean flag and could not identify which chase unique dropped.
    // Do not treat that unknown legacy flag as a full chase-unique blacklist.
    merged.seasonChaseUniqueDropped = merged.seasonChaseUniqueDrops.length > 0;
    if (Array.isArray(merged.skills) && merged.skills.includes('수액 골렘 소환')) {
        merged.supports = Array.isArray(merged.supports) ? merged.supports : [];
        if (!merged.supports.includes('수액 골렘 소환')) merged.supports.push('수액 골렘 소환');
        merged.supportGemData = (merged.supportGemData && typeof merged.supportGemData === 'object') ? merged.supportGemData : {};
        if (!merged.supportGemData['수액 골렘 소환']) {
            merged.supportGemData['수액 골렘 소환'] = normalizeGemRecord((merged.gemData || {})['수액 골렘 소환'] || { level: 1, exp: 0, unlockedTier: 1, activeTier: 1 });
        }
        merged.equippedSupports = Array.isArray(merged.equippedSupports) ? merged.equippedSupports : [];
        if (!merged.equippedSupports.includes('수액 골렘 소환')) merged.equippedSupports.push('수액 골렘 소환');
        if (merged.activeSkill === '수액 골렘 소환') {
            merged.activeSkill = '기본 공격';
        }
    }
    merged.skills = dedupeList(Array.isArray(merged.skills) ? merged.skills.filter(name => !!SKILL_DB[name]) : []);
    if (!merged.skills.includes('기본 공격')) merged.skills.unshift('기본 공격');
    merged.sealedSkills = dedupeList(Array.isArray(merged.sealedSkills) ? merged.sealedSkills.filter(name => !!SKILL_DB[name] && name !== '기본 공격' && !merged.skills.includes(name)) : []);
    merged.supports = dedupeList(Array.isArray(merged.supports) ? merged.supports.filter(name => !!SUPPORT_GEM_DB[name]) : []);
    merged.sealedSupports = dedupeList(Array.isArray(merged.sealedSupports) ? merged.sealedSupports.filter(name => !!SUPPORT_GEM_DB[name] && !merged.supports.includes(name)) : []);
    merged.equippedSupports = Array.isArray(merged.equippedSupports) ? dedupeList(merged.equippedSupports.filter(name => merged.supports.includes(name))) : [];
    merged.seasonNodes = Array.isArray(merged.seasonNodes) ? merged.seasonNodes.filter(id => !!getSeasonPassiveNodeDef(id)) : [];
    merged.seasonNodeLevels = (merged.seasonNodeLevels && typeof merged.seasonNodeLevels === 'object') ? merged.seasonNodeLevels : {};
    merged.seasonNodes.forEach(id => {
        let lv = Math.max(1, Math.floor(merged.seasonNodeLevels[id] || 1));
        merged.seasonNodeLevels[id] = Math.min(5, lv);
    });
    merged.unlockedSeasonContents = Array.isArray(merged.unlockedSeasonContents) ? merged.unlockedSeasonContents.filter(id => typeof id === 'string') : ['season_1'];
    merged.seenSeasonContentNotices = Array.isArray(merged.seenSeasonContentNotices) ? merged.seenSeasonContentNotices.filter(id => typeof id === 'string') : ['season_1'];
    merged.unlockedMapContents = Array.isArray(merged.unlockedMapContents) ? merged.unlockedMapContents.filter(id => typeof id === 'string') : [];
    merged.labyrinthFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.labyrinthFloor, defaultGame.labyrinthFloor || 1, 1)));
    merged.labyrinthUnlockedMaxFloor = Math.max(
        merged.labyrinthFloor,
        Math.floor(clampFiniteNumber(merged.labyrinthUnlockedMaxFloor, defaultGame.labyrinthUnlockedMaxFloor || 1, 1))
    );
    merged.abyssEndlessDepth = Math.max(20, Math.floor(clampFiniteNumber(merged.abyssEndlessDepth, defaultGame.abyssEndlessDepth || 20, 20)));
    merged.abyssUnlockedDepths = Array.isArray(merged.abyssUnlockedDepths)
        ? Array.from(new Set(merged.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 20))).sort((a, b) => a - b)
        : [20];
    if (!merged.abyssUnlockedDepths.includes(20)) merged.abyssUnlockedDepths.unshift(20);
    if (merged.abyssEndlessDepth >= 21 && !merged.abyssUnlockedDepths.includes(merged.abyssEndlessDepth)) merged.abyssUnlockedDepths.push(merged.abyssEndlessDepth);
    function normalizeJewelRecord(jewel) {
        if (!jewel || typeof jewel !== 'object') return null;
        let stats = typeof getJewelStats === 'function' ? getJewelStats(jewel) : (Array.isArray(jewel.stats) ? jewel.stats.filter(stat => stat && stat.id) : []);
        if (stats.length === 0 && jewel.stat && jewel.stat.id) stats = typeof normalizeJewelStat === 'function' ? [normalizeJewelStat(jewel.stat)].filter(Boolean) : [jewel.stat];
        if (stats.length === 0) return null;
        let hiddenTier = Math.max(1, Math.floor(Math.max(...stats.map(stat => Math.floor(stat.tier || 1)))));
        let hasWaxBonus = stats.some(stat => stat && stat.waxBonus);
        let statLimit = jewel.waxedByBeeswax || hasWaxBonus ? 5 : 4;
        return { ...jewel, rarity: ['normal', 'magic', 'rare', 'unique'].includes(jewel.rarity) ? jewel.rarity : 'normal', waxedByBeeswax: !!jewel.waxedByBeeswax || hasWaxBonus, hiddenTier: hiddenTier, stats: stats.slice(0, statLimit), locked: !!jewel.locked };
    }
    merged.jewelInventory = Array.isArray(merged.jewelInventory) ? merged.jewelInventory.map(normalizeJewelRecord).filter(Boolean) : [];
    // 한도를 넘은 주얼을 잘라내지 않는다. 전투 드랍은 보관함이 가득 차도 희귀·고유
    // 주얼만은 유실 방지로 한도를 넘겨 보관하는데(combat.js의 protectOverflow),
    // 여기서 잘라내면 바로 그 아껴 둔 주얼이 다음 불러오기에 조용히 사라졌다.
    // 게다가 앞에서부터 40개를 남기므로 가장 최근에 지켜 낸 것이 먼저 지워진다.
    // 장비 보관함도 같은 이유로 자르지 않고 초과 보관을 허용한다(유실 방지).
    // 새로 넣는 쪽은 각 push 지점이 getJewelInventoryLimit()으로 계속 막는다.
    // 심연 군주(워록 wlk8)가 주얼 슬롯을 2칸 추가로 제공하므로 최대 4슬롯까지 보존한다.
    merged.jewelSlots = Array.isArray(merged.jewelSlots) ? merged.jewelSlots.slice(0, 4).map(normalizeJewelRecord) : [null, null];
    while (merged.jewelSlots.length < 2) merged.jewelSlots.push(null);
    merged.jewelSlotAmplify = Array.isArray(merged.jewelSlotAmplify) ? merged.jewelSlotAmplify.slice(0, 4).map(v => Math.max(0, Math.min(20, Math.floor(v || 0)))) : [0, 0];
    while (merged.jewelSlotAmplify.length < 2) merged.jewelSlotAmplify.push(0);
    merged.skyGemEnhancements = (merged.skyGemEnhancements && typeof merged.skyGemEnhancements === 'object') ? merged.skyGemEnhancements : {};
    Object.keys(merged.skyGemEnhancements).forEach(skill => {
        let arr = Array.isArray(merged.skyGemEnhancements[skill]) ? merged.skyGemEnhancements[skill] : [];
        merged.skyGemEnhancements[skill] = typeof normalizeSkyGemEnhancementSlots === 'function'
            ? normalizeSkyGemEnhancementSlots(arr)
            : arr.slice(0, 5);
    });
    merged.ascendNodes = Array.isArray(merged.ascendNodes) ? merged.ascendNodes.filter(id => typeof id === 'string') : [];
    merged.bloomedClassThisLoop = CLASS_TEMPLATES[merged.bloomedClassThisLoop] ? merged.bloomedClassThisLoop : null;
    merged.bloomedTalentThisLoop = HERO_SELECTION_DEFS[merged.bloomedTalentThisLoop] ? merged.bloomedTalentThisLoop : null;
    if (merged.bloomedClassThisLoop && !merged.bloomedTalentThisLoop) merged.bloomedTalentThisLoop = merged.selectedHeroId;
    if (!merged.bloomedClassThisLoop) merged.bloomedTalentThisLoop = null;
    merged.pendingTalentBloomHeroId = merged.currentZoneId === 'trial_5'
        && HERO_SELECTION_DEFS[merged.pendingTalentBloomHeroId] ? merged.pendingTalentBloomHeroId : null;
    merged.ascendKeystonePoints = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendKeystonePoints, 0, 0)));
    let classKeystoneSet = new Set(getClassKeystoneDefs(merged.ascendClass).map(node => node.id));
    merged.ascendKeystones = Array.isArray(merged.ascendKeystones)
        ? Array.from(new Set(merged.ascendKeystones.filter(id => typeof id === 'string' && classKeystoneSet.has(id)))).slice(0, CLASS_KEYSTONE_PICK_LIMIT)
        : [];
    if (!merged.ascendClass && (!Array.isArray(merged.completedTrials) || merged.completedTrials.length === 0)) {
        merged.ascendKeystonePoints = 0;
        merged.ascendKeystones = [];
    }
    if (merged.ascendClass) {
        let legacyTrialCount = Array.isArray(merged.completedTrials)
            ? merged.completedTrials.filter(id => ['trial_1', 'trial_2', 'trial_3', 'trial_4'].includes(id)).length
            : 0;
        let legacyAscendRank = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendRank, 0, 0, 4)));
        let legacyKeystoneTotal = Math.min(CLASS_KEYSTONE_PICK_LIMIT, Math.max(legacyAscendRank, legacyTrialCount));
        let minExpectedPoints = Math.max(0, legacyKeystoneTotal - merged.ascendKeystones.length);
        merged.ascendKeystonePoints = Math.max(merged.ascendKeystonePoints, minExpectedPoints);
    }
    merged.starWedge = (merged.starWedge && typeof merged.starWedge === 'object') ? merged.starWedge : {};
    merged.starWedge.unlocked = !!merged.starWedge.unlocked;
    merged.starWedge.unlockNoticeSeen = !!merged.starWedge.unlockNoticeSeen;
    merged.starWedge.skyRiftGauge = clampFiniteNumber(merged.starWedge.skyRiftGauge, 0, 0, 100);
    merged.starWedge.skyRiftReady = !!merged.starWedge.skyRiftReady;
    merged.starWedge.skyRiftMinTier = Number.isFinite(merged.starWedge.skyRiftMinTier) ? Math.max(1, Math.floor(merged.starWedge.skyRiftMinTier)) : null;
    merged.starWedge.activeMeteorTier = Number.isFinite(merged.starWedge.activeMeteorTier) ? Math.max(8, Math.min(40, Math.floor(merged.starWedge.activeMeteorTier))) : null;
    let meteorReturnZoneId = merged.starWedge.meteorReturnZoneId;
    merged.starWedge.meteorReturnZoneId = (typeof meteorReturnZoneId === 'number' || typeof meteorReturnZoneId === 'string') && meteorReturnZoneId !== METEOR_FALL_ZONE_ID ? meteorReturnZoneId : null;
    merged.starWedge.lastAnomalyAt = Number.isFinite(merged.starWedge.lastAnomalyAt) ? Math.max(0, Math.floor(merged.starWedge.lastAnomalyAt)) : 0;
    merged.starWedge.skyRiftCarryGauge = clampFiniteNumber(merged.starWedge.skyRiftCarryGauge, 0, 0, 99);
    merged.starWedge.constellationBuff = (merged.starWedge.constellationBuff && typeof merged.starWedge.constellationBuff === 'object') ? merged.starWedge.constellationBuff : null;
    merged.starWedge.entriesCleared = Math.max(0, Math.floor(clampFiniteNumber(merged.starWedge.entriesCleared, 0, 0)));
    merged.starWedge.firstClearDone = !!merged.starWedge.firstClearDone;
    merged.starWedge.selectedWedgeId = Number.isFinite(merged.starWedge.selectedWedgeId) ? merged.starWedge.selectedWedgeId : null;
    // 보유 별쐐기는 잘라내지 않는다. 획득 경로(드랍·제작) 어디에도 보유 한도 검사가
    // 없고 화면에도 한도 표시가 없는데, 여기서만 60개로 잘라 초과분이 조용히 사라졌다.
    // 앞에서부터 남기므로 가장 최근에 얻은 것이 먼저 지워진다(별쐐기 하나가
    // 운석 파편 77개 + 불완전한 별쐐기 1개다). 장비·주얼 보관함과 같이 그대로 둔다.
    // 장착 수는 아래 sockets 상한(천문학자 레벨)이 계속 제한한다.
    merged.starWedge.wedges = Array.isArray(merged.starWedge.wedges) ? merged.starWedge.wedges.filter(w => w && Number.isFinite(w.id) && Array.isArray(w.lines)) : [];
    let mergedAstronomerLevel = merged.expertise && merged.expertise.levels ? merged.expertise.levels.astronomer : 1;
    let starWedgeSocketCap = typeof getMaxEquippedStarWedgesForLevel === 'function' ? getMaxEquippedStarWedgesForLevel(mergedAstronomerLevel) : MAX_STAR_WEDGES;
    merged.starWedge.sockets = Array.isArray(merged.starWedge.sockets) ? merged.starWedge.sockets.filter(s => s && typeof s.nodeId === 'string' && Number.isFinite(s.wedgeId)).slice(0, starWedgeSocketCap) : [];
    merged.starWedge.nodeMutations = (merged.starWedge.nodeMutations && typeof merged.starWedge.nodeMutations === 'object') ? merged.starWedge.nodeMutations : {};
    let validVoidPassiveIds = new Set(typeof getVoidPassiveNodeIds === 'function' ? getVoidPassiveNodeIds() : []);
    let rawVoidPassives = (merged.voidPassives && typeof merged.voidPassives === 'object') ? merged.voidPassives : {};
    merged.voidPassives = {};
    merged.retiredVoidPassives = (merged.retiredVoidPassives && typeof merged.retiredVoidPassives === 'object') ? merged.retiredVoidPassives : {};
    Object.keys(rawVoidPassives).forEach(nodeId => {
        if (!validVoidPassiveIds.has(String(nodeId))) merged.retiredVoidPassives[nodeId] = rawVoidPassives[nodeId];
    });
    let legacyVoidMigration = !(save.voidPassives && typeof save.voidPassives === 'object');
    let allocatedVoidIds = legacyVoidMigration ? new Set((merged.passives || []).map(id => String(id))) : new Set();
    validVoidPassiveIds.forEach(nodeId => {
        let rawEntry = rawVoidPassives[nodeId] && typeof rawVoidPassives[nodeId] === 'object' ? rawVoidPassives[nodeId] : {};
        let stats = Array.isArray(rawEntry.stats) ? rawEntry.stats : [];
        if (legacyVoidMigration && allocatedVoidIds.has(String(nodeId)) && stats.length <= 0) {
            let node = PASSIVE_TREE.nodes[nodeId];
            if (node && P_STATS[node.legacyVoidStat] && Number.isFinite(Number(node.legacyVoidVal))) {
                stats = [{ id: node.legacyVoidStat, val: Number(node.legacyVoidVal) }];
            }
        }
        stats = stats.filter(line => line && P_STATS[line.id] && Number.isFinite(Number(line.val))).slice(0, 2).map(line => ({ id: line.id, val: Number(line.val) }));
        let transcendent = (typeof normalizeTranscendentVoidPassive === 'function') ? normalizeTranscendentVoidPassive(rawEntry.transcendent) : null;
        if (stats.length > 0 || transcendent || rawVoidPassives[nodeId] || allocatedVoidIds.has(String(nodeId))) merged.voidPassives[nodeId] = { rarity: transcendent ? 'transcendent' : (stats.length > 0 ? 'magic' : 'normal'), stats, transcendent };
    });
    merged.completedTrials = Array.isArray(merged.completedTrials) ? merged.completedTrials.filter(id => typeof id === 'string') : [];
    merged.unlockedTrials = Array.isArray(merged.unlockedTrials) ? merged.unlockedTrials.filter(id => typeof id === 'string') : [];
    merged.itemSubtab = ['item-tab-equip', 'item-tab-craft', 'item-tab-fossil', 'item-tab-market', 'item-tab-hall', 'item-tab-infuser'].includes(merged.itemSubtab) ? merged.itemSubtab : 'item-tab-equip';
    merged.skillSubtab = ['skill-tab-equip','skill-tab-enhance','skill-tab-research','skill-tab-condition'].includes(merged.skillSubtab) ? merged.skillSubtab : 'skill-tab-equip';
    merged.skillAutoRules = Array.isArray(merged.skillAutoRules)
        ? merged.skillAutoRules.filter(rule => rule && typeof rule === 'object').map(rule => normalizeConditionPatternRule({ ...rule }))
        : [];
    merged.conditionGemUnlocked = !!merged.conditionGemUnlocked;
    merged.conditionGemPool = Array.isArray(merged.conditionGemPool) ? merged.conditionGemPool : [];
    merged.pendingConditionGemChoices = Array.isArray(merged.pendingConditionGemChoices) ? merged.pendingConditionGemChoices : null;
    merged.arcana = normalizeArcanaState(merged.arcana);
    let arcanaQuestMigration = reconcileArcanaQuestFromCosmos(merged);
    if (arcanaQuestMigration.completedNow) {
        merged.journalEntries = Array.isArray(merged.journalEntries) ? merged.journalEntries : [];
        if (!merged.journalEntries.includes('arcana_first_seal')) merged.journalEntries.push('arcana_first_seal');
    }
    merged.pruningTree = normalizePruningTreeState(merged.pruningTree, merged);
    advancePruningTreeForLoop(merged);
    merged.beyondBoundary = normalizeBeyondBoundaryState(merged.beyondBoundary, merged);
    if (merged.arcana.unlocked) merged.unlocks.arcana = true;
    delete merged.worldDeck;
    merged.clearedRootBosses = Array.isArray(merged.clearedRootBosses) ? merged.clearedRootBosses : [];
    // 과거 루프 정산 시 컨디션 젬 해금이 잘못 초기화되던 버그로 잠긴 기존 플레이어 복구:
    // 뿌리 보스를 한 번이라도 클리어한 적이 있다면 영구 해금 처리한다.
    if (!merged.conditionGemUnlocked && merged.clearedRootBosses.length > 0) merged.conditionGemUnlocked = true;
    merged.mapSubtab = ['map-tab-zones', 'map-tab-chaos-realm', 'map-tab-sky', 'map-tab-underworld', 'map-tab-cosmos', 'map-tab-ocean', 'map-tab-fishing', 'map-tab-pvp'].includes(merged.mapSubtab) ? merged.mapSubtab : 'map-tab-zones';
    merged.mapExploreSubtab = ['map-explore-hunting', 'map-explore-chaos', 'map-explore-root-boss', 'map-explore-beyond', 'map-explore-labyrinth', 'map-explore-deep-chaos', 'map-explore-meteor', 'map-explore-beehive', 'map-explore-colony', 'map-explore-voidrift', 'map-explore-timerift', 'map-explore-trials'].includes(merged.mapExploreSubtab) ? merged.mapExploreSubtab : 'map-explore-hunting';
    merged.coreCube = (typeof normalizeCoreCubeState === 'function') ? normalizeCoreCubeState(merged.coreCube) : (merged.coreCube || (defaultGame.coreCube || {}));
    if (merged.coreCube && merged.coreCube.unlocked) merged.unlocks.cube = true;
    merged.gemFoldInactiveAttack = !!merged.gemFoldInactiveAttack;
    merged.gemFoldInactiveSupport = !!merged.gemFoldInactiveSupport;
    let gemResearchExpanded = merged.gemResearchExpanded && typeof merged.gemResearchExpanded === 'object' && !Array.isArray(merged.gemResearchExpanded) ? merged.gemResearchExpanded : {};
    merged.gemResearchExpanded = {};
    ['attack', 'support'].forEach(section => {
        if (typeof gemResearchExpanded[section] === 'boolean') merged.gemResearchExpanded[section] = gemResearchExpanded[section];
    });
    if (merged.gemFoldInactive) {
        merged.gemFoldInactiveAttack = true;
        merged.gemFoldInactiveSupport = true;
    }
    merged.autoRepeatSeasonBoss = !!merged.autoRepeatSeasonBoss;
    if (((merged.currencies || {}).talismanCore || 0) > 0) {
        merged.currencies.sealShard = (merged.currencies.sealShard || 0) + (merged.currencies.talismanCore || 0);
        merged.currencies.talismanCore = 0;
    }
    if (((merged.currencies || {}).jewelCore || 0) > 0) {
        merged.currencies.jewelShard = (merged.currencies.jewelShard || 0) + Math.max(0, Math.floor(merged.currencies.jewelCore || 0));
        merged.currencies.jewelCore = 0;
    }
    merged.talismanUnlocked = !!merged.talismanUnlocked || ((merged.currencies.sealShard || 0) > 0) || ((merged.currencies.strongSealShard || 0) > 0);
    merged.talismanUnlockedCells = Array.isArray(merged.talismanUnlockedCells) ? merged.talismanUnlockedCells.map(v => Math.floor(v)).filter(v => v >= 0 && v < (TALISMAN_BOARD_W * TALISMAN_BOARD_H)).filter(v => isTalismanBoardCellValid(v % TALISMAN_BOARD_W, Math.floor(v / TALISMAN_BOARD_W))) : [];
    merged.talismanBoardUnlock = Math.max(3, Math.min(5, Math.floor(clampFiniteNumber(merged.talismanBoardUnlock, 3, 3, 5))));
    if (merged.talismanUnlockedCells.length === 0 && merged.talismanBoardUnlock > 3) {
        for (let y = 0; y < merged.talismanBoardUnlock; y++) {
            for (let x = 0; x < merged.talismanBoardUnlock; x++) {
                if (x < 4 && y < 4) continue;
                if (!isTalismanBoardCellValid(x, y)) continue;
                merged.talismanUnlockedCells.push(talismanCellIndex(x, y));
            }
        }
    }
    merged.talismanUnlockPickMode = !!merged.talismanUnlockPickMode;
    merged.talismanSubtab = merged.talismanSubtab === 'talisman-sub-colony-ward' ? 'talisman-sub-colony-ward' : 'talisman-sub-board';
    merged.talismanInventory = Array.isArray(merged.talismanInventory) ? merged.talismanInventory.filter(t => t && t.id && t.shape && (t.stat || (Array.isArray(t.stats) && t.stats.length > 0) || t.special || t.isUnique)).map(t => ensureTalismanName({ ...t, locked: !!t.locked, waxedByBeeswax: !!t.waxedByBeeswax })) : [];
    merged.talismanBoard = Array.isArray(merged.talismanBoard) ? merged.talismanBoard.slice(0, TALISMAN_BOARD_W * TALISMAN_BOARD_H) : [];
    while (merged.talismanBoard.length < (TALISMAN_BOARD_W * TALISMAN_BOARD_H)) merged.talismanBoard.push(null);
    merged.talismanPlacements = (merged.talismanPlacements && typeof merged.talismanPlacements === 'object') ? merged.talismanPlacements : {};
    Object.values(merged.talismanPlacements).forEach(entry => {
        if (entry && entry.talisman) ensureTalismanName(entry.talisman);
    });
    merged.talismanSelectedId = Number.isFinite(merged.talismanSelectedId) ? merged.talismanSelectedId : null;
    merged.talismanUnseal = (merged.talismanUnseal && merged.talismanUnseal.current) ? merged.talismanUnseal : null;
    if (merged.talismanUnlocked) merged.unlocks.talisman = true;
    merged.gemEnhanceUnlocked = !!merged.gemEnhanceUnlocked;
    merged.gemEngraveSelectedSlot = Math.max(0, Math.min(4, Math.floor(clampFiniteNumber(merged.gemEngraveSelectedSlot, 0, 0, 4))));
    merged.gemEnhanceTargetSkill = (typeof merged.gemEnhanceTargetSkill === 'string' && SKILL_DB[merged.gemEnhanceTargetSkill] && SKILL_DB[merged.gemEnhanceTargetSkill].isGem && Array.isArray(merged.skills) && merged.skills.includes(merged.gemEnhanceTargetSkill)) ? merged.gemEnhanceTargetSkill : null;
    merged.uniqueCodex = (merged.uniqueCodex && typeof merged.uniqueCodex === 'object') ? merged.uniqueCodex : {};
    if (typeof uniqueHuntRuntime !== 'undefined') uniqueHuntRuntime.ensureState(merged);
    merged.codexNewlyRegistered = (merged.codexNewlyRegistered && typeof merged.codexNewlyRegistered === 'object') ? merged.codexNewlyRegistered : {};
    merged.codexCollapsedSlots = (merged.codexCollapsedSlots && typeof merged.codexCollapsedSlots === 'object') ? merged.codexCollapsedSlots : {};
    merged.codexSubtab = (merged.codexSubtab === 'realm') ? 'realm' : 'main';
    merged.codexSelectedSlot = getCodexSlotOrder().includes(merged.codexSelectedSlot) ? merged.codexSelectedSlot : '무기';
    merged.uniqueCodexCompletedRewardClaimed = !!merged.uniqueCodexCompletedRewardClaimed;
    if (!merged.gemEnhanceUnlocked && (((merged.currencies || {}).bossCore || 0) > 0 || ((merged.currencies || {}).skyEssence || 0) > 0)) merged.gemEnhanceUnlocked = true;
    merged.inTicketBossFight = !!merged.inTicketBossFight;
    merged.beehive = (merged.beehive && typeof merged.beehive === 'object') ? merged.beehive : { unlockedPermanent:false, inRun:false, branchStep:0, cleared:false, routeSeed:0 };
    merged.colony = (merged.colony && typeof merged.colony === 'object') ? { ...defaultGame.colony, ...merged.colony } : { ...defaultGame.colony };
    merged.colony.wave = Math.max(0, Math.floor(clampFiniteNumber(merged.colony.wave, 0, 0)));
    merged.colony.highestWave = Math.max(merged.colony.wave, Math.floor(clampFiniteNumber(merged.colony.highestWave, merged.colony.wave, 0)));
    merged.colony.wardInventory = Array.isArray(merged.colony.wardInventory) ? merged.colony.wardInventory.map(w => w && typeof w === 'object' ? { ...w, locked: !!w.locked } : w).filter(Boolean) : [];
    merged.colony.wardEquipped = Array.isArray(merged.colony.wardEquipped) ? merged.colony.wardEquipped.slice(0, 4) : [null,null,null,null];
    while (merged.colony.wardEquipped.length < 4) merged.colony.wardEquipped.push(null);
    let highestWardSlot = merged.colony.wardEquipped.reduce((max, ward, idx) => ward ? Math.max(max, idx + 1) : max, 1);
    if (!savedColonyHadWardSlotVersion) merged.colony.wardSlots = highestWardSlot;
    else merged.colony.wardSlots = Math.max(1, Math.min(4, Math.floor(merged.colony.wardSlots || 1)));
    merged.colony.wardSlots = Math.max(merged.colony.wardSlots, highestWardSlot);
    merged.colony.wardSlotVersion = 1;
    let beeHasReturnZone = merged.beehive.returnZoneId !== undefined && merged.beehive.returnZoneId !== null;
    let beeHasStartedRoute = Math.max(0, Math.floor(merged.beehive.branchStep || 0)) > 0;
    let activeBeehiveRuntime = !!(merged.beehive.inRun && merged.currentZoneId === 'beehive_run' && (
        merged.beehive.awaitingClear
        || (merged.beehive.pendingChoice && (beeHasReturnZone || beeHasStartedRoute))
        || merged.beehive.queenActive
        || merged.beehive.pendingWaveReward
        || (Array.isArray(merged.beehive.pendingQueenRewards) && merged.beehive.pendingQueenRewards.length > 0)
        || (Array.isArray(merged.enemies) && merged.enemies.some(enemy => enemy && enemy.hp > 0))
    ));
    if (!activeBeehiveRuntime) {
        let staleBeehiveReturnZone = beeHasReturnZone ? merged.beehive.returnZoneId : merged.maxZoneId;
        merged.beehive.inRun = false;
        resetBeehiveRunModifiers(merged.beehive);
        if (merged.currentZoneId === 'beehive_run') merged.currentZoneId = staleBeehiveReturnZone;
    }
    if (merged.beehive && merged.beehive.inRun) {
        merged.combatHalted = !merged.beehive.awaitingClear;
    } else {
        merged.combatHalted = !!merged.combatHalted;
    }
    merged.seenTutorials = Array.isArray(merged.seenTutorials) ? merged.seenTutorials.filter(id => typeof id === 'string') : [];
    merged.starterGemTutorialPending = typeof merged.starterGemTutorialPending === 'string'
        && Array.isArray(merged.skills) && merged.skills.includes(merged.starterGemTutorialPending)
        ? merged.starterGemTutorialPending
        : null;
    merged.journalEntries = Array.isArray(merged.journalEntries) ? Array.from(new Set(merged.journalEntries.filter(id => typeof id === 'string' && JOURNAL_DB[id]))) : ['prologue'];
    // 보스 도전 추적은 저장 복원 후 이어 붙이지 않는다. 탭이 닫힌 동안의 피해·플라스크 사용을
    // 잃은 기록으로 업적을 잘못 판정하지 않도록 새 조우에서만 다시 시작한다.
    merged.hiddenJournalBossRun = null;
    // 전적: 기존 세이브에는 과거 시간 데이터가 없다. 지어내지 않고 지금부터 기록을 시작하며,
    // startedAt이 남으므로 화면이 "언제부터의 기록인지"를 그대로 밝힐 수 있다.
    if (typeof ensureRecordsState === 'function') ensureRecordsState(merged);
    merged.voidRift = (merged.voidRift && typeof merged.voidRift === 'object') ? merged.voidRift : {};
    merged.voidRift.grandBreachCleared = !!merged.voidRift.grandBreachCleared;
    merged.timeRift = (merged.timeRift && typeof merged.timeRift === 'object') ? { ...defaultGame.timeRift, ...merged.timeRift } : { ...defaultGame.timeRift };
    merged.timeRift.fusionCount = Math.max(0, Math.floor(clampFiniteNumber(merged.timeRift.fusionCount, 0, 0)));
    repairJournalEntriesFromProgress(merged);
    // 저널 보너스는 기록 정의에서 항상 재구축한다. 저장 배열을 그대로 신뢰하면
    // 클라우드 병합·구버전 이관 과정에서 같은 기록이 중복되어 능력치가 누적될 수 있다.
    let journalLoadState = rebuildJournalBonusStateForLoad(merged);
    let pendingJournalPassivePoints = Math.max(0, Math.floor(journalLoadState.pendingPassivePoints || 0));
    merged.passiveStarEvolution = !!merged.passiveStarEvolution;
    const awakeningSources = new Set(['legacy_migrated', 'legacy_apex', 'outer_constellation']);
    merged.passiveStarEvolutionSource = merged.passiveStarEvolution
        ? (awakeningSources.has(merged.passiveStarEvolutionSource) ? merged.passiveStarEvolutionSource : 'legacy_migrated')
        : null;
    merged.settings.showDeathNotice = merged.settings.showDeathNotice !== false;
    merged.settings.uiSounds = merged.settings.uiSounds !== false;
    merged.settings.themeMode = merged.settings.themeMode === 'light' ? 'light' : 'dark';
    merged.settings.uiSkin = normalizeUiSkin(merged.settings.uiSkin);
    merged.settings.uiScale = normalizeUiScale(merged.settings.uiScale);
    merged.settings.tabLayouts = normalizeTabLayoutSettings(save.settings || {});
    ['tabOrder', 'tabPlacement', 'tabGroupOrder', 'tabPlacementInitialized'].forEach(key => delete merged.settings[key]);
    merged.settings.twoRowTabs = false;
    merged.settings.leftPaneCollapsed = !!merged.settings.leftPaneCollapsed;
    merged.settings.combatLogCollapsed = !!merged.settings.combatLogCollapsed;
    equipmentLootPolicy.normalizeSettings(merged.settings);
    merged.settings.autoEnterGrandBreach = !!merged.settings.autoEnterGrandBreach;
    merged.settings.growthAutoSalvageRarities = { ...(defaultGame.settings.growthAutoSalvageRarities || {}), ...(merged.settings.growthAutoSalvageRarities || {}) };
    merged.settings.inventoryViewRarities = { ...(defaultGame.settings.inventoryViewRarities || {}), ...(merged.settings.inventoryViewRarities || {}) };
    merged.settings.jewelAutoSalvageEnabled = !!merged.settings.jewelAutoSalvageEnabled;
    merged.settings.jewelAutoSalvageRarities = { ...(defaultGame.settings.jewelAutoSalvageRarities || {}), ...(merged.settings.jewelAutoSalvageRarities || {}) };
    merged.settings.mapCompleteAction = ['nextZone', 'repeatZone', 'nextLoopBestPlusOne', 'stop'].includes(merged.settings.mapCompleteAction) ? merged.settings.mapCompleteAction : 'nextZone';
    merged.settings.disableItemAutomationAfterLoop = merged.settings.disableItemAutomationAfterLoop !== false;
    merged.settings.postLoopMapCompleteAction = ['nextZone', 'repeatZone', 'nextLoopBestPlusOne', 'stop'].includes(merged.settings.postLoopMapCompleteAction) ? merged.settings.postLoopMapCompleteAction : 'nextLoopBestPlusOne';
    merged.settings.townReturnAction = ['retry', 'stop'].includes(merged.settings.townReturnAction) ? merged.settings.townReturnAction : 'retry';
    merged.heroSelectionInitialized = !!merged.heroSelectionInitialized;
    let hasSavedTalentHero = !!HERO_SELECTION_DEFS[save && save.selectedHeroId];
    merged.selectedHeroId = hasSavedTalentHero ? save.selectedHeroId : 'hero1';
    let legacyMotionId = save && save.settings && typeof save.settings.testCharacterMotionId === 'string'
        ? save.settings.testCharacterMotionId.replace(/^motion_/, '') : '';
    let migratedClassId = PLAYER_CLASS_DEFS[save && save.selectedClassId]
        ? save.selectedClassId
        : (PLAYER_CLASS_DEFS[legacyMotionId] ? legacyMotionId : LEGACY_HERO_TO_PLAYER_CLASS[merged.selectedHeroId]);
    merged.selectedClassId = PLAYER_CLASS_DEFS[migratedClassId] ? migratedClassId : 'archer';
    if (!hasSavedTalentHero) merged.selectedHeroId = PLAYER_CLASS_DEFS[merged.selectedClassId].recommendedTalentHeroId;
    let classTalentAlignmentVersion = Math.max(0, Math.floor(Number(save && save.classTalentAlignmentVersion) || 0));
    if (classTalentAlignmentVersion < 1 && save && save.heroSelectionInitialized) {
        merged.selectedHeroId = PLAYER_CLASS_DEFS[merged.selectedClassId].recommendedTalentHeroId;
    }
    merged.classTalentAlignmentVersion = 1;
    let hasSavedTalentInitializedFlag = !!save
        && Object.prototype.hasOwnProperty.call(save, 'talentSelectionInitialized');
    merged.talentSelectionInitialized = hasSavedTalentInitializedFlag
        ? !!save.talentSelectionInitialized
        : (hasSavedTalentHero || !!merged.heroSelectionInitialized);
    let legacyAppearanceClassId = LEGACY_HERO_TO_PLAYER_CLASS[save && save.appearanceHeroId];
    merged.appearanceClassId = PLAYER_CLASS_DEFS[save && save.appearanceClassId]
        ? save.appearanceClassId
        : (PLAYER_CLASS_DEFS[legacyAppearanceClassId] ? legacyAppearanceClassId : null);
    let savedDiscoveredClasses = Array.isArray(save && save.discoveredClassIds)
        ? save.discoveredClassIds
        : (Array.isArray(save && save.discoveredHeroIds) ? save.discoveredHeroIds.map(id => LEGACY_HERO_TO_PLAYER_CLASS[id]) : []);
    merged.discoveredClassIds = [...new Set(savedDiscoveredClasses.filter(id => PLAYER_CLASS_DEFS[id]))];
    merged.classFreeSwitchUnlocked = !!(save && (save.classFreeSwitchUnlocked || save.heroFreeSwitchUnlocked));
    if ((merged.heroSelectionInitialized || merged.classFreeSwitchUnlocked) && !merged.discoveredClassIds.includes(merged.selectedClassId)) {
        merged.discoveredClassIds.push(merged.selectedClassId);
    }
    merged.classFreeSwitchUnlocked = merged.classFreeSwitchUnlocked || merged.discoveredClassIds.length >= PLAYER_CLASS_ORDER.length;
    merged.settings.heroAppearanceMode = ['fixed', 'loop'].includes(savedHeroAppearanceMode)
        ? savedHeroAppearanceMode
        : (merged.appearanceClassId ? 'fixed' : 'loop');
    if (merged.settings.heroAppearanceMode === 'fixed' && !merged.appearanceClassId) merged.appearanceClassId = merged.selectedClassId;
    delete merged.appearanceHeroId;
    delete merged.discoveredHeroIds;
    delete merged.heroFreeSwitchUnlocked;
    merged.pendingLoopHeroSelection = !!merged.pendingLoopHeroSelection;
    merged.abyssClearedDepths = Array.isArray(merged.abyssClearedDepths) ? merged.abyssClearedDepths.map(v => Math.max(1, Math.floor(v || 1))).filter(v => v <= 20) : [];
    merged.playerAilments = Array.isArray(merged.playerAilments) ? merged.playerAilments.map(row => ({ type: row.type, time: Math.max(0, clampFiniteNumber(row.time, 0, 0, 30)), power: Math.max(0, clampFiniteNumber(row.power, 0.1, 0, 1.5)), sourceHitDamage: Math.max(0, Math.floor(clampFiniteNumber(row.sourceHitDamage || row.hitDamage, 0, 0))) })).filter(row => row.type) : [];
    merged.playerLeechInstances = Array.isArray(merged.playerLeechInstances) ? merged.playerLeechInstances.map(row => ({ remaining: Math.max(0, clampFiniteNumber(row.remaining, 0, 0)), rate: Math.max(0, clampFiniteNumber(row.rate, 0, 0)), target: row.target === 'energyShield' ? 'energyShield' : 'life' })).filter(row => row.remaining > 0 && row.rate > 0).slice(0, 80) : [];
    merged.recentDamageEvents = Array.isArray(merged.recentDamageEvents) ? merged.recentDamageEvents.map(normalizeRecentDamageEvent).filter(Boolean) : [];
    merged.lastDeathLog = normalizeDeathLog(merged.lastDeathLog);
    merged.enemies = Array.isArray(merged.enemies) ? merged.enemies.map(normalizeEnemyRecord).filter(Boolean) : [];
    let aliveEnemyIds = new Set((merged.enemies || []).map(enemy => String(enemy.id)));
    function pruneEnemyRuntimeMap(rawMap, options = {}) {
        let map = (rawMap && typeof rawMap === 'object') ? rawMap : {};
        let keys = Object.keys(map);
        let maxKeys = Math.max(0, Math.floor(options.maxKeys || 200));
        let out = {};
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (!aliveEnemyIds.has(String(key))) continue;
            out[key] = map[key];
            if (Object.keys(out).length >= maxKeys) break;
        }
        return out;
    }
    merged.enemyKeystoneDebuffs = pruneEnemyRuntimeMap(merged.enemyKeystoneDebuffs, { maxKeys: 120 });
    merged.rangerWeakpointMarks = pruneEnemyRuntimeMap(merged.rangerWeakpointMarks, { maxKeys: 120 });
    merged.enemyUniqueChaosResDown = pruneEnemyRuntimeMap(merged.enemyUniqueChaosResDown, { maxKeys: 120 });
    merged.enemyUniqueElementalResDown = pruneEnemyRuntimeMap(merged.enemyUniqueElementalResDown, { maxKeys: 120 });
    merged.enemyCurseExpirePayloads = pruneEnemyRuntimeMap(merged.enemyCurseExpirePayloads, { maxKeys: 120 });
    merged.encounterPlan = Array.isArray(merged.encounterPlan) ? merged.encounterPlan.map(normalizeEncounterMarker).filter(Boolean).sort((a, b) => a.at - b.at) : [];
    merged.level = Math.max(1, Math.floor(clampFiniteNumber(merged.level, defaultGame.level, 1, MAX_PLAYER_LEVEL)));
    merged.exp = Math.max(0, Math.floor(clampFiniteNumber(merged.exp, defaultGame.exp, 0)));
    merged.season = Math.max(1, Math.floor(clampFiniteNumber(merged.season, defaultGame.season, 1)));
    merged.loopCount = Math.max(0, Math.floor(clampFiniteNumber(merged.loopCount, defaultGame.loopCount, 0)));
    if (typeof ensureOfflineProgressState === 'function') ensureOfflineProgressState(merged);
    if (typeof syncOfflineProgressEntitlement === 'function') syncOfflineProgressEntitlement(merged);
    merged.woodsmanDefeatAttempts = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanDefeatAttempts, defaultGame.woodsmanDefeatAttempts, 0)));
    merged.woodsmanSimulatorSeenLoop = !!merged.woodsmanSimulatorSeenLoop;
    merged.woodsmanEntrancePending = !!(merged.woodsmanEntrancePending && merged.currentZoneId === OUTSIDE_CHAOS_ZONE_ID);
    merged.woodsmanCurseActive = !!merged.woodsmanCurseActive;
    merged.woodsmanCurseDamageTakenStacks = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanCurseDamageTakenStacks, defaultGame.woodsmanCurseDamageTakenStacks || 0, 0)));
    merged.woodsmanCurseLastTickAt = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanCurseLastTickAt, defaultGame.woodsmanCurseLastTickAt || 0, 0)));
    merged.woodsmanCurseNextLogStack = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanCurseNextLogStack, defaultGame.woodsmanCurseNextLogStack || 0, 0)));
    merged.chaosInfuserUnlocked = !!merged.chaosInfuserUnlocked || merged.woodsmanSimulatorSeenLoop || Math.max(0, Math.floor(merged.woodsmanDefeatAttempts || 0)) > 0 || (Array.isArray(merged.journalEntries) && merged.journalEntries.includes('woodsman'));
    merged.killsInZone = Math.max(0, Math.floor(clampFiniteNumber(merged.killsInZone, defaultGame.killsInZone, 0)));
    merged.passivePoints = Math.max(0, Math.floor(clampFiniteNumber(merged.passivePoints, defaultGame.passivePoints, 0))) + Math.max(0, Math.floor(merged.autoRefundedPassivePoints || 0)) + pendingJournalPassivePoints;
    delete merged.inventoryExpandLevel;
    merged.jewelInventoryExpandLevel = Math.max(0, Math.floor(clampFiniteNumber(merged.jewelInventoryExpandLevel, defaultGame.jewelInventoryExpandLevel, 0)));
    merged.growthInventoryExpandLevel = Math.max(0, Math.floor(clampFiniteNumber(merged.growthInventoryExpandLevel, defaultGame.growthInventoryExpandLevel, 0)));
    merged.growthEssenceExpandLevel = Math.max(0, Math.min(12, Math.floor(clampFiniteNumber(merged.growthEssenceExpandLevel, 0, 0, 12))));
    merged.settings = { ...defaultGame.settings, ...(merged.settings || {}) };
    delete merged.settings.testCharacterMotionId;
    merged.settings.chatMessageSize = ['small', 'medium', 'large'].includes(merged.settings.chatMessageSize) ? merged.settings.chatMessageSize : 'medium';
    const passiveVisualVersion = Math.max(0, Math.floor(Number(save && save.settings && save.settings.passiveTreeVisualStyleVersion) || 0));
    if (passiveVisualVersion < 1) merged.settings.passiveTreeShowLabels = false;
    else merged.settings.passiveTreeShowLabels = merged.settings.passiveTreeShowLabels === true;
    merged.settings.passiveInvestmentSummaryCollapsed = passiveVisualVersion < 2
        ? true : merged.settings.passiveInvestmentSummaryCollapsed === true;
    merged.settings.passiveTreeVisualStyleVersion = 2;
    if (typeof normalizePassiveTreePlannerState === 'function') {
        merged.settings.passiveTreePlanner = normalizePassiveTreePlannerState(merged.settings.passiveTreePlanner);
    }
    merged.settings.damageNumberFormat = ['comma', 'korean', 'korean_short', 'english'].includes(merged.settings.damageNumberFormat) ? merged.settings.damageNumberFormat : 'comma';
    merged.settings.showExpComma = merged.settings.showExpComma !== false;
    merged.settings.showHpComma = merged.settings.showHpComma !== false;
    merged.settings.showEnemyHpComma = merged.settings.showEnemyHpComma !== false;
    merged.settings.showCharacterComma = merged.settings.showCharacterComma !== false;
    merged.settings.notiFilters = { ...(defaultGame.settings.notiFilters || {}), ...(merged.settings.notiFilters || {}) };
    delete merged.settings.notiFilters.hideout;
    merged.playerHp = Math.max(0, Math.floor(clampFiniteNumber(merged.playerHp, defaultGame.playerHp, 0)));
    merged.playerEnergyShield = Math.max(0, Math.floor(clampFiniteNumber(merged.playerEnergyShield, defaultGame.playerEnergyShield, 0)));
    merged.moveTimer = clampFiniteNumber(merged.moveTimer, defaultGame.moveTimer, 0);
    merged.moveTotalTime = clampFiniteNumber(merged.moveTotalTime, defaultGame.moveTotalTime, 0);
    merged.runProgress = clampFiniteNumber(merged.runProgress, defaultGame.runProgress, 0, 100);
    merged.encounterIndex = Math.max(0, Math.floor(clampFiniteNumber(merged.encounterIndex, defaultGame.encounterIndex, 0)));
    merged.nextEnemyId = Math.max(1, Math.floor(clampFiniteNumber(merged.nextEnemyId, defaultGame.nextEnemyId, 1)));
    merged.seasonPoints = Math.max(0, Math.floor(clampFiniteNumber(merged.seasonPoints, defaultGame.seasonPoints, 0)));
    merged.loopDeepPoints = Math.max(0, Math.floor(clampFiniteNumber(merged.loopDeepPoints, defaultGame.loopDeepPoints, 0)));
    merged.loopDeepStats = { ...(defaultGame.loopDeepStats || {}), ...(merged.loopDeepStats || {}) };
    merged.chaosRealm = { ...createDefaultChaosRealmState(), ...(merged.chaosRealm || {}) };
    merged.skyTower = { ...createDefaultSkyTowerState(), ...(merged.skyTower || {}) };
    const legacyCondensedSkyPower = Math.max(0, Math.floor(Number(merged.currencies.condensedSkyPower) || 0));
    if (legacyCondensedSkyPower > 0) {
        merged.skyTower.condensedPower = Math.max(0, Math.floor(Number(merged.skyTower.condensedPower) || 0)) + legacyCondensedSkyPower;
    }
    delete merged.currencies.condensedSkyPower;
    merged.skyTower.skyStone = { ...(createDefaultSkyTowerState().skyStone || {}), ...((merged.skyTower || {}).skyStone || {}) };
    merged.skyTower.gemBoosts = { ...((merged.skyTower || {}).gemBoosts || {}) };
    merged.chaosRealm.permanentBonuses = { ...CHAOS_REALM_DEFAULT_BONUSES, ...((merged.chaosRealm || {}).permanentBonuses || {}) };
    merged.chaosRealm.unlocked = !!merged.chaosRealm.unlocked;
    merged.chaosRealm.highestFloor = Math.max(0, Math.floor(clampFiniteNumber(merged.chaosRealm.highestFloor, 0, 0)));
    merged.chaosRealm.currentFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.chaosRealm.currentFloor, 1, 1)));
    let hasSavedUnderworldProgress = !!(save && typeof save === 'object' && save.underworldProgress && typeof save.underworldProgress === 'object');
    let legacyUnderworldProgress = {};
    if (!hasSavedUnderworldProgress) {
        let legacyHighest = Math.max(1, Math.floor(clampFiniteNumber(((save && save.chaosRealm) || {}).highestFloor, 1, 1)));
        let legacyCurrent = Math.max(1, Math.floor(clampFiniteNumber(((save && save.chaosRealm) || {}).currentFloor, 1, 1)));
        legacyUnderworldProgress = { highestFloor: legacyHighest, currentFloor: legacyCurrent, floor10Cleared: legacyHighest >= 11 };
    }
    merged.underworldProgress = { ...(defaultGame.underworldProgress || { highestFloor: 1, currentFloor: 1 }), ...legacyUnderworldProgress, ...(merged.underworldProgress || {}) };
    merged.underworldProgress.highestFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.underworldProgress.highestFloor, 1, 1)));
    merged.underworldProgress.currentFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.underworldProgress.currentFloor, 1, 1)));
    let savedRunes = (merged.underworldRunes && typeof merged.underworldRunes === 'object') ? merged.underworldRunes : {};
    let underworld10ClearCredit = !!merged.underworldProgress.floor10Cleared
        || Math.max(0, Math.floor(Number(savedRunes.unlockedSlots) || 0)) >= 1
        || Math.max(0, Math.floor(Number(savedRunes.unlockedRunesMaxNumber) || 0)) >= 1;
    merged.underworldProgress.floor10Cleared = underworld10ClearCredit;
    if (!underworld10ClearCredit) {
        merged.underworldProgress.highestFloor = Math.min(merged.underworldProgress.highestFloor, 10);
        merged.underworldProgress.currentFloor = Math.min(merged.underworldProgress.currentFloor, merged.underworldProgress.highestFloor);
    }
    merged.chaosRealm.clearedFloors = Array.isArray(merged.chaosRealm.clearedFloors) ? Array.from(new Set(merged.chaosRealm.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b) : [];
    merged.chaosRealm.woodsmanBestDamagePct = Math.max(0, Math.min(100, Number(merged.chaosRealm.woodsmanBestDamagePct) || 0));
    Object.keys(CHAOS_REALM_DEFAULT_BONUSES).forEach(key => { merged.chaosRealm.permanentBonuses[key] = Math.max(0, Number(merged.chaosRealm.permanentBonuses[key]) || 0); });
    if (merged.chaosRealm.unlocked && merged.chaosRealm.highestFloor < 1) merged.chaosRealm.highestFloor = 1;
    merged.skyTower.unlocked = !!merged.skyTower.unlocked;
    merged.skyTower.highestFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.skyTower.highestFloor, 1, 1)));
    merged.skyTower.currentFloor = Math.max(1, Math.min(merged.skyTower.highestFloor, Math.floor(clampFiniteNumber(merged.skyTower.currentFloor, 1, 1))));
    merged.skyTower.loopSeason = Math.max(1, Math.floor(clampFiniteNumber(merged.skyTower.loopSeason, merged.season || 1, 1)));
    if (merged.skyTower.loopSeason !== Math.max(1, Math.floor(merged.season || 1))) { merged.skyTower.loopSeason = Math.max(1, Math.floor(merged.season || 1)); merged.skyTower.clearedThisLoop = 0; }
    merged.skyTower.clearedThisLoop = Math.max(0, Math.min(getSkyTowerLoopClearLimit(), Math.floor(clampFiniteNumber(merged.skyTower.clearedThisLoop, 0, 0))));
    merged.skyTower.clearedFloors = Array.isArray(merged.skyTower.clearedFloors) ? Array.from(new Set(merged.skyTower.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b) : [];
    merged.skyTower.condensedPower = Math.max(0, Math.floor(clampFiniteNumber(merged.skyTower.condensedPower, 0, 0)));
    merged.skyTower.skyStone.level = Math.max(0, Math.min(getSkyStoneMaxLevel(), Math.floor(clampFiniteNumber(merged.skyTower.skyStone.level, 0, 0))));
    merged.skyTower.skyStone.crafted = !!merged.skyTower.skyStone.crafted || merged.skyTower.skyStone.level > 0;
    Object.keys(merged.skyTower.gemBoosts).forEach(name => { merged.skyTower.gemBoosts[name] = Math.max(0, Math.min(getSkyTowerGemBoostMaxLevel(), Math.floor(clampFiniteNumber(merged.skyTower.gemBoosts[name], 0, 0)))); if (merged.skyTower.gemBoosts[name] <= 0) delete merged.skyTower.gemBoosts[name]; });
    if (!merged.skyTower.unlocked && ((merged.season || 1) > 15 || ((merged.season || 1) >= 15 && (merged.loopProgressCurrent && merged.loopProgressCurrent.chaos20Cleared)))) merged.skyTower.unlocked = true;
    merged.woodsmanPendingScore = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanPendingScore, defaultGame.woodsmanPendingScore || 0, 0)));
    merged.woodsmanLifetimeScore = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanLifetimeScore, defaultGame.woodsmanLifetimeScore || 0, 0)));
    merged.woodsmanSettledScore = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanSettledScore, defaultGame.woodsmanSettledScore || 0, 0)));
    merged.woodsmanEchoRun = (merged.woodsmanEchoRun && typeof merged.woodsmanEchoRun === 'object') ? merged.woodsmanEchoRun : { active:false, timeLeft:0, duration:30, lastTickAt:0, totalDamage:0, bestDps:0 };
    merged.woodsmanEchoRun.active = !!merged.woodsmanEchoRun.active;
    merged.woodsmanEchoRun.timeLeft = Math.max(0, Number(merged.woodsmanEchoRun.timeLeft || 0));
    merged.woodsmanEchoRun.duration = 30;
    merged.woodsmanEchoRun.totalDamage = Math.max(0, Math.floor(Number(merged.woodsmanEchoRun.totalDamage || 0)));
    merged.woodsmanEchoRun.bestDps = Math.max(0, Number(merged.woodsmanEchoRun.bestDps || 0));
    merged.loopProgressBase = { ...(defaultGame.loopProgressBase || {}), ...(merged.loopProgressBase || {}) };
    merged.loopProgressCurrent = { ...(defaultGame.loopProgressCurrent || {}), ...(merged.loopProgressCurrent || {}) };
    merged.loopProgressBase.specialBosses = Array.isArray(merged.loopProgressBase.specialBosses) ? merged.loopProgressBase.specialBosses : [];
    merged.loopProgressCurrent.specialBosses = Array.isArray(merged.loopProgressCurrent.specialBosses) ? merged.loopProgressCurrent.specialBosses : [];
    merged.loopProgressCurrent.cosmosPlanets = Array.isArray(merged.loopProgressCurrent.cosmosPlanets) ? Array.from(new Set(merged.loopProgressCurrent.cosmosPlanets.filter(Boolean))) : [];
    merged.cosmosLoopCount = Math.max(0, Math.floor(clampFiniteNumber(merged.cosmosLoopCount, defaultGame.cosmosLoopCount || 0, 0)));
    merged.lastLoopAdvancePath = ['chaos', 'cosmos'].includes(merged.lastLoopAdvancePath) ? merged.lastLoopAdvancePath : null;
    merged.loopProgressCurrent.chaos20Cleared = !!merged.loopProgressCurrent.chaos20Cleared || (Array.isArray(merged.abyssClearedDepths) && merged.abyssClearedDepths.map(v => Math.floor(v || 0)).includes(20));
    if (!merged.skyTower.unlocked && (merged.season || 1) >= 15 && merged.loopProgressCurrent.chaos20Cleared) merged.skyTower.unlocked = true;
    merged.pendingLoopDecision = !!merged.pendingLoopDecision;
    merged.pendingLoopReady = !!merged.pendingLoopReady;
    merged.ascendPoints = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendPoints, defaultGame.ascendPoints, 0)));
    merged.ascendRank = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendRank, defaultGame.ascendRank, 0, 4)));
    merged.activeSkill = SKILL_DB[merged.activeSkill] ? merged.activeSkill : (merged.skills[0] || '기본 공격');
    if (merged.activeSkill && SKILL_DB[merged.activeSkill] && Array.isArray(SKILL_DB[merged.activeSkill].tags) && SKILL_DB[merged.activeSkill].tags.includes('summon_attack')) {
        if (!merged.gemEnhanceTargetSkill) merged.gemEnhanceTargetSkill = merged.activeSkill;
        merged.activeSkill = '기본 공격';
    }
    merged.equippedSummonSkills = Array.isArray(merged.equippedSummonSkills)
        ? Array.from(new Set(merged.equippedSummonSkills.filter(name => {
            let def = SKILL_DB[name] || {};
            return !!(def && Array.isArray(def.tags) && def.tags.includes('summon_attack') && merged.skills.includes(name));
        })))
        : [];
    let hasSavedSummonSkillCounts = !!(save && Object.prototype.hasOwnProperty.call(save, 'summonSkillCounts') && save.summonSkillCounts && typeof save.summonSkillCounts === 'object');
    merged.summonSkillCounts = hasSavedSummonSkillCounts ? { ...merged.summonSkillCounts } : {};
    Object.keys(merged.summonSkillCounts).forEach(name => { if (!merged.equippedSummonSkills.includes(name)) delete merged.summonSkillCounts[name]; });
    if (hasSavedSummonSkillCounts) merged.equippedSummonSkills.forEach(name => { merged.summonSkillCounts[name] = Math.max(1, Math.floor(Number(merged.summonSkillCounts[name]) || 1)); });
    let ownedSummonAttackSkills = (Array.isArray(merged.skills) ? merged.skills : []).filter(name => {
        let def = SKILL_DB[name] || {};
        return !!(def && Array.isArray(def.tags) && def.tags.includes('summon_attack'));
    });
    let saveSummonCap = estimateSummonEquipCapForMergedSave(merged);
    if (!merged.summonLoadoutInitialized && merged.equippedSummonSkills.length === 0 && ownedSummonAttackSkills.length > 0) {
        merged.equippedSummonSkills = ownedSummonAttackSkills.slice(0, saveSummonCap);
        if (hasSavedSummonSkillCounts) merged.equippedSummonSkills.forEach(name => { merged.summonSkillCounts[name] = Math.max(1, Math.floor(Number(merged.summonSkillCounts[name]) || 1)); });
    }
    if (!hasSavedSummonSkillCounts) {
        let legacySummonCounts = {};
        let guardCount = (Array.isArray(merged.equippedSupports) ? merged.equippedSupports : []).filter(name => {
            let def = SUPPORT_GEM_DB[name] || {};
            return !!(def && Array.isArray(def.tags) && def.tags.includes('summon_guard'));
        }).length;
        let baseAttackSlots = Math.max(0, Math.min(merged.equippedSummonSkills.length, saveSummonCap - guardCount));
        merged.equippedSummonSkills.slice(0, baseAttackSlots).forEach(name => { legacySummonCounts[name] = (legacySummonCounts[name] || 0) + 1; });
        let usedSlots = Math.min(saveSummonCap, guardCount + baseAttackSlots);
        let cursor = 0;
        while (usedSlots < saveSummonCap && merged.equippedSummonSkills.length > 0) {
            let name = merged.equippedSummonSkills[cursor % merged.equippedSummonSkills.length];
            legacySummonCounts[name] = (legacySummonCounts[name] || 0) + 1;
            usedSlots++;
            cursor++;
        }
        merged.summonSkillCounts = legacySummonCounts;
    }
    merged.summonLoadoutInitialized = true;
    let equippedEnhanceTargets = [];
    if (SKILL_DB[merged.activeSkill] && SKILL_DB[merged.activeSkill].isGem) equippedEnhanceTargets.push(merged.activeSkill);
    merged.equippedSummonSkills.forEach(name => {
        if (SKILL_DB[name] && SKILL_DB[name].isGem && !equippedEnhanceTargets.includes(name)) equippedEnhanceTargets.push(name);
    });
    if (!equippedEnhanceTargets.includes(merged.gemEnhanceTargetSkill)) {
        if (equippedEnhanceTargets.includes(merged.activeSkill)) merged.gemEnhanceTargetSkill = merged.activeSkill;
        else if (merged.equippedSummonSkills.length > 0) merged.gemEnhanceTargetSkill = merged.equippedSummonSkills[0];
        else merged.gemEnhanceTargetSkill = null;
    }
    if (typeof merged.currentZoneId === 'string' && /^\d+$/.test(merged.currentZoneId)) merged.currentZoneId = parseInt(merged.currentZoneId, 10);
    if (typeof merged.maxZoneId === 'string' && /^\d+$/.test(merged.maxZoneId)) merged.maxZoneId = parseInt(merged.maxZoneId, 10);
    if (typeof merged.maxZoneId !== 'string') {
        let mergedSeasonCap = getSeasonFinalZoneId(merged.season || 1);
        merged.maxZoneId = clampNumber(Number.isFinite(merged.maxZoneId) ? merged.maxZoneId : 0, 0, Math.max(MAP_ZONES.length - 1, mergedSeasonCap));
    }
    if (typeof merged.currentZoneId !== 'string') {
        let numericZoneId = Number.isFinite(merged.currentZoneId) ? merged.currentZoneId : 0;
        let savedDepth = Math.max(Math.floor(merged.abyssEndlessDepth || 20), getAbyssDepthFromZoneId(numericZoneId), ...((Array.isArray(merged.abyssUnlockedDepths) ? merged.abyssUnlockedDepths : [20]).map(v => Math.floor(v || 0))));
        let maxDeepZoneId = getAbyssZoneIdForDepth(Math.max(20, savedDepth));
        merged.currentZoneId = clampNumber(numericZoneId, 0, Math.max(MAP_ZONES.length - 1, maxDeepZoneId));
    }
    if (typeof merged.currentZoneId === 'string' && !merged.currentZoneId.startsWith('trial_') && !merged.currentZoneId.includes('_boss_') && !['beehive_run', 'colony_run', 'grand_breach_run', 'cosmos_challenge', LABYRINTH_ZONE_ID, METEOR_FALL_ZONE_ID, OUTSIDE_CHAOS_ZONE_ID, CHAOS_REALM_ZONE_ID, SKY_TOWER_ZONE_ID, UNDERWORLD_ZONE_ID, BEYOND_BOUNDARY_ZONE_ID].includes(merged.currentZoneId)) merged.currentZoneId = 0;
    if (typeof merged.currentZoneId === 'string' && !getZone(merged.currentZoneId)) merged.currentZoneId = 0;
    if (merged.currentZoneId === BEYOND_BOUNDARY_ZONE_ID && !merged.beyondBoundary.activeRun) merged.currentZoneId = getAutoProgressZoneId(merged.maxZoneId);
    if (merged.currentZoneId === 'beehive_run' && !(merged.beehive && merged.beehive.inRun)) merged.currentZoneId = merged.beehive && merged.beehive.returnZoneId !== undefined && merged.beehive.returnZoneId !== null ? merged.beehive.returnZoneId : merged.maxZoneId;
    if (merged.beehive && merged.beehive.inRun && merged.currentZoneId !== 'beehive_run') {
        merged.beehive.inRun = false;
        resetBeehiveRunModifiers(merged.beehive);
    }
    if (merged.woodsmanBuildLock && (merged.currentZoneId !== OUTSIDE_CHAOS_ZONE_ID || !merged.woodsmanBuildSnapshot)) {
        merged.woodsmanBuildLock = false;
        merged.woodsmanBuildSnapshot = null;
    }
    let currentAbyssDepth = typeof merged.currentZoneId !== 'string' ? getAbyssDepthFromZoneId(merged.currentZoneId) : 0;
    let legacyDeepChaosSlot = (merged.season || 1) >= 10 && currentAbyssDepth === 20 && Math.floor(merged.abyssEndlessDepth || 0) > 20;
    if (typeof merged.maxZoneId !== 'string' && typeof merged.currentZoneId !== 'string' && merged.currentZoneId > merged.maxZoneId && currentAbyssDepth <= 20 && !legacyDeepChaosSlot) merged.currentZoneId = merged.maxZoneId;
    if (merged.discoveredPassives.length === 0) merged.discoveredPassives = [getPassiveTreeRootNodeId(merged)];
    let seasonCap = getSeasonFinalZoneId(merged.season || 1);
    if (typeof merged.maxZoneId !== 'string') merged.maxZoneId = clampNumber(merged.maxZoneId, 0, seasonCap);
    if (typeof merged.currentZoneId !== 'string') {
        let normalizedDepth = getAbyssDepthFromZoneId(merged.currentZoneId);
        let keepLegacyDeepChaosSlot = (merged.season || 1) >= 10 && normalizedDepth === 20 && Math.floor(merged.abyssEndlessDepth || 0) > 20;
        if ((normalizedDepth <= 20 && !keepLegacyDeepChaosSlot) || (merged.season || 1) < 10) merged.currentZoneId = clampNumber(merged.currentZoneId, 0, seasonCap);
    }
    if ((merged.season || 1) >= STAR_WEDGE_UNLOCK_LOOP && (merged.maxZoneId || 0) >= STAR_WEDGE_UNLOCK_ACT) {
        merged.starWedge.unlocked = true;
    }
    reconcileMapPrimaryContentUnlocks(merged);
    if (!isMapPrimaryContentUnlocked(merged, merged.mapSubtab)) merged.mapSubtab = 'map-tab-zones';
    if (typeof salvageRecoveryRuntime !== 'undefined') salvageRecoveryRuntime.ensureState(merged);
    merged.saveVersion = defaultGame.saveVersion;
    merged.bountyHunt = bountyRuntime.restore(save.bountyHunt);
    merged.enemies.forEach(enemy => { delete enemy.isBountyTarget; delete enemy.bountyId; });
    // 생장판 공간 효과 스냅샷은 game 상태에 묶여 있다. 저장 불러오기·클라우드 복원·
    // 초기화는 모두 이 함수를 거쳐 새 game을 만들므로, 여기서 캐시를 한 번 비운다.
    // 비우지 않으면 다른 기기의 저장을 불러온 뒤에도 이전 판의 보너스가 그대로 적용된다.
    if (typeof invalidateGrowthEffects === 'function') invalidateGrowthEffects();
    shrineRuntime.ensureState(merged);
    return normalizeContentProgressionSave(normalizeSavedCombatRuntime(merged), save);
}

function normalizeSavedCombatRuntime(state) {
    const time = Number(state.combatTimeMs);
    state.combatTimeMs = Number.isFinite(time) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, time)) : 0;
    delete state.isBackgroundCalculation;
    delete state.backgroundStopReason;
    delete state.backgroundOverflowSalvageCount;
    delete state.backgroundKillMix;
    return state;
}

function cloneDefaultGame() {
    return mergeDefaults({});
}

safeExposeGlobals({ mergeDefaults, cloneDefaultGame });
