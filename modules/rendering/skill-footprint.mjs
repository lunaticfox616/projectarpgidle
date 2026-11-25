import { drawGroundDangerSign, drawGroundDangerDye } from './enemy-ground-danger.mjs';
import { paintDangerTiles } from './danger-tiles.mjs';

function strokeGroundBoundary(ctx, color, alpha, outlineOnly) {
    const warning = typeof alpha === 'object' ? alpha : null;
    if (warning) strokeGroundShadow(ctx, warning);
    ctx.globalAlpha = warning?.edge ?? Math.min(1, alpha * (outlineOnly ? 1 : 0.32));
    ctx.strokeStyle = color;
    ctx.lineWidth = warning?.rim || groundBoundaryWidth(warning, outlineOnly);
    ctx.stroke();
}

function strokeGroundShadow(ctx, warning) {
    if (warning.dash) ctx.setLineDash(warning.dash);
    ctx.globalAlpha = warning.dash ? .45 : .66;
    ctx.strokeStyle = '#2b202b';
    ctx.lineWidth = warning.marks > 0 ? 4.2 : 2.8;
    ctx.stroke();
}

function groundBoundaryWidth(warning, outlineOnly) {
    return warning ? (warning.marks > 0 ? 2.2 : 1.25) : outlineOnly ? 2 : 1.2;
}

function drawDangerSigns(ctx, footprint, warning) {
    const { points, tileW, tileH, centerPoint } = footprint;
    const score = point => Math.abs(point.y - centerPoint.y) / tileH;
    const west = points.reduce((a, b) => a.x / tileW + score(a) < b.x / tileW + score(b) ? a : b);
    const front = point => point.x / tileW + (point.y - centerPoint.y) / tileH * 1.55;
    const east = points.reduce((a, b) => front(a) > front(b) ? a : b);
    const tile = { x: west.x, y: west.y, width: tileW, height: tileH };
    if (west === east) return drawGroundDangerSign(ctx, tile, warning.marks);
    drawGroundDangerSign(ctx, tile, warning.marks, 'left');
    drawGroundDangerSign(ctx, { ...tile, x: east.x, y: east.y }, warning.marks, 'right');
}

function drawWarningCracks(ctx, {points,tileW,tileH}, charge) {
    const pixel = Math.max(1, Math.floor(Math.min(tileH / 10, tileW / 22)));
    for (const {x,y,gx,gy} of points) {
        const bend = (Math.abs(gx + 2 * gy) % 3) - 1;
        const cx = Math.round(x);
        const cy = Math.round(Math.min(y + tileH * 0.16, y + tileH / 2 - 4 * pixel - 1));
        paintFaultPreview(ctx, {x:cx,y:cy,bend}, pixel, charge);
    }
}

const FAULT_STEPS = [[-8,2,4],[-5,1,5],[-1,0,5],[3,-1,4],[6,-2,3]];

function paintFaultPreview(ctx, {x,y,bend}, p, charge) {
    ctx.globalAlpha = 0.82 + charge * 0.17;
    const stone = charge < 0.5 ? '#775846' : '#9b7057';
    const seam = charge < 0.66 ? '#c88b55' : '#ffddb0';
    const reach = 1.75 + charge * 3.5;
    for (let index = 0; index < FAULT_STEPS.length; index++) {
        const [dx,dy,w] = FAULT_STEPS[index];
        const left = x + (dx + (index === 2 ? bend : 0)) * p, top = y + dy * p;
        ctx.fillStyle = '#30252d';
        ctx.fillRect(left, top - p, (w + 1) * p, 3 * p);
        ctx.fillStyle = stone;
        ctx.fillRect(left + p, top - p, (w - 1) * p, p);
        ctx.fillStyle = seam;
        const lit = Math.min(w, Math.max(0, Math.floor((reach - index) * w)));
        ctx.fillRect(left, top, lit * p, p);
    }
}

function paintGroundWarningMarks(ctx, footprint, warning) {
    if (warning?.cracks != null) return drawWarningCracks(ctx, footprint, warning.cracks);
    if (warning?.marks > 0) drawDangerSigns(ctx, footprint, warning);
}

function paintWarningDye(ctx, footprint, warning) {
    if (!(warning?.dye > 0)) return;
    const { points, tileW, tileH } = footprint;
    const skip = Math.max(1, Math.ceil(points.length / 24));
    for (let index = 0; index < points.length; index += skip) {
        const {x, y} = points[index];
        drawGroundDangerDye(ctx, { x, y, width: tileW, height: tileH }, warning.dye);
    }
}

/** Render-local cache and read-only scene ports; no combat rules or saved state. */
class SkillFootprintRenderer {
    constructor(deps) {
        this.deps = deps;
        for (const name of ["projectSkillFootprint","clipSkillFootprint","getGroundTakenCellKeys","clipSkillFootprintTerrain","drawSkillFootprintGround","drawSmoothSkillGround"]) this[name] = this[name].bind(this);

    }

