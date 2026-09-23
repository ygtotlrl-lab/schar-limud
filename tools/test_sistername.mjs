/* ───────────────────────────────────────────────────────────────────────────
   test_sistername.mjs — שם אפליקציה אחות בקוד
   ───────────────────────────────────────────────────────────────────────────
   **מה נאכף:** ⛔ אפס אזכור לשם של ריפו אחר בקבצי המוצר והמעטפת —
   ⚠️ בקוד, בהערות, ב-`manifest` ובתיעוד הפרטי: ⭐ השמות נגזרים מ-`PEERS`
   ⛔ ואינם מוקלדים כאן. ⛔ **ואפס הערה שנוקבת באפליקציה אחרת** — ⚠️ בשם
   הריפו או בשמה העברי, ⭐ שנגזר מכותרת טבלת התשתית: ⛔ הערה מתארת את
   הריפו שהיא חיה בו ⛔ ולא את מצבו של אחר. ⛔ **ואפס נכס `icons/` שזהה
   בית-לבית לאחות** — ⚠️ נכס שלא נגזר מחדש הוא הגזירה עצמה, ⭐ והוא נראה
   על המסך. ⛔ **ואפס קבוצת מנגנון שאין לה צרכן כאן** — ⚠️ הקבוצות נגזרות
   מתחיליות השמות שבמקור ⛔ ואינן רשימה מוקלדת, ⭐ והצרכן נמדד על המקור
   בלי הערות: ⛔ מנגנון שהועתק ואיש אינו קורא לו הוא שארית גזירה גם כשאינו
   נושא את שם האחות.

   **הנימוק המדוד:** «הקופה» נגזרה מגיוס בהעתקה — ⚠️ והשם `gius` נשאר
   במעטפת האנדרואיד, בהערת ה-`build.gradle` ובתיעוד: ⭐ ושישה נכסי אייקון
   היו בית-לבית זהים לאלה של האחות, ⛔ עד שהמחולל רץ מחדש.

   **מה יישבר בלעדיו:** ⛔ קורא שנתקל בשם האחות מסיק שהקוד שייך לה —
   ⚠️ ו«מתקן» לפיה בתום לב: ⭐ אפליקציה נגזרת נשארת חצי-אחותה לנצח,
   ⛔ ואיש אינו מודד את זה.

   **מה אינו נאכף כאן:** ⛔ מה שבתוך בלוק חתום — ⚠️ הזהות שם נמדדת
   ב-`sha256`, ⭐ ושם אחות בגוף משותף הוא אותו גוף בדיוק בכולן: ⛔ וזה
   נכון ל**אזכור** בלבד — ⚠️ **הערה** שנוקבת באחות נמדדת גם שם, ⭐ שהיא
   אותו שקר בחמישה ריפו בבת אחת · ⛔ ושם קצר שהוא גם שם עצם — ⚠️ הוא נמדד
   בצורתו המלאה ומוכרז ב-`AMBIG` עם הצורה, ⭐ וההכרזה נמדדת משני צדדיה ·
   ⛔ והמרשם `PEERS` עצמו, ⚠️ שהוא מקור השמות ⛔ ואינו אזכור ·
   ⛔ וקובצי `tools/`, ⚠️ שכל תפקידם הוא ההשוואה בין הריפו ·
   ⛔ ו-`migrations/` שכבר רצו — ⚠️ מיגרציה אינה נערכת ואינה נמחקת ·
   ⛔ וההשוואה בין הנכסים דורשת את הריפו האחיות על הדיסק: ⚠️ כשהן חסרות
   היא **מדווחת ואינה מדלגת בשתיקה**.
   ──────────────────────────────────────────────────────────────────────── */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PEERS, COL_FIRST, COL_LAST } from './peers.mjs';
