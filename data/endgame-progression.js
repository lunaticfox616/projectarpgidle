if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/endgame-progression.js');

const ARCANA_DECK_SLOT_COUNT = 4;
const ARCANA_SEALED_CARD_DROP_CHANCE = 0.0025;
const ARCANA_GALAXY_BOSS_DROP_CHANCE = 0.01;
const ARCANA_CAPSTONE_DROP_CHANCE = 0.02;
const ARCANA_QUEST_EXPLORATION_TARGET = 12;
const ARCANA_EQUIPMENT_SLOT_KEYS = Object.freeze([
    '무기', '투구', '갑옷', '방패', '장갑1', '장갑2',
    '신발', '목걸이', '반지1', '반지2', '반지3', '허리띠'
]);

const ARCANA_CARD_DB = Object.freeze([
    { id:'wanderer', no:0, name:'방랑자', glyph:'✦', deckEffect:'이동 속도 +1%', deckStats:[{ id:'move', val:1 }], slotEffect:'이동 속도 옵션 10% 증폭', slotAmp:{ statIds:['move'], pct:10 } },
    { id:'magician', no:1, name:'마술사', glyph:'✧', deckEffect:'주문 피해 +2%', deckStats:[{ id:'spellPctDmg', val:2 }], slotEffect:'주문 피해 옵션 8% 증폭', slotAmp:{ statIds:['spellPctDmg','spellFlatDmg','spellFlatPct'], pct:8 } },
    { id:'priestess', no:2, name:'여사제', glyph:'☾', deckEffect:'에너지 보호막 +2%', deckStats:[{ id:'energyShieldPct', val:2 }], slotEffect:'에너지 보호막 옵션 8% 증폭', slotAmp:{ statIds:['energyShield','energyShieldPct','energyShieldRegen'], pct:8 } },
    { id:'empress', no:3, name:'여제', glyph:'❀', deckEffect:'최대 생명력 +1.5%', deckStats:[{ id:'pctHp', val:1.5 }], slotEffect:'생명력·재생 옵션 8% 증폭', slotAmp:{ statIds:['flatHp','pctHp','regen','regenFlat'], pct:8 } },
    { id:'emperor', no:4, name:'황제', glyph:'♜', deckEffect:'방어도 +2%', deckStats:[{ id:'armorPct', val:2 }], slotEffect:'방어도·막기 옵션 8% 증폭', slotAmp:{ statIds:['armor','armorPct','baseBlockChance','blockChance','blockChancePct'], pct:8 } },
    { id:'hierophant', no:5, name:'교황', glyph:'♢', deckEffect:'모든 저항 +0.5%', deckStats:[{ id:'resAll', val:0.5 }], slotEffect:'저항 옵션 8% 증폭', slotAmp:{ statIds:['resAll','resF','resC','resL','resChaos'], pct:8 } },
    { id:'lovers', no:6, name:'연인', glyph:'∞', deckEffect:'치명타 확률 +0.5%', deckStats:[{ id:'crit', val:0.5 }], slotEffect:'치명타·정확도 옵션 8% 증폭', slotAmp:{ statIds:['crit','critDmg','accuracy','accuracyBonusPct'], pct:8 } },
    { id:'chariot', no:7, name:'전차', glyph:'➶', deckEffect:'공격 속도 +0.75%', deckStats:[{ id:'aspd', val:0.75 }], slotEffect:'공격 속도·이동 속도 옵션 8% 증폭', slotAmp:{ statIds:['aspd','move'], pct:8 } },
    { id:'strength', no:8, name:'힘', glyph:'♞', deckEffect:'물리 피해 +2%', deckStats:[{ id:'physPctDmg', val:2 }], slotEffect:'물리·근접 피해 옵션 7% 증폭', slotAmp:{ statIds:['physFlatDmg','physPctDmg','meleePctDmg'], pct:7 } },
    { id:'hermit', no:9, name:'은둔자', glyph:'⌁', deckEffect:'회피 +2%', deckStats:[{ id:'evasionPct', val:2 }], slotEffect:'회피·비껴내기 옵션 8% 증폭', slotAmp:{ statIds:['evasion','evasionPct','deflectChance','deflectDamageReduce'], pct:8 } },
    { id:'fortune', no:10, name:'운명의 수레바퀴', glyph:'◉', deckEffect:'최소·최대 피해 보정 +0.5%', deckStats:[{ id:'minDmgRoll', val:0.5 },{ id:'maxDmgRoll', val:0.5 }], slotEffect:'피해 보정 옵션 10% 증폭', slotAmp:{ statIds:['minDmgRoll','maxDmgRoll'], pct:10 } },
    { id:'justice', no:11, name:'정의', glyph:'⚖', deckEffect:'정확도 효과 +2%', deckStats:[{ id:'accuracyBonusPct', val:2 }], slotEffect:'관통·정확도 옵션 8% 증폭', slotAmp:{ statIds:['resPen','physIgnore','accuracy','accuracyBonusPct'], pct:8 } },
    { id:'hanged', no:12, name:'매달린 자', glyph:'⌇', deckEffect:'카오스 피해 +2%', deckStats:[{ id:'chaosPctDmg', val:2 }], slotEffect:'카오스·중독 옵션 8% 증폭', slotAmp:{ statIds:['chaosFlatDmg','chaosPctDmg','poisonChance','dotPctDmg'], pct:8 } },
    { id:'death', no:13, name:'죽음', glyph:'♠', deckEffect:'지속 피해 +2%', deckStats:[{ id:'dotPctDmg', val:2 }], slotEffect:'지속 피해·상태이상 옵션 8% 증폭', slotAmp:{ statIds:['dotPctDmg','bleedChance','poisonChance','igniteChance'], pct:8 } },
    { id:'temperance', no:14, name:'절제', glyph:'⚗', deckEffect:'초당 재생 +0.2%', deckStats:[{ id:'regen', val:0.2 }], slotEffect:'재생·흡수 옵션 8% 증폭', slotAmp:{ statIds:['regen','regenFlat','leech'], pct:8 } },
    { id:'devil', no:15, name:'악마', glyph:'♈', deckEffect:'치명타 피해 +4%', deckStats:[{ id:'critDmg', val:4 }], slotEffect:'치명타·공격 속도 옵션 7% 증폭', slotAmp:{ statIds:['crit','critDmg','aspd'], pct:7 } },
    { id:'tower', no:16, name:'탑', glyph:'♜', deckEffect:'물리 피해 감소 +0.5%', deckStats:[{ id:'dr', val:0.5 }], slotEffect:'방어 수치 옵션 5% 증폭', slotAmp:{ statIds:['armor','armorPct','evasion','evasionPct','energyShield','energyShieldPct'], pct:5 } },
    { id:'star', no:17, name:'별', glyph:'★', deckEffect:'원소 피해 +1.5%', deckStats:[{ id:'elementalPctDmg', val:1.5 }], slotEffect:'장비의 유효 젬 레벨 1당 해당 젬 피해 3% 증가 (최대 15%)', slotGemDamage:{ perLevelPct:3, capPct:15 } },
    { id:'moon', no:18, name:'달', glyph:'☽', deckEffect:'비껴내기 확률 +0.5%', deckStats:[{ id:'deflectChance', val:0.5 }], slotEffect:'회피·카오스 방어 옵션 8% 증폭', slotAmp:{ statIds:['evasion','evasionPct','resChaos','deflectChance'], pct:8 } },
    { id:'sun', no:19, name:'태양', glyph:'☼', deckEffect:'화염 피해 +2%', deckStats:[{ id:'firePctDmg', val:2 }], slotEffect:'화염 피해 옵션 8% 증폭', slotAmp:{ statIds:['fireFlatDmg','firePctDmg','igniteChance'], pct:8 } },
    { id:'judgment', no:20, name:'심판', glyph:'♬', deckEffect:'보스 피해 +2%', deckStats:[{ id:'bossDamagePct', val:2 }], slotEffect:'보스·정예 피해 옵션 8% 증폭', slotAmp:{ statIds:['bossDamagePct','eliteDamagePct'], pct:8 } },
    { id:'world', no:21, name:'세계', glyph:'◎', deckEffect:'피해·생명력 +1%, 모든 저항 +0.25%', deckStats:[{ id:'pctDmg', val:1 },{ id:'pctHp', val:1 },{ id:'resAll', val:0.25 }], slotEffect:'피해 종류 옵션 4% 증폭', slotAmp:{ statIds:['pctDmg','physPctDmg','elementalPctDmg','firePctDmg','coldPctDmg','lightPctDmg','chaosPctDmg'], pct:4 } }
]);

