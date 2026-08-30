#!/usr/bin/env node
/* סבב 71 — מחולל האייקונים: כל נכס האייקון של האפליקציה, מאפס.
 *
 * ⛔ **מה שנוצר כאן, וזה כל מה שנוצר:** ששת נכסי ה-PWA שב-`icons/`,
 * ועשרת נכסי המשגר שב-`android/.../mipmap-*`. ⛔ **והרצה חוזרת אינה משנה
 * אף קובץ** — ⚠️ זו כל התכלית: מחולל שאינו משחזר את מה שבעץ הוא הצהרה
 * שאיש לא אימת, ⛔ והרצתו דורסת נכסים בגרסה שהשער מפיל.
 *
 * ⚠️ **למה זה יכול להישבר:** שינוי בסמל, בדיו או ברקע שנעשה בקובץ נכס
 * ולא כאן. ⛔ אין לערוך נכס אייקון ביד — משנים את הבלוק `APP` ומריצים.
 *
 * ⛔ **שתי הבחירות שאין להפוך:** ההרכבה היא בהכפלה מוקדמת באלפא וה-RGB
 * מחולק בה בסוף (⚠️ אחרת פיקסל בעל אלפא חלקית נכתב מוכהה — PNG הוא
 * straight alpha), ⛔ וצלע התוכן של החזית היא **מספר שלם על גבול פיקסל**
 * (⚠️ אחרת היא נמדדת 192 בסף `ALPHA_MIN` ו-190 בסף שמעליו).
 *
 * הרצה:  node tools/gen-icons.mjs
 * ⛔ הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו.
 */
import { deflateSync, inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  name: 'schar-limud',
  /*  ⛔ המאסטר כאן הוא **ציור** ולא צורות (סבב 71) — ⚠️ כל ניסיון לתאר
      אותו בפרימיטיבים היה מייצר סמל אחר, ⛔ ולא את זה שעל המכשירים. */
  art: 'master',
  master: 'design/icon-master.png',
  bgKey: [252, 253, 252],
  keyTol: 40,
  ink: [47, 116, 52],
  bg: { kind: 'solid', color: [255, 255, 255] },
  tileRadius: 0,
  tileBox: { w: 1 },
  mark: { w: 684, h: 612, shapes: [] },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];
/* ── PNG: מקודד ומפענח, בלי ספריות ─────────────────────────────────────── */
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
/* ⛔ נכשל ברעש על כל פורמט שאינו נתמך (סבב 71) — מפענח ש«מדלג» מייצר
   נכס שאיש לא מדד. */
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
const SS = 8;                 /* דגימת-יתר לכל ציר */
const ALPHA_MIN = 25;         /* סף התוכן — זהה לסף שהשער מודד בו */

/* ── צורות: כיסוי הפיקסל, בדגימת-יתר ───────────────────────────────────── */
/* ⛔ הכיסוי מחושב בדגימת-יתר ⛔ ולא בנוסחה (סבב 71) — ⚠️ נוסחה נותנת קצה חד, ⛔ והקצה
   הוא בדיוק מה שהשער מודד: פיקסל שקוף למחצה קובע אם הצלע היא 48 או 49. */
const cover = (shape, x, y) => {
  let hit = 0;
  for (let sy = 0; sy < SS; sy++)
    for (let sx = 0; sx < SS; sx++) {
      const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
      if (shape(px, py)) hit++;
    }
  return hit / (SS * SS);
};
const roundRect = (x0, y0, w, h, r) => (px, py) => {
  const cx = x0 + w / 2, cy = y0 + h / 2;
  const qx = Math.abs(px - cx) - (w / 2 - r), qy = Math.abs(py - cy) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r <= 0;
};
const ring = (cx, cy, ro, ri) => (px, py) => {
  const d = Math.hypot(px - cx, py - cy); return d <= ro && d >= ri;
};
const disc = (cx, cy, r) => (px, py) => Math.hypot(px - cx, py - cy) <= r;

/* ⛔ ההרכבה היא **בהכפלה מוקדמת באלפא**, וה-RGB מחולק באלפא בסוף (סבב 71) —
   ⚠️ בלי החלוקה נכתב ל-PNG ערך מוכפל, כלומר פיקסל בעל אלפא חלקית יוצא כהה
   מהדיו; ⛔ PNG הוא straight alpha, ⛔ ולא premultiplied. */
