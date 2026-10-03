#!/usr/bin/env node
'use strict';
// Publishes the rignin-next branch to GitHub in two parts, because the Hana Caraka sprites may not be redistributed.
//   public  projectarpgidle        branch rignin-next: every commit after PUBLIC_BASE with PRIVATE_PATHS removed.
//           The rewrite is deterministic (same trees, dates and messages), so each run fast-forwards the previous one.
//   private projectarpgidle-assets branch main: only PRIVATE_PATHS, at the same locations, plus a README.
// Everything happens in a temporary bare clone; this worktree, its index and its refs are never touched.
// Usage: node scripts/publish-github.cjs [--dry-run] [--yes] [--force-public]
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const BRANCH = 'rignin-next';
const PUBLIC_URL = 'https://github.com/lunaticfox616/projectarpgidle.git';
const PRIVATE_URL = 'https://github.com/lunaticfox616/projectarpgidle-assets.git';
const PRIVATE_BRANCH = 'main';
// Public main when the split started (2026-10-01). History up to here is already public and holds no licensed files.
const PUBLIC_BASE = '98bc57a481906e8b5de697ece8eccf240a015af5';
// Changing this list rewrites public history: the next run then stops and needs --force-public.
const PRIVATE_PATHS = ['assets/playable/hana', 'assets/summon/hana', 'docs/skill-assets-hana/reference'];
// Safety net for licensed art added somewhere new: any image whose path looks like it blocks the public push.
const LICENSED_ART = /hana|caraka/i;
const IMAGE = /\.(png|jpe?g|gif|webp|bmp|psd|aseprite)$/i;

const PRIVATE_README = `# projectarpgidle-assets (비공개)

RIGNIN(projectarpgidle)에서 **공개하면 안 되는 파일만** 모아 둔 저장소입니다.

- \`assets/playable/hana/\` — Hana Caraka 캐릭터 스프라이트 (외부 라이선스 · 팀 내부 전용 · 재배포 금지)
- \`docs/skill-assets-hana/reference/\` — 스킬 인계 원본 보관본

코드는 공개 저장소 \`lunaticfox616/projectarpgidle\`의 \`${BRANCH}\` 브랜치에 있고, 위 파일들은 그 이력 전체에서 빠져 있습니다.
경로가 같으므로 공개 브랜치를 받은 뒤 이 저장소의 \`assets\`, \`docs\` 폴더를 그 위에 그대로 복사하면 완전한 게임이 됩니다.

    git clone -b ${BRANCH} ${PUBLIC_URL} rignin
    git clone ${PRIVATE_URL} rignin-assets

이 저장소는 개발 저장소의 \`scripts/publish-github.cjs\`가 갱신합니다. 여기서 직접 고친 내용은 다음 올리기 때 개발 브랜치 내용으로 덮어씁니다.
`;

function run(args, options = {}) {
    const output = execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['pipe', 'pipe', 'inherit'], ...options });
    return output ? output.trim() : '';
}

function lines(text) {
    return text ? text.split('\n').map(line => line.trim()).filter(Boolean) : [];
}

function remoteHead(url, branch) {
    const found = run(['ls-remote', url, `refs/heads/${branch}`]);
    return found ? found.split(/\s+/)[0] : '';
}

function fail(message) {
    throw new Error(message);
}

// The clone does not see this repository's config, so the sync commit borrows its user.name / user.email.
function identity(repo) {
    const read = key => run(['-C', repo, 'config', key]);
    const [name, email] = [read('user.name'), read('user.email')];
    return { GIT_AUTHOR_NAME: name, GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_NAME: name, GIT_COMMITTER_EMAIL: email };
}

function cloneBranch(work) {
    const repo = path.resolve(__dirname, '..');
    const clone = path.join(work, 'repo.git');
    // --shared borrows the object store through alternates: nothing is copied or hard-linked, and deleting the clone is harmless.
    run(['clone', '-q', '--bare', '--shared', '--single-branch', '--branch', BRANCH, repo, clone]);
    const git = (args, options) => run(['-C', clone, ...args], options);
    git.identity = identity(repo);
    if (!isAncestor(git, PUBLIC_BASE, BRANCH)) fail(`${BRANCH}에 공개 기준 커밋 ${PUBLIC_BASE.slice(0, 8)}이 없습니다.`);
    return git;
}

