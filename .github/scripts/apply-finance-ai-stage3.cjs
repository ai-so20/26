const fs=require('fs');
const p='app/page.js';
let s=fs.readFileSync(p,'utf8');
function r(oldValue,newValue,label){const c=s.split(oldValue).length-1;if(c!==1)throw new Error(`${label}: expected once, found ${c}`);s=s.replace(oldValue,newValue);}
r('  refAiScreen:{flex:1,minHeight:0,overflowY:"auto",padding:"12px",background:"#f7efe5"},','  refAiScreen:{flex:1,minHeight:0,overflowY:"auto",padding:"14px 12px 18px",background:"#ffffff"},','AI screen');
r(`  aiProHero:{
    position:"relative",overflow:"hidden",padding:"23px 18px 18px",borderRadius:"22px",
    background:"linear-gradient(135deg,#f9fcff 0%,#e8f2ff 48%,#c8dcf5 100%)",
    border:"1px solid #c4d5ea",boxShadow:"0 12px 28px rgba(35,72,120,.12)",color:"#142d50"
  },`,`  aiProHero:{
    position:"relative",overflow:"hidden",padding:"20px 17px 17px",borderRadius:"18px",
    background:"linear-gradient(145deg,#ffffff 0%,#f5f8fe 62%,#edf3fd 100%)",
    border:"1px solid #d8e2f0",boxShadow:"0 7px 20px rgba(25,58,105,.07)",color:"#17233f"
  },`,'AI hero');
r(`  aiProHeroGlow:{
    position:"absolute",right:"-65px",top:"-75px",width:"230px",height:"230px",borderRadius:"50%",
    background:"radial-gradient(circle,rgba(24,91,190,.26),rgba(24,91,190,0) 68%)"
  },`,`  aiProHeroGlow:{display:"none"},`,'AI hero glow');
r(`  aiProHeroTag:{
    position:"relative",display:"inline-flex",padding:"5px 9px",borderRadius:"999px",
    background:"#102d56",color:"#fff",fontSize:"8px",fontWeight:"1000",letterSpacing:"1.2px"
  },`,`  aiProHeroTag:{
    position:"relative",display:"inline-flex",padding:"5px 9px",borderRadius:"999px",
    background:"#eef4ff",color:"#2458d6",border:"1px solid #d6e2fb",fontSize:"8px",fontWeight:"1000",letterSpacing:"1.1px"
  },`,'AI hero tag');
r('  aiProTitle:{margin:0,fontSize:"27px",lineHeight:1.05,fontWeight:"1000",letterSpacing:"-1px",color:"#142b4d"},','  aiProTitle:{margin:0,fontSize:"25px",lineHeight:1.08,fontWeight:"950",letterSpacing:"-.8px",color:"#17233f"},','AI title');
r('  aiProTitleAccent:{display:"block",marginTop:"3px",fontSize:"21px",color:"#1761c2",letterSpacing:"-.6px"},','  aiProTitleAccent:{display:"block",marginTop:"4px",fontSize:"18px",color:"#2458d6",letterSpacing:"-.35px"},','AI title accent');
r(`  aiProChip:{
    flex:"0 0 68px",width:"68px",height:"68px",borderRadius:"19px",display:"flex",flexDirection:"column",
    alignItems:"center",justifyContent:"center",background:"linear-gradient(145deg,#2774d4,#0b326c)",
    color:"#fff",border:"1px solid rgba(255,255,255,.75)",boxShadow:"0 10px 22px rgba(21,75,145,.28),inset 0 1px 0 rgba(255,255,255,.4)"
  },`,`  aiProChip:{
    flex:"0 0 62px",width:"62px",height:"62px",borderRadius:"16px",display:"flex",flexDirection:"column",
    alignItems:"center",justifyContent:"center",background:"#2458d6",
    color:"#fff",border:"1px solid #2458d6",boxShadow:"0 6px 16px rgba(36,88,214,.16)"
  },`,'AI chip');
r('  aiProFeatureRow:{position:"relative",marginTop:"18px",display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"5px"},','  aiProFeatureRow:{position:"relative",marginTop:"14px",display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"0",padding:"6px 0",background:"#f8fafc",borderTop:"1px solid #e5eaf1",borderBottom:"1px solid #e5eaf1"},','AI feature row');
r(`  aiProProcessCard:{
    marginTop:"12px",padding:"18px 12px 14px",borderRadius:"20px",background:"#fff",
    border:"1px solid #dce4ed",boxShadow:"0 8px 20px rgba(42,59,78,.07)"
  },`,`  aiProProcessCard:{
    marginTop:"12px",padding:"17px 12px 14px",borderRadius:"17px",background:"#fff",
    border:"1px solid #e0e7f0",boxShadow:"0 5px 16px rgba(31,54,84,.05)"
  },`,'AI process card');
