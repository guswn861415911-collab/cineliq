# CINELIQ 리팩터링 진행 기록

## 기준과 작업 경계
- 기준 운영 커밋: c850913. 현재 상태 보존 커밋: 9c2f9c7.
- 작업 브랜치: codex/beginner-refactor. 운영 main과 Supabase는 변경하지 않습니다.
- 이 폴더의 main은 이전 버전0034666에 남아 있습니다. 최신 운영 origin/main에서 작업 브랜치를 만들었으므로 과거 main을 배포하지 마세요.
- 코덱스 실제 남은 사용량·초기화 시간은 확인하지 못했습니다. 추정하지 않습니다.

## 우선순위
1. 여러 문장이 한 줄에 압축된 HTML/CSS/JS를 들여쓰기·줄바꿈으로 정리하고 파서로 주석만 제거. 문자열·정규식·URL·SQL 본문 보존 검증.
2. 검색·필터·카드 이벤트가 모인 app.js를 기능별 함수로 정리.
3. 이미지 캐러셀·정렬 메뉴·설정 등 작은 UI 모듈의 짧은 이름과 중첩 조건 정리.
4. 인증·회원·관리자·계정 통합은 포맷 외 보안 검증을 유지하고 별도 검토 후 논리 리팩터링.

## 기준 테스트
변경 전 단위/인증 모의/콘텐츠/로컬 PGlite SQL 테스트16개 통과. 운영 DB·회원 계정에 쓰지 않았습니다.

## 진행 중
포맷·주석 제거 도구는 배포 코드에 포함되지 않는 work/refactor-tools에 설치했습니다. 사이트는 기존 정적 HTML/CSS/JS 구조를 유지합니다.

## 미검증/주의
실제 Google·Kakao OAuth, 운영 회원 쓰기, 실제 계정 통합·탈퇴 테스트 금지. 실제 iOS/Android·스크린 리더 수동 테스트는 별도입니다. 테스트 전 운영 배포하지 않습니다.

## 1단계 완료: HTML/CSS
HTML4개와 CSS14개를 읽기 좋은 들여쓰기·줄바꿈으로 정리하고 주석만 제거했습니다. 인증용 google896cae5064a99afa.html은 수정하지 않았습니다. 원래 메뉴 주석의 브랜드 문구는 BRAND_COPY.md로 옮겼습니다. 파일별 주석 제거/줄 수는 reports/refactor-format.json에 기록합니다.

## 2단계 완료: 실행 코드 포맷
대용량3개 데이터 파일을 제외한 JavaScript와 서버 TypeScript를 들여쓰기·줄바꿈으로 정리하고 파서에서 식별한 주석을 제거했습니다. 각 파일의 변경 전후 실행 구문 트리를 비교했습니다(동일한 &&/||의 괄호 결합만 정규화). 보안 검증·OAuth·RLS 호출의 로직 변경은 하지 않았습니다. 단위/인증 모의/로컬SQL16개와 캐러셀 브라우저 검사 통과. 사용자 UI 검사는 초기화 시점의 관리자 노출 검사에서1회 실패했으나 재실행에서 전 항목 통과했습니다. 후속 검증에서도 확인합니다.

대용량 포맷을 한 프로세스에서 처리하다 Array buffer allocation failed가 발생해 파일별 독립 프로세스로 전환했습니다. 코덱스 사용 한도 문제로 판단하지 않습니다. 대용량 콘텐츠는 별도 처리 예정입니다.

## 3단계 완료: 라이브러리 이벤트 정리
app.js의 이벤트 등록과 실제 처리 함수를 분리했습니다. selectMainCategory/selectSubcategory/toggleSceneTag/selectContentType/selectRegistrationStatus/openTechniqueFromCard로 역할을 표시하고 refreshFilteredCards로 반복한 화면 갱신만 공유합니다. findElement/escapeHtml/techniques/libraryState 등 이름을 명확히 하고 기존 API의 state/items/escape 키는 보존했습니다. 사용자 UI·메뉴·캐러셀 검사 통과. 메뉴 테스트는 회원 세션 준비를 기다린 후 검사하도록 타이밍 의존성을 보완했습니다. 인증/관리자 권한 분기 및 미디어 데이터 구조는 변경하지 않았습니다.

