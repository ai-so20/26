// Presentation-only palette. Dimensions, spacing, copy and state stay untouched.
const PRIMARY = "#20252b";
const SECONDARY = "#667085";
const BLUE = "#315be8";
const COLOR = /#[\da-f]{3,8}\b|rgba?\([^)]*\)/gi;

function parse(value) {
  let rgb, alpha = 1;
  if (value.startsWith("#")) {
    let hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map(c => c + c).join("");
    rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
    if (hex.length === 8) alpha = parseInt(hex.slice(6), 16) / 255;
  } else {
    const parts = value.match(/[\d.]+/g)?.map(Number);
    if (!parts || parts.length < 3) return null;
    rgb = parts.slice(0, 3); alpha = parts[3] ?? 1;
  }
  const [r, g, b] = rgb.map(n => n / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let hue = 0;
  if (delta) hue = 60 * (max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4);
  return { rgb, alpha, light: (max + min) / 2, saturation: delta, hue };
}

function semantic(c) {
  if (c.saturation < .18) return null;
  if (c.hue >= 95 && c.hue <= 170) return "green";
  if (c.hue <= 12 || c.hue >= 345) return "red";
  return null;
}

function ink(value, chart = false) {
  if (typeof value !== "string" || !value.match(COLOR)) return value;
  return value.replace(COLOR, token => {
    const c = parse(token); if (!c) return token;
    const meaning = semantic(c);
    if (meaning === "green") return "#15805f";
    if (meaning === "red") return "#cf434b";
    if (chart) return BLUE;
    return c.light >= .36 && c.light < .69 ? SECONDARY : PRIMARY;
  });
}

function surface(value) {
  if (typeof value !== "string" || value.includes("url(")) return value;
  return value.replace(COLOR, token => {
    const c = parse(token); if (!c) return token;
    // Keep dialog backdrops translucent and distinct from the page.
    if (c.alpha >= .45 && c.alpha < .85 && c.light < .25) return `rgba(22,34,55,${c.alpha})`;
    if (c.alpha < .4) return `rgba(49,91,232,${Math.min(c.alpha, .12)})`;
    if (c.light < .43) return "#ffffff";
    const meaning = semantic(c);
    if (meaning === "green") return "#eaf7f0";
    if (meaning === "red") return "#fff0f1";
    if (c.saturation > .07) return c.light > .91 ? "#f5f8ff" : "#eaf1ff";
    return c.light > .9 ? "#ffffff" : "#f2f5fa";
  });
}

function border(value) {
  if (typeof value !== "string") return value;
  return value.replace(COLOR, token => {
    const c = parse(token); if (!c) return token;
    return c.saturation > .2 ? "#c8d9f7" : "#e0e7f0";
  });
}

export function blueTheme(style, role = "surface") {
  if (!style || typeof style !== "object") return style;
  const result = { ...style };
  const bg = style.background || style.backgroundColor || "";
  const tokens = typeof bg === "string" ? bg.match(COLOR) || [] : [];
  const solidButton = role === "button" && (bg.includes("gradient(") || tokens.some(token => {
    const c = parse(token); return c && c.alpha >= .7 && c.light < .73;
  }));
  for (const [key, value] of Object.entries(style)) {
    if (["background", "backgroundColor", "backgroundImage"].includes(key)) result[key] = surface(value);
    else if (key === "color" || key === "WebkitTextFillColor") result[key] = role === "buttonChild" ? "inherit" : ink(value);
    else if ((key.startsWith("border") && !key.toLowerCase().includes("radius")) || key.startsWith("outline")) result[key] = border(value);
    else if (key === "boxShadow" && typeof value === "string") result[key] = value.replace(COLOR, "rgba(22,58,112,.09)");
    else if (key === "textShadow") result[key] = "none";
    else if (key === "fill" || key === "stroke") result[key] = ink(value, true);
  }
  if (role === "accentSurface" && (style.background !== undefined || style.backgroundImage !== undefined)) {
    if (style.background !== undefined) result.background = "linear-gradient(135deg,#e5efff 0%,#c8dbff 100%)";
    if (style.backgroundImage !== undefined) result.backgroundImage = "linear-gradient(135deg,#e5efff 0%,#c8dbff 100%)";
  }
  if (solidButton) {
    const c = tokens.map(parse).find(Boolean);
    const meaning = c && semantic(c);
    const color = meaning === "red" ? "#cf434b" : meaning === "green" ? "#15805f" : BLUE;
    if (style.background !== undefined) result.background = color;
    else result.backgroundColor = color;
    result.color = "#ffffff";
  }
  return result;
}