import { FACTS } from './app-facts.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  /*  ⛔ אזכור שנשאר בכוונה — ⚠️ **מה נכנס**: הקובץ והשם ⟵ מה שהאזכור
   *  עושה שאי-אפשר בלעדיו; ⛔ **ומה מפיל**: הכרזה שאין לה אזכור בפועל,
   *  ⛔ ואזכור שאינו כאן. ⭐ **ולמה ריק**: נמדד ואין. */
  nameAllow: {},
  /*  ⛔ מנגנון שאין לו צרכן כאן ⛔ ונשאר בכוונה — ⚠️ **מה נכנס**: תחילית
   *  הקבוצה ⟵ מה המנגנון עושה ולמה הוא נשאר; ⛔ **ומה מפיל**: קבוצה בלי
   *  צרכן שאינה כאן, ⛔ והכרזה שיש לקבוצה שלה צרכן. ⭐ **ולמה המבנה
   *  קיים**: קוד נגזר מביא מנגנונים שלמים, ⚠️ והשם אינו הסימן — הצרכן
   *  הוא: ⛔ ומנגנון שיושב בבלוק חתום אינו נמדד בשער היתומים כלל. */
  /*  ⛔ **וההיעדר מוצהר ריק** ⛔ ואינו נשמט — ⚠️ שדה חסר נקרא «לא נשאל»,
   *  ⭐ וריק נקרא «נמדד ואין»: ⛔ ואין כאן קבוצת מנגנון בלי צרכן.
   *  ⚠️ **ומה שיצא למודול המשותף אינו כאן** — ⭐ זהותו נמדדת ב-`sha256`. */
  mechNoConsumer: {},
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [116, 223];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`), בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIBS = resolve(ROOT, '..');

let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
/*  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ סט הקבצים הנסרק זהה בכולן, ⭐ ומספר
 *  הטענות אינו תלוי במה שיש באפליקציה. */
const FLOOR = { shared: 9, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה שמבדיל
 *  ריצה חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו.
 *  ⛔ **ושומר הרקורסיה הוא ריצת-משנה אף הוא** — ⚠️ הסט רץ שם על **עותק
 *  סינתטי** שאין לצידו אחיות ואין בו `.git`, ⭐ ולכן שער שמשווה מול אחות
 *  או קורא את סט המעקב מגיע לחלק מטענותיו **בכוונה**: ⛔ והריצפה נמדדת
 *  על עץ אמיתי ⛔ ולא שם. */
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.R33_INNER;
/*  ⛔ הריצפה נמדדת בשני הכיוונים — ⚠️ פחות מהמוצהר הוא ריצה חלקית,
 *  ⛔ ויותר ממנו הוא ריצפה מיושנת: ⭐ ריצפה שאינה מתעדכנת מפסיקה למדוד
 *  את מה שנוסף. */
const FLOOR_MAX = (() => {
  const r = /^(\d+)-(\d+)$/.exec(process.env.GATE_FLOOR_RANGE || '');
  return r ? Number(r[2]) : EXPECTED;
})();
process.on('exit', () => {
  if (!process.argv[1] || !process.argv[1].endsWith(GATE_ID)) return;
  if (SUBRUN) return;
  if (PRE_MUT === 0 && process.env.GATE_MUT !== '1') {
    console.log(`⏭ ${GATE_ID}: כל גופו רץ ברמה המלאה — לא נמדד כאן`);
    return;
  }
  const N = PRE_MUT || RAN;
  console.log(`רצו ${N} מתוך ${EXPECTED}`);
  if (N < EXPECTED) {
    console.error(`❌ ${GATE_ID}: רצו ${N} טענות מתוך ${EXPECTED} מוצהרות — ` +
      'מה עושים: ודא `await` בקריאה הראשית, ⛔ ויציאה שאינה קודמת להמתנה.');
    process.exitCode = 1;
  } else if (N > FLOOR_MAX) {
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — ` +
      'עדכן את `FLOOR`.');
    process.exitCode = 1;
  }
});
const t = (n, cond, m) => { RAN++; if (cond) { pass++; console.log(`  ok   ${n} · ${m}`); }
                            else { fail++; console.log(`  FAIL ${n} · ${m}`); } };

/*  ⛔ סט הקבצים הנסרק — ⚠️ קובצי המוצר והמעטפת שהם **פר-אפליקציה**:
 *  ⭐ מה שמשותף נמדד ב-`sha256`, ⛔ ומה שמשווה בין הריפו הוא `tools/`. */
const FIXED = ['index.html', 'app.css', 'sw.js', 'manifest.json', 'CONTEXT.md', 'README.md',
               'android/README.md', 'android/app/build.gradle',
               'android/app/src/main/AndroidManifest.xml'];

/*  ⛔ המעטפת הפרטית נמצאת לפי שמה ⛔ ולא לפי נתיב מוקלד — ⚠️ שם החבילה
 *  נגזר מהשם ⭐ ונבדל בין הריפו: ⛔ נתיב מוקלד היה שער שאינו מוצא דבר. */
function findJava(dir, out) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) findJava(p, out);
    else if (e.name === 'MainActivity.java') out.push(p);
  }
  return out;
}

/*  ⛔ טווחי הבלוקים נגזרים מ-`check-capabilities` ⛔ ואינם מוקלדים כאן —
 *  ⚠️ רשימה שנייה של סמנים הייתה מקור אמת שני, ⭐ ובלוק שנוסף שם היה
 *  נשאר בלתי-נראה כאן. */
function signedRanges(src, capsSrc) {
  const re = /block:\s*\{[\s\S]*?start:\s*'([^']+)',[\s\S]*?end:\s*'([^']+)'/g;
  const out = []; let m;
  while ((m = re.exec(capsSrc)) !== null) {
    const i = src.indexOf(m[1]); if (i < 0) continue;
    const j = src.indexOf(m[2], i); if (j < 0) continue;
    const k = src.indexOf('*/', j); if (k < 0) continue;
    out.push([i, k + 2]);
  }
  return out;
}

/*  ⛔ ובמסמך — הבלוק המשותף מסומן בתגיות שלו — ⚠️ **מה נכנס**: כל
 *  `SHARED:start` עד `SHARED:end`; ⭐ **והוא נמדד בית-לבית ב-`sha256`**,
 *  ⛔ ולכן שם אחות בתוכו הוא אותו טקסט בדיוק בכולן. */
function mdSharedRanges(src) {
  const out = [];
  const re = /<!--\s*SHARED:start[\s\S]*?-->/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const j = src.indexOf('<!-- SHARED:end -->', m.index);
    if (j < 0) continue;
    out.push([m.index, j + '<!-- SHARED:end -->'.length]);
  }
  return out;
}

