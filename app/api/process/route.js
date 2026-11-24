import {db} from '../../../lib/db';
import {requireSession} from '../../../lib/session';
import {bad,checkOrigin,jsonBody} from '../../../lib/security';
export const runtime='nodejs';
export async function GET(){
 const user=await requireSession();if(!user)return bad(401,'로그인이 필요합니다.');
 if(user.role==='admin'){
  const {data:people,error:ue}=await db().from('app_users').select('id,username,name').eq('role','user').order('username').limit(200);
  if(ue)return bad(503,'회원 조회 실패');
  const ids=(people||[]).map(x=>x.id);
  const {data:rows,error:pe}=ids.length?await db().from('app_process_progress').select('user_id,started_at,ends_at,status').in('user_id',ids):{data:[],error:null};
  if(pe)return bad(503,'진행률 조회 실패');
  const map=new Map((rows||[]).map(x=>[x.user_id,x]));
  return Response.json({members:(people||[]).map(x=>({...x,progress:map.get(x.id)||null}))},{headers:{'Cache-Control':'no-store'}});
 }
 const {data,error}=await db().from('app_process_progress').select('started_at,ends_at,status').eq('user_id',user.id).maybeSingle();
 if(error)return bad(503,'진행률 조회 실패');
 return Response.json({progress:data||null},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(req){
 if(!checkOrigin(req))return bad(403,'허용되지 않은 요청');
 const admin=await requireSession('admin');if(!admin)return bad(403,'관리자 권한이 필요합니다.');
 let body;try{body=await jsonBody(req)}catch{return bad(400,'잘못된 요청')}
 const userId=String(body.userId||'');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId))return bad(400,'회원 ID 오류');
 const {data:target,error:te}=await db().from('app_users').select('id').eq('id',userId).eq('role','user').maybeSingle();
 if(te||!target)return bad(404,'회원이 없습니다.');
 if(body.action==='reset'){
   const {error}=await db().from('app_process_progress').upsert({user_id:userId,status:'READY',started_at:null,ends_at:null,updated_at:new Date().toISOString()},{onConflict:'user_id'});
   return error?bad(503,'초기화 실패'):Response.json({ok:true});
 }
 if(body.action!=='start')return bad(400,'지원하지 않는 작업');
 const hours=Number(body.hours);
 if(!Number.isInteger(hours)||hours<1||hours>2160)return bad(400,'진행 시간은 1~2160시간입니다.');
 const start=new Date(),end=new Date(start.getTime()+hours*3600000);
 const {error}=await db().from('app_process_progress').upsert({user_id:userId,status:'RUNNING',started_at:start.toISOString(),ends_at:end.toISOString(),updated_at:start.toISOString()},{onConflict:'user_id'});
 return error?bad(503,'진행 시작 실패'):Response.json({ok:true});
}