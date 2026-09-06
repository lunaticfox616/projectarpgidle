# 액트 1 성소 배경

- 런타임: `assets/background/world-tree/act01-sanctuary.webp` (816×624).
- 기존 `act01-filled-v1.webp`를 참조하여 내장 image_gen으로 생성. 원본은 보존한다.
- 생성 원본: `C:/Users/pjh46/.codex/generated_images/01a06df1-d5ca-7752-99c9-df8094fca2c1/exec-fbfad154-b8d8-4ca5-9618-3a41843c8d10.png`.
- Sharp로 기존 크기에 맞춰 WebP 품질 92로 인코딩했다.
- `data/maps.js`의 bgAct1 경로만 교체. 전장 판정·좌표·밸런스·저장 형식은 변경하지 않는다. 기존 bgAct1 fallback 지역에도 같은 자산이 적용된다.
- PC/모바일 실제 전투에서 로드와 콘솔 오류를 확인했고 전체 스모크 172개 통과. 자산 경로 교체이므로 JS 구조 검사는 생략했다.

## 생성 프롬프트

후속 바닥 수정: 내장 image_gen으로 위 생성본을 편집했다. 원본 `exec-b8c9eb75-c3cb-4f74-8856-11baf67711dd.png` (동일 생성 폴더). 바닥의 뿌리와 자갈을 제거하고 회녹색 석재 타일로 교체했다.

후속 프롬프트: Precise edit of supplied pixel art game backdrop. Change ONLY the central rectangular arena floor tiles, preserve all surrounding tree roots, shrine, candles, moss, camera, composition and arena bounds. Replace dirt-and-roots tiles with elegant ancient honed slate paving: large square desaturated charcoal gray-green stone slabs with subtly beveled edges, fine restrained grain, very few hairline cracks and sparse tiny moss at outermost joints. No roots, pebbles, dirt patches or busy patterns inside arena. Keep the same exact 9 columns x 8 rows grid and straight lines and size. Floor dark but readable, slightly lighter than surrounding roots, low contrast seams, not checkerboard. Hand-crafted refined pixel art consistent with surrounding image, not smooth photorealism. No glowing runes, no center emblem, no characters or text. Preserve original aspect ratio and framing. Dark calm sanctuary, not oppressive.

Edit reference image: game Act 1 battle backdrop, refined pixel art. Preserve EXACT composition and aspect ratio 816:624, camera, central rectangular 9 columns x 8 rows arena bounds x186..630 y140..534 relative to 816x624 image. Keep grid perfectly straight, low contrast. Ancient huge tree roots wrapping stone sanctuary around edges, altar at top. User wants dark atmosphere but NOT heavy/oppressive. Replace muddy all-brown palette with restrained charcoal brown roots, desaturated moss/sage green growth at edges, soft cool ambient light, small warm amber candles, breathable gently lit arena floor. Quiet inviting mysterious old forest sanctuary, not horror. Center must remain flat simple uncluttered and readable for small pixel characters and colorful attacks. Edge detail elegant and less noisy, deliberate crisp pixel clusters compatible with original. No characters, no UI, no text, no thick fog, no bright magical objects, no photorealism. Keep original arena geometry precisely; do not zoom or change layout.
