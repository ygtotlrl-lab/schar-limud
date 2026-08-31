#!/usr/bin/env node
/* סבב 66 — שכבת האייקונים של המעטפת (כלל ברזל 25).
 *
 * ⛔ **מה שנאכף כאן, וזה כל מה שנאכף:** עשרת קובצי ה-mipmap קיימים
 * ובממדים הנכונים · התוכן שבתוכם באותו גודל נתפס בכל האפליקציות ·
 * **ובמרכז המסגרת**, בסטיית `CENTER_TOL` פיקסלים ·
 * ו-`ic_launcher_background` **משחזר את שוליי `ic_launcher`**.
 *
 * ⛔ **וצבע הדיו נמדד בשני המסלולים (סבב 72)** — ⚠️ האריח והחזית: נמדד
 * שהאריח צויר ב-[40,58,118] בזמן שהחזית צוירה ב-[24,51,93] ובבלוק `APP`
 * הוצהר השלישי, ⛔ ואיש לא ראה זאת מפני שהשער מדד מסלול אחד בלבד.
 *
 * ⛔ **המרכוז נמדד בתיבת התוכן ⛔ ולא במרכז המסה (סבב 72)** — ⚠️ נמדד:
 * מרכז המסה של הסמל סוטה 27 פיקסלים אנכית בשתיים מהאפליקציות ו-17
 * אופקית בשלישית, מפני שהציור עצמו כבד למטה או לצד. ⛔ תקן שהיה מודד
 * מסה היה דורש **לצייר מחדש** שלושה לוגואים, ⚠️ והוא נופל על העץ הקיים
 * ברגע שהוא נכתב.
 *
 * ⛔ **שער שבודק קיום בלבד אינו מספיק (סבב 66) — הוא היה נותן ✅ גם
 * לאייקון שתופס 32% מהמסגרת בזמן שהאחיות תופסות 44%**, כלומר בדיוק
 * לאי-האחידות שהסבב הזה בא לסגור. לכן כל טענה כאן מודדת **ערך**:
 * פיקסלים, לא שמות קבצים.
 *
 * ⛔ **התוכן נמדד בסף אלפא `ALPHA_MIN` ולא בתיבת השקיפות (סבב 66)** — הילה רכה
 * סביב הלוגו נספרת בתיבת השקיפות ומנפחת את המספר: נמדד כאן 45.6%–49.1%
 * בתיבת השקיפות מול 44.4% בפועל, כלומר שער שהיה מודד כך היה עובר על
 * לוגו שגדל בחמישה אחוזים.
 *
 * ⛔ **ולרקע שתי טענות ולא אחת (סבב 66)** — ממוצע **וגם** שחזור
 * פיקסל-פיקסל. ⚠️ ממוצע לבדו הוא בדיוק מה שמאפשר להחליף מדרג בצבע אחיד
 * בשקט: הצבע האחיד הטוב ביותר ליומן שווה לממוצע המדרג בהגדרה, ולכן היה
 * עובר טענת-ממוצע במלואה בזמן שהוא מחטיא ב-36 יחידות בפינות.
 *
 * ⚠️ **ומה שהשער הזה אינו מודד:** הוא קורא **קבצים**, ⛔ ואינו רואה
 * מכשיר. הוא מאמת שהרקע שהוכרז ב-XML משחזר את השוליים שבתמונה — ⛔ ולא
 * שהלאנצ'ר מרנדר אותם זה לצד זה בלי תפר; חיתוך בפועל הוא בדיקת עין.
 *
 * ⛔ המוטציות רצות על עותק בתיקייה זמנית ואינן נכתבות לעץ (הלקח של
 * סבב 42ג). ⛔ הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו.
 */
import { readFileSync, existsSync, mkdtempSync, mkdirSync, cpSync, writeFileSync,
         rmSync, statSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { inflateSync, deflateSync } from 'node:zlib';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  name: 'schar-limud',
  /* ⚠️ קובץ mipmap כבד מ-`MAX_KB` מפיל (טענה ד). ⛔ הרשימה ריקה בארבעתן
     ומוצהרת ככזו ולא מושמטת (כלל ברזל 24) — הכבד ביותר שנמדד הוא 30.6KB,
     ולכן חריגה כאן פירושה נכס שנכנס בטעות ולא צורך אמיתי. */
  heavyMipmapAllow: {},
  /* ⛔ דיו ה-foreground — הצהרה ולא גזירה (סבב 68, כלל ברזל 25):
     ⚠️ ממוצע שנגזר מהתמונה עצמה היה מאשר כל סטייה בדיעבד. */
  fgInk: [60, 125, 65],
  tileFlat: true,
  /* ⛔ הסף המשותף הוא 8, ⚠️ והערך כאן הוא ההיתר **המוצהר** של
     האפליקציה הזו (כלל ברזל 24) — ⚠️ נמדד 0 — ⛔ בתוך הסף המשותף, ולכן אין כאן היתר. */
  fgDriftMax: 8,
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [74, 76, 78];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = 'android/app/src/main/res';
const DENS = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

/* ⚠️ ממדי המסגרת. ⛔ ה-foreground הוא פי 2.25 מה-`ic_launcher` — זה תקן
   ה-adaptive-icon, והמערכת חותכת ממנו את השוליים; מסגרת בגודל
   ה-`ic_launcher` הייתה נחתכת לתוך הלוגו עצמו. */
const FRAME = { ic_launcher: [48, 72, 96, 144, 192],
                ic_launcher_foreground: [108, 162, 216, 324, 432] };
/* ⚠️ גודל התוכן — זהה לשני הנכסים, וזו הנקודה: הלוגו נתפס באותו גודל
   בין אם הוא מוגש כאייקון מלא ובין אם כשכבת adaptive. */
const CONTENT = [48, 72, 96, 144, 192];
/* ⛔ סובלנות אפס בארבע הרזולוציות הראשונות, ו-1 ב-xxxhdpi (סבב 71) — ⚠️ הגזירה
   מגיעה ל-48/72/96/144/192 בדיוק בארבעתן, ⛔ ולכן סטייה כאן היא נכס שנדחף בלי
   גזירה מחדש. ⚠️ והיחידה ב-xxxhdpi היא מה שצורה עגולה מחזירה בסף אלפא 25
   כשהמסגרת היא 432. */
const CONTENT_TOL = [0, 0, 0, 0, 1];
const ALPHA_MIN = 25;    /* ⛔ סף התוכן — ר' הבאנר. */
const OPAQUE = 250;      /* ⚠️ פיקסל שוליים שקוף למחצה הוא פינה מעוגלת ואינו נמדד. */
const RING = 4;          /* רוחב טבעת השוליים הנמדדת. */
const MEAN_TOL = 4;      /* טענה ג(1) — הפרש בין הממוצעים, לערוץ. */
const PIXEL_TOL = 8;     /* טענה ג(2). */
const MAX_KB = 40;       /* טענה ד. */

let pass = 0, fail = 0;
const t = (n, cond, m) => { if (cond) { pass++; console.log(`  ok   ${n} · ${m}`); }
                            else { fail++; console.log(`  FAIL ${n} · ${m}`); } };

/* ── מפענח PNG — depth 8, ללא שזירה ────────────────────────────────────── */
/* ⛔ נכשל ברעש על כל פורמט שאינו נתמך (סבב 66) — מפענח ש«מדלג» על קובץ
   שאינו מבין הוא שער שנותן ✅ לנכס שאיש לא מדד. */
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('אינו PNG');
  let p = 8, idat = [], ihdr = null, plte = null, trns = null;
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
  if (!ihdr) throw new Error('אין IHDR');
  if (ihdr.depth !== 8) throw new Error(`עומק ${ihdr.depth} אינו נתמך`);
  if (ihdr.interlace !== 0) throw new Error('PNG שזור אינו נתמך');
  const CH = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.ctype];
  if (!CH) throw new Error(`colortype ${ihdr.ctype} אינו נתמך`);
  if (ihdr.ctype === 3 && !plte) throw new Error('colortype 3 בלי PLTE');
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
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      } else if (ft !== 0) throw new Error(`מסנן ${ft} אינו מוכר`);
      line[i] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const s = x * CH, d = (y * w + x) * 4;
      if (ihdr.ctype === 6) { out[d] = line[s]; out[d + 1] = line[s + 1]; out[d + 2] = line[s + 2]; out[d + 3] = line[s + 3]; }
      else if (ihdr.ctype === 2) { out[d] = line[s]; out[d + 1] = line[s + 1]; out[d + 2] = line[s + 2]; out[d + 3] = 255; }
      else if (ihdr.ctype === 0) { out[d] = out[d + 1] = out[d + 2] = line[s]; out[d + 3] = 255; }
      else if (ihdr.ctype === 4) { out[d] = out[d + 1] = out[d + 2] = line[s]; out[d + 3] = line[s + 1]; }
      else { const i3 = line[s] * 3;
             out[d] = plte[i3]; out[d + 1] = plte[i3 + 1]; out[d + 2] = plte[i3 + 2];
             out[d + 3] = trns && line[s] < trns.length ? trns[line[s]] : 255; }
    }
    line.copy(prev);
  }
  return { w, h, data: out };
}

