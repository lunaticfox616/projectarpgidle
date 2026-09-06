// Treasure events replace the former target hunt. Rates are per prepared hunt, before common rewards.
const BOUNTY_HUNT_CONFIG = Object.freeze({
    unlockLoop:2, guaranteedAt:10,
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
safeExposeData({ BOUNTY_HUNT_CONFIG, TREASURE_EVENT_DB });