    /**
     * Project a cast-time cell snapshot onto the current viewport. No enemy positions are read.
     * @param {ReturnType<typeof getSkillStageFootprint>|undefined} area Cast-time domain geometry.
     * @param {{tileW:number, tileH:number, cellToScreen:function(number,number):{x:number,y:number}}} projection
     * @param {{gx:number,gy:number}|undefined} sourceCell Cast-time origin for the caster's weapon trail.
     * @returns {{points:Array<{gx:number,gy:number,x:number,y:number}>,sourcePoint:{x:number,y:number}|null,tileW:number,tileH:number,x:number,y:number,width:number,height:number,round:boolean,centerPoint:{x:number,y:number},board:{x:number,y:number,width:number,height:number},cone:{vertices:Array<{x:number,y:number}>,length:number,width:number,angle:number}|null}|null}
     */
    projectSkillFootprint(area, projection, sourceCell) {
        if (!area || area.cells.length === 0) return null;
        let points = area.cells.map(cell => ({ ...cell, ...projection.cellToScreen(cell.gx, cell.gy) }));
        let minX = Math.min(...points.map(point => point.x)) - projection.tileW / 2;
        let maxX = Math.max(...points.map(point => point.x)) + projection.tileW / 2;
        let minY = Math.min(...points.map(point => point.y)) - projection.tileH / 2;
        let maxY = Math.max(...points.map(point => point.y)) + projection.tileH / 2;
        let round = area.shape === 'circle';
        if (round) {
            let center = projection.cellToScreen(area.center.gx, area.center.gy);
            minX = center.x - (area.radius + 0.5) * projection.tileW;
            maxX = center.x + (area.radius + 0.5) * projection.tileW;
            minY = center.y - (area.radius + 0.5) * projection.tileH;
            maxY = center.y + (area.radius + 0.5) * projection.tileH;
        }
        let cone = null;
        if (area.cone) {
            let vertices = area.cone.vertices.map(cell => projection.cellToScreen(cell.gx, cell.gy));
            let end = { x: (vertices[1].x + vertices[2].x) / 2, y: (vertices[1].y + vertices[2].y) / 2 };
            cone = { vertices, length: Math.hypot(end.x - vertices[0].x, end.y - vertices[0].y),
                width: Math.hypot(vertices[1].x - vertices[2].x, vertices[1].y - vertices[2].y),
                angle: Math.atan2(end.y - vertices[0].y, end.x - vertices[0].x) };
        }
        let corner = projection.cellToScreen(0, 0);
        return { points, round, cone, centerPoint: projection.cellToScreen(area.center.gx, area.center.gy),
            board: { x: corner.x - projection.tileW / 2, y: corner.y - projection.tileH / 2,
            width: this.deps.getCombatGridSize().columns * projection.tileW, height: this.deps.getCombatGridSize().rows * projection.tileH },
            tileW: projection.tileW, tileH: projection.tileH,
            sourcePoint: sourceCell ? projection.cellToScreen(sourceCell.gx, sourceCell.gy) : null,
            x: (minX + maxX) / 2, y: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
    }

    /** Clip smooth shapes from their cast geometry; other attacks retain the exact cell union. */
    clipSkillFootprint(ctx, footprint, includeCaster = false) {
        if (footprint.round || footprint.cone) {
            ctx.beginPath();
            ctx.rect(footprint.board.x, footprint.board.y, footprint.board.width, footprint.board.height);
            ctx.clip();
            ctx.beginPath();
            if (footprint.cone) {
                let [source, left, right] = footprint.cone.vertices;
                ctx.moveTo(source.x, source.y); ctx.lineTo(left.x, left.y); ctx.lineTo(right.x, right.y); ctx.closePath();
            } else ctx.ellipse(footprint.x, footprint.y, footprint.width / 2, footprint.height / 2, 0, 0, Math.PI * 2);
            ctx.clip();
            return;
        }
        ctx.beginPath();
        footprint.points.forEach(point => ctx.rect(point.x - footprint.tileW / 2,
            point.y - footprint.tileH / 2, footprint.tileW, footprint.tileH));
        // Weapon trails may cross the caster cell; the ground silhouette never marks it as damage.
        if (includeCaster && footprint.sourcePoint) ctx.rect(footprint.sourcePoint.x - footprint.tileW / 2,
            footprint.sourcePoint.y - footprint.tileH / 2, footprint.tileW, footprint.tileH);
        ctx.clip();
    }

    /** Open floor nobody stands on: a standing object's cell (a chest, an unbroken pot, crate or nest) and the story guide's
     * (js/act-exploration-state.js standsTaken). Ground warnings are not painted over them (2026-10-19 user: not on walls or obstacles). */
    getGroundTakenCellKeys(run) {
        if (!run) return new Set();
        const taken = this.deps.actExplorationState.objects.solidCells(run);
        this.deps.actExplorationDoors.guideCells(run).forEach(key => taken.add(key));
        return taken;
    }

    /** Ground display intersects walkable terrain without the obstacles' cells; the immutable cast geometry still owns damage membership. */
    clipSkillFootprintTerrain(ctx, footprint, rise = 0) {
        const map=this.deps.getCombatGridSize(),run=this.deps.currentRun();
        if(map.tiles) {
            const sealed=!!run && this.deps.actExplorationState.gateSealed(run),taken=this.getGroundTakenCellKeys(run);
            const x0=Math.max(0,Math.floor((footprint.x-footprint.width/2-footprint.board.x)/footprint.tileW));
            const y0=Math.max(0,Math.floor((footprint.y-footprint.height/2-footprint.board.y)/footprint.tileH));
            const x1=Math.min(map.columns,Math.ceil((footprint.x+footprint.width/2-footprint.board.x)/footprint.tileW));
            const y1=Math.min(map.rows,Math.ceil((footprint.y+footprint.height/2-footprint.board.y)/footprint.tileH));
            ctx.beginPath();
            for(let index=0;index<(x1-x0)*(y1-y0);index++) {
                const gx=x0+index%(x1-x0),gy=y0+Math.floor(index/(x1-x0));
                if(!this.deps.actExplorationMap.walkable(map,{gx,gy},sealed)||taken.has(this.deps.gridCellKey(gx,gy)))continue;
                ctx.rect(footprint.board.x+gx*footprint.tileW,footprint.board.y+gy*footprint.tileH-rise,footprint.tileW,footprint.tileH+rise);
            }
            ctx.clip();
        }
    }

    /** A faint continuous ground silhouette; only exterior edges, never a grid of cell borders. */
    drawSkillFootprintGround(ctx, footprint, color, alpha, outlineOnly = false) {
        ctx.save();
        this.clipSkillFootprintTerrain(ctx, footprint);
        if (footprint.round || footprint.cone) {
            this.drawSmoothSkillGround(ctx, footprint, color, alpha, outlineOnly);
            ctx.restore();
            return;
        }
        if (typeof alpha === 'object' && (alpha.rootlet || alpha.later)) {
            paintDangerTiles(ctx, footprint, { charge: alpha.cracks ?? 0, later: !!alpha.later });
            ctx.restore();
            return;
        }
        if (alpha?.dash) this.clipSkillFootprint(ctx, footprint);
        this.drawGroundCells(ctx, footprint, {color, look: alpha, outlineOnly});
        paintWarningDye(ctx, footprint, alpha);
        paintGroundWarningMarks(ctx, footprint, alpha);
        ctx.restore();
    }

    drawGroundCells(ctx, footprint, {color, look, outlineOnly}) {
        let keys = new Set(footprint.points.map(point => `${point.gx},${point.gy}`));
        let halfW = footprint.tileW / 2, halfH = footprint.tileH / 2;
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';
        ctx.fillStyle = look?.fillColor ?? color;
        // Canvas ignores a globalAlpha above 1 (it keeps the previous value), so strong warnings and impact flashes clamp.
        ctx.globalAlpha = typeof look === 'object' ? look.fill : Math.min(1, look * 0.07);
        ctx.beginPath();
        footprint.points.forEach(point => ctx.rect(point.x - halfW, point.y - halfH, footprint.tileW, footprint.tileH));
        if (!outlineOnly) ctx.fill();
        ctx.beginPath();
        footprint.points.forEach(point => {
            let edges = [[0, -1, -halfW, -halfH, halfW, -halfH], [1, 0, halfW, -halfH, halfW, halfH],
                [0, 1, halfW, halfH, -halfW, halfH], [-1, 0, -halfW, halfH, -halfW, -halfH]];
            edges.forEach(edge => {
                const [dx, dy, x1, y1, x2, y2] = edge;
                if (keys.has(`${point.gx + dx},${point.gy + dy}`)) return;
                ctx.moveTo(point.x + x1, point.y + y1);
                ctx.lineTo(point.x + x2, point.y + y2);
            });
        });
        strokeGroundBoundary(ctx, look?.edgeColor ?? color, look, outlineOnly);
    }

    /** The smooth boundary uses the same cell-center geometry as combat, including at board edges. */
    drawSmoothSkillGround(ctx, footprint, color, alpha, outlineOnly = false) {
        ctx.save();
        this.clipSkillFootprint(ctx, footprint);
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';
        ctx.fillStyle = color;
        // clipSkillFootprint leaves the circle/triangle as the current path.
        ctx.globalAlpha = typeof alpha === 'object' ? alpha.fill : Math.min(1, alpha * 0.035);
        if (!outlineOnly) ctx.fill();
        const edge = typeof alpha === 'number' && !outlineOnly ? alpha * 0.875 : alpha;
        strokeGroundBoundary(ctx, color, edge, outlineOnly);
        paintWarningDye(ctx, footprint, alpha);
        paintGroundWarningMarks(ctx, footprint, alpha);
        ctx.restore();
    }

    api() { return { projectSkillFootprint: this.projectSkillFootprint, clipSkillFootprint: this.clipSkillFootprint, getGroundTakenCellKeys: this.getGroundTakenCellKeys, clipSkillFootprintTerrain: this.clipSkillFootprintTerrain, drawSkillFootprintGround: this.drawSkillFootprintGround }; }
}

export function createSkillFootprintRenderer(deps) {
    return new SkillFootprintRenderer(deps).api();
}
