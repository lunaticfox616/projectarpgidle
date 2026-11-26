import { vfxElement } from './skill-effect-look.mjs';
import { drawEnemyWarningMark } from './enemy-warning-mark.mjs';
import { drawGroundDangerSign, drawGroundDangerDye } from './enemy-ground-danger.mjs';
import { drawSkillSpriteFrame } from './skill-sprite-geometry.mjs';
import { realmLiquid, REALM_LIQUID_ASSET, paintRealmFlight, paintRealmContact } from './enemy-realm-liquids.mjs';
import { paintDangerLife, paintDangerTiles, paintFootGlow, paintTileStrike } from './danger-tiles.mjs';
import { chorusDot, paintChorusBurst, paintChorusFloor, paintChorusPath } from './chorus-burst.mjs';
import { paintGlow } from './fx-particles.mjs';

const CHAOS_FALLBACK = { asset: 'skillFxSignatureVoidSlash', color: '#e2a7ff', height: 2.15,
    ground: 0.54, angle: -0.31, frames: [5, 6, 8, 10, 12, 14] };
const CHORUS_FRONT = 0.18;
// The aimed cell's warning runs through the caster's wind-up (first part) and the seed's flight (the rest).
const CHORUS_WINDUP_SHARE = 0.35;
const outlinedSeeds = new Map();
const ARC = 5.4;
/** One landing's particle seed: its start and aimed cell. */
const chorusKey = fx => [Math.round(fx.start), fx.enemyFlight?.targetCell?.gx, fx.enemyFlight?.targetCell?.gy].join(':');
const isChorusShot = attack => (attack.source?.spriteVariantId || attack.source?.monsterVisualId) === 'act9-chorus-bulbs';
const CONTACT = Object.freeze({
    phys:  { asset: 'skillFxSlamPrimary', color: '#f4b575', height: 1.35, ground: 0.52, angle: 0 },
    fire:  { asset: 'skillFxMeteorImpact', color: '#ffac54', height: 2.15, ground: 0.76, angle: 0 },
    cold:  { asset: 'skillFxBlizzardImpact', color: '#a9e9ff', height: 2.10, ground: 0.83, angle: 0, frames: [14, 14, 15, 15] },
    light: { asset: 'skillFxChainPrimary', color: '#b4dbff', height: 1.75, ground: 0.72, angle: 0 },
    chaos: { asset: 'skillFxEnemyChaosContact', color: '#e2a7ff', height: 2.28, ground: 0.91, angle: 0,
        frames: [1, 2, 2, 3, 4, 5], columns: 3, rows: 2, fallback: CHAOS_FALLBACK, airAsset: 'skillFxEnemyChaosSeed' }
});

function paintContactRim(ctx, footprint, look, progress, reduced) {
    const { x, y, width, height } = footprint;
    const expand = reduced ? 0.4 : 0.37 + progress * 0.11;
    const alpha = (1 - progress) * (reduced ? 0.57 : 0.92);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (const side of [0, Math.PI]) {
        const start = side - 0.76, end = side + 0.76;
        ctx.moveTo(x + Math.cos(start) * width * expand, y + Math.sin(start) * height * 0.3);
        ctx.ellipse(x, y, width * expand, height * 0.3, 0, start, end);
    }
    const edge = Math.max(1, Math.round(height * 0.065));
    ctx.strokeStyle = '#2f1b19';
    ctx.lineWidth = edge + 2;
    ctx.stroke();
    ctx.strokeStyle = look.color;
    ctx.lineWidth = edge;
    ctx.stroke();
}

function paintContact(ctx, image, footprint, look, progress) {
    const { x, y, width, height } = footprint;
    const scale = 1.04 + Math.min(1, progress * 3.5) * 0.18;
    const w = Math.round(width * scale), h = Math.round(height * look.height * scale * (1 - progress * 0.46));
    const baseY = Math.round(y + height * 0.13 + h * (0.5 - look.ground));
    ctx.globalAlpha = (1 - progress) ** 0.64;
    ctx.imageSmoothingEnabled = false;
    // Depth is visual only: air above the target can rise behind actors, with horizontal extent held to its single lane.
    ctx.beginPath();
    ctx.rect(x - width * 0.49, y - height * 2.3, width * 0.98, height * 2.8);
    ctx.clip();
    if (look.frames) {
        const frame = look.frames[Math.floor(progress * look.frames.length)];
        drawSkillSpriteFrame(ctx, image, frame, { x: Math.round(x), y: baseY, width: w, height: h,
            angle: look.angle, columns: look.columns, rows: look.rows });
    } else ctx.drawImage(image, Math.round(x - w / 2), baseY - Math.round(h / 2), w, h);
}

