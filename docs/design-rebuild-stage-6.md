# 디자인 재설계 6차 — AI PROCESS Financial Editorial

기준 브랜치: design/financial-ui-rebuild-20261019
5차 기준 커밋: 08e5ca565f873b2cb017f7dcd6a8551f13a686db

STAGE_6_STATUS: IMPLEMENTED_WITH_DEFERRED_RENDER_QA

## 보존 범위
- AI PROCESS 계산, 수익, 3분 반영, 투자/평가금액 데이터 로직 변경 없음.
- 시장 데이터 조회와 8개 자산 데이터 의미 변경 없음.
- 인증/API/DB/Supabase/관리자 기능 변경 없음.
- 기존 안내 문구의 의미와 기능 버튼 동작 변경 없음.

## 구현
- 대기/예약 화면: midnight compact hero와 2열 data rail로 상태/가능횟수/기간/예상수익률의 위계를 정리.
- 6단계 설명: 기존 V2AiCompactBridge를 유지하면서 6칸 process rail + 선택 단계 설명 1개 구조로 시각 정리.
- 이용 절차: 모바일에서 번호/제목/설명이 찢어지지 않도록 vertical timeline 계층으로 정리.
- 진행/완료 화면: 평가금액을 최상위 hero metric, 누적수익률을 보조 핵심 지표로 두고 투자금/수익/진행률/남은시간/기간을 compact data rail로 정리.
- 완료 상태: V2CompletedProgressBridge가 표시용 진행률만 100%로 보정한다. 수익 계산값 및 snapshot 계산은 수정하지 않는다.
- 시장 탐색/상태 변화/그래프/최근 반영: 기존 fold와 history 분리 기능을 유지하고 카드 그림자/중첩 배경을 줄여 ledger/timeline 중심으로 정리.
- tabular numeric, divider, restrained steel/navy accent, reduced-motion 규칙을 적용.

## 활성화
`ai-financial-stage6.css`와 `V2CompletedProgressBridge`가 파일만 존재하고 layout에 연결되지 않은 상태를 확인해 `app/v2/layout.js`에 명시적으로 연결했다. 따라서 6차 스타일과 완료 진행률 표시 보정이 실제 v2 화면 트리에 적용된다.

## CSS 구조 판단
기존 CSS 누적이 많은 점은 확인했다. 이번 6차 파일은 AI 페이지에 강하게 scope된 전환 레이어로만 사용했다. 기존 v10~v16 AI 규칙을 한 번에 삭제/병합하면 기능 bridge와 cascade 회귀 위험이 커 현재 단계에서는 제거하지 않았다. 최종 통합 단계에서 중복 규칙을 module CSS로 흡수하고 stage 전환 레이어를 제거하는 청소 작업이 필요하다.

## 소스 기준 회귀 검토
- `V2LiveClientStage2.js`의 계산 함수, Supabase 호출, 시장 feed, 3분 상수 수정 없음.
- 기존 V2AiCompactBridge / V2AiRunningOrderBridge 유지.
- 완료 진행률 보정은 DOM 표시값만 대상으로 하고 계산 데이터는 건드리지 않음.
- 이벤트/출석/상품지급센터 기능 코드 수정 없음.

## 미검증
현재 도구에서는 로그인된 운영 화면을 360/390/430px viewport로 직접 캡처 비교할 수 없어 실제 줄바꿈, 광학 밀도, CSS cascade 결과는 QA 완료로 표기하지 않는다. 배포 후 실제 모바일 렌더링 검증이 필요하다.

다음 단계: 7차 상품지급센터를 Private Reward Ledger 구조로 구현한다. 실제 지급 데이터와 메시지 기능은 보존한다.
