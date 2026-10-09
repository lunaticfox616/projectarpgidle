/** Coach card spacing in px: from what it points at, and from the screen edges. */
const TUTORIAL_CARD_GAP = 12, TUTORIAL_CARD_EDGE = 8;
/** Hover tooltips the coach card is placed clear of (they in turn avoid the card, see clearTooltipSpot). */
const TUTORIAL_TOOLTIPS = Object.freeze(['#info-tooltip', '#canvas-tooltip', '#item-tooltip-box']);
/** Pointer input that ends a hover hush (see hushHover). */
const TUTORIAL_HUSH_WAKERS = Object.freeze(['pointermove', 'pointerdown', 'wheel']);
/**
 * Optional action guidance owned by the UI. Reads real loadouts; never equips or
 * spends points. Each notice offers one action and can be skipped immediately.
 */
const tutorialActionUi = {
    noticeUntil: 0,
    /** Ordinary unlocks stay readable without stopping battle. Story and first actions retain the pause setting. */
    requiresAttention(notice) {
        return !!notice && (TUTORIAL_START_KEYS.has(notice.key) || TUTORIAL_GUIDED_CONTENT_KEYS.has(notice.key) || String(notice.key).startsWith('story_'));
    },
    noticeBody(notice, controls) {
        const body = tutorialBodyHtml(notice.body) + controls.trim();
        return this.requiresAttention(notice) ? body : `<details class="tutorial-notice-details"><summary>자세히</summary>${body}</details>`;
    },
    expireNotice(now) {
        if (!activeTutorial || this.requiresAttention(activeTutorial) || now < this.noticeUntil) return;
        const card = document.querySelector('#tutorial-overlay .tutorial-card');
        if (card?.matches(':hover, :focus-within') || card?.querySelector('details[open]')) return;
        dismissTutorial(false);
    },
    active: null,
    highlighted: null,
    card: null,
    /** { target, pinned } the card was last placed for: the card stays put while it keeps clear of them. */
    placedFor: null,
    /** { at: pointer position when a guide changed the screen, wake: listener } while hover tooltips are hushed. */
    hush: null,
    guides: {
        unlock_items: {
            selector: '#ui-inventory-list .equipment-grid-item',
            title: '첫 장비 장착',
            body: '장비를 눌러 비교한 뒤 장착 버튼으로 착용해 보세요.',
            read: () => Object.values(game.equipment).filter(Boolean).map(item => String(item.instanceId || item.id)),
            completed: (current, before) => current.some(id => !before.includes(id))
        },
        unlock_char: {
            // 휴대폰에서 노드 상세가 열려 있으면 그 "포인트 사용" 단추를, 아니면 트리 캔버스를 가리킨다.
            selector: ['#passive-mobile-detail:not([hidden]) [data-passive-confirm]:not(:disabled)', '#tree-canvas'],
            title: '첫 스킬트리 투자',
            body: '연결된 시작 노드의 효과를 살펴보고, 원하는 노드에 포인트를 투자해 보세요.',
            read: () => game.passives.length,
            completed: (current, before) => current > before,
            // 6~8px 노드는 연결선 강조만으로 보이지 않았다: 찍을 수 있는 노드에 고리를 켜고, 카드는 캔버스 대신 그 노드 무리 옆에 둔다
            // (트리는 탭을 연 뒤 40ms에 처음 그려지므로 그때 카드 자리를 다시 잡는다).
            spotlight: (on, whenDrawn) => passiveTreeGuide.show(on, whenDrawn),
            focus: target => (target.id === 'tree-canvas' ? passiveTreeGuide.screenRect() : null)
        },
        unlock_skills: {
            // 젬 상세가 열려 있으면 그 '장착' 단추를, 아니면 첫 스킬 젬 카드를 가리킨다.
            selector: ['#gem-selection .gem-equip-primary', '#tab-skills .starter-gem-tutorial-target, #tab-skills .gem-library-card:not(.active):not(.equipment-blocked)'],
            title: '스킬 젬 장착',
            body: '젬을 선택해 효과를 확인하고 ‘장착’을 누르세요. 선택한 젬에 따라 자동 전투가 달라집니다.',
            read: () => JSON.stringify([game.activeSkill, game.mobilitySkill, game.equippedSupports, game.equippedSummonSkills]),
            completed: (current, before) => current !== before,
            // 젬 상세와 고른 젬 카드도 덮지 않는다(카드가 고른 젬 위로 올라와 설명을 가렸다).
            keepClear: ['#gem-selection:popover-open', '#tab-skills .is-gem-selected']
        },
        unlock_stump_box: {
            // 그루터기 함 시작 선물 놓기(2026-10-07): 보관함의 씨앗이나 수액을 고르면 판의 빈 칸이 빛나고, 그 칸을 누르면 놓인다.
            selector: ['#stump-box-board .stump-cell.is-target', '#stump-box-storage .stump-item'],
            title: '그루터기 함에 심기',
            body: '보관함의 씨앗을 누르고 판의 빈 칸을 누르세요. 수액도 같은 방법으로 놓습니다.',
            read: () => [game.stumpBox.board.filter(id => id !== null).length, stumpBox.storage(game).filter(item => item.family !== 'talisman').length],
            completed: ([placed, waiting], [placedBefore]) => waiting === 0 || placed >= placedBefore + 2
        }
    },
    aliases: { tutorial_starter_gem_equip: 'unlock_skills', tutorial_first_passive: 'unlock_char', tutorial_first_gear: 'unlock_items',
        tutorial_stump_starter: 'unlock_stump_box' },
    guideFor(key) {
        const guideKey = this.aliases[key] || key;
        if (guideKey === 'unlock_items' && !game.inventory.some(Boolean)) return null;
        if (guideKey === 'unlock_char' && game.passivePoints < 1) return null;
        if (guideKey === 'unlock_stump_box' && !stumpBox.storage(game).some(item => item.family !== 'talisman')) return null;
        return Object.hasOwn(this.guides, guideKey) ? this.guides[guideKey] : null;
    },
    start(notice) {
        const guide = this.guideFor(notice.key);
        if (!guide) return;
        this.finish(false);
        this.active = { notice, guide, before: guide.read() };
        this.ensureCard();
        this.card.hidden = false;
        this.card.classList.remove('is-away');
        this.card.querySelector('strong').textContent = guide.title;
        // ‘장착’ 같은 단추 이름은 안내 판처럼 색 글씨로(도트 글꼴의 ’가 전각이라 "‘장착’ 을"처럼 띄어 보였다).
        this.card.querySelector('p').innerHTML = tutorialMarkup(guide.body);
        this.rest();
        if (guide.spotlight) guide.spotlight(true, () => this.reposition());
        this.openTarget();
    },
    ensureCard() {
        if (this.card) return;
        const card = document.createElement('aside');
        card.id = 'tutorial-action-card';
        card.className = 'tutorial-action-card';
        card.setAttribute('aria-label', '플레이 안내');
        card.innerHTML = '<strong></strong><p id="tutorial-action-description"></p><div><button type="button" data-open>화면 보기</button><button type="button" data-skip>안내 닫기</button></div>';
        card.querySelector('[data-open]').addEventListener('click', () => this.openTarget());
        card.querySelector('[data-skip]').addEventListener('click', () => this.finish(false));
        document.body.appendChild(card);
        this.card = card;
    },
    openTarget() {
        const action = this.active;
        if (!action) return;
        this.hushHover();
        hideInfoTooltip();
        const group = getMergedTabGroup(action.notice.tabId);
        if (group) switchMergedTabSubtab(group[0], action.notice.tabId);
        else switchTab(action.notice.tabId, { keepWindowOpen: true });
        if (action.notice.tabId === 'tab-items') this.openEquipment();
        requestAnimationFrame(() => {
            this.refresh();
            if (!this.highlighted) return;
            revealTutorialTarget(this.highlighted);
            this.placeCard(this.highlighted, true);
        });
    },
    openEquipment() {
        switchItemSubtab('item-tab-equip');
        if (isMobilePrimaryNavigationEnabled()) {
            setEquipmentMobilePane(game.inventory.some(Boolean) ? 'inventory' : 'loadout');
        }
    },
    refresh() {
        const action = this.active;
        if (!action) return;
        if (action.guide.completed(action.guide.read(), action.before)) return this.finish(true);
        const target = this.findTarget(action.guide.selector);
        this.clearHighlight();
        // 가리킬 칸이 다른 화면에 있으면(전투 화면으로 돌아옴) 제목 · 단추만 한 줄로 기본 자리에 둔다.
        this.card.classList.toggle('is-away', !target);
        if (!target) return this.rest();
        target.classList.add('tutorial-action-target');
        const describedBy = target.getAttribute('aria-describedby') || '';
        target.setAttribute('aria-describedby', (describedBy + ' tutorial-action-description').trim());
        this.highlighted = target;
        this.placeCard(target);
    },
    /** 카드는 가리키는 칸(트리는 찍을 수 있는 노드 무리)과 안내가 함께 지키는 곁 정보(젬 상세 · 고른 젬)를 덮지 않는다.
     * PC는 칸이 든 창 바깥의 빈 전장(칸과 같은 높이) → 칸의 왼쪽 · 오른쪽 → 아래 · 위 → 기본 자리 순, 휴대폰은 칸의 위 · 아래.
     * 한 번 둔 자리는 계속 비켜 있는 한 그대로 둔다(누르려던 자리로 카드가 옮겨 오지 않게). fresh는 화면을 연 직후 · 창 크기 변경. */
    placeCard(target, fresh) {
        const guide = this.active.guide, pinned = guide.focus ? guide.focus(target) : null;
        const focus = pinned || target.getBoundingClientRect(), avoid = this.avoidRects(focus, fresh);
        const placed = { target, pinned: !!pinned };
        if (!fresh && tutorialSamePlacement(this.placedFor, placed) && this.keepsClear(avoid)) return;
        const home = this.homeRect();
        const spot = tutorialCardSpots(focus, target, home).find(rect => !avoid.some(other => rectsOverlap(rect, other)));
        this.placedFor = placed;
        // 둘 곳이 없으면(휴대폰에서 젬 상세가 화면을 채울 때) 잠시 비켜 선다. 표시는 가리키는 칸에 남는다.
        this.card.classList.toggle('is-covered', !spot);
        if (!spot) return;
        const factor = uiDisplay.factor || 1, style = this.card.style;
        style.left = `${spot.left / factor}px`;
        style.top = `${spot.top / factor}px`;
        style.right = style.bottom = 'auto';
    },
    /** 카드가 덮으면 안 되는 사각형: 곁 정보, 가리키는 칸(트리 캔버스처럼 화면 절반이 넘으면 어디에 두어도 겹치니 뺀다),
     * 새로 둘 때는 떠 있는 툴팁까지. */
    avoidRects(focus, withTooltips) {
        const rects = tutorialVisibleRects(this.active.guide.keepClear || []);
        if (focus.height <= innerHeight / 2) rects.push(focus);
        if (withTooltips) rects.push(...tutorialVisibleRects(TUTORIAL_TOOLTIPS));
        return rects;
    },
    keepsClear(avoid) {
        const box = this.card.getBoundingClientRect();
        if (this.card.classList.contains('is-covered') || box.top < 0 || box.bottom > innerHeight) return false;
        return !avoid.some(rect => rectsOverlap(box, rect));
    },
    /** CSS 기본 자리(오른쪽 아래, HUD 구슬 · 미니맵 · 하단 메뉴 위)로 돌려 그 사각형을 돌려준다. 그 아래 변이 카드의 바닥이다. */
    homeRect() {
        const style = this.card.style;
        style.left = style.top = style.right = style.bottom = '';
        return this.card.getBoundingClientRect();
    },
    rest() {
        this.placedFor = null;
        this.card.classList.remove('is-covered');
        this.homeRect();
    },
    /** 처음부터 다시 자리를 잡는다(창 크기가 바뀌었거나 트리가 처음 그려져 노드 자리가 생겼을 때). */
    reposition() {
        this.placedFor = null;
        this.refresh();
    },
    /** 따라 하기는 가리키는 화면에 있는 동안만 다음 안내 카드를 붙잡는다. 그 화면을 떠나면(한 줄 띠로 줄어듦) 쌓인 카드가 뜬다 —
     * 첫 스킬트리 투자를 하지 않고 나가면 '지도 개방'(액트 1 보상으로 가는 안내)이 띠를 닫을 때까지 5분 넘게 숨어 있었다(검토 2026-10-01). */
    holdsQueue() {
        return !!this.active && !this.card.classList.contains('is-away');
    },
    /** 따라 하기가 화면을 바꾸면 멈춰 있던 마우스 밑으로 새 칸이 와서, 그 칸의 hover 툴팁('기본 공격')이 가리키는 칸을 덮었다
     * (검토 2026-10-01). 마우스가 실제로 움직이거나 누르거나 휠을 굴릴 때까지 그 자리의 hover 툴팁을 띄우지 않는다(hushesTooltipAt). */
    hushHover() {
        this.unhush();
        if (!matchMedia('(hover: hover)').matches) return;
        const at = { x: mouseX, y: mouseY };
        const wake = event => {
            if (event.type !== 'pointermove' || event.clientX !== at.x || event.clientY !== at.y) this.unhush();
        };
        this.hush = { at, wake };
        TUTORIAL_HUSH_WAKERS.forEach(type => window.addEventListener(type, wake, true));
    },
    unhush() {
        if (!this.hush) return;
        TUTORIAL_HUSH_WAKERS.forEach(type => window.removeEventListener(type, this.hush.wake, true));
        this.hush = null;
    },
    /** 툴팁 함수(js/ui.js showInfoTooltipHtml)가 묻는다: 이 마우스 좌표의 hover 툴팁을 지금은 띄우지 않나. */
    hushesTooltipAt(x, y) {
        return !!this.hush && x === this.hush.at.x && y === this.hush.at.y;
    },
    /** 툴팁(js/ui.js applyTooltipPosition)이 안내 카드를 덮게 되면 커서의 다른 쪽으로 보낸다 — 스킬트리 노드 툴팁이 카드 밑에
     * 깔렸다(검토 2026-10-01). 비는 쪽이 없으면 그대로 둔다(그때는 툴팁이 카드 위에 그려진다, css/ui-feedback.css).
     * spot: { left, top, width, height } (px), x · y: 커서. */
    clearTooltipSpot(spot, x, y) {
        const card = this.card;
        if (!this.active || card.hidden || getComputedStyle(card).visibility !== 'visible') return spot;
        const box = card.getBoundingClientRect();
        const left = x - spot.width - 18, top = y - spot.height - 18;
        const sides = [spot, { ...spot, left }, { ...spot, top }, { ...spot, left, top }, { ...spot, left: x + 18 }, { ...spot, top: y + 18 }];
        return sides.find(side => tutorialRectFits(side) && !rectsOverlap(box, tutorialRectOf(side))) || spot;
    },
    /** 먼저 적은 자리부터 화면에 보이는 첫 요소(selector는 문자열 하나 또는 우선순위 배열). */
    findTarget(selectors) {
        for (const selector of [].concat(selectors)) {
            const found = [...document.querySelectorAll(selector)].find(el => el.getClientRects().length);
            if (found) return found;
        }
        return null;
    },
    clearHighlight() {
        const target = this.highlighted;
        if (!target) return;
        target.classList.remove('tutorial-action-target');
        const ids = (target.getAttribute('aria-describedby') || '').split(' ').filter(id => id !== 'tutorial-action-description');
        if (ids.length) target.setAttribute('aria-describedby', ids.join(' '));
        else target.removeAttribute('aria-describedby');
        this.highlighted = null;
    },
    finish(completed) {
        const action = this.active;
        this.active = null;
        this.placedFor = null;
        this.clearHighlight();
        if (this.card) this.card.hidden = true;
        if (!action) return;
        if (action.guide.spotlight) action.guide.spotlight(false);
        if (completed) {
            game.seenTutorials.push('action_' + action.notice.key);
            showGameToast(action.guide.title + ' 완료', { tone: 'success' });
        } else applySkippedGuide(action.notice.key);
        setTimeout(showNextTutorial, 40);
    }
};

