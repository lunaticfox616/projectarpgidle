const WAITS_MS = Object.freeze([800, 2000, 5000, 15000]), LATER_MS = 60000;
/** @param {number} tries Completed retries. Delay in milliseconds. */
export const waitMs = tries => WAITS_MS[tries] ?? LATER_MS;
export const retryUrl = (src, tries) => `${src}${src.includes('?') ? '&' : '?'}retry=${tries}`;
export const loaded = picture => !!picture && picture.complete && picture.naturalWidth > 0;

/** Stable image identity; retry only while its owner still wants it. No listeners or timers before image(). */
export function createStageAssetRetry({ createImage, scheduleImageRetry }) {
    function image(src, wanted = () => true) {
        const picture = createImage();
        let tries = 0;
        picture.decoding = 'async';
        picture.onerror = () => {
            picture.dataset.failed = '1';
            scheduleImageRetry(() => {
                if (!wanted()) return;
                delete picture.dataset.failed;
                tries += 1;
                picture.src = retryUrl(src, tries);
            }, waitMs(tries));
        };
        picture.src = src;
        return picture;
    }
    return Object.freeze({ image, loaded, waitMs, retryUrl });
}
