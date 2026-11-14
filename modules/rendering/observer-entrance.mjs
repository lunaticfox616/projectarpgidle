import { ease, share } from './entrance-timing.mjs';
import { frameAt } from './monster-motion.mjs';

class ObserverEntrance {
    constructor(deps) {
        this.deps = deps;
        this.seen = new WeakSet();
        this.OPEN_MS = 1750;
        this.OPENING_PAUSE = 130;
        this.OPENING_FRAMES = [175, 195, 215, 245, 265, 235];
        this.GOLD = '#efce93';
        this.LILAC = '#c8b0fc';
        this.GLOBE = {
                walk: [[44,-137], [45,-138], [45,-139], [44,-140], [44,-140], [44,-139]],
                attack: [[41,-137], [25,-132], [71,-134], [75,-136], [71,-129], [45,-139]],
                forms: [[7,-111], [44,-141], [78,-141], [43,-141], [38,-134], [39,-129], [39,-128], [56,-131],
                    [64,-138], [67,-139], [65,-138], [58,-136], [48,-137], [45,-138], null,
                    [37,-130], [36,-130], [39,-135], [39,-137], [43,-143], [43,-142]]
            };
    }

    frame(owner, enemy) {
            if (owner.currentZoneId !== this.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID || enemy.hp <= 0) return null;
            if (enemy.monsterVisualId !== 'pinnacle_observer' || !owner.enemies.includes(enemy)) return null;
            const started = this.deps.bossMoves.observer.openingAt(enemy);
            if (started === null) return null;
            const age = Math.max(0, this.deps.bossAttackView.now() - started);
            if (!this.seen.has(enemy)) {
                this.seen.add(enemy);
                if (age < 250) this.deps.playUiFeedbackSound('bossEntrance');
            }
            return { age, reduced: this.deps.uiDisplay.reducedEffects() };
        }

    body(cue) {
            if (!cue) return null;
            if (cue.reduced || cue.age >= this.deps.bossMoves.observer.openMs) return { awakened: true };
            if (cue.age < this.OPENING_PAUSE) return null;
            const index = frameAt(this.OPENING_FRAMES, cue.age - this.OPENING_PAUSE);
            return { openingFrame: 15 + index };
        }

    eyePath(ctx, width, height) {
            ctx.beginPath();
            ctx.moveTo(-width, 0);
            ctx.quadraticCurveTo(0, -height * 2, width, 0);
            ctx.quadraticCurveTo(0, height * 2, -width, 0);
            ctx.closePath();
        }

