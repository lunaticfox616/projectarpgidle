'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function extractFunction(source, name) {
    const asyncMarker = `async function ${name}(`;
    const marker = `function ${name}(`;
    let start = source.indexOf(asyncMarker);
    if (start < 0) start = source.indexOf(marker);
    assert(start >= 0, `${name} must exist`);
    const parameterStart = source.indexOf('(', start);
    let parameterDepth = 0;
    let bodyStart = -1;
    for (let index = parameterStart; index < source.length; index += 1) {
        if (source[index] === '(') parameterDepth += 1;
        if (source[index] !== ')') continue;
        parameterDepth -= 1;
        if (parameterDepth === 0) {
            bodyStart = source.indexOf('{', index);
            break;
        }
    }
    assert(bodyStart >= 0, `${name} body must exist`);
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
const policyContent = fs.readFileSync('legal/policies-content.js', 'utf8');
const changelog = fs.readFileSync('changelog.md', 'utf8');
const vfxServer = fs.readFileSync('scripts/skill-vfx-editor-server.js', 'utf8');

assert(html.includes('id="startup-signup-consent" hidden')
    && html.includes('id="startup-terms-consent"')
    && html.includes('id="startup-privacy-consent"')
    && html.includes('id="btn-startup-resend-confirmation"'),
    'startup account creation must keep separate required policy consents hidden until signup is selected');
assert(html.includes('class="startup-policy-scroll"')
    && html.includes('data-legal-policy="terms"')
    && html.includes('data-legal-policy="privacy"')
    && html.includes('legal/policies-content.js'),
    'signup must present both required policies in one scrollable panel');
assert(html.includes('legal/terms.html') && html.includes('legal/privacy.html'),
    'policies must remain accessible from the game UI');
assert(html.includes('계정·데이터 삭제 요청') && html.includes('pjh4611274@gmail.com'),
    'settings must expose a working account deletion request path');
assert(terms.includes('data-legal-policy="terms"') && terms.includes('policies-content.js')
    && policyContent.includes('만 14세 이상') && policyContent.includes('게스트 저장'),
    'terms must state the age gate and local-only guest save limitation');
assert(privacy.includes('data-legal-policy="privacy"') && privacy.includes('policies-content.js')
    && policyContent.includes('Supabase, Inc.') && policyContent.includes('대한민국(서울 리전)'),
    'privacy policy must disclose the configured cloud processor and region');
assert(policyContent.includes('최대 3일') && policyContent.includes('최대 30일'),
    'privacy retention periods must match chat and telemetry cleanup behavior');
assert(vfxServer.includes("'legal'"), 'the local VFX game preview must serve policy pages linked from the game');
const latestPatchParts = (changelog.match(/^##\s+.+?\s+[—–-]\s+(\d{4})-(\d{2})-(\d{2})/m) || []).slice(1);
const latestPatchDate = latestPatchParts.length === 3 ? `${latestPatchParts[0].slice(2)}-${latestPatchParts[1]}-${latestPatchParts[2]}` : '';
assert(latestPatchDate && html.includes(`aria-hidden="true">(${latestPatchDate})</span>`),
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

async function verifyCloudSignupFlow() {
    const calls = { signup: [], resend: [], messages: [], loading: [], notices: [], passwordClears: 0, uiUpdates: 0 };
    let resendError = null;
    const authContext = {
        window: { location: { origin: 'https://lunaticfox616.github.io', pathname: '/projectarpgidle/' } },
        cloudState: { busy: false },
        getCloudConfig: () => ({ enabled: true }),
        collectCloudCredentials: () => ({ email: 'tester@example.com', password: 'secure-password' }),
        getSupabaseClient: () => ({
            auth: {
                signUp: async payload => {
                    calls.signup.push(payload);
                    return { data: { user: { id: 'new-user' }, session: null }, error: null };
                },
                resend: async payload => {
                    calls.resend.push(payload);
                    return { data: {}, error: resendError };
                }
            }
        }),
        setCloudMessage: message => calls.messages.push(message),
        updateCloudSaveUI: () => { calls.uiUpdates += 1; },
        setLoadingOverlayState: active => calls.loading.push(active),
        clearCloudPasswordInput: () => { calls.passwordClears += 1; },
        requestGameDialog: async options => { calls.notices.push(options); return true; },
        applyCloudSession: () => {},
        refreshCloudLinkedIdentities: async () => {},
        advanceLoadingOverlay: () => {},
        reconcileCloudSaveState: async () => {},
        addLog: () => {},
        enterGameWorld: async () => {}
    };
    vm.createContext(authContext);
    [
        'getOAuthRedirectUrl',
        'requestSupabaseEmailSignUp',
        'showSignupEmailNotice',
        'cloudSignUp',
        'resendSignupConfirmation'
    ].forEach(name => vm.runInContext(extractFunction(ui, name), authContext, { filename: `${name}.js` }));

    await authContext.cloudSignUp({ enterGame: true });
    assert.strictEqual(calls.signup.length, 1, 'signup must use the configured Supabase client once');
    assert.strictEqual(calls.signup[0].options.emailRedirectTo, 'https://lunaticfox616.github.io/projectarpgidle/',
        'signup confirmation must return to the deployed GitHub Pages project path');
    assert.deepStrictEqual(calls.loading, [true, false], 'email confirmation signup must close its loading overlay');
    assert.strictEqual(calls.passwordClears, 1, 'signup must clear the password after sending confirmation mail');
    assert.strictEqual(calls.notices[0].type, 'notice', 'sent confirmation mail must use a visible notice dialog');
    assert.match(calls.notices[0].message, /인증 링크.*로그인/, 'the notice must explain the remaining verification step');
    assert.strictEqual(authContext.cloudState.busy, false, 'signup must release its busy state');

    await authContext.resendSignupConfirmation();
    assert.strictEqual(calls.resend.length, 1, 'the resend action must call Supabase once');
    assert.strictEqual(calls.resend[0].options.emailRedirectTo, calls.signup[0].options.emailRedirectTo,
        'resend and signup must use the same verified redirect URL');
    assert.strictEqual(calls.notices[1].title, '인증 메일을 다시 보냈습니다');
    assert.strictEqual(authContext.cloudState.busy, false, 'successful resend must release its busy state');

    resendError = new Error('rate limited');
    await authContext.resendSignupConfirmation();
    assert.match(calls.messages.at(-1), /재발송 실패: rate limited/, 'resend failures must remain visible to the user');
    assert.strictEqual(calls.notices.length, 2, 'a failed resend must not show a success notice');
    assert.strictEqual(authContext.cloudState.busy, false, 'failed resend must release its busy state');
}

verifyCloudSignupFlow()
    .then(() => console.log('smoke-legal-policies passed'))
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
