// Phase-1 extracted data (global compatibility).
const UNIQUE_DB = [
    { name: "핏빛 톱날", slots: ["무기"], reqTier: 1, stats: [{ id: "flatDmg", min: 12, max: 18 }, { id: "leech", min: 0.8, max: 1.2 }, { id: "minDmgRoll", min: 4, max: 7 }] },
    { name: "순풍의 장화", slots: ["신발"], reqTier: 1, stats: [{ id: "move", min: 14, max: 18 }, { id: "projectilePctDmg", min: 8, max: 12 }] },
    { name: "도둑의 반지", slots: ["반지"], reqTier: 2, stats: [{ id: "leech", min: 1.4, max: 2.0 }, { id: "chaosPctDmg", min: 14, max: 22 }, { id: "resAll", min: 5, max: 9 }, { id: "move", min: 4, max: 7 }] },
    { name: "군단 지휘관의 투구", slots: ["투구"], reqTier: 3, stats: [{ id: "flatHp", min: 38, max: 50 }, { id: "aoePctDmg", min: 10, max: 16 }, { id: "dr", min: 3, max: 5 }] },
    { name: "사냥개의 발톱", slots: ["장갑"], reqTier: 4, stats: [{ id: "aspd", min: 12, max: 18 }, { id: "ds", min: 8, max: 12 }, { id: "minDmgRoll", min: 3, max: 6 }] },
    { name: "현자의 시선", slots: ["목걸이"], reqTier: 5, stats: [{ id: "gemLevel", min: 1, max: 1 }, { id: "suppCap", min: 1, max: 1 }, { id: "elementalPctDmg", min: 12, max: 18 }] },
    { name: "분광 고리", slots: ["반지"], reqTier: 6, stats: [{ id: "resAll", min: 10, max: 14 }, { id: "crit", min: 4, max: 6 }, { id: "elementalPctDmg", min: 10, max: 16 }] },
    { name: "카옴의 심장", slots: ["갑옷"], reqTier: 7, stats: [{ id: "flatHp", min: 150, max: 205 }, { id: "pctHp", min: 14, max: 22 }, { id: "regen", min: 1.0, max: 1.5 }, { id: "dr", min: 4, max: 6 }] },
    { name: "절단자의 송곳니", slots: ["무기"], reqTier: 7, stats: [{ id: "flatDmg", min: 22, max: 30 }, { id: "physIgnore", min: 8, max: 12 }, { id: "physPctDmg", min: 18, max: 26 }] },
    { name: "불멸의 띠", slots: ["허리띠"], reqTier: 8, stats: [{ id: "dr", min: 6, max: 9 }, { id: "flatHp", min: 70, max: 95 }, { id: "resChaos", min: 8, max: 12 }] },
    { name: "분광 천칭", slots: ["목걸이"], reqTier: 8, stats: [{ id: "resPen", min: 8, max: 12 }, { id: "elementalPctDmg", min: 18, max: 26 }, { id: "resAll", min: 8, max: 12 }] },
    { name: "광전사의 손길", slots: ["장갑"], reqTier: 9, stats: [{ id: "aspd", min: 14, max: 20 }, { id: "ds", min: 10, max: 14 }, { id: "meleePctDmg", min: 18, max: 26 }] },
    { name: "별의 파괴자", slots: ["무기"], reqTier: 10, stats: [{ id: "flatDmg", min: 40, max: 56 }, { id: "physPctDmg", min: 46, max: 62 }, { id: "critDmg", min: 36, max: 48 }, { id: "physIgnore", min: 8, max: 12 }, { id: "maxDmgRoll", min: 6, max: 10 }] },
    { name: "균열 사냥꾼", slots: ["장갑"], reqTier: 11, stats: [{ id: "physIgnore", min: 8, max: 12 }, { id: "aspd", min: 12, max: 18 }, { id: "meleePctDmg", min: 20, max: 30 }, { id: "maxDmgRoll", min: 4, max: 8 }] },
    { name: "폭군의 왕관", slots: ["투구"], reqTier: 11, stats: [{ id: "aoePctDmg", min: 24, max: 34 }, { id: "critDmg", min: 30, max: 45 }, { id: "flatHp", min: 60, max: 82 }] },
    { name: "심연의 굴레", slots: ["목걸이"], reqTier: 12, stats: [{ id: "chaosPctDmg", min: 24, max: 34 }, { id: "resChaos", min: 12, max: 18 }, { id: "leech", min: 1.0, max: 1.4 }] },
    { name: "공허의 첨탑", slots: ["반지"], reqTier: 12, stats: [{ id: "resPen", min: 7, max: 11 }, { id: "chaosPctDmg", min: 18, max: 28 }, { id: "crit", min: 4, max: 7 }] },
    { name: "무명의 맹세", slots: ["갑옷"], reqTier: 13, stats: [{ id: "flatHp", min: 185, max: 250 }, { id: "resAll", min: 14, max: 20 }, { id: "dr", min: 10, max: 14 }, { id: "regen", min: 1.2, max: 2.0 }, { id: "resChaos", min: 10, max: 16 }] },
    { name: "균열추", slots: ["무기"], reqTier: 14, stats: [{ id: "flatDmg", min: 34, max: 44 }, { id: "aoePctDmg", min: 24, max: 32 }, { id: "crit", min: 6, max: 10 }] },
    { name: "여명의 결속", slots: ["허리띠"], reqTier: 15, stats: [{ id: "pctHp", min: 16, max: 24 }, { id: "regen", min: 1.0, max: 1.6 }, { id: "resAll", min: 8, max: 12 }] },
    { name: "화염 군주의 숨결", slots: ["목걸이"], reqTier: 12, stats: [{ id: "firePctDmg", min: 20, max: 30 }, { id: "resF", min: 18, max: 26 }] },
    { name: "서리 여제의 인장", slots: ["반지"], reqTier: 12, stats: [{ id: "coldPctDmg", min: 20, max: 30 }, { id: "resC", min: 18, max: 26 }] },
    { name: "폭풍 군단장의 창끝", slots: ["무기"], reqTier: 13, stats: [{ id: "lightPctDmg", min: 24, max: 34 }, { id: "crit", min: 8, max: 12 }] },
    { name: "창공의 사슬", slots: ["허리띠"], reqTier: 14, stats: [{ id: "move", min: 14, max: 20 }, { id: "elementalPctDmg", min: 20, max: 30 }] },
    { name: "타락한 심장석", slots: ["갑옷"], reqTier: 15, stats: [{ id: "pctHp", min: 20, max: 30 }, { id: "chaosPctDmg", min: 28, max: 40 }, { id: "resChaos", min: 18, max: 26 }, { id: "flatHp", min: 90, max: 130 }] },
    { name: "초월자 파쇄검", slots: ["무기"], reqTier: 1, ultraRare: true, stats: [{ id: "flatDmg", min: 65, max: 85 }, { id: "critDmg", min: 110, max: 150 }, { id: "aspd", min: 22, max: 30 }] },
    { name: "새벽의 약속", slots: ["투구"], reqTier: 6, ultraRare: true, stats: [{ id: "flatHp", min: 180, max: 240 }, { id: "resAll", min: 24, max: 34 }, { id: "regen", min: 2.0, max: 3.0 }] },
    { name: "심연 군주갑", slots: ["갑옷"], reqTier: 6, ultraRare: true, stats: [{ id: "flatHp", min: 260, max: 340 }, { id: "dr", min: 12, max: 18 }, { id: "resChaos", min: 20, max: 28 }] },
    { name: "폭풍 추적자", slots: ["신발"], reqTier: 6, ultraRare: true, stats: [{ id: "move", min: 35, max: 45 }, { id: "aspd", min: 18, max: 24 }, { id: "resL", min: 28, max: 38 }] },
    { name: "종말의 논리", slots: ["목걸이"], reqTier: 10, ultraRare: true, stats: [{ id: "gemLevel", min: 3, max: 3 }, { id: "suppCap", min: 2, max: 2 }, { id: "elementalPctDmg", min: 50, max: 70 }, { id: "resPen", min: 12, max: 20 }, { id: "crit", min: 10, max: 16 }, { id: "flatHp", min: 120, max: 180 }] },
    { name: "공허 제국의 인장", slots: ["반지"], reqTier: 10, ultraRare: true, stats: [{ id: "resAll", min: 34, max: 45 }, { id: "crit", min: 18, max: 25 }, { id: "chaosPctDmg", min: 45, max: 65 }, { id: "leech", min: 1.8, max: 2.8 }, { id: "resPen", min: 8, max: 14 }] },
    { name: "황제의 심연띠", slots: ["허리띠"], reqTier: 10, ultraRare: true, stats: [{ id: "flatHp", min: 260, max: 350 }, { id: "pctHp", min: 28, max: 38 }, { id: "dr", min: 12, max: 18 }, { id: "resAll", min: 14, max: 20 }] },
    { name: "세계파쇄자", slots: ["무기"], reqTier: 10, ultraRare: true, stats: [{ id: "physIgnore", min: 18, max: 26 }, { id: "flatDmg", min: 90, max: 120 }, { id: "critDmg", min: 90, max: 130 }] },
    { name: "만상 관통석", slots: ["목걸이"], reqTier: 10, ultraRare: true, stats: [{ id: "resPen", min: 18, max: 26 }, { id: "elementalPctDmg", min: 40, max: 58 }, { id: "gemLevel", min: 2, max: 2 }] },
    { name: "천공 붕괴자", slots: ["무기"], reqTier: 10, ultraRare: true, stats: [{ id: "flatDmg", min: 110, max: 145 }, { id: "lightPctDmg", min: 48, max: 66 }, { id: "critDmg", min: 120, max: 160 }] },
    { name: "영겁의 손아귀", slots: ["장갑"], reqTier: 10, ultraRare: true, stats: [{ id: "aspd", min: 24, max: 32 }, { id: "ds", min: 24, max: 34 }, { id: "meleePctDmg", min: 44, max: 60 }] },
    { name: "황혼의 왕관", slots: ["투구"], reqTier: 10, ultraRare: true, stats: [{ id: "crit", min: 20, max: 28 }, { id: "critDmg", min: 90, max: 125 }, { id: "resAll", min: 20, max: 28 }] },
    { name: "기수의 나침반", slots: ["목걸이"], reqTier: 9, stats: [{ id: "move", min: 12, max: 18 }, { id: "minDmgRoll", min: 5, max: 9 }, { id: "aspd", min: 8, max: 12 }] },
    { name: "쐐기 파편", slots: ["무기"], reqTier: 9, stats: [{ id: "maxDmgRoll", min: 8, max: 14 }, { id: "flatDmg", min: 28, max: 40 }] },
    { name: "절대 하한", slots: ["장갑"], reqTier: 10, stats: [{ id: "minDmgRoll", min: 10, max: 16 }, { id: "aspd", min: 10, max: 14 }, { id: "flatHp", min: 55, max: 80 }] },
    { name: "천정 파쇄", slots: ["무기"], reqTier: 11, stats: [{ id: "maxDmgRoll", min: 12, max: 18 }, { id: "critDmg", min: 30, max: 44 }, { id: "physPctDmg", min: 24, max: 34 }] },
    { name: "가호의 갑피", slots: ["갑옷"], reqTier: 11, stats: [{ id: "flatHp", min: 160, max: 220 }, { id: "pctHp", min: 18, max: 26 }, { id: "dr", min: 8, max: 12 }] },
    { name: "굶주린 톱니", slots: ["반지"], reqTier: 12, stats: [{ id: "leech", min: 1.2, max: 1.8 }, { id: "minDmgRoll", min: 4, max: 7 }, { id: "chaosPctDmg", min: 20, max: 30 }] },
    { name: "거인의 지지대", slots: ["허리띠"], reqTier: 12, stats: [{ id: "flatHp", min: 100, max: 145 }, { id: "pctHp", min: 14, max: 22 }, { id: "maxDmgRoll", min: 3, max: 6 }] },
    { name: "지평선 분할자", slots: ["무기"], reqTier: 13, stats: [{ id: "flatDmg", min: 44, max: 60 }, { id: "minDmgRoll", min: 8, max: 12 }, { id: "maxDmgRoll", min: 8, max: 12 }] },
    { name: "용맥 수호", slots: ["장갑"], reqTier: 13, stats: [{ id: "flatHp", min: 70, max: 100 }, { id: "regen", min: 0.9, max: 1.4 }, { id: "minDmgRoll", min: 5, max: 9 }] },
    { name: "운명의 쌍현", slots: ["목걸이"], reqTier: 14, stats: [{ id: "minDmgRoll", min: 7, max: 11 }, { id: "maxDmgRoll", min: 7, max: 11 }, { id: "crit", min: 8, max: 12 }] },
    { name: "영원의 레버", slots: ["무기"], reqTier: 15, ultraRare: true, stats: [{ id: "flatDmg", min: 95, max: 130 }, { id: "minDmgRoll", min: 14, max: 20 }, { id: "maxDmgRoll", min: 14, max: 20 }, { id: "critDmg", min: 90, max: 130 }] }
];

