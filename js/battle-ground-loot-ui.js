// Presentation receipts only. Inventory/currency grants never depend on these nodes or timers.
// Called once by renderBattlefield between the floor and actor passes; no additional frame loop.
const battleGroundLoot = (() => {
    let ground, air, foreground, canvas, geometry = '', zone, epoch;
    let seen = new WeakSet();
    const entries = new Map();
    const motes = new Set();
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    const displayLimit = () => canvas.clientWidth < 600 ? 16 : 24;
    const isMajor = receipt => receipt.currency === 'goldenRule' || receipt.item?.rarity === 'unique' || !!receipt.highlight;

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
        const half = marker.querySelector('.battle-loot-name').offsetWidth / 2 + 8;
        const x = Math.max(half, Math.min(canvas.clientWidth - half, Number(marker.dataset.x) * canvas.clientWidth));
        const y = Math.max(62, Math.min(canvas.clientHeight - 25, Number(marker.dataset.y) * canvas.clientHeight));
        marker.style.left = x + 'px'; marker.style.top = y + 'px';
    }

    function currencyLabel(label, marker, receipt) {
        label.innerHTML = window.getStyledOrbName(receipt.currency) + (receipt.count > 1 ? ' ×' + receipt.count : '');
        marker.dataset.currency = receipt.currency;
        const tone = label.querySelector('.orb-tone');
        if (tone) marker.style.setProperty('--loot-color', tone.style.getPropertyValue('--orb-tone'));
    }

    function appearance(marker, receipt) {
        const item = receipt.item, currency = receipt.currency && ORB_DB[receipt.currency];
        const label = document.createElement('span'); label.className = 'battle-loot-name';
        marker.dataset.rarity = item?.rarity || 'normal';
        marker.dataset.kind = currency ? 'currency' : 'equipment';
        marker.style.setProperty('--loot-color', receipt.color || getRarityColor(marker.dataset.rarity));
        if (currency) currencyLabel(label, marker, receipt);
        else label.textContent = item.name;
        const art = document.createElement('img'); art.className = 'battle-loot-item'; art.alt = '';
        art.src = currency ? currency.icon : getInventoryItemVisualAsset(item, receipt.itemKind);
        if (item?.slot === '무기') art.classList.add('weapon');
        const flight = document.createElement('div'); flight.className = 'battle-loot-flight'; flight.append(art);
        marker.append(flight, label);
        return flight;
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

    function spawn(fx, point, index, count) {
        const receipt = fx.loot;
        const important = isMajor(receipt);
        if (!room(important)) return;
        const marker = document.createElement('div'); marker.className = 'battle-loot-drop';
        const radius = (count === 1 ? 36 : Math.min(120, canvas.clientWidth * .28, canvas.clientHeight * .24)) * (.9 + .08 * Math.sin(index * 2.4));
        const angle = count === 1 ? Math.PI / 4 : -Math.PI / 2 + index * Math.PI * 2 / count + Math.sin(index * 1.8) * .07;
        marker.dataset.x = (point.x + Math.cos(angle) * radius) / canvas.clientWidth;
        marker.dataset.y = (point.y + Math.sin(angle) * radius) / canvas.clientHeight;
        marker.dataset.sourceX = point.x / canvas.clientWidth; marker.dataset.sourceY = point.y / canvas.clientHeight;
        marker.style.setProperty('--rest-angle', (receipt.item?.slot === '무기' ? 54 + index * 7 : -16 + index * 9) + 'deg');
        const flight = appearance(marker, receipt); beam(marker, receipt); ground.append(marker); place(marker);
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
        if (!reduced()) entry.marker.querySelector('img').animate([
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

    function consume(now, projection) {
        const batches = new Map();
        const pending = pendingDrops(now).sort((a, b) => Number(isMajor(b.loot)) - Number(isMajor(a.loot)));
        for (const fx of pending.slice(0, displayLimit())) {
            if (fx.loot.currency && !(ORB_DB[fx.loot.currency]?.icon && fx.loot.count > 0)) continue;
            if (!batches.has(fx.enemyId)) batches.set(fx.enemyId, []);
            batches.get(fx.enemyId).push(fx);
        }
        for (const [enemyId, drops] of batches) {
            const point = originFor(enemyId, drops[0].loot.sourceCell, projection);
            if (!point) continue;
            drops.forEach((fx, index) => spawn(fx, point, index, drops.length));
        }
    }

    function visible(source) {
        return source.offsetParent !== null && source.clientWidth > 0 && source.clientHeight > 0
            && !document.hidden && !game.isBackgroundCalculation;
    }

    function prepare(source, now, projection) {
        if (!visible(source)) { clear(); return false; }
        if (zone !== game.currentZoneId || epoch !== battleVisualState.lootEpoch) {
            clear(); zone = game.currentZoneId; epoch = battleVisualState.lootEpoch; seen = new WeakSet();
        }
        if (!canvas && !battleFx.some(fx => fx.loot)) return false;
        if (!canvas) mount(source);
        resize(); consume(now, projection);
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

    return Object.freeze({ actorContext });
})();
