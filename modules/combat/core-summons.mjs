import { coreHasKeystone } from '../combat/core-keystones.mjs';

export function coreGetActiveSummonGemDefs(env) {
    let owned = Array.isArray(env.owner.skills) ? env.owner.skills : [];
    env.owner.summonSkillCounts = (env.owner.summonSkillCounts && typeof env.owner.summonSkillCounts === 'object') ? env.owner.summonSkillCounts : {};
    let equippedSummonAttack = Array.isArray(env.owner.equippedSummonSkills) ? env.owner.equippedSummonSkills : [];
    let attackNames = Array.from(new Set(equippedSummonAttack.filter(name => {
        let db = env.deps.SKILL_DB[name];
        return owned.includes(name) && db && Array.isArray(db.tags) && db.tags.includes('summon');
    })));
    let defs = [];
    // 무기가 맞지 않는 소환 룬(위습은 맨손으로 못 쓴다)은 장착된 채 소환하지 않는다
    attackNames.filter(name => env.deps.canUseSkillWithCurrentEquipment(name)).forEach(name => {
        let count = env.deps.SKILL_DB[name].tags.includes('summon_attack') ? Math.max(1, Math.floor(Number(env.owner.summonSkillCounts[name]) || 1)) : 1;
        env.owner.summonSkillCounts[name] = count;
        for (let i = 0; i < count; i++) defs.push({ name, db: env.deps.SKILL_DB[name], source: 'skill', duplicateIndex: i });
    });
    env.owner.equippedSummonSkills = attackNames;
    Object.keys(env.owner.summonSkillCounts).forEach(name => { if (!attackNames.includes(name)) delete env.owner.summonSkillCounts[name]; });
    return defs;
}

export function coreGetSummonProfile(gemName) {
    // 위습 정령 6종(스킬 변경분 2, 2026-09-30)은 대신한 동물의 수치를 그대로 물려받았다(임시): 화염←불곰, 냉기←서리늑대,
    // 번개←벼락멧돼지, 물리←칼날까마귀, 카오스←공허 유충. 사거리는 인계 4/4/3/3/4.
    // baseHp는 기존 수치의 50% 수준으로 너프됨(성장 배율 hpScaleBase/Exp는 그대로라 모든
    // 레벨에서 균일하게 50% 낮은 생명력이 됨). dmgRollMinPct는 일격 편차의 하한(%) —
    // 버스트형(화염 위습)은 편차가 크고, 연사형(냉기 위습)은 편차가 작음.
    let table = {
        '화염 위습 소환': { role: 'attack', ele: 'fire', gridRange: 4, trait: '강한 1타', baseHp: 83, baseArmor: 66, baseEvasion: 24, baseRes: { fire: 28, cold: 8, light: 10, chaos: 0 }, baseDamage: 86, dmgRollMinPct: 30, attackSpeedMul: 0.78, baseCrit: 5, baseCritDmg: 145, resPenBonus: 2, respawnMs: 4000, hpScaleBase: 0.045, hpScaleExp: 1.14, dmgPerLevelPct: 0.135, armorScaleBase: 0.026, armorScaleExp: 1.12, evasionScaleBase: 0.012, evasionScaleExp: 1.08 },
        '냉기 위습 소환': { role: 'attack', ele: 'cold', gridRange: 4, trait: '빠른 공속', baseHp: 58, baseArmor: 36, baseEvasion: 63, baseRes: { fire: 10, cold: 24, light: 10, chaos: 0 }, baseDamage: 54, dmgRollMinPct: 50, attackSpeedMul: 1.35, baseCrit: 8, baseCritDmg: 150, resPenBonus: 4, respawnMs: 4000, hpScaleBase: 0.038, hpScaleExp: 1.12, dmgPerLevelPct: 0.105, armorScaleBase: 0.018, armorScaleExp: 1.1, evasionScaleBase: 0.026, evasionScaleExp: 1.12 },
        '번개 위습 소환': { role: 'attack', ele: 'light', gridRange: 3, trait: '높은 저항 관통', baseHp: 65, baseArmor: 36, baseEvasion: 45, baseRes: { fire: 8, cold: 8, light: 30, chaos: 0 }, baseDamage: 62, dmgRollMinPct: 40, attackSpeedMul: 1.02, baseCrit: 7, baseCritDmg: 150, resPenBonus: 18, respawnMs: 4000, hpScaleBase: 0.04, hpScaleExp: 1.12, dmgPerLevelPct: 0.112, armorScaleBase: 0.017, armorScaleExp: 1.1, evasionScaleBase: 0.018, evasionScaleExp: 1.11 },
        '물리 위습 소환': { role: 'attack', ele: 'phys', gridRange: 3, trait: '치명타 특화', baseHp: 55, baseArmor: 27, baseEvasion: 87, baseRes: { fire: 12, cold: 12, light: 12, chaos: 0 }, baseDamage: 50, dmgRollMinPct: 35, attackSpeedMul: 1.18, baseCrit: 22, baseCritDmg: 190, physIgnoreBonus: 8, respawnMs: 4000, hpScaleBase: 0.036, hpScaleExp: 1.1, dmgPerLevelPct: 0.108, armorScaleBase: 0.014, armorScaleExp: 1.08, evasionScaleBase: 0.03, evasionScaleExp: 1.13 },
        '카오스 위습 소환': { role: 'attack', ele: 'chaos', gridRange: 4, trait: '카오스 관통', baseHp: 71, baseArmor: 39, baseEvasion: 30, baseRes: { fire: 10, cold: 10, light: 10, chaos: 34 }, baseDamage: 63, dmgRollMinPct: 45, attackSpeedMul: 0.95, baseCrit: 6, baseCritDmg: 155, resPenBonus: 14, respawnMs: 4000, hpScaleBase: 0.042, hpScaleExp: 1.14, dmgPerLevelPct: 0.118, armorScaleBase: 0.019, armorScaleExp: 1.11, evasionScaleBase: 0.013, evasionScaleExp: 1.08 },
        '수액 골렘 소환': { role: 'guard', ele: 'phys', gridRange: 1, trait: '피해 대리', baseHp: 111, baseArmor: 90, baseEvasion: 18, baseRes: { fire: 15, cold: 15, light: 15, chaos: 10 }, baseDamage: 15, dmgRollMinPct: 45, attackSpeedMul: 0, baseCrit: 0, baseCritDmg: 130, respawnMs: 8000, redirectPct: 0, hpScaleBase: 0.055, hpScaleExp: 1.12, dmgPerLevelPct: 0.06, armorScaleBase: 0.032, armorScaleExp: 1.1, evasionScaleBase: 0.01, evasionScaleExp: 1.06 }
    };
    return table[gemName] || { role: 'attack', ele: 'phys', gridRange: 1, trait: '균형형', baseHp: 58, baseArmor: 30, baseEvasion: 30, baseRes: { fire: 10, cold: 10, light: 10, chaos: 0 }, baseDamage: 45, dmgRollMinPct: 40, attackSpeedMul: 1, baseCrit: 5, baseCritDmg: 140, respawnMs: 4000, hpScaleBase: 0.04, hpScaleExp: 1.12, dmgPerLevelPct: 0.1, armorScaleBase: 0.015, armorScaleExp: 1.1, evasionScaleBase: 0.015, evasionScaleExp: 1.1 };
}

