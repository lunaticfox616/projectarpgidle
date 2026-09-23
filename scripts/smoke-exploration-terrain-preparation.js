const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
let yields=0;
const decodes=new Map();
// Raster decoding and canvas storage are the only simulated boundaries.
function canvas() {
    const surface={width:0,height:0};
    const ctx={drawImage(image){this.image=image;},getImageData(x,y,w,h){
        const data=new Uint8ClampedArray(w*h*4);
        const base=({'maze-materials.png':110,'courtyard-materials.png':140,
            'sanctum-materials.png':170,'ruins-materials.png':80,'trunk-materials.png':125})[this.image.src.split('/').pop()]??50;
        for(let i=0;i<data.length;i+=4)data.set([base+i%97,85,40,255],i);
        return {data};
    },createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    putImageData:pixels=>{surface.pixels=pixels.data;}};
    surface.getContext=()=>ctx;return surface;
}
const runtime=vm.createContext({document:{createElement:canvas},
    Image:class {width=1536;height=1024;async decode(){decodes.set(this.src,(decodes.get(this.src)||0)+1);}},
    setTimeout:callback=>setImmediate(()=>{yields++;callback();}),safeExposeGlobals(){},safeExposeData(){}});
vm.runInContext(fs.readFileSync('data/act-exploration-maps.js','utf8'),runtime);
vm.runInContext(fs.readFileSync('js/act-exploration-map.js','utf8'),runtime);
vm.runInContext(fs.readFileSync('js/canvas-exploration-art.js','utf8'),runtime);
async function check() {
    await vm.runInContext('explorationArt.ready()',runtime);
    const request=`explorationArt.terrain({columns:5,rows:5,
        tiles:[0,0,0,0,0,0,1,1,1,0,0,1,1,1,0,0,1,1,1,0,0,0,0,0,0],
        rooms:[{gx:2,gy:2,radiusX:1,radiusY:1,role:'boss'}]})`;
    let complete=false;
    const pending=vm.runInContext(request,runtime).then(surface=>{complete=true;return surface;});
    await Promise.resolve();
    assert.equal(complete,false,'terrain preparation releases the browser before finishing');
    const first=await pending;
    assert.ok(yields>1,'large preparation is split across browser tasks');
    assert.equal(first.width,160);assert.equal(first.height,160);
    assert.ok(first.pixels.every((value,i)=>i%4!==3||value===255),'terrain remains fully opaque');
    const second=await vm.runInContext(request,runtime);
    const hash=surface=>createHash('sha256').update(surface.pixels).digest('hex');
    assert.equal(hash(first),hash(second),'task scheduling cannot change the authored terrain pixels');
    const [courtyard,root]=await Promise.all([
        vm.runInContext(request.replace('columns:5',"biome:'courtyard',columns:5"),runtime),
        vm.runInContext(request,runtime)
    ]);
    assert.notEqual(hash(courtyard),hash(root),'different biomes use their own ground material');
    assert.equal(hash(root),hash(first),'a concurrent courtyard load cannot contaminate root terrain');
    assert.ok([...decodes.values()].every(count=>count===1),'each atlas is decoded only once across map transitions');
    const props=vm.runInContext(`explorationArt.scenery(actExplorationMap.layout(2)).map(row=>({
        ...row,walkable:actExplorationMap.walkable(actExplorationMap.layout(2),{
            gx:Math.floor(row.placement[1]),gy:Math.floor(row.placement[2])})}))`,runtime);
    assert.ok(props.length>=10,'the courtyard has visible architectural landmarks around its rooms');
    assert.ok(props.every(row=>!row.walkable),'scenery bases cannot occupy a playable tile');
    assert.equal(new Set(props.map(row=>row.placement[0])).size,4,'planters, pillars, rails and ruins all appear');
    const suspended=await vm.runInContext(request.replace('columns:5',"biome:'aerial',columns:5"),runtime);
    const green=(x,y)=>suspended.pixels[(y*160+x)*4+1];
    assert.equal(green(80,80),85,'the suspended platform retains full material brightness');
    assert.ok(green(16,16)<25,'the unwalkable chasm is visibly recessed');
    assert.ok(green(80,128)>green(16,16)&&green(80,128)<green(80,80),'a downward fascia separates platform from chasm');
    assert.ok(suspended.pixels.every((value,i)=>i%4!==3||value===255),'raised ground cannot expose transparent seams');
    const aerialProps=vm.runInContext(`explorationArt.scenery(actExplorationMap.layout(3)).map(row=>{
        const [,x,y]=row.placement;
        return actExplorationMap.layout(3).rooms.some(room=>Math.abs(x-room.gx-.5)<=room.radiusX+1&&Math.abs(y-room.gy-.5)<=room.radiusY+1);
    })`,runtime);
    assert.ok(aerialProps.length>0&&aerialProps.every(Boolean),'suspended props stay at broad platforms, away from the narrow bridges');
    const maze=await vm.runInContext(request.replace('columns:5',"biome:'maze',columns:5"),runtime);
    assert.notEqual(hash(maze),hash(root),'the maze uses its own root and plum-stone material');
    assert.notEqual(hash(maze),hash(courtyard),'maze paving remains distinct from the garden');
    const mazeProps=vm.runInContext(`explorationArt.scenery(actExplorationMap.layout(4)).map(row=>({
        ...row,walkable:actExplorationMap.walkable(actExplorationMap.layout(4),{
            gx:Math.floor(row.placement[1]),gy:Math.floor(row.placement[2])})}))`,runtime);
    assert.ok(mazeProps.length>=10,'the rotated labyrinth has architectural landmarks');
    assert.ok(mazeProps.every(row=>!row.walkable),'maze landmarks cannot block corridors or boss entry');
    assert.equal(new Set(mazeProps.map(row=>row.placement[0])).size,4,'all four maze landmarks appear');
    const [sanctum,ruins]=await Promise.all(['sanctum','ruins'].map(biome=>
        vm.runInContext(request.replace('columns:5',`biome:'${biome}',columns:5`),runtime)));
    assert.equal(new Set([root,courtyard,maze,suspended,sanctum,ruins].map(hash)).size,6,
        'each of the six connected acts renders a distinct ground palette or surface');
    const ruinProps=vm.runInContext(`explorationArt.scenery(actExplorationMap.layout(6)).map(row=>
        actExplorationMap.walkable(actExplorationMap.layout(6),{
            gx:Math.floor(row.placement[1]),gy:Math.floor(row.placement[2])}))`,runtime);
    assert.ok(ruinProps.length>0&&ruinProps.every(value=>!value),'ruined columns cannot occupy playable shortcuts');
    const sanctuaryProps=vm.runInContext(`explorationArt.scenery(actExplorationMap.layout(5)).map(row=>{
        const [,x,y]=row.placement;
        return actExplorationMap.layout(5).rooms.some(room=>Math.abs(x-room.gx-.5)<=room.radiusX+1&&Math.abs(y-room.gy-.5)<=room.radiusY+1);
    })`,runtime);
    assert.ok(sanctuaryProps.length>0&&sanctuaryProps.every(Boolean),'sanctuary props remain attached to room platforms');
    const trunk=await vm.runInContext(request.replace('columns:5',"biome:'trunk',columns:5"),runtime);
    assert.equal(new Set([root,courtyard,maze,suspended,sanctum,ruins,trunk].map(hash)).size,7,
        'the hollow trunk has its own material rather than falling back to the root forest');
    const trunkProps=vm.runInContext(`explorationArt.scenery(actExplorationMap.layout(7)).map(row=>({
        ...row,walkable:actExplorationMap.walkable(actExplorationMap.layout(7),{
            gx:Math.floor(row.placement[1]),gy:Math.floor(row.placement[2])})}))`,runtime);
    assert.ok(trunkProps.length>0&&trunkProps.every(row=>!row.walkable),'trunk buttresses leave the winding route playable');
    assert.equal(new Set(trunkProps.map(row=>row.placement[0])).size,4,'all four trunk silhouettes are used');
    console.log('Exploration terrain async preparation and deterministic raster: OK');
}
check().catch(error=>{console.error(error);process.exitCode=1;});
