# 26 복구 작업 상태

기준: vip-event-main(3).zip + vip-event-gamma-supabase-recovery(2).zip.
기존 26 소스는 사용하지 않았습니다. 디자인 개편 없음.

## 소스 변경
- 내 프로필 팝업의 큰 이미지 요소만 제거. 작은 아바타와 원본 이미지 자산은 유지.
- AI 이벤트 참가 응답의 잘못된 auto_events 조회를 실제 events 테이블로 수정.
- 푸시 발신 사이트 기본 주소를 26-beige.vercel.app으로 변경.
- 실제 설치 버전 고정, package-lock.json 추가, Next.js 배포 설정 추가.
- recovery 폴더는 원본 DB 자료 보관용이며 실행용 올인원 SQL이 아닙니다.

## 실제 DB 반영 및 재조회 확인
대상: amgeyannjsslzmoowcmd (26 연결 DB).
- 실시간 발행 테이블: ai_process_members, profiles, group_messages, room_chat_settings, private_messages.
- chat-media 저장소 생성: 기존 클라이언트의 공개 이미지 URL 방식, 8MiB 제한.
- 승인된 로그인 회원이 자신의 UID 폴더에만 업로드하도록 정책 적용.

## 아직 완료되지 않은 부분
- 운영 배포 및 사용자 로그인 이후 전체 동작 검증 미완료.
- SUPABASE_SECRET_KEY 서버 인증 키 미설정: 회원가입, 로그인 조회, 관리자 API 차단.
- VAPID 키 및 VIP_SURPRISE_PUSH_SECRET 미설정: 실제 웹 푸시 검증 불가.
- GEMINI_API_KEY 또는 CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN 미설정.
- AI 캐릭터 0건, 퀴즈 0건, 회원 0건. 첨부에는 원본 테이블 데이터가 없음.
- DB 함수 내부의 원본 사이트 URL, 누락된 시간별 스케줄, Vault 알림 비밀값 연결은 배포/키 설정 후 수정 필요.
- 원본 함수 정의와 기존 DB 함수의 완전한 의미 비교 및 인증 역할별 테스트가 추가로 필요.

빌드는 임시 검증용 문자열로 수행했으며 실제 인증 성공을 뜻하지 않습니다.
비밀키는 이 파일이나 채팅에 적지 말고 Vercel 26 환경변수에 직접 등록해야 합니다.


## 2차 업데이트 (2026-10-15)
- 그룹채팅 메뉴, 안내 바로가기, 그룹 실시간 구독 및 메시지 조회 제외.
- AI 캐릭터 endpoint 비활성화, 자동 대화 heartbeat 및 가입 환영 API 호출 제외.
- 1:1 고객센터와 AI프로세스 기능은 유지.
- 퀴즈 300건 실제 DB 등록 및 기존 퀴즈 이벤트 4건 무작위 배정 확인.
- Next.js 재빌드 통과. 실제 로그인/가입 통합 테스트는 서버 키 미설정으로 미실시.
- AI 캐릭터를 제외했으므로 Gemini/Cloudflare AI 키와 캐릭터 데이터는 더 이상 필수 조건이 아님.
- 서버 인증 키(SUPABASE_SECRET_KEY), 웹 푸시 설정 및 운영 배포는 여전히 미완료.
- 운영/미리보기 NEXT_PUBLIC_SUPABASE_URL 및 공개 키 연결 설정 완료.
