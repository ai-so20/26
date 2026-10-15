const fs=require('fs');
const p='app/page.js';
let s=fs.readFileSync(p,'utf8');
function replaceOnce(oldValue,newValue,label){
  const count=s.split(oldValue).length-1;
  if(count!==1) throw new Error(`${label}: expected once, found ${count}`);
  s=s.replace(oldValue,newValue);
}
replaceOnce('      { id: "event", icon: "🎁", label: "이벤트" },\n      { id: "ai", icon: "bars", label: "AI프로세스" },\n      { id: "private", icon: "🎁", label: "상품 지급" },','      { id: "event", icon: "◈", label: "이벤트" },\n      { id: "ai", icon: "bars", label: "AI프로세스" },\n      { id: "private", icon: "▣", label: "상품 지급" },','nav icons');
const replacements={
'  refPage:{minHeight:"100vh",height:"100dvh",width:"100vw",maxWidth:"100vw",overflow:"hidden",overflowX:"hidden",background:"linear-gradient(135deg,#efe4d6,#f8f0e6)",display:"flex",justifyContent:"center",alignItems:"stretch",fontFamily:"Arial, sans-serif",color:"#2b221e"},':'  refPage:{minHeight:"100vh",height:"100dvh",width:"100vw",maxWidth:"100vw",overflow:"hidden",overflowX:"hidden",background:"#f4f7fb",display:"flex",justifyContent:"center",alignItems:"stretch",fontFamily:"Arial, sans-serif",color:"#17233f"},',
'  refApp:{width:"100%",maxWidth:"520px",minWidth:0,minHeight:0,height:"100dvh",maxHeight:"100dvh",overflowX:"hidden",background:"#f7efe5",boxShadow:"0 0 50px rgba(56,38,27,.16)",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden",boxSizing:"border-box",touchAction:"manipulation",WebkitTextSizeAdjust:"100%"},':'  refApp:{width:"100%",maxWidth:"520px",minWidth:0,minHeight:0,height:"100dvh",maxHeight:"100dvh",overflowX:"hidden",background:"#ffffff",boxShadow:"0 0 36px rgba(21,44,79,.10)",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden",boxSizing:"border-box",touchAction:"manipulation",WebkitTextSizeAdjust:"100%"},',
'  refHeader:{height:"70px",padding:"0 14px",background:"linear-gradient(135deg,#28221f,#171716)",display:"flex",alignItems:"center",justifyContent:"space-between",color:"#fff",flexShrink:0,position:"relative",zIndex:2147483647,pointerEvents:"auto"},':'  refHeader:{height:"64px",padding:"0 14px",background:"#ffffff",display:"flex",alignItems:"center",justifyContent:"space-between",color:"#17233f",borderBottom:"1px solid #e5eaf1",flexShrink:0,position:"relative",zIndex:2147483647,pointerEvents:"auto"},',
'  refBrand:{display:"flex",alignItems:"center",gap:"9px"},':'  refBrand:{display:"flex",alignItems:"center",gap:"8px",minWidth:0},',
'  refHeaderRight:{display:"flex",alignItems:"center",gap:"6px",position:"relative",zIndex:2147483647,pointerEvents:"auto"},':'  refHeaderRight:{display:"flex",alignItems:"center",gap:"5px",position:"relative",zIndex:2147483647,pointerEvents:"auto"},',
'  refMyInfoButton:{height:"34px",padding:"3px 9px 3px 4px",borderRadius:"999px",border:"1px solid rgba(235,197,127,.38)",background:"linear-gradient(145deg,rgba(255,245,218,.12),rgba(183,123,47,.08))",color:"#f4d69b",display:"flex",alignItems:"center",gap:"6px",fontSize:"9px",fontWeight:"900",letterSpacing:".2px",cursor:"pointer",boxShadow:"inset 0 1px 0 rgba(255,255,255,.08)"},':'  refMyInfoButton:{height:"36px",padding:"3px 10px 3px 4px",borderRadius:"999px",border:"1px solid #dce3ed",background:"#ffffff",color:"#243552",display:"flex",alignItems:"center",gap:"6px",fontSize:"9px",fontWeight:"850",letterSpacing:".1px",cursor:"pointer",boxShadow:"0 1px 2px rgba(15,23,42,.04)"},',
'  refMyInfoAvatar:{width:"26px",height:"26px",borderRadius:"50%",objectFit:"cover",border:"1px solid #e7bd6b",boxShadow:"0 2px 8px rgba(0,0,0,.22)"},':'  refMyInfoAvatar:{width:"28px",height:"28px",borderRadius:"50%",objectFit:"cover",border:"1px solid #d9e2ef",boxShadow:"0 1px 3px rgba(15,23,42,.10)"},',
'  refNav:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"5px",padding:"10px 8px 9px",background:"#211d1b",borderBottom:"1px solid rgba(255,255,255,.06)",flexShrink:0},':'  refNav:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"6px",padding:"8px 10px 9px",background:"#ffffff",borderBottom:"1px solid #e5eaf1",flexShrink:0},',
'  refNavButton:{position:"relative",minWidth:0,height:"58px",border:"1px solid rgba(255,255,255,.06)",borderRadius:"12px",background:"#262220",color:"#c9beb6",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"4px",fontSize:"10px",fontWeight:"800",cursor:"pointer",boxShadow:"inset 0 1px 0 rgba(255,255,255,.025)"},':'  refNavButton:{position:"relative",minWidth:0,height:"54px",border:"1px solid #e1e7ef",borderRadius:"13px",background:"#ffffff",color:"#52627a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"4px",fontSize:"10px",fontWeight:"800",cursor:"pointer",boxShadow:"0 1px 2px rgba(15,23,42,.03)"},',
'  refNavButtonActive:{background:"linear-gradient(145deg,#fff9ee,#f2dfc2)",color:"#3c2b22",border:"1px solid #f3d7aa",boxShadow:"0 0 20px rgba(239,190,116,.30),inset 0 0 0 1px rgba(255,255,255,.7)"},':'  refNavButtonActive:{background:"linear-gradient(145deg,#f4f8ff,#edf4ff)",color:"#2458d6",border:"1px solid #c8d8fb",boxShadow:"0 2px 8px rgba(36,88,214,.08)"},',
'  refNavIcon:{fontSize:"20px",lineHeight:1},':'  refNavIcon:{fontSize:"16px",lineHeight:1,fontWeight:"900"},',
'  refLogoutButton:{height:"30px",padding:"0 7px",borderRadius:"10px",border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.025)",color:"#bda98c",display:"flex",alignItems:"center",gap:"3px",cursor:"pointer",fontSize:"9px"},':'  refLogoutButton:{height:"34px",padding:"0 8px",borderRadius:"10px",border:"1px solid #e1e6ed",background:"transparent",color:"#718096",display:"flex",alignItems:"center",gap:"3px",cursor:"pointer",fontSize:"9px"},'
};
for(const [a,b] of Object.entries(replacements)) replaceOnce(a,b,a.slice(0,35));
fs.writeFileSync(p,s);

