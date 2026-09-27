#!/usr/bin/env node
// tools/gen-icons.mjs — מחולל האייקונים
import { deflateSync, inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { APP as CFG } from './gen-app.mjs';

// שם הנכס נושא hash של תוכנו — שינוי בבתים משנה את הכתובת, וכרום מושך אותה מחדש.
const ICON_RE = /^([a-z0-9-]+)\.([0-9a-f]{8})\.png$/;
const iconName = (base, buf) => `${base}.${createHash('sha256').update(buf).digest('hex').slice(0, 8)}.png`;

const APP = CFG.icon;

// ── PNG: מקודד ומפענח, בלי ספריות ──
const CRC_T = (() => { const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t; })();
function crc32(b) { let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(w, h, rgba) {
  const stride = w * 4, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// נכשל ברעש על כל פורמט שאינו נתמך — מפענח שמדלג מייצר נכס שאיש לא מדד.
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('אינו PNG');
  let p = 8; const idat = []; let ihdr = null, plte = null, trns = null;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4),
                                  depth: data[8], ctype: data[9], interlace: data[12] };
    else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (!ihdr || ihdr.depth !== 8 || ihdr.interlace !== 0) throw new Error('PNG שאינו נתמך');
  const CH = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.ctype];
  if (!CH) throw new Error(`colortype ${ihdr.ctype} אינו נתמך`);
  const raw = inflateSync(Buffer.concat(idat));
  const { w, h } = ihdr, stride = w * CH, out = Buffer.alloc(w * h * 4);
  const line = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[q++];
    raw.copy(line, 0, q, q + stride); q += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= CH ? line[i - CH] : 0, b = prev[i], c = i >= CH ? prev[i - CH] : 0;
      let v = line[i];
      if (ft === 1) v += a; else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      else if (ft !== 0) throw new Error(`מסנן ${ft} אינו מוכר`);
      line[i] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const s = x * CH, d = (y * w + x) * 4;
      if (ihdr.ctype === 6) { out[d] = line[s]; out[d+1] = line[s+1]; out[d+2] = line[s+2]; out[d+3] = line[s+3]; }
      else if (ihdr.ctype === 2) { out[d] = line[s]; out[d+1] = line[s+1]; out[d+2] = line[s+2]; out[d+3] = 255; }
      else if (ihdr.ctype === 0) { out[d] = out[d+1] = out[d+2] = line[s]; out[d+3] = 255; }
      else if (ihdr.ctype === 4) { out[d] = out[d+1] = out[d+2] = line[s]; out[d+3] = line[s+1]; }
      else { const i3 = line[s] * 3; out[d] = plte[i3]; out[d+1] = plte[i3+1]; out[d+2] = plte[i3+2];
             out[d+3] = trns && line[s] < trns.length ? trns[line[s]] : 255; }
    }
    line.copy(prev);
  }
  return { w, h, data: out };
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');
const OUT = join(ROOT, 'icons');
const SS = 8; // דגימת-יתר לכל ציר
const ALPHA_MIN = 25; // סף התוכן — שוליי הנכס נמדדים בו
// פיקסל שוליים שקוף למחצה הוא רמפת קצה ואינו מישור דיו.
const OPAQUE_MIN = 250;
// הצורה המוצהרת ב-APP.art חייבת להתאים לסיומת המאסטר — אחרת המחולל נכשל בשקט על קובץ שאינו מה שהוא מצפה לו.
if (!APP.master || !APP.master.endsWith(APP.art === 'svg' ? '.svg' : '.png'))
  throw new Error(`הצורה המוצהרת ${APP.art} והמאסטר ${APP.master} — מיישרים את ההצהרה לסיומת המאסטר`);

