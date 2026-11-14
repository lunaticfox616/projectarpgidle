import { effectExpansionGrid } from '../domain/skill-effect-expansion.mjs';

/** 스킬룬의 그리드 범위 프로필을 조회한다. 정의가 없으면 targetMode/태그 기반 기본값을 쓴다.
 * The resolved active skill's 효과 확장 grows it (js/skill-effect-expansion.js); at +0 the table row itself comes back. */
export function skillGetSkillGridProfile(env, skillName, skillDef) {
    let profile = skillGetAuthoredSkillGridProfile(env, skillName, skillDef) || skillGetDefaultSkillGridProfile(env, skillDef);
    return env.deps.supportShapes.grid(effectExpansionGrid(profile, skillDef), skillDef);
}

/** The SKILL_GRID_DB row, reshaped when an engraved projectile pattern changes its kind. */
export function skillGetAuthoredSkillGridProfile(env, skillName, skillDef) {
    let profile = env.deps.SKILL_GRID_DB[skillName];
    let pattern = skillDef && skillDef.projectilePattern;
    if (!profile || !(pattern && pattern.kind)) return profile || null;
    let resolved = { ...profile, kind: pattern.kind };
    if (pattern.kind === 'fan') Object.assign(resolved, skillGetEngravedFanShape(pattern, profile));
    return resolved;
}

/** An engraved fan (삼갈래 분산): its ray count and spread. With spreadDeg the middle ray aims at the target (getGridFanRayEnds). */
export function skillGetEngravedFanShape(pattern, profile) {
    const spreadDeg = Number(pattern.spreadDeg) > 0 ? pattern.spreadDeg : profile.spreadDeg;
    return { rays: Math.max(1, Math.min(8, Math.floor(Number(pattern.rays) || profile.rays || 1))), spreadDeg };
}

export function skillGetDefaultSkillGridProfile(env, skillDef) {
    let mode = skillDef && skillDef.targetMode;
    let melee = !!(skillDef && Array.isArray(skillDef.tags) && skillDef.tags.includes('melee'));
    let byMode = {
        whirl: { kind: 'nova', range: 1, radius: 1 },
        cleave: melee ? { kind: 'arc', range: 1 } : { kind: 'blast', range: 4, radius: 1 },
        pierce: { kind: 'line', range: 6 },
        chain: { kind: 'chain', range: 4, jump: env.deps.COMBAT_GRID_CONFIG.chainJumpRange },
        all: { kind: 'blast', range: 5, radius: 2 }
    };
    if (Object.hasOwn(byMode, mode)) return byMode[mode];
    return melee ? { kind: 'melee', range: 1 } : { kind: 'blast', range: 5, radius: 0 };
}

/** 기존 targetMode별 부가 타격 감쇄 배율(1타는 항상 1.0). */
export function skillGetGridSkillTargetMult(mode, idx) {
    if (idx === 0) return 1;
    if (mode === 'all') return 1;
    if (mode === 'whirl') return idx < 3 ? 0.82 : (idx < 5 ? 0.68 : 0.56);
    if (mode === 'cleave') return 0.72;
    if (mode === 'chain') return Math.max(0.45, 1 - idx * 0.2);
    if (mode === 'pierce') return 0.65;
    return 0.7;
}
