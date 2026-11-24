# CINELIQ · Camera Atlas

CINELIQ는 카메라 구도, 컷, 무빙을 학습하는 반응형 웹사이트입니다. 촬영 기법 414개의 한글·영문 명칭, 설명, 태그와 AI 생성 프롬프트 예시를 제공합니다.

- 카테고리, 세부 분야, 장면 유형과 미디어 상태로 검색·필터링
- 기법 상세 화면에서 이미지·영상 예시와 AI 프롬프트 확인 및 복사
- 인증된 관리자 계정으로 공개 미디어 등록, 교체, 정렬, 대표 지정 및 삭제

- [GitHub 저장소](https://github.com/guswn861415911-collab/cineliq)
- [GitHub Pages 사이트](https://cineliq.art/)

처음 코드를 수정한다면 [코드 수정 안내](CODE_GUIDE.md)와 [리팩터링 진행 기록](REFACTOR_PROGRESS.md)을 먼저 확인하세요.

## 프로젝트 구조

| 파일 | 역할 |
| --- | --- |
| `index.html` | 페이지 구조와 진입점 |
| `styles.css` | 무채색 디자인 토큰과 반응형 레이아웃 |
| `app.js` | 검색, 필터, 상세 화면, 복사, 미디어 관리 |
| `media-config.js`, `media-cloud.js`, `media-admin.js` | 온라인 연결 설정, Storage·Auth 연동, 관리자 UI |
| `supabase/001_media.sql` | 테이블, Storage 버킷, RLS 정책과 관리자 RPC |
| `data.js` | 기법 414개의 명칭, 설명, 분류와 태그 |
| `.nojekyll` | 정적 파일을 그대로 GitHub Pages에 게시 |
| `.gitignore` | 로컬 환경 파일, 임시 파일과 테스트 산출물 제외 |

HTML, CSS, JavaScript로 구성되어 별도 패키지 설치나 빌드가 필요 없습니다. 온라인 미디어를 설정하면 브라우저가 CDN에서 Supabase JS와 tus-js-client를 불러옵니다. 웹폰트는 Google Fonts에서 로드하며, 연결할 수 없을 때는 시스템 글꼴을 사용합니다.

## 로컬 실행

`index.html`을 브라우저에서 열거나, 프로젝트 폴더에서 아래 명령을 실행한 후 [localhost:8000](http://localhost:8000/)을 엽니다.

```sh
python -m http.server 8000
```

## 수정 및 재배포

GitHub 저장소의 **Settings → Pages**에서 **Deploy from a branch**의 소스를 **main / (root)**로 사용합니다. `main`에 변경 사항을 푸시하면 GitHub Pages가 다시 배포합니다.

1. Codex에서 이 Git 폴더를 열어 파일을 수정합니다.
2. 로컬에서 동작을 확인하고 `git status`와 `git diff`로 변경 파일을 검토합니다.
3. 수정한 파일만 스테이징해 커밋하고 `git push origin main`을 실행합니다.
4. 저장소의 **Actions**에서 Pages 배포 결과를 확인하고 배포 주소를 열어 확인합니다.

## Supabase 설정

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 기존 CINELIQ 프로젝트를 선택하거나 새 프로젝트를 만듭니다. 요금제, 지역, 데이터 보관 정책을 확인합니다.
2. 대상 프로젝트의 SQL Editor에서 [`supabase/001_media.sql`](supabase/001_media.sql)을 검토한 뒤 한 번 실행합니다. 운영 DB라면 적용 전에 백업과 실행 승인을 확인합니다. SQL은 기존 테이블이나 Storage 객체를 삭제하지 않으며, 같은 이름의 테이블이나 버킷이 있으면 트랜잭션이 중단됩니다.
3. Authentication에서 Email/Password 로그인을 활성화합니다. 공개 회원가입이 필요 없으면 비활성화하고, **Users**에서 관리자 계정을 만든 뒤 이메일을 확인합니다.
4. 관리자 계정의 Auth 사용자 UUID를 가져와 SQL Editor에서 아래 구문을 실행합니다.

   ```sql
   insert into public.cineliq_admins (user_id)
   values ('ADMIN_AUTH_USER_UUID'::uuid);
   ```

5. 프로젝트의 **Connect** 또는 **Settings → API Keys**에서 Project URL과 `sb_publishable_…` 키를 복사해 `media-config.js`에 입력합니다. 이 두 값은 공개용입니다. 서비스 역할 키, 데이터베이스 비밀번호, 로그인 비밀번호, 인증 토큰은 저장소에 저장하지 않습니다.
6. 로컬 HTTP 서버에서 연결과 권한을 검증한 뒤 변경 파일을 `main`에 푸시합니다. GitHub Pages 주소와 발행 방식은 그대로 사용합니다. CDN에서 사용하는 라이브러리 버전은 `media-cloud.js`에서 관리합니다.

연결값이 비어 있으면 온라인 미디어와 관리자 로그인은 준비되지 않은 상태입니다. 기존 IndexedDB 파일은 해당 주소에서 계속 읽을 수 있습니다. 연결 후 공개 화면은 Supabase에 등록된 미디어를 조회합니다.

### 데이터베이스와 Storage

- `cineliq_media`는 미디어 UUID, 기존 `CAM-…` 기법 ID, 유형, 원본 및 썸네일 경로, 표시 순서, 대표 여부, 원본 파일명, 크기, MIME, 생성·수정 시각을 저장합니다. 이전 파일의 콘텐츠 해시는 같은 기법에 같은 원본을 다시 등록하지 않도록 사용합니다. 기법의 설명과 프롬프트는 `data.js`에 그대로 있습니다.
- `cineliq_admins`는 Auth 사용자 UUID로 권한을 지정하고, `cineliq_settings`는 서버 쓰기 허용 여부를 관리합니다.
- 비공개 `cineliq-media` 버킷에서 `CAM-001/<UUID>.<ext>` 형태로 원본을 저장합니다. 이미지 썸네일이 필요한 경우 같은 UUID에 `.thumb.jpg`를 붙여 저장합니다. 원본은 변경하지 않습니다.
- 일반 방문자는 카탈로그에 게시된 파일의 단기 서명 URL을 받아 읽을 수 있습니다. 저장소 RLS는 미게시 파일 조회를 차단합니다. 원본 파일명은 관리자 RPC에만 노출됩니다. Auth와 관리자 목록으로 인가된 사용자만 파일 업로드와 메타데이터 변경을 할 수 있습니다. 데이터베이스 RPC는 같은 기법의 변경을 직렬화하고 참조 중인 파일이 Storage에서 삭제되지 않도록 정책을 적용합니다.
- 업로드 도중 연결이 끊기면 같은 페이지에서 TUS 청크를 재시도합니다. 새로고침하면 업로드를 다시 시작합니다. 교체는 새 경로에 올린 뒤 DB의 연결을 바꾸고 이전 원본을 삭제합니다. 네트워크 단절로 참조되지 않는 파일이 남으면 해당 경로가 `object_path`, `thumbnail_path` 양쪽에서 참조되지 않는지 확인하고 Storage Dashboard에서 삭제합니다. 진행 중인 업로드 경로는 정리하지 않습니다.

### 관리자 작업

**관리자 로그인**에서 Auth 계정으로 로그인한 뒤 기법 상세에서 파일을 선택하거나 드롭합니다. 미리보기를 확인하고 등록을 누르면 진행률이 표시됩니다. 등록 후 교체, 순서 변경, 대표 지정과 삭제를 할 수 있습니다. 카드는 대표 미디어를 표시하고 상세 화면은 대표 미디어 다음에 나머지를 표시합니다. 이미지 원본 비율을 유지하며 영상의 재생·일시정지·전체 화면은 브라우저 기본 컨트롤을 사용합니다.

이미지는 JPG/PNG/WebP 최대 8MiB, 영상은 MP4/WebM 최대 40MiB입니다. 브라우저 호환성이 높은 MP4(H.264 영상, AAC 오디오)를 권장합니다. 브라우저는 업로드 전에 크기와 파일 시그니처를 검사하고, Storage는 허용 MIME과 버킷 용량을 제한합니다. Supabase에 별도의 악성코드 검사나 영상 변환 서비스를 설정하지 않는 한 이를 제공하지 않습니다.

새로고침하면 다른 기기에서도 최신 공개 목록을 받습니다. 사이트 HTML이나 JavaScript를 수정한 경우에만 GitHub에 다시 푸시합니다.

### 기존 IndexedDB에서 이전

기존 파일이 있는 **같은 브라우저 프로필과 같은 출처**에서 관리자 로그인 후 **미디어 관리 → 이 브라우저의 기존 미디어**를 엽니다. 이전할 항목을 선택하고 공개 등록을 확인합니다. 결과는 파일마다 표시되며 실패한 항목은 다시 선택해 재시도할 수 있습니다. 동일 기법에서 다시 시도하면 콘텐츠 해시로 이전 중복을 방지하며, 로컬 원본은 그대로 유지됩니다.

GitHub Pages, localhost의 각 포트, `file://`로 연 페이지의 저장소는 브라우저가 서로 다르게 취급합니다. 원본이 localhost에 있다면 같은 URL과 포트에서 새 코드를 실행합니다. `file://`에서만 보이던 파일은 원래 주소에서 관리자 화면의 **원본 다운로드** 또는 연결값이 비어 있을 때 기법 상세의 **로컬 원본 다운로드**로 보관한 다음 GitHub Pages의 해당 기법 ID에 다시 올릴 수 있습니다. 새 형식에 포함되지 않는 GIF, MOV 또는 제한을 초과하는 파일은 원본을 다운로드한 뒤 지원 형식과 크기로 변환하여 등록합니다.

### 업로드 중지 및 사용량

`media-config.js`의 `showAdmin: false`로 로그인과 편집 UI를 숨길 수 있습니다. Supabase에서도 쓰기를 막으려면 SQL Editor에서 아래 명령을 실행합니다. 기존 공개 미디어 조회와 재생은 계속 작동합니다.

```sql
update public.cineliq_settings set writes_enabled = false where singleton;
```

이 설정을 다시 `true`로 바꾸면 권한이 있는 관리자가 쓰기를 재개할 수 있습니다. 개별 관리자 권한은 `cineliq_admins`에서 해당 UUID를 제거하여 철회합니다.

Supabase 무료 요금제의 파일 저장 공간은 현재 1GB입니다. 프로젝트 Dashboard의 **Usage**에서 Storage와 Egress를 확인하고, 운영 전에 최신 한도를 확인합니다. [Supabase 요금제](https://supabase.com/pricing) · [재개 가능한 업로드](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)

## 서비스 안내 메뉴와 공통 푸터

`service-info.js`가 서비스 링크와 저작권 문구를 한 곳에서 관리하며, `service-info.css`는 메뉴 안내 영역과 반응형 푸터에만 적용됩니다. 앱의 PC·모바일 햄버거 메뉴에서 로그인 없이 이용약관(`terms.html`), 개인정보처리방침(`privacy.html`), 문의하기(`contact.html`)로 이동할 수 있습니다.

공통 푸터는 마이페이지와 모든 하위 화면, 이용약관, 개인정보처리방침, 문의하기에 표시됩니다. 기법 탐색 화면은 기존 무한 스크롤을 유지하기 위해 푸터를 생략합니다. 모바일 첫 히어로 화면도 기존 영상·CTA 구성을 유지하며 안내 링크는 메뉴에서 제공합니다. 푸터는 고정되지 않습니다.

공개 문의처는 운영자가 지정한 `guswn8614@naver.com`입니다. `contact.html`의 메일 링크로 연결하며 개인정보처리방침에도 같은 창구를 안내합니다. 다른 개인 계정 정보를 임의로 공개하지 않습니다. 기존 약관·개인정보처리방침의 운영자 확인 항목과 시행일은 실제 운영 정책에 따라 별도로 확정해야 합니다.

## 회원 탈퇴

Google·Kakao 로그인/연결의 운영 설정 조사, 본인 identities 기반 UUID 검증, 오류 구분, 외부 콘솔 점검과 실제 OAuth 미검증 항목은 [IDENTITY_AUTH_AUDIT.md](IDENTITY_AUTH_AUDIT.md)를 확인하세요. 다른 사용자에게 귀속된 identity를 자동 병합하거나 데이터를 이전하지 않습니다.

회원 탈퇴의 서버 처리, 최근 로그인 검증, 삭제 대상, 운영 승인·배포 절차와 테스트 한계는 [ACCOUNT_DELETION.md](ACCOUNT_DELETION.md)에 정리했습니다. 실제 회원 삭제 테스트는 별도 승인 없이 실행하지 않습니다.

## 기법 데이터

기법은 기존 자료집에서 추출했습니다. 일부 용어에 유사 표현이 있고 활용 태그는 자동 분류한 초안입니다. 프롬프트는 기법별 기본 템플릿이며 장면과 사용 모델에 맞게 조정할 수 있습니다.

414개 기법의 입문자용 카드 요약·상세 설명과 모달 이전·다음 탐색의 편집 기준, 동작 및 검증 범위는 [TECHNIQUE_LEARNING_UPDATE.md](TECHNIQUE_LEARNING_UPDATE.md)를 참고하세요. 설명은 `data.js`의 `summary`와 `description`에서 관리하며 기존 ID와 미디어 연결은 유지합니다.

추가된 7개 학습 섹션, 완성형 이미지·영상 프롬프트, 관련 기법 비교 카드와 대표 이미지 검토 기록은 [LEARNING_CONTENT.md](LEARNING_CONTENT.md)를 참고하세요. 보충 콘텐츠는 `learning-data.js`에서 기존 기법 ID별로 관리합니다. 기존 설명과 수정용 프롬프트 템플릿도 유지합니다.

실무 약어·발음 검색과 대표 6개 기법의 초기 확장은 [PRACTICAL_LEARNING.md](PRACTICAL_LEARNING.md)에 기록했습니다. 이후 전체 414개 ID의 이미지 학습·399개 영상 가이드·15개 영상 생략 사유·176개 영상 프롬프트 누락 보완과 검증 범위는 [FULL_LEARNING_AUDIT.md](FULL_LEARNING_AUDIT.md)를 확인하세요. 전체 목록은 `content/technique-inventory.csv`, 개별 작성·검증 원장은 `content/learning-status.json`에서 관리합니다.
