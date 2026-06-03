const WOODSMAN_BREAK_LOOP_REQUIRED = 5;


let loopHeroSelectionCallback = null;

let gameBooted = false;
function bootGame() {
    if (gameBooted) return;
    gameBooted = true;
    try {
        if (typeof runModuleIntegrityChecks === 'function' && !runModuleIntegrityChecks()) {
            throw new Error('필수 런타임 모듈이 아직 실제 구현으로 교체되지 않았습니다. 새로고침 후에도 반복되면 캐시가 꼬인 상태입니다.');
        }
        init();
    } catch (error) {
        gameBooted = false;
        reportFatalError('init', error);
    }
}

window.addEventListener('error', function(event) {
    if (!event || !event.error) return;
    reportFatalError('runtime', event.error);
});
window.addEventListener('load', bootGame);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootGame);
else setTimeout(bootGame, 0);
