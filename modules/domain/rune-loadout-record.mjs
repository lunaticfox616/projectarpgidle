

export function runePresetFailure(reason) { return { ok: false, reason }; }

export function runePresetNames(value) { return Array.isArray(value) && value.length <= 64 && value.every(name => typeof name === 'string' && name.length > 0 && name.length <= 80); }

export function runePresetRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }

export function runePresetPositiveInteger(value) { return Number.isInteger(value) && value > 0 && value <= 64; }

export function runePresetLoadoutShapeReason(raw) {
    if (!runePresetRecord(raw) || raw.version !== 1) return '저장된 룬 구성 형식을 읽을 수 없습니다. 다시 저장해 주세요.';
    if (typeof raw.activeSkill !== 'string' || !raw.activeSkill || typeof raw.mobilitySkill !== 'string') return '주 공격 또는 이동 룬 정보가 올바르지 않습니다.';
    if (!runePresetNames(raw.equippedSummonSkills) || !runePresetNames(raw.equippedSupports)) return '저장된 소환 또는 보조 룬 목록이 올바르지 않습니다.';
    if (!runePresetRecord(raw.summonSkillCounts) || !runePresetRecord(raw.supportTiers)) return '저장된 소환 수 또는 보조 등급 정보가 없습니다.';
    return runePresetLoadoutMapReason(raw);
}

export function runePresetLoadoutMapReason(raw) {
    const pairs = [[raw.equippedSummonSkills, raw.summonSkillCounts], [raw.equippedSupports, raw.supportTiers]];
    for (const [list, values] of pairs) {
        if (Object.keys(values).length !== list.length || list.some(name => !Object.hasOwn(values, name) || !runePresetPositiveInteger(values[name]))) {
            return '저장된 룬 목록과 소환 수 또는 보조 등급이 일치하지 않습니다.';
        }
    }
    return '';
}

export function runePresetNormalizeRuneLoadout(raw) {
    if (raw === null || raw === undefined) return null;
    const invalidReason = typeof raw.invalidReason === 'string' && raw.invalidReason ? raw.invalidReason : runePresetLoadoutShapeReason(raw);
    if (invalidReason) return { version: 1, invalidReason: invalidReason.slice(0, 180) };
    return { version: 1, activeSkill: raw.activeSkill, mobilitySkill: raw.mobilitySkill,
        equippedSummonSkills: raw.equippedSummonSkills.slice(), summonSkillCounts: { ...raw.summonSkillCounts },
        equippedSupports: raw.equippedSupports.slice(), supportTiers: { ...raw.supportTiers } };
}
