import { createStagePictures } from './browser/stage-pictures.mjs';

const native = createStagePictures({
    get createImageBitmap() { return typeof createImageBitmap === 'function' ? createImageBitmap.bind(globalThis) : undefined; },
    get fetch() { return typeof fetch === 'function' ? fetch.bind(globalThis) : undefined; },
    get location() { return location; },
    get stageAssetRetry() { return stageAssetRetry; },
    get setTimeout() { return setTimeout.bind(globalThis); },
    get Image() { return Image; }
});
const stagePictures = Object.freeze({
    openPicture: native.openPicture,
    closePicture: native.closePicture
});
safeExposeGlobals({ stagePictures });
