'use strict';
// Add a reviewed delivery pack without rebuilding or removing unrelated actors. Original frame pixels and anchors stay intact.
//   node scripts/build-stage-roster.cjs --append-pack <pack folder>: manifest.json items (id, aliases), delivery/<id>/animation.json.
// A delivered death clip (actions.death) gets its own cell like build-stage-roster's deaths. An alias ({ id, name } in the item) is
// another look drawn with the same pictures: it gets copies of them and keeps its own name, body and feet offset from the main look.
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
const padded = b => [b[0]-2, b[1]-2, b[2]+2, b[3]+2];
function save(output, stamp, file, bytes) { fs.writeFileSync(path.join(output,file),bytes); stamp.update(file).update(bytes); }
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
    const box=padded([Math.min(...all.map(b=>b[0])),Math.min(...all.map(b=>b[1])),Math.max(...all.map(b=>b[2])),Math.max(...all.map(b=>b[3]))]);
    for(const [action,clip] of clips) save(output,stamp,meta.id+'-'+action+'.png',pack(clip,box));
    const gait=meta.gait || GAITS[meta.id] || 'legs', pace=['fly','float','swim'].includes(gait)?'time':'stride';
    // A motion-only pack can retain the accepted body's render scale and footprint independently of its larger motion canvas.
    const body=meta.body || {height:-a[1],width:a[2]-a[0]+1,reach:[-a[0],a[2]]};
    if(!Number.isFinite(body.height)||body.height<=0||!Number.isFinite(body.width)||body.width<=0||!Array.isArray(body.reach)||body.reach.length!==2||!body.reach.every(n=>Number.isFinite(n)&&n>=0)) throw Error('Invalid body dimensions: '+meta.id);
    return [meta.id,meta.name,box[2]-box[0]+1,box[3]-box[1]+1,-box[0],-box[1],body.height,body.width,gait,
        [walk.count,walk.cols,walk.durationsMs,pace],[attack.count,attack.cols,attack.durationsMs,attack.impactFrame],body.reach,deathRow(meta,dir,output,stamp)]
        .concat(special?[[special.count,special.cols,special.durationsMs,special.impactFrame]]:[]);
}
// The death clip has its own cell around its frames (the roster's death column); without one the game fades the body out.
function deathRow(meta, dir, output, stamp) {
    if(!meta.actions.death) return null;
    const death=readClip(dir,meta.actions.death), box=padded(bounds(death));
    save(output,stamp,meta.id+'-death.png',pack(death,box));
    return [death.count,death.cols,death.durationsMs,box[2]-box[0]+1,box[3]-box[1]+1,-box[0],-box[1]];
}
// eslint-disable-next-line no-new-func -- a row the roster tools wrote (array text)
const parseRow = line => new Function('return '+line)();
/** An alias row: the main look's new clips, the alias's own name, body and feet offset (the old rows must share one cell size). */
function aliasRow(row, alias, old, output, stamp) {
    const before=parseRow(old.get(alias.id)), main=parseRow(old.get(row[0]));
    if(before[2]!==main[2] || before[3]!==main[3]) throw Error('Alias does not share the main pictures: '+alias.id);
    const actions=['walk','attack'].concat(row[12]?['death']:[],row[13]?['special']:[]);
    for(const action of actions) save(output,stamp,alias.id+'-'+action+'.png',fs.readFileSync(path.join(output,row[0]+'-'+action+'.png')));
    const out=row.slice();
    out[0]=alias.id; out[1]=before[1]; out[4]+=before[4]-main[4]; out[5]+=before[5]-main[5];
    out[6]=before[6]; out[7]=before[7]; out[11]=before[11];
    return out;
}
module.exports = function appendPack(root, dir) {
    const file=path.join(root,'data/monster-stage-roster.js'), old=fs.readFileSync(file,'utf8');
    const items=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8')).items, names=items.map(item=>item.id);
    const stamp=crypto.createHash('sha1'), output=path.join(root,'assets/enemies/roster');
    const rowPattern = /^        \[['"]([^'"]+)['"]/;
    const rows=new Map(old.split(/\r?\n/).filter(line=>rowPattern.test(line)).map(line=>[line.match(rowPattern)[1],line.trim().replace(/,$/,'')]));
    const before=new Map(rows), aliases=[];
    for(const item of items) {
        const meta=JSON.parse(fs.readFileSync(path.join(dir,'delivery',item.id,'animation.json'),'utf8'));
        if(meta.id!==item.id) throw Error('Actor id mismatch: '+item.id);
        // A new silhouette never keeps an old body's death clip: only a delivered one is written.
        const row=actorRow(meta,dir,output,stamp);
        rows.set(item.id,JSON.stringify(row));
        for(const alias of item.aliases || []) { rows.set(alias.id,JSON.stringify(aliasRow(row,alias,before,output,stamp))); aliases.push(alias.id); }
    }
    const start=old.indexOf('    actors: Object.freeze(Object.fromEntries(['), end=old.indexOf('    ].map(([id, name,');
    if(start<0 || end<start || rows.size<names.length) throw Error('Roster layout changed; no table written');
    const text=old.slice(0,start)+'    actors: Object.freeze(Object.fromEntries([\n'+[...rows.values()].map(row=>'        '+row).join(',\n')+'\n'+old.slice(end);
    stamp.update(text.replace(/version: '[^']+'/, "version: 'content'"));
    fs.writeFileSync(file,text.replace(/version: '[^']+'/,`version: '${stamp.digest('hex').slice(0,10)}'`));
    console.log(JSON.stringify({imported:names.length,aliases,total:rows.size,removed:0,ids:names}));
};
