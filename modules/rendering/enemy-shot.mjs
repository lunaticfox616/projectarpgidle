// Enemy shots that always hit (projectileTarget: a wisp's bolt, a ranged monster's or boss's ordinary shot) drawn as fast, heavy hits.
// Combat owns the timing: the shot is queued with its flight time and the damage lands on the first combat step at or after it, so the
// shot is drawn to land then. On screen the caster first gathers light at its muzzle (motes drawn in, a glint flaring just before
// release), then the shot crosses in the last 70 ms (100 ms for a boss) as a bright head with a smear and a streak of dots behind it,
// speeding into the hero's body. The impact belongs to the hero's playerHit: if the damage comes first (a hit stop holds the picture's
// clock) the flight finishes on that frame, and if it comes later the head sits lodged on the body until it does. The hit itself: for two frames light
// flares on the floor around the hero's feet and behind the body (under the actor, never laid over the sprite), a hit spark knocks a
// dot or two along the shot at the body's near edge with three short streaks splashing back, and sparks spray back out of the hit. Reduced effects keep the glow, the head and a
// small spark without motes or spray. Paint only.
import { emitter, fillDots, paintConverge, paintGlow, paintSparks } from './fx-particles.mjs';
import { COMBAT_STEP_MS } from '../common/combat-clock.mjs';
import { vfxElement } from './skill-effect-look.mjs';

/** Per element: hot core, mid body, deep edge and the glow colour, toward the scenes' own saturation. */
const TONES = /* @__PURE__ */ Object.freeze({
    phys: { hot: '#fff4e0', mid: '#f2c48a', deep: '#8a5a2c', glow: '#c08040' },
    fire: { hot: '#fff0c8', mid: '#ffa848', deep: '#a8401a', glow: '#d0581c' },
    cold: { hot: '#f4fcff', mid: '#a8e2f8', deep: '#2c6c9c', glow: '#3a8ec0' },
    light: { hot: '#fffbe8', mid: '#ffe27a', deep: '#a87e1c', glow: '#c89a2a' },
    chaos: { hot: '#f8e4ff', mid: '#d098f0', deep: '#5e3490', glow: '#8a4cc0' }
});
const FLY_MS = 70;
const BOSS_FLY_MS = 100;
const LODGE_MS = 130;
export const SHOT_IMPACT_MS = 200;
const GROUND_FLASH_MS = 120;
const snap = (value, p) => Math.round(value / p) * p;
const clamp01 = value => Math.max(0, Math.min(1, value));

/** @param {*} fx a battle effect */
export const isAlwaysHitShot = fx => !!fx && fx.type === 'combatTravel' && fx.owner === 'enemy' && fx.delivery === 'projectileTarget' && !fx.travelPath;

export function shotTones(element) {
    return TONES[vfxElement(element)] || TONES.phys;
}

/** The hero's playerHit this shot dealt: the first hit from its caster after it left and before it would have long landed. */
export function shotHit(effects, shot) {
    let found = null;
    for (const fx of effects) {
        if (!fx || fx.type !== 'playerHit' || fx.enemyId !== shot.sourceId || fx.start < shot.start + 20) continue;
        if (fx.start <= shot.start + shot.flightMs + 400 && (!found || fx.start < found.start)) found = fx;
    }
    return found;
}

/** The always-hit shot a playerHit landed: its caster's latest one that left before the hit and arrived around it. */
export function hitShot(effects, hit) {
    let found = null;
    for (const fx of effects) {
        if (!isAlwaysHitShot(fx) || fx.sourceId !== hit.enemyId || fx.start + 20 > hit.start) continue;
        if (fx.start + fx.flightMs + 400 >= hit.start && (!found || fx.start > found.start)) found = fx;
    }
    return found;
}

function withAlpha(hex, alpha) {
    const value = parseInt(hex.slice(1), 16);
    return `rgba(${value >> 16},${(value >> 8) & 255},${value & 255},${alpha})`;
}

/** A four-pointed glint of whole dots: hot middle, mid arms. */
function paintGlint(ctx, at, { arm, tones, p }) {
    const x = snap(at.x, p), y = snap(at.y, p), arms = [];
    for (let i = 1; i <= arm; i++) arms.push([x + i * p, y, 1], [x - i * p, y, 1], [x, y + i * p, 1], [x, y - i * p, 1]);
    fillDots(ctx, arms, tones.mid, p);
    fillDots(ctx, [[x, y, 1], [x + p, y, 1], [x - p, y, 1], [x, y - p, 1], [x, y + p, 1]], tones.hot, p);
}

