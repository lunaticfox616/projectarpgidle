const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/core-cube.js', 'utf8');

function readFunctionSource(name) {
    const start = source.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must exist`);
    const bodyStart = source.indexOf('{', source.indexOf(')', start));
    let depth = 0;
    for (let index = bodyStart; index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] !== '}') continue;
        depth--;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

const viewStart = source.indexOf('const coreCubeCanvasView =');
const viewEnd = source.indexOf('\n};', viewStart) + 3;
assert(viewStart >= 0 && viewEnd > viewStart, 'core cube canvas state must exist');

let scheduledFrame = null;
let cancelledFrame = 0;
let drawCount = 0;
const context = {
    Math,
    performance: { now: () => 1 },
    requestAnimationFrame: callback => { scheduledFrame = callback; return 7; },
    cancelAnimationFrame: id => { cancelledFrame = id; },
    drawCoreCubeCanvas: () => { drawCount++; },
    coreCubeCreateRotationMatrix: () => [[1]],
    coreCubeMultiplyMatrices: () => [[1]]
};
vm.createContext(context);
vm.runInContext([
    source.slice(viewStart, viewEnd),
    readFunctionSource('isCoreCubeCanvasVisible'),
    readFunctionSource('startCoreCubeCanvasAnimation')
].join('\n'), context, { filename: 'core-cube-canvas-lifecycle.js' });

const view = vm.runInContext('coreCubeCanvasView', context);
const hiddenCanvas = { isConnected: true, getClientRects: () => [] };
view.canvas = hiddenCanvas;
context.startCoreCubeCanvasAnimation();
assert.strictEqual(scheduledFrame, null, 'a hidden cube panel must not schedule animation frames');
assert.strictEqual(view.animationFrame, null, 'a hidden cube panel must clear its frame handle');

const visibleCanvas = { isConnected: true, getClientRects: () => [{}] };
view.canvas = visibleCanvas;
context.startCoreCubeCanvasAnimation();
assert.strictEqual(view.animationFrame, 7, 'a visible cube panel must schedule animation');
const visibleFrame = scheduledFrame;
visibleFrame();
assert.strictEqual(drawCount, 1, 'a visible cube panel must render its animation frame');
assert.strictEqual(view.animationFrame, 7, 'visible animation must schedule its next frame');

context.startCoreCubeCanvasAnimation();
assert.strictEqual(cancelledFrame, 7, 'reopening the visible cube must replace the previous animation handle');

visibleCanvas.getClientRects = () => [];
scheduledFrame();
assert.strictEqual(view.animationFrame, null, 'animation must stop after switching away from the cube pane');

console.log('smoke-core-cube-canvas-lifecycle passed');
