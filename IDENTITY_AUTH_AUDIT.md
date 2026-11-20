# 소셜 로그인·계정 연결 조사와 수정

## 확인한 사실과 아직 확인하지 못한 원인

2026-11-21 운영 Supabase 대시보드를 읽기 전용으로 확인했습니다.

- Authentication → Sign In / Providers: Google ENABLED, Kakao ENABLED, Allow manual linking ON.
- Authentication → URL Configuration: Site URL `https://cineliq.art`, 허용 URL `https://cineliq.art/**`와 기존 GitHub Pages URL.
- 공개 OAuth authorize 시작 응답: Google과 Kakao 모두 302이며, 해당 제공자의 공식 인증 호스트로 이동합니다. 두 제공자의 `redirect_uri`는 `https://bjztgycagiartzjiotcc.supabase.co/auth/v1/callback`입니다.
- Kakao 요청 scope는 `profile_image,profile_nickname`이며 `account_email`이 없습니다. 두 제공자에서 `prompt=select_account`를 확인했습니다. 실제 로그인 완료·외부 콘솔의 등록값 확인과는 다른 검사입니다.

코드상 일반 로그인은 `signInWithOAuth`, 연결은 `linkIdentity`, 해제는 `unlinkIdentity`로 분리되어 있습니다. 자체 사용자 병합 서버나 다른 사용자 UUID로 데이터 복사하는 로직은 없습니다.

**확인한 코드 문제:** 기존 `identityError`가 `identity_already_exists`, `email_exists`, `user_already_exists` 및 넓은 문자열 패턴을 모두 ‘다른 계정에 연결됨’으로 표시했습니다. Supabase 서버는 이미 현재 사용자에게 연결된 경우에도 `identity_already_exists`를 반환할 수 있으므로 이 코드만으로 다른 계정 소유라고 단정할 수 없습니다. 기존 해제 처리도 재조회한 identities에서 제공자가 실제로 사라졌는지 검사하지 않았습니다.

**운영 사용자에게 발생한 정확한 분기:** 아직 본인의 실제 OAuth 재현 결과를 확보하지 못했습니다. 실제로 별도 Google·Kakao 사용자에 이미 귀속된 identity라면 서버가 연결을 거절하는 것은 정상 보호 동작입니다. 이 경우 아래 코드 수정으로 강제 연결하지 않습니다. 코드의 오분류를 고친 사실과 실제 계정 충돌을 해결한 사실은 구분합니다.

## 수정한 코드

`media-cloud.js`:

- `identityState(expectedUserId)`: `auth.getUser()`의 서버 사용자와 identities를 읽고, 현재 세션·예상 UUID·identity 소유 UUID를 확인합니다. 로컬 `app_metadata.providers`나 이메일만으로 연결 상태를 판단하지 않습니다. `getUser()`는 기존 `getUserIdentities()`의 기반이 되는 서버 사용자 정보를 직접 확인하는 공식 API입니다.
- `linkIdentity(provider, expectedUserId)`: Google/Kakao 허용 목록, 현재 서버 UUID, 기존 연결, 제공자 활성화를 확인한 뒤 공식 `auth.linkIdentity()`만 호출합니다. 일반 로그인으로 대체하지 않습니다.
- `unlinkIdentity(identity, expectedUserId)`: 본인 identity와 활성화된 다른 소셜 로그인 수단을 확인한 뒤 공식 API를 호출합니다. 이후 같은 UUID인지와 대상 제공자가 실제로 제거되었는지 확인합니다. 이메일이 있다는 사실만으로 비밀번호 로그인 가능성을 가정하지 않습니다.
- Kakao에도 공식 계정 선택 `prompt=select_account`를 추가했습니다. 기존 이메일 없는 scope는 유지합니다. Client Secret·service_role·설정값 변경은 없습니다.

`member.js`:

