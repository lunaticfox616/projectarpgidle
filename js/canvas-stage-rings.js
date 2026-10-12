/** 옆에서 보는 무대의 발밑 표시 (2026-10-11 사용자: "내 캐릭터 위치랑 밑에 동그라미도 다시 만들어줘봐"). 예전 표시는 화면 픽셀로 그은
 * 매끈한 타원이라 도트 그림 위에서 겉돌았고, 발끝이 타원 한가운데 줄에 닿아 캐릭터가 타원 뒤쪽에 선 것처럼 보였다.
 * - 그림자: 발밑에 깔리는 납작한 도트 타원. 캐릭터와 같은 도트 크기로 찍는다.
 * - 고리: 그림자 둘레의 한 도트 굵기 타원. 앞쪽(화면 아래) 반은 밝고 뒤쪽 반은 흐리다. 주인공의 고리는 네 토막으로 끊겨 천천히 돈다.
 * - 자리: 표시의 가운데를 발끝보다 조금 위(lift 도트)에 둔다: 발이 타원 한가운데를 딛는다.
 * 색은 누구의 것인지에 따른다(주인공 청록, 적 붉은색, 소환수 초록: js/canvas-battlefield.js RIFT_CELL_TONES와 같은 구분). 그리기만 한다.
 */
const stageRings = (() => {
    const outlines = new Map();   // "rx|ry" → 타원 둘레의 도트 목록 [{x, y, angle}]
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
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.fillStyle = '#080605';
        fillEllipse(ctx, { x: Math.round(at.x), y: Math.round(at.y - LIFT * at.dot), dot: at.dot }, rx, Math.max(2, Math.round(rx * 0.27)));
        ctx.restore();
    }
    /**
     * @param {{x:number,y:number,dot:number}} at the feet (x, lowest dot of the feet) and the size of one dot
     * @param {{tone:string, rx:number, turning?:boolean}} look whose ring, its half width in dots, whether it turns (the hero's)
     */
    function ring(ctx, at, look) {
        const tone = TONES[look.tone] || TONES.enemy, rx = look.rx, ry = Math.max(3, Math.round(rx * 0.34));
        const centre = { x: Math.round(at.x), y: Math.round(at.y - LIFT * at.dot), dot: at.dot };
        const spin = look.turning ? performance.now() / 2600 : 0;
        ctx.save();
        ctx.fillStyle = tone.glow;
        fillEllipse(ctx, centre, rx - 1, ry - 1);
        for (const dot of outlineOf(rx, ry)) {
            // 주인공의 고리는 네 토막: 토막 사이는 비운다
            if (look.turning && ((dot.angle + spin) / (Math.PI / 2)) % 1 > 0.74) continue;
            ctx.fillStyle = dot.y >= 0 ? tone.near : tone.far;
            // 앞쪽 반은 두 도트 굵기: 고리가 바닥에 누운 것으로 읽힌다
            ctx.fillRect(centre.x + dot.x * at.dot, centre.y + dot.y * at.dot, at.dot, at.dot * (look.turning && dot.y > 0 ? 2 : 1));
        }
        ctx.restore();
    }
    return Object.freeze({ shadow, ring, LIFT });
})();
safeExposeGlobals({ stageRings });