    engravedRing(ctx, angle, radius) {
            ctx.save();
            ctx.rotate(angle);
            ctx.strokeStyle = this.GOLD;
            ctx.beginPath();
            for (let quadrant = 0; quadrant < 4; quadrant++) {
                const start = quadrant * Math.PI / 2 + .18;
                ctx.moveTo(Math.cos(start) * radius, Math.sin(start) * radius);
                ctx.arc(0, 0, radius, start, start + 1.2);
            }
            ctx.stroke();
            ctx.fillStyle = this.GOLD;
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(radius - 3, -1.5, 6, 3);
                ctx.rotate(Math.PI / 2);
            }
            ctx.restore();
        }

    seal(ctx, entry, cue) {
            if (!cue) return;
            const body = this.deps.getEnemyBodyHeight(entry), scale = body / 155;
            const age = cue.reduced ? this.OPEN_MS : cue.age;
            const unfold = ease((age - 180) / 700);
            const strike = 1 - share(age, 940, 1460);
            const light = share(age, 420, 940) * strike;
            ctx.save();
            ctx.translate(entry.x, entry.y - body * .70);
            ctx.scale(scale, scale);
            ctx.lineWidth = 1.5;
            ctx.globalAlpha *= (.32 + light * .58) * share(age, 0, 220);
            this.engravedRing(ctx, .16 + Math.min(age / this.OPEN_MS, 1) * 1.9, 86 + 17 * light);
            this.eyePath(ctx, 115 * (.52 + .48 * unfold), 2 + 49 * unfold);
            ctx.fillStyle = '#342049';
            ctx.fill();
            ctx.strokeStyle = this.LILAC;
            ctx.stroke();
            this.drawIris(ctx, unfold, light);
            ctx.restore();
        }

    drawIris(ctx, unfold, light) {
            ctx.strokeStyle = this.GOLD;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.ellipse(0, 0, 18 + 13 * unfold, 5 + 34 * unfold, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#1b122b';
            this.eyePath(ctx, 11 + 5 * unfold, 24 * unfold);
            ctx.fill();
            ctx.fillStyle = '#fff0cc';
            ctx.fillRect(-3, -3, 6, 6);
            if (light > 0) this.drawSeams(ctx, light);
        }

    drawSeams(ctx, light) {
            ctx.save();
            ctx.globalAlpha *= light;
            ctx.strokeStyle = '#ffe3af';
            ctx.beginPath();
            for (const side of [-1, 1]) {
                ctx.moveTo(side * 35, -12);
                ctx.lineTo(side * 69, -12);
                ctx.lineTo(side * 95, -30);
                ctx.lineTo(side * (112 + 28 * light), -30);
                ctx.moveTo(side * 39, 15);
                ctx.lineTo(side * 74, 15);
                ctx.lineTo(side * 98, 31);
            }
            ctx.stroke();
            ctx.restore();
        }

    globe(ctx, enemy, cue) {
            if (!cue || cue.reduced || cue.age > 1430) return;
            const placed = this.deps.stageRoster.placementOf(enemy.id);
            const dot = placed && this.GLOBE[placed.clip]?.[placed.frame];
            if (!dot || placed.actor !== 'pinnacle_observer') return;
            const [dx, dy] = dot, scale = placed.dot;
            const flare = share(cue.age, 20, 480) * (1 - share(cue.age, 880, 1430));
            ctx.save();
            ctx.translate(placed.x + dx * scale * (placed.west ? -1 : 1), placed.y + (dy - placed.hop) * scale);
            ctx.scale(scale, scale);
            ctx.globalAlpha *= flare;
            const light = ctx.createRadialGradient(0, 0, 1, 0, 0, 22);
            light.addColorStop(0, '#fff2c9');
            light.addColorStop(.38, '#b698f291');
            light.addColorStop(1, '#b698f200');
            ctx.fillStyle = light;
            ctx.fillRect(-22, -22, 44, 44);
            ctx.fillStyle = '#fff0cc';
            ctx.fillRect(-2, -9, 4, 18);
            ctx.fillRect(-8, -2, 16, 4);
            ctx.restore();
        }

    caption(ctx, entry, cue) {
            if (!cue || cue.age < 780 || cue.age > this.OPEN_MS + 420) return;
            const alpha = share(cue.age, 780, 1020) * (1 - share(cue.age, this.OPEN_MS, this.OPEN_MS + 420));
            const compact = this.deps.uiDisplay.matches('(max-width: 640px)');
            const y = entry.y + (compact ? 17 : 29);
            const text = this.deps._t('경계 개방');
            ctx.save();
            ctx.globalAlpha *= alpha;
            ctx.font = `bold ${compact ? 13 : 17}px ${this.deps.battlePixelFont()}`;
            ctx.textAlign = 'center';
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#21162d';
            ctx.fillStyle = '#ffe5b8';
            this.deps.drawCrispCanvasText(ctx, text, entry.x, y, 'strokeText');
            this.deps.drawCrispCanvasText(ctx, text, entry.x, y);
            ctx.restore();
        }
}

export function createObserverEntrance(deps) {
    const instance = new ObserverEntrance(deps);
    return Object.freeze({ frame: instance.frame.bind(instance), body: instance.body.bind(instance), seal: instance.seal.bind(instance), globe: instance.globe.bind(instance), caption: instance.caption.bind(instance) });
}
