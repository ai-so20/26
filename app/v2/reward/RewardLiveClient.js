'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../supabase';
import baseStyles from '../v2.module.css';
import extraStyles from '../v2-extra.module.css';
import liveStyles from '../v2-live.module.css';
import rewardStyles from './reward-live.module.css';

const styles = { ...baseStyles, ...extraStyles, ...liveStyles, ...rewardStyles };

function avatarSrc(value) {
  const raw = String(value || '01');
  if (raw === 'admin') return '/avatars/admin.png.png';
  const key = raw.padStart(2, '0');
  return /^\d{2}$/.test(key) && Number(key) >= 1 && Number(key) <= 43
    ? `/avatars/${key}.png`
    : '/avatars/01.png';
}

function formatMessageTime(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function messagePreview(value) {
  const content = String(value || '');
  if (content.startsWith('[[IMAGE]]')) return '사진이 도착했습니다.';
  const formats = [
    ['[[GIFT_REWARD]]', (data) => `이벤트 당첨 상품이 지급되었습니다. ${String(data?.product_name || '기프티콘')}`],
    ['[[VIP_SURPRISE_LINK]]', (data) => String(data?.text || 'AI프로세스 안내가 도착했습니다.')],
    ['[[LINK_BUTTON]]', (data) => String(data?.text || data?.button_text || '안내 링크가 도착했습니다.')],
  ];
  for (const [prefix, describe] of formats) {
    if (!content.startsWith(prefix)) continue;
    try {
      return describe(JSON.parse(content.slice(prefix.length))).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
    } catch {
      return '상품 지급 안내가 도착했습니다.';
    }
  }
  return content.replace(/\s+/g, ' ').trim().slice(0, 150) || '새 메시지가 도착했습니다.';
}

function PlainText({ content }) {
  const parts = String(content || '').split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => /^https?:\/\//i.test(part)
    ? <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer">{part}</a>
    : <span key={index}>{part}</span>);
}

function MessageContent({ content, onOpenAi }) {
  const raw = String(content || '');

  if (raw.startsWith('[[GIFT_REWARD]]')) {
    try {
      const gift = JSON.parse(raw.slice('[[GIFT_REWARD]]'.length));
      const safeUrl = /^https:\/\//i.test(gift?.gift_url || '') ? gift.gift_url : '';
      return (
        <div className={styles.giftCard}>
          <div className={styles.giftTitle}>🎁 이벤트 당첨 상품이 지급되었습니다!</div>
          <div className={styles.giftProduct}><span>상품명</span><strong>{gift?.product_name || '기프티콘'}</strong></div>
          {safeUrl
            ? <a className={styles.linkButton} href={safeUrl} target="_blank" rel="noopener noreferrer">기프티콘 확인하기 ›</a>
            : <div className={styles.notice}>기프티콘 링크를 확인할 수 없습니다.</div>}
          <p className={styles.giftNotice}>당첨 회원님께 지급된 상품입니다. 링크는 외부 브라우저에서 안전하게 열립니다.</p>
        </div>
      );
    } catch {
      return <span>기프티콘 지급 메시지를 불러오지 못했습니다.</span>;
    }
  }

  if (raw.startsWith('[[VIP_SURPRISE_LINK]]')) {
    try {
      const data = JSON.parse(raw.slice('[[VIP_SURPRISE_LINK]]'.length));
      return (
        <div className={styles.specialCard}>
          <span className={styles.specialKicker}>AI PROCESS</span>
          <div className={styles.specialText}>{String(data?.text || '')}</div>
          <button type="button" className={styles.linkButton} onClick={onOpenAi}>AI프로세스 바로가기 ›</button>
        </div>
      );
    } catch {
      return <span>AI프로세스 안내를 표시하지 못했습니다.</span>;
    }
  }

  if (raw.startsWith('[[LINK_BUTTON]]')) {
    try {
      const data = JSON.parse(raw.slice('[[LINK_BUTTON]]'.length));
      const safeUrl = /^https:\/\//i.test(data?.button_url || '') ? data.button_url : '';
      const buttonText = String(data?.button_text || '링크 열기').trim() || '링크 열기';
      return (
        <div className={styles.specialCard}>
          <span className={styles.specialKicker}>상품 지급 안내</span>
          {data?.text && <div className={styles.specialText}>{String(data.text)}</div>}
          {safeUrl
            ? <a className={styles.linkButton} href={safeUrl} target="_blank" rel="noopener noreferrer">{buttonText} ›</a>
            : <div className={styles.notice}>연결 링크를 확인할 수 없습니다.</div>}
        </div>
      );
    } catch {
      return <span>링크 안내 메시지를 불러오지 못했습니다.</span>;
    }
  }

  if (raw.startsWith('[[IMAGE]]')) {
    const imageUrl = raw.slice('[[IMAGE]]'.length).trim();
    return imageUrl ? <img className={styles.image} src={imageUrl} alt="전송 이미지" /> : <span>이미지를 불러올 수 없습니다.</span>;
  }

  return <PlainText content={raw} />;
}