function flightBox(x, y, angle, local) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const cx = x + cos * local.offset, cy = y + sin * local.offset;
    const w = Math.abs(cos) * local.width + Math.abs(sin) * local.height;
    const h = Math.abs(sin) * local.width + Math.abs(cos) * local.height;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
}

function paintChorusSeam(ctx, footprint, age, empty = false) {
    const x = Math.round(footprint.x), y = Math.round(footprint.y + footprint.height * CHORUS_FRONT);
    const unit = Math.max(1, Math.round(footprint.height / 11));
    const opened = Math.min(1, age / 52);
    const settled = Math.max(0, (age - 102) / 78);
    const spread = Math.round(footprint.width * (0.18 + opened * (empty ? 0.10 : 0.07)));
    const lift = Math.round(opened * (1 - settled) * footprint.height * (empty ? 0.04 : 0.36));
    ctx.globalAlpha = 1 - settled ** 1.2;
    for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(x + side * spread, y - lift + side * unit / 2);
        ctx.rotate(side * opened * (empty ? -0.78 : 0.32));
        ctx.scale(side * footprint.width / 25, unit * (0.70 + opened * 0.43 - settled * 0.38));
        paintChorusHusk(ctx);
        ctx.restore();
    }
}

function paintChorusHusk(ctx) {
    ctx.fillStyle = '#251425';
    ctx.beginPath();
    ctx.moveTo(-4, 2);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-3, -1);
    ctx.lineTo(-3, -3);
    ctx.lineTo(-1, -3);
    ctx.lineTo(0, -5);
    ctx.lineTo(2, -5);
    ctx.lineTo(3, -7);
    ctx.lineTo(5, -6);
    ctx.lineTo(5, -3);
    ctx.lineTo(3, 0);
    ctx.lineTo(1, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a25798';
    ctx.fillRect(-3, 0, 4, 1);
    ctx.fillRect(-2, -2, 5, 2);
    ctx.fillRect(0, -4, 4, 2);
    ctx.fillRect(3, -6, 1, 2);
    ctx.fillStyle = '#f8d8ba';
    ctx.fillRect(-4, -1, 3, 1);
    ctx.fillRect(-2, -3, 4, 2);
    ctx.fillRect(0, -5, 3, 2);
    ctx.fillRect(2, -6, 2, 1);
}

/** Eight small static sprites; no additional particles, filters or animation timers. A boss shot (fx.screenShotScale, set by
 * prepareBossShot in js/canvas-battlefield.js) is drawn larger with two fading copies behind it, one shot at a time. */
class EnemyProjectiles {
    constructor(deps) {
        this.deps = deps;
        this.sizes = [48,42,48,44,36,34,48,36];
        this.chorusMuzzles = new WeakMap();
        this.isGround = fx => fx.enemyFlight?.groundCell === true;
    }

    variant(fx) {
        if (fx.enemyFlight?.source.monsterArchetype === 'wisp') return 7;
        const alternate = Math.abs(Number(fx.sourceId) || 0)%2;
        const element = vfxElement(fx.element);
        if (element === 'chaos') return alternate ? 5 : 4;
        return {fire:1,cold:2,light:3,blood:6}[element] ?? (alternate ? 6 : 0);
    }