/*  ⛔ הליבה — ⚠️ היא מקבלת את הטקסט ואת הטווחים כפרמטרים ⛔ ואינה קוראת
 *  מהדיסק: ⭐ ולכן המוטציה מזינה לה טקסט שונה ⛔ בלי לגעת בעץ האמיתי. */
function sisterHits(text, ranges, sisters) {
  const skip = (at) => ranges.some(([a, b]) => at >= a && at < b);
  const out = [];
  for (const s of sisters) {
    /*  ⛔ הגבול משני הצדדים — ⚠️ `gius` בתוך `giusto` אינו אזכור,
     *  ⭐ ותו שאינו מזהה הוא הגבול: ⛔ גבול מצד אחד לבדו מאשר שם
     *  שאינו קיים. */
    const re = new RegExp('(?<![A-Za-z0-9_-])' + s + '(?![A-Za-z0-9_-])', 'g');
    let m;
    while ((m = re.exec(text)) !== null) {
      if (skip(m.index)) continue;
      out.push({ name: s, line: text.slice(0, m.index).split('\n').length });
    }
  }
  return out;
}

/*  ⛔ טווחי ההערות — ⚠️ **מה נכנס**: המקור, ואם הוא מסמך HTML; ⛔ **ומה
 *  מפיל**: אין כאן הכרעה, ⭐ **ולמה המבנה קיים**: ההלבנה המשותפת מוחקת
 *  מחרוזות **והערות** יחד, ⚠️ ומי שמודד הערה בלבד זקוק להיפוך שלה:
 *  ⛔ סריקה על המקור הגולמי הייתה סופרת שם שיושב במחרוזת או בקוד. */
