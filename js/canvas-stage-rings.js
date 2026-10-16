/** 옆에서 보는 무대의 발밑 표시 (2026-10-11 사용자: "내 캐릭터 위치랑 밑에 동그라미도 다시 만들어줘봐"). 예전 표시는 화면 픽셀로 그은
 * 매끈한 타원이라 도트 그림 위에서 겉돌았고, 발끝이 타원 한가운데 줄에 닿아 캐릭터가 타원 뒤쪽에 선 것처럼 보였다.
 * - 그림자: 발밑에 깔리는 납작한 도트 타원. 캐릭터와 같은 도트 크기로 찍는다.
 * - 고리: 그림자 둘레의 한 도트 굵기 타원. 앞쪽(화면 아래) 반은 밝고 뒤쪽 반은 흐리다. 주인공의 고리는 네 토막으로 끊겨 천천히 돈다.
 * - 자리: 표시의 가운데를 발끝보다 조금 위(lift 도트)에 둔다: 발이 타원 한가운데를 딛는다.
 * 색은 누구의 것인지에 따른다(주인공 청록, 적 붉은색, 소환수 초록: js/canvas-battlefield.js RIFT_CELL_TONES와 같은 구분). 그리기만 한다.
 * 돌지 않는 고리(적, 소환수)는 색과 크기와 배율마다 한 번 작은 그림으로 그려 두고 찍는다(2026-10-17 측정: 매 프레임 도트마다 칠하던 비용).
 */
