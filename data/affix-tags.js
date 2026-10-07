// 옵션 태그(2026-10-07, 드랍 풀 2단계 B, docs/affix-kinds-tags-plan-20261007.md). 태그는 줄이 아니라 능력치에 붙고, 복합 줄은
// 두 능력치 태그의 합이다. 혼돈 주입, 화석 전용 줄, 고유 줄도 같은 표를 쓴다. 이름은 스킬 태그와 홀씨, 품질 모드에 맞춘다
// (summon, aoe, light, defense).

const AFFIX_TAG_LABELS = Object.freeze({
    damage: '피해', attack: '공격', spell: '주문', summon: '소환', physical: '물리', elemental: '원소', fire: '화염', cold: '냉기',
    light: '번개', chaos: '카오스', crit: '치명', speed: '속도', dot: '지속', projectile: '투사체', melee: '근접', aoe: '범위',
    target: '타겟', life: '생명', defense: '방어', resistance: '저항', recovery: '회복', penetration: '관통', attribute: '능력치', gem: '젬'
});

const STAT_AFFIX_TAGS = Object.freeze(Object.fromEntries(Object.entries({
    flatDmg: 'damage attack physical', weaponFlatDmgPct: 'damage attack physical', pctDmg: 'damage',
    meleePctDmg: 'damage attack melee', projectilePctDmg: 'damage projectile', physPctDmg: 'damage physical',
    elementalPctDmg: 'damage elemental', firePctDmg: 'damage elemental fire', coldPctDmg: 'damage elemental cold',
    lightPctDmg: 'damage elemental light', chaosPctDmg: 'damage chaos', aoePctDmg: 'damage aoe', dotPctDmg: 'damage dot',
    summonFlatDmg: 'damage summon', summonPctDmg: 'damage summon', summonHpPct: 'summon life', summonAspd: 'attack summon speed',
    summonCrit: 'summon crit', summonCritDmg: 'damage summon crit', summonEfficiency: 'summon', summonCap: 'summon',
    summonResPen: 'summon elemental penetration', summonGemLevel: 'summon gem', spellFlatDmg: 'damage spell', spellFlatPct: 'damage spell',
    flatHp: 'life', strength: 'attribute', dexterity: 'attribute', intelligence: 'attribute', accuracy: 'attack',
    armor: 'defense', evasion: 'defense', energyShield: 'defense', armorPct: 'defense', evasionPct: 'defense', deflectChance: 'defense',
    energyShieldPct: 'defense', pctHp: 'life', aspd: 'attack speed', crit: 'crit', move: 'speed', gemLevel: 'gem',
    physIgnore: 'physical penetration', resF: 'elemental fire resistance', resC: 'elemental cold resistance',
    resL: 'elemental light resistance', resAll: 'elemental resistance', resChaos: 'chaos resistance', resPen: 'elemental penetration',
    regen: 'life recovery', regenFlat: 'life recovery', regenSuppress: 'dot', targetAny: 'target', targetProjectile: 'projectile target',
    projectileExtraChance: 'projectile target', targetSlam: 'melee aoe target', leech: 'attack life recovery',
    leechRateCap: 'life recovery', leechTotalCap: 'life recovery', leechInstanceCap: 'life recovery', dr: 'physical defense',
    critDmg: 'damage crit', ds: 'attack speed', minDmgRoll: 'damage', maxDmgRoll: 'damage', suppCap: 'gem',
    blockChancePct: 'defense', blockChance: 'defense', maxResF: 'elemental fire resistance', maxResC: 'elemental cold resistance',
    maxResL: 'elemental light resistance', maxResChaos: 'chaos resistance', maxResAll: 'elemental resistance', spellGemLevel: 'spell gem',
    physFlatDmg: 'damage physical', fireFlatDmg: 'damage elemental fire', coldFlatDmg: 'damage elemental cold',
    lightFlatDmg: 'damage elemental light', chaosFlatDmg: 'damage chaos', attackPctDmg: 'damage attack', spellPctDmg: 'damage spell',
    spellLeech: 'spell life recovery', slamPctDmg: 'damage attack melee aoe', slamGemLevel: 'attack melee aoe gem',
    bleedChance: 'attack physical dot', meleeGemLevel: 'attack melee gem', projectileGemLevel: 'projectile gem', accuracyBonusPct: 'attack',
    elementalGemLevel: 'elemental gem', spellCritDmg: 'damage spell crit', potionPctDmg: 'damage projectile', poisonChance: 'chaos dot',
    lightGemLevel: 'elemental light gem',
    // 추가 옵션 표(MOD_DB)에 없고 고유 줄과 바다의 작업대에 나오는 능력치.
    igniteChance: 'elemental fire dot', igniteDamageMultiplierPct: 'damage elemental fire dot', freezeChance: 'elemental cold',
    chillEffect: 'elemental cold', shockChance: 'elemental light', shockEffect: 'elemental light', poisonDamageMultiplierPct: 'damage chaos dot',
    bossDamagePct: 'damage', eliteDamagePct: 'damage', firstStrikeDamagePct: 'damage', cullStrikePct: 'damage'
}).map(([stat, tags]) => [stat, Object.freeze(tags.split(' '))])));

