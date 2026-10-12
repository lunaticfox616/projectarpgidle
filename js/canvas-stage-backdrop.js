/** 방 단위 무대의 배경 그림 (2026-10-11 사용자: "바닥이랑 오브젝트만 놔두고, 벽 대신 이런 느낌의 배경으로"). 지형마다 그림 한 장
 * (data/stage-view.js STAGE_BACKDROPS)을 방 바닥의 뒤쪽 끝(바닥선) 위에 세운다. 그림은 위쪽이 배경이고 아래쪽은 바닥이 놓일 빈 띠다:
 * 빈 띠는 쓰지 않고, 배경 부분만 바닥선에 밑을 맞춰 화면 너비를 덮게 키운다. 캐릭터 도트와 같은 크기의 도트로 다시 찍어 그린다.
 * 그림 파일이 없는 판(그림은 아직 저장소에 넣지 않는다)에서는 ready가 거짓이라 벽돌 뒷벽 그대로다. 그리기만 한다.
 */
const stageBackdrop = (() => {
    const images = new Map();   // 파일 이름 → Image
    let dotted = null;          // { key, canvas }: 지금 크기로 도트를 다시 찍은 그림

    /** 지형의 배경 규격(그림 파일, 바닥선, 바닥 색), 없으면 null. */
    function look(map) {
        return (typeof STAGE_BACKDROPS === 'object' && map && STAGE_BACKDROPS.biomes[map.biome]) || null;
    }
    /** 그림 폴더의 파일 하나: 다 불러왔으면 그 그림, 아니면 null(없는 파일도 null로 남는다). */
    function pieceOf(file) {
        if (!images.has(file)) {
            const image = new Image();
            image.decoding = 'async';
            image.src = STAGE_BACKDROPS.path + file;
            images.set(file, image);
        }
        const image = images.get(file);
        return image.complete && image.naturalWidth > 0 ? image : null;
    }
    const imageOf = spec => pieceOf(spec.file);
    /** 지형의 층 그림(STAGE_BACKDROPS의 layers: back 뒤쪽 띠, ground 바닥 무늬)이 정해져 있고 불러와졌으면 { image, spec }, 아니면 null:
     * 그때는 그 층을 코드로 그린 임시 그림이 대신한다(js/canvas-stage-sanctum.js). */
    function layer(map, name) {
        const spec = look(map), row = spec && spec.layers ? spec.layers[name] : null, image = row ? pieceOf(row.file) : null;
        return image ? { image, spec: row } : null;
    }
    /** 불러와진 층 그림의 수: 하나가 새로 오면 방 그림을 다시 그린다(js/canvas-stage-rooms.js). */
    function layersReady(map) {
        const spec = look(map);
        return spec && spec.layers ? Object.keys(spec.layers).filter(name => layer(map, name)).length : 0;
    }
    /** 이 지도를 배경 그림으로 그릴 수 있는가: 지형에 그림이 정해져 있고, 그 파일이 이 서버에 있고, 테스트 패널에서 끄지 않았을 때. */
    function ready(map) {
        const spec = look(map);
        return !!spec && stageView.backdrops() && !!imageOf(spec);
    }
    /** 그림의 배경 부분을 한 도트가 버퍼 1px이 되게 줄여 둔다(부드럽게 줄이고, 그릴 때는 보간 없이 키운다). */
    function dottedCopy(image, spec, size) {
        const key = [spec.file, size.w, size.h, size.dot].join(':');
        if (dotted && dotted.key === key) return dotted.canvas;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(size.w / size.dot));
        canvas.height = Math.max(1, Math.round(size.h / size.dot));
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight * spec.ground, 0, 0, canvas.width, canvas.height);
        dotted = { key, canvas };
        return canvas;
    }
    /**
     * @param {{width:number, groundY:number, dot:number, drift:number, slack:number}} view canvas px: the screen's width, where the
     *   floor begins, one character dot, how far the room's centre sits from the screen's (the picture follows by parallax of that),
     *   and how far that can go at most on either side.
     * @returns {boolean} whether the picture was drawn
     */
    function draw(ctx, map, view) {
        const spec = look(map), image = spec && imageOf(spec);
        if (!image) return false;
        const srcH = image.naturalHeight * spec.ground, share = STAGE_BACKDROPS.parallax;
        const scale = Math.max((view.width + view.slack * share * 2) / image.naturalWidth, view.groundY / srcH);
        const w = Math.round(image.naturalWidth * scale), h = Math.round(srcH * scale);
        const copy = dottedCopy(image, spec, { w, h, dot: view.dot });
        const x = Math.max(view.width - w, Math.min(0, (view.width - w) / 2 + view.drift * share));
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(copy, Math.round(x), Math.round(view.groundY - h), w, h);
        return true;
    }
    return Object.freeze({ look, ready, draw, layer, layersReady });
})();
safeExposeGlobals({ stageBackdrop });
