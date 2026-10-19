# Eight-screen reference rebuild

Baseline: production dpl_FodEikhV3pMMeWq1VVdAuS8W24yg / 3c04ffab21e22aa7bcf8f092574578a564bd2220.

New UI: app/member, independently scoped CSS. Existing V2/V3 UI remains available as recovery source; no legacy presentation bridges loaded by new member UI.

Preserved contracts: member-entry session, approved profiles, get_auto_events, join_auto_event (all six types), get_daily_attendance_status, check_daily_attendance, ai_process_members, V3 buildSnapshot arithmetic/anchor adjustments, market-sim, private_messages and existing chat/read RPCs.

Live schema checked: attendance is 30 per cycle; event prize field is `prize`; no participant count returned. No fabricated counts or prizes. One process row per member in current contract. Tabs show actual row, not invented history. Reward delivered means GIFT_REWARD payload; other messages are 안내 확인, not a fabricated fulfillment state.

Screens: home, real-time event, attendance, process dashboard, process detail, reflection history (100 / 10 per page), stock/coin statuses, reward center. Profile is a keyboard-accessible bottom sheet. Graph range selection uses existing arithmetic with a larger history projection; default calculation unchanged.

## Verification
- Build passed with public Supabase client configuration. Fixed a pre-existing bare `*` selector in /rebuild CSS module that blocked compilation.
- 12 arithmetic parity cases: 1h/24h/720h, running/completed, with/without profit anchors. All default snapshot fields match V3 exactly.
- Browser fixture verification: 8 screens + profile; no page errors; six event types sent expected RPC arguments; attendance button/state; 100 reflection records with 10-page boundary; stock filter; Escape closes profile.
- Approved/unapproved/login/logout checked with isolated browser fixtures, not live member mutations.
- Live Supabase read-only inspection confirms event RPC fields and 30-count attendance function. No schema, SQL function, calculation setting, member money, event entry or attendance record changed.
- Browser test data and test harness are outside app routes and not deployed.