// ── צורות: כיסוי הפיקסל בדגימת-יתר ──
// הצורה מחזירה מרחק מסומן ולא בוליאני — פיקסל שמרכזו רחוק מחצי-אלכסון מהגבול מוכרע בלי לדגום.
// אין להחליף בנוסחת כיסוי — נוסחה נותנת קצה חד, והקצה הוא מה שנמדד.
const HALF_DIAG = 0.7072; // מעוגל כלפי מעלה — עיגול כלפי מטה היה מכריע פיקסל גבול בלי לדגום אותו
const cover = (shape, x, y) => {
  const d = shape(x + 0.5, y + 0.5);
  if (d <= -HALF_DIAG) return 1;
  if (d >= HALF_DIAG) return 0;
  let hit = 0;
  for (let sy = 0; sy < SS; sy++)
    for (let sx = 0; sx < SS; sx++) {
      const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
      if (shape(px, py) <= 0) hit++;
    }
  return hit / (SS * SS);
};
const roundRect = (x0, y0, w, h, r) => (px, py) => {
  const cx = x0 + w / 2, cy = y0 + h / 2;
  const qx = Math.abs(px - cx) - (w / 2 - r), qy = Math.abs(py - cy) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const ring = (cx, cy, ro, ri) => (px, py) => {
  const d = Math.hypot(px - cx, py - cy); return Math.max(d - ro, ri - d);
};
const disc = (cx, cy, r) => (px, py) => Math.hypot(px - cx, py - cy) - r;

// ההרכבה בהכפלה מוקדמת באלפא, וה-RGB מחולק באלפא בסוף — PNG הוא straight alpha,
// ובלי החלוקה פיקסל בעל אלפא חלקית יוצא כהה מהדיו.
function canvasOf(w, h = w) {
  return { w, h, acc: new Float64Array(w * h * 4) };
}
// הציור מוגבל לתיבת הצורה ועוד פיקסל של רמפת קצה — סריקת הקנבס כולו לכל צורה חורגת מתקציב הזמן.
function span(c, box) {
  if (!box) return { x0: 0, y0: 0, x1: c.w - 1, y1: c.h - 1 };
  return { x0: Math.max(0, Math.floor(box.x) - 1), y0: Math.max(0, Math.floor(box.y) - 1),
           x1: Math.min(c.w - 1, Math.ceil(box.x + box.w) + 1),
           y1: Math.min(c.h - 1, Math.ceil(box.y + box.h) + 1) };
}
function paint(c, shape, rgb, alpha = 1, box = null) {
  const sp = span(c, box);
  for (let y = sp.y0; y <= sp.y1; y++)
    for (let x = sp.x0; x <= sp.x1; x++) {
      const a = cover(shape, x, y) * alpha;
      if (!a) continue;
      const i = (y * c.w + x) * 4;
      c.acc[i]     = c.acc[i]     * (1 - a) + rgb[0] * a;
      c.acc[i + 1] = c.acc[i + 1] * (1 - a) + rgb[1] * a;
      c.acc[i + 2] = c.acc[i + 2] * (1 - a) + rgb[2] * a;
      c.acc[i + 3] = c.acc[i + 3] * (1 - a) + a;
    }
}
// מדרג לינארי בין שתי נקודות בצירי המאסטר ולא בזווית — זווית היא קירוב, והפער נראה בנכס.
function paintGradient(c, shape, g, alpha, box, clipBox) {
  const dx = g.p2[0] - g.p1[0], dy = g.p2[1] - g.p1[1], L2 = dx * dx + dy * dy;
  const sp = span(c, clipBox);
  for (let y = sp.y0; y <= sp.y1; y++)
    for (let x = sp.x0; x <= sp.x1; x++) {
      const a = cover(shape, x, y) * alpha;
      if (!a) continue;
      const u = (x + 0.5 - box.x) / box.w, v = (y + 0.5 - box.y) / box.h;
      const t = ((u - g.p1[0]) * dx + (v - g.p1[1]) * dy) / L2;
      const k = Math.max(0, Math.min(1, t));
      const i = (y * c.w + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const v = g.start[ch] + (g.end[ch] - g.start[ch]) * k;
        c.acc[i + ch] = c.acc[i + ch] * (1 - a) + v * a;
      }
      c.acc[i + 3] = c.acc[i + 3] * (1 - a) + a;
    }
}
function flatten(c) {
  const px = Buffer.alloc(c.w * c.h * 4);
  for (let k = 0; k < c.w * c.h; k++) {
    const i = k * 4, a = c.acc[i + 3];
    if (a > 0) { px[i] = Math.round(c.acc[i] / a); px[i+1] = Math.round(c.acc[i+1] / a);
                 px[i+2] = Math.round(c.acc[i+2] / a); }
    px[i + 3] = Math.round(a * 255);
  }
  return px;
}
const contentBox = (px, size) => {
  let x0 = size, y0 = size, x1 = -1, y1 = -1;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (px[(y * size + x) * 4 + 3] >= ALPHA_MIN) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
};
// תיבת התוכן במסכת אלפא 0..1, באותו סף ALPHA_MIN בדיוק
const maskBox = (a, w, h) => {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (a[y * w + x] >= ALPHA_MIN / 255) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
};

// ── מאסטר רסטרי: מסכה מהמרחק לצבע הרקע ──
// המסכה מהמרחק ולא מסף בינארי, ומהמאסטר כמות שהוא — אחרת רמפת הקצה משתנה והצלע זזה בפיקסל.
// המסכה נחתכת לתיבת התוכן מיד — אין ליישר את המאסטר; הזזה משנה בתים (מרקם הנייר) אך לא את התיבה.
let MASTER = null;
function masterMask() {
  if (MASTER) return MASTER;
  const im = decodePng(readFileSync(join(ROOT, APP.master)));
  const [kr, kg, kb] = APP.bgKey, tol = APP.keyTol;
  const m = new Float64Array(im.w * im.h);
  for (let k = 0; k < im.w * im.h; k++) {
    const d = Math.max(Math.abs(im.data[k*4] - kr), Math.abs(im.data[k*4+1] - kg), Math.abs(im.data[k*4+2] - kb));
    // הנייר במאסטר אינו לבן מוחלט — רעש מתחת ל-ALPHA_MIN מתאפס, באותו סף שהתוכן נמדד בו, ולכן תיבת התוכן אינה זזה.
    const a = Math.max(0, Math.min(1, d / tol));
    m[k] = a < ALPHA_MIN / 255 ? 0 : a;
  }
  let x0 = im.w, y0 = im.h, x1 = -1, y1 = -1;
  for (let y = 0; y < im.h; y++)
    for (let x = 0; x < im.w; x++)
      if (m[y * im.w + x] >= ALPHA_MIN / 255) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, cut = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cut[y * w + x] = m[(y + y0) * im.w + (x + x0)];
  MASTER = { w, h, a: cut, img: im, full: m };
  return MASTER;
}
// הקטנה בממוצע-שטח על מסכת האלפא בלבד — הדיו אחיד, ולכן זו הכפלה מוקדמת בלי RGB שקוף שנמרח פנימה.
function scaleMask(src, sw, sh, dw, dh) {
  const out = new Float64Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const sy0 = y * sh / dh, sy1 = (y + 1) * sh / dh;
    for (let x = 0; x < dw; x++) {
      const sx0 = x * sw / dw, sx1 = (x + 1) * sw / dw;
      let s = 0, n = 0;
      for (let yy = Math.floor(sy0); yy < Math.min(sh, Math.ceil(sy1)); yy++) {
        const fy = Math.min(sy1, yy + 1) - Math.max(sy0, yy);
        for (let xx = Math.floor(sx0); xx < Math.min(sw, Math.ceil(sx1)); xx++) {
          const fx = Math.min(sx1, xx + 1) - Math.max(sx0, xx);
          s += src[yy * sw + xx] * fx * fy; n += fx * fy;
        }
      }
      out[y * dw + x] = n ? s / n : 0;
    }
  }
  return out;
}

