'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function extractFunction(source, name) {
    const marker = `function ${name}(`;
    const start = source.indexOf(marker);
    assert(start >= 0, `${name} must exist`);
    const bodyStart = source.indexOf('{', start);
    let depth = 0;
    for (let index = bodyStart; index < source.length; index += 1) {
        if (source[index] === '{') depth += 1;
        if (source[index] !== '}') continue;
        depth -= 1;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} body is incomplete`);
}

const html = fs.readFileSync('index.html', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const terms = fs.readFileSync('legal/terms.html', 'utf8');
const privacy = fs.readFileSync('legal/privacy.html', 'utf8');
const vfxServer = fs.readFileSync('scripts/skill-vfx-editor-server.js', 'utf8');

assert(html.includes('id="startup-terms-consent"') && html.includes('id="startup-privacy-consent"'),
    'startup account creation must expose separate required policy consents');
assert(html.includes('legal/terms.html') && html.includes('legal/privacy.html'),
    'policies must remain accessible from the game UI');
assert(html.includes('계정·데이터 삭제 요청') && html.includes('pjh4611274@gmail.com'),
    'settings must expose a working account deletion request path');
assert(terms.includes('만 14세 이상') && terms.includes('게스트 저장'),
    'terms must state the age gate and local-only guest save limitation');
assert(privacy.includes('Supabase, Inc.') && privacy.includes('대한민국(서울 리전)'),
    'privacy policy must disclose the configured cloud processor and region');
assert(privacy.includes('최대 3일') && privacy.includes('최대 30일'),
    'privacy retention periods must match chat and telemetry cleanup behavior');
assert(vfxServer.includes("'legal'"), 'the local VFX game preview must serve policy pages linked from the game');

const elements = {
    'startup-terms-consent': { checked: false },
    'startup-privacy-consent': { checked: false }
};
const messages = [];
const calls = [];
const context = {
    document: { getElementById: id => elements[id] || null },
    setCloudMessage: message => messages.push(message),
    cloudSignUp: options => calls.push(options)
};
vm.createContext(context);
vm.runInContext([
    extractFunction(ui, 'hasAcceptedRequiredLegalPolicies'),
    extractFunction(ui, 'requireLegalPolicyConsent'),
    extractFunction(ui, 'startupSignUp')
].join('\n'), context);

assert.strictEqual(context.requireLegalPolicyConsent(), false, 'one unchecked policy must block account creation');
assert.strictEqual(messages.length, 1, 'blocked registration must explain the missing consent');
context.startupSignUp();
assert.strictEqual(calls.length, 0, 'blocked registration must not call the signup boundary');
elements['startup-terms-consent'].checked = true;
elements['startup-privacy-consent'].checked = true;
context.startupSignUp();
assert.strictEqual(calls.length, 1, 'accepted policies must allow account creation');
assert.strictEqual(calls[0].source, 'startup');
assert.strictEqual(calls[0].enterGame, true);

const oauthStart = ui.indexOf('async function loginWithOAuthProvider(provider)');
const oauthGuard = ui.indexOf('if (!requireLegalPolicyConsent()) return;', oauthStart);
assert(oauthStart >= 0 && oauthGuard > oauthStart && oauthGuard - oauthStart < 160,
    'social account creation must run the same consent guard before OAuth starts');

console.log('smoke-legal-policies passed');
