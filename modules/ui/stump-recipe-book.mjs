import { recipeBookHtml } from './stump-cube-markup.mjs';
import { listenView } from './view-events.mjs';
import { afterStumpBookMotion, stopStumpBookMotion, syncStumpCubeOwner } from './stump-book-motion.mjs';

/** Plays pictures of the strip one after another, each BOOK_FRAME_MS; the last one stays. */
export function playBookFrames(runtime, frames) {
    const keys = frames.map((frame, at) => ({ backgroundPositionX: bookFramePos(runtime, frame), offset: at / frames.length, easing: 'step-end' }));
    keys.push({ backgroundPositionX: bookFramePos(runtime, frames[frames.length - 1]), offset: 1 });
    return runtime.state.bookDialog.querySelector('.stump-book-art').animate(keys, { duration: frames.length * runtime.state.BOOK_FRAME_MS, fill: 'forwards' });
}

/** The closed book under the frame (both sides of the frame: the board's bottom gem merges by one of its recipes). */
export function bookButtonHtml(runtime) {
    return `<button type="button" class="stump-recipe-book" data-stump-action="recipe-book" aria-haspopup="dialog">`
        + `<img src="assets/ui/grove/recipe-book.png" alt="" draggable="false"><span>${(0, runtime.deps._t)('조합법 {bookCount}', { bookCount: bookCount(runtime) })}</span></button>`;
}

export function bookMarkup(runtime) {
    return '<div class="stump-book-volume"><div class="stump-book-art" aria-hidden="true"></div><div class="stump-book-cover" aria-hidden="true"></div>'
        + `<div class="stump-book-text"><div class="stump-book-flow">${recipeBookHtml(runtime)}</div></div>`
        + '<button type="button" class="stump-book-turn is-prev" aria-label="앞 장" data-book-turn="-1">◀</button>'
        + '<button type="button" class="stump-book-turn is-next" aria-label="다음 장" data-book-turn="1">▶</button>'
        + '<button type="button" class="stump-book-close" aria-label="책 덮기" data-book-close>✕</button></div>';
}

export function ensureBookDialog(runtime) {
    if (runtime.state.bookDialog) return runtime.state.bookDialog;
    runtime.state.bookDialog = runtime.deps.document.createElement('dialog');
    runtime.state.bookDialog.className = 'stump-book';
    runtime.state.bookDialog.setAttribute('aria-label', (0, runtime.deps._t)('조합법'));
    listenView(runtime, runtime.state.bookDialog, 'click', runtime.handlers.onBookClick);
    listenView(runtime, runtime.state.bookDialog, 'cancel', event => { event.preventDefault(); closeRecipeBook(runtime); });
    runtime.deps.document.body.appendChild(runtime.state.bookDialog);
    return runtime.state.bookDialog;
}

export function onBookClick(runtime, event) {
    const turn = event.target.closest('[data-book-turn]');
    if (turn) return turnBookPage(runtime, Number(turn.dataset.bookTurn));
    if (event.target === runtime.state.bookDialog || event.target.closest('[data-book-close]')) closeRecipeBook(runtime);
}

/** How far one spread (two pages, or one on a phone) moves the text, and how many there are. The pages run on past the book
* (.stump-book-flow) and a turn shifts them, not scrolls: a scroll stops at the last page, so a last spread with one page of
* writing turned by one page and slid the right page over to the left. */
export function bookSteps(runtime, flow) {
    const gap = (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(flow).columnGap) || 0, step = flow.clientWidth + gap;
    return { step, count: Math.max(1, Math.ceil((flow.scrollWidth + gap) / step - 0.01)) };
}

/** A turn hides the writing, plays the page turning over (forward 5, 6, 7; back 7, 6, 5) and shows the next spread's writing. */
export function turnBookPage(runtime, delta) {
    const flow = runtime.state.bookDialog?.querySelector('.stump-book-flow');
    if (!flow || runtime.state.bookTurning) return;
    const { step, count } = bookSteps(runtime, flow);
    const next = Math.max(0, Math.min(count - 1, runtime.state.bookSpread + delta));
    const show = () => {
        runtime.state.bookSpread = next;
        flow.style.transform = `translateX(${-runtime.state.bookSpread * step}px)`;
        markBookTurns(runtime, count);
        runtime.state.bookDialog.classList.remove('is-turning');
        runtime.state.bookTurning = null;
    };
    if (!delta || next === runtime.state.bookSpread || bookStill(runtime)) return show();
    (0, runtime.deps.playUiFeedbackSound)('uiSelect');
    runtime.state.bookDialog.classList.add('is-turning');
    runtime.state.bookTurning = playBookFrames(runtime, delta > 0 ? runtime.state.BOOK_TURN : [7, 6, 5, 4]);
    afterStumpBookMotion(runtime, runtime.state.bookTurning, show);
}

