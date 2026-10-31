/** One shop screen for every shop (2026-10-18 사용자: "가판대, 암거래상 등도 상점 인터페이스로"): the shelf laid on a grid like the
 * bag's, the card of the pointed or chosen thing under it, and the hero's bag beside it, first made for the NPC shops (2026-10-16
 * 사용자: "인벤토리 처럼 상점이 되어있고 그걸 눌러서 사거나 인벤토리로 끌어다 놓으면 구매"). The NPC shops (js/npc-shop-ui.js), the black
 * market (js/black-market-ui.js) and the stall (js/player-stall-ui.js) each register an adapter by kind; this module owns what they
 * share: the grid cells, prices and wallet, the bag page, the item and rune cards, the replay guard and the pointer.
 *
 * Layout (2026-10-23 사용자: "옵션 및 가격 확인하기 쉽게", "마우스를 올리면 바로"): root .shop-view > .shop-body > the shelf section,
 * the chosen thing's sheet (.shop-info: .shop-info-deal, .shop-info-card) and the bag section. A wide view sets the shelf and the bag
 * side by side, a narrow one stacks them; the sheet shows only while something is chosen, held to the bottom of the scrolling window
 * over the bag (css/shop-view.css). Pointing with a mouse never changes the sheet: a floating card by the pointed thing shows its
 * options and its price (a ware's deal without buttons, a listing's asking price; a bag item, the stall's or not, its own card).
 *
 * Markup contract: the shop's root carries data-shop-kind (and its own data), a thing the pointer can carry data-shop-pick (the
 * adapter's own key, as 'ware:3' or 'bag:812'), a place it can be dropped on besides the bag data-shop-drop, a bag item
 * data-shop-item (its id; data-shop-why when the shop does not take it), and the bag grid is bagHtml's. A press without a drag (or
 * Enter on the button) is a tap, which only chooses (buying is the sheet's button, or a drag: a stray click never buys); a drag
 * carries a ghost onto the bag (its top-left cell picks the place, over all pages) or onto a drop place under the pointer.
 *
 * adapter: { shopPeekHtml?(root, pick) → the floating card's html ('' for none), shopTap(root, pick, { touch, keyboard }),
 *            shopUnchoose?(root): the sheet's 닫기, shopSize?(root, pick) → { columns, rows } when the pick can go into the bag,
 *            shopAccepts(root, pick, target) → true, false (painted red) or null (no target), shopDrop(root, pick, target), shopRedraw(root),
 *            shopDim?(root, itemId): a dimmed bag item (bagHtml's pick gave it a reason, no key) was pressed }
 * target: { area: 'bag', column, row (over all pages), local, size } or { area: 'drop', key, el }. */
