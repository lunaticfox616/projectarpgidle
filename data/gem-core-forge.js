// Each track keeps its own pity counter. Chances are percentages, effects are multipliers.
const GEM_CORE_FORGE = Object.freeze({
    maxLevel: 5,
    successPct: Object.freeze([100, 60, 40, 20, 10]),
    // Cumulative bonus: increments decrease through 10, 9.6, 9, 8.2, 7.2, 6, then stay at 5 points.
    pityBonusPct: Object.freeze([0, 10, 19.6, 28.6, 36.8, 44, 50, 55, 60, 65, 70, 75, 80, 85, 90]),
    tracks: Object.freeze({
        bossCore: Object.freeze({ name: '군주의 핵', levelKey: 'bossCoreLevel', pityKey: 'bossCoreFailures', effect: '피해', stepPct: 4, tone: 'core' }),
        skyEssence: Object.freeze({ name: '창공의 힘', levelKey: 'skyCoreLevel', pityKey: 'skyCoreFailures', effect: '공격·시전 속도', stepPct: 2, tone: 'sky' })
    })
});