/** Lays the recipes onto pages one whole recipe at a time (2026-10-29 사용자: 다음 쪽으로 잘리는 조합법은 미리 넘기고, 남는 공간은
* 가운데로). Each page is as high as the writing area; css/stump-box.css centres what a page holds. Needs the open dialog's layout. */
export function paginateBook(runtime) {
    const flow = runtime.state.bookDialog.querySelector('.stump-book-flow'), all = flow.querySelector('.stump-book-page');
    const height = flow.clientHeight, gap = (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(all).rowGap) || 0, pages = [];
    let used = Infinity;
    for (const row of [...all.children]) {
        const h = row.offsetHeight;
        if (used + gap + h > height) { pages.push([]); used = -gap; }
        pages[pages.length - 1].push(row);
        used += gap + h;
    }
    flow.replaceChildren(...pages.map(rows => {
        const page = runtime.deps.document.createElement('ul');
        page.className = all.className;
        page.append(...rows);
        return page;
    }));
}

export function markBookTurns(runtime, count) {
    runtime.state.bookDialog.querySelector('.is-prev').disabled = runtime.state.bookSpread === 0;
    runtime.state.bookDialog.querySelector('.is-next').disabled = runtime.state.bookSpread >= count - 1;
}

export function openRecipeBook(runtime, button) {
    if (!runtime.active) return;
    syncStumpCubeOwner(runtime);
    stopStumpBookMotion(runtime);
    const dialog = ensureBookDialog(runtime);
    dialog.innerHTML = bookMarkup(runtime);
    runtime.state.bookSpread = 0;
    runtime.state.bookOpening += 1;
    runtime.state.bookTurning = null;
    runtime.state.bookButton = button;
    dialog.classList.remove('is-open', 'is-turning', 'is-closing');
    dialog.classList.add('is-closed');
    dialog.showModal();
    (0, runtime.deps.playUiFeedbackSound)('stumpFrameSwitch');
    paginateBook(runtime);
    turnBookPage(runtime, 0);
    if (bookStill(runtime)) return dialog.classList.replace('is-closed', 'is-open');
    afterStumpBookMotion(runtime, flyBook(runtime, false), () => {
        afterStumpBookMotion(runtime, playBookFrames(runtime, runtime.state.BOOK_OPEN), () => dialog.classList.replace('is-closed', 'is-open'));
    });
}

/** The closed book of the first picture (.stump-book-cover marks it on the right half) flies between its button and its place:
* out from the button when opening, back into it when closing. A button gone from the page (the window redrew) is looked up again. */
export function flyBook(runtime, back) {
    const volume = runtime.state.bookDialog.querySelector('.stump-book-volume'), box = volume.getBoundingClientRect();
    const button = runtime.state.bookButton?.isConnected ? runtime.state.bookButton : runtime.deps.document.querySelector('#tab-stump .stump-recipe-book');
    const from = button?.offsetParent ? (button.querySelector('img') || button) : null;
    const cover = volume.querySelector('.stump-book-cover').getBoundingClientRect();
    const start = from ? from.getBoundingClientRect() : { left: cover.left, top: cover.top, width: cover.width * 0.2, height: cover.height * 0.2 };
    const scale = Math.max(0.05, start.width / cover.width);
    const dx = start.left + start.width / 2 - (cover.left + cover.width / 2), dy = start.top + start.height / 2 - (cover.top + cover.height / 2);
    const origin = `${cover.left + cover.width / 2 - box.left}px ${cover.top + cover.height / 2 - box.top}px`;
    const away = { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, transformOrigin: origin, opacity: back ? 0 : 1 };
    const home = { transform: 'translate(0, 0) scale(1)', transformOrigin: origin, opacity: 1 };
    return volume.animate(back ? [home, away] : [away, home],
        { duration: runtime.state.BOOK_GROW_MS, easing: back ? 'cubic-bezier(.6, 0, .8, .3)' : 'cubic-bezier(.2, .7, .2, 1)', fill: 'both' });
}

/** Closing runs the opening backwards: the writing goes, the pictures fold from 4 back to 0 and the closed book flies into its button. */
export function closeRecipeBook(runtime) {
    if (!runtime.state.bookDialog?.open || runtime.state.bookDialog.classList.contains('is-closing')) return;
    stopStumpBookMotion(runtime);
    const closing = runtime.state.bookOpening, done = () => {
        if (closing !== runtime.state.bookOpening) return;
        runtime.state.bookDialog.close();
        runtime.state.bookDialog.classList.remove('is-open', 'is-closed', 'is-turning', 'is-closing');
    };
    if (bookStill(runtime)) return done();
    runtime.state.bookTurning?.cancel();
    runtime.state.bookTurning = null;
    runtime.state.bookDialog.classList.remove('is-open', 'is-turning');
    runtime.state.bookDialog.classList.add('is-closed', 'is-closing');
    afterStumpBookMotion(runtime, playBookFrames(runtime, [...runtime.state.BOOK_OPEN].reverse()), () => {
        afterStumpBookMotion(runtime, flyBook(runtime, true), done);
    });
}

export function bookCount(runtime) { return `${runtime.deps.stumpCube.revealed(runtime.deps.game).length}/${runtime.deps.STUMP_CUBE_RECIPES.length}`; }

export function bookFramePos(runtime, frame) { return `${(frame / (runtime.state.BOOK_STRIP - 1)) * 100}%`; }

export function bookStill(runtime) { return runtime.deps.uiDisplay.matches('(prefers-reduced-motion: reduce)') || !runtime.state.bookDialog.querySelector('.stump-book-art').animate; }
