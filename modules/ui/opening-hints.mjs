import { lesson, lying, doorToRescue, actRun, seen } from './opening-lessons.mjs';

/** The card stays through the story lines, the guide cards and the rune window (2026-10-27 사용자: 대사나 첫 스킬룬 장착 창이 떠도
 * 계속 켜져 있게, 스킬룬 창보다는 밑에): it lives in the battlefield box, so windows over the battlefield cover it. */
export function hintFor(runtime) {
    if (runtime.state.intro) return null;
    const step = lesson(runtime);
    if (step === 'rise') return lying(runtime) ? 'rise' : null;
    if (step === 'equip') return weaponInHand(runtime) ? 'equip' : lessonHint(runtime, 'attack');
    if (step) return lessonHint(runtime, step);
    return autoHintDue(runtime) ? 'auto' : systemHint(runtime);
}

export function systemHint(runtime) {
    const cue = runtime.deps.contentProgression.opening.nextCue(runtime.deps.game);
    return cue && !(0, runtime.deps.isRewardOpen)() && !(0, runtime.deps.actRewardPromptPending)() ? `system:${cue}` : null;
}

/** Before Haken's room is reached the attack lesson names the door to take; inside it, while the monster is beyond a phone's few
 * cells of view, the side to walk to. */
export function lessonHint(runtime, step) {
    if (step !== 'attack') return step;
    const door = doorToRescue(runtime, actRun(runtime)), far = rescueSide(runtime);
    return door ? `go:${door}` : far ? `attack:${far}` : step;
}

export function rescueSide(runtime) {
    const enemy = runtime.deps.game.enemies.find(row => row && row.rescue), dx = enemy ? enemy.gx - runtime.deps.game.gridPlayer.gx : 0;
    return Math.abs(dx) > 3 ? (dx > 0 ? 'east' : 'west') : null;
}

export function lessonCardHtml(runtime, name, arg) {
    if (runtime.deps.contentProgression.opening.applies(runtime.deps.game)) {
        if (name === 'equip') return `<button class="opening-lesson-action" type="button" data-opening-weapon>${(0, runtime.deps._t)('무기 장착하기')}</button>`;
        if (name === 'system') {
            const description = arg === 'tab-items'
                ? `<p class="opening-lesson-text">${(0, runtime.deps._t)('가방의 장비를 착용 중인 장비와 비교해 바꿔 낄 수 있습니다.')}</p>` : '';
            return description + `<button class="opening-lesson-action" type="button" data-opening-route="${arg}">${(0, runtime.deps._t)(runtime.state.SYSTEM_CUES[arg])}</button>`;
        }
        return `<p class="opening-lesson-text">${runtime.state.HINTS[name](arg)}</p>`;
    }
    const at = runtime.state.LESSON_ORDER.indexOf(name === 'go' ? 'attack' : name);
    const dots = runtime.state.LESSON_ORDER.map((_, i) => `<i class="${i < at ? 'is-done' : i === at ? 'is-now' : ''}"></i>`).join('');
    return `<div class="opening-lesson-head"><span class="opening-lesson-kicker">${(0, runtime.deps._t)('시작 안내 {value}/{length}', { value: at + 1, length: runtime.state.LESSON_ORDER.length })}</span><span class="opening-lesson-dots" aria-hidden="true">${dots}</span></div>`
        + `<strong class="opening-lesson-title">${(0, runtime.deps._t)(runtime.state.LESSON_TITLES[name])}</strong><p class="opening-lesson-text">${runtime.state.HINTS[name](arg)}</p>`;
}

/** Stop pointing to Auto once the player turns it on or deliberately walks on. */
export function autoHintDue(runtime) {
    if (!runtime.state.autoHint) return false;
    const { gx, gy } = runtime.deps.game.gridPlayer;
    if (runtime.state.autoHint.owner !== runtime.deps.game || runtime.state.autoHint.run !== actRun(runtime) || runtime.deps.game.settings.autoMove || gx !== runtime.state.autoHint.gx || gy !== runtime.state.autoHint.gy) {
        runtime.state.autoHint = null;
    }
    return !!runtime.state.autoHint;
}

