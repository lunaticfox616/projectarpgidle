# 지하계 배경

- 최종 자산: `assets/background/underworld-sanctuary.webp`, 816×624, WebP quality 92.
- 내장 image_gen 사용. 기존 `underworld-v1.webp`는 장소 참조, `world-tree/act01-sanctuary.webp`는 표현·구도 참조.
- 생성 원본: `C:/Users/pjh46/.codex/generated_images/01a06df1-d5ca-7752-99c9-df8094fca2c1/exec-e9eb9577-d612-4fd2-838b-658ea233e7a3.png`.
- 기존의 마름모 구도를 직교 전장으로 교체했다. 검은 성채·쇠사슬·용암을 유지하고 중앙은 조용한 석재 바닥으로 정리했다.
- 원본 1434×1097에서 바닥 범위 (298,256)-(1134,950)를 9×8 전투 좌표에 맞춰 렌더링한다. 전투 판정이나 저장은 변경하지 않는다. 지하계와 같은 배경을 사용하는 지핵군주에도 적용된다.
- 기존 지연 로드를 유지한다. 다른 특수 지역의 cover 렌더링은 유지한다.
- 전체 스모크 172개 통과. 관련 검사는 PC·모바일 크기의 바닥 경계 정렬과 로드 실패/재시도를 검증한다. 실제 PC·모바일에서 이미지 로드 및 캐릭터 표시, 콘솔 오류 없음 확인.

## 생성 프롬프트

Generate edited UNDERWORLD game battle backdrop. Image1 is underworld thematic reference: black basalt fortress gate, heavy chains, faint lava fissures. Image2 is REQUIRED art style and composition reference: refined crisp pixel art, straight orthographic rectangular 9-column 8-row tiled arena centered within border scenery. Match image2's exact 816:624 landscape aspect and central grid at x192 y144 width432 height384 relative to816x624. Completely replace image1's isometric diamond perspective with image2's top-down straight rectangular arena. Underworld should be dark mysterious but not oppressive: charcoal basalt walls, warm restrained amber-orange lava ONLY in narrow perimeter channels, iron chains at edges, imposing stone gate top center, steps bottom, subtle bronze fittings. Remove torture chairs, rib bones and cages, no flesh or gore. Floor clean muted cool charcoal-gray square stone slabs, quiet texture, low contrast straight seams, readable for characters. Frame most detail around margins. No roots/forest greenery copying from image2. No UI, text, monsters, characters, giant emblems, bright lava on floor. One complete backdrop.
