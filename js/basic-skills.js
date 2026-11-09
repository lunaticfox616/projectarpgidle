/** 기초 스킬의 지급(2026-11-09 스킬 전체 전달본 V3.14, 사용자: "캐릭터 고를 때, 5가지 속성 중 랜덤 2개 중 선택해서 시작할 수 있게하고,
 * 변이시간선에서는 면역인 속성은 안나오게", "루프 15, 30쯤 기초 룬 속성 선택지를 3개, 4개 중에 하나씩 고를 수 있게 해주는 해금").
 * 루프를 시작하며 직업을 고르면 이어서 속성을 고르고(js/passives.js chooseLoopHero), 그 직업 대표 무기 계열(data/hana-weapon-combos.js
 * classWeapons)의 기초 스킬을 받아 주 공격 칸에 낀다. 무기는 그 루프의 첫 처치가 떨어뜨리고(js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill),
 * 맞는 무기를 들 때까지 기초 스킬은 쉬어 기본 공격으로 싸운다(js/skills.js fitActiveSkillToWeapon). 고를 속성은 루프마다 한 번 굴려 저장에
 * 남긴다(창을 다시 열어도 같다). 데이터는 data/skills.js BASIC_SKILL_ROWS. 화면은 js/basic-skill-pick-ui.js.
 */
const basicSkills = (() => {
    'use strict';
    const ELEMENTS = Object.freeze(BASIC_SKILL_ELEMENTS.map(row => row.ele));
    /** 선택지를 하나씩 늘리는 해금(data/content-progression.js). */
    const WIDER = Object.freeze(['basicElement3', 'basicElement4']);
    /** 첫 무기 장착 안내의 열쇠(seenTutorials). 이름은 예전 첫 스킬룬 장착 안내 그대로라, 그 안내를 본 저장은 무기 안내를 다시 보지 않는다. */
    const weaponGuide = 'tutorial_starter_gem_equip';

    /** 그 직업의 대표 무기 자세(greatsword, sword, bow, orb, flask, censer). 없으면 null. */
    const familyOf = classId => SKILL_RUNE_STANCE_BY_CATEGORY[HANA_WEAPON_COMBOS.classWeapons[classId]] || null;
    /** 그 무기 계열, 그 속성의 기초 스킬 이름. 없으면 null. */
    function nameOf(family, ele) {
        const row = BASIC_SKILL_ROWS.find(entry => entry.family === family && entry.ele === ele);
        return row ? row.name : null;
    }
    /** 이번 루프에 고를 수 있는 속성 수: 2개, 해금마다 하나 더. */
    function choiceCount(state = game) {
        return 2 + WIDER.filter(id => contentProgression.holds(id, state)).length;
    }
    /** 이번 루프의 속성 선택지(속성 순서대로): 무작위로 고르되 변이시간선의 면역 속성은 빼고, 같은 루프 안에서는 저장된 것을 그대로 쓴다. */
    function offer(state = game, random = Math.random) {
        const count = choiceCount(state), kept = state.basicSkillOffer;
        if (kept && kept.loop === state.season && kept.elements.length === count) return kept.elements.slice();
        const rule = loopMutation.of(state.season), pool = ELEMENTS.filter(ele => !rule || ele !== rule.immune);
        const elements = pool.map(ele => ({ ele, key: random() })).sort((a, b) => a.key - b.key).slice(0, count)
            .map(row => row.ele).sort((a, b) => ELEMENTS.indexOf(a) - ELEMENTS.indexOf(b));
        state.basicSkillOffer = { loop: state.season, elements };
        return elements.slice();
    }
    /** 고른 속성의 기초 스킬을 받아 주 공격 칸에 낀다. 선택지에 없는 속성이면 첫째를 준다. @returns {?string} 받은 기초 스킬 */
    function grant(state, classId, ele) {
        const offered = offer(state), pick = offered.includes(ele) ? ele : offered[0], name = nameOf(familyOf(classId), pick);
        if (!name) return null;
        if (!hasSkillGemOwned(name, state)) state.skills.push(name);
        state.gemData[name] = state.gemData[name] || { level: 1, exp: 0 };
        if (state.skills.includes(name)) {
            state.activeSkill = name;
            fitActiveSkillToWeapon();   // 맞는 무기를 들 때까지 기본 공격으로 쉬어 둔다(state는 지금 게임이다)
        }
        state.basicSkillElement = pick;
        state.basicSkillOffer = null;
        state.unlocks.skills = true;
        return name;
    }
    /** 자동 루프(js/loop-automation-ui.js)의 속성: 지난 루프와 같은 속성이 선택지에 있으면 그것, 없으면 첫째. */
    function autoPick(state = game) {
        const offered = offer(state);
        return offered.includes(state.basicSkillElement) ? state.basicSkillElement : offered[0];
    }
    return Object.freeze({ weaponGuide, familyOf, nameOf, choiceCount, offer, grant, autoPick });
})();
safeExposeGlobals({ basicSkills });
