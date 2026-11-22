# 계정 통합 격리 테스트 준비

## 2026-11-22 테스트 프로젝트 구성 기록

- 사용자 생성 완료 확인: `cineliq-account-merge-test`, ref `bxnhnhqymjimytzxylxa`, Tokyo/Nano. 운영 ref와 다름을 콘솔에서 확인.
- 테스트 SQL Editor에서 개인 라이브러리 bootstrap(빈 관리자 테이블 + 002/003/004)과 005를 적용했다. 공통 미디어용 001 전체는 적용하지 않았다. 재현용 `supabase/test_personal_library_bootstrap.sql`을 추가했다. 이미 적용한 프로젝트에 재실행하지 않는다.
- favorites/folders/folder_items/admins/merge_backups 5개 테이블의 RLS=true, anon SELECT=false를 조회로 확인. admins/merge_backups는 authenticated SELECT=false. 테스트 회원 수=0.
- Allow manual linking을 켜고 `Successfully updated settings`를 확인했다. Confirm email은 ON, anonymous sign-in은 OFF 유지. Google/Kakao는 아직 DISABLED.
- 테스트 프로젝트에 `account-merge-test` Edge Function 배포. 환경 허용값과 테스트 origin은 아직 미설정. 대시보드 기본 legacy JWT 검증도 아직 ON이며 코드 내부 Auth 검증과 맞춰 조정하기 전에는 실제 통합에 사용하지 않는다.
- 무인증 POST는 401 `UNAUTHORIZED_NO_AUTH_HEADER`로 차단됨. 이는 게이트웨이 차단 확인이며 함수 내부 검증·데이터 이전의 실제 성공 증거는 아니다.
- 운영 DB/계정/Storage 및 운영 OAuth 설정은 변경하지 않았다. 테스트 데이터 이전·계정 삭제·identity 해제도 실행하지 않았다.
- 테스트 사이트 생성 승인, Google 운영자 계정 전환, Kakao 로그인·테스트 앱 설정이 남아 있다. 실제 OAuth 통합과 복구 UI/전체 검증은 미완성.

## 이번 단계의 구현 상태

실제 계정 통합 완료 아님. 구현한 것은 테스트 전용 서버 데이터 요약·복사 단계다. 운영 로그인 UI와 연결 로직은 변경하지 않았다. OAuth 재인증 화면, 대표 계정 선택 화면, 대체 로그인 등록 화면, identity 해제·재연결·실패 재개 UI는 아직 미구현이다. 실제 OAuth 통합 테스트를 시작할 수 있는 완성된 도구로 사용하지 않는다.

`supabase/005_account_merge_test.sql`과 `supabase/functions/account-merge-test/index.ts`는 위 테스트 프로젝트에만 적용했다. 운영 DB 적용 및 운영 Edge Function 배포는 실행하지 않았다.

## 사용자 준비 항목

1. 별도 Supabase 테스트 프로젝트를 생성한다. Project URL과 publishable key만 공유한다. 운영 프로젝트의 키나 설정을 교체하지 않는다.
2. 테스트 프로젝트 Authentication → Sign In / Providers에서 Google, Kakao, Email을 설정한다. UI 버전에 따라 Manual Identity Linking은 Authentication 설정의 User Signups/계정 연결 옵션에 있다. `Enable Manual Linking`을 켠다. 실제 화면에서 항목을 찾지 못하면 설정을 바꾸지 말고 위치를 확인한다.
3. Google Cloud의 테스트 OAuth 클라이언트 Authorized redirect URIs에 `https://<테스트-ref>.supabase.co/auth/v1/callback`을 추가한다. 앱이 Testing이면 사용할 테스트 Google 사용자를 등록한다.
4. Kakao Developers의 테스트 앱에서 카카오 로그인 활성화, 위 테스트 callback Redirect URI, profile_image/profile_nickname 동의항목을 설정한다. 테스트용 REST API Key·Client Secret은 Supabase Kakao Provider에만 입력한다. Allow users without an email을 유지하고 account_email 권한을 임의로 요청하지 않는다.
5. 테스트용 HTTPS 사이트 주소를 정한 뒤 Authentication → URL Configuration의 Site URL과 Redirect URLs에 정확한 테스트 주소를 등록한다. 운영 CINELIQ 세션과 섞이지 않는 별도 origin을 사용한다.
6. 별도의 Google·Kakao 테스트 계정을 준비한다. 각 계정은 사용자가 브라우저에서 직접 인증한다. 비밀번호·OAuth 코드·토큰은 채팅에 보내지 않는다.

## 적용 전 별도 확인

격리 테스트 프로젝트가 확인된 뒤 001-005 마이그레이션과 테스트 Edge Function 배포 대상을 명시하여 확인한다. 현재 작업에서는 적용하지 않았다. Email 확인과 Secure Email Change를 해제하지 않는다. SMTP와 확인 메일 링크가 테스트 주소로 복귀하는지 검증한다.

테스트 Edge Function 환경변수:

