import { createObserverScene } from './observer-scene.mjs';
import { drawForgeFloor, drawSignature, nextSignatureStages, signatureRange } from './atlas-signature.mjs';
import { createObserverArena } from './observer-arena.mjs';
import { createBossMoveTiming } from './boss-move-timing.mjs';
import { WOODSMAN_BLADE, WOODSMAN_SHAPES } from './boss-move-clips.mjs';
import { ROOTLET_NEXT_COLOR, ROOTLET_NEXT_WAVE } from './rootlet-next-wave.mjs';
import { paintDangerTileEdges, paintSafeTicks } from './danger-tiles.mjs';
import { bossWarningFirstWaveCells } from '../combat/boss-move-stages.mjs';

// A Rootlet wave stays in its cool preview this long after the wave before it lands, so the hit reads before the next warning.
const ROOTLET_HANDOFF_MS = 150;
const castElement = enemy => enemy.nextPatternState?.attackElement || enemy.ele || 'phys';

/** The boss moves on screen (js/boss-moves.js; 2026-10-16 사용자: GPT가 만든 적 공격 효과로 보스 패턴을 다양하게, "vfx용량과 색 검수,
 * 늘어나거나 줄어들어서 이상하게 보이지 않는지 검수, 몬스터가 자연스럽게 사용하는지도 중요해"). Effects come from the boss's own sheet
 * (data/boss-fx.js; GPT's art, assets/stage-vfx/boss-fx, local only) at one size per boss: its scale × the dot the boss is drawn at.
 * Nothing is stretched: a shot turns along its lane, a beam is the frame's head, its middle tiled, its tail.
 * Ground (under the actors): each stage's cells warn, faint to strong as their turn comes, then burst (impact frames; a ground boss's
 * eruption, a falling boss's drop). Air (over them): the charge at the boss's hand through the warning, shots flying down their
 * lanes from the hand at its height, the beam (or, for bosses whose art is a shot, a stream of shots) held from the hand.
 * The hand is the emit point of the frame the boss strikes on (data/boss-fx.js emit), from where the boss was drawn
 * (js/canvas-stage-roster.js placementOf). Each stage's warning is retired by its combat tick. Draws only. */
class BossMoveView {
    constructor(deps, arena) {
        this.deps = deps;
        this.arena = arena;
        this.STREAM_EVERY_MS = 120;
        this.FALL_MS = 320;
        this.FALL_TILES = 3.2;
        this.sheets = new Map();
        this.fx = () => (typeof this.deps.BOSS_FX === 'object' ? this.deps.BOSS_FX : null);
        this.sum = list => list.reduce((total, ms) => total + ms, 0);
        this.WOODSMAN_BLADE = WOODSMAN_BLADE;
        this.WOODSMAN_SHAPES = WOODSMAN_SHAPES;
        this.woodsmanOrigins = new WeakMap();
        this.WOODSMAN_CLIPS = Object.fromEntries(Object.entries(this.WOODSMAN_SHAPES).map(([element, shape], palette) => [
            element, [[64,64,[1,1,1,1]], [8,64,shape.slash], [64,112,shape.impact]]
                .map(([x, y, ms], row) => ({ sheet: 'woodsman-elements-v2', cell: 128, cols: 4, ms,
                    frames: ms.map((_, i) => [(palette * 3 + row) * 4 + i, x, y, 0, 0, 0]) }))
        ]));
        this.floorOf = (cell, projection) => {
            const at = projection.cellToScreen(cell.gx, cell.gy);
            return { x: at.x, y: at.y + (Number(projection.actorGroundOffsetY) || 0) };
        };
        this.HELD_MOVES = Object.freeze(['beam', 'grind']);
        this.SAW_RIM = Object.freeze({ x: 172, y: -52 });
        this.SPARK_COLOURS = Object.freeze(['#fff4cf', '#ffc24d', '#ff7a2e', '#ff3a24']);

        this.bossMoveScale = (entry, row, projection) => this.bodyOf(entry.source, row, projection).dot * row.scale;
    }

    sheetOf(key) {
        if (!this.sheets.has(key)) this.sheets.set(key, this.deps.stagePictures.openPicture(`${this.fx().path}${key}.png?v=${this.fx().version}`));
        const sheet = this.sheets.get(key);
        return sheet.ready ? sheet : null;
    }

    /** The clip's frame at ms (loop: round and round; else null once it is over). */
    frameAt(clip, ms, loop) {
        const total = this.sum(clip.ms);
        if (ms < 0 || (!loop && ms >= total)) return null;
        let rest = loop ? ms % total : ms;
        for (let i = 0; i < clip.ms.length; i++) {
            if (rest < clip.ms[i]) return clip.frames[i];
            rest -= clip.ms[i];
        }
        return clip.frames[clip.frames.length - 1];
    }