// ── מאסטר SVG: קורא גיאומטרי, בלי תלות חיצונית ──
// כל תג, תכונה או פקודת path שאינה ברשימה מפילה — קורא שמדלג מייצר נכס שאיש לא מדד.
// אין ספריית רסטור — היא אינה נפתרת בקלון טרי.
const SVG_ATTRS = {
  svg: ['xmlns', 'viewBox', 'width', 'height'],
  defs: [],
  g: ['clip-path'],
  clipPath: ['id'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'fill', 'opacity'],
  circle: ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width', 'opacity'],
  path: ['d', 'fill', 'opacity'],
  linearGradient: ['id', 'x1', 'y1', 'x2', 'y2'],
  stop: ['offset', 'stop-color'],
};
// אותיות גדולות בלבד — פקודה יחסית צוברת מצב, וטעות בה מזיזה את הצורה בלי להיכשל.
const SVG_PATH_CMDS = 'MLQHVZ';
// מספר הקטעים קבוע וזהה בכל הריפו — ערך אחר מזיז את הקצה, ואותה צורה יוצאת אחרת.
const SVG_Q_STEPS = 24;

const svgNum = (v, what) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`SVG: ${what} — נמדד «${v}» והצפוי מספר; מתקנים את המאסטר`);
  return n;
};
const svgColor = (v, what) => {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(String(v).trim());
  if (!m) throw new Error(`SVG: ${what} — נמדד «${v}» והצפוי #RRGGBB; מתקנים את המאסטר`);
  return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
};
const svgRef = (v, what) => {
  const m = /^url\(#([\w-]+)\)$/.exec(String(v).trim());
  if (!m) throw new Error(`SVG: ${what} — נמדד «${v}» והצפוי url(#id); מתקנים את המאסטר`);
  return m[1];
};

// טקסט חופשי בין תגים מפיל — <text> מרונדר לפי הגופן שבמכונה, ומכונה אחרת נותנת צורה אחרת.
function svgParse(src) {
  const clean = src.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<\?[\s\S]*?\?>/g, ' ');
  const root = { tag: '#root', attr: {}, kids: [] };
  const stack = [root];
  const re = /<\s*(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g;
  let m, last = 0;
  while ((m = re.exec(clean))) {
    const between = clean.slice(last, m.index).trim();
    if (between) throw new Error(`SVG: טקסט חופשי «${between.slice(0, 24)}» — המאסטר נושא צורות בלבד; מסירים אותו`);
    last = re.lastIndex;
    const [, close, tag, attrs, self] = m;
    if (!Object.prototype.hasOwnProperty.call(SVG_ATTRS, tag))
      throw new Error(`SVG: תג <${tag}> אינו נתמך — הנתמכים ${Object.keys(SVG_ATTRS).join(' · ')}; מתקנים את המאסטר`);
    if (close) {
      const top = stack.pop();
      if (!top || top.tag !== tag) throw new Error(`SVG: </${tag}> סוגר את <${top && top.tag}>; מתקנים את המאסטר`);
      continue;
    }
    const attr = {};
    for (const a of attrs.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) {
      if (!SVG_ATTRS[tag].includes(a[1]))
        throw new Error(`SVG: <${tag} ${a[1]}=…> אינה נתמכת — הנתמכות ${SVG_ATTRS[tag].join(' · ') || 'אין'}; מתקנים את המאסטר`);
      attr[a[1]] = a[2];
    }
    const el = { tag, attr, kids: [] };
    stack[stack.length - 1].kids.push(el);
    if (!self) stack.push(el);
  }
  const tail = clean.slice(last).trim();
  if (tail) throw new Error(`SVG: טקסט חופשי «${tail.slice(0, 24)}» — המאסטר נושא צורות בלבד; מסירים אותו`);
  if (stack.length !== 1) throw new Error(`SVG: תג <${stack[stack.length - 1].tag}> לא נסגר; מתקנים את המאסטר`);
  const svg = root.kids.find((k) => k.tag === 'svg');
  if (!svg || root.kids.length !== 1) throw new Error('SVG: נדרש שורש <svg> יחיד; מתקנים את המאסטר');
  return svg;
}

// Q מפולח לקווים, וכל פקודה שאינה מוכרת מפילה — אחרת היא משנה את הצורה בלי שאיש יראה.
function svgPath(d) {
  const toks = String(d).match(/[A-Za-z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
  const rings = []; let ring = null, cx = 0, cy = 0, sx = 0, sy = 0, cmd = '', i = 0;
  const num = () => {
    const v = toks[i++];
    if (v === undefined || /[A-Za-z]/.test(v)) throw new Error(`SVG: path — חסר מספר אחרי ${cmd}; מתקנים את המאסטר`);
    return Number(v);
  };
  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i])) {
      cmd = toks[i++];
      if (!SVG_PATH_CMDS.includes(cmd))
        throw new Error(`SVG: path — פקודה ${cmd} אינה נתמכת, והנתמכות ${SVG_PATH_CMDS.split('').join(' ')}; מתקנים את המאסטר`);
    }
    if (cmd === 'M') { if (ring && ring.length > 2) rings.push(ring);
      cx = num(); cy = num(); sx = cx; sy = cy; ring = [[cx, cy]]; cmd = 'L'; continue; }
    if (!ring) throw new Error('SVG: path אינו נפתח ב-M; מתקנים את המאסטר');
    if (cmd === 'L') { cx = num(); cy = num(); ring.push([cx, cy]); continue; }
    if (cmd === 'H') { cx = num(); ring.push([cx, cy]); continue; }
    if (cmd === 'V') { cy = num(); ring.push([cx, cy]); continue; }
    if (cmd === 'Q') {
      const qx = num(), qy = num(), ex = num(), ey = num();
      for (let s = 1; s <= SVG_Q_STEPS; s++) {
        const u = s / SVG_Q_STEPS, w = 1 - u;
        ring.push([w * w * cx + 2 * w * u * qx + u * u * ex, w * w * cy + 2 * w * u * qy + u * u * ey]);
      }
      cx = ex; cy = ey; continue;
    }
    // פקודת Z — סגירת הטבעת
    ring.push([sx, sy]); if (ring.length > 2) rings.push(ring); ring = null; cx = sx; cy = sy;
  }
  if (ring && ring.length > 2) rings.push(ring);
  if (!rings.length) throw new Error('SVG: path ריק; מתקנים את המאסטר');
  return rings;
}

