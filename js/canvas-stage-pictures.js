/** 무대 그림을 불러와 미리 풀어 두는 한곳 (2026-10-14, docs/stage-render-performance-20261013.md 7번 "처음 그릴 때의 끊김").
 * 불러온 그림(Image)은 처음 그려지는 프레임에서야 풀리고, 푸는 동안 그 프레임이 멈춘다(느린 기기에서 시트 한 장에 15~40ms,
 * 스킬 이펙트 원본 한 장에 300ms 넘게). 여기서 연 그림은 파일을 받아 메인 스레드 밖에서 풀어 둔 것(ImageBitmap)이라 처음 그려도
 * 멈추지 않는다. 대신 풀린 화소를 계속 들고 있다(가로 × 세로 × 4바이트). 그래서 쓰는 쪽이 지금 쓰는 것만 열고, 쓰지 않게 되면 닫는다:
 *   주인공      지금 직업과 무기 자세의 그림(js/canvas-stage-actors.js)
 *   몬스터      지금 지도의 무리와 화면에 나와 있는 것(js/canvas-stage-roster.js)
 *   스킬 이펙트  낀 젬이 쓰는 클립을 자르는 동안의 원본(js/canvas-stage-skill-vfx.js)
 * 밖에서 풀 수 없는 곳(file: 주소, createImageBitmap이나 fetch가 없는 브라우저, 받기에 실패한 때)에서는 예전처럼 Image로 불러온다:
 * 그림은 같고, 처음 그릴 때 풀린다. 게임 상태를 읽지 않는다.
 */
const stagePictures = (() => {
    const canDecodeAway = () => typeof createImageBitmap === 'function' && typeof fetch === 'function' && location.protocol !== 'file:';
    /** 그림이 왔다: source는 drawImage에 넘기는 것(ImageBitmap 또는 Image). */
    function pictureArrived(row, source, width, height) {
        if (row.closed) return;
        Object.assign(row, { source, width, height, ready: width > 0, failed: !(width > 0) });
    }
    /** 예전 방식: Image로 불러온다(처음 그릴 때 풀린다). */
    function loadPlainPicture(row) {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => pictureArrived(row, image, image.naturalWidth, image.naturalHeight);
        image.onerror = () => { row.failed = true; };
        image.src = row.url;
        row.plain = image;
    }
    /** 파일을 받아 메인 스레드 밖에서 푼다. 없는 파일(404)은 실패로 적고, 받기 자체가 안 되면 예전 방식으로 불러온다. */
    function decodePictureAway(row) {
        fetch(row.url).then(response => (response.ok ? response.blob() : null)).then(blob => {
            if (!blob) { row.failed = true; return null; }
            return createImageBitmap(blob);
        }).then(bitmap => {
            if (!bitmap) return;
            if (row.closed) { bitmap.close(); return; }
            pictureArrived(row, bitmap, bitmap.width, bitmap.height);
        }).catch(() => { if (!row.closed && !row.failed) loadPlainPicture(row); });
    }
    /** @param {string} url 그림의 주소
     * @returns {{url:string, source:?CanvasImageSource, ready:boolean, failed:boolean, width:number, height:number}} 그림 한 장.
     *   ready가 참이 되면 source를 그릴 수 있다. 다 쓰면 closePicture로 닫는다. */
    function openPicture(url) {
        const row = { url, source: null, ready: false, failed: false, width: 0, height: 0, closed: false, plain: null };
        if (canDecodeAway()) decodePictureAway(row);
        else loadPlainPicture(row);
        return row;
    }
    /** 풀어 둔 화소를 놓는다. 닫은 그림은 다시 쓰지 않는다. */
    function closePicture(row) {
        row.closed = true;
        row.ready = false;
        if (row.source && typeof row.source.close === 'function') row.source.close();
        if (row.plain) row.plain.src = '';
        row.source = null;
    }
    return Object.freeze({ openPicture, closePicture });
})();
safeExposeGlobals({ stagePictures });