// 화폐가 노리는 능력치 목록. any 태그 하나가 있고 none 태그는 없는 능력치에 plus를 더하고 minus를 뺀다. plus와 minus는
// 손으로 적던 목록(2026-10-07 전)과 똑같이 맞춘 예외다. 예외를 지우면 태그 그대로의 목록이 된다(B2, 목록마다 정한다).
// 목록은 굴러 나오는 능력치(MOD_DB) 안에서 고르고, lines: 'any'(품질)는 고유 줄에만 있는 능력치도 본다.
const AFFIX_TAG_LISTS = Object.freeze({
    spore: {
        fire: { any: ['fire'], plus: ['aspd', 'crit', 'critDmg', 'resPen', 'ds', 'targetAny', 'targetProjectile'], minus: ['maxResF'] },
        cold: { any: ['cold'], plus: ['crit', 'critDmg', 'aspd', 'ds', 'targetAny', 'targetProjectile'], minus: ['maxResC'] },
        light: { any: ['light'], plus: ['aspd', 'ds', 'crit', 'critDmg', 'targetAny', 'targetProjectile'], minus: ['maxResL', 'lightGemLevel'] },
        chaos: { any: ['chaos'], plus: ['dotPctDmg', 'resPen', 'leech', 'spellLeech', 'regenSuppress', 'targetAny', 'targetProjectile'],
            minus: ['maxResChaos', 'poisonChance'] },
        damage: { any: ['damage'], minus: ['weaponFlatDmgPct', 'meleePctDmg', 'projectilePctDmg', 'elementalPctDmg', 'aoePctDmg', 'summonFlatDmg',
            'summonPctDmg', 'summonCritDmg', 'spellFlatPct', 'minDmgRoll', 'maxDmgRoll', 'slamPctDmg', 'spellCritDmg', 'potionPctDmg'] }
    },
    // 부패 홀씨가 지우는 줄.
    rotSpore: { any: ['elemental'], none: ['summon', 'gem', 'penetration'], minus: ['resAll', 'maxResF', 'maxResC', 'maxResL', 'maxResAll'] },
    // 화석이 하나 확정하는 줄. 방패 화석(최대 저항)은 태그로 적을 수 없어 예외만 있다.
    fossil: {
        fossilJagged: { any: ['physical', 'melee'], none: ['defense'],
            minus: ['weaponFlatDmgPct', 'targetSlam', 'physFlatDmg', 'slamPctDmg', 'slamGemLevel', 'bleedChance', 'meleeGemLevel'] },
        fossilBound: { any: ['life', 'defense'], none: ['summon', 'recovery'], minus: ['deflectChance', 'blockChancePct', 'blockChance'] },
        fossilGale: { any: ['speed', 'crit'], none: ['summon', 'damage'], minus: ['ds'] },
        fossilPrismatic: { any: ['resistance'], none: ['chaos'], plus: ['elementalPctDmg', 'resPen'], minus: ['maxResF', 'maxResC', 'maxResL', 'maxResAll'] },
        fossilAbyssal: { any: ['chaos', 'recovery'], none: ['resistance', 'spell'],
            minus: ['regenFlat', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap', 'chaosFlatDmg', 'poisonChance'] },
        fossilPrimordial: { any: ['penetration', 'chaos'], none: ['resistance', 'summon'], plus: ['critDmg'], minus: ['chaosFlatDmg', 'poisonChance'] },
        fossilBulwark: { any: [], plus: ['maxResF', 'maxResC', 'maxResL'] },
        fossilWedge: { any: ['projectile', 'crit'], none: ['summon', 'gem', 'spell'], minus: ['targetProjectile', 'critDmg', 'potionPctDmg'] }
    },
    // 바다의 선물 계열(공격, 방어와 생명, 속도와 치명, 저항)이 고르는 줄.
    sea: {
        attack: { any: ['damage', 'crit', 'penetration'], none: ['spell'], minus: ['minDmgRoll', 'maxDmgRoll', 'attackPctDmg', 'slamPctDmg', 'potionPctDmg'] },
        defense: { any: ['defense', 'life'], none: ['summon', 'spell'], plus: ['regenSuppress'], minus: ['dr', 'blockChance'] },
        speed: { any: ['speed'], plus: ['summonEfficiency'], minus: ['ds'] },
        resistance: { any: ['resistance'], minus: ['maxResF', 'maxResC', 'maxResL', 'maxResChaos', 'maxResAll'] }
    },
    // 품질 속성(심연 촉매)이 키우는 줄.
    quality: {
        fire: { lines: 'any', any: ['fire'], minus: ['maxResF', 'fireFlatDmg'] },
        cold: { lines: 'any', any: ['cold'], minus: ['maxResC', 'coldFlatDmg'] },
        light: { lines: 'any', any: ['light'], minus: ['maxResL', 'lightFlatDmg', 'lightGemLevel'] },
        chaos: { lines: 'any', any: ['chaos'], plus: ['dotPctDmg'], minus: ['maxResChaos', 'chaosFlatDmg'] },
        physical: { lines: 'any', any: ['physical'], none: ['defense'], plus: ['maxDmgRoll', 'minDmgRoll'], minus: ['weaponFlatDmgPct', 'physFlatDmg'] },
        defense: { lines: 'any', any: ['defense', 'life'], none: ['summon', 'recovery'], plus: ['resAll'], minus: ['deflectChance', 'blockChancePct', 'blockChance'] },
        speed: { lines: 'any', any: ['speed'], none: ['summon'] }
    },
    // 독벌침이 무기에 붙이는 줄.
    venomStinger: { any: ['damage', 'crit', 'speed'], none: ['spell', 'gem', 'aoe', 'melee', 'projectile'], plus: ['resPen', 'leech'],
        minus: ['weaponFlatDmgPct', 'pctDmg', 'firePctDmg', 'coldPctDmg', 'lightPctDmg', 'dotPctDmg', 'move', 'ds', 'physFlatDmg', 'fireFlatDmg',
            'coldFlatDmg', 'lightFlatDmg', 'chaosFlatDmg', 'attackPctDmg'] }
});

/** Tags of one stat id (empty for a stat the table does not know). */
function getStatAffixTags(statId) {
    return STAT_AFFIX_TAGS[statId] || [];
}

/** Tags of an affix row or a rolled line: its stat's tags joined with the compound part's (extraStats on a line). */
function getAffixTags(entry) {
    if (!entry) return [];
    const parts = [entry.statId || entry.id, ...(entry.compound || entry.extraStats || []).map(part => part && (part.statId || part.id))];
    return [...new Set(parts.flatMap(getStatAffixTags))];
}

/** One of `any` and none of `none`. */
function matchesAffixTags(tags, query) {
    return (query.any || []).some(tag => tags.includes(tag)) && !(query.none || []).some(tag => tags.includes(tag));
}

/** The stat ids of an AFFIX_TAG_LISTS rule, among the stats that roll from modDb (plus every tagged stat for lines: 'any'). */
function resolveAffixTagList(rule, modDb) {
    const rolled = modDb.map(mod => mod.statId || mod.id);
    const universe = new Set(rule.lines === 'any' ? [...rolled, ...Object.keys(STAT_AFFIX_TAGS)] : rolled);
    const minus = new Set(rule.minus || []);
    const tagged = [...universe].filter(statId => matchesAffixTags(getStatAffixTags(statId), rule));
    return Object.freeze([...new Set([...tagged, ...(rule.plus || [])])].filter(statId => !minus.has(statId)));
}