// מרחק מסומן למצולע, והסימן לפי מספר ההקפה — פונקציית מרחק אמיתית, ולכן קיצור-הדרך של cover תקף גם כאן.
// הצלעות נפרסות למערך שטוח פעם אחת לביצועים — אותן פעולות, באותו סדר.
const poly = (rings) => {
  let n = 0;
  for (const r of rings) n += r.length - 1;
  const S = new Float64Array(n * 6);
  let j = 0;
  for (const r of rings)
    for (let k = 0; k + 1 < r.length; k++) {
      const [ax, ay] = r[k], [bx, by] = r[k + 1];
      const ex = bx - ax, ey = by - ay;
      S[j] = ax; S[j + 1] = ay; S[j + 2] = bx; S[j + 3] = by;
      S[j + 4] = ex; S[j + 5] = ey; j += 6;
    }
  return (px, py) => {
    let best = Infinity, wind = 0;
    for (let q = 0; q < S.length; q += 6) {
      const ax = S[q], ay = S[q + 1], by = S[q + 3];
      const ex = S[q + 4], ey = S[q + 5], wx = px - ax, wy = py - ay;
      const L2 = ex * ex + ey * ey;
      const t = L2 ? Math.max(0, Math.min(1, (wx * ex + wy * ey) / L2)) : 0;
      const dx = wx - ex * t, dy = wy - ey * t;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
      if (ay <= py) { if (by > py && ex * wy - ey * wx > 0) wind++; }
      else if (by <= py && ex * wy - ey * wx < 0) wind--;
    }
    return (wind ? -1 : 1) * Math.sqrt(best);
  };
};