## 4단계 완료: 이미지 캐러셀
image-carousel.js의 이어 붙인 HTML 문자열을 들여쓰기된 템플릿으로 바꾸고 createCarouselMarkup/setupCarousel/showAdjacentImage/setupImageCarousels로 역할을 구분했습니다. currentImageIndex/pageCounter/previewCard/touchStartPosition 등 이름으로 이미지 전환과 스와이프 계산을 읽을 수 있습니다. 공개 markup/bind API는 그대로입니다. PC1440·태블릿768·모바일390px에서1·2·3장, 영상 혼합·순환·키보드·모의 스와이프·모션 감소·높이/스크롤 유지 검사 통과.

## 5단계 완료: 데이터·서버·테스트 소스의 주석 제거
모든 추적 소스 확장자(JS/CJS/MJS/TS/HTML/CSS/SQL/TOML/SVG)를 검사하여 문법상 주석0개를 확인했습니다. 문자열·정규식·URL·SQL 문자열은 보존하며, SQL 달러 인용 함수 본문도 주석만 제거했습니다. SQL 파일은 로컬에서만 변경했으며 운영 마이그레이션을 실행하지 않았습니다. 데이터 생성기도 주석을 다시 출력하지 않도록 수정했습니다.

큰 데이터 파일은 기존 들여쓰기를 유지하고 파서가 식별한 주석만 제거했습니다. 기본 기법414개와 모든 학습 데이터·공개 Supabase 설정의 값이 c850913과 완전히 같은지 VM 비교로 검증했습니다. 이미지·영상 assets와 Google 소유권 파일은 보존했습니다. 콘텐츠 감사 도구는 포맷 차이 대신 데이터 값을 비교하도록 보완했습니다.

단위·모의 Auth·로컬 탈퇴/통합 서버·로컬 SQL/RLS·데이터 보존·주석 검사26개 통과. 계정 통합은 데이터 복사 테스트 수준이며 실제 운영 OAuth/계정 통합이 검증됐다는 의미가 아닙니다.

## 6단계 완료: 검색 조건 분리 및 구조 보존
검색어 판정(matchesTechniqueSearch), 카테고리·태그·권한별 등록 상태 판정(matchesLibraryFilters), 결과 정렬(getFilteredTechniques)을 분리했습니다. 영상137·이미지277 구분, 검색·폴더·정렬 브라우저 검사 통과.

브라우저의 CSSOM과 HTML DOM을 c850913과 비교한 구조 검사도 통과했습니다. 줄바꿈·쉼표 공백·동일한 소수 표기·색상 대소문자 및 HTML 공백/주석만 정규화합니다. 디자인 규칙의 순서와 문서 요소·속성·내용을 비교했으며 픽셀 단위 스크린샷 동일성 검사는 아닙니다.

CODE_GUIDE.md에 수정 목적별 파일 위치, app.js와 캐러셀을 읽는 순서, 보안 주의사항, 로컬 실행·검사·되돌리기 방법을 정리했습니다. README의 오래된 기법 수/배포 주소도 현재 상태로 정정했습니다.

## 최종 검증 결과
- 자동 단위/콘텐츠/모의 인증·서버/로컬 SQL·RLS 테스트:26개 통과.
- 실제 Edge 브라우저 자동화: 검색·필터·북마크/폴더 UI·메뉴·설정·정렬·캐러셀·구조 보존·키보드 회귀 검사 통과.
- 접근성28개 화면/테마 조합: 확정 위반0건. 그라데이션·겹침·스크롤 가림에 따른 판정 보류는 reports/refactor-accessibility.json에 남겼습니다. 완전한 WCAG 준수나 수동 검사 완료를 의미하지 않습니다.
- 기존 접근성 검사에 남아 있던 분리 폴더 버튼의 포커스 기대값은 현재 북마크 통합 버튼에 맞게 정정했습니다. 실제 포커스는 올바르게 돌아오고 있었습니다.
- Google 소유권 HTML·미디어 assets·전체 데이터 값 보존 검사 통과.
- 실제 브라우저 검사는 자동화이며, 사람이 키보드로 전 과정을 수행한 수동 검사와 구분합니다. 실제 iOS/Android·스크린 리더·외부 OAuth 동의·운영 회원 쓰기 검사는 하지 않았습니다.

