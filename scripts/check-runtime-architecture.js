'use strict';
const fs = require('fs');
const cp = require('child_process');
const {Linter} = require('eslint');
const espree = require('espree');
const browserGlobals = require('globals').browser;
const baselinePath = 'scripts/runtime-analysis-baseline.json';

function walk(node, visit, parent = null) {
    if (!node || typeof node !== 'object') return;
    if (node.type) visit(node, parent);
    for (const [key, value] of Object.entries(node)) {
        if (key === 'parent') continue;
        if (Array.isArray(value)) value.forEach(child => walk(child, visit, node));
        else if (value && typeof value === 'object') walk(value, visit, node);
    }
}

function readSources(head) {
    const html = head ? cp.execFileSync('git', ['show', 'HEAD:index.html'], {encoding:'utf8'}) : fs.readFileSync('index.html','utf8');
    const files = [...html.matchAll(/<script\b[^>]*\bsrc="([^"?]+)(?:\?[^" ]*)?"/g)]
        .map(match => match[1]).filter(file => !/^https?:/.test(file) && !file.startsWith('vendor/'));   // vendor/: 남의 라이브러리 사본, 우리 규칙 대상이 아니다
    return files.map(file => {
        const source = head ? cp.execFileSync('git',['show',`HEAD:${file}`],{encoding:'utf8',maxBuffer:16*1024*1024}) : fs.readFileSync(file,'utf8');
        return {file,source,ast:espree.parse(source,{ecmaVersion:'latest',sourceType:'script',loc:true,range:true})};
    });
}

function declaredNames(row) {
    const names = new Set();
    const objects = new Map();
    walk(row.ast, node => {
        if(node.type === 'VariableDeclarator' && node.init?.type === 'ObjectExpression') objects.set(node.id.name,node.init);
    });
    for (const node of row.ast.body) {
        if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') names.add(node.id.name);
        if (node.type === 'VariableDeclaration') node.declarations.forEach(entry => {if(entry.id.name) names.add(entry.id.name);});
    }
    walk(row.ast, node => {
        if (node.type !== 'CallExpression' || !['safeExposeGlobals','safeExposeData'].includes(node.callee.name)) return;
        const argument = objects.get(node.arguments[0]?.name) || node.arguments[0];
        if (argument && argument.type === 'ObjectExpression') argument.properties.forEach(prop => names.add(prop.key.name || prop.key.value));
    });
    return names;
}

function isUi(file) {
    return /(?:^|\/)(?:ui|main|goal-system|cosmos-atlas|canvas-[^/]+|[^/]+-ui)\.js$/.test(file);
}

function analyze(rows) {
    const owners = new Map(), findings = {}, edges = new Set();
    for (const row of rows) for (const name of declaredNames(row)) {
        if (!owners.has(name)) owners.set(name, new Set());
        owners.get(name).add(row.file);
    }
    const globals = {...browserGlobals, ...Object.fromEntries([...owners.keys()].map(name => [name,'writable']))};
    const linter = new Linter();
    const rules = {'complexity':['error',10], 'max-depth':['error',3], 'max-lines-per-function':['error',60],
        'max-params':['error',5], 'no-unused-vars':['error',{vars:'local',args:'after-used'}],
        'no-undef':'error','no-unreachable':'error','no-empty':'error'};
    for (const row of rows) {
        const messages = linter.verify(row.source,[{languageOptions:{ecmaVersion:'latest',sourceType:'script',globals},rules}]);
        const source = linter.getSourceCode();
        for (const message of messages) recordFinding(findings,row,message,source);
        collectEdges(row,source,owners,edges,rows.map(entry=>entry.file));
    }
    for (const [name, files] of owners) if (files.size > 1) edges.add(`duplicate:${name}:${[...files].sort().join(',')}`);
    return {findings,edges:[...edges].sort()};
}

function ownerName(node,fallback) {
    while(node){
        if(/Function/.test(node.type)) {
            const name=node.id?.name || node.parent?.id?.name || node.parent?.key?.name;
            if(name)return name;
        }
        node=node.parent;
    }
    return fallback;
}

function recordFinding(findings,row,message,source) {
    const node = source.getNodeByRangeIndex(source.getIndexFromLoc({line:message.line,column:Math.max(0,message.column-1)}));
    const owner = ownerName(node,row.file);
    const key = `${owner}|${message.ruleId}|${message.message.replace(/\b\d+\b/g,'#')}`;
    const metric = /^(complexity|max-depth|max-lines-per-function|max-params)$/.test(message.ruleId)
        ? Number((message.message.match(/\b\d+\b/) || [0])[0]) : 0;
    const entry = findings[key] || {count:0,max:0};
    entry.count++; entry.max = Math.max(entry.max,metric); findings[key] = entry;
}

