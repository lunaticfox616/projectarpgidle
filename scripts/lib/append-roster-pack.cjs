'use strict';
// Add a reviewed delivery pack without rebuilding or removing unrelated actors. Original frame pixels and anchors stay intact.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { decodePng, encodePng } = require('./png.cjs');
const GAITS = { 'act7-crackback-tick':'crawl', 'act8-veil-moth':'fly', 'act8-shroud-toad':'hop',
    'act9-dirge-crane':'legs', 'act9-chorus-bulbs':'float', 'underworld-obsidian-centipede':'crawl',
    'colony-borer-grub':'crawl', 'colony-carapace-beetle':'crawl', 'atlas-canopy-leafglider':'fly',
    'atlas-garden-bonsai-snail':'crawl', 'atlas-garden-2':'float', 'atlas-sanctum-5':'float', 'colony-boss':'crawl' };
function readClip(dir, clip) {
    const image = decodePng(fs.readFileSync(path.join(dir, clip.sheet)));
    if (clip.cols !== clip.count || image.width !== clip.size[0]*clip.count || image.height !== clip.size[1]) throw Error('Unexpected sheet layout: '+clip.sheet);
    return { ...clip, image };
}
function bounds(clip) {
    const [w,h] = clip.size, [ax,ay] = clip.anchor, out = [Infinity,Infinity,-Infinity,-Infinity];
    for (let f=0; f<clip.count; f++) for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
        const alpha = clip.image.data[(y*clip.image.width+f*w+x)*4+3];
        if (alpha !== 0 && alpha !== 255) throw Error('Nonbinary alpha: '+clip.sheet);
        if (!alpha) continue;
        out[0]=Math.min(out[0],x-ax); out[1]=Math.min(out[1],y-ay);
        out[2]=Math.max(out[2],x-ax); out[3]=Math.max(out[3],y-ay);
    }
    return out;
}
function pack(clip, box) {
    const w=box[2]-box[0]+1, h=box[3]-box[1]+1, data=new Uint8Array(w*h*clip.count*4);
    for (let f=0; f<clip.count; f++) for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
        const sx=clip.anchor[0]+box[0]+x, sy=clip.anchor[1]+box[1]+y;
        if (sx<0 || sy<0 || sx>=clip.size[0] || sy>=clip.size[1]) continue;
        const at=(sy*clip.image.width+f*clip.size[0]+sx)*4;
        data.set(clip.image.data.subarray(at,at+4),(y*w*clip.count+f*w+x)*4);
    }
    return encodePng(w*clip.count,h,data);
}
// A boss may bring a second attack (actions.special): its specials play it (js/canvas-stage-roster.js). It shares the cell and feet.
function actorRow(meta, dir, output, stamp) {
    const walk=readClip(dir,meta.actions.walk), attack=readClip(dir,meta.actions.attack), special=meta.actions.special?readClip(dir,meta.actions.special):null;
    const clips=[['walk',walk],['attack',attack]].concat(special?[['special',special]]:[]), all=clips.map(([,clip])=>bounds(clip)), a=all[0];
    const box=[Math.min(...all.map(b=>b[0]))-2,Math.min(...all.map(b=>b[1]))-2,Math.max(...all.map(b=>b[2]))+2,Math.max(...all.map(b=>b[3]))+2];
    for(const [action,clip] of clips) {
        const file=meta.id+'-'+action+'.png', bytes=pack(clip,box);
        fs.writeFileSync(path.join(output,file),bytes); stamp.update(file).update(bytes);
    }
    const gait=meta.gait || GAITS[meta.id] || 'legs', pace=['fly','float','swim'].includes(gait)?'time':'stride';
    return [meta.id,meta.name,box[2]-box[0]+1,box[3]-box[1]+1,-box[0],-box[1],-a[1],a[2]-a[0]+1,gait,
        [walk.count,walk.cols,walk.durationsMs,pace],[attack.count,attack.cols,attack.durationsMs,attack.impactFrame],[-a[0],a[2]],null]
        .concat(special?[[special.count,special.cols,special.durationsMs,special.impactFrame]]:[]);
}
module.exports = function appendPack(root, dir) {
    const file=path.join(root,'data/monster-stage-roster.js'), old=fs.readFileSync(file,'utf8');
    const names=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8')).items.map(item=>item.id);
    const stamp=crypto.createHash('sha1'), output=path.join(root,'assets/enemies/roster');
    const rowPattern = /^        \[['"]([^'"]+)['"]/;
    const rows=new Map(old.split(/\r?\n/).filter(line=>rowPattern.test(line)).map(line=>[line.match(rowPattern)[1],line.trim().replace(/,$/,'')]));
    for(const id of names) {
        const meta=JSON.parse(fs.readFileSync(path.join(dir,'delivery',id,'animation.json'),'utf8'));
        if(meta.id!==id) throw Error('Actor id mismatch: '+id);
        // New silhouettes cannot use an old body's death clip. Runtime fading handles death until matching frames arrive.
        const row=actorRow(meta,dir,output,stamp);
        rows.set(id,JSON.stringify(row));
    }
    const start=old.indexOf('    actors: Object.freeze(Object.fromEntries(['), end=old.indexOf('    ].map(([id, name,');
    if(start<0 || end<start || rows.size<names.length) throw Error('Roster layout changed; no table written');
    const text=old.slice(0,start)+'    actors: Object.freeze(Object.fromEntries([\n'+[...rows.values()].map(row=>'        '+row).join(',\n')+'\n'+old.slice(end);
    stamp.update(text.replace(/version: '[^']+'/, "version: 'content'"));
    fs.writeFileSync(file,text.replace(/version: '[^']+'/,`version: '${stamp.digest('hex').slice(0,10)}'`));
    console.log(JSON.stringify({imported:names.length,total:rows.size,removed:0,ids:names}));
};
