// Shared atlas coordinates and node dimensions; also read by the offline art packer.
export const PASSIVE_NODE_KIND_RADIUS = Object.freeze({
    start: 34,
    transcendent: 30,
    keystone: 31,
    void: 28,
    apex: 26,
    core: 24,
    deadend: 24,
    evolved: 24,
    major: 24,
    assist: 9
});

export const PASSIVE_NODE_SOURCE_RADIUS = Object.freeze({ major: 24, normal: 14, assist: 9, minor: 9 });

export const PASSIVE_START_ICON_FAMILY = Object.freeze({
    occultist: 'mystique',
    wanderer: 'blade',
    cleric: 'devotion',
    archer: 'projectile',
    alchemist: 'potion',
    warrior: 'blade'
});

export const PASSIVE_ICON_ATLAS_CELL = Object.freeze({
    blade: [0, 0], projectile: [1, 0], shield: [2, 0], potion: [3, 0], strength: [4, 0],
    mystique: [0, 1], devotion: [1, 1], cycle: [2, 1], elemental: [3, 1], dexterity: [4, 1],
    chaos: [0, 2], life: [1, 2], arcane: [2, 2], summon: [3, 2], intelligence: [4, 2],
    precision: [0, 3], wind: [1, 3], void: [2, 3], constellation: [3, 3],
    fire: [4, 3], cold: [0, 4], lightning: [1, 4], cooldown: [2, 4], critical: [3, 4], armor: [4, 4],
    evasion: [0, 5], energyShield: [1, 5], ignite: [2, 5], chill: [3, 5], freeze: [4, 5], shock: [0, 6], bleed: [1, 6], poison: [2, 6],
    // 2026-11-01 expansion-02: skill kinds and weapons, picked by hand or by the stat below
    wisp: [3, 6], blessing: [4, 6], mobility: [0, 7], area: [1, 7], slam: [2, 7], damageOverTime: [3, 7], spell: [4, 7],
    censer: [0, 8], greatsword: [1, 8], bow: [2, 8], orb: [3, 8]
});

export const PASSIVE_ICON_ATLAS_COLUMNS = 5;

export const PASSIVE_ICON_ATLAS_ROWS = 9;

export const PASSIVE_NOTABLE_ICON_ATLAS_CELL = Object.freeze({
    notableEnergyShield: [0, 0], notableArmor: [1, 0], notableFire: [2, 0], notableCold: [3, 0],
    notableLightning: [0, 1], notableElementalResist: [1, 1], notableBleed: [2, 1], notableGem: [3, 1],
    notableAttackSpeed: [0, 2], notableMoveSpeed: [1, 2], notableLife: [2, 2], notableSpellInherent: [3, 2]
});

export const PASSIVE_NOTABLE_ICON_FAMILY_BY_STAT = Object.freeze({
    energyShield: 'notableEnergyShield', energyShieldPct: 'notableEnergyShield', energyShieldRegen: 'notableEnergyShield',
    energyShieldRechargeFaster: 'notableEnergyShield', armor: 'notableArmor', armorPct: 'notableArmor',
    firePctDmg: 'notableFire', addedFireDamagePct: 'notableFire',
    coldPctDmg: 'notableCold', addedColdDamagePct: 'notableCold',
    lightPctDmg: 'notableLightning', addedLightDamagePct: 'notableLightning',
    resF: 'notableElementalResist', resC: 'notableElementalResist', resL: 'notableElementalResist',
    resAll: 'notableElementalResist', maxResF: 'notableElementalResist', maxResC: 'notableElementalResist',
    maxResL: 'notableElementalResist', maxResAll: 'notableElementalResist',
    bleedChance: 'notableBleed', bleedDamageMultiplierPct: 'notableBleed', bleedDamageReducePct: 'notableBleed',
    gemLevel: 'notableGem', suppCap: 'notableGem', fireGemLevel: 'notableGem', coldGemLevel: 'notableGem',
    lightGemLevel: 'notableGem', chaosGemLevel: 'notableGem', physGemLevel: 'notableGem',
    projectileGemLevel: 'notableGem', meleeGemLevel: 'notableGem', slamGemLevel: 'notableGem',
    spellGemLevel: 'notableGem', dotGemLevel: 'notableGem', aoeGemLevel: 'notableGem',
    elementalGemLevel: 'notableGem', summonGemLevel: 'notableGem', strGemLevel: 'notableGem', dexGemLevel: 'notableGem',
    intGemLevel: 'notableGem', runeResonancePower: 'notableGem',
    aspd: 'notableAttackSpeed', move: 'notableMoveSpeed',
    flatHp: 'notableLife', pctHp: 'notableLife', regen: 'notableLife',
    spellFlatDmg: 'notableSpellInherent', spellFlatPct: 'notableSpellInherent'
});

