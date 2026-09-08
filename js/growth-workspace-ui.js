// Navigation is ephemeral; growth state and placement rules remain in their domain modules.
const growthWorkspaceUi = (() => {
    function show(section) {
        if (!uiDisplay.matches('(max-width: 1080px)')) return;
        const panel = document.getElementById('growth-' + section);
        document.getElementById(panel.id + '-tab').click();
        panel.scrollIntoView({block: 'start'});
    }
    return {show};
})();
safeExposeGlobals({growthWorkspaceUi});
