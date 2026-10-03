'use strict';
/* OKLCH → sRGB(0xRRGGBB). 색표 단계를 사람 눈 밝기 기준으로 고르게 만들 때 쓴다. sRGB 밖이면 채도를 줄여 맞춘다. */
const toSrgb = c => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055; return Math.round(Math.max(0, Math.min(1, v)) * 255); };

function labToLinear(L, a, b) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
}

/** L 0..1, C 채도, h 라디안. */
function fromLch(L, C, h) {
    let c = C;
    for (let k = 0; k < 40; k++) {
        const rgb = labToLinear(L, c * Math.cos(h), c * Math.sin(h));
        if (rgb.every(v => v >= -1e-4 && v <= 1 + 1e-4)) return rgb.map(toSrgb).reduce((acc, v) => acc * 256 + v, 0);
        c *= 0.92;
    }
    return labToLinear(L, 0, 0).map(toSrgb).reduce((acc, v) => acc * 256 + v, 0);
}

module.exports = { fromLch };
