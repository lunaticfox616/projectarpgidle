export const OCEAN_WORKBENCH_OPTIONS = [
    { id: 'oceanBossSlayer', label: '심연의 보스 학살', desc: '보스에게 가하는 피해가 증가합니다. (일반 옵션으로는 등장하지 않는 전용 스탯)', statId: 'bossDamagePct', min: 18, max: 28 },
    { id: 'oceanEliteHunter', label: '심연의 정예 사냥', desc: '정예 몬스터에게 가하는 피해가 증가합니다.', statId: 'eliteDamagePct', min: 16, max: 24 },
    { id: 'oceanFirstStrike', label: '심연의 선제 일격', desc: '생명력이 가득 찬 적에게 가하는 첫 타에 추가 피해를 줍니다.', statId: 'firstStrikeDamagePct', min: 20, max: 30 },
    { id: 'oceanCuller', label: '심연의 처형자', desc: '생명력이 일정 % 이하인 보스가 아닌 적을 즉시 처치합니다.', statId: 'cullStrikePct', min: 6, max: 10 },
    { id: 'oceanLeviathanCrown', label: '리바이어던의 권능', desc: '보스 처치 피해를 가장 높게 보장하는 최상위 전용 옵션입니다.', statId: 'bossDamagePct', min: 32, max: 42 }
];

export const SEA_GIFT_RANDOM_ORB_KEYS = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'blessing', 'emberBranch', 'pruningShears'];

export const SEA_GIFT_RECIPES = [
    {"id":"reefBundle","requires":{"shallowSilverfin":5},"effect":{"type":"currency","key":"reefFragment","amount":2},"title":"암초 조각","group":"supply"},
    {"id":"tidalCharm","requires":{"tidalEel":4},"effect":{"type":"currency","key":"oceanRerollShard","amount":1},"title":"심해의 파편","group":"supply"},
    {"id":"abyssalCache","requires":{"abyssAngler":2,"glowfinTrout":2},"effect":{"type":"randomCurrency","amount":2},"title":"무작위 제작 재화","group":"supply"},
    {"id":"safeReroll","requires":{"glowfinTrout":3,"shallowSilverfin":4},"effect":{"type":"safeReroll"},"title":"수치 다듬기","group":"equipment"},
    {"id":"tierStepUp","requires":{"abyssAngler":3,"glowfinTrout":3},"effect":{"type":"tierStepUp"},"title":"등급 올리기","group":"equipment"},
    {"id":"categoryShift","requires":{"glowfinTrout":3,"tidalEel":3},"effect":{"type":"convertCategoryMod"},"title":"계열 바꾸기","group":"equipment"},
    {"id":"sealOffering","requires":{"tidelordKoi":1,"glowfinTrout":3},"effect":{"type":"lockMod","count":1},"title":"옵션 봉인","group":"equipment"},
    {"id":"echoMod","requires":{"voidLeviathanSpawn":1,"abyssAngler":3},"effect":{"type":"echoMod"},"title":"옵션 복사","group":"equipment"},
    {"id":"crushDepthScar","requires":{"prismaticHorror":2,"tidelordKoi":1,"abyssAngler":2},"effect":{"type":"fixedBenchOption"},"title":"심해 옵션","group":"equipment"},
    {"id":"leviathanSigil","requires":{"kingLeviathan":2,"tidelordKoi":2,"voidLeviathanSpawn":1},"effect":{"type":"fixedBenchOption","topTier":true},"title":"리바이어던의 권능","group":"equipment"}
];

export const SEA_GIFT_ITEM_EFFECT_TYPES = new Set(['safeReroll','tierStepUp','convertCategoryMod','lockMod','echoMod','fixedBenchOption']);
