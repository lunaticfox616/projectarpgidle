import { cellGetClosestGridUnitCell, cellGetGridUnitCells } from './grid-units.mjs';
import { skillGetSkillGridProfile } from './grid-skill-profile.mjs';
import { skillGetGridAttackAreaCells } from './grid-attack-area.mjs';
import { effectExpansionStageGrid } from '../domain/skill-effect-expansion.mjs';

/** Targeted impact followed by a fixed ground eruption, even if the first victim dies or moves. */
export function skillBuildEarthSpikeHitSequence(env, skill, targets, primary, impactCells) {
    let shock = Math.max(0, Number(skill.aftershockDamagePct)) / 100;
    let aimCell = cellGetClosestGridUnitCell(env, env.owner.gridPlayer, primary);
    return [
        { kind: 'slamPrimary', label: '내려찍기', delayMs: 0, damageMultiplier: 1 - shock,
            targets: targets.slice(0, 1), aimCell, impactCells: cellGetGridUnitCells(env, primary) },
        { kind: 'earthSpikes', label: '지진 쐐기', delayMs: skill.aftershockDelayMs, damageMultiplier: shock,
            singleRepeat: true, delivery: 'magicCell', targetLimit: skill.targets, targets, aimCell, impactCells }
    ];
}

/** Authored phases share one frozen aim; each phase owns its collision and visual geometry.
 * @param {string} skillName
 * @param {(typeof SKILL_DB)[string]} skill
 * @param {Array<{enemy:{id:number,gx:number,gy:number,hp:number},mult:number}>} targets Nonempty cast selection.
 * @returns {Array<{kind:string,label:string,delayMs:number,damageMultiplier:number,delivery:string,singleRepeat:boolean,targetLimit:number,targets:typeof targets,aimCell:{gx:number,gy:number},gridProfile:ReturnType<typeof getSkillGridProfile>,impactCells:Array<{gx:number,gy:number}>,element:string|undefined,skipGridControl:boolean|undefined}>}
 */
export function skillBuildAuthoredSkillHitSequence(env, skillName, skill, targets) {
    let source = env.owner.gridPlayer;
    let aimCell = cellGetClosestGridUnitCell(env, source, targets[0].enemy);
    let base = skillGetSkillGridProfile(env, skillName, skill);
    return skill.combatPattern.stages.map(phase => {
        // 제 판정을 가진 단계는 판정 표의 띠를 물려받지 않는다(공허 가르기의 틈 닫힘은 둘레 2칸 원)
        let gridProfile = { ...base, ...(phase.grid && { band: 0 }), ...effectExpansionStageGrid(phase.grid, skill) };
        return { kind: 'authored', label: phase.label, delayMs: phase.delayMs,
            damageMultiplier: phase.damagePct / 100, singleRepeat: true, delivery: 'magicCell',
            targetLimit: skill.targets, targets, aimCell: { ...aimCell }, gridProfile,
            impactCells: skillGetGridAttackAreaCells(env, gridProfile, source, aimCell),
            element: phase.element, skipGridControl: phase.skipGridControl };
    });
}
