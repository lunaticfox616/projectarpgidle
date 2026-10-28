# GitHub 올리기 — 공개 / 비공개 나눔 (2026-10-01)

지금(2026-10-14) 코드는 `codex/…` 가지에서 `main`으로 PR을 올린다. 아래 나눠 올리기는 `rignin-next`의 Hana 그림을 올릴 때만 쓴다.

Hana Caraka 캐릭터 스프라이트는 팀 내부 전용(재배포 금지)이라 공개 저장소에 올릴 수 없다.
그래서 개발 브랜치 `rignin-next`를 두 저장소에 나눠 올린다.

| 저장소 | 브랜치 | 내용 |
|---|---|---|
| 공개 `lunaticfox616/projectarpgidle` | `rignin-next` | 전부. 단, 아래 비공개 경로는 커밋 이력 전체에서 뺀다 |
| 비공개 `lunaticfox616/projectarpgidle-assets` | `main` | 비공개 경로의 파일만, 같은 위치에 + README |

비공개 경로 (`scripts/publish-github.cjs`의 `PRIVATE_PATHS`):

- `assets/playable/hana/` — Hana 캐릭터 스프라이트 67장
- `docs/skill-assets-hana/reference/` — 스킬 인계 원본 보관본 3개
- `assets/summon/hana/` — 예전 Hana 소환수 스프라이트. 지금 트리에는 없지만 옛 커밋에 남아 있어 이력에서 뺀다
- `assets/stage-vfx/vfx.png`, `vfx2.png`(2026-10-17 스킬룬 인계 v32의 둘째 장) — 구입한 무대 스킬 이펙트 묶음(상업적 이용 가능, 재배포 금지). 공개 쪽 이력에 들어간 적이 없어 비공개 저장소에 직접 올린다

인계 스킬 이펙트 코드(`data/hana-skill-fx.js` 등)와 Hana 메타데이터(`data/hana-sprites.js`, `data/hana-weapon-combos.js`)는 그림이 아니라서 공개 쪽에 둔다(2026-10-01 결정).
공개 브랜치만 받으면 캐릭터 그림이 빠진 상태다.

## 올리는 법

- 런처(`RIGNIN 테스트.cmd` / `rignin-ui\테스트-메뉴.cmd`) → **9. GitHub에 올리기**
- 또는 `node scripts/publish-github.cjs` — `--dry-run` 확인만, `--yes` 묻지 않고 올림

커밋된 내용만 올라간다. 로컬 작업 방식은 그대로다(로컬 `rignin-next`에는 Hana 그림이 계속 있다).

## 동작

1. 임시 bare 클론(`--shared`: 개체를 복사하지 않음)에서 작업한다. 이 작업 트리·인덱스·브랜치는 건드리지 않는다.
2. 공개 기준 커밋 `98bc57a4`(나눌 때의 공개 `main`) 이후 커밋을 `git filter-branch --index-filter`로 다시 쓴다.
   트리·날짜·메시지가 같으면 해시도 같으므로, 매번 전체를 다시 써도 이전에 올린 결과에 새 커밋만 이어 붙는다(fast-forward).
3. 올리기 전 검사: 걸러낸 이력에 비공개 경로가 남아 있거나, 경로에 `hana`/`caraka`가 들어간 그림 파일이 공개 쪽에 있으면 중단한다.
4. 공개 저장소의 브랜치가 이번 결과의 조상이 아니면(누가 직접 올렸거나 `PRIVATE_PATHS`를 바꿨을 때) 중단한다. 확인한 뒤 `--force-public`.
5. 비공개 쪽은 비공개 경로 파일 + README로 트리를 만들어, 내용이 바뀌었을 때만 `main`에 커밋을 하나 더한다.

## 주의

- 로컬 `rignin-next`를 공개 저장소(`origin`)에 직접 push하지 않는다. Hana 그림이 이력째 올라간다.
  같은 이름은 이력이 달라 거절되지만, 다른 브랜치 이름으로 올리면 그대로 올라간다.
- Hana 그림을 새 경로에 추가하면 `PRIVATE_PATHS`에 넣는다. 옛 커밋이 다시 쓰이므로 그다음 한 번은 `--force-public`이 필요하다.
- 새 PC에서 전체 게임을 받으려면 공개 `rignin-next`를 받은 뒤 비공개 저장소의 `assets`, `docs` 폴더를 그 위에 복사한다.
- 공개 저장소 CI(`.github/workflows/test.yml`)에는 비공개 경로가 없다. 지금 스모크는 비공개 그림 없이 돈다.
  공개 상태를 미리 보려면 `git archive HEAD` 복사본에서 `npm test`.

## 새 배포 알림 (2026-10-11)
사용자: "PR 올려서 github pages에 들어가고 나면 새로고침 하라고 떴으면 좋겠는데".
- 웹 묶음을 만들 때(`scripts/build-web.js`) 배포 표식을 `dist/index.html`의 `<meta name="app-deploy">`와 `dist/version.json`에 적는다.
  Actions에서는 커밋 앞 12자, 그 밖에서는 묶음을 만든 시각이다. 저장소의 index.html에는 `dev`로 남는다.
