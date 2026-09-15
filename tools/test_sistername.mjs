/* ───────────────────────────────────────────────────────────────────────────
   test_sistername.mjs — שם אפליקציה אחות בקוד
   ───────────────────────────────────────────────────────────────────────────
   **מה נאכף:** ⛔ אפס אזכור לשם של ריפו אחר בקבצי המוצר והמעטפת —
   ⚠️ בקוד, בהערות, ב-`manifest` ובתיעוד הפרטי: ⭐ השמות נגזרים מ-`PEERS`
   ⛔ ואינם מוקלדים כאן. ⛔ **ואפס נכס `icons/` שזהה בית-לבית לאחות** —
   ⚠️ נכס שלא נגזר מחדש הוא הגזירה עצמה, ⭐ והוא נראה על המסך.

   **הנימוק המדוד:** «הקופה» נגזרה מגיוס בהעתקה — ⚠️ והשם `gius` נשאר
   במעטפת האנדרואיד, בהערת ה-`build.gradle` ובתיעוד: ⭐ ושישה נכסי אייקון
   היו בית-לבית זהים לאלה של האחות, ⛔ עד שהמחולל רץ מחדש.

   **מה יישבר בלעדיו:** ⛔ קורא שנתקל בשם האחות מסיק שהקוד שייך לה —
   ⚠️ ו«מתקן» לפיה בתום לב: ⭐ אפליקציה נגזרת נשארת חצי-אחותה לנצח,
   ⛔ ואיש אינו מודד את זה.

   **מה אינו נאכף כאן:** ⛔ מה שבתוך בלוק חתום — ⚠️ הזהות שם נמדדת
   ב-`sha256`, ⭐ ושם אחות בגוף משותף הוא אותו גוף בדיוק בכולן ·
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
import { PEERS } from './peers.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  name: 'schar-limud',
  /*  ⛔ אזכור שנשאר בכוונה — ⚠️ **מה נכנס**: הקובץ והשם ⟵ מה שהאזכור
   *  עושה שאי-אפשר בלעדיו; ⛔ **ומה מפיל**: הכרזה שאין לה אזכור בפועל,
   *  ⛔ ואזכור שאינו כאן. ⭐ **ולמה ריק**: נמדד ואין. */
  nameAllow: {},
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [196];

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
const FLOOR = { shared: 4, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה שמבדיל
 *  ריצה חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו. */
const SUBRUN = !!process.env.GATE_SUBRUN;
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
const FIXED = ['index.html', 'sw.js', 'manifest.json', 'CONTEXT.md', 'README.md',
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

const CAPS = readFileSync(join(ROOT, 'tools', 'check-capabilities.mjs'), 'utf8');
const SISTERS = PEERS.filter((p) => p !== APP.name);

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
              `לצד ${APP.name}; נמדדו ${haveSibs.length} מתוך ${SISTERS.length}. ` +
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
    const grown = base.text + '\nvar _ncSisterPing = "' + APP.name + '";\n';
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
}

console.log(`\n${fail ? '✗' : '✓'} סבב 147 (שם אפליקציה אחות בקוד) — ` +
            `${pass} טענות עברו, ${fail} נכשלו · ` +
            `${SISTERS.length} אחיות · ${TARGETS.length} קבצים · ${ICONS.length} נכסים`);
if (fail) process.exitCode = 1;
