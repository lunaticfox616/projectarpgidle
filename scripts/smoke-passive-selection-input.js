// Real tree input handlers and allocation, with only DOM/event/canvas boundaries replaced.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const nodes = new Map(), windowEvents = new Map(), documentEvents = new Map();
function element() {
    const listeners = new Map(), classes = new Set();
    return { listeners, style: {}, dataset: {}, hidden: false, innerHTML: '', offsetParent: null,
        classList: { add: key => classes.add(key), remove: key => classes.delete(key), contains: key => classes.has(key),
            toggle(key, on) { if (on) classes.add(key); else classes.delete(key); } },
        setAttribute() {}, removeAttribute() {}, appendChild(child) { nodes.set(child.id, child); },
        addEventListener: (type, handler) => listeners.set(type, handler),
        querySelector: selector => selector === '[data-passive-confirm]' ? confirmButton : closeButton,
        querySelectorAll: () => [], getBoundingClientRect: () => ({left:0,top:0,width:390,height:700}),
        getClientRects: () => [], getContext: () => null };
}
const confirmButton = {}, closeButton = {}, toolbar = element();
const runtime = buildGameRuntime();
runtime.document.getElementById = id => nodes.get(id) || null;
runtime.document.querySelector = selector => selector === '.passive-tree-toolbar' ? toolbar
    : selector === '[data-passive-confirm]' ? confirmButton : null;
runtime.document.createElement = element;
runtime.document.addEventListener = (type, handler) => documentEvents.set(type, handler);
runtime.addEventListener = (type, handler) => windowEvents.set(type, handler);
runtime.matchMedia = () => ({matches:true});
const canvas = element();
nodes.set('tree-canvas', canvas); nodes.set('canvas-tooltip', element()); nodes.set('tab-char', element());
const run = code => vm.runInContext(code, runtime);
run(`game=mergeDefaults({selectedClassId:'archer',heroSelectionInitialized:true});window.game=game;
    game.passivePoints=2;game.passives=[];calculateReachableNodes();refreshPassiveVisibility();
    var inputTarget=[...reachableNodes].map(id=>PASSIVE_TREE.nodes[id]).find(node=>node.kind==='path');
    if(!inputTarget) throw new Error('Expected a reachable starter path node');
    setupCanvasEvents(); camZoom=1;camX=-inputTarget.x;camY=-inputTarget.y;
    passiveCanvasMetrics.width=390;passiveCanvasMetrics.height=700;`);
const point = {clientX:215,clientY:350}; // 20px from the centre: touch hit, outside the mouse hit circle.
async function main() {
    canvas.listeners.get('touchend')({preventDefault(){},touches:[],changedTouches:[point]});
    assert.equal(run('game.passivePoints'), 2, 'selecting a node does not allocate it');
    assert.equal(nodes.get('passive-mobile-detail').hidden, false, 'touch selection opens a detail panel');
    await confirmButton.onclick();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(run('game.passives.includes(inputTarget.id)'), true,
        'confirmation activates the selected node, even when the original touch was outside the mouse radius');
    assert.equal(run('game.passivePoints'), 1, 'one confirmation spends exactly one point');
    assert.equal(nodes.get('passive-mobile-detail').hidden, true, 'confirmed details close instead of retaining stale cost');
    await confirmButton.onclick();
    assert.equal(run('game.passivePoints'), 1, 'a second stale confirmation cannot spend again or start a refund');

    run('game.passives=[];game.passivePoints=2;calculateReachableNodes();refreshPassiveVisibility();');
    canvas.listeners.get('mousedown')({button:0,clientX:195,clientY:350});
    documentEvents.get('mouseup')({button:0,clientX:195,clientY:350,target:canvas});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(run('game.passivePoints'), 2, 'a mouse click in the phone layout previews instead of spending immediately');
    assert.equal(nodes.get('passive-mobile-detail').hidden, false);
    await confirmButton.onclick();
    assert.equal(run('game.passivePoints'), 1, 'phone mouse confirmation allocates exactly once');
    console.log('Passive input: touch hit tolerance and phone mouse confirmation preserve selection and point cost');
}
main().catch(error => { console.error(error); process.exitCode=1; });