/* ── מדידת התוכן — תיבת הפיקסלים שאלפא שלהם ≥ ALPHA_MIN ────────────────── */
function contentBox(img) {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++)
      if (img.data[(y * img.w + x) * 4 + 3] >= ALPHA_MIN) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/* ── קריאת הרקע המוכרז מ-XML ───────────────────────────────────────────── */
/* ⚠️ מחזיר `{kind:'solid'|'gradient'}`. ⛔ צורה שאינה אחת מהשתיים מוחזרת
   כ-`null` והטענה נופלת — ⛔ «לא הצלחתי לפרסר» אינו «תקין». */
function readBackground(root) {
  const p = join(root, RES, 'drawable/ic_launcher_background.xml');
  if (!existsSync(p)) return null;
  const s = readFileSync(p, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const g = /<gradient\b[\s\S]*?\/>/.exec(s);
  if (g) {
    const a = /android:angle="(-?\d+)"/.exec(g[0]);
    const st = /android:startColor="(#[0-9A-Fa-f]{6})"/.exec(g[0]);
    const en = /android:endColor="(#[0-9A-Fa-f]{6})"/.exec(g[0]);
    if (!a || !st || !en) return null;
    if (/android:centerColor=/.test(g[0])) return null;   /* ⛔ שלוש עצירות — לא נתמך, ולכן נכשל ולא עובר. */
    return { kind: 'gradient', angle: ((Number(a[1]) % 360) + 360) % 360,
             start: hex(st[1]), end: hex(en[1]) };
  }
  const sol = /<solid\s+android:color="(#[0-9A-Fa-f]{6})"\s*\/>/.exec(s);
  return sol ? { kind: 'solid', color: hex(sol[1]) } : null;
}

/* ⚠️ הצבע החזוי בנקודה. ⛔ אין להחליף את המודל במדרג «מלמעלה למטה»
   (סבב 66) — Android מרנדר `angle` שהוא כפולה של 45 כמדרג מפינה לפינה,
   הזווית נמדדת נגד כיוון השעון ממזרח, ולכן 315° הוא שמאל-עליון ←
   ימין-תחתון, ומודל אחר היה מייצר שגיאה בפינות דווקא. */
function predict(bg, x, y, W, H) {
  if (bg.kind === 'solid') return bg.color;
  const rad = bg.angle * Math.PI / 180, dx = Math.cos(rad), dy = -Math.sin(rad);
  const L = Math.abs(W * dx) + Math.abs(H * dy);
  const t = ((x - (W - 1) / 2) * dx + (y - (H - 1) / 2) * dy) / L + 0.5;
  const c = Math.max(0, Math.min(1, t));
  return bg.start.map((s, i) => Math.round(s + (bg.end[i] - s) * c));
}

/* ── הביקורת — פונקציה אחת שרצה על שורש כלשהו ──────────────────────────── */
/* ⭐ המוטציות מריצות אותה על עותק בתיקייה זמנית. ⛔ אין לשכפל את
   הלוגיקה למסלול מוטציה נפרד (סבב 66) — שני מימושים נפרדים היו נסחפים
   זה מזה, ואז המוטציה מוכיחה על מה שהעץ נבדק בו כלום. */
/*  ⛔ סף הדיו — ההצהרה חייבת לתאר את מה שיש (סבב 68). ⚠️ 4 ולא 0:
    הקטנה תקינה עדיין מזיזה ממוצע בפיקסל-שניים. */
const INK_TOL = 4;
/*  ⛔ סובלנות המרכוז היא **פיקסל אחד** (סבב 72) — ⚠️ אפס אינו בר-השגה:
    תוכן בעל צלע זוגית במסגרת אי-זוגית (ולהפך) נופל חצי פיקסל מהמרכז
    בהגדרה, ⛔ ושתי מהאפליקציות נושאות צלע כזו. */
const CENTER_TOL = 1;

function audit(root) {
  const v = [];
  for (const [asset, sizes] of Object.entries(FRAME))
    for (let i = 0; i < DENS.length; i++) {
      const rel = `${RES}/mipmap-${DENS[i]}/${asset}.png`, p = join(root, rel);
      if (!existsSync(p)) { v.push({ kind: 'missing', rel }); continue; }
      const kb = statSync(p).size / 1024;
      if (kb > MAX_KB && !APP.heavyMipmapAllow[rel])
        v.push({ kind: 'heavy', rel, msg: `${kb.toFixed(1)}KB > ${MAX_KB}KB` });
      let img;
      try { img = decodePNG(readFileSync(p)); }
      catch (e) { v.push({ kind: 'decode', rel, msg: e.message }); continue; }
      if (img.w !== sizes[i] || img.h !== sizes[i])
        v.push({ kind: 'frame', rel, msg: `${img.w}x${img.h} ≠ ${sizes[i]}x${sizes[i]}` });
      const box = contentBox(img);
      if (!box) { v.push({ kind: 'content', rel, msg: 'ריק' }); continue; }
      const long = Math.max(box.w, box.h), want = CONTENT[i];
      if (Math.abs(long - want) > CONTENT_TOL[i])
        v.push({ kind: 'content', rel, msg: `צלע ארוכה ${long} ≠ ${want}±${CONTENT_TOL[i]}` });
      const cdx = box.x + (box.w - 1) / 2 - (img.w - 1) / 2;
      const cdy = box.y + (box.h - 1) / 2 - (img.h - 1) / 2;
      if (Math.abs(cdx) > CENTER_TOL || Math.abs(cdy) > CENTER_TOL)
        v.push({ kind: 'center', rel, msg: `סטיית מרכז (${cdx},${cdy}) > ${CENTER_TOL}` });
    }

  /*  ⛔ רקע האריח שווה למוצהר **בדיוק** (סבב 72) — ⚠️ הסובלנות כאן היא אפס
      ולא `PIXEL_TOL`: רעש הנייר שבמאסטר נכנס כאלפא זעירה וצבע את הרקע
      בחמש רמות, ⛔ מתחת לסף הרקע ומעליו לא נראה כלל. ⭐ מה שנמדד הוא
      פינת האריח — ⛔ שם אין תוכן, ולכן כל סטייה היא רעש. */
  const declaredBg = readBackground(root);
  if (APP.tileFlat === true && declaredBg && declaredBg.kind === 'solid') {
    const rel = `${RES}/mipmap-xxxhdpi/ic_launcher.png`;
    const p = join(root, rel);
    if (existsSync(p)) {
      let im = null;
      try { im = decodePNG(readFileSync(p)); } catch (e) { im = null; }
      if (im) {
        /*  ⚠️ טבעת ולא פינה (סבב 72) — ⛔ הרעש אינו אחיד: הפינה עצמה יצאה
            מדויקת בזמן שהטבעת סטתה, ⭐ ופינה לבדה הייתה מאשרת אותו. */
        let worst = null;
        for (let y = 0; y < im.h; y++)
          for (let x = 0; x < im.w; x++) {
            if (x > 2 && x < im.w - 3 && y > 2 && y < im.h - 3) continue;
            const got = [0, 1, 2].map((c) => im.data[(y * im.w + x) * 4 + c]);
            const d = Math.max(...got.map((val, c) => Math.abs(val - declaredBg.color[c])));
            if (d > 0 && (!worst || d > worst.d)) worst = { d, x, y, got };
          }
        if (worst)
          v.push({ kind: 'tile-bg', rel,
                   msg: `(${worst.x},${worst.y}) [${worst.got}] מול המוצהר [${declaredBg.color}] — ${worst.d} ≠ 0` });
      }
    }
  }

  /*  ⛔ אותו דיו גם באריח (סבב 72) — ⚠️ שני המסלולים מציירים את אותו סמל,
      ⭐ ולכן הצבע שנמדד בהם חייב להיות אחד, ⛔ ושניהם מול ה**מוצהר**.
      ⚠️ `tileFlat` הוא מחרוזת באפליקציה שהאריח שלה אינו נייר-ודיו אלא רקע
      וסמל: ⛔ שם אין «צבע דיו» למדוד, והמדידה מנוטרלת בנימוק כתוב. */
  if (APP.tileFlat === true && APP.fgInk) {
    const rel = `${RES}/mipmap-xxxhdpi/ic_launcher.png`;
    const p = join(root, rel);
    if (existsSync(p)) {
      let im = null;
      try { im = decodePNG(readFileSync(p)); } catch (e) { im = null; }
      if (im) {
        const hist = new Map();
        const lim = (APP.fgInk.reduce((a, b) => a + b, 0) / 3 + 255) / 2;
        for (let k = 0; k < im.w * im.h; k++) {
          const [r, g, b] = [im.data[k*4], im.data[k*4+1], im.data[k*4+2]];
          if ((r + g + b) / 3 >= lim) continue;
          const key = `${r},${g},${b}`;
          hist.set(key, (hist.get(key) || 0) + 1);
        }
        const top = [...hist.entries()].sort((a, b) => b[1] - a[1])[0];
        if (!top) v.push({ kind: 'tile-ink', rel, msg: 'אין פיקסלי דיו למדוד באריח' });
        else {
          const got = top[0].split(',').map(Number);
          const d = Math.max(...got.map((x, c) => Math.abs(x - APP.fgInk[c])));
          if (d > INK_TOL)
            v.push({ kind: 'tile-ink', rel, msg: `דיו האריח [${got}] מול המוצהר [${APP.fgInk}] — ${d} > ${INK_TOL}` });
        }
      }
    }
  }

  /* ⛔ קובץ **עודף** מפיל גם כששמו תמים (סבב 66) — נכס שנדחף בטעות
     לתיקיית mipmap נארז ל-APK, ואיש אינו רואה אותו עד שמסתכלים בגודל. */
  const want = new Map([['mipmap-anydpi-v26', ['ic_launcher.xml']]]);
  for (const d of DENS) want.set(`mipmap-${d}`, Object.keys(FRAME).map(a => `${a}.png`));
  for (const [dir, files] of want) {
    const dp = join(root, RES, dir);
    if (!existsSync(dp)) { v.push({ kind: 'missing', rel: `${RES}/${dir}` }); continue; }
    for (const f of readdirSync(dp))
      if (!files.includes(f)) v.push({ kind: 'extra', rel: `${RES}/${dir}/${f}` });
  }

  /*  ⛔ הכפלה מוקדמת באלפא (סבב 68, כלל ברזל 25) — ⚠️ הקטנה **בלי**
      premultiplied alpha ממזגת את ה-RGB של הפיקסלים השקופים (שחור) לתוך
      השכנים, ולכן פיקסל בעל אלפא **חלקית** יוצא כהה מהדיו. ⛔ נמדד ביומן:
      הפסים יצאו (102,102,96) במקום (246,242,233), ⚠️ ופס שלם מתוך ארבעה
      נעלם. ⛔ המדידה היא על ה-foreground של xxxhdpi — הגדול, שממנו נגזרים
      השאר — והיא מול הדיו **המוצהר** ב-APP ולא מול ממוצע שנגזר מהתמונה
      עצמה, שהיה מאשר כל סטייה בדיעבד. */
  {
    const rel = `${RES}/mipmap-xxxhdpi/ic_launcher_foreground.png`;
    const p = join(root, rel);
    if (existsSync(p) && APP.fgInk) {
      let im = null;
      try { im = decodePNG(readFileSync(p)); } catch (e) { im = null; }
      if (im) {   /* ⚠️ `decodePNG` מחזיר תמיד RGBA — ⛔ אין כאן ערוץ לבדוק */
        let op = 0, pa = 0; const so = [0, 0, 0], sp = [0, 0, 0];
        for (let k = 0; k < im.w * im.h; k++) {
          const a = im.data[k * 4 + 3];
          if (a >= 250) { op++; for (let c = 0; c < 3; c++) so[c] += im.data[k * 4 + c]; }
          else if (a >= ALPHA_MIN) { pa++; for (let c = 0; c < 3; c++) sp[c] += im.data[k * 4 + c]; }
        }
        if (!op || !pa) {
          v.push({ kind: 'fg-alpha', rel, msg: `אין די פיקסלים למדוד (אטומים ${op}, חלקיים ${pa})` });
        } else {
          /*  ⚠️ שתי טענות ולא אחת: הדיו המוצהר חייב לתאר את הפיקסלים
              האטומים (אחרת ההצהרה עצמה נסחפה), ⛔ והפיקסלים החלקיים חייבים
              להיות קרובים אליו — זו ההכפלה המוקדמת. */
          const mo = so.map(x => Math.round(x / op)), mp = sp.map(x => Math.round(x / pa));
          const dInk = Math.max(...mo.map((x, c) => Math.abs(x - APP.fgInk[c])));
          if (dInk > INK_TOL)
            v.push({ kind: 'fg-ink', rel, msg: `הדיו המוצהר [${APP.fgInk}] מול הנמדד [${mo}] — ${dInk} > ${INK_TOL}` });
          const dPre = Math.max(...mp.map((x, c) => Math.abs(x - APP.fgInk[c])));
          if (dPre > APP.fgDriftMax)
            v.push({ kind: 'fg-alpha', rel, msg: `אזור אלפא חלקית [${mp}] מול הדיו [${APP.fgInk}] — ${dPre} > ${APP.fgDriftMax}` });
        }
      }
    }
  }

  const bg = readBackground(root);
  if (!bg) { v.push({ kind: 'bg-parse', rel: 'ic_launcher_background.xml' }); return v; }
  const lp = join(root, `${RES}/mipmap-xxxhdpi/ic_launcher.png`);
  if (!existsSync(lp)) return v;
  let img;
  try { img = decodePNG(readFileSync(lp)); } catch { return v; }
  /* ⭐ שני צוברים נפרדים, ⛔ ובכוונה (סבב 66): ג(1) משווה **ממוצע מול
     ממוצע** — לא ממוצע של הפרשים. ⚠️ ההבחנה היא כל ההצדקה של ג(2):
     ממוצע-של-הפרשים היה תופס בעצמו את החלפת המדרג בצבע אחיד, וג(2)
     הייתה הופכת לקישוט שאיש לא ראה נכשל. */
  let n = 0, sumPred = [0, 0, 0], sumReal = [0, 0, 0], worst = 0;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      if (!(x < RING || y < RING || x >= img.w - RING || y >= img.h - RING)) continue;
      const d = (y * img.w + x) * 4;
      if (img.data[d + 3] < OPAQUE) continue;   /* ⚠️ פינה מעוגלת — אינה שוליים. */
      const pr = predict(bg, x, y, img.w, img.h);
      for (let c = 0; c < 3; c++) {
        sumPred[c] += pr[c]; sumReal[c] += img.data[d + c];
        const diff = Math.abs(pr[c] - img.data[d + c]);
        if (diff > worst) worst = diff;
      }
      n++;
    }
  /* ⛔ מעט מדי פיקסלים אטומים ⇒ כישלון ולא «אין מה למדוד» (סבב 66) —
     היעדר ראיה אינו ראיה, וזה בדיוק המקום שבו שער נהיה דקורטיבי. */
  if (n < 200) { v.push({ kind: 'bg-sample', msg: `${n} פיקסלי שוליים אטומים` }); return v; }
  const meanGap = Math.max(...[0, 1, 2].map(c => Math.abs(sumPred[c] - sumReal[c]) / n));
  if (meanGap > MEAN_TOL) v.push({ kind: 'bg-mean', msg: `הפרש ממוצעים ${meanGap.toFixed(2)} > ${MEAN_TOL} לערוץ` });
  if (worst > PIXEL_TOL) v.push({ kind: 'bg-pixel', msg: `סטייה מרבית ${worst} > ${PIXEL_TOL}` });
  return v;
}