function canvasOf(size) {
  return { size, acc: new Float64Array(size * size * 4) };
}
function paint(c, shape, rgb, alpha = 1) {
  for (let y = 0; y < c.size; y++)
    for (let x = 0; x < c.size; x++) {
      const a = cover(shape, x, y) * alpha;
      if (!a) continue;
      const i = (y * c.size + x) * 4;
      c.acc[i]     = c.acc[i]     * (1 - a) + rgb[0] * a;
      c.acc[i + 1] = c.acc[i + 1] * (1 - a) + rgb[1] * a;
      c.acc[i + 2] = c.acc[i + 2] * (1 - a) + rgb[2] * a;
      c.acc[i + 3] = c.acc[i + 3] * (1 - a) + a;
    }
}
/* ⛔ מדרג לינארי בין שתי נקודות בתיבת היחידה (סבב 71) — ⚠️ הצירים הם של המאסטר,
   ⛔ ולא זווית: זווית היא קירוב, והפער בין הקירוב למדרג הוא מה שהשער מודד. */
function paintGradient(c, shape, g) {
  const dx = g.p2[0] - g.p1[0], dy = g.p2[1] - g.p1[1], L2 = dx * dx + dy * dy;
  for (let y = 0; y < c.size; y++)
    for (let x = 0; x < c.size; x++) {
      const a = cover(shape, x, y);
      if (!a) continue;
      const u = (x + 0.5) / c.size, v = (y + 0.5) / c.size;
      const t = ((u - g.p1[0]) * dx + (v - g.p1[1]) * dy) / L2;
      const k = Math.max(0, Math.min(1, t));
      const i = (y * c.size + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const v = g.start[ch] + (g.end[ch] - g.start[ch]) * k;
        c.acc[i + ch] = c.acc[i + ch] * (1 - a) + v * a;
      }
      c.acc[i + 3] = c.acc[i + 3] * (1 - a) + a;
    }
}
function flatten(c) {
  const px = Buffer.alloc(c.size * c.size * 4);
  for (let k = 0; k < c.size * c.size; k++) {
    const i = k * 4, a = c.acc[i + 3];
    if (a > 0) { px[i] = Math.round(c.acc[i] / a); px[i+1] = Math.round(c.acc[i+1] / a);
                 px[i+2] = Math.round(c.acc[i+2] / a); }
    px[i + 3] = Math.round(a * 255);
  }
  return px;
}
const contentLong = (px, size) => {
  let x0 = size, y0 = size, x1 = -1, y1 = -1;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (px[(y * size + x) * 4 + 3] >= ALPHA_MIN) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  return x1 < 0 ? 0 : Math.max(x1 - x0 + 1, y1 - y0 + 1);
};

/* ── מאסטר רסטרי: מסכה מהמרחק לצבע הרקע, והקטנה בהכפלה מוקדמת ──────────── */
/* ⛔ המסכה נגזרת מהמרחק לצבע הרקע ⛔ ולא מסף בינארי (סבב 71) — ⚠️ סף בינארי מוחק
   האנטי-אליאסינג של המאסטר, ⛔ והקצה יוצא משונן בכל הקטנה. */
let MASTER = null;
function masterMask() {
  if (MASTER) return MASTER;
  const im = decodePng(readFileSync(join(ROOT, APP.master)));
  const [kr, kg, kb] = APP.bgKey, tol = APP.keyTol;
  const m = new Float64Array(im.w * im.h);
  for (let k = 0; k < im.w * im.h; k++) {
    const d = Math.max(Math.abs(im.data[k*4] - kr), Math.abs(im.data[k*4+1] - kg), Math.abs(im.data[k*4+2] - kb));
    m[k] = Math.max(0, Math.min(1, d / tol));
  }
  let x0 = im.w, y0 = im.h, x1 = -1, y1 = -1;
  for (let y = 0; y < im.h; y++)
    for (let x = 0; x < im.w; x++)
      if (m[y * im.w + x] >= ALPHA_MIN / 255) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, cut = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cut[y * w + x] = m[(y + y0) * im.w + (x + x0)];
  MASTER = { w, h, a: cut, img: im };
  return MASTER;
}
/* ⛔ הקטנה בממוצע-שטח על **מסכת האלפא בלבד** (סבב 71) — ⚠️ הדיו אחיד, ולכן זו
   הכפלה מוקדמת: אין RGB של פיקסל שקוף שיימרח פנימה. */
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

