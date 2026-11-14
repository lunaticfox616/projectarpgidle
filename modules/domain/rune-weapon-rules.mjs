

export function runeFlowHasEquippedShield(env, owner) {
    let shield = env.deps.combatEquipmentStats.activeEquipment(owner)['방패'];
    return !!(shield && shield.slot === '방패');
}

export function runeFlowGetEquippedWeaponStance(env, owner) {
    const weapon = env.deps.combatEquipmentStats.activeEquipment(owner)['무기'];
    const category = weapon && typeof env.deps.getWeaponCategoryId === 'function' ? env.deps.getWeaponCategoryId(weapon) : null;
    return (category && env.deps.SKILL_RUNE_STANCE_BY_CATEGORY[category]) || 'unarmed';
}

export function runeFlowGetSkillDamageTagSet(env, owner, skill) {
    const tags = new Set(skill.tags || []);
    if (tags.has('melee') && runeFlowHasEquippedShield(env, owner)) tags.add('shield');
    return tags;
}

export function runeFlowGetSkillRuneWeaponNote(env, owner, name) {
    if (runeFlowCanUseSkillWithCurrentEquipment(env, owner, name)) return '';
    const levelNote = env.deps.getRuneLevelNote(name, false, owner);
    if (levelNote) return levelNote;
    const skill = env.deps.SKILL_DB[name], family = env.deps.SKILL_RUNE_FAMILY[name];
    if (runeFlowIsAttackRuneBlockedByMobilityBoots(env, owner, name)) return env.deps._t('{value} 착용 중, 이동 스킬룬만', { value: env.deps.MOBILITY_RUNE_ATTACK_UNIQUE });
    if (skill && skill.requiresShield && !runeFlowHasEquippedShield(env, owner)) return '완갑 필요';
    return env.deps.SKILL_RUNE_WEAPON_NOTES[family] || `${env.deps.SKILL_RUNE_WEAPONS[family].map(stance => env.deps.SKILL_RUNE_STANCE_LABELS[stance]).join(', ')} 필요`;
}

export function runeFlowGetSkillRuneBlockedLine(env, owner, name) {
    if (runeFlowCanUseSkillWithCurrentEquipment(env, owner, name)) return '';
    return `${env.deps.getRuneLevelNote(name, false, owner) ? env.deps._t('지금 쓸 수 없음') : env.deps._t('지금 무기로 쓸 수 없음')}: ${runeFlowGetSkillRuneWeaponNote(env, owner, name)}`;
}

export function runeFlowCanUseSkillWithCurrentEquipment(env, owner, name) {
    let skill = env.deps.SKILL_DB[name];
    if (!skill) return true;
    if (env.deps.getRuneLevelNote(name, false, owner)) return false;
    if (skill.requiresShield && !runeFlowHasEquippedShield(env, owner)) return false;
    if (runeFlowIsAttackRuneBlockedByMobilityBoots(env, owner, name)) return false;
    return runeFlowIsSkillRuneUsableWithStance(env, name, runeFlowGetEquippedWeaponStance(env, owner));
}

export function runeFlowIsAttackRuneBlockedByMobilityBoots(env, owner, name) {
    const tags = env.deps.SKILL_DB[name]?.tags || [];
    return !!env.deps.SKILL_DB[name]?.isGem && !runeFlowIsMobilityRuneName(env, name) && !tags.includes('summon') && !tags.includes('summon_attack')
        && env.deps.isMobilityRuneAttackWorn(owner);
}

export function runeFlowIsSkillRuneUsableWithStance(env, name, stance) {
    const family = env.deps.SKILL_RUNE_FAMILY[name];
    return !family || env.deps.SKILL_RUNE_WEAPONS[family].includes(stance);
}

export function runeFlowIsMobilityRuneName(env, name) { return (env.deps.SKILL_DB[name]?.tags || []).includes('mobility'); }
