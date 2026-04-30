function safeExposeData(map) {
  Object.keys(map || {}).forEach(function (key) {
    if (typeof window[key] === "undefined") window[key] = map[key];
  });
}

// Phase-1 extracted data (global compatibility).
const ACT_REWARD_DB = {
    0: {
        title: '액트 1 클리어 보상',
        body: '해안에서 건진 전리품 중 하나를 골라 다음 구간을 준비하세요.',
        choices: [
            { kind: 'item', slot: '장갑', rarity: 'magic', label: '미확인 장갑', desc: '액트 1 장갑을 받습니다.' },
            { kind: 'item', slot: '무기', rarity: 'magic', label: '미확인 무기', desc: '액트 1 무기를 받습니다.' },
            { kind: 'item', slot: '신발', rarity: 'magic', label: '미확인 신발', desc: '액트 1 신발을 받습니다.' }
        ]
    },
    1: {
        title: '액트 2 클리어 보상',
        body: '떨어진 곳에서 당신이 찾아낸 젬은, 아직 이름을 부르지 못한 힘을 품고 있었다. 하나를 골라 다음 액트의 전투 방식을 정하세요.',
        choices: [
            { kind: 'skill', skill: '연속 베기', fallbackKind: 'points', fallbackValue: 1, label: '근접 - 연속 베기', desc: '전방을 빠르게 가르는 근접 기술입니다.' },
            { kind: 'skill', skill: '관통 사격', fallbackKind: 'points', fallbackValue: 1, label: '투사체 - 관통 사격', desc: '멀리서 적 무리를 꿰뚫는 사격입니다.' },
            { kind: 'skill', skill: '얼음 창', fallbackKind: 'points', fallbackValue: 1, label: '마법 - 얼음 창', desc: '고위력 냉기 투사체를 발사합니다.' }
        ]
    },
    2: {
        title: '액트 3 클리어 보상',
        body: '추가 패시브 포인트입니다.',
        choices: [
            { kind: 'points', value: 2, label: '패시브 포인트 +2', desc: '즉시 패시브 포인트 2점을 획득합니다.' }
        ]
    },
    3: {
        title: '액트 4 클리어 보상',
        body: '원소 저항 하나를 강화할 수 있습니다.',
        choices: [
            { kind: 'stat', stat: 'resF', value: 8, label: '화염 저항 +8%', desc: '영구적으로 화염 저항을 올립니다.' },
            { kind: 'stat', stat: 'resC', value: 8, label: '냉기 저항 +8%', desc: '영구적으로 냉기 저항을 올립니다.' },
            { kind: 'stat', stat: 'resL', value: 8, label: '번개 저항 +8%', desc: '영구적으로 번개 저항을 올립니다.' }
        ]
    },
    4: {
        title: '액트 5 클리어 보상',
        body: '다음 중 하나의 능력치를 얻을 수 있습니다.',
        choices: [
            { kind: 'stat', stat: 'flatHp', value: 36, label: '최대 생명력 +36', desc: '기본 생존력을 크게 높입니다.' },
            { kind: 'stat', stat: 'aspd', value: 6, label: '공격 속도 +6%', desc: '더 빠른 공격 템포를 확보합니다.' },
            { kind: 'stat', stat: 'move', value: 8, label: '이동 속도 +8%', desc: '맵 진행과 포지셔닝을 개선합니다.' }
        ]
    },
    5: {
        title: '액트 6 클리어 보상',
        body: '가져갈 보조 스킬 젬 하나를 선택하세요.',
        choices: [
            { kind: 'support', gem: '가속', fallbackKind: 'currency', currency: 'augment', fallbackValue: 2, label: '보조 젬 - 가속', desc: '공격 속도를 높이는 보조 젬을 얻습니다.' },
            { kind: 'support', gem: '무자비', fallbackKind: 'currency', currency: 'augment', fallbackValue: 2, label: '보조 젬 - 무자비', desc: '치명타 피해를 높이는 보조 젬을 얻습니다.' },
            { kind: 'support', gem: '활력', fallbackKind: 'currency', currency: 'augment', fallbackValue: 2, label: '보조 젬 - 활력', desc: '생명력 재생을 제공하는 보조 젬을 얻습니다.' },
            { kind: 'support', gem: '갑주 파쇄', fallbackKind: 'currency', currency: 'augment', fallbackValue: 2, label: '보조 젬 - 갑주 파쇄', desc: '물리 빌드가 적의 물리 피해 감소를 파고들 수 있게 합니다.' },
            { kind: 'support', gem: '저항 침식', fallbackKind: 'currency', currency: 'augment', fallbackValue: 2, label: '보조 젬 - 저항 침식', desc: '원소/카오스 빌드가 적 저항을 음수까지 깎아낼 수 있게 합니다.' }
        ]
    },
    6: {
        title: '액트 7 클리어 보상',
        body: '다음 중 하나의 능력치를 얻을 수 있습니다.',
        choices: [
            { kind: 'stat', stat: 'resChaos', value: 10, label: '카오스 저항 +10%', desc: '카오스 피해 구간을 더 안정적으로 통과합니다.' },
            { kind: 'stat', stat: 'dr', value: 6, label: '물리 피해 감소 +6%', desc: '기본 물리 방어력을 강화합니다.' },
            { kind: 'stat', stat: 'regen', value: 0.8, label: '초당 재생 +0.8%', desc: '지속 회복을 확보합니다.' }
        ]
    },
    7: {
        title: '액트 8 클리어 보상',
        body: '다음 중 하나의 능력치를 얻을 수 있습니다.',
        choices: [
            { kind: 'stat', stat: 'meleePctDmg', value: 18, label: '근접 피해 +18%', desc: '근접 태그 스킬을 강화합니다.' },
            { kind: 'stat', stat: 'projectilePctDmg', value: 18, label: '투사체 피해 +18%', desc: '투사체 태그 스킬을 강화합니다.' },
            { kind: 'stat', stat: 'elementalPctDmg', value: 18, label: '원소 피해 +18%', desc: '원소 태그 스킬을 강화합니다.' }
        ]
    },
    8: {
        title: '액트 9 클리어 보상',
        body: '다음 중 하나의 능력치를 얻을 수 있습니다.',
        choices: [
            { kind: 'stat', stat: 'crit', value: 5, label: '치명타 확률 +5%', desc: '치명타 발생 빈도를 높입니다.' },
            { kind: 'stat', stat: 'critDmg', value: 30, label: '치명타 피해 +30%', desc: '치명타 한 방의 무게를 늘립니다.' },
            { kind: 'stat', stat: 'leech', value: 1.5, label: '흡혈 +1.5%', desc: '공격 시 회복량을 강화합니다.' },
            { kind: 'stat', stat: 'physIgnore', value: 6, label: '물피감 무시 +6%', desc: '중갑 적을 상대로 물리 빌드의 화력을 안정적으로 확보합니다.' },
            { kind: 'stat', stat: 'resPen', value: 6, label: '저항 관통 +6%', desc: '원소/카오스 빌드가 저항을 뚫고 더 깊은 피해를 넣게 합니다.' }
        ]
    },
    9: {
        title: '액트 10 클리어 보상',
        body: '액트 완료 보상입니다.',
        choices: [
            { kind: 'points', value: 3, label: '패시브 포인트 +3', desc: '즉시 패시브 포인트 3점을 획득합니다.' },
            { kind: 'stat', stat: 'gemLevel', value: 1, label: '젬 레벨 보너스 +1', desc: '모든 장착 젬의 유효 레벨을 1 올립니다.' },
            { kind: 'stat', stat: 'suppCap', value: 1, label: '보조 젬 한도 +1', desc: '동시에 장착할 수 있는 보조 젬 수가 늘어납니다.' }
        ]
    }
};


safeExposeData({ ACT_REWARD_DB });
