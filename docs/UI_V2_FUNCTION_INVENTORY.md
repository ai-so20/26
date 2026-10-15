# UI V2 기능 보존 인벤토리

기준 브랜치: `ui-v2-cleanroom`
기준 원본: `main@915f609705a5bbe305cc92d72c1b3a5c3e83a8ca`

## 절대 원칙

- V2 작업 중 기존 `main`의 운영 UI/기능은 수정하지 않는다.
- 현재 디자인, 색상, 카드, 버튼, 간격, 그림자, radius, `blueTheme` 표현 규칙은 V2 디자인 기준으로 재사용하지 않는다.
- 아래 기능은 V2 완료 전까지 1개도 누락되면 안 된다.
- 기능 패리티는 단순 build 성공이 아니라 실제 기능 호출/상태 변화/데이터 반영까지 확인한다.

## 1. 인증 / 회원 / 세션

- 로그인 조회 `/api/auth/login-lookup`
- 회원 입장 `/api/auth/member-entry`
- 회원가입 `/api/auth/signup`
- 세션 확인 `checkSession`
- 프로필 로드 `loadProfile`
- 회원명/아바타 로드 `loadMemberNames`, `loadOneMemberName`, `loadMemberAvatars`
- 내 비밀번호 변경 `changeMyPassword`
- 관리자 회원 정보 변경 `adminChangeMemberIdentity`
- 관리자 회원 비밀번호 변경 `adminChangeMemberPassword`
- 로그아웃 `handleLogout`
- VIP 세션 재개 `resumeVipSession`
- 계정 전환 `switchVipAccount`
- 회원 승인/해제/강퇴 및 일괄 승인
  - `loadAdminApprovalMembers`
  - `approveAdminMember`
  - `approveAllPendingMembers`
  - `adminRevokeApprovedMember`
  - `adminKickMember`

## 2. 공통 내비게이션 / 회원 UI 기능

현재 핵심 메뉴 3개:
- 이벤트 (`event`)
- AI프로세스 (`ai`)
- 상품 지급 (`private`)

보존 대상:
- 메뉴 전환 상태와 sessionStorage 복원
- 내 정보 보기
- 로그아웃
- 알림 ON/OFF
- 읽지 않은 상품지급/개인 메시지 배지
- VIP 환영/입장 관련 상태

## 3. 이벤트

### 실시간 자동 이벤트
- 이벤트 목록 로드 `loadAutoEvents`
- 이벤트 참여 `joinAutoEvent`
- 정답 선택 `setEventAnswer`
- 이벤트 게임 렌더링 `renderEventGame`
- 이벤트 안내 `eventGuide`
- 이벤트 시간/아이콘/진행 여부 계산
  - `formatEventTime`
  - `eventIcon`
  - `isEventLiveNow`
  - `getActiveAutoEvent`
  - `getNextAutoEvent`
  - `getNextEventCountdownLabel`
  - `getTodayEventStats`
- 이벤트 당첨자 하단 문구 관리
  - `loadEventWinnerFooter`
  - `saveEventWinnerFooter`

### 이벤트 상품 재고
- 일반 이벤트 상품 재고 조회/대량 추가/삭제
  - `loadGiftInventory`
  - `addGiftInventoryBulk`
  - `deleteGiftInventory`
  - `deleteAllGiftInventory`
  - `deleteAllAssignedGiftInventory`
- 상품명 금액 파싱 `parseGiftAmountFromProductName`

### 출석 이벤트
- 출석 사이클 계산 `getAttendanceCycleCount`
- 출석 상태 조회 `loadAttendanceStatus`
- 일일 출석 체크 `checkDailyAttendance`
- 출석 상품 재고 조회/대량 추가/삭제
  - `loadAttendanceGiftInventory`
  - `addAttendanceGiftInventoryBulk`
  - `deleteAttendanceGiftInventory`
  - `deleteAllAttendanceGiftInventory`
  - `deleteAllAssignedAttendanceGiftInventory`

### 돌발 이벤트
- 설정 로드/저장 `loadSurpriseSettings`, `saveSurpriseSettings`
- 문구 로드/저장 `loadSurpriseCopy`, `saveSurpriseCopy`
- 진행방법 로드/저장 `loadSurpriseGuide`, `saveSurpriseGuide`
- 실제 진행 목록 `loadRealSurpriseRows`
- 문구 포맷 `formatSurpriseCopy`

## 4. AI PROCESS

### 회원 기능
- 회원 PROCESS 상태 조회 `loadAiMemberProcess`
- 상태/진행시간/기회 D-day 계산
  - `aiProcessStatusLabel`
  - `aiProcessDurationLabel`
  - `aiProcessDurationMs`
  - `aiProcessOpportunityDday`
- 수익/평가 상태 계산
  - `aiProcessFinalReturn`
  - `getMemberProcessSnapshot`
  - `aiKrw`
  - `aiTime`
- 시뮬레이션 저장/복원/갱신
  - `aiStorageKey`
  - `hydrateAiSimulationFromStorage`
  - `makeAiDurationHours`
  - `buildChartPoints`
  - `updateAiSimulation`
- 시장 시뮬레이션 `/api/market-sim`
- 최근 AI 결과/시장 카운트
  - `getAiRecentResults`
  - `getAiMarketCounts`

