import { paintChorusCasterRing } from './chorus-burst.mjs';

const ROOTLET = { x: 105, y: -70, color: '#f6b46c' };
const CHORUS = { x: -15, y: -58, color: '#f1bcff', load: 10, release: -15 };
const ELEMENT = { fire: '#ffc284', cold: '#d8eefe', light: '#fff0aa', chaos: '#edbeff', phys: '#f6d0a3' };
// The casting chorus bulb wears a bright lilac rim from its wind-up through the release (stage-roster look outline).
const CHORUS_RIM = /* @__PURE__ */ Object.freeze({ color: '#e9adff', ink: '#2a1236' });
// After its seed lands the bulb keeps the rim and sign this long, fading, so the hit still points back to its caster.
const CHORUS_AFTER_MS = 300;
const chorusLandings = new WeakMap();
// A chaos sign over the casting bulb, in dots: # ink, V violet, W white-lilac.
const CHORUS_SIGN = /* @__PURE__ */ Object.freeze(['   #   ', '  #V#  ', ' #VWV# ', '#VW#WV#', ' #VWV# ', '  #V#  ', '   #   ']);
const CHORUS_SIGN_SMALL = /* @__PURE__ */ Object.freeze(['  #  ', ' #V# ', '#VWV#', ' #V# ', '  #  ']);
const SIGN_TONES = /* @__PURE__ */ Object.freeze({ '#': '#26102f', V: '#c070ff', W: '#fbe8ff' });
const ROOTLET_DRIVE_MS = 175;
const RING_STRENGTH = /* @__PURE__ */ Object.freeze({ wind: share => 0.55 + 0.45 * share, release: () => 1, spent: () => 0.9, after: share => 1 - share });
const ROOTLET_SETTLE_MS = 225;

function windup(style, share) {
    return { style, phase: 'wind', dx: -style.load * share, dy: 4 * share, share, frame:undefined };
}

function burst(style, share, frame, element) {
    const fade = 1 - share;
    return { style, phase: 'release', dx: style.release * fade, dy: -3 * fade, share, frame, element };
}

function rootletActing(deps, enemy) {
    const now = deps.getCombatTime();
    const release = deps.bossMoves.live(now).find(row => row.source === enemy && row.move.kind === 'rings' && !row.move.cutAt);
    if (release) return rootletReleased(release,now);
    const area = enemy.patternArea;
    return area?.shape === 'diamond' && area.radius >= 2 && deps.bossAttackView.timing.isLiveWarning(enemy)
        ? rootletWindup(deps.bossAttackView.timing.warningShare(enemy) || 0) : null;
}

function rootletWindup(share) {
    const brace = Math.min(1, share * 1.4);
    return { style: ROOTLET, phase: 'wind', dx: -20 * brace, dy: 14 * brace, share, frame: share < .28 ? 0 : share < .5 ? 1 : 2 };
}

function rootletReleased(release,now) {
    const { move } = release;
    const sinceContact = now - move.releasedAt - move.stages[0].ms;
    const aftershock = move.stages[1];
    if (aftershock && release.element === 'phys' && sinceContact >= ROOTLET_SETTLE_MS) {
        return rootletAftershock(now - move.releasedAt - aftershock.ms);
    }
    if (sinceContact < -ROOTLET_DRIVE_MS) return rootletWindup(1);
    if (sinceContact < 0) return rootletDrive(sinceContact, release.element);
    if (sinceContact >= ROOTLET_SETTLE_MS) return null;
    const planted = 1 - Math.max(0, sinceContact - 50) / (ROOTLET_SETTLE_MS - 50);
    return {style:ROOTLET, phase:'recover', dx:38 * planted, dy:16 * planted, frame:sinceContact < 95 ? 4 : 5};
}

function rootletAftershock(age) {
    if (age < -240 || age >= 180) return null;
    if (age < -85) {
        const load = Math.min(1, (age + 240) / 120);
        return {style:ROOTLET, phase:'wind', dx:-13 * load, dy:-13 * load, share:load, frame:2};
    }
    if (age < 28) {
        const drive = Math.min(1, (age + 85) / 85);
        return {style:ROOTLET, phase:'recover', dx:-13 + 46 * drive, dy:-13 + 32 * drive, frame:3};
    }
    const settle = 1 - (age - 28) / 152;
    return {style:ROOTLET, phase:'recover', dx:33 * settle, dy:19 * settle, frame:age < 92 ? 4 : 5};
}

function rootletDrive(sinceContact, element) {
    const share = 1 + sinceContact / ROOTLET_DRIVE_MS;
    const push = share * share * (3 - 2 * share);
    return {style:ROOTLET, phase:'release', dx:-20 + 58 * push, dy:14 + 2 * push, share, element, frame:3};
}

