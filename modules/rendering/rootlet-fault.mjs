import { paintRootletEarthPlates } from './rootlet-earth-plates.mjs';

/** @type {Array<[number, number, number, number]>} */
const SIDES = [[-.5,-.5,1,0], [.5,-.5,0,1], [.5,.5,-1,0], [-.5,.5,0,-1]];

function warningHeat(charge) {
    return Math.max(0, (charge - .46) / .54) ** 1.45;
}

export function rootletWarningLook(warning) {
    const heat = warningHeat(warning.cracks);
    const fill = `rgb(${Math.round(97 + heat * 88)},${Math.round(30 + heat * 23)},${Math.round(48 - heat * 10)})`;
    const edge = `rgb(${Math.round(195 + heat * 60)},${Math.round(111 + heat * 75)},${Math.round(103 + heat * 12)})`;
    return { ...warning, fillColor: fill, edgeColor: edge, fill: .43 + heat * .36, edge: .76 + heat * .24, rim: 2.2 + heat * 3 };
}

function blitFault(ctx, image, footprint, {reach,opacity,depth=.9}) {
    const {centerPoint, tileW, tileH} = footprint;
    const width = Math.round(tileW * reach);
    const height = Math.round(tileH * reach * depth);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = opacity;
    ctx.drawImage(image, Math.round(centerPoint.x - width / 2), Math.round(centerPoint.y - height / 2), width, height);
}

export function paintRootletWarning(ctx, footprint, image, {outer,cracks:charge}) {
    const reach = outer ? 5.58 : 3.4, heat = warningHeat(charge);
    ctx.filter = 'brightness(.61) saturate(.56)';
    blitFault(ctx, image, footprint, {reach, opacity:.81, depth:1});
    if (heat < .045) return;
    ctx.filter = 'sepia(1) saturate(3) brightness(1.55)';
    ctx.globalCompositeOperation = 'screen';
    blitFault(ctx, image, footprint, {reach, opacity:.39 * heat, depth:1});
}

function chipEdge(ctx, {x,y,seed}, {tileW,tileH}, [sx,sy,dx,dy]) {
    for (let index = 0; index < 5; index++) {
        const t = .11 + .19 * index;
        const notch = .05 + ((seed >> (index + dx + dy + 1)) & 3) * .036;
        ctx.lineTo(x + (sx + dx * t - dy * notch) * tileW, y + (sy + dy * t + dx * notch) * tileH);
    }
}

// Slightly recessed stone edges sit within the authoritative outer clip.
// Shared interior edges stay joined so a wave never looks like a grid of decals.
function clipFracturedRim(ctx, {points,tileW,tileH}) {
    const cells = new Set(points.map(({gx,gy}) => `${gx}:${gy}`));
    ctx.beginPath();
    for (const {x,y,gx,gy} of points) {
        ctx.moveTo(x - tileW / 2, y - tileH / 2);
        const seed = (Math.imul(gx, 73) ^ Math.imul(gy, 29)) >>> 0;
        for (const side of SIDES) {
            const [sx,sy,dx,dy] = side;
            if (!cells.has(`${gx+dy}:${gy-dx}`)) chipEdge(ctx, {x,y,seed}, {tileW,tileH}, side);
            ctx.lineTo(x + (sx + dx) * tileW, y + (sy + dy) * tileH);
        }
        ctx.closePath();
    }
    ctx.clip();
}

export function paintRootletContact(ctx, footprint, {progress,reduced,outer}, {crack,slam}) {
    const expansion = reduced ? 0 : Math.min(1, progress * 3.5) * .45;
    const reach = (outer ? 5.15 : 3.35) + expansion;
    clipFracturedRim(ctx, footprint);
    ctx.filter = 'grayscale(.88) brightness(.46)';
    blitFault(ctx, crack, footprint, {reach:reach * 1.04, opacity:.86 * (1 - progress)});
    if (!outer || !reduced) paintRootletContactFlash(ctx, footprint, {reach,progress,reduced,outer}, slam);
    if (outer) paintRootletEarthPlates(ctx, footprint, {progress,reduced}, crack);
}

function paintRootletContactFlash(ctx, footprint, {reach,progress,reduced,outer}, slam) {
    const fade = Math.max(0, 1 - progress * 2.4) ** 1.7;
    if (!fade) return;
    const {x,y,width,height} = footprint;
    ctx.filter = 'none';
    ctx.globalAlpha = fade * (outer ? .29 : .18);
    ctx.fillStyle = '#302026';
    ctx.fillRect(x - width / 2, y - height / 2, width, height);
    ctx.filter = 'contrast(1.19) brightness(.87)';
    blitFault(ctx, slam, footprint, {reach, opacity:fade * (outer ? .48 : .36)});
    // Keep a bright fracture face over the dark, recessed bedrock.
    ctx.filter = 'contrast(1.14) brightness(1.2)';
    ctx.globalCompositeOperation = 'screen';
    blitFault(ctx, slam, footprint, {reach, opacity:fade * (reduced ? .69 : .94)});
}