    /** Returns false while the existing asset loader is still loading the atlas. */
    draw(ctx, fx, source, targets, progress) {
        if (fx.owner !== 'enemy') return false;
        const image = this.deps.getSkillGemVfxImage('skillFxEnemyProjectiles');
        if (!image) return false;
        const index = this.variant(fx), width = this.sizes[index]*(fx.screenShotScale || 1), height = width/2;
        const copies = fx.screenShotScale ? [[.14,.28],[.07,.5],[0,.94]] : [[0,.94]];
        for (const target of targets) {
            for (const [lag, alpha] of copies) {
                const at = Math.max(0, progress-lag);
                ctx.save();
                ctx.translate(source.x+(target.x-source.x)*at,source.y+(target.y-source.y)*at);
                ctx.rotate(Math.atan2(target.y-source.y,target.x-source.x));
                ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.globalAlpha = alpha;
                ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = false;
                ctx.drawImage(image,(index%2)*64,Math.floor(index/2)*32,64,32,-width/2,-height/2,width,height);
                ctx.restore();
            }
        }
        return true;
    }

    groundArea(fx) {
        if (!this.isGround(fx)) return fx.attackFootprint;
        const cell = fx.enemyFlight.targetCell;
        return { cells: [cell], center: cell };
    }

    /** The combat queue owns charge progress and explicitly releases the visual contact. */
    drawGround(ctx, fx, footprint, view) {
        const elapsed = view.now - fx.start;
        if (fx.groundImpact && (elapsed < 0 || elapsed >= 220)) return;
        this.paintGround(ctx,fx,footprint,{elapsed,reduced:view.reduced,feet:view.playerPoint});
    }

    paintGround(ctx, fx, footprint, {elapsed,reduced,feet}) {
        const fullContact = fx.groundImpact && !reduced;
        const look = CONTACT[vfxElement(fx.element)] || CONTACT.phys;
        const liquid = !reduced && realmLiquid(fx.enemyFlight);
        ctx.save();
        this.deps.clipSkillFootprintTerrain(ctx, footprint, fullContact ? footprint.height * 2 : 0);
        ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.shadowBlur = 0;
        const drawn = this.paintGroundFootprint(ctx, fx, footprint, look, {elapsed, reduced, liquid});
        if (fullContact && !drawn && !isChorusShot(fx.enemyFlight)) this.contact(ctx, footprint, look, elapsed / 220);
        ctx.restore();
        if (isChorusShot(fx.enemyFlight)) this.drawChorusFloor(ctx, fx, footprint, {elapsed, reduced, feet});
    }

    /** Outside the cell clip, under the actors: while it is warned the aimed cell glows from below with drifting motes and lights the
     * feet of a hero standing on it; on contact its crack opens (light an oval on the stone, not a lit square), then the landing flash,
     * ring, crystals and shards (js/rendering/chorus-burst.mjs). */
    drawChorusFloor(ctx, fx, footprint, {elapsed, reduced, feet}) {
        if (!fx.groundImpact) {
            const charge = this.targetProgress(fx);
            paintDangerLife(ctx, footprint, { charge, chaos: true, time: this.deps.getCombatTime(), reduced });
            return paintFootGlow(ctx, footprint, [feet], { strength: (charge - 0.3) / 0.7, chaos: true });
        }
        paintTileStrike(ctx, footprint, { age: elapsed, heavy: true, reduced, chaos: true, boost: 1.4 });
        paintFootGlow(ctx, footprint, [feet], { strength: 1 - elapsed / 230, chaos: true });
        if (!reduced) paintChorusFloor(ctx, footprint, elapsed, { image: this.deps.getSkillGemVfxImage(CONTACT.chaos.asset),
            empty: fx.groundOccupied === false, key: chorusKey(fx) });
    }

    paintGroundFootprint(ctx, fx, footprint, look, {elapsed, reduced, liquid}) {
        const liquidImage = liquid && this.deps.getSkillGemVfxImage(REALM_LIQUID_ASSET);
        ctx.save();
        this.deps.clipSkillFootprint(ctx, footprint);
        if (!fx.groundImpact) {
            if (!reduced && !liquidImage) this.deps.getSkillGemVfxImage(look.asset);
            this.warning(ctx, fx, footprint);
        }
        else if (isChorusShot(fx.enemyFlight)) {
            // The aimed tile stays a beat under the landing while its crack opens, so a dodge reads as the seed bursting on the cell
            // the hero left.
            ctx.globalAlpha = Math.max(0, 1 - elapsed / 110);
            paintDangerTiles(ctx, footprint, { charge: 1, chaos: true });
            ctx.restore();
            return true;
        } else {
            paintContactRim(ctx, footprint, look, elapsed / 220, reduced);
            if (liquidImage) paintRealmContact(ctx, liquidImage, liquid, footprint, elapsed / 220);
        }
        ctx.restore();
        return !!liquidImage;
    }

