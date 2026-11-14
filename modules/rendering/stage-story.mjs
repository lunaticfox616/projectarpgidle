/** 장면 상태 그림(GPT가 만든 묶음, data/stage-story-art.js)을 옆에서 보는 무대에 그린다. 어디에 언제는 data/stage-view.js STAGE_STORY
 * (2026-10-18 사용자: GPT가 새로 뽑은 그림을 "일단 넣고 어느 장면에 넣었는지 보여줘").
 * - 구조물: 이야기 액트 보스 방의 바닥 뒤쪽 끝 가운데에 하나(액트 2, 4 황금 수액관, 5 하켄의 뿌리 다리, 9 어머니의 고치). 정한 보스가
 *   쓰러지면 다음 상태들을 그 프레임 시간대로 보여 주고 마지막 장에 멈춘다. 쓰러짐을 이 화면에서 처음 본 때부터 센다(불러온 판에서
 *   이미 쓰러져 있었으면 바로 마지막 장).
 * - 다시 일어나는 보스(STAGE_STORY_ART.revives, 액트 2 부제녀): 쓰러짐 그림이 끝나면 그 자리에서 일어나는 그림을 잇는다
 *   (js/canvas-battlefield.js drawBossDefeat가 부른다).
 * - 탐험 물체: 목재 상자, 봉인된 보물함, 알집을 액트 재질의 그림으로(js/canvas-stage-objects.js가 지역 그림보다 먼저 묻는다).
 * 그림은 받은 프레임 그대로 찍는다(늘이거나 기울이지 않는다). 그리기만 하고 전투와 길 찾기에는 닿지 않는다.
 */
class StageStory {
    constructor(deps) {
        this.deps = deps;
        this.WIDE = 64;
        this.DEEP = 32;
        this.APPEAR_MS = 300;
        this.sheets = new Map();
        this.rims = new Map();
        this.fallen = new WeakMap();
    }

    // 탐험 판 → Map(액트 → 정한 보스가 쓰러진 것을 본 때, 처음부터 쓰러져 있었으면 -Infinity)
    clipOf(id) { return Object.hasOwn(this.deps.STAGE_STORY_ART.clips, id) ? this.deps.STAGE_STORY_ART.clips[id] : null; }

    /** 그 묶음의 시트가 풀렸으면 Image, 아니면 null(처음 부를 때 불러 둔다). */
    sheet(id) {
        if (!this.sheets.has(id)) this.sheets.set(id, this.deps.stageAssetRetry.image(`${this.deps.STAGE_STORY_ART.path}${id}.png?v=${this.deps.STAGE_STORY_ART.version}`));
        const image = this.sheets.get(id);
        return this.deps.stageAssetRetry.loaded(image) ? image : null;
    }

    /** order의 프레임을 ms[프레임] 동안씩 보여 주고 마지막에 멈출 때, elapsed ms 뒤의 프레임. */
    frameAfter(order, ms, elapsed) {
        let left = elapsed;
        for (let i = 0; i < order.length - 1; i++) {
            if (left < ms[order[i]]) return order[i];
            left -= ms[order[i]];
        }
        return order[order.length - 1];
    }

    /** art = { image, clip, index }의 한 장을 at = { x, y 발 자리(화면 px), dot 배율 }에 찍는다. */
    blit(ctx, art, at) {
        const { image, clip, index } = art;
        this.deps.stageDots.blit(ctx, image, { x: index * clip.w, y: 0, w: clip.w, h: clip.h },
            { x: Math.round(at.x - clip.feet[0] * at.dot), y: Math.round(at.y - clip.feet[1] * at.dot), scale: at.dot }, true);
    }

    /** 그 보스(보스 무리의 stage)가 쓰러진 것을 처음 본 때: 아직이면 null. */
    fallenAt(run, act, stage) {
        if (!this.fallen.has(run)) this.fallen.set(run, new Map());
        const seen = this.fallen.get(run), pack = run.packs.find(row => row.stage === stage);
        const down = !!pack && pack.aliveIds.length === 0 && !pack.waiting.length;
        if (!seen.has(act)) seen.set(act, down ? -Infinity : null);
        if (down && seen.get(act) === null) seen.set(act, this.deps.performance.now());
        return seen.get(act);
    }

    /** 지금 보여 줄 { index, alpha }, 숨어 있으면 null. */
    pieceFrame(run, act, rule, clip) {
        if (!Number.isInteger(rule.after)) return { index: 0, alpha: 1 };
        const at = this.fallenAt(run, act, rule.after);
        if (at === null) return rule.hidden ? null : { index: 0, alpha: 1 };
        const elapsed = this.deps.performance.now() - at, order = [...Array(clip.frames).keys()].slice(rule.hidden ? 0 : 1);
        return { index: this.frameAfter(order, clip.ms, elapsed), alpha: rule.hidden ? Math.min(1, elapsed / this.APPEAR_MS) : 1 };
    }

