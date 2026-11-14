import { createStageDots } from './rendering/stage-dots.mjs';

const stageDots = createStageDots({
    get document() { return document; },
    get performance() { return performance; },
    get Path2D() { return Path2D; },
    get HTMLImageElement() { return HTMLImageElement; },
    get ImageBitmap() { return ImageBitmap; },
    get uiDisplay() { return typeof uiDisplay === 'undefined' ? undefined : uiDisplay; }
});
safeExposeGlobals({ stageDots });