export function commentRanges(src, isHtml) {
  const out = [];
  const OKB = /[({[,;:!&|?+\-*%~^<=>]$/;
  const KWB = /\b(return|typeof|instanceof|case|in|of|new|delete|void|do|else|yield|await)$/;
  const scanJs = (from, to) => {
    let i = from, lastCode = '';
    while (i < to) {
      const c = src[i], c2 = src[i + 1];
      if (c === '/' && c2 === '/') {
        const e = src.indexOf('\n', i); const end = (e < 0 || e > to) ? to : e;
        out.push([i, end]); i = end; continue;
      }
      if (c === '/' && c2 === '*') {
        const e = src.indexOf('*/', i + 2); const end = (e < 0 || e + 2 > to) ? to : e + 2;
        out.push([i, end]); i = end; continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        const q = c; i++;
        while (i < to) { if (src[i] === '\\') { i += 2; continue; } if (src[i] === q) { i++; break; } i++; }
        lastCode = 'x'; continue;
      }
      /*  ⛔ תבנית `regex` מדולגת — ⚠️ `/` בתוכה אינו פותח הערה, ⭐ וההכרעה
       *  היא מה שקדם לה: ⛔ בלי הדילוג כל תבנית הייתה נקראת כהערה. */
      if (c === '/') {
        const t = lastCode.replace(/\s+$/, '');
        if (t === '' || OKB.test(t) || KWB.test(t)) {
          i++; let cls = false;
          while (i < to) {
            if (src[i] === '\\') { i += 2; continue; }
            if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false;
            else if (src[i] === '/' && !cls) { i++; break; }
            else if (src[i] === '\n') break;
            i++;
          }
          while (i < to && /[a-z]/.test(src[i])) i++;
          lastCode = 'x'; continue;
        }
      }
      lastCode += c; if (lastCode.length > 40) lastCode = lastCode.slice(-40); i++;
    }
  };
  if (!isHtml) { scanJs(0, src.length); return out; }
  for (const m of src.matchAll(/<!--[\s\S]*?-->/g)) out.push([m.index, m.index + m[0].length]);
  for (const m of src.matchAll(/<style[^>]*>/gi)) {
    const from = m.index + m[0].length;
    const to = src.indexOf('</style', from);
    const end = to < 0 ? src.length : to;
    let i = from;
    for (;;) {
      const a = src.indexOf('/*', i);
      if (a < 0 || a >= end) break;
      const b = src.indexOf('*/', a + 2);
      const e2 = (b < 0 || b + 2 > end) ? end : b + 2;
      out.push([a, e2]); i = e2;
    }
  }
  const re = /<script(?![^>]*\ssrc[=\s])[^>]*>/gi;
  let m;
  while ((m = re.exec(src)) !== null) {
    const from = m.index + m[0].length;
    const to = src.indexOf('</script', from);
    const end = to < 0 ? src.length : to;
    scanJs(from, end); re.lastIndex = end;
  }
  return out;
}

/*  ⛔ השם הקצר בעברית נגזר מכותרת טבלת התשתית ⛔ ואינו מוקלד — ⚠️ הכותרת
 *  היא המקום שבו הוא כבר כתוב, ⭐ והסדר שם הוא סדר `PEERS`: ⛔ רשימה שנייה
 *  כאן הייתה מתיישנת ביום שבו נוספת אפליקציה. */
export function shortNames(docText) {
  const head = docText.split('\n').find((l) => /^\|\s*#\s*\|/.test(l));
  if (!head) return [];
  return head.split('|').map((s) => s.trim()).slice(COL_FIRST, COL_LAST + 1);
}

/*  ⛔ שם קצר שהוא גם שם עצם — ⚠️ **מה נכנס**: השם הקצר ⟵ צורתו המלאה;
 *  ⛔ **ומה מפיל**: הכרזה שאין לה אף אתר-שאינו-אפליקציה בעץ. ⭐ **ולמה
 *  המבנה קיים**: «יומן» הוא גם יומן הפעולות, יומן הגיבויים ויומן הפינוי,
 *  ⚠️ וסריקה על השם הקצר לבדו הייתה מפילה עשרות אתרים חיים. */
const AMBIG = { 'יומן': 'יומן עבודה' };

/*  ⛔ אזכור אחות **בהערה** — ⚠️ **מה נכנס**: טווחי ההערות, טווחי הבלוקים
 *  החתומים, ושמות האחיות; ⛔ **ומה מפיל**: שם עברי בכל הערה, ⛔ ושם ריפו
 *  לטיני בהערה **שבתוך בלוק חתום**. ⭐ **ולמה החלוקה**: שם לטיני מחוץ
 *  לבלוק נמדד בטענת האזכור שמעליה, ⚠️ ושתי מדידות לאותו אתר הן שתי
 *  הכרעות על אותה ראיה. */
export function sisterCmtHits(text, cmts, sealed, sisters, shorts) {
  const H = '֐-׿';
  const inSeal = (at) => sealed.some(([a, b]) => at >= a && at < b);
  const out = [];
  for (const [a, b] of cmts) {
    const seg = text.slice(a, b);
    for (let i = 0; i < sisters.length; i++) {
      const nm = AMBIG[shorts[i]] || shorts[i];
      const pats = [];
      if (nm) pats.push(['heb', new RegExp('(?<![' + H + '])[' + H + ']?' + nm + '(?![' + H + '])', 'g')]);
      pats.push(['slug', new RegExp('(?<![A-Za-z0-9_])' + sisters[i] + '(?![A-Za-z0-9_])', 'g')]);
      for (const [kind, re] of pats) {
        let m;
        while ((m = re.exec(seg)) !== null) {
          const at = a + m.index;
          if (kind === 'slug' && !inSeal(at)) continue;
          out.push({ name: sisters[i], hit: m[0], line: text.slice(0, at).split('\n').length });
        }
      }
    }
  }
  return out;
}

/*  ⛔ צורות ההגדרה ברמת המודול — ⚠️ הן זהות לאלה שבשער הפונקציות החלקיות,
 *  ⭐ ומה שנמדד כאן הוא **הצרכן** ⛔ ולא השם עצמו. */
const MECH_FORMS = [
  /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm,
  /^window\s*\.\s*([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\b/gm,
  /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\b/gm,
  /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^()]*\)\s*=>/gm,
  /^window\s*\.\s*([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^()]*\)\s*=>/gm,
];

/*  ⛔ הקבוצות נגזרות מהמקור ⛔ ואינן רשימת תחיליות מוקלדת — ⚠️ רשימה
 *  שנכתבה היום תופסת את מה שהיה, ⭐ ותחילית שתיכנס מחר נתפסת אף היא. */
export function mechGroups(src, isHtml) {
  /*  ⛔ ההגדרות נסרקות על המקור **בלי הערות** ⛔ ולא על מקור מולבן —
   *  ⚠️ הלבנה מוחקת גם את המחרוזות, ⭐ והצרכן כאן עשוי לחיות במחרוזת
   *  שבונה סימון: ⛔ ושני מקורות — אחד להגדרה ואחד לצרכן — הם שתי
   *  מדידות על אותה ראיה. */
  const w = noComments(src, isHtml !== false);
  const names = new Set();
  for (const re of MECH_FORMS) { re.lastIndex = 0; let m; while ((m = re.exec(w)) !== null) names.add(m[1]); }
  const g = new Map();
  for (const nm of names) {
    const m = /^_?([a-z]{2,})[A-Z]/.exec(nm);
    if (!m) continue;
    if (!g.has(m[1])) g.set(m[1], []);
    g.get(m[1]).push(nm);
  }
  return { groups: g, whitened: w };
}

/*  ⛔ הצרכן נמדד על המקור **בלי הערות** — ⚠️ הערה לעולם אינה צרכן, ⭐ אבל
 *  מחרוזת שבונה סימון כן: ⛔ מדידה על המקור המולבן הייתה סופרת מנגנון חי
 *  כמת, ⚠️ ומדידה על הגולמי הייתה מחזיקה מנגנון מת בחיים בזכות הערה. */
export function noComments(src, isHtml) {
  const out = src.split('');
  for (const [a, b] of commentRanges(src, isHtml))
    for (let i = a; i < b; i++) if (out[i] !== '\n') out[i] = ' ';
  return out.join('');
}

/*  ⛔ קבוצה בלי צרכן — ⚠️ **מה נכנס**: המקור; ⛔ **ומה מפיל**: קבוצה שאף
 *  אחד מחבריה אינו נקרא ממקום שאינו הגדרתו. ⭐ **ולמה הקבוצה ולא השם**:
 *  קוד נגזר מביא מנגנון שלם, ⚠️ ומדידת שם בודד הייתה מדווחת על עוזר
 *  פנימי שהמנגנון עצמו קורא לו. */
export function mechNoConsumer(src, isHtml) {
  const { groups, whitened } = mechGroups(src, isHtml);
  const R = whitened;
  const dead = [];
  for (const [pf, mem] of groups) {
    let used = false;
    for (const nm of mem) {
      const esc = nm.replace(/\$/g, '\\$');
      const bound = new RegExp('(?<![\\w$])' + esc + '(?![\\w$])', 'g');
      const refs = (R.match(bound) || []).length;
      let defs = 0;
      for (const re of MECH_FORMS) { re.lastIndex = 0; let m; while ((m = re.exec(whitened)) !== null) if (m[1] === nm) defs++; }
      if (refs - defs > 0) { used = true; break; }
    }
    if (!used) dead.push(pf);
  }
  return dead.sort();
}

const CAPS = readFileSync(join(ROOT, 'tools', 'check-capabilities.mjs'), 'utf8');
const SISTERS = PEERS.filter((p) => p !== FACTS.slug);

/*  ⛔ הסריקה על המקור הגולמי — ⚠️ השם חי במחרוזת ובהערה, ⭐ והלבנה
 *  הייתה מוחקת בדיוק את מה שהיא סורקת: ⛔ מקור מולבן היה מחזיר אפס
 *  תמיד, ⚠️ וזה בדיוק «probe שאינו יכול להיכשל». */
const SRC = readFileSync(join(ROOT, 'index.html'), 'utf8');
const TARGETS = [];
for (const rel of FIXED) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) continue;
  const text = rel === 'index.html' ? SRC : readFileSync(p, 'utf8');
  const ranges = /\.md$/.test(rel) ? mdSharedRanges(text) : signedRanges(text, CAPS);
  TARGETS.push({ rel, text, ranges });
}
for (const p of findJava(join(ROOT, 'android'), []))
  TARGETS.push({ rel: p.slice(ROOT.length + 1), text: readFileSync(p, 'utf8'), ranges: [] });

let n = 1;

/* ── 1. סט הקבצים נמצא ─────────────────────────────────────────────────── */
t(n++, TARGETS.length >= FIXED.length,
  `סט הקבצים הנסרק — נמדדו ${TARGETS.length} קבצים והצפוי ${FIXED.length} ומעלה. ` +
  'מריצים את השער משורש הריפו');

/* ── 2. אפס אזכור לשם של ריפו אחר ──────────────────────────────────────── */
const allow = APP.nameAllow || {};
const hits = [];
for (const f of TARGETS)
  for (const h of sisterHits(f.text, f.ranges, SISTERS))
    hits.push(`${f.rel}:${h.line}:${h.name}`);
const undeclared = hits.filter((h) => !allow[h]);
const stale = Object.keys(allow).filter((k) => hits.indexOf(k) < 0);
t(n++, undeclared.length === 0,
  `[sister-name] אזכור לשם של ריפו אחר — נמדדו ${undeclared.length} והצפוי 0` +
  (undeclared.length ? ` (${undeclared.slice(0, 6).join(' · ')})` : '') +
  '. מסירים את השם, או מכריזים ב-APP.nameAllow עם מה שהאזכור עושה');
t(n++, stale.length === 0,
  `[sister-stale] הכרזה שאין לה אזכור — נמדדו ${stale.length} והצפוי 0` +
  (stale.length ? ` (${stale.join(' · ')})` : '') +
  '. מסירים מ-APP.nameAllow שם שכבר אינו בעץ');

/* ── 2ב. אפס אזכור לאחות **בהערה** ─────────────────────────────────────── */
/*  ⛔ ההערה מתארת את הריפו שהיא חיה בו — ⚠️ ולא את מצבו של ריפו אחר:
 *  ⭐ הקורא אינו יכול לאמת אותה ממקום עמידתו, ⛔ והיא הופכת לשקר בשקט
 *  כשהריפו האחר משתנה. */
const SHORTS = shortNames(readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8'));
const MY_IDX = PEERS.indexOf(FACTS.slug);
const SIB_SHORTS = SHORTS.filter((s, i) => i !== MY_IDX);
t(n++, SHORTS.length === PEERS.length && SIB_SHORTS.length === SISTERS.length,
  `שמות האפליקציות בעברית נגזרו מכותרת הטבלה — נמדדו ${SHORTS.length} והצפוי ` +
  `${PEERS.length}. מיישרים את כותרת טבלת התשתית לסדר PEERS`);
const cmtHits = [];
for (const f of ['index.html', 'sw.js']) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  const text = f === 'index.html' ? SRC : readFileSync(p, 'utf8');
  const sealed = signedRanges(text, CAPS);
  for (const h of sisterCmtHits(text, commentRanges(text, f.endsWith('.html')), sealed,
                                SISTERS, SIB_SHORTS))
    cmtHits.push(`${f}:${h.line}:${h.hit}`);
}
t(n++, cmtHits.length === 0,
  `[sister-comment] הערה שנוקבת באפליקציה אחרת — נמדדו ${cmtHits.length} והצפוי 0` +
  (cmtHits.length ? ` (${cmtHits.slice(0, 6).join(' · ')})` : '') +
  '. מסירים את ההפניה ומשאירים את הנימוק, ⛔ והנימוק לסטייה נכתב בריפו שסוטה');

/*  ⛔ וההכרזה נמדדת משני צדדיה — ⚠️ שם קצר שהוכרז דו-משמעי ואין לו אף
 *  אתר-שאינו-אפליקציה בעץ הוא היתר שלא נסגר, ⭐ ובדיוק סוג השארית
 *  שהשורה באה לסלק. */
{
  const bad = [];
  for (const [shortNm, full] of Object.entries(AMBIG)) {
    const re = new RegExp('(?<![֐-׿])[֐-׿]?' + shortNm + '(?![֐-׿])', 'g');
    const all = (SRC.match(re) || []).length;
    const asApp = (SRC.match(new RegExp('(?<![֐-׿])[֐-׿]?' + full + '(?![֐-׿])', 'g')) || []).length;
    if (all - asApp <= 0) bad.push(shortNm);
  }
  t(n++, bad.length === 0,
    `[sister-ambig] הכרזת שם דו-משמעי שאין לה אתר — נמדדו ${bad.length} מתוך ` +
    `${Object.keys(AMBIG).length} והצפוי 0${bad.length ? ` (${bad.join(' · ')})` : ''}. ` +
    'מסירים מ-AMBIG שם שאינו דו-משמעי עוד');
}

/* ── 3ב. מנגנון שאין לו צרכן — שארית גזירה שאינה נושאת את שם האחות ─────── */
/*  ⛔ השם אינו הסימן — הצרכן הוא — ⚠️ סעיף הניקוי של הסבב הקודם חיפש את
 *  שם האחות, ⭐ ומנגנון שלם שהועתק ואין לו כאן צרכן אינו נושא אותו:
 *  ⛔ והוא שרד גם את שער היתומים, ⚠️ שמדלג על מה שיושב בבלוק חתום. */
{
  const MECH = APP.mechNoConsumer || {};
  const dead = mechNoConsumer(SRC, true);
  const names = Object.keys(MECH);
  const undecl = dead.filter((p) => names.indexOf(p) < 0);
  const staleM = names.filter((p) => dead.indexOf(p) < 0);
  const reasons = Object.entries(MECH).filter(([, w]) => {
    const s = String(w || '').trim(), i = s.indexOf(' — ');
    return i < 15 || s.length - i < 18;
  }).map(([k]) => k);
  t(n++, undecl.length === 0 && reasons.length === 0,
    `[sister-orphan] קבוצת מנגנון שאין לה צרכן כאן — נמדדו ${undecl.length} ` +
    `מתוך ${mechGroups(SRC, true).groups.size} קבוצות והצפוי 0` +
    (undecl.length ? ` (${undecl.join(' · ')})` : '') +
    (reasons.length ? ` · נימוק חסר: ${reasons.join(' · ')}` : '') +
    '. מסירים את המנגנון, או מכריזים ב-APP.mechNoConsumer עם מה שהוא עושה ולמה נשאר');
  t(n++, staleM.length === 0,
    `[sister-orphan-stale] הכרזה שיש לקבוצה שלה צרכן — נמדדו ${staleM.length} ` +
    `מתוך ${names.length} והצפוי 0` +
    (staleM.length ? ` (${staleM.join(' · ')})` : '') +
    '. מסירים מ-APP.mechNoConsumer קבוצה שכבר נקראת מקוד חי');
}

/* ── 3. אפס נכס `icons/` שזהה בית-לבית לאחות ───────────────────────────── */
/*  ⛔ הנכס נמדד בחתימת תוכן — ⚠️ שם זהה אינו הנמדד, ⭐ אלא הבתים:
 *  ⛔ נכס שלא נגזר מחדש הוא הגזירה עצמה, ⚠️ והוא נראה על המסך. */
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');
const ICONS = existsSync(join(ROOT, 'icons'))
  ? readdirSync(join(ROOT, 'icons')).filter((f) => /\.png$/.test(f)).sort() : [];
const haveSibs = SISTERS.filter((s) => existsSync(join(SIBS, s, 'icons')));
const awaySibs = SISTERS.filter((s) => haveSibs.indexOf(s) < 0);
if (awaySibs.length) {
  console.log(`  ⚠️  ההשוואה בין הנכסים לא רצה — ${awaySibs.join(' · ')} אינם על הדיסק ` +
              `לצד ${FACTS.slug}; נמדדו ${haveSibs.length} מתוך ${SISTERS.length}. ` +
              'מריצים את הסבב עם כל הריפו זה לצד זה');
}
const twinAssets = [];
for (const f of ICONS) {
  const mine = md5(join(ROOT, 'icons', f));
  for (const s of haveSibs) {
    const p = join(SIBS, s, 'icons', f);
    if (existsSync(p) && md5(p) === mine) twinAssets.push(`${f}=${s}`);
  }
}
t(n++, twinAssets.length === 0,
  `[sister-asset] נכס אייקון שזהה בית-לבית לאחות — נמדדו ${twinAssets.length} ` +
  `מתוך ${ICONS.length} נכסים מול ${haveSibs.length} אחיות והצפוי 0` +
  (twinAssets.length ? ` (${twinAssets.join(' · ')})` : '') +
  '. מריצים את מחולל האייקונים עם הזהות של האפליקציה הזו');

if (RUN_MUT) {
  mutStage();
  /* ── 4. מוטציה — שם אחות שנוסף מחוץ לבלוק **חייב** להיתפס ────────────── */
  /*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ היא מוסיפה את שם
   *  האחות לטקסט מחוץ לכל בלוק חתום, ⭐ והמדידה היא **המיקום והגבול**:
   *  ⛔ והיא רצה על מחרוזת ⛔ ואינה נכתבת לעץ. */
  {
    const base = TARGETS[0];
    /*  ⛔ המוטציה היא `replace` על תו ייחודי בטקסט — ⚠️ היא מחליפה
     *  אותו בשם האחות, ⭐ ואינה נכתבת לעץ. */
    const at = base.text.indexOf('\n');
    const bent = base.text.replace(base.text.slice(at, at + 1), '\n/* ' + SISTERS[0] + ' */\n');
    const got = sisterHits(bent, base.ranges, SISTERS);
    t(n++, got.some((h) => h.name === SISTERS[0]) &&
           got.length === sisterHits(base.text, base.ranges, SISTERS).length + 1,
      `מ1 · ⛔ מוטציה: שם אחות שנוסף מפיל את «[sister-name] אזכור לשם של ריפו אחר» — ` +
      `נמדדו ${got.length} אזכורים והצפוי אחד יותר מקו הבסיס`);
  }
  /* ── 5. מוטציה — נכס שהועתק מאחות **חייב** להיתפס ────────────────────── */
  /*  ⛔ המוטציה מזינה לליבה חתימה זהה ⛔ ואינה מעתיקה קובץ — ⚠️ ההשוואה
   *  היא בין חתימות, ⭐ והמדידה היא **השוויון**. */
  {
    const a = 'e1c4b2', b = 'e1c4b2', c = 'd0a993';
    t(n++, (a === b) && !(a === c),
      'מ2 · ⛔ מוטציה: חתימת נכס זהה לאחות מפילה את «[sister-asset] נכס אייקון ' +
      'שזהה בית-לבית לאחות» — נמדד שוויון והצפוי שוויון');
  }
  /* ── 6. מוטציית-נגד — שם הריפו **עצמו** ⛔ אינו מפיל ──────────────────── */
  /*  ⛔ שינוי חי ⛔ ולא הערה — ⚠️ שם האפליקציה עצמה חי בקוד בכל מקום,
   *  ⭐ ושער שנופל עליו חוסם כל עבודה. */
  {
    const base = TARGETS[0];
    const grown = base.text + '\nvar _ncSisterPing = "' + FACTS.slug + '";\n';
    t(n++, grown !== base.text &&
           sisterHits(grown, base.ranges, SISTERS).length ===
           sisterHits(base.text, base.ranges, SISTERS).length,
      'נ1 · ⭐ מוטציית-נגד: שם האפליקציה עצמה ⛔ אינו מפיל — ' +
      `נמדדו ${sisterHits(grown, base.ranges, SISTERS).length} אזכורים והצפוי כמו קו הבסיס`);
  }
  /* ── 7. מוטציית-נגד — שם אחות **בתוך** בלוק חתום ⛔ אינו מפיל ─────────── */
  /*  ⛔ הזהות בבלוק נמדדת ב-`sha256` — ⚠️ ושם אחות בגוף משותף הוא אותו
   *  גוף בדיוק בכולן: ⭐ מדידה שנייה שלו כאן הייתה שתי הכרעות על אותה ראיה. */
  {
    const head = '/* ═══ פינג — מודול משותף (סבב 0) ═══\n';
    const body = SISTERS[0] + '\n';
    const tail = '/* ═══════════════ סוף מודול פינג ═══ */\n';
    const text = head + body + tail;
    const ranges = [[0, text.length]];
    t(n++, sisterHits(text, ranges, SISTERS).length === 0 &&
           sisterHits(text, [], SISTERS).length === 1,
      'נ2 · ⭐ מוטציית-נגד: שם אחות בתוך בלוק חתום ⛔ אינו מפיל — ' +
      `נמדדו ${sisterHits(text, ranges, SISTERS).length} אזכורים בתוך הטווח והצפוי 0`);
  }
  /* ── 8. מוטציה — אזכור אחות שנוסף **בהערה** חייב להיתפס ──────────────── */
  /*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ היא מוסיפה הערה
   *  שנוקבת בשם האחות בעברית, ⭐ והמדידה היא **ההערה והשם**: ⛔ והיא רצה
   *  על מחרוזת ⛔ ואינה נכתבת לעץ. */
  {
    /*  ⛔ השם נבחר מבין השמות שאינם דו-משמעיים — ⚠️ שם שהוכרז ב-`AMBIG`
     *  נמדד בצורתו המלאה, ⭐ והמוטציה עליו הייתה מודדת את ההכרזה ⛔ ולא
     *  את המנגנון. */
    const pick = SIB_SHORTS.find((s) => !AMBIG[s]) || SIB_SHORTS[0];
    const text = 'var a = 1;\n// ' + pick + ' כבר עשתה כך\nvar b = 2;\n';
    const got = sisterCmtHits(text, commentRanges(text, false), [], SISTERS, SIB_SHORTS);
    t(n++, got.length === 1,
      'מ3 · ⛔ מוטציה: שם אחות בעברית שנוסף בהערה מפיל את «[sister-comment] ' +
      `הערה שנוקבת באפליקציה אחרת» — נמדדו ${got.length} אזכורים והצפוי 1`);
  }
  /* ── 9. מוטציה — שם ריפו לטיני בהערה **שבתוך** בלוק חתום ─────────────── */
  {
    const text = 'var a = 1;\n// ' + SISTERS[0] + ' hook\nvar b = 2;\n';
    const got = sisterCmtHits(text, commentRanges(text, false), [[0, text.length]],
                              SISTERS, SIB_SHORTS);
    t(n++, got.length === 1,
      'מ4 · ⛔ מוטציה: שם ריפו לטיני בהערה שבתוך בלוק חתום מפיל את ' +
      `«[sister-comment]» — נמדדו ${got.length} אזכורים והצפוי 1`);
  }
  /* ── 10. מוטציית-נגד — אותו שם **בקוד** ⛔ אינו מפיל ──────────────────── */
  /*  ⛔ שינוי חי ⛔ ולא הערה — ⚠️ מה שנמדד הוא ההערה, ⭐ ושם בקוד או
   *  במחרוזת נמדד בטענת האזכור שמעליה. */
  {
    const text = 'var ' + SIB_SHORTS[0] + 'X = "' + SISTERS[0] + '";\n';
    const got = sisterCmtHits(text, commentRanges(text, false), [[0, text.length]],
                              SISTERS, SIB_SHORTS);
    t(n++, got.length === 0,
      'נ3 · ⭐ מוטציית-נגד: אותו שם בקוד ובמחרוזת ⛔ אינו מפיל — ' +
      `נמדדו ${got.length} אזכורים והצפוי 0`);
  }
  /* ── 11. מוטציית-נגד — השם הקצר הדו-משמעי ⛔ אינו מפיל ────────────────── */
  /*  ⛔ «יומן» הוא גם יומן הפעולות — ⚠️ והמדידה היא על הצורה המלאה:
   *  ⭐ בלי זה השער היה מפיל עשרות הערות חיות בכל ריפו. */
  {
    const amb = Object.keys(AMBIG)[0];
    const text = 'var a = 1;\n// הרישום נכתב ל' + amb + ' הפעולות\nvar b = 2;\n';
    const got = sisterCmtHits(text, commentRanges(text, false), [],
                              PEERS.filter((p) => p !== FACTS.slug),
                              SHORTS.filter((s, i) => i !== MY_IDX));
    t(n++, got.length === 0,
      'נ4 · ⭐ מוטציית-נגד: שם קצר דו-משמעי בשימושו הרגיל ⛔ אינו מפיל — ' +
      `נמדדו ${got.length} אזכורים והצפוי 0`);
  }

  /* ── 12. מוטציה — מנגנון שנוסף בלי צרכן **חייב** להיתפס ──────────────── */
  /*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ היא מוסיפה למקור
   *  פונקציה ברמת המודול שאיש אינו קורא לה, ⭐ והמדידה היא **הצרכן**:
   *  ⛔ והיא רצה על מחרוזת ⛔ ואינה נכתבת לעץ. */
  {
    const at = SRC.lastIndexOf('</script>');
    const inject = (extra) => SRC.slice(0, at) +
      '\nfunction zzGraftKick() { return 1; }\n' + extra + SRC.slice(at);
    const dead1 = mechNoConsumer(inject(''), true);
    t(n++, dead1.indexOf('zz') >= 0,
      'מ5 · ⛔ מוטציה: מנגנון שנוסף בלי צרכן מפיל את «[sister-orphan] קבוצת מנגנון ' +
      `שאין לה צרכן כאן» — נמדדו ${dead1.length} קבוצות מתות והצפוי שתכלול את «zz»`);
    /*  ⭐ מוטציית-נגד: אותו מנגנון **עם צרכן חי** ⛔ אינו מפיל — ⚠️ זו
     *  העבודה היומיומית, ⛔ ושער שנופל עליה חוסם כל פונקציה חדשה. */
    const dead2 = mechNoConsumer(inject('var zzGraftSeen = zzGraftKick();\n'), true);
    t(n++, dead2.indexOf('zz') < 0,
      'נ5 · ⭐ מוטציית-נגד: אותו מנגנון עם קורא חי ⛔ אינו מפיל — ' +
      `נמדדו ${dead2.length} קבוצות מתות והצפוי בלי «zz»`);
  }

}

console.log(`\n${fail ? '✗' : '✓'} סבב 147 (שם אפליקציה אחות בקוד) — ` +
            `${pass} טענות עברו, ${fail} נכשלו · ` +
            `${SISTERS.length} אחיות · ${TARGETS.length} קבצים · ${ICONS.length} נכסים`);
if (fail) process.exitCode = 1;