    /** 전장 그리기의 배우 목록에 이 방의 구조물을 끼운다(이야기 액트의 보스 방일 때만, 깊이 순서는 발 자리의 화면 y). */
    append(owner, actors, state) {
        const run = this.deps.actExplorationState.current(owner), map = run ? this.deps.actExplorationDoors.stageMap(run) : null;
        const room = map ? this.deps.actExplorationDoors.room(run) : null, rule = room && room.role === 'boss' ? this.deps.STAGE_STORY.pieces[run.act] : null;
        const clip = rule ? this.clipOf(rule.clip) : null;
        if (!clip) return;
        const shown = this.pieceFrame(run, run.act, rule, clip), p = state.gridProj;
        if (!shown) return;
        const dot = p.tileW / this.WIDE, x = p.mapX + (room.x0 + room.x1 + 1) / 2 * this.WIDE * dot, y = p.mapY + (room.y0 * this.DEEP + rule.depth) * dot;
        actors.push({ kind: 'scenery', id: -3000 - run.act, y, storyPiece: { clip: rule.clip, scale: rule.scale, ...shown }, point: { x, y } });
    }

    draw(ctx, actor, state) {
        const piece = actor.storyPiece, clip = this.clipOf(piece.clip), image = this.sheet(piece.clip);
        if (!clip || !image) return;
        ctx.save();
        ctx.globalAlpha *= piece.alpha;
        this.blit(ctx, { image, clip, index: piece.index }, { x: actor.point.x, y: actor.y, dot: this.deps.stageActors.scaleFor(state.gridProj.tileW) * piece.scale });
        ctx.restore();
    }

    /** 그 보스의 일어남 { clip, start, fadeFrom, total }(ms, 쓰러짐 효과 기준), 없으면 null. */
    revive(enemy) {
        const key = enemy && enemy.bossAssetKey;
        return key && Object.hasOwn(this.deps.STAGE_STORY_ART.revives, key) ? this.deps.STAGE_STORY_ART.revives[key] : null;
    }

    /** 쓰러짐 효과가 rise.start를 지난 뒤: 일어나는 그림을 보스 자리에 그린다(p는 js/canvas-stage-roster.js drawDeath와 같다). 그림이
     * 아직 풀리지 않았으면 false: 부른 쪽이 쓰러짐의 마지막 장을 그대로 그린다. */
    drawRevive(owner, ctx, enemy, p, rise) {
        const clip = this.clipOf(rise.clip), image = this.sheet(rise.clip);
        if (!clip || !image) return false;
        const order = [...Array(clip.frames).keys()];
        return this.deps.stageRoster.drawClip(owner, ctx, enemy, p, { source: image, clip, index: this.frameAfter(order, clip.ms, p.deathMs - rise.start) });
    }

    /** 그 물체 그림 이름의 { id, clip, image, index, scale }, 장면 상태 그림이 없는 물체면 null. */
    objectArt(owner, look) {
        const rule = Object.hasOwn(this.deps.STAGE_STORY.objects.names, look.name) ? this.deps.STAGE_STORY.objects.names[look.name] : null;
        if (!rule) return null;
        const run = this.deps.actExplorationState.current(owner), act = run && run.act;
        const id = `${rule[0]}-${this.deps.STAGE_STORY.objects.themes[act] || 'root'}`, clip = this.clipOf(id), image = clip ? this.sheet(id) : null;
        return image ? { id, clip, image, index: rule[1], scale: this.deps.STAGE_STORY.objects.scale } : null;
    }

    /** @param {{name:string}} look @param {{x:number,y:number,dot:number}} at 발 자리와 도트 하나의 크기 @returns {boolean} 그렸는지 */
    drawObject(owner, ctx, look, at) {
        const art = this.objectArt(owner, look);
        if (!art) return false;
        this.blit(ctx, art, { x: at.x, y: at.y, dot: at.dot * art.scale });
        return true;
    }

    silhouette(art, colour) {
        const key = `${art.id}|${art.index}|${colour}`;
        if (this.rims.has(key)) return this.rims.get(key);
        const canvas = this.deps.document.createElement('canvas'), c = canvas.getContext('2d');
        canvas.width = art.clip.w;
        canvas.height = art.clip.h;
        c.drawImage(art.image, art.index * art.clip.w, 0, art.clip.w, art.clip.h, 0, 0, art.clip.w, art.clip.h);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = colour;
        c.fillRect(0, 0, art.clip.w, art.clip.h);
        this.rims.set(key, canvas);
        return canvas;
    }

    /** 누를 수 있는 물체의 밝은 테(그림 둘레에 한 도트). 장면 상태 그림이 없는 물체면 false. */
    outlineObject(owner, ctx, look, at, colour) {
        const art = this.objectArt(owner, look);
        if (!art) return false;
        const rim = { image: this.silhouette(art, colour), clip: art.clip, index: 0 }, dot = at.dot * art.scale;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.blit(ctx, rim, { x: at.x + dx * at.dot, y: at.y + dy * at.dot, dot });
        return true;
    }

    /** 그 물체 그림의 맨 위(화면 px), 장면 상태 그림이 없는 물체면 null. */
    objectTop(owner, look, at) {
        const art = this.objectArt(owner, look);
        return art ? at.y - art.clip.feet[1] * at.dot * art.scale : null;
    }
}

export function createStageStory(deps) {
    const instance = new StageStory(deps);
    return Object.freeze({ append: instance.append.bind(instance), draw: instance.draw.bind(instance), revive: instance.revive.bind(instance), drawRevive: instance.drawRevive.bind(instance), drawObject: instance.drawObject.bind(instance), outlineObject: instance.outlineObject.bind(instance), objectTop: instance.objectTop.bind(instance) });
}
