export class ApiError extends Error{constructor(message,code){super(message);this.code=code}}
export async function call(action,payload={}){const response=await fetch('/api/app',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload}),signal:AbortSignal.timeout(20000)});const result=await response.json();if(!result.ok)throw new ApiError(result.message??'요청을 처리하지 못했습니다.',result.code);return result.data}
export const mutation=(action,payload)=>call(action,{...payload,request_id:crypto.randomUUID()});