// הרדיוס נשען על הקנה האופקי בלבד — שני קנים היו הופכים עיגול לאליפסה.
function svgShape(p, T) {
  const X = (v) => T.tx + (v - T.ox) * T.sx, Y = (v) => T.ty + (v - T.oy) * T.sy;
  if (p.kind === 'rect') return roundRect(X(p.x), Y(p.y), p.w * T.sx, p.h * T.sy, p.r * T.sx);
  if (p.kind === 'disc') return disc(X(p.cx), Y(p.cy), p.r * T.sx);
  if (p.kind === 'ring') return ring(X(p.cx), Y(p.cy), p.ro * T.sx, p.ri * T.sx);
  return poly(p.rings.map((r) => r.map(([x, y]) => [X(x), Y(y)])));
}
const svgBox = (p) => {
  if (p.kind === 'rect') return [p.x, p.y, p.x + p.w, p.y + p.h];
  if (p.kind === 'disc') return [p.cx - p.r, p.cy - p.r, p.cx + p.r, p.cy + p.r];
  if (p.kind === 'ring') return [p.cx - p.ro, p.cy - p.ro, p.cx + p.ro, p.cy + p.ro];
  let b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const r of p.rings) for (const [x, y] of r)
    b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)];
  return b;
};
const boxAnd = (a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];

