const assert = require('assert');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();

function makeTooltip(width, height) {
    return {
        style: { display: 'block', left: '12px', top: '7px' },
        getBoundingClientRect: () => ({ width, height })
    };
}

context.innerWidth = 1280;
context.innerHeight = 720;
context.devicePixelRatio = 1.25;
const scaledTooltip = makeTooltip(340, 180);
context.applyTooltipPosition(scaledTooltip, 360, 190);
assert.strictEqual(scaledTooltip.style.left, '0px');
assert.strictEqual(scaledTooltip.style.top, '0px');
assert.strictEqual(scaledTooltip.style.transform, 'translate(378.4px, 208px)',
    '125 percent display scaling must snap tooltip translation to physical pixels');

context.devicePixelRatio = 1;
const nativeTooltip = makeTooltip(200, 100);
context.applyTooltipPosition(nativeTooltip, 360, 190);
assert.strictEqual(nativeTooltip.style.transform, 'translate(378px, 208px)',
    'native display scaling must preserve integer CSS-pixel placement');

console.log('smoke-tooltip-positioning passed');
