#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/combat.js', 'utf8');

function extractFunctionBlock(text, name) {
  const start = text.indexOf(`function ${name}`);
  assert(start >= 0, `${name} must exist`);
  const bodyStart = text.indexOf('{', text.indexOf(')', start));
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = bodyStart; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error(`${name} body not found`);
}

const rightRing = {
  rarity: 'unique',
  name: '군주의 오른손 고리',
  uniqueEffectKey: 'rightRingSummonCap',
  uniqueEffectParams: { cap: 1 }
};
const mirror = { rarity: 'unique', name: '거울 반지', uniqueEffectKey: 'mirrorOppositeRing' };
const sandbox = { game: { equipment: { '반지1': mirror, '반지2': rightRing } } };
vm.createContext(sandbox);
vm.runInContext([
  extractFunctionBlock(source, 'getOppositeRingSlotKey'),
  extractFunctionBlock(source, 'getMirrorRingSourceSlot'),
  extractFunctionBlock(source, 'getMirrorRingSourceItem'),
  `this.copyMirrorEffect = function(equipSlotKey, item) {
    const mirrorSourceItem = getMirrorRingSourceItem(equipSlotKey, item);
    if (!mirrorSourceItem || mirrorSourceItem.rarity !== 'unique' || !mirrorSourceItem.uniqueEffectKey) return null;
    return { key: mirrorSourceItem.uniqueEffectKey, sourceSlot: getOppositeRingSlotKey(equipSlotKey) };
  };`
].join('\n'), sandbox);

assert.strictEqual(sandbox.getMirrorRingSourceSlot('반지1', mirror), '반지2', 'mirror in ring1 must read the opposite ring2 slot as its source');
const ring1Copy = sandbox.copyMirrorEffect('반지1', mirror);
assert.strictEqual(ring1Copy.key, 'rightRingSummonCap', 'mirror must copy the opposite ring unique effect key');
assert.strictEqual(ring1Copy.sourceSlot, '반지2', 'copied slot-sensitive unique effects must preserve the copied ring source slot');

sandbox.game.equipment = { '반지1': rightRing, '반지2': mirror };
const ring2Copy = sandbox.copyMirrorEffect('반지2', mirror);
assert.strictEqual(ring2Copy.key, 'rightRingSummonCap', 'mirror must copy the opposite ring unique effect key after swapping slots');
assert.strictEqual(ring2Copy.sourceSlot, '반지1', 'mirror in ring2 must not make a ring1-only source look like ring2');

console.log('mirror ring source slot smoke checks passed');
