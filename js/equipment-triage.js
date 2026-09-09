(function () {
    'use strict';

    const FILTER_IDS = Object.freeze(['all', 'balanced', 'damage', 'defense', 'special', 'keep']);
    // Editable stat inputs. Combat timers, HP, buffs and enemies belong to the frozen
    // analysis snapshot, not invalidation. Add new growth systems here with their tests.
    const BUILD_FIELDS = [
        'inventory', 'equipment', 'level', 'season', 'loopCount', 'maxZoneId',
        'selectedHeroId', 'selectedClassId', 'ascendClass', 'ascendNodes', 'ascendKeystones',
        'passives', 'voidPassives', 'passiveAttributePreference', 'passiveAttributeChoices',
        'passiveStarEvolution', 'seasonNodes', 'seasonNodeLevels', 'loop10BonusStats', 'loopDeepStats',
        'actRewardBonuses', 'journalBonuses', 'journalEntries', 'activeSkill', 'skills', 'supports',
        'equippedSupports', 'equippedSummonSkills', 'summonSkillCounts', 'gemData', 'supportGemData',
        'skillAutoRules', 'conditionGemLevels', 'conditionGemPool',
        'sealedSkills', 'sealedSupports', 'resonancePower', 'skyGemEnhancements',
        'jewelSlots', 'jewelSlotAmplify', 'growthBoard', 'growthInventory',
        'talismanBoard', 'talismanPlacements', 'talismanBoardUnlock', 'talismanUnlockedCells',
        'underworldRunes', 'talentCards', 'talentCardLoadout', 'bloomedClasses',
        'bloomedClassThisLoop', 'bloomedTalentThisLoop', 'uniqueCodex', 'contentProgression'
    ];
    const BUILD_PARTS = {
        passiveSpecialization: ['revelation', 'keystoneChoices'],
        starWedge: ['wedges', 'sockets', 'nodeMutations', 'disabledNodeEffects'],
        coreCube: ['unlocked', 'powers', 'faces', 'completed', 'revealedOptions', 'optionMechanism'],
        arcana: ['unlocked', 'cards', 'deckSlots', 'equipmentSlots'],
        pruningTree: ['unlocked', 'nodeRanks', 'prunedPenaltyRanks'],
        beyondBoundary: ['seals'], colony: ['wardEquipped', 'wardSlots'],
        cosmosAtlas: ['mastery', 'equippedStones', 'equippedStoneGalaxy', 'bossStoneOptions'],
        skyTower: ['skyStone', 'gemBoosts'], ocean: ['permanentUpgrades'],
        expertise: ['levels', 'nodes', 'favors'], flasks: ['healTier', 'qualityByKey']
    };
    /**
     * @typedef {Object} EquipmentTriageResult
     * @property {'balanced'|'damage'|'defense'|'keep'} kind
     * @property {number} dpsGainPct
     * @property {number} ehpGainPct
     * @property {boolean} special
     * @property {string} dpsSlot
     * @property {string} ehpSlot
     */
    const state = {
        status: 'idle', filter: 'all', results: new Map(), signature: '', token: 0, work: null,
        lastSyncAt: 0, timer: null
    };

    function getBuildSignature() {
        const inputs = BUILD_FIELDS.map(key => game[key]);
        Object.entries(BUILD_PARTS).forEach(([key, fields]) => {
            inputs.push(fields.map(field => game[key]?.[field]));
        });
        inputs.push((game.flasks?.utils || []).map(flask => flask && flask.key));
        return JSON.stringify(inputs, (key, value) => ['locked', 'exp', 'xp'].includes(key) ? undefined : value);
    }

    function getDamageScore(stats) {
        return Math.max(0, Number(stats && stats.totalDps) || Number(stats && stats.dps) || 0);
    }

    function getEhpScore(stats) {
        if (typeof calculatePlayerEhpProfile !== 'function') {
            return Math.max(1, Number(stats && stats.maxHp) + Number(stats && stats.energyShield) || 1);
        }
        const profile = calculatePlayerEhpProfile(stats || {});
        const values = Object.values(profile.elements || {})
            .map(row => Number(row && row.entropy) || 0).filter(value => value > 0);
        return values.length > 0 ? Math.min(...values) : Math.max(1, Number(profile.pool) || 1);
    }

    function getCandidateSlots(item) {
        if (!item) return [];
        const slots = typeof getEquipCandidateSlots === 'function'
            ? getEquipCandidateSlots(item) : [item.slot];
        return Array.from(new Set(slots.filter(Boolean)));
    }

    // A fresh copy per slot also isolates normalization and stat-provider side effects.
    // The live game is restored synchronously before rendering or scheduling another job.
    function readSnapshotStats(snapshot, item, slot) {
        const liveGame = game;
        try {
            game = JSON.parse(snapshot.gameJson);
            game.inventory = snapshot.inventory;
            if (item) game.equipment[slot] = JSON.parse(JSON.stringify(item));
            return getPlayerStats(false);
        } finally {
            game = liveGame;
        }
    }

    function evaluateCandidateSlot(item, slot, work) {
        const after = readSnapshotStats(work.snapshot, item, slot);
        return { slot, dpsRatio: getDamageScore(after) / work.baseline.dps,
            ehpRatio: getEhpScore(after) / work.baseline.ehp };
    }

    function freezeInventoryRecord(value) {
        if (!value || typeof value !== 'object') return value;
        Object.values(value).forEach(freezeInventoryRecord);
        return Object.freeze(value);
    }

    function createAnalysisWork() {
        // Stat providers only read inventory (e.g. the old-box jewel's rarity bonus).
        // Share its isolated, immutable copy; reparsing hundreds of full items per slot
        // would cost more than the numeric-only evaluation saves.
        const inventory = freezeInventoryRecord(JSON.parse(JSON.stringify(game.inventory)));
        const snapshot = { inventory, gameJson: JSON.stringify({ ...game,
            inventory: undefined, combatTimeMs: getCombatTime() }) };
        const items = inventory.filter(item => item && item.id !== undefined)
            .map(item => ({ item, slots: getCandidateSlots(item) }));
        return { items, index: 0, snapshot, baseline: createBaseline(snapshot) };
    }

    function isSpecialCandidate(item) {
        return !!(item && (item.rarity === 'unique' || item.encroached || item.corrupted
            || item.loopSealed || item.fusedRelic || item.dropOnly || item.cosmosChase || item.ultraRare));
    }

    function percentGain(ratio) {
        return Math.max(0, Math.round((Math.max(0, Number(ratio) || 1) - 1) * 1000) / 10);
    }

    /** @returns {EquipmentTriageResult} */
    function classifyCandidate(candidate, work) {
        const { item, slots } = candidate;
        const rows = slots.map(slot => evaluateCandidateSlot(item, slot, work));
        const bestDps = rows.reduce((best, row) => row.dpsRatio > best.dpsRatio ? row : best,
            { slot: '', dpsRatio: 1, ehpRatio: 1 });
        const bestEhp = rows.reduce((best, row) => row.ehpRatio > best.ehpRatio ? row : best,
            { slot: '', dpsRatio: 1, ehpRatio: 1 });
        const balanced = rows.filter(row => row.dpsRatio >= 1.01 && row.ehpRatio >= 1.01)
            .sort((a, b) => Math.min(b.dpsRatio, b.ehpRatio) - Math.min(a.dpsRatio, a.ehpRatio))[0] || null;
        const dpsGainPct = percentGain(bestDps.dpsRatio);
        const ehpGainPct = percentGain(bestEhp.ehpRatio);
        let kind = balanced ? 'balanced' : (dpsGainPct >= 1 ? 'damage' : (ehpGainPct >= 1 ? 'defense' : 'keep'));
        return {
            kind, dpsGainPct, ehpGainPct, special: isSpecialCandidate(item),
            dpsSlot: balanced ? balanced.slot : bestDps.slot,
            ehpSlot: balanced ? balanced.slot : bestEhp.slot
        };
    }

    function createBaseline(snapshot) {
        const stats = readSnapshotStats(snapshot);
        return { dps: Math.max(1, getDamageScore(stats)), ehp: Math.max(1, getEhpScore(stats)) };
    }

    function getCounts() {
        const rows = Array.from(state.results.values());
        return {
            all: rows.length,
            balanced: rows.filter(row => row.kind === 'balanced').length,
            damage: rows.filter(row => row.dpsGainPct >= 1).length,
            defense: rows.filter(row => row.ehpGainPct >= 1).length,
            special: rows.filter(row => row.special).length,
            keep: rows.filter(row => row.kind === 'keep' && !row.special).length
        };
    }

    function getStatusCopy() {
        if (state.status === 'running') return `${state.work.index}/${state.work.items.length} 분석 중`;
        if (state.status === 'ready') {
            const counts = getCounts();
            return `${counts.all}개 완료 · 균형 ${counts.balanced} · 공격 ${counts.damage} · 생존 ${counts.defense}`;
        }
        if (state.status === 'error') return '분석 중 오류가 발생했습니다. 다시 시도하세요.';
        if (state.status === 'stale') return '세팅이 변경되어 결과를 비웠습니다.';
        if (state.status === 'cancelled') return '분석을 중단했습니다.';
        return '분석 시작 시점의 세팅·전투 상태로 비교합니다.';
    }

    function getFilterOptionsHtml(counts) {
        const labels = {
            all: '전체', balanced: '균형 상승', damage: '공격 상승', defense: '생존 상승',
            special: '특수 장비', keep: '현 세팅 유지'
        };
        return FILTER_IDS.map(id => `<option value="${id}" ${state.filter === id ? 'selected' : ''}>${labels[id]} ${counts[id] || 0}</option>`).join('');
    }

    function isInventoryNearFull() {
        if (typeof getInventoryLimit !== 'function' || typeof getInventoryUsedCellCount !== 'function') return false;
        const limit = Math.max(1, Math.floor(getInventoryLimit(game)));
        return getInventoryUsedCellCount(game) >= Math.floor(limit * 0.9);
    }

    function getRecommendedCandidate() {
        if (state.status !== 'ready' || ['special', 'keep'].includes(state.filter)) return null;
        const candidates = (Array.isArray(game.inventory) ? game.inventory : []).map(item => ({ item, result: getResult(item) }));
        const ranked = candidates.map(candidate => {
            const result = candidate.result;
            if (!result) return null;
            if (state.filter === 'damage' && result.dpsGainPct >= 1) return { ...candidate, slot: result.dpsSlot, score: result.dpsGainPct };
            if (state.filter === 'defense' && result.ehpGainPct >= 1) return { ...candidate, slot: result.ehpSlot, score: result.ehpGainPct };
            if (['all', 'balanced'].includes(state.filter) && result.kind === 'balanced') {
                return { ...candidate, slot: result.dpsSlot, score: Math.min(result.dpsGainPct, result.ehpGainPct) };
            }
            return null;
        }).filter(Boolean).sort((a, b) => b.score - a.score);
        return ranked[0] || null;
    }

    function render() {
        const host = document.getElementById('ui-equipment-triage');
        if (!host) return;
        const counts = getCounts();
        const running = state.status === 'running';
        const ready = state.status === 'ready';
        const recommendation = getRecommendedCandidate();
        const autoSalvageButton = isInventoryNearFull() && typeof openAutoSalvageConfigOverlay === 'function'
            ? '<button type="button" onclick="openAutoSalvageConfigOverlay()">자동 해체 설정</button>' : '';
        const html = `<div class="equipment-triage-copy" title="분석 시작 시점의 세팅·전투 상태를 기준으로 비교합니다."><strong>현재 세팅 분석</strong><small>${getStatusCopy()}</small></div>
            <div class="equipment-triage-controls">
                <label>판단 <select onchange="equipmentTriage.setFilter(this.value)" ${ready ? '' : 'disabled'}>${getFilterOptionsHtml(counts)}</select></label>
                <button type="button" onclick="equipmentTriage.${running ? 'cancel' : 'start'}()">${running ? '분석 중단' : (state.status === 'idle' ? '일괄 분석' : '다시 분석')}</button>
                <button type="button" onclick="equipmentTriage.equipRecommended()" ${recommendation ? '' : 'disabled'} title="${state.filter === 'all' ? '공격과 생존이 함께 오르는 장비만 추천합니다.' : '현재 판단 기준에서 가장 높은 장비를 추천합니다.'}">추천 교체</button>
                ${autoSalvageButton}
            </div>`;
        const renderSignature = `${state.status}|${state.filter}|${state.work ? state.work.index : 0}|${JSON.stringify(counts)}|${recommendation ? recommendation.item.id : ''}|${isInventoryNearFull()}`;
        if (host.dataset.renderSig === renderSignature) return;
        host.innerHTML = html;
        host.dataset.renderSig = renderSignature;
    }

    function clearResults(status) {
        clearTimeout(state.timer);
        state.timer = null;
        state.token += 1;
        state.status = status;
        state.filter = 'all';
        state.results = new Map();
        state.signature = '';
        state.work = null;
        state.lastSyncAt = 0;
        render();
    }

    function sync(force) {
        if (state.status !== 'ready' && state.status !== 'running') return;
        let now = Date.now();
        if (!force && now - state.lastSyncAt < 500) return;
        state.lastSyncAt = now;
        if (getBuildSignature() === state.signature) return;
        clearResults('stale');
    }

    function failAnalysis(error) {
        console.error('equipment triage failed:', error);
        clearResults('error');
        if (typeof showGameToast === 'function') {
            showGameToast('장비 분석에 실패했습니다. 다시 시도해 주세요.', { tone: 'error', duration: 3200 });
        }
    }

    function finishAnalysis(token) {
        if (token !== state.token || !state.work) return;
        if (getBuildSignature() !== state.signature) {
            clearResults('stale');
            return;
        }
        state.status = 'ready';
        state.work = null;
        state.lastSyncAt = Date.now();
        render();
        if (typeof updateStaticUI === 'function') updateStaticUI();
    }

    function runChunk(token) {
        if (token !== state.token || !state.work) return;
        state.timer = null;
        const end = Math.min(state.work.items.length, state.work.index + 3);
        try {
            sync();
            if (!state.work) return;
            while (state.work.index < end) {
                const candidate = state.work.items[state.work.index++];
                state.results.set(String(candidate.item.id), classifyCandidate(candidate, state.work));
            }
        } catch (error) {
            failAnalysis(error);
            return;
        }
        render();
        if (state.work.index >= state.work.items.length) return finishAnalysis(token);
        state.timer = setTimeout(() => runChunk(token), 0);
    }

    function cancel() {
        if (state.status !== 'running') return false;
        clearResults('cancelled');
        return true;
    }

    function start() {
        if (state.status === 'running') return false;
        state.token += 1;
        state.status = 'running';
        state.filter = 'all';
        state.results = new Map();
        try {
            state.signature = getBuildSignature();
            state.work = createAnalysisWork();
            state.lastSyncAt = Date.now();
        } catch (error) {
            failAnalysis(error);
            return false;
        }
        render();
        if (state.work.items.length === 0) {
            finishAnalysis(state.token);
            return true;
        }
        const token = state.token;
        state.timer = setTimeout(() => runChunk(token), 0);
        return true;
    }

    function setFilter(filterId) {
        sync(true);
        if (state.status !== 'ready' || !FILTER_IDS.includes(filterId)) return false;
        state.filter = filterId;
        render();
        if (typeof updateStaticUI === 'function') updateStaticUI();
        return true;
    }

    function matchesFilter(result) {
        if (state.filter === 'all') return true;
        if (!result) return false;
        if (state.filter === 'balanced') return result.kind === 'balanced';
        if (state.filter === 'damage') return result.dpsGainPct >= 1;
        if (state.filter === 'defense') return result.ehpGainPct >= 1;
        if (state.filter === 'special') return result.special;
        return result.kind === 'keep' && !result.special;
    }

    function filterRows(rows) {
        if (state.status !== 'ready' || state.filter === 'all') return rows;
        return rows.map(row => ({ ...row, filterActive: true,
            filterMatched: row.filterMatched !== false && matchesFilter(getResult(row.item)) }));
    }

    function getResult(item) {
        if (state.status !== 'ready' || !item || item.id === undefined) return null;
        return state.results.get(String(item.id)) || null;
    }

    function equipRecommended() {
        sync(true);
        const recommendation = getRecommendedCandidate();
        if (!recommendation || typeof equipItemById !== 'function') return false;
        const equipped = equipItemById(recommendation.item.id, recommendation.slot);
        if (!equipped) return false;
        if (typeof showGameToast === 'function') {
            showGameToast(`${recommendation.item.name || '추천 장비'} 장착 · ${recommendation.slot}`, { tone: 'success' });
        }
        start();
        return true;
    }

    const equipmentTriage = Object.freeze({ sync, render, start, cancel, setFilter, filterRows, getResult, equipRecommended });
    safeExposeGlobals({ equipmentTriage });
}());
