# 디자인 재설계 5차 — 출석 Editorial Attendance Calendar

기준 브랜치: design/financial-ui-rebuild-20261019
4차 기준 커밋: 48ab2f493ed786c48f5b84d01a79a9b6b0b8b0f2

STAGE_5_STATUS: IMPLEMENTED_WITH_DEFERRED_RENDER_QA

## 보존 범위
- 누적 30회 출석 계산과 매일 1회 규칙 변경 없음.
- `attendanceStatus.checked_today` 및 `attendanceWorking`에 따른 disabled 동작 변경 없음.
- 완료 셀 판정(`index < attendanceCycle`)과 기존 체크 마크 DOM 변경 없음.
- 3,000원 ~ 500,000원 상당 랜덤 기프티콘 안내 문구와 상품지급센터 안내 변경 없음.
- 인증/API/DB/Supabase/관리자 기능 변경 없음.

## 구현
- 30칸은 모바일에서도 6열 x 5행 rhythm을 유지해 전체 목표를 한눈에 볼 수 있게 정리.
- 완료 셀은 muted amber ink 스타일의 원형 stamp를 복구해 날짜 숫자와 완료 상태가 동시에 식별되도록 구성.
- 출석 제목, 현재 횟수, 진행 bar, 남은 횟수를 하나의 compact hierarchy로 통합.
- 기존 큰 카드/그림자를 제거하고 divider와 whitespace 중심의 editorial surface로 변경.
- 오늘 출석 버튼은 기존 동작을 유지하며 완료/처리중 disabled 상태를 별도 muted surface로 명확화.
- 전체 안내 전문은 삭제하지 않고 calendar보다 낮은 시각 우선순위로 배치.

## CSS 구조
기존 CSS가 이미 18개 누적된 상태이므로 새 레이어 추가는 장기적으로 바람직하지 않다. 이번 단계에서는 기능 코드와 기존 v16을 위험하게 전량 교체하지 않기 위해 `attendance-editorial-stage5.css` 한 파일만 마지막에 명시적으로 scope하여 적용했다. 최종 통합 단계에서 v16/attendance 규칙을 원본 module CSS로 흡수하고 임시 stage 파일을 제거하는 것을 청소 항목으로 남긴다.

## 회귀 검토
소스 기준 확인:
- 출석 계산식/JSX/버튼 handler 수정 없음.
- 완료 stamp DOM 유지.
- 30개 셀 유지.
- 보상 금액/안내 문구 유지.
- event/live UI의 class scope 밖에는 적용하지 않음.

미검증:
- 현재 도구에서는 로그인된 운영 화면을 360/390/430px로 직접 렌더링 캡처해 비교하지 못했다.
- 따라서 모바일 줄바꿈, 실제 stamp 광학 크기, 브라우저별 CSS cascade는 `QA 완료`로 표기하지 않는다.

다음 단계: 6차 AI PROCESS 대기/진행 화면 구현. 기능과 계산값은 그대로 두고 hero/data rail/process rail/fold/timeline 구조만 정리한다.