export const PASSIVE_KEYSTONE_ICON_CELL_BY_ID = Object.freeze({
    pt_core_keystone_01: [0, 0], pt_core_keystone_02: [1, 0], pt_core_keystone_03: [2, 0],
    pt_core_keystone_04: [3, 0], pt_core_keystone_05: [4, 0], pt_core_keystone_06: [5, 0],
    npqq5m7h2ri: [0, 1], n39ip40yc3d: [1, 1], nv67fzprmet: [2, 1], nkr7zwrymol: [3, 1],
    nxsxdk1yr2y: [4, 1], n2c51dapljo: [5, 1], nkf64engb6m: [0, 2],
    backbone_branch_occultist_cleric_center_occultist_cleric_channel_guard_keystone: [1, 2],
    backbone_branch_cleric_warrior_center_cleric_warrior_guard_regen_keystone: [2, 2],
    backbone_branch_warrior_wanderer_center_warrior_wanderer_roll_speed_keystone: [3, 2],
    backbone_branch_wanderer_archer_center_wanderer_archer_range_roll_keystone: [4, 2],
    backbone_branch_archer_alchemist_center_archer_alchemist_area_projectile_keystone: [5, 2],
    backbone_branch_alchemist_occultist_center_alchemist_occultist_energy_poison_keystone: [0, 3],
    backbone_branch_occultist_outer_2_mystique_single_keystone: [1, 3],
    backbone_branch_occultist_outer_4_occultist_summon_keystone: [2, 3],
    backbone_branch_cleric_outer_1_devotion_triple_keystone: [3, 3],
    backbone_branch_cleric_outer_4_cleric_summon_efficiency_keystone: [4, 3],
    backbone_branch_warrior_outer_1_cycle_reverse_keystone: [5, 3],
    backbone_branch_warrior_outer_4_warrior_bleed_keystone: [0, 4],
    backbone_branch_wanderer_outer_4_wanderer_duel_keystone: [1, 4],
    backbone_branch_archer_outer_4_archer_physical_keystone: [2, 4],
    backbone_branch_alchemist_outer_1_universal_flask_keystone: [3, 4],
    backbone_branch_alchemist_outer_2_universal_summon_keystone: [4, 4],
    backbone_branch_alchemist_outer_4_alchemist_resist_keystone: [5, 4],
    pt_warrior_blood_cradle: [0, 5]
});

export const PASSIVE_KEYSTONE_ICON_ATLAS_ROWS = 6;

export const PASSIVE_TREE_FRAME_SHEET = Object.freeze({ small: [0, 24], medium: [26, 40], notable: [68, 56], keystone: [126, 72], void: [200, 56] });

