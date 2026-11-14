// Keep the vetted PixelLab expressions, but publish their actual ESM dependencies.
const espree = require('espree');
const eslintScope = require('eslint-scope');
const assert = require('node:assert/strict');

function parse(source) {
    return espree.parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
}

function withoutRegistry(source) {
    const changes = [];
    function visit(node) {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(visit); return; }
        if (node.type === 'MemberExpression' && node.object.name === 'G') {
            assert.equal(node.computed, false);
            changes.push({ start: node.range[0], end: node.range[1], text: node.property.name });
        }
        for (const [key, value] of Object.entries(node)) if (key !== 'range') visit(value);
    }
    visit(parse(source));
    for (const edit of changes.sort((a, b) => b.start - a.start)) {
        source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
    }
    // The first melee hit is painted by contact, so this branch intentionally draws only later links.
    return source.replace('if(e.stageIndex===0){/* confirmed hit carries the first strong melee blow */}else link(', 'if(e.stageIndex!==0)link(');
}

function descriptionSource(block, source) {
    const assignment = block.body.at(-1).expression;
    assert.equal(assignment.type, 'AssignmentExpression');
    assert.equal(assignment.left.object.name, 'G');
    const name = assignment.left.property.name;
    const body = block.body.slice(0, -1).map(node => source.slice(...node.range)).join('\n');
    return { name, source: body + `\nconst ${name} = ${source.slice(...assignment.right.range)};\n` };
}

function groupedSources(source) {
    const body = parse(source).body.find(node => node.type === 'BlockStatement').body;
    const registry = body[0].declarations[0];
    assert.equal(registry.id.name, 'G');
    assert.equal(body[1].declarations[0].id.name, 'WT_CATALOG');
    const catalog = registry.init.properties.find(node => node.key.name === 'WT_CATALOG').value;
    const groups = new Map([['world-tree-effect-values', [
        "import { SKILL_FX_ATLAS } from '../data/skill-fx-atlas.mjs';",
        'const WT_ATLAS = { skills: Object.values(SKILL_FX_ATLAS) };',
        `const WT_CATALOG = ${source.slice(...catalog.range)};`
    ]], ['world-tree-effect-prepare', []], ['world-tree-effect-draw', []], ['world-tree-native', []]]);
    let group = 'world-tree-effect-values';
    for (const node of body.slice(2, -1)) {
        const name = node.id?.name || node.declarations?.[0]?.id.name;
        if (node.type === 'BlockStatement') {
            const part = descriptionSource(node, source);
            const file = part.name === 'WT_REMAKE15' ? 'world-tree-effect-remakes' : 'world-tree-effect-descriptions';
            assert(!groups.has(file));
            groups.set(file, [part.source]);
            continue;
        }
        if (name === 'prepareEventStyle0') group = 'world-tree-effect-prepare';
        if (name === 'gemDraw2Part0') group = 'world-tree-effect-draw';
        if (name === 'WorldTreeFX') group = 'world-tree-native';
        groups.get(group).push(source.slice(...node.range));
    }
    assert.equal(body.at(-1).expression.left.name, 'worldTreeNativeFx');
    return new Map([...groups].map(([file, lines]) => [file, withoutRegistry(lines.join('\n'))]));
}

function injectClone(source) {
    const constructor = 'constructor(){this.effects=[];this.cancelled=new Map();}';
    assert(source.includes(constructor));
    assert(source.includes('structuredClone({'));
    return source.replace(constructor, 'constructor(cloneEvent){this.cloneEvent=cloneEvent;this.effects=[];this.cancelled=new Map();}')
        .replace('structuredClone({', 'this.cloneEvent({') + `

export function createWorldTreeNativeFx(cloneEvent) {
    return Object.freeze({
        create(event) {
            const renderer = new PixelLabFX(cloneEvent);
            renderer.emit(event);
            return renderer;
        }
    });
}
`;
}

function moduleScope(source) {
    const ast = parse(source);
    const scopes = eslintScope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
    return scopes.scopes.find(scope => scope.type === 'module');
}

function connectImports(groups) {
    const scopes = new Map([...groups].map(([file, source]) => [file, moduleScope(source)]));
    const outgoing = new Map([...groups.keys()].map(file => [file, new Set()]));
    const incoming = new Map([...groups.keys()].map(file => [file, new Map()]));
    for (const [file, scope] of scopes) {
        for (const name of new Set(scope.through.map(ref => ref.identifier.name))) {
            const owners = [...scopes].filter(([other, row]) => {
                if (other === file || !row.set.has(name)) return false;
                if (other === 'world-tree-effect-remakes') return name === 'WT_REMAKE15';
                if (other === 'world-tree-effect-descriptions') return name === 'WT_DESCRIPTION10';
                return true;
            });
            assert(owners.length <= 1, `Ambiguous effect binding ${file}: ${name}`);
            if (!owners.length) continue; // Standard language builtins are checked by build:modules.
            const owner = owners[0][0];
            outgoing.get(owner).add(name);
            const names = incoming.get(file).get(owner) || new Set();
            names.add(name);
            incoming.get(file).set(owner, names);
        }
    }
    return new Map([...groups].map(([file, source]) => {
        const imports = [...incoming.get(file)].map(([owner, names]) => `import { ${[...names].join(', ')} } from './${owner}.mjs';`);
        const names = [...outgoing.get(file)];
        const exports = names.length ? `\nexport { ${names.join(', ')} };\n` : '';
        return [`modules/rendering/${file}.mjs`, imports.join('\n') + '\n' + source + exports];
    }));
}

module.exports = function worldTreeEffectModules(source) {
    const groups = groupedSources(source);
    groups.set('world-tree-native', injectClone(groups.get('world-tree-native')));
    return connectImports(groups);
};
