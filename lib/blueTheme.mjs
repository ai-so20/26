// Presentation only: section-specific color, with all dimensions and behavior preserved.
const PRIMARY = '#252522';
const SECONDARY = '#736c64';
const BLUE = '#315bd5';
const COLOR = /#[\da-f]{3,8}\b|rgba?\([^)]*\)/gi;
const palettes = {
  ai: { from:'#f0f5ff',to:'#dce8ff',ink:'#244fbd',border:'#c8d7f2',action:BLUE },
  event: { from:'#fff7ef',to:'#ffe6d5',ink:'#9c4425',border:'#e8c5b2',action:'#a74728' },
  attendance: { from:'#f1faf5',to:'#daf1e5',ink:'#1b6a4c',border:'#b7d9c6',action:'#176b4b' },
  reward: { from:'#fff9ed',to:'#ffedce',ink:'#86531c',border:'#e6cfaa',action:'#815020' },
  'event:gift_box': { from:'#fff4e9',to:'#ffddc3',ink:'#984421',border:'#e7bfa4',action:'#a74728' },
  'event:number': { from:'#f8f3ff',to:'#e9dcfa',ink:'#684294',border:'#d3bee7',action:'#744b9d' },
  'event:roulette': { from:'#fff3f0',to:'#ffddd4',ink:'#a24232',border:'#e8bfb6',action:'#a74728' },
  'event:quiz': { from:'#f0faf3',to:'#d8f0e0',ink:'#276a44',border:'#b4d8c0',action:'#176b4b' },
  'event:draw': { from:'#fff1f6',to:'#f8dce9',ink:'#943c64',border:'#e4b8cb',action:'#9a3e65' },
};
const shell = { from:'#ffffff',to:'#ffffff',ink:PRIMARY,border:'#dedad3',action:'#292b2d' };
function parse(value) {
  let rgb,alpha=1;
  if(value.startsWith('#')) {let h=value.slice(1);if(h.length===3||h.length===4)h=[...h].map(c=>c+c).join('');rgb=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));if(h.length===8)alpha=parseInt(h.slice(6),16)/255;}
  else {const n=value.match(/[\d.]+/g)?.map(Number);if(!n||n.length<3)return null;rgb=n.slice(0,3);alpha=n[3]??1;}
  const [r,g,b]=rgb.map(n=>n/255),max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  let hue=0;if(delta)hue=60*(max===r?((g-b)/delta+6)%6:max===g?(b-r)/delta+2:(r-g)/delta+4);
  return {alpha,light:(max+min)/2,saturation:delta,hue};
}
function semantic(c) {
  if(c.saturation<.18)return null;
  if(c.hue>=95&&c.hue<=170)return 'green';
  if(c.hue<=12||c.hue>=345)return 'red';
  return null;
}
function ink(value,context,chart=false) {
  if(typeof value!=='string')return value;
  return value.replace(COLOR,token=>{const c=parse(token);if(!c)return token;
    const meaning=semantic(c);if(meaning==='green')return '#08704e';if(meaning==='red')return '#b73340';
    if(chart)return context==='ai'?BLUE:'#8c5434';
    return c.light>=.36&&c.light<.69?SECONDARY:PRIMARY;
  });
}
function surface(value,context) {
  if(typeof value!=='string'||value.includes('url('))return value;
  if(context==='shell'&&value.includes('gradient('))return '#ffffff';
  return value.replace(COLOR,token=>{const c=parse(token);if(!c)return token;
    if(c.alpha>=.45&&c.alpha<.85&&c.light<.25)return `rgba(30,28,25,${c.alpha})`;
    if(c.alpha<.4){const meaning=semantic(c);return meaning==='green'?'rgba(31,133,87,.08)':meaning==='red'?'rgba(189,67,77,.07)':context==='ai'?'rgba(49,91,213,.045)':'rgba(137,105,69,.045)';}
    if(c.light<.43)return '#ffffff';
    const meaning=semantic(c);if(meaning==='green')return '#edf8f1';if(meaning==='red')return '#fff1f2';
    if(context==='shell')return '#ffffff';
    // Keep neutral surfaces white; reserve blue fills for the AI process.
    if(c.saturation<.08)return '#ffffff';
    if(context==='ai')return '#f0f5ff';
    if(c.hue>=270&&c.hue<=330)return '#fbf2fa';
    if(c.hue>=170&&c.hue<270)return '#f7f3fc';
    return c.light>.9?'#fffcf7':'#fff3e8';
  });
}
function border(value,context,palette) {
  if(typeof value!=='string')return value;
  if(/^2px\s/.test(value))return value.replace(COLOR,palette.action);
  return value.replace(COLOR,token=>{const c=parse(token);if(!c)return token;
    const meaning=semantic(c);if(meaning==='green')return '#b7d9c6';if(meaning==='red')return '#e7bfc4';
    return context==='ai'?palette.border:c.saturation>.2&&context!=='shell'?palette.border:'#dedad3';
  });
}
export function blueTheme(style,role='surface',context='shell') {
  if(!style||typeof style!=='object')return style;
  const palette=palettes[context]||palettes[context.split(':')[0]]||shell;
  const result={...style},bg=style.background||style.backgroundColor||'';
  const tokens=typeof bg==='string'?bg.match(COLOR)||[]:[];
  const solidButton=role==='button'&&(bg.includes('gradient(')||tokens.some(t=>{const c=parse(t);return c&&c.alpha>=.7&&c.light<.73;}));
  for(const[key,value]of Object.entries(style)) {
    if(['background','backgroundColor','backgroundImage'].includes(key))result[key]=surface(value,context);
    else if(key==='color'||key==='WebkitTextFillColor')result[key]=role==='buttonChild'?'inherit':ink(value,context);
    else if((key.startsWith('border')&&!key.toLowerCase().includes('radius'))||key.startsWith('outline'))result[key]=border(value,context,palette);
    else if(key==='boxShadow'&&typeof value==='string')result[key]=value.replace(COLOR,'rgba(44,36,24,.08)');
    else if(key==='textShadow')result[key]='none';
    else if(key==='fill'||key==='stroke')result[key]=ink(value,context,true);
  }
  if(role==='accentSurface'&&(style.background!==undefined||style.backgroundImage!==undefined)) {
    const fill=context==='shell'?'#ffffff':`linear-gradient(135deg,${palette.from} 0%,${palette.to} 100%)`;
    if(style.background!==undefined)result.background=fill;
    if(style.backgroundImage!==undefined)result.backgroundImage=fill;
    // A visible edge separates light cards without washing the whole page in gray.
    if(style.border!==undefined&&style.border!==0)result.border=border(style.border,context,palette);
  }
  if(solidButton) {
    const meaning=semantic(tokens.map(parse).find(Boolean)||{saturation:0});
    const color=meaning==='red'?'#b73340':meaning==='green'?'#08704e':palette.action;
    if(style.background!==undefined)result.background=color;else result.backgroundColor=color;
    result.color='#ffffff';
  }
  return result;
}
