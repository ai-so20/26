# 디자인 재설계 3차 — 공통 금융 UI 시스템

기준 브랜치: design/financial-ui-rebuild-20261019
기준 소스: 94064ae52885e2fa73a3ae86804f86a5dc8d5f26
백업: backup/design-before-20261019-94064ae

STAGE_3_STATUS: COMPLETE
STAGE_4_STATUS: NOT_STARTED

## 목표
기능과 페이지 내용은 유지하고 디자인/UI만 재설계한다. 기존 CSS 누적 위에 또 다른 장식 레이어를 추가하는 방식이 아니라, 4차 이후 구현에서 공통 토큰과 컴포넌트 규칙을 기준으로 화면을 정리한다.

키워드:
- Private Banking
- Financial Editorial
- AI Financial System
- Mobile First
- Quiet Motion

금지:
- 골드 VIP 클리셰, 왕관, 네온, 파스텔 그라데이션
- SaaS 3열 카드 벽, 모든 요소의 둥근 카드화
- 큰 설명 박스, 정보 하나당 카드 하나
- hover lift 남발, glow, 장식성 애니메이션

## 1. 컬러 시스템
페이지 기본:
- Canvas: #F6F7F8
- Surface: #FFFFFF
- Primary Text: #151B26
- Secondary Text: #596273
- Muted Text: #818A98
- Divider: rgba(20,30,45,.10)
- Divider Strong: rgba(20,30,45,.16)
- Midnight: #182337
- Steel: #526C91

의미색:
- Positive: #24704C 계열
- Negative: #BD5B53 계열
- Event / Attendance accent: muted amber 계열
- Reward accent: muted violet 계열
- AI accent: steel / midnight 계열

규칙:
- accent는 면적이 아니라 신호로 사용한다.
- 한 페이지의 primary accent는 1개만 둔다.
- 숫자/상태를 강조할 때 배경을 칠하기보다 타이포와 선, 작은 상태표현을 우선한다.
- 진한 배경은 AI PROCESS 핵심 상태 같은 제한된 영역에서만 사용한다.

## 2. Typography Scale
- Page Kicker: 10px / 700~760 / letter-spacing .10~.14em
- Page Title: 26~32px / 780~840 / line-height 1.08~1.15
- Hero Number: 32~42px / 800~850 / tabular-nums
- Section Title: 17~20px / 760~800
- Metric Value: 18~24px / 760~820 / tabular-nums
- Body: 13~14px / 450~550 / line-height 1.55~1.7
- Label: 10~11px / 650~720
- Caption: 9~10px / 500~650

규칙:
- 큰 숫자와 섹션 제목은 의미가 다르므로 같은 크기를 쓰지 않는다.
- 영문 대문자와 letter-spacing은 kicker/status 용도 외 남용하지 않는다.
- 금융 숫자는 `font-variant-numeric: tabular-nums` 적용을 우선한다.
- 모바일에서 본문 최소 12px 미만은 보조 caption 외 금지한다.

## 3. Spacing Scale
공통 spacing: 4 / 8 / 12 / 20 / 32 / 48

모바일 기본:
- 화면 좌우 padding: 18~20px
- 섹션 간: 28~32px
- 섹션 제목과 본문: 12~16px
- row 내부: 12~16px
- 데이터 rail cell: 12~14px
- 설명 영역 상하: 12~16px

규칙:
- 모바일 화면 높이는 비용으로 간주한다.
- 단순 통계 영역이 120px 이상 차지하지 않도록 한다.
- 반복 설명은 펼침 상태가 아니라 선택/접기 구조를 우선한다.

## 4. Radius / Shadow / Divider
Radius:
- Small: 8px
- Medium: 12px
- Large: 16~18px
- pill은 status/chip에만 사용

Shadow:
- 기본 섹션에는 shadow 사용 금지
- floating popover / modal / 필요한 강조 카드만 매우 약하게 허용

Divider:
- 구조 구분은 카드 대신 1px divider + whitespace를 우선
- 리스트/ledger/timeline은 divider 기반이 기본

## 5. 공통 컴포넌트 규격
### Page Header
- kicker + title + optional status
- 하단 divider
- 설명은 필요한 경우 1~2줄만 노출

### Hero Metric
- 가장 중요한 숫자 1개
- 보조 수치는 최대 1~2개
- 큰 카드보다는 공간과 타이포로 강조

### Data Rail
- 3~4개 보조 지표를 한 줄로 정렬
- 모바일에서는 2열 또는 가로 스크롤보다 2x2 compact grid를 우선
- 개별 카드 금지

### Editorial List Row
- title / meta / status / action
- 높이 52~64px
- row 사이 divider

### Process Rail
- 단계 번호 + 짧은 제목
- 현재 단계 강조
- 설명은 현재/선택 단계 1개만 별도 표시

