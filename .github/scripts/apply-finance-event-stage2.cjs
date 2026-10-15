const fs=require('fs');
function replaceOnce(s,oldValue,newValue,label){
  const c=s.split(oldValue).length-1;
  if(c!==1)throw new Error(`${label}: expected once, found ${c}`);
  return s.replace(oldValue,newValue);
}

let p='lib/blueTheme.mjs';
let b=fs.readFileSync(p,'utf8');
const oldPal=`const UNIFIED = { from:'#f7f9ff', to:'#eef4ff', ink:'#315fce', border:'#d8e1f3', action:BLUE };
const palettes = {
  ai: { ...UNIFIED, from:'#eef4ff', to:'#e3edff', ink:'#285ed8', border:'#d3dff2' },
  event: UNIFIED,
  attendance: UNIFIED,
  reward: UNIFIED,
  'event:gift_box': UNIFIED,
  'event:number': UNIFIED,
  'event:roulette': UNIFIED,
  'event:quiz': UNIFIED,
  'event:draw': UNIFIED,
};`;
const newPal=`const UNIFIED = { from:'#f8fafc', to:'#f3f6fa', ink:'#52627a', border:'#e1e7ef', action:'#64748b' };
const palettes = {
  ai: { from:'#eef4ff', to:'#e3edff', ink:'#285ed8', border:'#d3dff2', action:BLUE },
  event: { from:'#fff8f2', to:'#fff2e8', ink:'#b45b32', border:'#f0d5c5', action:'#cf6a3c' },
  attendance: { from:'#f2faf6', to:'#eaf7f1', ink:'#287a61', border:'#cee6da', action:'#2f8b70' },
  reward: UNIFIED,
  'event:gift_box': { from:'#fff7f1', to:'#fff0e7', ink:'#b35b3b', border:'#efd5c7', action:'#c96c49' },
  'event:number': { from:'#f8f5ff', to:'#f2edff', ink:'#6d5aa3', border:'#ddd3f3', action:'#7762b2' },
  'event:roulette': { from:'#fff4f8', to:'#fdebf2', ink:'#a45175', border:'#efcfdd', action:'#b85d81' },
  'event:quiz': { from:'#fff9ee', to:'#fff3df', ink:'#956621', border:'#efdfbc', action:'#b27a2d' },
  'event:draw': { from:'#f2faf6', to:'#eaf7f1', ink:'#2b7962', border:'#cee6da', action:'#33866e' },
};`;
b=replaceOnce(b,oldPal,newPal,'palette block');
fs.writeFileSync(p,b);

p='app/page.js';
let s=fs.readFileSync(p,'utf8');
s=replaceOnce(
  s,
  'style={blueTheme({padding:"12px 14px",borderRadius:14,border:eventView===id?"1px solid #3165f4":"1px solid #dde5f0",background:eventView===id?"#3165f4":"#fff",textAlign:"center",color:eventView===id?"#fff":"#17233f",cursor:"pointer"}, "button", "event")}',
  'style={blueTheme({padding:"12px 14px",borderRadius:14,border:eventView===id?"1px solid #3165f4":"1px solid #dde5f0",background:eventView===id?"#3165f4":"#fff",textAlign:"center",color:eventView===id?"#fff":"#17233f",cursor:"pointer"}, "button", id === "attendance" ? "attendance" : "event")}',
  'event selector context'
);
s=s.replaceAll('blueTheme(styles.vipPrizeGuide, "accentSurface", "reward")','blueTheme(styles.vipPrizeGuide, "accentSurface", "event")');
s=s.replaceAll('blueTheme(styles.vipPrizeGuideIcon, "surface", "reward")','blueTheme(styles.vipPrizeGuideIcon, "surface", "event")');
s=s.replaceAll('blueTheme(styles.vipPrizeGuideCopy, "surface", "reward")','blueTheme(styles.vipPrizeGuideCopy, "surface", "event")');
s=s.replaceAll('blueTheme(styles.vipPrizeGuideBadge, "surface", "reward")','blueTheme(styles.vipPrizeGuideBadge, "surface", "event")');
s=replaceOnce(s,'  refEventScreen:{flex:1,minHeight:0,overflowY:"auto",padding:"12px",background:"#f7efe5"},','  refEventScreen:{flex:1,minHeight:0,overflowY:"auto",padding:"14px 12px 18px",background:"#ffffff"},','event screen');
s=replaceOnce(s,'  refHeroEvent:{padding:"16px",borderRadius:"20px",backgroundColor:"#342622",backgroundSize:"cover",backgroundPosition:"center",color:"#fff7ee",boxShadow:"0 12px 26px rgba(66,42,27,.18)",border:"3px solid #fff",overflow:"hidden"},','  refHeroEvent:{padding:"16px",borderRadius:"18px",backgroundColor:"#ffffff",backgroundSize:"cover",backgroundPosition:"center",color:"#17233f",boxShadow:"0 6px 18px rgba(15,23,42,.06)",border:"1px solid #e1e7ef",overflow:"hidden"},','hero event');
s=replaceOnce(s,'  refHeroEventTop:{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"#e9d7c8"},','  refHeroEventTop:{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"#65758c",fontWeight:"800"},','hero top');

const required=[
  'onClick={()=>setEventView(id)}',
  'checkDailyAttendance',
  'joinAutoEvent',
  'getActiveAutoEvent()',
  'getNextAutoEvent()',
  'giftInventory',
  'adminEventEntries',
  'sendPrivateMessage',
  'AiProcessMemberGuide compact'
];
for(const token of required){if(!s.includes(token))throw new Error('function preservation check failed: '+token);}
fs.writeFileSync(p,s);
console.log('Finance event/attendance stage 2 applied successfully.');
