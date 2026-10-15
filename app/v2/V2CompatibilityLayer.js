'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';
import styles from './v2-compat.module.css';

async function legacyEmail(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `vip-${hash}@example.com`;
}

function normalizePasswordInput(value) {
  const initial = ['r','R','s','e','E','f','a','q','Q','t','T','d','w','W','c','z','x','v','g'];
  const medial = ['k','o','i','O','j','p','u','P','h','hk','ho','hl','y','n','nj','np','nl','b','m','ml','l'];
  const final = ['','r','R','rt','s','sw','sg','e','f','fr','fa','fq','ft','fx','fv','fg','a','q','qt','t','T','d','w','c','z','x','v','g'];
  const jamo = {'ㄱ':'r','ㄲ':'R','ㄴ':'s','ㄷ':'e','ㄸ':'E','ㄹ':'f','ㅁ':'a','ㅂ':'q','ㅃ':'Q','ㅅ':'t','ㅆ':'T','ㅇ':'d','ㅈ':'w','ㅉ':'W','ㅊ':'c','ㅋ':'z','ㅌ':'x','ㅍ':'v','ㅎ':'g','ㅏ':'k','ㅐ':'o','ㅑ':'i','ㅒ':'O','ㅓ':'j','ㅔ':'p','ㅕ':'u','ㅖ':'P','ㅗ':'h','ㅘ':'hk','ㅙ':'ho','ㅚ':'hl','ㅛ':'y','ㅜ':'n','ㅝ':'nj','ㅞ':'np','ㅟ':'nl','ㅠ':'b','ㅡ':'m','ㅢ':'ml','ㅣ':'l'};
  let result = '';
  for (const ch of String(value || '')) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const offset = code - 0xac00;
      const first = Math.floor(offset / 588);
      const middle = Math.floor((offset % 588) / 28);
      const last = offset % 28;
      result += initial[first] + medial[middle] + final[last];
    } else result += jamo[ch] || ch;
  }
  return result.toLowerCase();
}

function toUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function modal(children, onClose) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={styles.backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={styles.modal}>{children}</div>
    </div>,
    document.body,
  );
}