// הפעולות בסדר המסמך, מילוי ואז קו — עיגול עם שניהם הוא דיסקה חיצונית בצבע הקו ומעליה דיסקה פנימית במילוי, כמו ש-SVG מצייר.
function svgOps(svg) {
  const vb = (svg.attr.viewBox || '').trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some((v) => !Number.isFinite(v)) || vb[0] !== 0 || vb[1] !== 0)
    throw new Error(`SVG: viewBox «${svg.attr.viewBox}» — נדרש «0 0 W H»; מתקנים את המאסטר`);
  const grads = new Map(), clips = new Map(), ops = [];
  const prim = (el) => {
    const a = el.attr, op = svgNum(a.opacity === undefined ? 1 : a.opacity, `<${el.tag} opacity>`);
    if (el.tag === 'rect') return [{ kind: 'rect', x: svgNum(a.x || 0, 'rect x'), y: svgNum(a.y || 0, 'rect y'),
      w: svgNum(a.width, 'rect width'), h: svgNum(a.height, 'rect height'), r: svgNum(a.rx || 0, 'rect rx'),
      fill: a.fill, op }];
    if (el.tag === 'circle') {
      const cx = svgNum(a.cx, 'circle cx'), cy = svgNum(a.cy, 'circle cy'), r = svgNum(a.r, 'circle r');
      const sw = a.stroke === undefined ? 0 : svgNum(a['stroke-width'], 'circle stroke-width');
      const out = [];
      if (sw > 0) out.push({ kind: a.fill === 'none' ? 'ring' : 'disc', cx, cy,
        ro: r + sw / 2, ri: r - sw / 2, r: r + sw / 2, fill: a.stroke, op });
      if (a.fill !== 'none') out.push({ kind: 'disc', cx, cy, r: r - sw / 2, fill: a.fill, op });
      if (!out.length) throw new Error('SVG: circle בלי מילוי ובלי קו; מתקנים את המאסטר');
      return out;
    }
    return [{ kind: 'poly', rings: svgPath(a.d), fill: a.fill, op }];
  };
  const walk = (node, clip) => {
    for (const el of node.kids) {
      if (el.tag === 'defs') { walk(el, clip); continue; }
      if (el.tag === 'linearGradient') {
        const st = el.kids.filter((k) => k.tag === 'stop');
        if (st.length !== 2 || el.kids.length !== 2)
          throw new Error(`SVG: linearGradient #${el.attr.id} — נמדדו ${el.kids.length} עצירות והצפוי שתיים; מתקנים את המאסטר`);
        grads.set(el.attr.id, { p1: [svgNum(el.attr.x1, 'x1'), svgNum(el.attr.y1, 'y1')],
          p2: [svgNum(el.attr.x2, 'x2'), svgNum(el.attr.y2, 'y2')],
          start: svgColor(st[0].attr['stop-color'], 'stop-color'), end: svgColor(st[1].attr['stop-color'], 'stop-color') });
        continue;
      }
      if (el.tag === 'clipPath') { clips.set(el.attr.id, el.kids.flatMap(prim)); continue; }
      if (el.tag === 'g') {
        const id = svgRef(el.attr['clip-path'], '<g clip-path>');
        if (!clips.has(id)) throw new Error(`SVG: clip-path #${id} אינו מוגדר לפניו; מתקנים את המאסטר`);
        walk(el, clip.concat(clips.get(id)));
        continue;
      }
      if (el.tag === 'stop') throw new Error('SVG: <stop> מחוץ ל-linearGradient; מתקנים את המאסטר');
      for (const p of prim(el)) {
        if (p.fill === undefined) throw new Error(`SVG: <${el.tag}> בלי fill; מתקנים את המאסטר`);
        const grad = /^url\(/.test(p.fill) ? grads.get(svgRef(p.fill, 'fill')) : null;
        if (/^url\(/.test(p.fill) && !grad) throw new Error(`SVG: ${p.fill} אינו מוגדר לפניו; מתקנים את המאסטר`);
        let box = svgBox(p);
        for (const c of clip) box = boxAnd(box, svgBox(c));
        ops.push({ prim: p, clip, grad, rgb: grad ? null : svgColor(p.fill, `<${el.tag} fill>`), box });
      }
    }
  };
  walk(svg, []);
  // הרקע הוא המלבן שמכסה את ה-viewBox כולו — מאסטר בלי מלבן כזה, או עם שניים, מפיל.
  const bgAt = ops.findIndex((o) => o.prim.kind === 'rect' && !o.clip.length &&
    o.prim.x === 0 && o.prim.y === 0 && o.prim.w === vb[2] && o.prim.h === vb[3]);
  if (bgAt !== 0)
    throw new Error(`SVG: מלבן הרקע — נמדד במקום ${bgAt} והצפוי ראשון; מתקנים את המאסטר`);
  const mark = ops.slice(1);
  if (!mark.length) throw new Error('SVG: אין סמל מעל הרקע; מתקנים את המאסטר');
  let mb = [Infinity, Infinity, -Infinity, -Infinity];
  for (const o of mark) mb = [Math.min(mb[0], o.box[0]), Math.min(mb[1], o.box[1]),
    Math.max(mb[2], o.box[2]), Math.max(mb[3], o.box[3])];
  return { vw: vb[2], vh: vb[3], bg: ops[0], mark, mb };
}

let SVG = null;
function svgMaster() {
  if (SVG) return SVG;
  SVG = svgOps(svgParse(readFileSync(join(ROOT, APP.master), 'utf8')));
  return SVG;
}
// אותו צייר, דגימת-יתר והכפלה מוקדמת כמו בענף הרסטרי — מסלול ציור שני היה מייצר קצה אחר.
function svgDraw(c, ops, T) {
  const toCanvas = (b) => ({ x: T.tx + (b[0] - T.ox) * T.sx, y: T.ty + (b[1] - T.oy) * T.sy,
                             w: (b[2] - b[0]) * T.sx, h: (b[3] - b[1]) * T.sy });
  for (const o of ops) {
    const base = svgShape(o.prim, T);
    const cl = o.clip.map((p) => svgShape(p, T));
    const shape = cl.length ? (x, y) => { let d = base(x, y);
      for (const f of cl) { const e = f(x, y); if (e > d) d = e; } return d; } : base;
    // המדרג נמדד בתיבת הצורה ולא בתיבה החתוכה — זו משמעות objectBoundingBox ב-SVG.
    if (o.grad) paintGradient(c, shape, o.grad, o.prim.op, toCanvas(svgBox(o.prim)), toCanvas(o.box));
    else paint(c, shape, o.rgb, o.prim.op, toCanvas(o.box));
  }
}

// ── הצייר: אריח מלא ומסכת הסמל ──
// תיבת התוכן נגזרת מגיאומטריית המאסטר — מספר מוקלד כאן ינתק את הנכס מהמאסטר.
const markAspect = () => {
  if (APP.art === 'master') return { w: APP.mark.w, h: APP.mark.h };
  const m = svgMaster();
  return { w: m.mb[2] - m.mb[0], h: m.mb[3] - m.mb[1] };
};
function tile(size, frac) {
  // אותו דיו ואותה מסכה כמו בחזית — העתקת ה-RGB של המאסטר צובעת את האריח בגוון אחר מהחזית.
  if (APP.art === 'master') {
    const m = masterMask();
    const d = scaleMask(m.full, m.img.w, m.img.h, size, size);
    const px = Buffer.alloc(size * size * 4);
    for (let k = 0; k < size * size; k++) {
      const a = d[k];
      for (let ch = 0; ch < 3; ch++)
        px[k * 4 + ch] = Math.round(APP.bg.color[ch] * (1 - a) + APP.ink[ch] * a);
      px[k * 4 + 3] = 255;
    }
    return px;
  }
  const m = svgMaster();
  const c = canvasOf(size);
  const nat = { sx: size / m.vw, sy: size / m.vh, tx: 0, ty: 0, ox: 0, oy: 0 };
  svgDraw(c, [m.bg], nat);
  if (frac === null) { svgDraw(c, m.mark, nat); return flatten(c); }
  // השבר חל על הצלע הארוכה — סמל גבוה מרוחבו היה גולש מאזור הבטחה אילו חל על הרוחב.
  const ma = markAspect(), long = Math.max(ma.w, ma.h), lw = frac * size, s = lw / long;
  const dw = ma.w >= ma.h ? lw : lw * ma.w / ma.h;
  const dh = ma.w >= ma.h ? lw * ma.h / ma.w : lw;
  svgDraw(c, m.mark, { sx: s, sy: s, tx: (size - dw) / 2, ty: (size - dh) / 2, ox: m.mb[0], oy: m.mb[1] });
  return flatten(c);
}
// צלע התוכן של החזית שלמה ועל גבול פיקסל — כך אינה תלויה בסף האלפא שבו מודדים.
// שתי הצלעות מעוגלות לזוגי הקרוב — המסגרת זוגית, וצלע אי-זוגית נותנת שוליים 130/131.
const evenRound = (v) => 2 * Math.round(v / 2);
// שורת הקצה יורדת מתחת ל-ALPHA_MIN באנטי-אליאסינג — לכן מנסים מועמדים עד שהנמדד הוא היעד, בשני הממדים.
const CANDS = (n) => [n, n + 1, n + 2, n + 3, n - 1];
// מחזיר מסכת אלפא תמיד, וקנבס צבעוני כשהמאסטר SVG — במאסטר גיאומטרי הדיו אינו אחיד.
// שני הקנים נפרדים — כך מכיילים גובה בלי לגעת ברוחב.
function markRender(dw, dh) {
  if (APP.art === 'master') { const m = masterMask(); return { a: scaleMask(m.a, m.w, m.h, dw, dh), c: null }; }
  const m = svgMaster();
  const ma = markAspect(), c = canvasOf(dw, dh);
  svgDraw(c, m.mark, { sx: dw / ma.w, sy: dh / ma.h, tx: 0, ty: 0, ox: m.mb[0], oy: m.mb[1] });
  const a = new Float64Array(dw * dh);
  for (let k = 0; k < dw * dh; k++) a[k] = c.acc[k * 4 + 3];
  return { a, c };
}
// דיו הריפוד הוא הצבע הנפוץ בפיקסלים האטומים, ושוויון נשבר לפי הערך הנמוך — אחרת אותו סמל יוצא בשני צבעים.
function domInk(rgb, a, n) {
  const hist = new Map();
  for (let k = 0; k < n; k++) {
    if (a[k] < OPAQUE_MIN / 255) continue;
    const key = rgb[k * 4] * 65536 + rgb[k * 4 + 1] * 256 + rgb[k * 4 + 2];
    hist.set(key, (hist.get(key) || 0) + 1);
  }
  let best = -1, cnt = -1;
  for (const [k, v] of hist) if (v > cnt || (v === cnt && k < best)) { best = k; cnt = v; }
  if (best < 0) throw new Error('אין פיקסל אטום בסמל — נמדד אפס והצפוי לפחות אחד; מתקנים את המאסטר');
  return [best >> 16, (best >> 8) & 255, best & 255];
}
// הכיול על הצלע הארוכה ולא על הרוחב — סמל גבוה מרוחבו היה יוצא גדול מהיעד.
function foreground(canvas, target) {
  const ma = markAspect();
  const W = ma.w >= ma.h ? target : evenRound(target * ma.w / ma.h);
  const H = ma.w >= ma.h ? evenRound(target * ma.h / ma.w) : target;
  let a = null, cv = null, aw = 0, ah = 0, b = null;
  for (const dw of CANDS(W)) {
    for (const dh of CANDS(H)) {
      const r = markRender(dw, dh), bb = maskBox(r.a, dw, dh);
      if (bb && bb.x1 - bb.x0 + 1 === W && bb.y1 - bb.y0 + 1 === H) {
        a = r.a; cv = r.c; aw = dw; ah = dh; b = bb; break; }
    }
    if (a) break;
  }
  if (!a) throw new Error(`הסמל אינו מגיע לתיבת תוכן ${W}×${H}`);
  // המיקום מתיבת התוכן שנמדדה ולא מגודל המסכה — אחרת התוכן זז בחצי פיקסל והשוליים יוצאים 130/131.
  const bx = (canvas - W) / 2 - b.x0, by = (canvas - H) / 2 - b.y0;
  // ה-RGB הוא הדיו גם בפיקסל שקוף — RGB שחור בשקוף נמרח פנימה בכל הקטנה ומכהה את הקצה.
  const rgb = cv ? flatten(cv) : null;
  const pad = rgb ? domInk(rgb, a, aw * ah) : APP.ink;
  const px = Buffer.alloc(canvas * canvas * 4);
  for (let k = 0; k < canvas * canvas; k++) {
    px[k*4] = pad[0]; px[k*4+1] = pad[1]; px[k*4+2] = pad[2];
  }
  for (let y = 0; y < ah; y++)
    for (let x = 0; x < aw; x++) {
      const d = ((y + by) * canvas + (x + bx)) * 4, k = y * aw + x;
      if (rgb && a[k] > 0) { px[d] = rgb[k*4]; px[d+1] = rgb[k*4+1]; px[d+2] = rgb[k*4+2]; }
      px[d + 3] = Math.round(a[k] * 255);
    }
  return px;
}

// ── הפלט ──
const DENS = [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]];
// 48 מתוך 108 היא צלע התוכן של adaptive-icon — המערכת חותכת את השוליים, וסמל גדול מזה נחתך.
const FG_FRAC = 48 / 108;

