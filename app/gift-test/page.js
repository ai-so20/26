'use client';

import { useMemo, useState } from 'react';

const SAMPLE_GIFTS = [
  { name: '스타벅스 모바일 1만원', amount: 10000 },
  { name: '배달의민족 모바일 3만원', amount: 30000 },
  { name: 'CU 모바일 5,000원', amount: 5000 },
];

export default function GiftTestPage() {
  const [index, setIndex] = useState(0);
  const [member, setMember] = useState('테스트회원');
  const [history, setHistory] = useState([]);
  const gift = SAMPLE_GIFTS[index % SAMPLE_GIFTS.length];
  const fakeUrl = useMemo(() => `https://example.com/gift-test/${index + 1}`, [index]);

  function sendGift() {
    const row = {
      id: Date.now(),
      member: member.trim() || '테스트회원',
      product_name: gift.name,
      amount: gift.amount,
      gift_url: fakeUrl,
      sent_at: new Date().toLocaleString('ko-KR'),
    };
    setHistory((prev) => [row, ...prev]);
    setIndex((v) => v + 1);
  }

  return (
    <main style={{maxWidth:720,margin:'0 auto',padding:'40px 20px',fontFamily:'Arial, sans-serif',color:'#111827'}}>
      <p style={{fontSize:12,fontWeight:700,color:'#2563eb',letterSpacing:1}}>TEMPORARY TEST</p>
      <h1 style={{fontSize:28,margin:'8px 0'}}>기프티콘 지급 테스트</h1>
      <p style={{color:'#6b7280',lineHeight:1.6}}>실제 기프티콘·실제 재고·Supabase 지급 데이터와 연결하지 않은 임시 테스트 페이지입니다.</p>

      <section style={{border:'1px solid #e5e7eb',padding:20,marginTop:28}}>
        <label style={{display:'block',fontSize:13,fontWeight:700,marginBottom:8}}>지급 회원</label>
        <input value={member} onChange={(e)=>setMember(e.target.value)} style={{width:'100%',boxSizing:'border-box',padding:'12px 14px',border:'1px solid #d1d5db',fontSize:15}} />

        <div style={{marginTop:22,padding:'16px 0',borderTop:'1px solid #e5e7eb',borderBottom:'1px solid #e5e7eb'}}>
          <div style={{fontSize:12,color:'#6b7280'}}>다음 테스트 상품</div>
          <strong style={{display:'block',fontSize:19,marginTop:6}}>{gift.name}</strong>
          <span style={{fontSize:14,color:'#374151'}}>{gift.amount.toLocaleString()}원</span>
        </div>

        <button onClick={sendGift} style={{width:'100%',marginTop:20,padding:'14px',border:0,background:'#111827',color:'white',fontWeight:800,fontSize:15,cursor:'pointer'}}>테스트 지급</button>
      </section>

      <section style={{marginTop:34}}>
        <h2 style={{fontSize:18}}>1:1 지급 메시지 미리보기</h2>
        {history.length === 0 ? <p style={{color:'#9ca3af'}}>아직 테스트 지급 내역이 없습니다.</p> : history.map((item)=>(
          <article key={item.id} style={{borderLeft:'3px solid #2563eb',padding:'12px 16px',margin:'14px 0',background:'#f9fafb'}}>
            <strong>{item.member} 회원님께 기프티콘이 지급되었습니다.</strong>
            <div style={{marginTop:8}}>{item.product_name} · {item.amount.toLocaleString()}원</div>
            <a href={item.gift_url} target="_blank" rel="noreferrer" style={{display:'inline-block',marginTop:8,color:'#2563eb'}}>임시 기프티콘 링크 열기</a>
            <div style={{fontSize:12,color:'#9ca3af',marginTop:8}}>{item.sent_at}</div>
          </article>
        ))}
      </section>
    </main>
  );
}
