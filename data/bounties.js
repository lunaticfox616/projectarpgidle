// Target loot is awarded on defeat; these rolls add a saved treasure reward to that hunt.
const BOUNTY_HUNT_CONFIG = Object.freeze({
    unlockLoop:2, guaranteedAt:10, materialTierStep:5,
    goldenChance:0.002, fairyChance:0.003, uniqueChance:0.05,
    eligibleZoneTypes:Object.freeze(['act','abyss','labyrinth','underworld','chaosRealm','skyTower','oceanDepth','cosmos'])
});
const TREASURE_EVENT_DB = Object.freeze({
    golden_reliquary:{name:'빛을 품은 성유물함',text:'먼지를 걷어내자 황금빛 문양이 드러났습니다.',key:'goldenRule',amount:1,rarity:'unique'},
    fairy_hollow:{name:'요정이 떠난 나무 구멍',text:'작은 발자국 끝에 빛나는 고리가 남아 있습니다.',key:'fairyRing',amount:1,rarity:'unique'},
    lost_weapon:{name:'묻힌 전사의 무기',text:'무너진 석관에서 오래된 무기를 찾아냈습니다.',slot:'무기',rarity:'unique'},
    lost_armor:{name:'잊힌 수호자의 갑옷',text:'버려진 보관함 안에 수호자의 갑옷이 남아 있습니다.',slot:'갑옷',rarity:'unique'},
    lost_boots:{name:'방랑자의 마지막 야영지',text:'남겨진 짐 속에서 낡지 않은 신발을 발견했습니다.',slot:'신발',rarity:'unique'},
    abandoned_pack:{name:'주인 없는 여행 가방',text:'수풀 아래 감춰진 가방에서 쓸 만한 장비를 찾았습니다.',rarity:'rare',common:true},
    craft_stash:{name:'제련사의 비밀 주머니',text:'봉인된 주머니 속에 제련 재료가 보관되어 있습니다.',key:'magicBud',amount:2,rarity:'magic',common:true},
    gem_cache:{name:'부서진 군주의 제단',text:'돌무더기 사이에서 아직 힘이 남은 핵을 발견했습니다.',key:'bossCore',amount:1,rarity:'rare',common:true},
    fossil_seam:{name:'오래된 지층',text:'갈라진 암석 속에 미궁 화석이 드러났습니다.',key:'fossil',amount:2,rarity:'rare',common:true},
    sky_cache:{name:'떨어진 창공의 파편',text:'푸른 균열 안에서 창공의 힘을 건져 올렸습니다.',key:'skyEssence',amount:1,rarity:'rare',common:true}
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

safeExposeData({ BOUNTY_HUNT_CONFIG, TREASURE_EVENT_DB, BOUNTY_TARGET_DB });
