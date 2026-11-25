import { createBossAttackTiming } from './boss-attack-timing.mjs';
import { drawEnemyWarningMark } from './enemy-warning-mark.mjs';
import { drawSkillSpriteFrame } from './skill-sprite-geometry.mjs';
import { paintRootletContact, paintRootletDebris, paintRootletScar, ROOTLET_CONTACT_MS, ROOTLET_SCAR_MS } from './rootlet-fault.mjs';

const SLAM_STEPS = [[-8,-1,6,1],[-3,-1,1,3],[-3,1,7,1],[3,-2,1,4],[3,-2,6,1]];
const RAY_STEPS = [[-8,-3,5,1],[-4,-2,5,1],[0,-1,6,1],[4,0,5,1]];
const SHOCK_DOTS = Array.from({ length: 20 }, (_, index) => {
    const arc = index * Math.PI / 10;
    return [Math.cos(arc), Math.sin(arc), index % 3 === 0 ? 2 : 1];
});

function impactScar(ctx, point, mark) {
    const { pixel, ray, flip, core } = mark;
    const steps = ray ? RAY_STEPS : SLAM_STEPS;
    for (const [x, y, w, h] of steps) {
        ctx.fillRect(Math.round(point.x + x * pixel), Math.round(point.y + y * pixel * flip),
            Math.ceil(w * pixel), Math.ceil(h * pixel));
    }
    if (core <= 0) return;
    ctx.save();
    ctx.globalAlpha *= core;
    ctx.fillStyle = '#fff1d4';
    ctx.fillRect(Math.round(point.x - 2 * pixel), Math.round(point.y), Math.ceil(4 * pixel), Math.ceil(pixel));
    ctx.restore();
}

// 보스 공격 연출(2026-10-06 사용자 요청: "보스 몬스터들의 공격 및 패턴이 너무 허접하고 이펙트도 안보여서"). 그림과 소리만 맡고
// 판정 칸은 건드리지 않는다(예고할 때 정해진 enemy.patternArea, 놓은 뒤에는 대기 중인 공격의 bossPattern.area 그대로).
// - 바닥 경고(js/canvas-battlefield.js drawBossPatternArea): 예고가 흐를수록 진해지고 끝 무렵 깜빡인다(groundAlpha).
// - 바닥 표시(drawMarks, 2026-10-19부터 인물 아래): 줄과 부채꼴은 보스 쪽에서부터 차오르는 칸과 바닥에 눕힌 화살촉, 위에서 보는
//   전장의 범위기는 바깥에서 좁혀 드는 조준 고리. 놓은 뒤 맞기 직전에는 다 찬 채 빠르게 깜빡인다. 맞는 순간의 칸 번쩍임도 바닥에 그린다.
// - 그림 보스의 몸(addMotions): 예고 동안 목표 반대쪽으로 젖히고 떨다가, 놓는 순간(bossRelease 효과) 범위기는 뛰어올라
//   내리찍고 나머지는 앞으로 내지른다. 맞는 순간의 작은 돌진(enemyAttack)은 보스에게서 이것으로 바뀐다.
// - 타격(drawImpact): 충격파 두 겹, 원소 색 파편(canvas-attack-fx 'slam'), 땅 갈라짐 자국(drawGround), 소리. 흔들림은
//   getBattleFeedbackProfile의 bossSlam이 맡는다.
class BossAttacks {
    constructor(deps, timing) {
        this.deps = deps;
        this.timing = timing;
        this.BLINK_FROM = 0.72;
        this.RETICLE_START = 2.2;
        this.MOTION = Object.freeze({ leanTiles: 0.2, rearTiles: 0.1, hopTiles: 0.55, lungeTiles: 0.4, releaseMs: 540, landAt: 0.93, trembleFrom: 0.6 });
        this.CRACK_MS = 1400;
        this.IMPACT_FLASH_MS = 240;
        this.RAY_KINDS = new Set(['line', 'fan']);
        this.cracks = [];
        this.rootletScars = [];
        this.landed = new WeakSet();
        this.easeOut = t => 1 - (1 - t) * (1 - t);
        this.onStage = () => typeof this.deps.stageView === 'object' && true;

        this.warnMsOf = enemy => enemy.nextPatternState?.warningMs || this.deps.COMBAT_GRID_CONFIG.bossPatternWarningMs;
        this.ARROW = Object.freeze({ depth: 0.36, half: 0.32, thick: 0.16, first: 1.15, every: 1.7, endGap: 0.45 });
        this.onShownCell = (frame, point) => frame.shown.some(cell => Math.abs(point.x - cell.x) <= frame.unit / 2 && Math.abs(point.y - cell.y) <= frame.tileH / 2);
        this.closesIn = attack => attack.delivery === 'patternArea' && !attack.bossPattern.move;
        // A held beam has no stage warnings (js/canvas-boss-moves.js HELD_MOVES): its released line keeps the edge until the last tick.
        this.edgedAfterRelease = attack => this.closesIn(attack) || (attack.delivery === 'patternArea' && attack.bossPattern.move?.kind === 'beam');
    }

