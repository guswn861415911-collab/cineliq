# CINELIQ · Camera Atlas

CINELIQ는 카메라 구도, 컷, 무빙을 학습하는 반응형 웹사이트입니다. 촬영 기법 314개의 한글·영문 명칭, 설명, 태그와 AI 생성 프롬프트 예시를 제공합니다.

- 카테고리, 세부 분야, 장면 유형과 미디어 상태로 검색·필터링
- 기법 상세 화면에서 이미지·영상 예시와 AI 프롬프트 확인 및 복사
- 관리 모드에서 기법별 미디어 등록, 교체, 삭제

- [GitHub 저장소](https://github.com/guswn861415911-collab/cineliq)
- [GitHub Pages 사이트](https://guswn861415911-collab.github.io/cineliq/)

## 프로젝트 구조

| 파일 | 역할 |
| --- | --- |
| `index.html` | 페이지 구조와 진입점 |
| `styles.css` | 무채색 디자인 토큰과 반응형 레이아웃 |
| `app.js` | 검색, 필터, 상세 화면, 복사, 미디어 관리 |
| `data.js` | 기법 314개의 명칭, 설명, 분류와 태그 |
| `.nojekyll` | 정적 파일을 그대로 GitHub Pages에 게시 |
| `.gitignore` | 로컬 환경 파일, 임시 파일과 테스트 산출물 제외 |

HTML, CSS, JavaScript로 구성되어 별도 패키지 설치나 빌드가 필요 없습니다. 웹폰트는 Google Fonts에서 로드하며, 연결할 수 없을 때는 시스템 글꼴을 사용합니다.

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

## 이미지·영상 저장

관리 모드를 켜고 카드를 선택한 뒤 파일을 등록합니다. 구도와 컷은 PNG, JPEG, WebP, GIF 이미지를, 무빙은 MP4, WebM, MOV 영상을 받습니다. 최대 150MB이며 실제 한도는 브라우저 저장 용량에 따라 달라집니다.

업로드 파일은 현재 브라우저의 **IndexedDB**에 사이트 주소의 출처(프로토콜, 호스트, 포트)별로 저장됩니다. 같은 출처에서 새로고침해도 남지만, localhost에 등록했던 파일은 GitHub Pages 주소로 옮겨지지 않습니다. 기기나 브라우저 프로필 사이에도 공유되지 않으며, 사이트 데이터를 지우면 파일이 사라질 수 있습니다.

GitHub Pages는 정적 호스팅입니다. 업로드한 파일은 GitHub 저장소나 GitHub Pages 서버에 자동 저장되지 않습니다. 여러 사용자가 미디어를 공유하려면 별도 백엔드, 인증, 파일 저장소가 필요합니다.

공개 화면에서 업로드 UI를 숨기려면 `app.js`의 `CONFIG.ENABLE_ADMIN`을 `false`로 설정합니다. 이 옵션은 화면을 숨기는 용도이며 관리자 인증 기능은 제공하지 않습니다.

## 데이터

기법은 기존 자료집에서 추출했습니다. 일부 용어에 유사 표현이 있고 활용 태그는 자동 분류한 초안입니다. 프롬프트는 기법별 기본 템플릿이며 장면과 사용 모델에 맞게 조정할 수 있습니다.
