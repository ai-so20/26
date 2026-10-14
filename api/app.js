import { createHash } from 'node:crypto';
const ACTIONS=new Set(['health','signup','login','logout','me','password','processes','history','admin_members','admin_processes','admin_history','admin_audit','admin_approval','admin_reset_password','admin_create','admin_adjust','admin_schedule','admin_end','admin_restart','events','join_event','rewards','admin_portal_members','admin_member_create','admin_events','admin_event_create','admin_event_status','admin_gifts','admin_gift_add','admin_reward_assign','admin_reward_status']);
const STATUS={UNAUTHORIZED:401,FORBIDDEN:403,PENDING:403,PASSWORD_CHANGE:403,INVALID:400,CONFLICT:409,RATE_LIMIT:429};
export const COOKIE_NAME='__Host-ap26_session';
export const sessionCookie=(token,expired=false)=>`${COOKIE_NAME}=${expired?'':token}; Path=/; Max-Age=${expired?0:43200}; HttpOnly; Secure; SameSite=Strict`;
function readToken(cookie=''){const value=cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE_NAME+'='))?.slice(COOKIE_NAME.length+1)??'';return /^[a-f0-9]{64}$/.test(value)?value:''}
export function sameOrigin(req){try{return new URL(req.headers.origin).host===req.headers.host}catch{return false}}
export function createHandler({fetcher=fetch,environment=process.env}={}){
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const reply=(status,data)=>res.status(status).json(data);
  if(req.method==='GET'){if(req.query?.action!=='health')return reply(405,{ok:false,message:'허용되지 않는 요청입니다.'})}
  else if(req.method!=='POST')return reply(405,{ok:false,message:'허용되지 않는 요청입니다.'});
  else if(!sameOrigin(req))return reply(403,{ok:false,code:'FORBIDDEN',message:'동일한 사이트에서 요청해주세요.'});
  let body;try{body=req.method==='GET'?{action:'health',payload:{}}:typeof req.body==='string'?JSON.parse(req.body):req.body}catch{return reply(400,{ok:false,message:'요청 형식을 확인해주세요.'})}
  if(!body||typeof body!=='object'||!ACTIONS.has(body.action)||(body.payload!=null&&(typeof body.payload!=='object'||Array.isArray(body.payload))))return reply(400,{ok:false,message:'지원하지 않는 요청입니다.'});
  if(JSON.stringify(body).length>12000)return reply(413,{ok:false,message:'입력 내용이 너무 깁니다.'});
  const {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,AP_GATEWAY_KEY}=environment;
  if(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY||!AP_GATEWAY_KEY)return reply(503,{ok:false,code:'NOT_READY',message:'DB 인증 연결을 준비하고 있습니다. 잠시 후 다시 확인해주세요.'});
  const ip=req.headers['x-vercel-forwarded-for']||req.headers['x-real-ip']||'unknown';
  const payload={...(body.payload??{}),_ip:createHash('sha256').update(String(ip)).digest('hex')};
  try{
   const upstream=await fetcher(`${SUPABASE_URL}/rest/v1/rpc/ap_gateway`,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_gate:AP_GATEWAY_KEY,p_action:body.action,p_token:readToken(req.headers.cookie),p_payload:payload}),signal:AbortSignal.timeout(15000)});
   if(!upstream.ok)return reply(503,{ok:false,code:'NOT_READY',message:'DB 인증 연결을 준비하고 있습니다. 잠시 후 다시 확인해주세요.'});
   const result=await upstream.json();if(!result||typeof result.ok!=='boolean')throw Error('Invalid response');
   if(result.ok&&body.action==='login'){const token=result.data?.session_token;if(!/^[a-f0-9]{64}$/.test(token??''))throw Error('Invalid session');res.setHeader('Set-Cookie',sessionCookie(token));result.data={user:result.data.user}}
   if(body.action==='logout'||result.code==='UNAUTHORIZED')res.setHeader('Set-Cookie',sessionCookie('',true));
   return reply(result.ok?200:STATUS[result.code]??400,result);
  }catch{return reply(503,{ok:false,code:'CONNECTION',message:'서버 연결이 지연되고 있습니다. 다시 시도해주세요.'})}
 };
}
export default createHandler();