r(`  aiProStep:{
    position:"relative",minWidth:0,padding:"13px 7px 10px",borderRadius:"14px",textAlign:"center",
    background:"linear-gradient(180deg,#fbfdff,#f1f6fc)",border:"1px solid #dce6f2"
  },`,`  aiProStep:{
    position:"relative",minWidth:0,padding:"13px 7px 10px",borderRadius:"12px",textAlign:"center",
    background:"#f8fafc",border:"1px solid #e2e8f0"
  },`,'AI step');
r(`  aiProHowCard:{
    marginTop:"12px",padding:"17px 10px 14px",borderRadius:"20px",background:"#fff",
    border:"1px solid #dce4ed",boxShadow:"0 8px 20px rgba(42,59,78,.06)"
  },`,`  aiProHowCard:{
    marginTop:"12px",padding:"17px 10px 14px",borderRadius:"17px",background:"#fff",
    border:"1px solid #e0e7f0",boxShadow:"0 5px 16px rgba(31,54,84,.045)"
  },`,'AI how card');
r(`  aiProStandby:{
    position:"relative",overflow:"hidden",marginTop:"13px",padding:"28px 18px 20px",borderRadius:"21px",
    textAlign:"center",background:"linear-gradient(145deg,rgba(40,31,25,.95),rgba(79,57,35,.93))",
    border:"1px solid rgba(227,183,98,.52)",boxShadow:"0 13px 28px rgba(53,35,19,.17)",color:"#fff"
  },`,`  aiProStandby:{
    position:"relative",overflow:"hidden",marginTop:"13px",padding:"24px 18px 18px",borderRadius:"17px",
    textAlign:"center",background:"#f7f9fd",
    border:"1px solid #dce5f1",boxShadow:"0 5px 16px rgba(31,54,84,.05)",color:"#17233f"
  },`,'AI standby');
r(`  aiProStandbyWatermark:{
    position:"absolute",left:"50%",top:"47%",transform:"translate(-50%,-50%) rotate(-13deg)",
    fontSize:"51px",fontWeight:"1000",letterSpacing:"5px",color:"rgba(255,224,164,.055)",
    whiteSpace:"nowrap",pointerEvents:"none"
  },`,`  aiProStandbyWatermark:{display:"none"},`,'AI standby watermark');
r(`  aiProStandbyIcon:{
    position:"relative",width:"44px",height:"44px",margin:"0 auto 9px",borderRadius:"50%",
    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"25px",
    background:"rgba(232,187,99,.12)",border:"1px solid rgba(232,187,99,.4)",color:"#e9bd6a"
  },`,`  aiProStandbyIcon:{
    position:"relative",width:"44px",height:"44px",margin:"0 auto 9px",borderRadius:"13px",
    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"23px",
    background:"#eef4ff",border:"1px solid #d6e2fb",color:"#2458d6"
  },`,'AI standby icon');
r(`  aiProStandbyBottom:{
    position:"relative",marginTop:"14px",padding:"10px 9px",borderRadius:"12px",
    background:"rgba(255,244,219,.09)",border:"1px solid rgba(239,198,118,.18)",
    fontSize:"9px",lineHeight:1.6,color:"rgba(255,255,255,.74)"
  },`,`  aiProStandbyBottom:{
    position:"relative",marginTop:"14px",padding:"10px 9px",borderRadius:"11px",
    background:"#ffffff",border:"1px solid #e1e7ef",
    fontSize:"9px",lineHeight:1.6,color:"#5f6f85"
  },`,'AI standby bottom');
r('  aiProFooter:{padding:"17px 8px 8px",textAlign:"center",color:"#7d6c5d"},','  aiProFooter:{padding:"17px 8px 8px",textAlign:"center",color:"#718096"},','AI footer');
r(`  aiBenefitStateWrap:{
    position:"relative",width:"100%",maxWidth:"100%",minWidth:0,overflow:"hidden",borderRadius:"22px"
  },`,`  aiBenefitStateWrap:{
    position:"relative",width:"100%",maxWidth:"100%",minWidth:0,overflow:"visible",borderRadius:"18px"
  },`,'AI state wrap');