const t='lib/blueTheme.mjs';
let b=fs.readFileSync(t,'utf8');
const old=`  const navButton = role === 'button' && style.height === '58px' && style.flexDirection === 'column';`;
const neu=`  const navButton = role === 'button' && style.height === '54px' && style.flexDirection === 'column';`;
if((b.split(old).length-1)!==1) throw new Error('navButton detector mismatch');
b=b.replace(old,neu);
const oldBranch=`    if (hasGradient) {\n      result.background = BLUE;\n      result.color = '#ffffff';\n      result.border = \`1px solid \${BLUE}\`;\n      result.boxShadow = '0 4px 12px rgba(49,101,244,.12)';\n    } else {\n      result.background = '#ffffff';\n      result.color = PRIMARY;\n      result.border = '1px solid #dce4ef';\n      result.boxShadow = '0 1px 2px rgba(15,23,42,.035)';\n    }`;
const newBranch=`    if (hasGradient) {\n      result.background = '#f3f7ff';\n      result.color = '#2458d6';\n      result.border = '1px solid #c9d8f8';\n      result.boxShadow = '0 2px 8px rgba(36,88,214,.07)';\n    } else {\n      result.background = '#ffffff';\n      result.color = '#52627a';\n      result.border = '1px solid #e1e7ef';\n      result.boxShadow = '0 1px 2px rgba(15,23,42,.025)';\n    }`;
if((b.split(oldBranch).length-1)!==1) throw new Error('navButton branch mismatch');
b=b.replace(oldBranch,newBranch);
fs.writeFileSync(t,b);

const required=[
  'onClick={() => changeTab(nav.id)}',
  'onClick={enablePrivateNotifications}',
  'onClick={() => setShowProfileInfo(true)}',
  'onClick={handleLogout}',
  'setChatTab(id);',
  'openPrivateChat();',
  'checkDailyAttendance',
  'joinAutoEvent',
  'sendPrivateMessage',
  'AiProcessMemberGuide compact'
];
const final=fs.readFileSync(p,'utf8');
for(const token of required){ if(!final.includes(token)) throw new Error(`function preservation check failed: ${token}`); }
console.log('Finance shell stage 1 applied successfully.');