function buildUniqueExtraStat(slot, usedIds) {
    let slotKey = Array.isArray(slot) ? slot[0] : slot;
    let pool = {
        무기: ['flatDmg', 'physPctDmg', 'critDmg', 'aspd', 'minDmgRoll', 'maxDmgRoll'],
        장갑: ['aspd', 'meleePctDmg', 'flatHp', 'crit', 'minDmgRoll', 'maxDmgRoll'],
        갑옷: ['flatHp', 'pctHp', 'dr', 'regen', 'resAll'],
        투구: ['flatHp', 'crit', 'critDmg', 'resAll'],
        목걸이: ['resPen', 'critDmg', 'gemLevel', 'suppCap', 'minDmgRoll', 'maxDmgRoll'],
        반지: ['crit', 'resPen', 'elementalPctDmg', 'chaosPctDmg', 'leech'],
        허리띠: ['flatHp', 'pctHp', 'dr', 'regen', 'resAll'],
        신발: ['move', 'aspd', 'resAll', 'flatHp']
    }[slotKey] || ['pctDmg', 'flatHp'];
    let id = pool.find(v => !usedIds.has(v)) || pool[0];
    let pctLike = ['pct', 'crit', 'dmg', 'res', 'move', 'aspd', 'leech', 'regen', 'dr', 'pen'].some(k => id.includes(k));
    return { id: id, min: pctLike ? 6 : 24, max: pctLike ? 14 : 60 };
}

