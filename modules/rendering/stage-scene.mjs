/** Live scenery placement consumes prepared assets and queue status. Game state is explicit. */
class StageSceneView {
    constructor(assets, deps) {
        this.assets = assets;
        this.deps = deps;
        this.WIDE = 64;
    }

    /** 주인공이 선 방과 그 방을 그릴 묶음(mode: 'region', 'scene', false). 방 단위 무대가 아니면 mode가 false다. */
    standingRoom(owner) {
        const run = this.deps.actExplorationState.current(owner), map = this.deps.actExplorationDoors.stageMap(run), room = map ? this.deps.actExplorationDoors.room(run) : null;
        return { run, map, room, mode: room ? this.assets.ready(map) : false };
    }

    append(owner, actors, state) {
        const here = this.standingRoom(owner), { run, map, room } = here;
        // 방 그림을 아직 준비하는 중이면(어둠으로 가린 프레임) 소품과 문도 그리지 않는다: 그 조각들은 방 그림과 함께 준비된다.
        if (room && this.deps.stageRoomPictures.roomPictureWaiting(map, room)) return;
        if (here.mode === 'region') this.deps.stageRegion.append(actors, state, here);
        if (here.mode !== 'scene') return;
        const kit = this.assets.kitOf(map), p = state.gridProj, dot = p.tileW / this.WIDE, reach = 400 * dot;
        const doors = this.deps.actExplorationDoors.doorsHere(run).map(row => this.assets.doorPiece(room, row, kit));
        this.assets.piecesOf(map, room, kit).concat(doors).forEach((piece, index) => {
            const x = p.mapX + piece.x * dot, y = p.mapY + piece.y * dot;
            if (x > -reach && x < state.width + reach) actors.push({ kind: 'scenery', id: -2000 - index, y, piece: { ...piece, kit }, point: { x, y } });
        });
    }

    /** 주인공이 이 조각 바로 뒤에 서 있는가(조각이 주인공을 가린다). box = 그림에서 조각이 차지하는 상자. */
    hidesHero(actor, state, size, dot) {
        const hero = state.playerPos, left = actor.point.x - (size[0] / 2 - size[2]) * dot, top = actor.y - size[5] * dot;
        return hero.y < actor.y && hero.y > top && hero.x > left - 4 && hero.x < left + size[4] * dot + 4;
    }

    /** 조각 하나: 가로 가운데를 point.x에, 그림의 맨 아래 줄을 actor.y에 맞춘다. */
    draw(owner, ctx, actor, state) {
        if (actor.piece.doorRow) {
            this.deps.stageDoorMarks.seal.draw(ctx, this.deps.actExplorationState.current(owner), actor.piece.doorRow,
                { x: actor.point.x, y: actor.y, dot: this.deps.stageActors.scaleFor(state.gridProj.tileW) });
            return;
        }
        if (actor.piece.region) { this.deps.stageRegion.draw(ctx, actor, state); return; }
        const { name, kit } = actor.piece, size = kit.pieces[name];
        if (!size || !this.assets.picture(kit, name + '.png')) return;
        const dot = this.deps.stageActors.scaleFor(state.gridProj.tileW);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (this.hidesHero(actor, state, size, dot)) ctx.globalAlpha *= 0.5;
        ctx.drawImage(this.assets.fitted(kit, name + '.png', dot), Math.round(actor.point.x - size[0] / 2 * dot), Math.round(actor.y - (size[3] + size[5]) * dot), this.deps.stageDots.span(size[0] * dot), this.deps.stageDots.span(size[1] * dot));
        ctx.restore();
    }

    /** 열린 좌우 문의 화살표: 뿌리가 접힌 자리에 세운다. 좌우 문은 화면
     * 가장자리에 서서 전장의 조명(주인공에서 멀수록 어둡다)에 묻히므로, 조명을 입힌 뒤에 그린다(js/canvas-battlefield.js가 부른다). */
    drawMarks(owner, ctx, p) {
        const here = this.standingRoom(owner);
        const kit = here.mode === 'scene' ? this.assets.kitOf(here.map) : null;
        if (here.mode === 'region') this.deps.stageRegion.drawMarks(ctx, p, here);
        else if (kit) this.sceneSideMarks(ctx, p, here, kit);
        if (here.room) this.deps.stageDoorMarks.edges(ctx, p, this.deps.actExplorationDoors.doorsHere(here.run), this.deps.viewportSize().width);
    }

    sceneSideMarks(ctx, p, here, kit) {
        const dot = this.deps.stageActors.scaleFor(p.tileW);
        for (const row of this.deps.actExplorationDoors.doorsHere(here.run)) {
            if (row.locked || (row.door.side !== 'west' && row.door.side !== 'east') || this.deps.stageDoorMarks.underFrame(p, row)) continue;
            const piece = this.assets.doorPiece(here.room, row, kit);
            this.deps.stageDoorMarks.arrows(ctx, { cx: p.mapX + piece.x * dot, cy: p.mapY + (piece.y - 20) * dot, w: this.WIDE * dot }, row.door, { dot, thick: 3, upright: true });
        }
    }
}

export function createStageSceneView(assets, deps) {
    const view = new StageSceneView(assets, deps);
    return Object.freeze({
        append: view.append.bind(view), draw: view.draw.bind(view), drawMarks: view.drawMarks.bind(view)
    });
}
