export const NO_RUNE_BONUS_LEVELS = /* @__PURE__ */ Object.freeze({ permanentSkyBonus: 0, materialBonus: 0, engraveLevel: 0 });

export const FOSSIL_SURPLUS_REFINING_COSTS = /* @__PURE__ */ Object.freeze({
    fossil: 20,
    fossilJagged: 12,
    fossilBound: 12,
    fossilGale: 12,
    fossilPrismatic: 12,
    fossilAbyssal: 16,
    fossilBulwark: 12,
    fossilWedge: 12
});

export const GEM_LEVEL_TAG_RULES = [
    { stat: 'elementalGemLevel', tag: 'elemental' },
    { stat: 'fireGemLevel', tag: 'fire' },
    { stat: 'coldGemLevel', tag: 'cold' },
    { stat: 'lightGemLevel', tag: 'lightning' },
    { stat: 'chaosGemLevel', tag: 'chaos' },
    { stat: 'physGemLevel', tag: 'physical' },
    { stat: 'projectileGemLevel', tag: 'projectile' },
    { stat: 'meleeGemLevel', tag: 'melee' },
    { stat: 'slamGemLevel', tag: 'slam' },
    { stat: 'spellGemLevel', tag: 'spell' },
    { stat: 'dotGemLevel', tag: 'dot' },
    { stat: 'aoeGemLevel', tag: 'aoe' },
    { stat: 'summonGemLevel', tag: 'summon' },
    // 능력치 태그(2026-10-28 사용자: 설계자의 힘/민첩/지능 스킬 룬 레벨). 룬마다 data/skills.js tags에 하나나 둘이 붙는다.
    { stat: 'strGemLevel', tag: 'strength' },
    { stat: 'dexGemLevel', tag: 'dexterity' },
    { stat: 'intGemLevel', tag: 'intelligence' }
];

export const SKILL_RUNE_FIT_WEIGHT = 3;

export const SKILL_COOLDOWN_RULES = /* @__PURE__ */ Object.freeze({ reductionCapPct: 60, floorMs: 250 });
