if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/endgame-progression.js');

// 아르카나 · 가지치기는 보조 콘텐츠 통합 7단계(2026-10-01)에 없어졌다. 가지치기 자리는 그루터기 함의 접붙이기가 잇는다.

const BEYOND_BOUNDARY_ZONE_ID = 'beyond_boundary';
const BEYOND_BOUNDARY_STATE_VERSION = 2;
const BEYOND_BOUNDARY_UNLOCK_LOOP = 50;
// 루프 50 대신: 세계수 아틀라스 씨앗(정점 처치) 4개 (docs/atlas-endgame-20260930.md 3절).
const BEYOND_BOUNDARY_UNLOCK_SEEDS = 4;
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
    { id:'jewel', unlock:'jewel', name:'세공의 메아리', description:'완료 보상을 주얼과 주얼 결정에 집중합니다.', risk:'적 공격 속도 8% 증가', attackSpeedMul:1.08 },
    { id:'gem', unlock:'research', name:'각인의 메아리', description:'완료 보상을 젬 잔향에 집중합니다.', risk:'적 피해 8% 증가', damageMul:1.08 },
    { id:'currency', unlock:'craft', name:'연성의 메아리', description:'완료 보상을 장비 제작 재화에 집중합니다.', risk:'적 생명력·피해 5% 증가', hpMul:1.05, damageMul:1.05 }
]);
const BEYOND_BOUNDARY_INTENSITY_DB = Object.freeze([
    { id:'plain', name:'무조율', description:'추가 소모와 보정 없이 도전합니다.', costs:[], rewardMul:1, hpMul:1, damageMul:1, attackSpeedMul:1 },
    { id:'etched', name:'새김 조율', description:'보상 묶음이 35% 풍성해집니다.', costs:[{ key:'formlessDew', amount:3 }], rewardMul:1.35, hpMul:1.12, damageMul:1.08, attackSpeedMul:1 },
    { id:'sovereign', name:'군주의 조율', description:'보상 묶음이 75% 풍성해집니다.', costs:[{ key:'formlessDew', amount:8 }, { key:'sapBud', amount:1 }], rewardMul:1.75, hpMul:1.3, damageMul:1.2, attackSpeedMul:1.1 }
]);

safeExposeData({
    BEYOND_BOUNDARY_ZONE_ID, BEYOND_BOUNDARY_STATE_VERSION, BEYOND_BOUNDARY_UNLOCK_LOOP, BEYOND_BOUNDARY_UNLOCK_SEEDS,
    BEYOND_BOUNDARY_UNLOCK_BOSS_ID, BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER, BEYOND_BOUNDARY_TIER_CAP,
    BEYOND_BOUNDARY_DIFFICULTY_OFFSET, BEYOND_BOUNDARY_HP_GROWTH, BEYOND_BOUNDARY_DAMAGE_GROWTH,
    BEYOND_BOUNDARY_SEAL_DB, BEYOND_BOUNDARY_MUTATOR_DB,
    BEYOND_BOUNDARY_REWARD_FOCUS_DB, BEYOND_BOUNDARY_INTENSITY_DB
});