export function coreGetSummonRuntimeCap(env, pStats) {
    if (pStats && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.soleMinion) return 1;
    return Math.max(1, Math.min(coreGetSummonCapMaximum(env), Math.floor((pStats && pStats.summonCap) || 1)));
}

/** 소환 한도(능력치의 summonCap): 버킷들의 summonCap 합(sum)에 소울바인더 키스톤 몫(sb4 +1, sb8 +3)을 더하고, sb9면 1.5배. 1부터 최대까지. */
export function coreGetSummonCapFromSum(env, sum) {
    const keystones = (coreHasKeystone(env, 'sb4') ? 1 : 0) + (coreHasKeystone(env, 'sb8') ? 3 : 0);
    return Math.max(1, Math.min(coreGetSummonCapMaximum(env), Math.floor((1 + Math.floor(sum + keystones)) * (coreHasKeystone(env, 'sb9') ? 1.5 : 1))));
}

export function coreGetSummonCapMaximum(env) {
    return coreHasKeystone(env, 'sb9') ? 12 : 8;
}

export function coreApplyGrandlordGhostState(env) {
    let grandlordActive = coreHasKeystone(env, 'sb9');
    let livingSummons = (env.owner.summons || []).filter(summon => summon && summon.alive && summon.hp > 0);
    if (!grandlordActive) {
        livingSummons.forEach(summon => { summon.isGhost = false; });
        return;
    }
    let ghostCount = Math.min(4, Math.floor(livingSummons.length / 3));
    let ghostIds = new Set(livingSummons
        .slice()
        .sort((left, right) => left.hp - right.hp || left.id - right.id)
        .slice(0, ghostCount)
        .map(summon => summon.id));
    livingSummons.forEach(summon => { summon.isGhost = ghostIds.has(summon.id); });
}

export function coreBuildActiveSummonRuntimeDefs(env, pStats) {
    return env.deps.summonSupports.runtimeDefs(coreGetActiveSummonGemDefs(env), pStats);
}
