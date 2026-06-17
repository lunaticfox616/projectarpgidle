#!/usr/bin/env node
// Regression: expert node untrain (1 point => 1 Orb of Cleansing) and keystone invariant.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const stateSource = fs.readFileSync('js/state.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

function extractLine(source, name) {
  const line = source.split('\n').find(l => l.startsWith(`function ${name}(`));
  assert(line, `${name} must be a single-line declaration`);
  return line;
}
function extractBlock(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert(start >= 0, `${startToken} must exist`);
  const end = source.indexOf(endToken, start);
  assert(end >= 0, `${endToken} must follow ${startToken}`);
  return source.slice(start, end + endToken.length);
}

// Controllable expertise state shared across the extracted functions.
const expertiseState = { nodes: {} };
const context = {
  Math,
  Object,
  ensureExpertiseState: () => expertiseState,
};
vm.createContext(context);
vm.runInContext([
  extractBlock(stateSource, 'const EXPERT_TREE_NODES = [', '];'),
  extractLine(stateSource, 'isExpertKeystoneNode'),
  extractLine(stateSource, 'getExpertBranchNonKeystoneSpent'),
  extractLine(stateSource, 'wouldExpertKeystoneBreak'),
  extractLine(stateSource, 'canUntrainExpertNode'),
  extractLine(stateSource, 'untrainExpertNode'),
  'this.EXPERT_TREE_NODES = EXPERT_TREE_NODES;',
  'this.canUntrainExpertNode = canUntrainExpertNode;',
  'this.untrainExpertNode = untrainExpertNode;',
  'this.getExpertBranchNonKeystoneSpent = getExpertBranchNonKeystoneSpent;',
].join('\n'), context);

const { canUntrainExpertNode, untrainExpertNode } = context;

// Empty node cannot be untrained.
expertiseState.nodes = {};
assert.strictEqual(canUntrainExpertNode('myco_spore_gain'), false, 'an unallocated node cannot be untrained');
assert.strictEqual(untrainExpertNode('myco_spore_gain'), false, 'untraining an unallocated node is a no-op');
assert.strictEqual(canUntrainExpertNode('does_not_exist'), false, 'unknown node id cannot be untrained');

// A normal allocated node untrains one point and frees its spend.
expertiseState.nodes = { myco_spore_gain: 2 };
assert.strictEqual(canUntrainExpertNode('myco_spore_gain'), true, 'an allocated normal node can be untrained');
assert.strictEqual(untrainExpertNode('myco_spore_gain'), true, 'untrain succeeds');
assert.strictEqual(expertiseState.nodes.myco_spore_gain, 1, 'one point is removed');
assert.strictEqual(untrainExpertNode('myco_spore_gain'), true, 'untrain to zero succeeds');
assert.ok(!('myco_spore_gain' in expertiseState.nodes), 'zeroed node entry is deleted');

// Keystone invariant: cannot drop branch below an allocated keystone requirement.
// mycologist keystone requires 10 branch points (non-keystone). Allocate exactly 10 then the keystone.
expertiseState.nodes = {
  myco_spore_gain: 5,   // 5pt
  myco_fossil_drop: 5,  // 5pt => 10 non-keystone branch points
  myco_keystone_restore: 1,
};
assert.strictEqual(context.getExpertBranchNonKeystoneSpent('mycologist'), 10, 'non-keystone branch spend is computed without keystones');
assert.strictEqual(canUntrainExpertNode('myco_spore_gain'), false, 'cannot untrain a node that would orphan an allocated keystone');
assert.strictEqual(untrainExpertNode('myco_spore_gain'), false, 'blocked untrain does not mutate state');
assert.strictEqual(expertiseState.nodes.myco_spore_gain, 5, 'blocked untrain leaves the node untouched');
// The keystone itself can always be removed.
assert.strictEqual(canUntrainExpertNode('myco_keystone_restore'), true, 'the keystone itself can be untrained');
assert.strictEqual(untrainExpertNode('myco_keystone_restore'), true, 'keystone untrain succeeds');
// With the keystone gone, normal nodes untrain freely again.
assert.strictEqual(canUntrainExpertNode('myco_spore_gain'), true, 'after keystone removal the branch node frees up');

// A node above the keystone requirement can still be untrained while the keystone holds.
expertiseState.nodes = {
  myco_spore_gain: 5,
  myco_fossil_drop: 5,
  myco_restore_reward: 1, // 11 non-keystone points => 1 point of slack above the requirement
  myco_keystone_restore: 1,
};
assert.strictEqual(canUntrainExpertNode('myco_restore_reward'), true, 'untraining is allowed while staying at/above the keystone requirement');

// UI wiring: the untrain handler spends exactly one Orb of Cleansing (scour) and is exposed for inline handlers.
assert(uiSource.includes('function askUntrainExpertNode('), 'untrain handler must exist in ui.js');
assert(/game\.currencies\.scour\b/.test(uiSource.split('function askUntrainExpertNode(')[1].slice(0, 600)), 'untrain handler must consume the scour currency');
assert(uiSource.includes('onclick="askUntrainExpertNode('), 'node row must wire the untrain button');
assert(uiSource.includes('showExpertNodeTooltip(event'), 'node row must wire the hover tooltip');
assert(uiSource.includes('class="expertise-node branch-${node.branch}'), 'node buttons must carry their branch color class');

console.log('expert node untrain smoke checks passed');
