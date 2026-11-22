/**
 * 경매장 칸(거래 창의 넷째 칸 #market-panel-auction, 규칙은 전역 auctionHouse). 이 파일은 화면 상태와 이벤트를 맡는다: 클릭, 고르기,
 * 입력은 문서에 건 위임 리스너가 이 칸 안의 data-ah-* 속성으로 나눈다(인라인 handler와 새 전역이 없다). 그리기는 auction-house-render.mjs,
 * 명령은 auction-house-actions.mjs. 화면 상태는 저장하지 않는다.
 */
import { listenView, releaseViewEvents } from './view-events.mjs';
import { renderAuction, stopGearRefresh } from './auction-house-render.mjs';
import { buyLot, trade, typeCount, preset, pickItem, typeAsk, list, cancelDraft, withdraw, claim, claimAll, jumpFamily, jumpMaterial, sortGear, typeSearch, gearMode } from './auction-house-actions.mjs';

const TABS = Object.freeze(['gear', 'materials', 'mine']);
const FILTERS = Object.freeze({ slot: null, source: ['all', 'merchant', 'user'], rarity: ['all', 'normal', 'magic', 'rare', 'unique'] });

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createAuctionHouseView(deps) {
    const runtime = { deps, state: initialState(), api: null, active: true, listeners: [], refresh: 0, refreshAt: 0 };
    runtime.api = Object.freeze({
        render: (force = false) => renderAuction(runtime, force),
        /** The trade window opens this section on tab (the loop card asks for 내 출품). */
        showTab: tab => { if (TABS.includes(tab)) runtime.state.tab = tab; },
        dispose: () => { stopGearRefresh(runtime); releaseViewEvents(runtime); }
    });
    installEvents(runtime);
    return runtime.api;
}

function initialState() {
    return {
        tab: 'gear', print: '', card: { key: '', html: '' },
        gear: { mode: 'open', slot: 'all', rarity: 'all', source: 'all', query: '', sort: 'price', dir: 1, family: '', selected: '' },
        materials: { group: 'all', key: '', side: 'buy', count: 1 },
        mine: { draft: null },
        hall: { seen: null, seenAt: 0, triedAt: -Infinity, loading: false, version: 0 },
        // The search text of each lot's item (modules/ui/auction-house-gear.mjs searchText), kept by item while the item lives.
        search: new WeakMap()
    };
}

/** The click handlers by data attribute: (runtime, value, element).
 * @type {ReadonlyArray<[string, (runtime: any, value: string, el: Element) => void]>} */
const CLICKS = Object.freeze([
    ['data-ah-tab', (runtime, value) => { if (TABS.includes(value)) { runtime.state.tab = value; runtime.api.render(true); } }],
    ['data-ah-lot', (runtime, value, el) => selectLot(runtime, value, el)],
    ['data-ah-buy', (runtime, value) => buyLot(runtime, value)],
    ['data-ah-sort', (runtime, value) => sortGear(runtime, value)],
    ['data-ah-mode', (runtime, value) => gearMode(runtime, value)],
    ['data-ah-family', (runtime, value) => jumpFamily(runtime, value)],
    ['data-ah-clear-family', runtime => jumpFamily(runtime, '')],
    ['data-ah-jump', (runtime, value) => jumpMaterial(runtime, value)],
    ['data-ah-group', (runtime, value) => { runtime.state.materials.group = value; runtime.api.render(true); }],
    ['data-ah-material', (runtime, value, el) => selectMaterial(runtime, value, el)],
    ['data-ah-side', (runtime, value) => { runtime.state.materials.side = value === 'sell' ? 'sell' : 'buy'; runtime.api.render(true); }],
    ['data-ah-preset', (runtime, value) => preset(runtime, value)],
    ['data-ah-trade', (runtime, value) => trade(runtime, Number(value))],
    ['data-ah-pick', runtime => pickItem(runtime)],
    ['data-ah-list', runtime => list(runtime)],
    ['data-ah-cancel', runtime => cancelDraft(runtime)],
    ['data-ah-withdraw', (runtime, value) => withdraw(runtime, Number(value))],
    ['data-ah-claim', (runtime, value) => claim(runtime, Number(value))],
    ['data-ah-claim-all', runtime => claimAll(runtime)]
]);

function selectLot(runtime, id, el) {
    runtime.state.gear.selected = id;
    runtime.api.render(true);
    const detail = el.ownerDocument.querySelector('#market-panel-auction .ah-detail');
    // 좁은 칸에서는 자세히 칸이 목록 위에 있다: 고른 매물이 보이게 올린다.
    if (detail && detail.getBoundingClientRect().top < 0) detail.scrollIntoView({ block: 'start' });
}

function selectMaterial(runtime, key, el) {
    runtime.state.materials.key = key;
    runtime.api.render(true);
    const ticket = el.ownerDocument.querySelector('#market-panel-auction .ah-ticket');
    // 좁은 칸에서는 거래표가 목록 위에 있다: 고른 재료의 거래표가 보이게 올린다(목록은 제 칸 안에서 고른 줄을 보인다).
    if (ticket && ticket.getBoundingClientRect().top < 0) ticket.scrollIntoView({ block: 'start' });
}

function onClick(runtime, event) {
    const host = event.target.closest?.('#market-panel-auction');
    if (!host || !runtime.active) return;
    for (const [attr, handle] of CLICKS) {
        const el = event.target.closest(`[${attr}]`);
        if (!el || !host.contains(el) || el.disabled) continue;
        handle(runtime, el.getAttribute(attr), el);
        return;
    }
}

function onChange(runtime, event) {
    const el = event.target.closest?.('#market-panel-auction [data-ah-filter]');
    if (!el || !runtime.active) return;
    const name = el.dataset.ahFilter, allowed = FILTERS[name];
    if (!Object.prototype.hasOwnProperty.call(FILTERS, name) || (allowed && !allowed.includes(el.value))) return;
    runtime.state.gear[name] = el.value;
    runtime.api.render(true);
}

function onInput(runtime, event) {
    const el = event.target.closest?.('#market-panel-auction input');
    if (!el || !runtime.active) return;
    if (el.matches('[data-ah-count]')) typeCount(runtime, el);
    else if (el.matches('[data-ah-search]')) typeSearch(runtime, el);
    else if (el.matches('[data-ah-ask]')) typeAsk(runtime, el);
}

function onKeydown(runtime, event) {
    if (event.key !== 'Enter' || !event.target.closest?.('#market-panel-auction input')) return;
    const action = event.target.matches('[data-ah-count]') ? '[data-ah-trade]' : event.target.matches('[data-ah-ask]') ? '[data-ah-list]' : '';
    const button = action && event.target.closest('.ah-ticket, .ah-stand')?.querySelector(action);
    if (!button || button.disabled) return;
    event.preventDefault();
    button.click();
}

function installEvents(runtime) {
    const document = runtime.deps.document;
    listenView(runtime, document, 'click', event => onClick(runtime, event));
    listenView(runtime, document, 'change', event => onChange(runtime, event));
    listenView(runtime, document, 'input', event => onInput(runtime, event));
    listenView(runtime, document, 'keydown', event => onKeydown(runtime, event));
}
