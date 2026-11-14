// GENERATED from modules/stage-asset-retry*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/stage-asset-retry.mjs
  var WAITS_MS = Object.freeze([800, 2e3, 5e3, 15e3]);
  var LATER_MS = 6e4;
  var waitMs = (tries) => WAITS_MS[tries] ?? LATER_MS;
  var retryUrl = (src, tries) => `${src}${src.includes("?") ? "&" : "?"}retry=${tries}`;
  var loaded = (picture) => !!picture && picture.complete && picture.naturalWidth > 0;
  function createStageAssetRetry({ createImage, scheduleImageRetry }) {
    function image(src, wanted = () => true) {
      const picture = createImage();
      let tries = 0;
      picture.decoding = "async";
      picture.onerror = () => {
        picture.dataset.failed = "1";
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

  // modules/stage-asset-retry-classic.mjs
  var stageAssetRetry = createStageAssetRetry({ createImage: () => new Image(), scheduleImageRetry: (fn, ms) => setTimeout(fn, ms) });
  safeExposeGlobals({ stageAssetRetry });
})();