function rectsOverlap(a, b) {
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}
/** The card still sits where it was placed for this target and the same kind of focus (a pinned spot such as the tree's
 * node cluster, or the whole target — the cluster has no screen position until the tree is first drawn). */
function tutorialSamePlacement(placed, next) {
    return !!placed && placed.target === next.target && placed.pinned === next.pinned;
}
function tutorialRectOf(box) {
    return { left: box.left, top: box.top, right: box.left + box.width, bottom: box.top + box.height };
}
function tutorialRectFits(box) {
    const edge = TUTORIAL_CARD_EDGE;
    return box.left >= edge && box.top >= edge && box.left + box.width <= innerWidth - edge && box.top + box.height <= innerHeight - edge;
}
/** Rects of the selectors' first matches that are on screen. */
function tutorialVisibleRects(selectors) {
    return selectors.map(selector => document.querySelector(selector))
        .filter(node => node && node.getClientRects().length).map(node => node.getBoundingClientRect());
}
/** Coach card spots in order of preference (see tutorialActionUi.placeCard): beside the target's window on the free
 * battlefield, left / right of the focus, below / above it, then the CSS home. Below comes first: on phones the tree's
 * start sits low with its branches above, and a target too low for the card below gets it above. Spots stay on screen
 * and above home's bottom edge, which CSS keeps clear of the HUD orbs, the minimap and the phone tab bar. */
