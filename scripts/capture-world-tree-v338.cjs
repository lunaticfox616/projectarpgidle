/* Isolated reference capture: no DOM, filesystem, network or game callbacks in the source VM. */
const fs=require('node:fs'),vm=require('node:vm');
const root='artifacts/imports/pixellab-v3.38/';
const context=vm.createContext({structuredClone});
for(const name of ['catalog.js','focus-beam.js','dragon-breath.js','pixel-fx-v2.js','atlas.js','remake15-runtime.js','description10-runtime.js','atlas-renderer.js']) {
    vm.runInContext(fs.readFileSync(root+name,'utf8'),context,{timeout:2000,filename:name});
}
const legacy=require('./fixtures/world-tree-v37-layout.json');
const cases=[];
for(const row of legacy.cases) {
    const event=structuredClone(row.event);
    context.input=event;
    if(vm.runInContext('WT_CATALOG.find(x=>x.name===input.skillName)?.id>43',context))continue;
    if(event.footprint?.cone) {
        const a=event.sourceCell,b=event.targetCells.at(-1),angle=Math.atan2(b.gy-a.gy,b.gx-a.gx);
        Object.assign(event.footprint.cone,{dx:Math.cos(angle),dy:Math.sin(angle)});
    }
    // Supply the same confirmed geometry used by the game's presentation boundary.
    const cells=event.footprint?.cells;
    if(cells?.length && event.skillName==='집중 광선') {
        const a=event.sourceCell,d=c=>Math.hypot(c.gx-a.gx,c.gy-a.gy),b=cells.reduce((x,y)=>d(y)>d(x)?y:x,a);
        event.focusBeamRay={sourceCell:a,endCell:b,cells,direction:{angle:Math.atan2(b.gy-a.gy,b.gx-a.gx)}};
    }
    if(cells?.length && event.skillName==='용화 숨결') {
        const a=event.sourceCell,b=event.targetCells.at(-1);
        event.dragonBreathCone={sourceCell:a,cells,range:event.footprint.cone?.length?event.footprint.cone.length-.5:4,direction:{angle:Math.atan2(b.gy-a.gy,b.gx-a.gx)}};
    }
    if(event.skillName==='번개 타격'&&event.kind==='stage'&&!event.stageIndex)event.kind='hit';
    vm.runInContext('var fx=new PixelLabFX({maxSprites:48});fx.emit(input);',context);
    const duration=vm.runInContext('fx.effects[0].duration',context);
    const ages=[-1,0,1,45,90,150,Math.floor(duration*.6),duration-1,duration];
    const samples=ages.map(age=>{
        context.now=event.at+age;
        const draws=vm.runInContext(`var draws=[];fx.layout(now,(_,x,y,scale,angle,sx,sy,w,h,id,scaleY,alpha,sky,ground)=>draws.push({x,y,scale,angle,frame:{x:sx,y:sy,w,h},scaleY,alpha,ground}));draws;`,context);
        return {age,draws:JSON.parse(JSON.stringify(draws))};
    });
    cases.push({event,samples});
}
fs.writeFileSync('scripts/fixtures/world-tree-v338-layout.json',JSON.stringify({version:'3.38',cases})+'\n');
console.log('Captured',cases.length,'events from unmodified supplied renderer.');
