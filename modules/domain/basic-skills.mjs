/** 기초 스킬의 지급(2026-11-09 스킬 전체 전달본 V3.14, 사용자: "캐릭터 고를 때, 5가지 속성 중 랜덤 2개 중 선택해서 시작할 수 있게하고,
 * 변이시간선에서는 면역인 속성은 안나오게", "루프 15, 30쯤 기초 룬 속성 선택지를 3개, 4개 중에 하나씩 고를 수 있게 해주는 해금").
 * 루프를 시작하며 직업을 고르면 이어서 속성을 고르고(js/passives.js chooseLoopHero), 그 직업 대표 무기 계열(data/hana-weapon-combos.js
 * classWeapons)의 기초 스킬을 받아 주 공격 칸에 낀다. 무기는 그 루프의 첫 처치가 떨어뜨리고(js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill),
 * 맞는 무기를 들 때까지 기초 스킬은 쉬어 기본 공격으로 싸운다(js/skills.js fitActiveSkillToWeapon). 고를 속성은 루프마다 한 번 굴려 저장에
 * 남긴다(창을 다시 열어도 같다). 데이터는 data/skills.js BASIC_SKILL_ROWS. 화면은 js/basic-skill-pick-ui.js.
 */
import { starterSkillFamilyOf, starterSkillNameOf, starterSkillChoiceCount, starterSkillOffer, starterSkillGrant, starterSkillAutoPick } from './basic-skills-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createBasicSkills(deps) {
    const env = { deps };
    env.ELEMENTS = Object.freeze(env.deps.BASIC_SKILL_ELEMENTS.map(row => row.ele));
    env.WIDER = Object.freeze(['basicElement3', 'basicElement4']);
    env.weaponGuide = 'tutorial_starter_gem_equip';
    return Object.freeze({ weaponGuide: env.weaponGuide, familyOf: (...args) => starterSkillFamilyOf(env, ...args), nameOf: (...args) => starterSkillNameOf(env, ...args), choiceCount: (...args) => starterSkillChoiceCount(env, ...args), offer: (...args) => starterSkillOffer(env, ...args), grant: (...args) => starterSkillGrant(env, ...args), autoPick: (...args) => starterSkillAutoPick(env, ...args) });
}