    blink(share, span) {
        if (share < this.BLINK_FROM) return 1;
        const late = share - this.BLINK_FROM;
        return 0.62 + 0.38 * Math.abs(Math.cos(0.009 * share * span + 0.015 * span * late * late));
    }

    /** Ground warning strength for drawBossPatternArea: 3 when it appears, 7 at release, blinking near the end. */
    groundAlpha(enemy) {
        const share = this.timing.warningShare(enemy);
        return share === null ? 3 : (3 + 4 * share) * this.blink(share, this.warnMsOf(enemy));
    }

    /** A released area that lands within half a second: full strength, blinking fast (about 105 ms a beat, on the screen's clock). */
    pendingAlpha() {
        return 7 * (0.6 + 0.4 * Math.abs(Math.cos(this.deps.performance.now() * 0.03)));
    }

    /** ring = { x, y, rx, ry }: four short arcs just outside it, turned by spin. */
    drawBrackets(ctx, ring, spin) {
        for (let k = 0; k < 4; k++) {
            const at = spin + k * Math.PI / 2;
            ctx.beginPath();
            ctx.ellipse(ring.x, ring.y, ring.rx * 1.12, ring.ry * 1.12, 0, at - 0.28, at + 0.28);
            ctx.stroke();
        }
    }

    /** A ring that closes in from outside onto the area, with four brackets turning into place. */
    drawReticle(ctx, footprint, look) {
        const close = this.easeOut(look.share), grow = 1 + (this.RETICLE_START - 1) * (1 - close);
        const rx = Math.max(footprint.width, footprint.tileW) / 2 * grow, ry = Math.max(footprint.height, footprint.tileH) / 2 * grow;
        ctx.globalAlpha = (0.35 + 0.55 * close) * look.blink;
        ctx.strokeStyle = '#ff6a4a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(footprint.x, footprint.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#ffe2c4';
        ctx.lineWidth = 3;
        this.drawBrackets(ctx, { x: footprint.x, y: footprint.y, rx, ry }, (1 - close) * Math.PI / 2);
    }

    /** The warned cells shown on the floor (open floor without obstacles, js/canvas-skill-footprint.js): the ray is measured on these,
     * so its charge reaches the end the player sees, not a cell hidden in a wall. */
    shownPoints(owner, footprint) {
        const map = this.deps.getCombatGridSize(), run = this.deps.actExplorationState.current(owner);
        if (!map.tiles) return footprint.points;
        const sealed = !!run && this.deps.actExplorationState.gateSealed(run), taken = this.deps.getGroundTakenCellKeys(run);
        return footprint.points.filter(point => this.deps.actExplorationMap.walkable(map, point, sealed) && !taken.has(this.deps.gridCellKey(point.gx, point.gy)));
    }

    /** The ray's frame on the floor: origin, unit axis, reach (floor tiles) and the shown cells. */
    rayFrame(owner, footprint, origin) {
        const squash = footprint.tileH / footprint.tileW, unit = footprint.tileW, shown = this.shownPoints(owner, footprint);
        const flat = point => ({ x: (point.x - origin.x) / unit, y: (point.y - origin.y) / squash / unit });
        const offsets = shown.map(flat).filter(o => Math.hypot(o.x, o.y) > 0.01);
        if (!offsets.length) return null;
        const sum = offsets.reduce((acc, o) => { const l = Math.hypot(o.x, o.y); return { x: acc.x + o.x / l, y: acc.y + o.y / l }; }, { x: 0, y: 0 });
        const len = Math.hypot(sum.x, sum.y);
        if (len < 0.01) return null;
        const axis = { x: sum.x / len, y: sum.y / len };
        const reach = Math.max(...offsets.map(o => o.x * axis.x + o.y * axis.y + 0.5));
        return { origin, axis, reach, squash, unit, shown, tileH: footprint.tileH };
    }

    /** A floor point (tiles along the axis and across it) back on the screen. */
    onFloor(frame, along, across) {
        const ax = frame.axis.x, ay = frame.axis.y, x = ax * along - ay * across, y = ay * along + ax * across;
        return { x: frame.origin.x + x * frame.unit, y: frame.origin.y + y * frame.squash * frame.unit };
    }

