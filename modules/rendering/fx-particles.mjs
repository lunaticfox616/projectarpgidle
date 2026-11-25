// Layered attack effects drawn in code (the Rootlet's waves, the chorus seed): soft light sprites (cached radial gradients, drawn smooth
// and tinted, never a white sheet) and analytic particles. A particle is seeded per emitter and placed from its age in closed form, so a
// frame needs no simulation state and every capture of the same moment matches: debris arcs with a ground shadow and one bounce, streak
// sparks drawn along their velocity, rising embers that flicker, looping motes, motes drawn inward to a point, dust puffs that grow and
// fade, and shockwave rings. Cores and particles snap to whole dots; light layers stay smooth. Emitters are cached per key with a hard cap
// on their particle counts and on the cache itself. Paint only.

const glows = new Map();
const emitters = new Map();
const EMITTER_LIMIT = 400;
const PARTICLE_CAP = 24;

/** A small seeded random source (the same numbers every time for the same three integers). */
export function seededRandom(a, b, salt) {
    let state = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(salt + 1, 0x27d4eb2f);
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashText(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return hash >>> 0;
}

/**
 * The particles of one emitter, made once per key (at most PARTICLE_CAP).
 * @template T
 * @param {string} key
 * @param {number} count
 * @param {(random:()=>number, index:number)=>T} make
 * @returns {T[]}
 */
export function emitter(key, count, make) {
    if (emitters.has(key)) return emitters.get(key);
    if (emitters.size >= EMITTER_LIMIT) emitters.clear();
    const random = seededRandom(hashText(key), count, 3), list = [];
    for (let i = 0; i < Math.min(count, PARTICLE_CAP); i++) list.push(make(random, i));
    emitters.set(key, list);
    return list;
}

function rgba(hex, alpha) {
    const value = parseInt(hex.slice(1), 16);
    return `rgba(${value >> 16},${(value >> 8) & 255},${value & 255},${alpha})`;
}

/** A cached 64 px radial light in one colour: full at the middle, falling off smoothly to nothing at the rim. */
function glowSprite(ctx, colour) {
    if (glows.has(colour)) return glows.get(colour);
    const canvas = ctx.canvas.ownerDocument.createElement('canvas');
    canvas.width = canvas.height = 64;
    const paint = canvas.getContext('2d'), gradient = paint.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, rgba(colour, 1));
    gradient.addColorStop(0.3, rgba(colour, 0.62));
    gradient.addColorStop(0.65, rgba(colour, 0.2));
    gradient.addColorStop(1, rgba(colour, 0));
    paint.fillStyle = gradient;
    paint.fillRect(0, 0, 64, 64);
    glows.set(colour, canvas);
    return canvas;
}

/**
 * One soft light, smooth: 'lighter' adds it onto what is drawn (light on dark ground), 'source-over' lays it on as a tint (light on pale
 * stone, where added light would wash toward white). Leaves the context at source-over, alpha 1.
 * @param {{x:number,y:number,rx:number,ry:number,colour:string,alpha:number,mode?:GlobalCompositeOperation}} glow
 */
export function paintGlow(ctx, glow) {
    if (!(glow.alpha > 0.004) || glow.rx < 1) return;
    ctx.globalCompositeOperation = glow.mode || 'lighter';
    ctx.globalAlpha = Math.min(1, glow.alpha);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(glowSprite(ctx, glow.colour), glow.x - glow.rx, glow.y - glow.ry, glow.rx * 2, glow.ry * 2);
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
}

const snap = (value, p) => Math.round(value / p) * p;
/** Ground travel under drag k (1/s) after t seconds, per unit of starting speed. */
const dragged = (t, k) => (1 - Math.exp(-k * t)) / k;
export const easeOut = u => 1 - (1 - u) * (1 - u);