    contact(ctx, footprint, look, progress) {
        let image = this.deps.getSkillGemVfxImage(look.asset);
        if (image) return paintContact(ctx, image, footprint, look, progress);
        if (!look.fallback) return;
        image = this.deps.getSkillGemVfxImage(look.fallback.asset);
        if (image) paintContact(ctx, image, footprint, look.fallback, progress);
    }

    chorusContact(ctx, fx, footprint, view) {
        const age = view.now - fx.start;
        if (age < 0 || age >= 220) return;
        ctx.save();
        this.deps.clipSkillFootprintTerrain(ctx, footprint, footprint.height * 2);
        if (age < 180) {
            ctx.save();
            this.deps.clipSkillFootprint(ctx, footprint);
            paintChorusSeam(ctx, footprint, age, fx.groundOccupied === false);
            ctx.restore();
        }
        ctx.restore();
        paintChorusBurst(ctx, footprint, age, { reduced: view.reduced, empty: !fx.groundOccupied, key: chorusKey(fx) });
    }

    /** 0 when the caster starts its wind-up, 1 when the seed lands (a wind-up's stand-in carries windupStartAt). */
    targetProgress(fx) {
        const { windupStartAt, at, castStartAt } = fx.enemyFlight, now = this.deps.getCombatTime();
        if (Number.isFinite(windupStartAt)) return CHORUS_WINDUP_SHARE * this.deps.clampNumber((now - windupStartAt) / Math.max(1, at - windupStartAt), 0, 1);
        return CHORUS_WINDUP_SHARE + (1 - CHORUS_WINDUP_SHARE) * this.deps.clampNumber((now - castStartAt) / Math.max(1, at - castStartAt), 0, 1);
    }

    warning(ctx, fx, footprint) {
        if (isChorusShot(fx.enemyFlight)) return paintDangerTiles(ctx, footprint, { charge: this.targetProgress(fx), chaos: true });
        const share = this.warningShare(fx);
        const { x, y, width, height } = footprint;
        const edge = Math.min(2, width / 8, height / 6), inset = edge;
        const left = x - width / 2 + inset, top = y - height / 2 + inset;
        const right = x + width / 2 - inset, bottom = y + height / 2 - inset;
        ctx.fillStyle = '#da753e'; ctx.globalAlpha = 0.3 + share * 0.17;
        ctx.fillRect(left, top, right - left, bottom - top);
        paintGlow(ctx, { x, y, rx: width * 0.6, ry: height * 0.64, colour: '#e8884a', alpha: 0.18 + 0.22 * share, mode: 'source-over' });
        drawGroundDangerDye(ctx, footprint, 0.24 + share * 0.18);
        // A quiet edge like the boss warnings (js/rendering/skill-footprint.mjs): a soft band inside the cell and one faint line.
        ctx.strokeStyle = '#ffc794';
        for (const [band, alpha] of [[height * 0.42, 0.1], [height * 0.18, 0.14]]) {
            ctx.globalAlpha = alpha; ctx.lineWidth = band;
            ctx.strokeRect(x - width / 2, y - height / 2, width, height);
        }
        ctx.globalAlpha = 0.34; ctx.lineWidth = 1;
        ctx.strokeRect(left, top, right - left, bottom - top);
        drawGroundDangerSign(ctx, footprint, 0.79 + share * 0.21);
        this.warningRune(ctx, fx, { left, right, top, width, height });
    }

    warningShare(fx) {
        const { at, castStartAt } = fx.enemyFlight;
        return this.deps.clampNumber((this.deps.getCombatTime() - castStartAt) / Math.max(1, at - castStartAt), 0, 1);
    }

