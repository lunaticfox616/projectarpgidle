const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const layoutCss = fs.readFileSync('css/layout.css', 'utf8');

const fnMatch = uiSource.match(/function isAscendKeystoneRequirementMet\(node\) \{[\s\S]*?\n\}/);
assert(fnMatch, 'isAscendKeystoneRequirementMet must exist');

const context = {
  game: {
    ascendClass: 'warrior',
    ascendKeystones: [],
    bloomedClasses: [],
    bloomedClassThisLoop: null
  }
};
vm.createContext(context);
vm.runInContext(`${fnMatch[0]}; this.isAscendKeystoneRequirementMet = isAscendKeystoneRequirementMet;`, context);

assert.strictEqual(
  context.isAscendKeystoneRequirementMet({ id: 'w9', fifthJobOnly: true }),
  false,
  '9th/fifth keystone must require the current class to be bloomed THIS loop'
);
// 영구 기록(bloomedClasses)만으로는 더 이상 5차 키스톤이 열리지 않는다 — 이번 루프 개화가 필요.
context.game.bloomedClasses = ['warrior'];
assert.strictEqual(
  context.isAscendKeystoneRequirementMet({ id: 'w9', fifthJobOnly: true }),
  false,
  '5th keystone must NOT unlock from the permanent record alone (node resets each loop)'
);
context.game.bloomedClassThisLoop = 'warrior';
assert.strictEqual(
  context.isAscendKeystoneRequirementMet({ id: 'w9', fifthJobOnly: true }),
  true,
  '5th keystone should unlock once the current class is bloomed this loop'
);

assert.strictEqual(
  context.isAscendKeystoneRequirementMet({ id: 'w4', req: 'w1' }),
  false,
  'single prerequisite should remain locked when not learned'
);
context.game.ascendKeystones = ['w1'];
assert.strictEqual(
  context.isAscendKeystoneRequirementMet({ id: 'w4', req: 'w1' }),
  true,
  'single prerequisite should unlock when learned'
);
assert.strictEqual(
  context.isAscendKeystoneRequirementMet({ id: 'w8', reqAny: ['w6', 'w7'] }),
  false,
  'any-prerequisite should remain locked when no listed keystone is learned'
);
context.game.ascendKeystones = ['w7'];
assert.strictEqual(
  context.isAscendKeystoneRequirementMet({ id: 'w8', reqAny: ['w6', 'w7'] }),
  true,
  'any-prerequisite should unlock when one listed keystone is learned'
);

const lockedRule = layoutCss.match(/\.trait-card\.locked \{([^}]*)\}/);
assert(lockedRule, 'locked trait-card CSS rule must exist');
assert(!lockedRule[1].includes('pointer-events: none'), 'locked trait cards must keep pointer events for hover prerequisite highlighting');
assert(lockedRule[1].includes('cursor: not-allowed'), 'locked trait cards should communicate that they cannot be clicked');
assert(layoutCss.includes('.trait-card.ks-self-hi {'), 'hover self-highlight should also apply to locked keystone cards');
assert(uiSource.includes('해금: 5차 전직(재능 개화)'), '9th/fifth keystone UI should show its 5th job unlock condition');
assert(!uiSource.includes('선행: 5차 전직(재능 개화)'), '9th/fifth keystone UI must not describe 5th job as a prior keystone');

console.log('smoke-ascend-keystone-hover-and-fifth passed');