    /** One frame with its anchor at `at`, `scale` screen px per effect px, turned by angle; flip mirrors it (a shot going left keeps
     * its top up). */
    drawFrame(ctx, clip, frame, at, look) {
        const sheet = frame && this.sheetOf(clip.sheet);
        if (!sheet) return;
        const { cell = this.fx().cell, cols = this.fx().cols } = clip, s = look.scale;
        ctx.save();
        ctx.translate(at.x, at.y);
        if (look.angle) ctx.rotate(look.angle);
        if (look.flip !== !!frame[5]) ctx.scale(-1, 1);
        if (look.alpha !== undefined) ctx.globalAlpha *= look.alpha;
        this.deps.stageDots.blit(ctx, sheet.source, { x: (frame[0] % cols) * cell, y: Math.floor(frame[0] / cols) * cell, w: cell, h: cell },
            { x: -frame[1] * s, y: -frame[2] * s, scale: s }, true);
        ctx.restore();
    }

    /** A screen direction as an angle that keeps the art's top up: { angle, flip }. */
    heading(from, to) {
        const dx = to.x - from.x, dy = to.y - from.y;
        return dx < 0 ? { angle: Math.atan2(-dy, -dx), flip: true } : { angle: Math.atan2(dy, dx), flip: false };
    }

    /** Where the boss stands and lets its effects go: { feet, hand, dot } in screen px. */
    bodyOf(enemy, row, projection) {
        const placed = typeof this.deps.stageRoster === 'object' ? this.deps.stageRoster.placementOf(enemy.id) : null;
        if (placed) {
            const emit = row.emit[Math.min(row.emit.length - 1, placed.strikeFrame)] || row.emit[0], side = placed.west ? -1 : 1;
            return { feet: { x: placed.x, y: placed.y }, hand: { x: placed.x + emit[0] * placed.dot * side, y: placed.y + emit[1] * placed.dot }, dot: placed.dot };
        }
        const centre = this.deps.getGridUnitCenter(enemy), at = projection.cellToScreen(centre.gx, centre.gy);
        const feet = { x: at.x, y: at.y + (Number(projection.actorGroundOffsetY) || 0) }, dot = projection.tileW / 48;
        return { feet, hand: { x: feet.x, y: feet.y - projection.tileH * 0.9 }, dot };
    }

    /** The combat queue has yet to land these cells. Their brightness rises in the last 0.6 s. */
    drawStageWarning(ctx, stage, landAt, now, projection) {
        const left = landAt - now;
        const charge = this.deps.clampNumber(1 - left / stage.window, 0, 1);
        const footprint = this.deps.projectSkillFootprint({ cells: stage.cells, kind: 'blast', center: stage.center }, projection);
        if (!footprint) return;
        const active = stage.next && (stage.ring || stage.first || left <= 220) && !stage.settling;
        if (!active) return this.drawLaterStage(ctx, footprint, stage.rootlet);
        this.deps.drawSkillFootprintGround(ctx, footprint, stage.rootlet ? '#ffc29a' : '#ffae72',
            { fill: 0.34 + charge * 0.15, edge: 0.78 + charge * 0.21, rootlet: stage.rootlet, outer: !stage.first,
                marks: 0.87 + charge * 0.13, cracks: this.stageFaultCharge(stage, charge), dye: 0.19 + charge * 0.18 });
    }

    drawLaterStage(ctx, footprint, rootlet) {
        if (rootlet) return this.deps.drawSkillFootprintGround(ctx, footprint, ROOTLET_NEXT_COLOR, ROOTLET_NEXT_WAVE);
        return this.deps.drawSkillFootprintGround(ctx, footprint, '#79a5b9', { fill: 0.19, edge: 0.75, marks: 0, dye: 0 });
    }

    stageFaultCharge(stage, charge) {
        if (!stage.ring) return null;
        // The initial warning reaches 28% when the caster releases the move.
        return stage.first ? 0.28 + 0.72 * charge : charge;
    }

    /** What bursts out of the ground where a stage lands: a ground boss's eruption, else its impact. A volley and a beam do not burst. */
    burstClip(row, kind) {
        if (['volley', 'beam'].includes(kind)) return null;
        return row.kind === 'ground' ? row.clips.action : row.clips.impact;
    }

