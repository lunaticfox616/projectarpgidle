// Effect expansion owns its unsaved development override; the resolved skill carries every combat input.
function effectExpansionKind(name, rules) {
    return Object.hasOwn(rules.kinds, name) ? rules.kinds[name] : null;
}

function effectExpansionPotionNode(skill, hasKeystone) {
    return hasKeystone('bm1') && Array.isArray(skill.tags) && skill.tags.includes('potion') ? 1 : 0;
}

export function areaSkillKind(skill) {
    const fx = skill?.supportEffects;
    if (fx?.focus || fx?.throwRange) return null;
    return fx?.spreadRadius ? 'variable' : skill?.areaKind || null;
}

function effectExpansionApply(skill, name, level, ports, stats) {
    const rules = ports.readRules();
    const area = areaSkillKind(skill), fx = skill.supportEffects || {};
    skill.areaKind = area;
    if (area === 'fixed' || fx.focus || fx.throwRange) return skill;
    const inherent = Math.max(level, effectExpansionPotionNode(skill, ports.hasKeystone));
    skill.effectExpansionKind = fx.spreadRadius ? 'radius' : effectExpansionKind(name, rules);
    if (area === 'variable') applyVariableArea(skill, stats, inherent);
    else effectExpansionApplyGrowth(skill, inherent, rules);
    return skill;
}

function variableAreaGeometry(skill, fx, stats, inherent) {
    if (stats.rangeFarHorizon > 0) return { delta: 2, half: true };
    if (stats.rangeCloseCalamity > 0 && (fx.spreadRadius || skill.areaBaseRadius) >= 2) return { delta: -1, all: true };
    const existing = Math.max(inherent, stats.rangeAreaExpansion || 0);
    return fx.expansion > existing ? { delta: fx.expansion, fromSupport: true } : { delta: existing };
}

function areaTargetsPerShot(skill, fx) {
    const otherShots = fx.projectiles?.extra || 0;
    if (!otherShots || skill.nativeCastId || skill.projectilePattern?.kind === 'fan') return skill.targets;
    return Math.max(1, skill.targets - otherShots);
}

function applyVariableArea(skill, stats, inherent) {
    const fx = skill.supportEffects || {};
    const { delta, half, all, fromSupport } = variableAreaGeometry(skill, fx, stats, inherent);
    skill.targets = areaTargetsPerShot(skill, fx) + Math.floor(stats.rangeAdditionalTargets || 0) + Math.floor(fx.additionalTargets || 0);
    if (half) skill.targets = Math.max(1, Math.floor(skill.targets / 2));
    skill.areaHitsAll = Boolean(all);
    skill.effectExpansion = delta;
    if (fromSupport) skill.dmg = (skill.dmg ?? skill.baseDmg ?? 1) * 0.85;
    if (delta) delete skill.rangeText;
}

export function effectAreaTargetLimit(skill) {
    return skill.areaKind === 'fixed' || skill.areaHitsAll ? Infinity : Math.max(1, Math.floor(skill.targets || 1));
}

function effectExpansionApplyGrowth(skill, level, rules) {
    const kind = skill.effectExpansionKind;
    const n = kind ? Math.min(rules.max, level) : 0;
    skill.effectExpansion = n;
    if (kind === 'targets' && n) skill.targets = Math.max(1, Math.floor(skill.targets || 1)) + n;
    if (n >= rules.penaltyFrom) skill.dmg = (skill.dmg || skill.baseDmg || 1) * (1 - rules.damagePenaltyPct / 100);
}

export function effectExpansionExtra(skill) { return Number(skill && skill.effectExpansion) || 0; }

function effectExpansionWidened(profile, n) {
    const radius = (profile.radius || 0) + n;
    return { ...profile, radius, range: profile.kind === 'nova' ? Math.max(1, (profile.range || 0) + n, radius) : profile.range };
}

// Copies authored rows and preserves targeted blast aim while changing its area.
export function effectExpansionGrid(profile, skill) {
    const n = effectExpansionExtra(skill), kind = skill && skill.effectExpansionKind;
    if (!n || !profile) return profile;
    if (kind === 'radius') return effectExpansionWidened(profile, n);
    return n > 0 && (kind === 'cone' || kind === 'range') ? { ...profile, range: (profile.range || 0) + n } : profile;
}

// A radius-zero authored first hit stays on its own cell; only stages with their own size expand.
export function effectExpansionStageGrid(own, skill) {
    const n = effectExpansionExtra(skill);
    if (!n || !own) return own;
    const kind = skill.effectExpansionKind;
    if (own.radius > 0 && (kind === 'radius' || skill.areaKind === 'variable')) return { ...own, radius: own.radius + n };
    return n > 0 && kind === 'cone' && own.kind === 'cone' ? { ...own, range: own.range + n } : own;
}

export function createSkillEffectExpansion(ports) {
    let testLevel = 0;
    return Object.freeze({
        level() { return testLevel; },
        /*! @dev-only */
        setTestLevel(n) {
            testLevel = Math.max(0, Math.min(ports.readRules().max, Math.floor(Number(n) || 0)));
            ports.invalidateStats();
            return testLevel;
        },
        /*! @end-dev-only */
        kindOf(name) { return effectExpansionKind(name, ports.readRules()); },
        applyToSkill(skill, name, stats = {}) { return effectExpansionApply(skill, name, testLevel, ports, stats); },
        extra: effectExpansionExtra,
        grid: effectExpansionGrid,
        stageGrid: effectExpansionStageGrid
    });
}