- `verifiedIdentities`와 `refreshIdentities`: 서버에서 확인한 identities를 표시합니다. 조회 실패는 연결되지 않음으로 바꾸지 않고 확인 실패·재시도 상태로 둡니다.
- `identityError`, `changeIdentity`, `start`: 현재 사용자에게 실제로 연결되어 있는지부터 확인하고, 동일 사용자 중복·타 사용자 identity 충돌·이메일 충돌·설정 미활성·취소·PKCE 만료·UUID 불일치를 구분합니다. 오류 자체를 숨기거나 연결 성공으로 바꾸지 않습니다.
- 성공 표시는 콜백 후 같은 UUID와 해당 제공자 identity가 확인된 경우에만 합니다. 오류가 있었지만 서버에 이미 연결되어 있으면 ‘현재 계정에 이미 연결됨’으로 안내합니다. 연결 해제도 실제 제거를 확인한 뒤 표시합니다.
- 연결 전후 UUID가 달라지면 성공 처리와 회원 화면 갱신을 중단합니다. 일반 로그인·이메일 인증·로그아웃에서는 중단된 연결 메타데이터를 제거하여 두 콜백 흐름을 혼동하지 않습니다.
- 중복 클릭 방지·최종 해제 확인·마지막 소셜 로그인 수단 보호를 유지합니다. 오류 코드는 비밀정보 없이 상태 요소의 `data-auth-error-code`로 진단할 수 있습니다. 원본 OAuth 설명·URL·토큰을 로그로 출력하지 않습니다.

현재 사용하는 Supabase JS/Auth 2.102.0의 실제 공개 소스에서 URL 인증 실패가 기존 세션을 제거하지 않는 처리를 확인했습니다. 앱이 별도 토큰 백업·복원이나 강제 로그아웃으로 이를 덮어쓰지 않습니다. 만료·취소된 연결에서 정상 로그인 세션이 유지되는지는 모의 테스트와 실제 OAuth 테스트를 구분합니다.

`index.html`은 위 두 파일의 캐시 버전만 변경합니다. 학습 데이터·미디어·Supabase 테이블·RLS·회원 데이터·소유권 인증 파일은 수정하지 않습니다.

## 외부 콘솔 체크리스트

현재 읽은 Supabase 설정은 정상이며 이번 작업에서 변경하지 않았습니다. 실제 OAuth 완료가 실패한다면 다음을 운영자가 확인해야 합니다.

1. Supabase → Authentication → Sign In / Providers → Allow manual linking ON, Google/Kakao 활성화.
2. Supabase → Authentication → URL Configuration → Site URL `https://cineliq.art`, Redirect URLs에 `https://cineliq.art/` 또는 현재의 `https://cineliq.art/**` 포함.
3. Google Cloud → Google Auth Platform → Clients → 사용 중인 Web OAuth Client → Authorized redirect URIs에 `https://bjztgycagiartzjiotcc.supabase.co/auth/v1/callback`. 앱의 최종 복귀 URL과 이 제공자 콜백을 혼동하지 않습니다. Authorized JavaScript origins가 필요한 클라이언트에서는 공식 사이트 origin `https://cineliq.art`를 사용합니다.
4. Kakao Developers → 사용 중인 앱 → Kakao Login 설정 → Redirect URI에 위 Supabase 콜백을 정확하게 등록. 활성화·동의항목 profile_image/profile_nickname 확인. 이메일 권한을 임의로 추가하지 않습니다.
5. Supabase Kakao의 이메일 없는 사용자 허용 설정은 기존 운영 정책대로 유지합니다. 이번 조사에서는 해당 상세 토글을 새로 수정하거나 재검증하지 않았습니다. 이메일 없는 사용자는 UUID와 identities로 처리하며 단위 테스트에 이메일 없는 사용자를 포함했습니다.
6. Google/Kakao 콘솔 등록값·비밀키·사용자 로그인 완료는 이번에 직접 검증하지 못했습니다. 인증 시작 URL의 정상 응답이 끝까지 성공했다는 뜻은 아닙니다.

## 실제 두 계정으로 나뉘어 있는 경우