/** Height of a chunk thrown up at vz (px/s) under gravity g, with one bounce at `bounce` of its speed; 0 once it has settled. */
export function arcHeight(t, vz, g, bounce = 0.3) {
    const first = 2 * vz / g;
    if (t < first) return vz * t - g * t * t / 2;
    const speed = vz * bounce, rest = t - first, second = 2 * speed / g;
    return rest < second ? speed * rest - g * rest * rest / 2 : 0;
}

function fillDots(ctx, dots, colour, p) {
    if (!dots.length) return;
    ctx.fillStyle = colour;
    ctx.beginPath();
    for (const [x, y, size] of dots) ctx.rect(x, y, size * p, size * p);
    ctx.fill();
}

function debrisAt(chunk, look) {
    const t = look.t - chunk.delay;
    if (t < 0 || t >= look.life) return null;
    // Once a chunk has bounced and settled it fades within 150 ms, so the ground does not stay littered with dots.
    const settled = 2.6 * chunk.vz / look.g, rest = t > settled ? 1 - (t - settled) / 0.15 : 1;
    if (rest <= 0) return null;
    const d = dragged(t, look.drag), z = arcHeight(t, chunk.vz, look.g);
    const x = snap(look.x + chunk.dx + chunk.vx * d, look.p), y = snap(look.y + chunk.dy + chunk.vy * d, look.p);
    const fade = Math.min(rest, t > look.life * 0.7 ? 1 - (t - look.life * 0.7) / (look.life * 0.3) : 1);
    return { x, y, z: snap(z, look.p), size: chunk.size, tone: chunk.tone, fade };
}

/**
 * Debris chunks thrown out from `at`: each flies an arc above its shadow on the ground, bounces once, settles and fades.
 * @param {Array<{dx:number,dy:number,vx:number,vy:number,vz:number,size:number,tone:number,delay:number}>} chunks offsets in px, speeds
 * in px/s, delay in seconds, tone an index into look.tones
 * @param {{x:number,y:number,t:number,p:number,g:number,drag:number,life:number,tones:readonly string[],shadow:string,highlight?:string}} look t
 * in seconds
 */
export function paintDebris(ctx, chunks, look) {
    const placed = chunks.map(chunk => debrisAt(chunk, look)).filter(Boolean);
    if (!placed.length) return;
    ctx.globalAlpha = 0.45;
    fillDots(ctx, placed.filter(row => row.z > 0).map(row => [row.x, row.y + look.p, row.size]), look.shadow, look.p);
    for (const fading of [false, true]) {
        const rows = placed.filter(row => (row.fade < 0.6) === fading);
        ctx.globalAlpha = fading ? 0.5 : 1;
        look.tones.forEach((tone, index) => fillDots(ctx, rows.filter(row => row.tone === index).map(row => [row.x, row.y - row.z, row.size]), tone, look.p));
        // A lit top-left dot on the bigger chunks, so they read as lumps of soil.
        fillDots(ctx, rows.filter(row => row.size > 1).map(row => [row.x, row.y - row.z, 1]), look.highlight || look.tones[look.tones.length - 1], look.p);
    }
    ctx.globalAlpha = 1;
}

function sparkDots(spark, look) {
    const t = look.t - spark.delay;
    if (t < 0 || t >= spark.life) return null;
    const d = dragged(t, look.drag), slow = Math.exp(-look.drag * t);
    const x = look.x + spark.dx + spark.vx * d, y = look.y + spark.dy + spark.vy * d + look.gravity * t * t / 2;
    const vx = spark.vx * slow, vy = spark.vy * slow + look.gravity * t, speed = Math.hypot(vx, vy) || 1;
    const length = Math.max(look.p, Math.min(7 * look.p, speed * 0.045)), steps = Math.max(1, Math.round(length / look.p));
    const dots = [];
    for (let i = 0; i < steps; i++) dots.push([snap(x - vx / speed * i * look.p, look.p), snap(y - vy / speed * i * look.p, look.p), 1]);
    return { dots, age: t / spark.life };
}