const PASSIVE_STAT_ICON_FAMILY = Object.freeze({
    voidLinkEfficiency: 'void', attackPctDmg: 'blade', projectileChain: 'projectile', skillDelayReduce: 'arcane', spellRepeatChance: 'arcane', igniteDurationPct: 'elemental', chillDurationPct: 'elemental', freezeDurationPct: 'elemental',
    shockDurationPct: 'elemental', poisonDurationPct: 'potion', bleedDurationPct: 'blade',
    minDmgRoll: 'blade', maxDmgRoll: 'blade', ailmentPotencyPct: 'damageOverTime', ailmentDamagePct: 'damageOverTime', summonEfficiency: 'summon',
    atk: 'spell', utility: 'cooldown',
    mystique: 'mystique', devotion: 'devotion', cycle: 'cycle', projectilePctDmg: 'projectile', projectileExtraShots: 'projectile',
    accuracy: 'projectile', accuracyBonusPct: 'projectile', meleePctDmg: 'blade', physPctDmg: 'blade', slamPctDmg: 'slam', flatDmg: 'blade',
    strength: 'strength', pctDmg: 'blade', ds: 'blade', bleedChance: 'bleed', physIgnore: 'blade', doubleDamageChance: 'blade', addedPhysDamagePct: 'blade',
    blockChance: 'shield', blockChanceMax: 'shield', shieldPctDmg: 'shield', armor: 'armor', armorPct: 'armor', dr: 'armor', deflectChance: 'shield',
    takenDamageReduceWhen1EnemyPct: 'shield', takenDamageReduceWhen2EnemiesPct: 'shield',
    potionPctDmg: 'potion', poisonChance: 'poison', summonPctDmg: 'summon', summonHpPct: 'summon', summonGemLevel: 'summon',
    summonCrit: 'summon', summonCritDmg: 'summon', summonFlatDmg: 'summon', summonAspd: 'summon', summonResPen: 'summon',
    // 2026-11-01: Codex's 14 new pictures take the stats that used to share elemental, shield, precision, wind and arcane.
    firePctDmg: 'fire', coldPctDmg: 'cold', lightPctDmg: 'lightning', elementalPctDmg: 'elemental', resPen: 'elemental',
    igniteChance: 'ignite', chillChance: 'chill', freezeChance: 'freeze', shockChance: 'shock', resF: 'fire', resC: 'cold',
    resL: 'lightning', resAll: 'elemental', aoePctDmg: 'area', chillEffect: 'chill', shockEffect: 'shock',
    igniteDamageMultiplierPct: 'ignite', shockedEnemyHitDamagePct: 'shock', shockedEnemyHitDamageMorePct: 'shock', addedFireDamagePct: 'fire',
    addedColdDamagePct: 'cold', addedLightDamagePct: 'lightning', physTakenAsFire: 'fire', physTakenAsCold: 'cold', physTakenAsLight: 'lightning',
    chaosPctDmg: 'chaos', dotPctDmg: 'damageOverTime', resChaos: 'chaos', poisonDamageMultiplierPct: 'poison', addedChaosDamagePct: 'chaos', physTakenAsChaos: 'chaos',
    flatHp: 'life', pctHp: 'life', regen: 'life', leech: 'life', leechTotalCap: 'life', energyShield: 'energyShield', energyShieldPct: 'energyShield',
    energyShieldRegen: 'energyShield', energyShieldRechargeFaster: 'energyShield', spellPctDmg: 'spell', spellFlatDmg: 'spell', spellFlatPct: 'spell',
    intelligence: 'intelligence', dexterity: 'dexterity', crit: 'critical', critDmg: 'critical', aspd: 'precision',
    cooldownRecovery: 'cooldown', cooldownReduction: 'cooldown', mobilityCooldownRecovery: 'mobility', mobilityCooldownReduction: 'mobility',
    evasion: 'evasion', evasionPct: 'evasion', move: 'wind', mobilityPctDmg: 'mobility'
});

export function createPassiveIconFamily(weaponConditionStats) {
    return Object.freeze({
        ...Object.fromEntries(Object.entries(weaponConditionStats).map(([id, line]) => [id, { greatsword: 'blade', sword: 'blade', bow: 'projectile', orb: 'arcane', flask: 'potion', censer: 'arcane' }[line.stance]])),
        ...PASSIVE_STAT_ICON_FAMILY
    });
}
