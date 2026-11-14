/** Complete legacy skill timing metadata once, after skill tables have been loaded. */
export function initializeSkillDefaults(SKILL_DB) {
Object.keys(SKILL_DB).forEach(name => {
    let skill = SKILL_DB[name];
    if (!skill || !skill.isGem) return;
    if (Number.isFinite(skill.baseDmg)) skill.baseDmg = Number((skill.baseDmg * 1.62).toFixed(3));
    if (Number.isFinite(skill.dmgScale) && skill.dmgScale > 0) skill.dmgScale = Number((skill.dmgScale * 1.9).toFixed(4));
});
}