### 관리자 기능
- 회원별 AI PROCESS 관리 목록 `loadAiAdminRows`
- 관리 폼 채우기 `fillAiAdminForm`
- 설정 저장/상태 변경 `saveAiAdminSettings`
- PROCESS 초기화 `resetAiAdminProcess`
- 수익 수동 조정 RPC `admin_adjust_ai_process_profit`

### AI 상품 재고
- `loadAiGiftInventory`
- `addAiGiftInventoryBulk`
- `deleteAiGiftInventory`
- `deleteAllAvailableAiGiftInventory`
- `deleteAllAssignedAiGiftInventory`

## 5. 상품 지급 / 개인 메시지

- 회원 개인 채팅 열기 `openPrivateChat`
- 개인 메시지 조회 `loadPrivateMessages`
- 관리자 개인 채팅 목록 `loadAdminChats`
- 관리자 회원 선택 `selectAdminChat`
- 개인 메시지 전송 `sendPrivateMessage`
- 링크 버튼 전송 `sendPrivateLinkButton`
- 개인 메시지 삭제 `adminDeletePrivateMessage`
- 읽음 처리 및 읽지 않은 수 관리
  - `loadAdminUnreadCounts`
  - `loadMemberUnreadCount`
  - RPC `mark_private_chat_read`
- 개인 메시지 푸시
  - `sendPrivatePush`
  - `privateNotificationPreview`
  - `showPrivateIncomingAlert`

## 6. 그룹 채팅 / 커뮤니티 기능

현재 UI 노출 여부와 관계없이 기능 삭제 금지:
- 운영 시간 판단 `isGroupChatOperatingTime`
- 채팅 상태 로드/동결 `loadGroupChatState`, `toggleGroupChatFreeze`
- 메시지 조회 `loadMessages`
- 메시지 전송 `sendMessage`
- 이미지 업로드 `uploadChatImage`
- 메시지 삭제 `adminDeleteGroupMessage`
- 읽음/안읽음 관리
  - `markGroupMessagesRead`
  - `loadGroupUnreadCount`
- 날짜 구분/스크롤/최신 메시지 이동 관련 기능
- AI 채팅 API `/api/ai-chat`

## 7. 알림 / PWA

- 푸시 상태 조회 `refreshPushStatus`
- 알림 구독 `enablePrivateNotifications`
- 관리자 푸시 상태 `loadAdminPushStatuses`
- 앱 아이콘 배지 `syncAppIconBadge`
- PWA 설치 `installVipApp`
- iOS 판단 `isIOSDevice`
- 설치 가이드 닫기 `closeInstallGuide`
- Push API
  - `/api/push/private-message`
  - `/api/push/sync-subscription`
  - 서버 라우트 `/api/push/daily-event`
  - 서버 라우트 `/api/push/surprise-winner`

## 8. 관리자 운영

- 회원 목록 및 승인 회원 관리
- 이벤트 참여내역 열람 `openAdminEventEntries`
- 회원별 개인 메시지 열기 `openAdminMemberChat`
- 승인 회원 관리 `loadApprovedMemberManagerRows`, `openApprovedMemberManager`
- 회원 프로필/비밀번호 수정 API
  - `/api/admin/member-profile`
  - `/api/admin/member-password`
- 이벤트/출석/AI 상품 재고 관리자 기능 전부 보존
- AI PROCESS 회원별 관리/수익 조정/초기화 보존

## 9. 현재 데이터 연결

직접 참조 테이블/스토리지:
- `profiles`
- `group_messages`
- `private_messages`
- `ai_process_members`
- `vip_surprise_settings`
- `vip_surprise_copy_settings`
- `vip_surprise_guide`
- `chat-media` storage

주요 RPC 연결은 현행 코드와 동일한 계약을 유지한다. V2에서는 데이터 스키마 변경을 UI 리빌딩과 동시에 하지 않는다.

## 10. V2 기능 패리티 완료 조건

각 항목은 `미확인 → 연결 → 실제 동작 확인` 3단계로 관리한다.

- [ ] 로그인
- [ ] 회원가입
- [ ] 세션 복원
- [ ] 프로필/내 정보
- [ ] 알림 구독
- [ ] 이벤트 목록
- [ ] 이벤트 참여
- [ ] 이벤트 결과/당첨
- [ ] 출석 조회
- [ ] 출석 체크
- [ ] 돌발 이벤트
- [ ] AI PROCESS 상태 조회
- [ ] AI PROCESS 그래프/수익 표시
- [ ] AI PROCESS 관리자 설정
- [ ] AI PROCESS 수익 조정
- [ ] 상품 지급 메시지 조회
- [ ] 상품 지급 메시지 전송
- [ ] 상품/링크 지급
- [ ] 읽음/안읽음
- [ ] 관리자 회원 승인/해제
- [ ] 관리자 회원 정보 변경
- [ ] 이벤트 상품 재고
- [ ] 출석 상품 재고
- [ ] AI 상품 재고
- [ ] 그룹 채팅 기능 보존
- [ ] 이미지 업로드
- [ ] PWA 설치/배지
- [ ] 모바일 화면 높이/스크롤 안정성

이 체크리스트가 전부 완료되기 전에는 V2를 `main`/production으로 승격하지 않는다.