function tutorialCardSpots(focus, target, home) {
    const width = home.width, height = home.height, gap = TUTORIAL_CARD_GAP;
    const frame = target.closest('.ui-window-open');
    const pane = frame ? frame.getBoundingClientRect() : null;
    const row = Math.max(TUTORIAL_CARD_EDGE, Math.min(home.bottom - height, focus.top));
    const column = Math.max(TUTORIAL_CARD_EDGE, Math.min(innerWidth - TUTORIAL_CARD_EDGE - width, focus.left));
    const spots = [
        ...(pane ? [{ left: pane.left - gap - width, top: row }, { left: pane.right + gap, top: row }] : []),
        { left: focus.left - gap - width, top: row }, { left: focus.right + gap, top: row },
        { left: column, top: focus.bottom + gap }, { left: column, top: focus.top - gap - height },
        { left: home.left, top: home.top }
    ];
    return spots.map(spot => tutorialRectOf({ ...spot, width, height }))
        .filter(rect => rect.left >= TUTORIAL_CARD_EDGE && rect.top >= TUTORIAL_CARD_EDGE && rect.right <= innerWidth - TUTORIAL_CARD_EDGE && rect.bottom <= home.bottom);
}
/** 안내가 연 창은 맨 위에서 시작해(남아 있던 스크롤에 창 머리가 잘려 보였다) 가리키는 칸이 다 보일 만큼만 내린다. */
function revealTutorialTarget(target) {
    const scroller = tutorialScrollParent(target);
    if (scroller) scroller.scrollTop = 0;
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (scroller && scroller.classList.contains('ui-window-body')) tidyTutorialScroll(scroller, target);
}
function tutorialScrollParent(node) {
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        if (parent.scrollHeight > parent.clientHeight && /(auto|scroll)/.test(getComputedStyle(parent).overflowY)) return parent;
    }
    return null;
}
/** 창 몸통의 맨 윗줄(직계 자식)이 반쯤 잘려 보이면 칸이 다 보이는 한 그 줄을 통째로 넘긴다 — 1440×900의 스킬 젬 창은 첫 젬
 * 카드가 다 보이려면 44px을 내려야 해 '현재 전투 세팅' 단추가 반으로 잘렸다(검토 2026-10-01). */