    drawBursts(ctx, entry, row, now, projection) {
        const move = entry.move, clip = this.burstClip(row, move.kind);
        if (!clip) return;
        // Bursts at the body's own effect size: impactScale (small for beam bosses) is for the tip of a shot or a beam only.
        const body = this.bodyOf(entry.source, row, projection), scale = body.dot * row.scale;
        for (const stage of move.stages) {
            const since = now - (move.releasedAt + stage.ms);
            if (row.kind === 'fall') { this.drawFalls(ctx, { entry, row, stage, since }, projection); continue; }
            const frame = this.frameAt(clip, since, false);
            if (frame) this.drawBurstCells(ctx, { entry, stage, clip, frame, scale }, projection);
        }
    }

    drawBurstCells(ctx, burst, projection) {
        const { entry, stage, clip, frame, scale } = burst;
        if (entry.move.kind === 'rings') return;
        const earth = entry.element === 'phys' && ['rings', 'cross', 'scatter'].includes(entry.move.kind) && stage.cells.length > 1;
        if (!earth) return stage.cells.forEach(cell => this.drawFrame(ctx, clip, frame, this.floorOf(cell, projection), { scale }));
        // The shared fracture owns the centre. Keep this boss's foliage around its sides.
        const left = stage.cells.reduce((best, cell) => cell.gx < best.gx ? cell : best, stage.cells[0]);
        const right = stage.cells.reduce((best, cell) => cell.gx > best.gx ? cell : best, left);
        const look = { scale: scale * 0.44, alpha: 0.55 };
        const flank = left === right ? [left] : [left, right];
        for (const cell of flank) this.drawFrame(ctx, clip, frame, this.floorOf(cell, projection), look);
    }
    /** A falling boss's stage: the shot drops onto each cell over FALL_MS (down and a little sideways), then its impact plays. */
    drawFalls(ctx, fall, projection) {
        const { entry, row, stage, since } = fall, body = this.bodyOf(entry.source, row, projection), scale = body.dot * row.scale;
        for (const cell of stage.cells) {
            const floor = this.floorOf(cell, projection), top = { x: floor.x - projection.tileW * 0.8, y: floor.y - projection.tileH * this.FALL_TILES };
            if (since < 0 && since > -this.FALL_MS) {
                const p = 1 + since / this.FALL_MS, at = { x: top.x + (floor.x - top.x) * p, y: top.y + (floor.y - top.y) * p };
                this.drawFrame(ctx, row.clips.action, this.frameAt(row.clips.action, this.FALL_MS + since, true), at, { scale, ...this.heading(top, floor) });
            }
            const frame = this.frameAt(row.clips.impact, since, false);
            if (frame) this.drawFrame(ctx, row.clips.impact, frame, floor, { scale });
        }
    }

    /** 톱날이 가는 칸: 맞을 때마다 붉게 뛴다. */
    drawGrindGround(ctx, move, now, projection) {
        const rule = this.deps.BOSS_MOVE_RULES.grind, first = move.releasedAt + move.stages[0].ms, since = now - first;
        if (!move.stages.length || since > rule.tickMs * move.stages.length) return;
        const beat = since < 0 ? 0 : 1 - (since % rule.tickMs) / rule.tickMs, cells = move.stages[0].cells;
        const footprint = this.deps.projectSkillFootprint({ cells, kind: 'blast', center: cells[0] }, projection);
        if (footprint) this.deps.drawSkillFootprintGround(ctx, footprint, '#ff3a24', 1.2 + beat * 3.2);
    }

    drawGrindSparks(ctx, entry, now) {
        const placed = typeof this.deps.stageRoster === 'object' ? this.deps.stageRoster.placementOf(entry.source.id) : null;
        if (!placed) return;
        const rule = this.deps.BOSS_MOVE_RULES.grind, move = entry.move, side = placed.west ? -1 : 1, size = Math.max(3, Math.round(placed.dot * 3));
        ctx.save();
        move.stages.forEach((stage, tick) => {
            const age = (now - (move.releasedAt + stage.ms)) / rule.tickMs / 2;
            if (age < 0 || age > 1) return;
            for (let i = 0; i < 16; i++) {
                const spread = (this.deps.hashSeed(`${tick}:${i}`) >>> 0) / 4294967296, far = (20 + spread * 64) * age, drop = 40 * age * age * (0.4 + spread);
                ctx.globalAlpha = 1 - age;
                ctx.fillStyle = this.SPARK_COLOURS[i % this.SPARK_COLOURS.length];
                const dx = this.SAW_RIM.x + far * Math.cos((i - 8) * 0.2), dy = this.SAW_RIM.y + far * Math.sin((i - 8) * 0.2) + drop;
                ctx.fillRect(Math.round(placed.x + side * dx * placed.dot), Math.round(placed.y + dy * placed.dot), size, size);
            }
        });
        ctx.restore();
    }