const shopView = (() => {
    const DRAG_PX = 6;
    const WALLET_ORDER = Object.freeze(['magicBud', 'formlessDew', 'goldenRule']);
    const adapters = new Map();
    let press = null;   // { root, adapter, el, pick, x, y, pointerId, touch, offset, ghost, target }
    let floatCard = null; // the floating card of the thing under the mouse (in the shop's dialog or over the page)
    let bagPage = 0;

    const held = key => Math.floor(Number(game.currencies[key]) || 0);
    const currencyName = key => (ORB_DB[key] ? ORB_DB[key].name : key);
    const registerShop = (kind, adapter) => { adapters.set(kind, adapter); };
    const areaStyle = at => `grid-area:${at.row + 1}/${at.column + 1}/span ${at.rows}/span ${at.columns}`;

    function coinHtml(key) {
        const icon = ORB_DB[key] && ORB_DB[key].icon;
        return icon ? `<img class="shop-coin" src="${icon}" alt="">` : '';
    }
    const priceHtml = (key, amount) => `<span class="shop-price">${coinHtml(key)}${Number(amount).toLocaleString()}</span>`;

    /** The currencies a shop prices in (keys), in the wallet order, with what the hero holds. */
    function walletHtml(keys) {
        const shown = [...WALLET_ORDER.filter(key => keys.includes(key)), ...[...new Set(keys)].filter(key => !WALLET_ORDER.includes(key))];
        return `<span class="shop-wallet">${shown.map(key => `<span data-tip="${escapeHTML(currencyName(key))}">${coinHtml(key)}${held(key).toLocaleString()}</span>`).join('')}</span>`;
    }

    function cellsHtml(columns, rows, mark = () => '') {
        let cells = '';
        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) cells += `<span class="shop-cell" style="grid-area:${row + 1}/${column + 1}" ${mark(column, row)}></span>`;
        }
        return cells;
    }
    /** A shelf grid: columns by rows of empty cells with the wares (their own html, placed by areaStyle) over them. */
    const gridHtml = (columns, rows, wares, extra = '') =>
        `<div class="shop-grid${extra}" style="--grid-columns:${columns};--grid-rows:${rows}">${cellsHtml(columns, rows)}${wares}</div>`;

    /** The hero's bag, one page at a time as in the equipment window, its cells the places a ware can be dropped on.
     * pick(item): '' or the data-shop-pick key when the shop can take the item (the stall lists it), with a reason to dim it. */
    function bagHtml(pick = null) {
        const layout = equipmentInventoryGridRuntime.ensureState(game);
        bagPage = Math.max(0, Math.min(layout.unlockedPageCount - 1, bagPage));
        const page = equipmentInventoryGridRuntime.getPageLayout(layout, bagPage), rows = equipmentInventoryGridRuntime.rowsPerPage;
        const items = page.entries.map(entry => bagItemHtml(entry, pick ? pick(entry.item) : null)).join('');
        const pages = layout.unlockedPageCount > 1 ? `<nav class="shop-pages" aria-label="가방 쪽">${Array.from({ length: layout.unlockedPageCount }, (_, index) =>
            `<button type="button" data-shop-bag-page="${index}" aria-pressed="${index === bagPage}">${index + 1}</button>`).join('')}</nav>` : '';
        return `<header class="shop-bar"><h3>가방</h3><span class="shop-room">${getInventoryUsedCellCount(game)}/${getInventoryLimit(game)}칸</span>${pages}</header>
            <div class="shop-grid is-bag" style="--grid-columns:${layout.columns};--grid-rows:${rows}">${cellsHtml(layout.columns, rows, (column, row) => `data-bag-cell="${column}:${row}"`)}${items}</div>`;
    }

    function bagItemHtml(entry, choice) {
        const item = entry.item, art = `<img src="${getEquipmentGridVisualAsset(item)}" alt="" draggable="false">`, style = areaStyle(entry);
        if (!choice) return `<span class="shop-bag-item rarity-${item.rarity || 'normal'}" style="${style}" data-shop-item="${item.id}">${art}</span>`;
        const { key, chosen, reason } = choice;
        if (!key) return dimBagItemHtml(item, style, art, reason);
        return `<button type="button" class="shop-bag-item is-pick rarity-${item.rarity || 'normal'}${chosen ? ' is-chosen' : ''}" style="${style}"
            data-shop-pick="${escapeHTML(key)}" data-shop-item="${item.id}" aria-label="${escapeHTML(item.name || item.baseName || '장비')}">${art}</button>`;
    }

    /** A rejected bag item remains pressable so touch users can read its refusal; a mouse reads it on the floating card. */
    function dimBagItemHtml(item, style, art, reason) {
        return `<button type="button" class="shop-bag-item rarity-${item.rarity || 'normal'} is-dim" style="${style}" data-shop-dim="${item.id}"
            data-shop-item="${item.id}" data-shop-why="${escapeHTML(reason || '')}" aria-label="${escapeHTML(`${item.name || item.baseName || '장비'}, ${reason || '고를 수 없음'}`)}">${art}</button>`;
    }

    /** An item's card: its own tooltip (the bag's), and the bag analysis' verdict on wearing it (js/equipment-triage.js rate) in the bag
     * card's words: 공격 +8.3%, 생존 +12%, or 현 세팅 유지. No verdict while the hero cannot wear it: the card shows the requirement.
     * rating: false for gear already sold. Each item's card is kept while its data and the persistent build stay (a hover previews another
     * ware and leaving puts the chosen one back: both stay drawn). */
    const cardMemo = new WeakMap();
    function itemCardHtml(item, { rating = true } = {}) {
        // Crafting edits an existing item; build changes can also change its requirements and comparison.
        const key = `${rating}:${JSON.stringify(item)}:${getPersistentBuildSignature(game, false)}`;
        const kept = cardMemo.get(item);
        if (kept && kept.key === key) return kept.html;
        const box = document.createElement('div');
        showItemTooltip(null, null, false, item, { target: box });
        const html = `<div class="shop-tooltip">${box.innerHTML}</div>${rating ? gearRatingHtml(item) : ''}`;
        cardMemo.set(item, { key, html });
        return html;
    }

    /** The deal of a ware: its exact price, what the hero holds and keeps after it, and (chosen) the buy button and 닫기, or why it
     * cannot go now. verb: '구매' or '교환'. action: the button's attribute the adapter listens to. extra: more buttons (the lock).
     * peek: the floating card of a pointed ware: no buttons (the pointer cannot reach them). */
    function dealHtml({ key, amount, verb = '구매', check = { ok: true }, action = '', extra = '', peek = false }) {
        const have = held(key), price = Number(amount) || 0, short = Math.max(0, price - have);
        const purse = short ? `<span class="is-short">보유 ${have.toLocaleString()}, ${short.toLocaleString()} 부족</span>`
            : `<span>보유 ${have.toLocaleString()} → ${verb} 후 ${(have - price).toLocaleString()}</span>`;
        const act = dealActionsHtml({ verb, check, action, extra, peek });
        return `<div class="shop-deal${peek ? ' is-peek' : ''}"><p class="shop-deal-price"><span>가격</span>${coinHtml(key)}
            <strong${short ? ' class="is-short"' : ''}>${escapeHTML(currencyName(key))} ${price.toLocaleString()}</strong></p>
            <p class="shop-deal-purse">${purse}</p>${act}</div>`;
    }

    /** The sheet's 닫기: the choice goes and the bag under the sheet comes back in sight (the stall's sheet writes the same button). */
    const CLOSE_HTML = '<button type="button" class="shop-info-close" data-shop-unchoose>닫기</button>';
    function dealActionsHtml({ verb, check, action, extra, peek }) {
        return peek ? ''
            : `<div class="shop-deal-actions"><button type="button" class="shop-buy" ${action} ${check.ok ? '' : 'disabled'}>${verb}</button>${extra}${CLOSE_HTML}</div>
                ${check.ok ? '' : `<p class="shop-deal-why">${escapeHTML(check.reason || '')}</p>`}`;
    }

    /** The card's html put in (only when it changed: a hover over the same ware repaints nothing). */
    function paintInfo(root, html) {
        const info = root?.querySelector('.shop-info');
        if (!info || info.shopHtml === html) return;
        info.innerHTML = html;
        info.shopHtml = html;
    }

    /** The chosen ware marked (and pressed for a screen reader), the rest unmarked. */
    function markChosen(root, pick) {
        root.querySelectorAll('[data-shop-pick].is-chosen').forEach(el => { el.classList.remove('is-chosen'); el.setAttribute('aria-pressed', 'false'); });
        const el = pick === null ? null : root.querySelector(`[data-shop-pick="${CSS.escape(String(pick))}"]`);
        el?.classList.add('is-chosen');
        el?.setAttribute('aria-pressed', 'true');
    }

    /** Enter on the chosen ware again: the focus goes to its buy button (it never buys by itself). */
    function focusDeal(root) {
        const button = root?.querySelector('.shop-info .shop-buy:not([disabled])') || root?.querySelector('.shop-info button:not([disabled])');
        button?.focus();
    }

    /** The bag analysis' verdict on wearing item ('' while it cannot be worn): the shop card's, and the hall's comparison of the chosen
     * show (js/player-exchange.js hallCompareHtml). */
    function gearRatingHtml(item) {
        const wearable = getEquipCandidateSlots(item).some(slot => combatEquipmentStats.inspect(item, slot).ok);
        const rating = wearable ? equipmentTriage.rate(item) : null;
        if (!rating) return '';
        const chips = [rating.dpsGainPct >= 1 ? `<span class="is-damage">공격 +${rating.dpsGainPct}%</span>` : '',
            rating.ehpGainPct >= 1 ? `<span class="is-defense">생존 +${rating.ehpGainPct}%</span>` : ''].join('');
        return `<p class="shop-rating">${chips || '<span>현 세팅 유지</span>'}</p>`;
    }

    /** A rune's picture: a support rune's sigil or the attack rune's art. gem: { kind: 'attack' | 'support', name, tier }. */
    function gemArtHtml(gem) {
        return gem.kind === 'support' ? supportGemSigil.html(gem.name, 'shop-gem', 0) : renderSkillGemArt(gem.name, 'shop-gem', { eager: true });
    }

    /** A rune's card: its kind and text, and for an attack rune why the weapon in hand cannot use it, else what wearing it brings. */
    function gemCardHtml(gem) {
        const support = gem.kind === 'support', def = (support ? SUPPORT_GEM_DB : SKILL_DB)[gem.name] || {};
        const kind = support ? `보조스킬룬, ${getSupportTierLabel(gem.name, gem.tier)}` : '공격 룬';
        return `<div class="shop-gem-card"><div class="shop-gem-head">${gemArtHtml(gem)}<div><small>${escapeHTML(kind)}</small>
            <strong>${escapeHTML(gem.name)}</strong></div></div><p>${statToneText.html(def.desc || '')}</p>${support ? supportFitHtml(gem) : runeFitHtml(gem.name)}</div>`;
    }

    /** An attack rune against the hero now: why the weapon in hand cannot use it (as its loot line says, js/currency-acquisition-ui.js),
     * or what wearing it brings. Wisp runes summon instead of striking, and mobility runes go to their own slot (not the main attack's):
     * neither shows a line. */
    function runeFitHtml(name) {
        const note = getSkillRuneWeaponNote(name);
        if (note) return `<p class="shop-note">지금 무기로 쓸 수 없음: ${escapeHTML(note)}</p>`;
        return (SKILL_DB[name]?.tags || []).includes('summon') || isMobilityRuneName(name) ? '' : wearPreviewHtml(copy => { copy.activeSkill = name; });
    }

    /** A support rune the hero could wear at its shelf tier now: what wearing it brings (buying only grants it). */
    function supportFitHtml(gem) {
        return supportFits(gem) ? wearPreviewHtml(copy => wearSupportOnCopy(copy, gem)) : '';
    }

    /** A free support place and enough 공명력 for the shelf tier, as toggleSupport checks (a worn one frees its own cost first). */
    function supportFits(gem) {
        const worn = Array.isArray(game.equippedSupports) ? game.equippedSupports : [], wearing = worn.includes(gem.name);
        const stats = getUiPlayerStats(), used = worn.reduce((sum, name) => sum + getSupportTierResonanceCost(name), 0);
        if (!wearing && worn.length >= Math.floor(stats.suppCap || 0)) return false;
        const freed = wearing ? getSupportTierResonanceCost(gem.name) : 0;
        return getEffectiveResonanceCap(stats) - used + freed >= getSupportResonanceCostAtTier(gem.name, gem.tier);
    }

    /** The support owned at the shelf tier, that tier active, and worn: on the game copy only. */
    function wearSupportOnCopy(copy, gem) {
        const record = (copy.supportGemData || {})[gem.name] || { level: 1, exp: 0 };
        copy.supports = [...new Set([...(copy.supports || []), gem.name])];
        copy.supportGemData = { ...copy.supportGemData, [gem.name]: { ...record, unlockedTier: gem.tier, activeTier: gem.tier } };
        copy.equippedSupports = [...new Set([...(copy.equippedSupports || []), gem.name])];
    }

    /** "장착하면 DPS 60 → 64, 생명력 …" with edit made on a copy of the game (js/passives.js previewBuildStats), in the words and colours of
     * the skill tree and act reward previews; nothing when nothing changes. */
    function wearPreviewHtml(edit) {
        const parts = buildStatPreviewParts(previewBuildStats(edit));
        return parts ? `<p class="shop-gem-dps">장착하면 ${parts}</p>` : '';
    }

    /** Why no trade can go now, or '': while the offline fights replay, the replayed game replaces this one when it is done
     * (js/ui.js commitBackgroundCombat), so a trade made meanwhile would be undone. */
    function busyReason() {
        const replay = backgroundCombatRuntime.snapshot || backgroundCombatRuntime.processing || backgroundCombatRuntime.failed;
        return replay ? '방치 전투 정산을 마친 뒤 이용해 주세요.' : '';
    }

    // ---- pointer ----

    function pickAt(node) {
        const el = node?.closest?.('[data-shop-pick]'), root = el?.closest('[data-shop-kind]');
        const adapter = root && adapters.get(root.dataset.shopKind);
        return adapter ? { root, adapter, el, pick: el.dataset.shopPick } : null;
    }

    // ---- the floating card: only looks, never chooses (the chosen thing, its sheet and the typed prices stay as they are) ----

    /** The mouse over a ware, a listing or a bag item: its floating card beside it; over anything else, none. */
    function hoverPick(event) {
        if (event.pointerType !== 'mouse' || press) return;
        const peek = peekAt(event.target);
        if (peek && peek.html) showFloat(peek.el, peek.html);
        else hideFloat();
    }

    /** What the node shows when pointed: a bag item its own card, an adapter's thing what its shopPeekHtml says. */
    function peekAt(node) {
        const item = node?.closest?.('.shop-view [data-shop-item]');
        if (item) return { el: item, html: bagPeekHtml(item) };
        const at = pickAt(node);
        return at && at.adapter.shopPeekHtml ? { el: at.el, html: at.adapter.shopPeekHtml(at.root, at.pick) } : null;
    }

    /** A bag item's card, with why the shop does not take it (the stall) first. */
    function bagPeekHtml(el) {
        const item = game.inventory.find(entry => String(entry.id) === el.dataset.shopItem);
        if (!item) return '';
        const why = el.dataset.shopWhy ? `<p class="shop-note">${escapeHTML(el.dataset.shopWhy)}</p>` : '';
        return `${why}${itemCardHtml(item)}`;
    }

    function showFloat(el, html) {
        const host = el.closest('dialog') || document.body;
        if (!floatCard || floatCard.parentNode !== host) {
            floatCard?.remove();
            floatCard = Object.assign(document.createElement('div'), { className: 'shop-float' });
            floatCard.setAttribute('aria-hidden', 'true');
            host.appendChild(floatCard);
        }
        if (floatCard.shopHtml !== html) { floatCard.innerHTML = html; floatCard.shopHtml = html; }
        floatCard.hidden = false;
        placeFloat(floatCard, el.getBoundingClientRect());
    }

    /** Beside the pointed thing: right of it when the card fits there, else left; kept inside the screen. Screen pixels divide by the
     * UI scale (uiDisplay.factor), as the carried ghost's do; whole pixels keep the dot font sharp. */
    function placeFloat(card, at) {
        const factor = uiDisplay.factor || 1, gap = 8, box = card.getBoundingClientRect();
        const x = at.right + gap + box.width <= window.innerWidth - gap ? at.right + gap : Math.max(gap, at.left - gap - box.width);
        const y = Math.max(gap, Math.min(at.top, window.innerHeight - gap - box.height));
        card.style.transform = `translate(${Math.round(x / factor)}px,${Math.round(y / factor)}px)`;
    }

    function hideFloat() { if (floatCard) floatCard.hidden = true; }

    function pressPick(event) {
        hideFloat();
        const at = event.button === 0 ? pickAt(event.target) : null;
        if (!at) return;
        const rect = at.el.getBoundingClientRect();
        press = { ...at, x: event.clientX, y: event.clientY, pointerId: event.pointerId, touch: event.pointerType !== 'mouse',
            offset: { x: event.clientX - rect.left, y: event.clientY - rect.top }, ghost: null, target: null };
        at.el.setPointerCapture?.(event.pointerId);
    }

    function dragPick(event) {
        if (!press || press.pointerId !== event.pointerId) return;
        if (!press.ghost && Math.hypot(event.clientX - press.x, event.clientY - press.y) < DRAG_PX) return;
        if (!press.ghost) press.ghost = ghostOf(press.el);
        // The page is drawn at the UI scale (uiDisplay.factor): screen pixels divide by it, as the bag's own carried item does.
        press.ghost.style.transform = `translate(${(event.clientX - press.offset.x) / uiDisplay.factor}px,${(event.clientY - press.offset.y) / uiDisplay.factor}px)`;
        press.target = targetAt(event);
        paintTarget(press.root, press.target);
    }

    /** A copy of the carried thing that follows the pointer: in the shop's dialog (the top layer) or over the page. */
    function ghostOf(el) {
        const ghost = el.cloneNode(true), rect = el.getBoundingClientRect();
        ghost.className = `${el.className} shop-ghost`;
        ghost.removeAttribute('data-shop-pick');
        Object.assign(ghost.style, { width: `${rect.width / uiDisplay.factor}px`, height: `${rect.height / uiDisplay.factor}px`, gridArea: '' });
        (el.closest('dialog') || document.body).appendChild(ghost);
        el.classList.add('is-carried');
        return ghost;
    }

    /** What the carried thing is over: a drop place under the pointer, else the bag place under its top-left cell; with the adapter's
     * verdict as ok, or null when the adapter takes neither. */
    function targetAt(event) {
        // The carried ghost sits under the pointer: look past it to the stand or cell beneath.
        const under = document.elementsFromPoint(event.clientX, event.clientY).find(node => !press.ghost?.contains(node));
        const drop = under?.closest?.('[data-shop-drop]');
        const size = press.adapter.shopSize ? press.adapter.shopSize(press.root, press.pick) : null;
        const target = drop && press.root.contains(drop) ? { area: 'drop', key: drop.dataset.shopDrop, el: drop } : size ? bagTarget(event, size) : null;
        const ok = target ? press.adapter.shopAccepts(press.root, press.pick, target) : null;
        return ok === null ? null : { ...target, ok };
    }

    function bagTarget(event, size) {
        const grid = press.root.querySelector('.shop-grid.is-bag'), first = grid?.querySelector('[data-bag-cell="0:0"]');
        if (!first) return null;
        const box = first.getBoundingClientRect(), step = grid.querySelector('[data-bag-cell="1:0"]').getBoundingClientRect().left - box.left;
        const column = Math.round((event.clientX - press.offset.x - box.left) / step), row = Math.round((event.clientY - press.offset.y - box.top) / step);
        const rows = equipmentInventoryGridRuntime.rowsPerPage;
        if (column < 0 || row < 0 || column >= equipmentInventoryGridRuntime.columns || row >= rows) return null;
        return { area: 'bag', column, row: row + bagPage * rows, local: { column, row }, size };
    }

    function paintTarget(root, target) {
        root.querySelectorAll('.is-drop-ok, .is-drop-bad').forEach(node => node.classList.remove('is-drop-ok', 'is-drop-bad'));
        if (!target) return;
        const mark = target.ok ? 'is-drop-ok' : 'is-drop-bad';
        if (target.area === 'drop') { target.el.classList.add(mark); return; }
        for (let row = target.local.row; row < target.local.row + target.size.rows; row++) {
            for (let column = target.local.column; column < target.local.column + target.size.columns; column++) {
                root.querySelector(`[data-bag-cell="${column}:${row}"]`)?.classList.add(mark);
            }
        }
    }

    /** Ends the press (its ghost and marks gone) and returns it. */
    function endPress() {
        const holding = press;
        press = null;
        holding.ghost?.remove();
        holding.el.classList.remove('is-carried');
        paintTarget(holding.root, null);
        return holding;
    }

    /** Let go: a drag gives its target to the adapter (a red one too: the adapter says why); a press without a drag is a tap.
     * The target is read where the pointer lets go, not where it last moved (a fast flick's last move can trail behind). */
    function releasePick(event) {
        if (!press || press.pointerId !== event.pointerId) return;
        if (press.ghost) press.target = targetAt(event);
        const holding = endPress();
        if (holding.ghost) { if (holding.target) holding.adapter.shopDrop(holding.root, holding.pick, holding.target); return; }
        holding.adapter.shopTap(holding.root, holding.pick, { touch: holding.touch, keyboard: false });
    }

    /** Bag pages, and Enter or Space on a carried thing's button (no pointer): a tap that chooses (on the chosen one again, the
     * adapter moves the focus to its buy button). */
    function shopClick(event) {
        const page = event.target.closest?.('[data-shop-bag-page]'), root = page?.closest('[data-shop-kind]');
        if (root && adapters.has(root.dataset.shopKind)) { bagPage = Number(page.dataset.shopBagPage); adapters.get(root.dataset.shopKind).shopRedraw(root); return; }
        if (clickUnchoose(event.target) || clickDimItem(event.target)) return;
        const at = event.detail === 0 ? pickAt(event.target) : null;
        if (at) at.adapter.shopTap(at.root, at.pick, { touch: true, keyboard: true });
    }

    function clickUnchoose(target) {
        const close = target.closest?.('[data-shop-unchoose]'), root = close?.closest('[data-shop-kind]');
        const adapter = root && adapters.get(root.dataset.shopKind);
        if (!adapter?.shopUnchoose) return false;
        adapter.shopUnchoose(root);
        return true;
    }

    function clickDimItem(target) {
        const dim = target.closest?.('[data-shop-dim]'), root = dim?.closest('[data-shop-kind]');
        const adapter = root && adapters.get(root.dataset.shopKind);
        if (!adapter?.shopDim) return false;
        adapter.shopDim(root, dim.dataset.shopDim);
        return true;
    }

    document.addEventListener('pointerover', hoverPick);
    document.addEventListener('pointerout', event => { if (!event.relatedTarget) hideFloat(); });
    document.addEventListener('scroll', hideFloat, true);
    document.addEventListener('pointerdown', pressPick);
    document.addEventListener('pointermove', dragPick);
    document.addEventListener('pointerup', releasePick);
    document.addEventListener('pointercancel', () => { if (press) endPress(); });
    document.addEventListener('click', shopClick);
    return Object.freeze({ registerShop, WALLET_ORDER, held, currencyName, coinHtml, priceHtml, walletHtml, cellsHtml, gridHtml, areaStyle,
        bagHtml, itemCardHtml, ratingHtml: gearRatingHtml, gemArtHtml, gemCardHtml, dealHtml, paintInfo, markChosen, focusDeal,
        busyReason, dragging: () => !!press });
})();
safeExposeGlobals({ shopView });
