#!/usr/bin/env node
/* Gera dark-theme.css a partir do CSS do app (index.html, literacy.css,
   phrase-cloze.css).
   Por quê: o tema escuro antigo só trocava algumas variáveis; vários
   componentes têm fundo branco/pastel escrito direto no CSS (#fff, #EFFBEF...)
   e então ficavam claros com letra clara (invisível). Este script lê todas as
   regras, e pra cada fundo/borda/sombra CLARO gera uma versão escura, e pra cada
   cor de TEXTO escura gera uma versão clara - então no escuro sobra fundo escuro
   + letra clara, e no claro continua tudo como era (fundo claro + letra escura).
   Uso: node tools/gen-dark-theme.js   (rode de novo se mexer no CSS) */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function readCss() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const files = ['literacy.css', 'phrase-cloze.css'].filter((f) => fs.existsSync(path.join(root, f)))
    .map((f) => fs.readFileSync(path.join(root, f), 'utf8'));
  return [...styles, ...files].join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
}

// ---------- cor ----------
function parseColor(str) {
  str = str.trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(str);
  if (m) { const h = m[1]; return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16), a: 1 }; }
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(str);
  if (m) { const h = m[1]; return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: m[2] ? parseInt(m[2], 16) / 255 : 1 }; }
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/.exec(str);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] };
  return null;
}
function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0); else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h, s, l };
}
function fromHsl(h, s, l) {
  const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  let r, g, b;
  if (s === 0) r = g = b = l; else { const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3); }
  return [r, g, b].map((v) => Math.round(v * 255));
}
function fmt(rgb, a) { const [r, g, b] = rgb; return a < 1 ? `rgba(${r},${g},${b},${+a.toFixed(2)})` : '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''); }

const COLOR_RE = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)/g;
const lightness = (c) => toHsl(c).l;

// fundo claro -> fundo escuro (mesmo matiz, bem menos saturado)
function darkenBg(c) { let { h, s, l } = toHsl(c); if (s < 0.06) { h = 0.76; s = 0.25; } return fmt(fromHsl(h, s * 0.45, 0.14 + (1 - l) * 0.6), c.a); }
// borda/sombra clara -> escura, um tom acima do fundo
function darkenLine(c) { let { h, s, l } = toHsl(c); if (s < 0.06) { h = 0.76; s = 0.2; } return fmt(fromHsl(h, s * 0.4, 0.26 + (1 - l) * 0.5), c.a); }
function darkenShadow(c) { const { h, s } = toHsl(c); return fmt(fromHsl(h, s * 0.4, 0.09), c.a); }
// texto escuro -> texto claro, mesma tonalidade
function lightenText(c) { const { h, s, l } = toHsl(c); return fmt(fromHsl(h, Math.min(1, s * 0.9), l < 0.12 ? 0.9 : 0.74), c.a); }

function mapColors(value, fn) {
  return value.replace(COLOR_RE, (m) => { const c = parseColor(m); return c ? fn(c, m) : m; });
}
function colorsIn(value) { return (value.match(COLOR_RE) || []).map(parseColor).filter(Boolean); }

function parseDecls(body) {
  return body.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const i = d.indexOf(':'); return i < 0 ? null : { prop: d.slice(0, i).trim().toLowerCase(), value: d.slice(i + 1).trim() };
  }).filter(Boolean);
}

function darkDeclsFor(decls) {
  const out = [];
  let bgLightest = null; // maior luminosidade entre os fundos da regra (antes de escurecer)
  let bgMid = false;
  let explicitText = null;
  for (const { prop, value } of decls) {
    const imp = /!important\s*$/.test(value) ? ' !important' : '';
    const v = value.replace(/!important\s*$/, '').trim();
    if (prop === 'background' || prop === 'background-color' || prop === 'background-image') {
      const cs = colorsIn(v).filter((c) => c.a > 0.5);
      const lights = cs.filter((c) => lightness(c) >= 0.8);
      if (lights.length) {
        bgLightest = Math.max(...lights.map(lightness));
        out.push(`${prop}:${mapColors(v, (c) => (lightness(c) >= 0.8 && c.a > 0.5 ? darkenBg(c) : fmt([c.r, c.g, c.b], c.a)))}${imp}`);
      } else if (cs.some((c) => lightness(c) > 0.5)) bgMid = true;
    } else if (/^border|^outline/.test(prop)) {
      if (colorsIn(v).some((c) => lightness(c) >= 0.75)) out.push(`${prop}:${mapColors(v, (c) => (lightness(c) >= 0.75 ? darkenLine(c) : fmt([c.r, c.g, c.b], c.a)))}${imp}`);
    } else if (prop === 'box-shadow' || prop === 'text-shadow') {
      if (colorsIn(v).some((c) => lightness(c) >= 0.75 && c.a > 0.4)) out.push(`${prop}:${mapColors(v, (c) => (lightness(c) >= 0.75 && c.a > 0.4 ? darkenShadow(c) : fmt([c.r, c.g, c.b], c.a)))}${imp}`);
    } else if (prop === 'color') {
      explicitText = { v, imp };
    }
  }
  if (explicitText) {
    const c = parseColor(explicitText.v);
    if (c && lightness(c) <= 0.5 && !bgMid) out.push(`color:${lightenText(c)}${explicitText.imp}`);
  } else if (bgMid) {
    // fundo de cor média (amarelo, laranja...) que antes dependia de texto escuro herdado
    out.push('color:#2A2230');
  }
  return out;
}

function main() {
  const css = readCss();
  const seen = new Set();
  const rules = [];
  const re = /([^{}@]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    let sel = m[1].trim();
    if (!sel || /;|^import\b/.test(sel)) { const k = sel.lastIndexOf(';'); if (k >= 0) sel = sel.slice(k + 1).trim(); else if (/^import\b/.test(sel)) continue; }
    if (!sel || /^(from|to|\d+%)/.test(sel) || /\[data-theme|\.skin-|^(html|body|:root|\*)\s*$/.test(sel)) continue;
    const decls = darkDeclsFor(parseDecls(m[2]));
    if (!decls.length) continue;
    const key = sel + '|' + decls.join(';');
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push({ sel, decls });
  }
  const prefixed = (sel) => sel.split(',').map((s) => s.trim()).filter(Boolean)
    .flatMap((s) => [`:root[data-theme="dark"] ${s}`, `body.skin-night ${s}`]).join(',');
  let out = '/* GERADO por tools/gen-dark-theme.js - não edite à mão; rode o script de novo. */\n';
  out += ':root[data-theme="dark"]{color-scheme:dark}\n';
  out += ':root[data-theme="dark"] body,body.skin-night{--cream:#1B1620;--card:#241E2C;--line:#3A3244;--muted:#B2A6BE;--plum:#F3EEF7;color:#F3EEF7}\n';
  out += ':root[data-theme="dark"] input,:root[data-theme="dark"] select,:root[data-theme="dark"] textarea,body.skin-night input,body.skin-night select,body.skin-night textarea{color:#F3EEF7}\n';
  out += ':root[data-theme="dark"] ::placeholder,body.skin-night ::placeholder{color:#B2A6BE}\n';
  for (const { sel, decls } of rules) out += `${prefixed(sel)}{${decls.join(';')}}\n`;
  fs.writeFileSync(path.join(root, 'dark-theme.css'), out);
  console.log(`dark-theme.css: ${rules.length} regras, ${out.length} bytes`);
}
main();
