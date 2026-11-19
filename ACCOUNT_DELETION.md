# 회원 탈퇴 운영 안내

## 서버와 데이터 정리

정적 GitHub Pages는 삭제 권한을 보유하지 않습니다. `supabase/functions/delete-account/index.ts`가 Supabase Edge Function에서만 `SUPABASE_SERVICE_ROLE_KEY` 환경변수를 읽고, 공식 `auth.admin.deleteUser(userId, false)`를 호출합니다. 실제 키를 소스·프런트엔드·GitHub Secrets에 추가할 필요가 없습니다. 서버 Auth 클라이언트는 세션을 저장하지 않으며 사용자 토큰을 관리자 클라이언트에 로그인시키지 않습니다.

클라이언트가 보낸 삭제 대상 UUID를 신뢰하지 않습니다. `auth.getUser(token)`으로 인증된 회원과 확인 화면의 UUID가 같은지 검증하고, 이 검증을 통과한 토큰의 `session_id`를 읽어 해당 회원의 실제 `auth.sessions` 행을 확인합니다. 세션 생성 후 5분 이내여야 하며 토큰 갱신 시간(`iat`)이나 브라우저 시계는 판단에 사용하지 않습니다. 로그아웃되거나 삭제된 세션은 거절합니다.

서버는 공식 도메인의 JSON POST만 받습니다. `check`는 삭제하지 않고 안전 확인만 하며, `delete`는 별도의 체크박스·확인 문구 입력·최종 확인을 거친 UI에서 호출됩니다. 서버도 고정 확인 문구와 예상 UUID를 다시 검증합니다. HTTP 응답·로그에 토큰, 이메일, 비밀번호나 내부 오류를 노출하지 않습니다. `verify_jwt=false`는 함수의 직접 `getUser` 검증과 DB 세션 검증을 사용하기 위한 구성이고 익명 삭제를 허용하지 않습니다.

개인 데이터를 먼저 수동 삭제하지 않습니다. Auth의 공식 삭제와 기존 외래 키의 CASCADE로 아래 정보를 정리합니다.

| 삭제 대상 | 경로 |
| --- | --- |
| 계정 이메일·이름 등 프로필 메타데이터 | `auth.users` |
| Google·카카오·이메일 로그인 연결 | `auth.identities`의 user_id CASCADE |
| 로그인 세션과 갱신 수단 | Auth 삭제 및 `auth.sessions` CASCADE |
| 즐겨찾기 | `cineliq_favorites.user_id` → auth.users CASCADE |
| 개인 폴더 | `cineliq_folders.user_id` → auth.users CASCADE |
| 폴더·기법 연결 | 폴더 및 즐겨찾기의 복합 외래 키 CASCADE |

독립된 프로필 테이블은 현재 없습니다. 공통 기법 `data.js`, `cineliq_media`, Storage의 공통 이미지·영상, 다른 회원의 데이터는 삭제하지 않습니다. 관리자 등록 계정 및 Storage 파일 소유 계정은 자동 삭제를 차단하여 운영자가 소유권과 공통 자료를 먼저 검토하도록 합니다. 이 코드에서는 소유권 이전이나 관리자 권한 변경도 하지 않습니다.

Google·카카오 계정 자체를 삭제하거나 해당 서비스의 접근 토큰 철회를 별도 호출하지 않습니다. CINELIQ 내부의 로그인 연결을 삭제합니다. 재가입은 새로운 회원 생성 흐름이며 과거 UUID나 라이브러리를 복원하는 코드는 없습니다. 실제 동일 소셜 계정의 재가입·새 UUID 검증은 명시적으로 승인된 테스트 계정으로 해야 합니다.

## 적용 절차 — 운영자 승인 후

1. 운영 스키마를 읽기 전용으로 확인하고 `004_account_deletion.sql`을 SQL Editor에서 실행합니다. 이 마이그레이션은 데이터 변경 없이 안전 확인 함수 하나만 생성합니다. `public`/`anon`/`authenticated`의 실행을 금지하고 기존 서버 역할 `service_role`에만 실행을 허용합니다. 기존 테이블·RLS·CASCADE는 변경하지 않습니다.
2. Dashboard → Edge Functions → Deploy a new function → Via Editor에서 이름을 `delete-account`로 지정하고 `supabase/functions/delete-account/index.ts`의 코드를 배포합니다. 또는 인증된 Supabase CLI에서 기존 프로젝트에 `supabase functions deploy delete-account --project-ref bjztgycagiartzjiotcc --no-verify-jwt`를 실행합니다. 새 프로젝트를 만들지 않습니다.
3. Edge Function의 내장 `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`가 서버 환경에 있어야 합니다. 키를 채팅이나 프런트엔드에 복사하지 않습니다.
4. 함수 설정의 legacy JWT verification은 끄고 함수 자체의 필수 인증을 사용합니다. 배포 후 익명 POST는 거절되는지, 인증된 `check`가 DB 함수를 통해 처리되는지 검증합니다.
5. 로컬 UI·서버 격리 테스트 후 기존 GitHub main에 push하여 Pages를 배포합니다. 함수 또는 SQL을 수정했을 때는 Pages push만으로 서버가 재배포되지 않으므로 위 단계를 별도로 수행합니다.