function chorusActing(deps, enemy) {
    if (!(enemy.hp > 0) || enemy.noAttack) return null;
    const now = deps.getCombatTime();
    const cast = enemy.attackCast;
    if (cast) {
        const share = (now - cast.startAt) / Math.max(1, cast.finishAt - cast.startAt);
        return { ...windup(CHORUS, Math.max(0, Math.min(1, share))), element: enemy.ele, frame:share<.48?1:2 };
    }
    const pending = deps.pendingAttacks().find(attack => attack.source === enemy && attack.groundCell);
    if (!pending) return chorusAfter(enemy, now);
    chorusLandings.set(enemy, pending.at);
    const age = now - pending.castStartAt;
    if (age >= 0 && age < 190) return burst(CHORUS, age / 190, 3, pending.groundElement);
    const share = Math.max(0, (pending.at - now) / Math.max(1, pending.at - pending.castStartAt));
    return { style: CHORUS, phase:'spent', dx:0, dy:0, share, element:pending.groundElement, frame:share>.4?3:4 };
}

function chorusAfter(enemy, now) {
    const since = now - (chorusLandings.get(enemy) ?? -Infinity);
    if (since < 0 || since >= CHORUS_AFTER_MS) return null;
    return { style: CHORUS, phase: 'after', dx: 0, dy: 0, share: since / CHORUS_AFTER_MS, frame: undefined };
}

export function chorusBloomOrigin(position, dot) {
    return {x:Math.round(position.x + CHORUS.x * dot),y:Math.round(position.y + CHORUS.y * dot)};
}

/** The screen-dot rim a casting actor wears over its usual one (js/rendering/stage-roster.mjs castHalo), or null. */
export function castRimOf(acting) {
    if (acting?.style !== CHORUS) return null;
    return { ...CHORUS_RIM, alpha: acting.phase === 'after' ? 1 - acting.share : 1 };
}

/** The floor circle under a casting chorus bulb, drawn just before its body (feet at `feet`). */
export function drawCastGround(ctx, acting, feet, projection) {
    if (acting?.style !== CHORUS || !projection) return;
    paintChorusCasterRing(ctx, { x: feet.x, y: feet.y, tileW: projection.tileW, tileH: projection.tileH }, RING_STRENGTH[acting.phase](acting.share || 0));
}

/** These two authored attacks get local acting. Other roster actors use their existing pose unchanged. */
export function stageActorCastActing(deps, enemy, actor) {
    if (actor.id === 'bossAct1') return rootletActing(deps, enemy);
    if (actor.id === 'act9-chorus-bulbs') return chorusActing(deps, enemy);
    return null;
}

/** A few pixels at the actual mouth or bud, inside the actor's facing transform. */
export function drawActorCastAccent(ctx, acting, position, dot, reduced) {
    if (acting.phase === 'recover') return;
    const scale = Math.max(1, Math.round(dot));
    const {style, share, phase} = acting;
    const x = Math.round(position.x + style.x * dot), y = Math.round(position.y + style.y * dot);
    if (style === CHORUS) return drawChorusSign(ctx, acting, { x, y, tile: position.projection?.tileH }, reduced);
    const span = reduced ? 3 : phase === 'wind' ? 3 + Math.round(share * 2) : 5 + Math.round(share * 3);
    ctx.save();
    ctx.globalAlpha *= reduced ? .8 : phase === 'wind' ? .75 + share * .2 : .95 - share * .55;
    const light = ELEMENT[acting.element] || style.color;
    drawMouthSpark(ctx,{x,y,scale,span,light});
    ctx.restore();
}

function signRows(rows, x, top, p, ctx) {
    for (const [symbol, colour] of Object.entries(SIGN_TONES)) {
        ctx.fillStyle = colour;
        rows.forEach((row, dy) => {
            for (let dx = 0; dx < row.length; dx++) if (row[dx] === symbol) ctx.fillRect(x + dx * p, top + dy * p, p, p);
        });
    }
}

/** A chaos sign over the bulb while it winds up (grows at the halfway mark) and as it lets go; dots sized to the tile, not the art. */
function drawChorusSign(ctx, acting, { x, y, tile }, reduced) {
    const p = Math.max(3, Math.round((tile || 26) / 7)), { phase, share } = acting;
    const rows = reduced || phase !== 'wind' || share >= 0.2 ? CHORUS_SIGN : CHORUS_SIGN_SMALL;
    const lift = phase === 'release' ? 2 * p : 0;
    const left = Math.round(x / p) * p - Math.floor(rows[0].length / 2) * p;
    const top = Math.round(y / p) * p - (rows.length + 5) * p - lift;
    ctx.save();
    ctx.globalAlpha *= phase === 'after' ? 1 - share : 1;
    signRows(rows, left, top, p, ctx);
    ctx.restore();
}

function drawMouthSpark(ctx,{x,y,scale,span,light}) {
    ctx.fillStyle = '#292123';
    ctx.fillRect(x - scale,y - 2 * scale,(span + 2) * scale,4 * scale);
    ctx.fillRect(x + scale,y - 5 * scale,4 * scale,3 * scale);
    ctx.fillStyle=light;
    ctx.fillRect(x,y - scale,span * scale,2 * scale);
    ctx.fillRect(x + 2 * scale,y - 4 * scale,2 * scale,scale);
}

