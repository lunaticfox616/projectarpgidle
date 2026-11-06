// 변이시간선(data/maps.js LOOP_MUTATION, 2026-10-23 사용자 결정): 루프 5부터 그 루프의 모든 몬스터가 한 속성 피해에 면역이고 다른 한
// 속성 피해에 약하다. 루프를 넘길 때 새 루프에 표시하고(begin, 이미 루프 안에 있던 저장은 다음 루프부터), 그 루프의 첫 공격룬을 받은
// 뒤부터 걸린다(기본 공격뿐인 출발이 막히지 않게). 피해 배율(takenMul)은 몬스터에게 피해가 들어가는 자리마다 곱한다(js/combat.js,
// js/region-affix-effects.js). 저항 관통과 저항 감소는 면역을 뚫지 못한다. 혼돈 밖의 나무꾼은 빠진다.
// 첫 처치의 공격룬은 셋 중 하나를 고른다(starterChoices, data/skills.js LOOP_MUTATION_STARTER_GEMS): 고를 때까지 저장에 남는다.
const loopMutation = (() => {
    'use strict';
    const MUTATION_ELEMENTS = Object.freeze(['phys', 'fire', 'cold', 'light', 'chaos']);

    /** The mutation of a loop number: { immune, weak, empowered } (damage element keys), or null before LOOP_MUTATION.startLoop.
     * empowered: the element monsters attack harder with from LOOP_MUTATION.empowered.startLoop (empoweredElementOfLoop), else null. */
    function mutationOfLoop(loop) {
        const index = Math.floor(Number(loop) || 0) - LOOP_MUTATION.startLoop;
        if (index < 0) return null;
        const [immune, weak] = LOOP_MUTATION.schedule[index % LOOP_MUTATION.schedule.length];
        return { immune, weak, empowered: empoweredElementOfLoop(loop, immune) };
    }
    /** 강화 변이시간선의 공격 강화 속성: 루프 번호로 굴린다. 면역 속성이 LOOP_MUTATION.empowered.immuneWeight, 다른 넷이 남은 몫을 똑같이
     * 나눈다. null before the empowered loops. */
    function empoweredElementOfLoop(loop, immune) {
        const rule = LOOP_MUTATION.empowered;
        if (Math.floor(Number(loop) || 0) < rule.startLoop) return null;
        const roll = createSeededRng(`loop-mutation-empowered:${Math.floor(Number(loop))}`)();
        if (roll < rule.immuneWeight) return immune;
        const others = MUTATION_ELEMENTS.filter(ele => ele !== immune);
        return others[Math.min(others.length - 1, Math.floor((roll - rule.immuneWeight) / (1 - rule.immuneWeight) * others.length))];
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
    /** 강화 변이시간선: what a monster hit adds, LOOP_MUTATION.empowered.addedPct% of the raw hit as the empowered element after the
     * player's resistance to it (resOf(element) in %). [] while the rule does not bite, before the empowered loops and for the woodsman. */
    function empoweredRows(enemy, rawHit, resOf) {
        const rule = enemy && !enemy.isWoodsman && mutationBites() ? mutationOfLoop(game.season) : null;
        if (!rule || !rule.empowered) return [];
        const amount = Math.floor(rawHit * LOOP_MUTATION.empowered.addedPct / 100 * (1 - Math.min(100, resOf(rule.empowered)) / 100));
        return amount > 0 ? [{ ele: rule.empowered, amount }] : [];
    }
    /** Reward scale of a monster while the rule bites: 1 + LOOP_MUTATION.rewardPct / 100, or empowered.rewardPct in 강화 변이시간선;
     * 1 outside it and in the woodsman's zone. */
    function rewardMul(zone, state = game) {
        const rule = (!zone || zone.type !== 'outsideChaos') && mutationBites(state) ? mutationOfLoop(state.season) : null;
        return rule ? 1 + rewardPctOf(rule) / 100 : 1;
    }
    const rewardPctOf = rule => (rule.empowered ? LOOP_MUTATION.empowered.rewardPct : LOOP_MUTATION.rewardPct);
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
        return `${describeSides(rule)}, ${_t('보상 +{rewardPct}%', { rewardPct: rewardPctOf(rule) })}`;
    }
    function describeSides(rule) {
        if (rule.empowered) return _t('{immune} 면역, {weak} 약점, {strong} 공격 강화', { immune: _t(DAMAGE_ELEMENT_LABELS[rule.immune]),
            weak: _t(DAMAGE_ELEMENT_LABELS[rule.weak]), strong: _t(DAMAGE_ELEMENT_LABELS[rule.empowered]) });
        return _t('{DAMAGE_ELEMENT_LABELS} 면역, {DAMAGE_ELEMENT_LABELS2} 약점', { DAMAGE_ELEMENT_LABELS: DAMAGE_ELEMENT_LABELS[rule.immune], DAMAGE_ELEMENT_LABELS2: DAMAGE_ELEMENT_LABELS[rule.weak] });
    }
    /** One side of a mutation in its element's colour ('화염 면역'): the battle chip and the class screen (css/loop-mutation.css). */
    function mutationPartHtml(ele, word) {
        return `<b style="--mutation-ele:${getElementColor(ele)}">${escapeHTML(_t(DAMAGE_ELEMENT_LABELS[ele]))} ${escapeHTML(_t(word))}</b>`;
    }
    /** Every side of a mutation as coloured parts: the immunity, the weakness and, in 강화 변이시간선, the empowered attack. */
    function mutationPartsHtml(rule, separator = '') {
        const parts = [mutationPartHtml(rule.immune, '면역'), mutationPartHtml(rule.weak, '약점')];
        if (rule.empowered) parts.push(mutationPartHtml(rule.empowered, '공격 강화'));
        parts.push(`<b class="loop-mutation-reward">${escapeHTML(_t('보상 +{rewardPct}%', { rewardPct: rewardPctOf(rule) }))}</b>`);
        return parts.join(separator);
    }

    return Object.freeze({ of: mutationOfLoop, current: currentMutation, bites: mutationBites, takenMul, begin: beginLoop,
        starterChoices, pendingStarter, offerStarter, takeStarter, describe: describeMutation, partHtml: mutationPartHtml, partsHtml: mutationPartsHtml,
        empoweredRows, rewardMul, rewardPct: rewardPctOf });
})();
safeExposeGlobals({ loopMutation });
