

/** 그 직업의 대표 무기 자세(greatsword, sword, bow, orb, flask, censer). 없으면 null. */
export function starterSkillFamilyOf(env, classId) { return env.deps.SKILL_RUNE_STANCE_BY_CATEGORY[env.deps.HANA_WEAPON_COMBOS.classWeapons[classId]] || null; }

/** 그 무기 계열, 그 속성의 기초 스킬 이름. 없으면 null. */
export function starterSkillNameOf(env, family, ele) {
    const row = env.deps.BASIC_SKILL_ROWS.find(entry => entry.family === family && entry.ele === ele);
    return row ? row.name : null;
}

/** 이번 루프에 고를 수 있는 속성 수: 2개, 해금마다 하나 더. */
export function starterSkillChoiceCount(env, state) {
    return 2 + env.WIDER.filter(id => env.deps.contentProgression.holds(id, state)).length;
}

/** 이번 루프의 속성 선택지(속성 순서대로): 무작위로 고르되 변이시간선의 면역 속성은 빼고, 같은 루프 안에서는 저장된 것을 그대로 쓴다. */
export function starterSkillOffer(env, state, random = Math.random) {
    const count = starterSkillChoiceCount(env, state), kept = state.basicSkillOffer;
    if (kept && kept.loop === state.season && kept.elements.length === count) return kept.elements.slice();
    const rule = env.deps.loopMutation.of(state.season), pool = env.ELEMENTS.filter(ele => !rule || ele !== rule.immune);
    const elements = pool.map(ele => ({ ele, key: random() })).sort((a, b) => a.key - b.key).slice(0, count)
        .map(row => row.ele).sort((a, b) => env.ELEMENTS.indexOf(a) - env.ELEMENTS.indexOf(b));
    state.basicSkillOffer = { loop: state.season, elements };
    return elements.slice();
}

/** 고른 속성의 기초 스킬을 받아 주 공격 칸에 낀다. 선택지에 없는 속성이면 첫째를 준다. @returns {?string} 받은 기초 스킬 */
export function* starterSkillGrant(env, state, classId, ele) {
    const offered = starterSkillOffer(env, state), pick = offered.includes(ele) ? ele : offered[0], name = starterSkillNameOf(env, starterSkillFamilyOf(env, classId), pick);
    if (!name) return null;
    if (!env.deps.hasSkillGemOwned(name, state)) state.skills.push(name);
    state.gemData[name] = state.gemData[name] || { level: 1, exp: 0 };
    if (state.skills.includes(name)) {
        state.activeSkill = name;
        yield { kind: 'fitStarterWeapon', args: [] }; // 맞는 무기를 들 때까지 기본 공격으로 쉬어 둔다(state는 지금 게임이다)
    }
    state.basicSkillElement = pick;
    state.basicSkillOffer = null;
    state.unlocks.skills = true;
    return name;
}

/** 자동 루프(js/loop-automation-ui.js)의 속성: 지난 루프와 같은 속성이 선택지에 있으면 그것, 없으면 첫째. */
export function starterSkillAutoPick(env, state) {
    const offered = starterSkillOffer(env, state);
    return offered.includes(state.basicSkillElement) ? state.basicSkillElement : offered[0];
}
