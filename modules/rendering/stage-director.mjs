// 무대 감독(2026-11-19 카메라 연출): 화면이 인물에게 다가갔다 물러나는 "장면(shot)"의 하나뿐인 주인이다. 장면은 벽시계로 시작한 평범한
// 자료다: 카메라 열쇠(배율 1 이상과 매 장면 다시 읽는 초점: 적, 주인공, 칸, 고정된 점)와 시간 배율 열쇠. 감독은 장면마다 카메라
// { zoom, x, y }(옮기고 키우기, 관측자 장면의 카메라처럼 평소 화면 밖이 보이지 않게 묶는다)와 그림 시계의 배율(0..1)을 답한다.
// 그리기만 바꾼다: 싸움, 보상, 이동의 시간은 그대로 간다. 효과 줄이기나 시험 패널의 연출 보강 끔에서는 아무것도 하지 않는다.
// 장면(값은 결정된 값이다, 벽시계 ms): A 보스를 처음 볼 때와 다시 볼 때, B 보스 마무리(전체판과 가벼운 판), C 액트 도착,
// D 주인공이 멈춰 선 이야기 줄, E 체이싱 등급 드랍 착지. 겹치면 B > A > E > D > C가 이기고, 넘겨받을 때는 부드럽게 옮겨 간다.
import { ImpactFrame } from './impact-frame.mjs';

const EASE = Object.freeze({
    linear: t => t,
    out: t => 1 - Math.pow(1 - t, 3),
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    smooth: t => t * t * (3 - 2 * t)
});
const clamp01 = t => Math.max(0, Math.min(1, t));
const IDENTITY = Object.freeze({ zoom: 1, x: 0, y: 0 });
const isIdentity = cam => cam.zoom === 1 && cam.x === 0 && cam.y === 0;
const key = (at, value, ease = 'linear') => ({ at, value, ease });

/** 장면의 값. 배율은 화면 폭 600 이상 기준이고, 그보다 좁으면 늘어난 몫의 60%만 쓴다. */
const SHOTS = Object.freeze({
    focus: Object.freeze({ x: 0.51, y: 0.45 }),
    narrow: Object.freeze({ below: 600, share: 0.6 }),
    rank: Object.freeze({ finisher: 5, sighting: 4, drop: 3, story: 2, arrival: 1 }),
    handoverMs: 300,
    sighting: Object.freeze({ firstHoldMs: 2600, pushMs: 350, push: 1.35, creep: 1.45, punchMs: 90, punch: 1.6, drift: 1.5, backMs: 500, impactMs: 70,
        repeatPunch: 1.12, repeatBackMs: 230 }),
    finisher: Object.freeze({ stopMs: 220, impactMs: 80, slow: 0.25, slowUntil: 820, rampUntil: 1000, pushMs: 300, push: 1.5, backMs: 500,
        minFightMs: 6000, light: 1.2, lightInMs: 200, lightBackMs: 500 }),
    arrival: Object.freeze({ zoom: 1.35, backMs: 3000 }),
    story: Object.freeze({ speaker: 1.22, plain: 1.12, panMs: 450, releaseMs: 500, liveMs: 300 }),
    drop: Object.freeze({ slow: 0.35, slowMs: 450, zoom: 1.18, inMs: 200, backMs: 400 }),
    staleMs: 400
});

/** Value of a keyframe list at t (ms since the shot began): each key eases from the one before it. */
function keyValue(keys, t) {
    if (t <= keys[0].at) return keys[0].value;
    for (let index = 1; index < keys.length; index++) {
        const from = keys[index - 1], to = keys[index];
        if (t > to.at) continue;
        const span = to.at - from.at;
        return span > 0 ? from.value + (to.value - from.value) * EASE[to.ease](clamp01((t - from.at) / span)) : to.value;
    }
    return keys[keys.length - 1].value;
}

class StageDirector {
    /** deps: uiDisplay, effects() (battleFx), visual() (battleVisualState), now() (wall ms), heroHeadY(now), bodyHeight(enemy, tile),
     * unitCentre(enemy) (its grid cell), document. */
    constructor(deps) {
        this.deps = deps;
        this.shots = [];
        this.seen = new WeakSet();
        this.story = null;
        this.output = IDENTITY;
        this.top = null;
        this.blend = null;
        this.zone = undefined;
        this.domShown = false;
        this.impact = new ImpactFrame(() => deps.document.createElement('canvas'));
    }

    shown() { return this.deps.uiDisplay.richPresentation() && !this.deps.uiDisplay.reducedEffects(); }

    forcedFull() { return this.deps.uiDisplay.fullCutscenes(); }

    /** Drops every shot at once (no eased return): zone change, player defeat, the observer scene. */
    reset() {
        this.shots = [];
        this.story = null;
        this.output = IDENTITY;
        this.top = null;
        this.blend = null;
    }

