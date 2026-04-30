(function () {
    function supportsModernSyntax() {
        try {
            new Function(
                "const a = 1;" +
                "let b = 2;" +
                "var obj = { ...{x: 1}, y: 2 };" +
                "var txt = `${a + b}`;" +
                "var fn = (n) => n + 1;" +
                "return obj.x + fn(a) + b + txt.length;"
            );
            return true;
        } catch (error) {
            return false;
        }
    }
    function markUnsupportedBrowser() {
        var label = document.getElementById('ui-progress-label');
        var pct = document.getElementById('ui-move-time-text');
        var bar = document.getElementById('ui-move-bar');
        var zone = document.getElementById('ui-combat-zone');
        var caption = document.getElementById('ui-battlefield-caption');
        var log = document.getElementById('log');
        if (label) label.innerText = '⚠️ 브라우저 미지원';
        if (pct) pct.innerText = '스크립트 실행 불가';
        if (bar) {
            bar.style.width = '100%';
            bar.style.backgroundColor = '#c0392b';
        }
        if (zone) zone.innerText = '이 미리보기는 최신 JavaScript를 지원하지 않습니다';
        if (caption) caption.innerText = '외부 Chromium/Edge 계열 브라우저에서 열어 주세요.';
        if (log) {
            log.innerHTML = '<div class=\"log-msg attack-monster\">이 인앱 브라우저는 현재 게임 스크립트 문법을 지원하지 않아 전투 루프가 시작되지 않습니다.</div>' +
                '<div class=\"log-msg loot-magic\">원인: 페이지의 메인 스크립트가 파싱 단계에서 중단되어 진행도, 전투, 저장 로직이 전혀 실행되지 않습니다.</div>' +
                '<div class=\"log-msg loot-rare\">해결: 최신 Chromium/Edge/Chrome에서 열거나, 코드 전체를 ES5로 트랜스파일해야 합니다.</div>';
        }
    }
    window.__projectIdleModernSupport = supportsModernSyntax();
    if (window.__projectIdleModernSupport) return;
    function onReady() {
        markUnsupportedBrowser();
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(onReady, 0);
    } else if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', onReady);
        window.addEventListener('load', onReady);
    } else if (document.attachEvent) {
        document.attachEvent('onreadystatechange', function () {
            if (document.readyState === 'complete') onReady();
        });
        window.attachEvent('onload', onReady);
    }
})();