const PRUNING_TREE_STATE_VERSION = 3;
const PRUNING_TREE_UNLOCK_LOOP = 18;
const PRUNING_TREE_DB = Object.freeze([
    { id:'first_ring', name:'첫 나이테', maxRank:5, cost:1, x:50, y:89, stats:[{ id:'flatHp', val:4 }], penaltyStats:[{ id:'move', val:-0.2 }], effect:'최대 생명력 +4/단계', penaltyEffect:'이동 속도 -0.2%/부담' },
    { id:'deep_root', name:'깊은 뿌리', maxRank:5, cost:1, x:29, y:72, requires:{ first_ring:3 }, stats:[{ id:'resAll', val:0.2 }], penaltyStats:[{ id:'pctDmg', val:-0.2 }], effect:'모든 저항 +0.2%/단계', penaltyEffect:'피해 -0.2%/부담' },
    { id:'red_root', name:'붉은 뿌리', maxRank:5, cost:1, x:71, y:72, requires:{ first_ring:3 }, stats:[{ id:'flatDmg', val:0.4 }], penaltyStats:[{ id:'pctHp', val:-0.2 }], effect:'기본 피해 +0.4/단계', penaltyEffect:'최대 생명력 -0.2%/부담' },
    { id:'iron_bark', name:'철빛 껍질', maxRank:5, cost:1, x:14, y:52, requires:{ deep_root:3 }, stats:[{ id:'armorPct', val:0.4 }], penaltyStats:[{ id:'move', val:-0.2 }], effect:'방어도 +0.4%/단계', penaltyEffect:'이동 속도 -0.2%/부담' },
    { id:'wind_bark', name:'바람 껍질', maxRank:5, cost:1, x:34, y:52, requires:{ deep_root:3 }, stats:[{ id:'evasionPct', val:0.4 }], penaltyStats:[{ id:'armorPct', val:-0.2 }], effect:'회피 +0.4%/단계', penaltyEffect:'방어도 -0.2%/부담' },
    { id:'moon_sap', name:'달빛 수액', maxRank:5, cost:1, x:50, y:36, requires:{ deep_root:3 }, stats:[{ id:'energyShieldPct', val:0.4 }], penaltyStats:[{ id:'pctHp', val:-0.2 }], effect:'에너지 보호막 +0.4%/단계', penaltyEffect:'최대 생명력 -0.2%/부담' },
    { id:'thorn_tip', name:'가시 끝', maxRank:5, cost:1, x:66, y:52, requires:{ red_root:3 }, stats:[{ id:'critDmg', val:0.8 }], penaltyStats:[{ id:'resAll', val:-0.2 }], effect:'치명타 피해 +0.8%/단계', penaltyEffect:'모든 저항 -0.2%/부담' },
    { id:'quick_leaf', name:'빠른 잎', maxRank:5, cost:1, x:86, y:52, requires:{ red_root:3 }, stats:[{ id:'aspd', val:0.2 }], penaltyStats:[{ id:'pctDmg', val:-0.2 }], effect:'공격 속도 +0.2%/단계', penaltyEffect:'피해 -0.2%/부담' },
    { id:'broad_leaf', name:'넓은 잎', maxRank:5, cost:1, x:24, y:30, requires:{ iron_bark:3, wind_bark:3 }, stats:[{ id:'pctHp', val:0.4 }], penaltyStats:[{ id:'move', val:-0.2 }], effect:'최대 생명력 +0.4%/단계', penaltyEffect:'이동 속도 -0.2%/부담' },
    { id:'red_flower', name:'붉은 꽃', maxRank:5, cost:1, x:76, y:30, requires:{ thorn_tip:3, quick_leaf:3 }, stats:[{ id:'pctDmg', val:0.4 }], penaltyStats:[{ id:'resAll', val:-0.2 }], effect:'피해 +0.4%/단계', penaltyEffect:'모든 저항 -0.2%/부담' },
    { id:'quiet_crown', name:'고요한 수관', maxRank:5, cost:2, x:50, y:10, requires:{ broad_leaf:3, moon_sap:3, red_flower:3 }, stats:[{ id:'dr', val:0.2 }], penaltyStats:[{ id:'aspd', val:-0.2 }], effect:'물리 피해 감소 +0.2%/단계', penaltyEffect:'공격 속도 -0.2%/부담' }
]);

