/** Login-only introduction. Recorded media never starts or alters the player's game. */
(() => {
    const opener = document.getElementById('startup-about-open');
    const dialog = document.getElementById('startup-about-dialog');
    const video = document.getElementById('startup-about-video');
    const status = document.getElementById('startup-about-status');

    opener.addEventListener('click', async () => {
        if (dialog.open) return;
        video.poster = 'assets/ui/gameplay-intro.webp?v=occultist-2';
        if (!video.getAttribute('src')) video.src = 'assets/ui/gameplay-intro.webm?v=occultist-2';
        status.hidden = true;
        dialog.showModal();
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        try {
            await video.play();
        } catch (error) {
            if (!dialog.open) return; // Closing while play() is pending intentionally cancels playback.
            status.textContent = '자동 재생이 제한되어 실제 전투 이미지를 표시합니다.';
            status.hidden = false;
            console.warn('[startup-intro] Video autoplay unavailable:', error);
        }
    });
    video.addEventListener('error', () => {
        status.textContent = '영상을 재생할 수 없어 실제 전투 이미지를 표시합니다.';
        status.hidden = false;
    });
    dialog.addEventListener('close', () => {
        video.pause();
        video.currentTime = 0;
        opener.focus({ preventScroll: true });
    });
})();
