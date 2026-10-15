// Presentation-only design system. Content, dimensions, state and behavior stay untouched.
const PRIMARY = '#17233f';
const SECONDARY = '#718096';
const BLUE = '#3165f4';
const COLOR = /#[\da-f]{3,8}\b|rgba?\([^)]*\)/gi;

const UNIFIED = { from:'#f8fafc', to:'#f3f6fa', ink:'#52627a', border:'#e1e7ef', action:'#64748b' };
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
};
const shell = { from:'#ffffff',to:'#f7f9fc',ink:PRIMARY,border:'#e1e7ef',action:BLUE };
const FONT_STACK = '-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans KR","Apple SD Gothic Neo",Arial,sans-serif';

function parse(value) {
  let rgb, alpha = 1;
  if (value.startsWith('#')) {
    let h = value.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    rgb = [0,2,4].map((i) => parseInt(h.slice(i,i+2),16));
    if (h.length === 8) alpha = parseInt(h.slice(6),16) / 255;
  } else {
    const n = value.match(/[\d.]+/g)?.map(Number);
    if (!n || n.length < 3) return null;
    rgb = n.slice(0,3); alpha = n[3] ?? 1;
  }
  const [r,g,b] = rgb.map((n) => n / 255);
  const max = Math.max(r,g,b), min = Math.min(r,g,b), delta = max - min;
  let hue = 0;
  if (delta) hue = 60 * (max === r ? ((g-b)/delta + 6) % 6 : max === g ? (b-r)/delta + 2 : (r-g)/delta + 4);
  return { alpha, light:(max+min)/2, saturation:delta, hue };
}

function semantic(c) {
  if (!c || c.saturation < .18) return null;
  if (c.hue >= 95 && c.hue <= 170) return 'green';
  if (c.hue <= 12 || c.hue >= 345) return 'red';
  return null;
}

function paletteFor(context) {
  return palettes[context] || palettes[String(context || '').split(':')[0]] || shell;
}

function ink(value, context, chart = false) {
  if (typeof value !== 'string') return value;
  const palette = paletteFor(context);
  return value.replace(COLOR, (token) => {
    const c = parse(token); if (!c) return token;
    const meaning = semantic(c);
    if (meaning === 'green') return '#14805f';
    if (meaning === 'red') return '#c04452';
    if (chart) return palette.action;
    if (context === 'ai' && c.light > .74 && c.saturation < .32) return '#f7faff';
    if (context === 'ai' && c.light > .48 && c.saturation > .16) return '#b9cff7';
    if (c.saturation > .18 && c.light >= .30 && c.light < .78) return palette.ink;
    return c.light >= .36 && c.light < .72 ? SECONDARY : PRIMARY;
  });
}

function surface(value, context) {
  if (typeof value !== 'string' || value.includes('url(')) return value;
  const palette = paletteFor(context);
  const tokens = value.match(COLOR) || [];
  const parsed = tokens.map(parse).filter(Boolean);
  const hasOpaqueDark = parsed.some((c) => c.alpha >= .7 && c.light < .40);
  const hasGradient = value.includes('gradient(');

  if (context === 'ai' && hasOpaqueDark) {
    return hasGradient
      ? 'linear-gradient(145deg,#0d2f62 0%,#123e76 52%,#174f8d 100%)'
      : '#103866';
  }
  if (context !== 'ai' && hasOpaqueDark) return '#ffffff';

  return value.replace(COLOR, (token) => {
    const c = parse(token); if (!c) return token;
    const meaning = semantic(c);
    if (c.alpha >= .45 && c.alpha < .85 && c.light < .25) return `rgba(15,35,65,${Math.min(c.alpha,.58)})`;
    if (c.alpha < .4) {
      if (meaning === 'green') return 'rgba(47,141,116,.09)';
      if (meaning === 'red') return 'rgba(192,68,82,.08)';
      return 'rgba(49,101,244,.05)';
    }
    if (meaning === 'green') return '#edf8f3';
    if (meaning === 'red') return '#fff2f3';
    if (context === 'shell') {
      if (c.light < .50) return '#ffffff';
      if (c.light < .88) return '#f7f9fc';
      return '#ffffff';
    }
    if (c.light < .43) return '#ffffff';
    if (c.saturation < .08) return c.light > .90 ? '#ffffff' : '#f8fafc';
    return c.light > .90 ? '#ffffff' : palette.from;
  });
}

function border(value, context, palette) {
  if (typeof value !== 'string') return value;
  return value.replace(COLOR, (token) => {
    const c = parse(token); if (!c) return token;
    const meaning = semantic(c);
    if (meaning === 'green') return '#c9e1d7';
    if (meaning === 'red') return '#edcfd3';
    return context === 'shell' ? '#e1e7ef' : palette.border;
  });
}

