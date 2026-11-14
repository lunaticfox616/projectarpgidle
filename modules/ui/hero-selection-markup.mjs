export function buildHeroChoiceTooltipHtml({ deps }, classId, experienced) {
    const def = deps.PLAYER_CLASS_DEFS[classId];
    if (!def) return '';
    const basic = deps.BASIC_SKILL_WEAPONS.find(row => row.family === deps.basicSkills.familyOf(classId));
    return `<div class="tooltip-title">${deps.escapeHTML(deps._t(def.label))}${experienced ? deps._t(' <span style="color:#9fd8ff;">경험함</span>') : ''}</div>
        ${basic ? `<div class="tooltip-line" style="color:#f6c461;">${deps.escapeHTML(deps._t('기초 스킬: {name}, 속성은 골라서 받습니다', { name: deps._t(basic.base) }))}</div>
        <div class="tooltip-line">${deps.escapeHTML(deps._t(basic.desc))}</div>` : ''}
        <div class="tooltip-line" style="color:#d8b4ff;">전직: ${deps.escapeHTML(deps.getAscendanciesForClass(classId).map(id => deps.CLASS_TEMPLATES[id].name).join(', '))}</div>`;
}

export function showHeroChoiceTooltip(runtime, event, classId, experienced) {
    const { deps } = runtime;
    if (typeof deps.showInfoTooltipHtml !== 'function' || deps.uiDisplay.matches('(max-width: 1080px)')) return;
    deps.showInfoTooltipHtml(event.clientX, event.clientY, buildHeroChoiceTooltipHtml(runtime, classId, !!experienced), '#f6c461');
}

export function renderLoopHeroChoiceDetail(runtime, classId, experienced) {
    const { document } = runtime.deps;
    const detail = document.getElementById('loop-hero-select-detail'), start = document.getElementById('loop-hero-select-start');
    if (!detail || !start) return;
    detail.innerHTML = classId ? buildHeroChoiceTooltipHtml(runtime, classId, !!experienced) : '';
    start.value = classId || '';
    start.disabled = !classId;
    if (!classId) return;
    document.querySelectorAll('#loop-hero-select-grid [data-class-id]').forEach(card => {
        const selected = card.dataset.classId === classId;
        card.setAttribute('aria-pressed', String(selected));
        if (selected) card.scrollIntoView({ block: 'nearest' });
    });
}

export function loopHeroMutationHtml({ deps }) {
    const rule = deps.loopMutation.current();
    if (!rule) return '';
    return `<span class="loop-hero-mutation">${deps.escapeHTML(deps._t(rule.empowered ? '강화 변이시간선' : '변이시간선'))}: ${deps.loopMutation.partsHtml(rule, ', ')}</span>`;
}

export function heroChoicesHtml({ deps }) {
    const experienced = new Set(deps.game.heroSelectionInitialized && Array.isArray(deps.game.discoveredClassIds) ? deps.game.discoveredClassIds : []);
    return deps.PLAYER_CLASS_ORDER.map(id => {
        const def = deps.PLAYER_CLASS_DEFS[id], known = experienced.has(id);
        const badge = known ? '<span class="hero-choice-badge">경험함</span>' : '';
        return `<button class="reward-choice hero-choice" aria-label="${deps._t('{label} 선택', { label: deps.escapeHTML(deps._t(def.label)) })}" data-class-id="${deps.escapeHTML(id)}" data-experienced="${known}" data-info-tooltip-anchor="1">${badge}<img class="hero-choice-portrait" src="${deps.escapeHTML(def.portrait)}" alt="" draggable="false"><strong>${deps.escapeHTML(deps._t(def.label))}</strong></button>`;
    }).join('');
}

export function loopBasicSkillCardHtml({ deps }, name, ele, rule) {
    const weak = rule && rule.weak === ele ? deps._t(', 약점 피해 +{weakTakenPct}%', { weakTakenPct: deps.LOOP_MUTATION.weakTakenPct }) : '';
    return `<button type="button" class="basic-skill-choice" style="--basic-ele:${deps.getElementColor(ele)}" data-basic-element="${ele}">
        <img class="basic-skill-icon" src="${deps.escapeHTML(deps.SKILL_GEM_ART_PATHS[name] || '')}" alt="" draggable="false">
        <strong>${deps.escapeHTML(deps._t(name))}</strong><span class="basic-skill-element">${deps.escapeHTML(deps._t(deps.DAMAGE_ELEMENT_LABELS[ele]) + weak)}</span>
        <small>${deps.escapeHTML(deps._t(deps.SKILL_DB[name].desc))}</small></button>`;
}
