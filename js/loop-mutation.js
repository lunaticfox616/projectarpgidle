// 변이시간선(data/maps.js LOOP_MUTATION, 2026-10-23 사용자 결정): 루프 5부터 그 루프의 모든 몬스터가 한 속성 피해에 면역이고 다른 한
// 속성 피해에 약하다. 루프를 넘길 때 새 루프에 표시하고(begin, 이미 루프 안에 있던 저장은 다음 루프부터), 주 공격 칸의 룬으로 싸우기
// 시작한 뒤부터 걸린다(무기를 들기 전 기본 공격뿐인 출발이 막히지 않게. 2026-11-09부터 기초 스킬은 직업을 고를 때 받는다). 피해 배율(takenMul)은
// 몬스터에게 피해가 들어가는 자리마다 곱한다(js/combat.js, js/region-affix-effects.js). 저항 관통과 저항 감소는 면역을 뚫지 못한다. 혼돈 밖의
// 나무꾼은 빠진다. 기초 스킬의 속성 선택지에는 그 루프의 면역 속성이 나오지 않는다(js/basic-skills.js offer).
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
    /** Whether it acts now: this loop's mutation, once the hero fights with a rune (not 기본 공격: the basic skill rests until its weapon). */
    function mutationBites(state = game) {
        return !!currentMutation(state) && !!state.activeSkill && state.activeSkill !== '기본 공격';
    }
    /** Damage-taken scale of an element on a monster: 0 for the immune element, 1 + LOOP_MUTATION.weakTakenPct / 100 for the weak
     * one, else 1 (also outside a mutation loop and for the woodsman). */
    function takenMul(enemy, ele) {
        if (!enemy || enemy.isWoodsman || !mutationBites()) return 1;
        const rule = mutationOfLoop(game.season);
        if (ele === rule.immune) return 0;
        return ele === rule.weak ? 1 + LOOP_MUTATION.weakTakenPct / 100 : 1;
    }
    /** 강화 변이시간선: what a monster hit adds before the player's mitigation, LOOP_MUTATION.empowered.addedPct% of the raw hit as the
     * empowered element ({ ele, amount }). The hit puts it through the same mitigation as its own damage of that element (js/combat.js
     * performMonsterAttacks). null while the rule does not bite, before the empowered loops and for the woodsman. */
    function empoweredHit(enemy, rawHit) {
        const rule = enemy && !enemy.isWoodsman && mutationBites() ? mutationOfLoop(game.season) : null;
        if (!rule || !rule.empowered) return null;
        const amount = Math.floor(rawHit * LOOP_MUTATION.empowered.addedPct / 100);
        return amount > 0 ? { ele: rule.empowered, amount } : null;
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
    /** '화염 면역, 냉기 약점' for a mutation. */
    function describeMutation(rule) {
        return `${describeSides(rule)}, ${_t('보상 +{rewardPct}%', { rewardPct: rewardPctOf(rule) })}`;
    }
    function describeSides(rule) {
        if (rule.empowered) return _t('{immune} 면역, {weak} 약점, {strong} 공격 강화', { immune: _t(DAMAGE_ELEMENT_LABELS[rule.immune]),
            weak: _t(DAMAGE_ELEMENT_LABELS[rule.weak]), strong: _t(DAMAGE_ELEMENT_LABELS[rule.empowered]) });
        return _t('{DAMAGE_ELEMENT_LABELS} 면역, {DAMAGE_ELEMENT_LABELS2} 약점', { DAMAGE_ELEMENT_LABELS: _t(DAMAGE_ELEMENT_LABELS[rule.immune]), DAMAGE_ELEMENT_LABELS2: _t(DAMAGE_ELEMENT_LABELS[rule.weak]) });
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
        describe: describeMutation, partHtml: mutationPartHtml, partsHtml: mutationPartsHtml,
        empoweredHit, rewardMul, rewardPct: rewardPctOf });
})();
safeExposeGlobals({ loopMutation });
