/**
 * 새 배포 알림(2026-10-11 사용자: "PR 올려서 github pages에 들어가고 나면 새로고침 하라고 떴으면 좋겠는데").
 * 웹 묶음을 만들 때(scripts/build-web.js) index.html의 <meta name="app-deploy">와 version.json에 같은 표식을 적는다. 열려 있는 게임은
 * 5분마다, 그리고 탭으로 돌아올 때 version.json을 다시 읽어 제 표식과 다르면 화면 위에 알림을 띄운다. 새로고침은 플레이어가 누를 때만 한다.
 * 묶음을 거치지 않은 개발 서버(표식이 dev)와 앱(네이티브)에서는 켜지지 않는다. 읽는 파일은 수십 바이트이고 클라우드 서버를 거치지 않는다.
 */
(() => {
    const CHECK_MS = 5 * 60 * 1000, MIN_GAP_MS = 60 * 1000, SNOOZE_MS = 30 * 60 * 1000;
    const own = (document.querySelector('meta[name="app-deploy"]') || {}).content || 'dev';
    let lastCheckAt = 0, quietUntil = 0, latest = '';

    const native = () => !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
    const enabled = () => own !== 'dev' && location.protocol !== 'file:' && !native();

    function hideUpdateNotice(snooze) {
        const notice = document.getElementById('app-update-notice');
        if (notice) notice.remove();
        if (snooze) quietUntil = Date.now() + SNOOZE_MS;
    }
    /** 화면 위 가운데의 알림 한 줄: 새로고침(떠날 때 저장은 js/main.js의 pagehide가 맡는다)과 나중에(30분 뒤 다시 알린다). */
    function showUpdateNotice() {
        if (document.getElementById('app-update-notice') || Date.now() < quietUntil) return;
        const notice = document.createElement('div');
        notice.id = 'app-update-notice';
        notice.setAttribute('role', 'status');
        notice.innerHTML = '<span>새 버전이 올라왔습니다. 새로고침하면 적용됩니다.</span>'
            + '<button type="button" class="app-update-reload">새로고침</button><button type="button" class="app-update-later">나중에</button>';
        notice.querySelector('.app-update-reload').addEventListener('click', () => location.reload());
        notice.querySelector('.app-update-later').addEventListener('click', () => hideUpdateNotice(true));
        document.body.appendChild(notice);
    }
    async function readLatestBuild(now) {
        const response = await fetch(`version.json?t=${now}`, { cache: 'no-store' });
        if (!response.ok) return '';
        const data = await response.json();
        return String((data && data.build) || '');
    }
    /** 한 번 다른 표식을 본 뒤로는 다시 읽지 않는다(알림만 다시 띄운다). 읽기에 실패하면(오프라인, 배포 중) 다음 확인에서 다시 본다. */
    async function checkForUpdate() {
        if (document.hidden) return;
        if (latest) return showUpdateNotice();
        const now = Date.now();
        if (now - lastCheckAt < MIN_GAP_MS) return;
        lastCheckAt = now;
        try {
            const build = await readLatestBuild(now);
            if (!build || build === own) return;
            latest = build;
            showUpdateNotice();
        } catch (error) {
            console.warn('[app-update] 새 버전 확인에 실패했습니다.', error);
        }
    }
    function startUpdateChecks() {
        if (!enabled()) return;
        setInterval(checkForUpdate, CHECK_MS);
        document.addEventListener('visibilitychange', checkForUpdate);
    }
    window.addEventListener('load', startUpdateChecks, { once: true });
})();
