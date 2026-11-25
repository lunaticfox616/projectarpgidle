// A few landmarks across the wave share one outward shear, rather than one burst per tile.
const LANDMARKS = [
    {dx:-1,dy:-1,crop:[513,475,190,175],across:.85,depth:.53},
    {dx:-1,dy:1,crop:[640,610,198,180],across:.88,depth:.58},
    {dx:0,dy:2,crop:[891,721,174,159],across:.79,depth:.54},
    {dx:0,dy:-2,crop:[337,651,181,168],across:.74,depth:.48},
    {dx:2,dy:0,crop:[867,329,185,165],across:.76,depth:.55}
];
const PLATE = [[-.51,-.045],[-.39,-.34],[-.15,-.28],[.05,-.47],[.40,-.32],[.51,.06],[.27,.27],[-.06,.36],[-.39,.21]];

function face(ctx, {x,y,width,height,lean}, drop) {
    ctx.beginPath();
    for (const [dx,dy] of PLATE) ctx.lineTo(Math.round(x + dx * width), Math.round(y + (dy + dx * lean) * height + drop));
    ctx.closePath();
}

function soilSlab(ctx, plate, {stone,opacity,thickness}) {
    const {x,y,width,height,rise} = plate;
    ctx.globalAlpha = opacity * .75;
    ctx.fillStyle = '#261d23';
    face(ctx, plate, rise + thickness + 1);
    ctx.fill();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#493129';
    face(ctx, plate, thickness);
    ctx.fill();
    ctx.fillStyle = '#956749';
    face(ctx, plate, 0);
    ctx.fill();
    ctx.save();
    ctx.clip();
    if (stone) textureSlab(ctx, plate, stone, opacity);
    ctx.restore();
    ctx.globalAlpha = opacity * .65;
    ctx.strokeStyle = '#c79a70';
    ctx.lineWidth = Math.max(1, height * .095);
    ctx.beginPath();
    ctx.moveTo(x - width * .48, y);
    ctx.lineTo(x - width * .38, y - height * .33);
    ctx.lineTo(x - width * .18, y - height * .28);
    ctx.stroke();
}

function textureSlab(ctx, {x,y,width,height,crop}, image, opacity) {
    const [sx,sy,sw,sh] = crop;
    ctx.globalAlpha = opacity * .72;
    ctx.drawImage(image,sx,sy,sw,sh,Math.round(x-width*.56),Math.round(y-height*.51),Math.round(width*1.12),Math.round(height*1.02));
}

export function paintRootletEarthPlates(ctx, footprint, {progress,reduced}, stone) {
    const age = progress / .64;
    if (age >= 1) return;
    const {points,tileW,tileH,centerPoint} = footprint;
    const matched = LANDMARKS.map(shape => ({shape, point:points.find(point =>
        Math.round((point.x-centerPoint.x)/tileW) === shape.dx && Math.round((point.y-centerPoint.y)/tileH) === shape.dy)}))
        .filter(entry => entry.point);
    if (!matched.length) matched.push({shape:LANDMARKS[0],point:points[0]});
    const lift = reduced ? .63 : .52 + Math.sin(Math.PI * age ** .75) * .48;
    const opacity = Math.min(1, (1 - age) * 4) * (reduced ? .84 : .98);
    ctx.save();
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    for (const {shape,point} of matched) {
        const rise = tileH * .34 * lift;
        const drift = reduced ? 0 : age * tileW * .085;
        const plate = {x:point.x + Math.sign(shape.dx) * drift, y:point.y + tileH * .17 - rise,
            width:tileW * shape.across, height:tileH * shape.depth, lean:shape.dx * .15, crop:shape.crop, rise};
        soilSlab(ctx, plate, {stone,opacity,thickness:tileH * (.13 + .11 * lift)});
    }
    ctx.restore();
}
