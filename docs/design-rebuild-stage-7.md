# 디자인 재설계 7차 — 상품지급센터 Private Reward Ledger

기준 브랜치: design/financial-ui-rebuild-20261019
6차 기준 커밋: 42d8d0116b568910db406df4e67637c1a3618d10

STAGE_7_STATUS: IMPLEMENTED_WITH_DEFERRED_RENDER_QA

## 보존 범위
- 상품 지급 메시지, 일반/특수 메시지, 기프티콘 링크, 안전 URL 검증 로직 변경 없음.
- 실시간 구독, 읽음 처리, 전송 중/전송됨/읽음 상태 로직 변경 없음.
- 미확인 안내/지급 상품/전체 안내 집계 로직 변경 없음.
- 이벤트/출석 보상 금액 및 안내 문구 변경 없음.
- 인증/API/DB/Supabase/관리자 기능 변경 없음.

## 구현
- 상단 3개 지표를 큰 카드가 아닌 compact data rail로 변경.
- 지급 영역은 rounded chat card가 아니라 divider 기반 ledger section으로 재구성.
- 내부 고정 높이/중첩 스크롤을 제거하고 페이지 흐름 안에서 지급 기록이 이어지도록 변경.
- 실제 메시지/지급 기록을 환영/혜택 안내보다 먼저 보이게 CSS order로 우선순위 조정. 내용은 삭제하지 않음.
- 일반 메시지는 말풍선이 아닌 ledger row로 보이도록 sender / content / time/read-state 계층을 재설계.
- 기프티콘 지급 메시지는 muted violet signal line + 상품명 + 확인 버튼 구조로 정리. 퍼플 대면적 사용 금지.
- 환영/혜택/알림 안내는 하단 보조 정보로 압축하고 기존 전문은 유지.
- empty/loading/error 상태를 짧은 금융형 상태 영역으로 정리.
- 390/430px에서 summary, meta, record row가 찢어지지 않도록 모바일 규칙 추가.

## 활성화
`reward-ledger-stage7.css`를 생성하고 `app/v2/layout.js` 마지막 디자인 레이어로 연결했다.

## 소스 기준 회귀 검토
- `RewardLiveClient.js`의 Supabase query/insert/RPC/realtime 코드는 수정하지 않음.
- 메시지 배열과 giftCount 계산 수정 없음.
- 기프티콘/링크/이미지 렌더링 분기 수정 없음.
- 지급 데이터가 없는 경우 임의 상품/상태/날짜 생성 없음.

## 미검증
현재 도구에서는 로그인된 운영 화면을 360/390/430px 실제 viewport로 직접 캡처해 광학 밀도와 CSS cascade를 비교하지 못했다. 따라서 실제 렌더링 QA 완료로 표기하지 않는다.

다음 단계: 8차 최종 통합/청소. stage5~7 전환 레이어와 v10~v16 누적 CSS 중 중복 가능한 부분을 정리하고, 기능 bridge는 기능 이식 근거가 있을 때만 제거한다. 최종 모바일 spacing/motion/icon/system consistency를 점검한다.
