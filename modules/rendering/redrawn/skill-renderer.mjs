import { redrawnSkillArt } from './art.mjs';
import { firstOf, eventsOf, whirlSpan } from './cast-geometry.mjs';
import { createBaseCastDrawers } from './base-cast-drawers.mjs';
import { createSupplementCastDrawers } from './supplement-cast-drawers.mjs';
const art = () => redrawnSkillArt;

const MOVE_EVENTS = ['windup', 'travel', 'stage', 'hit', 'transfer'];
const OWN_ART = Object.freeze({ '차원찢기': { id: 54 }, '향로구름': { id: 55 }, '작살화살': { id: 56 }, '바위 플라스크': { id: 77 } });
const IDS = new Set([3, 5, 10, 16, 17, 18, 21, 28, 29, 30, 37, 45, 46, 48, 50, 51, 54, 55, 56, 77]);
const REPLACED = { 3: ['windup', 'stage', 'hit'], 21: ['travel', 'hit'],
        45: ['travel', 'stage', 'hit'], 51: ['stage'], 16: ['windup', 'stage', 'hit'], 37: ['windup', 'stage', 'hit'],
        // 빙결 파열창 keeps its redrawn spear (fxRemake.projectile) and only its hits turn to frost mist; 과냉각 혼합물 keeps
        // its flask flight and hit sparks and only its heavy cloud ring (the wave stage) becomes thin frost rings.
        30: ['hit'], 48: ['stage'],
        // The movement gems have no original art at all: everything they show is redrawn.
        54: MOVE_EVENTS, 55: MOVE_EVENTS, 56: MOVE_EVENTS, 77: MOVE_EVENTS };
const CAST_LIMIT = 48;
const TAIL_MS = 1400;
const SPIN = ['east', 'south', 'west', 'north'];
const AROUND_BODY = new Set([5, 18]);
const WEAPON_PHASES = {
        50: e => e.holyMistPhase === 'censer', 51: e => e.judgmentPhase === 'censer',
        52: e => e.assassinationPhase === 'dagger' || e.assassinationPhase === 'slash'
    };

function replaces(id, e) {
    if (id === 50) return e.kind === 'stage' && e.holyMistPhase === 'mist';
    return (REPLACED[id] || ['stage', 'hit']).includes(e.kind);
}

function castKey(event, spec) {
    const group = event.groupId != null && event.groupId !== '' ? String(event.groupId).split(':')[0] : '';
    return `${spec.id}|${event.channelId || group || event.at}`;
}

function eventBrief(e) {
    const fp = e.footprint;
    return { kind: e.kind, at: Math.round(e.at), duration: e.duration, stageIndex: e.stageIndex, sourceCell: e.sourceCell, targetCells: e.targetCells,
        phase: Object.keys(e).find(k => k.endsWith('Phase')), footprint: fp && { center: fp.center, radius: fp.radius, cells: (fp.cells || []).length } };
}

/** One owner for transient casts/hits. Both clocks are supplied by the scene, never read from another renderer. */
class RedrawnSkillRenderer {
    constructor(deps) {
        this.deps = deps;
        this.casts = new Map();
        this.weaponWindows = [];
        this.hitEvents = new WeakMap();
        this.active = true;
        this.drawers = Object.freeze({ ...createBaseCastDrawers(deps), ...createSupplementCastDrawers(deps) });
    }

    specOf(name) { return this.deps.atlas[name] || OWN_ART[name] || null; }

    isActive(spec) { return this.active && !!spec && IDS.has(spec.id) && this.deps.remake.isEnabled(); }


    trim() {
        while (this.casts.size > CAST_LIMIT) this.casts.delete(this.casts.keys().next().value);
    }

    register(event, spec, clock) {
        const key = castKey(event, spec);
        let cast = this.casts.get(key);
        if (!cast) {
            cast = { key, id: spec.id, skillName: event.skillName, clock, events: [], end: 0 };
            this.casts.set(key, cast);
            this.trim();
        }
        if (cast.events.includes(event)) return;
        cast.events.push(event);
        cast.end = Math.max(cast.end, event.at + (event.duration || 0));
    }

    noteWeaponWindow(event, spec, clock) {
        const phase = spec && WEAPON_PHASES[spec.id];
        if (!phase || !phase(event) || this.weaponWindows.some(w => w.event === event)) return;
        this.weaponWindows.push({ event, clock, from: event.at, to: event.at + (event.duration || 0) });
        if (this.weaponWindows.length > 8) this.weaponWindows.shift();
    }

    /** True while a gem's own censer or dagger is on screen (see WEAPON_PHASES). */
    weaponHidden(visualNow, combatNow) {
        return this.active && this.weaponWindows.some(w => {
            const now = w.clock === 'combat' ? combatNow : visualNow;
            return now >= w.from && now < w.to;
        });
    }

    /** Called by the world-tree renderer before it draws an event. True = a redrawn gem owns it; skip the native sprite. */
    claim(event, spec, clock = 'visual') {
        if (!this.active) return false;
        this.noteWeaponWindow(event, spec, clock);
        if (!this.isActive(spec) || !replaces(spec.id, event)) return false;
        this.register(event, spec, clock);
        return true;
    }

