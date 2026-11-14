import { GRID_PROFILE_KIND_LABELS } from './grid-description-values.mjs';
import { skillGetSkillGridProfile } from '../combat/grid-skill-profile.mjs';

/** The DPS breakdown's note for a fan: what one target takes, and the most a pack can. */
export function skillGetFanSpreadDpsLines(fanSpread, singleTargetDps) {
    if (!(fanSpread.packMul > 1)) return [];
    return [`부채꼴: 한 대상은 가운데 화살만 맞습니다. 옆 화살까지 모두 맞으면 최대 ${Math.floor(singleTargetDps * fanSpread.packMul)} DPS`];
}

/** 범위 종류의 이름. 'band'는 옆으로만 치는 룬(SKILL_GRID_DB band)이다: 호출부가 profile.band면 'band'를 넘긴다. */
export function skillGetSkillGridProfileKindLabel(kind) {
    return Object.hasOwn(GRID_PROFILE_KIND_LABELS, kind) ? GRID_PROFILE_KIND_LABELS[kind] : '그리드 공격';
}

/** 이동 룬의 재사용 대기: '재사용 대기 4초', 줄이 줄였으면 '재사용 대기 4초 → 1.2초'(최근 전투 틱의 능력치, js/skills.js
 * getSkillCooldownMs). 칼이 된 발걸음으로 공격 칸에 둔 룬은 대기 없이 공격 속도대로 나간다. */
export function skillDescribeMobilityRuneCooldown(env, skillName, skillDef) {
    if (!(skillDef && Array.isArray(skillDef.tags) && skillDef.tags.includes('mobility'))) return '';
    if (skillName === env.owner.activeSkill && env.deps.isMobilityRuneAttackWorn(env.owner)) return '공격 칸: 공격 속도대로';
    const seconds = ms => `${Math.round(ms / 100) / 10}초`;
    const base = env.deps.mobilitySkill.baseCooldownMs(skillName), now = env.deps.mobilitySkill.cooldownMs(skillName, env.owner.lastCombatStats);
    return now < base ? `재사용 대기 ${seconds(base)} → ${seconds(now)}` : `재사용 대기 ${seconds(base)}`;
}

/** 첫 줄: 투사체는 발사 방식, 그 밖은 공격 범위의 이름(옆으로만 치는 룬은 '옆으로 곧게'). */
export function skillDescribeGridAreaTitle(env, profile, tags, skillDef) {
    const kind = skillGetSkillGridProfileKindLabel(profile.band ? 'band' : profile.kind);
    if (!env.deps.supportShapes.playerProjectile({tags})) return `공격 범위: ${kind}`;
    const mode = skillDef.projectilePattern && skillDef.projectilePattern.mode;
    const modeDef = typeof env.deps.PROJECTILE_PATTERN_MODE_DB !== 'undefined' && env.deps.PROJECTILE_PATTERN_MODE_DB[mode];
    return `발사 방식: ${modeDef ? modeDef.label : kind}`;
}

/** 여러 단계로 치는 룬(combatPattern authored)에서 첫 판정보다 넓게 치는 단계: ['얼음 기둥: 전방 부채꼴 3칸'] 같은 줄. 공격 범위가 첫 타격만
 * 말해, 부채꼴 3칸에서 적 여섯을 치는 혹한의 지진이 인접 단일로 보였다(2026-10-17). 모양이 다르거나 반경, 사거리가 더 큰 단계만. */
export function skillDescribeWiderStageAreas(skillDef, base) {
    const pattern = skillDef && skillDef.combatPattern;
    const stages = pattern && pattern.kind === 'authored' ? pattern.stages : [];
    const wider = grid => grid.kind !== base.kind || (grid.radius || 0) > (base.radius || 0) || (grid.range || 0) > (base.range || 0);
    return stages.filter(stage => stage.grid && stage.grid.kind && wider(stage.grid)).map(stage => {
        const grid = stage.grid, round = grid.kind === 'blast' || grid.kind === 'nova';
        const size = `${round ? '반경 ' + Math.max(1, grid.radius || 1) : Math.max(1, grid.range || 1)}칸${grid.band ? `, 위아래 ${grid.band}줄까지` : ''}`;
        return `${stage.label}: ${skillGetSkillGridProfileKindLabel(grid.band ? 'band' : grid.kind)} ${size}`;
    });
}

/** '5방향', or '5방향(15도 간격)' for an aimed fan. */
export function skillDescribeGridFanRays(profile) {
    const rays = `${Math.max(1, Math.min(8, Math.floor(Number(profile.rays) || 1)))}방향`;
    return Number(profile.spreadDeg) > 0 ? `${rays}(${profile.spreadDeg}도 간격)` : rays;
}

export function skillGetSkillGridDescriptionText(skill,parts) {
    return skill?.rangeText || parts.join(', ');
}

export function skillDescribeSkillGridProfile(env, skillName, skillDef) {
    let profile = skillGetSkillGridProfile(env, skillName, skillDef || {});
    let tags = Array.isArray(skillDef && skillDef.tags) ? skillDef.tags : [];
    let parts = [skillDescribeGridAreaTitle(env, profile, tags, skillDef)];
    skillAppendGridAreaDimensions(parts, profile);
    if (profile.kind === 'chain') parts.push(`연쇄 ${Math.max(1, profile.jump || env.deps.COMBAT_GRID_CONFIG.chainJumpRange)}칸`);
    if (profile.kind === 'fan') parts.push(skillDescribeGridFanRays(profile));
    if (env.deps.supportShapes.playerProjectile({tags})) parts.push(skillDef.projectilePatternSource ? `적용: ${skillDef.projectilePatternSource}` : '발사 방식 변경 가능');
    parts.push(...skillDescribeWiderStageAreas(skillDef, profile));
    return [skillGetSkillGridDescriptionText(skillDef, parts), skillDescribeMobilityRuneCooldown(env, skillName, skillDef)].filter(Boolean).join(', ');
}

function skillAppendGridAreaDimensions(parts, profile) {
    parts.push(`사거리 ${Math.max(1, profile.range || 1)}칸`);
    if (profile.band) parts.push(`위아래 ${profile.band}줄까지`);
    if (profile.kind === 'blast' && (profile.radius || 0) > 0) parts.push(`반경 ${profile.radius}칸`);
    if (profile.kind === 'nova') parts.push(`반경 ${Math.max(1, profile.radius || 1)}칸`);
    let shapeLabels = { circle: '원형', diamond: '마름모형', square: '사각형', cross: '십자형', diagonal: 'X자형', ring: '고리형' };
    if (shapeLabels[profile.shape]) parts.push(shapeLabels[profile.shape]);
}