    warningComet(ctx, attack, projection) {
        const { sourceCell, targetCell } = attack;
        if (!sourceCell) return;
        const chorus = isChorusShot(attack);
        const source = projection.cellToScreen(sourceCell.gx, sourceCell.gy);
        const from = chorus ? this.chorusSource(attack, source, projection) : source;
        const to = projection.cellToScreen(targetCell.gx, targetCell.gy);
        const t = this.warningShare({ enemyFlight: attack });
        const liquid = realmLiquid(attack), imageForLiquid = liquid && this.deps.getSkillGemVfxImage(REALM_LIQUID_ASSET);
        if (imageForLiquid) return paintRealmFlight(ctx, imageForLiquid, liquid, {from, to, tileW:projection.tileW, progress:t});
        const look = CONTACT[vfxElement(attack.groundElement)] || CONTACT.phys;
        const pixel = Math.max(2.5, Math.round(projection.tileW / 15));
        const arc = { from,to,t,tileW:projection.tileW, tileH:projection.tileH,chorus };
        const point = queuedArc(ctx, arc);
        if (chorus) this.paintChorusTrail(ctx, arc, { start: Math.max(0.02, t - 0.2), end: t - 0.05 });
        return this.paintQueuedComet(ctx, point, { look,pixel,t,chorus });
    }

    /** A short run of dots along the seed's own arc right behind it; it ends with the flight. */
    paintChorusTrail(ctx, arc, span) {
        const p = chorusDot(arc), length = Math.hypot(arc.to.x - arc.from.x, arc.to.y - arc.from.y) * 1.35, step = 1.5 * p / Math.max(1, length);
        const points = [];
        for (let t = span.end; t > span.start && points.length < 24; t -= step) points.push(queuedArc(ctx, { ...arc, t }));
        paintChorusPath(ctx, points, { p, seed: Math.floor(arc.t * 40) });
    }

    chorusSource(attack, source, projection) {
        let offset = this.chorusMuzzles.get(attack);
        if (!offset) {
            const mouth = this.deps.chorusMouth?.(attack.source, projection);
            offset = mouth ? {x:(mouth.x-source.x)/projection.tileW,y:(mouth.y-source.y)/projection.tileH}
                : {x:0,y:-1.25};
            this.chorusMuzzles.set(attack, offset);
        }
        return {x:source.x+offset.x*projection.tileW,y:source.y+offset.y*projection.tileH};
    }

    paintQueuedComet(ctx, { x,y,angle }, { look,pixel,t,chorus }) {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        ctx.rotate(angle);
        if (chorus) paintChorusHusks(ctx, pixel, t);
        const phase = Math.floor(t * 15) % 3;
        const image = look.airAsset && this.deps.getSkillGemVfxImage(look.airAsset);
        const local = this.paintCometArt(ctx, {image,pixel,phase,chorus,color:look.color});
        ctx.restore();
        if (t >= 0.75 || (chorus && t >= 0.25)) return flightBox(Math.round(x), Math.round(y), angle, local);
    }

    paintCometArt(ctx, {image,pixel,phase,chorus,color}) {
        if (chorus) pixel *= 1.52;
        if (image) return this.paintAuthoredComet(ctx,image,pixel,phase,chorus);
        if (chorus) return paintChorusFallbackSeed(ctx,pixel,color);
        return this.paintComet(ctx,{pixel,color,phase});
    }

    paintAuthoredComet(ctx, image, pixel, phase, chorus) {
        const width = Math.round(pixel * ((chorus ? 19.2 : 15) + phase * 0.65));
        const height = Math.round(width * image.naturalHeight / image.naturalWidth);
        ctx.save();
        ctx.scale(-1, 1);
        ctx.globalAlpha = 0.98;
        ctx.imageSmoothingEnabled = false;
        const tip = Math.round(width * (chorus ? 0.06 : 0.34));
        if (chorus) {
            const art = outlinedSeed(ctx, image, width, height);
            ctx.drawImage(art.canvas, -tip - art.pad, -Math.round(height * 0.52) - art.pad);
        } else ctx.drawImage(image, -tip, -Math.round(height * 0.52), width, height);
        ctx.restore();
        if (chorus) paintChorusSeedTip(ctx, pixel);
        return { width, height, offset: tip - width / 2 };
    }

