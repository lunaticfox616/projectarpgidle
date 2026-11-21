/**
 * 경매장 칸 그리기. 타이머와 폴링은 없다: 칸이 보일 때(marketUi가 이 칸을 그릴 때)와 명령 전에 시계를 지금으로 옮기고(advance),
 * 거래 창의 기존 갱신(renderMarketUI)이 부를 때는 저장과 화면 상태의 짧은 서명이 같으면 아무것도 다시 만들지 않는다. 시세 띠, 칸 단추,
 * 본문을 따로 칠해 바뀐 부분만 바꾼다(칸 단추는 제자리에서 속성만 고친다: 화살표 키의 초점이 남는다). 닫힌 칸은 일을 하지 않는다.
 */
import { trHtml, esc, pct, trendClass, familyLabel, paint } from './auction-house-format.mjs';
import { gearViewHtml } from './auction-house-gear.mjs';
import { materialsViewHtml } from './auction-house-materials.mjs';
import { standsViewHtml, claimable } from './auction-house-stands.mjs';
import { watchHall } from './auction-house-hall.mjs';

const TABS = Object.freeze([['gear', '장비'], ['materials', '재료'], ['mine', '내 출품']]);
const MOVERS = 3;
const WALLET = Object.freeze(['magicBud', 'formlessDew', 'goldenRule']);

/** Moves the auction clock to now and announces what settled (as the game tick does). Returns whether the bucket turned. */
export function syncClock(runtime) {
    const { auctionHouse, game } = runtime.deps, now = runtime.deps.now();
    if (!auctionHouse.needsAdvance(game, now)) return false;
    const result = auctionHouse.advance(game, now);
    announce(runtime, result.settled);
    return result.bucketChanged;
}

/** Announces settled rows through the game's own announcer (modules/application/foreground-loop.mjs announceAuction). */
export function announce(runtime, settled) {
    if (settled && settled.length) runtime.deps.announceAuction(settled);
}

function moverRows(runtime, pulse) {
    const seen = new Set(runtime.deps.auctionHouse.materials(runtime.deps.game).filter(row => row.seen).map(row => row.key));
    const rows = [...runtime.deps.auctionHouse.rules.families.map(key => ({ key, kind: 'family' })), ...[...seen].map(key => ({ key, kind: 'material' }))]
        .map(row => ({ ...row, factor: pulse.factors[row.key] }));
    const up = rows.filter(row => row.factor > 1).sort((a, b) => b.factor - a.factor).slice(0, MOVERS);
    const down = rows.filter(row => row.factor < 1).sort((a, b) => a.factor - b.factor).slice(0, MOVERS);
    return [...up, ...down];
}

function chipHtml(runtime, row) {
    const material = row.kind === 'material', name = material ? runtime.deps.shopView.currencyName(row.key) : familyLabel(runtime, row.key);
    const attr = material ? `data-ah-jump="${esc(runtime, row.key)}"` : `data-ah-family="${esc(runtime, row.key)}"`;
    const art = material ? runtime.deps.shopView.coinHtml(row.key) : '';
    return `<li><button type="button" class="ah-chip ${trendClass(row.factor)}" ${attr}>${art}<span>${esc(runtime, name)}</span><b>${pct(runtime, row.factor)}</b></button></li>`;
}

