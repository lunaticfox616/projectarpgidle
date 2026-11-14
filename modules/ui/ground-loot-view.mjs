import { GroundLootPresentation } from './ground-loot-presentation.mjs';
import { place, projectEntries, yieldCrowdedArms, originFor } from './ground-loot-layout.mjs';
import { fly, landingPop } from './ground-loot-motion.mjs';
import { listenView, releaseViewEvents } from './view-events.mjs';

/** Owns loot DOM, animations and subscriptions; never grants or mutates loot. */
class GroundLootView {
    constructor(deps) {
        this.deps = deps;
        this.active = true;
        this.listeners = [];
        this.presentation = new GroundLootPresentation(deps);
        this.ground = undefined;
        this.air = undefined;
        this.foreground = undefined;
        this.canvas = undefined;
        this.geometry = '';
        this.zone = undefined;
        this.epoch = undefined;
        this.seen = new WeakSet();
        this.entries = new Map();
        this.motes = new Set();
        this.dropQueue = [];
        this.dropQueueEnd = 0;
        this.floorPiles = new Map();
        this.landedFloorIds = new Set();
        this.talismanKeys = new WeakMap();
        this.nextTalismanKey = 0;
        this.flyers = new Map();
        this.reported = new Set();
        this.reveals = new Map();
        this.stateIdentity = undefined;
        this.runIdentity = undefined;
        for (const name of ["reduced","narrow","displayLimit","later","remove","clear","mount","canvasBox","resize","room","spawn","launch","land","absorb","absorbMote","receive","pendingDrops","consume","revealUnique","floorRowKey","pickFloor","drawPile","floorMarker","launchFlyer","syncFlyers","addFloorPile","syncFloor","visible","prepare","hasPresentation","prepared","actorContext","onIncident","onAtlasFind","onFloorCollected"]) this[name] = this[name].bind(this);
    }

    start() {
        listenView(this, this.deps.eventTarget, 'project-idle:incident', this.onIncident);
        listenView(this, this.deps.eventTarget, 'project-idle:atlas-find', this.onAtlasFind);
        listenView(this, this.deps.eventTarget, 'project-idle:floor-loot-collected', this.onFloorCollected);
        listenView(this, this.deps.document, 'visibilitychange', () => {
            if (this.deps.document.hidden) this.clear();
        });
    }

    dispose() {
        if (!this.active) return;
        releaseViewEvents(this);
        this.unmount();
        this.landedFloorIds.clear();
        this.talismanKeys = new WeakMap();
        this.seen = new WeakSet();
        this.reported.clear();
        this.stateIdentity = this.runIdentity = undefined;
    }

    unmount() {
        this.clear();
        for (const node of [this.ground, this.air, this.foreground]) node?.remove();
        this.ground = this.air = this.foreground = this.canvas = undefined;
        this.geometry = '';
    }

    refreshContext(run) {
        const state = this.deps.stateIdentity(), zone = this.deps.viewRegion();
        const epoch = this.deps.battleVisualState.lootEpoch;
        if (this.stateIdentity === state && this.runIdentity === run && this.zone === zone && this.epoch === epoch) return;
        const replaced = this.stateIdentity !== state || this.runIdentity !== run;
        this.clear();
        this.stateIdentity = state; this.runIdentity = run; this.zone = zone; this.epoch = epoch;
        this.seen = new WeakSet();
        // A visual backlog/tab reset must not replay the landings of rows still on this run's floor.
        if (replaced) {
            this.talismanKeys = new WeakMap();
            this.nextTalismanKey = 0;
            this.landedFloorIds.clear();
            this.dropQueueEnd = 0;
        }
    }

    reduced() { return this.deps.uiDisplay.reducedEffects(); }

    narrow() { return this.canvasBox(this.canvas).width < 600; }

    displayLimit() { return this.narrow() ? 16 : 24; }