function collectEdges(row,source,owners,edges,order) {
    walk(source.ast,node => {
        const caller=ownerName(node,`${row.file}#top`);
        if(node.type==='CallExpression' && node.callee.type==='Identifier'){
            const callee=node.callee.name;
            edges.add(`dependency:${caller}->${callee}`);
            for(const target of owners.get(callee) || []) {
                if(target!==row.file && !isUi(row.file) && isUi(target)) edges.add(`layer:${caller}->${callee}`);
                if(source.getScope(node).type==='global' && order.indexOf(target)>order.indexOf(row.file)) edges.add(`load-order:${row.file}->${callee}`);
            }
        }
        if (node.type !== 'AssignmentExpression' || node.left.type !== 'MemberExpression') return;
        if (['window','globalThis'].includes(node.left.object.name)) edges.add(`window:${caller}:${node.left.property.name || node.left.property.value}`);
    });
}

function compare(current,baseline) {
    const failures=[];
    for (const [key,value] of Object.entries(current.findings)) {
        const allowed=baseline.findings[key] || {count:0,max:0};
        if(value.count>allowed.count || value.max>allowed.max) failures.push(`lint ${key} (${value.count}/${value.max}, baseline ${allowed.count}/${allowed.max})`);
    }
    const allowedEdges=new Set(baseline.edges), calls=callGraph(current.edges);
    for(const edge of current.edges) {
        if (!edge.startsWith('dependency:') && !allowedEdges.has(edge)) failures.push(edge);
        // Reject a newly introduced edge that closes an existing reverse path; the path is printed so the cycle can be read.
        const path = edge.startsWith('dependency:') && !allowedEdges.has(edge) ? cyclePath(edge,calls) : null;
        if (path) failures.push(`cycle ${edge} (${path.join(' -> ')})`);
    }
    // Calls are joined by bare function names, so a same-named function in another file can close a cycle that the code does not
    // have (2026-10-27: an object method named follow). Renaming the new function settles it.
    if (failures.some(row => row.startsWith('cycle '))) failures.push('cycle note: functions are matched by name across files; a cycle through a common name (an object method like follow, init, render) may be a name clash, and renaming the new function settles it.');
    return failures;
}

// Index callers once; scanning every edge per visited node made each new call edge quadratic.
function callGraph(edges) {
    const calls=new Map();
    for(const edge of edges) if(edge.startsWith('dependency:')) {
        const [from,to]=edge.slice(11).split('->');
        if(!calls.has(from))calls.set(from,[]);
        calls.get(from).push(to);
    }
    return calls;
}

/** The call path the new edge from->to closes (from, to, ..., from), or null when it closes none. */
function cyclePath(edge,calls) {
    if(Array.isArray(calls))calls=callGraph(calls);
    const [from,to]=edge.slice(11).split('->'), pending=[to], prev=new Map([[to,null]]);
    for(let i=0;i<pending.length;i++){
        const next=pending[i];
        if(next===from){
            const back=[];
            for(let at=next; at!==null; at=prev.get(at)) back.push(at);
            return [from,...back.reverse()];
        }
        for(const callee of calls.get(next) || []) if(!prev.has(callee)) { prev.set(callee,next); pending.push(callee); }
    }
    return null;
}

const closesCycle=(edge,calls)=>!!cyclePath(edge,calls);

// 브라우저 기본 툴팁은 쓰지 않는다(2026-10-31 사용자, 기준선 없이 0개): 설명은 data-tip으로 단다(js/plain-tip-ui.js).
const NATIVE_TIP_MARKUP = /(?<![\w-])title=|<title[\s>]/;
const DATA_TITLE_OWNERS = new Set(['node','pick','activeTutorial']);   // 패시브 노드와 튜토리얼의 제목 칸: 화면 속성이 아니다
function isNativeTooltip(node) {
    if (node.type === 'Literal') return typeof node.value === 'string' && NATIVE_TIP_MARKUP.test(node.value);
    if (node.type === 'TemplateElement') return NATIVE_TIP_MARKUP.test(node.value.raw);
    if (node.type === 'AssignmentExpression') return node.left.type === 'MemberExpression' && node.left.property.name === 'title' && !DATA_TITLE_OWNERS.has(node.left.object.name);
    if (node.type === 'CallExpression') return node.callee.type === 'MemberExpression' && node.callee.property.name === 'setAttribute' && node.arguments[0]?.value === 'title';
    return false;
}
function nativeTooltipFailures(rows,html) {
    const hint = '브라우저 기본 툴팁 금지, data-tip을 쓴다(js/plain-tip-ui.js)';
    const failures = html.replace(/<title>[^<]*<\/title>/,'').split(/\r?\n/).flatMap((line,index) => (NATIVE_TIP_MARKUP.test(line) ? [`index.html:${index+1}: ${hint}`] : []));
    for (const row of rows.filter(row => row.file.startsWith('js/'))) walk(row.ast, node => { if (isNativeTooltip(node)) failures.push(`${row.file}:${node.loc.start.line}: ${hint}`); });
    return failures;
}

if(require.main===module){
    if(process.argv.includes('--baseline-from-head')) {
        fs.writeFileSync(baselinePath,JSON.stringify(analyze(readSources(true)),null,2)+'\n');
    } else {
        const sources=readSources(false);
        const failures=[...compare(analyze(sources),JSON.parse(fs.readFileSync(baselinePath,'utf8'))),...nativeTooltipFailures(sources,fs.readFileSync('index.html','utf8'))];
        if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
        else console.log('runtime architecture/lint ratchet passed');
    }
}
module.exports={analyze,compare,closesCycle,nativeTooltipFailures};