export default function V2CompatibilityLayer() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [entryTarget, setEntryTarget] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);
  const [rewardTarget, setRewardTarget] = useState(null);
  const [bellTarget, setBellTarget] = useState(null);
  const [unread, setUnread] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accessMode, setAccessMode] = useState('');
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupNickname, setSignupNickname] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const standalone = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true);
  }, [user?.id]);

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser?.id) { setProfile(null); setShowWelcome(false); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    setProfile(data || null);
    if (data?.role !== 'admin' && data?.approval_status === '1' && data?.welcome_popup_seen !== true) setShowWelcome(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const next = data?.session?.user || null;
      setUser(next);
      void loadProfile(next);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user || null;
      setUser(next);
      void loadProfile(next);
    });
    return () => { mounted = false; authListener?.subscription?.unsubscribe?.(); };
  }, [loadProfile]);

  useEffect(() => {
    const scan = () => {
      const form = !user ? document.querySelector('main form') : null;
      if (form !== entryTarget) setEntryTarget(form);
      const logoutButton = [...document.querySelectorAll('button')].find((button) => String(button.textContent || '').trim() === '로그아웃');
      const popover = user ? logoutButton?.parentElement || null : null;
      if (popover !== profileTarget) setProfileTarget(popover);
      const nav = document.querySelector('nav[aria-label="주요 메뉴"]');
      const reward = user && nav ? [...nav.querySelectorAll('button')].find((button) => String(button.textContent || '').trim().startsWith('상품 지급')) || null : null;
      if (reward !== rewardTarget) setRewardTarget(reward);
      const bell = user ? document.querySelector('button[aria-label="알림"]') : null;
      if (bell !== bellTarget) setBellTarget(bell);
    };
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [user, entryTarget, profileTarget, rewardTarget, bellTarget]);

  const syncBadge = useCallback((count) => {
    const safe = Math.max(0, Number(count || 0));
    try {
      if (safe > 0 && typeof navigator.setAppBadge === 'function') void navigator.setAppBadge(safe).catch(() => {});
      else if (safe === 0 && typeof navigator.clearAppBadge === 'function') void navigator.clearAppBadge().catch(() => {});
    } catch {}
  }, []);

  const loadUnread = useCallback(async () => {
    if (!user?.id || profile?.role === 'admin') { setUnread(0); syncBadge(0); return; }
    const { data, error } = await supabase.rpc('get_my_private_unread_count');
    if (error) return;
    const count = Math.min(999, Number(data || 0));
    setUnread(count);
    syncBadge(count);
  }, [user?.id, profile?.role, syncBadge]);

  useEffect(() => {
    if (!user?.id) return;
    void loadUnread();
    const timer = window.setInterval(loadUnread, 15000);
    const refresh = () => { if (document.visibilityState === 'visible') void loadUnread(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [user?.id, loadUnread]);

  const syncExistingPush = useCallback(async () => {
    if (!user?.id || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setPushEnabled(false); return false; }
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) { setPushEnabled(false); return false; }
      const subscription = await registration.pushManager.getSubscription();
      const enabled = Notification.permission === 'granted' && Boolean(subscription);
      if (enabled) {
        const json = subscription.toJSON();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (token && json.endpoint && json.keys?.p256dh && json.keys?.auth) {
          const response = await fetch('/api/push/sync-subscription', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, cache: 'no-store',
            body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, userAgent: navigator.userAgent }),
          });
          if (!response.ok) { setPushEnabled(false); return false; }
        }
      }
      setPushEnabled(enabled);
      return enabled;
    } catch { setPushEnabled(false); return false; }
  }, [user?.id]);

  useEffect(() => { if (user?.id) void syncExistingPush(); }, [user?.id, syncExistingPush]);

  const enableNotifications = useCallback(async () => {
    if (!user?.id) return false;
    if (isIOS() && !standalone) { setShowInstallGuide(true); setNotice('아이폰은 홈 화면에 추가한 뒤 앱 아이콘으로 실행해야 알림을 켤 수 있습니다.'); return false; }
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setNotice('현재 기기 또는 브라우저에서는 알림을 사용할 수 없습니다.'); return false; }
    try {
      let permission = Notification.permission;
      if (permission === 'default') permission = await Notification.requestPermission();
      if (permission !== 'granted') { setPushEnabled(false); setNotice(permission === 'denied' ? '알림 권한이 차단되어 있습니다. 브라우저 또는 휴대폰 설정에서 알림을 허용해주세요.' : '알림 권한이 허용되지 않았습니다.'); return false; }
      const registration = await navigator.serviceWorker.register('/sw.js?v=20261015-v2-final', { scope: '/', updateViaCache: 'none' });
      await registration.update().catch(() => {});
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) throw new Error('VAPID 공개키가 설정되지 않았습니다.');
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(publicKey) });
      }
      const json = subscription.toJSON();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token || !json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('푸시 구독 정보를 확인하지 못했습니다.');
      const response = await fetch('/api/push/sync-subscription', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, cache: 'no-store',
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, userAgent: navigator.userAgent }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || '푸시 구독 저장에 실패했습니다.');
      setPushEnabled(true); setNotice('알림이 정상적으로 켜졌습니다.'); return true;
    } catch (error) { setPushEnabled(false); setNotice(`알림 설정 실패: ${error?.message || '알 수 없는 오류'}`); return false; }
  }, [user?.id, standalone]);

  useEffect(() => {
    if (!bellTarget) return;
    const handler = (event) => { event.preventDefault(); event.stopPropagation(); void enableNotifications(); };
    bellTarget.addEventListener('click', handler, true);
    bellTarget.title = pushEnabled ? '알림 ON' : '알림 켜기';
    return () => bellTarget.removeEventListener('click', handler, true);
  }, [bellTarget, enableNotifications, pushEnabled]);

  useEffect(() => {
    const handler = (event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const update = () => {
      const shell = document.querySelector('main > section');
      if (!shell || window.innerWidth > 520) return;
      const height = window.visualViewport?.height || window.innerHeight;
      if (height > 0) { shell.style.minHeight = `${Math.round(height)}px`; shell.style.maxWidth = '100vw'; }
    };
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => { window.visualViewport?.removeEventListener('resize', update); window.removeEventListener('orientationchange', update); };
  }, [user?.id]);

  async function installApp() {
    if (standalone) { setNotice('이미 홈 화면 앱으로 실행 중입니다.'); return; }
    if (installPrompt) {
      try { await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); return; } catch {}
    }
    setShowInstallGuide(true);
  }

  async function closeWelcome() {
    setShowWelcome(false);
    if (!user?.id) return;
    const { error } = await supabase.rpc('mark_my_welcome_popup_seen');
    if (!error) setProfile((current) => current ? { ...current, welcome_popup_seen: true } : current);
  }

  async function changePassword(event) {
    event.preventDefault();
    const clean = normalizePasswordInput(newPassword);
    const confirm = normalizePasswordInput(newPasswordConfirm);
    if (clean.length < 4) { setNotice('새 비밀번호는 4자리 이상 입력해주세요.'); return; }
    if (clean !== confirm) { setNotice('새 비밀번호 확인이 일치하지 않습니다.'); return; }
    setWorking(true);
    const { error } = await supabase.auth.updateUser({ password: `VIP!${clean}` });
    setWorking(false);
    if (error) { setNotice(`비밀번호 변경 실패: ${error.message}`); return; }
    setNewPassword(''); setNewPasswordConfirm(''); setShowPassword(false); setNotice('비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해주세요.');
  }

  async function legacyLogin(event) {
    event.preventDefault();
    const realName = loginName.trim();
    if (!realName || !loginPassword) { setNotice('성함과 비밀번호를 입력해주세요.'); return; }
    setWorking(true); setNotice('');
    try {
      let lookup = {};
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const response = await fetch('/api/auth/login-lookup', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }, cache: 'no-store', body: JSON.stringify({ realName }) });
        lookup = await response.json().catch(() => ({}));
        if (response.ok && (lookup?.email || (Array.isArray(lookup?.emails) && lookup.emails.length))) break;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500));
      }
      const fallback = await legacyEmail(realName);
      const emails = [...new Set([...(Array.isArray(lookup?.emails) ? lookup.emails : []), lookup?.email, fallback].filter(Boolean))];
      const normalized = normalizePasswordInput(loginPassword);
      const passwords = [...new Set([`VIP!${normalized}`, loginPassword, normalized, normalized.toUpperCase()].filter(Boolean))];
      let success = null;
      for (const email of emails) {
        for (const password of passwords) {
          const result = await supabase.auth.signInWithPassword({ email, password });
          if (!result.error && result.data?.user) { success = result.data; break; }
        }
        if (success?.user) break;
      }
      if (!success?.user) { setNotice('성함 또는 비밀번호를 확인해주세요.'); return; }
      const { data: member } = await supabase.from('profiles').select('*').eq('id', success.user.id).maybeSingle();
      if (!member || member.approval_status !== '1') { await supabase.auth.signOut(); setNotice('가입 신청이 접수되었습니다. 현재 관리자 승인 대기 중입니다.'); return; }
      window.sessionStorage.setItem('vip-active-tab', 'event');
      window.localStorage.removeItem('vip-ui-locked');
      window.location.reload();
    } catch { setNotice('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'); }
    finally { setWorking(false); }
  }

  async function legacySignup(event) {
    event.preventDefault();
    const nickname = signupNickname.trim(), realName = signupName.trim();
    if (!nickname || !realName || !signupPassword) { setNotice('닉네임, 성함, 비밀번호를 모두 입력해주세요.'); return; }
    if (signupPassword.length < 4) { setNotice('비밀번호는 4자리 이상 입력해주세요.'); return; }
    setWorking(true); setNotice('');
    try {
      const response = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname, realName, password: signupPassword }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) { setNotice(result?.reason === 'nickname_taken' ? `${nickname} 닉네임은 이미 사용 중입니다.` : result?.error || '가입 신청 중 오류가 발생했습니다.'); return; }
      setSignupNickname(''); setSignupName(''); setSignupPassword(''); setAccessMode('login'); setNotice('VIP 가입 신청이 완료되었습니다. 운영자 승인 후 로그인해주세요.');
    } catch { setNotice('가입 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'); }
    finally { setWorking(false); }
  }

  const accessActions = !user && entryTarget ? createPortal(
    <div className={styles.accessActions}>
      <button type="button" onClick={() => { setNotice(''); setAccessMode('login'); }}>비밀번호로 로그인</button>
      <button type="button" onClick={() => { setNotice(''); setAccessMode('signup'); }}>가입 신청</button>
    </div>, entryTarget,
  ) : null;

  const profileTools = user && profileTarget ? createPortal(
    <div className={styles.profileTools}>
      <button type="button" onClick={() => void enableNotifications()}>{pushEnabled ? '알림 ON' : '알림 켜기'}</button>
      <button type="button" onClick={() => void installApp()}>{standalone ? '앱 실행 중' : '앱 설치'}</button>
      <button type="button" onClick={() => { setNotice(''); setShowPassword(true); }}>비밀번호 변경</button>
      {notice && <div className={styles.inlineNotice}>{notice}</div>}
    </div>, profileTarget,
  ) : null;

  const rewardBadge = user && rewardTarget && unread > 0 ? createPortal(<span className={styles.navBadge}>{unread > 99 ? '99+' : unread}</span>, rewardTarget) : null;
  const bellBadge = user && bellTarget && unread > 0 ? createPortal(<span className={styles.headerBadge}>{unread > 99 ? '99+' : unread}</span>, bellTarget) : null;

  return <>
    {accessActions}{profileTools}{rewardBadge}{bellBadge}
    {showWelcome && profile?.role !== 'admin' && modal(<>
      <button type="button" className={styles.close} onClick={() => void closeWelcome()}>×</button>
      <span className={styles.eyebrow}>AI PROCESS · VIP MEMBERSHIP</span>
      <div className={styles.seal}>VIP</div>
      <h2>{profile?.real_name || profile?.nickname || 'VIP 회원'}님, 환영합니다!</h2>
      <p>저희 기업의 발전과 협업에 함께해 주신 분들을 위한 <strong>프라이빗 VIP 라운지</strong>입니다.</p>
      <p className={styles.subtle}>특별한 이벤트와 혜택을 만나보세요.</p>
      <button type="button" className={styles.primary} onClick={() => void closeWelcome()}>VIP 라운지 시작하기</button>
    </>, closeWelcome)}

    {showInstallGuide && modal(<>
      <button type="button" className={styles.close} onClick={() => setShowInstallGuide(false)}>×</button>
      <span className={styles.eyebrow}>APP INSTALL</span><h2>홈 화면에 VIP 라운지 추가</h2>
      {isIOS() ? <p>Safari 하단의 <strong>공유</strong> 버튼을 누른 뒤 <strong>홈 화면에 추가</strong>를 선택해주세요. 홈 화면 아이콘으로 실행하면 알림 기능도 사용할 수 있습니다.</p> : <p>브라우저 메뉴에서 <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를 선택해주세요.</p>}
      {notice && <div className={styles.modalNotice}>{notice}</div>}
      <button type="button" className={styles.primary} onClick={() => setShowInstallGuide(false)}>확인</button>
    </>, () => setShowInstallGuide(false))}

    {showPassword && modal(<form onSubmit={changePassword}>
      <button type="button" className={styles.close} onClick={() => setShowPassword(false)}>×</button>
      <span className={styles.eyebrow}>ACCOUNT</span><h2>비밀번호 변경</h2>
      <label className={styles.field}><span>새 비밀번호</span><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" /></label>
      <label className={styles.field}><span>새 비밀번호 확인</span><input type="password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} autoComplete="new-password" /></label>
      {notice && <div className={styles.modalNotice}>{notice}</div>}
      <button className={styles.primary} disabled={working}>{working ? '변경 중...' : '비밀번호 변경'}</button>
    </form>, () => setShowPassword(false))}

    {accessMode === 'login' && modal(<form onSubmit={legacyLogin}>
      <button type="button" className={styles.close} onClick={() => setAccessMode('')}>×</button>
      <span className={styles.eyebrow}>MEMBER LOGIN</span><h2>비밀번호로 로그인</h2>
      <label className={styles.field}><span>성함</span><input value={loginName} onChange={(e) => setLoginName(e.target.value)} autoComplete="name" /></label>
      <label className={styles.field}><span>비밀번호</span><input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} autoComplete="current-password" /></label>
      {notice && <div className={styles.modalNotice}>{notice}</div>}
      <button className={styles.primary} disabled={working}>{working ? '로그인 중...' : '로그인'}</button>
    </form>, () => setAccessMode(''))}

    {accessMode === 'signup' && modal(<form onSubmit={legacySignup}>
      <button type="button" className={styles.close} onClick={() => setAccessMode('')}>×</button>
      <span className={styles.eyebrow}>VIP REGISTRATION</span><h2>가입 신청</h2>
      <label className={styles.field}><span>오픈방 닉네임</span><input value={signupNickname} onChange={(e) => setSignupNickname(e.target.value)} /></label>
      <label className={styles.field}><span>성함</span><input value={signupName} onChange={(e) => setSignupName(e.target.value)} /></label>
      <label className={styles.field}><span>비밀번호</span><input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} autoComplete="new-password" /></label>
      {notice && <div className={styles.modalNotice}>{notice}</div>}
      <button className={styles.primary} disabled={working}>{working ? '신청 중...' : '가입 신청'}</button>
    </form>, () => setAccessMode(''))}
  </>;
}
