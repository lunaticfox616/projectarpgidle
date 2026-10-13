/** 무대 그림을 도트가 고르게 보이게 찍는다 (2026-10-11 사용자: "보이는 캐릭터 사이즈 좀 작게"). 캐릭터 도트 하나가 캔버스 픽셀의
 * 정수배(1, 2, 3)면 보간 없이 그대로 찍는다. 1.5배 같은 반 걸음에서는 보간 없이 찍으면 도트 너비가 1, 2, 1, 2로 들쭉날쭉하고, 그냥
 * 부드럽게 키우면 전체가 뿌옇다: 먼저 정수배로 키운 다음 절반으로 줄여(네 픽셀의 평균) 도트마다 같은 넓이를 갖게 한다.
 * 주인공, 무대 몬스터, 탐험 물체, 방 그림이 모두 여기를 거친다. 그리기만 한다.
 */
const stageDots = (() => {
    let scratch = null;
    const TILE = 512;   // 큰 그림을 옮길 때 한 번에 다루는 조각(도트)
    const GUARD = 2;    // 작업면에서 그림 둘레에 비워 두는 띠(px)
    const STAMP_PIXELS = 2 * 1024 * 1024; // 고정 물체의 확대 작업면: RGBA 합계 8MB, 최대 32장
    const stamps = [];
    let stampPixels = 0;
    const canvasPx = () => (typeof uiDisplay === 'object' ? uiDisplay.battleRenderScale : 1);
    /** 도트 하나의 캔버스 픽셀 수(scale = 도트 하나의 화면 크기). */
    const pxPerDot = scale => scale * canvasPx();
    const whole = scale => Math.abs(pxPerDot(scale) - Math.round(pxPerDot(scale))) < 0.01;
    /** 반 걸음(1.5, 2.5)이면 두 배 한 정수로 키웠다가 절반으로 줄인다. 그 밖의 배율은 올림한 정수로 키웠다가 줄인다. */
    function upscale(scale) {
        const twice = pxPerDot(scale) * 2;
        return Math.abs(twice - Math.round(twice)) < 0.01 ? Math.round(twice) : Math.ceil(pxPerDot(scale));
    }
    function surface(width, height) {
        if (!scratch) scratch = document.createElement('canvas');
        if (scratch.width < width) scratch.width = width;
        if (scratch.height < height) scratch.height = height;
        const ctx = scratch.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.imageSmoothingEnabled = false;
        // 그림보다 GUARD만큼 넓게 비운다. 줄여 찍을 때 가장자리는 바로 바깥 픽셀까지 섞어 읽는데, 작업면에는 앞서 찍은 더 큰
        // 그림이 남아 있어 그 색이 작은 그림의 오른쪽과 아래 끝에 가는 선으로 묻어 나왔다(2026-10-13 사용자: 미묘한 선이 자꾸 생긴다).
        ctx.clearRect(0, 0, width + GUARD, height + GUARD);
        return ctx;
    }
    /** 고정된 그림만 정수배 확대를 재사용한다. 최종 축소는 매번 목적지에서 하므로 반 도트 위치와 반전도 그대로다. */
    function enlarged(source, from, up, fixed) {
        const width = from.w * up, height = from.h * up, pixels = (width + GUARD) * (height + GUARD);
        if (!fixed || pixels > STAMP_PIXELS) {
            const ctx = surface(width, height);
            ctx.drawImage(source, from.x, from.y, from.w, from.h, 0, 0, width, height);
            return ctx.canvas;
        }
        const key = `${from.x}|${from.y}|${from.w}|${from.h}|${up}`;
        const index = stamps.findIndex(stamp => stamp.source === source && stamp.key === key);
        if (index >= 0) {
            const stamp = stamps.splice(index, 1)[0];
            stamps.push(stamp);
            return stamp.canvas;
        }
        while (stamps.length >= 32 || stampPixels + pixels > STAMP_PIXELS) {
            const old = stamps.shift();
            stampPixels -= old.pixels;
            old.canvas.width = old.canvas.height = 1;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width + GUARD;
        canvas.height = height + GUARD;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source, from.x, from.y, from.w, from.h, 0, 0, width, height);
        stamps.push({ source, key, canvas, pixels });
        stampPixels += pixels;
        return canvas;
    }
    /**
     * @param {CanvasImageSource} source
     * @param {{x:number,y:number,w:number,h:number}} from the dots to draw (source px)
     * @param {{x:number,y:number,scale:number}} at where its top-left lands and the size of one dot (the caller's units)
     * @param {boolean} fixed source pixels never change; only static object images/tints may opt in, never animation canvases
     */
    function blit(ctx, source, from, at, fixed = false) {
        if (!colorFilterOnly(ctx)) return paint(ctx, source, from, at, fixed);
        const bounds = new Path2D();
        bounds.rect(at.x - 1, at.y - 1, from.w * at.scale + 2, from.h * at.scale + 2);
        ctx.save();
        ctx.clip(bounds);
        paint(ctx, source, from, at, fixed);
        const quality = ctx.imageSmoothingQuality;
        ctx.restore();
        ctx.imageSmoothingQuality = quality;
    }
    /** These filters change colour without extending the drawing. Other filters, shadows and composites keep their full bounds. */
    const colorFilterOnly = ctx => /^(?:(?:grayscale|saturate|brightness)\([^)]*\)\s*)+$/.test(ctx.filter)
        && ctx.globalCompositeOperation === 'source-over'
        && !ctx.shadowBlur && !ctx.shadowOffsetX && !ctx.shadowOffsetY;
    function paint(ctx, source, from, at, fixed) {
        const width = from.w * at.scale, height = from.h * at.scale, smooth = ctx.imageSmoothingEnabled;
        if (whole(at.scale)) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(source, from.x, from.y, from.w, from.h, at.x, at.y, width, height);
            ctx.imageSmoothingEnabled = smooth;
            return;
        }
        const up = upscale(at.scale), big = enlarged(source, from, up, fixed);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'low';
        ctx.drawImage(big, 0, 0, from.w * up, from.h * up, at.x, at.y, width, height);
        ctx.imageSmoothingEnabled = smooth;
    }
    /** 도트 그림 한 장을 지금 배율의 캔버스 픽셀 크기로 옮겨 둔 그림(방 그림처럼 한 번 그려 두고 쓰는 큰 그림). 정수배면 그대로 돌려준다. */
    function fitted(source, scale) {
        if (whole(scale)) return source;
        const k = pxPerDot(scale), out = document.createElement('canvas');
        out.width = Math.round(source.width * k);
        out.height = Math.round(source.height * k);
        const ctx = out.getContext('2d');
        for (let y = 0; y < source.height; y += TILE) for (let x = 0; x < source.width; x += TILE) {
            const w = Math.min(TILE, source.width - x), h = Math.min(TILE, source.height - y);
            blitRaw(ctx, source, { x, y, w, h }, { x: x * k, y: y * k, k });
        }
        return out;
    }
    /** blit in canvas px (k px per dot), for fitted. */
    function blitRaw(ctx, source, from, at) {
        const up = Math.abs(at.k * 2 - Math.round(at.k * 2)) < 0.01 ? Math.round(at.k * 2) : Math.ceil(at.k), big = surface(from.w * up, from.h * up);
        big.drawImage(source, from.x, from.y, from.w, from.h, 0, 0, from.w * up, from.h * up);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'low';
        ctx.drawImage(scratch, 0, 0, from.w * up, from.h * up, at.x, at.y, from.w * at.k, from.h * at.k);
    }
    /** 캔버스 픽셀의 정수배가 되도록 올림한 도트 크기: 배경 그림처럼 도트 격자를 스스로 정할 수 있는 그림에 쓴다. */
    const wholeDot = scale => Math.max(1, Math.ceil(pxPerDot(scale) - 0.01)) / canvasPx();
    return Object.freeze({ blit, fitted, whole, wholeDot, colorFilterOnly });
})();
safeExposeGlobals({ stageDots });