function radius(value, role) {
  if (typeof value !== 'string' || value.includes('999')) return value;
  const match = value.match(/^([\d.]+)px$/); if (!match) return value;
  const n = Number(match[1]); if (!Number.isFinite(n)) return value;
  if (role === 'button') return `${Math.max(n,11)}px`;
  if (n >= 18) return `${Math.min(n+1,24)}px`;
  if (n >= 8) return `${Math.max(n,14)}px`;
  return value;
}

export function blueTheme(style, role='surface', context='shell') {
  if (!style || typeof style !== 'object') return style;
  const palette = paletteFor(context);
  const result = { ...style };
  const bg = style.background || style.backgroundColor || '';
  const tokens = typeof bg === 'string' ? bg.match(COLOR) || [] : [];
  const parsed = tokens.map(parse).filter(Boolean);
  const hasGradient = typeof bg === 'string' && bg.includes('gradient(');
  const colorfulDark = parsed.some((c) => c.alpha >= .7 && c.light < .68 && c.saturation >= .12);
  const neutralDark = parsed.some((c) => c.alpha >= .7 && c.light < .48 && c.saturation < .12);
  const navButton = role === 'button' && style.height === '54px' && style.flexDirection === 'column';
  const actionButton = role === 'button' && (hasGradient || colorfulDark);

  for (const [key,value] of Object.entries(style)) {
    if (['background','backgroundColor','backgroundImage'].includes(key)) result[key] = surface(value,context);
    else if (key === 'color' || key === 'WebkitTextFillColor') result[key] = role === 'buttonChild' ? 'inherit' : ink(value,context);
    else if ((key.startsWith('border') && !key.toLowerCase().includes('radius')) || key.startsWith('outline')) result[key] = border(value,context,palette);
    else if (key === 'borderRadius') result[key] = radius(value,role);
    else if (key === 'boxShadow' && typeof value === 'string') result[key] = role === 'button' ? '0 1px 2px rgba(15,23,42,.04)' : '0 8px 24px rgba(15,23,42,.06)';
    else if (key === 'textShadow') result[key] = 'none';
    else if (key === 'fontFamily') result[key] = FONT_STACK;
    else if (key === 'fill' || key === 'stroke') result[key] = ink(value,context,true);
  }

  if (role === 'accentSurface' && (style.background !== undefined || style.backgroundImage !== undefined)) {
    const originalDark = parsed.some((c) => c.alpha >= .7 && c.light < .40);
    const fill = context === 'shell'
      ? '#ffffff'
      : context === 'ai' && originalDark
        ? 'linear-gradient(145deg,#0d2f62 0%,#123e76 52%,#174f8d 100%)'
        : `linear-gradient(145deg,${palette.from} 0%,${palette.to} 100%)`;
    if (style.background !== undefined) result.background = fill;
    if (style.backgroundImage !== undefined) result.backgroundImage = fill;
    if (style.border !== undefined && style.border !== 0) result.border = `1px solid ${palette.border}`;
    result.boxShadow = context === 'ai' && originalDark ? '0 12px 30px rgba(20,55,105,.16)' : '0 8px 24px rgba(15,23,42,.055)';
  }

  if (navButton) {
    if (hasGradient) {
      result.background = '#f3f7ff';
      result.color = '#2458d6';
      result.border = '1px solid #c9d8f8';
      result.boxShadow = '0 2px 8px rgba(36,88,214,.07)';
    } else {
      result.background = '#ffffff';
      result.color = '#52627a';
      result.border = '1px solid #e1e7ef';
      result.boxShadow = '0 1px 2px rgba(15,23,42,.025)';
    }
  } else if (role === 'button' && context === 'shell' && neutralDark && !hasGradient && !colorfulDark) {
    if (style.background !== undefined) result.background = '#ffffff';
    if (style.backgroundColor !== undefined) result.backgroundColor = '#ffffff';
    result.color = PRIMARY;
    result.border = '1px solid #dce4ef';
    result.boxShadow = '0 1px 2px rgba(15,23,42,.035)';
  } else if (actionButton) {
    const meaning = semantic(parsed.find(Boolean));
    const color = meaning === 'red' ? '#c04452' : meaning === 'green' ? '#2f806c' : palette.action;
    if (style.background !== undefined) result.background = color; else result.backgroundColor = color;
    result.color = '#ffffff';
    result.border = `1px solid ${color}`;
    result.boxShadow = '0 4px 12px rgba(49,101,244,.12)';
  }

  return result;
}
