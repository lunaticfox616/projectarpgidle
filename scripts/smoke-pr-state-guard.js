const assert = require('assert');
const { evaluatePrState, parseGitHubRemote } = require('./check-pr-state');

const mergedPr = { number: 948, state: 'closed', merged_at: '2026-08-13T15:05:35Z', html_url: 'https://example/pr/948' };
const openPr = { number: 949, state: 'open', merged_at: null, html_url: 'https://example/pr/949' };

assert.deepStrictEqual(parseGitHubRemote('https://github.com/example/game.git'), { owner: 'example', repo: 'game' });
assert.deepStrictEqual(parseGitHubRemote('git@github.com:example/game.git'), { owner: 'example', repo: 'game' });
assert.strictEqual(evaluatePrState({ branch: 'feature', ahead: 1, pulls: [] }).ok, true);
assert.strictEqual(evaluatePrState({ branch: 'feature', ahead: 0, pulls: [] }).ok, false);
assert.match(evaluatePrState({ branch: 'feature', ahead: 1, behind: 2, pulls: [] }).message, /2커밋 뒤처져/);
assert.match(evaluatePrState({ branch: 'feature', ahead: 1, pulls: [mergedPr] }).message, /#948.*이미 병합됨/);
assert.match(evaluatePrState({ branch: 'feature', ahead: 1, pulls: [openPr] }).message, /#949.*이미 열려 있음/);
assert.strictEqual(evaluatePrState({ branch: 'main', ahead: 1, pulls: [] }).ok, false);

console.log('smoke-pr-state-guard passed');