    drawGround(owner, ctx, projection) {
        if (!projection) return;
        const now = this.deps.bossAttackView.now();
        this.arena.drawObserverArena(owner, ctx, projection, now);
        this.arena.drawObserverFloor(owner, ctx, projection, now);
        this.drawShiftMarks(owner, ctx, projection, now);
        for (const entry of this.deps.bossMoves.live(now)) this.drawLiveMove(owner, ctx, entry, projection, now);
    }

    /** One live move on the floor: the giant woodsman draws its own (js/canvas-woodsman.js), Veila's instruments here. */
    drawLiveMove(owner, ctx, entry, projection, now) {
        const move = entry.move, found = this.deps.bossMoves.fxOf(entry.source);
        if (move.kind === 'woodsman') return;
        if (move.family==='forge') {
            if (owner.enemies.some(enemy => enemy.id === entry.source.id && enemy.hp > 0)) drawForgeFloor(ctx,move,projection,now);
            return;
        }
        if (move.kind === 'observer') { this.arena.drawObserverMove(owner, ctx, entry, projection, now); return; }
        if (move.kind !== 'signature') this.drawStageWarnings(ctx,entry,projection,now);
        if (move.kind === 'rings') this.drawRootletSafeCells(owner, ctx, entry, projection, now);
        this.drawPhysicalLead(ctx, entry, projection, now);
        if (move.kind === 'grind') this.drawGrindGround(ctx, move, now, projection);
        if (found && this.fx()) this.drawBursts(ctx, entry, found.row, now, projection);
    }

    drawStageWarnings(ctx,{move, element, center:warningCenter},projection,now) {
        if (this.HELD_MOVES.includes(move.kind)) return;
        const ring = move.kind === 'rings', rootlet = ring && element === 'phys' && this.deps.rootletZone();
        for (let index = move.next; index < move.stages.length; index++) {
            const stage = move.stages[index];
            const cells = stage.cells.filter(cell => !move.spent.includes(cell.lane) || move.kind !== 'volley');
            const window = this.stageWarningWindow(move, index);
            const center = (rootlet && warningCenter) || cells[0];
            const settling = rootlet && index > 0 && now - (move.releasedAt + move.stages[index - 1].ms) < ROOTLET_HANDOFF_MS;
            if (cells.length) this.drawStageWarning(ctx, { cells, center, first: index === 0, next: index === move.next, ring, rootlet, window, settling },
                move.releasedAt + stage.ms, now, projection);
        }
    }

    stageWarningWindow(move, index) {
        if (index === 0) return move.kind === 'rings' ? move.stages[0].ms : 600;
        if (move.kind === 'rings') return move.stages[index].ms - move.stages[index - 1].ms;
        return 220;
    }

    drawPhysicalLead(ctx, entry, projection, now) {
        const { move, element } = entry;
        if (element !== 'phys' || move.next !== 0 || !['rings', 'cross'].includes(move.kind)) return;
        const stage = move.stages[0], target = stage?.cells[0];
        if (!target || !move.source || !this.deps.actExplorationState.inSight(move.source)) return;
        const left = move.releasedAt + stage.ms - now;
        if (left > 145) return;
        const charge = this.deps.clampNumber(1 - left / 145, 0, 1);
        const from = this.floorOf(move.source, projection), to = this.floorOf(target, projection);
        const pixel = Math.max(1, Math.round(projection.tileW / 20));
        ctx.save();
        this.foreclawDust(ctx, { from, to, pixel, charge });
        if (!this.deps.uiDisplay.reducedEffects()) this.groundChips(ctx, { from, to, pixel, charge });
        ctx.restore();
    }

    foreclawDust(ctx, {from, to, pixel, charge}) {
        const side = to.x >= from.x ? 1 : -1;
        ctx.globalAlpha = 0.68 + charge * 0.25;
        for (let i = 0; i < 3; i++) {
            const x = Math.round(from.x + side * pixel * (i + 1)), y = Math.round(from.y + (i - 1) * pixel * 2);
            ctx.fillStyle = '#382932';
            ctx.fillRect(x - pixel * 3, y, pixel * 6, pixel * 2);
            ctx.fillStyle = '#d39b68';
            ctx.fillRect(x - pixel * 2, y, pixel * 4, pixel);
        }
    }

    groundChips(ctx, {from, to, pixel, charge}) {
        ctx.globalAlpha = 0.74;
        for (let i = 0; i < 6; i++) {
            const t = charge * 1.02 - i * 0.117;
            if (t <= 0 || t >= 0.87) continue;
            const x = Math.round(from.x + (to.x - from.x) * t);
            const y = Math.round(from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * pixel * (3 + i % 3));
            ctx.fillStyle = '#3d2930';
            ctx.fillRect(x - pixel, y - pixel, pixel * 3, pixel * 2);
            ctx.fillStyle = i % 2 ? '#eab57c' : '#ad795d';
            ctx.fillRect(x, y - pixel, pixel * 2, pixel);
        }
    }

