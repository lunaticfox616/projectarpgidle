const { execFileSync } = require('child_process');

function git(...args) {
    const safeDirectory = `safe.directory=${process.cwd().replace(/\\/g, '/')}`;
    return execFileSync('git', ['-c', safeDirectory, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
}

function parseGitHubRemote(remote) {
    const match = remote.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!match) throw new Error(`GitHub origin을 확인할 수 없습니다: ${remote}`);
    return { owner: match[1], repo: match[2] };
}

function evaluatePrState({ branch, ahead, behind = 0, pulls }) {
    if (!branch || branch === 'HEAD' || branch === 'main') {
        return { ok: false, message: 'PR은 main이 아닌 작업 브랜치에서만 생성할 수 있습니다.' };
    }
    const existing = pulls.find(pr => pr.state === 'open') || pulls.find(pr => pr.merged_at) || pulls[0];
    if (existing) {
        const status = existing.merged_at ? '이미 병합됨' : existing.state === 'open' ? '이미 열려 있음' : '이미 닫힘';
        return { ok: false, message: `${branch} 브랜치의 PR #${existing.number}이 ${status}: ${existing.html_url}` };
    }
    if (behind > 0) return { ok: false, message: `최신 origin/main보다 ${behind}커밋 뒤처져 있습니다.` };
    if (ahead < 1) return { ok: false, message: 'origin/main에 포함되지 않은 커밋이 없습니다.' };
    return { ok: true, message: `${branch}: 새 PR 생성 가능 (${ahead}커밋)` };
}

/**
 * Lists the branch's PRs. A token api.github.com rejects (401: an expired token, or one scoped to a proxy) is retried once
 * without it, which reads a public repository; a failure names the status and whether a token was refused.
 * @returns {Promise<object[]>}
 */
async function fetchBranchPulls(url, token, fetchImpl = fetch) {
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'projectarpgidle-pr-guard' };
    let response = await fetchImpl(url, { headers: token ? { ...headers, Authorization: `Bearer ${token}` } : headers });
    const refused = !!token && response.status === 401;
    if (refused) response = await fetchImpl(url, { headers });
    if (response.ok) return response.json();
    const reason = refused ? ' (토큰이 거부되어 토큰 없이 다시 조회했지만 실패)' : token ? '' : ' (토큰 없이 조회; 비공개 저장소면 GITHUB_TOKEN 필요)';
    throw new Error(`GitHub PR 조회 실패: HTTP ${response.status}${reason}`);
}

async function inspectCurrentBranch(fetchImpl = fetch) {
    git('fetch', 'origin', 'main');
    const branch = git('branch', '--show-current');
    const ahead = Number(git('rev-list', '--count', 'origin/main..HEAD'));
    const behind = Number(git('rev-list', '--count', 'HEAD..origin/main'));
    const { owner, repo } = parseGitHubRemote(git('remote', 'get-url', 'origin'));
    const query = new URLSearchParams({ state: 'all', head: `${owner}:${branch}`, per_page: '100' });
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
    const path = `repos/${owner}/${repo}/pulls?${query}`;
    const pulls = await fetchBranchPulls(`https://api.github.com/${path}`, token, fetchImpl).catch(error => ghApiPulls(path, error));
    return evaluatePrState({ branch, ahead, behind, pulls });
}

/** Fallback when the direct API call fails: the GitHub CLI (`gh api`) with its own credentials, if installed. */
function ghApiPulls(path, directError, run = execFileSync) {
    try {
        return JSON.parse(run('gh', ['api', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    } catch (error) {
        throw new Error(`${directError.message}; gh api 대체 조회도 실패: ${String(error.message).split('\n')[0]}`);
    }
}

if (require.main === module) {
    inspectCurrentBranch()
        .then(result => {
            console[result.ok ? 'log' : 'error'](result.message);
            if (!result.ok) process.exitCode = 1;
        })
        .catch(error => {
            console.error(error.message);
            process.exitCode = 1;
        });
}

module.exports = { evaluatePrState, parseGitHubRemote, fetchBranchPulls, ghApiPulls };