const stageRings = (() => {
    const outlines = new Map();   // "rx|ry" → 타원 둘레의 도트 목록 [{x, y, angle}]
    const sprites = new Map();    // "색|rx|도트|배율" → 미리 그린 돌지 않는 고리 { canvas, ox, oy }
    const TONES = Object.freeze({
        player: Object.freeze({ near: '#bdf3e4', far: '#5fa596', glow: 'rgba(120,214,196,0.16)' }),
        enemy: Object.freeze({ near: '#e8826a', far: '#7c3a30', glow: 'rgba(196,70,52,0.14)' }),
        summon: Object.freeze({ near: '#a5e8b8', far: '#4f8a62', glow: 'rgba(110,200,140,0.12)' })
    });
    /** 발끝에서 표시의 가운데까지 올리는 도트 수. */
    const LIFT = 3;

    /** 타원 둘레를 한 도트 굵기로 지나는 도트들(중복 없이). */
    function outlineOf(rx, ry) {
        const key = rx + '|' + ry;
        if (outlines.has(key)) return outlines.get(key);
        const dots = [], seen = new Set(), steps = Math.ceil((rx + ry) * 4);
        for (let i = 0; i < steps; i++) {
            const angle = i / steps * Math.PI * 2, x = Math.round(rx * Math.cos(angle)), y = Math.round(ry * Math.sin(angle));
            if (seen.has(x + ',' + y)) continue;
            seen.add(x + ',' + y);
            dots.push({ x, y, angle });
        }
        outlines.set(key, dots);
        return dots;
    }
    /** 한 줄씩 만든 도트 타원 윤곽을 한 번에 채운다. 사망 필터를 줄마다 반복 적용하지 않고,
     * 반 도트 배율에서 맞닿은 줄의 경계가 반투명 빗금처럼 겹치지 않게 한다. 호출자의 현재 경로는 보존한다. */
    function fillEllipse(ctx, at, rx, ry) {
        const path = new Path2D();
        for (let row = -ry; row <= ry; row++) {
            const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (row * row) / (ry * ry + 0.01))));
            path.rect(at.x - half * at.dot, at.y + row * at.dot, half * 2 * at.dot, at.dot);
        }
        ctx.fill(path);
    }
    /** 발밑 그림자. at = { x, y(발끝), dot } */
    function shadow(ctx, at, rx, alpha) {
        const centre = { x: Math.round(at.x), y: Math.round(at.y - LIFT * at.dot), dot: at.dot };
        const ry = Math.max(2, Math.round(rx * 0.27));
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.fillStyle = '#080605';
        // Death colours also cover the ground shadow. Keep that filter pass local, without clipping its antialiased edge.
        if (stageDots.colorFilterOnly(ctx)) {
            const bounds = new Path2D();
            bounds.rect(centre.x - rx * at.dot - 1, centre.y - ry * at.dot - 1, rx * at.dot * 2 + 2, (ry * 2 + 1) * at.dot + 2);
            ctx.clip(bounds);
        }
        fillEllipse(ctx, centre, rx, ry);
        ctx.restore();
    }
    /** 고리 하나를 칠한다: 안쪽의 옅은 빛과 한 도트 굵기의 둘레. o = { tone, rx, ry, turning, spin } */
    function paintRing(ctx, centre, o) {
        ctx.fillStyle = o.tone.glow;
        fillEllipse(ctx, centre, o.rx - 1, o.ry - 1);
        for (const dot of outlineOf(o.rx, o.ry)) {
            // 주인공의 고리는 네 토막: 토막 사이는 비운다
            if (o.turning && ((dot.angle + o.spin) / (Math.PI / 2)) % 1 > 0.74) continue;
            ctx.fillStyle = dot.y >= 0 ? o.tone.near : o.tone.far;
            // 앞쪽 반은 두 도트 굵기: 고리가 바닥에 누운 것으로 읽힌다
            ctx.fillRect(centre.x + dot.x * centre.dot, centre.y + dot.y * centre.dot, centre.dot, centre.dot * (o.turning && dot.y > 0 ? 2 : 1));
        }
    }
    /** 돌지 않는 고리의 그림: 붓의 배율(scale)만큼 실제 픽셀로 한 번 그려 둔다. 가운데는 (ox, oy) 픽셀. */
    function ringSprite(o, dot, scale) {
        const key = o.name + '|' + o.rx + '|' + dot + '|' + scale;
        if (sprites.has(key)) return sprites.get(key);
        const ox = Math.ceil((o.rx + 2) * dot * scale), oy = Math.ceil((o.ry + 3) * dot * scale), canvas = document.createElement('canvas');
        canvas.width = ox * 2; canvas.height = oy * 2;
        const g = canvas.getContext('2d');
        g.setTransform(scale, 0, 0, scale, ox, oy);
        paintRing(g, { x: 0, y: 0, dot }, o);
        if (sprites.size >= 64) sprites.clear();
        const sprite = { canvas, ox, oy };
        sprites.set(key, sprite);
        return sprite;
    }
    /** 미리 그린 고리를 그 자리의 실제 픽셀에 찍는다(배율만 있는 붓: 전장의 renderScale). 붓의 알파와 색 필터는 그대로 먹는다. */
    function stampRing(ctx, centre, o) {
        const m = ctx.getTransform(), sprite = ringSprite(o, centre.dot, m.a);
        const x = Math.round(m.a * centre.x + m.e), y = Math.round(m.d * centre.y + m.f);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite.canvas, x - sprite.ox, y - sprite.oy);
    }
    /**
     * @param {{x:number,y:number,dot:number}} at the feet (x, lowest dot of the feet) and the size of one dot
     * @param {{tone:string, rx:number, turning?:boolean}} look whose ring, its half width in dots, whether it turns (the hero's)
     */
    function ring(ctx, at, look) {
        const tone = TONES[look.tone] || TONES.enemy, rx = look.rx, ry = Math.max(3, Math.round(rx * 0.34));
        const centre = { x: Math.round(at.x), y: Math.round(at.y - LIFT * at.dot), dot: at.dot };
        const o = { name: look.tone, tone, rx, ry, turning: !!look.turning, spin: look.turning ? performance.now() / 2600 : 0 };
        ctx.save();
        // 그림으로 찍는 것은 배율만 있는 붓일 때(돌리거나 뒤집은 붓, 도는 고리는 그때그때 칠한다)
        const m = ctx.getTransform(), plain = !o.turning && m.b === 0 && m.c === 0 && m.a > 0 && m.a === m.d;
        if (plain) stampRing(ctx, centre, o); else paintRing(ctx, centre, o);
        ctx.restore();
    }
    return Object.freeze({ shadow, ring, LIFT });
})();
safeExposeGlobals({ stageRings });