    /** Pale footprint = arrival, red footprint = damage. Neither follows the victim after being warned. */
    drawShiftMarks(owner, ctx, projection, now) {
        for (const enemy of owner.enemies || []) {
            const shift = this.deps.bossMoves.shiftOf(enemy);
            if (!shift || now > shift.landAt + 260) continue;
            const cells = this.deps.getGridFootprintCells(shift.to.gx, shift.to.gy, this.deps.getGridUnitFootprint(enemy));
            const footprint = this.deps.projectSkillFootprint({ cells, kind: 'blast', center: shift.to }, projection);
            if (footprint) this.deps.drawSkillFootprintGround(ctx, footprint, '#e4d5a1', 2.8);
        }
    }

    drawShiftFlashes(owner, ctx, projection, now) {
        for (const enemy of owner.enemies || []) {
            const shift = this.deps.bossMoves.shiftOf(enemy);
            if (!shift || Math.abs(now - shift.landAt) > 280) continue;
            const clip = this.WOODSMAN_CLIPS[shift.element][0], cell = shift.landed ? shift.to : shift.from;
            const at = this.floorOf(this.deps.getGridUnitCenter({ ...cell, isBoss: true, footprint: this.deps.getGridUnitFootprint(enemy) }), projection);
            const scale = projection.tileW / 96, age = now - shift.landAt;
            const alpha = Math.max(0, 1 - Math.abs(age) / 280);
            const frame = clip.frames[Math.min(3, Math.floor(Math.abs(age) / 70))];
            this.drawFrame(ctx, clip, frame, { x: at.x, y: at.y - 65 * scale }, { scale: scale * 1.15, alpha });
        }
    }

    woodsmanBlade(placed, frame) {
        const [x, y] = this.WOODSMAN_BLADE[frame];
        return { x: placed.x + x * placed.dot * (placed.west ? -1 : 1), y: placed.y + y * placed.dot };
    }

    drawWoodsmanCharge(ctx, enemy, element, share) {
        const placed = this.deps.stageRoster.placementOf(enemy.id);
        if (!placed || placed.actor !== 'woodsman' || placed.clip !== 'attack' || placed.frame >= placed.strikeFrame) return;
        const clip = this.WOODSMAN_CLIPS[element][0];
        const frame = clip.frames[Math.min(3, Math.floor(share * 4))];
        this.drawFrame(ctx, clip, frame, this.woodsmanBlade(placed, placed.frame), { scale: placed.dot * 0.68, alpha: 0.87, flip: false });
    }

    drawWoodsmanRelease(ctx, effect, elapsed) {
        const clip = this.WOODSMAN_CLIPS[effect.element][1], frame = this.frameAt(clip, elapsed, false);
        if (!frame) return;
        const origin = this.woodsmanOrigin(effect);
        if (!origin) return;
        const shape = this.WOODSMAN_SHAPES[effect.element], { dot, west } = origin;
        const at = { x: origin.x + (west ? -1 : 1) * dot * elapsed * shape.speed, y: origin.y - dot * elapsed * shape.rise };
        this.drawFrame(ctx, clip, frame, at, { scale: dot * shape.size, flip: west });
    }

    /** A cut leaves the blade once; recovery and a later turn do not drag it back. */
    woodsmanOrigin(effect) {
        if (this.woodsmanOrigins.has(effect)) return this.woodsmanOrigins.get(effect);
        const placed = this.deps.stageRoster.placementOf(effect.enemyId);
        if (!placed || placed.actor !== 'woodsman') return null;
        const origin = { ...this.woodsmanBlade(placed, placed.strikeFrame), dot: placed.dot, west: placed.west };
        this.woodsmanOrigins.set(effect, origin);
        return origin;
    }

    drawWoodsmanFx(ctx, effect, now, projection) {
        const elapsed = now - effect.start;
        if (effect.type === 'bossRelease' && effect.woodsman) return this.drawWoodsmanRelease(ctx, effect, elapsed);
        if (effect.type !== 'woodsmanImpact' || !projection) return;
        const clip = this.WOODSMAN_CLIPS[effect.element][2], frame = this.frameAt(clip, elapsed, false);
        if (!frame) return;
        for (const at of this.woodsmanImpactPoints(effect.cells, projection)) {
            this.drawFrame(ctx, clip, frame, at, { scale: projection.tileW / 96, flip: false });
        }
    }

