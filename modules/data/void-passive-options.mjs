export function voidOptionRows(group, rows) {
    return rows.map(([id, min, max, step]) => ({ id, min, max, step, group }));
}

const baseOptions = [
        ...voidOptionRows('피해', [['pctDmg', 5, 9], ['attackPctDmg', 8, 13], ['spellPctDmg', 9, 15], ['elementalPctDmg', 8, 13], ['meleePctDmg', 10, 16], ['projectilePctDmg', 10, 16], ['physPctDmg', 10, 16],
            ['aoePctDmg', 10, 16], ['dotPctDmg', 10, 16], ['firePctDmg', 11, 18], ['coldPctDmg', 11, 18], ['lightPctDmg', 11, 18], ['chaosPctDmg', 11, 18], ['slamPctDmg', 12, 20], ['potionPctDmg', 12, 20],
            ['mobilityPctDmg', 12, 20], ['summonPctDmg', 12, 20], ['flatDmg', 5, 10], ['resPen', 2, 4]]),
        ...voidOptionRows('치명타와 속도', [['crit', 2, 4], ['critDmg', 8, 15], ['aspd', 3, 5], ['ds', 3, 6], ['minDmgRoll', 3, 6], ['maxDmgRoll', 3, 6], ['physIgnore', 3, 6], ['spellRepeatChance', 2, 4],
            ['skillDelayReduce', 1, 3], ['cooldownRecovery', 5, 10], ['cooldownReduction', 2, 4], ['move', 4, 7]]),
        ...voidOptionRows('상태이상', [['igniteChance', 4, 8], ['chillChance', 4, 8], ['shockChance', 4, 8], ['poisonChance', 4, 8], ['bleedChance', 4, 8], ['freezeChance', 2, 4],
            ['igniteDurationPct', 8, 14], ['chillDurationPct', 8, 14], ['freezeDurationPct', 8, 14], ['shockDurationPct', 8, 14], ['poisonDurationPct', 8, 14], ['bleedDurationPct', 8, 14]]),
        ...voidOptionRows('방어', [['flatHp', 20, 40], ['pctHp', 3, 6], ['regen', 0.5, 1, 0.1], ['leech', 0.2, 0.5, 0.1], ['armorPct', 8, 15], ['evasionPct', 8, 15], ['energyShieldPct', 8, 15], ['energyShield', 16, 32],
            ['blockChance', 1, 3], ['deflectChance', 2, 4], ['resAll', 4, 7], ['resF', 8, 14], ['resC', 8, 14], ['resL', 8, 14], ['resChaos', 5, 9],
            ['ailResIgnite', 8, 14], ['ailResFreeze', 8, 14], ['ailResShock', 8, 14], ['ailResPoison', 8, 14], ['ailResBleed', 8, 14]]),
        ...voidOptionRows('능력치', [['strength', 8, 16], ['dexterity', 8, 16], ['intelligence', 8, 16], ['accuracy', 40, 90]])
];

export function createVoidPassiveOptionPool(SKILL_RUNE_STANCE_LABELS) {
    return [
        ...baseOptions.map(row => ({ ...row })),
        ...voidOptionRows('무기', Object.keys(SKILL_RUNE_STANCE_LABELS).filter(stance => stance !== 'unarmed')
            .flatMap(stance => [[`${stance}PctDmg`, 14, 22], [`${stance}Crit`, 3, 5], [`${stance}Aspd`, 5, 8]]))
    ];
}