UNIQUE_DB.forEach(unique => {
    if (!unique || !Array.isArray(unique.stats)) return;
    unique.stats.forEach(stat => {
        if (!Number.isFinite(stat.min) || !Number.isFinite(stat.max)) return;
        stat.min = Number((stat.min * 1.8).toFixed(1));
        stat.max = Number((stat.max * 2.4).toFixed(1));
        if (stat.max < stat.min) stat.max = stat.min;
    });
    if (unique.stats.length <= 2) {
        let used = new Set(unique.stats.map(s => s.id));
        unique.stats.push(buildUniqueExtraStat(unique.slots, used));
        used = new Set(unique.stats.map(s => s.id));
        unique.stats.push(buildUniqueExtraStat(unique.slots, used));
    }
});

const ORB_DB = {
    transmute: { name: '진화의 오브', desc: '노멀 아이템을 매직으로 바꿉니다.' },
    augment: { name: '확장의 오브', desc: '매직 아이템의 빈 옵션 칸을 하나 채웁니다.' },
    alteration: { name: '변화의 오브', desc: '매직 아이템의 옵션을 다시 굴립니다.' },
    alchemy: { name: '연금술의 오브', desc: '노멀 아이템을 희귀 아이템으로 바꿉니다.' },
    exalted: { name: '엑잘티드 오브', desc: '희귀 아이템에 새 옵션을 하나 추가합니다.' },
    regal: { name: '제왕의 오브', desc: '매직 아이템에 옵션을 1줄 추가하고 희귀 아이템으로 만듭니다.' },
    chaos: { name: '카오스 오브', desc: '희귀 아이템의 옵션을 모두 다시 굴립니다.' },
    divine: { name: '신성한 오브', desc: '아이템 옵션 수치를 다시 굴립니다.' },
    scour: { name: '정화의 오브', desc: '유니크를 제외한 아이템을 노멀 상태로 되돌립니다.' },
    bossKeyFlame: { name: '열쇠: 화염 군주', desc: '시즌2 보스 [이그니스] 도전권입니다.' },
    bossKeyFrost: { name: '열쇠: 서리 여제', desc: '시즌2 보스 [글라시아] 도전권입니다.' },
    bossKeyStorm: { name: '열쇠: 폭풍 군단장', desc: '시즌2 보스 [볼타] 도전권입니다.' },
    beastKeyCerberus: { name: '열쇠: 케르베로스', desc: '시즌6 야수 보스 [케르베로스] 도전권입니다.' },
    bossCore: { name: '군주의 핵', desc: '시즌2 보스를 처치하면 얻는 젬 강화 재료입니다.' },
    fossil: { name: '미궁 화석', desc: '기본 화석 조각입니다. 미궁에서 다양한 타입의 화석으로 정제됩니다.' },
    fossilJagged: { name: '톱니 화석', desc: '물리/근접 계열 옵션 하나를 확정한 카오스 재련을 합니다.' },
    fossilBound: { name: '속박 화석', desc: '생명/방어 계열 옵션 하나를 확정한 카오스 재련을 합니다.' },
    fossilGale: { name: '돌풍 화석', desc: '속도/치명 계열 옵션 하나를 확정한 카오스 재련을 합니다.' },
    fossilPrismatic: { name: '프리즘 화석', desc: '저항/원소 계열 옵션 하나를 확정한 카오스 재련을 합니다.' },
    fossilAbyssal: { name: '심연 화석', desc: '화석 전용 특수 옵션이 높은 확률로 등장하는 카오스 재련을 합니다.' },
    skyEssence: { name: '창공의 힘', desc: '시즌4 창공 몬스터에게서 얻는 젬 강화 재료입니다. 스킬 탭의 젬 강화에서 특수 옵션을 부여합니다.' },
    tainted: { name: '타락의 오브', desc: '아이템을 타락시켜 추가 옵션을 시도합니다. 타락 후 제작 불가.' },
    jewelCore: { name: '주얼 핵(구)', desc: '이전 버전 재화입니다. 로드 시 주얼 결정으로 자동 통합됩니다.' },
    jewelShard: { name: '주얼 결정', desc: '주얼 해체/제작/슬롯 증폭에 사용하는 통합 재화입니다.' },
    hiveKey: { name: '벌집 열쇠', desc: '루프8 이후 맵핑에서 낮은 확률로 발견되는 벌집 입장권입니다.' },
    enchantedHoney: { name: '마력 깃든 벌꿀', desc: '장비 옵션 1개를 영구 고정하는 매우 희귀 재화입니다.' },
    venomStinger: { name: '독벌침', desc: '무기에 랜덤 공격 옵션 한 줄을 추가/재설정합니다.' },
    pollen: { name: '꽃가루', desc: '벌집 열쇠/독벌침/벌꿀 제작에 사용하는 천장 재화입니다.' },
    voidChisel: { name: '공허의 끌', desc: '반지/목걸이에 주얼 소켓을 뚫고 제거할 때 쓰입니다.' },
    sealShard: { name: '봉인편린', desc: '시즌6 부적 시스템 핵심 재료입니다. 봉인을 해제해 부적 후보를 확인합니다.' },
    strongSealShard: { name: '강력한 기운의 봉인편린', desc: '희귀한 고급 봉인편린입니다. 더 강한 부적 옵션을 노릴 수 있습니다.' },
    meteorShard: { name: '운석 파편', desc: '운석 낙하 지점에서 얻는 검은 별 파편. 별쐐기 제작/리롤에 사용됩니다.' },
    incompleteStarWedge: { name: '불완전한 별쐐기', desc: '미완성 별쐐기 코어. 운석 파편과 결합하면 완성할 수 있습니다.' },
    starWedge: { name: '별쐐기', desc: '검은 별의 파편. 패시브 트리에 장착해 주변 노드 효과를 변성시킵니다.' }
};
const MARKET_EXCHANGES = [
    { id: 'm1', from: 'transmute', to: 'augment', need: 8, gain: 1 },
    { id: 'm2', from: 'augment', to: 'alteration', need: 8, gain: 1 },
    { id: 'm3', from: 'alteration', to: 'alchemy', need: 8, gain: 1 },
    { id: 'm4', from: 'alchemy', to: 'chaos', need: 20, gain: 1 },
    { id: 'm5', from: 'chaos', to: 'exalted', need: 15, gain: 1 },
    { id: 'm6', from: 'chaos', to: 'divine', need: 100, gain: 1 },
    { id: 'm7', from: 'chaos', to: 'regal', need: 3, gain: 1 },
    { id: 'm8', from: 'regal', to: 'chaos', need: 8, gain: 1 },
    { id: 'm9', from: 'chaos', to: 'scour', need: 4, gain: 1 },
    { id: 'm10', from: 'exalted', to: 'divine', need: 5, gain: 1 },
    { id: 'm11', from: 'divine', to: 'chaos', need: 1, gain: 30 }
];

Object.assign(window, { UNIQUE_DB, ORB_DB, MARKET_EXCHANGES });
