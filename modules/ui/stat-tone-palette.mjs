import { REGION_AFFIX_TONES, REGION_AFFIX_MODS } from '../data/region-affixes.mjs';

// The single colour source for equipment options, prose, and canvas labels.
const ITEM_STAT_TONE_BY_ID = Object.freeze(Object.fromEntries([
    ['#ff9a76', ['firePctDmg', 'resF', 'igniteChance', 'fireResOvercapMulPerPct']],
    ['#8fd3ff', ['coldPctDmg', 'resC', 'freezeChance']],
    ['#ffe083', ['lightPctDmg', 'resL', 'shockChance']],
    ['#c7a6ff', ['chaosPctDmg', 'resChaos', 'dotPctDmg', 'poisonChance']],
    ['#ffd2a6', ['armor', 'armorPct', 'dr', 'takenDamageReduceWhen1EnemyPct', 'takenDamageReduceWhen2EnemiesPct']],
    ['#baffc2', ['evasion', 'evasionPct', 'deflectChance', 'deflectDamageReduce']],
    ['#8fdcff', ['energyShield', 'energyShieldPct', 'energyShieldRegen', 'energyShieldRechargeFaster']],
    ['#ffb3b3', ['flatHp', 'pctHp', 'regen', 'regenFlat']],
    ['#ffd6f2', ['crit', 'critDmg']],
    ['#fff3a8', ['aspd', 'move', 'sight', 'cooldownRecovery', 'cooldownReduction', 'mobilityCooldownRecovery', 'mobilityCooldownReduction']],
    ['#ffcf9f', ['flatDmg', 'pctDmg', 'physPctDmg', 'meleePctDmg', 'aoePctDmg', 'minDmgRoll', 'maxDmgRoll',
        'bossDamagePct', 'eliteDamagePct', 'firstStrikeDamagePct', 'doubleDamageChance']],
    ['#d4a8ff', ['spellFlatPct', 'spellFlatDmg']],
    ['#ff8fa3', ['leech']],
    ['#ffcb8e', ['resPen', 'resAll', 'ds']],
    ['#a8e6cf', ['gemLevel', 'suppCap', 'expGain', 'summonEfficiency', 'summonCap']],
    // 세계수 기운(12번 루프 27): 지역 줄은 그 지역 색(data/region-affixes.js REGION_AFFIX_TONES).
    ...REGION_AFFIX_MODS.map(row => [REGION_AFFIX_TONES[row.regions[0]], [row.statId]])
].flatMap(([tone, ids]) => ids.map(id => [id, tone]))));

// First matching family wins; resistance/penetration intentionally precede elements.
const STAT_TONE_FAMILIES = Object.freeze([
    [
        "#ffcb8e",
        [
            "res",
            "pen"
        ]
    ],
    [
        "#c7a6ff",
        [
            "chaos",
            "dot",
            "poison",
            "bleed"
        ]
    ],
    [
        "#ff9a76",
        [
            "fire",
            "ignite",
            "burn"
        ]
    ],
    [
        "#8fd3ff",
        [
            "cold",
            "freeze",
            "chill"
        ]
    ],
    [
        "#ffe083",
        [
            "light",
            "shock"
        ]
    ],
    [
        "#ffb3b3",
        [
            "hp",
            "life",
            "regen",
            "leech"
        ]
    ],
    [
        "#ffd2a6",
        [
            "armor",
            "block",
            "guard",
            "dr"
        ]
    ],
    [
        "#baffc2",
        [
            "evasion",
            "dodge",
            "deflect"
        ]
    ],
    [
        "#8fdcff",
        [
            "energyshield",
            "es"
        ]
    ],
    [
        "#ffd6f2",
        [
            "crit"
        ]
    ],
    [
        "#fff3a8",
        [
            "aspd",
            "speed",
            "move"
        ]
    ],
    [
        "#d4a8ff",
        [
            "spell"
        ]
    ],
    [
        "#a8e6cf",
        [
            "gem",
            "supp"
        ]
    ],
    [
        "#ffcf9f",
        [
            "dmg",
            "atk",
            "phys",
            "melee",
            "aoe"
        ]
    ]
]);

export function getItemStatToneColor(statId) {
    if (!statId) return '#d7e9ff';
    const id = String(statId);
    if (ITEM_STAT_TONE_BY_ID[id]) return ITEM_STAT_TONE_BY_ID[id];
    const low = id.toLowerCase();
    const family = STAT_TONE_FAMILIES.find(([, words]) => words.some(word => low.includes(word)));
    return family ? family[0] : '#d7e9ff';
}
