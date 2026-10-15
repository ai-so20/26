'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../supabase';
import styles from './admin.module.css';

function MessageBody({ content }){
  const raw=String(content||'');
  if(raw.startsWith('[[GIFT_REWARD]]')){try{const d=JSON.parse(raw.slice(15));const safe=/^https:\/\//i.test(d.gift_url||'')?d.gift_url:'';return <><strong>🎁 {d.product_name||'기프티콘'}</strong>{safe&&<><br/><a className={styles.link} href={safe} target="_blank" rel="noreferrer">기프티콘 확인하기</a></>}</>;}catch{} }
  if(raw.startsWith('[[LINK_BUTTON]]')){try{const d=JSON.parse(raw.slice(15));return <>{d.text&&<div>{d.text}</div>}{/^https:\/\//i.test(d.button_url||'')&&<a className={styles.link} href={d.button_url} target="_blank" rel="noreferrer">{d.button_text||'링크 열기'}</a>}</>;}catch{} }
  if(raw.startsWith('[[VIP_SURPRISE_LINK]]')){try{const d=JSON.parse(raw.slice(21));return <div>{d.text||'AI PROCESS 안내'}</div>;}catch{} }
  if(raw.startsWith('[[IMAGE]]')){const url=raw.slice(9);return /^https:\/\//i.test(url)?<a href={url} target="_blank" rel="noreferrer"><img src={url} alt="전송 이미지" style={{maxWidth:220,maxHeight:220,borderRadius:10,display:'block'}}/></a>:'이미지를 불러올 수 없습니다.';}
  const parts=raw.split(/(https?:\/\/[^\s]+)/g);return <>{parts.map((p,i)=>/^https?:\/\//.test(p)?<a key={i} className={styles.link} href={p} target="_blank" rel="noreferrer">{p}</a>:<span key={i}>{p}</span>)}</>;
}

export default function AdminMessages({ user, onNotice, onStats }){
  const [chats,setChats]=useState([]);const [members,setMembers]=useState([]);const [unreads,setUnreads]=useState({});
  const [selected,setSelected]=useState(null);const [messages,setMessages]=useState([]);const [text,setText]=useState('');const [search,setSearch]=useState('');const [working,setWorking]=useState(false);
  const boxRef=useRef(null);const fileRef=useRef(null);
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return q?chats.filter(c=>`${c.member?.nickname||''}`.toLowerCase().includes(q)):chats;},[chats,search]);

  useEffect(()=>{void loadDirectory();},[]);
  useEffect(()=>{if(!user?.id)return;const channel=supabase.channel(`v2-admin-private-${user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'private_messages'},async(payload)=>{await loadDirectory();if(selected?.id&&(payload.new?.chat_id===selected.id||payload.old?.chat_id===selected.id))await loadMessages(selected.id);}).subscribe();return()=>{supabase.removeChannel(channel);};},[user?.id,selected?.id]);
  useEffect(()=>{const b=boxRef.current;if(b)b.scrollTop=b.scrollHeight+10000;},[messages.length,selected?.id]);

  async function loadDirectory(){
    const [{data:chatData,error:chatError},{data:memberData},{data:unreadData}]=await Promise.all([supabase.rpc('get_admin_private_chats'),supabase.rpc('get_admin_member_list'),supabase.rpc('get_admin_private_unread_counts')]);
    if(chatError){onNotice(`메시지 목록 불러오기 실패: ${chatError.message}`);return;}
    const next=(chatData||[]).map(c=>({id:c.chat_id,member_id:c.member_id,status:c.status,created_at:c.created_at,updated_at:c.updated_at,member:{id:c.member_id,nickname:c.nickname||'VIP 회원',avatar:c.avatar||'01'}})).sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));
    const counts={};(unreadData||[]).forEach(r=>{counts[r.chat_id]=Number(r.unread_count||0);});
    setChats(next);setMembers(memberData||[]);setUnreads(counts);onStats?.({unreadChats:Object.values(counts).reduce((a,b)=>a+Number(b||0),0)});
  }

  async function loadMessages(chatId){if(!chatId)return;const {data,error}=await supabase.from('private_messages').select('*').eq('chat_id',chatId).eq('is_deleted',false).order('created_at',{ascending:false}).limit(200);if(error){onNotice(`메시지 불러오기 실패: ${error.message}`);return;}setMessages([...(data||[])].reverse());}

  async function selectChat(chat){setSelected(chat);setMessages([]);await supabase.rpc('mark_private_chat_read',{target_chat_id:chat.id});await Promise.all([loadMessages(chat.id),loadDirectory()]);}

  async function openMember(member){
    const id=member.member_id||member.id;if(!id)return;const {data:chatId,error}=await supabase.rpc('admin_get_or_create_private_chat',{target_member_id:id});if(error){onNotice(`1:1 지급방 열기 실패: ${error.message}`);return;}
    const chat={id:chatId,member_id:id,member:{id,nickname:member.nickname||'VIP 회원',avatar:member.avatar||'01'}};await loadDirectory();await selectChat(chat);
  }

  async function sendPush(chatId,content){try{const {data:s}=await supabase.auth.getSession();const token=s?.session?.access_token;if(!token)return;await fetch('/api/push/private-message',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},cache:'no-store',body:JSON.stringify({chatId,content:String(content||'').startsWith('[[IMAGE]]')?'사진을 보냈습니다.':String(content||'')})});}catch{}}

  async function insertContent(content){if(!selected?.id||!user?.id||working)return;setWorking(true);const {error}=await supabase.from('private_messages').insert({chat_id:selected.id,sender_id:user.id,message_type:'text',content,is_deleted:false,is_read:false});if(error)onNotice(`메시지 전송 실패: ${error.message}`);else{void sendPush(selected.id,content);await loadMessages(selected.id);await loadDirectory();}setWorking(false);}

  async function send(event){event.preventDefault();const value=text.trim();if(!value)return;setText('');await insertContent(value);}

  async function sendLink(){
    if(!selected)return;const guide=window.prompt('버튼 위에 표시할 안내 문구를 입력해주세요.','');if(guide===null)return;const button=window.prompt('버튼 문구를 입력해주세요.','링크 확인하기');if(button===null||!button.trim())return;const url=window.prompt('https:// 로 시작하는 링크를 입력해주세요.','https://');if(url===null||!/^https:\/\//i.test(url.trim())){onNotice('링크는 https:// 로 시작해야 합니다.');return;}await insertContent(`[[LINK_BUTTON]]${JSON.stringify({text:guide.trim(),button_text:button.trim(),button_url:url.trim()})}`);
  }

  async function upload(file){if(!file||!selected||working)return;if(!file.type.startsWith('image/')){onNotice('사진 또는 GIF 이미지만 전송할 수 있습니다.');return;}if(file.size>8*1024*1024){onNotice('이미지는 8MB 이하만 전송할 수 있습니다.');return;}setWorking(true);try{const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const path=`${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;const {error}=await supabase.storage.from('chat-media').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(error)throw error;const {data}=supabase.storage.from('chat-media').getPublicUrl(path);const content=`[[IMAGE]]${data.publicUrl}`;setWorking(false);await insertContent(content);}catch(error){onNotice(`사진 전송 실패: ${error.message}`);setWorking(false);}finally{if(fileRef.current)fileRef.current.value='';}}

  async function removeMessage(message){if(!window.confirm('이 1:1 메시지를 완전히 삭제할까요?'))return;const {error}=await supabase.rpc('admin_delete_private_message',{target_message_id:message.id});if(error)onNotice(`메시지 삭제 실패: ${error.message}`);else await loadMessages(selected.id);}

  return <section className={styles.section}>
    <div className={styles.sectionHead}><div><span>PRIVATE PAYOUT MESSAGE</span><strong>상품 지급 · 1:1 메시지 관리</strong><p>회원별 지급방, 일반 메시지, 링크 버튼, 이미지, 읽음상태와 푸시 알림을 관리합니다.</p></div><button className={styles.buttonSoft} onClick={loadDirectory}>새로고침</button></div>
    <div className={styles.toolbar} style={{marginBottom:10}}><input className={styles.search} placeholder="대화 회원 검색" value={search} onChange={e=>setSearch(e.target.value)}/><select className={styles.select} defaultValue="" onChange={e=>{const m=members.find(x=>String(x.member_id||x.id)===e.target.value);if(m)void openMember(m);e.target.value='';}}><option value="">회원 지급방 열기…</option>{members.map(m=><option key={m.member_id||m.id} value={m.member_id||m.id}>{m.nickname||'VIP 회원'}</option>)}</select></div>
    <div className={styles.messageLayout}>
      <div className={styles.chatList}>{filtered.length?filtered.map(chat=><button key={chat.id} className={`${styles.chatRow} ${selected?.id===chat.id?styles.chatRowActive:''}`} onClick={()=>selectChat(chat)}><div className={styles.chatRowTop}><strong>{chat.member?.nickname||'VIP 회원'}</strong>{Number(unreads[chat.id]||0)>0&&<span className={styles.unread}>{unreads[chat.id]}</span>}</div><span className={styles.sub}>{chat.updated_at?new Date(chat.updated_at).toLocaleString('ko-KR'):'대화 없음'}</span></button>):<div className={styles.empty}>1:1 지급방이 없습니다.</div>}</div>
      <div>{selected?<><div ref={boxRef} className={styles.messages}>{messages.length?messages.map(m=><div key={m.id} className={`${styles.message} ${m.sender_id===user.id?styles.mine:''}`}><MessageBody content={m.content}/><div className={styles.messageMeta}><span>{m.sender_id===user.id?'관리자':selected.member?.nickname||'회원'}</span><span>{m.created_at?new Date(m.created_at).toLocaleString('ko-KR'):'-'}</span><button className={styles.mini} onClick={()=>removeMessage(m)}>삭제</button></div></div>):<div className={styles.empty}>아직 메시지가 없습니다.</div>}</div><form className={styles.composer} onSubmit={send}><input className={styles.input} value={text} onChange={e=>setText(e.target.value)} placeholder="메시지를 입력하세요"/><button className={styles.buttonPrimary} disabled={working||!text.trim()}>전송</button></form><div className={styles.toolbar} style={{marginTop:7}}><button className={styles.buttonSoft} disabled={working} onClick={sendLink}>링크 버튼 보내기</button><button className={styles.button} disabled={working} onClick={()=>fileRef.current?.click()}>사진 보내기</button><input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>upload(e.target.files?.[0])}/></div></>:<div className={styles.empty}>왼쪽에서 회원 지급방을 선택해주세요.</div>}</div>
    </div>
  </section>;
}
