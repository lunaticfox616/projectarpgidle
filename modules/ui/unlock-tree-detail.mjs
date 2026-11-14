import { view_cardName, gainOf } from './unlock-tree-labels.mjs';
import { stateOf } from './unlock-tree-markup.mjs';

export function goalHtml(runtime, plan) {
    if (!plan?.valid) return '';
    const def = runtime.deps.CONTENT_UNLOCK_CATALOG.find(row => row.id === plan.id);
    const status = plan.complete ? (0, runtime.deps._t)('목표 달성 · 다음 목표를 골라 보세요') : (0, runtime.deps._t)('남은 경로 {cost}P · 부족 {deficit}P', { cost: plan.totalCost, deficit: plan.deficit });
    return `<div class="unlock-goal${plan.complete ? ' is-complete' : ''}" aria-label="${(0, runtime.deps._t)('고정한 해금 목표')}"><button type="button" data-unlock-select="${def.id}"><b>${(0, runtime.deps._t)('목표')} · ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(def.name))}</b><span>${status}</span></button>
            <button type="button" data-unlock-goal-clear="1" aria-label="${(0, runtime.deps._t)('해금 목표 해제')}">${(0, runtime.deps._t)('해제')}</button></div>`;
}

export function planStepsHtml(runtime, plan) {
    const steps = plan.remainingIds.map(id => runtime.deps.CONTENT_UNLOCK_CATALOG.find(row => row.id === id));
    return steps.length ? `<ol class="unlock-plan-steps">${steps.map(def => `<li><button type="button" data-unlock-select="${def.id}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(def.name))}</button><span>${runtime.deps.contentProgression.holds(def.id) ? (0, runtime.deps._t)('구매 완료') : def.cost ? `${def.cost}P` : (0, runtime.deps._t)('자동')}</span></li>`).join('')}</ol>` : `<p>${(0, runtime.deps._t)('필요한 해금을 모두 열었습니다.')}</p>`;
}

export function planHtml(runtime, def, plan) {
    if (!plan.valid) return `<p class="unlock-plan-error">${(0, runtime.deps._t)('해금 경로를 확인할 수 없습니다.')}</p>`;
    if (plan.complete) return `<p class="unlock-plan-complete">${(0, runtime.deps._t)('선택한 해금은 이미 열려 있습니다.')}</p>`;
    const pointAt = plan.pointLoop === null ? (0, runtime.deps._t)('계산할 수 없음') : plan.pointLoop === runtime.deps.game.season ? (0, runtime.deps._t)('현재 충족') : (0, runtime.deps._t)('루프 {minLoop}', { minLoop: plan.pointLoop });
    const unmet = plan.world.filter(row => !row.met).length;
    const world = plan.world.map(row => `<li class="${row.met ? 'is-met' : ''}"><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))}</b> ${row.met ? '✓' : '○'} ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.label))}</li>`).join('');
    return `<div class="unlock-plan-stats"><strong>${(0, runtime.deps._t)('남은 경로 {cost}P', { cost: plan.totalCost })}</strong><span>${(0, runtime.deps._t)('보유 {balance}P · 부족 {deficit}P', { balance: plan.balance, deficit: plan.deficit })}</span>
            <span>${(0, runtime.deps._t)('포인트 충족: {loop}', { loop: pointAt })}</span><span class="${runtime.deps.game.season >= plan.minLoop ? 'is-met' : ''}">${(0, runtime.deps._t)('루프 조건: {loop} 이상', { loop: plan.minLoop })}</span></div>
            <details class="unlock-plan-details" id="unlock-plan-${def.id}"><summary>${(0, runtime.deps._t)('남은 해금 {count}개 · 세계 조건 미충족 {unmet}개', { count: plan.remainingIds.length, unmet })}</summary><div class="unlock-plan-body"><h5>${(0, runtime.deps._t)('목표까지 필요한 해금')}</h5>${planStepsHtml(runtime, plan)}
            <h5>${(0, runtime.deps._t)('별도로 달성할 세계 조건')}</h5>${world ? `<ul class="unlock-plan-world">${world}</ul>` : `<p>${(0, runtime.deps._t)('추가 세계 조건 없음')}</p>`}<p class="unlock-plan-note">${(0, runtime.deps._t)('포인트 예상은 다른 해금에 쓰지 않을 때 기준입니다. 세계 진행 조건은 별도로 달성해야 합니다.')}</p></div></details>`;
}

