'use strict';

/**
 * Release-only packaging rules shared by scripts/build-web.js and scripts/build-mobile-web.js (2026-10-23). The development tree,
 * the smoke runtime and `?dev=1` on localhost keep everything; a release (dist/, www/) does not ship test tools a console line could
 * call. This is not tamper proofing: it removes ready-made cheats.
 *
 * Contract:
 *   - RELEASE_EXCLUDED_SCRIPTS are deleted from the release and their <script> tags removed from index.html (a missing tag fails).
 *   - Code between the marker comments DEV_ONLY_START and DEV_ONLY_END (inline or over lines, never nested) is removed from every
 *     released js/ and data/ file; each changed file must still parse.
 *   - Afterwards no released script (nor service-worker.js) may name FORBIDDEN_IDENTIFIERS or an excluded file in code (comments are
 *     not read), so a leftover call fails the build instead of the game.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const espree = require('espree');

const RELEASE_EXCLUDED_SCRIPTS = Object.freeze(['js/dev-test-panel-ui.js']);
const DEV_ONLY_START = '/* @dev-only */';
const DEV_ONLY_END = '/* @end-dev-only */';
const FORBIDDEN_IDENTIFIERS = Object.freeze(['devTestPanel', 'setTestCombatSpeed', 'testCombatSpeed', 'setCombatTestImmortal',
    'combatTestImmortal', 'setTestLevel']);
const PARSE_OPTIONS = Object.freeze({ ecmaVersion: 'latest', sourceType: 'script', loc: true });

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** source without its dev-only spans. Throws on an unclosed, nested or stray marker (file names the source in the message). */
function stripDevOnly(source, file) {
    let kept = '', at = 0;
    for (;;) {
        const start = source.indexOf(DEV_ONLY_START, at);
        if (start < 0) break;
        const end = source.indexOf(DEV_ONLY_END, start + DEV_ONLY_START.length);
        if (end < 0) throw new Error(`${file}: ${DEV_ONLY_START} without ${DEV_ONLY_END}`);
        const nested = source.indexOf(DEV_ONLY_START, start + DEV_ONLY_START.length);
        if (nested >= 0 && nested < end) throw new Error(`${file}: nested ${DEV_ONLY_START}`);
        kept += source.slice(at, start);
        at = end + DEV_ONLY_END.length;
    }
    kept += source.slice(at);
    if (kept.includes(DEV_ONLY_END)) throw new Error(`${file}: ${DEV_ONLY_END} without ${DEV_ONLY_START}`);
    return kept;
}

/** html without the <script> tags of RELEASE_EXCLUDED_SCRIPTS (any ?v= cache key). */
function removeExcludedScriptTags(html) {
    let result = html;
    for (const file of RELEASE_EXCLUDED_SCRIPTS) {
        const tag = new RegExp(`[ \\t]*<script\\b[^>]*\\bsrc="${escapeRegExp(file)}(?:\\?[^"]*)?"[^>]*></script>[ \\t]*\\r?\\n?`, 'g');
        const next = result.replace(tag, '');
        if (next === result) throw new Error(`index.html has no <script> for ${file}`);
        result = next;
    }
    return result;
}

async function listScripts(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(error => (error.code === 'ENOENT' ? [] : Promise.reject(error)));
    const nested = await Promise.all(entries.map(entry => (entry.isDirectory() ? listScripts(path.join(dir, entry.name)) : [])));
    return entries.filter(entry => entry.isFile() && entry.name.endsWith('.js')).map(entry => path.join(dir, entry.name)).concat(...nested);
}

async function releasedScripts(destination) {
    return [...await listScripts(path.join(destination, 'js')), ...await listScripts(path.join(destination, 'data'))];
}

async function stripReleasedScripts(destination) {
    for (const file of RELEASE_EXCLUDED_SCRIPTS) await fs.rm(path.join(destination, file), { force: true });
    for (const file of await releasedScripts(destination)) {
        const source = await fs.readFile(file, 'utf8');
        if (!source.includes(DEV_ONLY_START) && !source.includes(DEV_ONLY_END)) continue;
        const label = path.relative(destination, file);
        const stripped = stripDevOnly(source, label);
        espree.parse(stripped, PARSE_OPTIONS);
        await fs.writeFile(file, stripped);
    }
}

/** The first forbidden name or excluded path a script still uses in code, or null. */
function findLeftover(source) {
    return espree.tokenize(source, PARSE_OPTIONS).find(token => (token.type === 'Identifier' && FORBIDDEN_IDENTIFIERS.includes(token.value))
        || ((token.type === 'String' || token.type === 'Template') && RELEASE_EXCLUDED_SCRIPTS.some(file => token.value.includes(file)))) || null;
}

async function assertReleaseClean(destination, html) {
    const tag = RELEASE_EXCLUDED_SCRIPTS.find(file => html.includes(file));
    if (tag) throw new Error(`release index.html still references ${tag}`);
    const worker = path.join(destination, 'service-worker.js');
    const extra = await fs.access(worker).then(() => [worker], () => []);
    for (const file of [...await releasedScripts(destination), ...extra]) {
        const hit = findLeftover(await fs.readFile(file, 'utf8'));
        if (hit) throw new Error(`${path.relative(destination, file)}:${hit.loc.start.line} still uses ${hit.value} in a release build`);
    }
}

/** Applies the release rules to the copied files in destination and returns the release index.html built from html. */
async function prepareRelease(destination, html) {
    await stripReleasedScripts(destination);
    const released = removeExcludedScriptTags(html);
    await assertReleaseClean(destination, released);
    return released;
}

module.exports = { prepareRelease, stripDevOnly, removeExcludedScriptTags, RELEASE_EXCLUDED_SCRIPTS, DEV_ONLY_START, DEV_ONLY_END };