`linkIdentity`는 다른 사용자에게 속한 identity를 강제로 옮기는 병합 API가 아닙니다. 두 계정이 별개라면 두 소셜 계정의 소유권을 각각 최근 재인증으로 확인하고, 유지할 기본 UUID를 명시적으로 선택해야 합니다. 북마크 중복, 같은 이름의 폴더, 폴더 연결의 충돌 정책·백업·복구 계획을 준비한 뒤 사용자의 별도 승인을 받아야 합니다.

이번에는 타 회원 조회·계정 삭제·auth.users 직접 수정·identity 강탈·UUID 변경·데이터 이전을 실행하지 않았습니다. 북마크가 비어 있다는 이유로 계정도 없다고 판단하지 않습니다. 별도 안전 통합 절차 없이 충돌을 통과시키는 프런트엔드 우회는 제공하지 않습니다.

## 검증 결과와 남은 테스트

| 시나리오 | 이번 확인 범위 |
| --- | --- |
| A Google 신규 가입·로그인 | 운영 인증 시작 302·scope·콜백 확인. 실제 신규 가입/로그인 완료 미검증 |
| B Kakao 신규 가입·로그인 | 운영 인증 시작 302·scope·콜백 확인. 실제 신규 가입/로그인 완료 미검증 |
| C Google → Kakao 연결 | SDK 인자·UUID 보호 단위 검사, 모의 콜백 통과. 실제 OAuth 미검증 |
| D Kakao → Google 연결 | SDK 인자·UUID 보호 단위 검사, 모의 콜백 통과. 실제 OAuth 미검증 |
| E/F 연결 후 각각 재로그인 | 실제 제공자를 통한 재로그인 미검증 |
| G 동일 UUID | 정상 모의 연결 유지, 잘못된 UUID 콜백의 회원 데이터 조회 차단 통과. 실제 OAuth 미검증 |
| H 북마크·폴더 | 모의 충돌·취소·콜백 후 기존 저장 문자열 유지. 운영 데이터 쓰기/이전 없음 |
| I 다른 계정 identity | 모의 실제 충돌 표시와 현재 계정 중복 오분류 방지 통과. 특정 운영 계정 귀속은 미확인 |
| J 해제·재연결 | 모의 해제 확인·마지막 로그인 보호·API 해제 후 실제 상태 확인 통과. 실제 OAuth 재연결 미검증 |
| K 취소·실패 | 취소·이메일 충돌·거짓 성공·UUID 변경 콜백 모의 검사 통과. 실제 제공자 취소 미검증 |
| L PC·모바일 복귀 | 1440px/320px 모의 콜백 통과. 실제 iOS/Android OAuth 미검증 |

단위 검사: `node --test tests/identity-auth.test.cjs`.
브라우저 모의 검사에서는 Google→Kakao·Kakao→Google, 충돌·중복 클릭·UUID·해제 확인·마지막 수단 보호, 동일 계정 중복 오류·취소·이메일 충돌·실제 연결 없는 콜백·다른 UUID 콜백을 확인했습니다. 일반 이메일 로그인·가입·재설정 UI·헤더·모바일 메뉴 회귀 검사도 통과했습니다.

실제 테스트는 본인이 운영 사이트에서 로그인한 후 연결을 시작해야 합니다. 연결 전후 계정 식별과 제공자 상태·북마크·폴더를 확인하고 각각 로그아웃 후 재로그인해야 최종 목적을 검증할 수 있습니다. 비밀번호·OAuth 코드·액세스 토큰·Client Secret을 채팅이나 로그로 공유하지 않습니다.

공식 근거: [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking), [Supabase 오류 코드](https://supabase.com/docs/guides/auth/debugging/error-codes), [Supabase 서버 identity 처리](https://github.com/supabase/auth/blob/master/internal/api/identity.go), [Kakao 계정 선택](https://developers.kakao.com/docs/ko/kakaologin/rest-api), [Google 설정](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [Kakao 설정](https://supabase.com/docs/guides/auth/social-sign-in/auth-kakao).