/** At the muzzle while the caster winds up: light swells, motes are drawn in and a glint flares just before release. */
function paintWindup(ctx, tones, view, u) {
    const { from, p, scale } = view, reach = view.tileW * (0.1 + 0.16 * u) * scale;
    paintGlow(ctx, { x: from.x, y: from.y, rx: reach, ry: reach, colour: tones.glow, alpha: 0.25 + 0.55 * u });
    if (!view.reduced) {
        const motes = emitter(`shot:gather:${Math.round(view.tileW)}`, 6, random => ({ angle: random() * 6.283,
            dist: view.tileW * (0.3 + 0.2 * random()), period: 0.32 + 0.2 * random(), phase: random() }));
        paintConverge(ctx, motes, { x: from.x, y: from.y, time: view.now / 1000, p, strength: u, squash: 0.8, tones: [tones.hot, tones.mid] });
    }
    if (u > 0.7) paintGlint(ctx, from, { arm: Math.round((1 + 3 * (u - 0.7) / 0.3) * scale), tones, p });
}

/** The crossing: a smear of light and a streak of dots behind a bright head, speeding up into the body. */
function paintFlight(ctx, tones, view, f) {
    const { from, to, p, scale } = view, eased = f ** 1.3, dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy) || 1;
    const head = { x: from.x + dx * eased, y: from.y + dy * eased }, trail = Math.min(length * eased, view.tileW * 1.3 * scale);
    const tail = { x: head.x - dx / length * trail, y: head.y - dy / length * trail };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const smear = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
    smear.addColorStop(0, withAlpha(tones.glow, 0));
    smear.addColorStop(1, withAlpha(tones.glow, 0.85));
    ctx.strokeStyle = smear;
    ctx.lineWidth = p * 4 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y); ctx.stroke();
    ctx.restore();
    const steps = Math.max(1, Math.round(trail / p)), back = [], front = [];
    for (let i = 0; i <= steps; i++) {
        const u = i / steps, dot = [snap(tail.x + (head.x - tail.x) * u, p), snap(tail.y + (head.y - tail.y) * u, p), 1];
        (u < 0.45 ? back : front).push(dot);
    }
    fillDots(ctx, back, tones.mid, p);
    fillDots(ctx, front, tones.hot, p);
    paintHead(ctx, tones, view, head);
}

function paintHead(ctx, tones, view, head) {
    const { p, scale } = view, size = scale > 1 ? 3 : 2, x = snap(head.x, p) - p, y = snap(head.y, p) - p;
    paintGlow(ctx, { x: head.x, y: head.y, rx: view.tileW * 0.24 * scale, ry: view.tileW * 0.24 * scale, colour: tones.glow, alpha: 0.9 });
    fillDots(ctx, [[x - p, y - p, size + 2]], tones.deep, p);
    fillDots(ctx, [[x - p, y, 1], [x + size * p, y, 1], [x, y - p, 1], [x, y + size * p, 1]], tones.mid, p);
    fillDots(ctx, [[x, y, size]], tones.hot, p);
}

/**
 * One always-hit shot this frame, on the presentation clock.
 * @param {{now:number,launchAt:number,arriveAt:number,from:{x:number,y:number},to:{x:number,y:number},p:number,tileW:number,
 *   reduced:boolean,scale:number,hit:{start:number}|null}} view hit: the playerHit this shot dealt, once it exists
 */
export function paintEnemyShot(ctx, fx, view) {
    const due = view.launchAt + Math.ceil((view.arriveAt - view.launchAt) / COMBAT_STEP_MS) * COMBAT_STEP_MS;
    const tones = shotTones(fx.element), fly = Math.min(view.scale > 1 ? BOSS_FLY_MS : FLY_MS, (due - view.launchAt) * 0.6);
    const landAt = view.hit ? Math.min(due, view.hit.start) : due, releaseAt = landAt - fly;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (view.now < releaseAt) paintWindup(ctx, tones, view, clamp01((view.now - view.launchAt) / Math.max(1, releaseAt - view.launchAt)));
    else if (view.now < landAt) paintFlight(ctx, tones, view, clamp01((view.now - releaseAt) / fly));
    else if (!view.hit && view.now < due + LODGE_MS) {
        const fade = 1 - (view.now - due) / LODGE_MS;
        paintGlow(ctx, { x: view.to.x, y: view.to.y, rx: view.tileW * 0.2, ry: view.tileW * 0.2, colour: tones.glow, alpha: 0.8 * fade });
        fillDots(ctx, [[snap(view.to.x, view.p) - view.p, snap(view.to.y, view.p) - view.p, 2]], tones.hot, view.p);
    }
    ctx.restore();
}

