/* 쓰러질 때의 화면(2026-11-05 사용자: "사망 시 바로 부활이 아니라 화면이 까매졌다가 밝아지는 연출로 몇 초 뒤에 움직일 수 있게").
 * 쓰러진 그 틱에 지도가 입구부터 다시 놓이므로(js/combat.js handlePlayerDefeat의 startMoving), 쓰러진 순간의 전장을 멈춘 그림으로
 * 세워 까맣게 덮고, 잠시 뒤 걷어 다시 놓인 전장을 드러낸다(css/ui-feedback.css .battle-defeat-fade). 움직이지 못하는 시간은
 * js/combat.js holdAfterDefeat가 잡는다. 그림만 다룬다: 게임 상태를 바꾸지 않는다. 동작 줄이기 설정에서는 띄우지 않는다. */
(function () {
    'use strict';

    /** 전장 캔버스의 지금 그림을 같은 자리, 같은 크기로 멈춰 세운 복사본. */
    function stillOf(canvas) {
        const still = document.createElement('canvas');
        still.width = canvas.width;
        still.height = canvas.height;
        still.className = 'battle-defeat-still';
        Object.assign(still.style, { left: `${canvas.offsetLeft}px`, top: `${canvas.offsetTop}px`, width: `${canvas.offsetWidth}px`, height: `${canvas.offsetHeight}px` });
        still.getContext('2d').drawImage(canvas, 0, 0);
        return still;
    }

    function showDefeatFade(event) {
        if (event.detail?.background || uiDisplay.reducedEffects()) return;
        const wrap = document.getElementById('battlefield-wrap'), canvas = document.getElementById('battlefield-canvas');
        if (!wrap || !canvas || !canvas.width || !canvas.height) return;
        wrap.querySelector('.battle-defeat-fade')?.remove();
        const fade = document.createElement('div'), dark = document.createElement('div');
        fade.className = 'battle-defeat-fade';
        fade.setAttribute('aria-hidden', 'true');
        dark.className = 'battle-defeat-dark';
        fade.append(stillOf(canvas), dark);
        fade.addEventListener('animationend', end => { if (end.target === fade) fade.remove(); });
        wrap.append(fade);
    }

    window.addEventListener('project-idle:player-defeated', showDefeatFade);
}());
