# 실무 용어·AI 제작·편집 학습 확장

> 이 문서는 2026-11-20 대표 6개 시범 적용 기록입니다. 2026-11-21 전체 범위 확장과 현재 집계는 [FULL_LEARNING_AUDIT.md](FULL_LEARNING_AUDIT.md)를 확인하세요. 아래 미작성 408개 표기는 당시 단계의 상태입니다.

## 구조와 이번 적용 범위

기존 사이트는 프레임워크·번들러 없는 HTML/CSS/JavaScript 정적 앱이며 GitHub Pages의 기존 main 배포를 사용합니다. `data.js`와 `learning-data.js`가 기법 및 학습 콘텐츠를, `app.js`와 `learning-ui.js`가 목록·상세 모달·검색·필터·기존 복사를 담당합니다. 공개 미디어와 회원 인증·북마크·개인 폴더는 기존 Supabase 연결을 유지합니다. 이번 작업에는 Supabase 마이그레이션이나 운영 데이터 쓰기가 없습니다.

요청의 대표 기법 검증 순서에 따라 개별 실무 가이드는 다음 6개에 먼저 적용했습니다. 나머지 항목을 자동 문장으로 채우거나 완료 상태로 처리하지 않습니다.

| ID | 대표 기법 | 용어·현장 예문 | AI 이미지·영상 가이드 | 편집 가이드 |
| --- | --- | --- | --- | --- |
| CAM-080 | Over-the-Shoulder | 작성 | 작성 | 작성 |
| CAM-082 | Point-of-View | 작성 | 작성 | 작성 |
| CAM-012 | Close-Up | 작성 | 작성 | 작성 |
| CAM-113 | Dolly In | 작성, 대표 약어 미등록 | 작성 | 작성 |
| CAM-072 | Two-Point Perspective | 작성, 대표 약어 미등록 | 작성 | 작성 |
| CAM-073 | Three-Point Perspective | 작성, 대표 약어 미등록 | 작성 | 작성 |

**미작성:** 위 ID를 제외한 408개 기법의 새 개별 실무 제작·편집 가이드. 기존 414개 기법의 학습 설명·관찰 기준·프롬프트·비교 링크는 그대로 제공합니다. 개별 실무 가이드가 없는 경우 빈 섹션을 표시하지 않습니다. 데이터 구조와 렌더러는 같은 ID로 나머지 기법에도 확장할 수 있습니다.

실무 용어는 37개, AI 오류 점검 항목은 9개이며 검색 가능한 용어집은 총 46개 항목입니다. 검증된 촬영 약어 배지가 연결된 기법은 10개입니다. 2점·3점 투시와 돌리 인에는 약어를 만들지 않고 전체 명칭 사용을 안내합니다. OS는 현장별 검색 별칭으로만 다루고, 대본의 O.S.(Off-Screen)와 별도 결과로 표시합니다. Subjective Shot은 POV와 관련 검색되지만 POV 약어 배지를 임의로 붙이지 않습니다.

프롬프트는 기존 이미지 414개·영상 218개를 보존했습니다. 새 6개 가이드에는 별도의 구체적인 실무 시나리오 이미지·영상 예시가 각각 있습니다. 기존 예시와 합산한 **기법 기준** 준비 수는 이미지 414개·영상 223개입니다. 실무 예시는 접힌 가이드 안에서, 기존 학습 예시는 기존 프롬프트 영역에서 제공합니다. 둘 다 수정용 템플릿과 구분하며 전체 복사는 본문 문자열만 전달합니다.

## 파일과 필드

- `terminology-data.js`: 기존 기법 카테고리와 별도의 `categories`, `sources`, `terms`. 용어의 `id`, `type`, `en`, `ko`, `abbreviation`, `pronunciation`, `aliases`, `meaning`, `note`, `techniqueIds`, `sourceIds`를 관리합니다. 필요할 때 `primaryTechniqueIds`로 약어를 직접 붙일 기법과 관련 기법을 구별합니다.
- `production-data.js`: `profiles`는 기존 CAM ID별 개별 가이드, `issues`는 재사용할 오류 진단, `comparisons`는 실존하는 두 기법의 실무 비교입니다.
- 개별 가이드 필드: `termId`, `pronunciation`, `onSetExample`, `aiProductionExample`, `imageGenerationGuide`, `videoGenerationGuide`, `imagePrompt`, `videoPrompt`, `editingUsage`, `editingSequence`, `editingTips`, `editingExample`, `relatedTerms`, `issueContexts`.
- 오류 필드: `en`, `ko`, `problem`, `situation`, `prompt`, `retry`. 기법별 `issueContexts`가 해당 구도에서 특히 확인할 증상을 연결합니다.
- 비교 필드: 실제 `ids` 두 개와 `common`, `visual`, `purpose`, `image`, `video`, `editing`의 여섯 관점. OTS/Dirty Single, POV/Subjective, CU/ECU, Dolly/Zoom, 2점/3점, High/Bird's-Eye의 6쌍입니다.
- `production-ui.js`: 검색용 정규화·인덱스, 용어·가이드·오류·비교 표시를 재사용합니다. 등록되지 않은 가이드는 빈 문자열을 반환하고 기존 상세 UI는 계속 동작합니다.
- `production.css`: 새 영역의 배지·접기/펼치기·정보 행에만 적용하며 기존 디자인 토큰·폰트·복사 아이콘·버튼을 사용합니다.
- `app.js`, `learning-ui.js`, `index.html`: 기존 검색과 상세 모달에 위 모듈을 연결합니다. 인증·미디어 관리 코드는 변경하지 않습니다.
- `tests/production.test.cjs`: 데이터 연결·빈칸·검색·모호한 약어·미작성 가이드 처리 검사입니다.

