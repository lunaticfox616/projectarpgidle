const WOODSMAN_BREAK_LOOP_REQUIRED = 5;


let loopHeroSelectionCallback = null;

let gameBooted = false;
function bootGame() {
    if (gameBooted) return;
    gameBooted = true;
    try {
        init();
    try { if (typeof runModuleIntegrityChecks === 'function') runModuleIntegrityChecks(); } catch (e) { console.warn('integrity check failed:', e); }
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
