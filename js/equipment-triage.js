(function () {
    'use strict';

    const FILTER_IDS = Object.freeze(['all', 'balanced', 'damage', 'defense', 'special', 'keep']);
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
        lastSyncAt: 0
    };

    function getInventorySignature() {
        return JSON.stringify([
            Array.isArray(game.inventory) ? game.inventory : [],
            game.equipment && typeof game.equipment === 'object' ? game.equipment : {}
        ], (key, value) => key === 'locked' ? undefined : value);
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

    function evaluateCandidateSlot(item, slot, baseline) {
        const equipment = game.equipment || (game.equipment = {});
        const hadSlot = Object.prototype.hasOwnProperty.call(equipment, slot);
        const backup = equipment[slot];
        const twinBackup = Array.isArray(game.cosmosTwinKeystones)
            ? game.cosmosTwinKeystones.slice() : game.cosmosTwinKeystones;
        try {
            equipment[slot] = item;
            const after = getPlayerStats();
            return {
                slot,
                dpsRatio: getDamageScore(after) / baseline.dps,
                ehpRatio: getEhpScore(after) / baseline.ehp
            };
        } finally {
            if (hadSlot) equipment[slot] = backup;
            else delete equipment[slot];
            game.cosmosTwinKeystones = twinBackup;
        }
    }

    function isSpecialCandidate(item) {
        return !!(item && (item.rarity === 'unique' || item.encroached || item.corrupted
            || item.loopSealed || item.fusedRelic || item.dropOnly || item.cosmosChase || item.ultraRare));
    }

    function percentGain(ratio) {
        return Math.max(0, Math.round((Math.max(0, Number(ratio) || 1) - 1) * 1000) / 10);
    }

    /** @returns {EquipmentTriageResult} */
    function classifyCandidate(item, baseline) {
        const rows = getCandidateSlots(item).map(slot => evaluateCandidateSlot(item, slot, baseline));
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

    function createBaseline() {
        const stats = getPlayerStats();
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
        if (state.status === 'stale') return '장비가 변경되어 결과를 비웠습니다.';
        return '호버 대신 현재 세팅과 한 번에 비교합니다.';
    }

    function getFilterOptionsHtml(counts) {
        const labels = {
            all: '전체', balanced: '균형 상승', damage: '공격 상승', defense: '생존 상승',
            special: '특수 장비', keep: '현 세팅 유지'
        };
        return FILTER_IDS.map(id => `<option value="${id}" ${state.filter === id ? 'selected' : ''}>${labels[id]} ${counts[id] || 0}</option>`).join('');
    }

    function render() {
        const host = document.getElementById('ui-equipment-triage');
        if (!host) return;
        const counts = getCounts();
        const running = state.status === 'running';
        const ready = state.status === 'ready';
        const html = `<div class="equipment-triage-copy"><strong>현재 세팅 분석</strong><small>${getStatusCopy()}</small></div>
            <div class="equipment-triage-controls">
                <label>판단 <select onchange="equipmentTriage.setFilter(this.value)" ${ready ? '' : 'disabled'}>${getFilterOptionsHtml(counts)}</select></label>
                <button type="button" onclick="equipmentTriage.start()" ${running ? 'disabled' : ''}>${running ? '분석 중' : (ready || state.status === 'stale' || state.status === 'error' ? '다시 분석' : '일괄 분석')}</button>
            </div>`;
        const renderSignature = `${state.status}|${state.filter}|${state.work ? state.work.index : 0}|${JSON.stringify(counts)}`;
        if (host.dataset.renderSig === renderSignature) return;
        host.innerHTML = html;
        host.dataset.renderSig = renderSignature;
    }

    function clearResults(status) {
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
        if (getInventorySignature() === state.signature) return;
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
        if (getInventorySignature() !== state.signature) {
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
        const end = Math.min(state.work.items.length, state.work.index + 3);
        try {
            while (state.work.index < end) {
                const item = state.work.items[state.work.index++];
                if (item && item.id !== undefined) state.results.set(String(item.id), classifyCandidate(item, state.work.baseline));
            }
        } catch (error) {
            failAnalysis(error);
            return;
        }
        render();
        if (state.work.index >= state.work.items.length) return finishAnalysis(token);
        setTimeout(() => runChunk(token), 0);
    }

    function start() {
        if (state.status === 'running') return false;
        const items = (Array.isArray(game.inventory) ? game.inventory : []).slice();
        state.token += 1;
        state.status = 'running';
        state.filter = 'all';
        state.results = new Map();
        try {
            state.signature = getInventorySignature();
            state.work = { items, index: 0, baseline: createBaseline() };
        } catch (error) {
            failAnalysis(error);
            return false;
        }
        render();
        if (items.length === 0) {
            finishAnalysis(state.token);
            return true;
        }
        setTimeout(() => runChunk(state.token), 0);
        return true;
    }

    function setFilter(filterId) {
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
        return rows.filter(row => matchesFilter(getResult(row && row.item)));
    }

    function getResult(item) {
        if (state.status !== 'ready' || !item || item.id === undefined) return null;
        return state.results.get(String(item.id)) || null;
    }

    const equipmentTriage = Object.freeze({ sync, render, start, setFilter, filterRows, getResult });
    safeExposeGlobals({ equipmentTriage });
}());
