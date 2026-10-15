"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./supabase";
import { blueTheme } from "../lib/blueTheme.mjs";

const GROUP_CHAT_ENABLED = false;

const ROOM_ID = "0a495a02-bcb8-4e38-b3ef-4e7059c2a883";

function avatarSrc(value) {
  const raw = String(value || "01");
  if (raw === "admin") return "/avatars/admin.png.png";
  const key = raw.padStart(2, "0");
  return /^\d{2}$/.test(key) && Number(key) >= 1 && Number(key) <= 43
    ? `/avatars/${key}.png`
    : "/avatars/01.png";
}

async function nicknameToEmail(nickname) {
  const normalized = nickname.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `vip-${hash}@example.com`;
}

// 비밀번호 입력을 영문/대문자/한글 키보드 상태와 관계없이 같은 키 입력으로 맞춥니다.
function normalizePasswordInput(value) {
  const initial = ["r","R","s","e","E","f","a","q","Q","t","T","d","w","W","c","z","x","v","g"];
  const medial = ["k","o","i","O","j","p","u","P","h","hk","ho","hl","y","n","nj","np","nl","b","m","ml","l"];
  const final = ["","r","R","rt","s","sw","sg","e","f","fr","fa","fq","ft","fx","fv","fg","a","q","qt","t","T","d","w","c","z","x","v","g"];
  const jamo = {
    "ㄱ":"r","ㄲ":"R","ㄴ":"s","ㄷ":"e","ㄸ":"E","ㄹ":"f","ㅁ":"a","ㅂ":"q","ㅃ":"Q","ㅅ":"t","ㅆ":"T","ㅇ":"d","ㅈ":"w","ㅉ":"W","ㅊ":"c","ㅋ":"z","ㅌ":"x","ㅍ":"v","ㅎ":"g",
    "ㅏ":"k","ㅐ":"o","ㅑ":"i","ㅒ":"O","ㅓ":"j","ㅔ":"p","ㅕ":"u","ㅖ":"P","ㅗ":"h","ㅘ":"hk","ㅙ":"ho","ㅚ":"hl","ㅛ":"y","ㅜ":"n","ㅝ":"nj","ㅞ":"np","ㅟ":"nl","ㅠ":"b","ㅡ":"m","ㅢ":"ml","ㅣ":"l"
  };

  let result = "";
  for (const ch of String(value || "")) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const offset = code - 0xac00;
      const first = Math.floor(offset / 588);
      const middle = Math.floor((offset % 588) / 28);
      const last = offset % 28;
      result += initial[first] + medial[middle] + final[last];
    } else {
      result += jamo[ch] || ch;
    }
  }
  return result.toLowerCase();
}

export default function Home() {
  const [mode, setMode] = useState("login");
  const [eventView, setEventView] = useState("live");
  const [registerNickname, setRegisterNickname] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerWorking, setRegisterWorking] = useState(false);
  const [registerNotice, setRegisterNotice] = useState("");

  const [nickname, setNickname] = useState("");
  const [realName, setRealName] = useState("");
  const [password, setPassword] = useState("");

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [messages, setMessages] = useState([]);
  const [memberNames, setMemberNames] = useState({});
  const [memberAvatars, setMemberAvatars] = useState({});
  const [approvedMemberCount, setApprovedMemberCount] = useState(0);
  const [onlineMemberCount, setOnlineMemberCount] = useState(1);
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordChangeWorking, setPasswordChangeWorking] = useState(false);
  const [adminPasswordTarget, setAdminPasswordTarget] = useState(null);
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminIdentityTarget, setAdminIdentityTarget] = useState(null);
  const [adminEditNickname, setAdminEditNickname] = useState("");
  const [adminEditRealName, setAdminEditRealName] = useState("");
  const [adminIdentityWorking, setAdminIdentityWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [showGroupEmoji, setShowGroupEmoji] = useState(false);
  const [showPrivateEmoji, setShowPrivateEmoji] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);

  const [chatTab, setChatTab] = useState("event");
  // 모바일 주소창 높이 변화 시 채팅 하단이 떠 보이지 않도록 실제 가시 영역을 기준으로 맞춘다.
  const [mobileViewportHeight, setMobileViewportHeight] = useState(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateViewportHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      if (height > 0) setMobileViewportHeight((prev) => Math.abs((prev || 0) - height) > 1 ? height : prev);
    };
    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    window.visualViewport?.addEventListener("resize", updateViewportHeight);
    return () => {
      window.removeEventListener("resize", updateViewportHeight);
      window.visualViewport?.removeEventListener("resize", updateViewportHeight);
    };
  }, []);

  const [privateChatId, setPrivateChatId] = useState(null);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [privateMessage, setPrivateMessage] = useState("");

  const [adminChats, setAdminChats] = useState([]);
  const [adminMembers, setAdminMembers] = useState([]);
  const [adminApprovalMembers, setAdminApprovalMembers] = useState([]);
  const [adminApprovalWorking, setAdminApprovalWorking] = useState(false);
  const [adminApprovalAlert, setAdminApprovalAlert] = useState(null);
  const adminApprovalKnownIdsRef = useRef(new Set());
  const adminApprovalInitializedRef = useRef(false);
  const [showApprovedMemberManager, setShowApprovedMemberManager] = useState(false);
  const [approvedMemberManagerRows, setApprovedMemberManagerRows] = useState([]);
  const approvedMemberManagerLoadVersionRef = useRef(0);
  const approvedMemberManagerSavingRef = useRef(false);
  const [approvedMemberManagerSearch, setApprovedMemberManagerSearch] = useState("");
  const [approvedMemberManagerWorking, setApprovedMemberManagerWorking] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [adminEventEntries, setAdminEventEntries] = useState([]);
  const [adminEventEntryTarget, setAdminEventEntryTarget] = useState(null);
  const [adminEventEntriesLoading, setAdminEventEntriesLoading] = useState(false);
  const [selectedAdminChat, setSelectedAdminChat] = useState(null);

  const [adminUnreadCounts, setAdminUnreadCounts] = useState({});
  const [memberUnreadCount, setMemberUnreadCount] = useState(0);
  const [groupUnreadCount, setGroupUnreadCount] = useState(0);
  const [chatFrozen, setChatFrozen] = useState(false);
  const [freezeWorking, setFreezeWorking] = useState(false);
  const [chatClockTick, setChatClockTick] = useState(0);

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [privateAlert, setPrivateAlert] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [adminIdentity, setAdminIdentity] = useState({ nickname: "관리자", avatar: "admin" });
  const [vipLocked, setVipLocked] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [chatImagePreview, setChatImagePreview] = useState("");
  const [installGuideEligibleThisLogin, setInstallGuideEligibleThisLogin] = useState(false);
  const [showSponsorWelcome, setShowSponsorWelcome] = useState(false);
  const [showSurpriseEventGuide, setShowSurpriseEventGuide] = useState(false);
  const [surpriseGuide, setSurpriseGuide] = useState({title:"돌발 체험 이벤트 안내",body:""});
  const [surpriseGuideSaving, setSurpriseGuideSaving] = useState(false);
  const [surpriseGuideCollapsed, setSurpriseGuideCollapsed] = useState(true);
  const [surpriseCopy,setSurpriseCopy]=useState({group_start_title:"",group_start_body:"",group_complete_title:"",group_complete_body:"",private_start_body:""});
  const [eventWinnerFooter,setEventWinnerFooter]=useState("💌 당첨 상품은 카카오톡 1:1 고객센터에서 확인해주세요.");
  const [eventWinnerFooterCollapsed,setEventWinnerFooterCollapsed]=useState(true);
  const [eventWinnerFooterSaving,setEventWinnerFooterSaving]=useState(false);
  async function loadEventWinnerFooter(){
    const {data,error}=await supabase.from("vip_surprise_copy_settings").select("event_winner_footer").eq("id",1).maybeSingle();
    if(error){if(profile?.role==="admin")setNotice("당첨 안내 문구 불러오기 실패: "+error.message);return;}
    if(data)setEventWinnerFooter(data.event_winner_footer??"");
  }
  async function saveEventWinnerFooter(){
    if(profile?.role!=="admin"||eventWinnerFooterSaving)return;
    setEventWinnerFooterSaving(true);
    try{
      const {error}=await supabase.rpc("admin_update_event_winner_footer",{p_footer:eventWinnerFooter});
      if(error)throw error;
      setNotice("그룹채팅 당첨 안내 문구 저장 완료");
      await loadEventWinnerFooter();
    }catch(error){setNotice("당첨 안내 문구 저장 실패: "+error.message);}
    finally{setEventWinnerFooterSaving(false);}
  }
    const [surpriseCopyCollapsed,setSurpriseCopyCollapsed]=useState(true);
  const [surpriseCopySaving,setSurpriseCopySaving]=useState(false);
  async function loadSurpriseCopy(){
    const {data,error}=await supabase.from("vip_surprise_copy_settings").select("group_start_title,group_start_body,group_complete_title,group_complete_body,private_start_body").eq("id",1).maybeSingle();
    if(error){if(profile?.role==="admin")setNotice("공지 문구 불러오기 실패: "+error.message);return;}
    if(data)setSurpriseCopy(data);
  }
  useEffect(()=>{if(user?.id)loadSurpriseCopy();},[user?.id,profile?.role]);
  useEffect(()=>{
    if(!user?.id || chatTab!=="group")return;
    loadSurpriseCopy();
  },[user?.id,chatTab]);
  async function saveSurpriseCopy(){
    if(profile?.role!=="admin"||surpriseCopySaving)return;
    setSurpriseCopySaving(true);
    try{
      const {error}=await supabase.rpc("admin_update_vip_surprise_copy",{
        p_group_start_title:surpriseCopy.group_start_title,p_group_start_body:surpriseCopy.group_start_body,
        p_group_complete_title:surpriseCopy.group_complete_title,p_group_complete_body:surpriseCopy.group_complete_body,
        p_private_start_body:surpriseCopy.private_start_body
      });
      if(error)throw error;
      setNotice("자동 공지 문구 저장 완료");
      await loadSurpriseCopy();
    }catch(error){setNotice("저장 실패: "+error.message);}
    finally{setSurpriseCopySaving(false);}
  }
  function formatSurpriseCopy(value,name){
    return String(value||"").replaceAll("{닉네임}",name||"VIP 회원").replaceAll("\\n","\n");
  }

  const [realSurpriseRows,setRealSurpriseRows] = useState([]);
  const [realSurpriseLoading,setRealSurpriseLoading] = useState(false);
  const [realSurpriseCollapsed,setRealSurpriseCollapsed] = useState(true);
  async function loadRealSurpriseRows() {
    if(profile?.role !== "admin") return;
    setRealSurpriseLoading(true);
    try {
      const {data,error}=await supabase.rpc("admin_list_real_surprise_processes");
      if(error) throw error;
      setRealSurpriseRows(data || []);
    } catch(error) { setNotice("일반 회원 돌발 이벤트 현황 조회 실패: "+(error?.message || "알 수 없는 오류")); }
    finally {setRealSurpriseLoading(false);}
  }

  const [surpriseSettingsCollapsed, setSurpriseSettingsCollapsed] = useState(true);
  async function loadSurpriseGuide() {
    const {data,error}=await supabase.from("vip_surprise_guide").select("title,body").eq("id",1).maybeSingle();
    if(error){setNotice("안내문 불러오기 실패: "+error.message);return;}
    if(data)setSurpriseGuide(data);
  }
  async function saveSurpriseGuide() {
    if(profile?.role!=="admin"||surpriseGuideSaving)return;
    setSurpriseGuideSaving(true);
    try {
      const {error}=await supabase.rpc("admin_update_vip_surprise_guide",{p_title:surpriseGuide.title,p_body:surpriseGuide.body});
      if(error)throw error;
      setNotice("돌발 체험 이벤트 안내문을 저장했습니다.");
    }catch(error){setNotice("안내문 저장 실패: "+error.message);}
    finally{setSurpriseGuideSaving(false);}
  }
  const [memberPresence, setMemberPresence] = useState({});
  const [adminPushStatus, setAdminPushStatus] = useState({});

  const [autoEvents, setAutoEvents] = useState([]);
  const [, setEventClockTick] = useState(0);
  const [eventWorkingId, setEventWorkingId] = useState(null);
  const [eventAnswers, setEventAnswers] = useState({});
  const [rouletteSpins, setRouletteSpins] = useState({});
  const [eventSuccess, setEventSuccess] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState({
    checked_today: false,
    total_count: 0,
    reward_ready: false,
    next_reward_at: 10,
  });
  const [attendanceWorking, setAttendanceWorking] = useState(false);

  const [giftInventory, setGiftInventory] = useState([]);
  const [giftBulkText, setGiftBulkText] = useState("");
  const [giftInventoryWorking, setGiftInventoryWorking] = useState(false);

  // AI 당첨자는 실제 기프티콘을 지급하지 않으므로 그룹채팅 공지용 상품명만 별도 관리합니다.
  const [aiGiftInventory, setAiGiftInventory] = useState([]);
  const [aiGiftBulkText, setAiGiftBulkText] = useState("");
  const [aiGiftWorking, setAiGiftWorking] = useState(false);

  // 출석체크 10회 보상은 일반 이벤트 기프티콘과 완전히 분리된 전용 재고를 사용합니다.
  const [attendanceGiftInventory, setAttendanceGiftInventory] = useState([]);
  const [attendanceGiftBulkText, setAttendanceGiftBulkText] = useState("");
  const [attendanceGiftWorking, setAttendanceGiftWorking] = useState(false);

  const [aiSim, setAiSim] = useState(null);
  const [marketPanelOpen, setMarketPanelOpen] = useState(false);
  // 독립적인 5분 간격 화면 데모: 시세 API나 AI PROCESS 수익 계산에 영향 없음.
  const [marketDemoClock, setMarketDemoClock] = useState(0);
  const [marketDemoPage, setMarketDemoPage] = useState(1);
  useEffect(() => {
    const tick = () => setMarketDemoClock(Date.now());
    tick();
    const timer = setInterval(tick, 15000);
    return () => clearInterval(timer);
  }, []);
  const marketDemoSlot = Math.floor(marketDemoClock / (5 * 60 * 1000));
  const marketDemoAssets = [
    { symbol:"BTC/USD",name:"Bitcoin",kind:"COIN" },{ symbol:"ETH/USD",name:"Ethereum",kind:"COIN" },
    { symbol:"SOL/USD",name:"Solana",kind:"COIN" },{ symbol:"XRP/USD",name:"XRP",kind:"COIN" },
    { symbol:"DOGE/USD",name:"Dogecoin",kind:"COIN" },{ symbol:"ADA/USD",name:"Cardano",kind:"COIN" },
    { symbol:"AVAX/USD",name:"Avalanche",kind:"COIN" },{ symbol:"LINK/USD",name:"Chainlink",kind:"COIN" },
    { symbol:"DOT/USD",name:"Polkadot",kind:"COIN" },{ symbol:"LTC/USD",name:"Litecoin",kind:"COIN" },
    { symbol:"NVDA",name:"NVIDIA",kind:"STOCK" },{ symbol:"AAPL",name:"Apple",kind:"STOCK" },
    { symbol:"TSLA",name:"Tesla",kind:"STOCK" },{ symbol:"MSFT",name:"Microsoft",kind:"STOCK" },
    { symbol:"AMZN",name:"Amazon",kind:"STOCK" },{ symbol:"GOOGL",name:"Alphabet",kind:"STOCK" },
    { symbol:"META",name:"Meta",kind:"STOCK" },{ symbol:"AMD",name:"AMD",kind:"STOCK" },
    { symbol:"NFLX",name:"Netflix",kind:"STOCK" },{ symbol:"PLTR",name:"Palantir",kind:"STOCK" },
    { symbol:"COIN",name:"Coinbase",kind:"STOCK" },{ symbol:"MSTR",name:"Strategy",kind:"STOCK" },
    { symbol:"INTC",name:"Intel",kind:"STOCK" },{ symbol:"UBER",name:"Uber",kind:"STOCK" },
    { symbol:"005930",name:"삼성전자",kind:"KR_STOCK" },{ symbol:"000660",name:"SK하이닉스",kind:"KR_STOCK" },
    { symbol:"005380",name:"현대차",kind:"KR_STOCK" },{ symbol:"035420",name:"NAVER",kind:"KR_STOCK" },
    { symbol:"035720",name:"카카오",kind:"KR_STOCK" },{ symbol:"068270",name:"셀트리온",kind:"KR_STOCK" },
  ];
  // 거래소 현지 시간 기준 정규장 운영 여부 (장 마감 시 주식 기록은 즉시 제외).
  const marketDemoParts = (date, zone) => {
    const parts = new Intl.DateTimeFormat("en-US", {timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);
    const value = (type) => parts.find((part)=>part.type===type)?.value;
    return {year:Number(value("year")),month:Number(value("month")),day:Number(value("day")),weekday:value("weekday"),minutes:Number(value("hour"))*60+Number(value("minute"))};
  };
  const marketDemoNthWeekday = (year,month,weekday,n) => {
    const first = new Date(Date.UTC(year,month-1,1)).getUTCDay();
    return 1+(weekday-first+7)%7+(n-1)*7;
  };
  const marketDemoLastWeekday = (year,month,weekday) => {
    const last = new Date(Date.UTC(year,month,0));
    return last.getUTCDate()-(last.getUTCDay()-weekday+7)%7;
  };
  const marketDemoObserved = (year,month,day) => {
    const d = new Date(Date.UTC(year,month-1,day));
    const w=d.getUTCDay();
    if(w===6)d.setUTCDate(d.getUTCDate()-1);
    if(w===0)d.setUTCDate(d.getUTCDate()+1);
    return d.toISOString().slice(0,10);
  };
  const marketDemoEaster = (year) => {
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
    const h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k+7)%7,m=Math.floor((a+11*h+22*l)/451);
    const month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
    return new Date(Date.UTC(year,month-1,day));
  };
  const marketDemoUSClosed = ({year,month,day}) => {
    const key=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const easter=marketDemoEaster(year);
    easter.setUTCDate(easter.getUTCDate()-2);
    const holidays=[
      marketDemoObserved(year,1,1),marketDemoObserved(year+1,1,1),
      marketDemoObserved(year,6,19),marketDemoObserved(year,7,4),marketDemoObserved(year,12,25),
      `${year}-01-${String(marketDemoNthWeekday(year,1,1,3)).padStart(2,"0")}`,
      `${year}-02-${String(marketDemoNthWeekday(year,2,1,3)).padStart(2,"0")}`,
      `${year}-05-${String(marketDemoLastWeekday(year,5,1)).padStart(2,"0")}`,
      `${year}-09-${String(marketDemoNthWeekday(year,9,1,1)).padStart(2,"0")}`,
      `${year}-11-${String(marketDemoNthWeekday(year,11,4,4)).padStart(2,"0")}`,
      easter.toISOString().slice(0,10),
    ];
    return holidays.includes(key);
  };
  // 한국거래소 정규 휴장일. 미확인 연도는 안전하게 주식 기록을 표시하지 않습니다.
  const marketDemoKRClosedDates = {
    2026:["01-01","02-16","02-17","02-18","03-02","05-01","05-05","05-25","06-03","08-17","09-24","09-25","10-05","10-09","12-25","12-31"],
    2027:["01-01","02-08","02-09","03-01","05-05","05-13","08-16","09-14","09-15","09-16","10-04","10-11","12-27","12-31"],
  };
  const marketDemoNow = new Date(marketDemoClock || 0);
  const marketDemoUS = marketDemoParts(marketDemoNow,"America/New_York");
  const marketDemoKR = marketDemoParts(marketDemoNow,"Asia/Seoul");
  const marketDemoUSOpen = !["Sat","Sun"].includes(marketDemoUS.weekday) && !marketDemoUSClosed(marketDemoUS) && marketDemoUS.minutes>=570 && marketDemoUS.minutes<960;
  const marketDemoKROpen = !["Sat","Sun"].includes(marketDemoKR.weekday) && (marketDemoKRClosedDates[marketDemoKR.year]||[]).length>0 && !marketDemoKRClosedDates[marketDemoKR.year].includes(`${String(marketDemoKR.month).padStart(2,"0")}-${String(marketDemoKR.day).padStart(2,"0")}`) && marketDemoKR.minutes>=540 && marketDemoKR.minutes<930;
  const marketDemoTradableAssets = marketDemoAssets.filter((asset)=>asset.kind==="COIN" || (asset.kind==="STOCK" && marketDemoUSOpen) || (asset.kind==="KR_STOCK" && marketDemoKROpen));
  // 현재 구간부터 최근 10개 구간까지, 총 100건을 재현 가능한 데모 기록으로 표시합니다.
  const marketDemoRecords = marketDemoClock ? Array.from({length:100},(_,index)=>{
    const slot = marketDemoSlot - Math.floor(index / 10);
    const position = index % 10;
    const assetIndex = ((slot * 7 + position * 11 + Math.floor(slot / 3)) % marketDemoTradableAssets.length + marketDemoTradableAssets.length) % marketDemoTradableAssets.length;
    const asset = marketDemoTradableAssets[assetIndex];
    const buy = ((slot * 3 + position * 5) % 7) < 4;
    return {...asset,buy,at:new Date(slot*300000+position*27000),id:`${slot}-${position}`};
  }) : [];
  const marketDemoPageCount = Math.ceil(marketDemoRecords.length / 10);
  const marketDemoVisibleRecords = marketDemoRecords.slice((marketDemoPage-1)*10,marketDemoPage*10);

  const [aiSimLoading, setAiSimLoading] = useState(false);
  const [aiSimError, setAiSimError] = useState("");
  const [aiNextUpdate, setAiNextUpdate] = useState(null);
  const [aiCountdown, setAiCountdown] = useState("05:00");
  const [aiMemberProcess, setAiMemberProcess] = useState(null);
  const [aiProcessTick, setAiProcessTick] = useState(0);
  const [aiAdminRows, setAiAdminRows] = useState([]);
  const [surpriseSettings, setSurpriseSettings] = useState({ completion_message: "", action_label: "", action_url: "" });
  const [surpriseSettingsSaving, setSurpriseSettingsSaving] = useState(false);
  const [surpriseSettingsLoaded, setSurpriseSettingsLoaded] = useState(false);
  useEffect(() => { if (profile?.role === "admin") loadSurpriseSettings(); }, [profile?.role]);
  async function loadSurpriseSettings() {
    const { data, error } = await supabase.from("vip_surprise_settings")
      .select("completion_message,action_label,action_url").eq("id",1).maybeSingle();
    if (error) { setNotice("돌발 프로세스 설정 불러오기 실패: " + error.message); return; }
    if (data) setSurpriseSettings(data);
    setSurpriseSettingsLoaded(true);
  }
  async function saveSurpriseSettings() {
    if (profile?.role !== "admin" || surpriseSettingsSaving) return;
    setSurpriseSettingsSaving(true);
    try {
      const { error } = await supabase.rpc("admin_update_vip_surprise_settings", {
        p_completion_message: surpriseSettings.completion_message,
        p_action_label: surpriseSettings.action_label,
        p_action_url: surpriseSettings.action_url,
      });
      if (error) throw error;
      setNotice("돌발 프로세스 안내 설정을 저장했습니다.");
    } catch (error) { setNotice("설정 저장 실패: " + error.message); }
    finally { setSurpriseSettingsSaving(false); }
  }

  const [aiAdminSearch, setAiAdminSearch] = useState("");
  const [aiAdminSelectedId, setAiAdminSelectedId] = useState("");
  const [aiAdminForm, setAiAdminForm] = useState({
    available_count: 0,
    status: "ready",
    investment_amount: 0,
    duration_days: 30,
    min_return: 800,
    max_return: 1200,
  });
  const [aiAdminWorking, setAiAdminWorking] = useState(false);
  const [aiProfitAdjustAmount,setAiProfitAdjustAmount] = useState("");
  const [aiProfitAdjustWorking,setAiProfitAdjustWorking] = useState(false);

  const messagesRef = useRef(null);
  const groupMessagesRef = useRef(null);
  const privateMessagesRef = useRef(null);
  const groupBottomRef = useRef(null);
  const privateBottomRef = useRef(null);
  const groupEmojiRef = useRef(null);
  const privateEmojiRef = useRef(null);
  const groupInputRef = useRef(null);
  const privateInputRef = useRef(null);
  const groupSendingRef = useRef(false);
  const privateSendingRef = useRef(false);
  const groupComposingRef = useRef(false);
  const privateComposingRef = useRef(false);
  const [groupScrollDate, setGroupScrollDate] = useState("");
  const [privateScrollDate, setPrivateScrollDate] = useState("");
  const groupScrollDateTimerRef = useRef(null);
  const privateScrollDateTimerRef = useRef(null);
  const groupWasAtBottomRef = useRef(true);
  const privateWasAtBottomRef = useRef(true);
  const chatTabRef = useRef(chatTab);
  const [groupShowLatestButton, setGroupShowLatestButton] = useState(false);
  const [privateShowLatestButton, setPrivateShowLatestButton] = useState(false);
  const groupUserScrollUntilRef = useRef(0);
  const privateUserScrollUntilRef = useRef(0);

  const AI_START_MONEY = 5000000;
  const AI_REFRESH_MS = 5 * 60 * 1000;

  // 회원별 AI PROCESS 진행 상태는 Supabase ai_process_members에서 관리합니다.
  // 수익 표시는 실제 투자 성과가 아니라 운영자가 설정한 목표값을 기반으로 한 모의 시뮬레이션입니다.
  // 회원 화면의 설정 수익은 3분 단위로 재계산/표시합니다.
  const AI_PROCESS_STEP_MINUTES = 3;

  function aiProcessHash(text) {
    let h = 2166136261;
    for (let i = 0; i < String(text || "").length; i += 1) {
      h ^= String(text).charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function aiProcessRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function aiProcessStatusLabel(status, availableCount = 0) {
    if (status === "waiting") return "시작 준비";
    if (status === "running") return "진행중";
    if (status === "completed") return "진행완료";
    return Number(availableCount || 0) > 0 ? "진행 가능" : "상담 가능";
  }

  function aiProcessDurationLabel(hours) {
    const value = Math.max(1, Math.min(2400, Number(hours || 24)));
    if (value % 24 === 0) return `${value / 24}일`;
    if (value > 24) return `${Math.floor(value / 24)}일 ${value % 24}시간`;
    return `${value}시간`;
  }

  function aiProcessDurationMs(row) {
    return Math.max(1, Math.min(2400, Number(row?.duration_hours || 24))) * 60 * 60 * 1000;
  }

  function aiProcessOpportunityDday(row) {
    if (Number(row?.available_count || 0) <= 0 || !row?.available_granted_at) return null;
    const grantedAt = new Date(row.available_granted_at).getTime();
    if (!Number.isFinite(grantedAt)) return null;
    const expiresAt = grantedAt + (10 * 24 * 60 * 60 * 1000);
    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) return 0;
    return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  }

  function AiProcessMemberGuide({ compact = false }) {
    return (
      <div style={blueTheme({
        marginTop: compact ? "12px" : "14px",
        padding: compact ? "13px 12px" : "15px 14px",
        borderRadius:"16px",
        background:"linear-gradient(145deg,rgba(30,50,66,.96),rgba(40,61,72,.96))",
        border:"1px solid rgba(226,187,112,.30)",
        color:"#fff",
        textAlign:"left"
      }, "accentSurface", "shell")}>
        <div style={blueTheme({display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px"}, "surface", "shell")}>
          <div>
            <span style={blueTheme({display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.5px",color:"#e2bb70"}, "surface", "shell")}>AI PROCESS GUIDE</span>
            <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:compact?"13px":"14px",color:"#fff"}, "surface", "shell")}>AI프로세스 진행 안내</strong>
          </div>
          <span style={blueTheme({padding:"5px 8px",borderRadius:"999px",background:"rgba(226,187,112,.10)",border:"1px solid rgba(226,187,112,.22)",fontSize:"7px",fontWeight:"1000",color:"#f0cb82",whiteSpace:"nowrap"}, "surface", "shell")}>3분 단위 반영</span>
        </div>

        <div style={blueTheme({display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px",marginTop:"10px"}, "surface", "shell")}>
          <div style={blueTheme({padding:"10px 7px",borderRadius:"12px",background:"rgba(255,255,255,.055)",border:"1px solid rgba(255,255,255,.06)",textAlign:"center"}, "surface", "shell")}>
            <span style={blueTheme({display:"block",fontSize:"7px",color:"rgba(255,255,255,.48)"}, "surface", "shell")}>진행시간</span>
            <b style={blueTheme({display:"block",marginTop:"4px",fontSize:"11px",color:"#f0cb82"}, "surface", "shell")}>최소 1시간 ~ 최대 30일</b>
          </div>
          <div style={blueTheme({padding:"10px 7px",borderRadius:"12px",background:"rgba(255,255,255,.055)",border:"1px solid rgba(255,255,255,.06)",textAlign:"center"}, "surface", "shell")}>
            <span style={blueTheme({display:"block",fontSize:"7px",color:"rgba(255,255,255,.48)"}, "surface", "shell")}>예상 수익률</span>
            <b style={blueTheme({display:"block",marginTop:"4px",fontSize:"11px",color:"#f0cb82"}, "surface", "shell")}>10% ~ 1000% 이상</b>
          </div>
        </div>

        <div style={blueTheme({marginTop:"8px",padding:"10px 9px",borderRadius:"12px",background:"rgba(226,187,112,.08)",border:"1px solid rgba(226,187,112,.18)",textAlign:"center"}, "surface", "shell")}>
          <strong style={blueTheme({display:"block",fontSize:"9px",lineHeight:1.55,color:"#f4d28f",wordBreak:"keep-all"}, "surface", "shell")}>
            설정된 진행기간 내 AI 분석 기준으로 진행됩니다.
          </strong>
          <span style={blueTheme({display:"block",marginTop:"3px",fontSize:"8px",lineHeight:1.6,color:"rgba(255,255,255,.70)",wordBreak:"keep-all"}, "surface", "shell")}>
            수익 변동이 1시간 이상 없을 경우 AI 판단으로 자동 완료 됩니다.
          </span>
        </div>
      </div>
    );
  }


  function aiProcessFinalReturn(row) {
    const minReturn = Math.max(0, Number(row?.min_return || 0));
    const maxReturn = Math.max(minReturn, Number(row?.max_return || minReturn));
    const seed = aiProcessHash(`${row?.user_id || user?.id || "member"}-${row?.started_at || "not-started"}-${minReturn}-${maxReturn}`);
    const rand = aiProcessRandom(seed);
    return minReturn + (maxReturn - minReturn) * rand();
  }

  function getMemberProcessSnapshot(row) {
    const investment = Math.max(0, Number(row?.investment_amount || 0));
    const targetReturn = aiProcessFinalReturn(row);
    const targetProfit = investment * (targetReturn / 100);
    const durationMs = aiProcessDurationMs(row);
    const stepMs = AI_PROCESS_STEP_MINUTES * 60 * 1000;
    const totalSteps = Math.max(1, Math.round(durationMs / stepMs));
    const startedMs = row?.started_at ? new Date(row.started_at).getTime() : Date.now();
    // 진행완료는 30일 목표 끝값으로 점프시키지 않습니다.
    // 관리자가 완료를 누른 completed_at 시점까지만 계산해 마지막 3분 반영 금액을 그대로 동결합니다.
    const completedMs = row?.completed_at ? new Date(row.completed_at).getTime() : NaN;
    const snapshotNowMs = row?.status === "completed" && Number.isFinite(completedMs)
      ? completedMs
      : Date.now();
    const rawElapsed = Math.max(0, snapshotNowMs - startedMs);
    const elapsedMs = Math.min(durationMs, rawElapsed);
    const elapsedSteps = Math.min(totalSteps, Math.floor(elapsedMs / stepMs));

    const seed = aiProcessHash(
      `${row?.user_id || user?.id || "member"}-${row?.started_at || "not-started"}-${investment}-${targetReturn}-${row?.duration_hours || 24}`
    );
    const rand = aiProcessRandom(seed);
    // 3분 단위 모의 수익: 10구간 중 1~2구간에만 소폭 손실을 반영합니다.
    const rawWeights = [];
    for (let start = 0; start < totalSteps; start += 10) {
      const count = Math.min(10, totalSteps - start);
      const lossCount = count >= 5 ? (rand() < 0.5 ? 1 : 2) : (count >= 2 ? 1 : 0);
      const lossOffsets = new Set();
      while (lossOffsets.size < lossCount) lossOffsets.add(Math.floor(rand() * count));
      for (let offset = 0; offset < count; offset += 1) {
        const index = start + offset;
        const centerWave = 0.72 + 0.28 * Math.sin((index / Math.max(1, totalSteps - 1)) * Math.PI);
        const burst = rand() > 0.87 ? 1.65 + rand() * 1.5 : 1;
        const gain = (0.28 + rand() * 1.55) * centerWave * burst;
        rawWeights.push(lossOffsets.has(offset) ? -gain * (0.12 + rand() * 0.18) : gain);
      }
    }
    const weightTotal = rawWeights.reduce((sum, value) => sum + value, 0) || 1;
    const increments = rawWeights.map((value) => targetProfit * (value / weightTotal));
    const cumulative = [];
    let runningProfit = 0;
    for (const amount of increments) {
      runningProfit += amount;
      cumulative.push(runningProfit);
    }
    const cumulativeAt = (step) => step > 0 ? cumulative[Math.min(totalSteps, step) - 1] : 0;

    const legacyProfit = cumulativeAt(elapsedSteps);
    const anchorAt = row?.profit_anchor_at ? new Date(row.profit_anchor_at).getTime() : NaN;
    const hasAnchor = Number.isFinite(anchorAt) && row?.profit_anchor != null;
    const anchorElapsedSteps = hasAnchor ? Math.max(0,Math.floor((anchorAt-startedMs)/stepMs)) : 0;
    const remainingSteps = Math.max(1,totalSteps-anchorElapsedSteps);
    const stepsAfterAnchor = hasAnchor ? Math.max(0,elapsedSteps-anchorElapsedSteps) : 0;
    const anchorCurveTotal = cumulativeAt(totalSteps) - cumulativeAt(anchorElapsedSteps);
    const anchoredProfit = hasAnchor ? Number(row.profit_anchor) + Math.max(0,targetProfit-Number(row.profit_anchor))*(anchorCurveTotal>0 ? (cumulativeAt(elapsedSteps)-cumulativeAt(anchorElapsedSteps))/anchorCurveTotal : Math.min(1,stepsAfterAnchor/remainingSteps)) : legacyProfit;
    const earnedProfit = Math.max(0,anchoredProfit+Number(row?.profit_adjustment||0));
    const totalAmount = investment + earnedProfit;
    const currentReturn = investment > 0 ? (earnedProfit / investment) * 100 : 0;
    const progress = targetProfit > 0 ? Math.min(100, (earnedProfit / targetProfit) * 100) : 0;

    const nextBoundary = stepMs - (Math.max(0, Date.now() - startedMs) % stepMs);
    const nextMinutes = Math.floor(nextBoundary / 60000);
    const nextSeconds = Math.floor((nextBoundary % 60000) / 1000);
    const nextText = row?.status === "running"
      ? `${String(nextMinutes).padStart(2, "0")}:${String(nextSeconds).padStart(2, "0")}`
      : "--:--";

    const profitForStep = (step) => {
      const base = hasAnchor
        ? (step <= anchorElapsedSteps
          ? Number(row.profit_anchor) * step / Math.max(1, anchorElapsedSteps)
          : Number(row.profit_anchor) + Math.max(0,targetProfit-Number(row.profit_anchor)) * (anchorCurveTotal > 0 ? (cumulativeAt(step)-cumulativeAt(anchorElapsedSteps))/anchorCurveTotal : (step-anchorElapsedSteps)/remainingSteps))
        : cumulativeAt(step);
      return Math.max(0, base + Number(row?.profit_adjustment || 0));
    };
    // 최근 48개 실제 3분 구간을 표시하여 소폭 하락도 그래프에 나타나게 합니다.
    const firstVisibleStep = Math.max(0, elapsedSteps - 48);
    const history = [];
    for (let step = firstVisibleStep; step <= elapsedSteps; step += 1) {
      history.push({ amount: investment + (step === 0 ? 0 : profitForStep(step)) });
    }

    const width = 760;
    const height = 220;
    const padX = 18;
    const padY = 20;
    const amounts = history.map((item) => item.amount);
    // 전체 100일 목표금액을 Y축 최대값으로 잡으면 초반 3분 변화가 거의 평평하게 보입니다.
    // 그래프는 "현재까지 발생한 모의 수익 구간"을 기준으로 자동 확대해서,
    // 장기 진행(최대 100일)이어도 매 3분 변화가 눈에 보이도록 표시합니다.
    const minAmount = Math.min(investment, ...amounts);
    const visibleGain = Math.max(...amounts) - minAmount;
    const visualRange = Math.max(1, visibleGain * 1.28);
    const maxAmount = minAmount + visualRange;
    const range = Math.max(1, maxAmount - minAmount);
    const chartPoints = history.map((item, index) => {
      const x = history.length <= 1 ? padX : padX + (index / (history.length - 1)) * (width - padX * 2);
      const normalized = Math.max(0, Math.min(1, (item.amount - minAmount) / range));
      const y = (height - padY) - normalized * (height - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");

    const remainingMs = Math.max(0, durationMs - elapsedMs);
    const remainingHours = Math.floor(remainingMs / 3600000);
    const remainingMinutes = Math.floor((remainingMs % 3600000) / 60000);

    return {
      investment,
      targetReturn,
      targetProfit,
      earnedProfit,
      totalAmount,
      currentReturn,
      progress,
      elapsedSteps,
      totalSteps,
      recentIncrement: elapsedSteps > 0 ? increments[elapsedSteps - 1] : 0,
      averagePerStep: elapsedSteps > 0 ? earnedProfit / elapsedSteps : 0,
      nextText,
      chartPoints,
      remainingText: row?.status === "completed"
        ? "진행 완료"
        : `${remainingHours}시간 ${remainingMinutes}분`,
    };
  }

  async function loadAiMemberProcess() {
    if (!user || profile?.role === "admin") return;
    const { data, error } = await supabase
      .from("ai_process_members")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("AI PROCESS 회원 상태 불러오기 오류:", error);
      return;
    }
    setAiMemberProcess(data || {
      user_id: user.id,
      available_count: 0,
      status: "ready",
      investment_amount: 0,
      duration_hours: 720,
      min_return: 800,
      max_return: 1200,
      available_granted_at: null,
      started_at: null,
      completed_at: null,
    });
  }

  async function loadAiAdminRows() {
    if (!user || profile?.role !== "admin") return;

    const [{ data: memberData, error: memberError }, { data: processData, error: processError }] = await Promise.all([
      supabase.rpc("get_admin_member_list"),
      supabase.from("ai_process_members").select("*"),
    ]);

    if (memberError) {
      console.error("AI PROCESS 관리자 회원목록 오류:", memberError);
      setNotice(`AI PROCESS 회원목록 불러오기 실패: ${memberError.message || "알 수 없는 오류"}`);
      return;
    }
    if (processError) {
      console.error("AI PROCESS 관리자 진행정보 오류:", processError);
      setNotice(`AI PROCESS 진행정보 불러오기 실패: ${processError.message || "알 수 없는 오류"}`);
      return;
    }

    const processMap = Object.fromEntries((processData || []).map((row) => [row.user_id, row]));
    const uniqueMembers = [];
    const seenMemberIds = new Set();
    for (const item of (memberData || [])) {
      const memberId = item.member_id || item.id;
      if (!memberId || seenMemberIds.has(memberId)) continue;
      seenMemberIds.add(memberId);
      uniqueMembers.push({
        id: memberId,
        nickname: item.nickname || "VIP 회원",
        real_name: item.real_name || "",
        avatar: item.avatar || "01",
      });
    }

    const rows = uniqueMembers.map((member) => ({
      ...member,
      process: processMap[member.id] || {
        user_id: member.id,
        available_count: 0,
        status: "ready",
        investment_amount: 0,
        duration_hours: 720,
        min_return: 800,
        max_return: 1200,
        available_granted_at: null,
        started_at: null,
        completed_at: null,
      },
    })).sort((a, b) => {
      const aRunning = a.process?.status === "running";
      const bRunning = b.process?.status === "running";

      // 진행중 회원을 항상 최상단에 배치합니다.
      if (aRunning !== bRunning) return aRunning ? -1 : 1;

      // 진행중 회원끼리는 가장 최근에 시작한 회원이 위로 올라옵니다.
      if (aRunning && bRunning) {
        const aStarted = new Date(a.process?.started_at || 0).getTime();
        const bStarted = new Date(b.process?.started_at || 0).getTime();
        if (aStarted !== bStarted) return bStarted - aStarted;
      }

      return String(a.nickname || "").localeCompare(String(b.nickname || ""), "ko");
    });
    setAiAdminRows(rows);

    if (aiAdminSelectedId) {
      const selected = rows.find((row) => row.id === aiAdminSelectedId);
      if (selected) fillAiAdminForm(selected);
    }
  }

  function fillAiAdminForm(member) {
    if (!member) return;
    const row = member.process || {};
    setAiAdminSelectedId(member.id);

    // 현재 운영 기본값: 30일 / 800%~1200%
    // SQL 적용 시 기존 회원의 진행 전 설정도 같은 값으로 일괄 정리됩니다.
    const storedHours = Number(row.duration_hours ?? 720);
    const storedMinReturn = Number(row.min_return ?? 800);
    const storedMaxReturn = Number(row.max_return ?? 1200);

    setAiAdminForm({
      available_count: Math.max(0, Number(row.available_count || 0)),
      status: row.status || "ready",
      investment_amount: Math.max(0, Number(row.investment_amount || 0)),
      duration_days: Math.max(1, Math.min(30, Math.round(storedHours / 24))),
      min_return: Math.max(0, storedMinReturn),
      max_return: Math.max(0, storedMaxReturn),
    });
  }

  async function saveAiAdminSettings(nextStatus = null) {
    if (profile?.role !== "admin" || !aiAdminSelectedId || aiAdminWorking) return;
    setAiAdminWorking(true);
    try {
      const payload = {
        p_user_id: aiAdminSelectedId,
        p_available_count: Math.max(0, Math.floor(Number(aiAdminForm.available_count || 0))),
        p_status: nextStatus || aiAdminForm.status || "ready",
        p_investment_amount: Math.max(0, Number(aiAdminForm.investment_amount || 0)),
        p_duration_hours: Math.max(1, Math.min(30, Number(aiAdminForm.duration_days || 1))) * 24,
        p_min_return: Math.max(0, Number(aiAdminForm.min_return || 0)),
        p_max_return: Math.max(0, Number(aiAdminForm.max_return || 0)),
      };

      const selectedProcess=aiAdminRows.find(m=>m.id===aiAdminSelectedId)?.process;
      const anchorProfit=selectedProcess?.status==="running"
        ? Math.max(0,getMemberProcessSnapshot(selectedProcess).earnedProfit-Number(selectedProcess.profit_adjustment||0))
        : 0;
      const { error } = await supabase.rpc("admin_save_ai_process_member_preserving_profit", {...payload,p_anchor_profit:anchorProfit});
      if (error) throw error;

      setNotice(
        payload.p_status === "running"
          ? "AI PROCESS 진행을 시작했습니다."
          : payload.p_status === "completed"
            ? "AI PROCESS를 진행완료 처리했습니다."
            : payload.p_status === "waiting"
              ? "회원 상태를 대기로 저장했습니다."
              : "회원 AI PROCESS 설정을 저장했습니다."
      );
      await loadAiAdminRows();
    } catch (error) {
      console.error("AI PROCESS 관리자 저장 오류:", error);
      setNotice(`AI PROCESS 저장 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setAiAdminWorking(false);
    }
  }

  async function resetAiAdminProcess() {
    if (profile?.role !== "admin" || !aiAdminSelectedId || aiAdminWorking) return;
    if (!window.confirm("이 회원의 진행 상태를 '진행 전'으로 초기화할까요? 진행 가능 횟수는 현재 입력값으로 유지됩니다.")) return;
    setAiAdminWorking(true);
    try {
      const { error } = await supabase.rpc("admin_reset_ai_process_member", {
        p_user_id: aiAdminSelectedId,
        p_available_count: Math.max(0, Math.floor(Number(aiAdminForm.available_count || 0))),
      });
      if (error) throw error;
      setNotice("AI PROCESS 진행 상태를 초기화했습니다.");
      await loadAiAdminRows();
    } catch (error) {
      console.error("AI PROCESS 초기화 오류:", error);
      setNotice(`초기화 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setAiAdminWorking(false);
    }
  }

  useEffect(() => {
    if (!user || !profile) return;
    loadSurpriseGuide();
  }, [user?.id, profile?.role]);

  useEffect(() => {
    if (!user || !profile) return;
    if (profile.role === "admin") {
      loadAiAdminRows();
    } else {
      loadAiMemberProcess();
    }
  }, [user?.id, profile?.role]);

  useEffect(() => {
    if (!user || !profile) return;
    const channel = supabase
      .channel(`ai-process-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_process_members",
          ...(profile.role === "admin" ? {} : { filter: `user_id=eq.${user.id}` }),
        },
        () => {
          if (profile.role === "admin") loadAiAdminRows();
          else loadAiMemberProcess();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.role]);

  // Refresh member AI PROCESS status when the tab opens and while it is visible.
  // Realtime updates may be delayed or unavailable on some mobile browsers.
  useEffect(() => {
    if (chatTab !== "ai" || !user?.id || !profile || profile.role === "admin") return;
    let active = true;
    const refresh = () => {
      if (active && document.visibilityState === "visible") loadAiMemberProcess();
    };
    refresh();
    const timer = window.setInterval(refresh, 10000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [chatTab, user?.id, profile?.role]);

  useEffect(() => {
    const timer = window.setInterval(() => setAiProcessTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);


  async function refreshPushStatus() {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushEnabled(false);
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration) {
        setPushEnabled(false);
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      const enabled = Notification.permission === "granted" && Boolean(subscription);

      // 같은 기기에서 로그아웃 후 다른 계정으로 로그인해도,
      // 이미 허용된 이 기기의 Web Push 구독을 현재 로그인 계정으로 자동 재연결합니다.
      if (enabled && user?.id) {
        const json = subscription.toJSON();

        if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          if (!token) {
            setPushEnabled(false);
            return false;
          }

          const response = await fetch("/api/push/sync-subscription", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
            body: JSON.stringify({
              endpoint: json.endpoint,
              p256dh: json.keys.p256dh,
              auth: json.keys.auth,
              userAgent: navigator.userAgent,
            }),
          });

          if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            console.error("현재 계정 푸시 구독 자동 연결 오류:", result);
            setPushEnabled(false);
            return false;
          }
        }
      }

      setPushEnabled(enabled);
      return enabled;
    } catch (error) {
      console.error("푸시 상태 확인 오류:", error);
      setPushEnabled(false);
      return false;
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }

  function isIOSDevice() {
    if (typeof navigator === "undefined") return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  async function installVipApp() {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true;

    if (standalone) {
      setIsStandaloneApp(true);
      setNotice("이미 홈 화면 앱으로 실행 중입니다.");
      return;
    }

    // Android Chrome/Edge/Samsung Internet에서 브라우저가 설치 가능하다고 판단하면
    // beforeinstallprompt 객체를 사용해 시스템 설치창을 즉시 엽니다.
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice?.outcome === "accepted") {
          setNotice("AI PROCESS VIP 앱 설치를 진행합니다.");
        } else {
          setNotice("앱 설치가 취소되었습니다.");
        }
        setInstallPrompt(null);
        return;
      } catch (error) {
        console.error("앱 설치창 실행 오류:", error);
      }
    }

    // iPhone은 시스템상 beforeinstallprompt가 없으므로 Safari의 홈 화면 추가 안내가 필요합니다.
    if (isIOSDevice()) {
      setShowInstallGuide(true);
      return;
    }

    // Android에서 여기로 오면 현재 브라우저가 install prompt를 제공하지 않은 상태입니다.
    setShowInstallGuide(true);
    setNotice("설치창을 준비할 수 없습니다. Chrome/Samsung Internet에서 새로고침 후 다시 눌러주세요.");
  }

  function closeInstallGuide({ never = false, snooze = true } = {}) {
    setShowInstallGuide(false);
    if (typeof window === "undefined") return;

    if (never) {
      window.localStorage.setItem("vip-install-guide-never", "1");
      window.localStorage.removeItem("vip-install-guide-next-at");
      return;
    }

    if (snooze) {
      const nextAt = Date.now() + (3 * 24 * 60 * 60 * 1000);
      window.localStorage.setItem("vip-install-guide-next-at", String(nextAt));
    }
  }

  function syncAppIconBadge(count = memberUnreadCount) {
    if (typeof navigator === "undefined") return;
    const safeCount = Math.max(0, Number(count || 0));

    try {
      if (safeCount > 0 && typeof navigator.setAppBadge === "function") {
        void navigator.setAppBadge(safeCount).catch(() => {});
      } else if (safeCount === 0 && typeof navigator.clearAppBadge === "function") {
        void navigator.clearAppBadge().catch(() => {});
      }
    } catch (_) {}
  }

  async function loadAdminPushStatuses() {
    if (!user || profile?.role !== "admin") return;
    const { data, error } = await supabase.rpc("admin_get_member_push_statuses");
    if (error) {
      console.error("회원 알림 상태 불러오기 실패:", error);
      return;
    }
    const next = {};
    (data || []).forEach((row) => {
      next[String(row.member_id)] = {
        enabled: Boolean(row.push_enabled),
        deviceCount: Number(row.device_count || 0),
      };
    });
    setAdminPushStatus(next);
  }

  async function enablePrivateNotifications() {
    if (typeof window === "undefined" || !user) {
      setNotice("로그인 후 알림을 설정해주세요.");
      return false;
    }

    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true;

    const iosLike =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (iosLike && !standalone) {
      setNotice("아이폰은 홈 화면의 VIP 아이콘으로 실행한 뒤 🔔 알림을 눌러주세요.");
      setShowInstallGuide(true);
      return false;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setNotice("이 기기 또는 현재 브라우저에서는 Web Push를 사용할 수 없습니다.");
      return false;
    }

    try {
      // iPhone 핵심:
      // requestPermission() 전에 다른 비동기 작업(await)을 하지 않습니다.
      // 사용자가 🔔 버튼을 누른 바로 그 제스처에서 권한창을 요청합니다.
      let permission = Notification.permission;

      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission === "denied") {
        setPushEnabled(false);
        setNotice("알림 권한이 차단되어 있습니다. 휴대폰 설정 → 알림 → AI PROCESS VIP에서 알림을 허용해주세요.");
        return false;
      }

      if (permission !== "granted") {
        setPushEnabled(false);
        setNotice("알림 권한이 허용되지 않았습니다.");
        return false;
      }

      // 버전 문자열로 오래된 서비스워커 캐시를 강제로 벗어납니다.
      const registration = await navigator.serviceWorker.register(
        "/sw.js?v=20261008-customer-avatar",
        { scope: "/", updateViaCache: "none" }
      );

      await registration.update().catch(() => {});

      // registration 자체를 사용합니다. navigator.serviceWorker.ready를 무기한 기다리지 않습니다.
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) throw new Error("VAPID 공개키가 설정되지 않았습니다.");

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = subscription.toJSON();

      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("푸시 구독 정보를 만들지 못했습니다.");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("로그인 세션을 확인할 수 없습니다.");

      const syncResponse = await fetch("/api/push/sync-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          userAgent: navigator.userAgent,
        }),
      });

      if (!syncResponse.ok) {
        const syncResult = await syncResponse.json().catch(() => ({}));
        throw new Error(syncResult?.error || "푸시 구독 저장에 실패했습니다.");
      }

      setPushEnabled(true);
      setNotice("🔔 1:1 알림이 정상적으로 켜졌습니다.");
      return true;
    } catch (error) {
      console.error("푸시 알림 설정 오류:", error);
      setPushEnabled(false);
      setNotice(`알림 설정 실패: ${error?.message || "알 수 없는 오류"}`);
      return false;
    }
  }

  async function sendPrivatePush(chatId, content) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        console.error("1:1 푸시 발송 실패: 로그인 세션 토큰 없음");
        if (profile?.role === "admin") {
          setNotice("메시지는 전송됐지만 휴대폰 푸시를 보내지 못했습니다. 관리자 로그인을 다시 확인해주세요.");
        }
        return { ok: false, reason: "no_token" };
      }

      const response = await fetch("/api/push/private-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          chatId,
          content: String(content || "").startsWith("[[IMAGE]]")
            ? "사진을 보냈습니다."
            : String(content || ""),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.ok === false) {
        console.error("1:1 푸시 서버 오류:", response.status, result);
        if (profile?.role === "admin") {
          setNotice(`메시지는 전송됐지만 휴대폰 푸시 발송에 실패했습니다. (${result?.reason || result?.error || `HTTP ${response.status}`})`);
        }
        return { ok: false, status: response.status, ...result };
      }

      if (Number(result?.sent || 0) < 1) {
        console.warn("1:1 푸시 미발송:", result);
        if (profile?.role === "admin") {
          const reason = result?.reason === "no_subscription"
            ? "회원의 알림 구독정보가 없습니다. 회원 기기에서 알림을 다시 켜야 합니다."
            : result?.reason === "expired_subscription"
              ? "회원의 기존 알림 구독이 만료되었습니다. 회원 기기에서 알림을 다시 켜야 합니다."
              : "회원 기기로 전송된 푸시가 없습니다.";
          setNotice(`메시지는 정상 전송됐지만 휴대폰 알림은 발송되지 않았습니다. ${reason}`);
        }
        return { ok: false, ...result };
      }

      console.log("1:1 Web Push 발송 성공:", result);
      return { ok: true, ...result };
    } catch (error) {
      console.error("푸시 발송 요청 오류:", error);
      if (profile?.role === "admin") {
        setNotice(`메시지는 전송됐지만 휴대폰 푸시 요청 중 오류가 발생했습니다. (${error?.message || "알 수 없는 오류"})`);
      }
      return { ok: false, reason: "request_error", error: error?.message || "unknown" };
    }
  }

  function privateNotificationPreview(value) {
    const content = String(value || "");
    if (content.startsWith("[[IMAGE]]")) return "사진을 보냈습니다.";
    const formats = [
      ["[[GIFT_REWARD]]", (data) => `🎁 이벤트 당첨 상품이 지급되었습니다! ${String(data?.product_name || "기프티콘")}`],
      ["[[VIP_SURPRISE_LINK]]", (data) => String(data?.text || "🎉 돌발 이벤트 당첨 안내가 도착했습니다.")],
      ["[[LINK_BUTTON]]", (data) => String(data?.text || data?.button_text || "1:1 안내 메시지가 도착했습니다.")],
    ];
    for (const [prefix, describe] of formats) {
      if (!content.startsWith(prefix)) continue;
      try {
        return describe(JSON.parse(content.slice(prefix.length))).replace(/\\n/g, " ").replace(/\s+/g, " ").trim().slice(0, 150);
      } catch (_) {
        return "1:1 안내 메시지가 도착했습니다.";
      }
    }
    return content || "새 1:1 메시지가 도착했습니다.";
  }

  function showPrivateIncomingAlert(payload) {
    if (!payload || payload.sender_id === user?.id) return;

    const body = privateNotificationPreview(payload.content);

    setPrivateAlert({ title: `${adminIdentity.nickname || "관리자"} 카카오톡 1:1 고객센터`, body });
    window.clearTimeout(window.__vipPrivateAlertTimer);
    window.__vipPrivateAlertTimer = window.setTimeout(() => setPrivateAlert(null), 6500);

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        const n = new Notification("AI PROCESS VIP · 1:1 새 메시지", {
          body,
          icon: "/avatars/admin.png.png",
          tag: "vip-private-message"
        });
        n.onclick = () => {
          window.focus();
          setChatTab("private");
          window.sessionStorage.setItem("vip-active-tab", "private");
          n.close();
        };
      } catch (_) {}
    }
  }

  function aiKrw(value) {
    return `${Math.round(Number(value || 0)).toLocaleString("ko-KR")}원`;
  }

  function aiTime(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(value));
  }

  function aiStorageKey() {
    return `vip-ai-hindsight-v3-${user?.id || "guest"}`;
  }


  function hydrateAiSimulationFromStorage() {
    if (!user || typeof window === "undefined") return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(aiStorageKey()) || "null");
      if (!saved?.startedAt) return;

      const portfolioValue = Number(saved.portfolioValue || AI_START_MONEY);
      const totalProfit = portfolioValue - AI_START_MONEY;
      const totalReturn = (totalProfit / AI_START_MONEY) * 100;
      const endAt =
        new Date(saved.startedAt).getTime() +
        Number(saved.durationHours || 1) * 60 * 60 * 1000;
      const remainingMs = Math.max(0, endAt - Date.now());

      setAiSim({
        ...saved,
        portfolioValue,
        totalProfit,
        totalReturn,
        completed: remainingMs <= 0,
        remainingHours: Math.ceil(remainingMs / 3600000),
        updatedAt: saved.lastMarketAt || saved.startedAt,
      });
    } catch (error) {
      console.error("저장된 AI 기록 불러오기 오류:", error);
    }
  }

  function makeAiDurationHours() {
    const seed = Array.from(user?.id || "vip")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return 1 + (seed % 2400);
  }

  function buildChartPoints(history) {
    const rows = Array.isArray(history) ? history.slice(-24) : [];
    if (!rows.length) return "";

    const width = 760;
    const height = 190;
    const pad = 14;
    const values = rows.map((row) => Number(row.value || AI_START_MONEY));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, AI_START_MONEY * 0.002);

    return rows.map((row, index) => {
      const x =
        rows.length === 1
          ? width / 2
          : pad + (index / (rows.length - 1)) * (width - pad * 2);
      const y =
        pad + ((max - Number(row.value)) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }

  async function updateAiSimulation() {
    if (!user || aiSimLoading) return;

    setAiSimLoading(true);
    setAiSimError("");

    try {
      const response = await fetch("/api/market-sim", { cache: "no-store" });
      const raw = await response.text();
      let result = null;
      try {
        result = JSON.parse(raw);
      } catch {
        throw new Error("시장 데이터 응답 형식을 확인해주세요.");
      }

      if (!response.ok || !result.success || !result.quotes?.length) {
        throw new Error(result?.error || "시장 데이터를 불러오지 못했습니다.");
      }

      const now = result.updatedAt || new Date().toISOString();
      const quotes = result.quotes.map((item) => ({
        ...item,
        price: Number(item.price),
      }));
      const key = aiStorageKey();
      let saved = null;

      try {
        saved = JSON.parse(window.localStorage.getItem(key) || "null");
      } catch {
        saved = null;
      }

      if (!saved?.startedAt) {
        saved = {
          startedAt: now,
          durationHours: makeAiDurationHours(),
          portfolioValue: AI_START_MONEY,
          totalProfit: 0,
          previousQuotes: Object.fromEntries(
            quotes.map((item) => [item.symbol, item.price])
          ),
          lastMarketAt: now,
          lastWinner: null,
          holdings: [],
          resultHistory: [],
          history: [{ at: now, value: AI_START_MONEY }],
          activity: [{
            at: now,
            text: "기준 시세 저장 완료 · 다음 5분 구간부터 실제 상승 결과를 비교합니다.",
            type: "analysis",
          }],
        };
      } else {
        const previous = saved.previousQuotes || {};
        const previousMarketAt = saved.lastMarketAt;
        const currentMarketAt = now;

        // 같은 시장 스냅샷은 다시 계산하지 않습니다.
        const isNewSnapshot = !previousMarketAt || previousMarketAt !== currentMarketAt;

        if (isNewSnapshot) {
          const scored = quotes
            .map((item) => {
              const before = Number(previous[item.symbol]);
              const current = Number(item.price);
              const changePct =
                Number.isFinite(before) && before > 0
                  ? ((current - before) / before) * 100
                  : 0;
              return { ...item, beforePrice: before, changePct };
            })
            .filter((item) => Number.isFinite(item.changePct))
            .sort((a, b) => b.changePct - a.changePct);

          // 이미 끝난 직전 구간에서 실제로 가장 많이 상승한 종목만 사후 선택합니다.
          const winner = scored.find((item) => item.changePct > 0) || null;
          const beforeValue = Number(saved.portfolioValue || AI_START_MONEY);
          const intervalProfit = winner
            ? beforeValue * (winner.changePct / 100)
            : 0;
          const nextValue = beforeValue + intervalProfit;
          const activity = Array.isArray(saved.activity) ? [...saved.activity] : [];

          // 직전 가상 보유 종목의 가격 하락 시 가상 매도 기록을 남깁니다.
          // AI PROCESS 관리자 설정 수익 및 기존 시장 구간 수익 계산은 변경하지 않습니다.
          const previousHolding = Array.isArray(saved.holdings) ? saved.holdings[0] : null;
          const heldQuote = previousHolding && scored.find((row) => row.symbol === previousHolding.symbol);
          if (heldQuote && heldQuote.changePct < 0) {
            activity.unshift({
              at: currentMarketAt,
              type: "sell",
              symbol: heldQuote.symbol,
              name: heldQuote.name,
              text: heldQuote.name + " · 하락세 감지 · 가상 매도 처리 완료",
            });
          }

          if (winner) {
            const same = saved.lastWinner?.symbol === winner.symbol;
            activity.unshift({
              at: currentMarketAt,
              type: same ? "hold" : "result",
              symbol: winner.symbol,
              name: winner.name,
              text: `${winner.name} · 직전 5분 실제 상승 ${winner.changePct >= 0 ? "+" : ""}${winner.changePct.toFixed(3)}% · 구간 AI수익 +${aiKrw(intervalProfit)}`,
            });

            saved.lastWinner = {
              symbol: winner.symbol,
              name: winner.name,
              type: winner.type,
            };
            const settledResult = {
              at: currentMarketAt,
              symbol: winner.symbol,
              name: winner.name,
              type: winner.type,
              beforePrice: winner.beforePrice,
              currentPrice: winner.price,
              intervalPct: winner.changePct,
              intervalProfit,
              allocatedKrw: beforeValue,
              portfolioValue: nextValue,
              resultMode: true,
            };

            saved.holdings = [settledResult];
            saved.resultHistory = [
              settledResult,
              ...(Array.isArray(saved.resultHistory) ? saved.resultHistory : []),
            ].slice(0, 5000);
          } else {
            activity.unshift({
              at: currentMarketAt,
              type: "wait",
              text: "직전 5분 구간에 상승 종목이 없어 수익이 0원으로 처리했습니다.",
            });
            saved.lastWinner = null;
            saved.holdings = [];
          }

          saved.portfolioValue = nextValue;
          saved.totalProfit = nextValue - AI_START_MONEY;
          saved.previousQuotes = Object.fromEntries(
            quotes.map((item) => [item.symbol, item.price])
          );
          saved.lastMarketAt = currentMarketAt;
          saved.history = [
            ...(Array.isArray(saved.history) ? saved.history : []),
            { at: currentMarketAt, value: nextValue },
          ].slice(-1000);
          saved.activity = activity.slice(0, 1000);
        }
      }

      window.localStorage.setItem(key, JSON.stringify(saved));

      const portfolioValue = Number(saved.portfolioValue || AI_START_MONEY);
      const totalProfit = portfolioValue - AI_START_MONEY;
      const totalReturn = (totalProfit / AI_START_MONEY) * 100;
      const endAt =
        new Date(saved.startedAt).getTime() +
        Number(saved.durationHours || 1) * 60 * 60 * 1000;
      const remainingMs = Math.max(0, endAt - Date.now());

      setAiSim({
        ...saved,
        portfolioValue,
        totalProfit,
        totalReturn,
        completed: remainingMs <= 0,
        remainingHours: Math.ceil(remainingMs / 3600000),
        updatedAt: saved.lastMarketAt || now,
      });
      setAiNextUpdate(new Date(Date.now() + AI_REFRESH_MS).toISOString());
    } catch (error) {
      console.error(error);
      setAiSimError(error.message || "시장 결과 분석 중 오류가 발생했습니다.");
    } finally {
      setAiSimLoading(false);
    }
  }

  useEffect(() => {
    if (!user || !profile) return;

    hydrateAiSimulationFromStorage();
    updateAiSimulation();

    const timer = setInterval(() => {
      updateAiSimulation();
      loadAutoEvents();
    }, AI_REFRESH_MS);

    return () => clearInterval(timer);
  }, [user, profile]);

  useEffect(() => {
    if (chatTab !== "ai" || !aiNextUpdate) return;

    const tick = () => {
      const remain = Math.max(0, new Date(aiNextUpdate).getTime() - Date.now());
      const min = Math.floor(remain / 60000);
      const sec = Math.floor((remain % 60000) / 1000);
      setAiCountdown(
        `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      );
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [chatTab, aiNextUpdate]);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    (async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          "/sw.js?v=20261006-5",
          { scope: "/", updateViaCache: "none" }
        );
        await registration.update().catch(() => {});
        if (!cancelled) {
          console.log("VIP service worker ready:", registration.scope);
        }
      } catch (error) {
        console.error("VIP service worker register error:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateStandalone = () => {
      setIsStandaloneApp(Boolean(
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.navigator.standalone === true
      ));
    };

    const beforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const installed = () => {
      setInstallPrompt(null);
      setIsStandaloneApp(true);
      setShowInstallGuide(false);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("vip-install-guide-never", "1");
        window.localStorage.removeItem("vip-install-guide-next-at");
      }
      setNotice("AI PROCESS VIP가 홈 화면에 설치되었습니다.");
    };

    updateStandalone();
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshPushStatus();
  }, [user]);

  useEffect(() => {
    if (!user || !profile || profile.role === "admin") return;
    syncAppIconBadge(memberUnreadCount);
  }, [user, profile?.role, memberUnreadCount]);

  useEffect(() => {
    if (!user || !profile || profile.role === "admin" || !installGuideEligibleThisLogin) return;
    if (typeof window === "undefined") return;

    const standalone = Boolean(
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true
    );
    if (standalone || isStandaloneApp) return;
    if (window.localStorage.getItem("vip-install-guide-never") === "1") return;

    const nextAt = Number(window.localStorage.getItem("vip-install-guide-next-at") || 0);
    if (nextAt > Date.now()) return;

    const timer = window.setTimeout(() => {
      if (!showSponsorWelcome) setShowInstallGuide(true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [user, profile?.role, installGuideEligibleThisLogin, isStandaloneApp, showSponsorWelcome]);

  useEffect(() => {
    if (!user || !profile) return;
    if (typeof document === "undefined") return;

    const channel = supabase.channel("vip-member-presence", {
      config: { presence: { key: String(user.id) } },
    });

    const publishPresence = async () => {
      const active = document.visibilityState === "visible" && document.hasFocus();
      try {
        if (active) {
          await channel.track({
            user_id: String(user.id),
            nickname: profile.nickname || "VIP 회원",
            active: true,
            at: new Date().toISOString(),
          });
        } else {
          await channel.untrack();
        }
      } catch (_) {}
    };

    const syncPresence = () => {
      const state = channel.presenceState();
      const next = {};
      Object.values(state || {}).flat().forEach((entry) => {
        if (entry?.user_id && entry?.active) next[String(entry.user_id)] = true;
      });
      setMemberPresence(next);
    };

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await publishPresence();
      });

    const onVisibility = () => { void publishPresence(); };
    const onFocus = () => { void publishPresence(); };
    const onBlur = () => { void publishPresence(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      void channel.untrack().catch(() => {});
      void supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.nickname]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const onServiceWorkerMessage = (event) => {
      if (event?.data?.type !== "VIP_OPEN_PRIVATE") return;

      setVipLocked(false);
      setChatTab("private");
      window.localStorage.removeItem("vip-ui-locked");
      window.sessionStorage.setItem("vip-active-tab", "private");

      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("tab", "private");
      nextUrl.searchParams.delete("from");
      window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}`);
    };

    navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onServiceWorkerMessage);
  }, []);

  useEffect(() => {
    const closeEmojiPanels = (event) => {
      if (showGroupEmoji && groupEmojiRef.current && !groupEmojiRef.current.contains(event.target)) {
        setShowGroupEmoji(false);
      }
      if (showPrivateEmoji && privateEmojiRef.current && !privateEmojiRef.current.contains(event.target)) {
        setShowPrivateEmoji(false);
      }
    };

    document.addEventListener("mousedown", closeEmojiPanels);
    document.addEventListener("touchstart", closeEmojiPanels);

    return () => {
      document.removeEventListener("mousedown", closeEmojiPanels);
      document.removeEventListener("touchstart", closeEmojiPanels);
    };
  }, [showGroupEmoji, showPrivateEmoji]);

  useEffect(() => {
    const timer = setInterval(() => {
      setChatClockTick((value) => value + 1);
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  function isGroupChatOperatingTime() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
    const totalMinutes = hour * 60 + minute;

    return totalMinutes >= 11 * 60 && totalMinutes < 18 * 60 + 30;
  }

  void chatClockTick;
  const groupChatOperating = isGroupChatOperatingTime();
  const memberGroupChatLocked =
    profile?.role !== "admin" && (chatFrozen || !groupChatOperating);

  useEffect(() => {
    chatTabRef.current = chatTab;
    if (chatTab === "group" && user) {
      markGroupMessagesRead();
    }
  }, [chatTab, user?.id]);

  useEffect(() => {
    if (!user || !profile || profile.role === "admin") return;

    let signingOut = false;

    const forceApprovalSignOut = async () => {
      if (signingOut) return;
      signingOut = true;
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setNotice("관리자에 의해 이용 승인이 해제되어 로그아웃되었습니다.");
    };

    const checkApproval = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("id", user.id)
        .single();

      if (data && String(data.approval_status) !== "1") {
        await forceApprovalSignOut();
      }
    };

    const memberApprovalChannel = supabase
      .channel(`member-approval-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        async (payload) => {
          if (String(payload?.new?.approval_status) !== "1") {
            await forceApprovalSignOut();
          }
        }
      )
      .subscribe();

    const fallbackTimer = setInterval(checkApproval, 30000);

    return () => {
      clearInterval(fallbackTimer);
      supabase.removeChannel(memberApprovalChannel);
    };
  }, [user?.id, profile?.role]);

  useEffect(() => {
    if (!user || !profile) return;

    if (chatTab === "private") {
      openPrivateChat();
    }

    loadMemberNames();
    loadMemberAvatars();
    loadMessages();
    loadGroupChatState();
    loadGroupUnreadCount();

    if (profile.role === "admin") {
      loadAdminUnreadCounts();
    } else {
      loadMemberUnreadCount();
    }

    if (!GROUP_CHAT_ENABLED) return;

    const channel = supabase
      .channel("vip-group-chat", {
        config: {
          presence: { key: user.id },
        },
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const uniqueIds = new Set();

        Object.values(state || {}).forEach((entries) => {
          (entries || []).forEach((entry) => {
            if (entry?.user_id) uniqueIds.add(String(entry.user_id));
          });
        });

        setOnlineMemberCount(Math.max(1, uniqueIds.size));
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_messages",
          filter: `room_id=eq.${ROOM_ID}`,
        },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setMessages((current) => current.filter((item) => item.id !== deletedId));
            } else {
              await loadMessages();
            }
            return;
          }

          const newMessage = payload.new;
          if (!newMessage || newMessage.is_deleted) {
            await loadMessages();
            return;
          }

          const realtimeMessage = {
            ...newMessage,
            __mine:
              String(newMessage.member_id || "") === String(user?.id || "") ||
              String(newMessage.member_id || "") === String(profile?.id || ""),
          };

          setMessages((current) => {
            const existingIndex = current.findIndex((item) => item.id === realtimeMessage.id);

            if (existingIndex >= 0) {
              const next = [...current];
              next[existingIndex] = {
                ...next[existingIndex],
                ...realtimeMessage,
                __mine: Boolean(next[existingIndex].__mine || realtimeMessage.__mine),
              };
              return next;
            }

            return [...current, realtimeMessage];
          });

          if (!realtimeMessage.__mine) {
            if (chatTabRef.current === "group") {
              markGroupMessagesRead(newMessage.created_at || new Date().toISOString());
            } else {
              setGroupUnreadCount((current) => Math.min(100, Number(current || 0) + 1));
            }
          }

          await loadOneMemberName(newMessage.member_id);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "room_chat_settings", filter: `room_id=eq.${ROOM_ID}` },
        (payload) => setChatFrozen(Boolean(payload.new?.is_frozen))
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            nickname: profile?.nickname || "VIP 회원",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  // 모바일 백그라운드/절전 복귀 시 Realtime이 누락한 그룹 메시지를 DB에서 재동기화합니다.
  // 새로고침 없이 복구하되, 숨겨진 탭에서는 불필요한 조회를 하지 않습니다.
  useEffect(() => {
    if (!user?.id || !profile) return;
    let lastSyncAt = 0;
    let syncing = false;
    const syncOnResume = async () => {
      if (document.visibilityState !== "visible" || syncing) return;
      const now = Date.now();
      if (now - lastSyncAt < 2500) return;
      lastSyncAt = now;
      syncing = true;
      try {
        await loadMessages();
        await loadGroupUnreadCount();
      } catch (error) {
        console.error("그룹채팅 복귀 동기화 오류:", error);
      } finally {
        syncing = false;
      }
    };
    document.addEventListener("visibilitychange", syncOnResume);
    window.addEventListener("focus", syncOnResume);
    window.addEventListener("online", syncOnResume);
    return () => {
      document.removeEventListener("visibilitychange", syncOnResume);
      window.removeEventListener("focus", syncOnResume);
      window.removeEventListener("online", syncOnResume);
    };
  }, [user?.id, profile?.id, profile?.group_joined_at, profile?.role]);

  useEffect(() => {
    if (!user) return;

    const privateMessageChannel = supabase
      .channel(`private-messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "private_messages",
        },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setPrivateMessages((current) => current.filter((item) => item.id !== deletedId));
            } else if (privateChatId) {
              await loadPrivateMessages(privateChatId);
            }
            return;
          }

          if (profile?.role === "admin") {
            await Promise.all([
              loadAdminUnreadCounts(),
              loadAdminMembers(),
              loadAdminChats(),
            ]);
          } else {
            await loadMemberUnreadCount();
          }

          if (payload.eventType === "INSERT" && payload.new?.sender_id !== user.id) {
            await loadOneMemberName(payload.new.sender_id);
            showPrivateIncomingAlert(payload.new);
          }

          if (privateChatId && payload.new?.chat_id === privateChatId) {
            if (payload.eventType === "INSERT") {
              setPrivateMessages((current) =>
                current.some((item) => item.id === payload.new.id) ? current : [...current, payload.new]
              );
            } else {
              await loadPrivateMessages(privateChatId);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(privateMessageChannel);
    };
  }, [user, profile?.role, privateChatId]);

  useEffect(() => {
    if (chatTab !== "group") return;
    const box = groupMessagesRef.current;
    if (!box) return;

    if (!groupWasAtBottomRef.current) {
      setGroupShowLatestButton(true);
      return;
    }

    const raf = requestAnimationFrame(() => {
      box.style.scrollBehavior = "auto";
      box.scrollTop = box.scrollHeight + 10000;
      groupWasAtBottomRef.current = true;
      setGroupShowLatestButton(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [messages.length, chatTab]);


  useEffect(() => {
    if (chatTab !== "private") return;
    const box = privateMessagesRef.current;
    if (!box) return;

    if (!privateWasAtBottomRef.current) {
      setPrivateShowLatestButton(true);
      return;
    }

    const raf = requestAnimationFrame(() => {
      box.style.scrollBehavior = "auto";
      box.scrollTop = box.scrollHeight + 10000;
      privateWasAtBottomRef.current = true;
      setPrivateShowLatestButton(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [chatTab, privateChatId, privateMessages.length]);


  useEffect(() => {
    return () => {
      if (groupScrollDateTimerRef.current) {
        clearTimeout(groupScrollDateTimerRef.current);
      }
      if (privateScrollDateTimerRef.current) {
        clearTimeout(privateScrollDateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user || !profile) return;

    loadAutoEvents();
    loadAttendanceStatus();
    if (profile?.role === "admin") {
      loadGiftInventory();
      loadAiGiftInventory();
      loadAttendanceGiftInventory();
    }

    const timer = setInterval(() => {
      loadAutoEvents();
      loadMemberNames();
      loadAttendanceStatus();
      if (profile?.role === "admin") {
        loadGiftInventory();
        loadAttendanceGiftInventory();
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [user, profile]);

  useEffect(() => {
    // 표시된 시작시각이 되는 즉시 LIVE/참여 가능 상태로 화면을 갱신합니다.
    const timer = window.setInterval(() => {
      setEventClockTick((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // AI 일상대화 heartbeat는 브라우저에서 가벼운 깨우기 신호만 보냅니다.
  // 실제 모델 생성은 서버의 5분 DB 잠금 창을 통과한 신호 하나만 수행하므로,
  // 여러 회원이 접속해 있어도 중복 신호가 AI 토큰을 소비하지 않습니다.
  // 회원 메시지는 아래 send_group_message 성공 직후 정확한 원문으로 즉시 AI API를 호출합니다.

  useEffect(() => {
    // AI 일상대화 heartbeat: 기존 기능은 건드리지 않고 idle 판단만 주기적으로 깨운다.
    if (!GROUP_CHAT_ENABLED || !user || !profile || vipLocked) return;

    let stopped = false;
    let running = false;

    const runAiIdleHeartbeat = async () => {
      if (stopped || running) return;
      running = true;
      try {
        await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          keepalive: true,
          body: JSON.stringify({
            mode: "idle",
            source: "group_idle_heartbeat",
          }),
        });
      } catch (error) {
        console.error("AI 일상대화 heartbeat 실패:", error);
      } finally {
        running = false;
      }
    };

    const firstTimer = window.setTimeout(() => {
      void runAiIdleHeartbeat();
    }, 3500);

    const timer = window.setInterval(() => {
      void runAiIdleHeartbeat();
    }, 60000);

    return () => {
      stopped = true;
      window.clearTimeout(firstTimer);
      window.clearInterval(timer);
    };
  }, [user?.id, profile?.id, vipLocked]);

  async function loadAutoEvents() {
    const { data, error } = await supabase.rpc("get_auto_events");

    if (error) {
      console.error("이벤트 불러오기 오류:", error);
      setNotice("이벤트 정보를 불러오지 못했습니다.");
      return;
    }

    // 출석은 시간제 자동 이벤트와 분리하여 DAILY CHECK-IN으로 운영합니다.
    setAutoEvents((data || []).filter((item) => item.event_type !== "attendance"));
  }

  function getAttendanceCycleCount(status = attendanceStatus) {
    const total = Math.max(0, Number(status?.total_count || 0));
    const remainder = total % 10;

    // 10/20/30... 달성 당일에는 10/10을 보여주고,
    // 다음날(오늘 미출석)부터는 새 사이클 0/10으로 보여줍니다.
    if (remainder === 0 && total > 0) {
      return status?.checked_today ? 10 : 0;
    }

    return remainder;
  }

  async function loadAttendanceStatus() {
    const { data, error } = await supabase.rpc("get_daily_attendance_status");
    if (error) {
      console.error("출석 상태 불러오기 오류:", error);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setAttendanceStatus({
        checked_today: Boolean(row.checked_today),
        total_count: Number(row.total_count || 0),
        reward_ready: Boolean(row.reward_ready),
        next_reward_at: Number(row.next_reward_at || 10),
      });
    }
  }

  async function checkDailyAttendance() {
    if (attendanceWorking || attendanceStatus.checked_today) return;
    setAttendanceWorking(true);
    setNotice("");

    const { data, error } = await supabase.rpc("check_daily_attendance");
    if (error) {
      setNotice(`출석 참여 실패: ${error.message}`);
      setAttendanceWorking(false);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    setEventSuccess({
      eventId: "daily-attendance",
      title: "VIP DAILY CHECK-IN",
      message: result?.message || "오늘의 출석이 완료되었습니다.",
    });
    await loadAttendanceStatus();
    setAttendanceWorking(false);

    window.setTimeout(() => {
      setEventSuccess((current) => current?.eventId === "daily-attendance" ? null : current);
    }, 3600);
  }

  async function loadGiftInventory() {
    if (!user || profile?.role !== "admin") return;
    const { data, error } = await supabase.rpc("admin_get_gift_inventory");
    if (error) {
      console.error("기프티콘 재고 불러오기 오류:", error);
      return;
    }
    setGiftInventory(data || []);
  }


  function parseGiftAmountFromProductName(productName) {
    const name = String(productName || "").trim();
    if (!name) return null;

    // "1만원", "1.5만원", "10만원" 형태
    const manMatch = name.match(/(\d+(?:\.\d+)?)\s*만\s*원?/);
    if (manMatch) {
      const amount = Math.round(Number(manMatch[1]) * 10000);
      return Number.isFinite(amount) ? amount : null;
    }

    // "3,000원", "10000원", "3 000원" 형태
    const wonMatch = name.match(/(\d[\d,\s]*)\s*원/);
    if (wonMatch) {
      const amount = Number(wonMatch[1].replace(/[,\s]/g, ""));
      return Number.isFinite(amount) ? amount : null;
    }

    return null;
  }

  async function addGiftInventoryBulk(e) {
    e?.preventDefault?.();
    if (profile?.role !== "admin" || giftInventoryWorking) return;

    const normalizedText = String(giftBulkText || "")
      .replace(/\u2028|\u2029/g, "\n")
      .replace(/\r\n?/g, "\n");

    const lines = normalizedText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setNotice("등록할 기프티콘 목록을 붙여넣어주세요.");
      return;
    }

    if (lines.length > 1000) {
      setNotice("한 번에 최대 1,000개까지 등록할 수 있습니다.");
      return;
    }

    const items = [];
    for (let index = 0; index < lines.length; index += 1) {
      const parts = lines[index].split("|").map((part) => part.trim());

      if (parts.length < 2) {
        setNotice(`${index + 1}번째 줄 형식이 올바르지 않습니다.\n상품명 | https://기프티콘링크 형식으로 입력해주세요.`);
        return;
      }

      const productName = parts[0];
      const giftUrl = parts.slice(1).join("|").trim();
      const amount = parseGiftAmountFromProductName(productName);

      if (!productName) {
        setNotice(`${index + 1}번째 줄의 상품명이 비어 있습니다.`);
        return;
      }
      if (!Number.isFinite(amount) || amount < 3000 || amount > 200000) {
        setNotice(`${index + 1}번째 상품명에서 금액을 읽을 수 없습니다.\n예: 신세계 상품권 1만원 | https://링크\n또는 CU 모바일 5,000원 | https://링크`);
        return;
      }
      if (!/^https:\/\//i.test(giftUrl)) {
        setNotice(`${index + 1}번째 줄의 링크는 https:// 로 시작해야 합니다.`);
        return;
      }

      items.push({
        product_name: productName,
        amount,
        gift_url: giftUrl,
      });
    }

    setGiftInventoryWorking(true);
    try {
      const BATCH_SIZE = 100;
      let insertedTotal = 0;
      let skippedTotal = 0;

      for (let offset = 0; offset < items.length; offset += BATCH_SIZE) {
        const batch = items.slice(offset, offset + BATCH_SIZE);
        const { data, error } = await supabase.rpc("admin_bulk_add_gift_inventory", {
          p_items: batch,
        });
        if (error) throw error;

        const result = Array.isArray(data) ? data[0] : data;
        insertedTotal += Number(result?.inserted_count ?? batch.length);
        skippedTotal += Number(result?.skipped_count ?? 0);
      }

      setGiftBulkText("");
      setNotice(
        skippedTotal > 0
          ? `기프티콘 ${insertedTotal}개 등록 완료 · 중복 링크 ${skippedTotal}개 제외`
          : `기프티콘 ${insertedTotal}개가 지급 순서대로 등록되었습니다.`
      );
      await loadGiftInventory();
    } catch (error) {
      console.error("기프티콘 일괄 등록 오류:", error);
      setNotice(`기프티콘 일괄 등록 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setGiftInventoryWorking(false);
    }
  }

  async function deleteGiftInventory(giftId, giftStatus = "available") {
    if (profile?.role !== "admin" || !giftId) return;

    const isAssigned = giftStatus === "assigned";
    const confirmMessage = isAssigned
      ? "지급완료 내역에서 이 기프티콘을 삭제할까요?\n\n삭제하면 목록에서 사라지고, 동일한 기프티콘 링크를 다시 등록할 수 있습니다.\n이미 회원에게 지급된 1:1 메시지는 삭제되지 않습니다."
      : "아직 지급되지 않은 이 기프티콘을 삭제할까요?";

    if (!window.confirm(confirmMessage)) return;

    const rpcName = isAssigned
      ? "admin_delete_gift_inventory"
      : "admin_delete_available_gift";

    const { error } = await supabase.rpc(rpcName, {
      p_gift_id: giftId,
    });

    if (error) {
      setNotice(`기프티콘 삭제 실패: ${error.message}`);
      return;
    }

    setNotice(
      isAssigned
        ? "지급완료 기프티콘 내역을 삭제했습니다. 동일한 링크를 다시 등록할 수 있습니다."
        : "기프티콘을 삭제했습니다."
    );
    await loadGiftInventory();
  }

  async function deleteAllGiftInventory() {
    if (profile?.role !== "admin" || giftInventoryWorking) return;

    const waitingCount = giftInventory.filter((gift) => gift.status === "available").length;
    if (waitingCount === 0) {
      setNotice("삭제할 일반 이벤트 지급대기 기프티콘이 없습니다.");
      return;
    }

    const ok = window.confirm(
      `현재 X 버튼으로 개별 삭제 가능한 일반 이벤트 지급대기 기프티콘 ${waitingCount}개를 한 번에 삭제할까요?\n\n지급완료된 기프티콘은 절대 삭제되지 않습니다.\n삭제한 지급대기 링크는 다시 등록할 수 있습니다.`
    );
    if (!ok) return;

    setGiftInventoryWorking(true);
    try {
      const { data, error } = await supabase.rpc("admin_delete_all_gift_inventory");
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      const deleted = Number(result?.deleted_count ?? 0);
      setNotice(`일반 이벤트 지급대기 기프티콘 ${deleted}개를 한 번에 삭제했습니다.`);
      await loadGiftInventory();
    } catch (error) {
      console.error("일반 이벤트 지급대기 기프티콘 전체 삭제 오류:", error);
      setNotice(`지급대기 전체 삭제 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setGiftInventoryWorking(false);
    }
  }

  async function deleteAllAssignedGiftInventory() {
    if (profile?.role !== "admin" || giftInventoryWorking) return;
    const assignedCount = giftInventory.filter((gift) => gift.status === "assigned").length;
    if (!assignedCount) { setNotice("삭제할 일반 이벤트 지급완료 기프티콘이 없습니다."); return; }
    if (!window.confirm(`일반 실시간 이벤트 지급완료 기프티콘 ${assignedCount}개를 목록에서 모두 삭제할까요?\n\n이미 회원 1:1 채팅으로 지급된 기프티콘 메시지는 삭제되지 않습니다.`)) return;
    setGiftInventoryWorking(true);
    try {
      const { data, error } = await supabase.rpc("admin_delete_all_assigned_gift_inventory");
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      setNotice(`일반 이벤트 지급완료 기프티콘 ${Number(result?.deleted_count ?? 0)}개를 모두 삭제했습니다.`);
      await loadGiftInventory();
    } catch (error) {
      setNotice(`지급완료 전체 삭제 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally { setGiftInventoryWorking(false); }
  }

  async function loadAiGiftInventory() {
    if (!user || profile?.role !== "admin") return;
    const { data, error } = await supabase.rpc("admin_get_ai_gift_inventory");
    if (error) {
      console.error("AI 전용 당첨상품 불러오기 오류:", error);
      return;
    }
    setAiGiftInventory(data || []);
  }

  async function addAiGiftInventoryBulk(e) {
    e?.preventDefault?.();
    if (profile?.role !== "admin" || aiGiftWorking) return;

    const lines = String(aiGiftBulkText || "")
      .replace(/\u2028|\u2029/g, "\n")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setNotice("AI 당첨 공지에 사용할 상품명을 입력해주세요.");
      return;
    }
    if (lines.length > 1000) {
      setNotice("한 번에 최대 1,000개까지 등록할 수 있습니다.");
      return;
    }
    if (lines.some((line) => line.length > 120)) {
      setNotice("AI 전용 상품명은 한 줄당 120자 이내로 입력해주세요.");
      return;
    }

    setAiGiftWorking(true);
    try {
      const { data, error } = await supabase.rpc("admin_bulk_add_ai_gift_inventory", {
        p_product_names: lines,
      });
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      const inserted = Number(result?.inserted_count ?? lines.length);
      setAiGiftBulkText("");
      setNotice(`AI 전용 당첨상품 ${inserted}개를 등록했습니다.`);
      await loadAiGiftInventory();
    } catch (error) {
      console.error("AI 전용 당첨상품 등록 오류:", error);
      setNotice(`AI 전용 상품 등록 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setAiGiftWorking(false);
    }
  }

  async function deleteAiGiftInventory(giftId) {
    if (profile?.role !== "admin" || !giftId || aiGiftWorking) return;
    if (!window.confirm("이 AI 전용 당첨상품을 삭제할까요?")) return;

    setAiGiftWorking(true);
    try {
      const { error } = await supabase.rpc("admin_delete_ai_gift_inventory", {
        p_gift_id: giftId,
      });
      if (error) throw error;
      setNotice("AI 전용 당첨상품을 삭제했습니다.");
      await loadAiGiftInventory();
    } catch (error) {
      setNotice(`AI 전용 상품 삭제 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setAiGiftWorking(false);
    }
  }

  async function deleteAllAvailableAiGiftInventory() {
    if (profile?.role !== "admin" || aiGiftWorking) return;
    const waitingCount = aiGiftInventory.filter((gift) => gift.status === "available").length;
    if (!waitingCount) {
      setNotice("삭제할 AI 전용 지급대기 상품이 없습니다.");
      return;
    }
    if (!window.confirm(`AI 전용 지급대기 상품 ${waitingCount}개를 모두 삭제할까요?\n\n이미 공지에 사용된 내역은 유지됩니다.`)) return;

    setAiGiftWorking(true);
    try {
      const { data, error } = await supabase.rpc("admin_delete_all_available_ai_gift_inventory");
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      setNotice(`AI 전용 지급대기 상품 ${Number(result?.deleted_count ?? 0)}개를 삭제했습니다.`);
      await loadAiGiftInventory();
    } catch (error) {
      setNotice(`AI 전용 상품 전체 삭제 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setAiGiftWorking(false);
    }
  }

  async function deleteAllAssignedAiGiftInventory() {
    if (profile?.role !== "admin" || aiGiftWorking) return;
    const assignedCount = aiGiftInventory.filter((gift) => gift.status === "assigned").length;
    if (!assignedCount) { setNotice("삭제할 AI 전용 공지완료 상품이 없습니다."); return; }
    if (!window.confirm(`AI 전용 공지완료 상품 ${assignedCount}개를 목록에서 모두 삭제할까요?\n\n이미 그룹채팅에 올라간 당첨 공지는 삭제되지 않습니다.`)) return;
    setAiGiftWorking(true);
    try {
      const { data, error } = await supabase.rpc("admin_delete_all_assigned_ai_gift_inventory");
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      setNotice(`AI 전용 공지완료 상품 ${Number(result?.deleted_count ?? 0)}개를 모두 삭제했습니다.`);
      await loadAiGiftInventory();
    } catch (error) {
      setNotice(`AI 공지완료 전체 삭제 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally { setAiGiftWorking(false); }
  }

  async function loadAttendanceGiftInventory() {
    if (!user || profile?.role !== "admin") return;
    const { data, error } = await supabase.rpc("admin_get_attendance_gift_inventory");
    if (error) {
      console.error("출석체크 기프티콘 재고 불러오기 오류:", error);
      return;
    }
    setAttendanceGiftInventory(data || []);
  }

  async function addAttendanceGiftInventoryBulk(e) {
    e?.preventDefault?.();
    if (profile?.role !== "admin" || attendanceGiftWorking) return;

    const normalizedText = String(attendanceGiftBulkText || "")
      .replace(/\u2028|\u2029/g, "\n")
      .replace(/\r\n?/g, "\n");

    const lines = normalizedText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setNotice("출석체크용으로 등록할 기프티콘 목록을 붙여넣어주세요.");
      return;
    }

    if (lines.length > 1000) {
      setNotice("한 번에 최대 1,000개까지 등록할 수 있습니다.");
      return;
    }

    const items = [];
    for (let index = 0; index < lines.length; index += 1) {
      const parts = lines[index].split("|").map((part) => part.trim());

      if (parts.length < 2) {
        setNotice(`${index + 1}번째 줄 형식이 올바르지 않습니다.\n상품명 | https://기프티콘링크 형식으로 입력해주세요.`);
        return;
      }

      const productName = parts[0];
      const giftUrl = parts.slice(1).join("|").trim();
      const amount = parseGiftAmountFromProductName(productName);

      if (!productName) {
        setNotice(`${index + 1}번째 줄의 상품명이 비어 있습니다.`);
        return;
      }
      if (!Number.isFinite(amount) || amount < 3000 || amount > 200000) {
        setNotice(`${index + 1}번째 상품명에서 금액을 읽을 수 없습니다.\n예: 신세계 상품권 1만원 | https://링크\n또는 CU 모바일 5,000원 | https://링크`);
        return;
      }
      if (!/^https:\/\//i.test(giftUrl)) {
        setNotice(`${index + 1}번째 줄의 링크는 https:// 로 시작해야 합니다.`);
        return;
      }

      items.push({
        product_name: productName,
        amount,
        gift_url: giftUrl,
      });
    }

    setAttendanceGiftWorking(true);
    try {
      const BATCH_SIZE = 100;
      let insertedTotal = 0;
      let skippedTotal = 0;

      for (let offset = 0; offset < items.length; offset += BATCH_SIZE) {
        const batch = items.slice(offset, offset + BATCH_SIZE);
        const { data, error } = await supabase.rpc(
          "admin_bulk_add_attendance_gift_inventory",
          { p_items: batch }
        );
        if (error) throw error;

        const result = Array.isArray(data) ? data[0] : data;
        insertedTotal += Number(result?.inserted_count ?? batch.length);
        skippedTotal += Number(result?.skipped_count ?? 0);
      }

      setAttendanceGiftBulkText("");
      setNotice(
        skippedTotal > 0
          ? `출석체크 전용 기프티콘 ${insertedTotal}개 등록 완료 · 중복 링크 ${skippedTotal}개 제외`
          : `출석체크 전용 기프티콘 ${insertedTotal}개 일괄 등록 완료`
      );
      await loadAttendanceGiftInventory();
    } catch (error) {
      console.error("출석체크 기프티콘 일괄 등록 오류:", error);
      setNotice(`출석체크 기프티콘 등록 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setAttendanceGiftWorking(false);
    }
  }

  async function deleteAttendanceGiftInventory(giftId, giftStatus = "available") {
    if (profile?.role !== "admin" || !giftId) return;

    const isAssigned = giftStatus === "assigned";
    const ok = window.confirm(
      isAssigned
        ? "출석체크 지급완료 내역에서 이 기프티콘을 삭제할까요?\n\n이미 회원 1:1 채팅으로 지급된 메시지는 유지됩니다."
        : "출석체크 지급대기 재고에서 이 기프티콘을 삭제할까요?"
    );
    if (!ok) return;

    const { error } = await supabase.rpc("admin_delete_attendance_gift_inventory", {
      p_gift_id: giftId,
    });

    if (error) {
      setNotice(`출석체크 기프티콘 삭제 실패: ${error.message}`);
      return;
    }

    setNotice(isAssigned ? "출석체크 지급완료 내역을 삭제했습니다." : "출석체크 기프티콘 재고를 삭제했습니다.");
    await loadAttendanceGiftInventory();
  }

  async function deleteAllAttendanceGiftInventory() {
    if (profile?.role !== "admin" || attendanceGiftWorking) return;

    const waitingCount = attendanceGiftInventory.filter((gift) => gift.status === "available").length;
    if (waitingCount === 0) {
      setNotice("삭제할 출석체크 지급대기 기프티콘이 없습니다.");
      return;
    }

    const ok = window.confirm(
      `현재 X 버튼으로 개별 삭제 가능한 출석체크 지급대기 기프티콘 ${waitingCount}개를 한 번에 삭제할까요?\n\n지급완료된 기프티콘은 절대 삭제되지 않습니다.\n삭제한 지급대기 링크는 다시 등록할 수 있습니다.`
    );
    if (!ok) return;

    setAttendanceGiftWorking(true);
    try {
      const { data, error } = await supabase.rpc("admin_delete_all_attendance_gift_inventory");
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      const deleted = Number(result?.deleted_count ?? 0);
      setNotice(`출석체크 지급대기 기프티콘 ${deleted}개를 한 번에 삭제했습니다.`);
      await loadAttendanceGiftInventory();
    } catch (error) {
      console.error("출석체크 지급대기 기프티콘 전체 삭제 오류:", error);
      setNotice(`출석체크 지급대기 전체 삭제 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setAttendanceGiftWorking(false);
    }
  }

  async function deleteAllAssignedAttendanceGiftInventory() {
    if (profile?.role !== "admin" || attendanceGiftWorking) return;
    const assignedCount = attendanceGiftInventory.filter((gift) => gift.status === "assigned").length;
    if (!assignedCount) { setNotice("삭제할 출석체크 지급완료 기프티콘이 없습니다."); return; }
    if (!window.confirm(`출석체크 지급완료 기프티콘 ${assignedCount}개를 목록에서 모두 삭제할까요?\n\n이미 회원 1:1 채팅으로 지급된 기프티콘 메시지는 삭제되지 않습니다.`)) return;
    setAttendanceGiftWorking(true);
    try {
      const { data, error } = await supabase.rpc("admin_delete_all_assigned_attendance_gift_inventory");
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      setNotice(`출석체크 지급완료 기프티콘 ${Number(result?.deleted_count ?? 0)}개를 모두 삭제했습니다.`);
      await loadAttendanceGiftInventory();
    } catch (error) {
      setNotice(`출석체크 지급완료 전체 삭제 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally { setAttendanceGiftWorking(false); }
  }

  function setEventAnswer(eventId, value) {
    setEventAnswers((current) => ({ ...current, [eventId]: value }));
  }

  async function joinAutoEvent(eventItem, directAnswer = undefined) {
    if (!eventItem?.event_id || eventWorkingId) return;

    let answer = directAnswer;
    if (answer === undefined) answer = eventAnswers[eventItem.event_id] ?? null;

    if (eventItem.event_type === "number") {
      const n = Number(answer);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        setNotice("숫자 맞히기는 1부터 100까지 숫자 하나를 선택해주세요.");
        return;
      }
      answer = String(n);
    }

    if (eventItem.event_type === "quiz" && !["1", "2", "3", "4"].includes(String(answer))) {
      setNotice("퀴즈 보기 중 하나를 먼저 선택해주세요.");
      return;
    }

    if (eventItem.event_type === "gift_box" && !["1", "2", "3", "4"].includes(String(answer))) {
      setNotice("선물상자 1~4번 중 하나를 선택해주세요.");
      return;
    }

    if (eventItem.event_type === "roulette") {
      setRouletteSpins((current) => ({ ...current, [eventItem.event_id]: true }));
      await new Promise((resolve) => setTimeout(resolve, 900));
      answer = "roulette";
    }

    setEventWorkingId(eventItem.event_id);
    setNotice("");

    const { data, error } = await supabase.rpc("join_auto_event", {
      target_event_id: eventItem.event_id,
      submitted_answer: answer,
    });

    if (error) {
      setNotice(`이벤트 참여 실패: ${error.message}`);
      setEventSuccess(null);
    } else {
      const successMessage = `${eventItem.title || "이벤트"} 참여가 완료되었습니다.`;
      setNotice("");
      setEventSuccess({
        eventId: eventItem.event_id,
        title: eventItem.title || "이벤트",
        message: successMessage,
      });

      // 서버 상태를 즉시 다시 받아 버튼/배지도 "참여완료"로 바꿉니다.
      await loadAutoEvents();

      window.setTimeout(() => {
        setEventSuccess((current) =>
          current?.eventId === eventItem.event_id ? null : current
        );
      }, 3600);
    }

    setEventWorkingId(null);
    if (eventItem.event_type === "roulette") {
      setRouletteSpins((current) => ({ ...current, [eventItem.event_id]: false }));
    }
  }

  function eventGuide(type) {
    const guides = {
      gift_box: "4개의 상자 중 하나를 선택하세요. 당첨 상자를 고른 회원이 여러 명이면 그중 1명을 무작위로 선정합니다.",
      number: "1~10 중 숫자 하나를 선택하세요. 정답자가 여러 명이면 정답자 중 무작위 1명, 정답자가 없으면 가장 가까운 숫자의 회원 중 1명을 선정합니다.",
      roulette: "룰렛 돌리기를 눌러 응모하세요. 화면 회전은 연출이며, 회차 종료 후 실제 참여자 중 서버가 무작위로 1명을 선정합니다.",
      first_come: "시작 후 참여 버튼을 가장 먼저 정상 접수한 1명이 즉시 당첨됩니다. 회원 기기 시간이 아닌 서버 접수 순서로 판정합니다.",
      quiz: "문제를 읽고 보기 하나를 선택해 제출하세요. 정답자만 당첨 대상이며, 정답자가 여러 명이면 그중 1명을 무작위로 선정합니다.",
      draw: "응모하기를 한 번 누르면 완료됩니다. 회차 종료 후 실제 응모자 전체 중 서버가 무작위로 1명을 선정합니다.",
    };
    return guides[type] || "회차당 1회 참여할 수 있습니다.";
  }

  function renderEventGame(item, active, participated) {
    const busy = eventWorkingId === item.event_id;
    if (!active || participated) return null;

    if (item.event_type === "gift_box") {
      return (
        <div style={blueTheme(styles.gameArea, "surface", "shell")}>
          <div style={blueTheme(styles.gameLabel, "surface", "shell")}>선물상자를 선택하세요</div>
          <div style={blueTheme(styles.gameFourGrid, "surface", "shell")}>
            {[1,2,3,4].map((box) => (
              <button key={box} type="button" onClick={() => setEventAnswer(item.event_id, String(box))}
                style={blueTheme({...styles.gameChoice, ...(String(eventAnswers[item.event_id]) === String(box) ? styles.gameChoiceSelected : {})}, "button", "shell")}>
                <span style={blueTheme(styles.gameChoiceIcon, "buttonChild", "shell")}>🎁</span>
                <span style={blueTheme(styles.gameChoiceNumber, "buttonChild", "shell")}>{box}번</span>
              </button>
            ))}
          </div>
          <button type="button" disabled={busy} onClick={() => joinAutoEvent(item)} style={blueTheme(styles.gameSubmit, "button", "shell")}>
            {busy ? "처리 중..." : "선택한 상자로 참여하기"}
          </button>
        </div>
      );
    }

    if (item.event_type === "number") {
      return (
        <div style={blueTheme(styles.gameArea, "surface", "shell")}>
          <div style={blueTheme(styles.gameLabel, "surface", "shell")}>1 ~ 10 중에서 <b>숫자 1개</b>를 선택해주세요.</div>
          <div style={blueTheme(styles.numberRow, "surface", "shell")}>
            <input type="number" min="1" max="10" inputMode="numeric" value={eventAnswers[item.event_id] || ""}
              onChange={(e) => setEventAnswer(item.event_id, e.target.value)} placeholder="예: 7" style={blueTheme(styles.gameInput, "surface", "shell")} />
            <button type="button" disabled={busy} onClick={() => joinAutoEvent(item)} style={blueTheme(styles.gameSubmitSmall, "button", "shell")}>
              {busy ? "처리 중" : "제출"}
            </button>
          </div>
        </div>
      );
    }

    if (item.event_type === "quiz") {
      const options = [item.quiz_option_1, item.quiz_option_2, item.quiz_option_3, item.quiz_option_4];
      return (
        <div style={blueTheme(styles.gameArea, "surface", "shell")}>
          <div style={blueTheme(styles.quizQuestion, "surface", "shell")}>Q. {item.quiz_question || "퀴즈를 불러오는 중입니다."}</div>
          <div style={blueTheme(styles.quizGrid, "surface", "shell")}>
            {options.map((option, index) => (
              <button key={index} type="button" disabled={!option} onClick={() => setEventAnswer(item.event_id, String(index + 1))}
                style={blueTheme({...styles.quizChoice, ...(String(eventAnswers[item.event_id]) === String(index + 1) ? styles.gameChoiceSelected : {})}, "button", "shell")}>
                <span style={blueTheme(styles.quizOptionNumber, "buttonChild", "shell")}>{index + 1}</span>
                <span style={blueTheme(styles.quizOptionText, "buttonChild", "shell")}>{option || "-"}</span>
              </button>
            ))}
          </div>
          <button type="button" disabled={busy} onClick={() => joinAutoEvent(item)} style={blueTheme(styles.gameSubmit, "button", "shell")}>
            {busy ? "제출 중..." : "정답 제출하기"}
          </button>
        </div>
      );
    }

    if (item.event_type === "roulette") {
      const spinning = rouletteSpins[item.event_id];
      return (
        <div style={blueTheme(styles.gameArea, "surface", "shell")}>
          <div style={blueTheme({...styles.rouletteWheel, transform: spinning ? "rotate(1080deg)" : "rotate(0deg)"}, "surface", "shell")}>✦</div>
          <button type="button" disabled={busy || spinning} onClick={() => joinAutoEvent(item, "roulette")} style={blueTheme(styles.gameSubmit, "button", "shell")}>
            {spinning ? "룰렛 회전 중..." : busy ? "처리 중..." : "룰렛 돌리고 응모하기"}
          </button>
        </div>
      );
    }

    const labels = { first_come: "⚡ 지금 참여하기", draw: "🎟️ 응모하기" };
    return (
      <div style={blueTheme(styles.gameArea, "surface", "shell")}>
        <button type="button" disabled={busy} onClick={() => joinAutoEvent(item, null)} style={blueTheme(styles.gameSubmit, "button", "shell")}>
          {busy ? "처리 중..." : labels[item.event_type] || "참여하기"}
        </button>
      </div>
    );
  }

  function formatEventTime(value) {
    if (!value) return "--:--";

    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  }

  function eventIcon(type) {
    return (
      {
        gift_box: "🎁",
        number: "🎯",
        roulette: "🎰",
        first_come: "⚡",
        quiz: "🧩",
        draw: "🎟️",
      }[type] || "🎁"
    );
  }

  function isEventLiveNow(event) {
    const nowMs = Date.now();
    const startMs = new Date(event?.starts_at).getTime();
    const endMs = new Date(event?.ends_at).getTime();
    return (
      Number.isFinite(startMs) &&
      Number.isFinite(endMs) &&
      nowMs >= startMs &&
      nowMs < endMs &&
      event?.status !== "completed"
    );
  }

  function getGroupEventBanner() {
    if (!autoEvents || autoEvents.length === 0) return null;

    const activeEvent = autoEvents.find(
      (item) => item.status === "active" || isEventLiveNow(item)
    );

    if (activeEvent) {
      return {
        type: "active",
        icon: eventIcon(activeEvent.event_type),
        title: `지금 ${activeEvent.title.replace(/^[^\s]+\s/, "")} 이벤트 진행 중!`,
        text: `${formatEventTime(activeEvent.starts_at)} ~ ${formatEventTime(
          activeEvent.ends_at
        )} 참여 가능 · 이벤트 칸으로 이동해서 참여해주세요`,
      };
    }

    const nextEvent = autoEvents.find(
      (item) => item.status === "scheduled" && !isEventLiveNow(item)
    );

    if (nextEvent) {
      return {
        type: "next",
        icon: eventIcon(nextEvent.event_type),
        title: `다음 이벤트 · ${nextEvent.title.replace(/^[^\s]+\s/, "")}`,
        text: `${formatEventTime(nextEvent.starts_at)} ~ ${formatEventTime(
          nextEvent.ends_at
        )} 참여 가능 · 곧 시작됩니다`,
      };
    }

    return {
      type: "done",
      icon: "🎉",
      title: "오늘의 이벤트가 종료되었습니다",
      text: "매 정각 새로운 이벤트가 시작됩니다.",
    };
  }

  function getSortedAutoEvents() {
    const statusOrder = { active: 0, scheduled: 1, completed: 2 };

    return [...autoEvents].sort((a, b) => {
      const aOrder = statusOrder[a.status] ?? 3;
      const bOrder = statusOrder[b.status] ?? 3;

      if (aOrder !== bOrder) return aOrder - bOrder;

      return Number(a.round_number || 0) - Number(b.round_number || 0);
    });
  }

  async function checkSession() {
    // 기존 회원과 AI의 예전 프로필 키는 새 43개 풀로 최초 1회 균등 재배정합니다.
    // 이미 01~43을 받은 계정은 다시 바꾸지 않으므로 새로고침해도 프로필이 유지됩니다.
    try {
      await fetch("/api/avatars/ensure", { method: "POST", cache: "no-store" });
    } catch (error) {
      console.error("프로필 자동 배정 확인 오류:", error);
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setLoading(false);
      return;
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab");
      const fromPush = params.get("from") === "push";
      const savedTab = window.sessionStorage.getItem("vip-active-tab");

      if (["event", "ai", "private"].includes(urlTab)) {
        setChatTab(urlTab);
        window.sessionStorage.setItem("vip-active-tab", urlTab);
      } else if (["event", "ai", "private"].includes(savedTab)) {
        setChatTab(savedTab);
      } else {
        setChatTab("event");
      }

      // 푸시 알림을 눌러 들어온 경우 인증 세션이 살아 있으면 잠금 화면을 건너뜁니다.
      if (fromPush) {
        window.localStorage.removeItem("vip-ui-locked");
        setVipLocked(false);
        window.history.replaceState({}, "", "/?tab=private");
      } else {
        setVipLocked(window.localStorage.getItem("vip-ui-locked") === "1");
      }
    }

    await loadProfile(session.user);
  }

  async function loadProfile(authUser) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (error || !data) {
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (data.approval_status !== "1") {
      await supabase.auth.signOut();
      setNotice("관리자 승인 대기 중인 계정입니다.");
      setLoading(false);
      return;
    }

    setUser(authUser);
    setProfile(data);
    setInstallGuideEligibleThisLogin(data.role !== "admin" && data.welcome_popup_seen === true);
    setLoading(false);
  }

  async function loadMemberNames() {
    const { data, error } = await supabase.rpc("get_chat_member_directory");

    if (error || !data) {
      console.error("채팅 회원정보 불러오기 오류:", error);
      return;
    }

    const nameMap = {};
    const avatarMap = {};
    let approvedCount = 0;

    data.forEach((member) => {
      if (!member?.id) return;

      nameMap[member.id] = member.nickname || "VIP 회원";
      // 고객센터 관리자 프로필은 일반 회원/AI 랜덤 프로필과 완전히 분리합니다.
      // 그룹채팅에서도 관리자 메시지는 전용 admin 이미지를 사용합니다.
      avatarMap[member.id] = member.role === "admin" ? "admin" : (member.avatar || "01");

      if (member.member_type === "member") approvedCount += 1;

      if (member.role === "admin") {
        setAdminIdentity({
          nickname: member.nickname || "관리자",
          avatar: "admin",
        });
      }
    });

    // AI 캐릭터는 route.js가 실제 group_messages.member_id ↔ ai_characters를
    // 이미 정확히 매핑하고 있으므로, 표시용 닉네임/프로필도 같은 매핑을 한 번 더 합친다.
    // 일반 회원/관리자 정보나 채팅 로직은 전혀 변경하지 않는다.
    if (GROUP_CHAT_ENABLED) try {
      const aiResponse = await fetch("/api/ai-chat?mode=directory", {
        method: "GET",
        cache: "no-store",
      });
      if (aiResponse.ok) {
        const aiResult = await aiResponse.json().catch(() => ({}));
        (aiResult?.directory || []).forEach((ai) => {
          if (!ai?.member_id) return;
          if (ai.nickname) nameMap[ai.member_id] = ai.nickname;
          if (ai.avatar) avatarMap[ai.member_id] = ai.avatar;
        });
      }
    } catch (error) {
      console.error("AI 채팅 프로필 표시정보 불러오기 오류:", error);
    }

    setMemberNames(nameMap);
    setMemberAvatars(avatarMap);
    setApprovedMemberCount(approvedCount);
  }

  async function loadOneMemberName(memberId) {
    if (!memberId) return;

    const { data, error } = await supabase.rpc("get_chat_member_directory");
    if (error || !data) return;

    const found = data.find((member) => String(member.id) === String(memberId));
    if (found) {
      setMemberNames((current) => ({
        ...current,
        [found.id]: found.nickname || "VIP 회원",
      }));

      setMemberAvatars((current) => ({
        ...current,
        // 실시간 단건 갱신에서도 관리자 전용 프로필을 절대 일반 랜덤 프로필로 덮어쓰지 않는다.
        [found.id]: found.role === "admin" ? "admin" : (found.avatar || "01"),
      }));

      // 정상 회원 닉네임이면 여기서 끝냅니다.
      // 다만 AI용 members 행이 임시값 "VIP 회원"인 경우에는 아래 AI 캐릭터 directory까지 확인합니다.
      if (String(found.nickname || "").trim() && String(found.nickname || "").trim() !== "VIP 회원") return;
    }

    // RPC 목록에 아직 표시되지 않은 AI 메시지가 실시간으로 먼저 도착한 경우에도
    // "VIP 회원" fallback을 쓰지 않고 AI 캐릭터의 설정 닉네임/프로필을 즉시 복구한다.
    if (GROUP_CHAT_ENABLED) try {
      const aiResponse = await fetch("/api/ai-chat?mode=directory", {
        method: "GET",
        cache: "no-store",
      });
      if (!aiResponse.ok) return;
      const aiResult = await aiResponse.json().catch(() => ({}));
      const ai = (aiResult?.directory || []).find(
        (item) => String(item?.member_id || "") === String(memberId)
      );
      if (!ai) return;

      setMemberNames((current) => ({
        ...current,
        [memberId]: ai.nickname || current[memberId] || "VIP 회원",
      }));
      setMemberAvatars((current) => ({
        ...current,
        [memberId]: ai.avatar || current[memberId] || "01",
      }));
    } catch (error) {
      console.error("AI 실시간 프로필 표시정보 복구 오류:", error);
    }
  }

  async function loadMemberAvatars() {
    const { data, error } = await supabase.rpc("get_chat_member_directory");
    if (error || !data) return;

    const map = {};
    data.forEach((member) => {
      // 전체 프로필 재조회/새로고침에서도 VIP 고객센터 관리자는 항상 전용 admin 이미지로 고정한다.
      map[member.id] = member.role === "admin" ? "admin" : (member.avatar || "01");
    });
    setMemberAvatars(map);
  }

  async function adminChangeMemberIdentity() {
    if (!user || profile?.role !== "admin" || !adminIdentityTarget || adminIdentityWorking) return;

    const cleanNickname = String(adminEditNickname || "").trim();
    const cleanRealName = String(adminEditRealName || "").trim();

    if (!cleanNickname || !cleanRealName) {
      setNotice("닉네임과 성함을 모두 입력해주세요.");
      return;
    }

    if (!window.confirm(`${adminIdentityTarget.nickname || "회원"}님의 닉네임/성함을 변경하시겠습니까?`)) return;

    setAdminIdentityWorking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("관리자 로그인 세션을 확인할 수 없습니다.");

      const response = await fetch("/api/admin/member-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          memberId: adminIdentityTarget.member_id,
          nickname: cleanNickname,
          realName: cleanRealName,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "회원정보 변경 요청에 실패했습니다.");
      }

      setApprovedMemberManagerRows((current) =>
        current.map((member) =>
          String(member.member_id) === String(adminIdentityTarget.member_id)
            ? { ...member, nickname: cleanNickname, real_name: cleanRealName }
            : member
        )
      );

      setAdminIdentityTarget(null);
      setAdminEditNickname("");
      setAdminEditRealName("");
      setNotice(`${cleanNickname}님의 닉네임/성함을 변경했습니다.`);

      await Promise.all([
        loadMemberNames(),
        loadAdminMembers(),
        loadAdminApprovalMembers({ silent: true }),
      ]);
    } catch (error) {
      console.error("관리자 회원정보 변경 실패:", error);
      setNotice(`회원정보 변경 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setAdminIdentityWorking(false);
    }
  }

  async function changeMyPassword() {
    if (!user || passwordChangeWorking) return;

    const clean = normalizePasswordInput(newPassword);
    const confirmClean = normalizePasswordInput(newPasswordConfirm);

    if (clean.length < 4) {
      setNotice("새 비밀번호는 4자리 이상 입력해주세요.");
      return;
    }
    if (clean !== confirmClean) {
      setNotice("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setPasswordChangeWorking(true);
    try {
      // 기존 로그인 규칙과 동일하게 내부 접두어를 붙여 Supabase Auth 비밀번호를 변경합니다.
      const { error } = await supabase.auth.updateUser({
        password: `VIP!${clean}`,
      });
      if (error) throw error;

      setNewPassword("");
      setNewPasswordConfirm("");
      setShowPasswordChange(false);
      setNotice("비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해주세요.");
    } catch (error) {
      console.error("내 비밀번호 변경 실패:", error);
      setNotice(`비밀번호 변경 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setPasswordChangeWorking(false);
    }
  }

  async function adminChangeMemberPassword() {
    if (!user || profile?.role !== "admin" || !adminPasswordTarget || passwordChangeWorking) return;

    const clean = normalizePasswordInput(adminNewPassword);
    if (clean.length < 4) {
      setNotice("새 비밀번호는 4자리 이상 입력해주세요.");
      return;
    }

    if (!window.confirm(`${adminPasswordTarget.nickname || "회원"}님의 로그인 비밀번호를 변경하시겠습니까?`)) return;

    setPasswordChangeWorking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("관리자 로그인 세션을 확인할 수 없습니다.");

      const response = await fetch("/api/admin/member-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          memberId: adminPasswordTarget.member_id,
          newPassword: clean,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "비밀번호 변경 요청에 실패했습니다.");
      }

      setAdminNewPassword("");
      setAdminPasswordTarget(null);
      setNotice(`${adminPasswordTarget.nickname || "회원"}님의 비밀번호를 변경했습니다.`);
    } catch (error) {
      console.error("관리자 회원 비밀번호 변경 실패:", error);
      setNotice(`회원 비밀번호 변경 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setPasswordChangeWorking(false);
    }
  }

  async function loadGroupChatState() {
    if (!GROUP_CHAT_ENABLED) return;
    const { data, error } = await supabase.rpc("get_group_chat_state", {
      target_room_id: ROOM_ID,
    });
    if (!error) setChatFrozen(Boolean(data));
  }

  async function toggleGroupChatFreeze() {
    if (profile?.role !== "admin" || freezeWorking) return;
    setFreezeWorking(true);
    const nextValue = !chatFrozen;
    const { error } = await supabase.rpc("set_group_chat_frozen", {
      target_room_id: ROOM_ID,
      frozen: nextValue,
    });
    if (error) {
      setNotice(`채팅 상태 변경 실패: ${error.message}`);
    } else {
      setChatFrozen(nextValue);
      setNotice(nextValue ? "그룹채팅을 얼렸습니다." : "그룹채팅을 다시 열었습니다.");
    }
    setFreezeWorking(false);
  }


  const CHAT_EMOJIS = [
    "😀","😄","😁","😂","🤣","😊","😍","🥰","😘","😎","🤩","🥳",
    "😭","🥹","😢","😅","🤔","🙌","👏","👍","❤️","💛","💙","💜",
    "✨","🎉","🎁","🏆","🔥","💯","🍀","⭐","🌟","🙏","👌","💎"
  ];

  function formatChatTime(value) {
    if (!value) return "";

    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(value));
  }

  function normalizeChatDateValue(value) {
    if (!value) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    // 채팅 created_at은 미래일 수 없습니다.
    // 서버/과거 데이터의 잘못된 미래 timestamp가 있더라도
    // 대한민국 현재 날짜를 넘어 표시되지 않게 안전 보정합니다.
    const now = new Date();
    if (parsed.getTime() > now.getTime() + 5 * 60 * 1000) {
      return now;
    }

    return parsed;
  }

  function getChatDateKey(value) {
    const date = normalizeChatDateValue(value);
    if (!date) return "";

    const parts = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const get = (type) => parts.find((part) => part.type === type)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  function formatChatDate(value) {
    const date = normalizeChatDateValue(value);
    if (!date) return "";

    const parts = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }).formatToParts(date);

    const get = (type) => parts.find((part) => part.type === type)?.value || "";
    return `${get("year")}년 ${get("month")} ${get("day")}일 (${get("weekday")})`;
  }

  function shouldShowChatDate(items, index) {
    if (!Array.isArray(items) || !items[index]) return false;
    if (index === 0) return true;

    return (
      getChatDateKey(items[index - 1]?.created_at) !==
      getChatDateKey(items[index]?.created_at)
    );
  }

  function ChatDateDivider({ value }) {
    const label = formatChatDate(value);

    // 날짜 경계 계산용 마커만 남기고 평소 화면에는 절대 표시하지 않습니다.
    // 날짜는 사용자가 실제로 스크롤할 때 FloatingScrollDate로만 보입니다.
    return (
      <div
        data-chat-date={label}
        aria-hidden="true"
        style={blueTheme({
          height: 0,
          minHeight: 0,
          margin: 0,
          padding: 0,
          border: 0,
          overflow: "hidden",
          opacity: 0,
          pointerEvents: "none",
        }, "surface", "shell")}
      />
    );
  }

  function getVisibleChatDate(container) {
    if (!container) return "";

    const dividers = Array.from(
      container.querySelectorAll("[data-chat-date]")
    );

    if (dividers.length === 0) return "";

    const markerY = container.scrollTop + 26;
    let current = dividers[0];

    for (const divider of dividers) {
      if (divider.offsetTop <= markerY) {
        current = divider;
      } else {
        break;
      }
    }

    return current?.dataset?.chatDate || "";
  }

  function showScrollDate(kind, container) {
    const label = getVisibleChatDate(container);
    if (!label) return;

    if (kind === "group") {
      setGroupScrollDate(label);
      if (groupScrollDateTimerRef.current) {
        clearTimeout(groupScrollDateTimerRef.current);
      }
      groupScrollDateTimerRef.current = setTimeout(() => {
        setGroupScrollDate("");
      }, 1350);
      return;
    }

    setPrivateScrollDate(label);
    if (privateScrollDateTimerRef.current) {
      clearTimeout(privateScrollDateTimerRef.current);
    }
    privateScrollDateTimerRef.current = setTimeout(() => {
      setPrivateScrollDate("");
    }, 850);
  }

  function FloatingScrollDate({ value }) {
    if (!value) return null;

    return (
      <div
        style={blueTheme({
          position: "sticky",
          top: "7px",
          zIndex: 30,
          width: "fit-content",
          margin: "0 auto -27px",
          padding: "5px 10px",
          borderRadius: "999px",
          background: "rgba(112,101,93,.94)",
          color: "#f8f3ef",
          fontSize: "9px",
          fontWeight: "700",
          lineHeight: 1.35,
          boxShadow: "0 2px 8px rgba(0,0,0,.18)",
          pointerEvents: "none",
        }, "surface", "shell")}
      >
        {value}
      </div>
    );
  }

  function isChatNearBottom(container, threshold = 72) {
    if (!container) return true;
    return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
  }

  function markUserChatScroll(kind) {
    const until = Date.now() + 450;
    if (kind === "group") {
      groupUserScrollUntilRef.current = until;
    } else {
      privateUserScrollUntilRef.current = until;
    }
  }

  function handleChatScroll(kind, container) {
    const atBottom = isChatNearBottom(container);

    if (kind === "group") {
      groupWasAtBottomRef.current = atBottom;
      setGroupShowLatestButton(!atBottom);

      // 실제 마우스 휠/손가락 스크롤 직후에 발생한 scroll 이벤트일 때만 날짜 표시.
      // 자동 스크롤, 새 메시지 렌더링, 최초 진입에서는 날짜를 띄우지 않음.
      if (Date.now() <= groupUserScrollUntilRef.current) {
        showScrollDate("group", container);
      }
      return;
    }

    privateWasAtBottomRef.current = atBottom;
    setPrivateShowLatestButton(!atBottom);

    if (Date.now() <= privateUserScrollUntilRef.current) {
      showScrollDate("private", container);
    }
  }

  function scrollChatToLatest(kind) {
    const container =
      kind === "group" ? groupMessagesRef.current : privateMessagesRef.current;
    if (!container) return;

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

    if (kind === "group") {
      groupWasAtBottomRef.current = true;
      setGroupShowLatestButton(false);
    } else {
      privateWasAtBottomRef.current = true;
      setPrivateShowLatestButton(false);
    }
  }

  function LatestMessageButton({ kind, visible }) {
    if (!visible) return null;
    return (
      <button
        type="button"
        aria-label="최신 메시지로 이동"
        onClick={() => scrollChatToLatest(kind)}
        style={blueTheme({
          position:"absolute",
          right:"14px",
          bottom: kind === "group" ? "142px" : "82px",
          zIndex:60,
          width:"42px",
          height:"42px",
          borderRadius:"50%",
          border:"1px solid rgba(108,85,69,.20)",
          background:"rgba(255,255,255,.97)",
          color:"#5f5148",
          boxShadow:"0 4px 14px rgba(0,0,0,.20)",
          fontSize:"24px",
          fontWeight:"400",
          lineHeight:1,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          cursor:"pointer",
          padding:0,
          backdropFilter:"blur(8px)"
        }, "button", "shell")}
      >↓</button>
    );
  }

  function renderMessageContent(content) {
    if (!content) return null;

    if (content.startsWith("[[GIFT_REWARD]]")) {
      try {
        const gift = JSON.parse(content.slice("[[GIFT_REWARD]]".length));
        const safeUrl = /^https:\/\//i.test(gift?.gift_url || "") ? gift.gift_url : "";
        return (
          <div style={blueTheme(styles.giftRewardMessage, "surface", "shell")}>
            <div style={blueTheme(styles.giftRewardTitle, "surface", "shell")}>🎁 이벤트 당첨 상품이 지급되었습니다!</div>
            <div style={blueTheme(styles.giftRewardProduct, "surface", "shell")}>
              <span>상품명</span>
              <strong>{gift?.product_name || "기프티콘"}</strong>
            </div>
            <div style={blueTheme(styles.giftRewardLinkLabel, "surface", "shell")}>기프티콘 링크</div>
            {safeUrl ? (
              <a
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={blueTheme(styles.giftRewardButton, "surface", "shell")}
              >
                🎁 기프티콘 확인하기
              </a>
            ) : (
              <div style={blueTheme(styles.giftRewardUnavailable, "surface", "shell")}>기프티콘 링크를 확인할 수 없습니다.</div>
            )}
            <p style={blueTheme(styles.giftRewardCongrats, "surface", "shell")}>이벤트 당첨을 진심으로 축하드립니다 ♥️</p>
            <small style={blueTheme(styles.giftRewardNotice, "surface", "shell")}>해당 기프티콘은 당첨 회원님께만 지급된 상품입니다.</small>
          </div>
        );
      } catch (error) {
        return <span>기프티콘 지급 메시지를 불러오지 못했습니다.</span>;
      }
    }

    if (content.startsWith("[[VIP_SURPRISE_LINK]]")) {
      try {
        const data = JSON.parse(content.slice("[[VIP_SURPRISE_LINK]]".length));
        return (
          <div style={blueTheme({minWidth:"210px",maxWidth:"100%",display:"flex",flexDirection:"column",gap:"10px"}, "surface", "shell")}>
            <div style={blueTheme({whiteSpace:"pre-wrap",lineHeight:1.65}, "surface", "shell")}>{String(data?.text || "")}</div>
            <button type="button" onClick={() => { setChatTab("ai"); window.sessionStorage.setItem("vip-active-tab","ai"); }}
              style={blueTheme({display:"block",width:"100%",padding:"11px 14px",borderRadius:"11px",border:"none",background:"linear-gradient(135deg,#c89543,#8e5f24)",color:"#fff",fontWeight:900,cursor:"pointer"}, "button", "shell")}>
              AI프로세스 바로가기 ›
            </button>
          </div>
        );
      } catch (_) {
        return <span>AI프로세스 안내를 표시하지 못했습니다.</span>;
      }
    }

    if (content.startsWith("[[LINK_BUTTON]]")) {
      try {
        const linkData = JSON.parse(content.slice("[[LINK_BUTTON]]".length));
        const safeUrl = /^https:\/\//i.test(linkData?.button_url || "") ? linkData.button_url : "";
        const buttonText = String(linkData?.button_text || "링크 열기").trim() || "링크 열기";
        const guideText = String(linkData?.text || "").trim();

        return (
          <div style={blueTheme({minWidth:"210px",maxWidth:"100%",display:"flex",flexDirection:"column",gap:"10px"}, "surface", "shell")}>
            {guideText && <div style={blueTheme({whiteSpace:"pre-wrap",lineHeight:1.55}, "surface", "shell")}>{guideText}</div>}
            {safeUrl ? (
              <a href={safeUrl} target="_blank" rel="noopener noreferrer"
                style={blueTheme({display:"block",width:"100%",boxSizing:"border-box",padding:"11px 14px",borderRadius:"11px",
                  background:"linear-gradient(135deg, #c89543, #8e5f24)",color:"#fff",fontWeight:900,
                  textAlign:"center",textDecoration:"none",boxShadow:"0 5px 14px rgba(126,82,28,.22)",overflowWrap:"anywhere"}, "accentSurface", "shell")}>
                🔗 {buttonText}
              </a>
            ) : <div style={blueTheme({fontSize:"12px",color:"#a33"}, "surface", "shell")}>연결 링크를 확인할 수 없습니다.</div>}
          </div>
        );
      } catch (error) {
        return <span>링크 버튼 메시지를 불러오지 못했습니다.</span>;
      }
    }

    if (content.startsWith("[[IMAGE]]")) {
      const url = content.slice(9);
      return (
        <button
          type="button"
          onClick={() => setChatImagePreview(url)}
          aria-label="사진 크게 보기"
          style={blueTheme({
            display:"block",
            margin:0,
            padding:0,
            border:0,
            background:"transparent",
            cursor:"zoom-in",
            maxWidth:"100%",
          }, "button", "shell")}
        >
          <img
            src={url}
            alt="전송 이미지"
            style={blueTheme({
              display: "block",
              width: "min(180px, 48vw)",
              maxHeight: "220px",
              objectFit: "cover",
              borderRadius: "12px",
            }, "buttonChild", "shell")}
          />
        </button>
      );
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);

    return parts.map((part, index) =>
      /^https?:\/\//.test(part) ? (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          style={blueTheme({
            color: "#9b692d",
            textDecoration: "underline",
            overflowWrap: "anywhere",
          }, "surface", "shell")}
        >
          {part}
        </a>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  }

  async function uploadChatImage(file, scope) {
    if (!file || !user || mediaUploading) return;

    if (!file.type.startsWith("image/")) {
      setNotice("사진 또는 GIF 이미지만 전송할 수 있습니다.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setNotice("이미지는 8MB 이하만 전송할 수 있습니다.");
      return;
    }

    setMediaUploading(true);
    setNotice("");

    try {
      const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-media")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("chat-media")
        .getPublicUrl(path);

      const content = `[[IMAGE]]${publicData.publicUrl}`;

      if (scope === "group") {
        const { error } = await supabase.from("group_messages").insert({
          room_id: ROOM_ID,
          member_id: user.id,
          message_type: "text",
          content,
          is_deleted: false,
        });
        if (error) throw error;
        await loadMessages();
      } else {
        if (!privateChatId) throw new Error("1:1 상담방을 찾을 수 없습니다.");
        const { error } = await supabase.from("private_messages").insert({
          chat_id: privateChatId,
          sender_id: user.id,
          message_type: "text",
          content,
          is_deleted: false,
          is_read: false,
        });
        if (error) throw error;
        await sendPrivatePush(privateChatId, content);
        await loadPrivateMessages(privateChatId);
        requestAnimationFrame(() => {
          const box = privateMessagesRef.current;
          if (box) box.scrollTop = box.scrollHeight + 10000;
        });
      }
    } catch (error) {
      setNotice(`사진 전송 실패: ${error.message}`);
    } finally {
      setMediaUploading(false);
    }
  }

  async function adminDeleteGroupMessage(messageId) {
    if (profile?.role !== "admin") return;
    if (!window.confirm("이 메시지를 모든 회원에게서 완전히 삭제할까요?")) return;

    const previousMessages = messages;
    setMessages((current) => current.filter((item) => item.id !== messageId));

    const { error } = await supabase.rpc("admin_delete_group_message", {
      target_message_id: messageId,
    });

    if (error) {
      setMessages(previousMessages);
      setNotice(`메시지 삭제 실패: ${error.message}`);
      return;
    }
  }

  async function adminDeletePrivateMessage(messageId) {
    if (profile?.role !== "admin") return;
    if (!window.confirm("이 1:1 메시지를 완전히 삭제할까요?")) return;

    const previousMessages = privateMessages;
    setPrivateMessages((current) => current.filter((item) => item.id !== messageId));

    const { error } = await supabase.rpc("admin_delete_private_message", {
      target_message_id: messageId,
    });

    if (error) {
      setPrivateMessages(previousMessages);
      setNotice(`메시지 삭제 실패: ${error.message}`);
      return;
    }
  }

  async function adminKickMember(memberId, memberNickname) {
    if (profile?.role !== "admin" || !memberId || memberId === user?.id) return;
    if (!window.confirm(`${memberNickname} 님을 그룹방에서 퇴장시키고 승인을 해제할까요?`)) return;

    const { error } = await supabase.rpc("admin_kick_member", {
      target_member_id: memberId,
    });

    if (error) {
      setNotice(`회원 퇴장 실패: ${error.message}`);
      return;
    }

    setNotice(`${memberNickname} 님을 퇴장 처리했습니다.`);
    await loadMemberNames();
    await loadMessages();
  }

  function groupReadStorageKey() {
    return `vip-group-last-read-${ROOM_ID}-${user?.id || "guest"}`;
  }

  function markGroupMessagesRead(at = new Date().toISOString()) {
    if (!user || typeof window === "undefined") return;
    window.localStorage.setItem(groupReadStorageKey(), at);
    setGroupUnreadCount(0);
  }

  async function loadGroupUnreadCount() {
    if (!GROUP_CHAT_ENABLED) return;
    if (!user || !profile || typeof window === "undefined") return;

    const key = groupReadStorageKey();
    let lastReadAt = window.localStorage.getItem(key);

    // 이 기능을 처음 적용한 기기에서는 과거 대화를 전부 미확인으로 잡지 않고
    // 현재 시점부터 새로 도착하는 메시지만 카운트합니다.
    if (!lastReadAt) {
      lastReadAt = new Date().toISOString();
      window.localStorage.setItem(key, lastReadAt);
      setGroupUnreadCount(0);
      return;
    }

    if (chatTabRef.current === "group") {
      markGroupMessagesRead();
      return;
    }

    let unreadQuery = supabase
      .from("group_messages")
      .select("id", { count: "exact", head: true })
      .eq("room_id", ROOM_ID)
      .eq("is_deleted", false)
      .gt("created_at", lastReadAt)
      .neq("member_id", user.id);

    if (profile?.role !== "admin" && profile?.group_joined_at) {
      unreadQuery = unreadQuery.gte("created_at", profile.group_joined_at);
    }

    const { count, error } = await unreadQuery;
    if (error) {
      console.error("그룹 미확인 메시지 수 불러오기 오류:", error);
      return;
    }

    setGroupUnreadCount(Math.min(100, Number(count || 0)));
  }

  async function loadMessages() {
    if (!GROUP_CHAT_ENABLED) return;
    // 중요:
    // ascending:true + limit(200)은 "가장 오래된 200개"만 가져오기 때문에
    // 새로 보낸 메시지가 새로고침 후 목록에서 사라지는 문제가 생깁니다.
    // DB에서 최신 200개를 먼저 가져온 뒤 화면 표시용으로 시간순을 다시 뒤집습니다.
    let groupMessageQuery = supabase
      .from("group_messages")
      .select("*")
      .eq("room_id", ROOM_ID)
      .eq("is_deleted", false);

    // 신규 승인 회원은 승인되어 실제 그룹방에 입장한 시점 이후의 대화만 봅니다.
    // 관리자와 기존 승인 회원(group_joined_at이 비어 있는 기존 회원)은 기존 대화를 그대로 봅니다.
    if (profile?.role !== "admin" && profile?.group_joined_at) {
      groupMessageQuery = groupMessageQuery.gte("created_at", profile.group_joined_at);
    }

    const { data, error } = await groupMessageQuery
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("그룹 메시지 불러오기 오류:", error);
      return;
    }

    const latestMessages = [...(data || [])].reverse();

    setMessages((current) => {
      const mineIds = new Set(
        current
          .filter((item) => item.__mine)
          .map((item) => String(item.id))
      );

      // 복귀 동기화 중에도 전송 대기 중인 로컬 메시지는 보존합니다.
      // 서버에 저장된 최신 메시지를 기준으로 중복 ID를 제거합니다.
      const serverIds = new Set(latestMessages.map((item) => String(item.id)));
      const pendingMessages = current.filter(
        (item) => item.__optimistic && !serverIds.has(String(item.id))
      );
      return [
        ...latestMessages.map((item) => ({
          ...item,
          __mine:
            mineIds.has(String(item.id)) ||
            String(item.member_id || "") === String(user?.id || "") ||
            String(item.member_id || "") === String(profile?.id || ""),
        })),
        ...pendingMessages,
      ].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    });
  }

  async function openPrivateChat() {
    setNotice("");

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("vip-active-tab", "private");
    }

    if (profile?.role === "admin") {
      setChatTab("private");
      await loadAdminChats();
      await loadAdminMembers();
      await loadAdminApprovalMembers();
      await loadAdminUnreadCounts();
      return;
    }

    const { data: chatId, error } = await supabase.rpc(
      "get_or_create_admin_chat"
    );

    if (error) {
      console.error("1:1 상담방 열기 오류:", error);
      setNotice("1:1 상담방을 불러오지 못했습니다.");
      return;
    }

    setPrivateChatId(chatId);
    setChatTab("private");

    await supabase.rpc("mark_private_chat_read", {
      target_chat_id: chatId,
    });

    await loadPrivateMessages(chatId);
    await loadMemberUnreadCount();
  }

  async function loadPrivateMessages(chatId) {
    if (!chatId) return;

    const { data, error } = await supabase
      .from("private_messages")
      .select("*")
      .eq("chat_id", chatId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error(
        "1:1 메시지 불러오기 오류:",
        error
      );
      return;
    }

    const latestPrivateMessages = [...(data || [])].reverse();
    setPrivateMessages(latestPrivateMessages);

    const otherSenderIds = Array.from(new Set(
      latestPrivateMessages
        .map((item) => item.sender_id)
        .filter((senderId) => senderId && senderId !== user?.id)
    ));

    for (const senderId of otherSenderIds) {
      await loadOneMemberName(senderId);
    }
  }

  async function loadAdminChats() {
    if (!user || profile?.role !== "admin") return;

    const { data, error } = await supabase.rpc(
      "get_admin_private_chats"
    );

    if (error) {
      console.error(
        "관리자 상담 목록 불러오기 오류:",
        error
      );
      setNotice("상담 목록을 불러오지 못했습니다.");
      return;
    }

    const result = (data || []).map((chat) => ({
      id: chat.chat_id,
      member_id: chat.member_id,
      status: chat.status,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
      member: {
        id: chat.member_id,
        nickname: chat.nickname,
        avatar: chat.avatar || "01",
      },
    }));

    setAdminChats(
      result.sort(
        (a, b) =>
          new Date(b.updated_at || 0).getTime() -
          new Date(a.updated_at || 0).getTime()
      )
    );
  }

  async function loadAdminMembers() {
    if (!user || profile?.role !== "admin") return;

    const { data, error } = await supabase.rpc(
      "get_admin_member_list"
    );

    if (error) {
      console.error(
        "관리자 회원 목록 불러오기 실패:",
        error
      );
      return;
    }

    setAdminMembers(data || []);
  }

  async function loadApprovedMemberManagerRows({ silent = false } = {}) {
    if (!user || profile?.role !== "admin" || approvedMemberManagerSavingRef.current) return;
    const requestVersion = ++approvedMemberManagerLoadVersionRef.current;

    // 승인대기(0) + 승인완료(1)를 한 화면에서 함께 표시합니다.
    const { data, error } = await supabase.rpc("get_admin_approval_list");

    if (error) {
      console.error("전체 회원 관리 목록 불러오기 실패:", error);
      if (!silent) setNotice("회원 목록을 불러오지 못했습니다. 최신 회원관리 SQL을 먼저 실행해주세요.");
      return;
    }

    const rows = [...(data || [])].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    const ids = rows.map((row) => row.member_id).filter(Boolean);
    if (ids.length) {
      // Admin RPC bypasses member-profile RLS and returns the authoritative account type.
      const { data: rewardRows, error: rewardError } = await supabase.rpc("admin_get_reward_account_types");
      if (rewardError) {
        console.error("관리자 지급 유형 조회 실패:", rewardError);
        if (!silent) setNotice("지급 유형 조회에 실패했습니다: " + rewardError.message);
        return;
      }
      const types = Object.fromEntries((rewardRows || []).map((row) => [String(row.member_id), row.reward_account_type]));
      rows.forEach((row) => { row.reward_account_type = types[String(row.member_id)] || row.reward_account_type || "real"; });
    }
    if (requestVersion !== approvedMemberManagerLoadVersionRef.current) return;
    setApprovedMemberManagerRows(rows);
  }

  async function openApprovedMemberManager() {
    if (profile?.role !== "admin") return;
    setApprovedMemberManagerSearch("");
    setShowApprovedMemberManager(true);
    await Promise.all([loadApprovedMemberManagerRows(), loadAdminPushStatuses()]);
  }

  async function adminRevokeApprovedMember(memberId, memberNickname = "회원") {
    if (
      !user ||
      profile?.role !== "admin" ||
      !memberId ||
      String(memberId) === String(user.id) ||
      approvedMemberManagerWorking
    ) return;

    if (!window.confirm(`${memberNickname}님의 승인을 해제하고 즉시 이용을 중지시킬까요?\n\n승인상태가 1 → 0으로 변경됩니다.`)) return;

    setApprovedMemberManagerWorking(true);
    try {
      const { error } = await supabase.rpc("admin_set_member_approval", {
        target_member_id: memberId,
        target_approval_status: "0",
      });
      if (error) throw error;

      setApprovedMemberManagerRows((current) =>
        current.filter((member) => String(member.member_id) !== String(memberId))
      );
      setNotice(`${memberNickname}님의 승인을 해제했습니다.`);

      await Promise.all([
        loadMemberNames(),
        loadAdminMembers(),
        loadAdminApprovalMembers({ silent: true }),
        loadAiAdminRows(),
      ]);
    } catch (error) {
      console.error("회원 승인 해제 실패:", error);
      setNotice(`승인 해제 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setApprovedMemberManagerWorking(false);
    }
  }

  async function loadAdminApprovalMembers({ silent = false } = {}) {
    if (!user || profile?.role !== "admin") return;

    const { data, error } = await supabase.rpc("get_admin_approval_list");

    if (error) {
      console.error("회원가입 승인 목록 불러오기 실패:", error);
      if (!silent) {
        setNotice("회원가입 승인 목록을 불러오지 못했습니다. 승인관리 SQL을 먼저 실행해주세요.");
      }
      return;
    }

    const rows = [...(data || [])].sort((a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    const pendingRows = rows.filter((member) => String(member.approval_status) === "0");
    const currentIds = new Set(pendingRows.map((member) => String(member.member_id)));

    if (adminApprovalInitializedRef.current) {
      const newMembers = pendingRows.filter(
        (member) => !adminApprovalKnownIdsRef.current.has(String(member.member_id))
      );
      if (newMembers.length > 0) {
        setAdminApprovalAlert({
          count: newMembers.length,
          nickname: newMembers[0].nickname || "새 회원",
        });
      }
    } else {
      adminApprovalInitializedRef.current = true;
    }

    adminApprovalKnownIdsRef.current = currentIds;
    setAdminApprovalMembers(rows);
  }

  useEffect(() => {
    if (!user || profile?.role !== "admin") return;

    loadAdminApprovalMembers({ silent: true });
    loadApprovedMemberManagerRows({ silent: true });

    const approvalChannel = supabase
      .channel(`admin-profile-approval-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        async () => {
          // 신규 가입/승인/승인해제를 새로고침 없이 즉시 반영
          await Promise.all([
            loadAdminApprovalMembers({ silent: true }),
            loadApprovedMemberManagerRows({ silent: true }),
            loadMemberNames(),
          ]);
        }
      )
      .subscribe();

    // Realtime 이벤트가 브라우저/네트워크 상태로 잠시 누락돼도
    // 관리자 화면에서 새로고침 없이 신규 가입을 거의 즉시 확인할 수 있도록
    // 3초 간격으로 승인목록을 가볍게 보조 동기화합니다.
    const fallbackTimer = setInterval(() => {
      void Promise.all([
        loadAdminApprovalMembers({ silent: true }),
        loadApprovedMemberManagerRows({ silent: true }),
      ]);
    }, 3000);

    return () => {
      clearInterval(fallbackTimer);
      supabase.removeChannel(approvalChannel);
    };
  }, [user?.id, profile?.role]);

  async function callAiWelcomeForApprovedMember(memberId, memberNickname = "회원") {
    if (!GROUP_CHAT_ENABLED) return;
    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "welcome",
          memberId,
          nickname: memberNickname,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        console.error("신규회원 AI 환영 호출 오류:", result?.error || result);
      }
    } catch (error) {
      console.error("신규회원 AI 환영 호출 실패:", error);
    }
  }

  async function approveAdminMember(memberId, memberNickname = "회원") {
    if (!user || profile?.role !== "admin" || !memberId || adminApprovalWorking) return;
    if (!window.confirm(`${memberNickname}님의 회원가입을 승인하시겠습니까?\n\n승인상태가 0 → 1로 변경됩니다.`)) return;

    setAdminApprovalWorking(true);
    try {
      const { error } = await supabase.rpc("admin_set_member_approval", {
        target_member_id: memberId,
        target_approval_status: "1",
      });

      if (error) throw error;

      setNotice(`${memberNickname}님 회원가입 승인이 완료되었습니다.`);
      await Promise.all([
        loadAdminApprovalMembers(),
        loadAdminMembers(),
        loadMemberNames(),
        loadAiAdminRows(),
      ]);

      // 승인 SQL이 먼저 "○○님께서 입장하셨습니다." 시스템 메시지를 만든 뒤
      // 유나/수아가 해당 닉네임을 직접 부르며 최초 1회 환영합니다.
      void callAiWelcomeForApprovedMember(memberId, memberNickname);
    } catch (error) {
      console.error("회원가입 승인 실패:", error);
      setNotice(`회원가입 승인 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setAdminApprovalWorking(false);
    }
  }

  async function approveAllPendingMembers() {
    if (!user || profile?.role !== "admin" || adminApprovalWorking) return;
    const pendingMembers = adminApprovalMembers.filter(
      (member) => String(member.approval_status) === "0"
    );
    const pendingCount = pendingMembers.length;
    if (pendingCount < 1) {
      setNotice("현재 승인 대기 회원이 없습니다.");
      return;
    }
    if (!window.confirm(`승인 대기 회원 ${pendingCount}명을 모두 승인하시겠습니까?\n\n모든 대상의 승인상태가 0 → 1로 변경됩니다.`)) return;

    setAdminApprovalWorking(true);
    try {
      const { data, error } = await supabase.rpc("admin_approve_all_pending_members");
      if (error) throw error;

      setNotice(`회원가입 전체 승인이 완료되었습니다. (${Number(data || pendingCount)}명)`);
      await Promise.all([
        loadAdminApprovalMembers(),
        loadAdminMembers(),
        loadMemberNames(),
        loadAiAdminRows(),
      ]);

      // 일괄 승인도 각 회원의 입장 시스템 메시지와 AI 환영을 회원별 1회 처리합니다.
      // route.js에서 중복 방지하므로 재호출되어도 같은 입장 건을 두 번 환영하지 않습니다.
      for (const member of pendingMembers) {
        void callAiWelcomeForApprovedMember(
          member.member_id,
          member.nickname || "회원"
        );
      }
    } catch (error) {
      console.error("회원가입 전체 승인 실패:", error);
      setNotice(`전체 승인 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setAdminApprovalWorking(false);
    }
  }

  async function openAdminEventEntries(eventItem) {
    const targetEventId = eventItem?.event_id || eventItem?.id;
    if (!user || profile?.role !== "admin" || !targetEventId) return;

    setAdminEventEntryTarget(eventItem);
    setAdminEventEntries([]);
    setAdminEventEntriesLoading(true);

    const { data, error } = await supabase.rpc(
      "get_admin_event_entries",
      { target_event_id: targetEventId }
    );

    if (error) {
      console.error("이벤트 참여자 불러오기 오류:", error);
      setNotice("이벤트 참여자 명단을 불러오지 못했습니다.");
      setAdminEventEntriesLoading(false);
      return;
    }

    setAdminEventEntries(data || []);
    setAdminEventEntriesLoading(false);
  }

  async function openAdminMemberChat(member) {
    if (!user || profile?.role !== "admin") return;

    setNotice("");

    const { data: chatId, error } = await supabase.rpc(
      "admin_get_or_create_private_chat",
      {
        target_member_id: member.member_id,
      }
    );

    if (error) {
      console.error(
        "회원 1:1 상담방 열기 오류:",
        error
      );
      setNotice("1:1 상담방을 열지 못했습니다.");
      return;
    }

    const chat = {
      id: chatId,
      member_id: member.member_id,
      member: {
        id: member.member_id,
        nickname: member.nickname,
        avatar: member.avatar || "01",
      },
    };

    setMemberSearch("");
    await loadAdminChats();
    await selectAdminChat(chat);
  }

  async function loadAdminUnreadCounts() {
    if (!user || profile?.role !== "admin") return;

    const { data, error } = await supabase.rpc(
      "get_admin_private_unread_counts"
    );

    if (error) {
      console.error(
        "안 읽은 메시지 수 불러오기 오류:",
        error
      );
      return;
    }

    const counts = {};

    (data || []).forEach((item) => {
      counts[item.chat_id] = Number(
        item.unread_count || 0
      );
    });

    setAdminUnreadCounts(counts);
  }

  async function loadMemberUnreadCount() {
    if (!user || profile?.role === "admin") return;

    const { data, error } = await supabase.rpc(
      "get_my_private_unread_count"
    );

    if (error) {
      console.error(
        "회원 안 읽은 메시지 수 불러오기 오류:",
        error
      );
      return;
    }

    setMemberUnreadCount(Number(data || 0));
  }

  async function selectAdminChat(chat) {
    setSelectedAdminChat(chat);
    setPrivateChatId(chat.id);
    setPrivateMessages([]);

    await supabase.rpc("mark_private_chat_read", {
      target_chat_id: chat.id,
    });

    await loadPrivateMessages(chat.id);
    await loadAdminUnreadCounts();
  }

  async function sendPrivateLinkButton() {
    if (profile?.role !== "admin" || !privateChatId || !user) return;

    const guideInput = window.prompt("버튼 위에 표시할 안내 문구를 입력해주세요.\n\n예: 카카오톡으로 상담 도와드리겠습니다 😊\n\n문구가 필요 없으면 비워두고 확인을 눌러주세요.", "");
    if (guideInput === null) return;

    const buttonInput = window.prompt("버튼에 표시할 문구를 입력해주세요.\n\n예: 카카오톡 1:1 상담하기", "카카오톡 1:1 상담하기");
    if (buttonInput === null) return;
    const buttonText = buttonInput.trim();
    if (!buttonText) { setNotice("버튼 문구를 입력해주세요."); return; }

    const urlInput = window.prompt("버튼을 눌렀을 때 이동할 링크를 입력해주세요.\n\n예: https://open.kakao.com/o/xxxxx", "https://");
    if (urlInput === null) return;
    const buttonUrl = urlInput.trim();
    if (!/^https:\/\//i.test(buttonUrl)) { setNotice("링크는 https:// 로 시작하는 주소를 입력해주세요."); return; }

    const payload = { text: guideInput.trim(), button_text: buttonText, button_url: buttonUrl };
    const content = `[[LINK_BUTTON]]${JSON.stringify(payload)}`;

    const { error } = await supabase.from("private_messages").insert({
      chat_id: privateChatId, sender_id: user.id, message_type: "text",
      content, is_deleted: false, is_read: false,
    });

    if (error) {
      console.error("링크 버튼 전송 오류:", error);
      setNotice("링크 버튼을 보내지 못했습니다.");
      return;
    }

    await sendPrivatePush(privateChatId, payload.text ? `${payload.text}\n${payload.button_text}` : payload.button_text);
    await loadPrivateMessages(privateChatId);

    const jumpAfterSend = () => {
      const box = privateMessagesRef.current;
      if (box) { box.style.scrollBehavior = "auto"; box.scrollTop = box.scrollHeight + 10000; }
    };
    requestAnimationFrame(jumpAfterSend);
    setTimeout(jumpAfterSend, 80);
    setTimeout(jumpAfterSend, 220);
  }

  async function sendPrivateMessage(e) {
    e?.preventDefault?.();

    const input = privateInputRef.current;
    const text = String(input?.value ?? "").trim();
    if (!text || !privateChatId || !user) return;

    const textToSend = text;
    if (input) input.value = "";
    setNotice("");

    const optimisticId = `local-private-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage = {
      id: optimisticId,
      chat_id: privateChatId,
      sender_id: user.id,
      message_type: "text",
      content: textToSend,
      is_deleted: false,
      is_read: false,
      created_at: new Date().toISOString(),
      __optimistic: true,
    };

    setPrivateMessages((current) => [...current, optimisticMessage]);

    requestAnimationFrame(() => {
      const box = privateMessagesRef.current;
      if (box && privateWasAtBottomRef.current) box.scrollTop = box.scrollHeight + 10000;
      input?.focus?.();
    });

    void (async () => {
      const { data: sentRows, error } = await supabase
        .from("private_messages")
        .insert({
          chat_id: privateChatId,
          sender_id: user.id,
          message_type: "text",
          content: textToSend,
          is_deleted: false,
          is_read: false,
        })
        .select("*")
        .limit(1);

      if (error) {
        console.error("1:1 메시지 전송 오류:", error);
        setPrivateMessages((current) =>
          current.filter((item) => item.id !== optimisticId)
        );
        if (input && !input.value) input.value = textToSend;
        setNotice("메시지를 보내지 못했습니다. 다시 전송해주세요.");
        return;
      }

      const sentMessage = Array.isArray(sentRows) ? sentRows[0] : sentRows;
      if (sentMessage?.id) {
        setPrivateMessages((current) => {
          const withoutOptimistic = current.filter(
            (item) => item.id !== optimisticId && item.id !== sentMessage.id
          );
          return [...withoutOptimistic, sentMessage].sort(
            (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
          );
        });
      }

      void sendPrivatePush(privateChatId, textToSend);
    })();
  }

  async function handleMemberEntry(e) {
    e.preventDefault(); setWorking(true); setNotice("");
    try {
      const response = await fetch("/api/auth/member-entry", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nickname,realName})});
      const result = await response.json();
      if (!response.ok || !result.session) { setNotice(result.error || "입장 정보를 확인해주세요."); return; }
      const { data, error } = await supabase.auth.setSession(result.session);
      if (error || !data.user) { setNotice("입장 중 오류가 발생했습니다."); return; }
      const {data: member,error: profileError} = await supabase.from("profiles").select("*").eq("id",data.user.id).single();
      if (profileError || member?.approval_status !== "1") {await supabase.auth.signOut();setNotice("등록 정보를 확인해주세요.");return;}
      window.sessionStorage.setItem("vip-active-tab","event");
      window.localStorage.removeItem("vip-ui-locked");
      setChatTab("event"); setUser(data.user); setProfile(member); setVipLocked(false);
    } catch {setNotice("입장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");}
    finally {setWorking(false);}
  }

  async function registerMember(e) {
    e.preventDefault(); setRegisterWorking(true); setRegisterNotice("");
    try {
      const {data:{session}} = await supabase.auth.getSession();
      const response = await fetch("/api/auth/signup",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session?.access_token || ""}`},body:JSON.stringify({nickname:registerNickname,realName:registerName})});
      const result=await response.json();
      if (!response.ok) {setRegisterNotice(result.error || "등록하지 못했습니다.");return;}
      setRegisterNickname("");setRegisterName("");setRegisterNotice("회원 등록 완료 · 닉네임과 이름으로 바로 입장할 수 있습니다.");
      loadAdminMembers();
    } catch {setRegisterNotice("회원 등록 중 오류가 발생했습니다.");}
    finally {setRegisterWorking(false);}
  }

  async function handleSignup(e) {
    e.preventDefault();

    const cleanNickname = nickname.trim();
    const cleanRealName = realName.trim();

    if (!cleanNickname || !cleanRealName || !password) {
      setNotice("닉네임, 성함, 비밀번호를 모두 입력해주세요.");
      return;
    }

    if (password.length < 4) {
      setNotice("비밀번호는 4자리 이상 입력해주세요.");
      return;
    }

    setWorking(true);
    setNotice("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: cleanNickname,
          realName: cleanRealName,
          password,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        if (result?.reason === "nickname_taken") {
          setNotice(`${cleanNickname} 닉네임은 이미 사용 중입니다. 다른 닉네임으로 등록해주세요.`);
        } else {
          setNotice(result?.error || "가입 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
        return;
      }

      setNickname("");
      setRealName("");
      setPassword("");
      setMode("login");
      setNotice("VIP 가입 신청이 완료되었습니다. 운영자 승인 후 로그인하시면 VIP 라운지 및 카카오톡 1:1 고객센터를 이용하실 수 있습니다.");
    } catch (error) {
      console.error("회원가입 오류:", error);
      setNotice("가입 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setWorking(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();

    // 로그인 화면의 첫 번째 입력값은 닉네임이 아니라 "성함"입니다.
    const cleanLoginRealName = nickname.trim();

    if (!cleanLoginRealName || !password) {
      setNotice(
        "성함과 비밀번호를 입력해주세요."
      );
      return;
    }

    setWorking(true);
    setNotice("");

    try {
      // 현재 profiles.real_name을 기준으로 실제 Auth 로그인 이메일을 조회합니다.
      // 관리자가 성함을 변경하면 예전 가입 성함이 아니라 변경된 성함으로 로그인됩니다.
      // 가입 직후 profiles/Auth 반영이 아주 잠깐 늦어지는 경우가 있어
      // 새로고침 없이 로그인되도록 계정 조회만 짧게 자동 재시도합니다.
      let lookupResult = {};
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const lookupResponse = await fetch("/api/auth/login-lookup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          cache: "no-store",
          body: JSON.stringify({ realName: cleanLoginRealName }),
        });
        lookupResult = await lookupResponse.json().catch(() => ({}));

        if (
          lookupResponse.ok &&
          (
            lookupResult?.email ||
            (Array.isArray(lookupResult?.emails) && lookupResult.emails.length > 0)
          )
        ) {
          break;
        }

        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const fallbackEmail = await nicknameToEmail(cleanLoginRealName);
      const loginEmails = Array.from(new Set([
        ...(Array.isArray(lookupResult?.emails) ? lookupResult.emails : []),
        lookupResult?.email,
        fallbackEmail,
      ].filter(Boolean)));

      const normalizedPassword = normalizePasswordInput(password);
      const passwordCandidates = Array.from(new Set([
        `VIP!${normalizedPassword}`,
        password,
        normalizedPassword,
        normalizedPassword.toUpperCase(),
      ].filter(Boolean)));

      let loginData = null;
      let loginError = null;

      for (const email of loginEmails) {
        for (const candidate of passwordCandidates) {
          const result = await supabase.auth.signInWithPassword({
            email,
            password: candidate,
          });

          if (!result.error && result.data?.user) {
            loginData = result.data;
            loginError = null;
            break;
          }
          loginError = result.error;
        }
        if (loginData?.user) break;
      }

      const data = loginData;
      const error = loginError;

      if (error || !data?.user) {
        setNotice(
          "성함 또는 비밀번호를 확인해주세요."
        );
        return;
      }

      const {
        data: memberProfile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError || !memberProfile) {
        await supabase.auth.signOut();
        setNotice(
          "회원 정보를 확인할 수 없습니다."
        );
        return;
      }

      if (
        memberProfile.approval_status !== "1"
      ) {
        await supabase.auth.signOut();

        setNotice(
          "가입 신청이 접수되었습니다. 현재 관리자 승인 대기 중입니다."
        );
        return;
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("vip-active-tab", "event");
      }
      setChatTab("event");
      setUser(data.user);
      setProfile(memberProfile);
      setInstallGuideEligibleThisLogin(memberProfile.role !== "admin" && memberProfile.welcome_popup_seen === true);
      setVipLocked(false);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("vip-ui-locked");
        window.localStorage.setItem("vip-last-nickname", memberProfile.nickname || cleanNickname);
        window.localStorage.setItem("vip-last-avatar", memberProfile.avatar || "01");

        if (memberProfile.role !== "admin" && memberProfile.welcome_popup_seen !== true) {
          setShowSponsorWelcome(true);
        }
      }
      setPassword("");
    } catch {
      setNotice("로그인 중 오류가 발생했습니다.");
    } finally {
      setWorking(false);
    }
  }

  async function closeSponsorWelcome() {
    setShowSponsorWelcome(false);
    if (!user?.id) return;

    // DB에 저장하므로 다른 브라우저/기기에서도 최초 로그인 1회만 표시됩니다.
    const { error } = await supabase.rpc("mark_my_welcome_popup_seen");
    if (error) {
      console.error("VIP 최초 팝업 확인 저장 실패:", error);
      return;
    }
    setProfile((current) => current ? { ...current, welcome_popup_seen: true } : current);
  }


  async function sendMessage(e) {
    e?.preventDefault?.();
    if (!GROUP_CHAT_ENABLED) return;

    const input = groupInputRef.current;
    const cleanMessage = String(input?.value ?? "").trim();

    if (!cleanMessage || !user || !profile) return;

    if (profile.role !== "admin" && (chatFrozen || !groupChatOperating)) {
      if (input) input.value = "";
      return;
    }

    // 같은 클릭의 중복 submit만 막고, 네트워크 응답을 기다리는 동안
    // 다음 글 작성/전송 자체를 막지는 않습니다.
    if (groupSendingRef.current) {
      // 앞 메시지가 아직 저장 중이어도 다음 메시지는 별도 비동기 저장 가능.
    }

    // 전송 순간 DOM 문자열을 먼저 완전히 복사한 뒤 입력창을 비웁니다.
    // 빠른 타이핑/미뮤 IME에서도 문장 뒷부분이 잘리는 것을 방지합니다.
    const textToSend = cleanMessage;
    if (input) input.value = "";
    setNotice("");

    const optimisticId = `local-group-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage = {
      id: optimisticId,
      room_id: ROOM_ID,
      member_id: user.id,
      message_type: "text",
      content: textToSend,
      is_deleted: false,
      created_at: new Date().toISOString(),
      __mine: true,
      __optimistic: true,
    };

    setMessages((current) => [...current, optimisticMessage]);

    requestAnimationFrame(() => {
      const box = groupMessagesRef.current;
      if (box && groupWasAtBottomRef.current) box.scrollTop = box.scrollHeight + 10000;
      input?.focus?.();
    });

    // 저장은 독립 Promise로 처리하여 다음 메시지 입력/전송 버튼을 잠그지 않습니다.
    void (async () => {
      const { data: sentRows, error } = await supabase.rpc(
        "send_group_message",
        {
          target_room_id: ROOM_ID,
          message_content: textToSend,
        }
      );

      if (error) {
        setMessages((current) =>
          current.filter((item) => item.id !== optimisticId)
        );
        // 사용자가 이미 다음 글을 쓰고 있으면 덮어쓰지 않습니다.
        if (input && !input.value) input.value = textToSend;
        setNotice(`메시지 전송 실패: ${error.message}`);
        return;
      }

      const sentMessage = Array.isArray(sentRows) ? sentRows[0] : sentRows;
      if (sentMessage?.id) {
        const mySentMessage = { ...sentMessage, __mine: true };
        setMessages((current) => {
          const withoutOptimistic = current.filter(
            (item) => item.id !== optimisticId && item.id !== mySentMessage.id
          );
          return [...withoutOptimistic, mySentMessage].sort(
            (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
          );
        });
      } else {
        window.setTimeout(() => {
          setMessages((current) =>
            current.filter((item) => item.id !== optimisticId)
          );
        }, 5000);
      }

      // 회원이 방금 보낸 "정확한 메시지"와 회원 ID를 AI에게 즉시 전달합니다.
      // 이전처럼 빈 POST를 보내면 AI 서버가 DB의 최신 메시지를 다시 추측해야 해서,
      // 여러 회원이 빠르게 대화할 때 다른 메시지를 집거나 AI 메시지를 집을 수 있습니다.
      // 이제 저장 완료된 바로 그 회원 메시지를 기준으로 AI가 답합니다.
      void fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          mode: "member",
          message: textToSend,
          memberId: user.id,
          messageId: sentMessage?.id || null,
          nickname: profile?.nickname || "",
        }),
      }).then(async (response) => {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          console.error("AI 회원대화 호출 오류:", result?.error || response.status);
        }
      }).catch((aiError) => {
        console.error("AI 회원대화 호출 실패:", aiError);
      });
    })();
  }

  async function handleLogout() {
    // "로그아웃"은 VIP 화면만 잠그고 Supabase 인증 세션은 안전하게 유지합니다.
    // 비밀번호를 localStorage에 저장하지 않으면서 빠른 재접속과 푸시 딥링크를 지원합니다.
    if (typeof window !== "undefined") {
      window.localStorage.setItem("vip-ui-locked", "1");
      window.localStorage.setItem("vip-last-nickname", profile?.nickname || "");
      window.localStorage.setItem("vip-last-avatar", profile?.avatar || "01");
      window.sessionStorage.setItem("vip-active-tab", "private");
    }
    setShowProfileInfo(false);
    setPrivateAlert(null);
    setVipLocked(true);
  }

  function resumeVipSession() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("vip-ui-locked");
      window.sessionStorage.setItem("vip-active-tab", "event");
      window.history.replaceState({}, "", "/?tab=event");
    }
    setChatTab("event");
    setVipLocked(false);
    setNotice("");
  }

  async function switchVipAccount() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("vip-ui-locked");
      window.sessionStorage.removeItem("vip-active-tab");
      window.history.replaceState({}, "", "/");
    }
    setVipLocked(false);
    setUser(null);
    setProfile(null);
    setInstallGuideEligibleThisLogin(false);
    setMemberPresence({});
    setAdminPushStatus({});
    setMessages([]);
    setPrivateMessages([]);
    setMemberNames({});
    setMessage("");
    setNickname("");
    setPassword("");
    setNotice("");
    setMode("login");
  }

  function getMessageNickname(item) {
    const isMyMessage =
      Boolean(item?.__mine) ||
      String(item?.member_id || "") === String(user?.id || "") ||
      String(item?.member_id || "") === String(profile?.id || "");

    if (isMyMessage) {
      return profile?.nickname || "나";
    }

    return memberNames[item.member_id] || "…";
  }


  function getActiveAutoEvent() {
    return (autoEvents || []).find((item) => isEventLiveNow(item)) || null;
  }

  function getNextAutoEvent() {
    return (autoEvents || []).find((item) => item.status === "scheduled" && new Date(item.starts_at).getTime() > Date.now()) || null;
  }

  function getNextEventCountdownLabel() {
    const active = getActiveAutoEvent() || (autoEvents || []).find((item) => isEventLiveNow(item));
    if (active) return { live: true, text: "이벤트 참여하기", event: active };

    const next = getNextAutoEvent();
    if (!next?.starts_at) return { live: false, text: "오늘 이벤트 종료", event: null };

    const remainMs = Math.max(0, new Date(next.starts_at).getTime() - Date.now());
    const totalMinutes = Math.max(1, Math.ceil(remainMs / 60000));
    if (totalMinutes < 60) return { live: false, text: `다음 이벤트 ${totalMinutes}분 후`, event: next };

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { live: false, text: `다음 이벤트 ${hours}시간${minutes ? ` ${minutes}분` : ""} 후`, event: next };
  }

  function getTodayEventStats() {
    const events = autoEvents || [];
    const participated = events.filter((item) => Boolean(item.participated)).length;
    const nickname = String(profile?.nickname || "").trim();
    const wins = nickname
      ? events.filter((item) => String(item.winner_nickname || "").trim() === nickname).length
      : 0;
    return { total: events.length, participated, wins };
  }

  function getAiRecentResults() {
    return (aiSim?.activity || []).filter((item) =>
      item.type === "result" || item.type === "hold" || item.type === "wait"
    );
  }

  function getAiMarketCounts() {
    const holdings = aiSim?.holdings || [];
    return {
      total: holdings.length,
      stock: holdings.filter((item) => item.type !== "crypto").length,
      crypto: holdings.filter((item) => item.type === "crypto").length,
    };
  }


  function eventHeroBackground(type) {
    const map = {
      gift_box: "radial-gradient(circle at 82% 22%,rgba(255,205,91,.42),transparent 22%),radial-gradient(circle at 18% 78%,rgba(185,40,45,.30),transparent 30%),linear-gradient(135deg,#5b2728,#2b2020 62%,#7a4d25)",
      number: "radial-gradient(circle at 80% 22%,rgba(77,160,255,.32),transparent 24%),radial-gradient(circle at 18% 78%,rgba(242,83,77,.30),transparent 28%),linear-gradient(135deg,#392d3b,#241f28 62%,#49322f)",
      roulette: "radial-gradient(circle at 82% 20%,rgba(255,93,87,.32),transparent 24%),radial-gradient(circle at 18% 78%,rgba(255,202,92,.28),transparent 28%),linear-gradient(135deg,#4b2927,#241f20 62%,#6a4327)",
      first_come: "radial-gradient(circle at 82% 22%,rgba(255,218,89,.34),transparent 24%),radial-gradient(circle at 18% 78%,rgba(255,130,57,.25),transparent 30%),linear-gradient(135deg,#4c3225,#231f1c 62%,#72502d)",
      quiz: "radial-gradient(circle at 82% 22%,rgba(104,213,143,.30),transparent 24%),radial-gradient(circle at 18% 78%,rgba(238,194,79,.26),transparent 30%),linear-gradient(135deg,#263a31,#202420 62%,#5a4828)",
      draw: "radial-gradient(circle at 82% 22%,rgba(238,105,162,.30),transparent 24%),radial-gradient(circle at 18% 78%,rgba(255,207,97,.26),transparent 30%),linear-gradient(135deg,#432a37,#241f24 62%,#60412d)",
      attendance: "radial-gradient(circle at 82% 22%,rgba(90,178,255,.30),transparent 24%),radial-gradient(circle at 18% 78%,rgba(255,207,97,.24),transparent 30%),linear-gradient(135deg,#273747,#202329 62%,#59432e)",
    };
    return map[type] || "radial-gradient(circle at 82% 22%,rgba(239,190,111,.30),transparent 24%),linear-gradient(135deg,#49332b,#241f1d 65%,#674729)";
  }

  if (loading) {
    return (
      <main style={blueTheme(styles.page, "surface", "shell")}>VIP 혜택을 준비하고 있습니다…</main>
    );
  }

  if (user && profile && vipLocked) {
    const avatarKey = profile.avatar || "01";
    return (
      <main style={blueTheme(styles.vipReturnPage, "surface", "shell")}>
        <section style={blueTheme(styles.vipReturnCard, "surface", "shell")}>
          <div style={blueTheme(styles.vipReturnGlowA, "surface", "shell")}></div>
          <div style={blueTheme(styles.vipReturnGlowB, "surface", "shell")}></div>
          <div style={blueTheme(styles.vipReturnCrown, "surface", "shell")}>♛</div>
          <div style={blueTheme(styles.vipReturnEyebrow, "surface", "shell")}>AI PROCESS · VIP PRIVATE</div>

          <div style={blueTheme(styles.vipReturnAvatarWrap, "surface", "shell")}>
            <div style={blueTheme(styles.vipReturnAvatarHalo, "surface", "shell")}></div>
            <img
              src={avatarSrc(avatarKey)}
              alt=""
              style={blueTheme(styles.vipReturnAvatar, "surface", "shell")}
            />
            <span style={blueTheme(styles.vipReturnSeal, "surface", "shell")}>VIP</span>
          </div>

          <h2 style={blueTheme(styles.vipReturnTitle, "surface", "shell")}>
            <span>{profile.nickname}</span>님,
            <br />다시 오셨네요
          </h2>
          <p style={blueTheme(styles.vipReturnText, "surface", "shell")}>
            회원님의 프라이빗 VIP 공간이 준비되어 있습니다.
            <br />간편하게 다시 접속하세요.
          </p>

          <button type="button" onClick={resumeVipSession} style={blueTheme(styles.vipReturnPrimary, "button", "shell")}>
            VIP 다시 접속 <span>›</span>
          </button>
          <button type="button" onClick={switchVipAccount} style={blueTheme(styles.vipReturnSecondary, "button", "shell")}>
            다른 계정으로 로그인
          </button>

          <div style={blueTheme(styles.vipReturnFoot, "surface", "shell")}>
            <span>◆</span> PRIVATE ACCESS <span>◆</span>
          </div>
        </section>
      </main>
    );
  }

  if (user && profile) {
    const activeEvent = getActiveAutoEvent();
    const nextEvent = getNextAutoEvent();
    const featuredEvent = activeEvent || nextEvent;
    const nextEventStatus = getNextEventCountdownLabel();
    const todayEventStats = getTodayEventStats();
    const attendanceCycle = getAttendanceCycleCount();
    const attendanceRemaining = Math.max(0, 10 - attendanceCycle);
    const unreadPrivate = profile?.role === "admin"
      ? Object.values(adminUnreadCounts).reduce((sum, count) => sum + Number(count || 0), 0)
      : Number(memberUnreadCount || 0);

    const navItems = [
      { id: "event", icon: "◈", label: "이벤트" },
      { id: "ai", icon: "bars", label: "AI프로세스" },
      { id: "private", icon: "▣", label: "상품 지급" },
    ];

    const changeTab = async (id) => {
      if (id === "group" && !GROUP_CHAT_ENABLED) return;
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("vip-active-tab", id);
      }

      if (id === "private") {
        await openPrivateChat();
        return;
      }

      if (id === "group") {
        markGroupMessagesRead();
      }

      setChatTab(id);
    };

    return (
      <main style={blueTheme({...styles.refPage,...(mobileViewportHeight ? {height:mobileViewportHeight+"px",minHeight:0} : {})}, "surface", "shell")}>
        <section style={blueTheme({...styles.refApp,...(mobileViewportHeight ? {height:mobileViewportHeight+"px",maxHeight:mobileViewportHeight+"px"} : {})}, "surface", "shell")}>
          {showSponsorWelcome && profile?.role !== "admin" && (
            <div style={blueTheme(styles.sponsorWelcomeBackdrop, "surface", "shell")}>
              <div style={blueTheme(styles.sponsorWelcomeCard, "surface", "shell")}>
                <div style={blueTheme(styles.sponsorWelcomeGlow, "surface", "shell")}></div>
                <button type="button" onClick={closeSponsorWelcome} style={blueTheme(styles.sponsorWelcomeClose, "button", "shell")}>×</button>

                <div style={blueTheme(styles.sponsorWelcomeSeal, "surface", "shell")}>VIP</div>
                <div style={blueTheme(styles.sponsorWelcomeEyebrow, "surface", "shell")}>AI PROCESS · VIP MEMBERSHIP</div>
                <h2 style={blueTheme(styles.sponsorWelcomeTitle, "surface", "shell")}>
                  {profile?.real_name || profile?.nickname || "VIP 회원"}님, 환영합니다!
                </h2>
                <div style={blueTheme({textAlign:"center",wordBreak:"keep-all",display:"flex",flexDirection:"column",alignItems:"center",gap:"7px",margin:"12px 0 18px"}, "surface", "shell")}>
                  <p style={blueTheme({margin:0,fontSize:"13px",lineHeight:1.65,color:"#6e5b46"}, "surface", "shell")}>
                    저희 기업의 발전과 협업에 함께해 주신 분들을 위한
                  </p>
                  <strong style={blueTheme({fontSize:"19px",fontWeight:900,color:"#a47733",lineHeight:1.5}, "surface", "shell")}>프라이빗 VIP 라운지</strong>
                  <p style={blueTheme({margin:0,fontSize:"13px",lineHeight:1.6,color:"#7e6f5d"}, "surface", "shell")}>특별한 이벤트와 혜택을 만나보세요.</p>
                </div>

                <div style={blueTheme(styles.sponsorWelcomeNotice, "surface", "shell")}>
                  <span>🔔</span>
                  <div>
                    <strong>알림 설정을 꼭 허용해주세요!</strong>
                    <small>이벤트 당첨 및 협찬 배송안내 알림을 놓치지 않도록 홈페이지 상단의 알림을 꼭 켜주세요!</small>
                  </div>
                </div>

                <p style={blueTheme(styles.sponsorWelcomeBenefit, "surface", "shell")}>
                  <b>이벤트 · AI프로세스 · 카카오톡 1:1 고객센터</b><br/>
                  모든 VIP 전용 서비스를 편하게 이용해보세요.
                </p>

                <button type="button" onClick={() => {
                  if (typeof window !== "undefined") {
                    window.sessionStorage.setItem("vip-active-tab", "private");
                  }
                  void closeSponsorWelcome();
                  setChatTab("private");
                  openPrivateChat();
                }} style={blueTheme(styles.sponsorWelcomePrimary, "button", "shell")}>
                  확인했어요 <span>›</span>
                </button>
              </div>
            </div>
          )}

          {adminEventEntryTarget && profile?.role === "admin" && (
            <div style={blueTheme(styles.adminEventEntriesBackdrop, "surface", "shell")} onClick={() => setAdminEventEntryTarget(null)}>
              <div style={blueTheme(styles.adminEventEntriesModal, "surface", "shell")} onClick={(e) => e.stopPropagation()}>
                <div style={blueTheme(styles.adminEventEntriesHead, "surface", "shell")}>
                  <div>
                    <small>EVENT PARTICIPANTS</small>
                    <strong>{adminEventEntryTarget.title || "이벤트"} 참여자</strong>
                    <span>총 {adminEventEntries.length}명 · 최근 참여자 순</span>
                  </div>
                  <button type="button" onClick={() => setAdminEventEntryTarget(null)}>×</button>
                </div>

                <div style={blueTheme(styles.adminEventEntriesList, "surface", "shell")}>
                  {adminEventEntriesLoading ? (
                    <div style={blueTheme(styles.adminEventEntriesEmpty, "surface", "shell")}>참여자 명단을 불러오는 중입니다.</div>
                  ) : adminEventEntries.length === 0 ? (
                    <div style={blueTheme(styles.adminEventEntriesEmpty, "surface", "shell")}>아직 참여한 회원이 없습니다.</div>
                  ) : adminEventEntries.map((entry, index) => (
                    <div key={`${entry.member_id}-${entry.submitted_at || index}`} style={blueTheme(styles.adminEventEntryRow, "surface", "shell")}>
                      <div style={blueTheme(styles.adminEventEntryNo, "surface", "shell")}>{index + 1}</div>
                      <div style={blueTheme(styles.adminEventEntryMember, "surface", "shell")}>
                        <strong>{entry.nickname || "VIP 회원"}</strong>
                        <span>{entry.real_name || "성함 미등록"}</span>
                      </div>
                      <div style={blueTheme(styles.adminEventEntryMeta, "surface", "shell")}>
                        <b>{entry.answer ? `응답 ${entry.answer}` : "참여 완료"}</b>
                        <span>{entry.submitted_at ? new Date(entry.submitted_at).toLocaleString("ko-KR") : ""}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminApprovalAlert && profile?.role === "admin" && typeof document !== "undefined" && createPortal(
            <button
              type="button"
              onClick={() => {
                setAdminApprovalAlert(null);
                void openApprovedMemberManager();
              }}
              style={blueTheme({
                position:"fixed",top:"10px",left:"50%",transform:"translateX(-50%)",
                zIndex:2147483647,width:"min(94vw,520px)",border:"1px solid rgba(212,168,89,.78)",
                borderRadius:"17px",background:"linear-gradient(135deg,#1b2a38 0%,#0f1d29 100%)",
                boxShadow:"0 14px 38px rgba(0,0,0,.28)",color:"#fff",padding:"12px 14px",
                display:"flex",alignItems:"center",gap:"11px",textAlign:"left",cursor:"pointer"
              }, "button", "shell")}
            >
              <span style={blueTheme({
                position:"relative",width:"38px",height:"38px",borderRadius:"50%",
                display:"grid",placeItems:"center",flex:"0 0 auto",
                background:"linear-gradient(145deg,#f3d391,#b67a25)",color:"#172431",
                fontSize:"18px",fontWeight:"1000"
              }, "buttonChild", "shell")}>
                ♛
                <span style={blueTheme({
                  position:"absolute",right:"-6px",top:"-7px",minWidth:"20px",height:"20px",
                  padding:"0 5px",borderRadius:"999px",display:"grid",placeItems:"center",
                  background:"#e32626",color:"#fff",border:"2px solid #fff",
                  fontSize:"9px",fontWeight:"1000",lineHeight:1
                }, "buttonChild", "shell")}>{adminApprovalAlert.count}</span>
              </span>
              <span style={blueTheme({minWidth:0,flex:1}, "buttonChild", "shell")}>
                <small style={blueTheme({display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.5px",color:"#e9c77d"}, "buttonChild", "shell")}>NEW MEMBER</small>
                <b style={blueTheme({display:"block",marginTop:"2px",fontSize:"12px"}, "buttonChild", "shell")}>신규 회원가입이 들어왔습니다</b>
                <small style={blueTheme({display:"block",marginTop:"3px",fontSize:"9px",color:"#c9d1d8"}, "buttonChild", "shell")}>
                  {adminApprovalAlert.count > 1
                    ? `${adminApprovalAlert.nickname}님 외 ${adminApprovalAlert.count - 1}명 · 승인 대기`
                    : `${adminApprovalAlert.nickname}님 · 승인 대기`}
                </small>
              </span>
              <span style={blueTheme({fontSize:"8px",fontWeight:"1000",color:"#e9c77d"}, "buttonChild", "shell")}>승인 관리 ›</span>
            </button>,
            document.body
          )}

          {privateAlert && typeof document !== "undefined" && createPortal(
            <button
              type="button"
              onClick={() => {
                setPrivateAlert(null);
                setChatTab("private");
                window.sessionStorage.setItem("vip-active-tab", "private");
                openPrivateChat();
              }}
              style={blueTheme(styles.refPrivateAlert, "button", "shell")}
            >
              <img src="/avatars/01.png" alt="" style={blueTheme(styles.refPrivateAlertAvatar, "buttonChild", "shell")} />
              <span style={blueTheme(styles.refPrivateAlertCopy, "buttonChild", "shell")}>
                <b style={blueTheme(styles.refPrivateAlertTitle, "buttonChild", "shell")}>{privateAlert.title}</b>
                <small style={blueTheme(styles.refPrivateAlertBody, "buttonChild", "shell")}>{privateAlert.body}</small>
              </span>
              <span style={blueTheme(styles.refPrivateAlertNow, "buttonChild", "shell")}>지금</span>
            </button>,
            document.body
          )}
          <header style={blueTheme(styles.refHeader, "accentSurface", "shell")}>
            <div style={blueTheme(styles.refBrand, "surface", "shell")}>
              <div style={blueTheme({
                display:"flex",
                flexDirection:"column",
                justifyContent:"center",
                lineHeight:1,
                whiteSpace:"nowrap"
              }, "surface", "shell")}>
                <span style={blueTheme({
                  fontSize:"12px",
                  fontWeight:"1000",
                  letterSpacing:"1.6px",
                  color:"#f0cf86"
                }, "surface", "shell")}>VIP LOUNGE</span>
                <span style={blueTheme({
                  marginTop:"4px",
                  fontSize:"6px",
                  fontWeight:"800",
                  letterSpacing:"1.2px",
                  color:"rgba(255,255,255,.45)"
                }, "surface", "shell")}>PRIVATE MEMBER</span>
              </div>
            </div>
            <div style={blueTheme(styles.refHeaderRight, "surface", "shell")}>
              {!isStandaloneApp && (
                <button
                  type="button"
                  onClick={() => setShowInstallGuide((prev) => !prev)}
                  style={blueTheme({
                    height:"42px",minWidth:"58px",padding:"0 9px",borderRadius:"12px",
                    border:"1px solid #e6c98f",background:"#fffaf0",color:"#6f4d24",
                    display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                    lineHeight:1.05,cursor:"pointer",fontWeight:"1000",whiteSpace:"nowrap"
                  }, "button", "shell")}
                  aria-label="간편 앱 설치방법"
                >
                  <span style={blueTheme({fontSize:"9px"}, "buttonChild", "shell")}>간편 앱</span>
                  <span style={blueTheme({marginTop:"3px",fontSize:"8px",color:"#9a6b2b"}, "buttonChild", "shell")}>설치방법</span>
                </button>
              )}
              <button
                type="button"
                onClick={enablePrivateNotifications}
                style={blueTheme({
                  height: "42px",
                  minWidth: "72px",
                  padding: "0 12px",
                  borderRadius: "12px",
                  border: pushEnabled ? "1px solid #72dca7" : "1px solid #e6c98f",
                  background: pushEnabled ? "#174d38" : "#fff3d7",
                  color: pushEnabled ? "#d9ffeb" : "#3b291f",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  fontSize: "11px",
                  fontWeight: "900",
                  cursor: "pointer",
                  position: "relative",
                  zIndex: 2147483647,
                  pointerEvents: "auto"
                }, "button", "shell")}
                aria-label="1:1 알림 켜기"
              >
                <span style={blueTheme({fontSize:"17px",pointerEvents:"none"}, "buttonChild", "shell")}>🔔</span>
                <span style={blueTheme({pointerEvents:"none"}, "buttonChild", "shell")}>{pushEnabled ? "알림 ON" : "알림 켜기"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowProfileInfo(true)}
                style={blueTheme(styles.refMyInfoButton, "button", "shell")}
                aria-label="내 정보 보기"
              >
                <img
                  src={avatarSrc(profile.avatar)}
                  alt=""
                  style={blueTheme(styles.refMyInfoAvatar, "buttonChild", "shell")}
                />
                <span>내 정보</span>
              </button>
              <button type="button" onClick={handleLogout} style={blueTheme(styles.refLogoutButton, "button", "shell")} title="로그아웃">
                <span>↪</span><small>로그아웃</small>
              </button>
            </div>
          </header>

          <nav style={blueTheme(styles.refNav, "accentSurface", "shell")}>
            {navItems.map((nav) => {
              const active = chatTab === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => changeTab(nav.id)}
                  style={blueTheme({...styles.refNavButton, ...(active ? styles.refNavButtonActive : {})}, "button", nav.id === "ai" ? "ai" : "shell")}
                >
                  {nav.icon === "bars" ? (
                    <span style={blueTheme(styles.refAiBars, "buttonChild", "shell")} aria-hidden="true">
                      <i style={blueTheme({height:"8px",width:"4px",borderRadius:"2px",background:"currentColor",display:"block"}, "buttonChild", "shell")}></i>
                      <i style={blueTheme({height:"14px",width:"4px",borderRadius:"2px",background:"currentColor",display:"block"}, "buttonChild", "shell")}></i>
                      <i style={blueTheme({height:"20px",width:"4px",borderRadius:"2px",background:"currentColor",display:"block"}, "buttonChild", "shell")}></i>
                    </span>
                  ) : (
                    <span style={blueTheme(styles.refNavIcon, "buttonChild", "shell")}>{nav.icon}</span>
                  )}
                  <span>{nav.label}</span>
                  {nav.id === "group" && groupUnreadCount > 0 && (
                    <i style={blueTheme(styles.refNavBadge, "buttonChild", "shell")}>{groupUnreadCount > 99 ? "99+" : groupUnreadCount}</i>
                  )}
                  {nav.id === "private" && unreadPrivate > 0 && <i style={blueTheme(styles.refNavBadge, "buttonChild", "shell")}>{unreadPrivate > 99 ? "99+" : unreadPrivate}</i>}
                </button>
              );
            })}
          </nav>

          {chatImagePreview && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="사진 크게 보기"
              onClick={() => setChatImagePreview("")}
              style={blueTheme({
                position:"fixed",inset:0,zIndex:2147483646,
                background:"rgba(0,0,0,.88)",
                display:"flex",alignItems:"center",justifyContent:"center",
                padding:"18px",boxSizing:"border-box",
                cursor:"zoom-out",
              }, "surface", "shell")}
            >
              <button
                type="button"
                aria-label="사진 닫기"
                onClick={() => setChatImagePreview("")}
                style={blueTheme({
                  position:"fixed",top:"max(18px, env(safe-area-inset-top))",right:"18px",
                  zIndex:2147483647,width:"42px",height:"42px",borderRadius:"50%",
                  border:"1px solid rgba(255,255,255,.45)",background:"rgba(0,0,0,.58)",
                  color:"#fff",fontSize:"28px",lineHeight:1,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                }, "button", "shell")}
              >×</button>
              <img
                src={chatImagePreview}
                alt="확대된 전송 이미지"
                onClick={(event) => event.stopPropagation()}
                style={blueTheme({
                  display:"block",maxWidth:"96vw",maxHeight:"92vh",
                  width:"auto",height:"auto",objectFit:"contain",
                  borderRadius:"12px",boxShadow:"0 14px 50px rgba(0,0,0,.45)",
                  cursor:"default",
                }, "surface", "shell")}
              />
            </div>
          )}

          {showInstallGuide && (
            <div style={blueTheme(styles.installGuideBackdrop, "surface", "shell")} onClick={() => closeInstallGuide({ never: true })}>
              <div style={blueTheme(styles.installGuideCard, "surface", "shell")} onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => closeInstallGuide({ never: true })} style={blueTheme(styles.installGuideClose, "button", "shell")}>×</button>
                <div style={blueTheme(styles.installGuideEyebrow, "surface", "shell")}>AI PROCESS VIP</div>
                <h3 style={blueTheme(styles.installGuideTitle, "surface", "shell")}>VIP 전용 앱 설치 방법</h3>
                <p style={blueTheme(styles.installGuideText, "surface", "shell")}>
                  홈 화면에 앱을 설치해두시면<br />
                  <strong>이벤트 및 카카오톡 1:1 고객센터 알림 확인이 더욱 편리합니다.</strong>
                </p>

                <div style={blueTheme(styles.installGuideImageWrap, "surface", "shell")}>
                  <img
                    src="/vip-install-guide.jpg"
                    alt="아이폰과 갤럭시 VIP 홈페이지 설치 방법"
                    style={blueTheme(styles.installGuideImage, "surface", "shell")}
                  />
                </div>

                <div style={blueTheme(styles.installGuideTip, "surface", "shell")}>
                  아이폰은 <strong>Safari</strong>, 갤럭시는 <strong>Chrome</strong>에서 안내 순서대로 홈 화면에 추가해주세요.
                </div>
                <button
                  type="button"
                  onClick={() => closeInstallGuide({ never: true })}
                  style={blueTheme(styles.installGuideOk, "button", "shell")}
                >
                  다시는 보지 않기
                </button>
              </div>
            </div>
          )}

          {showApprovedMemberManager && profile?.role === "admin" && (
            <div
              style={blueTheme(styles.refModalBackdrop, "surface", "shell")}
              onClick={() => setShowApprovedMemberManager(false)}
            >
              <div
                style={blueTheme({
                  ...styles.refModalCard,
                  width:"min(94vw,520px)",
                  maxHeight:"82vh",
                  display:"flex",
                  flexDirection:"column",
                  overflow:"hidden",
                }, "surface", "shell")}
                onClick={(event) => event.stopPropagation()}
              >
                <div style={blueTheme({display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px"}, "surface", "shell")}>
                  <div>
                    <span style={blueTheme({display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.5px",color:"#a16e2a"}, "surface", "shell")}>MEMBER MANAGEMENT</span>
                    <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:"17px",color:"#2b2118"}, "surface", "shell")}>전체 회원 관리</strong>
                    <span style={blueTheme({display:"block",marginTop:"3px",fontSize:"8px",color:"#8e7d6b"}, "surface", "shell")}>
                      가입 닉네임 · 성함 · 승인상태 · 접속/알림 상태를 한 번에 확인합니다
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowApprovedMemberManager(false)}
                    style={blueTheme({border:0,background:"#f1e6d5",width:"32px",height:"32px",borderRadius:"50%",fontSize:"17px",cursor:"pointer"}, "button", "shell")}
                  >×</button>
                </div>

                <div style={blueTheme({position:"relative",marginTop:"13px"}, "surface", "shell")}>
                  <span style={blueTheme({position:"absolute",left:"12px",top:"50%",transform:"translateY(-50%)",fontSize:"13px"}, "surface", "shell")}>⌕</span>
                  <input
                    value={approvedMemberManagerSearch}
                    onChange={(event) => setApprovedMemberManagerSearch(event.target.value)}
                    placeholder="닉네임 또는 성함 검색"
                    style={blueTheme({
                      width:"100%",boxSizing:"border-box",border:"1px solid #ddc7a6",
                      borderRadius:"13px",padding:"11px 12px 11px 34px",background:"#fff",
                      color:"#2b2118",fontSize:"10px",outline:"none"
                    }, "surface", "shell")}
                  />
                </div>

                <div style={blueTheme({
                  marginTop:"10px",padding:"8px 10px",borderRadius:"11px",
                  background:"#172938",color:"#f4d89e",fontSize:"8px",fontWeight:"900"
                }, "surface", "shell")}>
                  전체 {approvedMemberManagerRows.length.toLocaleString("ko-KR")}명 · 승인완료 {approvedMemberManagerRows.filter((m)=>String(m.approval_status)==="1").length.toLocaleString("ko-KR")}명 · 승인대기 {approvedMemberManagerRows.filter((m)=>String(m.approval_status)==="0").length.toLocaleString("ko-KR")}명
                </div>

                <div style={blueTheme({marginTop:"8px",overflowY:"auto",minHeight:0,flex:1}, "surface", "shell")}>
                  {approvedMemberManagerRows
                    .filter((member) => {
                      const keyword = approvedMemberManagerSearch.trim().toLowerCase();
                      if (!keyword) return true;
                      return `${member.nickname || ""} ${member.real_name || ""}`.toLowerCase().includes(keyword);
                    })
                    .map((member) => {
                      const avatar = member.avatar || "01";
                      const approved = String(member.approval_status) === "1";
                      return (
                        <div
                          key={member.member_id}
                          style={blueTheme({
                            width:"100%",boxSizing:"border-box",
                            borderBottom:"1px solid #eee1cf",
                            padding:"11px 3px",display:"flex",alignItems:"center",gap:"10px"
                          }, "surface", "shell")}
                        >
                          <img
                            src={avatarSrc(avatar)}
                            alt=""
                            style={blueTheme({width:"38px",height:"38px",borderRadius:"50%",objectFit:"cover",border:"1px solid #dfc28f",flex:"0 0 auto"}, "surface", "shell")}
                          />
                          <div style={blueTheme({minWidth:0,flex:1}, "surface", "shell")}>
                            <div style={blueTheme({display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}, "surface", "shell")}>
                              <strong style={blueTheme({fontSize:"10px",color:"#2b2118"}, "surface", "shell")}>{member.nickname || "VIP 회원"}</strong>
                              <span style={blueTheme({
                                padding:"3px 7px",borderRadius:"999px",fontSize:"7px",fontWeight:"1000",
                                background:approved?"#e5f4ec":"#fff0d8",color:approved?"#176443":"#a46113"
                              }, "surface", "shell")}>
                                {approved ? "승인완료 1" : "승인전 0"}
                              </span>
                              <span style={blueTheme({padding:"3px 7px",borderRadius:"999px",fontSize:"7px",fontWeight:"1000",background:memberPresence[String(member.member_id)]?"#e5f4ec":"#f0ede8",color:memberPresence[String(member.member_id)]?"#16834f":"#8a8178"}, "surface", "shell")}>
                                {memberPresence[String(member.member_id)] ? "🟢 온라인" : "⚫ 오프라인"}
                              </span>
                              <span style={blueTheme({padding:"3px 7px",borderRadius:"999px",fontSize:"7px",fontWeight:"1000",background:adminPushStatus[String(member.member_id)]?.enabled?"#e8f1ff":"#f3eee7",color:adminPushStatus[String(member.member_id)]?.enabled?"#1768d8":"#8a8178"}, "surface", "shell")}>
                                {adminPushStatus[String(member.member_id)]?.enabled ? "🔔 알림 ON" : "🔕 알림 OFF"}
                              </span>
                            </div>
                            <div style={blueTheme({marginTop:"4px",fontSize:"8px",lineHeight:1.6,color:"#756557"}, "surface", "shell")}>
                              <span>성함 <b style={blueTheme({color:"#34271e"}, "surface", "shell")}>{member.real_name || "-"}</b></span>
                              {String(member.member_id) !== String(user?.id) && (
                                <label style={blueTheme({marginLeft:"8px",fontSize:"8px",fontWeight:900,color:"#74552c"}, "surface", "shell")}>
                                  상품 지급
                                  <select
                                    value={member.reward_account_type || "real"}
                                    disabled={approvedMemberManagerWorking}
                                    onChange={async (event) => {
                                      const nextType = event.target.value;
                                      approvedMemberManagerSavingRef.current = true;
                                      setApprovedMemberManagerWorking(true);
                                      ++approvedMemberManagerLoadVersionRef.current;
                                      try {
                                        const { data: savedType, error } = await supabase.rpc("admin_set_reward_account_type", {
                                          p_member_id: member.member_id,
                                          p_account_type: nextType,
                                        });
                                        if (error) throw error;
                                        if (savedType !== nextType) throw new Error("서버에서 지급 유형 변경을 확인하지 못했습니다.");
                                        setApprovedMemberManagerRows((current) => current.map((item) =>
                                          item.member_id === member.member_id ? { ...item, reward_account_type: nextType } : item
                                        ));
                                        setNotice(nextType === "virtual" ? "가상 지급 계정으로 변경했습니다." : "실제 지급 계정으로 변경했습니다.");
                                        // The profile change also emits a realtime event; refresh only after unlocking.
                                        approvedMemberManagerSavingRef.current = false;
                                        await loadApprovedMemberManagerRows({ silent: true });
                                      } catch (error) {
                                        setNotice("상품 지급 유형 변경 실패: " + (error.message || "알 수 없는 오류"));
                                      } finally {
                                        approvedMemberManagerSavingRef.current = false;
                                        setApprovedMemberManagerWorking(false);
                                      }
                                    }}
                                    style={blueTheme({marginLeft:"5px",border:"1px solid #d8bd91",borderRadius:"7px",padding:"4px",fontSize:"8px",background:"#fff"}, "surface", "shell")}
                                  >
                                    <option value="real">실제 지급</option>
                                    <option value="virtual">가상 지급</option>
                                  </select>
                                </label>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setAdminEditNickname(member.nickname || "");
                                  setAdminEditRealName(member.real_name || "");
                                  setAdminIdentityTarget(member);
                                }}
                                style={blueTheme({marginLeft:"10px",border:"1px solid #d8bd91",borderRadius:"8px",padding:"3px 7px",background:"#fff8ec",color:"#8a5c25",fontSize:"7.5px",fontWeight:"900",cursor:"pointer"}, "button", "shell")}
                              >
                                닉네임/성함 변경
                              </button>
                              <button
                                type="button"
                                onClick={() => { setAdminNewPassword(""); setAdminPasswordTarget(member); }}
                                style={blueTheme({marginLeft:"6px",border:"1px solid #d8bd91",borderRadius:"8px",padding:"3px 7px",background:"#fff8ec",color:"#8a5c25",fontSize:"7.5px",fontWeight:"900",cursor:"pointer"}, "button", "shell")}
                              >
                                비밀번호 변경
                              </button>
                            </div>
                          </div>
                          {String(member.member_id) !== String(user?.id) && (
                            approved ? (
                              <button
                                type="button"
                                disabled={approvedMemberManagerWorking}
                                onClick={() => adminRevokeApprovedMember(member.member_id, member.nickname || "회원")}
                                style={blueTheme({border:0,borderRadius:"10px",padding:"8px 9px",background:"#8b3b34",color:"#fff",fontSize:"7.5px",fontWeight:"1000",cursor:"pointer",whiteSpace:"nowrap"}, "button", "shell")}
                              >
                                승인해제
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={adminApprovalWorking}
                                onClick={() => approveAdminMember(member.member_id, member.nickname || "회원")}
                                style={blueTheme({border:0,borderRadius:"10px",padding:"8px 9px",background:"#176443",color:"#fff",fontSize:"7.5px",fontWeight:"1000",cursor:"pointer",whiteSpace:"nowrap"}, "button", "shell")}
                              >
                                승인
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  {approvedMemberManagerRows.filter((member) => {
                    const keyword = approvedMemberManagerSearch.trim().toLowerCase();
                    if (!keyword) return true;
                    return `${member.nickname || ""} ${member.real_name || ""}`.toLowerCase().includes(keyword);
                  }).length === 0 && (
                    <div style={blueTheme({padding:"24px 10px",textAlign:"center",fontSize:"9px",color:"#9a8875"}, "surface", "shell")}>
                      검색 결과가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showProfileInfo && (
            <div style={blueTheme(styles.refProfileOverlay, "surface", "shell")} onClick={() => setShowProfileInfo(false)}>
              <div style={blueTheme(styles.refProfileCard, "surface", "shell")} onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => setShowProfileInfo(false)} style={blueTheme(styles.refProfileClose, "button", "shell")}>×</button>
                <div style={blueTheme(styles.refProfileVip, "surface", "shell")}>AI PROCESS VIP</div>
                <strong style={blueTheme(styles.refProfileName, "surface", "shell")}>{profile.nickname}</strong>
                <div style={blueTheme(styles.refProfileRows, "surface", "shell")}>
                  <div style={blueTheme({display:"flex",justifyContent:"space-between",padding:"11px 13px",borderBottom:"1px solid #eadbc7"}, "surface", "shell")}><span style={blueTheme({color:"#8a7768"}, "surface", "shell")}>닉네임</span><b>{profile.nickname || "-"}</b></div>
                  <div style={blueTheme({display:"flex",justifyContent:"space-between",padding:"11px 13px",borderBottom:"1px solid #eadbc7"}, "surface", "shell")}><span style={blueTheme({color:"#8a7768"}, "surface", "shell")}>성함</span><b>{profile.real_name || "-"}</b></div>
                  <div style={blueTheme({display:"flex",justifyContent:"space-between",padding:"11px 13px",borderBottom:"1px solid #eadbc7"}, "surface", "shell")}><span style={blueTheme({color:"#8a7768"}, "surface", "shell")}>회원등급</span><b>{profile.role === "admin" ? "관리자" : "VIP 회원"}</b></div>
                  <div style={blueTheme({display:"flex",justifyContent:"space-between",padding:"11px 13px"}, "surface", "shell")}><span style={blueTheme({color:"#8a7768"}, "surface", "shell")}>승인상태</span><b>{profile.approval_status === "1" ? "승인 완료" : profile.approval_status}</b></div>
                </div>
                <p style={blueTheme(styles.refProfileNote, "surface", "shell")}>로그인 비밀번호는 이 화면에서 직접 변경할 수 있습니다.</p>
                <button type="button" onClick={() => {setShowProfileInfo(false); setNewPassword(""); setNewPasswordConfirm(""); setShowPasswordChange(true);}} style={blueTheme(styles.refProfileEdit, "button", "shell")}>
                  비밀번호 변경
                </button>
              </div>
            </div>
          )}

          {showPasswordChange && (
            <div style={blueTheme({
                position:"fixed", inset:0, zIndex:2147483647,
                background:"rgba(18,13,10,.62)",
                backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)",
                display:"flex", alignItems:"center", justifyContent:"center", padding:"18px"
              }, "surface", "shell")} onClick={() => !passwordChangeWorking && setShowPasswordChange(false)}>
              <div style={blueTheme({
                  width:"min(92vw,420px)", maxHeight:"86vh", overflowY:"auto",
                  boxSizing:"border-box", borderRadius:"20px", padding:"18px",
                  background:"#fffaf2", border:"1px solid #e4c99d",
                  boxShadow:"0 22px 70px rgba(20,14,9,.35)"
                }, "surface", "shell")} onClick={(e)=>e.stopPropagation()}>
                <div style={blueTheme({display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px"}, "surface", "shell")}>
                  <div>
                    <span style={blueTheme({display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.4px",color:"#a16e2a"}, "surface", "shell")}>MY ACCOUNT</span>
                    <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:"17px",color:"#2b2118"}, "surface", "shell")}>비밀번호 변경</strong>
                  </div>
                  <button type="button" disabled={passwordChangeWorking} onClick={()=>setShowPasswordChange(false)} style={blueTheme({border:0,background:"#f1e6d5",width:"32px",height:"32px",borderRadius:"50%",fontSize:"17px",cursor:"pointer"}, "button", "shell")}>×</button>
                </div>
                <div style={blueTheme({marginTop:"16px",display:"grid",gap:"10px"}, "surface", "shell")}>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e)=>setNewPassword(e.target.value)}
                    placeholder="새 비밀번호 4자리 이상"
                    autoComplete="new-password"
                    style={blueTheme({width:"100%",boxSizing:"border-box",border:"1px solid #ddc7a6",borderRadius:"12px",padding:"12px",fontSize:"11px",outline:"none"}, "surface", "shell")}
                  />
                  <input
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(e)=>setNewPasswordConfirm(e.target.value)}
                    placeholder="새 비밀번호 다시 입력"
                    autoComplete="new-password"
                    style={blueTheme({width:"100%",boxSizing:"border-box",border:"1px solid #ddc7a6",borderRadius:"12px",padding:"12px",fontSize:"11px",outline:"none"}, "surface", "shell")}
                  />
                  <button type="button" disabled={passwordChangeWorking} onClick={changeMyPassword} style={blueTheme({border:0,borderRadius:"12px",padding:"12px",background:"#172938",color:"#f4d89e",fontSize:"10px",fontWeight:"1000",cursor:"pointer"}, "button", "shell")}>
                    {passwordChangeWorking ? "변경 중..." : "새 비밀번호로 변경"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {adminIdentityTarget && profile?.role === "admin" && (
            <div style={blueTheme({
                position:"fixed", inset:0, zIndex:2147483647,
                background:"rgba(18,13,10,.62)",
                backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)",
                display:"flex", alignItems:"center", justifyContent:"center", padding:"18px"
              }, "surface", "shell")} onClick={() => !adminIdentityWorking && setAdminIdentityTarget(null)}>
              <div style={blueTheme({
                  width:"min(92vw,430px)", maxHeight:"86vh", overflowY:"auto",
                  boxSizing:"border-box", borderRadius:"20px", padding:"18px",
                  background:"#fffaf2", border:"1px solid #e4c99d",
                  boxShadow:"0 22px 70px rgba(20,14,9,.35)"
                }, "surface", "shell")} onClick={(e)=>e.stopPropagation()}>
                <div style={blueTheme({display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px"}, "surface", "shell")}>
                  <div>
                    <span style={blueTheme({display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.4px",color:"#a16e2a"}, "surface", "shell")}>ADMIN MEMBER</span>
                    <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:"17px",color:"#2b2118"}, "surface", "shell")}>닉네임 / 성함 변경</strong>
                  </div>
                  <button type="button" disabled={adminIdentityWorking} onClick={()=>setAdminIdentityTarget(null)} style={blueTheme({border:0,background:"#f1e6d5",width:"32px",height:"32px",borderRadius:"50%",fontSize:"17px",cursor:"pointer"}, "button", "shell")}>×</button>
                </div>
                <div style={blueTheme({marginTop:"16px",display:"grid",gap:"10px"}, "surface", "shell")}>
                  <label style={blueTheme({fontSize:"8px",fontWeight:"900",color:"#756557"}, "surface", "shell")}>닉네임</label>
                  <input
                    type="text"
                    value={adminEditNickname}
                    onChange={(e)=>setAdminEditNickname(e.target.value)}
                    placeholder="새 닉네임"
                    style={blueTheme({width:"100%",boxSizing:"border-box",border:"1px solid #ddc7a6",borderRadius:"12px",padding:"12px",fontSize:"11px",outline:"none"}, "surface", "shell")}
                  />
                  <label style={blueTheme({fontSize:"8px",fontWeight:"900",color:"#756557"}, "surface", "shell")}>성함 · 로그인 아이디</label>
                  <input
                    type="text"
                    value={adminEditRealName}
                    onChange={(e)=>setAdminEditRealName(e.target.value)}
                    placeholder="새 성함"
                    style={blueTheme({width:"100%",boxSizing:"border-box",border:"1px solid #ddc7a6",borderRadius:"12px",padding:"12px",fontSize:"11px",outline:"none"}, "surface", "shell")}
                  />
                  <button type="button" disabled={adminIdentityWorking} onClick={adminChangeMemberIdentity} style={blueTheme({border:0,borderRadius:"12px",padding:"12px",background:"#172938",color:"#f4d89e",fontSize:"10px",fontWeight:"1000",cursor:"pointer"}, "button", "shell")}>
                    {adminIdentityWorking ? "변경 중..." : "닉네임 / 성함 변경"}
                  </button>
                  <div style={blueTheme({fontSize:"8px",lineHeight:1.6,color:"#8e7d6b"}, "surface", "shell")}>
                    성함을 변경하면 다음 로그인부터 변경된 성함 + 기존 비밀번호로 로그인합니다.
                  </div>
                </div>
              </div>
            </div>
          )}

          {adminPasswordTarget && profile?.role === "admin" && (
            <div style={blueTheme({
                position:"fixed", inset:0, zIndex:2147483647,
                background:"rgba(18,13,10,.62)",
                backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)",
                display:"flex", alignItems:"center", justifyContent:"center", padding:"18px"
              }, "surface", "shell")} onClick={() => !passwordChangeWorking && setAdminPasswordTarget(null)}>
              <div style={blueTheme({
                  width:"min(92vw,420px)", maxHeight:"86vh", overflowY:"auto",
                  boxSizing:"border-box", borderRadius:"20px", padding:"18px",
                  background:"#fffaf2", border:"1px solid #e4c99d",
                  boxShadow:"0 22px 70px rgba(20,14,9,.35)"
                }, "surface", "shell")} onClick={(e)=>e.stopPropagation()}>
                <div style={blueTheme({display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px"}, "surface", "shell")}>
                  <div>
                    <span style={blueTheme({display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.4px",color:"#a16e2a"}, "surface", "shell")}>ADMIN PASSWORD</span>
                    <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:"17px",color:"#2b2118"}, "surface", "shell")}>{adminPasswordTarget.nickname || "회원"} 비밀번호 변경</strong>
                    <span style={blueTheme({display:"block",marginTop:"4px",fontSize:"8px",color:"#8e7d6b"}, "surface", "shell")}>성함 {adminPasswordTarget.real_name || "-"}</span>
                  </div>
                  <button type="button" disabled={passwordChangeWorking} onClick={()=>setAdminPasswordTarget(null)} style={blueTheme({border:0,background:"#f1e6d5",width:"32px",height:"32px",borderRadius:"50%",fontSize:"17px",cursor:"pointer"}, "button", "shell")}>×</button>
                </div>
                <div style={blueTheme({marginTop:"16px",display:"grid",gap:"10px"}, "surface", "shell")}>
                  <input
                    type="password"
                    value={adminNewPassword}
                    onChange={(e)=>setAdminNewPassword(e.target.value)}
                    placeholder="새 비밀번호 4자리 이상"
                    autoComplete="new-password"
                    style={blueTheme({width:"100%",boxSizing:"border-box",border:"1px solid #ddc7a6",borderRadius:"12px",padding:"12px",fontSize:"11px",outline:"none"}, "surface", "shell")}
                  />
                  <button type="button" disabled={passwordChangeWorking} onClick={adminChangeMemberPassword} style={blueTheme({border:0,borderRadius:"12px",padding:"12px",background:"#8b3b34",color:"#fff",fontSize:"10px",fontWeight:"1000",cursor:"pointer"}, "button", "shell")}>
                    {passwordChangeWorking ? "변경 중..." : "회원 비밀번호 변경"}
                  </button>
                  <div style={blueTheme({fontSize:"8px",lineHeight:1.6,color:"#8e7d6b"}, "surface", "shell")}>
                    기존 비밀번호 원문은 표시하지 않습니다. 관리자는 새 비밀번호만 지정할 수 있습니다.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={blueTheme(styles.refBody, "surface", "shell")}>
            {GROUP_CHAT_ENABLED && chatTab === "group" && (
              <div style={blueTheme(styles.refScreen, "surface", "shell")}>
                <div style={blueTheme(styles.refMemberStrip, "surface", "shell")}>
                  <img
                    src={avatarSrc(profile.avatar)}
                    alt=""
                    style={blueTheme(styles.refMemberStripAvatar, "surface", "shell")}
                  />
                  <div style={blueTheme(styles.refRoomIdentity, "surface", "shell")}>
                    <div style={blueTheme(styles.refRoomNameRow, "surface", "shell")}>
                      <strong>{profile.nickname}</strong>
                      <em style={blueTheme(styles.refVipBadge, "surface", "shell")}>VIP</em>
                    </div>
                    <span style={blueTheme(styles.refOnlineText, "surface", "shell")}><i style={blueTheme(styles.refOnlineDot, "surface", "shell")}></i>온라인</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setChatTab("event");
                      if (typeof window !== "undefined") window.sessionStorage.setItem("vip-active-tab", "event");
                    }}
                    style={blueTheme({
                      marginLeft:"auto",marginRight:"10px",border:0,borderRadius:"999px",
                      padding:"6px 10px",maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                      background:nextEventStatus.live?"#fff0ef":"#f7efe3",
                      color:nextEventStatus.live?"#d7352d":"#8a5d24",fontSize:"8px",fontWeight:"1000",cursor:"pointer",
                      boxShadow:"inset 0 0 0 1px rgba(181,132,65,.22)"
                    }, "button", "shell")}
                    title={nextEventStatus.live ? "이벤트 탭에서 바로 참여하기" : nextEventStatus.text}
                  >
                    {nextEventStatus.live ? "🔴 " : "🎁 "}{nextEventStatus.text}
                  </button>
                  <div
                    style={blueTheme({
                      ...styles.refMemberCount,
                      cursor: profile?.role === "admin" ? "pointer" : "default",
                    }, "surface", "shell")}
                    onClick={() => profile?.role === "admin" && openApprovedMemberManager()}
                    title={profile?.role === "admin" ? "승인 회원 관리" : undefined}
                  >
                    <span style={blueTheme(styles.refMemberCountIcon, "surface", "shell")}>
                      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                        <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.7"/>
                        <circle cx="16.5" cy="9" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".72"/>
                        <path d="M3.8 18c.5-3.1 2.4-4.8 5.2-4.8s4.8 1.7 5.3 4.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                        <path d="M14.4 14.2c2.8-.5 4.9.9 5.5 3.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".72"/>
                      </svg>
                    </span>
                    <span style={blueTheme(styles.refMemberCountLabel, "surface", "shell")}>MEMBERS</span>
                    <strong style={blueTheme(styles.refMemberCountNumber, "surface", "shell")}>{approvedMemberCount.toLocaleString("ko-KR")}명</strong>
                  </div>
                  {profile?.role === "admin" && (
                    <button type="button" onClick={toggleGroupChatFreeze} style={blueTheme(styles.refAdminMini, "button", "shell")}>
                      {chatFrozen ? "채팅 열기" : "채팅 잠금"}
                    </button>
                  )}
                </div>

                {profile?.role !== "admin" && (aiMemberProcess?.status === "running" || aiMemberProcess?.status === "completed") && (
                  <button type="button" onClick={() => { setChatTab("ai"); window.sessionStorage.setItem("vip-active-tab","ai"); }}
                    style={blueTheme({width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px",padding:"10px 14px",border:"none",borderBottom:"1px solid #e4d5bb",background:"#fff8ec",color:"#6c4a1e",cursor:"pointer",textAlign:"left"}, "button", "shell")}>
                    <span style={blueTheme({display:"flex",alignItems:"center",gap:"7px",minWidth:0}, "buttonChild", "shell")}>
                      <span style={blueTheme({width:"7px",height:"7px",flexShrink:0,borderRadius:"50%",background:aiMemberProcess.status==="running"?"#16b979":"#5a79d6",boxShadow:aiMemberProcess.status==="running"?"0 0 0 3px rgba(22,185,121,.14)":"0 0 0 3px rgba(90,121,214,.14)"}, "buttonChild", "shell")} />
                      <span style={blueTheme({fontWeight:900,fontSize:"12px",color:aiMemberProcess.status==="running"?"#176d4a":"#3858a0",whiteSpace:"nowrap"}, "buttonChild", "shell")}>
                        {aiMemberProcess.status==="running"?"AI프로세스 진행중":"AI프로세스 완료"}
                      </span>
                    </span>
                    <span style={blueTheme({display:"flex",alignItems:"center",gap:"5px",justifyContent:"flex-end",minWidth:0,flexWrap:"wrap"}, "buttonChild", "shell")}>
                      <span style={blueTheme({fontSize:"10px",fontWeight:700,color:"#927650",whiteSpace:"nowrap"}, "buttonChild", "shell")}>{aiMemberProcess.status==="running"?"수익중인 금액 :":"수익 완료 금액 :"}</span>
                      <strong style={blueTheme({fontSize:"12px",whiteSpace:"nowrap"}, "buttonChild", "shell")}>
                        {aiKrw(getMemberProcessSnapshot(aiMemberProcess).totalAmount)} ›
                      </strong>
                    </span>
                  </button>
                )}

                {memberGroupChatLocked && (
                  <div style={blueTheme(styles.refLockNotice, "surface", "shell")}>🔒 그룹채팅 운영시간은 11:00 ~ 18:30입니다.</div>
                )}

                <div
                  ref={groupMessagesRef}
                  style={blueTheme(styles.refMessages, "surface", "shell")}
                  onWheel={() => markUserChatScroll("group")}
                  onTouchMove={() => markUserChatScroll("group")}
                  onScroll={(e) => handleChatScroll("group", e.currentTarget)}
                >
                  <FloatingScrollDate value={groupScrollDate} />
                  {messages.length === 0 ? (
                    <div style={blueTheme(styles.refEmpty, "surface", "shell")}>아직 대화가 없습니다.<br/>첫 메시지를 남겨보세요.</div>
                   ) : messages.map((item, index) => {
                    const dateDivider = shouldShowChatDate(messages, index)
                      ? <ChatDateDivider value={item.created_at} />
                      : null;

                    if (item.message_type === "system" && String(item.content || "").startsWith("[VIP_SURPRISE_COMPLETE]")) {
                      const winnerName = String(item.content || "").slice("[VIP_SURPRISE_COMPLETE]".length).trim();
                      return (
                        <Fragment key={item.id}>
                          {dateDivider}
                          <div style={blueTheme({display:"flex",justifyContent:"center",padding:"12px 8px"}, "surface", "shell")}>
                            <div style={blueTheme({width:"100%",maxWidth:"340px",padding:"18px 16px",borderRadius:"17px",background:"linear-gradient(145deg,#1b3040,#283d4d)",border:"1px solid #d6b776",boxShadow:"0 6px 20px rgba(0,0,0,.13)",color:"#fff",textAlign:"center"}, "accentSurface", "shell")}>
                              <div style={blueTheme({fontSize:"10px",fontWeight:900,letterSpacing:"1.5px",color:"#e9c77f"}, "surface", "shell")}>VIP AI PROCESS · COMPLETE</div>
                              <div style={blueTheme({fontSize:"22px",marginTop:"8px"}, "surface", "shell")}>🎊</div>
                              <div style={blueTheme({whiteSpace:"pre-line",fontSize:"13px",fontWeight:900,marginTop:"8px",lineHeight:1.6}, "surface", "shell")}>{formatSurpriseCopy(surpriseCopy.group_complete_title || "{닉네임}님 AI프로세스 진행 완료되셨습니다.\\n진심으로 축하드립니다!",winnerName)}</div>
                              <div style={blueTheme({whiteSpace:"pre-line",fontSize:"11px",lineHeight:1.7,marginTop:"8px",color:"#e9e4d8"}, "surface", "shell")}>{formatSurpriseCopy(surpriseCopy.group_complete_body || "이벤트 완료 안내는 카카오톡 1:1 고객센터에서 확인해 주세요.",winnerName)}</div>
                              <button type="button" onClick={() => { setChatTab("private"); window.sessionStorage.setItem("vip-active-tab","private"); }} style={blueTheme({width:"100%",marginTop:"14px",padding:"11px",borderRadius:"10px",border:"1px solid #e8cb8e",background:"#e8cb8e",color:"#25313a",fontSize:"12px",fontWeight:900,cursor:"pointer"}, "button", "shell")}>1:1 메시지 확인하기 ›</button>
                            </div>
                          </div>
                        </Fragment>
                      );
                    }

                    if (item.message_type === "system" && String(item.content || "").startsWith("[VIP_SURPRISE_WIN]")) {
                      const winnerName = String(item.content || "").slice("[VIP_SURPRISE_WIN]".length).trim();
                      return (
                        <Fragment key={item.id}>
                          {dateDivider}
                          <div style={blueTheme({display:"flex",justifyContent:"center",padding:"12px 8px"}, "surface", "shell")}>
                            <div style={blueTheme({width:"100%",maxWidth:"340px",padding:"18px 16px",borderRadius:"17px",background:"linear-gradient(145deg,#1b3040,#283d4d)",border:"1px solid #d6b776",boxShadow:"0 6px 20px rgba(0,0,0,.13)",color:"#fff",textAlign:"center"}, "accentSurface", "shell")}>
                              <div style={blueTheme({fontSize:"10px",fontWeight:900,letterSpacing:"1.5px",color:"#e9c77f"}, "surface", "shell")}>VIP SURPRISE EVENT</div>
                              <div style={blueTheme({fontSize:"21px",marginTop:"8px"}, "surface", "shell")}>🎉</div>
                              <div style={blueTheme({whiteSpace:"pre-line",fontSize:"14px",fontWeight:900,marginTop:"7px"}, "surface", "shell")}>{formatSurpriseCopy(surpriseCopy.group_start_title || "{닉네임}님 돌발 이벤트 당첨!",winnerName)}</div>
                              <div style={blueTheme({whiteSpace:"pre-line",fontSize:"11px",lineHeight:1.7,marginTop:"7px",color:"#e9e4d8"}, "surface", "shell")}>{formatSurpriseCopy(surpriseCopy.group_start_body || "모의 체험 지원금 10,000원으로\\nAI프로세스 진행이 시작되었습니다.",winnerName)}</div>
                              <button type="button" onClick={() => setChatTab("ai")} style={blueTheme({width:"100%",marginTop:"14px",padding:"11px",borderRadius:"10px",border:"1px solid #e8cb8e",background:"#e8cb8e",color:"#25313a",fontSize:"12px",fontWeight:900,cursor:"pointer"}, "button", "shell")}>AI프로세스 확인하기 ›</button>
                            </div>
                          </div>
                        </Fragment>
                      );
                    }

                    if (item.message_type === "system") {
                      return (
                        <Fragment key={item.id}>
                          {dateDivider}
                          <div
                          style={blueTheme({
                            width:"100%",
                            display:"flex",
                            justifyContent:"center",
                            padding:"7px 10px",
                            boxSizing:"border-box",
                          }, "surface", "shell")}
                        >
                          <div
                            style={blueTheme({
                              maxWidth:"88%",
                              padding:"6px 12px",
                              borderRadius:"999px",
                              background:"rgba(0,0,0,.055)",
                              color:"#817a72",
                              fontSize:"10.5px",
                              fontWeight:"700",
                              lineHeight:1.4,
                              textAlign:"center",
                              letterSpacing:"-.15px",
                            }, "surface", "shell")}
                          >
                            {item.content}
                          </div>
                        </div>
                        </Fragment>
                      );
                    }

                    const mine =
                      Boolean(item?.__mine) ||
                      String(item.member_id || "") === String(user?.id || "") ||
                      String(item.member_id || "") === String(profile?.id || "");
                    const avatar = memberAvatars[item.member_id] || "01";
                    return (
                      <Fragment key={item.id}>
                        {dateDivider}
                      <div
                        style={blueTheme({
                          ...styles.refMsgRow,
                          justifyContent: mine ? "flex-end" : "flex-start",
                        }, "surface", "shell")}
                      >
                        {!mine && (
                          <img
                            src={avatarSrc(avatar)}
                            alt=""
                            style={blueTheme(styles.refMsgAvatar, "surface", "shell")}
                            onClick={() => profile?.role === "admin" && adminKickMember(item.member_id, getMessageNickname(item))}
                          />
                        )}
                        <div
                          style={blueTheme({
                            flex: "0 1 auto",
                            width: "fit-content",
                            minWidth: 0,
                            maxWidth: mine ? "78%" : "82%",
                            marginLeft: mine ? "auto" : "0",
                            marginRight: mine ? "0" : "auto",
                            display:"flex",
                            flexDirection:"column",
                            alignItems: mine ? "flex-end" : "flex-start",
                            boxSizing:"border-box",
                          }, "surface", "shell")}
                        >
                          {!mine && <div style={blueTheme(styles.refMsgName, "surface", "shell")}>{getMessageNickname(item)}</div>}
                          <div
                            style={blueTheme({
                              display:"flex",
                              gap:"6px",
                              alignItems:"flex-end",
                              justifyContent: mine ? "flex-start" : "flex-start",
                              flexDirection:mine?"row-reverse":"row",
                              maxWidth:"100%",
                              minWidth:0,
                              boxSizing:"border-box",
                            }, "surface", "shell")}
                          >
                            <div style={blueTheme({...styles.refBubble,...(mine?styles.refMyBubble:styles.refOtherBubble)}, "surface", "shell")}>
                              {renderMessageContent(item.content)}
                            </div>
                            <span style={blueTheme(styles.refMsgTime, "surface", "shell")}>{formatChatTime(item.created_at)}</span>
                            {profile?.role === "admin" && (
                              <button type="button" onClick={() => adminDeleteGroupMessage(item.id)} style={blueTheme(styles.refDelete, "button", "shell")}>×</button>
                            )}
                          </div>
                        </div>
                      </div>
                      </Fragment>
                    );
                  })}
                  <div ref={groupBottomRef} style={blueTheme({height:"1px",width:"100%"}, "surface", "shell")} />
                </div>

                <LatestMessageButton kind="group" visible={groupShowLatestButton} />

                {featuredEvent && (
                  <button type="button" onClick={() => setChatTab("event")} style={blueTheme(styles.refNextEvent, "button", "shell")}>
                    <div style={blueTheme(styles.refNextGift, "buttonChild", "shell")}>{eventIcon(featuredEvent.event_type)}</div>
                    <div style={blueTheme(styles.refNextCopy, "buttonChild", "shell")}>
                      <span>{activeEvent ? "LIVE EVENT" : "NEXT EVENT"}</span>
                      <strong>{featuredEvent.title}</strong>
                      <small>{formatEventTime(featuredEvent.starts_at)} ~ {formatEventTime(featuredEvent.ends_at)}</small>
                    </div>
                    <div style={blueTheme(styles.refNextArrow, "buttonChild", "shell")}>›</div>
                  </button>
                )}

                <form onSubmit={sendMessage} style={blueTheme(styles.refComposer, "surface", "shell")}>
                  <label style={blueTheme(styles.refPlus, "surface", "shell")}>
                    +
                    <input type="file" accept="image/*" hidden onChange={(e) => uploadChatImage(e.target.files?.[0], "group")} />
                  </label>
                  <div ref={groupEmojiRef} style={blueTheme(styles.refEmojiWrap, "surface", "shell")}>
                    <button
                      type="button"
                      onClick={() => setShowGroupEmoji((v) => !v)}
                      style={blueTheme(styles.refEmojiButton, "button", "shell")}
                      aria-label="이모티콘"
                    >
                      ☺
                    </button>
                    {showGroupEmoji && (
                      <div style={blueTheme(styles.refEmojiPanel, "surface", "shell")}>
                        {CHAT_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            style={blueTheme(styles.refEmojiItem, "button", "shell")}
                            onClick={() => {
                              const input = groupInputRef.current;
                              if (input) {
                                const start = input.selectionStart ?? input.value.length;
                                const end = input.selectionEnd ?? input.value.length;
                                input.setRangeText(emoji, start, end, "end");
                                input.focus();
                              }
                              setShowGroupEmoji(false);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <textarea
                    ref={groupInputRef}
                    defaultValue=""
                    onCompositionStart={() => { groupComposingRef.current = true; }}
                    onCompositionEnd={() => { groupComposingRef.current = false; }}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent?.isComposing &&
                        !groupComposingRef.current
                      ) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    disabled={memberGroupChatLocked}
                    placeholder={memberGroupChatLocked ? "현재 채팅 이용 시간이 아닙니다." : "메시지를 입력하세요..."}
                    style={blueTheme(styles.refInput, "surface", "shell")}
                  />
                  <button type="submit" disabled={memberGroupChatLocked} style={blueTheme(styles.refSend, "button", "shell")}>➤</button>
                </form>
              </div>
            )}

            {chatTab === "event" && (
              <div style={blueTheme(styles.refEventScreen, "surface", "event")}>
                <div style={blueTheme({display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}, "surface", "event")}>
                  {[["live","실시간 이벤트"],["attendance","출석 이벤트"]].map(([id,title])=>(
                    <button key={id} type="button" onClick={()=>setEventView(id)} aria-pressed={eventView===id} style={blueTheme({padding:"12px 14px",borderRadius:14,border:eventView===id?"1px solid #3165f4":"1px solid #dde5f0",background:eventView===id?"#3165f4":"#fff",textAlign:"center",color:eventView===id?"#fff":"#17233f",cursor:"pointer"}, "button", id === "attendance" ? "attendance" : "event")}>
                      <strong style={blueTheme({display:"block",fontSize:14}, "buttonChild", "event")}>{title}</strong>
                    </button>
                  ))}
                </div>
                {profile.role === "admin" && <form onSubmit={registerMember} style={blueTheme({padding:16,marginBottom:16,border:"1px solid #e5d8c5",borderRadius:16,background:"#fff"}, "surface", "event")}>
                  <strong style={blueTheme({display:"block",marginBottom:12}, "surface", "event")}>회원 사전 등록</strong>
                  <div style={blueTheme({display:"flex",gap:8,flexWrap:"wrap"}, "surface", "event")}>
                    <input required maxLength={40} aria-label="등록할 오픈방 닉네임" placeholder="오픈방 닉네임" value={registerNickname} onChange={e=>setRegisterNickname(e.target.value)} style={blueTheme({...styles.input,flex:"1 1 140px",width:0}, "surface", "event")}/>
                    <input required maxLength={80} aria-label="등록할 회원 이름" placeholder="본인 이름" value={registerName} onChange={e=>setRegisterName(e.target.value)} style={blueTheme({...styles.input,flex:"1 1 120px",width:0}, "surface", "event")}/>
                    <button disabled={registerWorking} style={blueTheme({...styles.primary,width:"auto",padding:"12px 18px"}, "button", "event")}>{registerWorking?"등록 중":"회원 등록"}</button>
                  </div>
                  {registerNotice && <p role="status" style={blueTheme({fontSize:12,marginBottom:0}, "surface", "event")}>{registerNotice}</p>}
                </form>}

                {showSurpriseEventGuide && (
                  <div role="presentation" onClick={() => setShowSurpriseEventGuide(false)}
                    style={blueTheme({position:"fixed",inset:0,zIndex:2147483647,background:"rgba(12,19,27,.72)",display:"flex",alignItems:"center",justifyContent:"center",padding:"18px"}, "surface", "event")}>
                    <div role="dialog" aria-modal="true" aria-label="AI PROCESS 돌발 체험 이벤트 진행 방법 안내" onClick={(e)=>e.stopPropagation()}
                      style={blueTheme({width:"100%",maxWidth:"410px",maxHeight:"85vh",overflowY:"auto",boxSizing:"border-box",background:"#fffaf2",borderRadius:"20px",padding:"22px",boxShadow:"0 18px 60px rgba(0,0,0,.3)"}, "surface", "event")}>
                      <div style={blueTheme({display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px"}, "surface", "event")}>
                        <div><span style={blueTheme({fontSize:"9px",fontWeight:900,letterSpacing:"1.2px",color:"#a87b35"}, "surface", "event")}>AI PROCESS · SPECIAL EVENT</span>
                          <h3 style={blueTheme({margin:"6px 0 0",fontSize:"18px",color:"#273746"}, "surface", "event")}>{surpriseGuide.title || "돌발 체험 이벤트 안내"}</h3></div>
                        <button type="button" aria-label="안내 닫기" onClick={()=>setShowSurpriseEventGuide(false)}
                          style={blueTheme({border:0,background:"#ece4d7",borderRadius:"50%",width:"32px",height:"32px",fontSize:"20px",cursor:"pointer",flexShrink:0}, "button", "event")}>×</button>
                      </div>
                      <div style={blueTheme({marginTop:"18px",fontSize:"12px",lineHeight:1.9,color:"#394957",whiteSpace:"pre-wrap",overflowWrap:"anywhere"}, "surface", "event")}>{(surpriseGuide.body || "안내 내용을 불러오는 중입니다.").replace(/\\r\\n|\\n|\\r/g,"\n").split(/\n{2,}/).map((paragraph,index)=>{const lines=paragraph.split("\n");const heading=lines[0].trim();const isHeading=/^(참여\s*방법|진행\s*확인|완료\s*안내|유의\s*사항|참여\s*안내|진행\s*방법|지급\s*안내)$/.test(heading);const isNotice=/^(\(|※|\*|주의|중요)/.test(heading);return <p key={index} style={blueTheme({margin:index===0?"0 0 12px":"14px 0",color:isNotice?"#946b37":"#394957",fontSize:isNotice?"11px":"12px"}, "surface", "event")}>{isHeading?<><strong style={blueTheme({display:"block",marginBottom:"5px",fontSize:"13px",fontWeight:900,color:"#9b6d2d"}, "surface", "event")}>{heading}</strong>{lines.slice(1).join("\n")}</>:paragraph}</p>})}</div>
                      <button type="button" onClick={()=>setShowSurpriseEventGuide(false)}
                        style={blueTheme({width:"100%",marginTop:"20px",padding:"12px",border:0,borderRadius:"12px",background:"#304756",color:"#fff",fontSize:"12px",fontWeight:900,cursor:"pointer"}, "button", "event")}>확인</button>
                    </div>
                  </div>
                )}

                <button type="button" onClick={() => {loadSurpriseGuide();setShowSurpriseEventGuide(true);}}
                  style={blueTheme({width:"calc(100% - 24px)",margin:"10px 12px",padding:"12px 14px",borderRadius:"14px",border:"1px solid rgba(191,145,69,.38)",background:"linear-gradient(125deg,#263847,#344957)",color:"#fff",textAlign:"left",cursor:"pointer",boxShadow:"0 3px 12px rgba(29,37,44,.10)"}, "button", "event")}>
                  <span style={blueTheme({display:"block",fontSize:"8px",fontWeight:900,letterSpacing:"1.3px",color:"#e9c780"}, "buttonChild", "event")}>AI PROCESS · SPECIAL EVENT</span>
                  <strong style={blueTheme({display:"block",marginTop:"5px",fontSize:"13px"}, "buttonChild", "event")}>{surpriseGuide.title || "돌발 체험 이벤트 안내"}</strong>
                  <span style={blueTheme({display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:"7px",fontSize:"10px",color:"#e9d6b0",fontWeight:800}, "buttonChild", "event")}>
                    <span>진행방법</span><span aria-hidden="true">›</span>
                  </span>
                </button>

                {eventSuccess && (
                  <div style={blueTheme(styles.refEventSuccessToast, "surface", "event")} role="status">
                    <div style={blueTheme(styles.refEventSuccessCheck, "surface", "event")}>✓</div>
                    <div style={blueTheme(styles.refEventSuccessCopy, "surface", "event")}>
                      <strong style={blueTheme({fontSize:"11px",letterSpacing:".2px"}, "surface", "event")}>참여 완료</strong>
                      <span style={blueTheme({fontSize:"9px",color:"#ccebdd",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}, "surface", "event")}>{eventSuccess.message}</span>
                    </div>
                  </div>
                )}
                <div style={blueTheme({marginBottom:"10px",padding:"12px 13px",border:"1px solid #e5d3b8",borderRadius:"15px",background:"linear-gradient(180deg,#fffdf9 0%,#faf4ea 100%)",boxShadow:"0 5px 18px rgba(76,50,25,.06)"}, "accentSurface", "event")}>
                  <div style={blueTheme({display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px"}, "surface", "event")}>
                    <div>
                      <span style={blueTheme({display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.4px",color:"#a9742e"}, "surface", "event")}>TODAY · VIP EVENT</span>
                      <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:"13px",color:"#2f241b"}, "surface", "event")}>오늘의 참여 현황</strong>
                    </div>
                    <button type="button" onClick={()=>loadAutoEvents()} style={blueTheme({border:"1px solid #dfc9a8",borderRadius:"999px",padding:"5px 8px",background:"#fff",color:"#8a6a43",fontSize:"7px",fontWeight:"900",cursor:"pointer"}, "button", "event")}>새로고침</button>
                  </div>
                  <div style={blueTheme({display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"6px",marginTop:"10px"}, "surface", "event")}>
                    {[
                      ["오늘 이벤트", `${todayEventStats.total}회`],
                      ["내 참여", `${todayEventStats.participated}회`],
                      ["오늘 당첨", `${todayEventStats.wins}회`],
                      ["출석 진행", `${attendanceCycle}/10`],
                    ].map(([label,value])=>(
                      <div key={label} style={blueTheme({padding:"9px 5px",borderRadius:"11px",background:"#fff",border:"1px solid #eee0cc",textAlign:"center",minWidth:0}, "surface", "event")}>
                        <span style={blueTheme({display:"block",fontSize:"6.5px",color:"#99836a",fontWeight:"900",whiteSpace:"nowrap"}, "surface", "event")}>{label}</span>
                        <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:"12px",color:"#3c2b1e"}, "surface", "event")}>{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div style={blueTheme({marginTop:"8px",padding:"7px 9px",borderRadius:"10px",background:nextEventStatus.live?"#fff0ef":"#f5ead8",color:nextEventStatus.live?"#c92e28":"#805c2c",fontSize:"8px",fontWeight:"1000",textAlign:"center"}, "surface", "event")}>
                    {nextEventStatus.live ? "🔴 지금 이벤트 진행 중 · 아래에서 참여해주세요" : `🎁 ${nextEventStatus.text}`}
                  </div>
                </div>

                <div style={blueTheme(styles.vipPrizeGuide, "accentSurface", "event")}>
                  <div style={blueTheme(styles.vipPrizeGuideIcon, "surface", "event")}>🎁</div>
                  <div style={blueTheme(styles.vipPrizeGuideCopy, "surface", "event")}>
                    <span style={blueTheme({display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.5px",color:"#e2b762"}, "surface", "event")}>VIP EVENT REWARD</span>
                    <strong style={blueTheme({display:"block",marginTop:"3px",paddingRight:"32px",fontSize:"11px",lineHeight:1.45,color:"#fff4df"}, "surface", "event")}>3,000원 ~ 100,000원 상당 랜덤 기프티콘</strong>
                    <p style={blueTheme({margin:"4px 0 0",fontSize:"8px",lineHeight:1.5,color:"rgba(255,255,255,.65)",wordBreak:"keep-all"}, "surface", "event")}>이벤트 당첨 시 <b>카카오톡 1:1 고객센터</b>에서 기프티콘이 즉시 지급됩니다.</p>
                  </div>
                  <div style={blueTheme(styles.vipPrizeGuideBadge, "surface", "event")}>GIFT</div>
                </div>

                {profile?.role === "admin" && (
                  <div style={blueTheme(styles.giftAdminCard, "surface", "event")}>
                    <div style={blueTheme(styles.giftAdminHead, "surface", "event")}>
                      <div style={blueTheme({minWidth:0}, "surface", "event")}>
                        <span style={blueTheme({display:"block",fontSize:"6.5px",fontWeight:"1000",letterSpacing:"1.5px",color:"#d7a95b"}, "surface", "event")}>ADMIN · AI WINNER DISPLAY</span>
                        <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:"12px",color:"#fff3dc"}, "surface", "event")}>AI 당첨 그룹공지 전용 상품</strong>
                        <p style={blueTheme({margin:"5px 0 0",fontSize:"8px",lineHeight:1.55,color:"#a99a88",wordBreak:"keep-all"}, "surface", "event")}>
                          AI 캐릭터가 당첨될 때 그룹채팅 공지에 표시할 <b style={blueTheme({color:"#fff0ce"}, "surface", "event")}>상품명만</b> 등록합니다.<br/>
                          실제 기프티콘 링크·1:1 지급·회원용 재고와는 완전히 분리됩니다.
                        </p>
                      </div>
                    </div>

                    <div style={blueTheme(styles.giftInventorySummary, "surface", "event")}>
                      <div style={blueTheme(styles.giftSummaryCell, "surface", "event")}>
                        <span style={blueTheme({fontSize:"7px",fontWeight:"900",color:"#a99a88"}, "surface", "event")}>총 등록</span>
                        <strong style={blueTheme({fontSize:"19px",lineHeight:1.1,color:"#f0c777"}, "surface", "event")}>{aiGiftInventory.length}</strong>
                        <small style={blueTheme({fontSize:"5.5px",letterSpacing:"1px",color:"#756a5f"}, "surface", "event")}>ITEMS</small>
                      </div>
                      <div style={blueTheme(styles.giftSummaryDivider, "surface", "event")} />
                      <div style={blueTheme(styles.giftSummaryCell, "surface", "event")}>
                        <span style={blueTheme({fontSize:"7px",fontWeight:"900",color:"#a99a88"}, "surface", "event")}>공지완료</span>
                        <strong style={blueTheme({fontSize:"19px",lineHeight:1.1,color:"#a7cfaf"}, "surface", "event")}>{aiGiftInventory.filter((gift) => gift.status === "assigned").length}</strong>
                        <small style={blueTheme({fontSize:"5.5px",letterSpacing:"1px",color:"#756a5f"}, "surface", "event")}>USED</small>
                      </div>
                      <div style={blueTheme(styles.giftSummaryDivider, "surface", "event")} />
                      <div style={blueTheme(styles.giftSummaryCell, "surface", "event")}>
                        <span style={blueTheme({fontSize:"7px",fontWeight:"900",color:"#a99a88"}, "surface", "event")}>공지대기</span>
                        <strong style={blueTheme({fontSize:"19px",lineHeight:1.1,color:"#efc879"}, "surface", "event")}>{aiGiftInventory.filter((gift) => gift.status === "available").length}</strong>
                        <small style={blueTheme({fontSize:"5.5px",letterSpacing:"1px",color:"#756a5f"}, "surface", "event")}>WAITING</small>
                      </div>
                    </div>

                    <div style={blueTheme(styles.giftBulkGuide, "surface", "event")}>
                      <strong>메모장 입력 형식</strong>
                      <span>상품명만 한 줄에 1개 · 금액은 상품명에 함께 작성</span>
                      <code>GS25 모바일 3,000원</code>
                    </div>

                    <form onSubmit={addAiGiftInventoryBulk} style={blueTheme(styles.giftAdminForm, "surface", "event")}>
                      <textarea
                        value={aiGiftBulkText}
                        onChange={(e) => setAiGiftBulkText(e.target.value)}
                        placeholder={"GS25 모바일 3,000원\n신세계 상품권 1만원\n스타벅스 아메리카노 4,500원"}
                        style={blueTheme(styles.giftBulkTextarea, "surface", "event")}
                      />
                      <div style={blueTheme(styles.giftBulkCount, "surface", "event")}>
                        현재 입력 <b>{aiGiftBulkText.split(/\r?\n/).filter((line) => line.trim()).length}</b>개
                      </div>
                      <button type="submit" disabled={aiGiftWorking} style={blueTheme(styles.giftAdminAddButton, "button", "event")}>
                        {aiGiftWorking ? "등록 중..." : "🤖 AI 전용 상품 등록"}
                      </button>
                      <button
                        type="button"
                        disabled={aiGiftWorking || aiGiftInventory.filter((gift) => gift.status === "available").length === 0}
                        onClick={deleteAllAvailableAiGiftInventory}
                        style={blueTheme({
                          width:"100%",marginTop:"8px",padding:"11px 12px",
                          border:"1px solid rgba(255,82,82,.55)",borderRadius:"11px",
                          background:"rgba(151,28,28,.18)",color:"#ff8585",
                          fontSize:"9px",fontWeight:"1000",
                          cursor:aiGiftWorking || aiGiftInventory.filter((gift) => gift.status === "available").length === 0 ? "default" : "pointer",
                          opacity:aiGiftInventory.filter((gift) => gift.status === "available").length === 0 ? .45 : 1
                        }, "button", "event")}
                      >
                        🗑 AI 지급대기 상품 전체 삭제
                      </button>
                      <button type="button"
                        disabled={aiGiftWorking || aiGiftInventory.filter((gift) => gift.status === "assigned").length === 0}
                        onClick={deleteAllAssignedAiGiftInventory}
                        style={blueTheme({width:"100%",marginTop:"8px",padding:"11px 12px",border:"1px solid rgba(102,184,126,.55)",borderRadius:"11px",background:"rgba(34,105,59,.18)",color:"#9bd5aa",fontSize:"9px",fontWeight:"1000",cursor:aiGiftWorking || aiGiftInventory.filter((gift) => gift.status === "assigned").length === 0 ? "default" : "pointer",opacity:aiGiftInventory.filter((gift) => gift.status === "assigned").length === 0 ? .45 : 1}, "button", "event")}>
                        🧹 AI 공지완료 상품 전체 삭제
                      </button>
                    </form>

                    <div style={blueTheme(styles.giftQueueTitle, "surface", "event")}>
                      <div>
                        <strong style={blueTheme({display:"block"}, "surface", "event")}>AI 그룹공지 상품 현황</strong>
                        <span style={blueTheme({display:"block",marginTop:"2px"}, "surface", "event")}>AI 당첨 시 위에서부터 1개씩 그룹공지에 사용됩니다.</span>
                      </div>
                    </div>

                    <div style={blueTheme(styles.giftAdminInventoryList, "surface", "event")}>
                      {aiGiftInventory.length === 0 ? (
                        <div style={blueTheme(styles.giftAdminEmpty, "surface", "event")}>등록된 AI 전용 상품이 없습니다.</div>
                      ) : aiGiftInventory.slice(0, 100).map((gift) => (
                        <div key={gift.id} style={blueTheme(styles.giftAdminInventoryRow, "surface", "event")}>
                          <div style={blueTheme(gift.status === "available" ? styles.giftQueueNumber : styles.giftQueueNumberSent, "surface", "event")}>
                            {gift.status === "assigned" ? "✓" : `#${gift.queue_no || "-"}`}
                          </div>
                          <div style={blueTheme(styles.giftAdminInventoryInfo, "surface", "event")}>
                            <strong style={blueTheme({fontSize:"8.5px",color:"#f4e6cf",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}, "surface", "event")}>
                              {gift.product_name}
                            </strong>
                            <span style={blueTheme({fontSize:"7px",color:"#998b7b"}, "surface", "event")}>
                              {gift.status === "available" ? "AI 당첨 공지 대기" : `공지 사용 완료${gift.assigned_winner_nickname ? ` · ${gift.assigned_winner_nickname}` : ""}`}
                            </span>
                          </div>
                          <div style={blueTheme(styles.giftAdminInventoryActions, "surface", "event")}>
                            <span style={blueTheme(gift.status === "available" ? styles.giftStockAvailable : styles.giftStockAssigned, "surface", "event")}>
                              {gift.status === "available" ? "WAITING" : "USED"}
                            </span>
                            <button
                              type="button"
                              disabled={aiGiftWorking}
                              onClick={() => deleteAiGiftInventory(gift.id)}
                              style={blueTheme({border:0,background:"transparent",color:"#d58a82",fontSize:"12px",cursor:"pointer",padding:"2px 4px"}, "button", "event")}
                              aria-label="AI 전용 상품 삭제"
                            >×</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={blueTheme(styles.giftAdminSecurityNote, "surface", "event")}>
                      AI 전용 상품에는 실제 기프티콘 링크가 저장되지 않으며 회원용 기프티콘 재고를 차감하지 않습니다.
                    </div>
                  </div>
                )}

                {profile?.role === "admin" && (
                  <div style={blueTheme(styles.giftAdminCard, "surface", "event")}>
                    <div style={blueTheme(styles.giftAdminHead, "surface", "event")}>
                      <div style={blueTheme({minWidth:0}, "surface", "event")}>
                        <span style={blueTheme({display:"block",fontSize:"6.5px",fontWeight:"1000",letterSpacing:"1.5px",color:"#d7a95b"}, "surface", "event")}>ADMIN · AUTO GIFT QUEUE</span>
                        <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:"12px",color:"#fff3dc"}, "surface", "event")}>기프티콘 자동 지급 대기열</strong>
                        <p style={blueTheme({margin:"5px 0 0",fontSize:"8px",lineHeight:1.55,color:"#a99a88",wordBreak:"keep-all"}, "surface", "event")}>
                          메모장 목록을 한 번에 등록하면 <b style={blueTheme({color:"#e6c27e"}, "surface", "event")}>위에서부터 순서대로</b> 당첨자에게 자동 지급됩니다.<br/>
                          <b style={blueTheme({color:"#fff0ce"}, "surface", "event")}>일반 하루 이벤트 전용 재고</b> · 출석체크 보상에는 사용되지 않습니다.
                        </p>
                      </div>
                    </div>

                    <div style={blueTheme(styles.giftInventorySummary, "surface", "event")}>
                      <div style={blueTheme(styles.giftSummaryCell, "surface", "event")}>
                        <span style={blueTheme({fontSize:"7px",fontWeight:"900",color:"#a99a88"}, "surface", "event")}>총 등록</span>
                        <strong style={blueTheme({fontSize:"19px",lineHeight:1.1,color:"#f0c777"}, "surface", "event")}>{giftInventory.length}</strong>
                        <small style={blueTheme({fontSize:"5.5px",letterSpacing:"1px",color:"#756a5f"}, "surface", "event")}>GIFTS</small>
                      </div>
                      <div style={blueTheme(styles.giftSummaryDivider, "surface", "event")} />
                      <div style={blueTheme(styles.giftSummaryCell, "surface", "event")}>
                        <span style={blueTheme({fontSize:"7px",fontWeight:"900",color:"#a99a88"}, "surface", "event")}>지급완료</span>
                        <strong style={blueTheme({fontSize:"19px",lineHeight:1.1,color:"#a7cfaf"}, "surface", "event")}>{giftInventory.filter((gift) => gift.status === "assigned").length}</strong>
                        <small style={blueTheme({fontSize:"5.5px",letterSpacing:"1px",color:"#756a5f"}, "surface", "event")}>SENT</small>
                      </div>
                      <div style={blueTheme(styles.giftSummaryDivider, "surface", "event")} />
                      <div style={blueTheme(styles.giftSummaryCell, "surface", "event")}>
                        <span style={blueTheme({fontSize:"7px",fontWeight:"900",color:"#a99a88"}, "surface", "event")}>지급대기</span>
                        <strong style={blueTheme({fontSize:"19px",lineHeight:1.1,color:"#efc879"}, "surface", "event")}>{giftInventory.filter((gift) => gift.status === "available").length}</strong>
                        <small style={blueTheme({fontSize:"5.5px",letterSpacing:"1px",color:"#756a5f"}, "surface", "event")}>WAITING</small>
                      </div>
                    </div>

                    <div style={blueTheme(styles.giftBulkGuide, "surface", "event")}>
                      <strong>메모장 입력 형식</strong>
                      <span>상품명 | 기프티콘 링크 · 한 줄에 1개 · 여러 줄 한 번에 등록 가능</span>
                      <code>신세계 상품권 1만원 | https://기프티콘링크</code>
                    </div>

                    <form onSubmit={addGiftInventoryBulk} style={blueTheme(styles.giftAdminForm, "surface", "event")}>
                      <textarea
                        value={giftBulkText}
                        onChange={(e) => setGiftBulkText(e.target.value)}
                        placeholder={"신세계 상품권 1만원 | https://링크1\nGS25 모바일 3,000원 | https://링크2\nCU 모바일 5,000원 | https://링크3"}
                        style={blueTheme(styles.giftBulkTextarea, "surface", "event")}
                      />
                      <div style={blueTheme(styles.giftBulkCount, "surface", "event")}>
                        현재 입력 <b>{giftBulkText.split(/\r?\n/).filter((line) => line.trim()).length}</b>개
                      </div>
                      <button type="submit" disabled={giftInventoryWorking} style={blueTheme(styles.giftAdminAddButton, "button", "event")}>
                        {giftInventoryWorking ? "일괄 등록 중..." : "🎁 목록 전체 일괄 등록"}
                      </button>
                      <button
                        type="button"
                        disabled={giftInventoryWorking || giftInventory.filter((gift) => gift.status === "available").length === 0}
                        onClick={deleteAllGiftInventory}
                        style={blueTheme({
                          width:"100%",
                          marginTop:"8px",
                          padding:"11px 12px",
                          border:"1px solid rgba(255,82,82,.55)",
                          borderRadius:"11px",
                          background:"rgba(151,28,28,.18)",
                          color:"#ff8585",
                          fontSize:"9px",
                          fontWeight:"1000",
                          cursor:giftInventoryWorking || giftInventory.filter((gift) => gift.status === "available").length === 0 ? "default" : "pointer",
                          opacity:giftInventory.filter((gift) => gift.status === "available").length === 0 ? .45 : 1
                        }, "button", "event")}
                      >
                        🗑 지급대기 기프티콘 전체 삭제
                      </button>
                      <button type="button"
                        disabled={giftInventoryWorking || giftInventory.filter((gift) => gift.status === "assigned").length === 0}
                        onClick={deleteAllAssignedGiftInventory}
                        style={blueTheme({width:"100%",marginTop:"8px",padding:"11px 12px",border:"1px solid rgba(102,184,126,.55)",borderRadius:"11px",background:"rgba(34,105,59,.18)",color:"#9bd5aa",fontSize:"9px",fontWeight:"1000",cursor:giftInventoryWorking || giftInventory.filter((gift) => gift.status === "assigned").length === 0 ? "default" : "pointer",opacity:giftInventory.filter((gift) => gift.status === "assigned").length === 0 ? .45 : 1}, "button", "event")}>
                        🧹 지급완료 기프티콘 전체 삭제
                      </button>
                    </form>

                    <div style={blueTheme(styles.giftQueueTitle, "surface", "event")}>
                      <div>
                        <strong style={blueTheme({display:"block"}, "surface", "event")}>자동 지급 현황</strong>
                        <span style={blueTheme({display:"block",marginTop:"2px"}, "surface", "event")}>지급완료 내역과 남은 재고를 한눈에 확인할 수 있습니다.</span>
                      </div>
                      <div style={blueTheme(styles.giftNextQueueBadge, "surface", "event")}>
                        NEXT&nbsp;
                        <b>
                          #{giftInventory.find((gift) => gift.status === "available")?.queue_no || "-"}
                        </b>
                      </div>
                    </div>

                    <div style={blueTheme(styles.giftAdminInventoryList, "surface", "event")}>
                      {giftInventory.length === 0 ? (
                        <div style={blueTheme(styles.giftAdminEmpty, "surface", "event")}>
                          등록된 기프티콘이 없습니다. 메모장 목록을 위 입력란에 붙여넣어 한 번에 등록해주세요.
                        </div>
                      ) : giftInventory.slice(0, 100).map((gift) => (
                        <div key={gift.id} style={blueTheme(styles.giftAdminInventoryRow, "surface", "event")}>
                          <div style={blueTheme(gift.status === "available" ? styles.giftQueueNumber : styles.giftQueueNumberSent, "surface", "event")}>
                            {gift.status === "assigned" ? "✓" : `#${gift.queue_no || "-"}`}
                          </div>
                          <div style={blueTheme(styles.giftAdminInventoryInfo, "surface", "event")}>
                            <div style={blueTheme(styles.giftInventoryNameLine, "surface", "event")}>
                              <strong style={blueTheme({fontSize:"8.5px",color:"#f4e6cf",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}, "surface", "event")}>
                                #{gift.queue_no || "-"} · {gift.product_name}
                              </strong>
                            </div>
                            {gift.status === "assigned" ? (
                              <>
                                <span style={blueTheme(styles.giftPaidMember, "surface", "event")}>
                                  👤 {gift.assigned_member_nickname || "회원"} · {Number(gift.amount || 0).toLocaleString("ko-KR")}원
                                </span>
                                <span style={blueTheme(styles.giftPaidTime, "surface", "event")}>
                                  {gift.assigned_at ? `${new Date(gift.assigned_at).toLocaleString("ko-KR")} 지급` : "지급완료"}
                                </span>
                              </>
                            ) : (
                              <span style={blueTheme(styles.giftWaitingDetail, "surface", "event")}>
                                {Number(gift.amount || 0).toLocaleString("ko-KR")}원 · 순차 자동지급 대기
                              </span>
                            )}
                          </div>
                          <div style={blueTheme(styles.giftAdminInventoryActions, "surface", "event")}>
                            <span style={blueTheme(gift.status === "available" ? styles.giftStockAvailable : styles.giftStockAssigned, "surface", "event")}>
                              {gift.status === "available" ? "WAITING" : "지급완료"}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteGiftInventory(gift.id, gift.status)}
                              title={gift.status === "assigned" ? "지급완료 내역 삭제 · 동일 링크 재등록 가능" : "미지급 기프티콘 삭제"}
                              style={blueTheme({
                                width:"20px",
                                height:"20px",
                                border:"1px solid rgba(255,83,83,.42)",
                                borderRadius:"50%",
                                padding:0,
                                background:"rgba(190,35,35,.14)",
                                color:"#ff6767",
                                fontSize:"11px",
                                fontWeight:"1000",
                                lineHeight:1,
                                display:"inline-flex",
                                alignItems:"center",
                                justifyContent:"center",
                                cursor:"pointer",
                                flex:"0 0 20px"
                              }, "button", "event")}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={blueTheme(styles.giftAdminSecurityNote, "surface", "event")}>
                      🔒 지급완료 링크는 자동으로 다시 지급되지 않습니다. 관리자가 <b style={blueTheme({color:"#ff6767"}, "surface", "event")}>×</b>로 지급완료 내역을 삭제하면 동일 링크를 다시 등록할 수 있습니다. 이미 회원에게 지급된 1:1 메시지는 유지됩니다.
                    </div>
                  </div>
                )}

                {profile?.role === "admin" && (
                  <div style={blueTheme({
                    ...styles.giftAdminCard,
                    marginTop:"12px",
                    border:"1px solid rgba(206,161,79,.55)",
                    background:"linear-gradient(180deg,#192d3d 0%,#102230 100%)"
                  }, "accentSurface", "event")}>
                    <div style={blueTheme(styles.giftAdminHead, "surface", "event")}>
                      <div style={blueTheme({minWidth:0}, "surface", "event")}>
                        <span style={blueTheme({display:"block",fontSize:"6.5px",fontWeight:"1000",letterSpacing:"1.5px",color:"#f0c777"}, "surface", "event")}>
                          ADMIN · DAILY CHECK-IN GIFT
                        </span>
                        <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:"12px",color:"#fff3dc"}, "surface", "event")}>
                          🎁 출석체크 10회 보상 전용 기프티콘
                        </strong>
                        <p style={blueTheme({margin:"5px 0 0",fontSize:"8px",lineHeight:1.6,color:"#b9aa96",wordBreak:"keep-all"}, "surface", "event")}>
                          이곳에 등록한 기프티콘은 <b style={blueTheme({color:"#f1cc82"}, "surface", "event")}>출석 10회 · 20회 · 30회...</b> 달성 회원에게만 지급됩니다.<br/>
                          <b style={blueTheme({color:"#fff0ce"}, "surface", "event")}>일반 하루 이벤트 기프티콘과 완전히 분리된 별도 재고</b>입니다.
                        </p>
                      </div>
                    </div>

                    <div style={blueTheme(styles.giftInventorySummary, "surface", "event")}>
                      <div style={blueTheme(styles.giftSummaryCell, "surface", "event")}>
                        <span style={blueTheme({fontSize:"7px",fontWeight:"900",color:"#a99a88"}, "surface", "event")}>총 등록</span>
                        <strong style={blueTheme({fontSize:"19px",lineHeight:1.1,color:"#f0c777"}, "surface", "event")}>{attendanceGiftInventory.length}</strong>
                        <small style={blueTheme({fontSize:"5.5px",letterSpacing:"1px",color:"#756a5f"}, "surface", "event")}>CHECK-IN</small>
                      </div>
                      <div style={blueTheme(styles.giftSummaryDivider, "surface", "event")} />
                      <div style={blueTheme(styles.giftSummaryCell, "surface", "event")}>
                        <span style={blueTheme({fontSize:"7px",fontWeight:"900",color:"#a99a88"}, "surface", "event")}>지급완료</span>
                        <strong style={blueTheme({fontSize:"19px",lineHeight:1.1,color:"#a7cfaf"}, "surface", "event")}>
                          {attendanceGiftInventory.filter((gift) => gift.status === "assigned").length}
                        </strong>
                        <small style={blueTheme({fontSize:"5.5px",letterSpacing:"1px",color:"#756a5f"}, "surface", "event")}>SENT</small>
                      </div>
                      <div style={blueTheme(styles.giftSummaryDivider, "surface", "event")} />
                      <div style={blueTheme(styles.giftSummaryCell, "surface", "event")}>
                        <span style={blueTheme({fontSize:"7px",fontWeight:"900",color:"#a99a88"}, "surface", "event")}>지급대기</span>
                        <strong style={blueTheme({fontSize:"19px",lineHeight:1.1,color:"#efc879"}, "surface", "event")}>
                          {attendanceGiftInventory.filter((gift) => gift.status === "available").length}
                        </strong>
                        <small style={blueTheme({fontSize:"5.5px",letterSpacing:"1px",color:"#756a5f"}, "surface", "event")}>WAITING</small>
                      </div>
                    </div>

                    <div style={blueTheme(styles.giftBulkGuide, "surface", "event")}>
                      <strong>출석체크 전용 입력 형식</strong>
                      <span>상품명 | 기프티콘 링크 · 한 줄에 1개 · 여러 줄 한 번에 등록 가능</span>
                      <code>신세계 상품권 1만원 | https://출석보상링크</code>
                    </div>

                    <form onSubmit={addAttendanceGiftInventoryBulk} style={blueTheme(styles.giftAdminForm, "surface", "event")}>
                      <textarea
                        value={attendanceGiftBulkText}
                        onChange={(e) => setAttendanceGiftBulkText(e.target.value)}
                        placeholder={"신세계 상품권 1만원 | https://출석링크1\nGS25 모바일 3,000원 | https://출석링크2\nCU 모바일 5,000원 | https://출석링크3"}
                        style={blueTheme(styles.giftBulkTextarea, "surface", "event")}
                      />
                      <div style={blueTheme(styles.giftBulkCount, "surface", "event")}>
                        현재 입력 <b>{String(attendanceGiftBulkText || "").replace(/\u2028|\u2029/g, "\n").replace(/\r\n?/g, "\n").split("\n").filter((line) => line.trim()).length}</b>개
                      </div>
                      <button type="submit" disabled={attendanceGiftWorking} style={blueTheme({
                        ...styles.giftAdminAddButton,
                        background:"linear-gradient(135deg,#d9a94e,#f0cd82)",
                        color:"#30210d"
                      }, "button", "event")}>
                        {attendanceGiftWorking ? "출석 보상 등록 중..." : "🎁 출석체크 보상 일괄 등록"}
                      </button>
                      <button
                        type="button"
                        disabled={attendanceGiftWorking || attendanceGiftInventory.filter((gift) => gift.status === "available").length === 0}
                        onClick={deleteAllAttendanceGiftInventory}
                        style={blueTheme({
                          width:"100%",
                          marginTop:"8px",
                          padding:"11px 12px",
                          border:"1px solid rgba(255,82,82,.55)",
                          borderRadius:"11px",
                          background:"rgba(151,28,28,.18)",
                          color:"#ff8585",
                          fontSize:"9px",
                          fontWeight:"1000",
                          cursor:attendanceGiftWorking || attendanceGiftInventory.filter((gift) => gift.status === "available").length === 0 ? "default" : "pointer",
                          opacity:attendanceGiftInventory.filter((gift) => gift.status === "available").length === 0 ? .45 : 1
                        }, "button", "event")}
                      >
                        🗑 출석체크 지급대기 전체 삭제
                      </button>
                      <button type="button"
                        disabled={attendanceGiftWorking || attendanceGiftInventory.filter((gift) => gift.status === "assigned").length === 0}
                        onClick={deleteAllAssignedAttendanceGiftInventory}
                        style={blueTheme({width:"100%",marginTop:"8px",padding:"11px 12px",border:"1px solid rgba(102,184,126,.55)",borderRadius:"11px",background:"rgba(34,105,59,.18)",color:"#9bd5aa",fontSize:"9px",fontWeight:"1000",cursor:attendanceGiftWorking || attendanceGiftInventory.filter((gift) => gift.status === "assigned").length === 0 ? "default" : "pointer",opacity:attendanceGiftInventory.filter((gift) => gift.status === "assigned").length === 0 ? .45 : 1}, "button", "event")}>
                        🧹 출석체크 지급완료 전체 삭제
                      </button>
                    </form>

                    <div style={blueTheme(styles.giftQueueTitle, "surface", "event")}>
                      <div>
                        <strong style={blueTheme({display:"block"}, "surface", "event")}>출석체크 보상 재고 현황</strong>
                        <span style={blueTheme({display:"block",marginTop:"2px"}, "surface", "event")}>10회 단위 달성자에게 이 재고에서만 자동 지급됩니다.</span>
                      </div>
                      <div style={blueTheme(styles.giftNextQueueBadge, "surface", "event")}>
                        NEXT&nbsp;
                        <b>#{attendanceGiftInventory.find((gift) => gift.status === "available")?.queue_no || "-"}</b>
                      </div>
                    </div>

                    <div style={blueTheme(styles.giftAdminInventoryList, "surface", "event")}>
                      {attendanceGiftInventory.length === 0 ? (
                        <div style={blueTheme(styles.giftAdminEmpty, "surface", "event")}>
                          출석체크 전용 기프티콘이 없습니다. 위 입력란에 여러 개를 미리 등록해주세요.
                        </div>
                      ) : attendanceGiftInventory.slice(0, 100).map((gift) => (
                        <div key={gift.id} style={blueTheme(styles.giftAdminInventoryRow, "surface", "event")}>
                          <div style={blueTheme(gift.status === "available" ? styles.giftQueueNumber : styles.giftQueueNumberSent, "surface", "event")}>
                            {gift.status === "assigned" ? "✓" : `#${gift.queue_no || "-"}`}
                          </div>
                          <div style={blueTheme(styles.giftAdminInventoryInfo, "surface", "event")}>
                            <div style={blueTheme(styles.giftInventoryNameLine, "surface", "event")}>
                              <strong style={blueTheme({fontSize:"8.5px",color:"#f4e6cf",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}, "surface", "event")}>
                                #{gift.queue_no || "-"} · {gift.product_name}
                              </strong>
                            </div>
                            {gift.status === "assigned" ? (
                              <>
                                <span style={blueTheme(styles.giftPaidMember, "surface", "event")}>
                                  👤 {gift.assigned_member_nickname || "회원"} · {Number(gift.amount || 0).toLocaleString("ko-KR")}원
                                </span>
                                <span style={blueTheme(styles.giftPaidTime, "surface", "event")}>
                                  {gift.assigned_at ? `${new Date(gift.assigned_at).toLocaleString("ko-KR")} 지급` : "지급완료"}
                                </span>
                              </>
                            ) : (
                              <span style={blueTheme(styles.giftWaitingDetail, "surface", "event")}>
                                {Number(gift.amount || 0).toLocaleString("ko-KR")}원 · 출석 10회 보상 대기
                              </span>
                            )}
                          </div>
                          <div style={blueTheme(styles.giftAdminInventoryActions, "surface", "event")}>
                            <span style={blueTheme(gift.status === "available" ? styles.giftStockAvailable : styles.giftStockAssigned, "surface", "event")}>
                              {gift.status === "available" ? "WAITING" : "지급완료"}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteAttendanceGiftInventory(gift.id, gift.status)}
                              style={blueTheme({
                                width:"20px",height:"20px",border:"1px solid rgba(255,83,83,.42)",
                                borderRadius:"50%",padding:0,background:"rgba(190,35,35,.14)",
                                color:"#ff6767",fontSize:"11px",fontWeight:"1000",lineHeight:1,
                                display:"inline-flex",alignItems:"center",justifyContent:"center",
                                cursor:"pointer",flex:"0 0 20px"
                              }, "button", "event")}
                            >×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {eventView === "attendance" && <>
                <div style={blueTheme(styles.dailyAttendanceCard, "accentSurface", "attendance")}>
                  <div style={blueTheme(styles.dailyAttendanceTop, "surface", "attendance")}>
                    <div>
                      <span style={blueTheme(styles.dailyAttendanceEyebrow, "surface", "attendance")}>VIP DAILY CHECK-IN</span>
                      <strong style={blueTheme(styles.dailyAttendanceTitle, "surface", "attendance")}>매일 출석 혜택</strong>
                      <p style={blueTheme(styles.dailyAttendanceDesc, "surface", "attendance")}>
                        하루 1회 출석할 수 있으며, <b>10회 출석 달성 시 3,000원 ~ 200,000원 상당 랜덤 기프티콘이 카카오톡 1:1 고객센터에서 즉시 지급됩니다.</b>
                      </p>
                    </div>
                    <div style={blueTheme(styles.dailyAttendanceCount, "surface", "attendance")}>
                      <b>{getAttendanceCycleCount()}</b>
                      <span>/ 10</span>
                    </div>
                  </div>

                  <div style={blueTheme(styles.dailyAttendanceProgress, "surface", "attendance")}>
                    <div
                      style={blueTheme({
                        ...styles.dailyAttendanceProgressFill,
                        width: `${Math.min(100, (attendanceCycle / 10) * 100)}%`,
                      }, "surface", "attendance")}
                    />
                  </div>
                  <div style={blueTheme({display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:"4px",marginTop:"8px"}, "surface", "attendance")}>
                    {Array.from({length:10}).map((_,index)=>(
                      <span key={index} style={blueTheme({height:"7px",borderRadius:"999px",background:index < attendanceCycle?"#d99d3c":"#eadfce",boxShadow:index < attendanceCycle?"0 1px 4px rgba(180,120,35,.22)":"none"}, "surface", "attendance")} />
                    ))}
                  </div>
                  <div style={blueTheme({marginTop:"8px",fontSize:"9px",fontWeight:"1000",color:attendanceRemaining===0?"#16834f":"#8a5d24"}, "surface", "attendance")}>
                    {attendanceRemaining === 0 ? "🎉 출석 보상 달성!" : `🎁 보상까지 ${attendanceRemaining}회 남았어요!`}
                  </div>

                  <div style={blueTheme(styles.dailyAttendanceBottom, "surface", "attendance")}>
                    <div>
                      <strong style={blueTheme({display:"block",fontSize:"10px",color:"#4a3422"}, "surface", "attendance")}>{attendanceStatus.checked_today ? "✓ 오늘 출석 완료" : "오늘의 출석을 완료해주세요"}</strong>
                      <span style={blueTheme({display:"block",marginTop:"3px",fontSize:"7.5px",lineHeight:1.45,color:"#8d7862"}, "surface", "attendance")}>
                        {attendanceStatus.reward_ready && attendanceStatus.checked_today
                          ? "10회 출석 달성 · 랜덤 기프티콘이 카카오톡 1:1 고객센터로 자동 지급됩니다."
                          : getAttendanceCycleCount() === 0
                            ? "새로운 10회 출석이 시작됩니다. 오늘부터 다시 1회 출석할 수 있습니다."
                            : `현재 ${getAttendanceCycleCount()}/10 · 10회 달성마다 랜덤 기프티콘이 자동 지급됩니다.`}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={attendanceWorking || attendanceStatus.checked_today}
                      onClick={checkDailyAttendance}
                      style={blueTheme({
                        ...styles.dailyAttendanceButton,
                        minWidth:"116px",
                        padding:"13px 18px",
                        borderRadius:"14px",
                        border: attendanceStatus.checked_today
                          ? "1px solid #9eabb8"
                          : "1px solid #1768d8",
                        background: attendanceStatus.checked_today
                          ? "#d9e0e7"
                          : "linear-gradient(135deg,#2388ff 0%,#0867df 55%,#0453bd 100%)",
                        color: attendanceStatus.checked_today ? "#56616d" : "#ffffff",
                        fontSize:"11px",
                        fontWeight:"1000",
                        letterSpacing:"-.2px",
                        textShadow: attendanceStatus.checked_today ? "none" : "0 1px 2px rgba(0,0,0,.18)",
                        boxShadow: attendanceStatus.checked_today
                          ? "none"
                          : "0 5px 14px rgba(8,103,223,.28)",
                        transition:"filter .12s ease, transform .12s ease",
                        cursor: attendanceWorking || attendanceStatus.checked_today ? "default" : "pointer",
                        opacity: attendanceWorking ? .72 : 1,
                      }, "button", "attendance")}
                      onMouseEnter={(e) => {
                        if (!attendanceWorking && !attendanceStatus.checked_today) {
                          e.currentTarget.style.filter = "brightness(1.09)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!attendanceWorking && !attendanceStatus.checked_today) {
                          e.currentTarget.style.filter = "none";
                        }
                      }}
                    >
                      {attendanceWorking ? "처리 중" : attendanceStatus.checked_today ? "✓ 오늘 출석 완료" : "📅 오늘 출석하기"}
                    </button>
                  </div>
                  <div style={blueTheme(styles.dailyAttendanceFoot, "surface", "attendance")}>
                    ※ 출석 혜택 지급은 10회 달성 확인 후 카카오톡 1:1 고객센터를 통해 안내됩니다.
                  </div>
                </div>

                </>}

                {eventView === "live" && <>
                {featuredEvent && (
                  <div style={blueTheme({...styles.refHeroEvent, backgroundImage:eventHeroBackground(featuredEvent.event_type)}, "accentSurface", `event:${featuredEvent.event_type}`)}>
                    <div style={blueTheme(styles.refHeroEventTop, "surface", `event:${featuredEvent.event_type}`)}>
                      <span>{activeEvent ? "◆ LIVE" : "◆ NEXT"}</span>
                      <b>⏱ {formatEventTime(featuredEvent.starts_at)} ~ {formatEventTime(featuredEvent.ends_at)}</b>
                    </div>
                    <div style={blueTheme(styles.refHeroEventMain, "surface", `event:${featuredEvent.event_type}`)}>
                      <div style={blueTheme(styles.refEventArtwork, "surface", "event")}>
                        <div style={blueTheme(styles.refEventArtworkHalo, "surface", "event")}></div>
                        <div style={blueTheme(styles.refHeroTarget, "surface", "event")}>{eventIcon(featuredEvent.event_type)}</div>
                        <span>VIP</span>
                      </div>
                      <div style={blueTheme({position:"relative",zIndex:2}, "surface", "event")}>
                        <strong style={blueTheme({fontSize:"20px"}, "surface", "event")}>{featuredEvent.title}</strong>
                        <p style={blueTheme({margin:"6px 0 0",lineHeight:1.55,color:"#f0dfd1"}, "surface", "event")}>{featuredEvent.description}</p>
                      </div>
                    </div>
                    {activeEvent && !featuredEvent.participated ? (
                      <button
                        type="button"
                        onClick={() => document.getElementById(`ref-event-${featuredEvent.event_id}`)?.scrollIntoView({behavior:"smooth"})}
                        style={blueTheme({
                          display:"inline-flex",
                          alignItems:"center",
                          justifyContent:"center",
                          gap:"7px",
                          minWidth:"148px",
                          padding:"12px 18px",
                          marginTop:"10px",
                          border:"1px solid rgba(255,255,255,.34)",
                          borderRadius:"14px",
                          background:"linear-gradient(135deg,#ffcf54 0%,#f5a623 52%,#e57b16 100%)",
                          color:"#2f1a05",
                          fontSize:"11px",
                          fontWeight:"1000",
                          letterSpacing:"-.15px",
                          textShadow:"0 1px 0 rgba(255,255,255,.35)",
                          boxShadow:"0 6px 16px rgba(226,126,18,.30), inset 0 1px 0 rgba(255,255,255,.55)",
                          cursor:"pointer",
                          transition:"filter .12s ease, transform .12s ease"
                        }, "button", "event")}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.filter = "brightness(1.08)";
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.filter = "none";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <span style={blueTheme({fontSize:"14px",lineHeight:1}, "buttonChild", "event")}>
                          {eventIcon(featuredEvent.event_type)}
                        </span>
                        <span>이벤트 참여하기</span>
                        <span style={blueTheme({fontSize:"13px",lineHeight:1}, "buttonChild", "event")}>›</span>
                      </button>
                    ) : (
                      <div style={blueTheme(styles.refHeroDisabled, "surface", "event")}>{featuredEvent.participated ? "✓ 참여 완료" : "시작 대기 중"}</div>
                    )}
                  </div>
                )}

                <div style={blueTheme(styles.refSectionTitle, "surface", "event")}>
                  <div><strong>실시간 이벤트</strong><span>매 정각 시작 · 1시간 참여 · 마감 후 당첨 발표</span></div>
                  <small>{autoEvents.length}개 회차</small>
                </div>

                <div style={blueTheme(styles.refEventList, "surface", "event")}>
                  {getSortedAutoEvents().map((item) => {
                    const active = item.status === "active";
                    const done = item.status === "completed";
                    const participated = Boolean(item.participated);
                    return (
                      <div
                        id={`ref-event-${item.event_id}`}
                        key={item.event_id}
                        style={blueTheme({
                          ...styles.refEventRow,
                          ...(active ? styles.refEventRowActive : {})
                        }, "surface", "event")}
                      >
                        <div style={blueTheme(styles.refEventMain, "surface", "event")}>
                          <div style={blueTheme(styles.refRound, "surface", "event")}>{item.round_number}<span>회</span></div>
                          <div style={blueTheme(styles.refEventIcon, "surface", "event")}>{eventIcon(item.event_type)}</div>

                          <div style={blueTheme(styles.refEventInfo, "surface", "event")}>
                            <small>{formatEventTime(item.starts_at)} ~ {formatEventTime(item.ends_at)}</small>
                            <strong>{item.title}</strong>
                            {active && !participated && (
                              <div style={blueTheme(styles.refInlineGame, "surface", "event")}>{renderEventGame(item, active, participated)}</div>
                            )}
                          </div>

                          {item.winner_nickname && (
                            <div style={blueTheme(styles.refWinnerBadge, "surface", "event")}>
                              <span>🏆 당첨</span>
                              <strong>{item.winner_nickname}</strong>
                            </div>
                          )}
                        </div>

                        <div style={blueTheme(styles.refEventActions, "surface", "event")}>
                          <div
                            style={blueTheme({
                              ...styles.refStatus,
                              ...(participated
                                ? styles.refStatusParticipated
                                : active
                                  ? styles.refStatusLive
                                  : done
                                    ? styles.refStatusDone
                                    : styles.refStatusWait)
                            }, "surface", "event")}
                          >
                            {participated ? "참여완료" : active ? "진행중" : done ? "종료" : "대기"}
                          </div>

                          {profile?.role === "admin" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAdminEventEntries(item);
                              }}
                              style={blueTheme(styles.adminEventEntriesButton, "button", "event")}
                            >
                              👥 참여자
                            </button>
                          )}

                          <div style={blueTheme(styles.refChevron, "surface", "event")}>›</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>}
                {notice && <div style={blueTheme(styles.refNotice, "surface", "event")}>{notice}</div>}
              </div>
            )}

            {chatTab === "ai" && (
              <div style={blueTheme(styles.refAiScreen, "surface", "ai")}>
                {profile?.role === "admin" ? (
                  <div style={blueTheme({marginBottom:"14px"}, "surface", "ai")}>
                    <div style={blueTheme({
                      padding:"18px 15px",borderRadius:"23px",
                      background:"linear-gradient(145deg,#101923,#172a3c 55%,#0c141c)",
                      border:"1px solid rgba(224,184,104,.44)",boxShadow:"0 15px 36px rgba(15,25,35,.2)",color:"#fff"
                    }, "accentSurface", "ai")}>
                      <div style={blueTheme({display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"10px"}, "surface", "ai")}>
                        <div>
                          <span style={blueTheme({display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.8px",color:"#dfba72"}, "surface", "ai")}>AI PROCESS · ADMIN CONTROL</span>
                          <strong style={blueTheme({display:"block",marginTop:"4px",fontSize:"19px"}, "surface", "ai")}>회원별 진행 관리</strong>
                          <span style={blueTheme({display:"block",marginTop:"5px",fontSize:"8px",lineHeight:1.5,color:"rgba(255,255,255,.56)"}, "surface", "ai")}>회원마다 진행 가능 횟수 · 투자금 · 목표수익률 · 상태를 개별 설정합니다.</span>
                        </div>
                        <div style={blueTheme({padding:"6px 9px",borderRadius:"999px",fontSize:"7px",fontWeight:"1000",color:"#f0ca7f",border:"1px solid rgba(224,184,104,.28)"}, "surface", "ai")}>
                          ADMIN
                        </div>
                      </div>

                      <input
                        value={aiAdminSearch}
                        onChange={(e)=>setAiAdminSearch(e.target.value)}
                        placeholder="회원 닉네임 또는 성함 검색"
                        style={blueTheme({width:"100%",boxSizing:"border-box",marginTop:"14px",padding:"11px 12px",borderRadius:"12px",border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.07)",color:"#fff",outline:"none",fontSize:"10px"}, "surface", "ai")}
                      />

                      <div style={blueTheme({marginTop:"10px",maxHeight:"230px",overflowY:"auto",borderRadius:"14px",border:"1px solid rgba(255,255,255,.08)"}, "surface", "ai")}>
                        {aiAdminRows
                          .filter((member)=>{
                            const q=aiAdminSearch.trim().toLowerCase();
                            return !q || String(member.nickname||"").toLowerCase().includes(q) || String(member.real_name||"").toLowerCase().includes(q);
                          })
                          .map((member)=>{
                            const active=aiAdminSelectedId===member.id;
                            const row=member.process||{};
                            return (
                              <button key={member.id} type="button" onClick={()=>fillAiAdminForm(member)}
                                style={blueTheme({width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",padding:"10px 11px",border:0,borderBottom:"1px solid rgba(255,255,255,.07)",background:active?"rgba(225,181,94,.15)":"transparent",color:"#fff",cursor:"pointer",textAlign:"left"}, "button", "ai")}>
                                <div style={blueTheme({minWidth:0}, "buttonChild", "ai")}>
                                  <strong style={blueTheme({display:"block",fontSize:"10px"}, "buttonChild", "ai")}>{member.nickname || "VIP 회원"} <span style={blueTheme({fontSize:"7px",color:"rgba(255,255,255,.42)"}, "buttonChild", "ai")}>{member.real_name || ""}</span></strong>
                                  <span style={blueTheme({display:"block",marginTop:"3px",fontSize:"7px",color:"rgba(255,255,255,.48)"}, "buttonChild", "ai")}>
                                    가능 {Number(row.available_count||0)}회 · {aiProcessStatusLabel(row.status, row.available_count)}
                                  </span>
                                </div>
                                <span style={blueTheme({flex:"0 0 auto",padding:"5px 7px",borderRadius:"999px",fontSize:"7px",fontWeight:"1000",color:row.status==="running"?"#bff6d8":"#e8c985",background:row.status==="running"?"rgba(48,167,103,.15)":"rgba(225,181,94,.09)",border:"1px solid rgba(255,255,255,.08)"}, "buttonChild", "ai")}>
                                  {aiProcessStatusLabel(row.status, row.available_count)}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </div>

                        
                    {aiAdminSelectedId && (
                      <div style={blueTheme({marginTop:"10px",padding:"16px 14px",borderRadius:"21px",background:"linear-gradient(180deg,#fffdf8,#f7efe3)",border:"1px solid #e7d4b5",boxShadow:"0 9px 24px rgba(73,52,29,.08)"}, "accentSurface", "ai")}>
                        <div style={blueTheme({display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px"}, "surface", "ai")}>
                          <div>
                            <span style={blueTheme({display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.4px",color:"#9a6b29"}, "surface", "ai")}>MEMBER SETTING</span>
                            <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:"15px",color:"#34291f"}, "surface", "ai")}>
                              {aiAdminRows.find((m)=>m.id===aiAdminSelectedId)?.nickname || "선택 회원"} 설정
                            </strong>
                          </div>
                          <span style={blueTheme({padding:"6px 8px",borderRadius:"10px",background:"#2a2119",color:"#e9c475",fontSize:"8px",fontWeight:"1000"}, "surface", "ai")}>
                            {aiProcessStatusLabel(aiAdminForm.status, aiAdminForm.available_count)}
                          </span>
                        </div>

                        <div style={blueTheme({display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"13px"}, "surface", "ai")}>
                          <label style={blueTheme({display:"flex",flexDirection:"column",gap:"5px",fontSize:"8px",fontWeight:"900",color:"#755c43"}, "surface", "ai")}>
                            진행 가능한 횟수
                            <input type="number" min="0" step="1" value={aiAdminForm.available_count}
                              onChange={(e)=>setAiAdminForm((v)=>({...v,available_count:e.target.value}))}
                              style={blueTheme({width:"100%",boxSizing:"border-box",padding:"11px",borderRadius:"11px",border:"1px solid #dfd0bb",background:"#fff",fontWeight:"900",outline:"none"}, "surface", "ai")}/>
                          </label>
                          <label style={blueTheme({display:"flex",flexDirection:"column",gap:"5px",fontSize:"8px",fontWeight:"900",color:"#755c43"}, "surface", "ai")}>
                            투자금액 (원)
                            <input type="number" min="0" step="10000" value={aiAdminForm.investment_amount}
                              onChange={(e)=>setAiAdminForm((v)=>({...v,investment_amount:e.target.value}))}
                              style={blueTheme({width:"100%",boxSizing:"border-box",padding:"11px",borderRadius:"11px",border:"1px solid #dfd0bb",background:"#fff",fontWeight:"900",outline:"none"}, "surface", "ai")}/>
                          </label>
                          <label style={blueTheme({display:"flex",flexDirection:"column",gap:"5px",fontSize:"8px",fontWeight:"900",color:"#755c43"}, "surface", "ai")}>
                            예상 진행기간 (일)
                            <input type="number" min="1" max="30" step="1" value={aiAdminForm.duration_days}
                              onChange={(e)=>setAiAdminForm((v)=>({...v,duration_days:e.target.value}))}
                              style={blueTheme({width:"100%",boxSizing:"border-box",padding:"11px",borderRadius:"11px",border:"1px solid #dfd0bb",background:"#fff",fontWeight:"900",outline:"none"}, "surface", "ai")}/>
                            <span style={blueTheme({fontSize:"7px",fontWeight:"700",color:"#a08d77"}, "surface", "ai")}>
                              1일 ~ 최대 30일 · 기본값은 30일입니다.
                            </span>
                          </label>
                          <label style={blueTheme({display:"flex",flexDirection:"column",gap:"5px",fontSize:"8px",fontWeight:"900",color:"#755c43"}, "surface", "ai")}>
                            예상 수익률 범위 (%)
                            <div style={blueTheme({display:"grid",gridTemplateColumns:"1fr 14px 1fr",alignItems:"center",gap:"4px"}, "surface", "ai")}>
                              <input type="number" min="0" step="0.1" value={aiAdminForm.min_return}
                                onChange={(e)=>setAiAdminForm((v)=>({...v,min_return:e.target.value}))}
                                style={blueTheme({width:"100%",boxSizing:"border-box",padding:"11px 7px",borderRadius:"11px",border:"1px solid #dfd0bb",background:"#fff",fontWeight:"900",outline:"none"}, "surface", "ai")}/>
                              <b style={blueTheme({textAlign:"center"}, "surface", "ai")}>~</b>
                              <input type="number" min="0" step="0.1" value={aiAdminForm.max_return}
                                onChange={(e)=>setAiAdminForm((v)=>({...v,max_return:e.target.value}))}
                                style={blueTheme({width:"100%",boxSizing:"border-box",padding:"11px 7px",borderRadius:"11px",border:"1px solid #dfd0bb",background:"#fff",fontWeight:"900",outline:"none"}, "surface", "ai")}/>
                            </div>
                          </label>
                        </div>

                        {aiAdminForm.status==="running" && (()=>{
                          const current=aiAdminRows.find(m=>m.id===aiAdminSelectedId)?.process;
                          const snapshot=current?getMemberProcessSnapshot(current):null;
                          return <div style={blueTheme({marginTop:"12px",padding:"12px",borderRadius:"12px",border:"1px solid #d7bd8d",background:"#fff9ee"}, "surface", "ai")}>
                            <strong style={blueTheme({fontSize:"11px",color:"#67461c"}, "surface", "ai")}>회원별 모의 수익 금액 조정</strong>
                            <div style={blueTheme({fontSize:"10px",marginTop:"7px",color:"#67461c"}, "surface", "ai")}>현재 누적 모의 수익: <b>{Math.round(snapshot?.earnedProfit||0).toLocaleString("ko-KR")}원</b> · 모의 총금액: <b>{Math.round(snapshot?.totalAmount||0).toLocaleString("ko-KR")}원</b></div>
                            <div style={blueTheme({fontSize:"8px",marginTop:"5px",color:"#977955"}, "surface", "ai")}>금액을 입력한 후 추가 또는 차감을 선택하세요. 변경액은 DB에 저장되어 3분 후에도 유지됩니다.</div>
                            <input type="number" min="1" step="1" value={aiProfitAdjustAmount} onChange={e=>setAiProfitAdjustAmount(e.target.value)} placeholder="조정 금액 (원)" style={blueTheme({marginTop:"9px",width:"100%",boxSizing:"border-box",padding:"10px",borderRadius:"9px",border:"1px solid #dfd0bb"}, "surface", "ai")}/>
                            <div style={blueTheme({display:"flex",gap:"8px",marginTop:"8px"}, "surface", "ai")}>
                              {["add","subtract"].map(mode=><button key={mode} type="button" disabled={aiProfitAdjustWorking||aiAdminWorking||!(Number(aiProfitAdjustAmount)>0)} onClick={async()=>{
                                if(!window.confirm(`${aiAdminRows.find(m=>m.id===aiAdminSelectedId)?.nickname||"회원"}님의 모의 수익 ${Number(aiProfitAdjustAmount).toLocaleString("ko-KR")}원을 ${mode==="add"?"추가":"차감"}할까요?`))return;
                                setAiProfitAdjustWorking(true);
                                try{
                                  const {error}=await supabase.rpc("admin_adjust_ai_process_profit",{p_user_id:aiAdminSelectedId,p_amount:(mode==="add"?1:-1)*Number(aiProfitAdjustAmount)});
                                  if(error)throw error;
                                  setAiProfitAdjustAmount("");
                                  await loadAiAdminRows();
                                  setNotice("회원별 모의 수익 금액 조정이 저장됐습니다.");
                                }catch(e){setNotice("금액 조정 실패: "+e.message);}
                                finally{setAiProfitAdjustWorking(false);}
                              }} style={blueTheme({flex:1,padding:"10px",borderRadius:"9px",border:0,background:mode==="add"?"#256c4d":"#8c513c",color:"#fff",fontWeight:900,cursor:"pointer"}, "button", "ai")}>{mode==="add"?"+ 수익 추가":"− 수익 차감"}</button>)}
                            </div>
                          </div>;
                        })()}

                        <div style={blueTheme({marginTop:"10px",padding:"10px 11px",borderRadius:"12px",background:"#f2e6d3",fontSize:"8px",lineHeight:1.55,color:"#755c43"}, "surface", "ai")}>
                          <b>대기</b>는 상담 후 금액·예상 진행기간·예상 수익률 범위를 미리 저장하는 상태입니다. <b>진행중 시작</b>을 누르면 해당 회원에게만 3분 단위 모의 수익 시뮬레이션이 표시됩니다. 각 회원의 최종 모의 수익률은 설정 범위 안에서 회원별로 다르게 결정됩니다.
                        </div>

                        <div style={blueTheme({display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px",marginTop:"11px"}, "surface", "ai")}>
                          <button type="button" disabled={aiAdminWorking} onClick={()=>saveAiAdminSettings("waiting")}
                            style={blueTheme({padding:"11px 8px",borderRadius:"12px",border:"1px solid #d7bd8d",background:"#fff7e8",color:"#725021",fontSize:"9px",fontWeight:"1000",cursor:"pointer"}, "button", "ai")}>대기로 저장</button>
                          <button type="button" disabled={aiAdminWorking || Number(aiAdminForm.investment_amount)<=0 || Number(aiAdminForm.min_return)<0 || Number(aiAdminForm.max_return)<Number(aiAdminForm.min_return) || Number(aiAdminForm.duration_days)<1 || Number(aiAdminForm.duration_days)>30}
                            onClick={()=>saveAiAdminSettings("running")}
                            style={blueTheme({padding:"11px 8px",borderRadius:"12px",border:"1px solid #2f7452",background:"linear-gradient(145deg,#184b35,#28734f)",color:"#eafff2",fontSize:"9px",fontWeight:"1000",cursor:"pointer"}, "button", "ai")}>▶ 진행중 시작</button>
                          <button type="button" disabled={aiAdminWorking} onClick={()=>saveAiAdminSettings("completed")}
                            style={blueTheme({padding:"11px 8px",borderRadius:"12px",border:"1px solid #cab37f",background:"#2d261d",color:"#f1d28e",fontSize:"9px",fontWeight:"1000",cursor:"pointer"}, "button", "ai")}>✓ 진행완료</button>
                          <button type="button" disabled={aiAdminWorking} onClick={resetAiAdminProcess}
                            style={blueTheme({padding:"11px 8px",borderRadius:"12px",border:"1px solid #ddd3c5",background:"#fff",color:"#8a7765",fontSize:"9px",fontWeight:"1000",cursor:"pointer"}, "button", "ai")}>진행 전으로 초기화</button>
                        </div>

                        <button type="button" disabled={aiAdminWorking} onClick={()=>saveAiAdminSettings(aiAdminForm.status)}
                          style={blueTheme({width:"100%",marginTop:"7px",padding:"11px",borderRadius:"12px",border:0,background:"linear-gradient(145deg,#8f6327,#c79648)",color:"#fff",fontSize:"9px",fontWeight:"1000",cursor:"pointer"}, "button", "ai")}>
                          {aiAdminWorking ? "저장 중..." : "현재 상태 그대로 설정 저장"}
                        </button>
                      </div>
                    )}
                        <div style={blueTheme({padding:"14px",marginTop:"14px",marginBottom:"12px",border:"1px solid #d8bd91",borderRadius:"12px",background:"#fff9ee"}, "surface", "ai")}>
                          <div style={blueTheme({display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px"}, "surface", "ai")}>
                            <strong style={blueTheme({fontSize:"13px",color:"#3e2c19"}, "surface", "ai")}>일반 회원 · AI 돌발 이벤트 진행 현황</strong>
                            <button type="button" onClick={()=>{setRealSurpriseCollapsed(v=>!v);if(realSurpriseCollapsed)loadRealSurpriseRows();}} style={blueTheme({padding:"6px 10px",border:"1px solid #d8bd91",borderRadius:"8px",background:"#fff",cursor:"pointer"}, "button", "ai")}>{realSurpriseCollapsed?"펼치기 ▾":"접어두기 ▴"}</button>
                          </div>
                          {!realSurpriseCollapsed && <div style={blueTheme({marginTop:"12px"}, "surface", "ai")}>
                            <button type="button" onClick={loadRealSurpriseRows} disabled={realSurpriseLoading} style={blueTheme({padding:"7px 11px",border:"1px solid #d8bd91",borderRadius:"8px",background:"#fff",cursor:"pointer"}, "button", "ai")}>{realSurpriseLoading?"조회 중...":"새로고침 ↻"}</button>
                            <div style={blueTheme({marginTop:"8px",fontSize:"11px",color:"#70502d"}, "surface", "ai")}>일반 회원만 표시 · 진행 중 {realSurpriseRows.filter(v=>v.status==="running").length}명 / 완료 {realSurpriseRows.filter(v=>v.status==="completed").length}명</div>
                            {realSurpriseRows.length===0 ? <div style={blueTheme({padding:"12px 0",fontSize:"11px",color:"#70502d"}, "surface", "ai")}>진행 중이거나 완료된 일반 회원 기록이 없습니다.</div> :
                              <div style={blueTheme({marginTop:"8px",maxHeight:"380px",overflowY:"auto"}, "surface", "ai")}>{realSurpriseRows.map((v,i)=><div key={v.member_id+"-"+i} style={blueTheme({padding:"11px",marginBottom:"7px",background:"#fff",border:"1px solid #eadcc7",borderRadius:"9px",fontSize:"11px",lineHeight:1.8,color:"#3e2c19"}, "surface", "ai")}>
                                <strong>{v.nickname || v.real_name || "회원"}</strong> <span style={blueTheme({color:v.status==="running"?"#a06c14":"#357c4a",fontWeight:800}, "surface", "ai")}>{v.status==="running"?"● 진행 중":"✓ 진행 완료"}</span>
                                <div>시작: {v.started_at?new Date(v.started_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"}):"-"}</div>
                                <div>{v.status==="completed"?"완료":"완료 예정"}: {(v.status==="completed"?v.finished_at:v.scheduled_finish_at)?new Date(v.status==="completed"?v.finished_at:v.scheduled_finish_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"}):"-"}</div>
                              </div>)}</div>}
                          </div>}
                        </div>
<div style={blueTheme({padding:"14px",marginTop:"14px",marginBottom:"12px",border:"1px solid #d8bd91",borderRadius:"12px",background:"#fff9ee"}, "surface", "ai")}>
<div style={blueTheme({display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px"}, "surface", "ai")}><strong style={blueTheme({fontSize:"13px",color:"#3e2c19"}, "surface", "ai")}>그룹채팅 이벤트 당첨 안내 문구</strong><button type="button" onClick={()=>{setEventWinnerFooterCollapsed(v=>!v);if(eventWinnerFooterCollapsed)loadEventWinnerFooter();}} style={blueTheme({padding:"6px 10px",border:"1px solid #d8bd91",borderRadius:"8px",background:"#fff",cursor:"pointer"}, "button", "ai")}>{eventWinnerFooterCollapsed?"펼치기 ▾":"접어두기 ▴"}</button></div>
{!eventWinnerFooterCollapsed&&<div style={blueTheme({display:"grid",gap:"10px",marginTop:"12px"}, "surface", "ai")}>
<div style={blueTheme({fontSize:"11px",color:"#70502d",lineHeight:1.6}, "surface", "ai")}>AI · 가상지급 · 실제 회원 당첨 공지에 공통 적용됩니다. 기존 상품명과 1:1 지급 방식은 바뀌지 않으며, 앞으로 올라오는 당첨 공지 맨 아래에 한 줄 띄어 표시됩니다.</div>
<label style={blueTheme({fontSize:"11px",fontWeight:800,color:"#594022"}, "surface", "ai")}>당첨 상품 아래 추가 문구<textarea maxLength={250} value={eventWinnerFooter} onChange={e=>setEventWinnerFooter(e.target.value)} placeholder="💌 당첨 상품은 카카오톡 1:1 고객센터에서 확인해주세요." style={blueTheme({display:"block",width:"100%",boxSizing:"border-box",padding:"9px",marginTop:"5px",minHeight:"75px",borderRadius:"8px",border:"1px solid #d8bd91",fontSize:"12px"}, "surface", "ai")}/></label>
<button type="button" onClick={saveEventWinnerFooter} disabled={eventWinnerFooterSaving} style={blueTheme({padding:"11px",background:"#172938",color:"#fff",border:0,borderRadius:"9px",fontWeight:800,cursor:"pointer"}, "button", "ai")}>{eventWinnerFooterSaving?"저장 중...":"당첨 안내 문구 저장"}</button></div>}</div>
<div style={blueTheme({padding:"14px",marginTop:"14px",marginBottom:"12px",border:"1px solid #d8bd91",borderRadius:"12px",background:"#fff9ee"}, "surface", "ai")}>
<div style={blueTheme({display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px"}, "surface", "ai")}><strong style={blueTheme({fontSize:"13px",color:"#3e2c19"}, "surface", "ai")}>돌발 이벤트 자동 공지 문구 관리</strong><button type="button" onClick={()=>{setSurpriseCopyCollapsed(v=>!v);if(surpriseCopyCollapsed)loadSurpriseCopy();}} style={blueTheme({padding:"6px 10px",border:"1px solid #d8bd91",borderRadius:"8px",background:"#fff",cursor:"pointer"}, "button", "ai")}>{surpriseCopyCollapsed?"펼치기 ▾":"접어두기 ▴"}</button></div>
{!surpriseCopyCollapsed&&<div style={blueTheme({display:"grid",gap:"10px",marginTop:"12px"}, "surface", "ai")}>
<div style={blueTheme({fontSize:"10px",color:"#70502d"}, "surface", "ai")}>회원 이름은 {"{닉네임}"}, 모의 지원금은 {"{지원금}"}으로 자동 치환됩니다. 변경 내용은 새 1:1 메시지 및 그룹방 카드에 반영됩니다.</div><label style={blueTheme({fontSize:"11px",fontWeight:800,color:"#594022"}, "surface", "ai")}>그룹방 시작 제목<textarea value={surpriseCopy.group_start_title} onChange={e=>setSurpriseCopy(v=>({...v,group_start_title:e.target.value}))} style={blueTheme({display:"block",width:"100%",boxSizing:"border-box",padding:"9px",marginTop:"5px",minHeight:"65px",borderRadius:"8px",border:"1px solid #d8bd91",fontSize:"12px"}, "surface", "ai")}/></label><label style={blueTheme({fontSize:"11px",fontWeight:800,color:"#594022"}, "surface", "ai")}>그룹방 시작 본문<textarea value={surpriseCopy.group_start_body} onChange={e=>setSurpriseCopy(v=>({...v,group_start_body:e.target.value}))} style={blueTheme({display:"block",width:"100%",boxSizing:"border-box",padding:"9px",marginTop:"5px",minHeight:"65px",borderRadius:"8px",border:"1px solid #d8bd91",fontSize:"12px"}, "surface", "ai")}/></label><label style={blueTheme({fontSize:"11px",fontWeight:800,color:"#594022"}, "surface", "ai")}>그룹방 완료 제목<textarea value={surpriseCopy.group_complete_title} onChange={e=>setSurpriseCopy(v=>({...v,group_complete_title:e.target.value}))} style={blueTheme({display:"block",width:"100%",boxSizing:"border-box",padding:"9px",marginTop:"5px",minHeight:"65px",borderRadius:"8px",border:"1px solid #d8bd91",fontSize:"12px"}, "surface", "ai")}/></label><label style={blueTheme({fontSize:"11px",fontWeight:800,color:"#594022"}, "surface", "ai")}>그룹방 완료 본문<textarea value={surpriseCopy.group_complete_body} onChange={e=>setSurpriseCopy(v=>({...v,group_complete_body:e.target.value}))} style={blueTheme({display:"block",width:"100%",boxSizing:"border-box",padding:"9px",marginTop:"5px",minHeight:"65px",borderRadius:"8px",border:"1px solid #d8bd91",fontSize:"12px"}, "surface", "ai")}/></label><label style={blueTheme({fontSize:"11px",fontWeight:800,color:"#594022"}, "surface", "ai")}>1:1 당첨 시작 자동 메시지<textarea value={surpriseCopy.private_start_body} onChange={e=>setSurpriseCopy(v=>({...v,private_start_body:e.target.value}))} style={blueTheme({display:"block",width:"100%",boxSizing:"border-box",padding:"9px",marginTop:"5px",minHeight:"145px",borderRadius:"8px",border:"1px solid #d8bd91",fontSize:"12px"}, "surface", "ai")}/></label><button type="button" onClick={saveSurpriseCopy} disabled={surpriseCopySaving} style={blueTheme({padding:"11px",background:"#172938",color:"#fff",border:0,borderRadius:"9px",fontWeight:800}, "button", "ai")}>{surpriseCopySaving?"저장 중...":"자동 공지 문구 저장"}</button></div>}</div>
<div style={blueTheme({padding:"14px",marginTop:"14px",marginBottom:"12px",border:"1px solid #d8bd91",borderRadius:"12px",background:"#fff9ee"}, "surface", "ai")}>
                          <div style={blueTheme({display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px"}, "surface", "ai")}><strong style={blueTheme({fontSize:"13px",color:"#3e2c19"}, "surface", "ai")}>돌발 체험 이벤트 안내 관리</strong><button type="button" onClick={()=>setSurpriseGuideCollapsed(v=>!v)} style={blueTheme({padding:"6px 10px",border:"1px solid #d8bd91",borderRadius:"8px",background:"#fff",cursor:"pointer"}, "button", "ai")}>{surpriseGuideCollapsed?"펼치기 ▾":"접어두기 ▴"}</button></div>
                          {!surpriseGuideCollapsed && <>
                          <button type="button" onClick={loadSurpriseGuide} style={blueTheme({marginTop:"8px",padding:"7px 10px",border:"1px solid #d8bd91",borderRadius:"8px",background:"#fff",cursor:"pointer"}, "button", "ai")}>현재 안내문 불러오기</button>
                          <label style={blueTheme({display:"block",marginTop:"10px",fontSize:"10px",color:"#70502d"}, "surface", "ai")}>안내 제목</label>
                          <input value={surpriseGuide.title} onChange={e=>setSurpriseGuide(v=>({...v,title:e.target.value}))} maxLength={100} style={blueTheme({width:"100%",boxSizing:"border-box",marginTop:"5px",padding:"9px",border:"1px solid #d8bd91",borderRadius:"8px"}, "surface", "ai")}/>
                          <label style={blueTheme({display:"block",marginTop:"10px",fontSize:"10px",color:"#70502d"}, "surface", "ai")}>진행방법 팝업 전체 내용</label>
                          <textarea value={surpriseGuide.body} onChange={e=>setSurpriseGuide(v=>({...v,body:e.target.value}))} rows={9} maxLength={10000} style={blueTheme({width:"100%",boxSizing:"border-box",marginTop:"5px",padding:"10px",border:"1px solid #d8bd91",borderRadius:"8px",resize:"vertical",fontSize:"11px",lineHeight:1.6}, "surface", "ai")}/>
                          <button type="button" disabled={surpriseGuideSaving} onClick={saveSurpriseGuide} style={blueTheme({width:"100%",marginTop:"10px",padding:"11px",border:0,borderRadius:"9px",background:"#304756",color:"#fff",fontWeight:900,cursor:"pointer"}, "button", "ai")}>{surpriseGuideSaving?"저장 중...":"안내 내용 저장"}</button></>}
                        </div>
                        <div style={blueTheme({padding:"14px",marginTop:"14px",marginBottom:"12px",border:"1px solid #d8bd91",borderRadius:"12px",background:"#fff9ee"}, "surface", "ai")}>
                          <div style={blueTheme({display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px"}, "surface", "ai")}><strong style={blueTheme({fontSize:"11px",color:"#594022"}, "surface", "ai")}>전체 회원 공통 · 돌발 프로세스 안내 설정</strong><button type="button" onClick={()=>setSurpriseSettingsCollapsed(v=>!v)} style={blueTheme({padding:"6px 10px",border:"1px solid #d8bd91",borderRadius:"8px",background:"#fff",cursor:"pointer"}, "button", "ai")}>{surpriseSettingsCollapsed?"펼치기 ▾":"접어두기 ▴"}</button></div>
                          {!surpriseSettingsCollapsed && <>
                          <button type="button" onClick={loadSurpriseSettings} style={blueTheme({marginLeft:"8px",fontSize:"9px",padding:"5px 8px"}, "button", "ai")}>설정 불러오기</button>
                          {surpriseSettingsLoaded && <div style={blueTheme({display:"grid",gap:"8px",marginTop:"10px"}, "surface", "ai")}>
                            <label style={blueTheme({fontSize:"9px"}, "surface", "ai")}>완료 안내 문구
                              <textarea value={surpriseSettings.completion_message} onChange={(e)=>setSurpriseSettings(v=>({...v,completion_message:e.target.value}))} style={blueTheme({display:"block",width:"100%",boxSizing:"border-box",padding:"8px",minHeight:"64px"}, "surface", "ai")}/>
                            </label>
                            <label style={blueTheme({fontSize:"9px"}, "surface", "ai")}>확인 버튼 이름
                              <input value={surpriseSettings.action_label} onChange={(e)=>setSurpriseSettings(v=>({...v,action_label:e.target.value}))} style={blueTheme({display:"block",width:"100%",boxSizing:"border-box",padding:"8px"}, "surface", "ai")}/>
                            </label>
                            <label style={blueTheme({fontSize:"9px"}, "surface", "ai")}>확인 버튼 주소
                              <input value={surpriseSettings.action_url} onChange={(e)=>setSurpriseSettings(v=>({...v,action_url:e.target.value}))} style={blueTheme({display:"block",width:"100%",boxSizing:"border-box",padding:"8px"}, "surface", "ai")}/>
                            </label>
                            <button type="button" disabled={surpriseSettingsSaving} onClick={saveSurpriseSettings} style={blueTheme({padding:"9px",background:"#172938",color:"#fff",border:0,borderRadius:"9px"}, "button", "ai")}>돌발 안내 설정 저장</button>
                          </div>}</>}
                        </div>

                    {notice && <div style={blueTheme(styles.refNotice, "surface", "ai")}>{notice}</div>}
                  </div>
                ) : (() => {
                  const row = aiMemberProcess || {available_count:0,status:"ready",investment_amount:0,duration_hours:720,min_return:800,max_return:1200,available_granted_at:null};
                  const status = row.status || "ready";
                  const availableCount = Math.max(0, Number(row.available_count || 0));
                  const opportunityDday = aiProcessOpportunityDday(row);

                  if (status !== "running" && status !== "completed") {
                    return (
                      <div style={blueTheme({marginBottom:"14px"}, "surface", "ai")}>
                        <div style={blueTheme({
                          position:"relative",overflow:"hidden",padding:"22px 17px",borderRadius:"24px",
                          background:"linear-gradient(145deg,#111820,#1b2937 56%,#0d151d)",
                          border:"1px solid rgba(225,183,98,.45)",boxShadow:"0 16px 38px rgba(15,25,35,.2)",color:"#fff",textAlign:"center"
                        }, "accentSurface", "ai")}>
                          <div style={blueTheme({position:"absolute",right:"-75px",top:"-95px",width:"230px",height:"230px",borderRadius:"50%",background:"radial-gradient(circle,rgba(229,187,99,.2),transparent 68%)"}, "accentSurface", "ai")}/>
                          <span style={blueTheme({position:"relative",display:"inline-flex",padding:"5px 9px",borderRadius:"999px",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.4px",color:"#e6c179",border:"1px solid rgba(230,193,121,.25)"}, "surface", "ai")}>AI PROCESS STATUS</span>
                          <strong style={blueTheme({
                            position:"relative",display:"block",marginTop:"12px",
                            fontSize: availableCount <= 0 && status === "ready" ? "20px" : "21px",
                            lineHeight:1.45,letterSpacing:"-.65px",wordBreak:"keep-all",
                            color: availableCount <= 0 && status === "ready" ? "#fff7e8" : "#fff",
                            textShadow: availableCount <= 0 && status === "ready" ? "0 2px 16px rgba(240,202,126,.18)" : "none"
                          }, "surface", "ai")}>
                            {status === "waiting"
                              ? `${profile?.nickname || "회원"}님, AI프로세스 진행 준비가 완료되었습니다.`
                              : availableCount > 0
                                ? `${profile?.nickname || "회원"}님, AI프로세스 ${availableCount}회 진행 가능합니다.`
                                : <>{profile?.nickname || "회원"}님의 AI프로세스<span style={blueTheme({display:"block"}, "surface", "ai")}>진행 가능한 횟수가 없습니다.</span></>}
                          </strong>
                          <p style={blueTheme({position:"relative",margin:"9px auto 0",maxWidth:"350px",fontSize:"10px",lineHeight:1.7,color:"rgba(255,255,255,.68)",wordBreak:"keep-all"}, "surface", "ai")}>
                            {status === "waiting"
                              ? "상담을 통해 진행 설정이 완료되었습니다. 담당자 확인 후 진행이 시작되면 회원님 전용 AI 수익 현황 화면으로 자동 전환됩니다."
                              : availableCount > 0
                                ? "회원님께 제공된 AI프로세스 이용 기회가 준비되어 있습니다. 진행을 원하시면 카카오톡 1:1 고객센터로 문의해 주세요. 상담 후 진행 설정이 완료되면 바로 시작할 수 있습니다."
                                : <>현재 AI프로세스 돌발 1만원 지원금 이벤트 진행중입니다.<br/>당첨 시 1만원 으로 AI프로세스 자동 진행 됩니다.<br/>(진행 가능횟수가 0회 인 경우 본인 자금으로 진행 불가능 합니다.)</>}
                          </p>

                          {availableCount > 0 && opportunityDday !== null && (
                            <div style={blueTheme({
                              position:"relative",marginTop:"16px",padding:"13px 14px",
                              borderRadius:"16px",
                              background:"linear-gradient(135deg,rgba(198,145,55,.22),rgba(240,202,126,.10))",
                              border:"1px solid rgba(240,202,126,.38)",
                              boxShadow:"inset 0 1px 0 rgba(255,255,255,.06)"
                            }, "accentSurface", "ai")}>
                              <span style={blueTheme({display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.4px",color:"#e8c276"}, "surface", "ai")}>AI PROCESS ACCESS</span>
                              <div style={blueTheme({display:"flex",alignItems:"baseline",justifyContent:"center",gap:"7px",marginTop:"4px"}, "surface", "ai")}>
                                <strong style={blueTheme({fontSize:"23px",lineHeight:1,color:"#ffd67f"}, "surface", "ai")}>D-{opportunityDday}</strong>
                                <b style={blueTheme({fontSize:"11px",color:"#fff"}, "surface", "ai")}>진행 기회 유효기간</b>
                              </div>
                              <span style={blueTheme({display:"block",marginTop:"6px",fontSize:"8px",lineHeight:1.55,color:"rgba(255,255,255,.67)"}, "surface", "ai")}>
                                지급된 날부터 10일간 이용 가능 · D-0 종료 후 미사용 횟수는 자동 소멸됩니다.
                              </span>
                            </div>
                          )}

                          <div style={blueTheme({position:"relative",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"16px"}, "surface", "ai")}>
                            <div style={blueTheme({padding:"12px 9px",borderRadius:"15px",background:"rgba(255,255,255,.055)",border:"1px solid rgba(255,255,255,.08)"}, "surface", "ai")}>
                              <span style={blueTheme({display:"block",fontSize:"7px",color:"rgba(255,255,255,.48)"}, "surface", "ai")}>진행 가능한 횟수</span>
                              <strong style={blueTheme({display:"block",marginTop:"4px",fontSize:"20px",color:"#f0ca7e"}, "surface", "ai")}>{availableCount}회</strong>
                            </div>
                            <div style={blueTheme({padding:"12px 9px",borderRadius:"15px",background:"rgba(255,255,255,.055)",border:"1px solid rgba(255,255,255,.08)"}, "surface", "ai")}>
                              <span style={blueTheme({display:"block",fontSize:"7px",color:"rgba(255,255,255,.48)"}, "surface", "ai")}>현재 상태</span>
                              <strong style={blueTheme({display:"block",marginTop:"6px",fontSize:"14px",color:status==="waiting"?"#f0ca7e":"#fff"}, "surface", "ai")}>
                                {availableCount <= 0 && status === "ready" ? "본인 자금 진행 불가" : aiProcessStatusLabel(status, availableCount)}
                              </strong>
                            </div>
                          </div>

                          {status === "waiting" && Number(row.investment_amount || 0) > 0 && (
                            <div style={blueTheme({position:"relative",marginTop:"9px",padding:"10px 11px",borderRadius:"13px",background:"rgba(230,193,121,.08)",border:"1px solid rgba(230,193,121,.18)",fontSize:"8px",color:"#e8d3aa"}, "surface", "ai")}>
                              시작 모의 금액 <b style={blueTheme({color:"#fff"}, "surface", "ai")}>{aiKrw(row.investment_amount)}</b> · 완료 시각 및 최종 금액은 진행 완료 후 안내
                            </div>
                          )}

                          <AiProcessMemberGuide compact />

                          <button type="button" onClick={()=>{setChatTab("private");window.sessionStorage.setItem("vip-active-tab","private");openPrivateChat();}}
                            style={blueTheme({position:"relative",width:"100%",marginTop:"13px",padding:"12px",borderRadius:"13px",border:"1px solid rgba(236,202,137,.42)",background:"linear-gradient(145deg,#9a6b2b,#c99b50)",color:"#fff",fontSize:"10px",fontWeight:"1000",cursor:"pointer"}, "button", "ai")}>
                            💬 AI프로세스 진행 문의
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const demo = getMemberProcessSnapshot(row);
                  return (
                    <div style={blueTheme({marginBottom:"14px"}, "surface", "ai")}>
                      <div style={blueTheme({
                        position:"relative",overflow:"hidden",borderRadius:"24px",
                        background:"linear-gradient(145deg,#111820 0%,#172737 48%,#0c131b 100%)",
                        border:"1px solid rgba(229,190,112,.48)",boxShadow:"0 18px 42px rgba(15,25,35,.22)",color:"#fff"
                      }, "accentSurface", "ai")}>
                        <div style={blueTheme({position:"absolute",right:"-80px",top:"-110px",width:"260px",height:"260px",borderRadius:"50%",background:"radial-gradient(circle,rgba(227,185,96,.22),rgba(227,185,96,0) 68%)"}, "accentSurface", "ai")}/>
                        <div style={blueTheme({padding:"18px 16px 15px",position:"relative"}, "surface", "ai")}>
                          <div style={blueTheme({display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px",marginBottom:"13px"}, "surface", "ai")}>
                            <div>
                              <span style={blueTheme({display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"2px",color:"#dfba72"}, "surface", "ai")}>AI PROCESS · MEMBER</span>
                              <strong style={blueTheme({display:"block",marginTop:"4px",fontSize:"18px"}, "surface", "ai")}>{profile?.nickname || "회원"}님의 AI 수익 현황</strong>
                            </div>
                            <div style={blueTheme({padding:"6px 9px",borderRadius:"999px",fontSize:"7px",fontWeight:"1000",color:status==="running"?"#c9f5dc":"#f0ca7f",background:status==="running"?"rgba(49,169,104,.13)":"rgba(224,184,104,.10)",border:"1px solid rgba(224,184,104,.25)"}, "surface", "ai")}>
                              {status==="running" ? "● 진행중" : "✓ 진행완료"}
                            </div>
                          </div>

                          <div style={blueTheme({
                            marginBottom:"12px",
                            padding:status==="completed" ? "14px 13px" : "11px 12px",
                            borderRadius:"15px",
                            textAlign:"center",
                            background:status==="completed"
                              ? "linear-gradient(135deg,rgba(213,165,72,.24),rgba(245,213,143,.12))"
                              : "linear-gradient(135deg,rgba(42,154,91,.20),rgba(80,193,126,.09))",
                            border:status==="completed"
                              ? "1px solid rgba(240,202,126,.52)"
                              : "1px solid rgba(96,211,145,.34)",
                            boxShadow:status==="completed" ? "0 8px 24px rgba(216,169,76,.10)" : "none"
                          }, "surface", "ai")}>
                            <strong style={blueTheme({
                              display:"block",
                              fontSize:status==="completed" ? "17px" : "13px",
                              lineHeight:1.25,
                              color:status==="completed" ? "#ffd77f" : "#bff4d3",
                              letterSpacing:status==="completed" ? "-.3px" : "0"
                            }, "surface", "ai")}>
                              {status==="completed" ? "✓ AI프로세스 진행완료" : "● AI프로세스 진행중"}
                            </strong>
                            <span style={blueTheme({display:"block",marginTop:"5px",fontSize:"8px",lineHeight:1.55,color:"rgba(255,255,255,.72)",wordBreak:"keep-all"}, "surface", "ai")}>
                              {status==="completed"
                                ? "진행이 정상적으로 완료되었습니다. 완료 시점의 수익금과 총 금액으로 최종 마감되었습니다."
                                : "현재 AI프로세스가 진행 중입니다. 수익 현황은 3분 단위로 반영됩니다."}
                            </span>
                            {status==="completed" && (
                              <div style={blueTheme({
                                marginTop:"10px",
                                padding:"10px 12px",
                                borderRadius:"12px",
                                background:"rgba(0,0,0,.18)",
                                border:"1px solid rgba(255,215,127,.30)",
                                fontSize:"12px",
                                fontWeight:"1000",
                                lineHeight:1.4,
                                color:"#fff",
                                letterSpacing:"-.2px"
                              }, "surface", "ai")}>
                                출금예정금액 : <span style={blueTheme({color:"#ffd77f",fontSize:"14px"}, "surface", "ai")}>{aiKrw(demo.totalAmount)}</span> 입니다.
                              </div>
                            )}
                          </div>

                          <div style={blueTheme({display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"7px"}, "surface", "ai")}>
                            {[
                              ["내 투자금액",aiKrw(demo.investment),"#fff"],
                              ["수익 중인 금액",`+${aiKrw(demo.earnedProfit)}`,"#f3cf84"],
                              ["총 금액",aiKrw(demo.totalAmount),"#fff1ce"]
                            ].map(([label,value,color])=>(
                              <div key={label} style={blueTheme({padding:"12px 8px",borderRadius:"15px",background:"rgba(255,255,255,.055)",border:"1px solid rgba(255,255,255,.08)",minWidth:0}, "surface", "ai")}>
                                <span style={blueTheme({display:"block",fontSize:"7px",color:"rgba(255,255,255,.52)",fontWeight:"800"}, "surface", "ai")}>{label}</span>
                                <strong style={blueTheme({display:"block",marginTop:"5px",fontSize:"12px",whiteSpace:"nowrap",letterSpacing:"-.4px",color}, "surface", "ai")}>{value}</strong>
                              </div>
                            ))}
                          </div>

                          <div style={blueTheme({display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:"12px",marginTop:"17px"}, "surface", "ai")}>
                            <div>
                              <span style={blueTheme({display:"block",fontSize:"8px",fontWeight:"900",color:"rgba(255,255,255,.48)"}, "surface", "ai")}>현재 누적 수익률</span>
                              <strong style={blueTheme({display:"block",marginTop:"2px",fontSize:"29px",lineHeight:1,color:"#f0c977",letterSpacing:"-1.2px"}, "surface", "ai")}>+{demo.currentReturn.toFixed(2)}%</strong>
                            </div>
                            <div style={blueTheme({textAlign:"right"}, "surface", "ai")}>
                              <span style={blueTheme({display:"block",fontSize:"7px",color:"rgba(255,255,255,.42)"}, "surface", "ai")}>예상 수익률</span>
                              <strong style={blueTheme({display:"block",marginTop:"2px",fontSize:"15px",color:"#fff"}, "surface", "ai")}>10% ~ 1000%</strong>
                              <span style={blueTheme({display:"block",marginTop:"3px",fontSize:"7px",color:"#d8b571"}, "surface", "ai")}>{status==="running" ? `다음 반영 ${demo.nextText}` : "진행 완료"}</span>
                            </div>
                          </div>

                          <div style={blueTheme({marginTop:"13px"}, "surface", "ai")}>
                            <div style={blueTheme({display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",marginBottom:"9px"}, "surface", "ai")}>
                              <span style={blueTheme({display:"inline-flex",alignItems:"center",gap:"5px",fontSize:"10px",fontWeight:"800",color:"rgba(255,255,255,.85)"}, "surface", "ai")}>
                                <span style={blueTheme({color:"#edc777",fontSize:"13px"}, "surface", "ai")}>◷</span> AI PROCESS 진행시간
                              </span>
                              <strong style={blueTheme({fontSize:"11px",fontWeight:"900",color:"#f0c977",whiteSpace:"nowrap",fontVariantNumeric:"tabular-nums"}, "surface", "ai")}>
                                {(() => { const minutes = Math.max(0, Math.floor((Date.now() - new Date(row.started_at).getTime()) / 60000)); return `${String(Math.floor(minutes / 1440)).padStart(2, "0")}일 ${String(Math.floor((minutes % 1440) / 60)).padStart(2, "0")}시간 ${String(minutes % 60).padStart(2, "0")}분`; })()}
                              </strong>
                            </div>
                            <div style={blueTheme({height:"8px",borderRadius:"999px",overflow:"hidden",background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.06)"}, "surface", "ai")}>
                              <div style={blueTheme({width:`${status === "completed" ? 100 : Math.min(100, Math.max(0, ((Date.now() - new Date(row.started_at).getTime()) / aiProcessDurationMs(row)) * 100))}%`,height:"100%",borderRadius:"999px",background:"linear-gradient(90deg,#a8782e,#f0cf86)",transition:"width .5s ease"}, "accentSurface", "ai")}/>
                            </div>
                            <div style={blueTheme({display:"flex",justifyContent:"space-between",marginTop:"6px",fontSize:"8px",color:"rgba(255,255,255,.52)"}, "surface", "ai")}>
                              <span>PROCESS START</span>
                              <span>{aiProcessDurationLabel(row.duration_hours)} 기준</span>
                            </div>
                          </div>

                          {status === "completed" && (
                            <div style={blueTheme({
                              marginTop:"14px",
                              padding:"15px 13px",
                              borderRadius:"16px",
                              background:"linear-gradient(135deg,rgba(239,197,112,.18),rgba(255,255,255,.06))",
                              border:"1px solid rgba(240,202,126,.42)",
                              textAlign:"center"
                            }, "accentSurface", "ai")}>
                              <strong style={blueTheme({display:"block",fontSize:"13px",lineHeight:1.4,color:"#ffd98c"}, "surface", "ai")}>
                                카카오톡 1:1 고객센터 메시지를 확인해주세요
                              </strong>
                              <span style={blueTheme({display:"block",marginTop:"6px",fontSize:"9px",lineHeight:1.65,color:"rgba(255,255,255,.80)",wordBreak:"keep-all"}, "surface", "ai")}>
                                AI프로세스 완료 안내와 출금 관련 안내를 카카오톡 1:1 고객센터로 보내드렸습니다.<br />
                                카카오톡 1:1 고객센터에서 메시지를 확인해주세요.
                              </span>
                              <button
                                type="button"
                                onClick={()=>{setChatTab("private");window.sessionStorage.setItem("vip-active-tab","private");openPrivateChat();}}
                                style={blueTheme({marginTop:"10px",width:"100%",padding:"11px",border:0,borderRadius:"12px",background:"linear-gradient(145deg,#a8752d,#d1a04d)",color:"#fff",fontSize:"9px",fontWeight:"1000",cursor:"pointer"}, "button", "ai")}
                              >
                                카카오톡 1:1 고객센터 메시지 확인
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                {(aiMemberProcess?.status === "running" || aiMemberProcess?.status === "completed") && (
                  <div style={blueTheme({margin:"10px 0 0",borderRadius:"16px",background:"linear-gradient(145deg,#111c28,#192b39)",border:"1px solid rgba(219,180,105,.32)",overflow:"hidden",color:"#f4f5f7"}, "accentSurface", "ai")}>
                    <button type="button" onClick={() => setMarketPanelOpen((value) => !value)} aria-expanded={marketPanelOpen} style={blueTheme({display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"10px 13px",background:"transparent",border:0,color:"inherit",textAlign:"left",cursor:"pointer"}, "button", "ai")}>
                      <span style={blueTheme({minWidth:0,display:"block"}, "buttonChild", "ai")}><span style={blueTheme({display:"block",fontSize:"8px",letterSpacing:"1.4px",color:"#d8b678",fontWeight:900}, "buttonChild", "ai")}>AI QUANT TERMINAL</span><strong className="ai-quant-shimmer" style={blueTheme({display:"block",marginTop:"3px",fontSize:"11px",lineHeight:1.45,color:"#f2d28b"}, "buttonChild", "ai")}>주식 · 코인 AI프로세스 트레이딩 진행 현황</strong><span style={blueTheme({display:"block",marginTop:"5px",fontSize:"9px",color:"#b8c7d2"}, "buttonChild", "ai")}>↳ AI 시장 분석 확인하기</span></span>
                      <span style={blueTheme({display:"flex",flexShrink:0,flexDirection:"column",alignItems:"center",gap:"3px",marginLeft:"8px",color:"#f2d28b"}, "buttonChild", "ai")}><span className={marketPanelOpen ? "" : "ai-quant-chevron"} style={blueTheme({fontSize:"19px",lineHeight:1}, "buttonChild", "ai")}>{marketPanelOpen ? "⌃" : "⌄"}</span><span style={blueTheme({fontSize:"8px"}, "buttonChild", "ai")}>{marketPanelOpen ? "접기" : "펼치기"}</span></span>
                    </button>
                    <style>{`
                      @keyframes aiQuantShimmer { 0%,75%,100% { filter:brightness(1); } 83% { filter:brightness(1.45); text-shadow:0 0 8px rgba(242,210,139,.5); } }
                      @keyframes aiQuantChevron { 0%,78%,100% { transform:translateY(0); } 86% { transform:translateY(3px); } 94% { transform:translateY(0); } }
                      .ai-quant-shimmer { animation:aiQuantShimmer 4.5s ease-in-out infinite; }
                      .ai-quant-chevron { display:inline-block; animation:aiQuantChevron 4.5s ease-in-out infinite; }
                      @media (prefers-reduced-motion: reduce) { .ai-quant-shimmer,.ai-quant-chevron { animation:none !important; } }
                    `}</style>
                    {marketPanelOpen && (
                      <div style={blueTheme({padding:"0 14px 15px"}, "surface", "ai")}>
                        <div style={blueTheme({fontSize:"9px",color:"#d8b678",marginBottom:"10px"}, "surface", "ai")}>AI프로세스 현황 · 5분 간격 매수 · 매도 현황 갱신</div>
                        <div style={blueTheme({display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"8px"}, "surface", "ai")}>
                          {[marketDemoAssets[0],marketDemoAssets[1]].map((asset) => <div key={asset.symbol} style={blueTheme({borderRadius:"13px",padding:"12px 10px",background:"rgba(255,255,255,.055)",border:"1px solid rgba(255,255,255,.08)"}, "surface", "ai")}>
                            <div style={blueTheme({display:"flex",gap:"7px",alignItems:"center"}, "surface", "ai")}><span style={blueTheme({display:"grid",placeItems:"center",width:"27px",height:"27px",borderRadius:"50%",background:"rgba(229,183,94,.16)",color:"#f0c878",fontSize:"17px"}, "surface", "ai")}>{asset.kind==="COIN"?"₿":"◈"}</span><div><strong style={blueTheme({fontSize:"11px"}, "surface", "ai")}>{asset.symbol}</strong><div style={blueTheme({fontSize:"8px",color:"#a6b6c4"}, "surface", "ai")}>{asset.name} · {asset.kind}</div></div></div>
                            <div style={blueTheme({marginTop:"10px",fontSize:"9px",color:"#d9c18c",fontWeight:800}, "surface", "ai")}>◌ AI 시그널 관찰 중</div>
                          </div>)}
                        </div>
                        <div style={blueTheme({marginTop:"12px",fontSize:"10px",fontWeight:800,color:"#e6c681"}, "surface", "ai")}>› AI프로세스 진행 현황</div>

                        {marketDemoVisibleRecords.map((item,index) => <div key={item.id} style={blueTheme({padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.07)",fontSize:"9px",lineHeight:1.7,color:"#c4d0d9"}, "surface", "ai")}>
                          <div style={blueTheme({display:"flex",justifyContent:"space-between",gap:"8px",alignItems:"center"}, "surface", "ai")}><strong>{item.name} · {item.symbol}</strong><span style={blueTheme({color:item.buy?"#f87171":"#60a5fa",fontWeight:800}, "surface", "ai")}>{item.buy?"↗ 상승세 감지":"↘ 하락세 감지"}</span></div>
                          <div style={blueTheme({color:"#e6c681",marginTop:"3px"}, "surface", "ai")}>AI 판단 · {item.buy?"매수":"매도"} 신청 완료</div>
                        </div>)}
                        <div style={blueTheme({display:"flex",flexWrap:"wrap",gap:"5px",justifyContent:"center",marginTop:"12px"}, "surface", "ai")}>
                          {Array.from({length:marketDemoPageCount},(_,index)=><button key={index} type="button" onClick={()=>setMarketDemoPage(index+1)} style={blueTheme({minWidth:"25px",padding:"5px 7px",borderRadius:"6px",border:"1px solid rgba(229,183,94,.3)",background:marketDemoPage===index+1?"#d8b678":"rgba(255,255,255,.05)",color:marketDemoPage===index+1?"#132431":"#e6c681",cursor:"pointer",fontSize:"9px"}, "button", "ai")}>{index+1}</button>)}
                        </div>
                        <div style={blueTheme({marginTop:"8px",fontSize:"8px",color:"#92a8b7",textAlign:"center"}, "surface", "ai")}>최근 100건 · 10건씩 보기 · 이전 구간 자동 제외</div>
                        <div style={blueTheme({marginTop:"10px",fontSize:"8px",color:"#92a8b7"}, "surface", "ai")}>마지막 기록 갱신: {marketDemoClock ? new Date(marketDemoSlot * 5 * 60 * 1000).toLocaleString("ko-KR") : "준비 중"} <button type="button" aria-label="분석 기록 새로고침" onClick={()=>{setMarketDemoClock(Date.now());setMarketDemoPage(1);}} style={blueTheme({marginLeft:"8px",background:"transparent",border:"1px solid rgba(229,183,94,.4)",borderRadius:"50%",color:"#e6c681",cursor:"pointer",padding:"3px 6px"}, "button", "ai")}>⟳</button></div>
                      </div>
                    )}
                  </div>
                )}


                      <div style={blueTheme({marginTop:"10px",padding:"16px 13px 13px",borderRadius:"21px",background:"linear-gradient(180deg,#fffdf8,#f8f1e6)",border:"1px solid #e8d8bc",boxShadow:"0 9px 24px rgba(73,52,29,.08)"}, "accentSurface", "ai")}>
                        <div style={blueTheme({display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px"}, "surface", "ai")}>
                          <div>
                            <span style={blueTheme({display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.5px",color:"#9b6c2c"}, "surface", "ai")}>PROFIT PERFORMANCE</span>
                            <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:"15px",color:"#2e2a25"}, "surface", "ai")}>실시간 수익 그래프</strong>
                            <span style={blueTheme({display:"block",marginTop:"3px",fontSize:"8px",color:"#8d8174"}, "surface", "ai")}>3분 단위 수익 누적 흐름 · 현재 구간 자동 확대</span>
                          </div>
                          <div style={blueTheme({padding:"6px 8px",borderRadius:"10px",background:"#f4e6ca",fontSize:"8px",fontWeight:"1000",color:"#81591f"}, "surface", "ai")}>{status==="running"?"LIVE · 3MIN":"COMPLETED"}</div>
                        </div>

                        <div style={blueTheme({position:"relative",height:"174px",marginTop:"12px",overflow:"hidden",borderRadius:"15px",background:"linear-gradient(180deg,#16222d,#0e161e)",border:"1px solid rgba(42,67,87,.8)"}, "accentSurface", "ai")}>
                          {[25,50,75].map((top)=><div key={top} style={blueTheme({position:"absolute",left:0,right:0,top:`${top}%`,height:"1px",background:"rgba(255,255,255,.055)"}, "surface", "ai")}/>)}
                          <svg viewBox="0 0 760 220" preserveAspectRatio="none" style={blueTheme({position:"absolute",inset:"10px 8px 8px",width:"calc(100% - 16px)",height:"calc(100% - 18px)"}, "surface", "ai")}>
                            <defs><linearGradient id="aiMemberArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#315be8" stopOpacity=".34"/><stop offset="100%" stopColor="#315be8" stopOpacity="0"/></linearGradient></defs>
                            {demo.chartPoints && <><polygon points={`18,220 ${demo.chartPoints} 742,220`} fill="url(#aiMemberArea)"/><polyline points={demo.chartPoints} fill="none" stroke="#315be8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></>}
                          </svg>
                          <div style={blueTheme({position:"absolute",left:"12px",top:"10px",fontSize:"7px",color:"rgba(255,255,255,.42)"}, "surface", "ai")}>TOTAL ASSET</div>
                          <div style={blueTheme({position:"absolute",right:"12px",top:"9px",fontSize:"11px",fontWeight:"1000",color:"#f0c977"}, "surface", "ai")}>{aiKrw(demo.totalAmount)}</div>
                          <div style={blueTheme({position:"absolute",left:"12px",bottom:"9px",fontSize:"7px",color:"rgba(255,255,255,.35)"}, "surface", "ai")}>START {aiKrw(demo.investment)}</div>
                          <div style={blueTheme({position:"absolute",right:"12px",bottom:"9px",fontSize:"7px",color:"rgba(255,255,255,.35)"}, "surface", "ai")}>NOW</div>
                        </div>

                        <AiProcessMemberGuide compact />

                        <div style={blueTheme({display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"7px",marginTop:"10px"}, "surface", "ai")}>
                          <div style={blueTheme({padding:"10px 8px",borderRadius:"13px",background:"#fff",border:"1px solid #eadfcf",textAlign:"center"}, "surface", "ai")}><span style={blueTheme({display:"block",fontSize:"7px",color:"#9a8d7d"}, "surface", "ai")}>최근 1분 수익</span><strong style={blueTheme({display:"block",marginTop:"4px",fontSize:"10px",color:"#9a6b28"}, "surface", "ai")}>+{aiKrw(demo.recentIncrement)}</strong></div>
                          <div style={blueTheme({padding:"10px 8px",borderRadius:"13px",background:"#fff",border:"1px solid #eadfcf",textAlign:"center"}, "surface", "ai")}><span style={blueTheme({display:"block",fontSize:"7px",color:"#9a8d7d"}, "surface", "ai")}>1분 평균 수익</span><strong style={blueTheme({display:"block",marginTop:"4px",fontSize:"10px",color:"#4b443d"}, "surface", "ai")}>+{aiKrw(demo.averagePerStep)}</strong></div>
                          <div style={blueTheme({padding:"10px 8px",borderRadius:"13px",background:"#fff",border:"1px solid #eadfcf",textAlign:"center"}, "surface", "ai")}><span style={blueTheme({display:"block",fontSize:"7px",color:"#9a8d7d"}, "surface", "ai")}>진행 가능 횟수</span><strong style={blueTheme({display:"block",marginTop:"4px",fontSize:"10px",color:"#4b443d"}, "surface", "ai")}>{availableCount}회</strong></div>
                        </div>

                        <div style={blueTheme({marginTop:"9px",fontSize:"7px",lineHeight:1.5,color:"#9b8b79",textAlign:"center"}, "surface", "ai")}>
                          ※ 화면의 수익 값은 운영 설정에 따른 모의 시뮬레이션 표시입니다.
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div style={blueTheme(styles.aiBenefitStateWrap, "surface", "ai")}>
                  <div style={blueTheme(styles.aiBenefitDiagonalRibbon, "surface", "ai")}>
                    <span style={blueTheme(styles.aiBenefitRibbonSmall, "surface", "ai")}>
                      {profile?.role === "admin" ? "AI PROCESS · ADMIN" : aiMemberProcess?.status === "running" ? "AI PROCESS · ACTIVE" : aiMemberProcess?.status === "completed" ? "AI PROCESS · COMPLETE" : "AI PROCESS · AVAILABLE"}
                    </span>
                    <strong style={blueTheme(styles.aiBenefitRibbonTitle, "surface", "ai")}>
                      {profile?.role === "admin"
                        ? "회원별 AI프로세스 운영 관리"
                        : aiMemberProcess?.status === "running"
                          ? `${profile?.nickname || "회원"}님의 AI프로세스가 진행 중입니다`
                          : aiMemberProcess?.status === "completed"
                            ? `${profile?.nickname || "회원"}님의 AI프로세스가 완료되었습니다`
                            : Number(aiMemberProcess?.available_count || 0) > 0
                              ? `AI프로세스 ${Number(aiMemberProcess?.available_count || 0)}회 이용 가능합니다`
                              : "AI프로세스 1:1 이용 상담이 가능합니다"}
                    </strong>
                    <span style={blueTheme(styles.aiBenefitRibbonSub, "surface", "ai")}>
                      {profile?.role === "admin"
                        ? "회원 선택 후 진행 횟수 · 금액 · 목표수익률 · 상태를 설정하세요"
                        : aiMemberProcess?.status === "running"
                          ? "상단의 회원 전용 수익 현황에서 진행 상태를 확인하세요"
                          : aiMemberProcess?.status === "completed"
                            ? "진행 결과는 상단의 회원 전용 현황에서 확인할 수 있습니다"
                            : "진행을 원하시면 카카오톡 1:1 고객센터로 문의해 주세요"}
                    </span>
                  </div>
                  <div style={blueTheme(styles.aiBenefitCornerBadge, "surface", "ai")}>
                    <span style={blueTheme({fontSize:"6px",fontWeight:"1000",letterSpacing:"1.3px",color:"rgba(206,226,250,.65)"}, "surface", "ai")}>STATUS</span>
                    <strong style={blueTheme({marginTop:"2px",fontSize:"9px",letterSpacing:".7px",color:"#e8bd70"}, "surface", "ai")}>
                      {profile?.role === "admin" ? "ADMIN" : aiMemberProcess?.status === "running" ? "ACTIVE" : aiMemberProcess?.status === "completed" ? "COMPLETE" : "AVAILABLE"}
                    </strong>
                  </div>

                  <div style={blueTheme(styles.aiProHero, "surface", "ai")}>
                  <div style={blueTheme(styles.aiProHeroGlow, "surface", "ai")}></div>
                  <div style={blueTheme(styles.aiProHeroTag, "surface", "ai")}>AI PROCESS · VIP PRIVATE SYSTEM</div>
                  <div style={blueTheme(styles.aiProHeroRow, "surface", "ai")}>
                    <div style={blueTheme({minWidth:0}, "surface", "ai")}>
                      <h2 style={blueTheme(styles.aiProTitle, "surface", "ai")}>AI 프로세스</h2>
                      <strong style={blueTheme(styles.aiProTitleAccent, "surface", "ai")}>AI 기반 자동화 시스템</strong>
                      <p style={blueTheme(styles.aiProLead, "surface", "ai")}>
                        데이터 분석부터 진행 상황 모니터링까지,
                        자체 AI 시스템을 기반으로 설계된 VIP 전용 프로세스입니다.
                      </p>
                      <div style={blueTheme(styles.aiHeroAvailability, "surface", "ai")}>
                        {profile?.role === "admin"
                          ? "관리자는 상단 회원별 진행 관리에서 각 회원의 이용 횟수와 진행 설정을 직접 관리할 수 있습니다."
                          : aiMemberProcess?.status === "running"
                            ? "현재 회원님의 AI프로세스가 진행 중입니다. 상단에서 투자금액, 모의 수익 현황, 진행률과 그래프를 확인하실 수 있습니다."
                            : aiMemberProcess?.status === "completed"
                              ? "회원님의 AI프로세스 진행이 완료되었습니다. 상단에서 최종 모의 수익 현황과 결과를 확인하실 수 있습니다."
                              : Number(aiMemberProcess?.available_count || 0) > 0
                                ? `현재 회원님께 AI프로세스 ${Number(aiMemberProcess?.available_count || 0)}회 이용 기회가 제공되어 있습니다. 카카오톡 1:1 고객센터 상담 후 진행할 수 있습니다.`
                                : "AI프로세스 이용을 원하시면 카카오톡 1:1 고객센터에서 개별 상담을 신청해 주세요."}
                      </div>
                    </div>
                    <div style={blueTheme(styles.aiProChip, "surface", "ai")}>
                      <span style={blueTheme({fontSize:"22px",fontWeight:"1000",lineHeight:1}, "surface", "ai")}>AI</span>
                      <small style={blueTheme({marginTop:"4px",fontSize:"7px",fontWeight:"900",letterSpacing:"1.2px",opacity:.72}, "surface", "ai")}>PROCESS</small>
                    </div>
                  </div>

                  <div style={blueTheme(styles.aiProFeatureRow, "surface", "ai")}>
                    <div style={blueTheme({textAlign:"center",padding:"8px 2px",borderRight:"1px solid rgba(27,76,134,.12)"}, "surface", "ai")}><b style={blueTheme({display:"block",fontSize:"8px",color:"#1e63ba"}, "surface", "ai")}>01</b><strong style={blueTheme({display:"block",fontSize:"8px",marginTop:"3px"}, "surface", "ai")}>데이터 분석</strong><span style={blueTheme({display:"block",fontSize:"6.5px",marginTop:"2px",color:"#718399"}, "surface", "ai")}>시장 데이터 분석</span></div>
                    <div style={blueTheme({textAlign:"center",padding:"8px 2px",borderRight:"1px solid rgba(27,76,134,.12)"}, "surface", "ai")}><b style={blueTheme({display:"block",fontSize:"8px",color:"#1e63ba"}, "surface", "ai")}>02</b><strong style={blueTheme({display:"block",fontSize:"8px",marginTop:"3px"}, "surface", "ai")}>기회 포착</strong><span style={blueTheme({display:"block",fontSize:"6.5px",marginTop:"2px",color:"#718399"}, "surface", "ai")}>조건 기반 탐색</span></div>
                    <div style={blueTheme({textAlign:"center",padding:"8px 2px",borderRight:"1px solid rgba(27,76,134,.12)"}, "surface", "ai")}><b style={blueTheme({display:"block",fontSize:"8px",color:"#1e63ba"}, "surface", "ai")}>03</b><strong style={blueTheme({display:"block",fontSize:"8px",marginTop:"3px"}, "surface", "ai")}>자동 프로세스</strong><span style={blueTheme({display:"block",fontSize:"6.5px",marginTop:"2px",color:"#718399"}, "surface", "ai")}>설정 기반 진행</span></div>
                    <div style={blueTheme({textAlign:"center",padding:"8px 2px"}, "surface", "ai")}><b style={blueTheme({display:"block",fontSize:"8px",color:"#1e63ba"}, "surface", "ai")}>04</b><strong style={blueTheme({display:"block",fontSize:"8px",marginTop:"3px"}, "surface", "ai")}>모니터링</strong><span style={blueTheme({display:"block",fontSize:"6.5px",marginTop:"2px",color:"#718399"}, "surface", "ai")}>진행 상태 확인</span></div>
                  </div>
                </div>

                <div style={blueTheme(styles.aiProProcessCard, "surface", "ai")}>
                  <div style={blueTheme(styles.aiProSectionHead, "surface", "ai")}>
                    <span style={blueTheme({display:"block",fontSize:"8px",fontWeight:"1000",letterSpacing:"1.7px",color:"#2362b0"}, "surface", "ai")}>AI PROCESS FLOW</span>
                    <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:"17px",color:"#25384f"}, "surface", "ai")}>AI 프로세스 진행 구조</strong>
                    <p style={blueTheme({margin:"5px 0 0",fontSize:"9px",color:"#8491a0"}, "surface", "ai")}>AI가 데이터를 분석하고 설정된 프로세스에 따라 단계별로 진행됩니다.</p>
                  </div>

                  <div style={blueTheme(styles.aiProSteps, "surface", "ai")}>
                    {[
                      ["1","◫","시장 분석","데이터를 분석하여 현재 조건을 확인합니다."],
                      ["2","◎","기회 포착","설정 기준에 맞는 진행 구간을 탐색합니다."],
                      ["3","AI","AI 진행","선정된 조건을 기반으로 프로세스를 진행합니다."],
                      ["4","◈","실시간 확인","진행 상태와 데이터를 지속적으로 확인합니다."],
                      ["5","↘","위험 관리","설정된 기준에 따라 위험 구간을 관리합니다."],
                      ["6","↗","결과 관리","진행 결과를 확인하고 프로세스를 마무리합니다."]
                    ].map(([no,icon,title,desc])=>(
                      <div key={no} style={blueTheme(styles.aiProStep, "surface", "ai")}>
                        <i style={blueTheme(styles.aiProStepNo, "surface", "ai")}>{no}</i>
                        <div style={blueTheme(styles.aiProStepIcon, "surface", "ai")}>{icon}</div>
                        <strong style={blueTheme({display:"block",fontSize:"10px",color:"#263a53",lineHeight:1.3}, "surface", "ai")}>{title}</strong>
                        <p style={blueTheme({margin:"5px 0 0",fontSize:"8px",lineHeight:1.45,color:"#8290a0",wordBreak:"keep-all"}, "surface", "ai")}>{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={blueTheme(styles.aiProLockedCard, "surface", "ai")}>
                  <div style={blueTheme(styles.aiProLockedPattern, "surface", "ai")}></div>
                  <div style={blueTheme(styles.aiProLockIcon, "surface", "ai")}>◆</div>
                  <div style={blueTheme(styles.aiProLockedCopy, "surface", "ai")}>
                    <span style={blueTheme({display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.4px",color:"#efc16c"}, "surface", "ai")}>PRIVATE AI TECHNOLOGY</span>
                    <strong style={blueTheme({display:"block",marginTop:"4px",fontSize:"14px",color:"#fff"}, "surface", "ai")}>VIP 회원을 위한 제한 운영</strong>
                    <p style={blueTheme({margin:"7px 0 0",fontSize:"9px",lineHeight:1.65,color:"rgba(255,255,255,.64)",wordBreak:"keep-all"}, "surface", "ai")}>
                      AI PROCESS는 자체 기술과 운영 시스템을 기반으로 구성되어 있으며,
                      기업의 성장과 발전에 함께해 주신 VIP 회원분들을 위해
                      회원별 이용 가능 횟수와 진행 설정에 따라 개별적으로 운영됩니다.
                    </p>
                  </div>
                </div>

                <div style={blueTheme(styles.aiProHowCard, "surface", "ai")}>
                  <div style={blueTheme(styles.aiProSectionHead, "surface", "ai")}>
                    <span style={blueTheme({display:"block",fontSize:"8px",fontWeight:"1000",letterSpacing:"1.7px",color:"#2362b0"}, "surface", "ai")}>HOW TO USE</span>
                    <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:"16px",color:"#25384f"}, "surface", "ai")}>AI프로세스 이용 절차</strong>
                  </div>
                  <div style={blueTheme(styles.aiProHowRow, "surface", "ai")}>
                    {[
                      ["1","카카오톡 1:1 고객센터","고객센터 상담 신청"],
                      ["2","예약 안내","이용 가능 일정 확인"],
                      ["3","진행 설정","AI 프로세스 안내"],
                      ["4","프로세스 진행","설정된 방식으로 진행"],
                      ["5","결과 확인","진행 결과 안내"]
                    ].map(([no,title,desc],idx)=>(
                      <div key={no} style={blueTheme(styles.aiProHowItem, "surface", "ai")}>
                        <b style={blueTheme({width:"28px",height:"28px",margin:"0 auto 6px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:"#112e55",color:"#fff",fontSize:"10px"}, "surface", "ai")}>{no}</b>
                        <strong style={blueTheme({display:"block",fontSize:"8px",lineHeight:1.3,color:"#26394f"}, "surface", "ai")}>{title}</strong>
                        <span style={blueTheme({display:"block",marginTop:"3px",fontSize:"6.5px",lineHeight:1.35,color:"#8b97a4",wordBreak:"keep-all"}, "surface", "ai")}>{desc}</span>
                        {idx<4 && <em style={blueTheme({position:"absolute",right:"-5px",top:"9px",fontStyle:"normal",fontSize:"20px",color:"#a7b9ce"}, "surface", "ai")}>›</em>}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={blueTheme(styles.aiProStandby, "surface", "ai")}>
                  <div style={blueTheme(styles.aiProStandbyWatermark, "surface", "ai")}>
                    {profile?.role === "admin" ? "ADMIN" : aiMemberProcess?.status === "running" ? "ACTIVE" : aiMemberProcess?.status === "completed" ? "COMPLETE" : "AVAILABLE"}
                  </div>
                  <div style={blueTheme(styles.aiProStandbyIcon, "surface", "ai")}>
                    {aiMemberProcess?.status === "running" ? "◆" : aiMemberProcess?.status === "completed" ? "✓" : "◇"}
                  </div>
                  <span style={blueTheme({position:"relative",display:"block",fontSize:"8px",fontWeight:"1000",letterSpacing:"2px",color:"#e2b35c"}, "surface", "ai")}>AI PROCESS STATUS</span>
                  <strong style={blueTheme({position:"relative",display:"block",marginTop:"7px",fontSize:"18px",lineHeight:1.38,color:"#fff4df",letterSpacing:"-.4px"}, "surface", "ai")}>
                    {profile?.role === "admin"
                      ? "현재 상태 · 회원별 운영 관리"
                      : aiMemberProcess?.status === "running"
                        ? `현재 상태 · ${profile?.nickname || "회원"}님 진행중`
                        : aiMemberProcess?.status === "completed"
                          ? `현재 상태 · ${profile?.nickname || "회원"}님 진행완료`
                          : Number(aiMemberProcess?.available_count || 0) > 0
                            ? `현재 상태 · ${Number(aiMemberProcess?.available_count || 0)}회 진행 가능`
                            : "현재 상태 · 이용 상담 가능"}
                  </strong>
                  <p style={blueTheme({position:"relative",margin:"10px 0 0",fontSize:"10px",lineHeight:1.7,color:"rgba(255,255,255,.66)",wordBreak:"keep-all"}, "surface", "ai")}>
                    {profile?.role === "admin"
                      ? "상단 관리자 화면에서 회원을 선택하고 진행 가능 횟수, 투자금액, 목표수익률과 진행 상태를 개별 설정할 수 있습니다."
                      : aiMemberProcess?.status === "running"
                        ? "회원님의 AI프로세스가 현재 진행 중입니다. 상단의 전용 현황에서 3분 단위 모의 수익 변화와 전체 진행 상황을 확인해 주세요."
                        : aiMemberProcess?.status === "completed"
                          ? "회원님의 AI프로세스 진행이 완료되었습니다. 상단의 전용 현황에서 최종 결과를 확인하실 수 있습니다."
                          : Number(aiMemberProcess?.available_count || 0) > 0
                            ? `회원님께 AI프로세스 ${Number(aiMemberProcess?.available_count || 0)}회 진행 기회가 준비되어 있습니다. 원하시는 경우 카카오톡 1:1 고객센터에서 바로 상담해 주세요.`
                            : "AI프로세스 이용을 원하시면 카카오톡 1:1 고객센터로 문의해 주세요. 이용 가능 여부와 진행 방법을 개별적으로 안내해드립니다."}
                  </p>
                  <div style={blueTheme(styles.aiProStandbyBottom, "surface", "ai")}>
                    {profile?.role === "admin"
                      ? "회원별 설정을 저장한 뒤 진행중 시작 버튼으로 개별 진행을 시작할 수 있습니다."
                      : aiMemberProcess?.status === "running"
                        ? "진행 중에는 상단 AI 수익 현황에서 회원님의 현재 진행 데이터를 확인할 수 있습니다."
                        : aiMemberProcess?.status === "completed"
                          ? "추가 진행 가능 횟수가 있는 경우 카카오톡 1:1 고객센터를 통해 다음 진행을 상담해 주세요."
                          : <><b>카카오톡 1:1 고객센터에서 AI프로세스 진행 상담</b>을 신청해주세요.</>}
                  </div>
                </div>

                <div style={blueTheme(styles.aiProFooter, "surface", "ai")}>
                  <strong style={blueTheme({display:"block",fontSize:"10px",letterSpacing:"1.8px",color:"#7c5a31"}, "surface", "ai")}>AI PROCESS VIP</strong>
                  <span style={blueTheme({display:"block",marginTop:"3px",fontSize:"7px",letterSpacing:"1.5px",color:"#b19c87"}, "surface", "ai")}>PRIVATE · LIMITED · AI SYSTEM</span>
                  <p style={blueTheme({margin:"8px 0 0",fontSize:"9px",lineHeight:1.55,color:"#8e7d6d"}, "surface", "ai")}>AI프로세스 진행 및 중요 안내를 놓치지 않도록 상단 알림 설정을 유지해주세요.</p>
                </div>
                </div>
              </div>
            )}

            {chatTab === "private" && (
              <div style={blueTheme(styles.refPrivateScreen, "surface", "reward")}>
                {profile?.role === "admin" && !selectedAdminChat ? (
                  <>
                    <div style={blueTheme(styles.refSectionTitle, "surface", "reward")}>
                      <div><strong>1:1 상담 목록</strong><span>VIP 회원 문의</span></div>
                    </div>

                    <div style={blueTheme({
                      margin:"0 0 12px",
                      padding:"13px",
                      border:"1px solid #ead7b7",
                      borderRadius:"18px",
                      background:"linear-gradient(180deg,#fffdf8 0%,#fbf3e6 100%)",
                      boxShadow:"0 8px 22px rgba(91,61,27,.06)"
                    }, "accentSurface", "reward")}>
                      <div style={blueTheme({display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px"}, "surface", "reward")}>
                        <div>
                          <span style={blueTheme({display:"block",fontSize:"6.5px",fontWeight:"1000",letterSpacing:"1.6px",color:"#a06d28"}, "surface", "reward")}>MEMBER APPROVAL</span>
                          <strong style={blueTheme({display:"block",marginTop:"3px",fontSize:"13px",color:"#2b2118"}, "surface", "reward")}>회원가입 승인 관리</strong>
                          <span style={blueTheme({display:"block",marginTop:"3px",fontSize:"8px",color:"#9a8875"}, "surface", "reward")}>
                            승인 전 0 · 승인 완료 1
                          </span>
                        </div>
                        <div style={blueTheme({
                          position:"relative",minWidth:"62px",padding:"8px 10px",borderRadius:"13px",
                          background:"#2b2118",color:"#f6d99d",textAlign:"center"
                        }, "surface", "reward")}>
                          <span style={blueTheme({display:"block",fontSize:"6px",letterSpacing:"1px"}, "surface", "reward")}>WAITING</span>
                          <strong style={blueTheme({display:"block",fontSize:"10px",lineHeight:1.25}, "surface", "reward")}>승인 대기</strong>
                          {adminApprovalMembers.filter((member)=>String(member.approval_status)==="0").length > 0 && (
                            <span style={blueTheme({
                              position:"absolute",top:"-9px",right:"-8px",minWidth:"24px",height:"24px",
                              padding:"0 6px",borderRadius:"999px",display:"grid",placeItems:"center",
                              background:"#e32626",color:"#fff",border:"2px solid #fff",
                              boxShadow:"0 4px 10px rgba(227,38,38,.35)",
                              fontSize:"11px",fontWeight:"1000",lineHeight:1
                            }, "surface", "reward")}>
                              {adminApprovalMembers.filter((member)=>String(member.approval_status)==="0").length}
                            </span>
                          )}
                        </div>
                      </div>

                      {adminApprovalMembers.filter((member)=>String(member.approval_status)==="0").length > 0 ? (
                        <>
                          <div style={blueTheme({
                            marginTop:"10px",maxHeight:"230px",overflowY:"auto",
                            borderTop:"1px solid #eadbc7"
                          }, "surface", "reward")}>
                            {adminApprovalMembers
                              .filter((member)=>String(member.approval_status)==="0")
                              .map((member)=>(
                                <div key={member.member_id} style={blueTheme({
                                  display:"flex",alignItems:"center",gap:"9px",
                                  padding:"10px 2px",borderBottom:"1px solid #efe3d2"
                                }, "surface", "reward")}>
                                  <img
                                    src={avatarSrc(member.avatar)}
                                    alt=""
                                    style={blueTheme({width:"34px",height:"34px",borderRadius:"50%",objectFit:"cover",border:"1px solid #dfc28f",flex:"0 0 auto"}, "surface", "reward")}
                                  />
                                  <div style={blueTheme({minWidth:0,flex:1}, "surface", "reward")}>
                                    <strong style={blueTheme({display:"block",fontSize:"10px",color:"#2b2118",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}, "surface", "reward")}>
                                      {member.nickname || "VIP 회원"}
                                    </strong>
                                    <span style={blueTheme({display:"block",marginTop:"2px",fontSize:"7.5px",color:"#9a8875",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}, "surface", "reward")}>
                                      성함 {member.real_name || "-"} · 승인상태 0
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={adminApprovalWorking}
                                    onClick={()=>approveAdminMember(member.member_id, member.nickname || "회원")}
                                    style={blueTheme({
                                      border:0,borderRadius:"11px",padding:"8px 11px",
                                      background:adminApprovalWorking?"#a99d8f":"#176443",
                                      color:"#fff",fontSize:"8px",fontWeight:"1000",
                                      cursor:adminApprovalWorking?"default":"pointer",whiteSpace:"nowrap"
                                    }, "button", "reward")}
                                  >
                                    ✓ 승인
                                  </button>
                                </div>
                              ))}
                          </div>
                          <button
                            type="button"
                            disabled={adminApprovalWorking}
                            onClick={approveAllPendingMembers}
                            style={blueTheme({
                              width:"100%",marginTop:"10px",padding:"10px 12px",
                              border:"1px solid #c99b52",borderRadius:"12px",
                              background:adminApprovalWorking?"#e6ddcf":"#c8953d",
                              color:adminApprovalWorking?"#8f8375":"#fff",
                              fontSize:"9px",fontWeight:"1000",cursor:adminApprovalWorking?"default":"pointer"
                            }, "button", "reward")}
                          >
                            {adminApprovalWorking ? "처리 중..." : "승인 대기 회원 전체 승인"}
                          </button>
                        </>
                      ) : (
                        <div style={blueTheme({
                          marginTop:"10px",padding:"12px",borderRadius:"12px",
                          background:"#f5ecdd",textAlign:"center",fontSize:"8.5px",color:"#8e7b66"
                        }, "surface", "reward")}>
                          현재 승인 대기 회원이 없습니다.
                        </div>
                      )}
                    </div>

                    <input value={memberSearch} onChange={(e)=>setMemberSearch(e.target.value)} placeholder="회원 검색" style={blueTheme(styles.refSearch, "surface", "reward")}/>
                    <div style={blueTheme(styles.refConsultList, "surface", "reward")}>
                      {[...adminMembers]
                        .filter(m => !memberSearch || (m.nickname || "").toLowerCase().includes(memberSearch.toLowerCase()))
                        .sort((a, b) => {
                          const aUnread = Number(adminUnreadCounts[a.chat_id] || 0);
                          const bUnread = Number(adminUnreadCounts[b.chat_id] || 0);
                          if (aUnread !== bUnread) return bUnread - aUnread;
                          return new Date(b.updated_at || b.created_at || 0).getTime()
                            - new Date(a.updated_at || a.created_at || 0).getTime();
                        })
                        .map(member => {
                          const unreadCount = Number(adminUnreadCounts[member.chat_id] || 0);
                          return (
                            <button key={member.member_id} type="button" onClick={()=>openAdminMemberChat(member)} style={blueTheme(styles.refConsultRow, "button", "reward")}>
                              <img
                                src={avatarSrc(member.avatar)}
                                alt=""
                                style={blueTheme(styles.refConsultAvatar, "buttonChild", "reward")}
                              />
                              <div style={blueTheme(styles.refConsultMemberCopy, "buttonChild", "reward")}>
                                <div style={blueTheme(styles.refConsultNameLine, "buttonChild", "reward")}>
                                  <strong>{member.nickname}</strong>
                                  {unreadCount > 0 && (
                                    <i style={blueTheme(styles.refMemberUnreadBadge, "buttonChild", "reward")}>
                                      {unreadCount > 99 ? "99+" : unreadCount}
                                    </i>
                                  )}
                                </div>
                                <span>{unreadCount > 0 ? "새로운 카카오톡 1:1 고객센터가 도착했습니다." : "1:1 상담 시작하기"}</span>
                              </div>
                              <b>›</b>
                            </button>
                          );
                        })}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={blueTheme(styles.refPrivateTop, "surface", "reward")}>
                      {profile?.role === "admin" && <button type="button" onClick={()=>{setSelectedAdminChat(null);setPrivateChatId(null);}}>‹</button>}
                      <img
                        src={profile?.role === "admin"
                          ? avatarSrc(selectedAdminChat?.member?.avatar || selectedAdminChat?.avatar)
                          : avatarSrc(adminIdentity.avatar)}
                        alt="관리자 프로필"
                        style={blueTheme(styles.refSupportAvatar, "surface", "reward")}
                      />
                      <div style={blueTheme(styles.refSupportInfo, "surface", "reward")}>
                        {profile?.role === "admin" ? (
                          <>
                            <strong>{selectedAdminChat?.member?.nickname || selectedAdminChat?.nickname || "회원 상담"}</strong>
                            <span>VIP 전용 카카오톡 1:1 고객센터</span>
                          </>
                        ) : (
                          <><span style={blueTheme({fontSize:"15px",fontWeight:"900",color:"#34251d"}, "surface", "reward")}>VIP 전용 카카오톡 1:1 고객센터</span><span style={blueTheme({fontSize:"12px",fontWeight:"700",color:"#786451",marginTop:"3px"}, "surface", "reward")}>내 닉네임 : <b style={blueTheme({fontSize:"13px",fontWeight:"900",color:"#A36C17"}, "surface", "reward")}>{profile?.nickname || "VIP 회원"}</b></span></>
                        )}
                      </div>
                    </div>
                    <div
                      ref={privateMessagesRef}
                      style={blueTheme(styles.refPrivateMessages, "surface", "reward")}
                      onWheel={() => markUserChatScroll("private")}
                      onTouchMove={() => markUserChatScroll("private")}
                      onScroll={(e) => handleChatScroll("private", e.currentTarget)}
                    >
                      <FloatingScrollDate value={privateScrollDate} />
                      {profile?.role !== "admin" && (
                        <div style={blueTheme(styles.fixedVipSupportWelcome, "surface", "reward")}>
<div style={blueTheme(styles.sponsorSupportEmpty, "surface", "reward")}>
                          <div style={blueTheme(styles.sponsorSupportBadge, "surface", "reward")}>상품 지급</div>
                          <strong style={blueTheme({display:"block",fontSize:"16px",marginBottom:"8px"}, "surface", "reward")}>
                            지급된 상품과 안내를 확인해주세요.
                          </strong>
                          <p style={blueTheme({margin:"0 0 12px"}, "surface", "reward")}>
                            이벤트 당첨 상품과 제품 배송 관련 지급 안내가 이곳에 순차적으로 표시됩니다.
                          </p>

                          <div style={blueTheme({display:"grid",gridTemplateColumns:"1fr",gap:"8px",marginTop:"14px"}, "surface", "reward")}>

                            <button
                              type="button"
                              onClick={() => {
                                setChatTab("event");
                                if (typeof window !== "undefined") window.sessionStorage.setItem("vip-active-tab", "event");
                              }}
                              style={blueTheme(styles.vipBenefitShortcut, "button", "reward")}
                            >
                              <span style={blueTheme({fontSize:"18px"}, "buttonChild", "reward")}>🎁</span>
                              <span>이벤트 확인하기</span>
                            </button>
                          </div>

                          <div style={blueTheme(styles.vipImportantAlert, "surface", "reward")}>
                            <div style={blueTheme(styles.vipImportantAlertIcon, "surface", "reward")}>🔔</div>
                            <div style={blueTheme(styles.vipImportantAlertText, "surface", "reward")}>
                              <strong>꼭 확인해주세요!</strong>
                              <span>
                                이벤트 당첨 및 <b>협찬 배송 안내</b>를 놓치지 않도록<br/>
                                상단의 <b>알림 설정을 꼭! 허용해주세요.</b>
                              </span>
                            </div>
                          </div>
                        </div>
                        </div>
                      )}

                      {privateMessages.length === 0 ? (
                        profile?.role === "admin" ? (
                          <div style={blueTheme(styles.refEmpty, "surface", "reward")}>아직 주고받은 메시지가 없습니다.</div>
                        ) : null
                       ) : privateMessages.map((item, index) => {
                        const mine = item.sender_id === user.id;
                        const dateDivider = shouldShowChatDate(privateMessages, index)
                          ? <ChatDateDivider value={item.created_at} />
                          : null;
                        return (
                          <Fragment key={item.id}>
                            {dateDivider}
                          <div style={blueTheme({...styles.refMsgRow,justifyContent:mine?"flex-end":"flex-start"}, "surface", "reward")}>
                            {!mine && (
                              <img
                                src={profile?.role === "admin"
                                  ? avatarSrc(selectedAdminChat?.member?.avatar || selectedAdminChat?.avatar)
                                  : avatarSrc(adminIdentity.avatar)}
                                alt=""
                                style={blueTheme(styles.refMsgAvatar, "surface", "reward")}
                              />
                            )}
                            <div style={blueTheme({maxWidth:"78%"}, "surface", "reward")}>
                              {!mine && (
                                <div style={blueTheme(styles.refMsgName, "surface", "reward")}>
                                  {profile?.role === "admin"
                                    ? (selectedAdminChat?.member?.nickname || selectedAdminChat?.nickname || memberNames[item.sender_id] || "VIP 회원")
                                    : (memberNames[item.sender_id] || adminIdentity.nickname || "관리자")}
                                </div>
                              )}
                              <div style={blueTheme({display:"flex",gap:"6px",alignItems:"flex-end",flexDirection:mine?"row-reverse":"row"}, "surface", "reward")}>
                                <div style={blueTheme({...styles.refBubble,...(mine?styles.refMyBubble:styles.refOtherBubble)}, "surface", "reward")}>{renderMessageContent(item.content)}</div>
                                <div style={blueTheme(styles.privateMessageMeta, "surface", "reward")}>
                                  {mine && (
                                    <span
                                      style={blueTheme({
                                        ...styles.privateReadReceipt,
                                        ...(item.is_read ? styles.privateReadReceiptRead : styles.privateReadReceiptUnread),
                                      }, "surface", "reward")}
                                    >
                                      {item.is_read ? "읽음" : "안읽음"}
                                    </span>
                                  )}
                                  <span style={blueTheme(styles.refMsgTime, "surface", "reward")}>{formatChatTime(item.created_at)}</span>
                                </div>
                                {profile?.role === "admin" && <button type="button" onClick={()=>adminDeletePrivateMessage(item.id)} style={blueTheme(styles.refDelete, "button", "reward")}>×</button>}
                              </div>
                            </div>
                          </div>
                          </Fragment>
                        );
                      })}
                      <div ref={privateBottomRef} style={blueTheme({height:"1px",width:"100%"}, "surface", "reward")} />
                    </div>
                    <LatestMessageButton kind="private" visible={privateShowLatestButton} />
                    <form onSubmit={sendPrivateMessage} style={blueTheme(styles.refComposer, "surface", "reward")}>
                      <label style={blueTheme(styles.refPlus, "surface", "reward")}>+<input type="file" accept="image/*" hidden onChange={(e)=>uploadChatImage(e.target.files?.[0],"private")}/></label>
                      {profile?.role === "admin" && (
                        <button type="button" onClick={sendPrivateLinkButton} title="자유 링크 버튼 보내기" aria-label="자유 링크 버튼 보내기"
                          style={blueTheme({flex:"0 0 auto",minWidth:"38px",height:"38px",border:"1px solid #dfc69e",borderRadius:"12px",
                            background:"#fffaf1",color:"#8d6028",fontSize:"17px",fontWeight:900,cursor:"pointer"}, "button", "reward")}>
                          🔗
                        </button>
                      )}
                      <div ref={privateEmojiRef} style={blueTheme(styles.refEmojiWrap, "surface", "reward")}>
                        <button
                          type="button"
                          onClick={() => setShowPrivateEmoji((v) => !v)}
                          style={blueTheme(styles.refEmojiButton, "button", "reward")}
                          aria-label="이모티콘"
                        >
                          ☺
                        </button>
                        {showPrivateEmoji && (
                          <div style={blueTheme(styles.refEmojiPanel, "surface", "reward")}>
                            {CHAT_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                style={blueTheme(styles.refEmojiItem, "button", "reward")}
                                onClick={() => {
                                  const input = privateInputRef.current;
                                  if (input) {
                                    const start = input.selectionStart ?? input.value.length;
                                    const end = input.selectionEnd ?? input.value.length;
                                    input.setRangeText(emoji, start, end, "end");
                                    input.focus();
                                  }
                                  setShowPrivateEmoji(false);
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <textarea
                        ref={privateInputRef}
                        defaultValue=""
                        onCompositionStart={() => { privateComposingRef.current = true; }}
                        onCompositionEnd={() => { privateComposingRef.current = false; }}
                        onKeyDown={(e)=>{
                          if (
                            e.key==="Enter" &&
                            !e.shiftKey &&
                            !e.nativeEvent?.isComposing &&
                            !privateComposingRef.current
                          ) {
                            e.preventDefault();
                            sendPrivateMessage(e);
                          }
                        }}
                        placeholder="메시지를 입력하세요..."
                        style={blueTheme(styles.refInput, "surface", "reward")}
                      />
                      <button type="submit" style={blueTheme(styles.refSend, "button", "reward")}>➤</button>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={blueTheme({minHeight:"100dvh",boxSizing:"border-box",background:"#faf8f4",display:"grid",placeItems:"center",padding:"32px 20px",color:"#2e2a24",fontFamily:"-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"}, "surface", "shell")}>
      <section style={blueTheme({width:"100%",maxWidth:420}, "surface", "shell")}>
        <div style={blueTheme({fontSize:12,letterSpacing:3,color:"#a27a3d",fontWeight:800}, "surface", "shell")}>VIP BENEFITS</div>
        <h1 style={blueTheme({fontSize:"clamp(30px,7vw,40px)",lineHeight:1.25,letterSpacing:"-1.5px",margin:"16px 0"}, "surface", "shell")}>VIP를 위한<br/>이벤트와 특별한 혜택</h1>
        <p style={blueTheme({fontSize:14,lineHeight:1.8,color:"#887d6d",margin:"0 0 30px"}, "surface", "shell")}>실시간 이벤트 · 출석 혜택 · AI프로세스</p>
        <form onSubmit={mode === "admin" ? handleLogin : handleMemberEntry} style={blueTheme({display:"flex",flexDirection:"column",gap:12,padding:24,borderRadius:22,background:"#fff",border:"1px solid #e9e2d8"}, "surface", "shell")}>
          <strong style={blueTheme({fontSize:17,marginBottom:8}, "surface", "shell")}>{mode === "admin"?"관리자 로그인":"VIP 입장"}</strong>
          <label htmlFor="entry-nickname" style={blueTheme(styles.label, "surface", "shell")}>{mode === "admin"?"관리자 성함":"오픈방 닉네임"}</label>
          <input id="entry-nickname" required maxLength={40} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder={mode === "admin"?"관리자 성함":"등록된 오픈방 닉네임"} autoComplete="username" style={blueTheme({...styles.input,boxSizing:"border-box",width:"100%"}, "surface", "shell")}/>
          {mode === "admin" ? <>
            <label htmlFor="entry-password" style={blueTheme(styles.label, "surface", "shell")}>비밀번호</label>
            <input id="entry-password" required type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" style={blueTheme({...styles.input,boxSizing:"border-box",width:"100%"}, "surface", "shell")}/>
          </> : <>
            <label htmlFor="entry-name" style={blueTheme(styles.label, "surface", "shell")}>본인 이름</label>
            <input id="entry-name" required maxLength={80} value={realName} onChange={e=>setRealName(e.target.value)} placeholder="등록된 본인 이름" autoComplete="name" style={blueTheme({...styles.input,boxSizing:"border-box",width:"100%"}, "surface", "shell")}/>
          </>}
          <button disabled={working} type="submit" style={blueTheme({...styles.primary,marginTop:8,padding:16,borderRadius:12}, "button", "shell")}>{working?"확인 중…":mode === "admin"?"관리자 로그인":"혜택 확인하기"}</button>
          {notice && <p role="status" style={blueTheme({fontSize:13,lineHeight:1.6,color:"#9c4836",margin:0}, "surface", "shell")}>{notice}</p>}
          {mode !== "admin" && <p style={blueTheme({fontSize:11,color:"#a09280",lineHeight:1.6,margin:"2px 0 0"}, "surface", "shell")}>사전 등록된 회원만 입장할 수 있습니다.</p>}
        </form>
        <button type="button" onClick={()=>{setMode(mode === "admin"?"login":"admin");setNickname("");setPassword("");setNotice("");}} style={blueTheme({display:"block",margin:"20px auto 0",border:0,background:"transparent",fontSize:11,color:"#998b78",cursor:"pointer",padding:8}, "button", "shell")}>{mode === "admin"?"회원 입장으로 돌아가기":"관리자 로그인"}</button>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 12% 8%, rgba(225,178,105,.28) 0%, transparent 27%), radial-gradient(circle at 88% 12%, rgba(123,77,48,.18) 0%, transparent 30%), linear-gradient(145deg,#f8efe2 0%,#ead8c2 46%,#f7ead8 100%)",
    color: "#2c211c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  card: {
    width: "100%",
    maxWidth: "430px",
    background: "rgba(255,250,242,.94)",
    border: "1px solid rgba(133,91,52,.22)",
    borderRadius: "24px",
    padding: "32px 28px",
  },

  logo: {
    width: "60px",
    height: "60px",
    border: "1px solid #b38b42",
    borderRadius: "50%",
    margin: "0 auto 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9b692d",
    fontWeight: "800",
  },

  goldLabel: {
    color: "#a98a4b",
    fontSize: "10px",
    letterSpacing: "3px",
    textAlign: "center",
  },

  title: {
    textAlign: "center",
    fontSize: "30px",
    margin: "8px 0",
  },

  description: {
    color: "#888",
    textAlign: "center",
    lineHeight: "1.7",
    fontSize: "14px",
    marginBottom: "25px",
  },

  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "5px",
    background: "rgba(255,255,255,.72)",
    padding: "5px",
    borderRadius: "11px",
    marginBottom: "22px",
  },

  tab: {
    border: 0,
    background: "transparent",
    color: "#777",
    padding: "11px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "700",
  },

  activeTab: {
    background: "linear-gradient(135deg,#fffaf1,#f1dfc6)",
    color: "#9b692d",
  },

  form: {
    display: "flex",
    flexDirection: "column",
  },

  label: {
    fontSize: "12px",
    color: "#999",
    margin: "0 0 7px 3px",
  },

  input: {
    boxSizing: "border-box",
    width: "100%",
    background: "rgba(255,255,255,.72)",
    color: "#2d211b",
    border: "1px solid rgba(116,79,48,.20)",
    borderRadius: "10px",
    padding: "14px",
    marginBottom: "15px",
    outline: "none",
    fontSize: "16px",
    touchAction: "manipulation",
  },

  primary: {
    background:
      "linear-gradient(135deg, #a77b30 0%, #dfba63 50%, #9b7029 100%)",
    color: "#080808",
    border: 0,
    borderRadius: "10px",
    padding: "14px",
    fontWeight: "800",
    cursor: "pointer",
  },

  notice: {
    marginTop: "17px",
    background: "#fff8ec",
    border: "1px solid #e0c49a",
    color: "#9b692d",
    borderRadius: "9px",
    padding: "12px",
    fontSize: "12px",
    textAlign: "center",
  },

  footer: {
    color: "#444",
    textAlign: "center",
    fontSize: "9px",
    letterSpacing: "2px",
    marginTop: "26px",
  },

  chatBox: {
    width: "100%",
    maxWidth: "760px",
    height: "820px",
    maxHeight: "94vh",
    background: "rgba(248,239,226,.96)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(112,75,48,.18)",
    borderRadius: "20px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  chatHeader: {
    padding: "14px 16px",
    borderBottom: "1px solid rgba(255,255,255,.07)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "linear-gradient(135deg,#2b2421,#171716)",
    color: "#fff8ee",
  },

  chatTitle: {
    margin: "5px 0 0",
    fontSize: "20px",
  },

  logout: {
    background: "transparent",
    color: "#888",
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "8px 11px",
    cursor: "pointer",
  },

  memberBar: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "13px 22px",
    borderBottom: "1px solid rgba(148,184,255,.12)",
  },

  memberSmall: {
    color: "#666",
    fontSize: "9px",
    marginBottom: "2px",
  },

  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "18px 16px 22px",
    scrollBehavior: "auto",
    background: "radial-gradient(circle at 88% 8%,rgba(189,141,81,.16),transparent 26%),linear-gradient(180deg,#3a2d27,#2f2724)",
  },

  empty: {
    color: "#666",
    textAlign: "center",
    marginTop: "120px",
    lineHeight: "1.8",
  },

  crown: {
    color: "#b68e45",
    fontSize: "30px",
    marginBottom: "10px",
  },

  messageRow: {
    display: "flex",
    marginBottom: "14px",
  },

  messageName: {
    display: "inline-flex",
    alignItems: "center",
    color: "#f4d27a",
    fontSize: "12px",
    margin: "0 5px 6px",
    fontWeight: "900",
    letterSpacing: "0.25px",
    textShadow: "0 1px 10px rgba(244,210,122,.22)",
    background: "rgba(216,178,92,.10)",
    border: "1px solid rgba(216,178,92,.18)",
    borderRadius: "999px",
    padding: "3px 8px",
  },

  privateAvatar: {
    width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", flexShrink: 0,
    border: "1px solid rgba(216,178,92,.35)", boxShadow: "0 4px 14px rgba(0,0,0,.25)",
  },

  kakaoNickname: {
    fontSize: "13px",
    fontWeight: "800",
    color: "#e8edf5",
    lineHeight: 1.2,
    paddingLeft: "2px",
  },

  chatTime: {
    fontSize: "10px",
    fontWeight: "600",
    color: "rgba(220,228,240,.56)",
    whiteSpace: "nowrap",
    lineHeight: 1.2,
    paddingBottom: "2px",
    flexShrink: 0,
  },

  adminDeleteButton: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    border: "1px solid rgba(255,74,74,.55)",
    background: "rgba(255,45,45,.14)",
    color: "#ff5d5d",
    fontSize: "17px",
    fontWeight: "900",
    lineHeight: "18px",
    cursor: "pointer",
    flexShrink: 0,
  },

  chatToolRow: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    marginRight: "4px",
  },

  chatToolButton: {
    width: "38px",
    height: "38px",
    borderRadius: "11px",
    border: "1px solid rgba(216,178,92,.24)",
    background: "rgba(255,255,255,.06)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "19px",
    flexShrink: 0,
  },

  emojiPanel: {
    position: "absolute",
    left: 0,
    bottom: "46px",
    width: "260px",
    padding: "10px",
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
    background: "#101d31",
    border: "1px solid rgba(216,178,92,.32)",
    borderRadius: "14px",
    boxShadow: "0 14px 34px rgba(0,0,0,.38)",
    zIndex: 50,
  },

  emojiButton: {
    width: "34px",
    height: "34px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "21px",
  },

  freezeAdminBar: {
    margin: "10px 14px 0", padding: "11px 12px", borderRadius: "13px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px",
    background: "rgba(10,20,40,.88)", border: "1px solid rgba(255,255,255,.10)",
  },
  freezeAdminHint: {fontSize:"11px",color:"#9aa8bf",marginTop:"3px"},
  freezeButton: {border:0,borderRadius:"10px",padding:"9px 12px",background:"#a52a35",color:"#fff",fontWeight:"900",cursor:"pointer"},
  unfreezeButton: {border:0,borderRadius:"10px",padding:"9px 12px",background:"#1f8b62",color:"#fff",fontWeight:"900",cursor:"pointer"},
  frozenBanner: {margin:"10px 14px 0",padding:"11px 12px",borderRadius:"12px",textAlign:"center",fontSize:"13px",fontWeight:"800",color:"#ffd9dd",background:"rgba(130,24,36,.28)",border:"1px solid rgba(255,100,115,.28)"},
  frozenTextarea: {opacity:.55,cursor:"not-allowed"},

  bubble: {
    maxWidth: "520px",
    padding: "11px 14px",
    borderRadius: "13px",
    fontSize: "14px",
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  myBubble: {
    background: "#332816",
    border: "1px solid #594522",
    color: "#f0d594",
  },

  otherBubble: {
    background: "#191919",
    border: "1px solid rgba(116,79,48,.20)",
    color: "#ddd",
  },

  chatNotice: {
    color: "#9b692d",
    background: "#fff8ec",
    padding: "8px 20px",
    fontSize: "11px",
  },

  sendArea: {
    borderTop: "1px solid #282116",
    padding: "14px",
    display: "flex",
    gap: "10px",
  },

  textarea: {
    flex: 1,
    resize: "none",
    background: "rgba(255,255,255,.72)",
    color: "#fff",
    border: "1px solid rgba(116,79,48,.20)",
    borderRadius: "10px",
    padding: "12px",
    outline: "none",
    fontFamily: "inherit",
  },

  sendButton: {
    width: "85px",
    background: "#c49a4b",
    color: "#080808",
    border: 0,
    borderRadius: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  avatarButton: {
    width: "44px",
    height: "44px",
    padding: 0,
    borderRadius: "50%",
    border: "2px solid #b68e45",
    background: "#111",
    overflow: "hidden",
    cursor: "pointer",
    flexShrink: 0,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  avatarPicker: {
    margin: "12px 22px",
    padding: "16px",
    borderRadius: "15px",
    border: "1px solid rgba(133,91,52,.22)",
    background: "#121212",
  },

  avatarPickerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },

  avatarClose: {
    background: "transparent",
    color: "#888",
    border: 0,
    cursor: "pointer",
    fontSize: "17px",
  },

  avatarGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(6, minmax(0, 1fr))",
    gap: "10px",
  },

  avatarChoice: {
    padding: "3px",
    aspectRatio: "1 / 1",
    borderRadius: "50%",
    border: "2px solid transparent",
    background: "#191919",
    overflow: "hidden",
    cursor: "pointer",
  },

  avatarChoiceSelected: {
    border: "2px solid #d8b25c",
  },

  avatarChoiceImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "50%",
  },

  avatarPickerText: {
    marginTop: "12px",
    color: "#777",
    fontSize: "11px",
  },

  eventPage: {
    flex: 1,
    overflowY: "auto",
    padding: "22px",
  },

  eventTop: {
    padding: "22px",
    borderRadius: "18px",
    border: "1px solid #4a391b",
    background:
      "linear-gradient(120deg, #111416 0%, #111416 58%, #2a2110 100%)",
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "center",
  },

  eventMiniTitle: {
    color: "#9b692d",
    fontSize: "10px",
    letterSpacing: "3px",
    fontWeight: "800",
  },

  eventTitle: {
    marginTop: "9px",
    fontSize: "25px",
    fontWeight: "900",
  },

  eventDescription: {
    marginTop: "8px",
    color: "#999",
    fontSize: "13px",
    lineHeight: "1.6",
  },

  eventLiveBadge: {
    color: "#e2bd65",
    border: "1px solid #7a5b20",
    background: "#1d170b",
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "10px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  eventNoticeBox: {
    marginTop: "14px",
    padding: "15px 17px",
    borderRadius: "14px",
    border: "1px solid rgba(116,79,48,.20)",
    background: "#121518",
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  eventNoticeIcon: {
    fontSize: "25px",
  },

  eventNoticeTitle: {
    fontSize: "14px",
    fontWeight: "900",
  },

  eventNoticeText: {
    marginTop: "4px",
    color: "#858585",
    fontSize: "11px",
    lineHeight: "1.6",
  },

  eventNoticeMessage: {
    marginTop: "12px",
    padding: "11px 13px",
    borderRadius: "10px",
    border: "1px solid #49391c",
    background: "#fff8ec",
    color: "#e0bb65",
    fontSize: "12px",
  },

  eventSectionTitle: {
    margin: "20px 2px 10px",
    color: "#777",
    fontSize: "10px",
    letterSpacing: "2px",
    fontWeight: "900",
  },

  eventGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(270px, 1fr))",
    gap: "12px",
  },

  eventCard: {
    minWidth: 0,
    padding: "16px",
    background: "linear-gradient(145deg,rgba(20,38,67,.90),rgba(11,25,48,.92))",
    border: "1px solid rgba(132,174,255,.18)",
    borderRadius: "15px",
    color: "#fff",
    display: "flex",
    gap: "13px",
    textAlign: "left",
  },

  eventCardActive: {
    border: "1px solid #a47b2d",
    boxShadow:
      "0 0 0 1px rgba(216,178,92,.08)",
  },

  eventIconBox: {
    width: "48px",
    height: "48px",
    borderRadius: "13px",
    background: "#1b1e21",
    border: "1px solid #303438",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
    flexShrink: 0,
  },

  eventCardBody: {
    flex: 1,
    minWidth: 0,
  },

  eventRound: {
    color: "#8d8d8d",
    fontSize: "10px",
    marginBottom: "5px",
  },

  eventCardTitle: {
    fontWeight: "900",
    fontSize: "15px",
  },

  eventCardText: {
    marginTop: "5px",
    color: "#808080",
    fontSize: "11px",
    lineHeight: "1.5",
  },

  eventCardBottom: {
    marginTop: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },

  eventReady: {
    color: "#777",
    fontSize: "11px",
    fontWeight: "800",
  },

  eventActiveText: {
    color: "#65d99c",
    fontSize: "11px",
    fontWeight: "900",
  },

  eventDoneText: {
    color: "#777",
    fontSize: "11px",
    fontWeight: "800",
  },

  eventJoinButton: {
    border: "1px solid #8a6727",
    background:
      "linear-gradient(135deg,#b88932,#e3bd61)",
    color: "#080808",
    borderRadius: "8px",
    padding: "7px 11px",
    fontSize: "11px",
    fontWeight: "900",
    cursor: "pointer",
  },

  eventJoinedButton: {
    background: "#18251f",
    color: "#65d99c",
    border: "1px solid #28563d",
    cursor: "default",
  },

  eventWinner: {
    color: "#e0ba60",
    fontSize: "11px",
    fontWeight: "900",
  },

  eventNext: {
    color: "#666",
    fontSize: "10px",
  },

  eventEmpty: {
    gridColumn: "1 / -1",
    padding: "60px 20px",
    color: "#666",
    textAlign: "center",
    border: "1px dashed #292929",
    borderRadius: "15px",
  },

  aiPage: {
    flex: 1,
    overflowY: "auto",
    padding: "18px",
    background: "linear-gradient(180deg,rgba(10,24,48,.78),rgba(7,17,33,.92))",
  },

  aiHero: {
    position: "relative",
    overflow: "hidden",
    padding: "24px",
    minHeight: "90px",
    borderRadius: "18px",
    border: "1px solid rgba(121,163,255,.28)",
    background:
      "radial-gradient(circle at 88% 45%, rgba(74,122,255,.36) 0%, rgba(20,44,83,.45) 30%, rgba(12,28,52,.94) 70%)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
  },

  aiHeroLabel: {
    color: "#e0b951",
    fontSize: "9px",
    letterSpacing: "3px",
    fontWeight: "900",
  },

  aiHeroTitle: {
    marginTop: "9px",
    color: "#f3f3ef",
    fontSize: "27px",
    fontWeight: "900",
  },

  aiHeroText: {
    marginTop: "7px",
    color: "#999",
    fontSize: "11px",
    lineHeight: "1.6",
  },

  aiHeroDiamond: {
    color: "#4da3ff",
    fontSize: "44px",
    textShadow:
      "0 0 20px rgba(77,163,255,.45)",
    paddingRight: "10px",
  },

  aiMenu: {
    marginTop: "12px",
    padding: "7px",
    background: "#101418",
    border: "1px solid #292d31",
    borderRadius: "13px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "7px",
  },

  aiMenuButton: {
    border: 0,
    borderRadius: "9px",
    padding: "11px",
    background: "transparent",
    color: "#81878c",
    cursor: "pointer",
    fontWeight: "800",
  },

  aiMenuActive: {
    color: "#111",
    background:
      "linear-gradient(135deg,#d39c36,#f0c75e)",
    boxShadow:
      "0 4px 15px rgba(213,160,55,.18)",
  },

  aiNotice: {
    marginTop: "12px",
    padding: "10px 13px",
    background: "#fff8ec",
    border: "1px solid #44361c",
    color: "#9b692d",
    borderRadius: "10px",
    fontSize: "11px",
  },

  aiPanel: {
    marginTop: "13px",
    padding: "19px",
    background: "rgba(14,31,56,.86)",
    border: "1px solid #2b3035",
    borderTop: "2px solid #9e762a",
    borderRadius: "16px",
  },

  aiPanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  },

  aiPanelTitle: {
    color: "#eee",
    fontSize: "18px",
    fontWeight: "900",
  },

  aiPanelSub: {
    color: "#747b80",
    fontSize: "10px",
    marginTop: "5px",
  },

  aiStatusButtons: {
    display: "flex",
    gap: "7px",
  },

  aiStatusButton: {
    border: "1px solid #30363b",
    borderRadius: "999px",
    background: "transparent",
    color: "#7e858b",
    padding: "7px 12px",
    fontSize: "10px",
    cursor: "pointer",
  },

  aiStatusActive: {
    border: "1px solid #9d721e",
    color: "#e4b84f",
    background: "#211a0c",
  },

  aiTradeHero: {
    display:"flex", justifyContent:"space-between", alignItems:"center", gap:"18px",
    padding:"24px", borderRadius:"20px", marginBottom:"12px",
    background:"linear-gradient(135deg,rgba(18,44,83,.98),rgba(7,18,36,.98))",
    border:"1px solid rgba(105,158,255,.22)", boxShadow:"0 16px 45px rgba(0,0,0,.22)"
  },
  aiTradeEyebrow:{fontSize:"10px",fontWeight:"900",letterSpacing:"1.8px",color:"#75a7ff",marginBottom:"7px"},
  aiTradeTitle:{fontSize:"25px",fontWeight:"950",color:"#f5f8ff",marginBottom:"7px"},
  aiTradeDesc:{fontSize:"12px",lineHeight:1.65,color:"rgba(225,234,249,.68)",maxWidth:"650px"},
  aiTradeLive:{padding:"9px 13px",borderRadius:"999px",background:"rgba(47,214,139,.10)",border:"1px solid rgba(47,214,139,.25)",color:"#61e6a3",fontSize:"12px",fontWeight:"900",whiteSpace:"nowrap"},
  aiEducationBanner:{display:"flex",gap:"10px",alignItems:"center",padding:"10px 14px",marginBottom:"14px",borderRadius:"12px",background:"rgba(246,190,68,.07)",border:"1px solid rgba(246,190,68,.18)",color:"rgba(236,241,250,.72)",fontSize:"11px"},
  aiSummaryGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"11px",marginBottom:"12px"},
  aiSummaryCard:{padding:"18px",borderRadius:"16px",background:"rgba(12,28,52,.92)",border:"1px solid rgba(255,255,255,.07)",display:"flex",flexDirection:"column",gap:"7px"},
  aiSummaryCardStrong:{padding:"18px",borderRadius:"16px",background:"linear-gradient(145deg,rgba(31,73,137,.92),rgba(14,37,73,.96))",border:"1px solid rgba(100,158,255,.25)",display:"flex",flexDirection:"column",gap:"7px"},
  aiPlusText:{color:"#57e39a",fontWeight:"950"},
  aiMinusText:{color:"#ff7474",fontWeight:"950"},
  aiMainGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:"12px",marginBottom:"12px"},
  aiTradePanel:{padding:"18px",borderRadius:"20px",background:"rgba(255,250,242,.96)",border:"1px solid rgba(126,86,52,.16)",boxShadow:"0 10px 28px rgba(83,52,31,.08)",marginBottom:"12px"},
  aiSectionHead:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"15px"},
  aiChartRatePlus:{color:"#57e39a",fontSize:"17px",fontWeight:"950"},
  aiChartRateMinus:{color:"#ff7474",fontSize:"17px",fontWeight:"950"},
  aiChartBox:{height:"190px",borderRadius:"13px",background:"linear-gradient(180deg,rgba(55,135,255,.06),rgba(0,0,0,.06))",overflow:"hidden",color:"#55d99a",display:"flex",alignItems:"center",justifyContent:"center"},
  aiSvg:{width:"100%",height:"100%",display:"block"},
  aiChartWaiting:{padding:"25px",textAlign:"center",color:"rgba(220,230,245,.48)",fontSize:"12px"},
  aiChartFooter:{display:"flex",justifyContent:"space-between",gap:"8px",marginTop:"8px",fontSize:"10px",color:"rgba(220,230,245,.45)"},
  aiCountdownBox:{fontVariantNumeric:"tabular-nums",padding:"8px 10px",borderRadius:"9px",background:"rgba(71,137,245,.11)",color:"#8bb8ff",fontWeight:"950",fontSize:"13px"},
  aiDecisionFlow:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"6px",padding:"12px 0 16px"},
  aiDurationInfo:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:"8px"},
  aiManualRefresh:{border:"1px solid rgba(91,153,255,.28)",background:"rgba(58,120,220,.12)",color:"#cfe0ff",padding:"8px 11px",borderRadius:"9px",fontSize:"11px",fontWeight:"850",cursor:"pointer"},
  aiEmptyInvest:{padding:"28px",textAlign:"center",borderRadius:"13px",background:"rgba(255,255,255,.025)",color:"rgba(220,230,245,.55)",fontSize:"12px"},
  aiHoldingGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"10px"},
  aiHoldingCard:{padding:"16px",borderRadius:"15px",background:"linear-gradient(145deg,rgba(19,44,80,.8),rgba(8,22,42,.9))",border:"1px solid rgba(90,150,250,.14)"},
  aiHoldingTop:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px",marginBottom:"12px"},
  aiCoinBadge:{fontSize:"9px",fontWeight:"950",letterSpacing:".8px",padding:"5px 7px",borderRadius:"7px",background:"rgba(245,184,64,.10)",color:"#f1c464"},
  aiStockBadge:{fontSize:"9px",fontWeight:"950",letterSpacing:".8px",padding:"5px 7px",borderRadius:"7px",background:"rgba(81,145,255,.11)",color:"#83b1ff"},
  aiBuyingBadge:{fontSize:"9px",fontWeight:"900",padding:"5px 7px",borderRadius:"999px",background:"rgba(52,211,135,.09)",color:"#61df9e"},
  aiHoldingName:{fontSize:"17px",fontWeight:"950",color:"#f3f7ff"},
  aiHoldingSymbol:{fontSize:"10px",color:"rgba(210,223,243,.45)",marginTop:"3px",marginBottom:"14px"},
  aiHoldingBottom:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",paddingTop:"11px",borderTop:"1px solid rgba(255,255,255,.06)"},
  aiActivityList:{display:"flex",flexDirection:"column",gap:"8px"},
  aiActivityRow:{display:"flex",alignItems:"center",gap:"10px",padding:"10px",borderRadius:"11px",background:"rgba(255,255,255,.025)"},
  aiActivityBuy:{minWidth:"38px",textAlign:"center",fontSize:"9px",fontWeight:"950",padding:"5px",borderRadius:"6px",background:"rgba(48,211,135,.10)",color:"#58df98"},
  aiActivitySell:{minWidth:"38px",textAlign:"center",fontSize:"9px",fontWeight:"950",padding:"5px",borderRadius:"6px",background:"rgba(255,92,92,.09)",color:"#ff8585"},
  aiActivityAnalyze:{minWidth:"38px",textAlign:"center",fontSize:"9px",fontWeight:"950",padding:"5px",borderRadius:"6px",background:"rgba(75,139,245,.10)",color:"#8cb8ff"},
  aiExplainList:{display:"flex",flexDirection:"column",gap:"9px"},
  aiDisclaimer:{padding:"13px 15px",borderRadius:"12px",background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.05)",color:"rgba(213,224,242,.48)",fontSize:"10px",lineHeight:1.6,marginBottom:"10px"},
  aiErrorBox:{padding:"16px",borderRadius:"12px",background:"rgba(255,70,70,.07)",color:"#ffaaaa",fontSize:"12px"},

  aiProcessGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "10px",
    marginTop: "15px",
  },

  aiProcessCard: {
    padding: "15px",
    borderRadius: "13px",
    border: "1px solid #2a3035",
    background: "#0d1114",
  },

  aiProcessTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
  },

  aiProcessRound: {
    color: "#4da3ff",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  aiProcessName: {
    marginTop: "5px",
    fontWeight: "900",
    fontSize: "14px",
  },

  aiProcessReady: {
    padding: "5px 8px",
    borderRadius: "999px",
    border: "1px solid #343a40",
    color: "#777f85",
    fontSize: "9px",
  },

  aiProcessInfo: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },

  aiProcessInfo: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },

  aiMoneyGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "10px",
    marginTop: "15px",
  },

  aiMoneyCard: {
    padding: "16px",
    background: "#0d1114",
    border: "1px solid #2a3035",
    borderRadius: "13px",
  },

  aiMoneyLabel: {
    color: "#7e858b",
    fontSize: "10px",
  },

  aiMoneyGreen: {
    marginTop: "8px",
    color: "#53dfa4",
    fontSize: "21px",
    fontWeight: "900",
  },

  aiMoneyWhite: {
    marginTop: "8px",
    color: "#f0f0ed",
    fontSize: "21px",
    fontWeight: "900",
  },

  aiChartBox: {
    marginTop: "10px",
    minHeight: "190px",
    padding: "15px",
    background: "#0d1114",
    border: "1px solid #2a3035",
    borderRadius: "13px",
  },

  aiChartHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    color: "#e2e2df",
    fontSize: "11px",
  },

  aiChartEmpty: {
    height: "135px",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  aiChartLine: {
    position: "absolute",
    inset: "15px 0 0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-around",
    opacity: 0.25,
  },

  aiChartEmptyText: {
    position: "relative",
    zIndex: 2,
    color: "#555d62",
    fontSize: "10px",
  },

  aiLogBox: {
    marginTop: "10px",
    padding: "15px",
    background: "#0d1114",
    border: "1px solid #2a3035",
    borderRadius: "13px",
  },

  aiLogEmpty: {
    color: "#5f666b",
    fontSize: "10px",
    padding: "25px 0 10px",
    textAlign: "center",
  },
  gameGuide: { marginTop: "11px", padding: "10px 12px", borderRadius: "11px", background: "rgba(78,126,255,.08)", border: "1px solid rgba(115,158,255,.16)", display: "flex", flexDirection: "column", gap: "5px", color: "#cbd9f7", fontSize: "10px", lineHeight: 1.55 },
  gameArea: { marginTop: "11px", padding: "12px", borderRadius: "12px", background: "rgba(5,15,31,.62)", border: "1px solid rgba(120,163,255,.14)" },
  gameLabel: { color: "#aebfdf", fontSize: "10px", fontWeight: "800", marginBottom: "9px" },
  gameFourGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "7px" },
  gameChoice: { border: "1px solid rgba(137,169,230,.22)", background: "rgba(22,43,75,.78)", color: "#eaf1ff", borderRadius: "10px", padding: "10px 5px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center", fontSize: "12px" },
  gameChoiceSelected: { border: "1px solid #78a7ff", background: "rgba(63,113,219,.30)", boxShadow: "0 0 18px rgba(75,129,255,.18)" },
  gameSubmit: { width: "100%", marginTop: "10px", border: "1px solid rgba(139,176,255,.36)", background: "linear-gradient(135deg,#4f7de8,#6c8fff)", color: "#fff", borderRadius: "10px", padding: "10px 12px", fontWeight: "900", cursor: "pointer" },
  numberRow: { display: "flex", gap: "8px" },
  gameInput: { flex: 1, minWidth: 0, background: "rgba(7,18,36,.9)", color: "#fff", border: "1px solid rgba(133,171,244,.25)", borderRadius: "10px", padding: "11px 12px", outline: "none" },
  gameSubmitSmall: { width: "78px", border: 0, borderRadius: "10px", background: "linear-gradient(135deg,#4f7de8,#6c8fff)", color: "#2d211b", fontWeight: "900", cursor: "pointer" },
  quizQuestion: { color: "#f2f6ff", fontSize: "12px", fontWeight: "900", lineHeight: 1.55, marginBottom: "9px" },
  quizGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" },
  quizChoice: { textAlign: "left", border: "1px solid rgba(137,169,230,.22)", background: "rgba(22,43,75,.78)", color: "#dce8ff", borderRadius: "10px", padding: "8px", cursor: "pointer", fontSize: "10px", lineHeight: 1.45, display:"flex", alignItems:"center", gap:"7px", minWidth:0 },
  quizOptionNumber: { flex:"0 0 25px", width:"25px", height:"25px", borderRadius:"8px", display:"inline-flex", alignItems:"center", justifyContent:"center", background:"rgba(255,255,255,.12)", border:"1px solid rgba(255,255,255,.18)", color:"#fff", fontSize:"9px", fontWeight:"1000", lineHeight:1 },
  quizOptionText: { minWidth:0, display:"block", fontSize:"9px", fontWeight:"800", lineHeight:1.35, color:"inherit", wordBreak:"keep-all", overflowWrap:"anywhere" },
  gameChoiceIcon: { fontSize:"15px", lineHeight:1 },
  gameChoiceNumber: { fontSize:"9px", fontWeight:"1000", whiteSpace:"nowrap" },
  rouletteWheel: { width: "66px", height: "66px", margin: "2px auto 8px", borderRadius: "50%", border: "5px solid rgba(124,164,255,.75)", background: "conic-gradient(#547de1 0 25%,#182f58 25% 50%,#d2aa55 50% 75%,#223f75 75% 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2d211b", fontSize: "25px", transition: "transform .9s cubic-bezier(.15,.8,.2,1)" },
  myEntry: { marginTop: "10px", padding: "8px 10px", borderRadius: "9px", background: "rgba(63,199,145,.10)", border: "1px solid rgba(83,223,164,.20)", color: "#70e2b0", fontSize: "10px", fontWeight: "800" },
  resultReveal: { marginTop: "9px", padding: "8px 10px", borderRadius: "9px", background: "rgba(210,170,85,.10)", border: "1px solid rgba(210,170,85,.22)", color: "#e8c875", fontSize: "10px", fontWeight: "900" },
  eventJoinedText: { color: "#6de0ad", fontSize: "10px", fontWeight: "900" },
  eventOpenText: { color: "#91b6ff", fontSize: "10px", fontWeight: "900" },

  // 2026 reference-driven app UI
  brandWrap: {display:"flex",alignItems:"center",gap:"10px"},
  brandAvatar: {width:"38px",height:"38px",borderRadius:"12px",display:"grid",placeItems:"center",fontSize:"24px",background:"#fff7e9",border:"1px solid #dfc39d",boxShadow:"0 5px 16px rgba(61,39,24,.18)"},
  brandTitle: {fontSize:"17px",fontWeight:"900",letterSpacing:".2px",color:"#fff7e9"},
  brandSub: {fontSize:"10px",color:"#cbb9a9",marginTop:"2px"},
  headerActions: {display:"flex",alignItems:"center",gap:"8px"},
  headerBell: {width:"34px",height:"34px",borderRadius:"12px",display:"grid",placeItems:"center",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)"},
  loginCrown: {fontSize:"42px",textAlign:"center",color:"#b17a35",marginBottom:"4px"},
  loginMascot: {fontSize:"78px",textAlign:"center",margin:"10px 0 18px",filter:"drop-shadow(0 10px 16px rgba(80,48,26,.16))"},

  groupEventCard: {margin:"10px 16px 0",padding:"13px 14px",display:"flex",alignItems:"center",gap:"12px",textAlign:"left",border:"1px solid #e2c89f",borderRadius:"18px",background:"linear-gradient(135deg,#fff9ee,#f5dfbe)",boxShadow:"0 8px 22px rgba(82,53,31,.09)",cursor:"pointer",color:"#34241b"},
  groupEventGift: {width:"52px",height:"52px",borderRadius:"15px",display:"grid",placeItems:"center",fontSize:"30px",background:"rgba(255,255,255,.78)"},
  groupEventCopy: {minWidth:0,flex:1,display:"flex",flexDirection:"column",gap:"2px"},
  groupEventCopySpan: {fontSize:"9px",fontWeight:"900",letterSpacing:"1px",color:"#a76d2c"},
  groupEventArrow: {width:"34px",height:"34px",borderRadius:"50%",display:"grid",placeItems:"center",fontSize:"28px",background:"#b77d35",color:"#fff"},

  featuredEventCard: {margin:"0 0 16px",padding:"18px",borderRadius:"22px",background:"linear-gradient(145deg,#3c2b25 0%,#5b4031 55%,#2f2522 100%)",color:"#fff8ef",boxShadow:"0 14px 32px rgba(66,40,25,.22)",border:"1px solid rgba(255,223,180,.18)"},
  featuredEventTop: {display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"},
  featuredLive: {padding:"6px 10px",borderRadius:"999px",background:"#ef5a52",fontSize:"11px",fontWeight:"900"},
  featuredSoon: {padding:"6px 10px",borderRadius:"999px",background:"#b8843e",fontSize:"11px",fontWeight:"900"},
  featuredTimer: {fontSize:"12px",color:"#e9d9c9"},
  featuredEventMain: {display:"flex",alignItems:"center",gap:"14px"},
  featuredEventIcon: {width:"64px",height:"64px",borderRadius:"18px",display:"grid",placeItems:"center",fontSize:"38px",background:"rgba(255,255,255,.09)"},
  featuredEventTitle: {fontSize:"22px",fontWeight:"900",marginBottom:"5px"},
  featuredEventDesc: {fontSize:"12px",lineHeight:"1.55",color:"#e6d6c8"},
  featuredJoin: {width:"100%",marginTop:"16px",border:0,borderRadius:"14px",padding:"13px 16px",background:"linear-gradient(90deg,#f4c775,#d99b47)",color:"#3a281d",fontWeight:"900",fontSize:"14px",display:"flex",justifyContent:"space-between",cursor:"pointer"},
  featuredJoinDisabled: {marginTop:"16px",borderRadius:"14px",padding:"12px 16px",background:"rgba(255,255,255,.08)",color:"#ddcbbd",fontWeight:"800",fontSize:"12px",textAlign:"center"},

  marketPulseCard: {padding:"20px",marginBottom:"14px",borderRadius:"22px",background:"linear-gradient(145deg,#17252b,#25363a 55%,#1c2c31)",color:"#f8f0e7",boxShadow:"0 14px 30px rgba(33,44,45,.18)",border:"1px solid rgba(255,255,255,.08)"},
  marketPulseTop: {display:"flex",alignItems:"center",justifyContent:"space-between"},
  marketPulseLabel: {display:"block",fontSize:"11px",color:"#b9c6c2",marginBottom:"5px"},
  marketPulseProfit: {display:"block",fontSize:"30px",lineHeight:1.1,color:"#ffd48c",letterSpacing:"-.5px"},
  marketRobot: {width:"76px",height:"76px",borderRadius:"22px",display:"grid",placeItems:"center",fontSize:"50px",background:"radial-gradient(circle at 50% 35%,#eafcff,#9ccbd0 70%,#5e8f95)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.35),0 8px 20px rgba(0,0,0,.18)"},
  marketMiniStats: {display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",marginTop:"16px"},

  refPage:{minHeight:"100vh",height:"100dvh",width:"100vw",maxWidth:"100vw",overflow:"hidden",overflowX:"hidden",background:"#f4f7fb",display:"flex",justifyContent:"center",alignItems:"stretch",fontFamily:"Arial, sans-serif",color:"#17233f"},
  refApp:{width:"100%",maxWidth:"520px",minWidth:0,minHeight:0,height:"100dvh",maxHeight:"100dvh",overflowX:"hidden",background:"#ffffff",boxShadow:"0 0 36px rgba(21,44,79,.10)",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden",boxSizing:"border-box",touchAction:"manipulation",WebkitTextSizeAdjust:"100%"},
  refHeader:{height:"64px",padding:"0 14px",background:"#ffffff",display:"flex",alignItems:"center",justifyContent:"space-between",color:"#17233f",borderBottom:"1px solid #e5eaf1",flexShrink:0,position:"relative",zIndex:2147483647,pointerEvents:"auto"},
  refBrand:{display:"flex",alignItems:"center",gap:"8px",minWidth:0},
  refAvatarButton:{padding:0,border:0,background:"transparent",cursor:"pointer"},
  refAvatar:{width:"39px",height:"39px",borderRadius:"12px",objectFit:"cover",border:"2px solid #f0d3a4"},
  refBrandTitle:{fontSize:"16px",fontWeight:"900",letterSpacing:".3px"},
  refBrandSub:{fontSize:"10px",color:"#b9ada5",marginTop:"2px"},
  refHeaderRight:{display:"flex",alignItems:"center",gap:"5px",position:"relative",zIndex:2147483647,pointerEvents:"auto"},
  refBellButton:{height:"40px",minWidth:"48px",padding:"0 9px",borderRadius:"999px",border:"1px solid rgba(235,197,127,.38)",background:"rgba(255,255,255,.055)",color:"#e3cfae",display:"flex",alignItems:"center",justifyContent:"center",gap:"3px",cursor:"pointer",fontSize:"9px",fontWeight:"900",boxSizing:"border-box",position:"relative",zIndex:100000,pointerEvents:"auto",touchAction:"manipulation",WebkitTapHighlightColor:"transparent",userSelect:"none"},
  refBellButtonOn:{border:"1px solid rgba(103,222,160,.45)",background:"rgba(66,190,128,.12)",color:"#7be0ad",boxShadow:"0 0 12px rgba(66,190,128,.10)"},
  refBellIcon:{fontSize:"14px",lineHeight:1},
  refMyInfoButton:{height:"36px",padding:"3px 10px 3px 4px",borderRadius:"999px",border:"1px solid #dce3ed",background:"#ffffff",color:"#243552",display:"flex",alignItems:"center",gap:"6px",fontSize:"9px",fontWeight:"850",letterSpacing:".1px",cursor:"pointer",boxShadow:"0 1px 2px rgba(15,23,42,.04)"},
  refMyInfoAvatar:{width:"28px",height:"28px",borderRadius:"50%",objectFit:"cover",border:"1px solid #d9e2ef",boxShadow:"0 1px 3px rgba(15,23,42,.10)"},
  refBell:{position:"relative",fontSize:"22px",color:"#d9a85e"},
  refMiniAvatar:{width:"34px",height:"34px",borderRadius:"50%",objectFit:"cover",border:"2px solid #a97a44"},
  refNav:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"6px",padding:"8px 10px 9px",background:"#ffffff",borderBottom:"1px solid #e5eaf1",flexShrink:0},
  refNavButton:{position:"relative",minWidth:0,height:"54px",border:"1px solid #e1e7ef",borderRadius:"13px",background:"#ffffff",color:"#52627a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"4px",fontSize:"10px",fontWeight:"800",cursor:"pointer",boxShadow:"0 1px 2px rgba(15,23,42,.03)"},
  refNavButtonActive:{background:"linear-gradient(145deg,#f4f8ff,#edf4ff)",color:"#2458d6",border:"1px solid #c8d8fb",boxShadow:"0 2px 8px rgba(36,88,214,.08)"},
  refNavIcon:{fontSize:"16px",lineHeight:1,fontWeight:"900"},
  refNavBadge:{position:"absolute",right:"7px",top:"5px",minWidth:"17px",height:"17px",padding:"0 4px",borderRadius:"9px",background:"#ef544d",color:"#fff",fontStyle:"normal",fontSize:"9px",display:"grid",placeItems:"center"},
  refBody:{flex:"1 1 0",minHeight:0,height:"auto",display:"flex",overflow:"hidden",width:"100%",boxSizing:"border-box"},
  refScreen:{flex:"1 1 0",minHeight:0,height:"auto",maxHeight:"100%",display:"flex",flexDirection:"column",background:"linear-gradient(180deg,#40332c,#302824)",position:"relative",overflow:"hidden",boxSizing:"border-box"},
  refMemberStrip:{padding:"7px 12px",display:"flex",alignItems:"center",gap:"8px",color:"#fff7ef",borderBottom:"1px solid rgba(255,255,255,.05)",flex:"0 0 auto",boxSizing:"border-box"},
  refMemberCount:{marginLeft:"auto",width:"fit-content",maxWidth:"145px",height:"34px",padding:"0 10px",borderRadius:"999px",display:"flex",alignItems:"center",justifyContent:"flex-start",gap:"6px",background:"linear-gradient(135deg,rgba(255,246,219,.11),rgba(196,132,50,.08))",border:"1px solid rgba(236,196,119,.28)",boxShadow:"inset 0 1px 0 rgba(255,255,255,.07),0 5px 16px rgba(0,0,0,.10)",whiteSpace:"nowrap"},
  refMemberCountIcon:{width:"22px",height:"22px",borderRadius:"50%",display:"grid",placeItems:"center",flexShrink:0,color:"#edc87e",background:"rgba(224,179,99,.10)",border:"1px solid rgba(237,200,126,.18)"},
  refMemberCountLabel:{fontSize:"6px",fontWeight:"800",letterSpacing:".75px",color:"#ad9a7e"},
  refMemberCountNumber:{fontSize:"11px",fontWeight:"950",letterSpacing:"-.2px",color:"#fff0cf"},
  refMemberStripImg:{width:"46px",height:"46px",borderRadius:"50%"},
  refLockNotice:{margin:"8px 12px 0",padding:"8px 10px",borderRadius:"10px",background:"rgba(255,240,210,.12)",color:"#f4d7a9",fontSize:"10px",textAlign:"center"},
  refAdminMini:{marginLeft:"auto",border:"1px solid rgba(255,255,255,.12)",borderRadius:"9px",background:"rgba(255,255,255,.07)",color:"#f6e6d2",padding:"6px 8px",fontSize:"9px"},
  refMessages:{flex:"1 1 0",height:0,minHeight:0,width:"100%",maxWidth:"100%",minWidth:0,overflowY:"auto",overflowX:"hidden",overscrollBehavior:"contain",boxSizing:"border-box",padding:"8px 13px 10px",backgroundColor:"#352a25",backgroundImage:"radial-gradient(circle at 12% 12%,rgba(233,192,126,.10) 0 1px,transparent 2px),radial-gradient(circle at 86% 18%,rgba(255,230,184,.08) 0 1px,transparent 2px),linear-gradient(125deg,transparent 0 42%,rgba(211,167,104,.045) 43% 44%,transparent 45% 100%),radial-gradient(ellipse at 50% -15%,rgba(170,119,67,.18),transparent 48%),linear-gradient(180deg,#42342d 0%,#342a25 52%,#2e2622 100%)",backgroundSize:"46px 46px,64px 64px,180px 180px,100% 100%,100% 100%"},
  refDateChip:{width:"max-content",margin:"0 auto 13px",padding:"5px 10px",borderRadius:"999px",background:"rgba(255,255,255,.08)",color:"#c9bdb4",fontSize:"9px"},
  refEmpty:{margin:"40px auto",textAlign:"center",fontSize:"12px",lineHeight:1.7,color:"#a99a91"},
  refMsgRow:{display:"flex",gap:"8px",marginBottom:"12px",width:"100%",maxWidth:"100%",minWidth:0,boxSizing:"border-box",overflow:"hidden"},
  refMsgAvatar:{width:"38px",height:"38px",borderRadius:"50%",objectFit:"cover",flexShrink:0},
  refMsgName:{fontSize:"10px",color:"#e7d9ce",marginBottom:"4px",fontWeight:"700"},
  refBubble:{maxWidth:"100%",minWidth:0,boxSizing:"border-box",padding:"9px 11px",borderRadius:"13px",fontSize:"12px",lineHeight:1.5,wordBreak:"break-word",overflowWrap:"anywhere",whiteSpace:"pre-wrap",boxShadow:"0 3px 10px rgba(0,0,0,.10)"},
  refMyBubble:{
    minWidth:"34px",background:"linear-gradient(145deg,#f8df9f 0%,#e8b94f 100%)",
    color:"#2f2114",border:"1px solid rgba(255,229,166,.92)",
    borderRadius:"16px 5px 16px 16px",
    boxShadow:"0 5px 14px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.55)",
    fontWeight:"750",textAlign:"left"
  },
  refOtherBubble:{background:"#f7f2ee",color:"#342a25",borderBottomLeftRadius:"4px"},
  refMsgTime:{fontSize:"8px",color:"#a99c94",whiteSpace:"nowrap"},
  refDelete:{border:0,background:"transparent",color:"#ef6a62",fontSize:"14px",padding:0},
  refNextEvent:{margin:"0 7px 6px",padding:"7px 10px",height:"60px",minHeight:"60px",maxHeight:"60px",border:"1px solid #e6c996",borderRadius:"14px",background:"linear-gradient(135deg,#fffaf0,#f4dfbd)",display:"flex",alignItems:"center",gap:"9px",textAlign:"left",boxShadow:"0 5px 12px rgba(37,23,15,.11)",cursor:"pointer",flex:"0 0 60px",boxSizing:"border-box",overflow:"hidden"},
  refNextGift:{width:"39px",height:"39px",borderRadius:"12px",background:"#fff",display:"grid",placeItems:"center",fontSize:"23px",flexShrink:0},
  refNextCopy:{display:"flex",flexDirection:"column",gap:"2px",minWidth:0,flex:1},
  refNextArrow:{width:"31px",height:"31px",borderRadius:"50%",display:"grid",placeItems:"center",background:"#b67b32",color:"#fff",fontSize:"23px"},
  refComposer:{width:"100%",padding:"7px 9px calc(7px + env(safe-area-inset-bottom, 0px))",height:"calc(62px + env(safe-area-inset-bottom, 0px))",minHeight:"calc(62px + env(safe-area-inset-bottom, 0px))",display:"flex",alignItems:"center",gap:"7px",background:"#f8f2e9",borderTop:"1px solid #eadbc9",flex:"0 0 calc(62px + env(safe-area-inset-bottom, 0px))",position:"relative",zIndex:20,boxSizing:"border-box",overflow:"visible"},
  refPlus:{width:"31px",height:"31px",borderRadius:"50%",display:"grid",placeItems:"center",background:"#fff",border:"1px solid #ded2c4",fontSize:"21px",color:"#8e7d70",cursor:"pointer"},
  refInput:{flex:1,minWidth:0,minHeight:"36px",maxHeight:"76px",resize:"none",border:"1px solid #e2d7ca",borderRadius:"18px",background:"#fff",padding:"8px 13px",outline:"none",fontSize:"16px",lineHeight:"20px",touchAction:"manipulation",WebkitTextSizeAdjust:"100%"},
  refSend:{width:"38px",height:"38px",borderRadius:"50%",border:0,background:"linear-gradient(135deg,#d8a85b,#a86d29)",color:"#fff",fontSize:"17px",cursor:"pointer"},
  refAvatarPicker:{position:"absolute",zIndex:20,top:"64px",left:"12px",right:"12px",padding:"12px",borderRadius:"16px",background:"#fff9ef",boxShadow:"0 18px 45px rgba(45,29,19,.25)",border:"1px solid #e7cfaa"},
  refAvatarPickerTop:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"},
  refAvatarGrid:{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:"6px"},
  refAvatarChoice:{border:0,background:"transparent",padding:0},
  refEventScreen:{flex:1,minHeight:0,overflowY:"auto",padding:"14px 12px 18px",background:"#ffffff"},
  refHeroEvent:{padding:"16px",borderRadius:"18px",backgroundColor:"#ffffff",backgroundSize:"cover",backgroundPosition:"center",color:"#17233f",boxShadow:"0 6px 18px rgba(15,23,42,.06)",border:"1px solid #e1e7ef",overflow:"hidden"},
  refHeroEventTop:{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"#65758c",fontWeight:"800"},
  refHeroEventMain:{display:"flex",gap:"13px",alignItems:"center",padding:"15px 0 12px"},
  refHeroTarget:{fontSize:"42px"},
  refHeroDisabled:{padding:"11px",borderRadius:"12px",background:"rgba(255,255,255,.08)",textAlign:"center",fontSize:"11px"},
  refSectionTitle:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 2px 9px"},
  refEventList:{background:"#fffaf4",borderRadius:"17px",overflow:"hidden",border:"1px solid #ead9c6"},
  refEventRow:{display:"grid",gridTemplateColumns:"36px 38px minmax(0,1fr) auto 16px",gap:"8px",alignItems:"center",padding:"11px 9px",borderBottom:"1px solid #eee2d5",background:"#fffaf4"},
  refEventRowActive:{background:"linear-gradient(90deg,#fff8e8,#f8e9cf)",boxShadow:"inset 3px 0 0 #d6a354"},
  refRound:{fontSize:"14px",fontWeight:"900",textAlign:"center"},
  refEventIcon:{fontSize:"23px"},
  refEventInfo:{minWidth:0,display:"flex",flexDirection:"column",gap:"2px"},
  refStatus:{minWidth:"48px",padding:"6px 8px",borderRadius:"999px",fontSize:"9px",fontWeight:"900",whiteSpace:"nowrap",wordBreak:"keep-all",textAlign:"center",lineHeight:1},
  refStatusLive:{background:"#ffe0d7",color:"#c63e2f",border:"1px solid #f5b6aa"},
  refStatusParticipated:{background:"#e5f5ec",color:"#287552",border:"1px solid #b9dfca"},
  refStatusDone:{background:"#dedbd7",color:"#5f5954",border:"1px solid #c8c2bc"},
  refStatusWait:{background:"#fff0c9",color:"#9a681c",border:"1px solid #edd39a"},
  refChevron:{fontSize:"19px",color:"#9c8d82"},
  refInlineGame:{marginTop:"8px"},
  refNotice:{margin:"10px 0",padding:"10px",borderRadius:"11px",background:"#fff3db",color:"#76522b",fontSize:"11px"},
  refAiScreen:{flex:1,minHeight:0,overflowY:"auto",padding:"14px 12px 18px",background:"#ffffff"},
  refPulse:{padding:"17px",borderRadius:"20px",background:"radial-gradient(circle at 85% 18%,rgba(83,211,194,.18),transparent 28%),linear-gradient(145deg,#1c2b30,#26393d)",color:"#fff",boxShadow:"0 12px 28px rgba(25,43,45,.18)"},
  refPulseHead:{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"center"},
  refPulseLabel:{fontSize:"12px",fontWeight:"900",letterSpacing:".4px",marginBottom:"8px"},
  refBot:{width:"72px",height:"72px",borderRadius:"23px",display:"grid",placeItems:"center",fontSize:"48px",background:"radial-gradient(circle,#dffcff,#8ac6c9)",boxShadow:"0 7px 18px rgba(0,0,0,.18)"},
  refLiveDot:{position:"absolute",right:0,top:0,padding:"4px 7px",borderRadius:"999px",background:"#1aa67e",fontSize:"8px",fontWeight:"900"},
  refPulseStats:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"7px",marginTop:"13px"},
  refAiTitle:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"15px 2px 8px"},
  refAssetList:{display:"flex",flexDirection:"column",gap:"8px"},
  refAssetCard:{display:"grid",gridTemplateColumns:"42px minmax(0,1fr) 64px auto",alignItems:"center",gap:"8px",padding:"12px",borderRadius:"15px",background:"#fffaf4",border:"1px solid #ead9c6",boxShadow:"0 5px 14px rgba(72,47,29,.06)"},
  refAssetLogo:{width:"38px",height:"38px",borderRadius:"50%",display:"grid",placeItems:"center",background:"#232a2b",color:"#e6b85f",fontSize:"20px"},
  refAssetName:{display:"flex",flexDirection:"column",gap:"1px"},
  refSpark:{fontSize:"18px",color:"#38a6b2",letterSpacing:"-5px",overflow:"hidden"},
  refAssetGain:{textAlign:"right",display:"flex",flexDirection:"column",gap:"1px"},
  refRecentHead:{display:"flex",justifyContent:"space-between",padding:"15px 2px 8px"},
  refRecentGrid:{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"7px",maxHeight:"300px",overflowY:"auto"},
  refRecentItem:{padding:"10px",borderRadius:"12px",background:"#fffaf4",border:"1px solid #ead9c6",display:"flex",flexDirection:"column",gap:"3px",fontSize:"9px"},
  refEducation:{marginTop:"10px",padding:"9px",borderRadius:"10px",background:"#eee5da",color:"#8a796c",fontSize:"9px",textAlign:"center"},
  refAiEmpty:{padding:"28px 14px",textAlign:"center",borderRadius:"15px",background:"#fffaf4",color:"#8f7d70",fontSize:"11px",lineHeight:1.6},
  refPrivateScreen:{flex:"1 1 0",minHeight:0,height:"auto",maxHeight:"100%",display:"flex",flexDirection:"column",background:"#f7efe5",overflow:"hidden",boxSizing:"border-box"},
  refPrivateTop:{padding:"13px",display:"flex",alignItems:"center",gap:"10px",background:"#fffaf4",borderBottom:"1px solid #ead9c6"},
  refPrivateMessages:{flex:"1 1 0",height:0,minHeight:0,overflowY:"auto",overscrollBehavior:"contain",padding:"14px",background:"linear-gradient(180deg,#40332c,#302824)"},
  refSearch:{margin:"0 12px 10px",padding:"11px 13px",borderRadius:"12px",border:"1px solid #dfd0bf",background:"#fff",outline:"none"},
  refConsultList:{
    flex:"1 1 0",minHeight:0,height:0,margin:"0 12px 12px",borderRadius:"16px",
    overflowX:"hidden",overflowY:"auto",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain",
    background:"#fffaf4",border:"1px solid #ead9c6",boxSizing:"border-box",
    scrollbarGutter:"stable"
  },
  refConsultRow:{width:"100%",display:"grid",gridTemplateColumns:"42px 1fr auto",gap:"10px",alignItems:"center",padding:"11px",border:0,borderBottom:"1px solid #eee2d5",background:"#fffaf4",textAlign:"left",cursor:"pointer"},

  refSupportAvatar:{width:"44px",height:"44px",borderRadius:"14px",objectFit:"cover",border:"2px solid #e1bd82",boxShadow:"0 4px 12px rgba(76,48,29,.12)"},
  refSupportInfo:{display:"flex",flexDirection:"column",gap:"3px",minWidth:0},
  refMoneyBoard:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"7px",margin:"10px 0 14px"},
  refMoneyItem:{minWidth:0,padding:"12px 8px",borderRadius:"14px",background:"linear-gradient(145deg,#fffaf3,#f3e4d1)",border:"1px solid #e5d0b5",boxShadow:"0 5px 14px rgba(76,48,29,.06)",display:"flex",flexDirection:"column",gap:"4px",textAlign:"center"},

  refAiBars:{width:"25px",height:"22px",display:"flex",alignItems:"flex-end",justifyContent:"center",gap:"3px"},
  refProfileButton:{padding:0,border:0,borderRadius:"50%",background:"transparent",cursor:"pointer",display:"grid",placeItems:"center"},
  refProfileOverlay:{position:"fixed",inset:0,zIndex:100,background:"rgba(22,16,13,.62)",display:"flex",alignItems:"center",justifyContent:"center",padding:"18px",backdropFilter:"blur(5px)"},
  refProfileCard:{width:"100%",maxWidth:"360px",position:"relative",padding:"25px 20px 20px",borderRadius:"24px",background:"linear-gradient(160deg,#fffaf1,#f2dfc5)",border:"1px solid #e4c18b",boxShadow:"0 24px 70px rgba(35,22,14,.35)",textAlign:"center",color:"#34251d"},
  refProfileClose:{position:"absolute",right:"12px",top:"10px",width:"32px",height:"32px",padding:0,border:0,borderRadius:"50%",background:"rgba(70,49,34,.08)",fontSize:"22px",lineHeight:"32px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",fontFamily:"Arial,sans-serif",touchAction:"manipulation"},
  refProfileLarge:{width:"82px",height:"82px",borderRadius:"25px",objectFit:"cover",border:"3px solid #d7a758",boxShadow:"0 8px 20px rgba(86,54,31,.18)"},
  refProfileVip:{marginTop:"10px",fontSize:"10px",fontWeight:"900",letterSpacing:"1.3px",color:"#a46e2f"},
  refProfileName:{display:"block",fontSize:"21px",marginTop:"4px"},
  refProfileRows:{marginTop:"17px",borderRadius:"15px",overflow:"hidden",border:"1px solid #e5d1b5",background:"rgba(255,255,255,.62)",textAlign:"left"},
  refProfileNote:{margin:"11px 0",fontSize:"9px",color:"#8b796c"},
  refProfileEdit:{width:"100%",padding:"11px",border:0,borderRadius:"12px",background:"linear-gradient(135deg,#c7944e,#9b6529)",color:"#fff",fontWeight:"900",cursor:"pointer"},

  refMemberStripAvatar:{width:"44px",height:"44px",minWidth:"44px",borderRadius:"50%",objectFit:"cover",display:"block",border:"2px solid #d8ad6a"},
  refConsultAvatar:{width:"42px",height:"42px",minWidth:"42px",borderRadius:"13px",objectFit:"cover",display:"block",border:"1px solid #dfc49b"},
  refPrivateAlert:{
    position:"fixed",
    top:"calc(72px + env(safe-area-inset-top, 0px))",
    left:"50%",
    transform:"translateX(-50%)",
    zIndex:2147483646,
    width:"calc(100% - 16px)",
    maxWidth:"500px",
    minHeight:"82px",
    maxHeight:"132px",
    padding:"11px 12px",
    border:"1px solid rgba(205,164,99,.92)",
    borderRadius:"15px",
    background:"#fffaf2",
    boxShadow:"0 14px 36px rgba(35,22,14,.34)",
    display:"grid",
    gridTemplateColumns:"46px minmax(0,1fr) auto",
    alignItems:"center",
    gap:"10px",
    textAlign:"left",
    color:"#2f2119",
    cursor:"pointer",
    boxSizing:"border-box",
    touchAction:"manipulation"
  },
  refPrivateAlertAvatar:{
    width:"46px",height:"46px",borderRadius:"50%",objectFit:"cover",
    border:"2px solid #d4a552",flexShrink:0
  },
  refPrivateAlertCopy:{
    minWidth:0,display:"flex",flexDirection:"column",gap:"5px",overflow:"hidden"
  },
  refPrivateAlertNow:{
    fontSize:"9px",fontWeight:"800",color:"#9a8778",alignSelf:"start",paddingTop:"2px",whiteSpace:"nowrap"
  },
  refPrivateAlertTitle:{
    display:"block",fontSize:"11px",lineHeight:1.3,fontWeight:"1000",color:"#2d2019",
    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"
  },
  refPrivateAlertBody:{
    display:"-webkit-box",WebkitBoxOrient:"vertical",WebkitLineClamp:2,
    overflow:"hidden",whiteSpace:"normal",wordBreak:"break-word",
    fontSize:"10px",lineHeight:1.45,fontWeight:"700",color:"#5e4c3e"
  },
  refEmojiWrap:{position:"relative",display:"flex",alignItems:"center",flexShrink:0},
  refEmojiButton:{width:"32px",height:"32px",padding:0,borderRadius:"50%",border:"1px solid #ded2c4",background:"#fff",color:"#8a7565",fontSize:"20px",lineHeight:"32px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",fontFamily:"Arial,sans-serif",touchAction:"manipulation"},
  refEmojiPanel:{position:"fixed",left:"12px",right:"12px",bottom:"calc(68px + env(safe-area-inset-bottom, 0px))",zIndex:200,width:"auto",maxWidth:"496px",margin:"0 auto",padding:"10px",display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",justifyItems:"center",gap:"6px",borderRadius:"16px",background:"#fffaf2",border:"1px solid #dfc59d",boxShadow:"0 15px 38px rgba(49,31,20,.28)",boxSizing:"border-box"},
  refEmojiItem:{width:"34px",height:"34px",padding:0,border:0,borderRadius:"9px",background:"transparent",fontSize:"20px",lineHeight:"34px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",fontFamily:"Arial,sans-serif",touchAction:"manipulation"},

  refRoomIdentity:{display:"flex",flexDirection:"column",gap:"4px",minWidth:0},
  refRoomNameRow:{display:"flex",alignItems:"center",gap:"8px"},
  refVipBadge:{width:"30px",height:"30px",borderRadius:"50%",display:"grid",placeItems:"center",fontStyle:"normal",fontSize:"8px",fontWeight:"900",letterSpacing:".4px",color:"#2b1e16",background:"radial-gradient(circle at 35% 25%,#fff3b5,#d9a34a 48%,#8f5c20 100%)",border:"1px solid #f6d486",boxShadow:"0 3px 10px rgba(217,163,74,.28)"},
  refOnlineText:{display:"flex",alignItems:"center",gap:"5px",fontSize:"9px",fontWeight:"800",color:"#48d18b"},
  refOnlineDot:{width:"6px",height:"6px",borderRadius:"50%",background:"#3bd181",boxShadow:"0 0 8px rgba(59,209,129,.8)"},
  refLogoutButton:{height:"34px",padding:"0 8px",borderRadius:"10px",border:"1px solid #e1e6ed",background:"transparent",color:"#718096",display:"flex",alignItems:"center",gap:"3px",cursor:"pointer",fontSize:"9px"},
  refEventSuccessToast:{position:"sticky",top:"8px",zIndex:40,margin:"0 8px 10px",padding:"11px 13px",borderRadius:"16px",display:"flex",alignItems:"center",gap:"10px",background:"linear-gradient(145deg,#173a31,#215346)",border:"1px solid rgba(118,231,185,.35)",boxShadow:"0 10px 28px rgba(17,50,42,.24)",color:"#fff"},
  refEventSuccessCheck:{width:"32px",height:"32px",borderRadius:"50%",display:"grid",placeItems:"center",flexShrink:0,background:"linear-gradient(145deg,#7de5b8,#39ad7d)",color:"#123d30",fontSize:"18px",fontWeight:"1000",boxShadow:"0 4px 12px rgba(55,188,132,.25)"},
  refEventSuccessCopy:{minWidth:0,display:"flex",flexDirection:"column",gap:"2px"},
  refEventArtwork:{width:"74px",height:"74px",position:"relative",flexShrink:0,borderRadius:"24px",display:"grid",placeItems:"center",background:"linear-gradient(145deg,rgba(255,255,255,.20),rgba(255,255,255,.04))",border:"1px solid rgba(255,229,181,.35)",boxShadow:"inset 0 0 25px rgba(255,211,128,.12),0 10px 24px rgba(0,0,0,.18)"},
  refEventArtworkHalo:{position:"absolute",inset:"9px",borderRadius:"50%",background:"radial-gradient(circle,rgba(255,212,113,.30),transparent 68%)",filter:"blur(2px)"},
  luxLoginHero:{position:"relative",padding:"20px 12px 16px",margin:"-6px -6px 14px",borderRadius:"25px",overflow:"hidden",textAlign:"center",background:"radial-gradient(circle at 50% 35%,rgba(255,233,185,.96),rgba(255,249,235,.94) 35%,rgba(236,210,171,.78) 100%)",border:"1px solid #e2c18b",boxShadow:"inset 0 1px 0 #fff,0 14px 35px rgba(109,72,34,.13)"},
  luxGlowOne:{position:"absolute",width:"190px",height:"190px",borderRadius:"50%",left:"-80px",top:"-95px",background:"rgba(255,255,255,.72)",filter:"blur(8px)"},
  luxGlowTwo:{position:"absolute",width:"160px",height:"160px",borderRadius:"50%",right:"-70px",bottom:"-85px",background:"rgba(184,119,44,.13)",filter:"blur(10px)"},
  luxCrown:{position:"relative",zIndex:2,fontSize:"30px",color:"#a46a24",textShadow:"0 2px 8px rgba(164,106,36,.22)"},
  luxMascotFrame:{position:"relative",zIndex:2,width:"150px",height:"150px",margin:"13px auto 8px",display:"grid",placeItems:"center",borderRadius:"50%",background:"linear-gradient(145deg,#f6d889,#9f6724)",boxShadow:"0 16px 35px rgba(95,57,21,.23),inset 0 0 0 4px rgba(255,244,210,.9)"},
  luxMascotRing:{position:"absolute",inset:"7px",borderRadius:"50%",border:"1px solid rgba(255,255,255,.78)",boxShadow:"inset 0 0 22px rgba(255,255,255,.35)"},
  luxMascotImage:{width:"130px",height:"130px",borderRadius:"50%",objectFit:"cover",display:"block"},
  luxVipSeal:{position:"absolute",right:"1px",bottom:"13px",width:"42px",height:"42px",borderRadius:"50%",display:"grid",placeItems:"center",fontSize:"10px",fontWeight:"900",letterSpacing:".7px",color:"#fff8df",background:"linear-gradient(145deg,#49301e,#9b682f)",border:"2px solid #efcb7f",boxShadow:"0 5px 14px rgba(55,32,16,.25)"},
  luxHeroCaption:{position:"relative",zIndex:2,fontSize:"8px",fontWeight:"900",letterSpacing:"2.2px",color:"#9d7547"},

  vipReturnPage:{
    minHeight:"100dvh",width:"100%",maxWidth:"100%",overflowX:"hidden",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",
    background:"radial-gradient(circle at 50% 18%,rgba(255,239,201,.95),transparent 31%),radial-gradient(circle at 12% 88%,rgba(157,101,41,.16),transparent 30%),linear-gradient(145deg,#f9f0e3,#e8d4b8 52%,#f8ead7)",
    fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',boxSizing:"border-box"
  },
  vipReturnCard:{
    width:"100%",maxWidth:"390px",minWidth:0,boxSizing:"border-box",position:"relative",overflow:"hidden",padding:"34px 24px 25px",borderRadius:"30px",textAlign:"center",
    background:"linear-gradient(155deg,rgba(255,252,245,.98),rgba(246,231,207,.97))",
    border:"1px solid rgba(185,133,68,.34)",boxShadow:"0 28px 80px rgba(80,48,22,.22),inset 0 1px 0 rgba(255,255,255,.95)",color:"#38271d"
  },
  vipReturnGlowA:{position:"absolute",width:"210px",height:"210px",borderRadius:"50%",left:"-105px",top:"-115px",background:"rgba(255,255,255,.72)",filter:"blur(5px)"},
  vipReturnGlowB:{position:"absolute",width:"190px",height:"190px",borderRadius:"50%",right:"-100px",bottom:"-110px",background:"rgba(171,107,38,.12)",filter:"blur(8px)"},
  vipReturnCrown:{position:"relative",zIndex:2,fontSize:"31px",color:"#a56d29",textShadow:"0 4px 13px rgba(165,109,41,.22)"},
  vipReturnEyebrow:{position:"relative",zIndex:2,marginTop:"5px",fontSize:"8px",fontWeight:"950",letterSpacing:"2.1px",color:"#9e794e"},
  vipReturnAvatarWrap:{position:"relative",zIndex:2,width:"132px",height:"132px",margin:"23px auto 18px",borderRadius:"50%",display:"grid",placeItems:"center",background:"linear-gradient(145deg,#f4d582,#9d6527)",boxShadow:"0 16px 34px rgba(91,55,23,.23),inset 0 0 0 4px #fff1c8"},
  vipReturnAvatarHalo:{position:"absolute",inset:"8px",borderRadius:"50%",border:"1px solid rgba(255,255,255,.82)",boxShadow:"inset 0 0 24px rgba(255,255,255,.4)"},
  vipReturnAvatar:{width:"114px",height:"114px",borderRadius:"50%",objectFit:"cover",display:"block"},
  vipReturnSeal:{position:"absolute",right:"-2px",bottom:"10px",width:"39px",height:"39px",borderRadius:"50%",display:"grid",placeItems:"center",fontSize:"9px",fontWeight:"950",letterSpacing:".5px",color:"#fff6d8",background:"linear-gradient(145deg,#40291b,#95602a)",border:"2px solid #efca77",boxShadow:"0 6px 15px rgba(52,31,15,.24)"},
  vipReturnTitle:{position:"relative",zIndex:2,margin:"0",fontFamily:'Georgia,"Times New Roman",serif',fontSize:"27px",lineHeight:1.28,fontWeight:"700",letterSpacing:"-.7px",color:"#39271d"},
  vipReturnText:{position:"relative",zIndex:2,margin:"12px 0 22px",fontSize:"11px",lineHeight:1.75,color:"#8a7564"},
  vipReturnPrimary:{position:"relative",zIndex:2,width:"100%",height:"52px",border:0,borderRadius:"15px",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",background:"linear-gradient(135deg,#9b6428,#d6a653 52%,#8d5723)",color:"#fffaf0",fontSize:"13px",fontWeight:"950",letterSpacing:".2px",boxShadow:"0 11px 24px rgba(146,91,35,.24),inset 0 1px 0 rgba(255,255,255,.28)",cursor:"pointer"},
  vipReturnSecondary:{position:"relative",zIndex:2,width:"100%",marginTop:"9px",height:"44px",border:"1px solid #dfc8a8",borderRadius:"14px",background:"rgba(255,255,255,.54)",color:"#7b6757",fontSize:"11px",fontWeight:"850",cursor:"pointer"},
  vipReturnFoot:{position:"relative",zIndex:2,marginTop:"19px",display:"flex",justifyContent:"center",alignItems:"center",gap:"9px",fontSize:"7px",fontWeight:"900",letterSpacing:"1.6px",color:"#b09269"},

  refInstallButton:{
    height:"36px",minWidth:"54px",padding:"0 8px",borderRadius:"11px",
    border:"1px solid #d9c19f",background:"linear-gradient(180deg,#fffaf1,#f2e3ce)",
    color:"#6e4a29",display:"flex",alignItems:"center",justifyContent:"center",
    gap:"3px",cursor:"pointer",boxShadow:"0 4px 12px rgba(80,48,22,.08)",position:"relative",zIndex:51,pointerEvents:"auto",touchAction:"manipulation"
  },
  installGuideBackdrop:{
    position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",
    padding:"12px",boxSizing:"border-box",overflow:"hidden",
    background:"rgba(37,24,17,.58)",backdropFilter:"blur(8px)"
  },
  installGuideCard:{
    width:"100%",maxWidth:"390px",maxHeight:"min(640px, calc(100dvh - 24px))",overflowY:"auto",position:"relative",
    padding:"24px 18px 18px",borderRadius:"22px",boxSizing:"border-box",
    background:"linear-gradient(155deg,#fffdf8,#f5e7d3)",border:"1px solid rgba(190,142,79,.42)",
    boxShadow:"0 30px 90px rgba(37,24,17,.35)",textAlign:"center",color:"#3c2a20",
    WebkitOverflowScrolling:"touch"
  },
  installGuideClose:{
    position:"absolute",right:"13px",top:"20px",width:"34px",height:"34px",border:0,borderRadius:"50%",
    background:"rgba(74,48,31,.07)",color:"#735b49",fontSize:"22px",cursor:"pointer"
  },
  installGuideIcon:{
    width:"66px",height:"66px",margin:"0 auto 12px",borderRadius:"20px",display:"grid",placeItems:"center",
    fontSize:"31px",background:"linear-gradient(145deg,#3b291f,#8d5c2c)",boxShadow:"0 12px 28px rgba(70,43,24,.22)"
  },
  installGuideEyebrow:{fontSize:"8px",fontWeight:"950",letterSpacing:"2px",color:"#aa7b42"},
  installGuideTitle:{margin:"7px 0 9px",fontFamily:'Georgia,"Times New Roman",serif',fontSize:"23px",color:"#3b281d"},
  installGuideText:{margin:"0 0 12px",fontSize:"11px",lineHeight:1.65,color:"#7b6859"},
  installGuideImageWrap:{
    width:"100%",maxHeight:"min(42dvh, 310px)",overflow:"auto",borderRadius:"14px",
    background:"#fff",border:"1px solid rgba(190,142,79,.22)",
    WebkitOverflowScrolling:"touch",boxSizing:"border-box"
  },
  installGuideImage:{
    display:"block",width:"100%",height:"auto",maxWidth:"100%",objectFit:"contain"
  },
  installGuideSteps:{display:"grid",gap:"8px",textAlign:"left"},
  installGuideTip:{marginTop:"14px",padding:"10px",borderRadius:"12px",background:"rgba(158,105,45,.08)",fontSize:"9px",lineHeight:1.55,color:"#8b6a48"},
  installGuideOk:{position:"sticky",bottom:0,zIndex:2,width:"100%",minHeight:"46px",border:0,borderRadius:"14px",background:"linear-gradient(135deg,#8e5b28,#c8964c)",color:"#fff",fontWeight:"900",cursor:"pointer"},


  sponsorSignupIntro:{margin:"18px 0 2px",padding:"16px",borderRadius:"17px",border:"1px solid rgba(193,145,72,.32)",background:"linear-gradient(145deg,rgba(255,249,237,.94),rgba(246,230,204,.82))",boxShadow:"inset 0 1px 0 rgba(255,255,255,.85),0 8px 22px rgba(96,61,34,.08)",display:"flex",flexDirection:"column",gap:"7px",textAlign:"left",fontSize:"12px",lineHeight:1.65,color:"#6b5140"},
  sponsorWelcomeBackdrop:{position:"fixed",inset:0,zIndex:2147483646,background:"rgba(18,13,10,.72)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",boxSizing:"border-box"},
  sponsorWelcomeCard:{width:"100%",maxWidth:"420px",position:"relative",overflow:"hidden",borderRadius:"26px",padding:"30px 24px 24px",boxSizing:"border-box",background:"linear-gradient(155deg,#fffaf0 0%,#f7ead7 52%,#fff8ed 100%)",border:"1px solid rgba(221,178,105,.78)",boxShadow:"0 28px 80px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.9)",color:"#34251d",textAlign:"center"},
  sponsorWelcomeGlow:{position:"absolute",width:"220px",height:"220px",borderRadius:"50%",top:"-125px",left:"50%",transform:"translateX(-50%)",background:"radial-gradient(circle,rgba(224,169,73,.36),rgba(224,169,73,0) 68%)",pointerEvents:"none"},
  sponsorWelcomeClose:{position:"absolute",right:"14px",top:"12px",width:"34px",height:"34px",border:"0",borderRadius:"50%",background:"rgba(77,53,37,.07)",color:"#70543e",fontSize:"24px",lineHeight:1,cursor:"pointer"},
  sponsorWelcomeSeal:{width:"58px",height:"58px",margin:"0 auto 10px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff7df",fontSize:"17px",fontWeight:"1000",letterSpacing:"1px",background:"linear-gradient(145deg,#d7a54b,#8d5c1d)",border:"3px solid #f4d38c",boxShadow:"0 8px 24px rgba(145,94,31,.3),inset 0 1px 2px rgba(255,255,255,.55)"},
  sponsorWelcomeEyebrow:{fontSize:"10px",fontWeight:"900",letterSpacing:"1.5px",color:"#a37a43",marginBottom:"5px"},
  sponsorWelcomeTitle:{margin:"0 0 10px",fontSize:"27px",lineHeight:1.2,fontWeight:"1000",letterSpacing:"-1.2px",color:"#3b291f"},
  sponsorWelcomeLead:{margin:"0 0 18px",fontSize:"14px",lineHeight:1.65,color:"#665044"},
  sponsorWelcomeInfo:{display:"flex",gap:"11px",alignItems:"center",textAlign:"left",padding:"14px",borderRadius:"17px",background:"rgba(255,255,255,.7)",border:"1px solid rgba(185,139,75,.22)",marginBottom:"10px"},
  sponsorWelcomeInfoIcon:{width:"42px",height:"42px",borderRadius:"13px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"21px",background:"linear-gradient(145deg,#fff3d7,#efd4a4)"},
  sponsorWelcomeNotice:{display:"flex",gap:"9px",alignItems:"center",textAlign:"left",padding:"13px 14px",borderRadius:"15px",background:"linear-gradient(135deg,#fff0bd,#f9d990)",border:"1px solid rgba(193,137,39,.28)",marginBottom:"13px"},
  sponsorWelcomeBenefit:{margin:"0 4px 18px",fontSize:"13px",lineHeight:1.6,color:"#715a49"},
  sponsorWelcomePrimary:{width:"100%",height:"52px",border:"1px solid #8e6329",borderRadius:"15px",color:"#fff8e8",fontSize:"15px",fontWeight:"1000",cursor:"pointer",background:"linear-gradient(135deg,#3b2a20 0%,#5a3a24 55%,#9a6728 100%)",boxShadow:"0 10px 22px rgba(74,46,26,.22)"},
  sponsorSupportEmpty:{width:"calc(100% - 22px)",margin:"14px auto",padding:"18px",borderRadius:"19px",boxSizing:"border-box",textAlign:"left",color:"#4a362a",background:"linear-gradient(145deg,#fffaf1,#f7ead8)",border:"1px solid rgba(203,160,91,.35)",boxShadow:"0 8px 24px rgba(73,46,29,.08)",fontSize:"13px",lineHeight:1.65},
  sponsorSupportBadge:{display:"inline-flex",padding:"5px 9px",marginBottom:"9px",borderRadius:"999px",fontSize:"10px",fontWeight:"1000",letterSpacing:".4px",color:"#7c5423",background:"#f5dfb4",border:"1px solid #e4c17d"},
  sponsorSupportMiniNotice:{margin:"12px 0",padding:"10px 11px",borderRadius:"12px",background:"#fff1c9",border:"1px solid rgba(208,161,74,.25)",color:"#654a32"},
  vipBenefitShortcut:{
    minHeight:"58px",borderRadius:"14px",border:"1px solid rgba(183,133,57,.32)",
    background:"linear-gradient(145deg,#fffaf0,#f3dfbb)",color:"#513822",
    display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
    gap:"4px",fontSize:"11px",fontWeight:"1000",cursor:"pointer",
    boxShadow:"inset 0 1px 0 rgba(255,255,255,.9),0 5px 12px rgba(83,54,29,.07)"
  },
  vipImportantAlert:{
    marginTop:"15px",padding:"14px 15px",borderRadius:"15px",
    border:"1px solid rgba(203,143,39,.42)",
    background:"linear-gradient(135deg,#fff0bd 0%,#f8d98d 100%)",
    boxShadow:"0 7px 18px rgba(142,91,27,.12),inset 0 1px 0 rgba(255,255,255,.75)",
    display:"flex",alignItems:"center",gap:"11px",textAlign:"left"
  },
  vipImportantAlertIcon:{
    width:"39px",height:"39px",borderRadius:"12px",flexShrink:0,
    display:"flex",alignItems:"center",justifyContent:"center",
    fontSize:"22px",background:"rgba(255,255,255,.55)",
    border:"1px solid rgba(188,129,31,.22)"
  },
  vipImportantAlertText:{
    display:"flex",flexDirection:"column",gap:"3px",
    fontSize:"13px",lineHeight:1.55,color:"#593d1f",fontWeight:"750"
  },
  adminEventEntriesButton:{
    minWidth:"58px",padding:"7px 8px",borderRadius:"10px",whiteSpace:"nowrap",
    border:"1px solid rgba(183,133,57,.38)",background:"#fff1d5",
    color:"#68461d",fontSize:"10px",fontWeight:"1000",cursor:"pointer",
    boxShadow:"inset 0 1px 0 rgba(255,255,255,.85)"
  },
  adminEventEntriesBackdrop:{
    position:"fixed",inset:0,zIndex:2147483646,background:"rgba(18,13,10,.68)",
    backdropFilter:"blur(7px)",WebkitBackdropFilter:"blur(7px)",
    display:"flex",alignItems:"center",justifyContent:"center",padding:"18px"
  },
  adminEventEntriesModal:{
    width:"100%",maxWidth:"460px",maxHeight:"78vh",overflow:"hidden",
    borderRadius:"24px",background:"linear-gradient(155deg,#fffaf0,#f7ead7)",
    border:"1px solid rgba(218,173,99,.72)",boxShadow:"0 28px 80px rgba(0,0,0,.42)",
    display:"flex",flexDirection:"column"
  },
  adminEventEntriesHead:{
    padding:"19px 20px 15px",display:"flex",justifyContent:"space-between",gap:"12px",
    borderBottom:"1px solid rgba(167,119,54,.16)"
  },
  adminEventEntriesList:{padding:"10px 12px 16px",overflowY:"auto"},
  adminEventEntriesEmpty:{padding:"34px 12px",textAlign:"center",fontSize:"13px",color:"#8a725f"},
  adminEventEntryRow:{
    display:"flex",alignItems:"center",gap:"10px",padding:"11px 8px",
    borderBottom:"1px solid rgba(161,116,55,.12)"
  },
  adminEventEntryNo:{
    width:"30px",height:"30px",borderRadius:"50%",display:"flex",alignItems:"center",
    justifyContent:"center",background:"#f1d7a4",color:"#6e491c",fontSize:"11px",fontWeight:"1000"
  },
  adminEventEntryMember:{flex:1,display:"flex",flexDirection:"column",gap:"2px"},
  adminEventEntryMeta:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"2px",fontSize:"10px",color:"#8a725f"},
  refEventRowAdmin:{},
  refWinnerBadge:{
    flex:"0 0 auto",minWidth:"64px",maxWidth:"82px",padding:"6px 8px",borderRadius:"11px",
    background:"linear-gradient(145deg,#fff0bd,#f4cf7b)",
    border:"1px solid #e3bd66",display:"flex",flexDirection:"column",
    alignItems:"center",justifyContent:"center",gap:"1px",color:"#6b4618",
    boxShadow:"0 3px 9px rgba(116,76,24,.09)",lineHeight:1.2,
    overflow:"hidden",textOverflow:"ellipsis"
  },
  refWinnerEmpty:{display:"none"},
  refConsultMemberCopy:{minWidth:0,display:"flex",flexDirection:"column",gap:"3px"},
  refConsultNameLine:{display:"flex",alignItems:"center",gap:"7px",minWidth:0},
  refMemberUnreadBadge:{
    minWidth:"20px",height:"20px",padding:"0 6px",boxSizing:"border-box",
    borderRadius:"999px",display:"inline-flex",alignItems:"center",justifyContent:"center",
    background:"#ef5147",color:"#fff",fontSize:"10px",fontWeight:"1000",
    fontStyle:"normal",boxShadow:"0 2px 7px rgba(214,59,51,.28)"
  },
  refEventRow:{
    width:"100%",boxSizing:"border-box",display:"flex",alignItems:"center",
    justifyContent:"space-between",gap:"8px",padding:"14px 10px",
    borderBottom:"1px solid rgba(142,105,67,.15)",minWidth:0
  },
  refEventMain:{
    flex:"1 1 auto",minWidth:0,display:"flex",alignItems:"center",gap:"8px"
  },
  refEventActions:{
    flex:"0 0 auto",display:"flex",alignItems:"center",justifyContent:"flex-end",
    gap:"6px",minWidth:0
  },
  refRound:{
    flex:"0 0 34px",width:"34px",minWidth:"34px",fontWeight:"1000",
    fontSize:"13px",whiteSpace:"nowrap"
  },
  refEventIcon:{
    flex:"0 0 34px",width:"34px",minWidth:"34px",display:"flex",
    alignItems:"center",justifyContent:"center",fontSize:"23px"
  },
  refEventInfo:{
    flex:"1 1 120px",minWidth:0,display:"flex",flexDirection:"column",gap:"2px",
    overflow:"hidden"
  },
  refStatus:{
    flex:"0 0 auto",minWidth:"54px",padding:"5px 8px",boxSizing:"border-box",
    borderRadius:"999px",textAlign:"center",fontSize:"10px",fontWeight:"900",
    whiteSpace:"nowrap"
  },
  refChevron:{
    flex:"0 0 10px",width:"10px",fontSize:"17px",color:"#a99581",
    display:"flex",alignItems:"center",justifyContent:"center"
  },
  adminEventEntriesButton:{
    flex:"0 0 auto",minWidth:"54px",padding:"6px 7px",borderRadius:"10px",
    whiteSpace:"nowrap",border:"1px solid rgba(183,133,57,.38)",
    background:"#fff1d5",color:"#68461d",fontSize:"9px",fontWeight:"1000",
    cursor:"pointer",boxShadow:"inset 0 1px 0 rgba(255,255,255,.85)"
  },
  fixedVipSupportWelcome:{
    width:"100%",maxWidth:"100%",boxSizing:"border-box",flex:"0 0 auto",
    marginBottom:"14px"
  },
  privateMessageMeta:{
    flex:"0 0 auto",display:"flex",flexDirection:"column",alignItems:"flex-end",
    justifyContent:"flex-end",gap:"2px",paddingBottom:"1px"
  },
  privateReadReceipt:{
    fontSize:"9px",fontWeight:"900",lineHeight:1.1,whiteSpace:"nowrap",
    letterSpacing:"-.2px"
  },
  privateReadReceiptRead:{
    color:"#d69a2d"
  },
  privateReadReceiptUnread:{
    color:"rgba(255,255,255,.46)"
  },
  vipAiHero:{
    position:"relative",overflow:"hidden",padding:"24px 20px 22px",borderRadius:"22px",
    background:"linear-gradient(145deg,#191715 0%,#2c211a 54%,#4b3420 100%)",
    border:"1px solid rgba(220,177,96,.38)",boxShadow:"0 14px 30px rgba(44,30,18,.18)",
    color:"#fff"
  },
  vipAiHeroGlow:{
    position:"absolute",width:"190px",height:"190px",right:"-55px",top:"-85px",
    borderRadius:"50%",background:"radial-gradient(circle,rgba(238,190,95,.24),rgba(238,190,95,0) 70%)",
    pointerEvents:"none"
  },
  vipAiEyebrow:{
    position:"relative",fontSize:"9px",fontWeight:"900",letterSpacing:"2.4px",
    color:"#d9b36d",marginBottom:"12px"
  },
  vipAiHeroTop:{position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"},
  vipAiHeroTitle:{margin:0,fontSize:"29px",lineHeight:1,fontWeight:"1000",letterSpacing:"-.8px"},
  vipAiHeroSub:{margin:"6px 0 0",fontSize:"10px",fontWeight:"800",letterSpacing:"2px",color:"rgba(255,255,255,.48)"},
  vipAiMark:{
    flex:"0 0 54px",width:"54px",height:"54px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
    background:"linear-gradient(145deg,#f4d38a,#a66e23)",border:"1px solid rgba(255,229,168,.78)",
    color:"#2d1d0e",fontSize:"18px",fontWeight:"1000",boxShadow:"0 0 0 5px rgba(225,176,86,.09),0 8px 22px rgba(0,0,0,.22)"
  },
  vipAiHeroText:{position:"relative",margin:"22px 0 7px",fontSize:"14px",lineHeight:1.72,color:"#f7efe4",wordBreak:"keep-all"},
  vipAiHeroTextSoft:{position:"relative",margin:0,fontSize:"11px",lineHeight:1.75,color:"rgba(255,255,255,.66)",wordBreak:"keep-all"},
  vipAiNotice:{
    position:"relative",marginTop:"13px",padding:"20px 17px",borderRadius:"20px",
    background:"linear-gradient(145deg,rgba(51,42,34,.82),rgba(74,57,40,.72))",
    border:"1px solid rgba(214,171,91,.34)",boxShadow:"inset 0 1px 0 rgba(255,255,255,.08),0 10px 24px rgba(54,38,24,.12)",
    display:"flex",alignItems:"flex-start",gap:"12px",overflow:"hidden",backdropFilter:"blur(10px)"
  },
  vipAiNoticeIcon:{
    flex:"0 0 40px",width:"40px",height:"40px",borderRadius:"13px",display:"flex",alignItems:"center",justifyContent:"center",
    background:"rgba(235,190,105,.14)",border:"1px solid rgba(235,190,105,.28)",color:"#e7bc6b",fontSize:"25px"
  },
  vipAiNoticeCopy:{minWidth:0,flex:1},
  vipAiNoticeCopySpan:{fontSize:"8px"},
  vipAiNoticeBadge:{
    position:"absolute",right:"12px",top:"12px",padding:"4px 7px",borderRadius:"999px",
    background:"rgba(231,188,107,.11)",border:"1px solid rgba(231,188,107,.22)",
    color:"#d9ad5c",fontSize:"7px",fontWeight:"1000",letterSpacing:"1px"
  },
  vipAiInfoCard:{
    marginTop:"13px",padding:"19px 16px",borderRadius:"20px",background:"linear-gradient(180deg,#fffaf2,#f8eddf)",
    border:"1px solid #ead7bb",boxShadow:"0 8px 20px rgba(80,53,27,.07)"
  },
  vipAiInfoHead:{display:"flex",flexDirection:"column",gap:"3px",paddingBottom:"13px",borderBottom:"1px solid rgba(177,132,71,.18)"},
  vipAiInfoGrid:{display:"grid",gridTemplateColumns:"1fr",gap:"0"},
  vipAiInfoItem:{position:"relative",padding:"14px 4px 14px 44px",borderBottom:"1px solid rgba(177,132,71,.13)"},
  vipAiBottomNote:{margin:"17px 4px 8px",textAlign:"center",color:"#765f48"},
  vipAiBottomLine:{width:"42px",height:"1px",margin:"0 auto 10px",background:"linear-gradient(90deg,transparent,#b88843,transparent)"},
  aiProHero:{
    position:"relative",overflow:"hidden",padding:"20px 17px 17px",borderRadius:"18px",
    background:"linear-gradient(145deg,#ffffff 0%,#f5f8fe 62%,#edf3fd 100%)",
    border:"1px solid #d8e2f0",boxShadow:"0 7px 20px rgba(25,58,105,.07)",color:"#17233f"
  },
  aiProHeroGlow:{display:"none"},
  aiProHeroTag:{
    position:"relative",display:"inline-flex",padding:"5px 9px",borderRadius:"999px",
    background:"#eef4ff",color:"#2458d6",border:"1px solid #d6e2fb",fontSize:"8px",fontWeight:"1000",letterSpacing:"1.1px"
  },
  aiProHeroRow:{position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",marginTop:"13px"},
  aiProTitle:{margin:0,fontSize:"25px",lineHeight:1.08,fontWeight:"950",letterSpacing:"-.8px",color:"#17233f"},
  aiProTitleAccent:{display:"block",marginTop:"4px",fontSize:"18px",color:"#2458d6",letterSpacing:"-.35px"},
  aiProLead:{margin:"12px 0 0",fontSize:"10px",lineHeight:1.7,color:"#4d617a",wordBreak:"keep-all"},
  aiProChip:{
    flex:"0 0 62px",width:"62px",height:"62px",borderRadius:"16px",display:"flex",flexDirection:"column",
    alignItems:"center",justifyContent:"center",background:"#2458d6",
    color:"#fff",border:"1px solid #2458d6",boxShadow:"0 6px 16px rgba(36,88,214,.16)"
  },
  aiProFeatureRow:{position:"relative",marginTop:"14px",display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"0",padding:"6px 0",background:"#f8fafc",borderTop:"1px solid #e5eaf1",borderBottom:"1px solid #e5eaf1"},
  aiProProcessCard:{
    marginTop:"12px",padding:"17px 12px 14px",borderRadius:"17px",background:"#fff",
    border:"1px solid #e0e7f0",boxShadow:"0 5px 16px rgba(31,54,84,.05)"
  },
  aiProSectionHead:{textAlign:"center",marginBottom:"15px"},
  aiProSteps:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"7px"},
  aiProStep:{
    position:"relative",minWidth:0,padding:"13px 7px 10px",borderRadius:"12px",textAlign:"center",
    background:"#f8fafc",border:"1px solid #e2e8f0"
  },
  aiProStepNo:{
    position:"absolute",top:"6px",left:"7px",width:"18px",height:"18px",borderRadius:"50%",
    display:"flex",alignItems:"center",justifyContent:"center",background:"#1c61bd",color:"#fff",
    fontSize:"8px",fontStyle:"normal",fontWeight:"1000"
  },
  aiProStepIcon:{
    width:"38px",height:"38px",margin:"3px auto 7px",borderRadius:"12px",display:"flex",alignItems:"center",
    justifyContent:"center",background:"#e8f1fd",color:"#1958a9",fontSize:"17px",fontWeight:"1000"
  },
  aiProLockedCard:{
    position:"relative",overflow:"hidden",marginTop:"12px",padding:"18px 15px",borderRadius:"19px",
    display:"flex",alignItems:"center",gap:"13px",background:"linear-gradient(135deg,#091d39,#123968 58%,#081a34)",
    border:"1px solid rgba(89,145,211,.45)",boxShadow:"0 10px 23px rgba(13,41,75,.18)",color:"#fff"
  },
  aiProLockedPattern:{
    position:"absolute",right:"-20px",top:"-30px",width:"150px",height:"150px",borderRadius:"50%",
    border:"1px solid rgba(79,158,255,.18)",boxShadow:"0 0 0 18px rgba(79,158,255,.035),0 0 0 38px rgba(79,158,255,.025)"
  },
  aiProLockIcon:{
    position:"relative",flex:"0 0 50px",width:"50px",height:"58px",display:"flex",alignItems:"center",
    justifyContent:"center",fontSize:"26px",color:"#f2c56d",border:"1px solid rgba(242,197,109,.55)",
    borderRadius:"15px",background:"rgba(255,255,255,.04)"
  },
  aiProLockedCopy:{position:"relative",minWidth:0,flex:1},
  aiProHowCard:{
    marginTop:"12px",padding:"17px 10px 14px",borderRadius:"17px",background:"#fff",
    border:"1px solid #e0e7f0",boxShadow:"0 5px 16px rgba(31,54,84,.045)"
  },
  aiProHowRow:{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:"3px"},
  aiProHowItem:{position:"relative",minWidth:0,textAlign:"center",padding:"2px"},
  aiProStandby:{
    position:"relative",overflow:"hidden",marginTop:"13px",padding:"24px 18px 18px",borderRadius:"17px",
    textAlign:"center",background:"#f7f9fd",
    border:"1px solid #dce5f1",boxShadow:"0 5px 16px rgba(31,54,84,.05)",color:"#17233f"
  },
  aiProStandbyWatermark:{display:"none"},
  aiProStandbyIcon:{
    position:"relative",width:"44px",height:"44px",margin:"0 auto 9px",borderRadius:"13px",
    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"23px",
    background:"#eef4ff",border:"1px solid #d6e2fb",color:"#2458d6"
  },
  aiProStandbyBottom:{
    position:"relative",marginTop:"14px",padding:"10px 9px",borderRadius:"11px",
    background:"#ffffff",border:"1px solid #e1e7ef",
    fontSize:"9px",lineHeight:1.6,color:"#5f6f85"
  },
  aiProFooter:{padding:"17px 8px 8px",textAlign:"center",color:"#718096"},
  aiBenefitStateWrap:{
    position:"relative",width:"100%",maxWidth:"100%",minWidth:0,overflow:"visible",borderRadius:"18px"
  },
  aiBenefitDiagonalRibbon:{
    position:"relative",zIndex:2,left:0,top:0,width:"100%",
    transform:"none",padding:"11px 12px",
    boxSizing:"border-box",textAlign:"left",borderRadius:"14px",marginBottom:"8px",
    background:"#f4f7fd",border:"1px solid #dbe5f3",
    boxShadow:"0 2px 8px rgba(31,54,84,.04)",pointerEvents:"none"
  },
  aiBenefitRibbonSmall:{
    display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.5px",
    color:"#718096",lineHeight:1.2
  },
  aiBenefitRibbonTitle:{
    display:"block",marginTop:"3px",paddingRight:"70px",fontSize:"16px",lineHeight:1.3,fontWeight:"950",
    letterSpacing:"-.35px",color:"#244d8f",textShadow:"none"
  },
  aiBenefitRibbonSub:{
    display:"block",marginTop:"3px",paddingRight:"70px",fontSize:"8px",fontWeight:"750",color:"#65758c"
  },
  aiBenefitCornerBadge:{
    position:"absolute",zIndex:3,right:"9px",top:"9px",minWidth:"57px",padding:"6px 8px",
    borderRadius:"10px",display:"flex",flexDirection:"column",alignItems:"center",
    background:"#ffffff",border:"1px solid #d6e2f3",
    boxShadow:"0 2px 7px rgba(31,54,84,.05)",pointerEvents:"none"
  },
  aiHeroAvailability:{
    position:"relative",marginTop:"10px",padding:"9px 10px",borderRadius:"10px",
    background:"#ffffff",border:"1px solid #dfe7f2",
    color:"#52627a",fontSize:"8.5px",fontWeight:"800",lineHeight:1.5,wordBreak:"keep-all"
  },
  vipPrizeGuide:{
    position:"relative",display:"flex",alignItems:"center",gap:"11px",margin:"0 0 10px",
    padding:"13px 14px",borderRadius:"17px",overflow:"hidden",
    background:"linear-gradient(135deg,#211b18,#49351f 72%,#654721)",
    border:"1px solid rgba(224,181,100,.48)",boxShadow:"0 8px 20px rgba(61,40,20,.13)",color:"#fff"
  },
  vipPrizeGuideIcon:{
    flex:"0 0 42px",width:"42px",height:"42px",borderRadius:"13px",display:"flex",
    alignItems:"center",justifyContent:"center",fontSize:"22px",
    background:"rgba(255,231,184,.11)",border:"1px solid rgba(242,198,112,.28)"
  },
  vipPrizeGuideCopy:{minWidth:0,flex:1},
  vipPrizeGuideBadge:{
    position:"absolute",right:"9px",top:"8px",fontSize:"6px",fontWeight:"1000",letterSpacing:"1.2px",
    padding:"4px 6px",borderRadius:"999px",color:"#e8bd6d",border:"1px solid rgba(232,189,109,.25)"
  },
  dailyAttendanceCard:{
    margin:"0 0 12px",padding:"16px 14px 12px",borderRadius:"19px",
    background:"linear-gradient(145deg,#fffaf0,#f7ead1)",border:"1px solid #e7c98f",
    boxShadow:"0 8px 22px rgba(100,70,31,.09)",color:"#3d2d20"
  },
  dailyAttendanceTop:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"12px"},
  dailyAttendanceEyebrow:{display:"block",fontSize:"7px",fontWeight:"1000",letterSpacing:"1.7px",color:"#a9742e"},
  dailyAttendanceTitle:{display:"block",marginTop:"3px",fontSize:"17px",letterSpacing:"-.4px"},
  dailyAttendanceDesc:{margin:"7px 0 0",fontSize:"9px",lineHeight:1.65,color:"#806c57",wordBreak:"keep-all"},
  dailyAttendanceCount:{
    flex:"0 0 58px",height:"58px",borderRadius:"18px",display:"flex",alignItems:"baseline",
    justifyContent:"center",paddingTop:"13px",boxSizing:"border-box",
    background:"linear-gradient(145deg,#4a321c,#a8742b)",color:"#fff3d7",
    border:"1px solid #d9aa5d",boxShadow:"0 6px 15px rgba(93,60,23,.16)"
  },
  dailyAttendanceProgress:{
    height:"7px",marginTop:"13px",borderRadius:"999px",overflow:"hidden",
    background:"rgba(130,92,45,.12)",border:"1px solid rgba(151,105,47,.09)"
  },
  dailyAttendanceProgressFill:{
    height:"100%",borderRadius:"999px",background:"linear-gradient(90deg,#b77d2b,#e8bd69)",transition:"width .25s ease"
  },
  dailyAttendanceBottom:{
    display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px",marginTop:"12px"
  },
  dailyAttendanceButton:{
    flex:"0 0 auto",minWidth:"78px",border:0,borderRadius:"12px",padding:"10px 11px",
    background:"linear-gradient(145deg,#3f2918,#8e5d22)",color:"#fff5df",fontSize:"10px",
    fontWeight:"1000",boxShadow:"0 5px 12px rgba(86,53,20,.15)",cursor:"pointer"
  },
  dailyAttendanceButtonDone:{
    background:"#ded6c9",color:"#8a7d6d",boxShadow:"none",cursor:"default"
  },
  dailyAttendanceFoot:{
    marginTop:"10px",paddingTop:"9px",borderTop:"1px solid rgba(151,105,47,.13)",
    fontSize:"7.5px",lineHeight:1.5,color:"#9a866f"
  },
  giftRewardMessage:{
    minWidth:"min(235px,64vw)",maxWidth:"100%",padding:"2px 0",lineHeight:1.5
  },
  giftRewardTitle:{
    fontSize:"11px",fontWeight:"1000",color:"#5a3b20",marginBottom:"10px",wordBreak:"keep-all"
  },
  giftRewardProduct:{
    display:"flex",flexDirection:"column",gap:"2px",padding:"9px 10px",borderRadius:"10px",
    background:"rgba(184,128,48,.09)",border:"1px solid rgba(173,119,43,.14)"
  },
  giftRewardLinkLabel:{marginTop:"9px",fontSize:"8px",fontWeight:"900",color:"#8b725a"},
  giftRewardButton:{
    display:"flex",alignItems:"center",justifyContent:"center",marginTop:"5px",padding:"10px 12px",
    borderRadius:"11px",background:"linear-gradient(135deg,#5b3c20,#a7742e)",color:"#fff7e6",
    fontSize:"10px",fontWeight:"1000",textDecoration:"none",boxShadow:"0 5px 12px rgba(94,58,20,.16)"
  },
  giftRewardUnavailable:{marginTop:"5px",fontSize:"8px",color:"#a25d55"},
  giftRewardCongrats:{margin:"10px 0 2px",fontSize:"9px",fontWeight:"900",color:"#604a36"},
  giftRewardNotice:{display:"block",fontSize:"7.5px",lineHeight:1.5,color:"#9a8773",wordBreak:"keep-all"},
  giftAdminCard:{
    margin:"0 0 12px",padding:"14px",borderRadius:"18px",
    background:"linear-gradient(145deg,#171a20,#25201b)",border:"1px solid rgba(220,174,93,.36)",
    boxShadow:"0 8px 22px rgba(22,17,12,.15)",color:"#fff"
  },
  giftAdminHead:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"12px"},
  giftAdminStock:{
    flex:"0 0 58px",height:"58px",borderRadius:"16px",display:"flex",flexDirection:"column",
    alignItems:"center",justifyContent:"center",background:"rgba(224,178,96,.10)",
    border:"1px solid rgba(224,178,96,.24)"
  },
  giftInventorySummary:{
    display:"grid",gridTemplateColumns:"1fr 1px 1fr 1px 1fr",alignItems:"stretch",
    marginTop:"12px",borderRadius:"14px",overflow:"hidden",
    background:"linear-gradient(135deg,rgba(224,178,96,.10),rgba(255,255,255,.035))",
    border:"1px solid rgba(224,178,96,.18)"
  },
  giftSummaryCell:{
    minWidth:0,padding:"11px 5px 10px",display:"flex",flexDirection:"column",
    alignItems:"center",justifyContent:"center",gap:"1px"
  },
  giftSummaryDivider:{width:"1px",background:"rgba(224,178,96,.14)",margin:"9px 0"},
  giftQueueNumberSent:{
    flex:"0 0 30px",height:"30px",borderRadius:"9px",display:"flex",alignItems:"center",
    justifyContent:"center",background:"rgba(91,142,103,.10)",border:"1px solid rgba(111,166,124,.18)",
    color:"#9dc8a6",fontSize:"10px",fontWeight:"1000"
  },
  giftInventoryNameLine:{display:"flex",alignItems:"center",gap:"4px",minWidth:0},
  giftPaidMember:{fontSize:"7px",fontWeight:"900",color:"#d4b77f",marginTop:"2px"},
  giftPaidTime:{fontSize:"6.7px",color:"#887b6d",marginTop:"1px"},
  giftWaitingDetail:{fontSize:"7px",color:"#998b7b",marginTop:"2px"},
  giftNextQueueBadge:{
    flex:"0 0 auto",padding:"6px 8px",borderRadius:"9px",
    background:"rgba(224,178,96,.09)",border:"1px solid rgba(224,178,96,.15)",
    color:"#ad9877",fontSize:"6.5px",fontWeight:"900",letterSpacing:".5px"
  },
  giftBulkGuide:{
    display:"flex",flexDirection:"column",gap:"3px",marginTop:"12px",padding:"10px 11px",
    borderRadius:"11px",background:"rgba(224,178,96,.07)",border:"1px solid rgba(224,178,96,.14)"
  },
  giftBulkTextarea:{
    width:"100%",minHeight:"126px",resize:"vertical",boxSizing:"border-box",
    border:"1px solid rgba(225,189,126,.20)",borderRadius:"11px",padding:"10px 11px",
    outline:"none",background:"rgba(255,255,255,.07)",color:"#fff5e4",fontSize:"8.5px",
    lineHeight:1.65,fontFamily:"inherit"
  },
  giftBulkCount:{fontSize:"7.5px",color:"#9f907f",textAlign:"right"},
  giftQueueTitle:{
    display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",
    marginTop:"13px",paddingTop:"11px",borderTop:"1px solid rgba(224,178,96,.12)",
    fontSize:"8px",color:"#d9bd8b"
  },
  giftQueueNumber:{
    flex:"0 0 30px",height:"30px",borderRadius:"9px",display:"flex",alignItems:"center",
    justifyContent:"center",background:"rgba(224,178,96,.08)",border:"1px solid rgba(224,178,96,.12)",
    color:"#e1b45f",fontSize:"7px",fontWeight:"1000"
  },
  giftAdminForm:{display:"flex",flexDirection:"column",gap:"7px",marginTop:"12px"},
  giftAdminFormRow:{display:"flex",gap:"7px",minWidth:0},
  giftAdminInput:{
    width:"100%",boxSizing:"border-box",border:"1px solid rgba(225,189,126,.20)",borderRadius:"10px",
    padding:"10px 10px",outline:"none",background:"rgba(255,255,255,.07)",color:"#fff5e4",
    fontSize:"9px"
  },
  giftAdminAddButton:{
    border:0,borderRadius:"10px",padding:"10px 12px",background:"linear-gradient(135deg,#8c6028,#d3a655)",
    color:"#20170e",fontSize:"9px",fontWeight:"1000",cursor:"pointer"
  },
  giftAdminInventoryList:{display:"flex",flexDirection:"column",gap:"6px",marginTop:"11px",maxHeight:"230px",overflowY:"auto"},
  giftAdminEmpty:{padding:"12px",borderRadius:"10px",background:"rgba(255,255,255,.04)",fontSize:"8px",color:"#a99a88",textAlign:"center"},
  giftAdminInventoryRow:{
    display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",padding:"9px 10px",
    borderRadius:"10px",background:"rgba(255,255,255,.045)",border:"1px solid rgba(255,255,255,.055)"
  },
  giftAdminInventoryInfo:{minWidth:0,display:"flex",flexDirection:"column",gap:"2px"},
  giftAdminInventoryActions:{display:"flex",alignItems:"center",gap:"6px",flex:"0 0 auto"},
  giftStockAvailable:{fontSize:"6px",fontWeight:"1000",letterSpacing:".8px",color:"#e1b45f"},
  giftStockAssigned:{fontSize:"6px",fontWeight:"1000",letterSpacing:".8px",color:"#8f9b91"},
  giftAdminSecurityNote:{
    marginTop:"10px",paddingTop:"9px",borderTop:"1px solid rgba(224,178,96,.12)",
    fontSize:"7.5px",lineHeight:1.5,color:"#a99a88",wordBreak:"keep-all"
  },
};