    paintComet(ctx, {pixel, color, phase}) {
        ctx.globalAlpha = 0.94;
        ctx.fillStyle = '#26192b';
        ctx.fillRect(-pixel * 6, -pixel * 2, pixel * 10, pixel * 4);
        ctx.fillRect(-pixel * 2, -pixel * 3, pixel * 5, pixel * 6);
        ctx.fillRect(pixel * 4, -pixel, pixel, pixel * 2);
        ctx.fillRect(-pixel * (8 + phase), -pixel, pixel * (phase + 2), pixel * 2);
        ctx.fillStyle = color;
        ctx.fillRect(-pixel * 5, -pixel, pixel * 9, pixel * 2);
        ctx.fillRect(-pixel, -pixel * 2, pixel * 4, pixel * 4);
        ctx.fillRect(-pixel * (8 + phase), 0, pixel * 3, pixel);
        ctx.fillRect(-pixel * (10 + phase), pixel * (phase - 1), pixel, pixel);
        ctx.fillStyle = '#fff4e8';
        ctx.fillRect(-pixel * 2, -pixel, pixel * 5, pixel * 2);
        ctx.fillRect(pixel, -pixel * 2, pixel, pixel * 4);
        return { width: pixel * (16 + phase), height: pixel * 6, offset: -pixel * (6 + phase) / 2 };
    }

    warningRune(ctx, fx, bounds) {
        const { sourceCell, targetCell } = fx.enemyFlight;
        const { left, right, top, width, height } = bounds;
        const size = Math.max(1, Math.round(Math.min(width, height) / 12));
        const west = sourceCell && sourceCell.gx > targetCell.gx;
        const x = west ? left + width * 0.31 : right - width * 0.31 - size * 5;
        drawEnemyWarningMark(ctx, fx.element, x, top + size * 1.5, size);
    }
}

function queuedArc(ctx, { from,to,t,tileW,tileH,chorus }) {
    const dx = to.x - from.x, dy = to.y - from.y + (chorus ? tileH * CHORUS_FRONT : 0);
    const start = chorus ? from.y : from.y - 0.62*tileW;
    // The chorus lob peaks about a tile above its bud, so the seed never climbs out of the scene away from its aimed cell.
    const curve = chorus ? Math.min(tileW * 5, 260) : tileW * ARC;
    const trend = dy + from.y - start - curve;
    const lift = chorus ? chorusArcLimit(ctx, {from:{x:from.x,y:start},dx,trend,curve,tileW}) : 0;
    const arch = 4 * t * (1 - t);
    const height = arch * lift;
    const velocity = trend + 2 * curve * t + 4 * (2 * t - 1) * lift;
    const y = start + trend*t + curve*t*t;
    return {x:from.x+dx*t,y:y-height,angle:Math.atan2(velocity,dx)};
}

/** Fits the taller lob to the canvas in its existing camera transform without reading layout. */
function chorusArcLimit(ctx, {from,dx,trend,curve,tileW}) {
    const transform = ctx.getTransform(), scale = transform.d;
    if (scale <= 0) return 0;
    const slope = trend * scale + dx * transform.b, bend = curve * scale;
    const peak = Math.max(0, Math.min(1, -slope / (2 * bend)));
    const top = transform.b * from.x + scale * from.y + transform.f;
    const ceiling = Math.min(ctx.canvas.height * 0.28, (tileW + 14) * scale);
    const available = (top + slope * peak + bend * peak * peak - ceiling) / scale;
    if (available >= 0) return 0;
    const mid = Math.max(0.3, 4 * peak * (1 - peak));
    return Math.max(-curve / 4, available / mid);
}

