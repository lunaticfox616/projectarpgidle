/** 효과 확장 규칙 (data/skill-effect-expansion.js). The resolved active skill carries its level (skill.effectExpansion) and
 * every hit shape grows from it: grid profiles and authored stage grids here, native gem numbers in skill-gem-casts.js,
 * fixed-size redrawn art in canvas-redrawn-skill-fx.js. Items, inner growth and the keystone that grant the level are not
 * in the game yet, so it is 0 unless the local test panel sets one (kept in memory, never saved).
 */
const skillEffectExpansion = (() => {
    let testLevel = 0;
    const rules = () => SKILL_EFFECT_EXPANSION;
    function clampLevel(n) { return Math.max(0, Math.min(rules().max, Math.floor(Number(n) || 0))); }
    function kindOf(name) { return Object.hasOwn(rules().kinds, name) ? rules().kinds[name] : null; }
    /** The player's 효과 확장 level (0–2). */
    function level() { return testLevel; }
    /** Local test panel only. The level is a stat input outside the save, so kept stat calculations are dropped. */
    function setTestLevel(n) {
        testLevel = clampLevel(n);
        playerStatCache.invalidate();
        return testLevel;
    }
    /** Stamps +N on the resolved active skill: its level and kind, N more targets for target gems, the keystone's cost. */
    function applyToSkill(skill, name) {
        const kind = kindOf(name), n = kind ? level() : 0;
        skill.effectExpansion = n;
        skill.effectExpansionKind = kind;
        if (kind === 'targets' && n) skill.targets = Math.max(1, Math.floor(skill.targets || 1)) + n;
        if (n >= rules().penaltyFrom) skill.dmg = (skill.dmg || skill.baseDmg || 1) * (1 - rules().damagePenaltyPct / 100);
        return skill;
    }
    /** Cells (or targets) a resolved skill grows by. */
    function extra(skill) { return Number(skill && skill.effectExpansion) || 0; }
    /** Area gems: a wider radius; an area around the caster (nova) also reaches as far as it grew. */
    function widened(profile, n) {
        const radius = (profile.radius || 0) + n;
        return { ...profile, radius, range: profile.kind === 'nova' ? Math.max(profile.range || 0, radius) : profile.range };
    }
    /** A grid profile grown by the skill's expansion — a copy; SKILL_GRID_DB rows are never touched. */
    function grid(profile, skill) {
        const n = extra(skill), kind = skill && skill.effectExpansionKind;
        if (!n || !profile) return profile;
        if (kind === 'radius') return widened(profile, n);
        return kind === 'cone' || kind === 'range' ? { ...profile, range: (profile.range || 0) + n } : profile;
    }
    /** An authored stage's own grid grows too when it has a size: its radius (area gems) or reach (cones). A stage kept at
     * radius 0 (혈기 폭쇄's first hit) stays on its one cell. */
    function stageGrid(own, skill) {
        const n = extra(skill), kind = skill && skill.effectExpansionKind;
        if (!n || !own) return own;
        if (kind === 'radius' && own.radius > 0) return { ...own, radius: own.radius + n };
        return kind === 'cone' && own.range > 0 ? { ...own, range: own.range + n } : own;
    }
    return Object.freeze({ level, setTestLevel, kindOf, applyToSkill, extra, grid, stageGrid });
})();
safeExposeGlobals({ skillEffectExpansion });
