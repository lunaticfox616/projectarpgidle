

export const ROWS = /* @__PURE__ */ Object.freeze([['n1'], ['n2', 'n3'], ['n4', 'n5', 'n6'], ['n7', 'n8', 'n9'], ['n10'], ['n11', 'n12'], ['n13a', 'n13b', 'n13c', 'n13d']]);

export const RANK = /* @__PURE__ */ Object.freeze({ n10: '궁극 노드', n11: '4차 핵심', n12: '4차 핵심', n13a: '재능 특화', n13b: '재능 특화', n13c: '전직 특화', n13d: '전직 특화' });

export const ICONS = /* @__PURE__ */ Object.freeze({
        pctDmg: 'sword', flatDmg: 'sword', meleePctDmg: 'sword', physPctDmg: 'sword', slamPctDmg: 'sword', attackPctDmg: 'sword',
        elementalPctDmg: 'flame', firePctDmg: 'flame', coldPctDmg: 'drop', lightPctDmg: 'up', chaosPctDmg: 'drop', dotPctDmg: 'flame',
        spellPctDmg: 'star', projectilePctDmg: 'reticle', aoePctDmg: 'split', summonPctDmg: 'fork', summonHpPct: 'heart',
        pctHp: 'heart', flatHp: 'heart', regen: 'drop', leech: 'leech', dr: 'shield', armor: 'shield', armorPct: 'shield',
        evasion: 'boot', evasionPct: 'boot', energyShield: 'shield', resAll: 'shield', resChaos: 'shield', blockChance: 'shield',
        aspd: 'speed', ds: 'speed', move: 'boot', crit: 'crit', critDmg: 'eye', resPen: 'pierce', physIgnore: 'physIgnore', suppCap: 'star'
    });

export const NODE_TEXT = /* @__PURE__ */ Object.freeze({ taken: '할당', open: '할당 가능', nopoint: '포인트 없음', locked: '선행 노드 필요', closed: '짝 노드를 할당해 닫힘', future: '아직 열리지 않음' });

export const KEYSTONE_TEXT = /* @__PURE__ */ Object.freeze({ taken: '할당', open: '할당 가능', nopoint: '키스톤 포인트 없음', full: '5개 모두 할당', locked: '선행 키스톤 필요', fifth: '5차 전직 필요' });

export const ROW_LABEL = /* @__PURE__ */ Object.freeze({ n10: '궁극', n11: '4차 핵심', n13a: '특화' });

export const KEYSTONE_HALF_WIDTH = 14;

export const NODE_ACTIONS = /* @__PURE__ */ Object.freeze({ taken: '반환', open: '할당' });

export const KEYSTONE_ACTIONS = /* @__PURE__ */ Object.freeze({ taken: '반환', open: '할당' });

export const KEYSTONE_ART = /* @__PURE__ */ Object.freeze([['소환', 'summon'], ['카오스', 'chaos'], ['화염', 'fire'], ['점화', 'ignite'], ['냉기', 'cold'], ['동결', 'freeze'], ['냉각', 'chill'],
        ['번개', 'lightning'], ['감전', 'shock'], ['중독', 'poison'], ['출혈', 'bleed'], ['지속', 'damageOverTime'], ['투사체', 'projectile'], ['강타', 'slam'], ['근접', 'blade'],
        ['주문', 'spell'], ['에너지', 'energyShield'], ['ES', 'energyShield'], ['회피', 'evasion'], ['막기', 'shield'], ['방어', 'armor'], ['생명력', 'life'], ['재생', 'life'], ['흡수', 'life'],
        ['이동', 'wind'], ['공격 속도', 'precision'], ['치명타', 'critical'], ['원소', 'elemental'], ['저항', 'elemental'], ['물리', 'blade'], ['연속', 'cycle'], ['보조스킬룬', 'arcane'], ['룬', 'arcane']]);
