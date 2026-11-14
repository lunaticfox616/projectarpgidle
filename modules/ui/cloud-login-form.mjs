

export class CloudLoginForm {
    constructor(deps) { this.deps = deps; }

    collectCloudCredentials() {
        let emailEl = this.deps.document.getElementById('startup-email');
        let passwordEl = this.deps.document.getElementById('startup-password');
        return {
            email: emailEl ? String(emailEl.value || '').trim() : '',
            password: passwordEl ? String(passwordEl.value || '') : ''
        };
    }

    hasAcceptedRequiredLegalPolicies() {
        let terms = this.deps.document.getElementById('startup-terms-consent');
        let privacy = this.deps.document.getElementById('startup-privacy-consent');
        return !!(terms && terms.checked && privacy && privacy.checked);
    }

    requireLegalPolicyConsent() {
        if (this.hasAcceptedRequiredLegalPolicies()) return true;
        (0, this.deps.setCloudMessage)((0, this.deps._t)('회원가입하려면 필수 약관 두 항목에 동의해주세요.'));
        return false;
    }

    setStartupRegistrationMode(active) {
        let consent = this.deps.document.getElementById('startup-signup-consent');
        let signupBtn = this.deps.document.getElementById('btn-startup-signup');
        if (consent) consent.hidden = !active;
        if (!signupBtn) return;
        signupBtn.innerText = active ? (0, this.deps._t)('동의하고 회원가입') : (0, this.deps._t)('회원가입');
        signupBtn.setAttribute('aria-expanded', String(active));
    }

    clearCloudPasswordInput() {
        let passwordEl = this.deps.document.getElementById('startup-password');
        if (passwordEl) passwordEl.value = '';
    }

    showSignupEmailNotice(email, resent) {
        return (0, this.deps.requestGameDialog)({
            type: 'notice',
            tone: 'success',
            kicker: (0, this.deps._t)('계정 인증'),
            title: resent ? '인증 메일을 다시 보냈습니다' : '인증 메일을 보냈습니다',
            message: `${email}\n메일의 인증 링크를 누른 뒤 이 화면으로 돌아와 로그인해주세요.`,
            confirmLabel: (0, this.deps._t)('확인')
        });
    }
}
