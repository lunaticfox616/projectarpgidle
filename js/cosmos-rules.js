// 우주계 난이도·기믹의 공용 계산 규칙.
// 전투와 아틀라스 UI가 같은 특성 정의와 권장 수치를 사용하도록 이 파일이 계약을 소유한다.
(function () {
    'use strict';

    const COSMOS_BASE_COMBAT_TIER = 57;

    /**
     * @param {string} tag
     * @param {number} seed
     * @returns {{id:string,name:string,summary:string,counter:string,element:string,tags:string[]}|null}
     */
    function resolveCosmosMechanic(tag, seed) {
        const rows = Array.isArray(globalThis.COSMOS_MECHANIC_DB) ? globalThis.COSMOS_MECHANIC_DB : [];
        if (rows.length === 0) return null;
        const normalizedTag = String(tag || '').trim();
        const tagged = rows.find(row => Array.isArray(row.tags) && row.tags.includes(normalizedTag));
        if (tagged) return tagged;
        const index = Math.abs(Math.floor(Number(seed) || 0)) % rows.length;
        return rows[index];
    }

    /**
     * @param {{combatTier:number,sizeClass:number,gravity:number,isGalaxyBoss:boolean,element:string}} input
     * @returns {{dps:number,ehp:number,element:string,clearTimeSec:number,basis:string}}
     */
    function calculateCosmosDifficultyTarget(input) {
        const combatTier = Math.max(1, Math.floor(Number(input && input.combatTier) || 1));
        const sizeClass = Math.max(1, Math.min(5, Math.floor(Number(input && input.sizeClass) || 1)));
        const gravity = Math.max(1, Number(input && input.gravity) || 1);
        const tierDelta = combatTier - COSMOS_BASE_COMBAT_TIER;
        const encounterPressure = 1 + (sizeClass - 1) * 0.08 + (gravity - 1) * 0.08;
        const survivalPressure = 1 + (sizeClass - 1) * 0.04 + (gravity - 1) * 0.10;
        const bossDpsPressure = input && input.isGalaxyBoss ? 2.2 : 1;
        const galaxyBossEhpPressure = input && input.isGalaxyBoss ? 1.55 : 1;
        const peakBossHitPressure = getMaximumBossPatternDamageMultiplier()
            * ENEMY_CRITICAL_DAMAGE_MULTIPLIER;
        return {
            dps: Math.max(1, Math.round(550000 * Math.pow(1.12, tierDelta) * encounterPressure * bossDpsPressure)),
            ehp: Math.max(1, Math.round(18000 * Math.pow(1.10, tierDelta) * survivalPressure
                * peakBossHitPressure * galaxyBossEhpPressure)),
            element: String((input && input.element) || 'chaos'),
            clearTimeSec: input && input.isGalaxyBoss ? 55 : 45,
            basis: 'bossPeakHit'
        };
    }

    /**
     * @param {{dps:number,ehp:number}} target
     * @param {{dps:number,ehp:number}} player
     * @returns {{id:string,label:string,dpsRatio:number,ehpRatio:number,minRatio:number}}
     */
    function evaluateCosmosReadiness(target, player) {
        const dpsRatio = Math.max(0, Number(player && player.dps) || 0) / Math.max(1, Number(target && target.dps) || 1);
        const ehpRatio = Math.max(0, Number(player && player.ehp) || 0) / Math.max(1, Number(target && target.ehp) || 1);
        const minRatio = Math.min(dpsRatio, ehpRatio);
        if (minRatio >= 1.2) return { id: 'comfortable', label: '안정', dpsRatio, ehpRatio, minRatio };
        if (minRatio >= 0.9) return { id: 'ready', label: '적정', dpsRatio, ehpRatio, minRatio };
        if (minRatio >= 0.65) return { id: 'risky', label: '위험', dpsRatio, ehpRatio, minRatio };
        return { id: 'blocked', label: '성장 필요', dpsRatio, ehpRatio, minRatio };
    }

    safeExposeGlobals({ resolveCosmosMechanic, calculateCosmosDifficultyTarget, evaluateCosmosReadiness });
})();