/** The seed art at its drawn size with a one-dot lilac rim, made once per size. */
function outlinedSeed(ctx, image, width, height) {
    const key = width + 'x' + height;
    if (outlinedSeeds.has(key)) return outlinedSeeds.get(key);
    const pad = Math.max(1, Math.round(width / Math.max(1, image.naturalWidth)));
    const canvas = ctx.canvas.ownerDocument.createElement('canvas');
    canvas.width = width + 2 * pad; canvas.height = height + 2 * pad;
    const paint = canvas.getContext('2d');
    paint.imageSmoothingEnabled = false;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) paint.drawImage(image, pad + dx * pad, pad + dy * pad, width, height);
    paint.globalCompositeOperation = 'source-in';
    paint.fillStyle = '#f3d6ff';
    paint.fillRect(0, 0, canvas.width, canvas.height);
    paint.globalCompositeOperation = 'source-over';
    paint.drawImage(image, pad, pad, width, height);
    const art = { canvas, pad };
    outlinedSeeds.set(key, art);
    return art;
}

function paintChorusHusks(ctx, p, t) {
    if (t < 0.06 || t > 0.96) return;
    const fade = Math.min(1, (1 - t) * 3.5), drift = 1 + (t * 17) % 1;
    ctx.save();
    for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = (0.85 - i * 0.25) * fade;
        const x = Math.round(-p * (11 + i * 2.8 + drift));
        const y = Math.round(p * ((i % 2 ? 1 : -1) * (1.8 + i * 0.6) + drift * 0.5));
        ctx.fillStyle = '#3b2838';
        ctx.fillRect(x,y,Math.round(p * (2.8 - i * 0.5)),Math.round(p * 1.55));
        ctx.fillStyle = i === 0 ? '#ecc78b' : '#c4a1ca';
        ctx.fillRect(x + 1,y + 1,Math.round(p * (1.7 - i * 0.3)),Math.max(1,Math.round(p * 0.57)));
    }
    ctx.restore();
}

function paintChorusFallbackSeed(ctx, p, color) {
    ctx.globalAlpha = 0.98;
    ctx.fillStyle = '#311a31';
    ctx.beginPath();
    ctx.moveTo(2*p,0);ctx.lineTo(0,2*p);ctx.lineTo(-4*p,3*p);ctx.lineTo(-7*p,p);
    ctx.lineTo(-10*p,2*p);ctx.lineTo(-15*p,0);ctx.lineTo(-10*p,-p);ctx.lineTo(-8*p,-2*p);
    ctx.lineTo(-4*p,-3*p);ctx.lineTo(0,-2*p);ctx.closePath();ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(-6*p,-p,7*p,2*p);
    ctx.fillRect(-4*p,-2*p,4*p,p);
    ctx.fillRect(-11*p,0,7*p,p);
    ctx.fillStyle = '#ffebd3';
    ctx.fillRect(-2*p,-p,2*p,2*p);
    return {width:17*p,height:6*p,offset:-6.5*p};
}

// The seed pod at the head of the chorus seed, in dots ending at its tip (x = 0): # ink, D deep, V violet, L lilac, W white.
const SEED_POD = Object.freeze(['   ####   ', ' ##DVVL## ', '#DDVLLWWL#', '#DVLWWWWW#', '#DDVLLWWL#', ' ##DVVL## ', '   ####   ']);
const SEED_TONES = Object.freeze({ '#': '#1c1225', D: '#5a2479', V: '#9a4ad6', L: '#e2b3ff', W: '#fff4ff' });

function paintChorusSeedTip(ctx, dot) {
    const q = Math.max(2, Math.round(dot * 0.55)), right = SEED_POD[0].length - 1;
    for (const [symbol, colour] of Object.entries(SEED_TONES)) {
        ctx.fillStyle = colour;
        ctx.beginPath();
        SEED_POD.forEach((row, y) => {
            for (let x = 0; x < row.length; x++) if (row[x] === symbol) ctx.rect((x - right) * q + q, (y - 3) * q - q / 2, q, q);
        });
        ctx.fill();
    }
}

export function createEnemyProjectiles(deps) {
    const instance = new EnemyProjectiles(deps);
    return {draw: instance.draw.bind(instance),isGround: instance.isGround,groundArea: instance.groundArea.bind(instance),
        drawGround: instance.drawGround.bind(instance), warningComet: instance.warningComet.bind(instance), isChorusShot,
        chorusContact: instance.chorusContact.bind(instance)};
}