const BEYOND_BOUNDARY_ZONE_ID = 'beyond_boundary';
const BEYOND_BOUNDARY_STATE_VERSION = 2;
const BEYOND_BOUNDARY_UNLOCK_LOOP = 50;
const BEYOND_BOUNDARY_UNLOCK_BOSS_ID = 'pinnacle_observer';
const BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER = 5;
const BEYOND_BOUNDARY_TIER_CAP = 250;
const BEYOND_BOUNDARY_DIFFICULTY_OFFSET = 4;
const BEYOND_BOUNDARY_HP_GROWTH = 1.11;
const BEYOND_BOUNDARY_DAMAGE_GROWTH = 1.055;
const BEYOND_BOUNDARY_SEAL_DB = Object.freeze([
    { id:'edge', name:'끝을 벼린 인장', maxLevel:50, description:'보스와 정예를 끊어내는 공격 인장', stats:[{ id:'bossDamagePct', val:0.5 }, { id:'eliteDamagePct', val:0.5 }] },
    { id:'ward', name:'되비치는 인장', maxLevel:50, description:'생명력과 에너지 보호막을 함께 다듬는 생존 인장', stats:[{ id:'pctHp', val:0.25 }, { id:'energyShieldPct', val:0.25 }] },
    { id:'stride', name:'먼 길의 인장', maxLevel:50, description:'공격과 이동의 흐름을 잇는 속도 인장', stats:[{ id:'aspd', val:0.2 }, { id:'move', val:0.2 }] }
]);
const BEYOND_BOUNDARY_MUTATOR_DB = Object.freeze([
    { tier:5, id:'hardened', name:'응고', description:'적 생명력 20% 증가' },
    { tier:10, id:'onslaught', name:'맹공', description:'적 피해 15%, 공격 속도 10% 증가' },
    { tier:15, id:'iron', name:'철벽', description:'적 물리 피해 감소 10% 증가' },
    { tier:20, id:'piercing', name:'심층 관통', description:'적 관통 10 증가' },
    { tier:30, id:'renewal', name:'재생', description:'적이 초당 생명력 0.25% 재생' }
]);
const BEYOND_BOUNDARY_REWARD_FOCUS_DB = Object.freeze([
    { id:'armory', name:'무기고의 메아리', description:'완료 보상을 희귀 이상 장비에 집중합니다.', risk:'적 생명력 8% 증가', hpMul:1.08 },
    { id:'jewel', name:'세공의 메아리', description:'완료 보상을 주얼과 주얼 결정에 집중합니다.', risk:'적 공격 속도 8% 증가', attackSpeedMul:1.08 },
    { id:'gem', name:'각인의 메아리', description:'완료 보상을 젬 잔향에 집중합니다.', risk:'적 피해 8% 증가', damageMul:1.08 },
    { id:'growth', name:'생장의 메아리', description:'완료 보상을 생장판 배치물에 집중합니다.', risk:'적 관통 5 증가', penetrationBonus:5 },
    { id:'currency', name:'연성의 메아리', description:'완료 보상을 장비 제작 재화에 집중합니다.', risk:'적 생명력·피해 5% 증가', hpMul:1.05, damageMul:1.05 }
]);
const BEYOND_BOUNDARY_INTENSITY_DB = Object.freeze([
    { id:'plain', name:'무조율', description:'추가 소모와 보정 없이 도전합니다.', costs:[], rewardMul:1, hpMul:1, damageMul:1, attackSpeedMul:1 },
    { id:'etched', name:'새김 조율', description:'보상 묶음이 35% 풍성해집니다.', costs:[{ key:'formlessDew', amount:3 }], rewardMul:1.35, hpMul:1.12, damageMul:1.08, attackSpeedMul:1 },
    { id:'sovereign', name:'군주의 조율', description:'보상 묶음이 75% 풍성해집니다.', costs:[{ key:'formlessDew', amount:8 }, { key:'sapBud', amount:1 }], rewardMul:1.75, hpMul:1.3, damageMul:1.2, attackSpeedMul:1.1 }
]);

