const CELL_TONES = {
    enemy: { fill: 'rgba(170, 52, 40, 0.24)', line: 'rgba(226, 116, 94, 0.55)' },
    summon: { fill: 'rgba(110, 200, 140, 0.18)', line: 'rgba(150, 230, 176, 0.5)' },
    area: { fill: 'rgba(214, 170, 92, 0.12)', line: 'rgba(233, 203, 137, 0.42)' },
    target: { fill: 'rgba(233, 180, 84, 0.2)', line: 'rgba(246, 214, 146, 0.9)' }
};
const RING_LOOKS = new Map([[CELL_TONES.summon, 'summon'], [CELL_TONES.target, 'target']]);
const AREA_ALPHA = 0.6;

/** Ground marks consume the domain's cells. Walking rings follow drawn positions, not half-step cell changes. */
export class BattlefieldGround {
    constructor(deps, screen, travel) { this.deps = deps; this.screen = screen; this.travel = travel; }

    gravity(ctx, projection) {
        const field = this.deps.cosmos.gravityView();
        if (!field) return;
        const center = projection.cellToScreen(field.gx, field.gy), radius = projection.tileW * (2.8 - field.progress * 2);
        ctx.save();
        ctx.strokeStyle = '#bba2ef';
        ctx.fillStyle = '#29203f';
        ctx.globalAlpha = .3 + field.progress * .4;
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, radius, radius * .65, 0, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, projection.tileW * .35, projection.tileH * .25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    grid(ctx, projection, targets, areaCells) {
        this.gravity(ctx, projection);
        const map = this.deps.gridSize(), run = this.deps.exploration.current(this.deps.game());
        if (map.tiles) {
            const sealed = this.deps.exploration.gateSealed(run);
            areaCells = areaCells.filter(cell => this.deps.walkable(map, cell, sealed));
        }
        ctx.save();
        this.occupants(ctx, { projection, targets, areaCells });
        ctx.restore();
    }

    occupants(ctx, layers) {
        const { projection, targets, areaCells } = layers;
        if (!projection) return;
        (areaCells || []).forEach(cell => this.areaCell(ctx, projection, cell));
        (this.deps.game().summons || []).forEach(summon => {
            if (summon && !summon.isGhost && summon.alive && (summon.hp || 0) > 0) this.unitRing(ctx, projection, summon, CELL_TONES.summon);
        });
        const locked = this.deps.exploration.lockedEnemy(this.deps.exploration.current(this.deps.game()));
        (this.deps.game().enemies || []).forEach(enemy => {
            if (enemy && enemy.hp > 0 && this.deps.explorationView.inSight(enemy)) {
                this.unitRing(ctx, projection, enemy, enemy === locked ? CELL_TONES.target : CELL_TONES.enemy);
            }
        });
        (targets || []).forEach(hit => this.targetBrackets(ctx, projection, hit && hit.enemy));
    }

    playerRing(ctx, projection, feet) {
        if (!projection || !feet) return;
        return this.deps.rings.ring(ctx, { x: feet.x, y: feet.y, dot: this.deps.actors.scaleFor(projection.tileW) },
            { tone: 'player', rx: 22, turning: true });
    }

    footprint(projection, unit, walking = false) {
        const cells = this.deps.unitCells(unit);
        if (cells.length <= 0) return null;
        const points = cells.map(cell => projection.cellToScreen(cell.gx, cell.gy));
        const xs = points.map(p => p.x), ys = points.map(p => p.y);
        const stride = walking ? this.deps.stride.read(unit, this.deps.visual().visualNow) : null;
        const dx = stride ? stride.dx * projection.tileW : 0, dy = stride ? stride.dy * projection.tileH : 0;
        const left = Math.min(...xs) - projection.tileW / 2 + dx, right = Math.max(...xs) + projection.tileW / 2 + dx;
        const top = Math.min(...ys) - projection.tileH / 2 + dy, bottom = Math.max(...ys) + projection.tileH / 2 + dy;
        return { left, right, top, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 };
    }

    unitRing(ctx, projection, unit, tone) {
        // Boss shadows already locate their bodies; red floor marks stay exclusive to attacks.
        if (unit.isBoss && tone === CELL_TONES.enemy) return;
        const box = this.footprint(projection, unit, tone !== CELL_TONES.summon);
        if (!box) return;
        const rx = (box.right - box.left) * 0.4;
        const cy = box.bottom - projection.tileH * 0.5 + (Number(projection.actorGroundOffsetY) || 0);
        const dot = this.deps.actors.scaleFor(projection.tileW), look = RING_LOOKS.get(tone) || 'enemy';
        return this.deps.rings.ring(ctx, { x: box.cx, y: cy, dot }, { tone: look, rx: Math.round(rx / dot * 0.86), turning: look === 'target' });
    }

    areaCell(ctx, projection, cell) {
        if (!this.deps.hasCell(cell)) return;
        const at = projection.cellToScreen(cell.gx, cell.gy), inset = Math.min(projection.tileW, projection.tileH) * 0.08;
        ctx.globalAlpha = 1;
        ctx.fillStyle = CELL_TONES.area.fill;
        ctx.globalAlpha = AREA_ALPHA;
        ctx.beginPath();
        ctx.ellipse(at.x, at.y, projection.tileW / 2 - inset, projection.tileH / 2 - inset, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    targetBrackets(ctx, projection, unit) {
        const box = this.footprint(projection, unit, true);
        if (!box) return;
        const arm = Math.min(box.right - box.left, box.bottom - box.top) * 0.22;
        const corners = [[box.left, box.top, 1, 1], [box.right, box.top, -1, 1], [box.left, box.bottom, 1, -1], [box.right, box.bottom, -1, -1]];
        ctx.globalAlpha = 1;
        ctx.strokeStyle = CELL_TONES.target.line;
        ctx.lineWidth = 2;
        ctx.beginPath();
        corners.forEach(([x, y, dx, dy]) => {
            ctx.moveTo(x, y + dy * arm);
            ctx.lineTo(x, y);
            ctx.lineTo(x + dx * arm, y);
        });
        ctx.stroke();
    }

    skillAreaCells(name, definition, targets) {
        const player = this.deps.game().gridPlayer;
        const cell = this.deps.hasCell(player) ? player : null;
        const hits = (targets || []).filter(hit => hit && this.deps.hasCell(hit.enemy));
        if (!cell || hits.length <= 0) return [];
        const profile = this.deps.skillProfile(name, definition);
        if (profile.kind === 'chain') return hits.map(hit => ({ gx: hit.enemy.gx, gy: hit.enemy.gy }));
        const cells = this.deps.attackArea(profile, cell, hits[0].enemy), seen = new Set();
        return cells.filter(point => {
            const key = this.deps.cellKey(point.gx, point.gy);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    /** Ground-only remake scope closes before actors; the front scope is independently closed by the lighting pass. */
    draw(ctx, effects, view) {
        this.screen.grade(ctx, view.width, view.height);
        this.playerRing(ctx, view.gridProj, view.playerPos);
        this.deps.sideEncounters.portals(ctx, view.gridProj, this.deps.combatTime());
        this.deps.traps.drawGround(ctx, effects, view.now, view.gridProj);
        this.deps.remake.begin(ctx, view.gridProj);
        if (typeof this.deps.stageEffects === 'object') this.deps.stageEffects.tick(view.now);
        if (typeof this.deps.blessing === 'object') this.deps.blessing.frame(view.now);
        this.deps.tree.castFrame(ctx, view.gridProj, 'ground');
        this.deps.tree.drawQueued(ctx, this.deps.visual().skillEffects || [], view.now, 'ground');
        for (const fx of effects) {
            if (!this.travel.isGround(fx)) continue;
            this.travel.draw(ctx, fx, { now: view.now, projection: view.gridProj, playerPos: view.playerPos, enemyPosMap: view.enemyPosMap });
        }
        this.deps.redrawn.drawLayer('ground', view.now);
        this.deps.summons.drawLayer('ground', view.now);
        this.deps.remake.end();
        if (typeof this.deps.stageEffects === 'object') this.deps.stageEffects.draw(ctx, 'ground', view.gridProj);
        if (typeof this.deps.blessing === 'object') this.deps.blessing.draw(ctx, view.gridProj);
        if (typeof this.deps.ocean === 'object') this.deps.ocean.ground(ctx, view);
        if (typeof this.deps.incidents === 'object') this.deps.incidents.ground(ctx, view);
        this.deps.drawSummons(ctx, view.playerPos, view.now, view.gridProj);
    }
}
