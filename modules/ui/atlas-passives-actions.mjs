// 아틀라스 패시브의 별자리 화면(개편 2026-11-24 B): 태양, 세계수, 달 세 기둥에 별 24개(천문도 표의 자리), 이음 37개, 고른 별의 설명 상자,
// 포인트 줄. 별을 누르면 고르고, 설명 상자의 단추로 할당하거나 회수한다. 규칙은 js/atlas-passives.js가 정한다.

/** 고른 별: 누른 별, 처음에는 할당한 첫 별, 없으면 세계수의 시작 별. */
export function focusStar(runtime) {
    const stars = runtime.deps.atlasPassives.stars, taken = runtime.deps.game.atlas.passives;
    return stars.get(runtime.state.focusId) || stars.get(taken[0]) || stars.get(runtime.state.FIRST_FOCUS);
}

export function branchOf(runtime, star) { return runtime.deps.atlasPassives.branches.find(row => row.side === star.side); }

/** 이음 하나(시뮬레이터 .atlas-star-links): 양 끝을 모두 할당했으면 'done'(굵게), 한쪽만 'lit'(실선), 아니면 'dim'(점선). 빛깔은 앞 별의 갈래, 권역을 넘는 이음은 is-cross(갈색). */
export function linkHtml(runtime, [a, b]) {
    const stars = runtime.deps.atlasPassives.stars, taken = runtime.deps.game.atlas.passives, from = stars.get(a), to = stars.get(b);
    const ends = [a, b].filter(id => taken.includes(id)).length, state = ['dim', 'lit', 'done'][ends];
    return `<line class="side-${from.side} is-${state}${from.side === to.side ? '' : ' is-cross'}" x1="${from.point[0]}" y1="${from.point[1]}" x2="${to.point[0]}" y2="${to.point[1]}" vector-effect="non-scaling-stroke"/>`;
}

/** 별(시뮬레이터 .atlas-star): 둥근 메달 안의 무늬(GLYPH)와 아래의 이름 판. 할당한 별은 갈래 빛깔로 차고, 관(최종 별)은 겹테. */
export function starHtml(runtime, star, focusId) {
    const status = runtime.deps.atlasPassives.status(runtime.deps.game, star.id), kind = star.start ? ' kind-start' : star.keystone ? ' kind-keystone' : '';
    const name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(star.name)), label = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(star.label || star.name));
    const glyph = runtime.state.GLYPH[star.start ? 'start' : status === 'locked' ? 'hollow' : 'full'];
    return `<button type="button" class="ast-star is-${status} side-${star.side}${kind}${star.id === focusId ? ' is-focus' : ''}" style="--x:${star.point[0]}%;--y:${star.point[1]}%"
            aria-pressed="${star.id === focusId}" aria-label="${name}, ${(0, runtime.deps._t)(runtime.state.STATUS[status])}" onclick="atlasPassivesUi.pick('${star.id}')"><i aria-hidden="true">${glyph}</i><span>${label}</span></button>`;
}

/** 세 기둥의 머리(작은 표, 갈래 이름, 그 갈래가 주는 것)와 별 판: 별과 이음은 판의 백분율 자리에 선다(천문도 표의 point). */
export function boardHtml(runtime, focusId) {
    const passives = runtime.deps.atlasPassives, esc = text => (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(text)), heads = passives.branches.map(row => {
        const x = Math.round(row.stars.reduce((sum, id) => sum + passives.stars.get(id).point[0], 0) / row.stars.length);
        return `<div class="side-${row.side}" style="--x:${x}%"><b>${runtime.state.HEAD_MARK[row.side]}${esc(row.name)}</b><small>${esc(runtime.state.FOCUS[row.side])}</small></div>`;
    }).join('');
    return `<div class="ast-board-box"><div class="ast-heads">${heads}</div><div class="ast-board" role="group" aria-label="${(0, runtime.deps._t)('패시브 별자리')}">
            <svg class="ast-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${passives.links.map(link => linkHtml(runtime, link)).join('')}</svg>
            ${[...passives.stars.values()].map(star => starHtml(runtime, star, focusId)).join('')}</div></div>`;
}

