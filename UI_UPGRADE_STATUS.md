# CINELIQ 사용성 개선 작업

작업 범위: 폴더 독립 저장/전체 선택, 콘텐츠 필터, 명칭, 중복 설명, 용어집, 모델 선택, 테마 및 설정. 계정 통합 테스트 저장소/프로젝트는 이 작업에서 변경하지 않는다.

## 운영 DB 승인 대상: 006_independent_folders.sql

현재 folder_items → favorites FK가 ON DELETE CASCADE라 북마크 해제 시 폴더 항목도 삭제된다. 이 FK만 제거하고 폴더 소유 FK·Auth UUID·RLS는 유지한다. 기존 행 삭제/업데이트 없음. 유효 ID 형식 검사와 소유자 검증·중복 방지·동시 변경 충돌 검사가 있는 원자적 폴더 저장 RPC를 추가한다. 개인정보/관리자 권한 확장 없음.

적용 전 폴더/항목/즐겨찾기 수와 스키마를 확인하고 프로젝트의 복구 가능한 스키마/데이터 백업을 확보한다. 실패 시 SQL 트랜잭션 전체 롤백. 애플리케이션 되돌리기는 기능 커밋을 revert하며 데이터는 삭제하지 않는다. 적용 이후 독립 폴더 항목이 생기면 이전 FK를 바로 복원할 수 없다. 원래 제약 복원은 누락된 즐겨찾기 처리 정책을 별도 승인받아야 하며, 자동 북마크 생성이나 폴더 항목 삭제로 복구하지 않는다.

006 적용 전에는 폴더 바로 저장이 기능 준비 중으로 안내되며 서버 오류를 성공으로 표시하지 않는다. 전체 선택은 기존 API로 동작한다.

## 최종 구현 및 검증 (2026-11-23)
006은 사용자 승인 후 운영 적용 완료. 즐겨찾기45·폴더1·폴더항목45의 전후 수와 전체 행 해시가 동일함을 트랜잭션 내에서 검증했습니다. 기존 소유 FK·RLS와 행은 유지했습니다. 이전 FK는 독립 항목이 생긴 뒤 무조건 복원하면 안 됩니다.

전체 선택, 독립 복수 폴더 저장, 다중 콘텐츠 필터, 검토한4개 명칭, 고유 정의 보존, 별도 용어집, 모델 선택, 테마 및 접근성 설정을 구현했습니다. 다른 모델 전용 문안은 준비 중이며 기존 Veo 문안을 복제하지 않았습니다. 고유 기법414·이미지 프롬프트414·기존 영상 합집합223·확장 영상399. 학습 적용 필터는 이미지226·영상399·공통211입니다. 상세 조사와 보호 파일 해시는 reports/content-audit.json, 전체 명칭은 reports/technique-display-names.json에 있습니다.

접근성: 글자3단계·고대비·모션 감소·링크 밑줄·실제 자막 우선. 회원은 기존 Auth metadata의 cineliq_accessibility, 테마는 cineliq_preferences로 분리 저장하고 게스트는 로컬 저장합니다. OS 모션 감소를 우선하며 자막을 생성하지 않습니다. 제목 키보드 버튼, 모달 포커스 제한·복귀, 이미지/영상 설명, 배경 영상 일시정지를 제공합니다.

검증: 단위/모의 인증/로컬 PGlite SQL16개 통과. 모의 회원 브라우저 회귀 검사 및 Enter/Space/Tab/Escape 키보드 자동화 통과. axe28개 조합의 확정 위반0건. 그라데이션·겹침·스크롤 가림 대비 판정 보류는 미완료로 남깁니다(reports/accessibility-axe.json). 별도 CUA 수동 키보드 검사는 localhost 연결 제한으로 미완료입니다. 실제 iOS/Android·스크린 리더·OAuth·운영 회원 CRUD 및 회원 설정 서버 저장은 미검증입니다. WCAG2.2AA 전체 준수를 주장하지 않습니다. 전체414개 설명의 전문가 의미 재검수 및 타 모델 전용 프롬프트도 미완료입니다.

재실행: node --test tests/*.cjs supabase/tests/independent-folders.test.mjs / node scripts/audit-ui-upgrade.cjs / node tests/browser/usability.cjs / node tests/browser/accessibility.cjs. SQL은 work/sql-tools PGlite, 브라우저 검사는 Edge와 work/a11y-tools axe-core를 사용하며 앱 런타임 의존성은 추가하지 않았습니다. 인증 설정·Google 인증 HTML·미디어 원본·계정 통합 테스트 환경은 보존했습니다.
