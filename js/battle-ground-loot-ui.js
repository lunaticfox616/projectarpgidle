// Presentation receipts only. Inventory/currency grants never depend on these nodes or timers.
// Called once by renderBattlefield between the floor and actor passes; no additional frame loop.
const battleGroundLoot = (() => {
    let ground, air, foreground, canvas, geometry = '', zone, epoch;
    let seen = new WeakSet();
    const entries = new Map();
    const motes = new Set();
    let settlement=null;
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    const displayLimit = () => canvas.clientWidth < 600 ? 16 : 24;
    const isMajor = receipt => receipt.currency === 'goldenRule' || receipt.item?.rarity === 'unique' || !!receipt.highlight;
    /** A pile shows its most important drop: golden rule, uniques and highlighted items first, then by rarity. */
    const importance = receipt => (isMajor(receipt) ? 100 : 0) + getRarityRank(receipt.item?.rarity || 'normal');
    /** Name rows per pile before the rest fold into one "외 N개" row; phones get fewer so the column stays off the fight. */
    const labelRows = () => canvas.clientWidth < 600 ? 3 : 6;

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
        motes.forEach(mote => { mote.getAnimations().forEach(animation => animation.cancel()); mote.remove(); });
        motes.clear();
        if (foreground) { foreground.width = 1; foreground.height = 1; foreground.hidden = true; }
    }

    function mount(source) {
        canvas = source;
        ground = document.createElement('div'); ground.className = 'battle-loot-layer';
        air = document.createElement('div'); air.className = 'battle-loot-air';
        foreground = document.createElement('canvas'); foreground.className = 'battle-loot-foreground';
        [ground, foreground, air].forEach(node => { node.setAttribute('aria-hidden', 'true'); canvas.parentElement.append(node); });
        document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
    }

    function resize() {
        const next = [canvas.offsetLeft, canvas.offsetTop, canvas.clientWidth, canvas.clientHeight].join(':');
        if (geometry === next) return;
        geometry = next;
        const rect = { left: canvas.offsetLeft + 'px', top: canvas.offsetTop + 'px',
            width: canvas.clientWidth + 'px', height: canvas.clientHeight + 'px' };
        [ground, foreground, air].forEach(node => Object.assign(node.style, rect));
        ground.style.setProperty('--loot-width', canvas.clientWidth + 'px');
        entries.forEach(entry => place(entry.marker));
    }

    function place(marker) {
        const labels = marker.querySelector('.battle-loot-labels');
        const row = labels.firstElementChild?.offsetHeight || 20;
        const height = labels.offsetHeight || labels.children.length * (row + 2);
        const half = labels.offsetWidth / 2 + 8;
        const x = Math.max(half, Math.min(canvas.clientWidth - half, Number(marker.dataset.x) * canvas.clientWidth));
        const y = Math.max(42 + height, Math.min(canvas.clientHeight - 25, Number(marker.dataset.y) * canvas.clientHeight));
        marker.style.left = x + 'px'; marker.style.top = y + 'px';
        stackLabel(marker, { x, y, half: labels.offsetWidth / 2, height, row });
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
        const base = box.y - 23 - box.height;
        let lift = 0;
        while (lift < box.row * 5 && base - lift > 4 && overlaps(base - lift)) lift += box.row + 2;
        marker.dataset.labelTop = String(base - lift);
        marker.dataset.labelHeight = String(box.height);
        marker.dataset.labelHalf = String(box.half);
        marker.style.setProperty('--label-lift', lift + 'px');
    }

    function currencyRow(label, receipt) {
        label.innerHTML = window.getStyledOrbName(receipt.currency) + (receipt.count > 1 ? ' ×' + receipt.count : '');
        label.dataset.currency = receipt.currency;
        const tone = label.querySelector('.orb-tone');
        if (tone) label.style.setProperty('--loot-color', tone.style.getPropertyValue('--orb-tone'));
    }

    function nameRow(receipt) {
        const label = document.createElement('span'); label.className = 'battle-loot-name';
        label.dataset.rarity = receipt.item?.rarity || 'normal';
        label.style.setProperty('--loot-color', receipt.color || getRarityColor(label.dataset.rarity));
        if (receipt.currency && ORB_DB[receipt.currency]) currencyRow(label, receipt);
        else label.textContent = receipt.item.name;
        return label;
    }

    /** PoE-style name column over the pile: the most important name nearest the item, the others above it, then "외 N개". */
    function labelColumn(receipts) {
        const column = document.createElement('div'); column.className = 'battle-loot-labels';
        const limit = labelRows(), shown = receipts.length > limit ? limit - 1 : receipts.length;
        receipts.slice(0, shown).forEach(receipt => column.append(nameRow(receipt)));
        if (shown < receipts.length) {
            const more = document.createElement('span'); more.className = 'battle-loot-name is-more';
            more.textContent = `외 ${receipts.length - shown}개`;
            column.append(more);
        }
        return column;
    }

    /** One item picture for the pile (its most important drop) under the name column. */
    function appearance(marker, receipts) {
        const lead = receipts[0], item = lead.item, currency = lead.currency && ORB_DB[lead.currency];
        marker.dataset.rarity = item?.rarity || 'normal';
        marker.dataset.kind = currency ? 'currency' : 'equipment';
        if (currency) marker.dataset.currency = lead.currency;
        const labels = labelColumn(receipts);
        marker.style.setProperty('--loot-color', labels.firstElementChild.style.getPropertyValue('--loot-color'));
        const flight = document.createElement('div'); flight.className = 'battle-loot-flight';
        flight.append(lootArt(currency ? currency.icon : getInventoryItemVisualAsset(item, lead.itemKind), item));
        marker.append(flight, labels);
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
        marker.style.setProperty('--beam-height', Math.min(152, canvas.clientHeight * .36) + 'px');
        if (receipt.currency !== 'goldenRule') return;
        const palette = getComputedStyle(document.getElementById('divine-drop-banner'));
        marker.style.setProperty('--beam-color', palette.borderTopColor);
        marker.style.setProperty('--beam-core', palette.color);
    }

    function room(important) {
        if (entries.size < displayLimit()) return true;
        const oldest = [...entries.values()].find(entry => entry.marker.dataset.beam !== 'true');
        if (!oldest && !important) return false;
        remove(oldest || entries.values().next().value);
        return true;
    }

    /** One pile: receipts sorted by importance. A kill drops one pile on one spot; the act settlement spreads single rows in a ring. */
    function spawn(receipts, point, index, count) {
        const important = receipts.some(isMajor);
        if (!room(important)) return;
        const marker = document.createElement('div'); marker.className = 'battle-loot-drop';
        const radius = (count === 1 ? 36 : Math.min(120, canvas.clientWidth * .28, canvas.clientHeight * .24)) * (.9 + .08 * Math.sin(index * 2.4));
        const angle = count === 1 ? Math.PI / 4 : -Math.PI / 2 + index * Math.PI * 2 / count + Math.sin(index * 1.8) * .07;
        marker.dataset.x = (point.x + Math.cos(angle) * radius) / canvas.clientWidth;
        marker.dataset.y = (point.y + Math.sin(angle) * radius) / canvas.clientHeight;
        marker.dataset.sourceX = point.x / canvas.clientWidth; marker.dataset.sourceY = point.y / canvas.clientHeight;
        marker.style.setProperty('--rest-angle', (receipts[0].item?.slot === '무기' ? 54 + index * 7 : -16 + index * 9) + 'deg');
        const flight = appearance(marker, receipts); beam(marker, receipts[0]); ground.append(marker); place(marker);
        const entry = { marker, timers: new Set() }; entries.set(marker, entry);
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
        if (!reduced()) entry.marker.querySelector('.battle-loot-item').animate([
            { translate: '0 0' }, { translate: '0 -4px', offset: .35 }, { translate: '0 0' }
        ], { duration: 190, easing: 'ease-out' });
        later(entry, () => contact.remove(), 550);
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

    function originFor(enemyId, cell, projection) {
        const ghost = battleVisualState.enemyGhostPos[enemyId] || battleVisualState.enemySmoothPos[enemyId];
        if (ghost) return ghost;
        if (!hasGridCell(cell)) return null;
        const point = projection.cellToScreen(cell.gx, cell.gy);
        return { x: point.x, y: point.y + projection.actorGroundOffsetY };
    }

    // 한 처치의 드랍은 한 자리에 한 더미로 떨어진다: 대표 그림 하나와 이름표 묶음(2026-10-03 사용자 요청).
    // 화면 상한은 더미 수로 센다. 받은 순서대로 중요한 드랍이 든 더미가 먼저다.
    function consume(now, projection) {
        const piles = new Map();
        const pending = pendingDrops(now).sort((a, b) => importance(b.loot) - importance(a.loot));
        for (const fx of pending) {
            if (fx.loot.currency && !(ORB_DB[fx.loot.currency]?.icon && fx.loot.count > 0)) continue;
            if (!piles.has(fx.enemyId)) piles.set(fx.enemyId, []);
            piles.get(fx.enemyId).push(fx.loot);
        }
        for (const [enemyId, receipts] of [...piles].slice(0, displayLimit())) {
            const point = originFor(enemyId, receipts[0].sourceCell, projection);
            if (point) spawn(receipts, point, 0, 1);
        }
    }

    function visible(source) {
        return source.offsetParent !== null && source.clientWidth > 0 && source.clientHeight > 0
            && !document.hidden && !game.isBackgroundCalculation;
    }

    // The domain has already paid every row. This bounded queue is presentation only.
    function settle(event) {
        if(event.detail.background || document.hidden)return;
        const run=actExplorationState.current(game);if(!run?.completionApplied)return;
        const rows=actExplorationUi.collectLootRows(event.detail).map(row=>({
            currency:row.currency,count:row.amount,item:row.item||{name:row.name+(row.amount>1?' ×'+row.amount:''),rarity:'normal'},
            itemKind:({jewels:'jewel'})[row.kind],
            color:row.rarity?getRarityColor(row.rarity):undefined
        }));
        if(!rows.length)return;
        const boss=actExplorationMap.forRun(run).rooms.find(room=>room.role==='boss');
        clear();
        settlement={run,rows:rows.sort((a,b)=>Number(isMajor(b))-Number(isMajor(a))),
            cell:{gx:boss.gx+.5,gy:boss.gy+.5},started:performance.now(),index:0,bounded:false};
        document.getElementById('btn-exploration-loot-skip').hidden=false;
    }

    function endSettlement(skip=false) {
        if(skip && settlement?.run===game.actExploration && settlement.run.departure)
            settlement.run.departure.remainingMs=0;
        settlement=null;clear();
        document.getElementById('btn-exploration-loot-skip').hidden=true;
    }

    function consumeSettlement(projection) {
        if(!settlement)return;
        if(settlement.run!==game.actExploration){endSettlement();return;}
        const age=performance.now()-settlement.started;
        if(age>=5000){endSettlement();return;}
        const rows=settlement.rows,limit=displayLimit();
        if(!settlement.bounded && rows.length>limit) {
            const rest=rows.splice(limit-1),count=rest.reduce((sum,row)=>sum+(row.count||1),0);
            rows.push({item:{name:'전리품 '+count.toLocaleString()+'개',rarity:'normal'}});
        }
        settlement.bounded=true;
        const point=projection.cellToScreen(settlement.cell.gx,settlement.cell.gy);
        point.y+=projection.actorGroundOffsetY;
        while(settlement.index<rows.length && settlement.index*50<=age) {
            const index=settlement.index++;
            spawn([rows[index]],point,index,rows.length);
        }
    }

    function prepare(source, now, projection) {
        if (!visible(source)) { endSettlement(); return false; }
        if (zone !== game.currentZoneId || epoch !== battleVisualState.lootEpoch) {
            clear(); zone = game.currentZoneId; epoch = battleVisualState.lootEpoch; seen = new WeakSet();
        }
        if (!canvas && !settlement && !battleFx.some(fx => fx.loot)) return false;
        if (!canvas) mount(source);
        resize(); consume(now, projection);consumeSettlement(projection);
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

    window.addEventListener('project-idle:exploration-loot-claimed',settle);
    document.addEventListener('click',event=>{
        if(event.target.closest('#btn-exploration-loot-skip'))endSettlement(true);
    });
    return Object.freeze({ actorContext });
})();