/**
 * Streak sparks: each flies from `at` with drag (and a little gravity), drawn as a short line of dots along its velocity that shortens as
 * it slows, hot at first, then warm, then cool.
 * @param {Array<{dx:number,dy:number,vx:number,vy:number,delay:number,life:number}>} sparks
 * @param {{x:number,y:number,t:number,p:number,drag:number,gravity:number,tones:readonly string[]}} look tones [hot, warm, cool]
 */
export function paintSparks(ctx, sparks, look) {
    const lit = sparks.map(spark => sparkDots(spark, look)).filter(Boolean);
    look.tones.forEach((tone, index) => {
        const band = lit.filter(row => Math.min(look.tones.length - 1, Math.floor(row.age * look.tones.length)) === index);
        fillDots(ctx, band.flatMap(row => row.dots), tone, look.p);
    });
}

function emberAt(ember, look) {
    const t = look.t - ember.delay;
    if (t < 0 || t >= ember.life) return null;
    const u = t / ember.life, flicker = 0.55 + 0.45 * Math.sin(ember.freq * t * 6.283 + ember.phase);
    const x = snap(look.x + ember.dx + Math.sin(ember.freq * t * 2.1 + ember.phase) * ember.sway, look.p);
    const y = snap(look.y + ember.dy - ember.rise * t * (1 - u / 2), look.p);
    return { x, y, u, alpha: flicker * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85) };
}

/**
 * Embers rising from `at` after a hit: each drifts up and sways, slowing, flickering, hot to cool over its life, with a small soft
 * light around it while it is hot (look.glow).
 * @param {Array<{dx:number,dy:number,rise:number,sway:number,freq:number,phase:number,delay:number,life:number}>} embers
 * @param {{x:number,y:number,t:number,p:number,tones:readonly string[],glow?:string,glowMode?:GlobalCompositeOperation}} look t in
 * seconds; tones [hot, warm, cool]
 */
export function paintEmbers(ctx, embers, look) {
    const lit = embers.map(ember => emberAt(ember, look)).filter(Boolean);
    if (look.glow) for (const row of lit) if (row.u < 0.6) paintGlow(ctx, { x: row.x + look.p / 2, y: row.y + look.p / 2, rx: look.p * 3.5, ry: look.p * 3.5,
        colour: look.glow, alpha: Math.max(0, row.alpha) * 0.7, mode: look.glowMode });
    for (const row of lit) {
        ctx.globalAlpha = Math.max(0, Math.min(1, row.alpha));
        ctx.fillStyle = look.tones[Math.min(look.tones.length - 1, Math.floor(row.u * look.tones.length))];
        ctx.fillRect(row.x, row.y, look.p, look.p);
    }
    ctx.globalAlpha = 1;
}

/**
 * Motes rising in a loop over a warned spot (each on its own period and phase), fading in and out, flickering.
 * @param {Array<{dx:number,dy:number,rise:number,sway:number,period:number,phase:number,hot:boolean}>} motes
 * @param {{x:number,y:number,time:number,p:number,strength:number,tones:readonly string[],glow?:string,glowMode?:GlobalCompositeOperation}} look
 * time in seconds; tones [hot, mote]; glow: a small soft light around the hot motes
 */
export function paintMotes(ctx, motes, look) {
    if (!(look.strength > 0)) return;
    for (const mote of motes) {
        const u = ((look.time / mote.period + mote.phase) % 1 + 1) % 1, alpha = Math.sin(Math.PI * u) * look.strength;
        if (alpha < 0.05) continue;
        if (look.glow && mote.hot) paintGlow(ctx, { x: look.x + mote.dx, y: look.y + mote.dy - mote.rise * u, rx: look.p * 3, ry: look.p * 3,
            colour: look.glow, alpha: alpha * 0.8, mode: look.glowMode });
        ctx.globalAlpha = Math.min(1, alpha * (0.7 + 0.3 * Math.sin(look.time * 23 + mote.phase * 9)));
        ctx.fillStyle = mote.hot ? look.tones[0] : look.tones[1];
        const x = snap(look.x + mote.dx + Math.sin(u * 6.283 + mote.phase * 4) * mote.sway, look.p);
        ctx.fillRect(x, snap(look.y + mote.dy - mote.rise * u, look.p), look.p, look.p);
    }
    ctx.globalAlpha = 1;
}