function isAncestor(git, older, newer) {
    try {
        git(['merge-base', '--is-ancestor', older, newer], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

function buildPrivateCommit(git, work, source) {
    const entries = lines(git(['ls-tree', '-r', '--full-tree', source, '--', ...PRIVATE_PATHS]));
    if (!entries.length) fail(`${PRIVATE_PATHS.join(', ')} 경로에 파일이 없습니다. 경로가 바뀌었다면 PRIVATE_PATHS를 고치세요.`);
    const readme = git(['hash-object', '-w', '--stdin'], { input: PRIVATE_README });
    const env = { ...process.env, GIT_INDEX_FILE: path.join(work, 'private.index') };
    git(['update-index', '--add', '--index-info'], { env, input: [...entries, `100644 blob ${readme}\tREADME.md`].join('\n') + '\n' });
    const tree = git(['write-tree'], { env });
    const remote = remoteHead(PRIVATE_URL, PRIVATE_BRANCH);
    if (remote) git(['fetch', '-q', PRIVATE_URL, `+refs/heads/${PRIVATE_BRANCH}:refs/private/${PRIVATE_BRANCH}`]);
    if (remote && git(['rev-parse', `${remote}^{tree}`]) === tree) return { files: entries.length, remote, commit: remote };
    const message = `Sync licensed files from ${BRANCH} ${source.slice(0, 8)}`;
    const commit = git(['commit-tree', tree, ...(remote ? ['-p', remote] : []), '-m', message], { env: { ...process.env, ...git.identity } });
    return { files: entries.length, remote, commit };
}

function rewritePublic(git) {
    const filter = `git rm -r -q --cached --ignore-unmatch -- ${PRIVATE_PATHS.join(' ')}`;
    git(['filter-branch', '-f', '--index-filter', filter, '--', `${PUBLIC_BASE}..${BRANCH}`], {
        env: { ...process.env, FILTER_BRANCH_SQUELCH_WARNING: '1' },
        stdio: ['ignore', 'ignore', 'inherit'],
    });
    return git(['rev-parse', `refs/heads/${BRANCH}`]);
}

function checkPublic(git, tip) {
    const range = `${PUBLIC_BASE}..${tip}`;
    const leaked = [
        ...lines(git(['log', '--format=', '--name-only', range, '--', ...PRIVATE_PATHS])),
        ...lines(git(['ls-tree', '-r', '--name-only', tip, '--', ...PRIVATE_PATHS])),
    ];
    if (leaked.length) fail(`걸러낸 이력에 비공개 파일이 남아 있습니다: ${leaked.slice(0, 5).join(', ')}`);
    const suspects = new Set([
        ...lines(git(['log', '--format=', '--name-only', '--diff-filter=AMR', range])),
        ...lines(git(['ls-tree', '-r', '--name-only', tip])),
    ].filter(name => IMAGE.test(name) && LICENSED_ART.test(name)));
    if (suspects.size) fail(`공개 쪽에 Hana 그림으로 보이는 파일이 있습니다 (PRIVATE_PATHS에 추가하세요): ${[...suspects].slice(0, 5).join(', ')}`);
}

function planPublic(git, tip, forced) {
    const remote = remoteHead(PUBLIC_URL, BRANCH);
    if (!remote || remote === tip) return { remote, tip };
    git(['fetch', '-q', PUBLIC_URL, `+refs/heads/${BRANCH}:refs/public/${BRANCH}`]);
    if (isAncestor(git, remote, tip)) return { remote, tip };
    if (!forced) fail(`공개 저장소의 ${BRANCH}(${remote.slice(0, 8)})가 이번 결과의 조상이 아닙니다. `
        + 'PRIVATE_PATHS를 바꿨거나 누가 그 브랜치에 직접 올렸을 때 생깁니다. 확인 후 --force-public 으로 다시 실행하세요.');
    return { remote, tip, force: true };
}

function describe(publicPlan, privatePlan, source) {
    const publicState = publicPlan.remote === publicPlan.tip ? '이미 최신'
        : `${publicPlan.remote ? publicPlan.remote.slice(0, 8) : '(없음)'} → ${publicPlan.tip.slice(0, 8)}${publicPlan.force ? ' (강제 덮어쓰기)' : ''}`;
    const privateState = privatePlan.remote === privatePlan.commit ? '이미 최신'
        : `${privatePlan.remote ? privatePlan.remote.slice(0, 8) : '(없음)'} → ${privatePlan.commit.slice(0, 8)}`;
    console.log(`개발 브랜치 ${BRANCH} ${source.slice(0, 8)}`);
    console.log(`  공개   ${PUBLIC_URL} ${BRANCH}: ${publicState}`);
    console.log(`  비공개 ${PRIVATE_URL} ${PRIVATE_BRANCH}: ${privateState} (파일 ${privatePlan.files}개)`);
}

async function confirm(question) {
    const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
    // A closed stdin (no console) counts as "no" instead of leaving the question hanging.
    const answer = await new Promise(resolve => {
        prompt.on('close', () => resolve(''));
        prompt.question(question, resolve);
    });
    prompt.close();
    return /^y(es)?$/i.test(answer.trim());
}

function push(git, publicPlan, privatePlan) {
    if (publicPlan.remote !== publicPlan.tip) {
        const lease = publicPlan.force ? [`--force-with-lease=refs/heads/${BRANCH}:${publicPlan.remote}`] : [];
        git(['push', ...lease, PUBLIC_URL, `${publicPlan.tip}:refs/heads/${BRANCH}`], { stdio: 'inherit' });
    }
    if (privatePlan.remote !== privatePlan.commit) {
        git(['push', PRIVATE_URL, `${privatePlan.commit}:refs/heads/${PRIVATE_BRANCH}`], { stdio: 'inherit' });
    }
}

async function main() {
    const flags = new Set(process.argv.slice(2));
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rignin-publish-'));
    try {
        const git = cloneBranch(work);
        const source = git(['rev-parse', `refs/heads/${BRANCH}`]);
        const privatePlan = buildPrivateCommit(git, work, source);
        console.log(`공개용 이력을 만드는 중 (${git(['rev-list', '--count', `${PUBLIC_BASE}..${BRANCH}`])}개 커밋)...`);
        const tip = rewritePublic(git);
        checkPublic(git, tip);
        const publicPlan = planPublic(git, tip, flags.has('--force-public'));
        describe(publicPlan, privatePlan, source);
        const idle = publicPlan.remote === publicPlan.tip && privatePlan.remote === privatePlan.commit;
        if (idle || flags.has('--dry-run')) return console.log(idle ? '올릴 것이 없습니다.' : '(--dry-run: 올리지 않았습니다)');
        if (!flags.has('--yes') && !(await confirm('올릴까요? (y/N) '))) return console.log('취소했습니다.');
        push(git, publicPlan, privatePlan);
        console.log('완료했습니다.');
    } finally {
        fs.rmSync(work, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(`중단: ${error.message}`);
    process.exit(1);
});
