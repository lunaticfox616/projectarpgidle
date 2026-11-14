import { acceptsHeroChoice, finishLoopHeroChoice } from './hero-selection-session.mjs';
import { renderLoopHeroChoiceDetail, loopHeroMutationHtml, loopBasicSkillCardHtml } from './hero-selection-markup.mjs';
import { applyHeroSelection } from './hero-selection-actions.mjs';

export function pressLoopHeroChoice(runtime, classId, experienced) {
    if (!acceptsHeroChoice(runtime) || runtime.basicClass) return;
    const start = runtime.deps.document.getElementById('loop-hero-select-start');
    if (!runtime.deps.uiDisplay.matches('(max-width: 1080px)') || start?.value === classId) return chooseLoopHero(runtime, classId);
    renderLoopHeroChoiceDetail(runtime, classId, experienced);
}

export function chooseLoopHero(runtime, classId) {
    if (!acceptsHeroChoice(runtime) || runtime.basicClass || !runtime.deps.rules.validClass(classId)) return;
    applyHeroSelection(runtime, classId, { silent: true, skipSave: true, alignTalent: true });
    openLoopBasicSkillPick(runtime, classId);
}

export function openLoopBasicSkillPick(runtime, classId) {
    if (!acceptsHeroChoice(runtime)) return;
    const { deps } = runtime, grid = deps.document.getElementById('loop-hero-select-grid'), family = deps.basicSkills.familyOf(classId);
    if (!grid || !family) {
        if (family) deps.basicSkills.grant(deps.game, classId, deps.basicSkills.autoPick(deps.game));
        return finishLoopHeroChoice(runtime, classId);
    }
    runtime.basicClass = classId;
    runtime.elements = deps.basicSkills.offer(deps.game);
    const rule = deps.loopMutation.of(deps.game.season);
    deps.document.getElementById('loop-hero-select-title').innerText = deps._t('시작 속성 선택');
    deps.document.getElementById('loop-hero-select-body').innerHTML = deps.escapeHTML(deps._t('{label}의 기초 스킬 속성을 고르세요.', { label: deps._t(deps.PLAYER_CLASS_DEFS[classId].label) }))
        + loopHeroMutationHtml(runtime);
    grid.classList.add('is-basic-pick');
    grid.innerHTML = runtime.elements.map(ele => loopBasicSkillCardHtml(runtime, deps.basicSkills.nameOf(family, ele), ele, rule)).join('');
    renderLoopHeroChoiceDetail(runtime, null);
    grid.parentElement.scrollTo(0, 0);
}

export function chooseLoopBasicSkill(runtime, ele) {
    if (!acceptsHeroChoice(runtime) || !runtime.deps.rules.validClass(runtime.basicClass) || !runtime.elements.includes(ele)) return;
    const classId = runtime.basicClass;
    runtime.basicClass = null;
    runtime.deps.basicSkills.grant(runtime.deps.game, classId, ele);
    finishLoopHeroChoice(runtime, classId);
}