/** 포인트 줄: 쓸 수 있는 점수와 얻은 점수, 다음 1점까지의 첫 완료. */
export function pointsHtml(runtime) {
    const passives = runtime.deps.atlasPassives, game = runtime.deps.game, points = passives.points(game), next = passives.nextMilestone(game);
    const line = points >= passives.maximum || next === null ? (0, runtime.deps._t)('모든 패시브 포인트 획득')
        : (0, runtime.deps._t)('지도 첫 완료 {count}/{next}, 다음 1점', { count: passives.firstClears(game), next });
    return `<div class="ast-points"><p class="ast-meter" style="--fill:${Math.round(points / passives.maximum * 100)}%"><b>${(0, runtime.deps._t)('사용 가능 {count}점, 획득 {points}/{max}점', { count: passives.available(game), points, max: passives.maximum })}</b></p>
            <p class="ast-next">${line}</p></div>`;
}

/** 고른 별의 상자: 권역과 상태, 이름, 효과 글, 막는 까닭, 할당이나 회수 단추. */
export function detailHtml(runtime, star) {
    const passives = runtime.deps.atlasPassives, game = runtime.deps.game, status = passives.status(game, star.id), taken = status === 'taken';
    const reason = taken ? passives.refundReason(game, star.id) : passives.reason(game, star.id), esc = text => (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(text));
    const action = taken ? ['atlasPassivesUi.giveBack()', '회수'] : ['atlasPassivesUi.take()', '할당'];
    return `<section class="ast-detail side-${star.side}${star.keystone ? ' kind-keystone' : ''}" aria-live="polite"><small>${esc(branchOf(runtime, star).name)}, ${esc(runtime.state.STATUS[status])}</small>
            <h3>${esc(star.name)}</h3><p>${esc(star.effect)}</p>${reason ? `<p class="ast-reason">${esc(reason)}</p>` : ''}
            <button type="button" class="atlas-primary" onclick="${action[0]}" ${reason ? 'disabled' : ''}>${esc(action[1])}</button></section>`;
}

export function html(runtime) {
    const star = focusStar(runtime);
    return `<div class="atlas-stars">${pointsHtml(runtime)}${boardHtml(runtime, star.id)}<aside class="ast-side">${detailHtml(runtime, star)}</aside></div>`;
}

/** 별을 고른다. 휴대폰에서 설명 상자는 화면 아래에 붙어 있으므로(css/atlas-sheet.css), 고른 별이 그 밑에 깔리면 별을 화면 가운데로 민다. */
export function pick(runtime, id) {
    runtime.state.focusId = id;
    runtime.deps.atlasUi.refresh();
    const doc = runtime.deps.document, star = doc.querySelector('#ui-atlas .ast-star.is-focus'), box = doc.querySelector('#ui-atlas .ast-detail');
    if (!star || !box) return;
    const a = star.getBoundingClientRect(), b = box.getBoundingClientRect();
    if (a.bottom > b.top && a.top < b.bottom && a.right > b.left && a.left < b.right) star.scrollIntoView({ block: 'center' });
}

/** 고른 별에 할당하거나(take) 회수하고(giveBack) 저장한다. 막혔으면 아무것도 바꾸지 않는다(까닭은 설명 상자가 이미 보인다). */
export function changeStar(runtime, refund) {
    const passives = runtime.deps.atlasPassives, game = runtime.deps.game, id = focusStar(runtime).id;
    const reason = refund ? passives.refund(game, id) : passives.allocate(game, id);
    if (!reason) (0, runtime.deps.queueImportantSave)(200);
    runtime.deps.atlasUi.refresh();
}

export function take(runtime) { changeStar(runtime, false); }

export function giveBack(runtime) { changeStar(runtime, true); }