/* ⭐ `audit` מיוצא, ⛔ ואין לשכפל אותו ל-probe נפרד (סבב 66) —
   `check-capabilities` מייבא אותה כדי לאמת את שורת שכבת האייקונים שבמטריצה, ומימוש
   שני היה נסחף ומדווח ✅ על מה שהשער כאן מפיל. ⚠️ הריצה העצמית מוגנת,
   אחרת ייבוא היה מריץ את המוטציות. */
export { audit };
const SELF = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (SELF) {

console.log(`\n── סבב 66 — שכבת האייקונים (${APP.name}) ──────────────────────────────`);
const base = audit(ROOT);
let n = 1;

/* ── א–ד: העץ כמות שהוא ────────────────────────────────────────────────── */
const of = k => base.filter(x => x.kind === k).map(x => `${x.rel || ''} ${x.msg || ''}`).join(' · ');
t(n++, !base.some(x => x.kind === 'missing'), `א. עשרת קובצי ה-mipmap קיימים ${of('missing')}`);
t(n++, !base.some(x => x.kind === 'decode'), `א. כל העשרה נקראים ${of('decode')}`);
t(n++, !base.some(x => x.kind === 'frame'), `א. ממדי המסגרת — 48/72/96/144/192 ו-108/162/216/324/432 ${of('frame')}`);
t(n++, !base.some(x => x.kind === 'content'), `ב. צלע התוכן בסף אלפא ${ALPHA_MIN} — ±${CONTENT_TOL.join('/')} ${of('content')}`);
t(n++, !base.some(x => x.kind === 'center'),
  `ב(1). תיבת התוכן במרכז המסגרת — סטייה ≤ ${CENTER_TOL} ${of('center')}`);
t(n++, !base.some(x => x.kind === 'bg-parse' || x.kind === 'bg-sample'),
  `ג. הרקע נקרא ויש שוליים אטומים למדוד ${of('bg-parse')}${of('bg-sample')}`);
t(n++, !base.some(x => x.kind === 'bg-mean'), `ג(1). הרקע מול השוליים — הפרש ממוצעים ≤ ${MEAN_TOL} ${of('bg-mean')}`);
t(n++, !base.some(x => x.kind === 'bg-pixel'), `ג(2). הרקע מול השוליים — פיקסל-פיקסל ≤ ${PIXEL_TOL} ${of('bg-pixel')}`);
t(n++, !base.some(x => x.kind === 'fg-ink'),
  `ה(1). הדיו המוצהר [${APP.fgInk}] מתאר את הפיקסלים האטומים ${of('fg-ink')}`);
t(n++, !base.some(x => x.kind === 'fg-alpha'),
  `ה(2). הכפלה מוקדמת באלפא — אזור אלפא חלקית ≤ ${APP.fgDriftMax} מהדיו ${of('fg-alpha')}`);
t(n++, !base.some(x => x.kind === 'tile-bg'),
  `ה(4). רקע האריח שווה למוצהר בדיוק — ⛔ אין רעש מסכה ${of('tile-bg')}`);
t(n++, !base.some(x => x.kind === 'tile-ink'),
  `ה(3). דיו האריח והחזית — אותו צבע, ומול המוצהר ב-APP ${of('tile-ink')}`);
t(n++, !base.some(x => x.kind === 'heavy'), `ד. אין קובץ mipmap מעל ${MAX_KB}KB ${of('heavy')}`);
t(n++, !base.some(x => x.kind === 'extra'), `א. אין קובץ עודף תחת mipmap-* ${of('extra')}`);

/* ⚠️ הרשימה מוצהרת גם כשהיא ריקה (כלל ברזל 24) — ⛔ שדה חסר נקרא
   כ«לא נשאל», ושדה ריק נקרא כ«נמדד ואין». */
t(n++, APP.heavyMipmapAllow && typeof APP.heavyMipmapAllow === 'object',
  `ד. רשימת-ההיתר לקבצים כבדים מוצהרת (${Object.keys(APP.heavyMipmapAllow).length} רשומות)`);

/* ── מחולל האייקונים — משחזר את מה שבעץ ────────────────────────────────── */
/*  ⛔ הטענה מריצה את המחולל **על עותק** ומשווה בית-בית (סבב 71) — ⚠️ מחולל
    שאינו משחזר הוא הצהרה שאיש לא אימת, ⛔ והרצתו דורסת נכסים בגרסה שהשער
    מפיל: נמדד 63/95/127/189/253 מול 48/72/96/144/192 שנדרשים. ⭐ והשוואה
    בית-בית ⛔ ולא «הצלע יצאה נכון»: שני מחוללים שונים מגיעים לאותה צלע. */
{
  const g = mkdtempSync(join(tmpdir(), 'r71g-'));
  try {
    for (const d of ['tools', 'design', 'icons', RES])
      cpSync(join(ROOT, d), join(g, d), { recursive: true });
    const run = spawnSync(process.execPath, [join(g, 'tools', 'gen-icons.mjs')],
                          { cwd: g, encoding: 'utf8' });
    t(n++, run.status === 0, `ו. \`gen-icons\` רץ ומסיים בהצלחה ${(run.stderr || '').split('\n')[0] || ''}`);
    const assets = [];
    for (const f of readdirSync(join(ROOT, 'icons'))) assets.push(`icons/${f}`);
    for (const d of DENS) for (const a of Object.keys(FRAME)) assets.push(`${RES}/mipmap-${d}/${a}.png`);
    const diff = assets.filter((rel) => {
      const A = join(ROOT, rel), B = join(g, rel);
      if (!existsSync(B)) return true;
      return !readFileSync(A).equals(readFileSync(B));
    });
    t(n++, diff.length === 0,
      `ו. ⛔ והרצתו אינה משנה אף אחד מ-${assets.length} נכסי האייקון ${diff.join(' · ')}`);

    /*  ⛔ המוטציה על **המחולל** ולא על הנכס (סבב 72) — ⚠️ האיפוס הוא שורה
        אחת בו, ⭐ ומוטציה שמסירה אותה מחזירה את הרעש לאריח: זו הדרך היחידה
        להוכיח שהטענה מודדת את המנגנון ⛔ ולא את הקובץ שבעץ. */
    if (APP.tileFlat === true) {
      const gp = join(g, 'tools', 'gen-icons.mjs');
      const src = readFileSync(gp, 'utf8');
      const KILL = 'm[k] = a < ALPHA_MIN / 255 ? 0 : a;';
      t(n++, src.includes(KILL), 'ז. איפוס הרעש קיים במחולל');
      const rerun = (patched, label, want) => {
        writeFileSync(gp, patched);
        const r = spawnSync(process.execPath, [gp], { cwd: g, encoding: 'utf8' });
        const bad = r.status !== 0 || audit(g).some((x) => x.kind === 'tile-bg');
        t(n++, bad === want, label);
      };
      rerun(src.replace(KILL, 'm[k] = a;'),
            'ז. ⛔ מוטציה: ביטול האיפוס מפיל את «רקע האריח שווה למוצהר»', true);
      rerun(src.replace('const ALPHA_MIN = 25;', 'const ALPHA_MIN = 26;'),
            'ז. ⭐ מוטציית-נגד: `ALPHA_MIN` בפיקסל אחד ⛔ אינו מפיל', false);
    }
  } finally { rmSync(g, { recursive: true, force: true }); }
}

/* ────── ⛔ ט. `APP` של המחולל — מפתחות זהים בארבעתן (סבב 73) ────────────────
   ⛔ **מה נאכף:** בלוק ה-`APP` שב-`gen-icons` מצהיר **בדיוק** את עשרת
   המפתחות הקנוניים, ⛔ ושדה שערכו ריק נושא הערת נימוק בתוך הבלוק.
   ⚠️ **הנימוק המדוד:** טענה שמשווה מול שדה שאינו קיים עוברת תמיד —
   `undefined === undefined` הוא `true`, ⛔ והשער נראה ירוק בלי לרוץ.
   ⛔ **מה יישבר בלעדיו:** מי שמעתיק `APP` מאפליקציה אחרת משמיט את השדות
   שאינם רלוונטיים לו, ⚠️ וכל טענה שנשענת עליהם מפסיקה למדוד בשקט.
   ⛔ **מה אינו נאכף כאן:** ה**ערכים** עצמם — הם נבדלים בכוונה, ⛔ ומה
   שנדרש מהם הוא נימוק כתוב ולא זהות.
   ──────────────────────────────────────────────────────────────────────── */
{
  const GEN_KEYS = ['name', 'art', 'ink', 'bg', 'tileRadius', 'tileBox', 'mark',
                    'master', 'bgKey', 'keyTol'];
  const src = readFileSync(join(ROOT, 'tools/gen-icons.mjs'), 'utf8');
  const blk = /^const APP = \{$([\s\S]*?)^\};$/m.exec(src);
  t(n++, !!blk, 'ט. בלוק `APP` של המחולל נמצא');
  const body = blk ? blk[1] : '';
  const lines = body.split('\n');
  const keys = lines.map((l) => /^ {2}([A-Za-z][\w]*):/.exec(l)).filter(Boolean).map((m) => m[1]);
  const missing = GEN_KEYS.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !GEN_KEYS.includes(k));
  t(n++, missing.length === 0 && extra.length === 0,
    `ט. `+"`APP`"+` מצהיר את ${GEN_KEYS.length} המפתחות הקנוניים — חסרים ${missing.join(' · ') || 'אפס'}` +
    `, עודפים ${extra.join(' · ') || 'אפס'}`);
  /*  ⛔ שדה ריק נושא נימוק **בתוך הבלוק** — ⚠️ נימוק שיושב מחוצה לו אינו
      נקרא ע"י מי שעורך את השדה, ⛔ והוא נמחק יחד עם הריק בתום לב. */
  const bare = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^ {2}([A-Za-z][\w]*):\s*(null|\{\}|\[\])\s*,/.exec(lines[i]);
    if (!m) continue;
    /*  ⚠️ נימוק אחד רשאי לכסות **רצף** של שדות ריקים — ⛔ שלושת השדות של
        המסלול הרסטרי יורדים יחד, ⚠️ והערה נפרדת על כל אחד מהם היא בדיוק
        ההערה על שורה מובנת מאליה שמלמדת את הקורא לדלג. */
    let j = i - 1, seen = false;
    while (j >= 0) {
      if (/[⛔⚠️⭐]/.test(lines[j])) { seen = true; break; }
      const k = /^ {2}([A-Za-z][\w]*):\s*(null|\{\}|\[\])\s*,/.exec(lines[j]);
      if (/^ {2}[A-Za-z][\w]*:/.test(lines[j]) && !k) break;
      j--;
    }
    if (!seen) bare.push(m[1]);
  }
  t(n++, bare.length === 0,
    `ט. כל שדה `+"`APP`"+` ריק נושא הערת נימוק במקומו — בלי נימוק ${bare.join(' · ') || 'אפס'}`);

  /*  ⛔ המוטציה על **הבלוק** ולא על הטענה — ⚠️ השמטת שדה ריק היא בדיוק
      מה שקורה כשמעתיקים `APP` מאפליקציה אחרת. */
  const drop = (k) => src.replace(new RegExp(`^ {2}${k}:[^\n]*\n`, 'm'), '');
  const keysOf = (txt) => {
    const b = /^const APP = \{$([\s\S]*?)^\};$/m.exec(txt);
    return (b ? b[1] : '').split('\n')
      .map((l) => /^ {2}([A-Za-z][\w]*):/.exec(l)).filter(Boolean).map((m) => m[1]);
  };
  t(n++, !GEN_KEYS.every((k) => keysOf(drop('tileRadius')).includes(k)),
    'ט. ⛔ מוטציה: השמטת שדה מ-`APP` מפילה את «מצהיר את המפתחות הקנוניים»');
  /*  ⭐ מוטציית-נגד **חיה**: השדות מסודרים מחדש — ⛔ סדר אינו מפתח, ⚠️ ושתי
      האפליקציות שהסמל שלהן מצויר בקוד מצהירות אותם בסוף ולא בהתחלה. */
  const reordered = (() => {
    const b = /^const APP = \{$([\s\S]*?)^\};$/m.exec(src);
    const ls2 = b[1].split('\n');
    const at = ls2.findIndex((l) => /^ {2}tileRadius:/.test(l));
    const [moved] = ls2.splice(at, 1); ls2.push(moved);
    return src.replace(b[1], ls2.join('\n'));
  })();
  t(n++, GEN_KEYS.every((k) => keysOf(reordered).includes(k)),
    'ט. ⭐ מוטציית-נגד: סדר שונה של אותם שדות ⛔ אינו מפיל');
}