OAuth 재인증은 기존 Supabase `signInWithOAuth`를 사용합니다. Google의 계정 선택과 카카오의 `scope: 'profile_image,profile_nickname'`을 유지하고, 회원 연결 API는 호출하지 않습니다. 돌아온 UUID가 원래 회원과 다르면 탈퇴를 차단합니다. 재인증 이후에도 자동 삭제하지 않고 다시 최종 확인을 받습니다. 외부 제공자의 기존 세션에 따라 비밀번호 입력 화면이 생략될 수 있으며, 여기서 보장하는 것은 서버가 확인한 최근 Supabase 로그인 세션입니다.

## 실패·보존·운영 주의

삭제 실패 시 클라이언트는 로그아웃하지 않으며 성공으로 표시하지 않습니다. 서버 성공 응답이 유실되면 결과가 미확정일 수 있습니다. 이 경우 안내를 유지하고 재확인·재로그인·문의로 실제 계정 상태를 확인합니다. 이미 삭제된 세션으로 재시도하면 인증이 거절되며, 다른 회원이나 새로 생성된 계정을 대신 삭제하지 않습니다. 중복 클릭은 UI에서 차단하고 두 요청이 경합해도 대상은 동일한 인증 UUID입니다.

실제 법적 보존 데이터·기간·근거는 운영자가 확정해야 합니다. 현재 사용자별 결제·주문·법적 보존 테이블은 확인되지 않았습니다. 별도 확인이 필요한 회원은 신뢰된 Auth `app_metadata.account_deletion_hold=true`로 표시하면 자동 삭제를 중단합니다. 이 값을 클라이언트의 `user_metadata`에 넣어서는 안 됩니다. 보존 의무가 있으면 최소 정보와 접근 제한·보유 기간을 별도로 설계한 뒤 자동 탈퇴를 허용해야 합니다.

Supabase 보안 로그, 감사 기록 및 플랫폼 백업의 보존·파기는 라이브 데이터 삭제와 별개이며 이 함수가 즉시 지우지 않습니다. 플랫폼 정책과 실제 보유 기간을 운영자가 확인해야 합니다. 이미 발급된 액세스 JWT 자체는 만료 전까지 암호학적으로 유효할 수 있지만, 삭제된 세션의 민감한 탈퇴 요청은 차단되며 개인 테이블은 외래 키로 삭제된 UUID의 새 데이터 생성을 거절합니다.

실제 운영 회원을 임의로 삭제하지 않습니다. 로컬 서버 테스트는 가짜 Auth/DB 어댑터, UI 테스트는 모의 세션을 사용합니다. 실제 Auth 삭제·CASCADE와 소셜 재가입 검증은 별도 테스트 프로젝트 또는 명시적으로 승인한 폐기 가능한 테스트 계정으로 진행해야 합니다.

서버 안전 테스트는 Node.js 24 이상에서 `node --test supabase/tests/account-deletion.test.mjs`, Deno 타입 검사는 `deno check supabase/functions/delete-account/index.ts`로 실행합니다. 테스트는 실제 Supabase에 접속하거나 회원을 삭제하지 않습니다.

## 이번 적용 결과

운영자 승인 후 004 안전 확인 함수와 `delete-account` Edge Function을 기존 프로젝트에 적용했습니다. 일반 방문자·회원의 함수 직접 실행 권한이 없고 서버 역할만 실행할 수 있음을 운영 DB에서 확인했습니다. API의 익명·위조 토큰 요청은 401, 공식 도메인의 CORS 사전 요청은 204로 처리되는 것을 확인했습니다. 실제 회원 삭제, 실제 소셜 재인증 완료와 동일 소셜 계정 재가입은 실행하지 않았습니다.

참고: [Supabase 회원 관리](https://supabase.com/docs/guides/auth/managing-user-data), [공식 deleteUser API](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser), [getUser 검증](https://supabase.com/docs/reference/javascript/auth-getuser), [세션](https://supabase.com/docs/guides/auth/sessions).