/**
 * Over the actors: the hit spark at the body's near edge, knocked a dot or two along the shot, and sparks spraying back out of the hit.
 * @param {{at:{x:number,y:number},dir:{x:number,y:number},age:number,element:string,p:number,tileW:number,tileH:number,reduced:boolean,
 *   scale:number,key:string|number,deflected?:boolean}} hit at: the body's middle; dir: unit direction the shot flew
 */
export function paintShotImpact(ctx, hit) {
    if (hit.age < 0 || hit.age >= SHOT_IMPACT_MS) return;
    const tones = shotTones(hit.element), { p, dir } = hit, knock = Math.min(1, hit.age / 50) * p * 2;
    const at = { x: hit.at.x - dir.x * hit.tileW * 0.2 + dir.x * knock, y: hit.at.y - dir.y * hit.tileW * 0.12 + dir.y * knock };
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (hit.age < 50) {
        const fresh = 1 - hit.age / 50, reach = hit.tileW * (0.16 + 0.12 * fresh) * hit.scale;
        paintGlow(ctx, { x: at.x, y: at.y, rx: reach, ry: reach, colour: tones.glow, alpha: 0.95 * fresh });
        if (!hit.reduced) paintSplash(ctx, at, tones, hit, fresh);
        paintGlint(ctx, at, { arm: Math.round((hit.reduced ? 2 : 3 + 3 * fresh) * hit.scale * (hit.deflected ? 0.6 : 1)), tones, p });
    }
    if (!hit.reduced) paintSpray(ctx, at, tones, hit);
    ctx.restore();
}

/** The directional burst of the first frames: three short streaks splashing back out of the contact. */
function paintSplash(ctx, at, tones, hit, fresh) {
    const { p, dir } = hit, back = Math.atan2(-dir.y, -dir.x), reach = hit.tileW * (0.2 + 0.25 * (1 - fresh)) * hit.scale, hot = [], mid = [];
    for (const turn of [-0.6, 0, 0.6]) {
        const ux = Math.cos(back + turn), uy = Math.sin(back + turn) * 0.8, from = reach * 0.35 * (1 - fresh);
        for (let r = from; r <= reach; r += p) (r < reach * 0.6 ? hot : mid).push([snap(at.x + ux * r, p), snap(at.y + uy * r, p), 1]);
    }
    fillDots(ctx, mid, tones.mid, p);
    fillDots(ctx, hot, tones.hot, p);
}

function paintSpray(ctx, at, tones, hit) {
    const { dir, tileW } = hit, back = Math.atan2(-dir.y, -dir.x);
    const sparks = emitter(`shot:spray:${hit.key}:${Math.round(tileW)}`, 12, (random, index) => {
        const spread = index < 8 ? (random() - 0.5) * 2.2 : Math.PI + (random() < 0.5 ? -1 : 1) * (0.9 + 0.5 * random());
        const angle = back + spread, speed = tileW * (3 + 3.5 * random()) * hit.scale;
        return { dx: 0, dy: 0, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.8, delay: random() * 0.02, life: 0.12 + 0.08 * random() };
    });
    paintSparks(ctx, sparks, { x: at.x, y: at.y, t: hit.age / 1000, p: hit.p, drag: 6, gravity: hit.tileH * 8, tones: [tones.hot, tones.mid, tones.deep] });
}

/**
 * Under the actors: for two frames light flares on the floor around the hero's feet and behind the body, so it rims the silhouette.
 * @param {{feet:{x:number,y:number},chest:{x:number,y:number},age:number,element:string,tileW:number,tileH:number,reduced:boolean}} hit
 */
export function paintShotGround(ctx, hit) {
    if (hit.age < 0 || hit.age >= GROUND_FLASH_MS) return;
    const tones = shotTones(hit.element), fade = (1 - hit.age / GROUND_FLASH_MS) ** 2 * (hit.reduced ? 0.6 : 1);
    paintGlow(ctx, { x: hit.feet.x, y: hit.feet.y, rx: hit.tileW * 0.62, ry: hit.tileH * 0.6, colour: tones.mid, alpha: 0.35 * fade, mode: 'source-over' });
    paintGlow(ctx, { x: hit.feet.x, y: hit.feet.y, rx: hit.tileW * 0.5, ry: hit.tileH * 0.5, colour: tones.glow, alpha: 0.9 * fade });
    paintGlow(ctx, { x: hit.chest.x, y: hit.chest.y, rx: hit.tileW * 0.5, ry: hit.tileH * 1.1, colour: tones.glow, alpha: 0.7 * fade });
}