    /** Before the drawing clock moves: the forced ends. o = { zoneId, defeated, observer }. */
    frame(o) {
        if (this.zone !== undefined && o.zoneId !== this.zone) this.reset();
        this.zone = o.zoneId;
        if (o.defeated || o.observer) this.reset();
    }

    live(wallNow) {
        this.shots = this.shots.filter(shot => wallNow < shot.end);
        return this.shots;
    }

    /** The highest-ranked shot playing at wallNow (the held story line counts while it is refreshed). */
    leading(wallNow) {
        let best = this.storyShot(wallNow);
        for (const shot of this.live(wallNow)) if (!best || shot.rank > best.rank) best = shot;
        return best;
    }

    storyShot(wallNow) {
        const story = this.story;
        return story && wallNow - story.at < SHOTS.story.liveMs ? story : null;
    }

    add(shot) {
        if (!this.shown()) return;
        this.shots = this.shots.filter(other => other.kind !== shot.kind);
        this.shots.push(shot);
    }

    /** After the drawing clock moved (visual ms now): boss entrances and boss deaths that have just begun start their shots. */
    watch(visualNow, wallNow) {
        for (const fx of this.deps.effects()) {
            const kind = this.shotKind(fx, visualNow);
            if (!kind) continue;
            this.seen.add(fx);
            const late = visualNow - fx.start;
            if (late > SHOTS.staleMs) continue;
            this.add(kind === 'sighting' ? this.sighting(fx, wallNow - late) : this.finisher(fx, wallNow - late));
        }
    }

    /** 'sighting' for a boss entrance, 'finisher' for a boss death, once each and only once it has begun; else null. */
    shotKind(fx, visualNow) {
        if (!fx || this.seen.has(fx) || visualNow < fx.start) return null;
        if (fx.type === 'bossEntrance') return 'sighting';
        return fx.type === 'enemyDeath' && fx.boss ? 'finisher' : null;
    }

    sighting(fx, start) {
        const rule = SHOTS.sighting, hold = fx.holdMs || rule.firstHoldMs, burst = hold * 0.5;
        const boss = (fx.enemies || []).find(enemy => enemy && enemy.isBoss) || (fx.enemies || [])[0] || null;
        const shot = { kind: 'sighting', rank: SHOTS.rank.sighting, start, focus: { enemy: boss, enemyId: boss && boss.id }, time: null, impact: null };
        if (fx.red || hold === rule.firstHoldMs || this.forcedFull()) {
            shot.zoom = [key(0, 1), key(rule.pushMs, rule.push, 'out'), key(burst, rule.creep), key(burst + rule.punchMs, rule.punch),
                key(hold - rule.backMs, rule.drift), key(hold, 1, 'inOut')];
            shot.impact = [burst, burst + rule.impactMs];
            shot.end = start + hold;
        } else {
            const back = burst + rule.punchMs + rule.repeatBackMs;
            shot.zoom = [key(0, 1), key(burst, 1), key(burst + rule.punchMs, rule.repeatPunch), key(back, 1, 'out')];
            shot.end = start + back;
        }
        return shot;
    }

    finisher(fx, start) {
        const rule = SHOTS.finisher, ghost = this.deps.visual().enemyGhostPos[fx.enemyId];
        const shot = { kind: 'finisher', rank: SHOTS.rank.finisher, start, focus: { enemy: ghost && ghost.enemy, enemyId: fx.enemyId }, time: null, impact: null };
        if (fx.finisher || this.forcedFull()) {
            const pushed = rule.stopMs + rule.pushMs, back = rule.rampUntil + rule.backMs;
            shot.zoom = [key(0, 1), key(rule.stopMs, 1), key(pushed, rule.push, 'out'), key(rule.rampUntil, rule.push), key(back, 1, 'inOut')];
            shot.time = [key(0, 1), key(rule.stopMs, 1), key(rule.stopMs, rule.slow), key(rule.slowUntil, rule.slow), key(rule.rampUntil, 1)];
            shot.impact = [0, rule.impactMs];
            shot.end = start + back;
        } else {
            const back = rule.lightInMs + rule.lightBackMs;
            shot.zoom = [key(0, 1), key(rule.lightInMs, rule.light, 'out'), key(back, 1, 'inOut')];
            shot.end = start + back;
        }
        return shot;
    }

    /** C: the act title card has just appeared. */
    arrival() {
        const rule = SHOTS.arrival, start = this.deps.now();
        this.add({ kind: 'arrival', rank: SHOTS.rank.arrival, start, end: start + rule.backMs, focus: { hero: true },
            zoom: [key(0, rule.zoom), key(rule.backMs, 1, 'smooth')], time: null, impact: null });
    }