function tidyTutorialScroll(scroller, target) {
    const offset = scroller.scrollTop, top = scroller.getBoundingClientRect().top + scroller.clientTop;
    const span = node => { const rect = node.getBoundingClientRect(); return { start: offset + rect.top - top, end: offset + rect.bottom - top }; };
    const rows = [...scroller.children].filter(node => node.getClientRects().length).map(span);
    const index = rows.findIndex(row => row.end > offset), cut = rows[index], next = rows[index + 1];
    if (!offset || !cut || cut.start >= offset || !next) return;
    const clean = Math.max(cut.end, next.start - parseFloat(getComputedStyle(scroller).paddingTop));
    if (clean <= span(target).start) scroller.scrollTop = clean;
}
window.addEventListener('resize', () => tutorialActionUi.reposition());

// 안내 카드 종류: 처음 하는 조작(시작 안내), 새로 열린 콘텐츠(새 콘텐츠), 루프 도달(새 루프). 이야기 장면은 storyJournalUi가 그린다.
const TUTORIAL_START_KEYS = new Set(['tutorial_battle_basics', 'tutorial_starter_gem_equip', 'tutorial_first_passive', 'tutorial_first_gear',
    'unlock_char', 'unlock_items', 'unlock_skills']);
// 새 콘텐츠 가운데 따라 하기가 있는 카드: 시작 안내처럼 펼친 채 저절로 닫히지 않는다(그루터기 함 시작 선물을 57분 동안 놓지 않은 판이 있었다).
const TUTORIAL_GUIDED_CONTENT_KEYS = new Set(['unlock_stump_box', 'tutorial_stump_starter']);
const TUTORIAL_KIND_LABELS = Object.freeze({ start: '시작 안내', content: '새 콘텐츠', loop: '새 루프' });
// "…열기" 단추에 쓰는 화면 이름(메뉴 이름과 같게). 없으면 "화면 열기".
const TUTORIAL_TAB_NAMES = Object.freeze({
    'tab-character': '캐릭터', 'tab-char': '스킬트리', 'tab-items': '장비', 'tab-skills': '스킬 젬', 'tab-map': '지도', 'tab-unlocks': '해금',
    'tab-season': '루프 패시브', 'tab-traits': '전직', 'tab-talent': '재능', 'tab-codex': '도감',
    'tab-stump': '그루터기 함', 'tab-settings': '설정', 'tab-journal': '기록', 'tab-records': '전적'
});
function tutorialNoticeKind(notice) {
    if (TUTORIAL_START_KEYS.has(notice.key)) return 'start';
    return String(notice.key).startsWith('unlock_content_loop_') ? 'loop' : 'content';
}
/** Colour in card text: ‘menu or button’ in the card's kind colour (where to go), [item name] in blue (what it is). */
function tutorialMarkup(line) {
    return escapeTutorialText(line)
        .replace(/‘([^’]+)’/g, '<span class="tutorial-ui">$1</span>')
        .replace(/\[([^\]]+)\]/g, '<span class="tutorial-name">[$1]</span>');
}
/** First line = what happened; the rest = what to do, as a short list (a line of speech in “…” keeps it prose). */
function tutorialBodyHtml(body) {
    const [lead = '', ...rest] = String(body || '').split('\n').map(line => line.trim()).filter(Boolean);
    const head = `<p class="tutorial-summary">${tutorialMarkup(lead)}</p>`;
    if (!rest.length) return head;
    if (rest.some(line => /^[\u201c"]/.test(line))) return head + rest.map(line => `<p class="tutorial-line">${tutorialMarkup(line)}</p>`).join('');
    return head + `<ul class="tutorial-steps">${rest.map(line => `<li>${tutorialMarkup(line)}</li>`).join('')}</ul>`;
}
function tutorialOpenLabel(notice) {
    if (tutorialActionUi.guideFor(notice.key)) return '따라 해보기';
    if (notice.openLabel) return notice.openLabel;
    const name = TUTORIAL_TAB_NAMES[notice.tabId];
    return name ? `${name} 열기` : '화면 열기';
}
/** "○○ 열기": an unlock card opens its exact screen (sub-tab, explore list, section); other cards open their tab. */
function openTutorialTarget(notice) {
    if (notice.contentId && contentUnlockUi.open(notice.contentId)) return;
    const { tabId, subtabId } = notice;
    if (tabId) switchTab(tabId, { keepWindowOpen: true });
    if (subtabId && tabId === 'tab-items') switchItemSubtab(subtabId);
    if (subtabId && tabId === 'tab-map') openMapTutorialTarget(subtabId);
    if (notice.atlasView && typeof atlasUi === 'object') atlasUi.setView(notice.atlasView);
}
/** A map card may aim at an explore sub-tab (map-explore-*): open the zones tab, then that explore tab. */
function openMapTutorialTarget(subtabId) {
    if (!subtabId.startsWith('map-explore-')) return switchMapSubtab(subtabId);
    switchMapSubtab('map-tab-zones');
    switchMapExploreSubtab(subtabId);
}
/** "다음 안내 N": how many more cards will follow this one. The counter sits in the card's top-right corner. */
function syncTutorialQueueCount() {
    let count = document.getElementById('tutorial-queue-count');
    const card = count ? null : document.querySelector?.('#tutorial-overlay .tutorial-card');
    if (card) {
        count = document.createElement('span');
        count.id = 'tutorial-queue-count';
        count.className = 'tutorial-queue-count';
        card.prepend(count);
    }
    if (!count) return;
    const waiting = tutorialQueue.filter(next => storyJournalUi.allowsNotice(next.key) && contentProgression.canOpen(next.subtabId || next.tabId)).length;
    count.hidden = waiting === 0;
    count.textContent = waiting ? `다음 안내 ${waiting}` : '';
}

function renderTutorialStep() {
    if (!activeTutorial) return;
    if (storyJournalUi.renderTutorial(activeTutorial)) return;
    const kind = tutorialNoticeKind(activeTutorial), overlay = document.getElementById('tutorial-overlay');
    if (overlay.dataset) overlay.dataset.noticeKind = kind;
    document.getElementById('tutorial-kicker').innerText = TUTORIAL_KIND_LABELS[kind];
    document.getElementById('tutorial-title').innerText = activeTutorial.title;
    syncTutorialQueueCount();
    let pauseEnabled = game.settings.pauseGameOnOverlay !== false;
    let pauseControl = activeTutorial.key === 'tutorial_battle_basics' ? `
        <label class="cfg-toggle tutorial-pause-toggle">
            <input type="checkbox" id="tutorial-pause-overlay-toggle" ${pauseEnabled ? 'checked' : ''}>
            <span class="cfg-label"><b>안내 중 전투 일시 정지</b><small>이후 ${settingsMenuPath()}에서 언제든 변경할 수 있습니다.</small></span>
            <strong id="tutorial-pause-overlay-status">${pauseEnabled ? '켜짐' : '꺼짐'}</strong>
        </label>` : '';
    // 본문은 줄바꿈을 살려 보이므로(pre-line) 템플릿 앞의 줄바꿈이 빈 줄이 되지 않게 다듬는다.
    document.getElementById('tutorial-body').innerHTML = tutorialActionUi.noticeBody(activeTutorial, pauseControl);
    let pauseToggle = document.getElementById('tutorial-pause-overlay-toggle');
    if (pauseToggle) {
        pauseToggle.checked = pauseEnabled;
        pauseToggle.addEventListener('change', () => {
            let enabled = !!pauseToggle.checked;
            game.settings.pauseGameOnOverlay = enabled;
            let settingsToggle = document.getElementById('chk-pause-overlay');
            let status = document.getElementById('tutorial-pause-overlay-status');
            if (settingsToggle) settingsToggle.checked = enabled;
            if (status) status.innerText = enabled ? '켜짐' : '꺼짐';
            if (typeof queueImportantSave === 'function') queueImportantSave(0);
        });
    }
    const hasShortcut = !!activeTutorial.tabId || !!activeTutorial.subtabId;
    const openButton = document.getElementById('tutorial-open-btn');
    const dismissButton = document.getElementById('tutorial-dismiss-btn');
    openButton.style.display = hasShortcut ? 'inline-block' : 'none';
    openButton.innerText = tutorialOpenLabel(activeTutorial);
    dismissButton.innerText = '확인';
}

/** A guide card waits while the act title card is on screen (a story scene does not: the title card waits for it). */
function tutorialWaitsForTitleCard() {
    const next = tutorialQueue[0];
    if (!next || String(next.key).startsWith('story_')) return false;
    return typeof actTitleCard === 'object' && typeof actTitleCard.busy === 'function' && actTitleCard.busy();
}
/** 설정으로 가는 길: 휴대폰은 하단 "전체" 서랍, PC는 HUD의 "기타" 목록. */
function settingsMenuPath() {
    return isMobilePrimaryNavigationEnabled() ? '전체 → 설정' : '기타 → 설정';
}

function isTutorialPresentationBlocked() {
    if (game.pendingLoopHeroSelection || game.pendingLoopReady || game.pendingLoopDecision) return true;
    // 방치 전투를 되돌리는 중이거나 그 결과 창이 열려 있으면 이야기 · 안내 카드는 결과를 닫은 뒤에 뜬다(두 판이 겹쳤다).
    if (backgroundCombatRuntime.processing || document.getElementById('background-combat-result-overlay')) return true;
    if (tutorialWaitsForTitleCard() || tutorialYieldsToMenus()) return true;
    return ['isStartupOverlayOpen', 'isLoadingOverlayOpen', 'isRewardOpen', 'isDeathOverlayOpen', 'isLoopHeroSelectOpen']
        .some(name => typeof window[name] === 'function' && window[name]());
}
/** 방치 결과 창이 뜰 때 이미 떠 있던 이야기 · 안내 카드는 접어 줄 맨 앞에 돌려놓는다 — 다시 불러온 뒤 이야기 카드 위에
 * 결과 창이 겹쳤다(검토 6차). 결과를 닫으면 showNextTutorial이 다시 띄운다. */
function yieldTutorialCardToResult() {
    if (!activeTutorial) return;
    tutorialQueue.unshift(activeTutorial);
    document.getElementById('tutorial-overlay')?.classList.remove('active');
    clearTutorialCallout();
    activeTutorial = null;
    activeTutorialStep = 0;
}
/** 휴대폰 전체 메뉴 서랍이나 확인 창(모달 dialog)이 열려 있으면 안내 카드는 닫힌 뒤에 뜬다 — 열린 서랍 위에 카드가 그려져 메뉴를 가렸다. */
function tutorialYieldsToMenus() {
    return document.body.classList.contains('mobile-tab-drawer-open') || !!document.querySelector('dialog:modal');
}

/** 떠 있는 안내 카드는 열린 창이 바뀌면 다시 자리를 잡는다 — 카드가 뜬 뒤 연 창(장비 등)의 내용을 덮고 있었다. */
let tutorialCardWindowSignature = '';
function refreshTutorialCardPlacement() {
    if (!activeTutorial) return;
    const signature = [...document.querySelectorAll('.tab-content.ui-window.ui-window-open')].map(node => node.id).join(',');
    if (signature === tutorialCardWindowSignature) return;
    tutorialCardWindowSignature = signature;
    placeTutorialCard();
}

function showNextTutorial() {
    tutorialActionUi.expireNotice(Date.now());
    refreshTutorialCardPlacement();
    if (activeTutorial || tutorialActionUi.holdsQueue() || tutorialQueue.length === 0 || isTutorialPresentationBlocked()) return;
    while (tutorialQueue.length) {
        const next = tutorialQueue.shift();
        if (storyJournalUi.allowsNotice(next.key) && contentProgression.canOpen(next.subtabId || next.tabId)) {
            activeTutorial = next;
            break;
        }
    }
    if (!activeTutorial) return;
    tutorialActionUi.noticeUntil = Date.now() + 8000;
    activeTutorial.title = stripDecorativeEmoji(activeTutorial.title);
    activeTutorial.body = stripDecorativeEmoji(activeTutorial.body);
    activeTutorialStep = 0;
    renderTutorialStep();
    document.getElementById('tutorial-overlay').classList.add('active');
    placeTutorialCard();
    setTutorialCallout(activeTutorial.tabId, 0);
    lastTime = Date.now();
}
let tutorialCallouts = [], tutorialCalloutTimer = null;
// 탭 단추가 메뉴 안에 숨어 있을 때 대신 깜빡일 여는 단추: PC 레일의 기타, 좁은 레일의 기타, 휴대폰의 전체.
const TUTORIAL_MENU_OPENERS = Object.freeze(['btn-ui-rail-misc', 'ui-rail-misc-toggle', 'btn-mobile-nav-more']);
function tutorialShown(node) {
    return !!(node && node.classList && node.getClientRects && node.getClientRects().length);
}
/** The menu buttons of the screen a card points to: the tab's own button when it is on screen; otherwise that button
 * (it lights up once its menu opens) plus the visible button that opens it — the merged launcher, 기타 or 전체. */
function tutorialMenuButtons(tabId) {
    const own = document.getElementById(`btn-${tabId}`);
    if (tutorialShown(own)) return [own];
    const group = typeof getMergedTabGroup === 'function' ? getMergedTabGroup(tabId) : null;
    const ids = [group ? `btn-${group[1].launcher}` : '', ...TUTORIAL_MENU_OPENERS];
    const opener = ids.map(id => (id ? document.getElementById(id) : null)).find(tutorialShown) || null;
    return [own, opener].filter(node => node && node.classList);
}
function clearTutorialCallout() {
    clearTimeout(tutorialCalloutTimer);
    tutorialCallouts.forEach(node => node.classList.remove('tutorial-callout'));
    tutorialCallouts = [];
}
/** Pulses those buttons while the card is up (holdMs 0) and a little after a plain 확인 (holdMs), so a newly
 * opened screen can be found again. */
function setTutorialCallout(tabId, holdMs) {
    clearTutorialCallout();
    tutorialCallouts = tabId ? tutorialMenuButtons(tabId) : [];
    tutorialCallouts.forEach(node => node.classList.add('tutorial-callout'));
    if (holdMs && tutorialCallouts.length) tutorialCalloutTimer = setTimeout(clearTutorialCallout, holdMs);
}
/** First passive point and first piece of gear for a new character: the old tab-unlock notices that carried these
 * guides never fire now (the tabs start open). Saves that saw those notices (seenAs), and later loops, skip them. */
const TUTORIAL_STARTER_GUIDES = Object.freeze([
    { key: 'tutorial_first_passive', seenAs: 'unlock_char', tabId: 'tab-char', title: '첫 스킬트리 포인트',
        body: '레벨이 올라 스킬트리 포인트를 얻었습니다.\n‘스킬트리’에서 시작 지점과 이어진 노드를 골라 찍으세요.\n오른 능력치는 ‘캐릭터’에서 확인할 수 있습니다.',
        starterDue: state => state.level >= 2 && state.passivePoints > 0 },
    { key: 'tutorial_first_gear', seenAs: 'unlock_items', tabId: 'tab-items', title: '첫 장비',
        body: '장비를 얻었습니다. 빈 칸에 맞는 장비는 바로 착용합니다.\n‘장비’에서 착용한 장비의 효과를 확인하고, 보관 중인 장비와 비교하세요.\n바꿔 입으면 전투 화면의 생명 구슬 위에 DPS 변화가 뜹니다.',
        // 빈 칸에 바로 입은 장비도 첫 장비다: 초반 드랍은 가방을 거치지 않아 안내가 끝내 뜨지 않았다(검토 7차).
        starterDue: state => (state.inventory || []).some(Boolean) || Object.values(state.equipment || {}).some(Boolean) }
]);
function queueStarterGuides(state) {
    if ((state.season || 1) > 1 || (state.loopCount || 0) > 0) return;
    const seen = state.seenTutorials || [];
    TUTORIAL_STARTER_GUIDES.filter(guide => !seen.includes(guide.seenAs) && guide.starterDue(state))
        .forEach(guide => queueTutorialNotice(guide.key, guide.title, guide.body, guide.tabId));
}
/** Wide screens: centre the guide card right above the player HUD (life orb and panel) so it covers neither the combat
 * log nor the minimap. Phones keep the bottom sheet from CSS. Coordinates are divided by the display zoom. */
function placeTutorialCard() {
    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay || !overlay.style) return;
    const hud = document.querySelector('.combat-top-status.player-hud'), orb = document.getElementById('ui-hp-bar');
    const rect = hud ? hud.getBoundingClientRect() : null;
    if (!rect || !rect.width || uiDisplay.matches('(max-width: 1080px)')) {
        overlay.style.removeProperty('--tutorial-anchor-left');
        overlay.style.removeProperty('--tutorial-anchor-bottom');
        return;
    }
    const factor = uiDisplay.factor || 1, viewWidth = window.innerWidth / factor, width = Math.min(420, viewWidth - 24);
    const top = Math.min(rect.top, orb ? orb.getBoundingClientRect().top : rect.top) / factor;
    const centred = Math.max(12, Math.min(viewWidth - width - 12, (rect.left + rect.width / 2) / factor - width / 2));
    const left = tutorialLeftClearOfWindows(centred, width, factor);
    overlay.style.setProperty('--tutorial-anchor-left', `${Math.round(left)}px`);
    overlay.style.setProperty('--tutorial-anchor-bottom', `${Math.round(window.innerHeight / factor - top + 10)}px`);
}
/** An open window docked beside the HUD (equipment, skills…) keeps its content: the card slides left into the free
 * battlefield when there is room, otherwise it stays centred over the HUD. */
function tutorialLeftClearOfWindows(left, width, factor) {
    let limit = Infinity;
    document.querySelectorAll('.tab-content.ui-window.ui-window-open').forEach(node => {
        const rect = node.getBoundingClientRect();
        if (rect.width && rect.left / factor < left + width && rect.right / factor > left) limit = Math.min(limit, rect.left / factor);
    });
    return limit !== Infinity && limit - width - 12 >= 12 ? Math.min(left, limit - width - 12) : left;
}
window.addEventListener('resize', () => { if (activeTutorial) placeTutorialCard(); });
function advanceTutorial() {
    if (!activeTutorial) return;
    dismissTutorial(true);
}
function goBackTutorialStep() {
    if (!activeTutorial || activeTutorialStep <= 0) return;
    activeTutorialStep -= 1;
    renderTutorialStep();
}
/** 첫 스킬 젬 안내를 따라 하지 않고 닫으면 그 젬을 대신 장착한다 — 방치하는 플레이어는 기본 공격으로 싸우며 초반에 거듭
 * 쓰러졌다(검토 2026-10-01). 바꾸고 싶으면 '스킬 젬'에서 언제든 바꾼다. */
function equipSkippedStarterGem(key) {
    const name = game.starterGemTutorialPending;
    if (key !== 'tutorial_starter_gem_equip' || typeof name !== 'string' || game.activeSkill !== '기본 공격') return;
    changeSkill(name);
    if (game.activeSkill === name) showGameToast(`[${name}] 젬을 장착했습니다 · '스킬 젬'에서 바꿀 수 있습니다`, { tone: 'success' });
}

/** 따라 하기를 하지 않고 닫은 안내의 뒷정리: 첫 스킬 젬은 장착하고, 그루터기 함 시작 선물은 판에 놓는다. */
function applySkippedGuide(key) {
    equipSkippedStarterGem(key);
    plantSkippedStumpStarter(key);
}
/** 그루터기 함 시작 선물 안내를 닫으면 받은 씨앗과 수액을 판의 가운데부터 대신 놓는다(첫 스킬 젬과 같은 이유). */
function plantSkippedStumpStarter(key) {
    if (!TUTORIAL_GUIDED_CONTENT_KEYS.has(key) || !game.stumpBox || !game.stumpBox.acquired) return;
    if (stumpBox.plantStored(game) > 0) showGameToast('그루터기 함: 받은 씨앗, 수액을 판에 배치했습니다', { tone: 'success' });
}

function dismissTutorial(openTarget) {
    if (!activeTutorial) return;
    const notice = activeTutorial, tabId = notice.tabId;
    document.getElementById('tutorial-overlay').classList.remove('active');
    activeTutorial = null;
    activeTutorialStep = 0;
    lastTime = Date.now();
    setTutorialCallout(openTarget ? null : tabId, 6000);
    // Phone notices held while the card was up: after the next card (if any) has had its turn.
    setTimeout(() => { if (typeof pumpMobileToastQueue === 'function') pumpMobileToastQueue(); }, 120);
    if (!openTarget) {
        applySkippedGuide(notice.key);
        return setTimeout(showNextTutorial, 40);
    }
    if (tutorialActionUi.guideFor(notice.key)) return tutorialActionUi.start(notice);
    openTutorialTarget(notice);
    if (['tutorial_first_gear', 'unlock_items'].includes(notice.key)) tutorialActionUi.openEquipment();
    setTimeout(showNextTutorial, 40);
}
