/** 처음 시작하는 플레이어의 첫 장면과 조작 배우기(2026-10-15 사용자: "처음 시작하면 자동사냥 OFF로 무조건 하고, 기능이 잠겨있었으면",
 * "인트로 삽화를 ... 멋지게, 단, 단순하게 연출하고 장면전환과 함께 캐릭터가 쓰러져있는거야. 그 캐릭터를 클릭하면 일어나는 모션과 함께
 * 일어나고, ... 이동하는 방법 (클릭 or wasd)학습, 몬스터에게 맞고있는 하켄 ... 가까이 가서 자동공격학습, 몬스터를 물리치면 하켄이
 * 고맙다는 말과 함께 ... 스킬룬 사용법 튜토리얼까지", "루프 하고 난 다음에는 시작연출, 쓰러져있는 캐릭터, 첫번째 방에 하켄까지 없는게").
 *
 * 인트로(프롤로그 삽화와 판결문) → 어둠에서 밝아지면 액트 1 입구 방에 쓰러진 주인공(누르면 일어난다) → 이동(바닥 클릭, WASD) →
 * 하켄을 치는 괴물에게 다가가 자동 공격(js/combat.js createStarterRescuePack) → 하켄의 감사와 바닥에 떨어진 시작 룬 → 룬 장착 안내
 * (js/content-progression-ui.js announceStarterGem) → 자동 사냥이 열린다. 새 게임의 첫 루프에서 한 번만 돈다.
 * 진행은 seenTutorials의 열쇠로 남는다(KEY). 그 사이 자동 사냥은 꺼진 채 잠기고(autoLocked, js/act-exploration-ui.js), 쓰러진 동안과
 * 일어나는 동안 게임이 멈춘다(holds, js/canvas-act-title-card.js greeting이 함께 읽는다). 주인공 그림은 받은 그림이다
 * (js/canvas-stage-actors.js setRise, data/stage-view.js STAGE_HERO_RISE, scripts/import-stage-characters.cjs). 무대 그림이 없으면
 * 쓰러진 장면만 건너뛴다.
 */
