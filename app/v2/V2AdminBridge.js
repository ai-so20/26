'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabase';

export default function V2AdminBridge(){
  const [target,setTarget]=useState(null);const [allowed,setAllowed]=useState(false);const [className,setClassName]=useState('');
  useEffect(()=>{
    let mounted=true;
    const resolve=async()=>{
      const {data:{session}}=await supabase.auth.getSession();if(!session?.user||!mounted)return;
      const {data}=await supabase.from('profiles').select('role,approval_status').eq('id',session.user.id).maybeSingle();if(!mounted||!data||data.role!=='admin'||String(data.approval_status)!=='1')return;
      const find=()=>{const nav=document.querySelector('nav[aria-label="주요 메뉴"]');if(nav){setTarget(nav);setClassName(nav.querySelector('button')?.className||'');setAllowed(true);return true;}return false;};
      if(find())return;const observer=new MutationObserver(()=>{if(find())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});window.setTimeout(()=>observer.disconnect(),8000);
    };
    void resolve();return()=>{mounted=false;};
  },[]);
  if(!allowed||!target)return null;
  return createPortal(<button type="button" className={className} onClick={()=>window.location.assign('/v2/admin')}>관리자</button>,target);
}