/* ── מקודד PNG מינימלי — לשימוש המוטציות בלבד ──────────────────────────── */
/* ⛔ אינו דוחס (filter 0, deflate ברירת מחדל) — ⚠️ אין לו שום קורא מחוץ
   למוטציות, ולכן גודל הפלט אינו מעניין. */
function encodePNG(img) {
  const raw = Buffer.alloc(img.h * (img.w * 4 + 1));
  for (let y = 0; y < img.h; y++) {
    raw[y * (img.w * 4 + 1)] = 0;
    img.data.copy(raw, y * (img.w * 4 + 1) + 1, y * img.w * 4, (y + 1) * img.w * 4);
  }
  const chunk = (type, data) => {
    const b = Buffer.alloc(8 + data.length + 4);
    b.writeUInt32BE(data.length, 0); b.write(type, 4, 'ascii');
    data.copy(b, 8); b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)) >>> 0, 8 + data.length);
    return b;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0); ihdr.writeUInt32BE(img.h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
                        chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
let CRC = null;
function crc32(buf) {
  if (!CRC) { CRC = new Int32Array(256);
    for (let i = 0; i < 256; i++) { let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC[i] = c; } }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

/* ── מוטציות — על עותק בתיקייה זמנית ───────────────────────────────────── */
const tmp = mkdtempSync(join(tmpdir(), 'r66-'));
cpSync(join(ROOT, RES), join(tmp, RES), { recursive: true });

/* ⭐ מוטציית-נגד ראשונה: העותק **לפני** כל שינוי חייב לעבור — בלעדיה
   מוטציה שנופלת אינה מוכיחה דבר, שכן ייתכן שהעותק עצמו שבור. */
t(n++, audit(tmp).length === 0, 'נגד: עותק נקי עובר את הביקורת');

/* ⚠️ `kinds` מכיל `__none__` כשהציפייה היא **אפס** הפרות — ⛔ מוטציית-נגד
   שאין לה ציפייה מפורשת הייתה עוברת על כל תוצאה. */
const ALL_KINDS = ['missing', 'decode', 'frame', 'content', 'extra', 'heavy',
                   'bg-parse', 'bg-sample', 'bg-mean', 'bg-pixel'];
const mutate = (label, fn, kinds, notKinds = []) => {
  const bak = join(tmp, 'bak');
  rmSync(bak, { recursive: true, force: true });
  cpSync(join(tmp, RES), bak, { recursive: true });
  try {
    fn();
    const got = audit(tmp).map(x => x.kind);
    const want = kinds.includes('__none__') ? got.length === 0 : kinds.some(k => got.includes(k));
    t(n++, want && !notKinds.some(k => got.includes(k)),
      `מוטציה: ${label} — נתפסה כ-[${got.join(',') || 'כלום'}]`);
  } finally {
    rmSync(join(tmp, RES), { recursive: true, force: true });
    cpSync(bak, join(tmp, RES), { recursive: true });
    rmSync(bak, { recursive: true, force: true });
  }
};

const mip = (d, a) => join(tmp, RES, `mipmap-${d}/${a}.png`);

mutate('קובץ חסר — mipmap-hdpi/ic_launcher.png', () => rmSync(mip('hdpi', 'ic_launcher')), ['missing']);

/*  ⭐ מוטציית ההכפלה המוקדמת (סבב 68) — ⛔ החשכת ה-RGB של פיקסלים בעלי
    אלפא **חלקית** בלבד היא בדיוק מה שהקטנה בלי premultiplied alpha עושה:
    השחור של השקוף נמרח פנימה. ⚠️ האלפא עצמו אינו נוגע, ולכן טענת התוכן
    (צלע ארוכה) ממשיכה לעבור — ⛔ וזה מה שהופך את הטענה החדשה לנחוצה. */
mutate('הקטנה בלי הכפלה מוקדמת — RGB באזור אלפא חלקית מוחשך', () => {
  const p = mip('xxxhdpi', 'ic_launcher_foreground');
  const img = decodePNG(readFileSync(p));
  for (let k = 0; k < img.w * img.h; k++) {
    const a = img.data[k * 4 + 3];
    if (a > 0 && a < 250)
      for (let c = 0; c < 3; c++) img.data[k * 4 + c] = Math.max(0, img.data[k * 4 + c] - 90);
  }
  writeFileSync(p, encodePNG(img));
}, ['fg-alpha']);

/*  ⭐ מוטציית-נגד — ⛔ פיקסל **שקוף לגמרי** אינו נראה ואינו נמדד: החשכתו
    אינה משנה דבר במסך, ⚠️ ולכן היא חייבת **לעבור**. ⛔ בלעדיה הטענה אינה
    מבחינה בין «מודדת אזור אלפא חלקית» ל«סופרת כל שינוי בקובץ». */
mutate('⭐ מוטציית-נגד: החשכת פיקסלים שקופים לגמרי ⛔ אינה מפילה', () => {
  const p = mip('xxxhdpi', 'ic_launcher_foreground');
  const img = decodePNG(readFileSync(p));
  for (let k = 0; k < img.w * img.h; k++)
    if (img.data[k * 4 + 3] === 0)
      for (let c = 0; c < 3; c++) img.data[k * 4 + c] = 0;
  writeFileSync(p, encodePNG(img));
}, ['__none__']);

/* ⭐ המוטציה שמוכיחה שהסובלנות היא אפס (סבב 71) — ⚠️ פיקסל אחד
   מעבר לתיבת התוכן מגדיל את הצלע ביחידה אחת, ⛔ ועל סובלנות 3 הוא עבר
   בשקט. ⛔ זו ההבחנה בין שער שאוכף אחידות לשער שמאשר טווח. */
mutate('צלע התוכן גדלה ביחידה אחת — mdpi', () => {
  const p = mip('mdpi', 'ic_launcher_foreground');
  const img = decodePNG(readFileSync(p));
  let x1 = -1, ym = 0;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++)
      if (img.data[(y * img.w + x) * 4 + 3] >= ALPHA_MIN && x > x1) { x1 = x; ym = y; }
  img.data[(ym * img.w + x1 + 1) * 4 + 3] = 255;
  writeFileSync(p, encodePNG(img));
}, ['content']);

/* ⭐ מוטציית-נגד: הזזת התוכן בלי לשנות את גודלו ⛔ אינה מפילה —
   ⚠️ הטענה מודדת צלע ⛔ ולא מיקום, ובלעדיה סובלנות אפס הייתה נקראת
   כאיסור על כל נגיעה בנכס. ⭐ והיא גם מה שמוכיח שסובלנות המרכוז אינה
   אפס (סבב 72): ⛔ פיקסל אחד עובר, שלושה נופלים. */
mutate('⭐ מוטציית-נגד: הזזת התוכן בפיקסל ⛔ אינה מפילה', () => {
  const p = mip('mdpi', 'ic_launcher_foreground');
  const img = decodePNG(readFileSync(p));
  const out = Buffer.alloc(img.data.length);
  for (let y = 0; y < img.h; y++)
    for (let x = img.w - 1; x >= 1; x--)
      img.data.copy(out, (y * img.w + x) * 4, (y * img.w + x - 1) * 4, (y * img.w + x) * 4);
  out.copy(img.data);
  writeFileSync(p, encodePNG(img));
}, ['__none__']);

/*  ⛔ המוטציה מזיזה ⛔ ואינה מקטינה (סבב 72) — ⚠️ תוכן שהוקטן נופל ממילא
    על צלע התוכן, ⭐ והזזה בגודל קבוע היא מה שמבודד את טענת המרכוז:
    היא הטענה **היחידה** שאמורה ליפול כאן. */
mutate(`הזזת התוכן ב-${CENTER_TOL + 2} פיקסלים — xxxhdpi`, () => {
  const p = mip('xxxhdpi', 'ic_launcher_foreground');
  const img = decodePNG(readFileSync(p));
  const d = CENTER_TOL + 2, out = Buffer.alloc(img.data.length);
  for (let y = 0; y < img.h; y++)
    for (let x = img.w - 1; x >= d; x--)
      img.data.copy(out, (y * img.w + x) * 4, (y * img.w + x - d) * 4, (y * img.w + x - d + 1) * 4);
  out.copy(img.data);
  writeFileSync(p, encodePNG(img));
}, ['center']);

/*  ⛔ המוטציה מכהה את דיו האריח בלבד (סבב 72) — ⚠️ בדיוק הסטייה שהייתה
    בעץ במשך סבבים: ⭐ החזית נשארת במקומה, ⛔ והטענה שנופלת היא זו של האריח. */
if (APP.tileFlat === true) mutate('דיו האריח נבדל מדיו החזית — xxxhdpi', () => {
  const p = mip('xxxhdpi', 'ic_launcher');
  const img = decodePNG(readFileSync(p));
  const lim = (APP.fgInk.reduce((a, b) => a + b, 0) / 3 + 255) / 2;
  for (let k = 0; k < img.w * img.h; k++)
    if ((img.data[k*4] + img.data[k*4+1] + img.data[k*4+2]) / 3 < lim)
      for (let c = 0; c < 3; c++) img.data[k*4+c] = Math.max(0, img.data[k*4+c] - 20);
  writeFileSync(p, encodePNG(img));
}, ['tile-ink']);

/*  ⭐ מוטציית-נגד: הבהרת **רמפת הקצה** בשתי רמות ⛔ אינה מפילה — ⚠️ הטענה
    מודדת את מישור הדיו, ⛔ ולא כל פיקסל שיש בו דיו: ⭐ בלעדיה «אותו צבע»
    היה נקרא כאיסור על כל נגיעה באריח. */
if (APP.tileFlat === true) mutate('⭐ מוטציית-נגד: הבהרת רמפת הקצה באריח ⛔ אינה מפילה', () => {
  const p = mip('xxxhdpi', 'ic_launcher');
  const img = decodePNG(readFileSync(p));
  const ink = APP.fgInk.reduce((a, b) => a + b, 0) / 3, lim = (ink + 255) / 2;
  for (let k = 0; k < img.w * img.h; k++) {
    const m = (img.data[k*4] + img.data[k*4+1] + img.data[k*4+2]) / 3;
    if (m > ink + 20 && m < lim)
      for (let c = 0; c < 3; c++) img.data[k*4+c] = Math.min(255, img.data[k*4+c] + 2);
  }
  writeFileSync(p, encodePNG(img));
}, ['__none__']);

mutate('ממד שגוי — foreground של xhdpi בגודל של xxhdpi',
  () => cpSync(mip('xxhdpi', 'ic_launcher_foreground'), mip('xhdpi', 'ic_launcher_foreground')),
  ['frame']);

/* ⚠️ תוכן חורג: ה-foreground של mdpi מוחלף במסגרת תקינה (108) שבתוכה
   לוגו קטן — ⛔ בדיוק המקרה שהמנהל תיאר, «32% במקום 44%», שממדי המסגרת
   לבדם אינם רואים. */
mutate('תוכן חורג — לוגו קטן בתוך מסגרת תקינה', () => {
  const img = decodePNG(readFileSync(mip('mdpi', 'ic_launcher_foreground')));
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++)
      if (x < 34 || x > 73 || y < 34 || y > 73) img.data[(y * img.w + x) * 4 + 3] = 0;
  writeFileSync(mip('mdpi', 'ic_launcher_foreground'), encodePNG(img));
}, ['content']);