    /** Nearby hit cells share one burst, so narrow lanes do not stack three explosions over the hero. */
    woodsmanImpactPoints(cells, projection) {
        const points = [], step = Math.max(1, Math.ceil(cells.length / 6)), gap = projection.tileW * .95;
        for (let i = 0; i < cells.length && points.length < 3; i += step) {
            const at = this.floorOf(cells[i], projection);
            if (points.every(p => Math.hypot(p.x - at.x, p.y - at.y) >= gap)) points.push(at);
        }
        return points;
    }

    /** The charge at the boss's hand through its warning: GPT's charge frames spread over the warning, the last flash at the end. */
    drawCharges(owner, ctx, projection) {
        for (const enemy of owner.enemies || []) this.drawCharge(ctx, enemy, projection);
    }

    /** The giant woodsman's cast is drawn by js/canvas-woodsman.js; a woodsman elsewhere keeps its element charge. */
    drawCharge(ctx, enemy, projection) {
        if (enemy.patternArea?.woodsman) return;
        const share = enemy && enemy.isBoss ? this.deps.bossAttackView.warningShare(enemy) : null;
        if (share === null || !enemy.patternArea) return;
        const element = this.deps.woodsmanAttackFxElement(enemy);
        if (element) { this.drawWoodsmanCharge(ctx, enemy, element, share); return; }
        const found = this.deps.bossMoves.fxOf(enemy);
        if (!found) return;
        const clip = found.row.clips.charge, body = this.bodyOf(enemy, found.row, projection);
        const frame = clip.frames[Math.min(clip.frames.length - 1, Math.floor(share * (clip.frames.length - 0.5)))];
        this.drawFrame(ctx, clip, frame, body.hand, { scale: body.dot * found.row.scale });
    }

    /** A lane's path through time: the hand at release, then cell k at hand height when its stage lands. [{ at, x, y }] */
    lanePath(entry, row, lane, projection) {
        const move = entry.move, body = this.bodyOf(entry.source, row, projection), lift = body.hand.y - body.feet.y;
        const points = [{ at: move.releasedAt, x: body.hand.x, y: body.hand.y }];
        for (const stage of move.stages) {
            const cell = stage.cells.find(row2 => row2.lane === lane);
            if (cell) { const floor = this.floorOf(cell, projection); points.push({ at: move.releasedAt + stage.ms, x: floor.x, y: floor.y + lift }); }
        }
        return points;
    }

