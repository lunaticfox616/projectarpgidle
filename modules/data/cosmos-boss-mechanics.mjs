export const COSMOS_GALAXY_BOSS_MECHANICS = Object.freeze({
    'planet-46': Object.freeze({
        id: 'orbitalCollision', name: '궤도 충돌', specialEvery: 4, damageMul: 1.42,
        damageScale: 0.32, elementRule: 'physical', telegraphKind: 'lane',
        summary: '네 번째 공격마다 방어도로 줄일 수 있는 강한 물리 충돌을 일으킵니다.',
        counter: '방어도/막기 또는 물리 피해 전환을 준비하세요.'
    }),
    'planet-47': Object.freeze({
        id: 'abyssalTide', name: '심해의 역류', specialEvery: 4, damageMul: 1.18,
        elementRule: 'chaos', telegraphKind: 'wave', shieldRestorePct: 8, hpScale: 0.62, damageScale: 0.30,
        summary: '네 번째 공격마다 카오스 역류와 함께 잃은 성간 보호막을 회복합니다.',
        counter: '카오스 EHP와 지속 화력으로 보호막 회복을 다시 돌파하세요.'
    }),
    'planet-48': Object.freeze({
        id: 'twinBalance', name: '쌍성의 균형', specialEvery: 2, damageMul: 1.30,
        elementRule: 'alternatingWeakest', telegraphKind: 'split', hpScale: 1.10, damageScale: 0.32,
        summary: '물리 타격과 가장 취약한 속성 타격을 번갈아 사용합니다.',
        counter: '한 방어만 높이기보다 물리/속성 EHP의 최저점을 보완하세요.'
    }),
    'planet-49': Object.freeze({
        id: 'finalJudgment', name: '최저항 심판', specialEvery: 3, damageMul: 1.45,
        damageScale: 0.27, elementRule: 'weakestResistance', telegraphKind: 'beam', debuffType: 'cosmos_res_down', hpScale: 1.15,
        summary: '세 번째 공격마다 가장 낮은 저항을 읽어 해당 속성으로 심판합니다.',
        counter: '최저 저항을 보완하고 저항 감소에 버틸 초과 저항을 확보하세요.'
    }),
    'planet-45': Object.freeze({
        id: 'cometCharge', name: '혜성 돌진', specialEvery: 4, damageMul: 1.70,
        damageScale: 0.31, elementRule: 'physical', telegraphKind: 'charge', moveCounterPct: 35, hpScale: 1.20,
        summary: '네 번째 공격마다 강한 돌진을 사용하며 이동 속도로 충격을 흘릴 수 있습니다.',
        counter: '이동 속도 170%에서 돌진의 추가 피해를 최대 35%까지 줄입니다.'
    })
});