    hitEvent(fx) {
        let event = this.hitEvents.get(fx);
        if (!event) {
            event = { kind: 'hit', skillName: fx.skillName, at: fx.start, duration: fx.duration || 320, targetCells: fx.targetCell ? [fx.targetCell] : [],
                sourceCell: fx.sourceCell, element: fx.element, stageIndex: fx.stageIndex || 0, repeatIndex: fx.repeatIndex,
                channelId: fx.channelId, groupId: fx.damageTextGroupId };
            this.hitEvents.set(fx, event);
        }
        return event;
    }

    collectHits() {
        for (const fx of this.deps.readHits()) {
            if (!fx || fx.type !== 'hit' || fx.dot || !fx.targetCell) continue;
            const spec = this.specOf(fx.skillName);
            if (this.isActive(spec)) this.register(this.hitEvent(fx), spec, 'visual');
        }
    }

    playerDot(view) {
        const p = view.projection, pos = this.deps.readPlayerPosition();
        if (!p || !pos) return null;
        const origin = p.cellToScreen(0, 0), s = p.tileW / 48, sy = p.tileH / 48;
        return { x: Math.round(((pos.x - origin.x) / s + 24) / 3), y: Math.round(((pos.y - (Number(p.actorGroundOffsetY) || 0) - origin.y) / sy + 24) / 3) };
    }

    castNow(cast, visualNow, combatNow) { return cast.clock === 'combat' ? combatNow : visualNow; }


    drawCasts(layer, times, view, pens) {
        for (const [key, cast] of this.casts) {
            const now = this.castNow(cast, times.visualNow, times.combatNow), draw = this.drawers[cast.id] && this.drawers[cast.id][layer];
            if (now > cast.end + TAIL_MS) { this.casts.delete(key); continue; }
            if (draw) draw(AROUND_BODY.has(cast.id) ? pens.front : pens.behind, cast, now, view);
        }
    }

    /** Draws every live cast's layer into the open remake pass. layer: 'ground' | 'fore'. */
    drawLayer(layer, visualNow, combatNow) {
        const projection = this.deps.remake.projection();
        if (!this.active || !this.deps.remake.isOpen() || !projection) return;
        if (layer === 'ground') this.collectHits();
        const view = { projection, playerDot: null, hand: null };
        view.playerDot = this.playerDot(view);
        this.deps.remake.drawDots(dot => {
            const pens = { front: dot, behind: dot };
            view.front = dot;
            this.drawCasts(layer, { visualNow, combatNow }, view, pens);
        });
    }

    latestCast(id, now) {
        let found = null;
        for (const cast of this.casts.values()) if (cast.id === id && cast.clock === 'visual' && (!found || cast.end > found.end) && now <= cast.end + TAIL_MS) found = cast;
        return found;
    }

    /** 흡혈 관통: crimson pulse strength (0..0.35) over the caster as the drained blood sinks in. */
    playerTint(now) {
        if (!this.active || !this.deps.remake.isEnabled()) return 0;
        const cast = this.latestCast(3, now), hit = cast && firstOf(cast, 'hit');
        return hit ? art().BloodDrain.tint(now - hit.at) : 0;
    }

    /** 회오리: the body turns with the blade wind (one facing per 90ms, clockwise) and holds its strike pose. */
    playerSpin(now) {
        const cast = this.active && this.deps.remake.isEnabled() ? this.latestCast(5, now) : null, hits = cast ? eventsOf(cast, 'hit') : [];
        if (!hits.length) return null;
        const span = whirlSpan(hits);
        if (now < span.t0 || now >= span.t1) return null;
        return { facing: SPIN[Math.floor((now - span.t0) / 90) % 4], holdUntil: span.t1 };
    }

    reset() { this.casts.clear(); this.weaponWindows.length = 0; }


    /** Test panel / diagnostics: the casts being drawn right now (with each event's timing and cells). */
    snapshot() {
        return [...this.casts.values()].map(c => ({ key: c.key, id: c.id, clock: c.clock, end: Math.round(c.end), kinds: c.events.map(e => e.kind), events: c.events.map(eventBrief) }));
    }

    dispose() {
        this.reset();
        this.hitEvents = new WeakMap();
        this.active = false;
    }
}

export function createRedrawnSkillRenderer(deps) {
    const owner = new RedrawnSkillRenderer(deps);
    return Object.freeze({
        claim: owner.claim.bind(owner),
        drawLayer: owner.drawLayer.bind(owner),
        playerTint: owner.playerTint.bind(owner),
        playerSpin: owner.playerSpin.bind(owner),
        weaponHidden: owner.weaponHidden.bind(owner),
        reset: owner.reset.bind(owner),
        snapshot: owner.snapshot.bind(owner),
        specOf: owner.specOf.bind(owner),
        dispose: owner.dispose.bind(owner),
        ids: IDS, replaces
    });
}
