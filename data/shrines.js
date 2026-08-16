if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/shrines.js');

const SHRINE_BLESSING_DB = Object.freeze({
    power: Object.freeze({ id: 'power', name: '힘의 성소', stat: 'pctDmg', value: 16, detail: '피해 16% 증가' }),
    guard: Object.freeze({ id: 'guard', name: '수호의 성소', stat: 'dr', value: 10, detail: '피해 감소 10% 증가' }),
    haste: Object.freeze({ id: 'haste', name: '질주의 성소', stat: 'aspd', value: 16, detail: '공격 속도 16% 증가' })
});

const SHRINE_ENCOUNTER_CONFIG = Object.freeze({
    baseChance: 0.04,
    pityChancePerClear: 0.0075,
    guaranteedAt: 20,
    buffDurationMs: 45000,
    eligibleZoneTypes: Object.freeze([
        'act', 'abyss', 'labyrinth', 'underworld', 'chaosRealm', 'skyTower',
        'oceanDepth', 'beehive', 'colony', 'grandBreach', 'cosmos'
    ])
});

safeExposeData({ SHRINE_BLESSING_DB, SHRINE_ENCOUNTER_CONFIG });
