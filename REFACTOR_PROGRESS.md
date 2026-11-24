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