mkdirSync(OUT, { recursive: true });
let wrote = 0;
const put = (p, buf) => { writeFileSync(p, buf); wrote++; };

// העותק בשם הקודם יורד — שני שמות לאותו בסיס הם שני נכסים בעיני כל סורק.
const web = {};
const putWeb = (base, buf) => {
  const name = iconName(base, buf);
  for (const f of readdirSync(OUT)) if ((ICON_RE.exec(f) || [])[1] === base && f !== name || f === base + '.png') rmSync(join(OUT, f));
  put(join(OUT, name), buf);
  web[base] = name;
};
for (const [base, size] of [['icon-192', 192], ['icon-512', 512],
                            ['apple-touch-icon', 180], ['favicon-32', 32],
                            ['favicon-16', 16]])
  putWeb(base, encodePng(size, size, tile(size, null)));
// ה-maskable הוא נכס נפרד ולא אותו קובץ עם purpose אחר — הסמל בו מוקטן לתוך אזור הבטחה.
putWeb('icon-maskable-512', encodePng(512, 512, tile(512, FG_FRAC)));
for (const f of ['index.html', 'sw.js']) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  const src = readFileSync(p, 'utf8');
  const out = src.replace(/icons\/([a-z0-9-]+?)(?:\.[0-9a-f]{8})?\.png/g, (m, b) => web[b] ? 'icons/' + web[b] : m);
  if (out !== src) writeFileSync(p, out);
}