    /** The charged part: from the boss out to share of the reach (straight with time: full means it lands now), with a bright front. */
    drawCharge(ctx, frame, look) {
        const front = frame.reach * look.share, wide = frame.reach * 2 + 2;
        if (front <= 0.05) return;
        const corners = [this.onFloor(frame, 0, -wide), this.onFloor(frame, front, -wide), this.onFloor(frame, front, wide), this.onFloor(frame, 0, wide)];
        ctx.globalAlpha = (0.05 + 0.075 * look.share) * look.blink;
        ctx.fillStyle = '#e7a06f';
        ctx.beginPath();
        corners.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
        ctx.closePath();
        ctx.fill();
        // The front: a soft wide glow under a bright line, so where the charge has got to reads even on a busy floor.
        for (const [width, colour, alpha] of [[0.14, '#ff6a40', 0.35], [0.05, '#fff1e2', 0.6 + 0.4 * look.share]]) {
            ctx.globalAlpha = Math.min(1, alpha) * look.blink;
            ctx.strokeStyle = colour;
            ctx.lineWidth = Math.max(2, frame.unit * width);
            ctx.beginPath();
            ctx.moveTo(corners[1].x, corners[1].y);
            ctx.lineTo(corners[2].x, corners[2].y);
            ctx.stroke();
        }
    }

