/** One shop screen for every shop (2026-10-18 사용자: "가판대, 암거래상 등도 상점 인터페이스로"): the shelf laid on a grid like the
 * bag's, the card of the pointed or chosen thing under it, and the hero's bag beside it, first made for the NPC shops (2026-10-16
 * 사용자: "인벤토리 처럼 상점이 되어있고 그걸 눌러서 사거나 인벤토리로 끌어다 놓으면 구매"). The NPC shops (js/npc-shop-ui.js), the black
 * market (js/black-market-ui.js) and the stall (js/player-stall-ui.js) each register an adapter by kind; this module owns what they
 * share: the grid cells, prices and wallet, the bag page, the item and rune cards, the replay guard and the pointer.
 *
 * Markup contract: the shop's root carries data-shop-kind (and its own data), a thing the pointer can carry data-shop-pick (the
 * adapter's own key, as 'ware:3' or 'bag:812'), a place it can be dropped on besides the bag data-shop-drop, and the bag grid is
 * bagHtml's. A hover (mouse) shows a card, a press without a drag (or Enter on the button) is a tap, a drag carries a ghost onto the
 * bag (its top-left cell picks the place, over all pages) or onto a drop place under the pointer.
 *
 * adapter: { shopHover?(root, pick), shopTap(root, pick, { touch }), shopSize?(root, pick) → { columns, rows } when the pick can go into the bag,
 *            shopAccepts(root, pick, target) → true, false (painted red) or null (no target), shopDrop(root, pick, target), shopRedraw(root) }
 * target: { area: 'bag', column, row (over all pages), local, size } or { area: 'drop', key, el }. */
const shopView = (() => {
    const DRAG_PX = 6;
    const WALLET_ORDER = Object.freeze(['magicBud', 'formlessDew', 'goldenRule']);
    const adapters = new Map();
    let press = null;   // { root, adapter, el, pick, x, y, pointerId, touch, offset, ghost, target }
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
        return `<span class="shop-wallet">${shown.map(key => `<span title="${escapeHTML(currencyName(key))}">${coinHtml(key)}${held(key).toLocaleString()}</span>`).join('')}</span>`;
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
        if (!choice) return `<span class="shop-bag-item rarity-${item.rarity || 'normal'}" style="${style}">${art}</span>`;
        const { key, chosen, reason } = choice;
        if (!key) return `<span class="shop-bag-item rarity-${item.rarity || 'normal'} is-dim" style="${style}" title="${escapeHTML(reason || '')}">${art}</span>`;
        return `<button type="button" class="shop-bag-item is-pick rarity-${item.rarity || 'normal'}${chosen ? ' is-chosen' : ''}" style="${style}"
            data-shop-pick="${escapeHTML(key)}" aria-label="${escapeHTML(item.name || item.baseName || '장비')}">${art}</button>`;
    }

    /** An item's card: its own tooltip (the bag's), and the bag analysis' verdict on wearing it (js/equipment-triage.js rate) in the bag
     * card's words: 공격 +8.3%, 생존 +12%, or 현 세팅 유지. No verdict while the hero cannot wear it: the card shows the requirement.
     * rating: false for gear already sold. The last card is kept while the item, the level and the worn gear stay (a shop redraws often). */
    let cardMemo = null;
    function itemCardHtml(item, { rating = true } = {}) {
        const key = `${rating}:${game.level}:${Object.values(game.equipment || {}).map(entry => entry?.id || 0).join(',')}`;
        if (cardMemo && cardMemo.item === item && cardMemo.key === key) return cardMemo.html;
        const box = document.createElement('div');
        showItemTooltip(null, null, false, item, { target: box });
        const html = `<div class="shop-tooltip">${box.innerHTML}</div>${rating ? gearRatingHtml(item) : ''}`;
        cardMemo = { item, key, html };
        return html;
    }

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

    /** A free support place and enough 공명력 for the shelf tier, as toggleSupport checks (a worn one frees its own cost first).
     * Summon guards also need room under the summon cap: left out. */
    function supportFits(gem) {
        if (isSummonGuardSupport(gem.name)) return false;
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

    const howToBuy = () => (uiDisplay.matches('(hover: hover)') ? '누르면 사고, 가방 칸으로 끌어다 놓으면 그 자리에 삽니다.'
        : '한 번 누르면 정보, 다시 누르면 삽니다. 가방 칸으로 끌어 놓아도 삽니다.');

    // ---- pointer ----

    function pickAt(node) {
        const el = node?.closest?.('[data-shop-pick]'), root = el?.closest('[data-shop-kind]');
        const adapter = root && adapters.get(root.dataset.shopKind);
        return adapter ? { root, adapter, el, pick: el.dataset.shopPick } : null;
    }

    function hoverPick(event) {
        const at = event.pointerType === 'mouse' && !press ? pickAt(event.target) : null;
        if (at && at.adapter.shopHover) at.adapter.shopHover(at.root, at.pick);
    }

    function pressPick(event) {
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
        const drop = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-shop-drop]');
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

    /** Let go: a drag gives its target to the adapter (a red one too: the adapter says why); a press without a drag is a tap. */
    function releasePick(event) {
        if (!press || press.pointerId !== event.pointerId) return;
        const holding = endPress();
        if (holding.ghost) { if (holding.target) holding.adapter.shopDrop(holding.root, holding.pick, holding.target); return; }
        holding.adapter.shopTap(holding.root, holding.pick, { touch: holding.touch });
    }

    /** Bag pages, and Enter or Space on a carried thing's button (no pointer): a tap that picks first, as on a touch screen. */
    function shopClick(event) {
        const page = event.target.closest?.('[data-shop-bag-page]'), root = page?.closest('[data-shop-kind]');
        if (root && adapters.has(root.dataset.shopKind)) { bagPage = Number(page.dataset.shopBagPage); adapters.get(root.dataset.shopKind).shopRedraw(root); return; }
        const at = event.detail === 0 ? pickAt(event.target) : null;
        if (at) at.adapter.shopTap(at.root, at.pick, { touch: true });
    }

    document.addEventListener('pointerover', hoverPick);
    document.addEventListener('pointerdown', pressPick);
    document.addEventListener('pointermove', dragPick);
    document.addEventListener('pointerup', releasePick);
    document.addEventListener('pointercancel', () => { if (press) endPress(); });
    document.addEventListener('click', shopClick);
    return Object.freeze({ registerShop, WALLET_ORDER, held, currencyName, coinHtml, priceHtml, walletHtml, cellsHtml, gridHtml, areaStyle,
        bagHtml, itemCardHtml, gemArtHtml, gemCardHtml, busyReason, howToBuy, dragging: () => !!press });
})();
safeExposeGlobals({ shopView });
