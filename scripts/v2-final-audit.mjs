import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
  const rel = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(rel) : [rel];
});

const v2Files = walk('app/v2').filter((p) => /\.(js|css)$/.test(p));
const v2Source = v2Files.map(read).join('\n');
const legacy = read('app/page.js');
const failures = [];
const check = (label, condition) => {
  if (!condition) failures.push(label);
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}`);
};

const requiredFiles = [
  'app/v2/page.js',
  'app/v2/V2LiveClientStage2.js',
  'app/v2/V2RewardBridge.js',
  'app/v2/V2AdminBridge.js',
  'app/v2/V2CompatibilityLayer.js',
  'app/v2/v2-compat.module.css',
  'app/v2/reward/RewardLiveClient.js',
  'app/v2/admin/AdminLiveClient.js',
  'app/v2/admin/AdminMembers.js',
  'app/v2/admin/AdminAiProcess.js',
  'app/v2/admin/AdminRewards.js',
  'app/v2/admin/AdminMessages.js',
  'app/v2/admin/AdminOperations.js',
];
for (const file of requiredFiles) check(`file ${file}`, fs.existsSync(path.join(root, file)));

const v2Tokens = [
  '/api/auth/member-entry', '/api/auth/login-lookup', '/api/auth/signup',
  'mark_my_welcome_popup_seen', '/api/push/sync-subscription',
  'get_my_private_unread_count', 'setAppBadge', 'beforeinstallprompt',
  'get_auto_events', 'join_auto_event', 'get_daily_attendance_status', 'check_daily_attendance',
  'ai_process_members', 'getMemberProcessSnapshot', 'private_messages', 'mark_private_chat_read',
  'chat-media', 'admin_set_member_approval', 'admin_approve_all_pending_members',
  'admin_save_ai_process_member_preserving_profit', 'admin_adjust_ai_process_profit',
  'admin_bulk_add_gift_inventory', 'admin_bulk_add_ai_gift_inventory', 'admin_bulk_add_attendance_gift_inventory',
  'admin_delete_all_gift_inventory', 'admin_delete_all_available_ai_gift_inventory', 'admin_delete_all_attendance_gift_inventory',
  '/api/admin/member-profile', '/api/admin/member-password', '/api/push/private-message',
];
for (const token of v2Tokens) check(`V2 contract ${token}`, v2Source.includes(token));

check('V2 does not import blueTheme', !v2Source.includes('blueTheme'));
check('legacy group chat remains disabled by config', legacy.includes('const GROUP_CHAT_ENABLED = false'));
check('legacy group send logic preserved', legacy.includes('send_group_message'));
check('legacy AI chat route preserved', legacy.includes('/api/ai-chat'));
check('legacy market-sim route preserved', legacy.includes('/api/market-sim'));
check('responsive media rules exist', v2Source.includes('@media'));
check('mobile visualViewport stabilization exists', v2Source.includes('visualViewport'));

console.log(`\nChecked ${requiredFiles.length + v2Tokens.length + 7} conditions; failures: ${failures.length}`);
if (failures.length) {
  console.error('\nFailures:\n' + failures.map((x) => `- ${x}`).join('\n'));
  process.exit(1);
}