- `CINELIQ_MERGE_TEST_PROJECT_URL`: 정확한 테스트 Supabase URL. 누락/불일치/기존 운영 ref이면 요청 거부.
- `CINELIQ_MERGE_TEST_ORIGIN`: 별도 HTTPS 테스트 사이트의 origin. 경로/후행 슬래시 없이 설정.
- 서버 기본 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: Edge 런타임에만 존재. 프런트엔드·Git·문서에 값을 기록하지 않는다.

위 차단은 보조 장치이며 임의의 다른 운영 프로젝트에 배포해도 안전하다는 뜻이 아니다. 반드시 별도 테스트 프로젝트만 사용한다.

## 서버 프로토콜과 데이터 정책

두 계정을 A/B로 인증하고 대표를 고르면 target/source로 고정한다. 클라이언트가 보낸 UUID는 사용하지 않는다. 서버가 두 토큰을 `getUser()`로 검증한 뒤 UUID를 결정한다. 토큰은 HTTPS 요청의 Authorization/JSON으로만 전달하며 서버에 저장·출력하지 않는다. 최근 5분의 OAuth AMR, 살아 있는 최근 세션, provider 소유 관계를 확인한다. 관리자·Storage 소유 계정은 차단한다.

- `summary`: source/target의 즐겨찾기·폴더·연결 수와 원본 스냅샷을 반환한다. 요약은 두 계정 인증 후에만 가능하다.
- `copy`: 요약 스냅샷, 임의 request UUID, `CINELIQ 테스트 데이터 복사` 명시적 확인 및 source의 별도 최근 password 인증 토큰을 요구한다. 확인된 이메일 identity와 같은 source UUID를 검증한다. OAuth 계정의 이메일 문자열만으로는 통과하지 않는다.
- 스냅샷이 달라지면 새 요약을 요구한다. SQL 트랜잭션이 끝나기 전 오류는 모두 롤백한다. 요청 ID는 멱등적이고 같은 계정 쌍의 중복 복사를 차단한다.
- 즐겨찾기 합집합. 같은 이름 폴더는 ` (통합 N)` 접미사와 새 UUID를 사용한다. 기존 폴더에 덮어쓰지 않고 폴더 항목을 새 매핑으로 복사한다.
- 원본 즐겨찾기·폴더·항목과 두 auth 계정은 유지한다. 대표 프로필/설정 유지. 역할과 관리자 권한 이전 없음.
- 서비스 전용 RLS 테이블에 양쪽 복사 전 스냅샷과 폴더 매핑을 기록한다. 백업 기록 실패도 복사 전체를 롤백한다. 아직 백업 자동 만료/복원 도구가 없으므로 운영 적용 금지. 테스트 종료 시 격리 프로젝트 폐기로 테스트 개인정보를 제거한다.
- 반환 상태는 항상 `data_copied_identity_pending`. 이 상태를 통합 성공으로 표시하면 안 된다.

## 후속 identity 단계와 실패 복구

1. source 대체 로그인으로 실제 새 세션의 UUID 확인 → 데이터 요약/복사 및 검증.
2. source 공식 `unlinkIdentity()` 수행 직전 identities와 대체 로그인 재확인.
3. target 공식 `linkIdentity()`로 분리한 provider 재연결. 카카오 scope 및 PKCE 보존.
4. 새 Google 로그인과 새 Kakao 로그인 각각 target UUID임을 확인하고 원본 기준 즐겨찾기/폴더 항목 포함 여부를 검사.
5. 2단계 전 취소는 원본 그대로. 2단계 후 취소/오류는 대체 로그인으로 source에 복귀 가능해야 하며 필요 시 source에 공식 재연결. target은 기존 provider로 복귀. 자동으로 identity를 옮기거나 account를 삭제하지 않는다.
6. 중간 단계 재개 기록과 재연결 검증, timeout/취소/브라우저 종료 복구는 **미구현**이다. 따라서 현재 코드에서 identity를 해제하는 기능은 제공하지 않는다.

## 검증 결과

- Node 서버/Auth 모의 테스트 및 기존 인증/안내 회귀 테스트 통과. 실제 Supabase Auth 서버 검증 아님.
- 임시 `work/merge-sql`의 PGlite(PostgreSQL WASM)에서 실제 002/003/005 SQL 실행: 즐겨찾기 중복 제거, 같은 이름 폴더 보존, 폴더 연결, 원본 보존, 같은 요청 재시도, stale 요약 거부, 중간 오류 전체 롤백, 회원 역할의 타인 조회·쓰기 및 백업/RPC 접근 차단 통과.
- PGlite 테스트의 auth/storage 스키마는 최소 대역이다. Supabase 운영 Postgres/Auth/Storage와 동등한 통합 테스트가 아니다.
- 테스트 프로젝트 실제 배포, Google/Kakao 각 로그인, 양방향 연결, 동일 UUID 재로그인, identity 이전 중 실패 복구, 모바일 OAuth 복귀, 운영 적용은 모두 미검증.

로컬 검증:
`node --test supabase/tests/account-merge.test.mjs tests/identity-auth.test.cjs tests/merge-notice.test.cjs`

선택 SQL 검증(사이트 런타임 의존성 아님):
`npm install --prefix work/merge-sql --no-audit --no-fund @electric-sql/pglite`
`node --test supabase/tests/account-merge-sql.test.mjs`