for (const [d, scale] of DENS) {
  const dir = join(RES, 'mipmap-' + d);
  mkdirSync(dir, { recursive: true });
  const legacy = Math.round(48 * scale), fg = Math.round(108 * scale);
  put(join(dir, 'ic_launcher.png'), encodePng(legacy, legacy, tile(legacy, null)));
  const px = foreground(fg, legacy);
  const b = contentBox(px, fg);
  if (!b) throw new Error(`${d}: החזית ריקה`);
  const cw = b.x1 - b.x0 + 1, chh = b.y1 - b.y0 + 1;
  if (Math.max(cw, chh) !== legacy)
    throw new Error(`${d}: צלע התוכן הארוכה ${Math.max(cw, chh)} ≠ ${legacy}`);
  const L = b.x0, R = fg - 1 - b.x1, T = b.y0, B = fg - 1 - b.y1;
  if (L !== R || T !== B)
    throw new Error(`${d}: שוליים L=${L}/R=${R} · T=${T}/B=${B} בתוכן ${cw}×${chh} — ⛔ נדרש L=R ו-T=B`);
  put(join(dir, 'ic_launcher_foreground.png'), encodePng(fg, fg, px));
}
console.log(`gen-icons — ${wrote} קבצים נכתבו (${basename(ROOT)})`);
