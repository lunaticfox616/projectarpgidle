// 변이시간선(data/maps.js LOOP_MUTATION, 2026-10-23 사용자 결정): 루프 5부터 그 루프의 모든 몬스터가 한 속성 피해에 면역이고 다른 한
// 속성 피해에 약하다. 루프를 넘길 때 새 루프에 표시하고(begin, 이미 루프 안에 있던 저장은 다음 루프부터), 그 루프의 첫 공격룬을 받은
// 뒤부터 걸린다(기본 공격뿐인 출발이 막히지 않게). 피해 배율(takenMul)은 몬스터에게 피해가 들어가는 자리마다 곱한다(js/combat.js,
// js/region-affix-effects.js). 저항 관통과 저항 감소는 면역을 뚫지 못한다. 혼돈 밖의 나무꾼은 빠진다.
// 첫 처치의 공격룬은 셋 중 하나를 고른다(starterChoices, data/skills.js LOOP_MUTATION_STARTER_GEMS): 고를 때까지 저장에 남는다.
const loopMutation = (() => {
    'use strict';
    const MUTATION_ELEMENTS = Object.freeze(['phys', 'fire', 'cold', 'light', 'chaos']);

    /** The mutation of a loop number: { immune, weak } (damage element keys), or null before LOOP_MUTATION.startLoop. */
    function mutationOfLoop(loop) {
        const index = Math.floor(Number(loop) || 0) - LOOP_MUTATION.startLoop;
        if (index < 0) return null;
        const [immune, weak] = LOOP_MUTATION.schedule[index % LOOP_MUTATION.schedule.length];
        return { immune, weak };
    }
    /** This loop's mutation when the loop was entered under the rule, else null. */
    function currentMutation(state = game) {
        return state && state.loopMutationSeason === state.season ? mutationOfLoop(state.season) : null;
    }
    /** Whether it acts now: this loop's mutation, once the hero holds a rune beside 기본 공격. */
    function mutationBites(state = game) {
        return !!currentMutation(state) && Array.isArray(state.skills) && state.skills.length > 1;
    }
    /** Damage-taken scale of an element on a monster: 0 for the immune element, 1 + LOOP_MUTATION.weakTakenPct / 100 for the weak
     * one, else 1 (also outside a mutation loop and for the woodsman). */
    function takenMul(enemy, ele) {
        if (!enemy || enemy.isWoodsman || !mutationBites()) return 1;
        const rule = mutationOfLoop(game.season);
        if (ele === rule.immune) return 0;
        return ele === rule.weak ? 1 + LOOP_MUTATION.weakTakenPct / 100 : 1;
    }
    /** At a loop's start (after the loop number went up): mark it when the rule covers it. */
    function beginLoop(state) {
        state.loopMutationSeason = mutationOfLoop(state.season) ? state.season : 0;
    }
    /** The element of a class's own starter rune (data/skills.js LOOP_STARTER_GEM_BY_HERO). */
    function classStarterElement(classId) {
        const def = PLAYER_CLASS_DEFS[classId];
        const gem = def ? LOOP_STARTER_GEM_BY_HERO[def.recommendedTalentHeroId] : null;
        return gem && SKILL_DB[gem] ? SKILL_DB[gem].ele : null;
    }
    /** The three runes the first kill offers a class in this loop: the weak element's first, then the class's own element, then the
     * rest in MUTATION_ELEMENTS order, never the immune element. null outside a mutation loop or for an unknown class. */
    function starterChoices(classId, state = game) {
        const rule = currentMutation(state), row = LOOP_MUTATION_STARTER_GEMS[classId];
        if (!rule || !row) return null;
        const order = [rule.weak, classStarterElement(classId), ...MUTATION_ELEMENTS];
        const names = [];
        order.forEach(ele => {
            const name = ele === rule.immune ? null : row[ele];
            if (name && SKILL_DB[name] && !names.includes(name)) names.push(name);
        });
        return names.slice(0, 3);
    }
    /** The saved pick waiting for the hero, or null. */
    function pendingStarter(state = game) {
        const row = state.pendingStarterRuneChoice;
        return row && Array.isArray(row.gems) && row.gems.length ? row.gems : null;
    }
    /** Holds the first kill's pick until the hero chooses (saved, so a reload asks again; js/save-migrations.js normalizeLoopMutationState). */
    function offerStarter(state, gems) {
        state.pendingStarterRuneChoice = { gems: gems.slice(0, 3) };
    }
    /** Ends the pick: the named rune when it was offered, else the first. Returns that rune, or null when nothing waits. */
    function takeStarter(state, name) {
        const gems = pendingStarter(state);
        state.pendingStarterRuneChoice = null;
        if (!gems) return null;
        return gems.includes(name) ? name : gems[0];
    }
    /** '화염 면역, 냉기 약점' for a mutation. */
    function describeMutation(rule) {
        return `${DAMAGE_ELEMENT_LABELS[rule.immune]} 면역, ${DAMAGE_ELEMENT_LABELS[rule.weak]} 약점`;
    }

    return Object.freeze({ of: mutationOfLoop, current: currentMutation, bites: mutationBites, takenMul, begin: beginLoop,
        starterChoices, pendingStarter, offerStarter, takeStarter, describe: describeMutation });
})();
safeExposeGlobals({ loopMutation });
