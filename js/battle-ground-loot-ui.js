// Presentation receipts, plus the exploration floor piles (js/exploration-ground-loot.js) drawn from the run and clickable:
// a click is the only grant this layer asks for, and it goes through actExplorationProgress.collectPile.
// Called once by renderBattlefield between the floor and actor passes; no additional frame loop.
const battleGroundLoot = (() => {
    let ground, air, foreground, canvas, geometry = '', zone, epoch;
    let seen = new WeakSet();
    const entries = new Map();
    const motes = new Set();
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The canvas width from the box measured once per resize: canvas.clientWidth here, read every frame by consume(), forced a
    // style and layout pass whenever anything had touched the page earlier in the frame (2026-10-07: about 8% of a frame with a window open).
    const narrow = () => canvasBox(canvas).width < 600;
    const displayLimit = () => narrow() ? 16 : 24;
    const isMajor = receipt => receipt.currency === 'goldenRule' || receipt.item?.rarity === 'unique' || !!receipt.highlight;
    /** A pile shows its most important drop: golden rule, uniques and highlighted items first, then by rarity. */
    const importance = receipt => (isMajor(receipt) ? 100 : 0) + getRarityRank(receipt.item?.rarity || 'normal');
    /** Rows per arm of the name cross. Up sits over the picture; the side arms stay short so they fit between the up and
     * down arms. Drops beyond every arm stay unnamed: never a "외 N개" row (user, 2026-10-03). */
    const ARM_ROWS = Object.freeze({ wide: { up: 6, right: 2, left: 2, down: 3 }, narrow: { up: 3, right: 1, left: 1, down: 2 } });

    function later(entry, action, delay) {
        const timer = setTimeout(() => { entry.timers.delete(timer); action(); }, delay);
        entry.timers.add(timer);
    }

    function remove(entry) {
        entry.timers.forEach(clearTimeout);
        entry.marker.remove();
        entries.delete(entry.marker);
    }

    function clear() {
        entries.forEach(remove);
        floorPiles.clear();
        motes.forEach(mote => { mote.getAnimations().forEach(animation => animation.cancel()); mote.remove(); });
        motes.clear();
        if (foreground) { foreground.width = 1; foreground.height = 1; foreground.hidden = true; }
    }

    function mount(source) {
        canvas = source;
        ground = document.createElement('div'); ground.className = 'battle-loot-layer';
        air = document.createElement('div'); air.className = 'battle-loot-air';
        foreground = document.createElement('canvas'); foreground.className = 'battle-loot-foreground';
        [ground, foreground, air].forEach(node => canvas.parentElement.append(node));
        [foreground, air].forEach(node => node.setAttribute('aria-hidden', 'true'));
        document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
    }

    /** The canvas's box: the battlefield one is measured once per resize (js/canvas-battlefield.js battleCanvasBox); reading
     * offsetParent and clientWidth here every frame forced a style pass mid-frame (2026-10-07 frame drops). */
    function canvasBox(source) {
        if (source.id === 'battlefield-canvas' && typeof battleCanvasBox === 'object') return battleCanvasBox.read(source);
        const hidden = source.offsetParent === null;
        return { width: hidden ? 0 : source.clientWidth, height: hidden ? 0 : source.clientHeight, left: source.offsetLeft, top: source.offsetTop };
    }

    function resize() {
        const box = canvasBox(canvas), next = [box.left, box.top, box.width, box.height].join(':');
        if (geometry === next) return;
        geometry = next;
        entries.forEach(entry => { delete entry.marker.dataset.labelRow; });
        const rect = { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' };
        [ground, foreground, air].forEach(node => Object.assign(node.style, rect));
        ground.style.setProperty('--loot-width', box.width + 'px');
    }

    function place(marker, point) {
        const labels = marker.querySelector('.battle-loot-labels');
        if (!marker.dataset.labelRow) {
            const row = labels.firstElementChild?.offsetHeight || 20;
            marker.dataset.labelRow = String(row);
            marker.dataset.labelHeight = String(labels.offsetHeight || labels.children.length * (row + 2));
            marker.dataset.labelHalf = String(labels.offsetWidth / 2);
        }
        const x = Math.round(point.x), y = Math.round(point.y);
        marker.style.left = x + 'px'; marker.style.top = y + 'px';
        stackLabel(marker, { x, y, half: Number(marker.dataset.labelHalf), height: Number(marker.dataset.labelHeight), row: Number(marker.dataset.labelRow) });
    }

    /** A receipt is already owned. Only its short-lived picture is anchored to a map cell (never to viewport percentages). */
    function projectEntries(projection) {
        const projected = [], box = canvasBox(canvas);
        let changed = false;
        for (const entry of entries.values()) {
            const point = originFor(entry.cell, projection), marker = entry.marker;
            marker.hidden = point.x < -64 || point.y < -64 || point.x > box.width + 64 || point.y > box.height + 64;
            projected.push({ marker, point });
            if (marker.style.left !== Math.round(point.x) + 'px' || marker.style.top !== Math.round(point.y) + 'px' || !marker.dataset.labelRow) changed = true;
        }
        if (!changed) return;
        entries.forEach(entry => { delete entry.marker.dataset.labelTop; });
        projected.forEach(({ marker, point }) => place(marker, point));
    }

    // 이름표 묶음이 이미 떨어진 다른 묶음과 겹치면 한 줄씩 위로 올린다(아이템 그림 위치는 그대로).
    // 표시 좌표만 바꾸며 지급과 자동 획득과는 무관하다. 올린 만큼 CSS가 연결선을 그린다.
    function stackLabel(marker, box) {
        const others = [...entries.keys()].filter(other => other !== marker && other.dataset.labelTop);
        const overlaps = top => others.some(other => {
            const otherTop = Number(other.dataset.labelTop);
            return top < otherTop + Number(other.dataset.labelHeight) + 2 && otherTop < top + box.height + 2
                && Math.abs(parseFloat(other.style.left) - box.x) < box.half + Number(other.dataset.labelHalf) + 4;
        });
        const base = box.y - 30 - box.height;
        let lift = 0;
        while (lift < box.row * 5 && base - lift > 4 && overlaps(base - lift)) lift += box.row + 2;
        marker.dataset.labelTop = String(base - lift);
        marker.dataset.labelHeight = String(box.height);
        marker.dataset.labelHalf = String(box.half);
        marker.style.setProperty('--label-lift', lift + 'px');
    }

    /** Canvas boxes of a pile's shown name arms, from its placed spot (the up arm includes its lift). */
    function armBoxes(marker) {
        const x = parseFloat(marker.style.left), y = parseFloat(marker.style.top);
        const lift = parseFloat(marker.style.getPropertyValue('--label-lift')) || 0;
        return [...marker.children]
            .filter(arm => String(arm.className).startsWith('battle-loot-labels') && !arm.hidden).map(arm => {
                const w = arm.offsetWidth, h = arm.offsetHeight || arm.children.length * 25;
                const side = arm.className.replace('battle-loot-labels', '').trim();
                if (side === 'is-right') return { arm, side, left: x + 26, right: x + 26 + w, top: y - 3 - h / 2, bottom: y - 3 + h / 2 };
                if (side === 'is-left') return { arm, side, left: x - 26 - w, right: x - 26, top: y - 3 - h / 2, bottom: y - 3 + h / 2 };
                if (side === 'is-down') return { arm, side, left: x - w / 2, right: x + w / 2, top: y + 24, bottom: y + 24 + h };
                return { arm, side: 'up', left: x - w / 2, right: x + w / 2, top: y - 30 - lift - h, bottom: y - 30 - lift };
            });
    }

    /** A later pile's side and down names give way where they would cover names already on the ground: the earlier, more
     * important pile keeps its place, and a hidden arm is fine (no "외 N개", user 2026-10-03). */
    function yieldCrowdedArms(marker) {
        const taken = [...entries.keys()].filter(other => other !== marker).flatMap(armBoxes);
        const hits = box => taken.some(other => box.left < other.right && other.left < box.right && box.top < other.bottom && other.top < box.bottom);
        armBoxes(marker).filter(box => box.side !== 'up' && hits(box)).forEach(box => { box.arm.hidden = true; });
    }

    function currencyRow(label, receipt) {
        label.innerHTML = window.getStyledOrbName(receipt.currency) + (receipt.count > 1 ? ' ×' + receipt.count : '');
        label.dataset.currency = receipt.currency;
        const tone = label.querySelector('.orb-tone');
        if (tone) label.style.setProperty('--loot-color', tone.style.getPropertyValue('--orb-tone'));
    }

    /** One name; --row staggers the landing pop (nearest the picture first), majors get one shine. */
    function nameRow(receipt, index) {
        const label = document.createElement('span'); label.className = 'battle-loot-name';
        if (isMajor(receipt)) label.classList.add('is-major');
        label.style.setProperty('--row', String(index));
        label.dataset.rarity = receipt.item?.rarity || 'normal';
        label.style.setProperty('--loot-color', receipt.color || getRarityColor(label.dataset.rarity));
        if (receipt.currency && ORB_DB[receipt.currency]) currencyRow(label, receipt);
        else label.textContent = receipt.item.name;
        return label;
    }

    /** Name cross around the pile, in importance order: up over the picture first, then the emptier side, then down. */
    function labelArms(receipts) {
        const limits = narrow() ? ARM_ROWS.narrow : ARM_ROWS.wide;
        const arms = { up: [], right: [], left: [], down: [] };
        receipts.forEach((receipt, index) => {
            const sides = arms.right.length <= arms.left.length ? ['right', 'left'] : ['left', 'right'];
            const side = ['up', ...sides, 'down'].find(name => arms[name].length < limits[name]);
            if (side) arms[side].push(nameRow(receipt, index));
        });
        return ['up', 'right', 'left', 'down'].filter(side => arms[side].length).map(side => {
            const arm = document.createElement('div');
            arm.className = side === 'up' ? 'battle-loot-labels' : `battle-loot-labels is-${side}`;
            arms[side].forEach(row => arm.append(row));
            return arm;
        });
    }

    /** One item picture for the pile (its most important drop) under the name cross. tier drives the glow, pop and sound. */
    function appearance(marker, receipts) {
        const lead = receipts[0], item = lead.item, currency = lead.currency && ORB_DB[lead.currency];
        marker.dataset.rarity = item?.rarity || 'normal';
        marker.dataset.kind = currency ? 'currency' : 'equipment';
        marker.dataset.tier = isMajor(lead) ? 'major' : getRarityRank(marker.dataset.rarity) >= 2 ? 'rare' : 'plain';
        if (currency) marker.dataset.currency = lead.currency;
        const arms = labelArms(receipts);
        marker.style.setProperty('--loot-color', arms[0].firstElementChild.style.getPropertyValue('--loot-color'));
        const flight = document.createElement('div'); flight.className = 'battle-loot-flight';
        flight.append(lootArt(currency ? currency.icon : getInventoryItemVisualAsset(item, lead.itemKind), item));
        marker.append(flight, ...arms);
        return flight;
    }

    /** 그림이 없는 재화(56종)는 작은 보석 문양으로 날아간다 — src가 undefined인 그림이 /undefined 404를 냈고(검토 5차),
     * 그림을 빼자 날아가는 연출이 빈 자리를 읽다 게임 루프 오류가 났다(검토 6차). */
    function lootArt(src, item) {
        if (!src) {
            const glyph = document.createElement('span'); glyph.className = 'battle-loot-item battle-loot-glyph';
            return glyph;
        }
        const art = document.createElement('img'); art.className = 'battle-loot-item'; art.alt = '';
        art.src = src;
        if (item?.slot === '무기') art.classList.add('weapon');
        return art;
    }

    function beam(marker, receipt) {
        if (receipt.currency !== 'goldenRule' && receipt.item?.rarity !== 'unique' && !receipt.highlight) return;
        marker.dataset.beam = 'true';
        const pillar = document.createElement('div'); pillar.className = 'battle-loot-beam'; marker.prepend(pillar);
        marker.style.setProperty('--beam-height', Math.min(152, canvasBox(canvas).height * .36) + 'px');
        if (receipt.currency !== 'goldenRule') return;
        const palette = getComputedStyle(document.getElementById('divine-drop-banner'));
        marker.style.setProperty('--beam-color', palette.borderTopColor);
        marker.style.setProperty('--beam-core', palette.color);
    }

    function room(important) {
        if (entries.size < displayLimit()) return true;
        const oldest = [...entries.values()].find(entry => !entry.floor && entry.marker.dataset.beam !== 'true');
        if (!oldest && !important) return false;
        remove(oldest || entries.values().next().value);
        return true;
    }

    /** One pile: receipts sorted by importance. A kill drops one pile on one spot. */
    function spawn(receipts, cell, projection) {
        const important = receipts.some(isMajor);
        if (!room(important)) return;
        const marker = document.createElement('div'); marker.className = 'battle-loot-drop';
        marker.setAttribute('aria-hidden', 'true');
        const point = originFor(cell, projection);
        marker.dataset.gx = String(cell.gx); marker.dataset.gy = String(cell.gy);
        marker.style.setProperty('--rest-angle', (receipts[0].item?.slot === '무기' ? 54 : -16) + 'deg');
        const flight = appearance(marker, receipts); beam(marker, receipts[0]); ground.append(marker); place(marker, point); yieldCrowdedArms(marker);
        const entry = { marker, cell: { gx: cell.gx, gy: cell.gy }, timers: new Set() }; entries.set(marker, entry);
        launch(entry, flight, point);
        later(entry, () => absorb(entry), important ? 3300 : 2400);
    }

    function launch(entry, flight, point) {
        const dx = point.x - parseFloat(entry.marker.style.left), dy = point.y - parseFloat(entry.marker.style.top);
        const frames = [0, .125, .25, .375, .5, .625, .75, .875, 1].map(t => ({ offset: t,
            transform: `translate(${dx * (1 - t)}px,${dy * (1 - t) - 4 * t * (1 - t) * Math.min(65, 35 + Math.hypot(dx, dy) * .2)}px)` }));
        const duration = reduced() ? 1 : 580 + Math.abs(dx) % 100;
        flight.animate(frames, { duration, fill: 'backwards' });
        const art = flight.firstElementChild, rest = getComputedStyle(art).transform;
        art.animate([{ transform: rest + ' rotate(-45deg) scale(.75)' }, { transform: rest }], { duration, fill: 'backwards' });
        later(entry, () => land(entry), duration);
    }

    function land(entry) {
        entry.marker.classList.add('landed');
        const contact = document.createElement('span'); contact.className = 'battle-loot-contact'; entry.marker.append(contact);
        const tier = entry.marker.dataset.tier;
        if (tier !== 'plain' && typeof playLootDropSound === 'function') playLootDropSound(tier === 'major');
        if (!reduced()) landingPop(entry.marker.querySelector('.battle-loot-item'), tier);
        later(entry, () => contact.remove(), 550);
    }

    /** The picture squashes on the ground and springs back; rare and better flash white for a moment. */
    function landingPop(art, tier) {
        const shadow = 'drop-shadow(1px 2px 1px #14130f)', flash = tier === 'plain' ? 1 : 2;
        art.animate([
            { translate: '0 0', scale: '1.3 .76', filter: `${shadow} brightness(${flash})` },
            { translate: '0 -7px', scale: '.9 1.12', offset: .38 },
            { translate: '0 0', scale: '1 1', filter: `${shadow} brightness(1)` }
        ], { duration: 280, easing: 'ease-out' });
    }

    function absorb(entry) {
        const marker = entry.marker;
        const from = { x: parseFloat(marker.style.left), y: parseFloat(marker.style.top) };
        const to = { x: battleVisualState.playerPos.x, y: battleVisualState.playerPos.y - 24 };
        marker.classList.add('collected');
        if (!reduced()) {
            for (let trail = 0; trail < 3; trail++) absorbMote(from, to, marker.style.getPropertyValue('--loot-color'), trail);
        }
        later(entry, () => remove(entry), 200);
    }

    function absorbMote(from, to, color, trail) {
        if (motes.size >= 48) return;
        const mote = document.createElement('span'); mote.className = 'battle-loot-mote';
        mote.style.setProperty('--loot-color', color); mote.style.left = from.x + 'px'; mote.style.top = from.y + 'px';
        air.append(mote); motes.add(mote);
        const dx = to.x - from.x, dy = to.y - from.y;
        const frames = [0, .125, .25, .375, .5, .625, .75, .875, 1].map(t => ({ offset: t,
            transform: `translate(${dx * t}px,${dy * t - Math.sin(t * Math.PI) * 24}px) rotate(${Math.atan2(dy - Math.cos(t * Math.PI) * 24 * Math.PI, dx) * 180 / Math.PI}deg) scale(${(1 - .7 * t) * (1 - trail * .18)})`,
            opacity: (1 - .35 * t) * (1 - trail * .28) }));
        const animation = mote.animate(frames, { duration: 540, delay: trail * 32, fill: 'both', easing: 'cubic-bezier(.42,0,.76,.5)' });
        animation.onfinish = () => { mote.remove(); motes.delete(mote); if (trail === 0) receive(to, color); };
    }

    function receive(to, color) {
        if (motes.size >= 48 || reduced()) return;
        const flash = document.createElement('span'); flash.className = 'battle-loot-receive';
        flash.style.left = to.x + 'px'; flash.style.top = to.y + 'px'; flash.style.setProperty('--loot-color', color);
        air.append(flash); motes.add(flash);
        flash.addEventListener('animationend', () => { flash.remove(); motes.delete(flash); }, { once: true });
    }

    function pendingDrops(now) {
        return battleFx.filter(fx => {
            if (!fx.loot || seen.has(fx) || fx.start > now) return false;
            seen.add(fx);
            return now - fx.start <= 500 && fx.loot.zoneId === game.currentZoneId;
        });
    }

    function originFor(cell, projection) {
        const point = projection.cellToScreen(cell.gx, cell.gy);
        return { x: point.x, y: point.y + projection.actorGroundOffsetY };
    }

    // 한 처치의 드랍은 한 자리에 한 더미로 떨어진다: 대표 그림 하나와 이름표 묶음(2026-10-03 사용자 요청).
    // 화면 상한은 더미 수로 센다. 받은 순서대로 중요한 드랍이 든 더미가 먼저다.
    function consume(now, projection) {
        const piles = new Map();
        const pending = pendingDrops(now).sort((a, b) => importance(b.loot) - importance(a.loot));
        for (const fx of pending) {
            if (!hasGridCell(fx.loot.sourceCell) || (fx.loot.currency && !(fx.loot.count > 0))) continue;
            const key = `${fx.loot.sourceCell.gx},${fx.loot.sourceCell.gy}`;
            if (!piles.has(key)) piles.set(key, []);
            piles.get(key).push(fx.loot);
        }
        for (const receipts of [...piles.values()].slice(0, displayLimit())) {
            spawn(receipts, receipts[0].sourceCell, projection);
        }
    }

    // ---- floor piles: equipment waiting on an exploration map until the hero walks over it or the player clicks it.
    const floorPiles = new Map(); // "gx,gy" → entry
    // Row keys whose landing already played: a redraw after a tab switch does not drop them again. Only rows still on the floor
    // stay listed (pruned every sync), so the set never grows past the current map's floor.
    const landedFloorIds = new Set();
    // The same receipts an immediate drop shows (js/combat.js queueEnemyGroundLoot), per floor row kind.
    const floorReceipt = {
        currency: row => ({ currency: row.currency, count: row.count }),
        equipment: row => ({ item: row.item, itemKind: 'equipment', highlight: row.highlight }),
        jewel: row => ({ item: row.item, itemKind: 'jewel', color: getJewelLootColor(row.item) }),
        core: row => ({ item: row.item, itemKind: 'core' }),
        talisman: row => ({ item: row.item, itemKind: 'talisman', color: TALISMAN_RARITY_TONES[row.item.rarity] })
    };
    const floorReceipts = pile => pile.rows.map(row => floorReceipt[actExplorationState.groundLoot.kindOf(row)](row))
        .sort((a, b) => importance(b) - importance(a));
    // A stable key per floor row: an item's id, the currency and cell (one row per currency and cell), or for a rolled talisman
    // (no id until stored) a per-row number kept for the row's life.
    const talismanKeys = new WeakMap();
    let nextTalismanKey = 0;
    function floorRowKey(row) {
        if (row.kind === 'talisman') {
            if (!talismanKeys.has(row)) talismanKeys.set(row, `talisman#${++nextTalismanKey}`);
            return talismanKeys.get(row);
        }
        return row.item ? `item#${row.item.id}` : `${row.currency}@${row.gx},${row.gy}`;
    }

    function pickFloor(event, entry) {
        event.preventDefault(); event.stopPropagation();
        actExplorationProgress.collectPile(entry.cell);
    }
    function floorMarker(entry, pile, projection, fresh) {
        const marker = entry.marker, receipts = floorReceipts(pile);
        marker.replaceChildren();
        const flight = appearance(marker, receipts); beam(marker, receipts[0]);
        const names = receipts.map(receipt => receipt.item ? receipt.item.name : `${ORB_DB[receipt.currency]?.name || receipt.currency} ×${receipt.count}`);
        marker.setAttribute('aria-label', `줍기: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` 외 ${names.length - 3}개` : ''}`);
        place(marker, originFor(entry.cell, projection)); yieldCrowdedArms(marker);
        if (fresh) launch(entry, flight, originFor(entry.cell, projection));
        else marker.classList.add('landed');
    }
    function addFloorPile(key, pile) {
        const marker = document.createElement('div'); marker.className = 'battle-loot-drop is-floor';
        marker.setAttribute('role', 'button'); marker.tabIndex = 0;
        marker.dataset.gx = String(pile.gx); marker.dataset.gy = String(pile.gy);
        marker.style.setProperty('--rest-angle', (pile.rows[0].item?.slot === '무기' ? 54 : -16) + 'deg');
        const entry = { marker, cell: { gx: pile.gx, gy: pile.gy }, timers: new Set(), floor: true, ids: '' };
        marker.addEventListener('click', event => pickFloor(event, entry));
        marker.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') pickFloor(event, entry); });
        ground.append(marker); entries.set(marker, entry); floorPiles.set(key, entry);
        return entry;
    }
    /** Mirrors the run's floor: new piles land, changed piles redraw their names, picked-up piles fly to the hero. */
    function syncFloor(projection) {
        const run = actExplorationState.current(game);
        const piles = run ? actExplorationState.groundLoot.piles(run) : [];
        const live = new Set(), liveRows = new Set();
        for (const pile of piles) {
            pile.rows.forEach(row => liveRows.add(floorRowKey(row)));
            const key = `${pile.gx},${pile.gy}`, ids = pile.rows.map(row => `${floorRowKey(row)}:${row.count || 1}`).join(',');
            live.add(key);
            const existing = floorPiles.get(key), entry = existing || addFloorPile(key, pile);
            if (entry.ids === ids) continue;
            entry.ids = ids;
            const fresh = pile.rows.some(row => !landedFloorIds.has(floorRowKey(row)));
            pile.rows.forEach(row => landedFloorIds.add(floorRowKey(row)));
            floorMarker(entry, pile, projection, fresh);
        }
        for (const id of landedFloorIds) if (!liveRows.has(id)) landedFloorIds.delete(id);
        for (const [key, entry] of floorPiles) {
            if (live.has(key)) continue;
            floorPiles.delete(key); entry.floor = false; entry.marker.removeAttribute('role'); entry.marker.tabIndex = -1;
            absorb(entry);
        }
    }

    function visible(source) {
        const box = canvasBox(source);
        return box.width > 0 && box.height > 0 && !document.hidden && !game.isBackgroundCalculation;
    }

    function prepare(source, now, projection) {
        if (!visible(source)) { clear(); return false; }
        if (zone !== game.currentZoneId || epoch !== battleVisualState.lootEpoch) {
            clear(); zone = game.currentZoneId; epoch = battleVisualState.lootEpoch; seen = new WeakSet();
        }
        const run = actExplorationState.current(game);
        if (!canvas && !battleFx.some(fx => fx.loot) && !(run && run.groundLoot && run.groundLoot.length)) return false;
        if (!canvas) mount(source);
        resize(); projectEntries(projection); consume(now, projection); syncFloor(projection);
        return hasPresentation();
    }

    function hasPresentation() {
        if (entries.size || motes.size) return true;
        if (!foreground.hidden) { foreground.hidden = true; foreground.width = 1; foreground.height = 1; }
        return false;
    }

    /** Returns the actor-pass context, or the original context when there is no visible ground loot. */
    function actorContext(source, ctx, now, projection) {
        if (!prepare(source, now, projection)) return ctx;
        foreground.hidden = false;
        if (foreground.width !== canvas.width || foreground.height !== canvas.height) {
            foreground.width = canvas.width; foreground.height = canvas.height;
        }
        const next = foreground.getContext('2d');
        next.resetTransform(); next.clearRect(0, 0, foreground.width, foreground.height);
        next.setTransform(ctx.getTransform()); next.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
        next.imageSmoothingQuality = ctx.imageSmoothingQuality;
        return next;
    }

    addEventListener('project-idle:floor-loot-collected', ({ detail }) => {
        if (!game.settings.showLootLog) return;
        // The same lines a drop picked up at once writes (js/combat.js rollLootForEnemy).
        detail.currencies.forEach(({ key, count }) => addLog(`🪙 ${window.getStyledOrbName(key)} +${count}`,
            key === 'goldenRule' || key === 'sapBud' ? 'loot-unique' : 'loot-magic'));
        detail.items.forEach(item => addLog(`🛡️ <span class='loot-${item.rarity}'>[${item.name}]</span> 획득!`, '', { item }));
    });

    return Object.freeze({ actorContext });
})();
