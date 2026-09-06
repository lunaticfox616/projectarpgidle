// Load the production HTML and script order; only platform isolation and test controls are injected.
(() => {
    const frame = document.getElementById('game');
    const status = document.getElementById('status');
    const controls = document.getElementById('controls');
    function send(action, value) {
        frame.contentWindow.postMessage({ type:'unlock-lab-command', action, value }, location.origin);
    }
    controls.addEventListener('click', event => {
        const button = event.target.closest('[data-action]');
        if (button) send(button.dataset.action);
    });
    document.getElementById('loop').addEventListener('change', event => send('loop', Number(event.target.value)));
    document.getElementById('reset').addEventListener('click', () => location.reload());
    window.addEventListener('message', event => {
        if (event.source !== frame.contentWindow || event.origin !== location.origin || event.data?.type !== 'unlock-lab-status') return;
        controls.disabled = !event.data.ready;
        status.textContent = event.data.message;
    });
    async function load() {
        const response = await fetch('/index.html', { cache:'no-store' });
        if (!response.ok) throw new Error(`게임 HTML 로드 실패 (${response.status})`);
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        doc.querySelector('#app-update-registration').remove();
        doc.querySelectorAll('script[src]').forEach(script => {
            if (new URL(script.getAttribute('src'), location.origin).origin !== location.origin) script.remove();
        });
        const base = doc.createElement('base'); base.href = location.origin + '/';
        const policy = doc.createElement('meta'); policy.httpEquiv = 'Content-Security-Policy';
        policy.content = "connect-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'none'; frame-src 'none'; form-action 'none'; object-src 'none'";
        const bridge = doc.createElement('script'); bridge.src = '/artifacts/unlock-ui/test-bridge.js';
        doc.head.prepend(base, policy, bridge);
        frame.srcdoc = '<!doctype html>' + doc.documentElement.outerHTML;
    }
    load().catch(error => { console.error('Unlock test startup failed', error); status.textContent = error.message + ' · 새로고침해 주세요.'; });
})();
