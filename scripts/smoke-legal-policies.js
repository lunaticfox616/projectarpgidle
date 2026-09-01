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
const changelog = fs.readFileSync('changelog.md', 'utf8');
const vfxServer = fs.readFileSync('scripts/skill-vfx-editor-server.js', 'utf8');

assert(html.includes('id="startup-signup-consent" hidden')
    && html.includes('id="startup-terms-consent"')
    && html.includes('id="startup-privacy-consent"'),
    'startup account creation must keep separate required policy consents hidden until signup is selected');
assert(html.includes('class="startup-policy-scroll"')
    && html.includes('<h3>이용약관</h3>')
    && html.includes('<h3>개인정보 수집·이용</h3>'),
    'signup must present both required policies in one scrollable panel');
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
const latestPatchDate = (changelog.match(/^##\s+.+?\s+[—–-]\s+(\d{4})-(\d{2})-(\d{2})/m) || []).slice(1).join('.');
assert(latestPatchDate && html.includes(`aria-label="최신 패치 날짜">${latestPatchDate}</span>`),
    'the startup patch date must match the latest documented changelog entry');

const elements = {
    'startup-signup-consent': { hidden: true },
    'btn-startup-signup': {
        innerText: '회원가입 후 시작',
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; }
    },
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
    extractFunction(ui, 'setStartupRegistrationMode'),
    extractFunction(ui, 'startupSignUp')
].join('\n'), context);

assert.strictEqual(context.requireLegalPolicyConsent(), false, 'one unchecked policy must block account creation');
assert.strictEqual(messages.length, 1, 'blocked registration must explain the missing consent');
context.startupSignUp();
assert.strictEqual(elements['startup-signup-consent'].hidden, false, 'selecting signup must reveal policy consent');
assert.strictEqual(elements['btn-startup-signup'].innerText, '동의하고 회원가입');
assert.strictEqual(calls.length, 0, 'blocked registration must not call the signup boundary');
context.startupSignUp();
assert.strictEqual(calls.length, 0, 'unchecked policies must still block the revealed signup form');
elements['startup-terms-consent'].checked = true;
elements['startup-privacy-consent'].checked = true;
context.startupSignUp();
assert.strictEqual(calls.length, 1, 'accepted policies must allow account creation');
assert.strictEqual(calls[0].source, 'startup');
assert.strictEqual(calls[0].enterGame, true);

const oauthStart = ui.indexOf('async function loginWithOAuthProvider(provider)');
const oauthEnd = ui.indexOf('function recoverBusyStateAfterOAuthBack()', oauthStart);
const oauthSource = ui.slice(oauthStart, oauthEnd);
assert(oauthStart >= 0 && oauthEnd > oauthStart && !oauthSource.includes('requireLegalPolicyConsent'),
    'existing social login must not expose or require the email signup consent step');

console.log('smoke-legal-policies passed');