function nextChangeText(runtime, bucket) {
    const at = new Date((bucket + 1) * runtime.deps.auctionHouse.rules.bucketMs);
    const time = at.toLocaleTimeString(runtime.deps.i18n.locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    return runtime.deps._t('{time}에 시세가 바뀝니다', { time });
}

function bandHtml(runtime) {
    const pulse = runtime.deps.auctionHouse.pulse(runtime.deps.game), event = pulse.event;
    return `<div class="ah-event"><h3>${trHtml(runtime, event.title)}</h3><p>${trHtml(runtime, event.description)}</p></div>
        <ul class="ah-movers" aria-label="${runtime.deps._t('시세 변화')}">${moverRows(runtime, pulse).map(row => chipHtml(runtime, row)).join('')}</ul>
        <div class="ah-band-side"><p class="ah-next">${nextChangeText(runtime, pulse.bucket)}</p>${runtime.deps.shopView.walletHtml(WALLET)}</div>`;
}

function skeletonHtml(runtime) {
    const tabs = TABS.map(([id]) => `<button type="button" role="tab" id="ah-tab-${id}" aria-controls="ah-view" data-ah-tab="${id}"><span class="ah-tab-label"></span></button>`).join('');
    return `<div class="ah-root" data-locale="${esc(runtime, runtime.deps.i18n.locale)}"><header class="ah-band"></header>
        <nav class="ah-tabs" role="tablist" aria-label="${runtime.deps._t('경매장')}" onkeydown="marketUi.moveTab(event)">${tabs}</nav>
        <div class="ah-view" id="ah-view" role="tabpanel"></div></div>`;
}

function tabLabelHtml(runtime, id, label) {
    if (id !== 'mine') return `<span class="px-center">${trHtml(runtime, label)}</span>`;
    const lots = runtime.deps.game.auction.lots.length, waiting = claimable(runtime).length;
    const dot = waiting ? `<i class="ah-dot" role="img" aria-label="${runtime.deps._t('수령할 출품이 있습니다')}"></i>` : '';
    return `<span class="px-center">${trHtml(runtime, label)} <small>${lots}/${runtime.deps.auctionHouse.rules.myLots.slots}</small></span>${dot}`;
}

function paintTabs(runtime, root) {
    const tab = runtime.state.tab;
    for (const [id, label] of TABS) {
        const button = root.querySelector(`[data-ah-tab="${id}"]`), active = id === tab;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        paint(button.querySelector('.ah-tab-label'), tabLabelHtml(runtime, id, label));
    }
    root.querySelector('.ah-view').setAttribute('aria-labelledby', `ah-tab-${tab}`);
}

const VIEWS = Object.freeze({ gear: gearViewHtml, materials: materialsViewHtml, mine: standsViewHtml });

/** The attribute that names a focused control (its first data-ah-* attribute), to focus its successor after a repaint. */
function focusKey(view) {
    const active = view.ownerDocument.activeElement;
    if (!active || !view.contains(active)) return '';
    const attr = [...active.attributes].find(row => row.name.startsWith('data-ah-'));
    return attr ? `[${attr.name}="${attr.value.replace(/["\\]/g, '\\$&')}"]` : '';
}

function paintView(runtime, view) {
    const key = focusKey(view);
    if (!paint(view, VIEWS[runtime.state.tab](runtime)) || !key) return;
    view.querySelector(key)?.focus();
}

/** A short print of everything this section shows: the same print means nothing to redraw. */
function signature(runtime) {
    const game = runtime.deps.game, state = game.auction, view = runtime.state;
    const purse = ['magicBud', 'formlessDew', 'goldenRule', ...runtime.deps.auctionHouse.rules.materials.keys].map(key => game.currencies[key] || 0);
    const bag = game.inventory.length ? `${game.inventory.length}:${game.inventory[game.inventory.length - 1].id}` : '0';
    const worn = Object.values(game.equipment || {}).map(item => (item ? item.id : 0));
    return JSON.stringify([state.bucket, state.lots.map(lot => [lot.id, lot.status, lot.rolls]), state.bought, state.quota, purse, bag, worn,
        game.woodsmanBuildLock ? 1 : 0, view.tab, view.gear, view.materials, view.mine.draft, view.hall.version, runtime.deps.i18n.locale,
        runtime.deps.shopView.busyReason()]);
}

function editingInput(host) {
    const active = host.ownerDocument.activeElement;
    return !!active && host.contains(active) && active.tagName === 'INPUT';
}

/** The section's host when it is shown and usable, else null (a closed or hidden section does no work). */
function shownHost(runtime) {
    const { document, auctionHouse, game } = runtime.deps, host = runtime.active ? document.getElementById('market-panel-auction') : null;
    return host && !host.hidden && game && auctionHouse.isUnlocked(game) ? host : null;
}

/** Puts the frame (band, tabs, view) in when it is missing or was drawn in another language. Returns whether it did. */
function ensureSkeleton(runtime, host) {
    if (host.querySelector('.ah-root')?.dataset.locale === runtime.deps.i18n.locale) return false;
    host.innerHTML = skeletonHtml(runtime);
    return true;
}

/** Draws the section when it is shown (force: a user action or the section was just opened). */
export function renderAuction(runtime, force = false) {
    const host = shownHost(runtime);
    if (!host) return;
    if (syncClock(runtime)) force = true;
    watchHall(runtime);
    if (ensureSkeleton(runtime, host)) force = true;
    const print = signature(runtime);
    if (!force && (print === runtime.state.print || editingInput(host))) return;
    runtime.state.print = print;
    const root = host.querySelector('.ah-root');
    paint(root.querySelector('.ah-band'), bandHtml(runtime));
    paintTabs(runtime, root);
    paintView(runtime, root.querySelector('.ah-view'));
}
