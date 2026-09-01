#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { buildRuntimeTree } = require('./build-passive-tree-runtime');
const { sanitizeIconName, validatePassiveTree } = require('./lib/passive-tree-editor-model');

function fixture() {
    return {
        statsSchemaVersion: 5,
        nodes: [
            { id: 'start', x: 0, y: 0, type: 'start', cat: 'none', name: '전사', desc: '', mods: [],
                runtimeEffects: [], startClassId: 'warrior' },
            { id: 'life', x: 100, y: 0, type: 'minor', cat: 'def', name: '생명', desc: '생명력 +10',
                mods: [{ statId: 'flatHp', value: 10 }], runtimeEffects: [{ statId: 'flatHp', value: 10 }],
                iconFamily: 'life', iconAsset: 'assets/ui/passive-custom-icons/life.webp' }
        ],
        edges: [{ a: 'start', b: 'life' }]
    };
}

const valid = validatePassiveTree(fixture(), ['flatHp']);
assert.strictEqual(valid.valid, true, 'a connected editor tree with supported effects should validate');
assert.deepStrictEqual(valid.summary, { nodes: 2, edges: 1, disconnected: 0, overlaps: 0 });

const runtime = buildRuntimeTree(fixture());
assert.strictEqual(runtime.nodes.life.iconFamily, 'life', 'the selected atlas family must reach the game runtime');
assert.strictEqual(runtime.nodes.life.iconAsset, 'assets/ui/passive-custom-icons/life.webp',
    'a custom editor icon must reach the game runtime');

const broken = fixture();
broken.nodes.push({ ...broken.nodes[1] });
broken.edges.push({ a: 'life', b: 'missing' });
broken.nodes[1].runtimeEffects = [{ statId: 'not-supported', value: 10 }];
const invalid = validatePassiveTree(broken, ['flatHp']);
assert.strictEqual(invalid.valid, false, 'duplicate ids, dangling edges, and unsupported effects must block saving');
assert(invalid.errors.some(error => error.includes('중복 노드 ID')));
assert(invalid.errors.some(error => error.includes('존재하지 않는 노드 연결')));
assert(invalid.errors.some(error => error.includes('미지원 효과')));

assert.strictEqual(sanitizeIconName('../../My Fancy Icon.PNG'), 'my-fancy-icon',
    'uploaded icon names must stay inside the dedicated asset directory');

console.log('smoke-passive-tree-editor passed');