/* ── הצייר: אריח מלא, ומסכת הסמל ───────────────────────────────────────── */
/* ⛔ הסמל מוגדר בתיבת תוכן מנורמלת (סבב 71) — ⚠️ 0..1 על הצלע הארוכה, ולכן אותה
   הצהרה משרתת אריח 16 ו-mipmap 432, ⛔ בלי מספר קסם לכל גודל. */
function markShapes(box) {          /* box = {x, y, w, h} בפיקסלים */
  const s = box.w / APP.mark.w;
  return APP.mark.shapes.map((sh) => {
    if (sh.kind === 'rect') return { alpha: sh.alpha,
      shape: roundRect(box.x + sh.x * s, box.y + sh.y * s, sh.w * s, sh.h * s, sh.r * s) };
    if (sh.kind === 'ring') return { alpha: sh.alpha,
      shape: ring(box.x + sh.cx * s, box.y + sh.cy * s, sh.ro * s, sh.ri * s) };
    return { alpha: sh.alpha, shape: disc(box.x + sh.cx * s, box.y + sh.cy * s, sh.r * s) };
  });
}
function paintBg(c, shape) {
  if (APP.bg.kind === 'gradient') paintGradient(c, shape, APP.bg);
  else paint(c, shape, APP.bg.color, 1);
}
/* ⛔ אריח = רקע מלא + הסמל, ⛔ או המאסטר הרסטרי שהוקטן (סבב 71) — ⚠️ באפליקציות
   שהמאסטר שלהן הוא ציור, כל תיאור בצורות היה ציור **אחר**. */
function tile(size, box) {
  if (APP.art === 'master') {
    const im = masterMask().img;
    const px = Buffer.alloc(size * size * 4);
    for (let ch = 0; ch < 3; ch++) {
      const src = new Float64Array(im.w * im.h);
      for (let k = 0; k < im.w * im.h; k++) src[k] = im.data[k * 4 + ch];
      const d = scaleMask(src, im.w, im.h, size, size);
      for (let k = 0; k < size * size; k++) px[k * 4 + ch] = Math.round(d[k]);
    }
    for (let k = 0; k < size * size; k++) px[k * 4 + 3] = 255;
    return px;
  }
  const c = canvasOf(size);
  const r = APP.tileRadius * size;
  paintBg(c, roundRect(0, 0, size, size, r));
  const w = box.w * size, h = w * APP.mark.h / APP.mark.w;
  const x = box.x === undefined ? (size - w) / 2 : box.x * size;
  const y = box.y === undefined ? (size - h) / 2 : box.y * size;
  for (const m of markShapes({ x, y, w, h })) paint(c, m.shape, APP.ink, m.alpha);
  return flatten(c);
}
/* ⛔ חזית ה-adaptive: הסמל בלבד, ⛔ וצלע התוכן היא **בדיוק** היעד (סבב 71) —
   ⚠️ הסמל ממוקם על גבול פיקסל ובגודל שלם, ולכן הפיקסל החיצוני מכוסה
   והשכן שמעבר לו ריק: ⛔ הצלע אינה תלויה בסף האלפא שבו מודדים. */