export default function RewardLiveClient({ embedded = false, embeddedUser = null, embeddedProfile = null, onNavigateTab = null }) {
  const [loading, setLoading] = useState(!(embedded && embeddedUser && embeddedProfile));
  const [user, setUser] = useState(embeddedUser || null);
  const [profile, setProfile] = useState(embeddedProfile || null);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [unreadAtOpen, setUnreadAtOpen] = useState(0);
  const [toast, setToast] = useState(null);
  const messageBoxRef = useRef(null);

  const giftCount = useMemo(() => messages.filter((item) => String(item.content || '').startsWith('[[GIFT_REWARD]]')).length, [messages]);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      if (embedded && embeddedUser && embeddedProfile) {
        setUser(embeddedUser);
        setProfile(embeddedProfile);
        setLoading(false);
        if (embeddedProfile.role !== 'admin') void openPrivateChat(embeddedUser.id);
        return;
      }

      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js?v=20261006-5', { scope: '/', updateViaCache: 'none' });
          await registration.update().catch(() => {});
        } catch {}
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data: member, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (!mounted) return;
      if (error || !member || String(member.approval_status) !== '1') {
        await supabase.auth.signOut();
        setNotice('회원 정보를 확인할 수 없습니다. 다시 입장해주세요.');
        setLoading(false);
        return;
      }

      setUser(session.user);
      setProfile(member);

      if (member.role !== 'admin') {
        await openPrivateChat(session.user.id);
      }

      if (mounted) setLoading(false);
    };

    void boot();
    return () => { mounted = false; };
  }, [embedded, embeddedUser?.id, embeddedProfile?.id]);

  useEffect(() => {
    if (!chatId || !user?.id) return;

    const channel = supabase
      .channel(`v2-reward-private-${chatId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_messages', filter: `chat_id=eq.${chatId}` }, async (payload) => {
        if (payload.eventType === 'DELETE') {
          setMessages((current) => current.filter((item) => item.id !== payload.old?.id));
          return;
        }

        if (payload.eventType === 'INSERT') {
          setMessages((current) => current.some((item) => item.id === payload.new.id)
            ? current
            : [...current, payload.new].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)));

          if (payload.new?.sender_id !== user.id) {
            await supabase.rpc('mark_private_chat_read', { target_chat_id: chatId });
            const preview = messagePreview(payload.new?.content);
            setToast({ title: '새 상품 지급 메시지', body: preview });
            window.clearTimeout(window.__v2RewardToastTimer);
            window.__v2RewardToastTimer = window.setTimeout(() => setToast(null), 5500);
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try { new Notification('AI PROCESS VIP · 상품 지급', { body: preview, icon: '/avatars/admin.png.png' }); } catch {}
            }
          }
          return;
        }

        await loadPrivateMessages(chatId);
      })
      .subscribe();

    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      await supabase.rpc('mark_private_chat_read', { target_chat_id: chatId });
      await loadPrivateMessages(chatId);
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [chatId, user?.id]);

  useEffect(() => {
    const box = messageBoxRef.current;
    if (!box) return;
    const raf = requestAnimationFrame(() => { box.scrollTop = box.scrollHeight + 10000; });
    return () => cancelAnimationFrame(raf);
  }, [messages.length, chatId]);

  async function openPrivateChat(userId) {
    setNotice('');
    setMessageLoading(true);
    const { data: unreadData } = await supabase.rpc('get_my_private_unread_count');
    setUnreadAtOpen(Number(unreadData || 0));

    const { data: privateChatId, error } = await supabase.rpc('get_or_create_admin_chat');
    if (error || !privateChatId) {
      setNotice('상품 지급 메시지함을 불러오지 못했습니다.');
      setMessageLoading(false);
      return;
    }

    setChatId(privateChatId);
    await supabase.rpc('mark_private_chat_read', { target_chat_id: privateChatId });
    await loadPrivateMessages(privateChatId, userId);
    setMessageLoading(false);
  }

  async function loadPrivateMessages(targetChatId) {
    if (!targetChatId) return;
    const { data, error } = await supabase
      .from('private_messages')
      .select('*')
      .eq('chat_id', targetChatId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      setNotice('상품 지급 메시지를 불러오지 못했습니다.');
      return;
    }

    setMessages([...(data || [])].reverse());
  }

  async function sendPrivatePush(targetChatId, content) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;
      await fetch('/api/push/private-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        cache: 'no-store',
        body: JSON.stringify({ chatId: targetChatId, content: String(content || '') }),
      });
    } catch {}
  }

  async function sendMessage(event) {
    event.preventDefault();
    const text = messageText.trim();
    if (!text || !chatId || !user?.id || sending) return;

    setSending(true);
    setNotice('');
    setMessageText('');
    const optimisticId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic = {
      id: optimisticId,
      chat_id: chatId,
      sender_id: user.id,
      message_type: 'text',
      content: text,
      is_deleted: false,
      is_read: false,
      created_at: new Date().toISOString(),
      __optimistic: true,
    };
    setMessages((current) => [...current, optimistic]);

    const { data, error } = await supabase
      .from('private_messages')
      .insert({ chat_id: chatId, sender_id: user.id, message_type: 'text', content: text, is_deleted: false, is_read: false })
      .select('*')
      .limit(1);

    if (error) {
      setMessages((current) => current.filter((item) => item.id !== optimisticId));
      setMessageText(text);
      setNotice('메시지를 보내지 못했습니다. 다시 전송해주세요.');
      setSending(false);
      return;
    }

    const sent = Array.isArray(data) ? data[0] : data;
    if (sent?.id) {
      setMessages((current) => [...current.filter((item) => item.id !== optimisticId && item.id !== sent.id), sent]
        .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)));
    }
    void sendPrivatePush(chatId, text);
    setSending(false);
  }

  function goTab(tab) {
    try { window.sessionStorage.setItem('vip-active-tab', tab); } catch {}
    if (embedded && typeof onNavigateTab === 'function') {
      onNavigateTab(tab);
      return;
    }
    window.location.assign('/v2');
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.assign('/v2');
  }

  if (loading) {
    return (
      <main className={styles.canvas}>
        <section className={`${styles.appShell} ${styles.loadingShell}`}>
          <div className={styles.loadingBrandRow}><div className={styles.loadingMark}>VIP</div><div><strong>상품지급센터 정보를 확인하고 있습니다.</strong><span>지급 내역과 회원 정보를 불러오는 중입니다.</span></div></div>
          <div className={styles.loadingNavSkeleton}><i /><i /><i /></div>
          <div className={styles.loadingContentSkeleton} aria-hidden="true"><i className={styles.loadingLineLg} /><i className={styles.loadingLineSm} /><div className={styles.loadingPanelSkeleton}><i /><i /><i /></div><div className={styles.loadingListSkeleton}><i /><i /><i /></div></div>
        </section>
      </main>
    );
  }

  if (!user || !profile) {
    return (
      <main className={styles.canvas}>
        <section className={styles.appShell}>
          <div className={styles.loginGate}><div><strong>VIP 회원 입장이 필요합니다.</strong><p>회원 입장 후 상품지급센터를 확인할 수 있습니다.</p><button type="button" className={styles.primaryButton} onClick={() => window.location.assign('/v2')}>회원 입장으로 이동</button></div></div>
        </section>
      </main>
    );
  }

  return (
    <main className={`${styles.canvas} ${embedded ? styles.rewardEmbeddedCanvas : ''}`}>
      <section className={`${styles.appShell} ${embedded ? styles.rewardEmbeddedShell : ''}`}>
        <header className={styles.header}>
          <div className={styles.brandBlock}><span className={styles.brandEyebrow}>PRIVATE MEMBER</span><strong className={styles.brand}>VIP LOUNGE</strong></div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.iconButton} aria-label="알림"><svg className={styles.bellSvg} viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></button>
            <button type="button" className={styles.logoutButton} onClick={logout}>로그아웃</button>
          </div>
        </header>

        <nav className={styles.nav} aria-label="주요 메뉴">
          <button type="button" className={styles.navItem} onClick={() => goTab('event')}>이벤트</button>
          <button type="button" className={styles.navItem} onClick={() => goTab('ai')}>AI프로세스</button>
          <button type="button" className={`${styles.navItem} ${styles.navActive}`}>상품지급센터</button>
        </nav>

        <div className={`${styles.content} ${styles.page}`}>
          <section className={styles.pageHeading}>
            <div><span className={styles.kicker}>REWARD CENTER</span><h1>상품지급센터</h1></div>
            <span className={styles.statusBadge}><i /> 실시간 연결</span>
          </section>

          {notice && <div className={`${styles.notice} ${styles.rewardNotice}`} role="alert"><strong>{notice}</strong>{!chatId && profile.role !== 'admin' ? <button type="button" onClick={() => openPrivateChat(user.id)}>다시 시도</button> : null}</div>}

          {profile.role === 'admin' ? (
            <section className={styles.infoCard}><span className={styles.infoIcon}>i</span><div><strong>관리자 상품 지급</strong></div></section>
          ) : (
            <>

              <section className={styles.summary}>
                <div><span>미확인 안내</span><strong>{unreadAtOpen}<small>건</small></strong></div>
                <div><span>지급 상품</span><strong>{giftCount}<small>건</small></strong></div>
                <div><span>전체 안내</span><strong>{messages.length}<small>건</small></strong></div>
              </section>

              <section className={styles.deliveryCard}>
                <div className={styles.deliveryHead}>
                  <div><span>VIP REWARD CENTER</span><strong>지급 및 당첨 안내</strong></div>
                  <span className={styles.liveBadge}>● LIVE</span>
                </div>

                <div className={styles.messageList} ref={messageBoxRef}>
                  <section className={`${styles.rewardWelcome} ${styles.rewardWelcomeInFeed}`}>
                                  <div className={styles.rewardWelcomeTop}>
                                    <span>VIP EVENT BENEFITS</span>
                                    <strong>{String(profile?.nickname || profile?.display_name || profile?.name || 'VIP 회원')}님, 환영합니다.</strong>
                                    <p>VIP 이벤트 혜택과 당첨 상품 지급 내역을 상품지급센터에서 확인할 수 있습니다.</p>
                                  </div>

                                  <div className={styles.rewardBenefitPanel}>
                                    <strong>VIP 이벤트 참여 안내</strong>
                                    <div className={styles.rewardBenefitRow}>
                                      <span className={styles.rewardBenefitIcon}>24</span>
                                      <div><b>시간별 이벤트 · 매일 24회</b><p>매일 00:00 ~ 24:00, 총 하루 24회차 이벤트가 진행됩니다. 회차당 1회 참여할 수 있으며 당첨 시 3,000원 ~ 300,000원 상당 랜덤 기프티콘이 지급됩니다.</p></div>
                                    </div>
                                    <div className={styles.rewardBenefitRow}>
                                      <span className={styles.rewardBenefitIcon}>30</span>
                                      <div><b>출석 이벤트 · 누적 30회</b><p>하루 1회 출석할 수 있으며, 누적 30회 출석 달성 시 3,000원 ~ 500,000원 상당 랜덤 기프티콘 혜택이 제공됩니다. 연속 출석이 아니어도 누적 횟수로 인정됩니다.</p></div>
                                    </div>
                                    <p className={styles.rewardBenefitFoot}>당첨 상품과 출석 달성 보상은 이곳 상품지급센터에서 바로 안내·지급됩니다.</p>
                                  </div>

                                  <div className={styles.rewardQuickLinks}>
                                    <button type="button" onClick={() => goTab('event')}><span>EVENT</span><strong>시간별 이벤트</strong></button>
                                    <button type="button" onClick={() => goTab('event')}><span>CHECK-IN</span><strong>출석 이벤트</strong></button>
                                  </div>

                                  <div className={styles.rewardAlert}>
                                    <span className={styles.rewardAlertBell} aria-hidden="true">
                                      <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
                                    </span>
                                    <div><strong>이벤트 당첨 알림</strong><p>상단 알림을 허용하면 이벤트 당첨 및 상품 지급 안내를 바로 확인할 수 있습니다.</p></div>
                                  </div>
                                </section>
                  {messageLoading ? (
                    <div className={`${styles.empty} ${styles.rewardStatePanel}`} role="status"><span className={styles.rewardStatePulse} /><strong>지급 안내를 확인하고 있습니다.</strong><p>최신 상품 지급 내역을 불러오는 중입니다.</p></div>
                  ) : messages.length === 0 ? (
                    <div className={`${styles.empty} ${styles.rewardStatePanel}`}><span className={styles.rewardStateIcon}>✓</span><strong>현재 도착한 지급 안내가 없습니다.</strong><p>이벤트 당첨 또는 출석 보상 지급 시 이곳에서 바로 확인할 수 있습니다.</p></div>
                  ) : messages.map((item) => {
                    const mine = item.sender_id === user.id;
                    return (
                      <div key={item.id} className={`${styles.messageRow} ${mine ? styles.messageRowMine : styles.messageRowOther}`}>
                        <div className={styles.bubbleWrap}>
                          {!mine && <div className={styles.sender}>VIP 운영팀</div>}
                          <div className={`${styles.bubble} ${mine ? styles.mine : styles.other}`}>
                            <MessageContent content={item.content} onOpenAi={() => goTab('ai')} />
                          </div>
                          <div className={styles.meta}><span>{formatMessageTime(item.created_at)}</span>{mine && <span>{item.__optimistic ? '전송 중' : item.is_read ? '읽음' : '전송됨'}</span>}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className={styles.rewardFooterNotice}>
                <strong>이벤트 당첨 시 이곳에서 즉시 상품이 지급됩니다.</strong>
                <p>궁금한 사항은 카카오톡 1:1 고객센터로 문의해주세요.</p>
              </section>
            </>
          )}
        </div>

        {toast && <div className={styles.toast}><strong>{toast.title}</strong>{toast.body}</div>}
      </section>
    </main>
  );
}
