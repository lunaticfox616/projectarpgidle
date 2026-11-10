/** 무대 그림을 다시 받는다 (2026-11-11 사용자: "Error 503 Maximum threads for service reached"가 뜨면서 그림이 가끔 안 나오고 예전 맵으로
 * 돌아갔다). GitHub Pages 앞단(Fastly)이 몰린 요청을 503으로 거절하면, 그 그림은 접속 내내 빠지고 지역 무대는 예전 무대로 떨어졌다.
 * 받지 못한 그림은 0.8초, 2초, 5초, 15초 뒤에 다시 받고, 그 뒤로는 1분마다 받는다. 주소에 retry 열쇠를 붙여 브라우저나 앞단이 실패한
 * 응답을 그대로 돌려주지 않게 한다. 그림 요소는 바뀌지 않으므로 부르는 쪽은 지금처럼 complete와 naturalWidth로 도착을 본다.
 * 다시 받기를 기다리는 동안 그림의 dataset.failed는 '1'이다. 그리기만 하는 쪽의 도구라 게임 상태는 건드리지 않는다.
 */
const stageAssetRetry = (() => {
    const WAITS_MS = Object.freeze([800, 2000, 5000, 15000]), LATER_MS = 60000;
    /** @param {number} tries 지금까지 다시 받은 횟수 @returns {number} 다음 다시 받기까지 기다릴 시간(ms) */
    const waitMs = tries => WAITS_MS[tries] ?? LATER_MS;
    /** 같은 파일을 가리키되 캐시에 남은 실패 응답을 비켜 가는 주소. */
    const retryUrl = (src, tries) => `${src}${src.includes('?') ? '&' : '?'}retry=${tries}`;
    /** @param {string} src 그림 주소
     * @param {() => boolean} [wanted] 다시 받기 직전에 묻는다: 거짓이면 그만둔다(부르는 쪽이 그 그림을 놓았을 때)
     * @returns {HTMLImageElement} 받지 못하면 스스로 다시 받는 그림 */
    function image(src, wanted = () => true) {
        const picture = new Image();
        let tries = 0;
        picture.decoding = 'async';
        picture.onerror = () => {
            picture.dataset.failed = '1';
            setTimeout(() => {
                if (!wanted()) return;
                delete picture.dataset.failed;
                tries += 1;
                picture.src = retryUrl(src, tries);
            }, waitMs(tries));
        };
        picture.src = src;
        return picture;
    }
    /** @returns {boolean} 그림이 와서 그릴 수 있는가 */
    const loaded = picture => !!picture && picture.complete && picture.naturalWidth > 0;
    return Object.freeze({ image, loaded, waitMs, retryUrl });
})();
safeExposeGlobals({ stageAssetRetry });