    /** E: a chase-tier drop has just landed on cell (skipped while a boss shot plays). */
    drop(cell) {
        const wallNow = this.deps.now(), rule = SHOTS.drop;
        if (this.live(wallNow).some(shot => shot.kind === 'sighting' || shot.kind === 'finisher')) return;
        const back = rule.inMs + rule.backMs;
        this.add({ kind: 'drop', rank: SHOTS.rank.drop, start: wallNow, end: wallNow + Math.max(back, rule.slowMs), focus: { cell },
            zoom: [key(0, 1), key(rule.inMs, rule.zoom, 'out'), key(back, 1, 'inOut')],
            time: [key(0, rule.slow), key(rule.slowMs, rule.slow), key(rule.slowMs, 1)], impact: null });
    }

    /** D, every frame from the story: target = { who, focus } while the hero stands for a spoken line, else null. */
    speak(target) {
        if (!target || !this.shown()) { this.story = null; return; }
        const wallNow = this.deps.now(), zoom = target.who === 'plain' ? SHOTS.story.plain : SHOTS.story.speaker;
        const same = this.story && this.story.speaker === target.speaker;
        this.story = { kind: 'story', rank: SHOTS.rank.story, start: same ? this.story.start : wallNow, at: wallNow, speaker: target.speaker,
            focus: target.focus, zoom: [key(0, zoom)], time: null, impact: null };
    }

    /** 0..1: how fast the drawing clock runs now (hit stop is applied before this). */
    timeScale(wallNow) {
        if (!this.shown()) return 1;
        const shot = this.leading(wallNow);
        return shot && shot.time ? clamp01(keyValue(shot.time, wallNow - shot.start)) : 1;
    }

    /** True while a timed shot (A, B, C or E) plays: the act reward window waits for it. */
    running(wallNow = this.deps.now()) { return this.shown() && this.live(wallNow).length > 0; }

    /** Zoom of a shot at wallNow, with the narrow-screen share. */
    zoomOf(shot, wallNow, width) {
        const zoom = Math.max(1, keyValue(shot.zoom, wallNow - shot.start));
        return width < SHOTS.narrow.below ? 1 + (zoom - 1) * SHOTS.narrow.share : zoom;
    }

    /** The world point a focus means this frame (positions of the frame before), or null. */
    anchor(focus, view) {
        const tile = view.gridProj ? view.gridProj.tileW : 64;
        if (focus.cell) return this.cellPoint(focus.cell, view);
        if (focus.point) return { x: focus.point.x, y: focus.point.y + tile * 0.5 };
        if (focus.hero) return this.heroCentre(this.deps.visual());
        const feet = this.enemyFeet(focus, view);
        if (!feet) return focus.fallback ? this.anchor(focus.fallback, view) : null;
        const height = (focus.enemy && this.deps.bodyHeight(focus.enemy, tile)) || tile * 1.5;
        return { x: feet.x, y: feet.y - height * 0.5 };
    }

    /** Where an enemy stands: its drawn place, the place it fell, or (a boss still waiting through its entrance) its cell. */
    enemyFeet(focus, view) {
        const visual = this.deps.visual(), placed = (visual.enemySmoothPos || {})[focus.enemyId] || (visual.enemyGhostPos || {})[focus.enemyId];
        if (placed) return placed;
        const cell = focus.enemy ? this.deps.unitCentre(focus.enemy) : null;
        return cell ? this.cellPoint(cell, view) : null;
    }

    cellPoint(cell, view) {
        if (!view.gridProj) return null;
        const point = view.gridProj.cellToScreen(cell.gx, cell.gy);
        return { x: point.x, y: point.y + (Number(view.gridProj.actorGroundOffsetY) || 0) };
    }

    heroCentre(visual) {
        const feet = visual.playerPos;
        if (!feet) return null;
        const head = this.deps.heroHeadY(visual.visualNow);
        return { x: feet.x, y: head === null || head === undefined ? feet.y - 48 : (feet.y + head) / 2 };
    }

    /** Translate and scale that put focus near the frame's upper middle, held so nothing outside the normal frame shows. */
    framing(zoom, focus, view) {
        if (!(zoom > 1) || !focus) return IDENTITY;
        const x = Math.max(view.width * (1 - zoom), Math.min(0, view.width * SHOTS.focus.x - focus.x * zoom));
        const y = Math.max(view.height * (1 - zoom), Math.min(0, view.height * SHOTS.focus.y - focus.y * zoom));
        return { zoom, x, y };
    }

    desired(shot, view, wallNow) {
        if (!shot) return IDENTITY;
        const focus = this.anchor(shot.focus, view) || shot.lastFocus || null;
        if (focus) shot.lastFocus = focus;
        return this.framing(this.zoomOf(shot, wallNow, view.width), focus, view);
    }

