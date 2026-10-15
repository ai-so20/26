# UI V2 CLEAN ROOM REBUILD PLAN

## 목표

현재 UI를 수정/보정하지 않는다. 기존 사이트는 기능 사양서와 데이터 연결 참고용으로만 사용하고, V2 화면은 새 구조로 만든다.

## 작업 격리

- 운영 기준: `main`
- V2 전용 브랜치: `ui-v2-cleanroom`
- 운영 main 직접 수정 금지
- V2 승인 전 production 승격 금지
- V2는 Preview에서만 확인

## V2에서 재사용하지 않을 것

- 기존 색상 체계
- 기존 카드/버튼 디자인
- 기존 radius/shadow
- 기존 레이아웃 배치
- `blueTheme()`에 의존한 화면 디자인
- 화면별 임의 테마색
- 기존 인라인 스타일을 새로운 V2 컴포넌트의 기준으로 복사하는 방식

## V2에서 보존할 것

- 사용자에게 필요한 기존 내용
- 모든 기능/상태/버튼 동작
- Supabase 연결과 RPC 계약
- API route 계약
- 회원/관리자 권한 분기
- 읽음/알림/세션 상태
- 이벤트/출석/AI PROCESS/상품지급 데이터

## 정보 구조

### 전역 프레임

1. Service Header
   - 서비스명
   - 현재 사용자 정보 접근
   - 알림
   - 로그아웃/계정 관련 기능

2. Primary Navigation
   - 이벤트
   - AI프로세스
   - 상품 지급
   - 동일한 구조와 시각 규칙 사용

3. Page Summary
   - 현재 페이지에서 사용자가 가장 먼저 알아야 할 상태만 표시
   - 설명문 반복 금지

4. Main Actions / Main Data
   - 페이지별 핵심 동작과 핵심 데이터

5. Secondary Information
   - 상세 안내, 과거 내역, 보조 정보

### 이벤트

- 오늘/현재 상태 요약
- 실시간 이벤트 / 출석 이벤트 전환
- 현재 참여 가능한 이벤트
- 참여/정답/결과
- 돌발 이벤트
- 상세 안내는 필요할 때만 열기

### AI PROCESS

- 가장 먼저 현재 PROCESS 상태
- 핵심 금액/진행률/남은시간
- 그래프/진행내역
- 현재 단계/반영 기록
- 필요한 안내
- 관리자일 경우 회원 관리 도구를 별도 관리 영역으로 구분

### 상품 지급

- 지급/메시지 상태 요약
- 지급 메시지 목록
- 상품/링크 수령 정보
- 읽음 상태
- 입력/전송 영역
- 이벤트/AI PROCESS 설명 반복 금지

## 단일 디자인 시스템 원칙

V2에서 페이지별 별도 디자인 언어를 만들지 않는다.

### 역할 기반 색상만 사용

- Canvas
- Surface
- Surface Subtle
- Text Primary
- Text Secondary
- Border
- Brand/Primary
- Success
- Warning
- Danger

`이벤트=주황`, `AI=파랑`, `상품지급=보라` 같은 페이지 테마 방식 금지.

### 공통 컴포넌트

- AppShell
- ServiceHeader
- PrimaryNav
- PageHeader
- SummaryCard
- Section
- DataCard
- Stat
- PrimaryButton
- SecondaryButton
- StatusBadge
- EmptyState
- Notice
- Modal/Sheet
- MessageList
- MessageComposer

페이지에서 새로운 카드/버튼 스타일을 즉석으로 만들지 않는다.

## 리빌딩 단계

### Phase 0 — 완료
- V2 브랜치 분리
- 기능 인벤토리 작성

### Phase 1 — 대표 화면 설계
- 실제 데이터를 아직 건드리지 않고 대표 회원 화면 1개 제작
- 기존 UI 스타일 복사 금지
- 전역 헤더/내비/카드/타이포/여백 규칙을 여기서 확정
- 사용자 승인 전 다른 페이지로 확장 금지

### Phase 2 — 공통 UI 시스템화
- 승인된 대표 화면에서 토큰 추출
- 공통 primitives/components 작성
- 새 화면은 해당 공통 컴포넌트만 사용

### Phase 3 — 이벤트 연결
- 기존 이벤트 기능을 V2 컴포넌트에 연결
- 실시간/출석/돌발 이벤트 기능 패리티 검사

### Phase 4 — AI PROCESS 연결
- 기존 AI PROCESS 조회/관리/그래프/수익 기능 연결
- 회원/관리자 기능 패리티 검사

### Phase 5 — 상품 지급 연결
- 기존 개인 메시지/상품/링크/읽음/알림 기능 연결
- 상품 지급 화면 안에서 다른 서비스 설명 제거

### Phase 6 — 관리자 기능
- 승인/회원관리/재고/PROCESS 관리 기능 연결
- 회원 UI와 관리자 도구의 시각적 역할 분리

### Phase 7 — 전체 회귀 테스트
- 기능 인벤토리의 모든 항목 실제 확인
- 모바일/PC 확인
- build 성공만으로 완료 처리하지 않음

### Phase 8 — 승격
- 사용자 최종 승인
- Preview → production
- 기존 production rollback 기준 보존

## 금지 규칙

- 기존 화면 위에 CSS 덧칠
- `blueTheme`로 색만 치환하여 V2라고 판단
- 페이지마다 다른 디자인 시스템 생성
- 기능 코드를 UI 변경과 동시에 삭제/간소화
- 설명문 중복을 기능 삭제와 혼동
- build 성공을 기능 검증으로 대체
- main에서 실험

## 첫 번째 실제 산출물

다음 작업은 `Phase 1 대표 화면`이다.

대표 화면은 기존 화면을 수정하지 않고 별도 V2 프리뷰 화면으로 만든다. 이 화면이 승인된 뒤에만 이벤트/AI PROCESS/상품지급 전체로 확장한다.
