// 우주계 기믹의 공용 계산 규칙. 실제 권장 수치는 combat.js의 전투 공식이 소유하며,
// calculateCosmosDifficultyTarget은 전투 모듈이 아직 준비되지 않은 초기 UI의 보수적 대체값이다.
(function () {
    'use strict';

    const COSMOS_GALAXY_BOSS_MECHANICS = Object.freeze({
        'planet-46': Object.freeze({
            id: 'orbitalCollision', name: '궤도 충돌', specialEvery: 4, damageMul: 1.42,
            damageScale: 0.32, elementRule: 'physical', telegraphKind: 'lane',
            summary: '네 번째 공격마다 방어도로 줄일 수 있는 강한 물리 충돌을 일으킵니다.',
            counter: '방어도·막기 또는 물리 피해 전환을 준비하세요.'
        }),
        'planet-47': Object.freeze({
            id: 'abyssalTide', name: '심해의 역류', specialEvery: 4, damageMul: 1.18,
            elementRule: 'chaos', telegraphKind: 'wave', shieldRestorePct: 8, hpScale: 0.62, damageScale: 0.30,
            summary: '네 번째 공격마다 카오스 역류와 함께 잃은 성간 보호막을 회복합니다.',
            counter: '카오스 EHP와 지속 화력으로 보호막 회복을 다시 돌파하세요.'
        }),
        'planet-48': Object.freeze({
            id: 'twinBalance', name: '쌍성의 균형', specialEvery: 2, damageMul: 1.30,
            elementRule: 'alternatingWeakest', telegraphKind: 'split', hpScale: 1.10, damageScale: 0.32,
            summary: '물리 타격과 가장 취약한 속성 타격을 번갈아 사용합니다.',
            counter: '한 방어만 높이기보다 물리·속성 EHP의 최저점을 보완하세요.'
        }),
        'planet-49': Object.freeze({
            id: 'finalJudgment', name: '최저항 심판', specialEvery: 3, damageMul: 1.45,
            damageScale: 0.27, elementRule: 'weakestResistance', telegraphKind: 'beam', debuffType: 'cosmos_res_down', hpScale: 1.15,
            summary: '세 번째 공격마다 가장 낮은 저항을 읽어 해당 속성으로 심판합니다.',
            counter: '최저 저항을 보완하고 저항 감소에 버틸 초과 저항을 확보하세요.'
        }),
        'planet-45': Object.freeze({
            id: 'cometCharge', name: '혜성 돌진', specialEvery: 4, damageMul: 1.70,
            damageScale: 0.31, elementRule: 'physical', telegraphKind: 'charge', moveCounterPct: 35, hpScale: 1.20,
            summary: '네 번째 공격마다 강한 돌진을 사용하며 이동 속도로 충격을 흘릴 수 있습니다.',
            counter: '이동 속도 170%에서 돌진의 추가 피해를 최대 35%까지 줄입니다.'
        })
    });

    function getCosmosGalaxyBossMechanic(nodeId) {
        return COSMOS_GALAXY_BOSS_MECHANICS[String(nodeId || '')] || null;
    }

    function getCosmosBossPatternState(nodeId, attackNumber) {
        const mechanic = getCosmosGalaxyBossMechanic(nodeId);
        if (!mechanic) return null;
        const count = Math.max(1, Math.floor(Number(attackNumber) || 1));
        const special = count % mechanic.specialEvery === 0;
        return {
            mode: mechanic.id,
            patternMode: 'cosmosBoss',
            label: special ? mechanic.name : `${mechanic.name} 전조`,
            damageMul: special ? mechanic.damageMul : 1,
            isSpecial: special,
            telegraphKind: mechanic.telegraphKind,
            elementRule: mechanic.elementRule,
            shieldRestorePct: special ? Number(mechanic.shieldRestorePct || 0) : 0,
            debuffType: special ? mechanic.debuffType || null : null,
            moveCounterPct: special ? Number(mechanic.moveCounterPct || 0) : 0,
            attackNumber: count
        };
    }

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
        const tierProgress = Math.max(0, Math.min(1, (combatTier - 1) / 18));
        const seasonDepth = 24.5;
        const baseHp = ((56 + combatTier * 30) * 1.15)
            * (1 + seasonDepth * (0.08 + tierProgress * 0.52))
            * (1 + tierProgress * 9) * 3.22;
        const cosmosHpPressure = (1 + (sizeClass - 1) * 0.10 + (gravity - 1) * 0.13) * 1.35;
        const bossHp = baseHp * (1.8 + combatTier * 0.6) * (1 + tierProgress * 4) * 0.92
            * cosmosHpPressure * (input && input.isGalaxyBoss ? 1.35 : 1);
        const tierPressure = Math.max(0, Math.min(1, (combatTier - 1) / 10));
        const baseHit = (2.4 + combatTier * 3.35) * 1.15
            * (1 + seasonDepth * (0.05 + tierPressure * 0.07))
            * (1.14 + combatTier * 0.16) * 1.34;
        const cosmosDamagePressure = (1 + (sizeClass - 1) * 0.025 + (gravity - 1) * 0.055) * 1.1;
        const peakBossHitPressure = getMaximumBossPatternDamageMultiplier()
            * ENEMY_CRITICAL_DAMAGE_MULTIPLIER;
        const clearTimeSec = input && input.isGalaxyBoss ? 55 : 40;
        return {
            dps: Math.max(1, Math.round(bossHp / clearTimeSec)),
            ehp: Math.max(1, Math.round(baseHit * cosmosDamagePressure * peakBossHitPressure)),
            element: String((input && input.element) || 'chaos'),
            clearTimeSec,
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

    safeExposeGlobals({
        resolveCosmosMechanic,
        getCosmosGalaxyBossMechanic,
        getCosmosBossPatternState,
        calculateCosmosDifficultyTarget,
        evaluateCosmosReadiness
    });
})();