function foreground(canvas, target) {
  const w = target, h = Math.round(target * APP.mark.h / APP.mark.w);
  const x0 = Math.round((canvas - w) / 2), y0 = Math.round((canvas - h) / 2);
  if (APP.art === 'master') {
    /*  ⛔ הרוחב מכויל למדידה ⛔ ולא מחושב (סבב 71) — ⚠️ קצה הציור שבמאסטר
        הוא אנטי-אליאסינג, ולכן הקטנה ל-`target` בדיוק מחזירה לפעמים
        `target-1`: העמודה החיצונית יורדת מתחת לסף. ⛔ «כמעט» כאן הוא ❌. */
    const m = masterMask();
    let a = null, aw = 0, ah = 0;
    for (const cand of [w, w + 1, w + 2, w + 3, w - 1]) {
      const ch = Math.round(cand * APP.mark.h / APP.mark.w);
      const t = scaleMask(m.a, m.w, m.h, cand, ch);
      let x0b = cand, y0b = ch, x1b = -1, y1b = -1;
      for (let y = 0; y < ch; y++)
        for (let x = 0; x < cand; x++)
          if (t[y * cand + x] >= ALPHA_MIN / 255) {
            if (x < x0b) x0b = x; if (x > x1b) x1b = x;
            if (y < y0b) y0b = y; if (y > y1b) y1b = y;
          }
      if (x1b >= 0 && Math.max(x1b - x0b + 1, y1b - y0b + 1) === target) {
        a = t; aw = cand; ah = ch; break;
      }
    }
    if (!a) throw new Error(`מסכת המאסטר אינה מגיעה לצלע ${target}`);
    const bx = Math.round((canvas - aw) / 2), by = Math.round((canvas - ah) / 2);
    const px = Buffer.alloc(canvas * canvas * 4);
    for (let k = 0; k < canvas * canvas; k++) {
      px[k*4] = APP.ink[0]; px[k*4+1] = APP.ink[1]; px[k*4+2] = APP.ink[2];
    }
    for (let y = 0; y < ah; y++)
      for (let x = 0; x < aw; x++)
        px[((y + by) * canvas + (x + bx)) * 4 + 3] = Math.round(a[y * aw + x] * 255);
    return px;
  }
  const c = canvasOf(canvas);
  for (const m of markShapes({ x: x0, y: y0, w, h })) paint(c, m.shape, APP.ink, m.alpha);
  const px = flatten(c);
  /*  ⛔ ה-RGB הוא הדיו בכל פיקסל, גם בשקוף (סבב 71) — ⚠️ פיקסל שקוף שה-RGB
      שלו שחור נמרח פנימה בכל הקטנה עתידית, ⛔ ומכהה את הקצה. */
  for (let k = 0; k < canvas * canvas; k++)
    if (px[k*4+3] === 0) { px[k*4] = APP.ink[0]; px[k*4+1] = APP.ink[1]; px[k*4+2] = APP.ink[2]; }
  return px;
}

/* ── הפלט ──────────────────────────────────────────────────────────────── */
const DENS = [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]];
/*  ⛔ 48 מתוך 108 היא צלע התוכן של adaptive-icon (סבב 71) — ⚠️ המערכת חותכת
    את השוליים, ⛔ וסמל שגדול מזה נחתך בתוך הלוגו. */
const FG_FRAC = 48 / 108;

mkdirSync(OUT, { recursive: true });
let wrote = 0;
const put = (p, buf) => { writeFileSync(p, buf); wrote++; };

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512],
                            ['apple-touch-icon.png', 180], ['favicon-32.png', 32],
                            ['favicon-16.png', 16]])
  put(join(OUT, name), encodePng(size, size, tile(size, APP.tileBox)));
/*  ⛔ ה-maskable נבדל באחד בלבד (סבב 71) — הסמל בתוך אזור הבטחה, ⚠️ ולכן הוא נכס
    נפרד ולא אותו קובץ עם `purpose` אחר. */
put(join(OUT, 'icon-maskable-512.png'), encodePng(512, 512, tile(512, { w: FG_FRAC })));

for (const [d, scale] of DENS) {
  const dir = join(RES, 'mipmap-' + d);
  mkdirSync(dir, { recursive: true });
  const legacy = Math.round(48 * scale), fg = Math.round(108 * scale);
  put(join(dir, 'ic_launcher.png'), encodePng(legacy, legacy, tile(legacy, APP.tileBox)));
  const px = foreground(fg, legacy);
  const got = contentLong(px, fg);
  if (got !== legacy) throw new Error(`${d}: צלע התוכן ${got} ≠ ${legacy}`);
  put(join(dir, 'ic_launcher_foreground.png'), encodePng(fg, fg, px));
}
console.log(`gen-icons — ${wrote} קבצים נכתבו (${APP.name})`);
