'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabase';
import styles from './admin.module.css';

function avatarSrc(value) {
  const raw = String(value || '01');
  if (raw === 'admin') return '/avatars/admin.png.png';
  const key = raw.padStart(2, '0');
  return /^\d{2}$/.test(key) && Number(key) >= 1 && Number(key) <= 43 ? `/avatars/${key}.png` : '/avatars/01.png';
}

export default function AdminMembers({ user, onNotice, onStats }) {
  const [rows, setRows] = useState([]);
  const [pushStatus, setPushStatus] = useState({});
  const [search, setSearch] = useState('');
  const [working, setWorking] = useState(false);
  const [registerNickname, setRegisterNickname] = useState('');
  const [registerName, setRegisterName] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => `${row.nickname || ''} ${row.real_name || ''}`.toLowerCase().includes(q));
  }, [rows, search]);

  useEffect(() => { void load(); }, []);

  async function load() {
    const [{ data, error }, { data: rewards }, { data: pushes }] = await Promise.all([
      supabase.rpc('get_admin_approval_list'),
      supabase.rpc('admin_get_reward_account_types'),
      supabase.rpc('admin_get_member_push_statuses'),
    ]);
    if (error) { onNotice(`회원 목록 불러오기 실패: ${error.message}`); return; }
    const rewardMap = Object.fromEntries((rewards || []).map((r) => [String(r.member_id), r.reward_account_type || 'real']));
    const sorted = [...(data || [])]
      .map((r) => ({ ...r, reward_account_type: rewardMap[String(r.member_id)] || r.reward_account_type || 'real' }))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const pushMap = {};
    (pushes || []).forEach((r) => { pushMap[String(r.member_id)] = { enabled: Boolean(r.push_enabled), deviceCount: Number(r.device_count || 0) }; });
    setRows(sorted); setPushStatus(pushMap);
    onStats?.({ totalMembers: sorted.length, pendingMembers: sorted.filter((r) => String(r.approval_status) === '0').length });
  }

  async function setApproval(member, status) {
    if (!member?.member_id || working) return;
    const action = status === '1' ? '승인' : '승인 해제';
    if (!window.confirm(`${member.nickname || '회원'}님의 회원 상태를 ${action}하시겠습니까?`)) return;
    setWorking(true);
    const { error } = await supabase.rpc('admin_set_member_approval', { target_member_id: member.member_id, target_approval_status: status });
    if (error) onNotice(`${action} 실패: ${error.message}`);
    else { onNotice(`${member.nickname || '회원'}님 ${action} 완료`); await load(); }
    setWorking(false);
  }

  async function approveAll() {
    const count = rows.filter((r) => String(r.approval_status) === '0').length;
    if (!count) { onNotice('현재 승인 대기 회원이 없습니다.'); return; }
    if (!window.confirm(`승인 대기 회원 ${count}명을 모두 승인하시겠습니까?`)) return;
    setWorking(true);
    const { error } = await supabase.rpc('admin_approve_all_pending_members');
    if (error) onNotice(`전체 승인 실패: ${error.message}`);
    else { onNotice(`승인 대기 회원 ${count}명을 승인했습니다.`); await load(); }
    setWorking(false);
  }

  async function changeRewardType(member, nextType) {
    setWorking(true);
    const { data, error } = await supabase.rpc('admin_set_reward_account_type', { p_member_id: member.member_id, p_account_type: nextType });
    if (error || data !== nextType) onNotice(`지급 유형 변경 실패: ${error?.message || '서버 확인 실패'}`);
    else { onNotice(nextType === 'virtual' ? '가상 지급 계정으로 변경했습니다.' : '실제 지급 계정으로 변경했습니다.'); await load(); }
    setWorking(false);
  }

  async function editIdentity(member) {
    const nickname = window.prompt('변경할 닉네임', member.nickname || '');
    if (nickname === null) return;
    const realName = window.prompt('변경할 성함', member.real_name || '');
    if (realName === null) return;
    if (!nickname.trim() || !realName.trim()) { onNotice('닉네임과 성함을 모두 입력해주세요.'); return; }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const response = await fetch('/api/admin/member-profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify({ memberId: member.member_id, nickname: nickname.trim(), realName: realName.trim() }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.success) onNotice(`회원정보 변경 실패: ${result?.error || '요청 실패'}`);
    else { onNotice('회원 닉네임/성함을 변경했습니다.'); await load(); }
  }

  async function changePassword(member) {
    const password = window.prompt(`${member.nickname || '회원'}님의 새 비밀번호를 입력해주세요.`);
    if (password === null) return;
    if (password.length < 4) { onNotice('비밀번호는 4자리 이상 입력해주세요.'); return; }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const response = await fetch('/api/admin/member-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
      body: JSON.stringify({ memberId: member.member_id, newPassword: password }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.success) onNotice(`비밀번호 변경 실패: ${result?.error || '요청 실패'}`);
    else onNotice(`${member.nickname || '회원'}님의 비밀번호를 변경했습니다.`);
  }

  async function kick(member) {
    if (String(member.member_id) === String(user?.id)) return;
    if (!window.confirm(`${member.nickname || '회원'}님을 그룹방에서 퇴장시키고 승인을 해제할까요?`)) return;
    const { error } = await supabase.rpc('admin_kick_member', { target_member_id: member.member_id });
    if (error) onNotice(`회원 퇴장 실패: ${error.message}`);
    else { onNotice(`${member.nickname || '회원'}님을 퇴장 처리했습니다.`); await load(); }
  }

  async function registerMember(event) {
    event.preventDefault();
    if (!registerNickname.trim() || !registerName.trim()) return;
    setWorking(true);
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ nickname: registerNickname.trim(), realName: registerName.trim() }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) onNotice(`회원 등록 실패: ${result?.error || '요청 실패'}`);
    else { setRegisterNickname(''); setRegisterName(''); onNotice('회원 등록이 완료되었습니다.'); await load(); }
    setWorking(false);
  }

  return <>
    <section className={styles.section}>
      <div className={styles.sectionHead}><div><span>MEMBER CONTROL</span><strong>회원 승인·계정 관리</strong><p>승인, 지급 유형, 회원정보, 비밀번호, 퇴장 기능을 한곳에서 관리합니다.</p></div><div className={styles.toolbar}><button className={styles.buttonSoft} onClick={load}>새로고침</button><button className={styles.buttonPrimary} onClick={approveAll} disabled={working}>대기 전체 승인</button></div></div>
      <form className={styles.toolbar} onSubmit={registerMember} style={{marginBottom:10}}><input className={styles.input} placeholder="오픈방 닉네임" value={registerNickname} onChange={(e)=>setRegisterNickname(e.target.value)} /><input className={styles.input} placeholder="성함" value={registerName} onChange={(e)=>setRegisterName(e.target.value)} /><button className={styles.button} disabled={working}>회원 직접 등록</button><input className={styles.search} placeholder="회원 검색" value={search} onChange={(e)=>setSearch(e.target.value)} /></form>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>회원</th><th>승인</th><th>지급 유형</th><th>알림</th><th>가입일</th><th>관리</th></tr></thead><tbody>{filtered.map((m)=>{
        const approved=String(m.approval_status)==='1'; const push=pushStatus[String(m.member_id)] || {enabled:false,deviceCount:0};
        return <tr key={m.member_id}><td><div className={styles.memberCell}><img className={styles.avatar} src={avatarSrc(m.avatar)} alt=""/><div><strong>{m.nickname || 'VIP 회원'}</strong><span className={styles.sub}>{m.real_name || '-'}</span></div></div></td><td><span className={approved?styles.badgeGreen:styles.badgeRed}>{approved?'승인 완료':'승인 대기'}</span></td><td><select className={styles.select} value={m.reward_account_type || 'real'} disabled={working} onChange={(e)=>changeRewardType(m,e.target.value)}><option value="real">실제 지급</option><option value="virtual">가상 지급</option></select></td><td><span className={push.enabled?styles.badgeBlue:styles.badgeGray}>{push.enabled?`ON · ${push.deviceCount}대`:'OFF'}</span></td><td>{m.created_at?new Date(m.created_at).toLocaleDateString('ko-KR'):'-'}</td><td><div className={styles.actions}>{approved?<button className={`${styles.mini} ${styles.miniDanger}`} onClick={()=>setApproval(m,'0')} disabled={working}>승인해제</button>:<button className={`${styles.mini} ${styles.miniPrimary}`} onClick={()=>setApproval(m,'1')} disabled={working}>승인</button>}<button className={styles.mini} onClick={()=>editIdentity(m)}>정보수정</button><button className={styles.mini} onClick={()=>changePassword(m)}>비밀번호</button><button className={`${styles.mini} ${styles.miniDanger}`} onClick={()=>kick(m)} disabled={String(m.member_id)===String(user?.id)}>퇴장</button></div></td></tr>;
      })}</tbody></table></div>
    </section>
  </>;
}
