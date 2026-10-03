// Wide-map art (js/canvas-exploration-art.js, 2026-10-02): every wide map draws its painted act backdrop and gate frames at 16 px per
// tile; a missing, broken or mis-sized picture falls back to a flat stand-in (floor lighter than the map's shade), never to the retired
// material/prop kits. Raster decoding and canvas storage are the only simulated boundaries.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const decodes=new Map(),failing=new Set(),sizes=new Map();
function canvas() {
    const surface={width:0,height:0,fills:[]};
    const ctx={fillStyle:'',imageSmoothingEnabled:true,drawImage(){},fillRect(x,y,w,h){surface.fills.push([this.fillStyle,x,y,w,h]);},
        beginPath(){},moveTo(){},lineTo(){},stroke(){}};
    surface.getContext=()=>ctx;return surface;
}
const runtime=vm.createContext({console:{warn(){},error(){},log(){}},document:{createElement:canvas},
    Image:class {
        width=0;height=0;src='';
        async decode(){
            const file=this.src.split('?')[0];decodes.set(file,(decodes.get(file)||0)+1);
            if(failing.has(file))throw Error('decode aborted');
            [this.width,this.height]=sizes.get(file)||[64,32];
        }
    },
    safeExposeGlobals(){},safeExposeData(){}});
vm.runInContext(fs.readFileSync('data/act-exploration-maps.js','utf8'),runtime);
vm.runInContext(fs.readFileSync('js/exploration-layouts.js','utf8'),runtime);
vm.runInContext(fs.readFileSync('js/act-exploration-map.js','utf8'),runtime);
vm.runInContext(fs.readFileSync('js/canvas-exploration-art.js','utf8'),runtime);
const run=code=>vm.runInContext(code,runtime);

async function check() {
    const art=run('ACT_EXPLORATION_BACKDROPS');
    // The real pictures have the right size: columns × 16 by rows × 16.
    for(let act=1;act<=10;act++) {
        const map=run(`actExplorationMap.layout(${act})`),entry=art[map.id];
        assert.ok(entry && fs.existsSync(entry.map) && fs.existsSync(entry.gate),`act ${act} has its painted map and gate`);
        const bytes=fs.readFileSync(entry.map);
        assert.deepEqual([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[map.columns*16,map.rows*16],`act ${act} picture is 16 px per tile`);
        sizes.set(entry.map,[map.columns*16,map.rows*16]);sizes.set(entry.gate,[64,48]);
    }
    // A content map on act 4 draws the act 4 picture, its gate frames at the picture's scale.
    run("window={};var content=actExplorationMap.generated({style:'act',act:4,seed:'x'}),arena=actExplorationMap.generated({style:'act',act:4,seed:'y',arena:true});");
    const surface=await run('explorationArt.terrain(content)');
    assert.equal(surface.src.split('?')[0],art['braided-maze'].map,'the bookshelf maze picture backs the content map');
    assert.ok(surface.src.includes('?v='),'the art version rides the URL');
    const gate=run('explorationArt.gate(true,content)');
    assert.deepEqual([gate.pixelTile,gate.width,gate.height],[16,32,48],'the closed gate is the left half of the frame sheet, at 16 px per tile');
    assert.equal(run('explorationArt.scenery(content).length'),0,'painted maps carry their props in the picture');
    const arenaSurface=await run('explorationArt.terrain(arena)');
    assert.equal(arenaSurface.src.split('?')[0],art['braided-maze'].map,'an arena start walks the same painted map');
    // A broken picture is retried once, then a flat stand-in keeps the map readable.
    failing.add(art['crown-wheel'].map);
    const flat=await run("explorationArt.terrain(actExplorationMap.layout(10))");
    assert.equal(decodes.get(art['crown-wheel'].map),2,'one retry before falling back');
    const crown=run('actExplorationMap.layout(10)');
    assert.deepEqual([flat.width,flat.height],[crown.columns*16,crown.rows*16],'the stand-in keeps the map size');
    const floorFills=flat.fills.filter(([colour])=>colour!==flat.fills[0][0]);
    assert.equal(floorFills.length,crown.tiles.filter(Boolean).length,'every floor tile is drawn over the wall shade');
    assert.ok(flat.fills[0][0].startsWith('rgb(5,5,11'),'the walls take the map’s own shade');
    // A mis-sized picture is refused the same way, and no kit atlas is ever requested.
    sizes.set(art['silent-nave'].map,[100,100]);
    const wrong=await run('explorationArt.terrain(actExplorationMap.layout(5))');
    assert.ok(Array.isArray(wrong.fills),'a picture of the wrong size falls back to the stand-in');
    assert.ok([...decodes.keys()].every(file=>/act\d+-(map|gate)\.png$/.test(file)),'only painted act pictures are decoded');
    const stand=run('explorationArt.gate(false,{id:"nowhere"})');
    assert.deepEqual([stand.width,stand.height,stand.pixelTile],[128,160,undefined],'a gate without its picture is a drawn stand-in frame');
    console.log('Exploration art: painted act maps and gates for every wide map, flat stand-in on failure: OK');
}
check().catch(error=>{console.error(error);process.exitCode=1;});
