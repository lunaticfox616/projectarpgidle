// Rebuild the isolated gem laboratory from the supplied, inspected v3.38 source.
// No archive installation/build scripts are executed. Production files are untouched.
const fs = require('node:fs');
const path = require('node:path');
const espree = require('espree');
const root = path.resolve(__dirname, '..');
const input = path.join(root, 'artifacts/imports/pixellab-v3.38');
const output = path.join(root, 'artifacts/new-skill-gems');
const read = name => fs.readFileSync(path.join(input, name), 'utf8');
const names = ['bouncing-flask', 'radiant-lance', 'time-acceleration', 'explosive-mixture',
    'supercooled-mixture', 'empty-flask', 'holy-mist', 'ripple-judgment', 'assassination', 'causality'];
const base = read('pixel-fx-v2.js');
const ast = espree.parse(base, {ecmaVersion: 'latest', range: true});
const cls = ast.body[0].expression.callee.body.body.find(n => n.type === 'ClassDeclaration' && n.id.name === 'WorldTreeFX');
const methods = cls.body.body.filter(n => ['constructor', 'emit', 'cancel', 'clear', 'prune'].includes(n.key.name));
const catalogText = read('catalog.js');
const catalog = JSON.parse(catalogText.slice(catalogText.indexOf('[')).replace(/;\s*$/, ''));
const wrap = text => text.replace(/\}\)\(globalThis\);\s*$/, '})(G);');
function fasterFlights(text) {
    const tree = espree.parse(text,{ecmaVersion:'latest',range:true}), edits=[];
    function visit(node) {
        if(!node || typeof node !== 'object') return;
        if(node.type === 'FunctionDeclaration' && node.id.name === 'flightMs') {
            edits.push(node.body.body.find(row=>row.type==='ReturnStatement').argument.range);
        }
        if(node.type === 'VariableDeclarator' && ['flightMs','shardMs'].includes(node.id.name)) {
            edits.push(node.init.body.range);
        }
        for(const value of Object.values(node)) {
            if(Array.isArray(value)) value.forEach(visit);
            else if(value && typeof value === 'object') visit(value);
        }
    }
    visit(tree);
    if(!edits.length) throw Error('Flask flight adaptation requires source review');
    for(const [start,end] of edits.sort((a,b)=>b[0]-a[0])) {
        text=text.slice(0,start)+'Math.max(1,Math.round(('+text.slice(start,end)+')/1.8))'+text.slice(end);
    }
    return text;
}
function controller(name) {
    let text = read(name + '.js');
    const hooks = {
        'empty-flask': [
            ['plan=rollShards({baseCount,extraProjectileChance,rng})','plan=(G.emptyFlaskShards||rollShards)({baseCount,extraProjectileChance,rng})'],
            ['Math.min(spec.maxShards,count)','Math.min(G.emptyFlaskMaxShards??spec.maxShards,count)']],
        'holy-mist': [['filter(e=>inRange(current,e))','filter(e=>(G.holyMistInRange||inRange)(current,e))']]
    };
    for(const [anchor,replacement] of hooks[name] || []) {
        if(text.split(anchor).length!==2) throw Error(name+' host hook requires source review');
        text=text.replace(anchor,replacement);
    }
    if(name === 'assassination') {
        const anchor = 'destination=behind(target,direction)';
        if(text.split(anchor).length !== 2) throw Error('Assassination destination hook requires source review');
        text = text.replace(anchor, 'destination=(G.assassinationDestination || behind)(target,direction)');
        const timing='teleportAt=startAt+Math.round(200/rate),hitAt=startAt+Math.round(340/rate),slashMs=Math.round(190/rate)';
        if(!text.includes(timing)) throw Error('Assassination timing requires source review');
        // Short readable blink/stab, independent of attack cadence. Damage remains controller-owned.
        text=text.replace(timing,'teleportAt=startAt+100,hitAt=startAt+240,slashMs=120');
    }
    if(name === 'supercooled-mixture') {
        const anchor='Number.isInteger(c.gx)&&Number.isInteger(c.gy)';
        if(text.split(anchor).length !== 2) throw Error('Cold landing coordinates require source review');
        text=text.replace(anchor,'Number.isFinite(c.gx)&&Number.isFinite(c.gy)');
    }
    if(['bouncing-flask','explosive-mixture','supercooled-mixture','empty-flask'].includes(name)) text=fasterFlights(text);
    return wrap(text);
}
const atlas=JSON.parse(read('atlas.json'));
// Fit the censer orbit inside the adjacent-cell mist without expanding the damage area.
Object.assign(atlas.skills[49].holyMist.swing,{extension:8,links:1,step:8});
function renderer() {
    const text=read('atlas-renderer.js');
    const anchor='// Extend the silver chain while keeping its first link at the player\'s hand.';
    if(text.split(anchor).length !== 2) throw Error('Censer emission adaptation requires source review');
    // One small existing mist sprite follows the bowl; the ground cloud still owns the area.
    return wrap(text.replace(anchor,`const bowlDistance=swing.extension+52;
      submit(e,handX-si*bowlDistance,handY+co*bowlDistance,.65,0,0,sheet.frames[1],1,.28*alpha);
      ${anchor}`));
}
const library = [
    '// Generated original controllers/atlas motion; laboratory only, never loaded by index.html.',
    'const newSkillLabNative = (() => {',
    'const G = {WT_CATALOG:' + JSON.stringify(catalog) + ',WT_ATLAS:' + JSON.stringify(atlas) + '};',
    'const cellOK=c=>c&&Number.isFinite(c.gx)&&Number.isFinite(c.gy);',
    'class WorldTreeFX {' + methods.map(n => base.slice(...n.range)).join('\n') + '}',
    'const WT_CATALOG=G.WT_CATALOG;',
    ...names.map(controller),
    renderer(),
    'return G;})();'
].join('\n');
fs.mkdirSync(output, {recursive: true});
fs.writeFileSync(path.join(output, 'native.js'), library);
for (const name of ['index.html', 'storage.js', 'runtime.js', 'targeting.js', 'combat.js', 'drawing.js', 'assassination.js', 'production.js']) {
    fs.copyFileSync(path.join(root, 'scripts/skill-gem-lab', name), path.join(output, name));
}
console.log('Prepared /artifacts/new-skill-gems/index.html (10 gems; isolated storage).');