    later(entry, action, delay) {
        const state = this.deps.stateIdentity(), run = this.deps.viewRun();
        const timer = this.deps.setTimeout(() => {
            entry.timers.delete(timer);
            if (this.active && this.deps.stateIdentity() === state && this.deps.viewRun() === run) action();
        }, delay);
        entry.timers.add(timer);
    }

    remove(entry) {
        entry.timers.forEach(this.deps.clearTimeout);
        entry.timers.clear();
        entry.marker.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
        entry.marker.remove();
        this.entries.delete(entry.marker);
    }

    clear() {
        this.entries.forEach(this.remove);
        this.floorPiles.clear();
        this.flyers.clear();
        this.dropQueue.length = 0;
        this.motes.forEach(mote => { mote.getAnimations().forEach(animation => animation.cancel()); mote.remove(); });
        this.motes.clear();
        this.reveals.forEach((timer, label) => { this.deps.clearTimeout(timer); label.remove(); });
        this.reveals.clear();
        if (this.foreground) { this.foreground.width = 1; this.foreground.height = 1; this.foreground.hidden = true; }
    }

    mount(source) {
        this.canvas = source;
        this.ground = this.deps.document.createElement('div'); this.ground.className = 'battle-loot-layer';
        this.air = this.deps.document.createElement('div'); this.air.className = 'battle-loot-air';
        this.foreground = this.deps.document.createElement('canvas'); this.foreground.className = 'battle-loot-foreground';
        [this.ground, this.foreground, this.air].forEach(node => this.canvas.parentElement.append(node));
        [this.foreground, this.air].forEach(node => node.setAttribute('aria-hidden', 'true'));
    }

    canvasBox(source) {
        if (source.id === 'battlefield-canvas' && typeof this.deps.battleCanvasBox === 'object') return this.deps.battleCanvasBox.read(source);
        const hidden = source.offsetParent === null;
        return { width: hidden ? 0 : source.clientWidth, height: hidden ? 0 : source.clientHeight, left: source.offsetLeft, top: source.offsetTop };
    }