## 검색과 탐색

기법 검색은 기존 이름·설명·분류·태그에 용어의 약어·발음·별칭·관련 용어를 더합니다. 대소문자·공백·하이픈·점 차이를 정규화합니다. 알려진 짧은 영문 약어는 토큰 전체로 비교하여 CU 검색에 ECU 또는 Close-Up의 우연한 부분 문자열이 섞이지 않도록 합니다. 알 수 없는 검색어에는 기존 텍스트 검색을 유지합니다. 인덱스는 초기화 때 만들고 키 입력마다 재생성하지 않습니다.

라이브러리의 기존 검색 결과 위에 접힌 ‘실무 용어집’을 둡니다. Codec처럼 연결된 기법이 없는 용어도 읽을 수 있습니다. OS는 OTS의 별칭 안내와 Off-Screen의 대본 용어라는 두 결과를 구분합니다. 용어 결과는 기법 필터와 별도로 표시하며, 기법 결과에는 기존 카테고리·태그·미디어 필터·정렬을 그대로 적용합니다.

상세 가이드의 컷 연결·비교 버튼은 기존 모달의 관련 기법 이동을 재사용하여 미디어·북마크를 새 기법으로 갱신하고 스크롤을 위로 되돌립니다. 외부 용어집에서 상세를 열면 원래 검색 상태를 보존합니다. 기존 모달 닫기·방향키·무한 스크롤은 유지합니다.

## 콘텐츠 기준과 출처

용어·실무 문장은 학습용 설명과 창작 예시이며, 실제 촬영 사실이나 특정 도구에서 성공을 보증하는 지시가 아닙니다. AI 오류는 원인 진단을 확정하는 분류가 아니라 확인할 증상과 재시도 제안입니다. 참조·길이·키프레임·카메라 제어 지원을 모든 모델의 공통 기능으로 안내하지 않습니다.

확인한 공식 자료는 `terminology-data.js`의 `sources`에서 중앙 관리하고 해당 용어에 링크합니다. 주요 자료는 Adobe Premiere 인증 가이드(샷 약어), Adobe OTS·원근법·J/L컷·인코딩·색 관리, BBC 대본 안내(O.S.), CCEA 영상 제작 교육 자료(시선·행동축), Runway의 Gen-4 프롬프트 안내입니다. Runway 문서는 해당 제품의 지침이며 다른 모델에도 같은 기능이 있다는 의미는 아닙니다. 검증된 약어와 지역·현장별 별칭을 구분합니다.

## 검증

로컬 검사: `node --check app.js`, `node --check learning-ui.js`, `node --check production-ui.js`, `node --check production-data.js`, `node --check terminology-data.js`, `node --test tests/learning.test.cjs tests/production.test.cjs`.

격리 Edge 브라우저에서 대표 6개 화면, 이미지·영상 본문 전체 복사, OTS/OS/CU/POV/한국어 발음/J-Cut/제이컷/Codec/Camera Drift 검색, 비교 링크, 1440·820·390·320px 너비를 검사했습니다. 네이티브 details 요소로 키보드·스크린리더의 펼침 상태를 제공하며 복사 버튼은 최소 44px 터치 높이를 유지합니다.

기존 로그인·세션 복원·즐겨찾기·개인 폴더는 모의 인증 데이터로 회귀 검사합니다. 운영 사용자 데이터를 쓰거나 OAuth를 실제 계정으로 재인증하지 않습니다. iPhone/iPad Safari와 Android Chrome 실기기 검증, AI 서비스의 실제 생성 결과 검증은 별도로 필요합니다.
