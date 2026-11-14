import { listenView, releaseViewEvents } from './view-events.mjs';
import { lessonAvailable, lessonHtml, render } from './player-guide-examples.mjs';
import { repositionReplayCoach, dismissReplay, allowsTab, openReplay, readReplayLiveGame } from './player-guide-replay.mjs';

export function createPlayerGuideView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], frames: new Set() };
    const handlers = { lessonAvailable, lessonHtml, repositionReplayCoach, render, dismissReplay, allowsTab };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : undefined;
    initialize(runtime);

    runtime.api = PlayerGuideViewApi(runtime);
    installPlayerGuideViewEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.lessons = [
        { key: 'unlock_items', tabId: 'tab-items', title: '장비 비교와 교체',
            body: '장비 창에서 가방의 장비를 눌러 착용 중인 장비와 비교하세요. 바꾸려면 장착을 누르세요.' },
        { key: 'unlock_skills', tabId: 'tab-skills', title: '스킬룬 장착',
            body: '스킬룬에서 현재 무기로 쓸 수 있는 룬을 고르고 장착하세요.' },
        { key: 'unlock_char', tabId: 'tab-char', title: '스킬트리 투자',
            body: '스킬트리에서 연결된 노드를 고르고 포인트를 쓰세요.' },
        { key: 'unlock_stump_box', tabId: 'tab-stump', title: '그루터기 함에 심기',
            body: '보관함의 씨앗을 고른 뒤 빈 칸에 놓으세요. 심은 씨앗은 적을 처치할 때 자랍니다.' },
        ...runtime.deps.systemTutorialUi.lessons
    ];
    runtime.state.terms = [
        { name: '루프', tab: 'tab-season', body: '현재 루프 목표를 달성한 뒤 액트 1부터 다시 시작하는 진행 단위입니다. 영구 해금과 영구 강화는 이어집니다.' },
        { name: '해금 포인트', tab: 'tab-unlocks', body: '루프를 넘어갈 때 얻습니다. 루프 메뉴의 해금에서 새 기능을 여는 데 씁니다.' },
        { name: '지하석', unlock: 'underworld', body: '지하계에서 얻는 장착용 돌입니다. 지하계의 지하석 탭에서 끼우거나 강화할 수 있습니다.' },
        { name: '창공의 정수', unlock: 'cosmos', body: '창공의 정수는 우주계 탐사, 은하 보스에서 얻고 룬 강화와 룬 각인에 씁니다.' },
        { name: '응축된 창공의 정수', unlock: 'sky', body: '창공의 탑에서 얻는 재화입니다. 창공석과 공격 룬을 영구 강화하는 데 씁니다.' },
        { name: '지도석', tab: 'map-explore-worldtree', body: '세계수 아틀라스에서 한 지도를 여는 데 쓰는 입장 재료입니다.' }
    ];
    runtime.state.replay = null;
}

function PlayerGuideViewApi(runtime) {
    const api = {
        render: runtime.handlers.render,
        dismissReplay: runtime.handlers.dismissReplay,
        allowsTab: runtime.handlers.allowsTab,
        liveGame: () => readReplayLiveGame(runtime)
    };
    api.dispose = () => disposePlayerGuideView(runtime);
    return Object.freeze(api);
}

function installPlayerGuideViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, 'click', event => {
        const key = event.target.closest('#ui-player-guide [data-guide-lesson]')?.dataset.guideLesson;
        const lesson = runtime.state.lessons.find(row => row.key === key);
        if (lesson && lessonAvailable(runtime, lesson)) openReplay(runtime, lesson);
    });
}

function disposePlayerGuideView(runtime) {
    if (!runtime.active) return;
    try { dismissReplay(runtime, false); }
    finally { releaseViewEvents(runtime); }
}