const openingJourney = (() => {
    const KEY = Object.freeze({ intro: 'opening_intro', rise: 'opening_rise', move: 'opening_move', attack: 'opening_attack', done: 'opening_done' });
    // The first guides it replaces: the prologue scene by the intro; on the stage also act 1's scene (told there) and the first-journey
    // card (by the lessons). The top-down field (a build without the stage art) keeps those two and has no lessons: after the intro
    // it plays as before, auto hunt and all.
    const REPLACED = Object.freeze(['story_prologue']), STAGE_REPLACED = Object.freeze(['story_act_1_start', 'tutorial_battle_basics']);
    const TICK_MS = 150, LEAVE_MS = 900, REVEAL_MS = 1100, AUTO_HINT_MS = 45000, CARD_GAP = 8;
    let intro = null, rising = null, movedFrom = null, hintEl = null, hintTop = 0, hintBelow = false, wakeEl = null, autoHintUntil = 0, heldAuto = null;

    const seen = key => Array.isArray(game.seenTutorials) && game.seenTutorials.includes(key);
    const mark = key => { if (!seen(key)) game.seenTutorials.push(key); };
    const actRun = () => { const run = actExplorationState.current(game); return run && run.zoneId === 0 && run.status === 'active' ? run : null; };
    const inEntry = run => { const room = run && actExplorationDoors.room(run); return !!room && room.role === 'entry'; };
    const SIDES = Object.freeze({ east: '오른쪽', west: '왼쪽', north: '위쪽', south: '아래쪽' });
    /** While the hero is not yet in the room where Haken is struck (js/combat.js starterRescueRoom): the side of the next door toward it. */
    function doorToRescue(run) {
        const map = run && actExplorationDoors.stageMap(run), pack = run && run.packs.find(row => row.rescue);
        const here = map && actExplorationDoors.room(run), there = pack && map.rooms.find(room => room.id === pack.roomId);
        if (!here || !there || here === there) return null;
        const door = map.hops[here.index] && map.hops[here.index][there.index];
        return door ? door.side : null;
    }
    const coarse = () => typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const tutorialOpen = () => !!document.querySelector('#tutorial-overlay.active');
    /** A guide card is queued (its key counts as seen from then, js/state.js queueTutorialNotice) or on screen. */
    const guideWaits = key => (!!activeTutorial && activeTutorial.key === key) || tutorialQueue.some(row => row.key === key);

    /** A brand-new game: first loop, level 1 with no experience, standing in act 1 before any other map, the opening not yet played. */
    function fresh() {
        return newGame() && !seen(KEY.intro) && !seen(KEY.done) && started();
    }
    const newGame = () => (game.season || 1) === 1 && (game.level || 1) === 1 && !(Number(game.exp) > 0) && !(Number(game.maxZoneId) > 0)
        && game.currentZoneId === 0;
    const started = () => !!game.heroSelectionInitialized && !isLoopHeroSelectOpen();
    /** The opening is under way: from the intro until the auto hunt opens (old saves never start it, so nothing locks for them). */
    const active = () => (game.season || 1) === 1 && (!!intro || seen(KEY.intro)) && !seen(KEY.done);
    const gemOnFloor = run => !!run && (run.groundLoot || []).some(row => row.kind === 'gem');
    function rescueStruck(run) {
        const pack = run && run.packs.find(row => row.rescue);
        if (!pack || !pack.aliveIds.length) return true;
        return game.enemies.some(enemy => enemy && pack.aliveIds.includes(enemy.id) && enemy.hp < enemy.maxHp);
    }
    /** The lesson in hand: rise, move, attack, pickup (the gem on the floor) or gem (its guide), null outside the opening. */
    function lesson() {
        if (!active()) return null;
        if (!seen(KEY.rise)) return 'rise';
        if (!seen(KEY.move)) return 'move';
        if (!seen(KEY.attack)) return 'attack';
        return gemOnFloor(actRun()) ? 'pickup' : 'gem';
    }
    /** The hero lies in act 1's entry room (or is getting up): the game waits, the story lines wait (js/canvas-act-title-card.js). */
    function lying() {
        const run = actRun();
        return lesson() === 'rise' && !!run && inEntry(run) && stageView.enabled();
    }
    function holds() { return !!intro || lying(); }
    /** The entry room's lines wait: also between the class pick and the intro's first tick (the wake line would play under it). */
    function hushes() { return holds() || fresh(); }

    // ------------------------------------------------------------------ intro
    /** The prologue as a short scene: the plate drifts in out of the dark, the verdict and two lines of narration rise one by one;
     * a press shows the rest at once, the next press (or 건너뛰기) fades to black and the dark lifts off the stage behind. */
    function startIntro() {
        const staged = stageView.enabled(), replaced = staged ? [...REPLACED, ...STAGE_REPLACED] : REPLACED;
        replaced.forEach(mark);
        for (let i = tutorialQueue.length - 1; i >= 0; i--) if (replaced.includes(tutorialQueue[i].key)) tutorialQueue.splice(i, 1);
        if (activeTutorial && replaced.includes(activeTutorial.key)) dismissTutorial(false);
        if (staged) {
            heldAuto = { settings: game.settings, autoMove: game.settings.autoMove };
            game.settings.autoMove = false;
            stageActors.preloadRise(game.selectedClassId);
            stageActors.setRise({ start: null }); // the stage under the intro already shows the hero lying when the dark lifts
        }
        intro = document.createElement('div');
        intro.id = 'opening-intro';
        intro.className = 'opening-intro';
        intro.setAttribute('role', 'dialog');
        intro.setAttribute('aria-label', '프롤로그');
        intro.innerHTML = introHtml();
        intro.addEventListener('click', event => (event.target.closest('[data-opening-skip]') ? endIntro() : advanceIntro()));
        document.body.appendChild(intro);
        requestAnimationFrame(() => requestAnimationFrame(() => intro && intro.classList.add('is-playing')));
    }
    function introHtml() {
        const scene = STORY_JOURNAL_SCENES.find(row => row.id === 'prologue'), quote = STORY_SCENE_QUOTES.prologue;
        const title = scene.title.split(', ').pop(), verdict = quote.lines.filter(text => text.startsWith('“')), source = quote.lines.find(text => text.startsWith('('));
        let step = 0;
        const line = (cls, text) => `<p class="${cls}" data-step style="--step:${step++}">${escapeHTML(text)}</p>`;
        return `<button type="button" class="opening-intro-skip" data-opening-skip>건너뛰기</button>
            <div class="opening-intro-stage"><figure class="opening-intro-plate"><img src="${escapeHTML(scene.image)}" alt=""></figure>
            <div class="opening-intro-text"><p class="opening-intro-kicker">프롤로그</p><h1 class="opening-intro-title">${escapeHTML(title)}</h1>
            <blockquote class="opening-intro-verdict">${verdict.map(text => line('', text)).join('')}${source ? line('opening-intro-source', source) : ''}</blockquote>
            ${scene.lines.map(text => line('opening-intro-line', text)).join('')}
            <p class="opening-intro-next" data-step style="--step:${step}">눌러서 계속</p></div></div>`;
    }
    /** A save loaded under the intro (a sign-in, a test fixture): the game is no longer new, so the intro goes without a trace and the
     * auto hunt setting it turned off comes back (only on the settings it touched; a loaded save brings its own). */
    function dropIntro() {
        intro.remove();
        intro = null;
        rising = null;
        stageActors.setRise(null);
        if (heldAuto && heldAuto.settings === game.settings) game.settings.autoMove = heldAuto.autoMove;
        heldAuto = null;
    }
    function advanceIntro() {
        if (!intro || intro.classList.contains('is-leaving')) return;
        if (!intro.classList.contains('is-all')) { intro.classList.add('is-all'); return; }
        endIntro();
    }
    function endIntro() {
        if (!intro || intro.classList.contains('is-leaving')) return;
        const scene = intro;
        scene.classList.add('is-leaving');
        setTimeout(() => {
            mark(KEY.intro);
            heldAuto = null;
            scene.classList.add('is-revealing');
            setTimeout(() => { scene.remove(); if (intro === scene) intro = null; }, REVEAL_MS);
        }, LEAVE_MS);
    }

    // ------------------------------------------------------------------ lessons
    /** Pressing the lying hero (or Space or Enter) plays the rise; other presses on the battlefield do nothing meanwhile. */
    function onBattlefieldPress(event) {
        if (!lying()) return;
        event.stopImmediatePropagation();
        event.preventDefault();
        if (event.type !== 'click' || rising) return;
        const point = getBattlefieldClientPoint(event.currentTarget, event.clientX, event.clientY), hero = battleVisualState.playerPos;
        if (hero && Math.abs(point.x - hero.x) < 90 && point.y > hero.y - 90 && point.y < hero.y + 30) startRise();
    }
    function onKey(event) {
        if (!lying() || rising || intro || !['Space', 'Enter'].includes(event.code)) return;
        event.preventDefault();
        startRise();
    }
    function startRise() {
        rising = { start: battleVisualState.visualNow };
        stageActors.setRise({ start: rising.start });
    }
    /** The rise has played: the hero stands where it lay; the move lesson counts from there. */
    function riseEnded() {
        return !!rising && battleVisualState.visualNow - rising.start >= STAGE_HERO_RISE.ms.reduce((sum, ms) => sum + ms, 0);
    }
    function trackRise() {
        // The top-down field: no lessons (see REPLACED).
        if (!stageView.enabled()) { [KEY.rise, KEY.move, KEY.attack, KEY.done].forEach(mark); stageActors.setRise(null); return; }
        // The hero is not in act 1's entry room (a save from elsewhere): there is no one lying to wake.
        if (!lying()) { mark(KEY.rise); stageActors.setRise(null); return; }
        if (!rising) stageActors.setRise({ start: null });
        else if (riseEnded()) { mark(KEY.rise); rising = null; stageActors.setRise(null); }
    }
    /** A move counts once the hero leaves the cell it got up on, or a destination is set (a click on the floor). */
    function trackMove(run) {
        const hero = game.gridPlayer;
        if (!movedFrom) movedFrom = { gx: hero.gx, gy: hero.gy };
        if ((run && run.destination) || hero.gx !== movedFrom.gx || hero.gy !== movedFrom.gy) mark(KEY.move);
    }
    /** The gem lesson ends once the gem is in hand and its guide is over: the card read (not while it waits in the queue; closing
     * it equips the gem, js/tutorial-ui.js equipSkippedStarterGem) and the follow-along guide, if taken, done or left. */
    function gemLearnt() {
        const guide = 'tutorial_starter_gem_equip';
        return game.skills.length > 1 && seen(guide) && !guideWaits(guide) && !tutorialOpen() && !tutorialActionUi.active;
    }
    function trackLesson(now, run) {
        const step = lesson();
        if (intro) return;
        if (step === 'rise') trackRise();
        else if (step === 'move') trackMove(run);
        else if (step === 'attack' && rescueStruck(run)) mark(KEY.attack);
        else if (step === 'gem' && gemLearnt()) finish(now);
    }
    /** The opening ends: the auto hunt opens, its guide card comes, and the auto button glows until it is switched on. The battle comes
     * back to the front first: the rune window the gem guide opened covered the glowing button and half of the line naming it (2026-10-21). */
    function finish(now) {
        mark(KEY.done);
        autoHintUntil = now + AUTO_HINT_MS;
        switchTab('tab-battle');
        const key = coarse() ? '' : hotkeyBindings.label(hotkeyBindings.codeFor(game.settings.hotkeyOverrides, 'combat:autoMove'));
        queueTutorialNotice('opening_auto', '자동 사냥', `이제 자동 사냥을 쓸 수 있습니다.\n오른쪽 위 자동 단추${key ? `나 ${key} 키` : ''}로 켜면 캐릭터가 알아서 걷고 싸웁니다.\n지금 할 일은 ‘목표’에 나옵니다.`);
        actExplorationUi.render();
    }
    /** While the opening runs on the stage the auto hunt stays off. */
    function holdManual(run) {
        if (!stageView.enabled()) return;
        if (game.settings.autoMove !== false) game.settings.autoMove = false;
        if (run && run.mode !== 'manual') { run.mode = 'manual'; actExplorationUi.render(); }
    }

    // ------------------------------------------------------------------ hint
    const HINTS = {
        rise: () => '쓰러진 캐릭터를 눌러 깨우세요',
        move: () => (coarse() ? '바닥을 눌러 움직이세요' : '바닥을 클릭하거나 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 키로 움직이세요'),
        attack: side => `${side ? `${SIDES[side]}으로 가서 하켄을 구하세요` : '하켄을 치는 괴물에게 다가가세요'}. 가까이 가면 자동으로 공격합니다`,
        go: side => `${SIDES[side] || '앞쪽'} 문으로 나아가세요`,
        pickup: () => '떨어진 룬을 누르거나 그 위로 걸어가 주우세요',
        gem: () => '스킬룬 창에서 주운 룬을 장착하세요',
        auto: () => '오른쪽 위 자동 단추를 눌러 자동 사냥을 켜세요'
    };
    /** The card stays through the story lines, the guide cards and the rune window (2026-10-27 사용자: 대사나 첫 스킬룬 장착 창이 떠도
     * 계속 켜져 있게, 스킬룬 창보다는 밑에): it lives in the battlefield box, so windows over the battlefield cover it. */
    function hintFor(now) {
        if (intro) return null;
        const step = lesson();
        if (step === 'rise') return lying() ? 'rise' : null;
        if (step === 'gem') return gemInHand() ? 'gem' : lessonHint('attack');
        if (step) return lessonHint(step);
        return autoHintDue(now) ? 'auto' : null;
    }
    /** The gem step starts with the strike on Haken's monster: until the starter gem is picked up the fight goes on (rescue card). */
    const gemInHand = () => !!game.starterGemTutorialPending || seen('tutorial_starter_gem_equip');
    /** Before Haken's room is reached the attack lesson names the door to take; inside it, while the monster is beyond a phone's few
     * cells of view, the side to walk to. */
    function lessonHint(step) {
        if (step !== 'attack') return step;
        const door = doorToRescue(actRun()), far = rescueSide();
        return door ? `go:${door}` : far ? `attack:${far}` : step;
    }
    function rescueSide() {
        const enemy = game.enemies.find(row => row && row.rescue), dx = enemy ? enemy.gx - game.gridPlayer.gx : 0;
        return Math.abs(dx) > 3 ? (dx > 0 ? 'east' : 'west') : null;
    }
    // 배우기 카드(2026-10-27 사용자: 안내 방식과 창이 구리고 글이 흐릿하다, 새 콘텐츠 카드와 이어지게): 시작 안내 카드와 같은 틀과 머리말
    // 색, 단계 점, 단계 이름, 할 일 한 줄(얼굴 그림은 빼기로 했다). 이름은 LESSON_TITLES, 순서는 LESSON_ORDER(문으로 가는 줄은 구하기 단계).
    const LESSON_ORDER = Object.freeze(['rise', 'move', 'attack', 'pickup', 'gem', 'auto']);
    const LESSON_TITLES = Object.freeze({ rise: '깨어나기', move: '움직이기', attack: '하켄 구하기', go: '하켄 구하기', pickup: '룬 줍기', gem: '룬 장착하기', auto: '자동 사냥' });
    function lessonCardHtml(name, arg) {
        const at = LESSON_ORDER.indexOf(name === 'go' ? 'attack' : name);
        const dots = LESSON_ORDER.map((_, i) => `<i class="${i < at ? 'is-done' : i === at ? 'is-now' : ''}"></i>`).join('');
        return `<div class="opening-lesson-head"><span class="opening-lesson-kicker">시작 안내 ${at + 1}/${LESSON_ORDER.length}</span><span class="opening-lesson-dots" aria-hidden="true">${dots}</span></div>`
            + `<strong class="opening-lesson-title">${LESSON_TITLES[name]}</strong><p class="opening-lesson-text">${HINTS[name](arg)}</p>`;
    }
    /** The auto button's line: for a while after the opening ends, until the auto hunt is switched on. */
    const autoHintDue = now => seen(KEY.done) && now < autoHintUntil && game.settings.autoMove === false;
    /** The card and the arrow live in the battlefield box and are placed in its own pixels each tick, from the canvas offsets: page
     * pixels went off under the UI scale (the root zoom) and on other screen sizes (2026-10-27 사용자: 화면 크기에 따라 창과 화살표
     * 자리를 맞추게). Whole pixels: a translate(-50%) put the pixel font on half pixels and blurred it. */
    function fieldMark(el, className, attr) {
        const wrap = document.getElementById('battlefield-wrap');
        if (el && el.parentElement === wrap) return el;
        if (!el) { el = document.createElement('div'); el.className = className; el.setAttribute(...attr); }
        if (wrap) wrap.appendChild(el);
        return el;
    }
    // 같은 값이면 쓰지 않는다: 이 확인은 150ms마다 돌고, 쓸 때마다 body의 :has() 규칙까지 다시 계산했다(2026-10-25 측정).
    function place(el, left, top) {
        const x = `${Math.round(left)}px`, y = `${Math.round(top)}px`;
        if (el.style.left !== x) el.style.left = x;
        if (el.style.top !== y) el.style.top = y;
    }
    /** The lesson card over the battlefield's top middle. */
    function showHint(step) {
        hintEl = fieldMark(hintEl, 'opening-lesson', ['role', 'status']);
        if (hintEl.hidden !== !step) hintEl.hidden = !step;
        document.getElementById('btn-act-exploration-auto')?.classList.toggle('is-opening-glow', step === 'auto');
        const canvas = document.getElementById('battlefield-canvas');
        showWakeMark(step === 'rise' && !rising, canvas);
        if (!step || !canvas) return;
        const fresh = hintEl.dataset.step !== step;
        if (fresh) {
            const [name, arg] = step.split(':');
            hintEl.dataset.step = step;
            hintEl.classList.remove('is-compact');
            hintEl.innerHTML = lessonCardHtml(name, arg);
        }
        const top = cardTop(canvas, fresh);
        place(hintEl, canvas.offsetLeft + (canvas.offsetWidth - hintEl.offsetWidth) / 2, canvas.offsetTop + top);
    }
    /** The card's top in canvas pixels: 6% down, raised while its bottom would reach the standing hero's head (a short battlefield such as
     * 800×662 put it over the head), compact (is-compact) when even the top edge cannot clear it, and under the hero's feet when the
     * compact card still cannot (a phone on its side). Within a step it moves only away from the hero, so walking the rows does not
     * shake it. */
    function cardTop(canvas, fresh) {
        const room = headRoom();
        if (!hintEl.classList.contains('is-compact') && room - hintEl.offsetHeight < CARD_GAP) hintEl.classList.add('is-compact');
        const height = hintEl.offsetHeight, fits = room - height >= CARD_GAP;
        hintBelow = fresh ? !fits : hintBelow || !fits;
        const want = hintBelow ? Math.min(battleVisualState.playerPos.y + CARD_GAP * 2, canvas.offsetHeight - height - CARD_GAP)
            : Math.max(CARD_GAP, Math.min(canvas.offsetHeight * 0.06, room - height));
        hintTop = fresh ? want : (hintBelow ? Math.max : Math.min)(hintTop, want);
        return hintTop;
    }
    /** Canvas pixels above the standing hero's head the card may reach (js/canvas-stage-actors.js headY; Infinity before it is drawn). */
    function headRoom() {
        const hero = battleVisualState.playerPos, head = hero ? getHeroHeadY(battleVisualState.visualNow) : null;
        return head === null ? Infinity : head - CARD_GAP * 2;
    }
    /** A bobbing arrow just over the lying hero while the rise lesson waits for a press (canvas pixels are the box's pixels). The body
     * lies about a quarter of the standing height (feet to head, js/canvas-stage-actors.js headY) above the feet: the stage scale changes
     * with the screen size, so a fixed offset floated off the body or sank into it. */
    function showWakeMark(show, canvas) {
        const hero = show && canvas && battleVisualState.playerPos;
        if (!wakeEl && !hero) return;
        wakeEl = fieldMark(wakeEl, 'opening-wake-mark', ['aria-hidden', 'true']);
        if (wakeEl.hidden !== !hero) wakeEl.hidden = !hero;
        if (!hero) return;
        const head = getHeroHeadY(battleVisualState.visualNow), stand = head === null ? 160 : hero.y - head;
        place(wakeEl, canvas.offsetLeft + hero.x, canvas.offsetTop + hero.y - stand / 4);
    }

    const ticking = () => typeof game === 'object' && !!game && Array.isArray(game.seenTutorials) && !game.isBackgroundCalculation;
    function tick() {
        if (!ticking()) return;
        const now = Date.now();
        followGame();
        if (active()) {
            const run = actRun();
            holdManual(run);
            trackLesson(now, run);
        } else if (stageActors.down()) stageActors.setRise(null); // a save loaded mid-opening: no one lies there any more
        showHint(hintFor(now));
    }
    /** Starts the intro for a new game; drops it when the game under it stopped being new. */
    function followGame() {
        if (intro && !intro.classList.contains('is-leaving') && !newGame()) dropIntro();
        else if (!intro && fresh()) startIntro();
    }
    function init() {
        const canvas = document.getElementById('battlefield-canvas');
        if (!canvas) return;
        ['pointerdown', 'mousedown', 'click'].forEach(type => canvas.addEventListener(type, onBattlefieldPress, true));
        document.addEventListener('keydown', onKey, true);
        setInterval(tick, TICK_MS);
    }
    if (typeof document === 'object' && document.readyState !== 'loading') init();
    else if (typeof document === 'object') document.addEventListener('DOMContentLoaded', init, { once: true });
    // 인트로가 떠 있거나 곧 뜰 때(직업을 고른 뒤 첫 확인 주기까지, fresh): 2026-10-16 사용자 "인트로 연출 나올때 예전에 뜨는 창이 잠깐 나왔다가
    // 사라져": 그 틈에 예전 프롤로그 창(story_prologue, 인트로가 대신하는 안내)이 먼저 떴다가 인트로가 닫았다.
    /** The start class pick (js/ui.js ensureInitialHeroSelection) starts the intro in the same moment the pick closes: waiting for the next
     * tick drew the room for a few frames first (2026-10-27 사용자: 직업을 빨리 고르면 스토리 연출 전에 방 그림이 보였다). */
    function afterStartPick() { if (ticking()) followGame(); }
    return Object.freeze({ holds, hushes, lying, afterStartPick, autoLocked: active, lesson, introOpen: () => !!intro || fresh() });
})();
/** Guide cards wait for the intro, also while it is about to start (js/tutorial-ui.js isTutorialPresentationBlocked asks window functions by name). */
const isOpeningIntroOpen = () => openingJourney.introOpen();
safeExposeGlobals({ openingJourney, isOpeningIntroOpen });