    pointAt(path, now) {
        for (let i = 1; i < path.length; i++) {
            if (now > path[i].at) continue;
            const a = path[i - 1], b = path[i], p = this.deps.clampNumber((now - a.at) / Math.max(1, b.at - a.at), 0, 1);
            return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, from: a, to: b };
        }
        return null;
    }

    /** The shots of a volley: each flies its lane until it hits (move.hits) or runs out, then its impact plays where it ended. */
    drawShots(ctx, entry, row, now, projection) {
        const move = entry.move, lanes = new Set(move.stages.flatMap(stage => stage.cells.map(cell => cell.lane)));
        const scale = this.bossMoveScale(entry, row, projection);
        for (const lane of lanes) {
            const hit = move.hits.find(row2 => row2.lane === lane), path = this.lanePath(entry, row, lane, projection);
            const end = (hit && path.find(point => point.at === move.releasedAt + hit.ms)) || path[path.length - 1];
            const flying = now < end.at && this.pointAt(path, now);
            if (flying) this.drawFrame(ctx, row.clips.action, this.frameAt(row.clips.action, now - move.releasedAt, true), flying, { scale, ...this.heading(flying.from, flying.to) });
            else this.drawFrame(ctx, row.clips.impact, this.frameAt(row.clips.impact, now - end.at, false), end, { scale: scale * row.impactScale });
        }
    }

    /** A beam held from the hand to the line's far cell: head, tiled middle, tail (beam art), or a stream of shots (shot art). */
    drawBeam(ctx, entry, row, now, projection) {
        const move = entry.move, first = move.stages[0], last = move.stages[move.stages.length - 1];
        const start = move.releasedAt + first.ms, end = Math.min(move.releasedAt + last.ms + this.deps.BOSS_MOVE_RULES.beam.tickMs, move.cutAt ?? Infinity);
        if (now < start - 90 || now > end + 200) return;
        const body = this.bodyOf(entry.source, row, projection), far = first.cells[first.cells.length - 1], floor = this.floorOf(far, projection);
        const tip = { x: floor.x, y: floor.y + body.hand.y - body.feet.y }, scale = body.dot * row.scale;
        if (row.kind === 'beam') this.drawBeamBody(ctx, { clip: row.clips.action, frame: this.beamFrame(row.clips.action, now, start, end), from: body.hand, to: tip, scale });
        else this.drawStream(ctx, row, { now, start, end, from: body.hand, to: tip, scale });
        const tick = move.stages.find(stage => now >= move.releasedAt + stage.ms && now < move.releasedAt + stage.ms + 370);
        if (tick) this.drawFrame(ctx, row.clips.impact, this.frameAt(row.clips.impact, now - move.releasedAt - tick.ms, false), tip, { scale: scale * row.impactScale });
    }

    /** The beam's frame: its first two while it forms, the middle two while it holds, the last two as it fades. */
    beamFrame(clip, now, start, end) {
        const n = clip.frames.length;
        if (now < start) return clip.frames[0];
        if (now > end) return clip.frames[Math.min(n - 1, n - 2 + Math.floor((now - end) / 100))];
        return clip.frames[2 + Math.floor((now - start) / 90) % 2];
    }

    drawBeamBody(ctx, beam) {
        const { clip, frame, from, to, scale } = beam, sheet = frame && this.sheetOf(clip.sheet);
        if (!sheet) return;
        const cell = this.fx().cell, cols = this.fx().cols, sx = (frame[0] % cols) * cell, sy = Math.floor(frame[0] / cols) * cell;
        const left = frame[3], right = frame[4], span = right - left + 1, cut = Math.max(2, Math.round(span * 0.3));
        const length = Math.hypot(to.x - from.x, to.y - from.y) / scale, look = this.heading(from, to);
        ctx.save();
        ctx.translate(from.x, from.y);
        ctx.rotate(look.angle);
        if (look.flip) ctx.scale(-1, 1);
        const piece = (x, w, at) => this.deps.stageDots.blit(ctx, sheet.source, { x: sx + x, y: sy, w, h: cell }, { x: at * scale, y: -frame[2] * scale, scale }, true);
        piece(left, cut, 0);
        const body = { x: left + cut, w: Math.max(1, span - cut * 2) };
        for (let at = cut; at < length - cut; at += body.w) piece(body.x, Math.min(body.w, Math.ceil(length - cut - at)), at);
        piece(right + 1 - cut, cut, Math.max(cut, length - cut));
        ctx.restore();
    }

    /** Shots let go every STREAM_EVERY_MS from start to end, each crossing the line in a stepMs per cell's time. */
    drawStream(ctx, row, s) {
        const clip = row.clips.action, travel = Math.max(200, Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y) * 1.4), look = this.heading(s.from, s.to);
        for (let launch = s.start - travel * 0.5; launch < s.end; launch += this.STREAM_EVERY_MS) {
            const p = (s.now - launch) / travel;
            if (p < 0 || p > 1) continue;
            this.drawFrame(ctx, clip, this.frameAt(clip, s.now - launch, true), { x: s.from.x + (s.to.x - s.from.x) * p, y: s.from.y + (s.to.y - s.from.y) * p }, { scale: s.scale, ...look });
        }
    }

    /** Over the actors: the struck Rootlet wave's outer edge once more as dots, so a cell under the boss's body still reads. */
    drawRootletEdges(owner, ctx, projection, now) {
        if (!this.deps.rootletZone()) return;
        const waves = this.deps.bossMoves.live(now).map(entry => this.rootletNextWave(entry, now)).filter(Boolean);
        for (const enemy of owner.enemies || []) {
            const wave = !waves.some(row => row.source === enemy) && this.rootletCastWave(enemy);
            if (wave) waves.push(wave);
        }
        for (const wave of waves) {
            const footprint = this.deps.projectSkillFootprint({ cells: wave.cells, kind: 'blast', center: wave.cells[0] }, projection);
            const cover = this.bodyBox(owner, wave.source, projection);
            if (!footprint || !cover) continue;
            ctx.save();
            this.deps.clipSkillFootprintTerrain(ctx, footprint);
            paintDangerTileEdges(ctx, footprint, { charge: wave.charge, cover: [cover] });
            ctx.restore();
        }
    }

    /** Where a boss's body was last drawn on screen (feet, art size), or null. */
    bodyBox(owner, enemy, projection) {
        const placed = this.deps.stageRoster?.placementOf(enemy.id), size = placed && this.deps.stageRoster.bodySize(enemy, projection.tileW);
        if (!size) return null;
        return { left: placed.x - size.halfW, right: placed.x + size.halfW, top: placed.y - size.h, bottom: placed.y + projection.tileH * 0.3 };
    }

    /** Ground pass: quiet ticks on the open cells next to the hero while the struck wave nears (not on cells it or the boss covers). */
    drawRootletSafeCells(owner, ctx, entry, projection, now) {
        const wave = this.deps.rootletZone() && owner.gridPlayer ? this.rootletNextWave(entry, now) : null;
        if (!wave || wave.charge < 0.3 || wave.charge >= 1) return;
        const cells = this.openCellsAround(owner.gridPlayer, [wave.cells, this.bodyCells(entry.source)]);
        const footprint = cells.length && this.deps.projectSkillFootprint({ cells, kind: 'blast', center: cells[0] }, projection);
        if (!footprint) return;
        ctx.save();
        this.deps.clipSkillFootprintTerrain(ctx, footprint);
        paintSafeTicks(ctx, footprint, Math.min(1, (wave.charge - 0.3) * 4));
        ctx.restore();
    }

    bodyCells(enemy) { return this.deps.getGridFootprintCells(enemy.gx, enemy.gy, this.deps.getGridUnitFootprint(enemy)); }

    /** The 3x3 cells around `hero` not in any of `taken` (cell lists). */
    openCellsAround(hero, taken) {
        const keys = new Set(taken.flat().map(cell => cell.gx + ':' + cell.gy)), cells = [];
        for (let i = 0; i < 9; i++) {
            const cell = { gx: hero.gx + (i % 3) - 1, gy: hero.gy + Math.floor(i / 3) - 1 };
            if (!keys.has(cell.gx + ':' + cell.gy)) cells.push(cell);
        }
        return cells;
    }

    rootletNextWave({ move, element, source }, now) {
        if (move.kind !== 'rings' || element !== 'phys' || move.cutAt) return null;
        const landed = move.stages[move.next - 1];
        if (landed && now - (move.releasedAt + landed.ms) < ROOTLET_HANDOFF_MS) return null;
        const stage = move.stages[move.next];
        if (!stage?.cells.length) return null;
        const left = move.releasedAt + stage.ms - now;
        const charge = this.deps.clampNumber(1 - left / this.stageWarningWindow(move, move.next), 0, 1);
        return { source, cells: stage.cells, charge: this.stageFaultCharge({ ring: true, first: move.next === 0 }, charge) };
    }

    /** Before the boss lets go: the first wave of its warned ring, at the charge the ground warning shows (28% at release). */
    rootletCastWave(enemy) {
        const area = this.rootletCastArea(enemy);
        if (!area) return null;
        const cells = area.firstWaveCells ?? bossWarningFirstWaveCells(area);
        const share = this.deps.bossAttackView.warningShare(enemy) || 0;
        return cells?.length ? { source: enemy, cells, charge: 0.28 * share } : null;
    }

    rootletCastArea(enemy) {
        const area = enemy.isBoss && enemy.hp > 0 && enemy.patternArea;
        if (!area || area.shape !== 'diamond' || area.radius < 2) return null;
        return castElement(enemy) === 'phys' && this.deps.bossAttackView.isLiveWarning(enemy) ? area : null;
    }

    drawAir(owner, ctx, projection) {
        if (!projection || !this.fx()) return;
        const now = this.deps.bossAttackView.now();
        this.drawRootletEdges(owner, ctx, projection, now);
        this.drawShiftFlashes(owner, ctx, projection, now);
        this.drawCharges(owner, ctx, projection);
        for (const entry of this.deps.bossMoves.live(now)) {
            if (entry.move.kind === 'observer') { this.arena.drawObserverAir(ctx, entry, projection, now); continue; }
            if (entry.move.kind === 'signature') {drawSignature(ctx,entry,projection,now);continue;}
            if (entry.move.kind === 'grind') this.drawGrindSparks(ctx, entry, now);
            const found = this.deps.bossMoves.fxOf(entry.source);
            if (!found) continue;
            if (entry.move.kind === 'volley') this.drawShots(ctx, entry, found.row, now, projection);
            if (entry.move.kind === 'beam') this.drawBeam(ctx, entry, found.row, now, projection);
        }
    }

}

export function createBossMoveView(deps) {
    const scene = createObserverScene(deps);
    const arena = createObserverArena(deps, scene);
    const motion = createBossMoveTiming(deps);
    const instance = new BossMoveView(deps, arena);
    const nextStrikes=enemies=>nextSignatureStages(enemies,deps.bossMoves.live(deps.getCombatTime()),deps.bossAttackView);
    const castRange=enemy=>signatureRange(enemy,deps.bossMoves.live(deps.getCombatTime()),deps.bossAttackView);
    return Object.freeze({ motion, nextStrikes, castRange, drawGround: instance.drawGround.bind(instance), drawAir: instance.drawAir.bind(instance), drawWoodsmanFx: instance.drawWoodsmanFx.bind(instance), drawObserverWarnings: arena.drawObserverWarnings, drawObserverTransition: scene.drawObserverTransition, observerScene: scene.observerScene, observerCamera: scene.observerCamera, strikeHoldMs: motion.strikeHoldMs, heldSide: motion.heldSide, shiftAlpha: motion.shiftAlpha });
}