r(`  aiBenefitDiagonalRibbon:{
    position:"absolute",zIndex:30,left:"-18%",top:"122px",width:"136%",
    transform:"rotate(-10deg)",transformOrigin:"center",padding:"10px 16px 11px",
    boxSizing:"border-box",textAlign:"center",
    background:"linear-gradient(90deg,rgba(78,35,28,.66),rgba(132,64,43,.78),rgba(78,35,28,.66))",
    borderTop:"1px solid rgba(255,220,166,.62)",borderBottom:"1px solid rgba(255,220,166,.62)",
    boxShadow:"0 7px 22px rgba(34,18,12,.18)",backdropFilter:"blur(2.5px)",pointerEvents:"none"
  },`,`  aiBenefitDiagonalRibbon:{
    position:"relative",zIndex:2,left:0,top:0,width:"100%",
    transform:"none",padding:"11px 12px",
    boxSizing:"border-box",textAlign:"left",borderRadius:"14px",marginBottom:"8px",
    background:"#f4f7fd",border:"1px solid #dbe5f3",
    boxShadow:"0 2px 8px rgba(31,54,84,.04)",pointerEvents:"none"
  },`,'AI ribbon');
r(`  aiBenefitRibbonSmall:{
    display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"2px",
    color:"rgba(255,242,218,.76)",lineHeight:1.2
  },`,`  aiBenefitRibbonSmall:{
    display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.5px",
    color:"#718096",lineHeight:1.2
  },`,'AI ribbon small');
r(`  aiBenefitRibbonTitle:{
    display:"block",marginTop:"3px",fontSize:"18px",lineHeight:1.22,fontWeight:"1000",
    letterSpacing:"-.5px",color:"#fff7e7",textShadow:"0 2px 7px rgba(0,0,0,.32)"
  },`,`  aiBenefitRibbonTitle:{
    display:"block",marginTop:"3px",paddingRight:"70px",fontSize:"16px",lineHeight:1.3,fontWeight:"950",
    letterSpacing:"-.35px",color:"#244d8f",textShadow:"none"
  },`,'AI ribbon title');
r(`  aiBenefitRibbonSub:{
    display:"block",marginTop:"3px",fontSize:"8px",fontWeight:"800",color:"rgba(255,244,225,.85)"
  },`,`  aiBenefitRibbonSub:{
    display:"block",marginTop:"3px",paddingRight:"70px",fontSize:"8px",fontWeight:"750",color:"#65758c"
  },`,'AI ribbon sub');
r(`  aiBenefitCornerBadge:{
    position:"absolute",zIndex:31,right:"11px",top:"11px",minWidth:"57px",padding:"7px 8px",
    borderRadius:"11px",display:"flex",flexDirection:"column",alignItems:"center",
    background:"rgba(16,35,60,.82)",border:"1px solid rgba(143,190,242,.36)",
    boxShadow:"0 5px 15px rgba(15,36,65,.16)",backdropFilter:"blur(5px)",pointerEvents:"none"
  },`,`  aiBenefitCornerBadge:{
    position:"absolute",zIndex:3,right:"9px",top:"9px",minWidth:"57px",padding:"6px 8px",
    borderRadius:"10px",display:"flex",flexDirection:"column",alignItems:"center",
    background:"#ffffff",border:"1px solid #d6e2f3",
    boxShadow:"0 2px 7px rgba(31,54,84,.05)",pointerEvents:"none"
  },`,'AI corner badge');
r(`  aiHeroAvailability:{
    position:"relative",marginTop:"10px",padding:"8px 9px",borderRadius:"10px",
    background:"rgba(255,255,255,.56)",border:"1px solid rgba(35,91,158,.13)",
    color:"#536a83",fontSize:"8.5px",fontWeight:"800",lineHeight:1.5,wordBreak:"keep-all"
  },`,`  aiHeroAvailability:{
    position:"relative",marginTop:"10px",padding:"9px 10px",borderRadius:"10px",
    background:"#ffffff",border:"1px solid #dfe7f2",
    color:"#52627a",fontSize:"8.5px",fontWeight:"800",lineHeight:1.5,wordBreak:"keep-all"
  },`,'AI availability');
const required=['loadAiMemberProcess','loadAiAdminRows','saveAiAdminSettings','getMemberProcessSnapshot','AiProcessMemberGuide compact','setChatTab("private")','openPrivateChat();','aiMemberProcess?.status','aiAdminRows'];
for(const token of required){if(!s.includes(token))throw new Error('function preservation check failed: '+token);}
fs.writeFileSync(p,s);
console.log('Finance AI stage 3 applied successfully.');