/** The card and the arrow live in the battlefield box and are placed in its own pixels each tick, from the canvas offsets: page
 * pixels went off under the UI scale (the root zoom) and on other screen sizes (2026-10-27 사용자: 화면 크기에 따라 창과 화살표
 * 자리를 맞추게). Whole pixels: a translate(-50%) put the pixel font on half pixels and blurred it. */
export function fieldMark(runtime, el, className, attr) {
    const wrap = runtime.deps.document.getElementById('battlefield-wrap');
    if (el && el.parentElement === wrap) return el;
    if (!el) { el = runtime.deps.document.createElement('div'); el.className = className; el.setAttribute(...attr); }
    if (wrap) wrap.appendChild(el);
    return el;
}

export function place(runtime, el, left, top) {
    const x = `${Math.round(left)}px`, y = `${Math.round(top)}px`;
    if (el.style.left !== x) el.style.left = x;
    if (el.style.top !== y) el.style.top = y;
}

/** The lesson card over the battlefield's top middle. */
export function showHint(runtime, step) {
    runtime.state.hintEl = fieldMark(runtime, runtime.state.hintEl, 'opening-lesson', ['role', 'status']);
    if (runtime.state.hintEl.hidden !== !step) runtime.state.hintEl.hidden = !step;
    runtime.deps.document.getElementById('btn-act-exploration-auto')?.classList.toggle('is-opening-glow', step === 'auto');
    const canvas = runtime.deps.document.getElementById('battlefield-canvas');
    showWakeMark(runtime, step === 'rise' && !runtime.state.rising, canvas);
    if (!step || !canvas) return markLessonBottom(runtime, null);
    const fresh = runtime.state.hintEl.dataset.step !== step || runtime.state.hintEl.dataset.language !== runtime.deps.i18n.language;
    if (fresh) {
        const [name, arg] = step.split(':');
        runtime.state.hintEl.dataset.step = step;
        runtime.state.hintEl.dataset.language = runtime.deps.i18n.language;
        runtime.state.hintEl.classList.remove('is-compact');
        runtime.state.hintEl.innerHTML = lessonCardHtml(runtime, name, arg);
    }
    // A new battlefield size places the card afresh: kept from a wide window, its spot under the hero sat below a phone's short
    // battlefield, out of sight (2026-11-03 사용자: 화면 크기를 왔다갔다 하면 알림창이 안 보이는 곳으로 내려간다).
    const field = `${canvas.offsetWidth}x${canvas.offsetHeight}`, resized = field !== runtime.state.hintField;
    runtime.state.hintField = field;
    const top = cardTop(runtime, canvas, fresh || resized);
    place(runtime, runtime.state.hintEl, canvas.offsetLeft + (canvas.offsetWidth - runtime.state.hintEl.offsetWidth) / 2, canvas.offsetTop + top);
    markLessonBottom(runtime, canvas.offsetTop + top + runtime.state.hintEl.offsetHeight);
}

/** The card's bottom (battlefield px), or null without a card: on a tall screen the targeted enemy's health bar stands under it
 * (css/themes/rift-stage.css --lesson-bottom, 2026-11-03 사용자: 적 생명력 게이지는 안내창보다 밑에). Written only when it changes. */
export function markLessonBottom(runtime, bottom) {
    const tab = runtime.deps.document.getElementById('tab-battle'), value = bottom === null ? '' : `${Math.round(bottom)}px`;
    if (tab && tab.style.getPropertyValue('--lesson-bottom') !== value) tab.style.setProperty('--lesson-bottom', value);
}

