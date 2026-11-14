/** Browser events are installed explicitly. Cleanup owns the interval and these exact listeners. */
export function installBackgroundMusicControls(environment, music, controls) {
    const { document, window } = environment, listeners = [];
    const listen = (target, name, handler) => {
        target.addEventListener(name, handler);
        listeners.push(() => target.removeEventListener(name, handler));
    };
    listen(document, 'input', event => {
        if (!event.target.matches?.('[data-bgm-volume]')) return;
        controls.setVolume(event.target.valueAsNumber);
        controls.syncVolume(); music.tick();
    });
    listen(document, 'change', event => {
        if (event.target.matches?.('[data-bgm-volume]')) controls.saveVolume();
    });
    listen(document, 'visibilitychange', music.tick);
    const live = handler => event => { if (!event.detail?.background) handler(); };
    listen(window, 'project-idle:encounter-finished', live(() => music.duck(2200)));
    listen(window, 'project-idle:player-defeated', live(() => music.duck(2000)));
    listen(window, 'project-idle:movement-started', live(music.leaveZone));
    listen(window, 'project-idle:startup-visibility', controls.syncVolume);
    const interval = environment.repeat(music.tick, 1000);
    let disposed = false;
    return () => {
        if (disposed) return;
        disposed = true;
        environment.cancelRepeat(interval);
        listeners.splice(0).forEach(remove => remove());
        music.dispose();
    };
}
