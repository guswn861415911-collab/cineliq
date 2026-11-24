# CINELIQ 코드 수정 안내

## 시작할 파일

처음에는 `index.html`을 열어 헤더, 전체 메뉴, 첫 화면, 기법 라이브러리, 마이페이지, 상세 모달의 순서부터 확인하세요. 각 영역은 id 또는 class로 연결됩니다. HTML의 id/class/data-* 이름을 바꾸면 JavaScript와 CSS도 함께 확인해야 합니다.

사이트는 HTML·CSS·JavaScript 파일을 직접 읽는 구조입니다. React, 별도 빌드, 새 프레임워크를 추가하지 않았습니다. 파일을 수정한 뒤 로컬 HTTP 서버에서 확인하세요. Python이 설치되어 있다면 이 폴더에서 `python -m http.server 8000`을 실행하고 `http://localhost:8000/`으로 접속할 수 있습니다. 파일을 더블클릭한 file:// 주소에서는 인증과 일부 브라우저 기능을 제대로 검사할 수 없습니다.

## 무엇을 바꾸려는지에 따른 파일

| 수정하려는 내용 | 먼저 볼 파일 |
| --- | --- |
| 헤더·메뉴·첫 화면·마이페이지의 기본 HTML | index.html |
| 기본 레이아웃·카드·화면 너비별 배치 | styles.css |
| 다크·라이트 색상 값 | theme.css의 --ui-* 변수 |
| 테마 저장·시스템 테마 반영 | theme.js |
| 접근성 화면·글자 크기·모션 감소 | accessibility.css, accessibility.js |
| 카테고리·검색·필터·카드·상세 모달 | app.js |
| 기본 기법 이름·설명·태그·이미지/영상 분류 | data.js |
| 별도로 검토된 표시 명칭 | technique-names.js |
| 기존 학습 설명·프롬프트 | learning-data.js |
| 확장 이미지·영상 학습 데이터 | full-learning-data.js |
| 학습 설명의 화면 구성 | learning-ui.js, full-learning-ui.js, learning.css |
| 실무 용어와 제작·편집 가이드 | terminology-data.js, production-data.js, production-ui.js, glossary.js |
| 영상 모델 선택과 준비 상태 | video-models.js |
| 이미지·영상 기법 분류 기준 | content-types.js |
| 여러 이미지의 겹침·전환·스와이프 | image-carousel.js, image-carousel.css |
| 정렬 선택 메뉴·회색 강조 | sort-menu.js, sort-menu.css |
| 로그인·회원 헤더·북마크 UI | member.js |
| 개인 폴더·마이페이지 각 화면 | member-library.js, member-library.css |
| 폴더 선택 저장창·전체 선택 | folder-save.js, bulk-selection.js, usability.css |
| 공개 미디어 업로드·관리자 화면 | media-admin.js |
| Supabase Auth·Storage·회원 데이터 요청 | media-cloud.js |
| 공개 Supabase 프로젝트 연결 값 | media-config.js |
| 회원 탈퇴·계정 충돌 안내 UI | member-deletion.js, member-merge.js |
| 서버의 탈퇴·격리된 계정 통합 시험 | supabase/functions/ |
| 테이블·RLS·RPC 정의 | supabase/*.sql |
| 서비스 안내·약관·문의 | service-info.js, contact.html, terms.html, privacy.html |

CSS는 index.html에서 읽는 순서도 중요합니다. styles.css에 과거 디자인을 보완하는 규칙이 남아 있고 theme.css·접근성 CSS 등이 뒤에서 적용됩니다. 같은 선택자를 발견했다고 바로 지우지 마세요. 이번 작업에서는 중복처럼 보이는 규칙을 무리하게 삭제하지 않았습니다.

## app.js 읽는 순서

1. APP_SETTINGS는 한 번에 표시하는 카드 수와 기존 로컬 미디어 저장소 이름입니다. 저장소 이름을 바꾸면 기존 미디어를 찾지 못할 수 있습니다.
2. techniques는 기법 목록, techniquesById는 ID로 기법을 찾는 표, libraryState는 현재 검색·필터·정렬·열린 모달 상태입니다.
3. matchesTechniqueSearch는 검색어 일치 여부를 확인합니다.
4. matchesLibraryFilters는 카테고리·태그·등록 상태·콘텐츠 유형을 확인합니다. 관리자만 보는 등록 상태 조건을 유지해야 합니다.
5. getFilteredTechniques는 결과를 모아 정렬합니다.
6. renderTechniqueCard와 renderTechniqueMedia가 카드와 미디어 HTML을 만듭니다.
7. selectMainCategory, selectSubcategory, toggleSceneTag, selectContentType은 사용자 선택을 상태에 반영합니다.
8. handleLibraryClick과 handleLibraryShortcuts가 클릭·키보드 입력을 구분합니다.
9. setupLibraryEvents는 이벤트를 연결하고, renderLibrary는 화면을 갱신합니다.

findElement는 화면 요소를 찾고 escapeHtml은 텍스트를 HTML에 안전하게 넣습니다. escapeHtml을 생략하거나 사용자 입력을 그대로 innerHTML에 넣지 마세요.

## 캐러셀 읽는 순서

createCarouselMarkup이 이미지와 버튼 HTML을 만들고 setupCarousel이 동작을 연결합니다. currentImageIndex가 현재 이미지 번호이며 showAdjacentImage가 이전·다음 이미지, 번호, 뒤쪽 미리보기와 애니메이션을 갱신합니다. 가로/세로 이동량을 분리하여 세로 스크롤을 이미지 이동으로 처리하지 않습니다.

## 데이터와 보안 주의사항

- CAM-* ID, Supabase 테이블 이름, data-* 속성, 공개 window.CINELIQ_* API는 기존 연결을 유지합니다.
- Supabase publishable key는 공개 연결 값입니다. service_role 키·Client Secret·비밀번호는 이 저장소에 넣지 마세요.
- 버튼이 숨겨졌다고 권한 검증이 끝나는 것은 아닙니다. Auth 사용자 UUID 확인·RLS·서버 검증을 함께 유지해야 합니다.
- 운영 SQL 실행, 회원 삭제·로그인 수단 해제·계정 강제 병합은 코드 읽기와 다른 작업입니다. 이 리팩터링에서는 실행하지 않았습니다.
- 기본 원본 기법, 학습 문구, 미디어 파일은 보존했습니다. 생성 스크립트를 실행하면 생성 파일을 덮어쓸 수 있으므로 실행 전에 변경 내용을 확인하세요.
- google896cae5064a99afa.html은 위치와 내용을 유지하세요.

## 테스트 실행

한 번 준비할 개발용 도구는 배포 코드와 분리된 work 폴더에 둡니다. 기존 준비가 되어 있으면 다시 설치할 필요가 없습니다.

```powershell
npm install --prefix work/refactor-tools --no-audit --no-fund prettier @babel/parser @babel/generator @babel/traverse postcss parse5
npm install --prefix work/sql-tools --no-audit --no-fund @electric-sql/pglite
npm install --prefix work/a11y-tools --no-audit --no-fund axe-core
node --test tests/*.cjs supabase/tests/*.mjs
node tests/browser/usability.cjs
node tests/browser/menu.cjs
node tests/browser/sort-menu.cjs
node tests/browser/image-carousel.cjs
node tests/browser/refactor-structure.cjs
```

브라우저 검사는 Windows의 Edge 경로를 사용하며 실제 회원 대신 모의 회원 데이터를 씁니다. 실제 iOS·Android, 실제 OAuth 동의·계정 통합이 통과했다는 의미는 아닙니다.

## 저장과 되돌리기

현재 작업은 codex/beginner-refactor 브랜치에 단계별 커밋으로 저장합니다. main으로 합치거나 운영 배포하기 전에 전체 변경을 검토하세요. 작업 기록과 다음 순서는 REFACTOR_PROGRESS.md를 보세요. 각 단계는 Git revert로 되돌릴 수 있습니다. 사이트 코드를 되돌리는 것과 운영 DB를 되돌리는 것은 별개이며, 이번에는 운영 DB를 바꾸지 않았습니다.