/** The card's top in canvas pixels: 6% down, raised while its bottom would reach the standing hero's head (a short battlefield such as
 * 800×662 put it over the head), compact (is-compact) when even the top edge cannot clear it, and under the hero's feet when the
 * compact card still cannot (a phone on its side). Within a step it moves only away from the hero, so walking the rows does not
 * shake it. */
export function cardTop(runtime, canvas, fresh) {
    const room = headRoom(runtime), clear = topClear(runtime, canvas), stacked = runtime.deps.stageView.stacked();
    if (!runtime.state.hintEl.classList.contains('is-compact') && room - runtime.state.hintEl.offsetHeight < clear) runtime.state.hintEl.classList.add('is-compact');
    // 세로 화면은 주인공 발밑이 HUD 자리라(css/themes/rift-stage.css) 카드는 늘 지역 줄 밑에 선다: 머리에 조금 걸쳐도 그쪽이 보인다
    const height = runtime.state.hintEl.offsetHeight, fits = stacked || room - height >= clear;
    runtime.state.hintBelow = fresh ? !fits : runtime.state.hintBelow || !fits;
    const want = runtime.state.hintBelow ? Math.min(runtime.deps.battleVisualState.playerPos.y + runtime.state.CARD_GAP * 2, canvas.offsetHeight - height - runtime.state.CARD_GAP)
        : Math.max(clear, Math.min(canvas.offsetHeight * 0.06, room - height));
    runtime.state.hintTop = fresh ? want : (runtime.state.hintBelow ? Math.max : Math.min)(runtime.state.hintTop, want);
    return runtime.state.hintTop;
}

/** The card's highest top in canvas pixels: on a tall screen the zone row and its buttons lie over the battlefield's top
 * (css/themes/rift-stage.css, stageView.stacked), so the card starts under them; elsewhere a gap from the edge. */
export function topClear(runtime, canvas) {
    const row = runtime.deps.stageView.stacked() && runtime.deps.document.querySelector('#tab-battle .combat-zone-row');
    if (!row) return runtime.state.CARD_GAP;
    return Math.max(runtime.state.CARD_GAP, Math.round(row.getBoundingClientRect().bottom - canvas.getBoundingClientRect().top) + runtime.state.CARD_GAP);
}

/** Canvas pixels above the standing hero's head the card may reach (js/canvas-stage-actors.js headY; Infinity before it is drawn). */
export function headRoom(runtime) {
    const hero = runtime.deps.battleVisualState.playerPos, head = hero ? (0, runtime.deps.getHeroHeadY)(runtime.deps.battleVisualState.visualNow) : null;
    return head === null ? Infinity : head - runtime.state.CARD_GAP * 2;
}

/** A bobbing arrow just over the lying hero while the rise lesson waits for a press (canvas pixels are the box's pixels). The body
 * lies about a quarter of the standing height (feet to head, js/canvas-stage-actors.js headY) above the feet: the stage scale changes
 * with the screen size, so a fixed offset floated off the body or sank into it. */
export function showWakeMark(runtime, show, canvas) {
    const hero = show && canvas && runtime.deps.battleVisualState.playerPos;
    if (!runtime.state.wakeEl && !hero) return;
    runtime.state.wakeEl = fieldMark(runtime, runtime.state.wakeEl, 'opening-wake-mark', ['aria-hidden', 'true']);
    if (runtime.state.wakeEl.hidden !== !hero) runtime.state.wakeEl.hidden = !hero;
    if (!hero) return;
    const head = (0, runtime.deps.getHeroHeadY)(runtime.deps.battleVisualState.visualNow), stand = head === null ? 160 : hero.y - head;
    place(runtime, runtime.state.wakeEl, canvas.offsetLeft + hero.x, canvas.offsetTop + hero.y - stand / 4);
}

export function weaponInHand(runtime) { return runtime.deps.game.starterWeaponTutorialPending != null || seen(runtime, runtime.deps.basicSkills.weaponGuide); }