    /** A change of leading shot (or of speaker) eases over from where the camera stands now. */
    handover(shot, wallNow) {
        const id = shot ? `${shot.kind}:${shot.speaker || ''}:${shot.start}` : null;
        if (id === this.top) return;
        const story = !!shot && shot.kind === 'story', ms = this.handoverMs(shot, story);
        this.top = id;
        this.blend = isIdentity(this.output) && !story ? null : { from: this.output, start: wallNow, ms };
    }

    /** 450 ms onto a speaker, 500 ms back from the story when nothing follows, else 300 ms. */
    handoverMs(shot, story) {
        if (story) return SHOTS.story.panMs;
        return !shot && this.top && this.top.startsWith('story:') ? SHOTS.story.releaseMs : SHOTS.handoverMs;
    }

    blended(target, wallNow) {
        const blend = this.blend;
        if (!blend) return target;
        const p = (wallNow - blend.start) / blend.ms;
        if (p >= 1) { this.blend = null; return target; }
        const k = EASE.inOut(clamp01(p)), from = blend.from;
        return { zoom: from.zoom + (target.zoom - from.zoom) * k, x: from.x + (target.x - from.x) * k, y: from.y + (target.y - from.y) * k };
    }

    /** Applies this frame's camera to ctx (after the shake, where the observer camera goes) and returns it. The observer scene keeps
     * its own camera: the director yields entirely. */
    apply(ctx, view) {
        const wallNow = this.deps.now();
        if (!this.shown() || view.observerScene) { this.reset(); this.impact.begin(null); return IDENTITY; }
        const shot = this.leading(wallNow);
        this.handover(shot, wallNow);
        const camera = this.blended(this.desired(shot, view, wallNow), wallNow);
        this.output = camera.zoom > 1.0005 ? camera : IDENTITY;
        this.impact.begin(this.impactKeys(shot, wallNow));
        if (!isIdentity(this.output)) { ctx.translate(this.output.x, this.output.y); ctx.scale(this.output.zoom, this.output.zoom); }
        return this.output;
    }

    impactKeys(shot, wallNow) {
        if (!shot || !shot.impact) return null;
        const t = wallNow - shot.start;
        return t >= shot.impact[0] && t < shot.impact[1] ? new Set(['hero', shot.focus.enemyId]) : null;
    }

    /** World point to where it shows on screen now. */
    project(point) {
        const cam = this.output;
        return isIdentity(cam) || !point ? point : { ...point, x: cam.x + point.x * cam.zoom, y: cam.y + point.y * cam.zoom };
    }

    /** Screen point (canvas px) to the world point under it: stage clicks hit what they show. */
    unproject(point) {
        const cam = this.output;
        return isIdentity(cam) || !point ? point : { ...point, x: (point.x - cam.x) / cam.zoom, y: (point.y - cam.y) / cam.zoom };
    }

    /** A projection whose cells land where they show (screen-space overlays that place marks by cell). */
    projection(projection) {
        if (isIdentity(this.output) || !projection) return projection;
        return { ...projection, cellToScreen: (gx, gy) => this.project(projection.cellToScreen(gx, gy)) };
    }

    /** For story text drawn in screen space: enter(ctx) sets the frame's transform without the camera. null while no camera. */
    screen(enter) {
        return isIdentity(this.output) ? null : { enter, project: point => this.project(point) };
    }

    /** DOM layers placed from the projection (floor loot, flying loot, object buttons) follow the camera with one CSS transform. */
    syncDom() {
        const cam = this.output, on = !isIdentity(cam);
        if (!on && !this.domShown) return;
        const wrap = this.deps.document.getElementById('battlefield-wrap');
        if (!wrap) return;
        const transform = on ? `matrix(${cam.zoom},0,0,${cam.zoom},${cam.x},${cam.y})` : '';
        for (const node of wrap.querySelectorAll('.battle-loot-layer, .battle-loot-air, #exploration-object-actions')) {
            if (node.style.transform !== transform) { node.style.transform = transform; node.style.transformOrigin = on ? '0 0' : ''; }
        }
        this.domShown = on;
    }

    camera() { return this.output; }
}

export function createStageDirector(deps) {
    const director = new StageDirector(deps);
    return Object.freeze({
        frame: director.frame.bind(director), watch: director.watch.bind(director), apply: director.apply.bind(director),
        timeScale: director.timeScale.bind(director), running: director.running.bind(director), arrival: director.arrival.bind(director),
        drop: director.drop.bind(director), speak: director.speak.bind(director), project: director.project.bind(director),
        unproject: director.unproject.bind(director), projection: director.projection.bind(director), screen: director.screen.bind(director),
        syncDom: director.syncDom.bind(director), camera: director.camera.bind(director),
        silhouette: director.impact.capture.bind(director.impact), finishImpact: director.impact.finish.bind(director.impact),
        constants: SHOTS
    });
}
