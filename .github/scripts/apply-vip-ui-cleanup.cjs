const fs = require('fs');

const path = 'app/page.js';
let s = fs.readFileSync(path, 'utf8');

const oldEvent = `                <div style={blueTheme({display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}, "surface", "event")}>
                  {[["live","실시간 이벤트","매시간 새로운 혜택"],["attendance","출석 이벤트","매일 쌓이는 출석 혜택"]].map(([id,title,desc])=>(
                    <button key={id} type="button" onClick={()=>setEventView(id)} aria-pressed={eventView===id} style={blueTheme({padding:"18px 12px",borderRadius:16,border:eventView===id?"2px solid #b78a42":"1px solid #e5d8c5",background:eventView===id?"#fff5e4":"#fff",textAlign:"left",color:"#382e23",cursor:"pointer"}, "button", "event")}>
                      <strong style={blueTheme({display:"block",fontSize:15}, "buttonChild", "event")}>{title}</strong><span style={blueTheme({display:"block",marginTop:6,fontSize:11,color:"#88745a"}, "buttonChild", "event")}>{desc}</span>
                    </button>
                  ))}
                </div>`;

const newEvent = `                <div style={blueTheme({display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}, "surface", "event")}>
                  {[["live","실시간 이벤트"],["attendance","출석 이벤트"]].map(([id,title])=>(
                    <button key={id} type="button" onClick={()=>setEventView(id)} aria-pressed={eventView===id} style={blueTheme({padding:"12px 14px",borderRadius:14,border:eventView===id?"1px solid #3165f4":"1px solid #dde5f0",background:eventView===id?"#3165f4":"#fff",textAlign:"center",color:eventView===id?"#fff":"#17233f",cursor:"pointer"}, "button", "event")}>
                      <strong style={blueTheme({display:"block",fontSize:14}, "buttonChild", "event")}>{title}</strong>
                    </button>
                  ))}
                </div>`;

const oldReward = `                          <div style={blueTheme(styles.sponsorSupportBadge, "surface", "reward")}>VIP MEMBERSHIP</div>
                          <strong style={blueTheme({display:"block",fontSize:"16px",marginBottom:"8px"}, "surface", "reward")}>
                            {profile?.real_name || profile?.nickname || "VIP 회원"}님, 환영합니다. ♛
                          </strong>
                          <p style={blueTheme({margin:"0 0 12px"}, "surface", "reward")}>
                            회원님께서는 <b>인공지능 기업 제품 협업을 통해 VIP 회원</b>으로 등록되셨습니다.
                            제품 배송 전 필요한 안내는 이곳 <b>1:1 고객센터</b>에서 순차적으로 안내드리며,
                            VIP 회원 전용 <b>이벤트 및 특별 혜택</b>도 함께 제공됩니다.
                          </p>

                          <div style={blueTheme(styles.sponsorSupportMiniNotice, "surface", "reward")}>
                            <div style={blueTheme({fontWeight:"900",marginBottom:"7px"}, "surface", "reward")}>🎁 VIP 이벤트 안내</div>
                            <div style={blueTheme({lineHeight:1.75}, "surface", "reward")}>
                              📅 <b>출석 이벤트</b><br/>
                              10회 누적 참여마다 <b>3,000원 ~ 20만원 상당 기프티콘 즉시 지급</b><br/><br/>
                              🎯 <b>매시간 참여 이벤트</b><br/>
                              각 회차마다 참여 가능하며 <b>3,000원 ~ 10만원 상당 기프티콘 즉시 지급</b><br/><br/>
                              당첨 상품은 이곳 <b>1:1 고객센터에서 바로 안내·지급</b>해드립니다. :)
                            </div>
                          </div>

                          <div style={blueTheme({margin:"12px 0 8px",fontSize:"13px",lineHeight:1.65}, "surface", "reward")}>
                            ⏰ 이벤트 운영시간은 <b>24시간 · 매 정각 시작</b>이며,
                            이벤트 내용과 진행 시간은 <b>이벤트</b> 메뉴에서 확인하실 수 있습니다.
                          </div>
`;

const newReward = `                          <div style={blueTheme(styles.sponsorSupportBadge, "surface", "reward")}>상품 지급</div>
                          <strong style={blueTheme({display:"block",fontSize:"16px",marginBottom:"8px"}, "surface", "reward")}>
                            지급된 상품과 안내를 확인해주세요.
                          </strong>
                          <p style={blueTheme({margin:"0 0 12px"}, "surface", "reward")}>
                            이벤트 당첨 상품과 제품 배송 관련 지급 안내가 이곳에 순차적으로 표시됩니다.
                          </p>
`;

const eventCount = s.split(oldEvent).length - 1;
if (eventCount !== 1) throw new Error(`event selector expected once, found ${eventCount}`);
s = s.replace(oldEvent, newEvent);

const rewardCount = s.split(oldReward).length - 1;
if (rewardCount !== 1) throw new Error(`reward intro expected once, found ${rewardCount}`);
s = s.replace(oldReward, newReward);

const required = [
  'onClick={()=>setEventView(id)}',
  'setChatTab("event")',
  'privateMessages.map((item, index) =>',
  'openPrivateChat();',
  'sendPrivateMessage',
  'handleAttendance',
  'participateAutoEvent',
  'AiProcessMemberGuide compact'
];
for (const token of required) {
  if (!s.includes(token)) throw new Error(`function preservation check failed: ${token}`);
}

fs.writeFileSync(path, s);
console.log('VIP duplicate-copy cleanup applied successfully.');
