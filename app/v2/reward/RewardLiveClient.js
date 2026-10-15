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

export default function RewardLiveClient() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [unreadAtOpen, setUnreadAtOpen] = useState(0);
  const [toast, setToast] = useState(null);
  const messageBoxRef = useRef(null);

  const giftCount = useMemo(() => messages.filter((item) => String(item.content || '').startsWith('[[GIFT_REWARD]]')).length, [messages]);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
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
  }, []);

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
    const { data: unreadData } = await supabase.rpc('get_my_private_unread_count');
    setUnreadAtOpen(Number(unreadData || 0));

    const { data: privateChatId, error } = await supabase.rpc('get_or_create_admin_chat');
    if (error || !privateChatId) {
      setNotice('상품 지급 메시지함을 불러오지 못했습니다.');
      return;
    }

    setChatId(privateChatId);
    await supabase.rpc('mark_private_chat_read', { target_chat_id: privateChatId });
    await loadPrivateMessages(privateChatId, userId);
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
    window.location.assign('/v2');
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.assign('/v2');
  }

  if (loading) {
    return <main className={styles.canvas}><section className={`${styles.appShell} ${styles.loadingShell}`}><div className={styles.loadingMark}>VIP</div><strong>상품 지급 정보를 확인하고 있습니다.</strong></section></main>;
  }

  if (!user || !profile) {
    return (
      <main className={styles.canvas}>
        <section className={styles.appShell}>
          <div className={styles.loginGate}><div><strong>VIP 회원 입장이 필요합니다.</strong><p>회원 입장 후 상품 지급 내역을 확인할 수 있습니다.</p><button type="button" className={styles.primaryButton} onClick={() => window.location.assign('/v2')}>회원 입장으로 이동</button></div></div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.canvas}>
      <section className={styles.appShell}>
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
          <button type="button" className={`${styles.navItem} ${styles.navActive}`}>상품 지급</button>
        </nav>

        <div className={`${styles.content} ${styles.page}`}>
          <section className={styles.pageHeading}>
            <div><span className={styles.kicker}>REWARD</span><h1>상품 지급</h1></div>
            <span className={styles.statusBadge}><i /> 실시간 연결</span>
          </section>

          {notice && <div className={styles.notice}>{notice}</div>}

          {profile.role === 'admin' ? (
            <section className={styles.infoCard}><span className={styles.infoIcon}>i</span><div><strong>관리자 상품 지급</strong></div></section>
          ) : (
            <>
              <section className={styles.summary}>
                <div><span>입장 시 새 메시지</span><strong>{unreadAtOpen}<small>건</small></strong></div>
                <div><span>상품 지급 내역</span><strong>{giftCount}<small>건</small></strong></div>
                <div><span>전체 메시지</span><strong>{messages.length}<small>건</small></strong></div>
              </section>

              <section className={styles.deliveryCard}>
                <div className={styles.deliveryHead}>
                  <div><span>VIP REWARD INBOX</span><strong>상품 지급 내역</strong></div>
                  <span className={styles.liveBadge}>● LIVE</span>
                </div>

                <div className={styles.messageList} ref={messageBoxRef}>
                  {messages.length === 0 ? (
                    <div className={styles.empty}>아직 도착한 상품 지급 내역이 없습니다.</div>
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
            </>
          )}
        </div>

        {toast && <div className={styles.toast}><strong>{toast.title}</strong>{toast.body}</div>}
      </section>
    </main>
  );
}
