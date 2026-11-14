/** Install once at bootstrap; returned cleanup removes these exact listener functions/options. */
export function installFeedbackAudioControls({ document, window }, audio, controls) {
    const listeners = [];
    const listen = (target, name, handler, options) => {
        target.addEventListener(name, handler, options);
        listeners.push(() => target.removeEventListener(name, handler, options));
    };
    listen(document, 'input', event => {
        if (!event.target.matches?.('[data-sound-volume]')) return;
        controls.setVolume(event.target.valueAsNumber);
        audio.syncSettings(); controls.syncVolumeControl();
    });
    listen(document, 'change', event => {
        if (event.target.matches?.('[data-sound-volume]')) controls.saveVolume();
    });
    listen(document, 'click', event => {
        if (event.target.id === 'btn-sound-preview') audio.play('uiSelect');
        const tab = event.target.closest?.('.tab-btn,.sub-tab-btn,[role="tab"]');
        if (tab && !tab.disabled && tab.getAttribute('aria-disabled') !== 'true') audio.play('uiSelect');
    });
    listen(window, 'project-idle:startup-visibility', controls.syncVolumeControl);
    for (const name of ['pointerdown', 'pointerup', 'touchend']) listen(document, name, audio.unlock, { passive: true });
    listen(document, 'keydown', audio.unlock);
    listen(window, 'project-idle:encounter-finished', event => { if (!event.detail?.background) audio.play('stageClear'); });
    listen(window, 'project-idle:player-defeated', event => { if (!event.detail?.background) audio.play('playerDeath'); });
    listen(window, 'project-idle:items-salvaged', () => audio.play('itemDismantle'));
    listen(document, 'visibilitychange', audio.visibilityChanged);
    return () => { listeners.splice(0).forEach(remove => remove()); };
}
