if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/rewards.js');

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
        // 루프 첫 처치 확정 지급(LOOP_STARTER_GEM_BY_HERO)으로 이미 공격 스킬 젬 하나를
        // 들고 있는 시점이라, 여기서 또 공격 젬을 고르게 하면 선택이 겹치거나 무의미해진다.
        // 대신 방금 얻은 공격 스킬을 살려줄 보조 젬을 고르게 한다.
        title: '액트 2 클리어 보상',
        body: '떨어진 곳에서 당신이 찾아낸 젬은, 아직 이름을 부르지 못한 힘을 품고 있었다. 하나를 골라 지금 쓰는 스킬을 벼리세요.',
        choices: [
            { kind: 'support', gem: '가벼운 발걸음', fallbackKind: 'points', fallbackValue: 1, label: '보조 젬 - 가벼운 발걸음', desc: '이동 속도를 높여 맵 진행을 빠르게 합니다.' },
            { kind: 'support', gem: '날카로움', fallbackKind: 'points', fallbackValue: 1, label: '보조 젬 - 날카로움', desc: '치명타 확률을 높이는 보조 젬을 얻습니다.' },
            { kind: 'support', gem: '정밀 하한', fallbackKind: 'points', fallbackValue: 1, label: '보조 젬 - 정밀 하한', desc: '피해 하한을 올려 딜 편차를 줄입니다.' },
            { kind: 'support', gem: '방어 상승', fallbackKind: 'points', fallbackValue: 1, label: '보조 젬 - 방어 상승', desc: '물리 피해 감소를 올려 생존력을 보탭니다.' }
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
        body: '원소 저항을 선택해 강화할 수 있습니다.',
        choices: [
            { kind: 'stat', stat: 'resF', value: 9, label: '화염 저항 +9%', desc: '영구적으로 화염 저항을 올립니다.' },
            { kind: 'stat', stat: 'resC', value: 9, label: '냉기 저항 +9%', desc: '영구적으로 냉기 저항을 올립니다.' },
            { kind: 'stat', stat: 'resL', value: 9, label: '번개 저항 +9%', desc: '영구적으로 번개 저항을 올립니다.' },
            { kind: 'stat', stat: 'resAll', value: 3, label: '모든 원소 저항 +3%', desc: '영구적으로 화염/냉기/번개 저항을 모두 올립니다.' }
        ]
    },
    4: {
        title: '액트 5 클리어 보상',
        body: '다음 중 하나의 능력치를 얻을 수 있습니다.',
        choices: [
            { kind: 'stat', stat: 'pctHp', value: 8, label: '최대 생명력 +8%', desc: '최대 생명력을 비율로 크게 높입니다.' },
            { kind: 'stat', stat: 'aspd', value: 6, label: '공격 속도 +6%', desc: '더 빠른 공격 템포를 확보합니다.' },
            { kind: 'stat', stat: 'move', value: 8, label: '이동 속도 +8%', desc: '맵 진행과 포지셔닝을 개선합니다.' }
        ]
    },
    5: {
        title: '액트 6 클리어 보상',
        body: '가져갈 보조 스킬 젬 하나를 선택하세요.',
        choices: [
            { kind: 'support', gem: '가속', fallbackKind: 'currency', currency: 'magicBud', fallbackValue: 2, label: '보조 젬 - 가속', desc: '공격 속도를 높이는 보조 젬을 얻습니다.' },
            { kind: 'support', gem: '무자비', fallbackKind: 'currency', currency: 'magicBud', fallbackValue: 2, label: '보조 젬 - 무자비', desc: '치명타 피해를 높이는 보조 젬을 얻습니다.' },
            { kind: 'support', gem: '활력', fallbackKind: 'currency', currency: 'magicBud', fallbackValue: 2, label: '보조 젬 - 활력', desc: '생명력 재생을 제공하는 보조 젬을 얻습니다.' },
            { kind: 'support', gem: '갑주 파쇄', fallbackKind: 'currency', currency: 'magicBud', fallbackValue: 2, label: '보조 젬 - 갑주 파쇄', desc: '물리 빌드가 적의 물리 피해 감소를 파고들 수 있게 합니다.' },
            { kind: 'support', gem: '저항 침식', fallbackKind: 'currency', currency: 'magicBud', fallbackValue: 2, label: '보조 젬 - 저항 침식', desc: '원소/카오스 빌드가 적 저항을 음수까지 깎아낼 수 있게 합니다.' }
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
            { kind: 'stat', stat: 'crit', value: 2.5, label: '치명타 확률 +2.5%', desc: '치명타 발생 빈도를 높입니다.' },
            { kind: 'stat', stat: 'critDmg', value: 30, label: '치명타 피해 +30%', desc: '치명타 한 방의 무게를 늘립니다.' },
            { kind: 'stat', stat: 'leech', value: 0.8, label: '흡혈 +0.8%', desc: '공격 시 흡혈 인스턴스에 저장되는 회복량을 늘립니다.' },
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
