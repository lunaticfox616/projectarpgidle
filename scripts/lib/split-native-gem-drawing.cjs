// Preserve supplied expressions while separating independent drawing phases.
const espree=require('espree');
module.exports=function splitNativeGemDrawing(source) {
    const ast=espree.parse(source,{ecmaVersion:'latest',range:true});
    const scope=ast.body.find(n=>n.type==='BlockStatement');
    const drawing=scope.body.find(n=>n.type==='VariableDeclaration' && n.declarations[0].id.name==='drawing').declarations[0].init;
    const edits=[],helpers=[];
    const text=node=>source.slice(...node.range);
    for(const prop of drawing.properties.filter(p=>['d2','d3','d4','d13','d14'].includes(p.key.name))) {
        const body=prop.value.body.body,decls=body.filter(n=>n.type==='VariableDeclaration').flatMap(n=>n.declarations);
        function declarations(code) {
            const selected=new Set();let changed=true;
            while(changed) {
                changed=false;
                for(const decl of decls) {
                    if(selected.has(decl) || !new RegExp('\\b'+decl.id.name+'\\b').test(code))continue;
                    selected.add(decl);code+='\n'+text(decl.init);changed=true;
                }
            }
            return decls.filter(d=>selected.has(d)).map(d=>'const '+text(d)+';').join('\n');
        }
        function extract(node) {
            const name='gemDraw'+prop.key.name.slice(1)+'Part'+helpers.length;
            const code=node.type==='BlockStatement'?text(node).slice(1,-1):text(node);
            helpers.push('function '+name+'(e,t,now,submit){\n'+declarations(code)+'\n'+code+'\n}');
            return name+'(e,t,now,submit);';
        }
        const statements=[];
        for(const node of body) {
            if(node.type==='VariableDeclaration')continue;
            if(node.type==='ForStatement' || node.type==='ForOfStatement') {statements.push(extract(node));continue;}
            if(node.type!=='IfStatement' || node.consequent.type!=='BlockStatement') {statements.push(text(node));continue;}
            let code='';
            for(let part=node;part;part=part.alternate) {
                code+=(code?'else ':'')+'if('+text(part.test)+'){'+extract(part.consequent)+'}';
            }
            statements.push(code);
        }
        let replacement=statements.join('\n');
        replacement=declarations(replacement)+'\n'+replacement;
        edits.push({range:prop.value.body.range,text:'{\n'+replacement+'\n}'});
    }
    for(const edit of edits.sort((a,b)=>b.range[0]-a.range[0]))source=source.slice(0,edit.range[0])+edit.text+source.slice(edit.range[1]);
    return source.replace('const drawing={',helpers.join('\n')+'\nconst drawing={');
};