export function lifecycleSummaryHtml(runtime, def) {
    const life = def.lifecycle;
    return `<div class="unlock-lifecycle-summary" aria-label="${(0, runtime.deps._t)('다음 루프에 남는 것')}"><p><b>${(0, runtime.deps._t)('유지')}</b>${(0, runtime.deps._t)('기능 해금')}${life?.kept ? ` · ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(life.kept))}` : ''}</p>
            ${life?.reset ? `<p><b>${(0, runtime.deps._t)('초기화')}</b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(life.reset))}</p>` : ''}</div>`;
}

export function pinHtml(runtime, def) {
    const pinned = runtime.deps.game.contentProgression.plannedUnlockId === def.id;
    return `<button type="button" class="unlock-pin" data-unlock-goal="${def.id}" aria-pressed="${pinned}">${(0, runtime.deps._t)(pinned ? '목표 고정 해제' : '이 해금을 목표로 고정')}</button>`;
}

export function lifecycleHtml(runtime, def) {
    const life = def.lifecycle;
    if (!life) return `<p class="unlock-lifetime-note">${(0, runtime.deps._t)('기능 해금은 다음 루프에도 유지됩니다.')}</p>`;
    return `<div class="unlock-lifetime"><h5>${(0, runtime.deps._t)('루프 전환 시, {label}', { label: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(life.label)) })}</h5><p class="unlock-lifetime-note">${(0, runtime.deps._t)('기능 해금은 영구 유지')}</p>
            ${life.kept ? `<p><b>${(0, runtime.deps._t)('유지')}</b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(life.kept))}</p>` : ''}${life.reset ? `<p><b>${(0, runtime.deps._t)('초기화')}</b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(life.reset))}</p>` : ''}</div>`;
}

export function relatedHtml(runtime, def) {
    if (!def.features) return '';
    return `<div class="unlock-related"><h5>${(0, runtime.deps._t)('포함된 성장 요소')}</h5>${def.features.map(row => `<p><strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))}</strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.description))}</p>`).join('')}</div>`;
}

export function loreHtml(runtime, id) {
    const lore = runtime.deps.STORY_LOOP_MILESTONES[id];
    if (!lore) return '';
    return `<blockquote class="story-scene-quote"><p>${lore.narration.map(line => (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(line))).join(' ')}</p><p>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(lore.quote))} - ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)((0, runtime.deps.speakerShortName)(lore.speaker)))}</p></blockquote>`;
}

export function moreHtml(runtime, def) {
    return `<details class="unlock-more" id="unlock-more-${def.id}"><summary>${(0, runtime.deps._t)('자세히')}</summary><div class="unlock-more-body">${loreHtml(runtime, def.id)}${lifecycleHtml(runtime, def)}${relatedHtml(runtime, def)}</div></details>`;
}

export function nextHtml(runtime, def) {
    const kids = runtime.state.unlockBoard.rows.filter(row => runtime.deps.contentProgression.parents(row).includes(def.id));
    if (!kids.length) return '<div class="unlock-next"></div>';
    return `<div class="unlock-next"><h5>${(0, runtime.deps._t)('이어지는 해금')}</h5><div>${kids.map(kid => `<button type="button" class="unlock-next-chip fam-${runtime.state.unlockBoard.familyOf(kid)}" data-unlock-select="${kid.id}">
            <span class="unlock-ic"><img src="${runtime.deps.contentUnlockUi.art(kid)}" alt="" loading="lazy"></span><span>${(0, runtime.deps.escapeHTML)(runtime.state.unlockBoard.isStep(kid) ? (0, runtime.deps._t)(kid.name) : view_cardName(runtime, kid))}</span></button>`).join('')}</div></div>`;
}

