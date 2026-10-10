(function () {
    'use strict';

    const FILTER_IDS = Object.freeze(['all', 'balanced', 'damage', 'defense', 'special', 'keep']);
    // Editable stat inputs. Combat timers, HP, buffs and enemies belong to the frozen
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
        lastSyncAt: 0, timer: null, autoTimer: null
    };
    // result → the analyzed copy as JSON; a bag item whose JSON differs is analyzed again (changedIds).
    const analyzedAs = new WeakMap();

    // The bag is left out: picking up, crafting or salvaging keeps the results, and only the bag items added or changed are
    // analyzed again (changedIds). The one stat that counts bag items (the old box jewel, js/combat.js) drifts until the next full run.
    function getBuildSignature() {
        return getPersistentBuildSignature(game, false);
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

    /** Bag items the analysis tries on: not jewels (they go into sockets, not slots); cores and wards try their own slots. */
    const analyzable = item => !!item && item.id !== undefined && !bagItems.isJewel(item);

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

    /** @param {Set<string>|null} only ids of the bag items to analyze, null for all; the snapshot always holds the whole bag */
    function createAnalysisWork(only = null) {
        // Stat providers only read inventory (e.g. the old-box jewel's rarity bonus).
        // Share its isolated, immutable copy; reparsing hundreds of full items per slot
        // would cost more than the numeric-only evaluation saves.
        const inventory = freezeInventoryRecord(JSON.parse(JSON.stringify(game.inventory)));
        const snapshot = { inventory, gameJson: JSON.stringify({ ...game,
            inventory: undefined, combatTimeMs: getCombatTime() }) };
        const items = inventory.filter(item => analyzable(item) && (!only || only.has(String(item.id))))
            .map(item => ({ item, slots: getCandidateSlots(item), key: JSON.stringify(item) }));
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
        const result = {
            kind, dpsGainPct, ehpGainPct, special: isSpecialCandidate(item),
            dpsSlot: balanced ? balanced.slot : bestDps.slot,
            ehpSlot: balanced ? balanced.slot : bestEhp.slot
        };
        analyzedAs.set(result, candidate.key);
        return result;
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
            return `${counts.all}개 완료, 균형 ${counts.balanced}, 공격 ${counts.damage}, 생존 ${counts.defense}`;
        }
        if (state.status === 'error') return '분석 중 오류가 발생했습니다. 다시 시도하세요.';
        if (state.status === 'stale') return '세팅이 바뀌어 다시 분석합니다.';
        if (state.status === 'cancelled') return '분석을 중단했습니다.';
        return '분석 시작 시점의 세팅/전투 상태로 비교합니다.';
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

    /** 전체 목록의 추천은 공격·생존 동시 상승만 다룬다. 단일 축의 상승까지 없다고 말하지 않는다. */
    function getRecommendTitle(recommendation) {
        if (recommendation) return state.filter === 'all' ? '공격과 생존이 함께 오르는 장비만 추천합니다.' : '현재 판단 기준에서 가장 높은 장비를 추천합니다.';
        if (state.status !== 'ready') return '현재 세팅으로 일괄 분석을 완료하면 추천을 확인할 수 있습니다.';
        if (['all', 'balanced'].includes(state.filter)) return '공격과 생존이 함께 오르는 장비가 없습니다. 공격 상승/생존 상승 필터로 각각 비교할 수 있습니다.';
        if (['special', 'keep'].includes(state.filter)) return '이 목록에서는 장비를 직접 선택해 효과를 비교하세요.';
        return '선택한 판단 기준에서 상승하는 장비가 없습니다.';
    }

    /** 단추 글에도 까닭을 붙인다 — 휴대폰에는 title이 뜨지 않는다(검토 5차). */
    function getRecommendLabel(recommendation) {
        if (recommendation) return ['all', 'balanced'].includes(state.filter) ? '균형 추천 교체' : '추천 교체';
        if (state.status === 'running') return '분석 중';
        if (state.status !== 'ready') return state.status === 'idle' ? '분석 먼저' : '재분석 필요';
        return { all: '균형 상승 없음', balanced: '균형 상승 없음', damage: '공격 상승 없음',
            defense: '생존 상승 없음', special: '직접 비교', keep: '직접 비교' }[state.filter];
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
        const fillable = countFillableEmptySlots();
        const fillButton = fillable ? `<button type="button" class="equipment-fill-empty" onclick="fillEmptyEquipmentSlots()">빈 칸 채우기 ${fillable}</button>` : '';
        const html = `<div class="equipment-triage-copy" title="분석 시작 시점의 세팅/전투 상태를 기준으로 비교합니다."><strong>현재 세팅 분석</strong><small>${getStatusCopy()}</small></div>
            <div class="equipment-triage-controls">
                <label>판단 <select onchange="equipmentTriage.setFilter(this.value)" ${ready ? '' : 'disabled'}>${getFilterOptionsHtml(counts)}</select></label>
                <button type="button" onclick="equipmentTriage.${running ? 'cancel' : 'start'}()">${running ? '분석 중단' : (state.status === 'idle' ? '일괄 분석' : '다시 분석')}</button>
                <button type="button" onclick="equipmentTriage.equipRecommended()" ${recommendation ? '' : 'disabled'} title="${getRecommendTitle(recommendation)}">${getRecommendLabel(recommendation)}</button>
                ${fillButton}${autoSalvageButton}
            </div>`;
        const renderSignature = `${state.status}|${state.filter}|${state.work ? state.work.index : 0}|${JSON.stringify(counts)}|${recommendation ? recommendation.item.id : ''}|${isInventoryNearFull()}|${fillable}`;
        if (host.dataset.renderSig === renderSignature) return;
        host.innerHTML = html;
        host.dataset.renderSig = renderSignature;
    }

    function clearResults(status) {
        clearTimeout(state.timer);
        clearTimeout(state.autoTimer);
        state.timer = null;
        state.autoTimer = null;
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

    // ids: a top-up over these bag items while the results stay on screen (the status stays 'ready'); null: the whole bag.
    function begin(ids) {
        state.token += 1;
        try {
            if (!ids) state.signature = getBuildSignature();
            state.work = createAnalysisWork(ids);
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

    function start() {
        if (state.status === 'running') return false;
        clearTimeout(state.autoTimer);
        state.autoTimer = null;
        state.status = 'running';
        state.filter = 'all';
        state.results = new Map();
        return begin(null);
    }

    // 자동 분석(2026-10-10 사용자): 장비 창을 열면 한 번, 창이 보이는 동안 장착이 바뀌어 결과가 낡으면 한 번 더 분석한다. 가방에 새로
    // 들어오거나 바뀐 장비는 그것만 따로 분석하고 나머지 결과는 그대로 둔다. 직접 멈춘 분석과 실패한 분석은 창을 다시 열 때까지 다시 돌리지 않는다.
    const AUTO_DELAY_MS = 300;
    let autoArmed = false;
    /** The equipment window was just opened (js/ui.js switchTab, switchItemSubtab). */
    function onOpen() { autoArmed = true; }
    const wantsFullRun = () => ['idle', 'stale'].includes(state.status) || (autoArmed && ['cancelled', 'error'].includes(state.status));

    /** Drops the results of items that left the bag; returns the ids of bag items added or changed since their analysis. */
    function changedIds() {
        const live = new Map();
        (game.inventory || []).forEach(item => { if (analyzable(item)) live.set(String(item.id), item); });
        Array.from(state.results.keys()).forEach(id => { if (!live.has(id)) state.results.delete(id); });
        const changed = Array.from(live).filter(([id, item]) => analyzedAs.get(state.results.get(id)) !== JSON.stringify(item));
        return new Set(changed.map(([id]) => id));
    }

    function later(run) {
        state.autoTimer = setTimeout(() => {
            state.autoTimer = null;
            if (!state.work) run();
        }, AUTO_DELAY_MS);
    }

    /** The equipment window's refresh while it shows (js/ui.js updateStaticUI): one analysis when due, else a top-up of new bag items. */
    function autoStart() {
        sync(true);
        if (game.itemSubtab !== 'item-tab-equip') return;
        const full = wantsFullRun();
        autoArmed = false;
        if (state.autoTimer || state.work) return;
        if (full) {
            later(() => { if (state.status !== 'ready') start(); });
            return;
        }
        const changed = state.status === 'ready' ? changedIds() : new Set();
        if (changed.size) later(() => { sync(true); if (state.status === 'ready') begin(changed); });
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
            showGameToast(`${recommendation.item.name || '추천 장비'} 장착, ${recommendation.slot}`, { tone: 'success' });
        }
        start();
        return true;
    }

    const equipmentTriage = Object.freeze({ sync, render, start, cancel, autoStart, onOpen, setFilter, filterRows, getResult, equipRecommended });
    safeExposeGlobals({ equipmentTriage });
}());