    /** One solid arrowhead lying on the floor, its tip `along` tiles out on the ray; none where it would be cut by the edge of the
     * warned floor (a broken arrowhead read as a glitch). */
    drawArrowhead(ctx, frame, along, lit) {
        const { depth, half, thick } = this.ARROW;
        const shape = [[thick, 0], [thick - depth, -half], [-depth, -half], [0, 0], [-depth, half], [thick - depth, half]];
        const points = shape.map(([a, b]) => this.onFloor(frame, along + a, b));
        if (![points[0], points[2], points[4]].every(point => this.onShownCell(frame, point))) return;
        ctx.beginPath();
        points.forEach((point, i) => (i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
        ctx.closePath();
        ctx.fillStyle = lit ? '#ffe7d6' : '#ff9d7a';
        ctx.fill();
        ctx.strokeStyle = '#3d140e';
        ctx.lineWidth = Math.max(1, frame.unit * 0.025);
        ctx.stroke();
    }

    /** Arrowheads every ARROW.every tiles down the middle out to the far end (a fan's spread shows in its cells; arrows toward its edges
     * only fitted next to the boss, bunched on one another). The ones the charge has passed are lit. */
    drawArrows(ctx, frame, look) {
        const front = frame.reach * look.share;
        for (let along = this.ARROW.first; along <= frame.reach - this.ARROW.endGap; along += this.ARROW.every) {
            const lit = along <= front;
            ctx.globalAlpha = (lit ? 0.95 : 0.5 + 0.2 * look.share) * look.blink;
            this.drawArrowhead(ctx, frame, along, lit);
        }
    }

    /** Lines and fans start at the boss: they charge outward from it, under arrowheads pointing the way it strikes. */
    drawRays(owner, ctx, footprint, look) {
        const frame = look.origin && this.rayFrame(owner, footprint, look.origin);
        if (!frame) return;
        this.deps.clipSkillFootprint(ctx, footprint); // the warned cells only (a fan's triangle), and below only floor the hero could stand on
        this.drawCharge(ctx, frame, look);
        this.drawArrows(ctx, frame, look);
    }

    originOf(source, projection) {
        if (!source || !this.deps.hasGridCell(source)) return null;
        const centre = this.deps.getGridUnitCenter(source);
        return projection.cellToScreen(centre.gx, centre.gy);
    }

    drawMark(owner, ctx, area, projection, look) {
        if (area.observerMove) return;
        const footprint = this.deps.projectSkillFootprint(area, projection);
        if (!footprint) return;
        ctx.save();
        if (this.RAY_KINDS.has(area.kind)) {
            this.deps.clipSkillFootprintTerrain(ctx, footprint); // only where the hero could stand, like the ground fill
            // From the boss's cell the ray leaves from (js/combat-patterns.js patternArea.source), else the boss's middle: from the middle of a
            // wide boss the axis leant off the ray's row.
            const origin = this.deps.hasGridCell(area.source) ? projection.cellToScreen(area.source.gx, area.source.gy) : this.originOf(look.source, projection);
            this.drawRays(owner, ctx, footprint, { ...look, origin });
        } else if (this.onStage()) {
            this.deps.clipSkillFootprintTerrain(ctx, footprint);
            this.drawAreaCharge(owner, ctx, footprint, look);
        } else this.drawReticle(ctx, footprint, look);
        ctx.restore();
        this.elementMark(ctx, footprint, look.pattern?.attackElement || look.source.ele, area);
    }

    elementMark(ctx, footprint, element, area) {
        const { points, centerPoint, tileW, tileH } = footprint;
        this.warmPhysicalGround(points.length, element, area);
        const aimX = centerPoint.x + tileW, aimY = centerPoint.y + tileH;
        const position = points.reduce((best, point) =>
            Math.abs(point.x - aimX) + Math.abs(point.y - aimY) < Math.abs(best.x - aimX) + Math.abs(best.y - aimY)
                ? point : best, points[0]);
        const size = Math.max(1, Math.floor(Math.min(tileW, tileH) / 11));
        ctx.save();
        this.deps.clipSkillFootprintTerrain(ctx, footprint);
        this.deps.clipSkillFootprint(ctx, footprint);
        drawEnemyWarningMark(ctx, element, position.x - size * 2, position.y - size * 2, size);
        ctx.restore();
    }

    /** Areas around a point (blasts, crosses) on the stage charge the same way as lines and fans: a fill and a bright front spread from
     * the centre with the warning time, full means it lands (2026-10-19: they only darkened and blinked, so their timing did not read). */
    drawAreaCharge(owner, ctx, footprint, look) {
        const centre = footprint.centerPoint, unit = footprint.tileW, squash = footprint.tileH / footprint.tileW, shown = this.shownPoints(owner, footprint);
        if (!shown.length) return;
        const reach = Math.max(...shown.map(p => Math.hypot((p.x - centre.x) / unit, (p.y - centre.y) / squash / unit))) + 0.62;
        const radius = reach * look.share * unit;
        if (radius < 1) return;
        this.deps.clipSkillFootprint(ctx, footprint);
        ctx.beginPath();
        ctx.ellipse(centre.x, centre.y, radius, radius * squash, 0, 0, Math.PI * 2);
        ctx.globalAlpha = (0.04 + 0.055 * look.share) * look.blink;
        ctx.fillStyle = '#e7a06f';
        ctx.fill();
        for (const [width, colour, alpha] of [[0.14, '#ff6a40', 0.35], [0.05, '#fff1e2', 0.6 + 0.4 * look.share]]) {
            ctx.globalAlpha = Math.min(1, alpha) * look.blink;
            ctx.strokeStyle = colour;
            ctx.lineWidth = Math.max(2, unit * width);
            ctx.stroke();
        }
    }

    /** The bright edge of a released boss warning that has no stage warnings: an area without a move and a held beam (a released
     * snapshot owns its warning even when the boss no longer previews one). Under the actors since 2026-10-19. */
    drawEdges(ctx, scene) {
        const areas = (scene.pending || []).filter(attack => this.edgedAfterRelease(attack)).map(attack => attack.bossPattern.area);
        new Set(areas.filter(area => !area.woodsman)).forEach(area => this.deps.drawBossPatternArea(ctx, area, scene.projection, 0.92, true));
    }

    /** Struck-cell damage art replaces the warning on the battlefield clock (held back by hit stops). */
    drawImpactFlashes(ctx, projection) {
        const now = Number.isFinite(this.deps.battleVisualState.visualNow) ? this.deps.battleVisualState.visualNow : this.deps.performance.now();
        const reduced = this.deps.reduced();
        this.drawRootletScars(ctx, projection, now);
        for (const fx of this.deps.battleFx) {
            if (!fx || fx.type !== 'bossAreaImpact' || now < fx.start) continue;
            const ms = now - fx.start, rootlet = this.rootletRing(fx.element, fx.footprint);
            if (ms >= (rootlet ? ROOTLET_CONTACT_MS : this.IMPACT_FLASH_MS)) continue;
            if (rootlet) this.drawRootletContact(ctx, fx, projection, { age: ms, reduced, outer: fx.wave > 1 });
            else this.drawScars(ctx, fx, projection, ms / this.IMPACT_FLASH_MS, reduced);
        }
    }

    drawScars(ctx, fx, projection, progress, reduced) {
        const footprint = this.deps.projectSkillFootprint(fx.footprint, projection);
        if (!footprint) return;
        const look = this.groundContactLook(fx, footprint, reduced);
        this.paintContactGround(ctx, footprint, { ...look, reduced, progress, element: fx.element });
    }

    rootletRing(element, area) { return (!element || element === 'phys') && this.isRing(area) && this.deps.rootletZone(); }

    warmPhysicalGround(count, element, area) {
        if (count < 2 || (element && element !== 'phys') || this.deps.reduced()) return;
        this.deps.getSkillGemVfxImage('skillFxEnemyEarthContact');
        if (this.rootletRing(element, area)) return;
        if (this.isRing(area)) this.deps.getSkillGemVfxImage('skillFxEnemyRingFault');
    }

    /** The Rootlet's struck cells: flash and cracks inside them, then what the ground throws out around them. Its scar stays. */
    drawRootletContact(ctx, fx, projection, look) {
        const footprint = this.deps.projectSkillFootprint(fx.footprint, projection);
        if (!footprint) return;
        if (!this.rootletScars.some(scar => scar.fx === fx)) this.rootletScars.push({ fx, area: fx.footprint, start: fx.start });
        ctx.save();
        this.deps.clipSkillFootprintTerrain(ctx, footprint);
        this.deps.clipSkillFootprint(ctx, footprint);
        paintRootletContact(ctx, footprint, look);
        ctx.restore();
        paintRootletDebris(ctx, footprint, look, this.deps.getSkillGemVfxImage('skillFxEnemyEarthContact'));
    }

    drawRootletScars(ctx, projection, now) {
        this.rootletScars = this.rootletScars.filter(scar => now - scar.start < ROOTLET_SCAR_MS && now >= scar.start - 1000);
        for (const scar of this.rootletScars) {
            const footprint = this.deps.projectSkillFootprint(scar.area, projection);
            if (!footprint) continue;
            ctx.save();
            this.deps.clipSkillFootprintTerrain(ctx, footprint);
            paintRootletScar(ctx, footprint, now - scar.start);
            ctx.restore();
        }
    }

    groundContactLook(fx, footprint, reduced) {
        const ring = this.isRing(fx.footprint), ray = this.RAY_KINDS.has(fx.footprint.kind);
        const physical = fx.element === 'phys';
        const image = this.deps.getSkillGemVfxImage;
        if (!image || reduced || ray || (ring && !physical)) return { ring, ray };
        const crack = image('skillFxEarthCrack');
        if (!physical || footprint.points.length < 2) return { ring, ray, crack };
        const fault = ring && image('skillFxEnemyRingFault');
        const earth = !fault && image('skillFxEnemyEarthContact');
        return { ring, ray, crack, earth, fault };
    }

    isRing(area) { return area.shape === 'diamond' && area.radius >= 2; }

    paintContactGround(ctx, footprint, look) {
        const { crack, earth, reduced, progress, ring, fault } = look;
        const rise = earth && !ring ? footprint.tileH * 1.25 : 0;
        ctx.save();
        this.deps.clipSkillFootprintTerrain(ctx, footprint, rise);
        ctx.save();
        this.deps.clipSkillFootprint(ctx, footprint);
        ctx.globalAlpha = (1 - progress) * (reduced ? 0.65 : 0.92);
        if (crack) this.paintCrack(ctx, crack, footprint, progress, earth || fault);
        else this.paintScars(ctx, footprint, look);
        ctx.restore();
        if (fault) this.paintRingFault(ctx, fault, footprint, progress);
        else if (earth && ring) this.paintRingChunks(ctx, earth, footprint, progress);
        else if (earth) this.paintEarthContact(ctx, earth, footprint, progress, rise);
        ctx.restore();
    }

    paintRingFault(ctx, image, footprint, progress) {
        const { points, tileW, tileH } = footprint;
        const frame = 1 + Math.min(4, Math.floor(progress * 5));
        const width = Math.round(tileW * (0.96 + 0.04 * progress));
        const height = Math.round(tileH * (0.61 - progress * 0.13));
        const sx = (frame % 3) * 128, sy = Math.floor(frame / 3) * 40;
        this.deps.clipSkillFootprint(ctx, footprint);
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 1 - progress ** 1.6;
        for (const {x, y, gx, gy} of points) {
            const seed = (Math.imul(gx, 73) ^ Math.imul(gy, 29)) & 7;
            const span = width - (seed % 3) * 3;
            ctx.save();
            ctx.translate(Math.round(x) + (seed % 3) - 1, Math.round(y - height * 0.73) + ((seed >> 1) % 3));
            ctx.scale(seed & 1 ? -1 : 1, 1);
            ctx.drawImage(image, sx, sy, 128, 40, -Math.round(span / 2), 0, span, height);
            ctx.restore();
        }
    }

    paintRingChunks(ctx, image, footprint, progress) {
        const { points, tileW, tileH, centerPoint } = footprint;
        const frame = 2 + Math.min(3, Math.floor(progress * 4));
        const width = Math.round(tileW * (0.86 + progress * 0.12));
        const height = Math.round(tileH * (0.51 - progress * 0.21));
        const sx = (frame % 3) * 128, sy = Math.floor(frame / 3) * 128 + 42;
        this.deps.clipSkillFootprint(ctx, footprint);
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 1 - progress ** 1.35;
        for (const {x, y} of points) {
            const core = x === centerPoint.x && y === centerPoint.y;
            const spread = core ? Math.round(tileW) : width;
            ctx.drawImage(image, sx, sy, 128, 46, Math.round(x - spread / 2), Math.round(y - height * 0.78), spread, height);
        }
    }

    paintCrack(ctx, image, footprint, progress, earth) {
        const spread = 0.52 + 0.44 * this.easeOut(Math.min(1, progress * 2.6));
        const w = Math.round(footprint.width * spread), h = Math.round(footprint.height * spread);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, Math.round(footprint.x - w / 2), Math.round(footprint.y - h / 2), w, h);
        if (!earth) this.paintDebris(ctx, footprint, progress);
        this.shockFront(ctx, footprint, progress);
        if (earth) return;
        const contact = this.deps.getSkillGemVfxImage('skillFxSlamPrimary');
        if (contact && progress < 0.5) {
            const { x, y } = footprint.centerPoint;
            const width = Math.round(footprint.tileW * (1 + progress));
            const height = Math.round(footprint.tileH * (0.85 + progress));
            ctx.globalAlpha = (1 - progress * 2) * 0.85;
            ctx.drawImage(contact, Math.round(x - width / 2), Math.round(y - height / 2), width, height);
        }
    }

    paintEarthContact(ctx, image, footprint, progress, rise) {
        const { points, tileW, tileH, centerPoint } = footprint;
        const width = Math.round(Math.min(footprint.width * 1.16, tileW * 4.5));
        const height = Math.round(Math.min(width * 0.78, tileH * 5));
        const frame = 1 + Math.min(4, Math.floor(progress * 5));
        ctx.beginPath();
        for (const at of points) ctx.rect(at.x - tileW / 2, at.y - tileH / 2 - rise, tileW, tileH + rise);
        ctx.clip();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 1 - progress ** 1.75;
        if (this.paintEarthRing(ctx, image, footprint, progress)) return;
        drawSkillSpriteFrame(ctx, image, frame, { columns: 3, rows: 2, angle: 0,
            x: Math.round(centerPoint.x), y: Math.round(centerPoint.y - height * 0.08), width, height });
    }

    paintEarthRing(ctx, image, {points,tileW,tileH,centerPoint}, progress) {
        if (points.some(at => at.x === centerPoint.x && at.y === centerPoint.y)) return false;
        const frame = 2 + Math.min(3, Math.floor(progress * 4));
        const width = Math.round(tileW * (0.91 + 0.16 * progress));
        const height = Math.round(tileH * 1.57);
        const quadrants = new Set();
        for (const at of points) {
            const dx = Math.sign(at.x - centerPoint.x), dy = Math.sign(at.y - centerPoint.y);
            if (!dx || !dy) continue;
            const quadrant = `${dx}:${dy}`;
            if (quadrants.has(quadrant)) continue;
            quadrants.add(quadrant);
            ctx.save(); // drawSkillSpriteFrame moves the canvas to the chunk; the next chunk starts from the cell grid again
            drawSkillSpriteFrame(ctx, image, frame, {columns:3, rows:2, angle:0, width, height,
                x:Math.round(at.x + dx * tileW * progress * 0.12), y:Math.round(at.y - height * 0.18)});
            ctx.restore();
        }
        return quadrants.size > 0;
    }

    paintDebris(ctx, footprint, progress) {
        const debris = this.deps.getSkillGemVfxImage('skillFxSlamAftershock');
        if (!debris) return;
        const spread = 0.57 + this.easeOut(progress) * 0.66;
        const { x, y } = footprint.centerPoint;
        const w = Math.round(footprint.width * spread), h = Math.round(footprint.height * spread);
        ctx.globalAlpha = 0.92 * (1 - progress);
        ctx.drawImage(debris, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    }

    shockFront(ctx, footprint, progress) {
        const { x, y } = footprint.centerPoint;
        const reach = 0.4 + this.easeOut(progress) * 0.72;
        const unit = Math.max(1, Math.round(footprint.tileH / 16));
        ctx.globalAlpha = (1 - progress) * 0.82;
        for (const [dx, dy, w] of SHOCK_DOTS) {
            const px = Math.round(x + dx * footprint.width * reach / 2);
            const py = Math.round(y + dy * footprint.height * reach / 2);
            ctx.fillStyle = '#3c292c';
            ctx.fillRect(px - unit, py, unit * (w + 2), unit * 2);
            ctx.fillStyle = '#ffc38b';
            ctx.fillRect(px, py, unit * w, unit);
        }
    }

    paintScars(ctx, footprint, look) {
        const { points, tileW, tileH } = footprint;
        const pixel = Math.min(tileW / 24, tileH / 15) * (look.reduced ? 0.8 : 0.72 + look.progress * 0.4);
        const stride = Math.ceil(points.length / 10);
        const mark = { pixel, ray: look.ray, flip: 1, core: look.reduced ? 0 : 1 - look.progress };
        ctx.fillStyle = this.deps.getEnemyTelegraphColor({ ele: look.element }).edge;
        for (let i = 0; i < points.length; i += stride) {
            mark.flip = (points[i].gx + points[i].gy) % 2 ? -1 : 1;
            impactScar(ctx, points[i], mark);
        }
    }

    /** Under the actors, after the ground warnings (js/canvas-battlefield.js drawEnemyAttackTelegraphs): the landings' flashes and the
     * marks of every live and released boss warning, so the bosses and the hero stand over them (2026-10-19 user: "캐릭터에 가려지도록"). */
    drawMarks(owner, ctx, scene) {
        if (!scene || !scene.projection) return;
        this.drawImpactFlashes(ctx, scene.projection);
        this.drawEdges(ctx, scene);
        for (const { enemy } of (scene.layout || []).filter(row => !row.enemy.patternArea?.woodsman)) {
            const share = this.timing.isLiveWarning(enemy) ? this.timing.warningShare(enemy) : null;
            if (share !== null) this.drawMark(owner, ctx, enemy.patternArea, scene.projection, { share, source: enemy,
                pattern: enemy.nextPatternState, blink: this.blink(share, this.warnMsOf(enemy)) });
        }
        for (const attack of scene.pending || []) {
            if (!this.closesIn(attack)) continue;
            this.drawMark(owner, ctx, attack.bossPattern.area, scene.projection, { share: 1, source: attack.source,
                pattern: attack.bossPattern, blink: this.pendingAlpha() / 7 });
        }
    }

    // ── 몸 ─────────────────────────────────────────────────
    towards(entry, playerPos) {
        const dx = Number(playerPos.x) - Number(entry.x), dy = Number(playerPos.y) - Number(entry.y), length = Math.hypot(dx, dy);
        return length < 0.01 ? { x: 0, y: 0 } : { x: dx / length, y: dy / length };
    }

    latestRelease(enemy, now) {
        let found = null;
        for (const fx of this.deps.battleFx) {
            if (!fx || fx.type !== 'bossRelease' || fx.enemyId !== enemy.id || now < fx.start || now - fx.start > this.MOTION.releaseMs) continue;
            if (!found || fx.start > found.start) found = fx;
        }
        return found;
    }

    /** Height of the hop (0 → on the ground): up fast, hang, then drop to land with the impact. */
    hopHeight(t) {
        if (t >= this.MOTION.landAt) return 0;
        const u = t / this.MOTION.landAt;
        return u < 0.55 ? Math.sin(Math.PI / 2 * u / 0.55) : 1 - Math.pow((u - 0.55) / 0.45, 2);
    }

    /** Area specials hop and slam down (the shadow stays: lift moves only the picture); shots and lines thrust forward. */
    releaseMotion(entry, dir, now, tile) {
        const fx = this.latestRelease(entry.enemy, now);
        // Frozen, stunned or silenced right after letting go: the attack was called off, so no hop that lands on nothing.
        if (!fx || this.timing.isHeld(entry.enemy)) return null;
        const t = this.deps.clampNumber((now - fx.start) / this.MOTION.releaseMs, 0, 1);
        if (!fx.slam) {
            const stride = Math.sin(Math.PI * Math.min(1, t / 0.7)) * this.MOTION.lungeTiles * tile;
            return { progress: t, x: dir.x * stride, y: dir.y * stride };
        }
        const reach = Math.sin(Math.PI * Math.min(1, t / this.MOTION.landAt)) * 0.15 * tile;
        return { progress: t, x: dir.x * reach, y: dir.y * reach, lift: this.hopHeight(t) * this.MOTION.hopTiles * tile };
    }

    /** While warning: lean away from the hero and rear up, trembling over the last part. */
    windUpMotion(entry, dir, now, tile) {
        const share = this.timing.isLiveWarning(entry.enemy) ? this.timing.warningShare(entry.enemy) : null;
        if (share === null) return null;
        const lean = -this.easeOut(share) * this.MOTION.leanTiles * tile;
        const tremble = share > this.MOTION.trembleFrom ? Math.sin(now * 0.09) * 2 * (share - this.MOTION.trembleFrom) / (1 - this.MOTION.trembleFrom) : 0;
        return { progress: 0, x: dir.x * lean + tremble, y: dir.y * lean, lift: this.easeOut(share) * this.MOTION.rearTiles * tile };
    }

    /** drawBattleSprite offsetY for a lifted body (undefined keeps the frame's own offset; the shadow stays on the ground). */
    spriteOffsetY(motion, frame) {
        if (!motion || !(motion.lift > 0)) return undefined;
        return (Number(frame && frame.offsetY) || 0) - motion.lift;
    }

    /** Replaces the bosses' rows in the attack motion map (screen px): the wind-up and the release, never the late hit lunge. */
    addMotions(motions, layout, playerPos, now, tile) {
        if (!playerPos || !(tile > 0)) return motions;
        for (const entry of layout || []) {
            if (!entry.enemy || !entry.enemy.isBoss) continue;
            const dir = this.towards(entry, playerPos);
            const motion = this.releaseMotion(entry, dir, now, tile) || this.windUpMotion(entry, dir, now, tile);
            if (motion) motions[entry.enemy.id] = motion;
            else delete motions[entry.enemy.id];
        }
        return motions;
    }

    // ── 타격 ───────────────────────────────────────────────
    drawShockwaves(ctx, footprint, progress, colour) {
        const rx = Math.max(footprint.width, footprint.tileW) / 2, ry = Math.max(footprint.height, footprint.tileH) / 2;
        ctx.save();
        for (const [delay, width] of [[0, 4], [0.18, 2]]) {
            const t = this.deps.clampNumber((progress - delay) / (1 - delay), 0, 1);
            if (t <= 0 || t >= 1) continue;
            const grow = 0.35 + 1.05 * this.easeOut(t);
            ctx.globalAlpha = (1 - t) * 0.9;
            ctx.strokeStyle = t < 0.25 ? '#fff4de' : colour;
            ctx.lineWidth = width * (1 - t * 0.6);
            ctx.beginPath();
            ctx.ellipse(footprint.x, footprint.y, rx * grow, ry * grow, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    /** Once per impact: debris in the boss's element, a crack left on the ground (areas around a point), the slam sound. */
    land(fx, footprint) {
        this.landed.add(fx);
        const scale = this.deps.clampNumber(Math.max(footprint.width, footprint.tileW) / 96, 0.7, 1.6);
        if (typeof this.deps.attackFxSpawn === 'function') this.deps.attackFxSpawn(fx.element || 'phys', footprint.x, footprint.y, { variant: 'slam', scale, crit: true });
        if (!this.RAY_KINDS.has(fx.footprint.kind)) this.cracks.push({ centre: { ...fx.footprint.center }, cells: Math.max(1, (fx.footprint.radius || 0) * 2 + 1), start: this.deps.performance.now() });
        if (this.cracks.length > 6) this.cracks.shift();
        if (typeof this.deps.playUiFeedbackSound === 'function') this.deps.playUiFeedbackSound('hitSlam');
    }

    /** The released area lands, over the actors: two shockwaves and (once) debris, crack and sound. The cells' flash is on the floor
     * (drawImpactFlashes). */
    drawImpact(ctx, fx, progress, projection) {
        const footprint = this.deps.projectSkillFootprint(fx.footprint, projection);
        if (!footprint) return;
        if (this.onStage()) {
            if (!this.landed.has(fx)) { this.landed.add(fx); if (typeof this.deps.playUiFeedbackSound === 'function') this.deps.playUiFeedbackSound('hitSlam'); }
            return;
        }
        this.drawShockwaves(ctx, footprint, progress, this.deps.getEnemyTelegraphColor({ ele: fx.element }).edge);
        if (!this.landed.has(fx)) this.land(fx, footprint);
    }

    /** Cracks under the actors where areas landed, fading over CRACK_MS (grid cells, so a scrolling map keeps them in place). */
    drawGround(ctx, projection) {
        const image = typeof this.deps.getSkillGemVfxImage === 'function' ? this.deps.getSkillGemVfxImage('skillFxEarthCrack') : null, now = this.deps.performance.now();
        while (this.cracks.length && now - this.cracks[0].start > this.CRACK_MS) this.cracks.shift();
        if (!image || !projection) return;
        for (const crack of this.cracks) {
            const at = projection.cellToScreen(crack.centre.gx, crack.centre.gy), size = projection.tileW * (crack.cells + 0.6);
            ctx.save();
            ctx.globalAlpha = 0.85 * (1 - (now - crack.start) / this.CRACK_MS);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(image, at.x - size / 2, at.y - size / 2 * (projection.tileH / projection.tileW), size, size * (projection.tileH / projection.tileW));
            ctx.restore();
        }
    }

    /** A brief mouth cue on the attached head. Physical bites close two small jaws; breaths light the muzzle. */
    drawHeadRelease(ctx, fx, now) {
        if (fx.type !== 'bossRelease' || !Number.isInteger(fx.cerberusHead)) return;
        const t = (now - fx.start) / 240, mouth = this.deps.stageRoster.headOrigin(fx.enemyId, fx.cerberusHead, null);
        if (!mouth || t < 0 || t >= 1) return;
        const colours = { fire: '#f5ad5d', cold: '#b4e4ee', phys: '#eee0b8' };
        ctx.save();
        ctx.translate(Math.round(mouth.x), Math.round(mouth.y));
        ctx.scale(mouth.west ? -mouth.dot : mouth.dot, mouth.dot);
        ctx.globalAlpha = (1 - t) * 0.85;
        ctx.strokeStyle = colours[fx.element] || '#bca7d6';
        ctx.lineWidth = 2;
        const gap = fx.element === 'phys' ? 8 * (1 - t) : 4 + t * 5;
        ctx.beginPath();
        for (const side of [-1, 1]) {
            ctx.moveTo(0, side * gap); ctx.lineTo(5, side * (gap + 2));
            ctx.lineTo(10, side * gap); ctx.lineTo(14, side * (gap - 3));
        }
        ctx.stroke(); ctx.restore();
    }
}

export function createBossAttacks(deps) {
    const timing = createBossAttackTiming(deps);
    const instance = new BossAttacks(deps, timing);
    return { timing, groundAlpha: instance.groundAlpha.bind(instance), pendingAlpha: instance.pendingAlpha.bind(instance), drawMarks: instance.drawMarks.bind(instance), addMotions: instance.addMotions.bind(instance), spriteOffsetY: instance.spriteOffsetY.bind(instance), drawImpact: instance.drawImpact.bind(instance), drawGround: instance.drawGround.bind(instance), drawHeadRelease: instance.drawHeadRelease.bind(instance), isLiveWarning: timing.isLiveWarning, warningShare: timing.warningShare, now: timing.now };
}
