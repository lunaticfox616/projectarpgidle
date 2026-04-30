function safeExposeData(map) {
  Object.keys(map || {}).forEach(function (key) {
    if (typeof window[key] === "undefined") window[key] = map[key];
  });
}

// Phase-1 extracted data (global compatibility).
const SKILL_DB = {
    '기본 공격': { isGem: false, baseDmg: 1.0, baseSpd: 1.0, leech: 0, crit: 0, ele: 'phys', targetMode: 'single', targets: 1, desc: '가장 가까운 적 하나를 가격합니다.', tags: ['attack', 'melee', 'physical'] },
    '연속 베기': { isGem: true, baseDmg: 0.65, baseSpd: 1.8, leech: 0, crit: 0, dmgScale: 0.03, spdScale: 0.04, ele: 'phys', targetMode: 'cleave', targets: 2, desc: '전방 두 적을 빠르게 벱니다.', tags: ['attack', 'melee', 'physical'] },
    '묵직한 강타': { isGem: true, baseDmg: 2.5, baseSpd: 0.5, leech: 0, crit: 5, dmgScale: 0.15, spdScale: 0, ele: 'phys', targetMode: 'single', targets: 1, desc: '단일 적에게 강한 일격을 가합니다.', tags: ['attack', 'melee', 'physical', 'slam'] },
    '흡혈 타격': { isGem: true, baseDmg: 0.95, baseSpd: 1.0, leech: 0.5, crit: 0, dmgScale: 0.04, spdScale: 0, ele: 'chaos', targetMode: 'single', targets: 1, desc: '카오스 피해와 흡혈이 붙은 일격입니다.', tags: ['attack', 'melee', 'chaos'] },
    '암살자의 일격': { isGem: true, baseDmg: 1.35, baseSpd: 0.9, leech: 0, crit: 15, dmgScale: 0.05, spdScale: 0.01, ele: 'phys', targetMode: 'single', targets: 1, desc: '치명타 특화 단일 처형기입니다.', tags: ['attack', 'melee', 'physical'] },
    '회오리바람': { isGem: true, baseDmg: 0.34, baseSpd: 1.65, leech: 0, crit: 0, dmgScale: 0.014, spdScale: 0.04, ele: 'phys', targetMode: 'whirl', targets: 6, desc: '근처 적 최대 6기를 연속으로 베어 다수전에 대응합니다.', tags: ['attack', 'melee', 'physical', 'aoe'] },
    '번개 타격': { isGem: true, baseDmg: 1.15, baseSpd: 1.15, leech: 0, crit: 5, dmgScale: 0.06, spdScale: 0.03, ele: 'light', targetMode: 'chain', targets: 3, desc: '첫 대상 이후 주변 적으로 번개가 튑니다.', tags: ['attack', 'melee', 'elemental', 'lightning', 'chain'] },
    '얼음 창': { isGem: true, baseDmg: 1.7, baseSpd: 0.75, leech: 0, crit: 20, dmgScale: 0.1, spdScale: 0, ele: 'cold', targetMode: 'pierce', targets: 2, desc: '적 둘을 꿰뚫는 고위력 빙창입니다.', tags: ['attack', 'projectile', 'elemental', 'cold'] },
    '화염 참격': { isGem: true, baseDmg: 1.2, baseSpd: 1.05, leech: 0, crit: 5, dmgScale: 0.07, spdScale: 0.02, ele: 'fire', targetMode: 'cleave', targets: 2, desc: '화염이 실린 근접 참격입니다.', tags: ['attack', 'melee', 'elemental', 'fire'] },
    '독창 투척': { isGem: true, baseDmg: 1.0, baseSpd: 1.15, leech: 0, crit: 8, dmgScale: 0.05, spdScale: 0.03, ele: 'chaos', targetMode: 'chain', targets: 2, desc: '독이 스민 창을 던져 연쇄 타격합니다.', tags: ['attack', 'projectile', 'chaos'] },
    '서리 폭발': { isGem: true, baseDmg: 1.45, baseSpd: 0.8, leech: 0, crit: 12, dmgScale: 0.09, spdScale: 0.01, ele: 'cold', targetMode: 'all', targets: 99, desc: '주변 전장을 얼리는 범위 폭발입니다.', tags: ['attack', 'aoe', 'elemental', 'cold'] },
    '번개 창': { isGem: true, baseDmg: 1.4, baseSpd: 0.95, leech: 0, crit: 10, dmgScale: 0.08, spdScale: 0.02, ele: 'light', targetMode: 'pierce', targets: 3, desc: '관통하는 번개 투사체를 발사합니다.', tags: ['attack', 'projectile', 'elemental', 'lightning'] },
    '지진 파쇄': { isGem: true, baseDmg: 1.9, baseSpd: 0.6, leech: 0, crit: 0, dmgScale: 0.11, spdScale: 0.01, ele: 'phys', targetMode: 'all', targets: 99, desc: '지면을 깨뜨려 주변 적 다수를 공격합니다.', tags: ['attack', 'melee', 'physical', 'aoe', 'slam'] },
    '용암 강타': { isGem: true, baseDmg: 1.55, baseSpd: 0.82, leech: 0, crit: 4, dmgScale: 0.08, spdScale: 0.02, ele: 'fire', targetMode: 'cleave', targets: 3, desc: '전방을 휩쓰는 용암 파동을 동반한 강타입니다.', tags: ['attack', 'melee', 'elemental', 'fire', 'aoe', 'slam'] },
    '관통 사격': { isGem: true, baseDmg: 1.25, baseSpd: 1.08, leech: 0, crit: 7, dmgScale: 0.07, spdScale: 0.03, ele: 'phys', targetMode: 'pierce', targets: 4, desc: '적 무리를 꿰뚫는 장거리 일제 사격입니다.', tags: ['attack', 'projectile', 'physical'] },
    '연쇄 폭풍': { isGem: true, baseDmg: 1.3, baseSpd: 1.0, leech: 0, crit: 9, dmgScale: 0.08, spdScale: 0.02, ele: 'light', targetMode: 'chain', targets: 4, desc: '번개가 여러 적 사이를 튀며 확산됩니다.', tags: ['attack', 'elemental', 'lightning', 'chain'] },
    '공허 베기': { isGem: true, baseDmg: 1.5, baseSpd: 0.92, leech: 0.4, crit: 6, dmgScale: 0.08, spdScale: 0.01, ele: 'chaos', targetMode: 'cleave', targets: 3, desc: '공허의 칼날로 전방 적을 갈라냅니다.', tags: ['attack', 'melee', 'chaos', 'aoe'] },
    '혈기 폭쇄': { isGem: true, baseDmg: 1.1, baseSpd: 0.95, leech: 0.2, crit: 4, dmgScale: 0.06, spdScale: 0.02, ele: 'phys', targetMode: 'single', targets: 1, hpDmgScale: 0.000175, desc: '최대 생명력이 높을수록 추가 피해를 주는 일격입니다.', tags: ['attack', 'melee', 'physical', 'blood'] },
    '불멸의 진동': { isGem: true, baseDmg: 1.0, baseSpd: 0.9, leech: 0, crit: 3, dmgScale: 0.05, spdScale: 0.02, hpDmgScale: 0.000125, regenDmgScale: 4.2, desc: '생명력과 재생력을 피해로 전환하는 충격파입니다.', ele: 'phys', targetMode: 'cleave', targets: 4, tags: ['attack', 'aoe', 'physical'] },
    '화염 부패': { isGem: true, baseDmg: 0.42, baseSpd: 0.78, leech: 0, crit: 0, dmgScale: 0.03, spdScale: 0.01, ele: 'fire', targetMode: 'all', targets: 99, hpDmgScale: 0.00009, fireResDmgScale: 0.006, dotMultiplier: 1.45, spellFlatBase: 7, spellFlatScale: 1.5, desc: '공격력 없이 생명력/화염 저항 계수로 화염 지속 피해를 퍼뜨립니다.', hideCombatScales: ['regen', 'fireRes'], tags: ['spell', 'dot', 'aoe', 'fire'] },
    '빙결 침식': { isGem: true, baseDmg: 0.36, baseSpd: 0.84, leech: 0, crit: 0, dmgScale: 0.025, spdScale: 0.01, ele: 'cold', targetMode: 'all', targets: 99, dotMultiplier: 1.35, spellFlatBase: 24, spellFlatScale: 5.2, desc: '냉기 지속 피해를 광역으로 퍼뜨리는 주문입니다.', tags: ['spell', 'dot', 'aoe', 'cold'] },
    '서리 파동': { isGem: true, baseDmg: 1.08, baseSpd: 0.95, leech: 0, crit: 8, dmgScale: 0.05, spdScale: 0.02, ele: 'cold', targetMode: 'cleave', targets: 3, spellFlatBase: 20, spellFlatScale: 4.5, desc: '전방으로 퍼지는 냉기 파동 주문입니다.', tags: ['spell', 'cold', 'aoe'] },
    '뇌운 낙뢰': { isGem: true, baseDmg: 1.0, baseSpd: 1.02, leech: 0, crit: 10, dmgScale: 0.05, spdScale: 0.02, ele: 'light', targetMode: 'chain', targets: 4, spellFlatBase: 22, spellFlatScale: 4.8, desc: '번개를 연쇄시키는 주문입니다.', tags: ['spell', 'lightning', 'chain'] },
    '심연 전염': { isGem: true, baseDmg: 0.32, baseSpd: 0.88, leech: 0, crit: 0, dmgScale: 0.02, spdScale: 0.01, ele: 'chaos', targetMode: 'all', targets: 99, dotMultiplier: 1.5, spellFlatBase: 23, spellFlatScale: 5.4, desc: '카오스 지속 피해를 전염시키는 주문입니다.', tags: ['spell', 'dot', 'chaos', 'aoe'] },
    '독니 사출': { isGem: true, baseDmg: 1.18, baseSpd: 1.18, leech: 0, crit: 7, dmgScale: 0.06, spdScale: 0.03, ele: 'chaos', targetMode: 'pierce', targets: 3, desc: '독니 투사체를 발사하는 공격 스킬입니다.', tags: ['attack', 'projectile', 'chaos'] },
    '연발 사격': { isGem: true, baseDmg: 0.9, baseSpd: 1.34, leech: 0, crit: 5, dmgScale: 0.05, spdScale: 0.04, ele: 'phys', targetMode: 'chain', targets: 3, desc: '연속으로 투사체를 발사하는 공격 스킬입니다.', tags: ['attack', 'projectile', 'physical'] },
    '폭열 창탄': { isGem: true, baseDmg: 1.26, baseSpd: 1.02, leech: 0, crit: 8, dmgScale: 0.06, spdScale: 0.03, ele: 'fire', targetMode: 'pierce', targets: 4, desc: '화염 투사체가 적을 관통하는 공격 스킬입니다.', tags: ['attack', 'projectile', 'fire', 'elemental'] },
    '암흑 파열': { isGem: true, baseDmg: 1.04, baseSpd: 0.98, leech: 0, crit: 9, dmgScale: 0.05, spdScale: 0.02, ele: 'chaos', targetMode: 'single', targets: 1, spellFlatBase: 26, spellFlatScale: 5.0, desc: '단일 적을 찢는 카오스 주문입니다.', tags: ['spell', 'chaos'] },
    '중력 붕괴': { isGem: true, baseDmg: 1.1, baseSpd: 0.9, leech: 0, crit: 6, dmgScale: 0.05, spdScale: 0.02, ele: 'phys', targetMode: 'cleave', targets: 3, spellFlatBase: 27, spellFlatScale: 5.3, desc: '물리 충격을 일으키는 주문입니다.', tags: ['spell', 'physical', 'aoe'] }
};


safeExposeData({ SKILL_DB });