- 열려 있는 게임(`js/app-update-ui.js`)은 5분마다, 탭으로 돌아올 때(1분에 한 번까지) `version.json`을 캐시 없이 읽어 제 표식과 다르면
  화면 위 가운데에 "새 버전이 올라왔습니다. 새로고침하면 적용됩니다."와 새로고침, 나중에(30분 뒤 다시) 단추를 띄운다.
  서비스 워커가 교체돼도 강제로 새로고침하지 않는다. 플레이어가 단추를 누르면 현재 진행을 로컬에 저장한 뒤 새로고침한다.
  저장 실패나 진행 정산 중에는 현재 화면을 유지하고 이유를 알린다. 페이지 종료 이벤트의 저장에만 의존하지 않는다(2026-10-13).
- 표식이 `dev`인 개발 서버와 앱(네이티브)에서는 켜지지 않는다. 기존 `<meta name="app-build">`는 플레이 기록용 이름표라 그대로 둔다.
- 읽는 파일은 수십 바이트이고 GitHub Pages에서 받는다(클라우드 서버 요청은 늘지 않는다).

## 게임 판 표식과 옛 판 보호 (2026-10-28)
사용자: "저장 버전 안전장치부터 넣어줘". 스토어 앱은 심사와 자동 업데이트 때문에 웹보다 며칠 늦고, 열어 둔 창은 새로고침 전까지 옛 판이다.
옛 판이 새 판의 저장을 불러오면 모르는 내용을 옛 규칙으로 정리한 뒤 다시 저장해, 같은 계정의 새 판 진행까지 망가뜨릴 수 있었다.
- 묶음을 만들 때(`scripts/build-web.js`, `scripts/build-mobile-web.js`가 쓰는 `scripts/lib/game-build.js`) 그 커밋의 시각을
  `<meta name="game-build">`에 적는다. 묶음을 만든 시각이 아니라 커밋 시각이라, 같은 커밋으로 만든 웹과 앱은 같은 판이다. 저장소의 index.html에는 `dev`로 남는다.
- 판이 있는 페이지는 기기에 저장할 때마다 `saveMeta.gameBuild`에 제 판을 적는다(`js/save.js`). 클라우드 저장은 기기 저장을 올리므로 같은 값이 간다.
- 제 판보다 뒤의 판이 적힌 저장은 받지 않는다.
  - 기기 저장: `loadGame`이 불러오지 않고 상태를 `newer-build`(쓰기 금지)로 둔다. 원래 저장은 그대로 남고, 서버 사본으로 고치는 쓰기도 막는다.
    시작 화면은 "새 버전의 저장입니다"와 새로고침·앱 업데이트 안내를 띄운다. 이 상태에서는 클라우드 불러오기·올리기도 하지 않는다.
  - 클라우드 저장: 로그인 대조(`reconcileCloudSaveState`)는 묻거나 바꾸기 전에, 업로드(`pushCloudSave`)는 확인 요약을 읽은 뒤에, 불러오기(`applyExternalSave`)는
    게임을 바꾸기 전에 멈춘다. 자동 저장이 이 이유로 멈추면 업데이트 안내 알림이 한 번 뜬다. 종료 직전 업로드는 서버의 저장 번호 확인이 막는다.
- 판이 없는 페이지(개발 서버, 스모크 런타임)와 판이 적히지 않은 예전 저장은 막지 않는다. 같거나 앞선 판의 저장은 불러온 뒤 제 판으로 바꿔 적는다.
- 아직 머지하지 않은 브랜치로 만든 시험 앱은 main 배포보다 뒤의 판일 수 있다. 그 앱이 올린 클라우드 저장은 다음 main 배포까지 웹이 받지 않는다(진행은 잃지 않는다).
- 되돌릴 때는 revert 커밋으로 한다(새 시각이라 더 뒤의 판이 된다). 예전 커밋을 그대로 다시 배포하면(workflow_dispatch로 옛 ref, main 강제 되돌리기)
  그 사이에 저장한 모든 사람의 저장이 "더 새 판"이 되어 잠긴다. 커밋 시각이 10분 넘게 미래면 묶음 만들기가 멈춘다(시계가 틀린 기기의 커밋).
- 이 장치는 웹이 앱보다 앞선 동안 앱의 계정 저장을 잠근다. 웹을 하루에 여러 번 배포하고 스토어 심사가 며칠 걸리면 스토어 앱은 거의 늘 잠겨 있으므로,
  스토어 출시 전에 라이브 업데이트(앱이 켜질 때 웹과 같은 묶음을 받음)나 웹 배포를 앱 출시에 맞추는 운영이 필요하다.
- 검사: `scripts/smoke-save-migration.js`(기기 저장), `scripts/smoke-cloud-account-isolation.js`(로그인 대조).

## 무대 그림 (2026-10-16부터)
- 무대 그림(`assets/playable/stage`, `assets/stage-scenes`, `assets/enemies/roster`, `assets/stage-npcs`, `assets/stage-vfx/boss-fx`)은
  공개 저장소에 있다. 구입한 `assets/stage-vfx/vfx.png`와 `vfx2.png`만 비공개 저장소에 있고 배포 때 묶음에 들어간다. vfx.png가 없으면 무대 스킬 효과는 게임의 원래 효과로 나오고,
  vfx2.png만 없으면 그 장에서 자르는 클립(v32의 새 클립)만 나오지 않는다.
