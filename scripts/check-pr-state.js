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

async function inspectCurrentBranch(fetchImpl = fetch) {
    git('fetch', 'origin', 'main');
    const branch = git('branch', '--show-current');
    const ahead = Number(git('rev-list', '--count', 'origin/main..HEAD'));
    const behind = Number(git('rev-list', '--count', 'HEAD..origin/main'));
    const { owner, repo } = parseGitHubRemote(git('remote', 'get-url', 'origin'));
    const query = new URLSearchParams({ state: 'all', head: `${owner}:${branch}`, per_page: '100' });
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'projectarpgidle-pr-guard' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const response = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}/pulls?${query}`, { headers });
    if (!response.ok) throw new Error(`GitHub PR 조회 실패: HTTP ${response.status}`);
    return evaluatePrState({ branch, ahead, behind, pulls: await response.json() });
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

module.exports = { evaluatePrState, parseGitHubRemote };
