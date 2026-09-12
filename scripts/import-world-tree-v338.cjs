/* Import vetted source artwork and renderer expressions, never execute archive build/install scripts. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const espree = require('espree');
const splitNativeGemDrawing = require('./lib/split-native-gem-drawing.cjs');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'artifacts/imports/pixellab-v3.38');
const read = name => fs.readFileSync(path.join(source, name), 'utf8');
const write = (name, text) => fs.writeFileSync(path.join(root, name), text);
const dataContext = {safeExposeData() {}};
vm.createContext(dataContext);
vm.runInContext(fs.readFileSync(path.join(root, 'data/skill-fx-atlas.js'), 'utf8') + ';globalThis.old=SKILL_FX_ATLAS;', dataContext);
const atlas = JSON.parse(read('atlas.json'));
Object.assign(atlas.skills[49].holyMist.swing,{extension:8,links:1,step:8});
const catalog = JSON.parse(read('catalog.js').slice(read('catalog.js').indexOf('[')).replace(/;\s*$/, ''));
const specs = atlas.skills.map(spec => ({...dataContext.old[spec.name], ...spec}));
write('data/skill-fx-atlas.js', '// Supplied PixelLab v3.38. Art IDs never identify gameplay skills.\nconst SKILL_FX_ATLAS = Object.freeze({\n' + specs.map(spec => `    ${JSON.stringify(spec.name)}: ${JSON.stringify(spec)}`).join(',\n') + '\n});\nsafeExposeData({ SKILL_FX_ATLAS });\n');

// Names are stable gameplay keys. No new skill or balance definition is installed.
const skillsPath = path.join(root, 'data/skills.js');
let skills = fs.readFileSync(skillsPath, 'utf8');
vm.runInContext(skills+';globalThis.gemDefs={skills:SKILL_DB,grid:SKILL_GRID_DB};',dataContext);
fs.mkdirSync(path.join(root, 'assets/gems/world-tree'), {recursive:true});
const icons = [];
const pendingSlugs=['bouncing-flask','radiant-lance','time-acceleration','explosive-mixture','supercooled-mixture',
    'empty-flask','holy-mist','ripple-judgment','assassination','causality'];
for (const spec of specs) {
    const match = skills.match(new RegExp("'" + spec.name + "': '(assets/gems/(?:active|world-tree)/[^']+)'"));
    const stem = match ? path.basename(match[1]).replace(/(?:-v1)?\.png$/, '') : pendingSlugs[spec.id-44];
    if(!stem)throw new Error(`No reviewed icon mapping for ${spec.name}`);
    const target = 'assets/gems/world-tree/' + stem + '.png';
    fs.copyFileSync(path.join(source, `icons/${spec.id}.png`), path.join(root, target));
    if (match) skills = skills.replace(match[0], `'${spec.name}': '${target}'`);
    icons.push({id:spec.id, name:spec.name, path:target, playable:!!dataContext.gemDefs.skills[spec.name]});
}
write('data/skills.js', skills);
write('artifacts/imports/world-tree-v338-icons.json', JSON.stringify(icons, null, 2) + '\n');
// Reference controllers are text documents, never scripts loaded by the game.
const referenceDir=path.join(root,'docs/skill-assets-v338/reference');
fs.mkdirSync(referenceDir,{recursive:true});
const hashes={},crypto=require('node:crypto');
function preserveReference(name,target=name) {
    const bytes=fs.readFileSync(path.join(source,name));
    fs.writeFileSync(path.join(referenceDir,target),bytes);
    hashes[name]=crypto.createHash('sha256').update(bytes).digest('hex');
}
for(const slug of pendingSlugs){
    preserveReference(slug.toUpperCase()+'-SPEC.md');
    preserveReference(slug+'.js',slug+'.js.txt');
}
for(const name of ['CLOUD-FROST-RING-SPEC.md','EMPTY-FLASK-ARCS-SPEC.md','SILVER-CENSER-SPEC.md',
    'JUDGMENT-LIGHTNING-SPEC.md','delivery-manifest.json'])preserveReference(name);
for(const id of specs.filter(spec=>spec.id>43).map(spec=>spec.id)) {
    const slug=pendingSlugs[id-44],preview=id<46?slug+'-showcase.gif':`motions/${id}.webp`;
    preserveReference(preview,slug+(id<46?'.gif':'.webp'));
}
write('docs/skill-assets-v338/manifest.json',JSON.stringify({version:'3.38',status:'playable',
    atlas:'assets/effects/world-tree-skills-v338.webp',skills:icons.filter(icon=>icon.id>=44),sourceSha256:hashes},null,2)+'\n');

// Preserve supplied expressions, but split per-skill branches into bounded handlers.
const parse = text => espree.parse(text, {ecmaVersion:'latest', range:true});
const renderer = read('atlas-renderer.js')
    .replace('if(pass===0)submit(e,e._target', 'submit(e,e._target')
    .replace('else if(now-e.at<100&&e._mixtureContactFrame)', 'if(now-e.at<100&&e._mixtureContactFrame)')
    .replace('G.WT_RIPPLE_JUDGMENT.crossCells(e.landingCell,e.crossRadius)','e.footprint.cells')
    .replace("// Extend the silver chain while keeping its first link at the player's hand.",
        "const bowlDistance=swing.extension+52;submit(e,handX-si*bowlDistance,handY+co*bowlDistance,.65,0,0,sheet.frames[1],1,.28*alpha);");
const block = parse(renderer).body[0].expression.callee.body;
const cls = block.body.find(node => node.type === 'ClassDeclaration');
const method = name => cls.body.body.find(node => node.key.name === name).value.body;
const slice = node => renderer.slice(...node.range);
function chain(node) {
    const result = [];
    for (let part = node; part?.type === 'IfStatement'; part = part.alternate) {
        result.push({test:slice(part.test), body:slice(part.consequent).slice(1,-1)});
        if (part.alternate && part.alternate.type !== 'IfStatement') result.push({test:null, body:part.alternate.type==='BlockStatement' ? slice(part.alternate).slice(1,-1) : slice(part.alternate)});
    }
    return result;
}
function returnOuterContinues(text) {
    const prefix = 'function f(){for(;;){', wrapped = prefix + text + '}}';
    const ast = parse(wrapped), edits = [];
    function visit(node, depth=0) {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'ContinueStatement' && depth === 1) edits.push(node.range);
        if (/^(For|While|DoWhile)/.test(node.type)) depth++;
        for (const value of Object.values(node)) {
            if (Array.isArray(value)) value.forEach(child => visit(child, depth));
            else if (value && typeof value === 'object') visit(value, depth);
        }
    }
    visit(ast);
    for (const [a,b] of edits.sort((a,b)=>b[0]-a[0])) text = text.slice(0,a-prefix.length) + 'return;' + text.slice(b-prefix.length);
    return text;
}
const prepareChain = method('emit').body.find(node => node.type === 'IfStatement' && slice(node.test) === 'e.id===53');
const prepareBranches = chain(prepareChain);
const layout = method('layout');
const loop = layout.body.find(node => node.type === 'ForStatement').body;
const drawChain = loop.body.body.find(node => node.type === 'IfStatement' && slice(node.test) === 'e.id===52');
const drawBranches = chain(drawChain);
const helpers = block.body.slice(0, block.body.indexOf(cls)).map(slice).join('\n');
const branches = (rows, prefix, draw) => rows.map((row,i) => `${prefix}${i}(e${draw?',t,now,submit':/\bs\./.test(row.body)?',s':''}) {\n${draw && /\brot\b/.test(row.body) ? 'let rot=e._orient?e._angle-e._artHeading:0;\n' : ''}${draw && /(?<!\.)\bframe\b/.test(row.body) && !/const frame=/.test(row.body) ? 'const frame=Math.floor(t*9);\n' : ''}${draw ? returnOuterContinues(row.body) : row.body}\n}`).join(',\n');
const dispatch = (rows,prefix,args) => `return ${prefix==='preparation.p'?'prepareRoutes':'drawRoutes'}.find(row=>row.matches(${args.split(',').slice(0,prefix==='preparation.p'?2:1).join(',')})).run.call(this,${args});`;
const routes = (rows,object,args) => rows.map((row,i)=>`{matches:(${row.test?args.split(',').filter(a=>new RegExp('\\b'+a+'\\b').test(row.test)).join(','):''})=>${row.test||'true'},run:${object}${i}}`).join(',\n');
let emit = slice(method('emit')).slice(1,-1);
emit = emit.replace(slice(prepareChain), 'prepareEvent.call(this,e,s);');
const eventHelpers=[];
for(const node of method('emit').body.filter(n=>n.type==='IfStatement'&&n.range[0]>prepareChain.range[1])){
    const name='prepareEventStyle'+eventHelpers.length;
    eventHelpers.push(`function ${name}(e){${slice(node)}}`);
    emit=emit.replace(slice(node),name+'.call(this,e);');
}
function splitModule(file, cache) {
    let text=read(file),ast=parse(text),body=ast.body[0].expression.callee.body;
    const fn=body.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='draw');
    const raw=n=>text.slice(...n.range),inner=n=>n.type==='BlockStatement'?raw(n).slice(1,-1):raw(n);
    const helpers=[];
    const common=code=>{
        const vars={id:'e.id',c:cache+'.center',age:'now-e.at',fade:'1-t'};
        const wanted=Object.keys(vars).filter(k=>new RegExp('\\b'+k+'\\b').test(code));
        if(wanted.includes('c')||new RegExp('\\b'+cache+'\\.').test(code))wanted.unshift(cache);
        vars[cache]='e._'+cache;
        return wanted.length?'const '+wanted.map(k=>k+'='+vars[k]).join(',')+';\n':'';
    };
    const helper=(name,code,params='e,t,now,submit')=>{helpers.push(`function ${name}(${params}){\n${common(code)}${code}\n}`);return name;};
    const phase=(name,node)=>{
        let code=inner(node);
        if(name==='drawHits') {
            const local=parse('function f(){'+code+'}').body[0];
            const loop=local.body.body.find(n=>n.type==='ForOfStatement');
            const first=loop?.body.body[0];
            if(first?.type==='IfStatement' && first.alternate){
                const table=[];let i=0;
                for(let branch=first;branch?.type==='IfStatement';branch=branch.alternate){
                    const get=n=>code.slice(n.range[0]-13,n.range[1]-13);
                    const bodyText=branch.consequent.type==='BlockStatement'?get(branch.consequent).slice(1,-1):get(branch.consequent);
                    const test=get(branch.test),key=/id===(\d+)/.exec(test)[1];
                    table.push(`${key}:${helper('hit'+key,bodyText,'e,t,now,submit,p')}`);i++;
                    if(branch.alternate&&branch.alternate.type!=='IfStatement')table.push(`fallback:${helper('hitDefault',get(branch.alternate).slice(1,-1),'e,t,now,submit,p')}`);
                }
                helpers.push('const hitDrawers={'+table.join(',')+'};');
                code=code.slice(0,first.range[0]-13)+'(hitDrawers[id]||hitDrawers.fallback)(e,t,now,submit,p);'+code.slice(first.range[1]-13);
            }
        }
        return helper(name,code);
    };
    const statements=fn.body.body,main=[],table=[];let stage=false;
    for(const node of statements.slice(1)){
        if(node.type==='IfStatement'&&raw(node.test)==="e.kind!=='stage'"){stage=true;main.push(raw(node));continue;}
        if(stage&&node.type==='IfStatement'){
            const id=/id===(\d+)/.exec(raw(node.test))[1];table.push(`${id}:${helper('stage'+id,inner(node.consequent))}`);continue;
        }
        if(stage){table.push('fallback:'+helper('stageDefault',raw(node)));continue;}
        if(node.type==='IfStatement'){
            const test=raw(node.test),name=test.includes("'travel'")?'drawTravel':test.includes("'hit'")?'drawHits':test.includes("'windup'")?'drawWindup':test.includes('stormCloud')?'drawCloud':'drawIgnite';
            main.push(`if(${test})return ${phase(name,node.consequent)}(e,t,now,submit);`);
        }
    }
    helpers.push('const stageDrawers={'+table.join(',')+'};');
    main.push('(stageDrawers[e.id]||stageDrawers.fallback)(e,t,now,submit);');
    text=text.slice(0,fn.range[0])+helpers.join('\n')+'\nfunction draw(e,t,now,submit){\n'+main.join('\n')+'\n}'+text.slice(fn.range[1]);
    return text.replace('(function(G){','{').replace('})(globalThis);','}');
}
const modules = [splitModule('remake15-runtime.js','r'),splitModule('description10-runtime.js','d')];
function splitPreparation(text) {
    const changes=[];
    function walk(node){
        if(!node||typeof node!=='object')return;
        if(node.type==='FunctionDeclaration'&&node.id.name==='prepare') {
            const get=n=>text.slice(...n.range), helpers=[], main=[];
            for(const statement of node.body.body){
                if(statement.type!=='IfStatement'){main.push(get(statement));continue;}
                const name='preparePart'+helpers.length;
                const content=statement.consequent.type==='BlockStatement'?get(statement.consequent).slice(1,-1):get(statement.consequent);
                helpers.push(`function ${name}(e${content.includes('effects')?',effects':''}){if(!(${get(statement.test)}))return;\n${content}\n}`);
                main.push(`${name}(e,effects);`);
            }
            changes.push({range:node.range,value:helpers.join('\n')+'\nfunction prepare(e,effects){'+main.join('\n')+'}'});return;
        }
        for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);
    }
    walk(parse(text));
    for(const change of changes.sort((a,b)=>b.range[0]-a.range[0]))text=text.slice(0,change.range[0])+change.value+text.slice(change.range[1]);
    return text;
}
for(const spec of specs.filter(row=>row.id>=44))catalog.push({id:spec.id,name:spec.name,
    skill:dataContext.gemDefs.skills[spec.name],grid:dataContext.gemDefs.grid[spec.name]});
const catalogText = JSON.stringify(catalog.map(row => ({id:row.id,name:row.name,grid:row.grid,skill:{ele:row.skill.ele,combatPattern:row.skill.combatPattern}})));
const judgmentSource=read('ripple-judgment.js');
const judgmentPose=parse(judgmentSource).body[0].expression.callee.body.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='pose');
const poseSource=judgmentSource.slice(...judgmentPose.range).replace('function pose(', 'function judgmentPose(')
    .replace('const d=dirs[direction]', 'const d=({2:{dx:0,dy:1},4:{dx:-1,dy:0},6:{dx:1,dy:0},8:{dx:0,dy:-1}})[direction]');
let output = `/* Generated from supplied PixelLab v3.38. Source math retained; damage/preview controllers excluded. */\nlet worldTreeNativeFx;\n{\nconst G={WT_ATLAS:{skills:Object.values(SKILL_FX_ATLAS)},WT_CATALOG:${catalogText}};\nconst WT_CATALOG=G.WT_CATALOG;\n${helpers}\n${modules.join('\n')}\n${eventHelpers.join('\n')}\n`;
output += `const preparation={${branches(prepareBranches,'p',false)}};\nconst prepareRoutes=[${routes(prepareBranches,'preparation.p','e,s')}];\nfunction prepareEvent(e,s){\n${dispatch(prepareBranches,'preparation.p','e,s')}\n}\n`;
// Handlers need the emitting renderer to collect victims; bind via explicit receiver.
output = output.replace(/return preparation\.p(\d+)\(e,s\);/g, 'return preparation.p$1.call(this,e,s);');
output += `const drawing={${branches(drawBranches,'d',true)}};\nconst drawRoutes=[${routes(drawBranches,'drawing.d','e')}];\nfunction drawEvent(e,t,now,submit){\n${dispatch(drawBranches,'drawing.d','e,t,now,submit')}\n}\n`;
output += `class WorldTreeFX {\nconstructor(){this.effects=[];this.cancelled=new Map();}\nemit(event){const item=G.WT_CATALOG.find(s=>s.name===event.skillName);if(!item)return false;const e=structuredClone({kind:'stage',stageIndex:0,repeatIndex:0,...event,element:event.element||item.skill.ele,id:item.id});this.effects.push(e);return e;}\n}\nclass PixelLabFX extends WorldTreeFX {\nemit(event){${emit}}\nlayout(now,visit){\nlet used=0;\nconst submit=(...args)=>{const [e,x,y,scale,frame,rotation,override,stretch=1,alpha=1]=args;const sheet=G.WT_ATLAS.skills[e.id-1],variant=sheet.variants?.[e.element]||sheet.frames,f=override||variant[Math.min(variant.length-1,frame)];if(used>=48)return;visit({x:Math.round(x),y:Math.round(y),scale,angle:rotation,frame:{x:f.x,y:f.y,w:f.w||64,h:f.h||64},scaleY:scale*stretch,alpha,ground:e.renderLayer==='ground'});used++;};\nfor(const e of this.effects){if(now<e.at||now>=e.at+e.duration)continue;drawEvent(e,clamp((now-e.at)/e.duration,0,.999999),now,submit);}\nreturn used;\n}\n}\nworldTreeNativeFx={create(event){const renderer=new PixelLabFX();renderer.emit(event);return renderer;}};\n}\nsafeExposeGlobals({worldTreeNativeFx});\n`;
output=splitPreparation(output);
output=output.replace('const WT_CATALOG=G.WT_CATALOG;', 'const WT_CATALOG=G.WT_CATALOG;\n'+poseSource)
    .replaceAll('G.WT_RIPPLE_JUDGMENT.pose(', 'judgmentPose(')
    .replace('e.sourcePath?.length?G.WT_TIME_ACCELERATION.sourceAt(e.sourcePath,Math.min(now,e.at+5000),e.sourceCell):e.timeCenter','e.timeCenter');
// These functions retain the supplied draw-command ABI. Defaults are decoded
// separately from pose placement so each calculation has one responsibility.
output=output.replace('function paint(e,submit,role,x,y,width,height,angle=0,alpha=1,flipY=false,pivot=0){',
    'function paint(...args){const [e,submit,role,x,y,width,height,angle=0,alpha=1,flipY=false,pivot=0]=args;');
output=output.replace('function pose(e,submit,role,x,y,width,height,angle=0,alpha=1,pivot=0,flip=false,phase=0){',
    'function poseStyle(args){const [angle=0,alpha=1,pivot=0,flip=false,phase=0]=args;return {angle,alpha,pivot,flip,phase};}\nfunction pose(...args){let [e,submit,role,x,y,width,height]=args;let {angle,alpha,pivot,flip,phase}=poseStyle(args.slice(7));');
output=output.replace('function revealLink(e,submit,role,progress,thickness,alpha=1){','function revealLink(...args){const [e,submit,role,progress,thickness,alpha=1]=args;');
output=output.replace('const w=id===7?44:id===11?52:id===14?44:id===26?46:42,h=id===14?7:id===11?10:id===7?11:13;',
    'const w=({7:44,11:52,14:44,26:46})[id]||42,h=({14:7,11:10,7:11})[id]||13;');
const riftTest="windup.id===16&&windup.kind==='windup'&&windup.channelId===stage.channelId&&windup._d&&Math.abs(windup.at+windup.duration-stage.at)<1&&windup.sourceCell.gx===stage.sourceCell.gx&&windup.sourceCell.gy===stage.sourceCell.gy";
output=output.replace('function preparePart2(e,effects){','function matchingRiftWindup(windup,stage){return '+riftTest+';}\nfunction preparePart2(e,effects){').replace('if('+riftTest+')','if(matchingRiftWindup(windup,stage))');
const anchorLine='const anchor=b.anchors?.[frame]||b.anchor,ax=(pivot===1&&b.tip?b.tip.x:anchor.x+(pivot===1?b.width/2:0))*sx,ay=(pivot===1&&b.tip?b.tip.y:anchor.y+(pivot===2?b.height/2:0))*sy;';
output=output.replace('function poseStyle(args){',
    'function poseAnchor(b,frame,pivot,sx,sy){'+anchorLine+'return {ax,ay};}\nfunction poseStyle(args){').replace(anchorLine+'\n  submit','const {ax,ay}=poseAnchor(b,frame,pivot,sx,sy);\n  submit');
output=output.replace('base*(i===1?.78:i===2?1.08:1)','base*[1,.78,1.08][i]').replace('b.height*(i===1?.13:i===2?.2:.17)','b.height*[.17,.13,.2][i]');
output=output.replace('function stage34(e,t,now,submit){\nconst d=', 'function meteorFade(age){return age<1640?1:age<1720?.66:.33;}\nfunction stage34(e,t,now,submit){\nconst d=').replace('endFade=fieldAge<1640?1:fieldAge<1720?.66:.33','endFade=meteorFade(fieldAge)');
output=output.replace("p10(e,s) {\n\n    const ray=e.focusBeamRay||G.WT_FOCUS_BEAM?.ray(e.sourceCell,e.targetCells.at(-1),{range:e.focusBeamRange||s.grid.range});", "p10(e) {\n    const ray=e.focusBeamRay;");
output=output.replace('parts=sheet.focusBeam,scale=parts?.scale||2','parts=sheet.focusBeam,scale=parts.scale');
output=output.replace("if(e.kind==='hit'){\n     const stage=this.effects.find", "if(e.kind!=='hit')return;\n    {\n     const stage=this.effects.find").replace('if(stage)for(const p of e._points)', 'if(!stage)return;for(const p of e._points)');
output=splitNativeGemDrawing(output).replace(/[\t ]+$/gm, '');
write('js/canvas-world-tree-native.js', "'use strict';\n"+output);
console.log('Imported', specs.length, 'effect metadata records and', icons.length, 'icons.');
