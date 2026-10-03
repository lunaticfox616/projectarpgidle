// 설정 "아이콘 그림": 도트(기본, scripts/build-pixel-icons.cjs가 찍은 사본) · 원화. 경로 바꾸기는 js/utils.js pixelIconPath.
const iconArtUi = {
    sync() {
        const select = document.getElementById('sel-icon-art');
        if (select) select.value = normalizeIconArtStyle(game.settings.iconArtStyle);
    },
    set(value) {
        game.settings.iconArtStyle = normalizeIconArtStyle(value);
        iconArtUi.sync();
        updateStaticUI();
    }
};
safeExposeGlobals({ iconArtUi });
