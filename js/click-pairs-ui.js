// 이어지는 더블클릭(2026-11-03 사용자 "연속으로 더블클릭 ... 연속으로 장착이 안되는"): 같은 자리를 빠르게 계속 누르면 브라우저는 클릭 수를 이어 세고,
// dblclick은 클릭 수가 2일 때 한 번만 보낸다. 벗은 장비가 같은 칸으로 돌아오는 가방에서는 그 뒤의 누름이 모두 사라졌다.
// 이어진 누름을 둘씩 묶어 둘째마다 dblclick을 다시 보낸다. 클릭 수가 3에서 멈추는 브라우저도 있어 짝수인지 대신 짝을 직접 센다.
const clickPairs = (() => {
    let second = false;
    function onClick(event) {
        second = event.detail > 1 && !second;
        if (!second || event.detail === 2) return;
        const { target, clientX, clientY } = event;
        // 진짜 dblclick처럼 이 click의 처리가 끝난 뒤에 보낸다.
        setTimeout(() => target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window, detail: 2, clientX, clientY })), 0);
    }
    document.addEventListener('click', onClick, true);
    /** Whether the click being handled is the second of a pair (its dblclick follows). */
    return Object.freeze({ isSecond: () => second });
})();
safeExposeGlobals({ clickPairs });
