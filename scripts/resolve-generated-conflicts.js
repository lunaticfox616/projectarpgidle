#!/usr/bin/env node
'use strict';

// js/ and data/ left the repository on 2026-11-15 (they are build output of modules/). A branch cut before that still
// tracks them, so merging main into it reports a modify/delete conflict for every generated file the branch rebuilt.
// Those conflicts carry no decision: the file is rebuilt from the merged sources. Run this during such a merge:
//   git merge origin/main        (conflicts in js/, data/)
//   node scripts/resolve-generated-conflicts.js
// It takes the generated files out of the index (conflicted or still tracked), leaves every other conflict alone, and
// rebuilds. Conflicts in modules/ are real and stay for you.
const cp = require('node:child_process');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const KEPT = new Set(['js/bootstrap.js', 'data/pixel-icons.js']);
const git = args => cp.execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const isGenerated = file => !KEPT.has(file) && /^(js\/[^/]+\.js|data\/[^/]+\.js|data\/locales\/[^/]+\.js)$/.test(file);

const tracked = Array.from(new Set(git(['ls-files', '-z', '--', 'js', 'data']).split('\0').filter(isGenerated)));
for (let at = 0; at < tracked.length; at += 100) git(['rm', '-q', '--cached', '--ignore-unmatch', '--', ...tracked.slice(at, at + 100)]);
const left = git(['diff', '--name-only', '--diff-filter=U']).split('\n').filter(Boolean);
console.log(`generated files taken out of the index: ${tracked.length}`);
console.log(left.length ? `conflicts left for you (${left.length}):\n  ${left.join('\n  ')}` : 'no other conflict');
if (!left.some(file => file.startsWith('modules/') || file.startsWith('scripts/'))) {
    cp.execFileSync(process.execPath, [path.join(ROOT, 'scripts/build-modules.js')], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
    console.log('js/ and data/ rebuilt from the merged sources');
} else console.log('resolve the conflicts in modules/ or scripts/ first; the next tool run rebuilds js/ and data/');