safeExposeData({
    ARCANA_DECK_SLOT_COUNT, ARCANA_SEALED_CARD_DROP_CHANCE, ARCANA_GALAXY_BOSS_DROP_CHANCE,
    ARCANA_CAPSTONE_DROP_CHANCE, ARCANA_QUEST_EXPLORATION_TARGET, ARCANA_EQUIPMENT_SLOT_KEYS, ARCANA_CARD_DB,
    PRUNING_TREE_STATE_VERSION, PRUNING_TREE_UNLOCK_LOOP, PRUNING_TREE_DB,
    BEYOND_BOUNDARY_ZONE_ID, BEYOND_BOUNDARY_STATE_VERSION, BEYOND_BOUNDARY_UNLOCK_LOOP,
    BEYOND_BOUNDARY_UNLOCK_BOSS_ID, BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER, BEYOND_BOUNDARY_TIER_CAP,
    BEYOND_BOUNDARY_DIFFICULTY_OFFSET, BEYOND_BOUNDARY_HP_GROWTH, BEYOND_BOUNDARY_DAMAGE_GROWTH,
    BEYOND_BOUNDARY_SEAL_DB, BEYOND_BOUNDARY_MUTATOR_DB,
    BEYOND_BOUNDARY_REWARD_FOCUS_DB, BEYOND_BOUNDARY_INTENSITY_DB
});