    resize() {
        const box = this.canvasBox(this.canvas), next = [box.left, box.top, box.width, box.height].join(':');
        if (this.geometry === next) return;
        this.geometry = next;
        this.entries.forEach(entry => { delete entry.marker.dataset.labelRow; });
        const rect = { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' };
        [this.ground, this.foreground, this.air].forEach(node => Object.assign(node.style, rect));
        this.ground.style.setProperty('--loot-width', box.width + 'px');
    }

    room(important) {
        if (this.entries.size < this.displayLimit()) return true;
        const oldest = [...this.entries.values()].find(entry => !entry.floor && entry.marker.dataset.beam !== 'true');
        if (!oldest && !important) return false;
        this.remove(oldest || this.entries.values().next().value);
        return true;
    }

    spawn(receipts, cell, projection) {
        const important = receipts.some(this.presentation.isMajor);
        if (!this.room(important)) return;
        const marker = this.deps.document.createElement('div'); marker.className = 'battle-loot-drop';
        marker.setAttribute('aria-hidden', 'true');
        const point = originFor(cell, projection);
        marker.dataset.gx = String(cell.gx); marker.dataset.gy = String(cell.gy);
        marker.style.setProperty('--rest-angle', (receipts[0].item?.slot === '무기' ? 54 : -16) + 'deg');
        const flight = this.presentation.appearance(marker, receipts, this.narrow()); this.presentation.beam(marker, receipts[0], this.canvasBox(this.canvas).height); this.ground.append(marker); place(marker, point, this.canvasBox(this.canvas), this.entries); yieldCrowdedArms(marker, this.entries);
        const entry = { marker, cell: { gx: cell.gx, gy: cell.gy }, timers: new Set() }; this.entries.set(marker, entry);
        this.launch(entry, flight, point);
        this.later(entry, () => this.absorb(entry), important ? 3300 : 2400);
    }

    launch(entry, flight, point, tier = entry.marker.dataset.tier) {
        this.later(entry, () => this.land(entry, tier), fly(flight, entry.marker, point, { reduced: this.reduced(), drop: this.deps.GROUND_LOOT_DROP, getComputedStyle: this.deps.getComputedStyle }));
    }

    land(entry, tier) {
        entry.marker.classList.add('landed');
        const contact = this.deps.document.createElement('span'); contact.className = 'battle-loot-contact'; entry.marker.append(contact);
        if (tier !== 'plain' && typeof this.deps.playLootDropSound === 'function') this.deps.playLootDropSound(tier === 'major' || tier === 'jackpot');
        if (!this.reduced()) landingPop(entry.marker.querySelector('.battle-loot-item'), tier);
        this.later(entry, () => contact.remove(), 550);
    }

    absorb(entry) {
        const marker = entry.marker;
        const from = { x: parseFloat(marker.style.left), y: parseFloat(marker.style.top) };
        const to = { x: this.deps.battleVisualState.playerPos.x, y: this.deps.battleVisualState.playerPos.y - 24 };
        marker.classList.add('collected');
        if (!this.reduced()) {
            for (let trail = 0; trail < 3; trail++) this.absorbMote(from, to, marker.style.getPropertyValue('--loot-color'), trail);
        }
        this.later(entry, () => this.remove(entry), 200);
    }

    absorbMote(from, to, color, trail) {
        if (this.motes.size >= 48) return;
        const mote = this.deps.document.createElement('span'); mote.className = 'battle-loot-mote';
        mote.style.setProperty('--loot-color', color); mote.style.left = from.x + 'px'; mote.style.top = from.y + 'px';
        this.air.append(mote); this.motes.add(mote);
        const dx = to.x - from.x, dy = to.y - from.y;
        const frames = [0, .125, .25, .375, .5, .625, .75, .875, 1].map(t => ({ offset: t,
            transform: `translate(${dx * t}px,${dy * t - Math.sin(t * Math.PI) * 24}px) rotate(${Math.atan2(dy - Math.cos(t * Math.PI) * 24 * Math.PI, dx) * 180 / Math.PI}deg) scale(${(1 - .7 * t) * (1 - trail * .18)})`,
            opacity: (1 - .35 * t) * (1 - trail * .28) }));
        const animation = mote.animate(frames, { duration: 540, delay: trail * 32, fill: 'both', easing: 'cubic-bezier(.42,0,.76,.5)' });
        const state = this.deps.stateIdentity(), run = this.deps.viewRun();
        animation.onfinish = () => {
            const shown = this.motes.delete(mote);
            mote.remove();
            if (shown && this.active && trail === 0 && this.deps.stateIdentity() === state && this.deps.viewRun() === run) this.receive(to, color);
        };
    }

    receive(to, color) {
        if (this.motes.size >= 48 || this.reduced()) return;
        const flash = this.deps.document.createElement('span'); flash.className = 'battle-loot-receive';
        flash.style.left = to.x + 'px'; flash.style.top = to.y + 'px'; flash.style.setProperty('--loot-color', color);
        this.air.append(flash); this.motes.add(flash);
        flash.addEventListener('animationend', () => { flash.remove(); this.motes.delete(flash); }, { once: true });
    }

    pendingDrops(now) {
        return this.deps.battleFx.filter(fx => {
            if (!fx.loot || this.seen.has(fx) || fx.start > now) return false;
            this.seen.add(fx);
            return now - fx.start <= 500 && fx.loot.zoneId === this.deps.viewRegion();
        });
    }

    consume(now, projection) {
        const pending = this.pendingDrops(now).sort((a, b) => this.presentation.importance(b.loot) - this.presentation.importance(a.loot));
        for (const fx of pending) {
            if (!this.deps.hasGridCell(fx.loot.sourceCell) || (fx.loot.currency && !(fx.loot.count > 0))) continue;
            const turn = Math.max(now, Math.min(this.dropQueueEnd, now + this.deps.GROUND_LOOT_DROP.queueCapMs));
            this.dropQueueEnd = turn + this.deps.GROUND_LOOT_DROP.gapMs;
            this.dropQueue.push({ receipt: fx.loot, turn });
        }
        while (this.dropQueue.length && this.dropQueue[0].turn <= now) {
            const { receipt } = this.dropQueue.shift();
            this.spawn([receipt], receipt.sourceCell, projection);
        }
    }

    revealUnique(item, fresh) {
        const jackpot = this.deps.lootMoments.ofItem(item) === 'jackpot';
        if (typeof this.deps.playLootDropSound === 'function') this.deps.playLootDropSound(true);
        if (jackpot) this.presentation.notice('chase', this.deps._t('체이싱 고유 장비를 획득했습니다. 「{name}」', { name: item.name }), 'chase', 6000);
        if (fresh) this.presentation.notice('codex', this.deps._t('도감에 고유 장비를 등록했습니다. 「{name}」', { name: item.name }), 'unique', 4500);
        if (!this.air || !this.deps.battleVisualState.playerPos) return;
        const label = this.deps.document.createElement('span');
        label.className = `battle-loot-reveal${jackpot ? ' is-jackpot' : ''}${fresh ? ' is-new' : ''}`;
        label.textContent = `「${item.name}」`;
        if (fresh) label.prepend(Object.assign(this.deps.document.createElement('b'), { textContent: '새 고유' }));
        label.style.left = this.deps.battleVisualState.playerPos.x + 'px';
        label.style.top = (this.deps.battleVisualState.playerPos.y - 40) + 'px';
        this.air.append(label);
        const timer = this.deps.setTimeout(() => { this.reveals.delete(label); label.remove(); }, 2400);
        this.reveals.set(label, timer);
    }

    floorRowKey(row) {
        if (['talisman', 'stump', 'leaf', 'yarn', 'gem', 'rune'].includes(row.kind)) {
            if (!this.talismanKeys.has(row)) this.talismanKeys.set(row, `talisman#${++this.nextTalismanKey}`);
            return this.talismanKeys.get(row);
        }
        return row.item ? `item#${row.item.id}` : `${row.currency}@${row.gx},${row.gy}`;
    }

    pickFloor(event, entry) {
        event.preventDefault(); event.stopPropagation();
        if (!this.active || !entry.floor || !entry.marker.isConnected) return;
        if (entry.run !== this.deps.viewRun() || entry.state !== this.deps.stateIdentity()) return;
        this.deps.actExplorationProgress.collectPile(entry.cell);
    }

    drawPile(entry, receipts) {
        const marker = entry.marker, lead = this.floorRowKey(receipts[0].row);
        if (entry.lead === lead) {
            marker.querySelectorAll(':scope > .battle-loot-labels').forEach(arm => arm.remove());
            marker.append(...this.presentation.labelArms(receipts, this.narrow()));
            return;
        }
        entry.lead = lead;
        marker.replaceChildren();
        marker.style.setProperty('--rest-angle', this.presentation.restAngle(receipts[0]));
        this.presentation.appearance(marker, receipts, this.narrow()); this.presentation.beam(marker, receipts[0], this.canvasBox(this.canvas).height);
    }

    floorMarker(entry, pile, projection, fresh) {
        const marker = entry.marker, receipts = this.presentation.floorReceipts(pile, fresh);
        delete marker.dataset.labelRow; // Changed contents need their new width, even on the same floor cell.
        this.drawPile(entry, receipts);
        const names = receipts.map(receipt => (receipt.currency ? `${this.deps.getCurrencyInfo(receipt.currency).name} ×${receipt.count}` : this.presentation.leadName(receipt)));
        marker.setAttribute('aria-label', `줍기: ${names.slice(0, 3).join(', ')}${names.length > 3 ? this.deps._t(' 외 {value}개', { value: names.length - 3 }) : ''}`);
        place(marker, originFor(entry.cell, projection), this.canvasBox(this.canvas), this.entries); yieldCrowdedArms(marker, this.entries);
        // The permanent marker shows the best item in the pile, but only newly landed rows choose the landing sound/pop.
        if (fresh.length) {
            const lead = this.presentation.floorReceipts({ rows: fresh }, fresh)[0];
            this.land(entry, this.presentation.pileTier(lead, lead.item?.rarity || 'normal'));
        }
        else marker.classList.add('landed');
    }

    launchFlyer(key, row, projection) {
        const marker = this.deps.document.createElement('div'); marker.className = 'battle-loot-drop';
        marker.setAttribute('aria-hidden', 'true');
        const receipt = this.presentation.floorReceipts({ rows: [row] }, [row])[0];
        marker.style.setProperty('--rest-angle', this.presentation.restAngle(receipt));
        const flight = this.presentation.appearance(marker, [receipt], this.narrow());
        marker.querySelectorAll('.battle-loot-labels').forEach(arm => arm.remove());
        marker.dataset.labelRow = '0'; // no names to measure (needsPlacement)
        this.ground.append(marker);
        const point = originFor(row, projection);
        place(marker, point, this.canvasBox(this.canvas), this.entries);
        const entry = { marker, cell: { gx: row.gx, gy: row.gy }, timers: new Set(), floor: true };
        this.entries.set(marker, entry); this.flyers.set(key, entry);
        fly(flight, marker, point, { reduced: this.reduced(), drop: this.deps.GROUND_LOOT_DROP, getComputedStyle: this.deps.getComputedStyle });
    }

    syncFlyers(run, now, projection) {
        const airborne = new Map((run ? this.deps.floorLoot.inAir(run, now) : []).map(row => [this.floorRowKey(row), row]));
        airborne.forEach((row, key) => { if (!this.flyers.has(key)) this.launchFlyer(key, row, projection); });
        this.flyers.forEach((entry, key) => { if (!airborne.has(key)) { this.flyers.delete(key); this.remove(entry); } });
    }

    addFloorPile(key, pile) {
        const marker = this.deps.document.createElement('div'); marker.className = 'battle-loot-drop is-floor';
        marker.setAttribute('role', 'button'); marker.tabIndex = 0;
        marker.dataset.gx = String(pile.gx); marker.dataset.gy = String(pile.gy);
        const entry = { marker, cell: { gx: pile.gx, gy: pile.gy }, timers: new Set(), floor: true, ids: '',
            run: this.deps.viewRun(), state: this.deps.stateIdentity() };
        marker.addEventListener('click', event => this.pickFloor(event, entry));
        marker.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') this.pickFloor(event, entry); });
        this.ground.append(marker); this.entries.set(marker, entry); this.floorPiles.set(key, entry);
        return entry;
    }

    syncFloor(projection) {
        const run = this.deps.viewRun(), now = this.deps.getCombatTime();
        this.syncFlyers(run, now, projection);
        const piles = run ? this.deps.floorLoot.piles(run, now) : [];
        const live = new Set(), liveRows = new Set();
        for (const pile of piles) {
            pile.rows.forEach(row => liveRows.add(this.floorRowKey(row)));
            const key = `${pile.gx},${pile.gy}`, ids = pile.rows.map(row => `${this.floorRowKey(row)}:${row.count || 1}`).join(',');
            live.add(key);
            const existing = this.floorPiles.get(key), entry = existing || this.addFloorPile(key, pile);
            if (entry.ids === ids) continue;
            const fresh = pile.rows.filter(row => !this.landedFloorIds.has(this.floorRowKey(row)));
            this.floorMarker(entry, pile, projection, fresh);
            // Remembered only once the marker is built: a failed build is tried again instead of leaving an empty marker.
            entry.ids = ids;
            pile.rows.forEach(row => this.landedFloorIds.add(this.floorRowKey(row)));
        }
        for (const id of this.landedFloorIds) if (!liveRows.has(id)) this.landedFloorIds.delete(id);
        for (const [key, entry] of this.floorPiles) {
            if (live.has(key)) continue;
            this.floorPiles.delete(key); entry.floor = false; entry.marker.removeAttribute('role'); entry.marker.tabIndex = -1;
            this.absorb(entry);
        }
    }

    visible(source) {
        const box = this.canvasBox(source);
        return box.width > 0 && box.height > 0 && !this.deps.document.hidden && !this.deps.viewBackground();
    }

    hasIncomingDrops(run) {
        return this.deps.battleFx.some(fx => fx.loot) || !!(run && run.groundLoot && run.groundLoot.length);
    }

    prepare(source, now, projection) {
        if (!this.active) return false;
        if (!this.visible(source)) { this.clear(); return false; }
        const run = this.deps.viewRun();
        this.refreshContext(run);
        if (this.canvas && this.canvas !== source) this.unmount();
        if (!this.canvas && !this.hasIncomingDrops(run)) return false;
        if (!this.canvas) this.mount(source);
        this.resize(); projectEntries(this.entries, projection, this.canvasBox(this.canvas)); this.consume(now, projection); this.syncFloor(projection);
        return this.hasPresentation();
    }

    hasPresentation() {
        if (this.entries.size || this.motes.size) return true;
        if (!this.foreground.hidden) { this.foreground.hidden = true; this.foreground.width = 1; this.foreground.height = 1; }
        return false;
    }

    prepared(source, now, projection) {
        try {
            return this.prepare(source, now, projection);
        } catch (error) {
            const message = String(error && error.message);
            if (!this.reported.has(message)) { this.reported.add(message); this.deps.console.error('ground loot layer failed:', error); }
            this.clear();
            return false;
        }
    }

    actorContext(source, ctx, now, projection) {
        if (!this.prepared(source, now, projection)) return ctx;
        this.foreground.hidden = false;
        if (this.foreground.width !== this.canvas.width || this.foreground.height !== this.canvas.height) {
            this.foreground.width = this.canvas.width; this.foreground.height = this.canvas.height;
        }
        const next = this.foreground.getContext('2d');
        next.resetTransform(); next.clearRect(0, 0, this.foreground.width, this.foreground.height);
        next.setTransform(ctx.getTransform()); next.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
        next.imageSmoothingQuality = ctx.imageSmoothingQuality;
        return next;
    }

    onIncident({ detail }) { return this.presentation.notice(detail.chase ? 'chase' : 'treasure', detail.text, detail.tone, detail.chase ? 6000 : 3200); }

    onAtlasFind({ detail }) {
        if (detail.kind !== 'treasure') return;
        if (detail.golden) this.presentation.notice('chase', '황금 보물을 발견했습니다.', 'chase', 6000);
        else this.presentation.notice('treasure', '보물을 발견했습니다.', 'reward', 3600);
        if (this.deps.viewSettings().showLootLog) this.deps.addLog(this.deps._t('💰 {name}: 보물 {count}개', { name: this.deps._t(detail.name), count: detail.count }), detail.golden ? 'loot-unique' : 'loot-rare');
    }

    onFloorCollected({ detail }) {
        const fresh = new Set(detail.fresh || []);
        detail.items.filter(item => item.rarity === 'unique').forEach(item => this.revealUnique(item, fresh.has(item.id)));
        if (!this.deps.viewSettings().showLootLog) return;
        // The same lines a drop picked up at once writes (js/combat-kill-rewards.js rollLootForEnemy).
        detail.currencies.forEach(({ key, count }) => this.deps.addLog(`🪙 ${this.deps.styledCurrency(key)} +${count}`,
            this.deps.lootMoments.rank(this.deps.lootMoments.ofCurrency(key)) >= 1 ? 'loot-unique' : 'loot-magic'));
        detail.items.forEach(item => this.deps.addLog(this.deps._t("🛡️ <span class='loot-{rarity}'>[{name}]</span> 획득!{item}", { rarity: item.rarity, name: this.deps._t(item.name), item: this.presentation.fineNote(item) }), '', { item }));
    }
}

export function createGroundLootView(deps) {
    const owner = new GroundLootView(deps);
    owner.start();
    return Object.freeze({ actorContext: owner.actorContext, dispose: () => owner.dispose() });
}