/* ⚠️ שתי מוטציות הצבע נכתבות ל-XML שבעותק, ולכן `audit(tmp)` קורא אותן. */
const bgPath = join(tmp, RES, 'drawable/ic_launcher_background.xml');
mkdirSync(dirname(bgPath), { recursive: true });
cpSync(join(ROOT, RES, 'drawable/ic_launcher_background.xml'), bgPath);
const bgSrc = readFileSync(bgPath, 'utf8');
const writeBg = s => writeFileSync(bgPath, s);

mutate('צבע שאינו תואם — רקע שחור', () => writeBg(
  `<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n    <solid android:color="#000000"/>\n</shape>\n`),
  ['bg-mean', 'bg-pixel']);

/* ⭐⭐ הדגמה שמצדיקה את הטענה השנייה — ⛔ על תמונה סינתטית ולא על
   האייקון של האפליקציה (סבב 66). ⚠️ הנימוק נמדד: באפליקציה שהרקע שלה
   **צבע אחיד**, «החלפת מדרג בממוצע שלו» היא no-op ואינה תופסת דבר —
   כלומר המוטציה הייתה נכשלת בשלוש מארבע, ⛔ ומוכיחה על המנגנון כלום.
   כאן נצבע מדרג 315° ידוע, מאומת מול XML תואם, ואז מוחלף בממוצעו. */
{
  const GRAD = { kind: 'gradient', angle: 315, start: [0x2B, 0x50, 0x8F], end: [0x0D, 0x1F, 0x42] };
  const gradXml = `<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n    <gradient android:type="linear" android:angle="315" android:startColor="#2B508F" android:endColor="#0D1F42"/>\n</shape>\n`;
  /*  ⛔ המדרג נצבע מסביב לסמל ⛔ ולא מעליו (סבב 72) — ⚠️ אריח בלי סמל
      מפיל את טענת **הדיו**, ⭐ וכאן נבדקת טענת הרקע: מוטציית-נגד שמפילה
      טענה אחרת אינה מוכיחה דבר על זו שנבדקת. */
  const paint = () => {
    const W = 192, img = { w: W, h: W, data: Buffer.alloc(W * W * 4) };
    const cur = decodePNG(readFileSync(mip('xxxhdpi', 'ic_launcher')));
    /*  ⚠️ רק באריח של נייר-ודיו (סבב 72) — ⛔ באפליקציה שהאריח שלה הוא רקע
        מלא וסמל בהיר, «הפיקסלים הכהים» הם הרקע עצמו: ⭐ שימורם היה מבטל
        את המוטציה כולה. */
    const lim = APP.tileFlat === true && APP.fgInk
      ? (APP.fgInk.reduce((a, b) => a + b, 0) / 3 + 255) / 2 : -1;
    for (let y = 0; y < W; y++)
      for (let x = 0; x < W; x++) {
        const d = (y * W + x) * 4;
        const ink = cur.w === W &&
          (cur.data[d] + cur.data[d + 1] + cur.data[d + 2]) / 3 < lim;
        const c = ink ? [cur.data[d], cur.data[d + 1], cur.data[d + 2]]
                      : predict(GRAD, x, y, W, W);
        img.data[d] = c[0]; img.data[d + 1] = c[1]; img.data[d + 2] = c[2]; img.data[d + 3] = 255;
      }
    writeFileSync(mip('xxxhdpi', 'ic_launcher'), encodePNG(img));
    return img;
  };
  let painted = null;
  mutate('נגד: מדרג סינתטי מול XML תואם — עובר',
    () => { painted = paint(); writeBg(gradXml); }, ['__none__'], ALL_KINDS);
  mutate('החלפת מדרג בממוצע שלו — נתפסת בפיקסל-פיקסל בלבד', () => {
    paint(); 
    let s = [0, 0, 0], c = 0;
    for (let y = 0; y < painted.h; y++)
      for (let x = 0; x < painted.w; x++) {
        if (!(x < RING || y < RING || x >= painted.w - RING || y >= painted.h - RING)) continue;
        for (let k = 0; k < 3; k++) s[k] += painted.data[(y * painted.w + x) * 4 + k];
        c++;
      }
    const hex = s.map(v => Math.round(v / c).toString(16).padStart(2, '0')).join('');
    writeBg(`<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n    <solid android:color="#${hex}"/>\n</shape>\n`);
  }, ['bg-pixel'], ['bg-mean']);
}

