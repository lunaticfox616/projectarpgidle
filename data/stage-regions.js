// 지역 무대 묶음 (js/canvas-stage-region.js). scripts/build-stage-regions.cjs가 만든 표다: 손으로 고치지 않는다.
// 2026-10-12 사용자가 이미지 생성으로 만들어 온 "지역 무대 조립본"(regions-kit-v2): 지역마다 방 그림 한 장(뒤쪽 풍경과 바닥이 한 장에
// 있다), 재질마다 소품 여덟 가지. 그림은 assets/stage-scenes/regions/ 아래에 두고 저장소에 넣는다. 문은 공용 뿌리 봉인
// (data/stage-view.js STAGE_ROOMS.rootSeal)이 맡는다.
//   fit     방 그림을 놓는 기준 화면(캐릭터 도트): width 가로(스무 칸), height 세로, floorBottom 바닥의 앞쪽 끝이 놓이는 줄,
//           margin 방 바닥의 양옆으로 카메라가 더 보여 주는 너비의 합. 방 그림은 이 화면을 덮는 가장 작은 배율로, 늘이거나 이어 붙이지
//           않고 가운데를 맞춰 놓는다(js/stage-region-fit.js). 그림이 닿지 않는 위아래는 sky, earth 색으로 메운다.
//   families 재질 → pieces 조각: 이름 → [가로, 세로, 발 x, 발 y, 그림이 차지하는 상자의 왼쪽, 위, 가로, 세로].
//           조각 그림은 캐릭터 도트 하나에 1px.
//           prop-0, prop-1 낮은 소품, prop-2 정예 방의 높은 표식, prop-3 보스 방의 큰 구조물, prop-4와 5 상자의 닫힌 모습과 열린 모습,
//           prop-6과 7 깨지는 물건의 깨지기 전과 뒤.
//   regions 지역 → 방 그림(<지역>.png)의 가로와 세로, ground 바닥이 시작하는 줄, door 뒤쪽 문이 서는 가로 자리(그림 너비의 비율, 없으면 null),
//           family 재질, sky와 earth 그림 맨 위와 맨 아래의 색, normal, elite, boss 그 구실의 방에 놓는 소품 번호, bossSide 보스 방의 큰 구조물이 서는 쪽.
const STAGE_REGIONS = Object.freeze({
    path: 'assets/stage-scenes/regions/',
    version: '0d04f89831',
    fit: Object.freeze({ width: 1280, height: 720, floorBottom: 536, margin: 192 }),
    families: Object.freeze({
        F01: Object.freeze({
            pieces: Object.freeze({ 'prop-0': Object.freeze([96, 56, 48, 52, 25, 4, 45, 48]), 'prop-1': Object.freeze([96, 56, 48, 52, 4, 9, 88, 43]), 'prop-2': Object.freeze([104, 144, 52, 140, 21, 4, 61, 136]), 'prop-3': Object.freeze([224, 240, 112, 236, 4, 4, 215, 232]), 'prop-4': Object.freeze([88, 64, 44, 60, 4, 15, 80, 45]), 'prop-5': Object.freeze([88, 88, 44, 84, 4, 18, 80, 66]), 'prop-6': Object.freeze([64, 72, 32, 68, 12, 4, 39, 64]), 'prop-7': Object.freeze([72, 48, 36, 44, 5, 13, 63, 31]) })
        }),
        F02: Object.freeze({
            pieces: Object.freeze({ 'prop-0': Object.freeze([96, 56, 48, 52, 4, 4, 87, 48]), 'prop-1': Object.freeze([96, 56, 48, 52, 4, 13, 88, 39]), 'prop-2': Object.freeze([104, 144, 52, 140, 20, 4, 64, 136]), 'prop-3': Object.freeze([224, 240, 112, 236, 6, 4, 213, 232]), 'prop-4': Object.freeze([88, 64, 44, 60, 4, 12, 80, 48]), 'prop-5': Object.freeze([88, 88, 44, 84, 4, 11, 80, 73]), 'prop-6': Object.freeze([64, 72, 32, 68, 6, 4, 52, 64]), 'prop-7': Object.freeze([72, 48, 36, 44, 7, 4, 57, 40]) })
        }),
        F03: Object.freeze({
            pieces: Object.freeze({ 'prop-0': Object.freeze([96, 56, 48, 52, 15, 4, 66, 48]), 'prop-1': Object.freeze([96, 56, 48, 52, 5, 20, 87, 32]), 'prop-2': Object.freeze([104, 144, 52, 140, 16, 4, 71, 136]), 'prop-3': Object.freeze([224, 240, 112, 236, 4, 81, 216, 155]), 'prop-4': Object.freeze([88, 64, 44, 60, 4, 9, 80, 51]), 'prop-5': Object.freeze([88, 88, 44, 84, 4, 18, 79, 66]), 'prop-6': Object.freeze([64, 72, 32, 68, 5, 4, 53, 64]), 'prop-7': Object.freeze([72, 48, 36, 44, 4, 15, 64, 29]) })
        }),
        F04: Object.freeze({
            pieces: Object.freeze({ 'prop-0': Object.freeze([96, 56, 48, 52, 4, 12, 88, 40]), 'prop-1': Object.freeze([96, 56, 48, 52, 12, 4, 71, 48]), 'prop-2': Object.freeze([104, 144, 52, 140, 7, 4, 89, 136]), 'prop-3': Object.freeze([224, 240, 112, 236, 4, 61, 216, 175]), 'prop-4': Object.freeze([88, 64, 44, 60, 4, 12, 80, 48]), 'prop-5': Object.freeze([88, 88, 44, 84, 4, 39, 80, 45]), 'prop-6': Object.freeze([64, 72, 32, 68, 8, 4, 47, 64]), 'prop-7': Object.freeze([72, 48, 36, 44, 4, 14, 64, 30]) })
        }),
        F05: Object.freeze({
            pieces: Object.freeze({ 'prop-0': Object.freeze([96, 56, 48, 52, 7, 4, 82, 48]), 'prop-1': Object.freeze([96, 56, 48, 52, 20, 4, 55, 48]), 'prop-2': Object.freeze([104, 144, 52, 140, 17, 4, 70, 136]), 'prop-3': Object.freeze([224, 240, 112, 236, 12, 4, 200, 232]), 'prop-4': Object.freeze([88, 64, 44, 60, 4, 9, 80, 51]), 'prop-5': Object.freeze([88, 88, 44, 84, 4, 16, 80, 68]), 'prop-6': Object.freeze([64, 72, 32, 68, 13, 4, 37, 64]), 'prop-7': Object.freeze([72, 48, 36, 44, 20, 4, 32, 40]) })
        }),
        F06: Object.freeze({
            pieces: Object.freeze({ 'prop-0': Object.freeze([96, 56, 48, 52, 4, 21, 88, 31]), 'prop-1': Object.freeze([96, 56, 48, 52, 4, 4, 88, 48]), 'prop-2': Object.freeze([104, 144, 52, 140, 19, 4, 65, 136]), 'prop-3': Object.freeze([224, 240, 112, 236, 4, 75, 216, 161]), 'prop-4': Object.freeze([88, 64, 44, 60, 4, 14, 80, 46]), 'prop-5': Object.freeze([88, 88, 44, 84, 4, 39, 80, 45]), 'prop-6': Object.freeze([64, 72, 32, 68, 5, 4, 53, 64]), 'prop-7': Object.freeze([72, 48, 36, 44, 4, 4, 64, 40]) })
        }),
        F07: Object.freeze({
            pieces: Object.freeze({ 'prop-0': Object.freeze([96, 56, 48, 52, 4, 8, 88, 44]), 'prop-1': Object.freeze([96, 56, 48, 52, 4, 8, 88, 44]), 'prop-2': Object.freeze([104, 144, 52, 140, 8, 4, 87, 136]), 'prop-3': Object.freeze([224, 240, 112, 236, 5, 4, 213, 232]), 'prop-4': Object.freeze([88, 64, 44, 60, 4, 10, 80, 50]), 'prop-5': Object.freeze([88, 88, 44, 84, 4, 20, 80, 64]), 'prop-6': Object.freeze([64, 72, 32, 68, 5, 30, 55, 38]), 'prop-7': Object.freeze([72, 48, 36, 44, 4, 10, 64, 34]) })
        }),
        F08: Object.freeze({
            pieces: Object.freeze({ 'prop-0': Object.freeze([96, 56, 48, 52, 4, 14, 88, 38]), 'prop-1': Object.freeze([96, 56, 48, 52, 4, 15, 88, 37]), 'prop-2': Object.freeze([104, 144, 52, 140, 10, 4, 83, 136]), 'prop-3': Object.freeze([224, 240, 112, 236, 4, 33, 216, 203]), 'prop-4': Object.freeze([88, 64, 44, 60, 5, 4, 78, 56]), 'prop-5': Object.freeze([88, 88, 44, 84, 4, 16, 80, 68]), 'prop-6': Object.freeze([64, 72, 32, 68, 7, 4, 49, 64]), 'prop-7': Object.freeze([72, 48, 36, 44, 4, 7, 64, 37]) })
        }),
        F09: Object.freeze({
            pieces: Object.freeze({ 'prop-0': Object.freeze([96, 56, 48, 52, 4, 13, 88, 39]), 'prop-1': Object.freeze([96, 56, 48, 52, 4, 6, 88, 46]), 'prop-2': Object.freeze([104, 144, 52, 140, 4, 5, 96, 135]), 'prop-3': Object.freeze([224, 240, 112, 236, 4, 60, 216, 176]), 'prop-4': Object.freeze([88, 64, 44, 60, 5, 4, 77, 56]), 'prop-5': Object.freeze([88, 88, 44, 84, 4, 11, 80, 73]), 'prop-6': Object.freeze([64, 72, 32, 68, 6, 4, 52, 64]), 'prop-7': Object.freeze([72, 48, 36, 44, 4, 4, 64, 40]) })
        }),
        F10: Object.freeze({
            pieces: Object.freeze({ 'prop-0': Object.freeze([96, 56, 48, 52, 4, 15, 88, 37]), 'prop-1': Object.freeze([96, 56, 48, 52, 19, 4, 57, 48]), 'prop-2': Object.freeze([104, 144, 52, 140, 17, 4, 70, 136]), 'prop-3': Object.freeze([224, 240, 112, 236, 4, 49, 216, 187]), 'prop-4': Object.freeze([88, 64, 44, 60, 4, 9, 80, 51]), 'prop-5': Object.freeze([88, 88, 44, 84, 4, 14, 80, 70]), 'prop-6': Object.freeze([64, 72, 32, 68, 12, 4, 40, 64]), 'prop-7': Object.freeze([72, 48, 36, 44, 8, 4, 56, 40]) })
        }),
        F11: Object.freeze({
            pieces: Object.freeze({ 'prop-0': Object.freeze([96, 56, 48, 52, 4, 4, 87, 48]), 'prop-1': Object.freeze([96, 56, 48, 52, 4, 16, 88, 36]), 'prop-2': Object.freeze([104, 144, 52, 140, 9, 4, 86, 136]), 'prop-3': Object.freeze([224, 240, 112, 236, 4, 85, 216, 151]), 'prop-4': Object.freeze([88, 64, 44, 60, 5, 11, 79, 49]), 'prop-5': Object.freeze([88, 88, 44, 84, 4, 13, 80, 71]), 'prop-6': Object.freeze([64, 72, 32, 68, 5, 11, 54, 57]), 'prop-7': Object.freeze([72, 48, 36, 44, 4, 10, 64, 34]) })
        }),
        F12: Object.freeze({
            pieces: Object.freeze({ 'prop-0': Object.freeze([96, 56, 48, 52, 11, 4, 74, 48]), 'prop-1': Object.freeze([96, 56, 48, 52, 4, 14, 88, 38]), 'prop-2': Object.freeze([104, 144, 52, 140, 19, 4, 65, 136]), 'prop-3': Object.freeze([224, 240, 112, 236, 4, 74, 216, 162]), 'prop-4': Object.freeze([88, 64, 44, 60, 4, 10, 80, 50]), 'prop-5': Object.freeze([88, 88, 44, 84, 4, 16, 80, 68]), 'prop-6': Object.freeze([64, 72, 32, 68, 5, 17, 55, 51]), 'prop-7': Object.freeze([72, 48, 36, 44, 5, 4, 61, 40]) })
        }),
        F13: Object.freeze({
            pieces: Object.freeze({ 'prop-0': Object.freeze([96, 56, 48, 52, 7, 4, 81, 48]), 'prop-1': Object.freeze([96, 56, 48, 52, 4, 12, 88, 40]), 'prop-2': Object.freeze([104, 144, 52, 140, 12, 4, 80, 136]), 'prop-3': Object.freeze([224, 240, 112, 236, 4, 57, 216, 179]), 'prop-4': Object.freeze([88, 64, 44, 60, 17, 4, 53, 56]), 'prop-5': Object.freeze([88, 88, 44, 84, 4, 8, 80, 76]), 'prop-6': Object.freeze([64, 72, 32, 68, 4, 33, 56, 35]), 'prop-7': Object.freeze([72, 48, 36, 44, 4, 10, 64, 34]) })
        }),
        F14: Object.freeze({
            pieces: Object.freeze({ 'prop-0': Object.freeze([96, 56, 48, 52, 8, 4, 80, 48]), 'prop-1': Object.freeze([96, 56, 48, 52, 11, 4, 73, 48]), 'prop-2': Object.freeze([104, 144, 52, 140, 9, 4, 85, 136]), 'prop-3': Object.freeze([224, 240, 112, 236, 4, 77, 216, 159]), 'prop-4': Object.freeze([88, 64, 44, 60, 4, 5, 80, 55]), 'prop-5': Object.freeze([88, 88, 44, 84, 4, 15, 80, 69]), 'prop-6': Object.freeze([64, 72, 32, 68, 4, 25, 56, 43]), 'prop-7': Object.freeze([72, 48, 36, 44, 4, 16, 64, 28]) })
        })
    }),
    regions: Object.freeze({
        'act-02': Object.freeze({ name: '액트 2, 가지치기의 중정', width: 1672, height: 941, ground: 392, door: 0.5, family: 'F01', sky: '#5e4c3a', earth: '#262321', normal: Object.freeze([0, 6]), elite: Object.freeze([2, 0]), boss: Object.freeze([3]), bossSide: 'east' }),
        'rift-past': Object.freeze({ name: '시간의 균열, 과거', width: 1672, height: 941, ground: 392, door: 0.5, family: 'F01', sky: '#7a5f44', earth: '#2c2724', normal: Object.freeze([0, 6]), elite: Object.freeze([2, 0]), boss: Object.freeze([3]), bossSide: 'east' }),
        'act-03': Object.freeze({ name: '액트 3, 허공뿌리 현수림', width: 1672, height: 941, ground: 418, door: 0.5, family: 'F02', sky: '#585f73', earth: '#4d3f3c', normal: Object.freeze([1, 6]), elite: Object.freeze([2, 0]), boss: Object.freeze([3]), bossSide: 'east' }),
        'act-04': Object.freeze({ name: '액트 4, 갈림뿌리 미궁', width: 1671, height: 941, ground: 392, door: 0.27, family: 'F03', sky: '#52423f', earth: '#44322e', normal: Object.freeze([1, 6]), elite: Object.freeze([2, 0]), boss: Object.freeze([3]), bossSide: 'east' }),
        'act-05': Object.freeze({ name: '액트 5, 지주근의 침묵 성소', width: 1672, height: 941, ground: 398, door: 0.62, family: 'F04', sky: '#2e2d37', earth: '#2c2b33', normal: Object.freeze([0, 6]), elite: Object.freeze([2, 1]), boss: Object.freeze([3]), bossSide: 'west' }),
        'act-06': Object.freeze({ name: '액트 6, 가지치기의 중정, 재방문', width: 1672, height: 941, ground: 392, door: 0.5, family: 'F01', sky: '#4a404a', earth: '#282021', normal: Object.freeze([1, 7]), elite: Object.freeze([2, 1]), boss: Object.freeze([3]), bossSide: 'east' }),
        'rift-future': Object.freeze({ name: '시간의 균열, 미래', width: 1672, height: 941, ground: 392, door: 0.5, family: 'F01', sky: '#594f5e', earth: '#2f2524', normal: Object.freeze([1, 7]), elite: Object.freeze([2, 1]), boss: Object.freeze([3]), bossSide: 'east' }),
        'act-07': Object.freeze({ name: '액트 7, 말라가는 큰 줄기', width: 1672, height: 941, ground: 453, door: 0.5, family: 'F02', sky: '#75625d', earth: '#63524d', normal: Object.freeze([0, 1]), elite: Object.freeze([2, 6]), boss: Object.freeze([3]), bossSide: 'west' }),
        'act-08': Object.freeze({ name: '액트 8, 끝없는 장막의 줄기', width: 1672, height: 941, ground: 405, door: 0.38, family: 'F03', sky: '#534045', earth: '#6b5a59', normal: Object.freeze([0]), elite: Object.freeze([2, 6]), boss: Object.freeze([3]), bossSide: 'west' }),
        'act-09': Object.freeze({ name: '액트 9, 비탄의 교차', width: 1672, height: 941, ground: 449, door: 0.27, family: 'F05', sky: '#664839', earth: '#4a3a3b', normal: Object.freeze([1, 6]), elite: Object.freeze([2, 0]), boss: Object.freeze([3]), bossSide: 'east' }),
        'act-10': Object.freeze({ name: '액트 10, 합일의 차륜', width: 1672, height: 941, ground: 420, door: 0.2, family: 'F05', sky: '#453937', earth: '#393035', normal: Object.freeze([0]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'west' }),
        'trial-01': Object.freeze({ name: '1차 시련, 칼날 회랑', width: 1672, height: 941, ground: 449, door: 0.52, family: 'F04', sky: '#443637', earth: '#433331', normal: Object.freeze([0, 6]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'east' }),
        'trial-02': Object.freeze({ name: '2차 시련, 삼원 제단', width: 1672, height: 941, ground: 394, door: 0.84, family: 'F04', sky: '#3b3033', earth: '#3c3033', normal: Object.freeze([0, 6]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'west' }),
        'trial-03': Object.freeze({ name: '3차 시련, 독무 정원', width: 1672, height: 941, ground: 414, door: 0.33, family: 'F04', sky: '#352c32', earth: '#2b2524', normal: Object.freeze([0, 6]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'east' }),
        'trial-04': Object.freeze({ name: '4차 시련, 십자 회랑', width: 1672, height: 941, ground: 414, door: 0.3, family: 'F06', sky: '#2b1e24', earth: '#231b21', normal: Object.freeze([0, 6]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'east' }),
        'trial-05': Object.freeze({ name: '5차 시련, 혹한 미궁', width: 1672, height: 941, ground: 395, door: 0.36, family: 'F07', sky: '#3e4053', earth: '#4b4e64', normal: Object.freeze([0, 6]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'west' }),
        'chaos': Object.freeze({ name: '혼돈 층계', width: 1672, height: 941, ground: 400, door: 0.32, family: 'F08', sky: '#423337', earth: '#382828', normal: Object.freeze([0, 1, 6]), elite: Object.freeze([2, 1]), boss: Object.freeze([3]), bossSide: 'east' }),
        'deep-chaos': Object.freeze({ name: '심화 혼돈', width: 1672, height: 941, ground: 435, door: 0.25, family: 'F08', sky: '#2a1f27', earth: '#2b2229', normal: Object.freeze([1]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'east' }),
        'chaos-realm': Object.freeze({ name: '혼돈계', width: 1672, height: 941, ground: 422, door: 0.19, family: 'F08', sky: '#32252c', earth: '#413134', normal: Object.freeze([0, 6]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'east' }),
        'labyrinth': Object.freeze({ name: '고대 미궁', width: 1672, height: 941, ground: 375, door: 0.5, family: 'F06', sky: '#2f393b', earth: '#202427', normal: Object.freeze([1, 6]), elite: Object.freeze([2, 0]), boss: Object.freeze([3]), bossSide: 'west' }),
        'underworld': Object.freeze({ name: '지하계', width: 1672, height: 941, ground: 405, door: 0.55, family: 'F09', sky: '#2a2b35', earth: '#1b1c25', normal: Object.freeze([0, 1]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'east' }),
        'sky': Object.freeze({ name: '창공의 탑', width: 1672, height: 941, ground: 449, door: 0.5, family: 'F10', sky: '#5d5a70', earth: '#66595d', normal: Object.freeze([0, 6]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'west' }),
        'ocean': Object.freeze({ name: '심해', width: 1672, height: 941, ground: 375, door: 0.415, family: 'F11', sky: '#1f3949', earth: '#3e3c40', normal: Object.freeze([0, 1]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'east' }),
        'ocean-trench': Object.freeze({ name: '심해 해구', width: 1672, height: 941, ground: 375, door: 0.415, family: 'F11', sky: '#030a14', earth: '#1d283a', normal: Object.freeze([0, 1]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'east' }),
        'ocean-lightless': Object.freeze({ name: '심해 무광층', width: 1672, height: 941, ground: 375, door: 0.415, family: 'F11', sky: '#040c19', earth: '#2e3b55', normal: Object.freeze([0, 1]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'east' }),
        'ocean-shallow': Object.freeze({ name: '심해 얕은 암초', width: 1672, height: 941, ground: 375, door: 0.415, family: 'F11', sky: '#4f9eb4', earth: '#e3d1ae', normal: Object.freeze([0, 1]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'east' }),
        'cosmos': Object.freeze({ name: '우주계', width: 1672, height: 941, ground: 388, door: 0.85, family: 'F12', sky: '#1b1b26', earth: '#24232b', normal: Object.freeze([0, 1]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'west' }),
        'void': Object.freeze({ name: '공허 균열', width: 1672, height: 941, ground: 390, door: 0.32, family: 'F12', sky: '#353234', earth: '#2b282a', normal: Object.freeze([1]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'east' }),
        'beehive': Object.freeze({ name: '벌집', width: 1672, height: 941, ground: 400, door: 0.62, family: 'F13', sky: '#4d2b22', earth: '#3d2421', normal: Object.freeze([0, 1, 6]), elite: Object.freeze([2, 0]), boss: Object.freeze([3]), bossSide: 'west' }),
        'colony': Object.freeze({ name: '군락지', width: 1672, height: 941, ground: 388, door: 0.5, family: 'F14', sky: '#31231f', earth: '#3d2d25', normal: Object.freeze([0, 1, 6]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'west' }),
        'meteor': Object.freeze({ name: '운석 낙하지', width: 1672, height: 941, ground: 392, door: 0.25, family: 'F09', sky: '#30282c', earth: '#282022', normal: Object.freeze([0, 1]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'west' }),
        'beyond': Object.freeze({ name: '혼돈 밖', width: 1672, height: 941, ground: 383, door: 0.66, family: 'F12', sky: '#8b8687', earth: '#2f2930', normal: Object.freeze([0]), elite: Object.freeze([2]), boss: Object.freeze([3]), bossSide: 'east' }),
        'fishing': Object.freeze({ name: '낚시 쉼터', width: 1672, height: 940, ground: 370, door: null, family: 'F02', sky: '#404e58', earth: '#28262a', normal: Object.freeze([0, 1]), elite: Object.freeze([]), boss: Object.freeze([]), bossSide: 'east' })
    })
});
safeExposeData({ STAGE_REGIONS });