### Timeline / Ledger
- 시간 / 판단 / 변동 / 평가금액 순서 우선
- 동일한 데이터 계열만 한 타임라인에 배치
- 시장 상태 변화 기록과 최근 손익 반영 기록을 혼합하지 않는다.

### Fold Section
- header row + 상태/건수 + 펼치기
- 접힌 상태에서도 핵심 요약 노출
- 펼침 애니메이션은 180~220ms 내

## 6. Button / Input / State
Primary button:
- 높이 44~48px
- radius 10~12px
- midnight/navy 면 사용
- 텍스트 12~13px / 750~800

Secondary:
- white surface + divider border

Disabled:
- opacity만 낮추지 말고 text/border/background 모두 muted state
- 클릭 불가 상태 명확히

Focus:
- 2~3px 외곽 링 또는 border 강조
- 접근성 유지

상태:
- badge 남발 금지
- 텍스트 + 작은 dot/line 방식 우선
- LIVE/DONE/WAITING 같은 상태는 페이지당 1차 표현을 하나로 통일

## 7. Motion System
허용:
- fold open/close
- active nav indicator
- progress fill
- loading skeleton
- 상태 dot의 아주 약한 pulse

금지:
- 카드 hover lift
- 장식성 floating
- 끊임없는 rotation/glow
- confetti / particle

타이밍:
- fast 140ms
- standard 200~220ms
- slow 500~650ms

`prefers-reduced-motion: reduce`에서 animation/transition 최소화.

## 8. 페이지별 구조 원칙
### 실시간 이벤트
- 현재 회차를 dominant hero로
- 상단 통계는 compact data rail
- 나머지 회차는 editorial list
- 안내 전문은 유지하되 기본 화면에서는 요약 + 펼침 구조 검토

### 출석
- 30칸 기능 유지
- 엑셀 표처럼 보이지 않게 5~6열 calendar rhythm
- 완료 셀은 얇은 원형 stamp/ink mark를 명확히 표시
- 현재 진행률과 남은 횟수는 한 영역에서 통합
- 30회 보상 지점을 마지막 셀/하단 note에서 강조

### AI 대기/예약
- 상태/가능횟수/기간/예상수익률을 compact hero + data rail
- 6개 설명은 process rail + 선택 설명 1개
- 이용절차는 vertical timeline: 번호 → 제목 → 한 줄 설명
- 상담 안내는 마지막 CTA 영역 하나로 제한

### AI 진행/완료
- 평가금액이 화면 최상위
- 누적수익률 보조
- 투자금/수익/진행률/남은시간/기간은 data rail
- 완료 상태 진행률 표시는 100%, 계산값 자체는 변경하지 않는다.
- 최근 반영은 timeline
- 시장 탐색과 상태 변화 기록은 각각 fold

### 상품지급센터
- 메시지 앱이 아니라 private reward ledger로 보이게 한다.
- 상단 요약은 미확인/지급상품/전체안내 compact rail
- 실제 지급 기록/안내 항목이 중심
- 지급 메시지 기능과 실시간 구독은 그대로 유지
- 존재하지 않는 지급 상태/날짜를 임의 생성하지 않는다.

## 9. 모바일 QA 규칙
360 / 390 / 430px에서 확인할 항목:
- 텍스트 말줄임으로 핵심 숫자가 잘리지 않는지
- 두 줄 이상 제목이 레이아웃을 밀지 않는지
- 44px 이상 터치 영역
- 각 섹션이 화면 높이를 과도하게 사용하지 않는지
- 한 줄 통계가 4개일 때 강제 압축되지 않는지
- 표/ledger가 가로 스크롤 없이 이해 가능한지
- 출석 30칸 stamp가 식별 가능한지
- Process Rail 단계명이 찢어지지 않는지
- 상품지급센터 내부 중첩 스크롤을 최소화하는지

정확한 viewport 렌더링 검증은 구현 단계의 완료 게이트이며, 확인하지 못한 상태에서 QA 완료라고 기록하지 않는다.

## 10. 구현 전략
4차 이후에는 기존 18개 CSS import와 Bridge를 먼저 대조한다.

원칙:
1. 새 override 파일을 계속 쌓지 않는다.
2. 새 디자인이 반복적으로 기존 규칙에 막히면 원본 JSX/module CSS를 정리한다.
3. Bridge가 기능을 담당하면 즉시 삭제하지 말고 기능을 React 원본에 이식한 뒤 제거한다.
4. 기능/데이터/API/Supabase/인증은 수정하지 않는다.
5. 각 화면 하나씩 완성하고 실제 렌더링 검수 후 다음 화면으로 진행한다.

## 3차 완료 판정
공통 컬러, typography, spacing, radius, divider, button/state, motion, numeric alignment, mobile rule 및 화면별 구조 원칙을 확정했다. 운영 코드와 기능은 수정하지 않았다.

다음 단계: 4차 이벤트 화면 구현 및 검수. 4차는 실제 소스 변경 단계이며 시작 전 현재 브랜치와 기존 CSS 충돌 구조를 다시 확인한다.