## 완료 파일의 수준
| 파일/영역 | 완료 내용 |
| --- | --- |
| index.html·contact.html·terms.html·privacy.html | 요소별 줄바꿈·들여쓰기, 주석 제거. HTML 구조·내용 보존 |
| CSS14개 | 선언·선택자별 줄바꿈, 주석 제거, 브라우저 해석 규칙 보존 |
| app.js | 주요 변수명 개선, 클릭/키보드/카테고리/필터 이벤트 분리, 검색·필터·정렬 판정 분리 |
| image-carousel.js | 읽을 수 있는 HTML 템플릿, 명확한 상태·함수 이름, 스와이프 조건 정리 |
| member.js·member-library.js·media-cloud.js·media-admin.js·member-deletion.js·member-merge.js | 포맷·주석 제거만. 인증·권한·세션 검증의 실행 로직 보존 |
| theme.js·accessibility.js·sort-menu.js·folder-save.js·bulk-selection.js·나머지 학습 UI/분류 모듈 | 포맷·주석 제거. 논리와 공개 API 보존 |
| data.js·learning-data.js·full-learning-data.js | 큰 데이터의 기존 들여쓰기 유지, 필요한 주석만 제거, 값 완전 일치 검증 |
| production-data.js·terminology-data.js | 포맷·주석 제거, 값 완전 일치 검증 |
| supabase/functions의 TS2개·SQL·TOML | 주석 제거, TS는 구문 보존 포맷. 서버 테스트·로컬 SQL 검사 통과. 운영 적용 안 함 |
| scripts/·tests/ | 포맷·주석 제거, 데이터 감사 도구 및 소스/구조 보존 검사 추가 |
| CODE_GUIDE.md·README.md | 파일 찾기·수정·검사·보안·복구 안내 |

## 아직 하지 않은 리팩터링과 다음 순서
1. sort-menu.js, theme.js, accessibility.js, folder-save.js의 짧은 변수명을 기능별로 검토하고 각각 테스트 후 커밋.
2. learning-ui.js/full-learning-ui.js/production-ui.js의 긴 HTML 템플릿을 읽기 쉽게 정리. 모든 학습 문구 값은 그대로 비교할 것.
3. member-library.js의 폴더/회원 화면 처리를 단계별로 정리. 회원 UUID·요청 버전 검사와 실패 처리를 보존할 것.
4. member.js/media-cloud.js/media-admin.js의 논리 변경은 보안 테스트를 보강한 뒤 별도 검토. 포맷이 끝났다는 이유로 초보자 수준의 논리 단순화까지 끝났다고 보지 말 것.
5. styles.css의 과거 덮어쓰기·중복 규칙을 화면별 렌더링 비교와 함께 정리. !important와 반응형 규칙을 일괄 삭제하지 말 것.
6. 실제 테스트용 OAuth 계정 및 실제 모바일·스크린 리더 검증. 운영 사용자 삭제·통합 테스트는 하지 말 것.

## 저장·배포 상태
이번 차수는 별도 작업 브랜치 codex/beginner-refactor에 보존합니다. main 병합 및 운영 사이트 배포는 하지 않았습니다. 대규모 소스 변경의 검토와 남은 논리 정리를 이어갈 수 있도록 운영 버전 c850913을 유지합니다. 운영 Supabase·OAuth 콘솔·별도 merge-test 저장소/프로젝트는 변경하지 않았습니다.

## 되돌리기 기준
9c2f9c7은 변경 전 체크포인트입니다. 077c361(HTML/CSS), f37d19f(실행 코드 포맷), 9f28d15(라이브러리 이벤트), 2019098(캐러셀), c978d94(남은 주석/데이터 검사), 706c786(검색/안내) 등 기능별 커밋으로 나누었습니다. 필요한 단계만 revert하며 데이터·서버 설정을 되돌리는 작업과 혼동하지 마세요.
