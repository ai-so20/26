# Eight-screen reference rebuild

Baseline: production dpl_FodEikhV3pMMeWq1VVdAuS8W24yg / 3c04ffab21e22aa7bcf8f092574578a564bd2220.

New UI: app/member, independently scoped CSS. Existing V2/V3 UI remains available as recovery source; no legacy presentation bridges loaded by new member UI.

Preserved contracts: member-entry session, approved profiles, get_auto_events, join_auto_event (all six types), get_daily_attendance_status, check_daily_attendance, ai_process_members, V3 buildSnapshot arithmetic/anchor adjustments, market-sim, private_messages and existing chat/read RPCs.

Live schema checked: attendance is 30 per cycle; event prize field is `prize`; no participant count returned. No fabricated counts or prizes. One process row per member in current contract. Tabs show actual row, not invented history. Reward delivered means GIFT_REWARD payload; other messages are 안내 확인, not a fabricated fulfillment state.

Screens: home, real-time event, attendance, process dashboard, process detail, reflection history (100 / 10 per page), stock/coin statuses, reward center. Profile is a keyboard-accessible bottom sheet. Graph range selection uses existing arithmetic with a larger history projection; default calculation unchanged.