export function actionHtml(runtime, def, status) {
    if (status.unlocked) return runtime.deps.contentUnlockUi.routeAction(def) ? `<button type="button" class="unlock-act" data-open-content="${def.id}">${(0, runtime.deps._t)('바로 사용하기')}</button>` : `<button type="button" class="unlock-act" disabled>${(0, runtime.deps._t)('해금 완료')}</button>`;
    if (runtime.deps.contentProgression.kind(def) === 'auto') return `<button type="button" class="unlock-act" disabled>${(0, runtime.deps.escapeHTML)(status.reason)}</button>`;
    return status.available ? `<button type="button" class="unlock-act is-go" data-unlock-content="${def.id}">${(0, runtime.deps._t)('{cost}P 해금', { cost: def.cost })}</button>` : `<button type="button" class="unlock-act" disabled>${(0, runtime.deps.escapeHTML)(status.reason)}</button>`;
}

export function requirementsHtml(runtime, def) {
    return runtime.deps.contentProgression.requirements(def.id).map(row => {
        const follow = row.met ? '' : runtime.deps.contentUnlockUi.progressButton(row.route, (0, runtime.deps._t)('{label} 보기', { label: (0, runtime.deps._t)(row.label) }));
        return follow || `<span class="${row.met ? 'is-met' : ''}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.label))}</span>`;
    }).join('');
}

export function detailDescriptionHtml(runtime, def, unlocked) {
    const route = def.action?.guide || def.routes?.[0];
    const path = runtime.deps.contentUnlockUi.journeyPath(route);
    const journey = runtime.deps.EXPLORATION_REGIONS.guides[route];
    const description = unlocked && journey?.entry ? (0, runtime.deps._t)('입장 조건 · {condition}', { condition: (0, runtime.deps._t)(journey.entry) }) : (0, runtime.deps._t)(def.description);
    return `<p class="unlock-desc">${(0, runtime.deps.escapeHTML)(description)}</p>${path ? `<p class="unlock-desc">${(0, runtime.deps.escapeHTML)(path)}</p>` : ''}`;
}

export function detailHtml(runtime, def, plan) {
    const status = runtime.deps.contentProgression.status(def.id), kind = runtime.deps.contentProgression.kind(def), kindName = kind === 'auto' ? '자동 개방' : def.rail ? '강화' : '포인트 해금';
    const gain = gainOf(runtime, def);
    return `<div class="unlock-detail-art fam-${runtime.state.unlockBoard.familyOf(def)} kind-${kind} is-${stateOf(runtime, def)}"><span class="unlock-ic"><img src="${runtime.deps.contentUnlockUi.art(def)}" alt=""></span></div>
            <div class="unlock-detail-text"><span class="unlock-eyebrow fam-${runtime.state.unlockBoard.familyOf(def)}">${def.rail ? (0, runtime.deps._t)(kindName) : `${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(def.group))}, ${(0, runtime.deps._t)(kindName)}`}</span><h4>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(def.name))}${gain ? `<em>${(0, runtime.deps.escapeHTML)(gain)}</em>` : ''}</h4>
            ${detailDescriptionHtml(runtime, def, status.unlocked)}<div class="unlock-reqs">${status.unlocked ? '' : requirementsHtml(runtime, def)}</div>${planHtml(runtime, def, plan)}</div>
            ${nextHtml(runtime, def)}<div class="unlock-detail-action">${runtime.deps.contentUnlockUi.entryReward(def, status)}${actionHtml(runtime, def, status)}${lifecycleSummaryHtml(runtime, def)}${pinHtml(runtime, def)}${moreHtml(runtime, def)}</div>`;
}
