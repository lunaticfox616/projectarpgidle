if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/bounties.js');

const BOUNTY_HUNT_CONFIG = Object.freeze({
    unlockLoop: 2,
    baseChance: 0.07,
    pityChancePerBoss: 0.025,
    guaranteedAt: 10,
    offerCount: 3,
    markerProgress: 55,
    eligibleZoneTypes: Object.freeze([
        'act', 'abyss', 'labyrinth', 'underworld', 'chaosRealm', 'skyTower', 'oceanDepth', 'cosmos'
    ])
});

const BOUNTY_TARGET_DB = Object.freeze({
    iron_collector: Object.freeze({
        id: 'iron_collector', icon: '🛡️', name: '철갑 수집가', danger: '생명력·방어도·피해 감소 강화',
        rewardLabel: '희귀 장비 1개 · 형체 없는 이슬 1개',
        modifiers: Object.freeze({ hpMul: 2.25, armorMul: 2.6, drAdd: 12, damageMul: 1.1 }),
        reward: Object.freeze({ equipmentCount: 1, minimumRarity: 'rare', currencies: Object.freeze({ formlessDew: 1 }) })
    }),
    storm_smuggler: Object.freeze({
        id: 'storm_smuggler', icon: '⚡', name: '폭풍 밀매상', danger: '공격 속도·관통·번개 피해 강화',
        rewardLabel: '희귀 장비 1개 · 마법의 새싹 3개',
        modifiers: Object.freeze({ hpMul: 1.8, damageMul: 1.35, attackSpeedMul: 1.35, penetrationAdd: 8, element: 'light' }),
        reward: Object.freeze({ equipmentCount: 1, minimumRarity: 'rare', currencies: Object.freeze({ magicBud: 3 }) })
    }),
    root_poacher: Object.freeze({
        id: 'root_poacher', icon: '🌿', name: '뿌리 밀렵꾼', unlockLoop: 25, danger: '생명력 재생·회복·방어 강화',
        rewardLabel: '생장 아이템 1개 · 마법의 새싹 2개',
        modifiers: Object.freeze({ hpMul: 2.1, regenMul: 3, regenRateAdd: 0.0025, drAdd: 6, damageMul: 1.15 }),
        reward: Object.freeze({ growthCount: 1, fallbackEquipmentCount: 1, minimumRarity: 'rare', currencies: Object.freeze({ magicBud: 2 }) })
    }),
    glass_executioner: Object.freeze({
        id: 'glass_executioner', icon: '🗡️', name: '유리칼 처형자', danger: '낮은 생명력·극단적인 피해와 치명타',
        rewardLabel: '희귀 장비 2개',
        modifiers: Object.freeze({ hpMul: 1.45, damageMul: 1.75, attackSpeedMul: 1.1, penetrationAdd: 12, critChanceAdd: 20 }),
        reward: Object.freeze({ equipmentCount: 2, minimumRarity: 'rare', currencies: Object.freeze({}) })
    }),
    chaos_broker: Object.freeze({
        id: 'chaos_broker', icon: '☠️', name: '혼돈 중개상', danger: '카오스 저항·관통·공격 피해 강화',
        rewardLabel: '희귀 장비 1개 · 형체 없는 이슬 2개 · 수액 맺힌 새싹 1개',
        modifiers: Object.freeze({ hpMul: 2.1, damageMul: 1.45, resAllAdd: 10, resChaosAdd: 25, penetrationAdd: 8, element: 'chaos' }),
        reward: Object.freeze({ equipmentCount: 1, minimumRarity: 'rare', currencies: Object.freeze({ formlessDew: 2, sapBud: 1 }) })
    }),
    mirror_runner: Object.freeze({
        id: 'mirror_runner', icon: '◆', name: '거울 갑주 도주자', danger: '회피·첫 타격 보호·공격 속도 강화',
        rewardLabel: '희귀 장비 1개 · 마법의 새싹 4개',
        modifiers: Object.freeze({ hpMul: 1.7, damageMul: 1.2, evasionMul: 3, firstHitGuard: 0.65, attackSpeedMul: 1.4 }),
        reward: Object.freeze({ equipmentCount: 1, minimumRarity: 'rare', currencies: Object.freeze({ magicBud: 4 }) })
    })
});

safeExposeData({ BOUNTY_HUNT_CONFIG, BOUNTY_TARGET_DB });