mutate('XML שאינו נקרא — נכשל ולא עובר',
  () => writeBg('<?xml version="1.0"?>\n<shape/>\n'), ['bg-parse']);

writeBg(bgSrc);
/* ⭐⭐ מוטציית הרגרסיה של הסבב הזה: הרקע **הישן** של יומן. ⛔ היא מתעדת
   בשער עצמו את הבאג שהסבב בא לתקן — מסגרת בהירה סביב האייקון — כך
   שהחזרתו בתום לב תפיל דחיפה. */
mutate('הרקע הישן #0A4DAC — הכחול של האייקון הקודם', () => writeBg(
  `<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n    <solid android:color="#0A4DAC"/>\n</shape>\n`),
  ['bg-mean', 'bg-pixel']);

mutate('קובץ עודף תחת mipmap-mdpi',
  () => writeFileSync(join(tmp, RES, 'mipmap-mdpi/ic_extra.png'), Buffer.alloc(8)), ['extra']);

writeBg(bgSrc);
mutate('קובץ mipmap כבד מדי', () => {
  const p = mip('mdpi', 'ic_launcher');
  writeFileSync(p, Buffer.concat([readFileSync(p), Buffer.alloc(41 * 1024)]));
}, ['heavy']);

rmSync(tmp, { recursive: true, force: true });

console.log(`\n✅ סבב 66 (שכבת האייקונים) — ${pass} טענות עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);

}