/**
 * Motes drawn inward to a point in a loop, speeding up as they close in and trailing a short streak behind them.
 * @param {Array<{angle:number,dist:number,period:number,phase:number}>} motes dist in px; angle 0 = right
 * @param {{x:number,y:number,time:number,p:number,strength:number,squash:number,tones:readonly string[]}} look time in seconds; squash shortens
 * the vertical reach; tones [head, tail]
 */
export function paintConverge(ctx, motes, look) {
    if (!(look.strength > 0)) return;
    const head = [], tail = [];
    for (const mote of motes) {
        const u = ((look.time / mote.period + mote.phase) % 1 + 1) % 1, close = 1 - u * u, back = Math.min(1, close + 0.12 + 0.25 * u);
        const cos = Math.cos(mote.angle), sin = Math.sin(mote.angle) * look.squash;
        head.push([snap(look.x + cos * mote.dist * close, look.p), snap(look.y + sin * mote.dist * close, look.p), 1]);
        tail.push([snap(look.x + cos * mote.dist * back, look.p), snap(look.y + sin * mote.dist * back, look.p), 1]);
    }
    ctx.globalAlpha = Math.min(1, look.strength) * 0.6;
    fillDots(ctx, tail, look.tones[1], look.p);
    ctx.globalAlpha = Math.min(1, look.strength);
    fillDots(ctx, head, look.tones[0], look.p);
    ctx.globalAlpha = 1;
}

/**
 * Dust puffs that drift out, grow and fade (soft, laid on as a tint).
 * @param {Array<{dx:number,dy:number,vx:number,vy:number,r0:number,r1:number,delay:number,life:number}>} puffs
 * @param {{x:number,y:number,t:number,colour:string,alpha:number,squash:number}} look t in seconds
 */
export function paintDust(ctx, puffs, look) {
    for (const puff of puffs) {
        const t = look.t - puff.delay;
        if (t < 0 || t >= puff.life) continue;
        const u = t / puff.life, grow = easeOut(u), r = puff.r0 + (puff.r1 - puff.r0) * grow;
        paintGlow(ctx, { x: look.x + puff.dx + puff.vx * grow, y: look.y + puff.dy + puff.vy * grow - r * 0.3, rx: r, ry: r * look.squash,
            colour: look.colour, alpha: look.alpha * (1 - u) ** 1.4, mode: 'source-over' });
    }
}

/**
 * A shockwave ring: a soft band of light under a ring of whole dots (two dots thick while it is strong).
 * @param {{cx:number,cy:number,r:number,squash:number,alpha:number,thick:number,core:string,light:string,p:number,mode?:GlobalCompositeOperation}} ring
 */
export function paintRing(ctx, ring) {
    if (!(ring.alpha > 0.02) || ring.r < 1) return;
    ctx.globalCompositeOperation = ring.mode || 'lighter';
    ctx.globalAlpha = ring.alpha * 0.55;
    ctx.strokeStyle = ring.light;
    ctx.lineWidth = ring.thick * ring.p * 3;
    ctx.beginPath();
    ctx.ellipse(ring.cx, ring.cy, ring.r, ring.r * ring.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, ring.alpha);
    const dots = [], steps = Math.max(12, Math.round(ring.r * 6.3 / ring.p));
    for (let band = 0; band < ring.thick; band++) {
        const r = ring.r - band * ring.p;
        for (let i = 0; i < steps; i++) {
            const a = i / steps * Math.PI * 2;
            dots.push([snap(ring.cx + Math.cos(a) * r, ring.p), snap(ring.cy + Math.sin(a) * r * ring.squash, ring.p), 1]);
        }
    }
    fillDots(ctx, dots, ring.core, ring.p);
    ctx.globalAlpha = 1;
}
