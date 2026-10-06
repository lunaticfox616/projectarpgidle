const assert = require('assert');
const { evaluatePrState, parseGitHubRemote, fetchBranchPulls, ghApiPulls } = require('./check-pr-state');

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

// The PR lookup (network boundary mocked): a refused token is retried without it; failures say why.
const reply = (status, body = []) => ({ ok: status === 200, status, json: async () => body });
(async () => {
    const calls = [];
    const refusedThenPublic = async (url, { headers }) => { calls.push(!!headers.Authorization); return calls.length === 1 ? reply(401) : reply(200, [openPr]); };
    assert.deepStrictEqual(await fetchBranchPulls('u', 'stale-token', refusedThenPublic), [openPr], 'a refused token falls back to the public read');
    assert.deepStrictEqual(calls, [true, false], 'one try with the token, one without');
    await assert.rejects(fetchBranchPulls('u', 'stale-token', async () => reply(401)), /HTTP 401 \(토큰이 거부되어/);
    await assert.rejects(fetchBranchPulls('u', '', async () => reply(404)), /HTTP 404 \(토큰 없이 조회/);
    let tries = 0;
    await assert.rejects(fetchBranchPulls('u', 'token', async () => { tries++; return reply(500); }), /HTTP 500$/);
    assert.strictEqual(tries, 1, 'only a 401 retries');
    // When the direct call fails, the GitHub CLI answers; without it both failures are named.
    const direct = new Error('GitHub PR 조회 실패: HTTP 403');
    assert.deepStrictEqual(ghApiPulls('repos/o/r/pulls', direct, (cmd, args) => { assert.deepStrictEqual([cmd, args], ['gh', ['api', 'repos/o/r/pulls']]); return JSON.stringify([mergedPr]); }), [mergedPr]);
    assert.throws(() => ghApiPulls('p', direct, () => { throw new Error('spawn gh ENOENT'); }), /HTTP 403; gh api 대체 조회도 실패: spawn gh ENOENT/);
    console.log('smoke-pr-state-guard passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
