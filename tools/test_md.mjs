#!/usr/bin/env node
/*  test_md.mjs — שלד שלושת קובצי ה-md הנלווים ופסקאותיהם המשותפות.
 *
 *  **מה נאכף:** ⛔ שהבודק **באמת נופל** כששלד `README.md`, `CONTEXT.md`
 *  או `android/README.md` נשבר, ⛔ ושהפסקאות המשותפות שבתוכם נחתמות
 *  ב-`sha256` — ⚠️ כלומר אכיפה על **תוכן** ולא על שלד.
 *
 *  **הנימוק המדוד:** שלושת הקבצים לא נבדקו כלל ונסחפו — ⛔ ל-`CONTEXT`
 *  של אחת מהן חסרה אזהרת ההרשאות שקיימת בשלוש האחיות, ⛔ ול-`android/README`
 *  של אחרת חסרו שני פרקים שלמים.
 *
 *  **מה יישבר בלעדיו:** ⛔ שער שאוכף כותרות בלבד מאשר קובץ שכל תוכנו
 *  התרוקן, ⚠️ והפער נראה רק כשמישהו צריך את מה שנמחק.
 *
 *  **מה אינו נאכף כאן:** ⛔ תוכן החלק **הפרטי** של הקבצים — ⚠️ הוא נבדל
 *  פר-אפליקציה בכוונה, ⭐ ומה שנאכף בו הוא התקרה בלבד.
 *
 *  ⚠️ אין בקובץ בלוק `APP` — הוא נגזר מהקבצים שלצידו, ⛔ ולכן זהה בית-לבית
 *  בארבעת הריפו. ⛔ והמוטציות רצות **בתהליך אחד** — ⚠️ תהליך חדש לכל מוטציה
 *  הוא אותה עבודה תשע-עשרה פעמים.
 */

import fs from 'node:fs';
import { mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';


/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, bad = 0;
const ok = (m) => { n++; console.log(`  ok   ${m}`); };
const no = (m) => { n++; bad++; console.error(`  FAIL ${m}`); };
const t  = (c, m) => (c ? ok(m) : no(m));

/* שלושת הקבצים והפרק שנמחק בכל מוטציה — הכותרת הראשונה שהשלד דורש. */
const CASES = [
  ['README.md',         /^##\s+מסכים\s*$/m,                 'מסכים'],
  /*  ⛔ «מצב נוכחי» ירד מהשלד (סבב 71) — ⚠️ הוא היה צילום מצב, כלומר
      היסטוריה, ⛔ והכלל אוסר. ⭐ הפרק שנמחק כאן הוא ה-GRANT: הוא הפרק
      השני שהשלד דורש, ⛔ ומחיקתו היא מה שהמוטציה באה למדוד. */
  ['CONTEXT.md',        /^##\s+.*Supabase — GRANT חובה לטבלאות חדשות.*$/m, 'ה-GRANT'],
  ['android/README.md', /^##\s+Build\s*$/m,                 'Build'],
];

console.log('· סבב 39ב — שלד שלושת קובצי ה-md');

/* 1 — שלושת הקבצים קיימים */
for (const [f] of CASES) t(fs.existsSync(join(ROOT, f)), `${f} קיים`);

/* 2 — הבדיקה עוברת על העץ כמות שהוא */
/*  ⛔ `DOCS_INPROC` מבטל את `process.exit` שבסופו של הבודק — ⚠️ בלעדיו
 *  הייבוא הראשון היה עוצר את השער הזה עצמו. */
process.env.DOCS_INPROC = '1';
let spin = 0;
const run = async (cwd) => {
  const lg = console.log, er = console.error, wn = console.warn;
  let out = '';
  const cap = (...a) => { out += a.join(' ') + '\n'; };
  const prev = process.cwd();
  let status = 1;
  process.chdir(cwd);
  console.log = cap; console.error = cap; console.warn = cap;
  try {
    const url = pathToFileURL(join(cwd, 'tools', 'check-docs.mjs')).href;
    const mod = await import(`${url}?md=${spin++}`);
    status = mod.docFailures ? 1 : 0;
  } catch (e) {
    out += String((e && e.message) || e) + '\n';
  } finally {
    console.log = lg; console.error = er; console.warn = wn;
    process.chdir(prev);
  }
  return { status, stdout: out, stderr: '' };
};
/*  ⛔ כל תיקייה זמנית נרשמת ונמחקת בסוף (סבב 72) — ⚠️ נמדד: הרתמה
 *  יצרה כ-30 תיקיות בכל הרצה ולא מחקה אחת, ⛔ ואלפי עותקי עץ מילאו את
 *  הדיסק עד ENOSPC באמצע הרצת שער. */
/*  ⛔ כל גופו של השער הזה הוא רתמה על עותקי עץ (סבב 92) — ⚠️ הבקרה
 *  החיובית והמוטציות כאחת, ⛔ ולכן הוא כולו רץ ברמה המלאה בלבד: ⭐ קריאת
 *  רתמה מעל הסוגר רצה בכל הרצה, וזה בדיוק מה שהועבר. */
if (!RUN_MUT) {
  console.log('\n⏭ test_md: הרתמה והמוטציות רצות ברמה המלאה (--full)');
  process.exit(bad ? 1 : 0);
}

const TEMPS = [];
/*  ⛔ כותב על עותק — ⚠️ `check-docs` רץ בתהליך נפרד, ⛔ והוא קורא את קובצי התיעוד מהדיסק. */
const temp = (tag) => { const d = mkdtempSync(join(tmpdir(), tag)); TEMPS.push(d); return d; };
const baseDir = temp('md-skel-');
// ⚠️ manifest.json נוסף לרשימה בסבב 44 — מסעיף ח של check-docs ואילך
//    הבודק אוכף גם את **ערכי** המפתחות המשותפים שבו, ורתמה שלא העתיקה
//    אותו הייתה מפילה את check-docs על קובץ חסר במקום על סחיפה במד.
for (const f of ['CLAUDE.md', 'README.md', 'CONTEXT.md', 'manifest.json']) cpSync(join(ROOT, f), join(baseDir, f));
/*  ⚠️ ו-`icons/` נוספה בסבב 67 — מאותו נימוק בדיוק: check-docs אוכף
 *  מעכשיו שכל `src` במניפסט מצביע על קובץ **שקיים**, ורתמה בלי
 *  התיקייה הייתה מפילה אותו על 404 מדומה במקום על סחיפה במד. */
cpSync(join(ROOT, 'icons'), join(baseDir, 'icons'), { recursive: true });
cpSync(join(ROOT, 'android'), join(baseDir, 'android'), { recursive: true });
cpSync(join(ROOT, 'tools'), join(baseDir, 'tools'), { recursive: true });
t((await run(baseDir)).status === 0, 'check-docs עובר על עותק נקי של העץ');

const NEW_SHARED = [
  ['android/README.md', 'android-smali-scope'],
  ['android/README.md', 'android-cache-apk'],
  ['android/README.md', 'android-origin-switch'],
  ['android/README.md', 'android-icons'],
];

/*  ⛔ עותק אחד לשער, ⛔ ולא עותק לכל מוטציה (סבב 92) — ⚠️ נמדד שהשער פתח
 *  **תשעה-עשר** עותקי עץ בהרצה אחת, ⭐ אחד לכל מוטציה: ⛔ הזמן גדל עם
 *  מספר המוטציות ולא עם גודל הקוד. ⚠️ וכל מוטציה כאן נוגעת ב**תוכן**
 *  אחד מקובצי התיעוד — ⭐ ולכן שחזורם מהעץ האמיתי מחזיר את העותק למצבו
 *  הנקי, ⛔ ואין צורך בעץ חדש: ⚠️ ועותק אחד הוא **אחד**, ⛔ ולא עותק
 *  נקי לצד עותק עבודה. */
/*  ⛔ הרשימה נגזרת ואינה מוקלדת — ⚠️ כל קובץ שמוטציה כותבת אליו חייב
 *  להשתחזר, ⛔ ושם שנשמט ממנה משאיר מוטציה קודמת בעץ: ⭐ המוטציה הבאה
 *  נמדדת אז על עותק מלוכלך, ⚠️ והיא «עוברת» מסיבה שאינה שלה. */
const MUT_FILES = [...new Set([...CASES.map(([f]) => f), ...NEW_SHARED.map(([f]) => f),
                               'CLAUDE.md', 'README.md', 'CONTEXT.md', 'manifest.json'])];
const mutDir = () => {
  for (const f of MUT_FILES) cpSync(join(ROOT, f), join(baseDir, f));
  return baseDir;
};

/* 3 — מוטציה: מחיקת פרק נדרש מכל אחד משלושת הקבצים מפילה את השער */
for (const [f, re, name] of CASES) {
  const dir = mutDir();
  const p = join(dir, f);
  const src = fs.readFileSync(p, 'utf8');
  t(re.test(src), `${f}: הפרק «${name}» קיים לפני המוטציה`);
  fs.writeFileSync(p, src.replace(re, '## ---'), 'utf8');
  const r = await run(dir);
  t(r.status !== 0, `⛔ מחיקת «${name}» מ-${f} מפילה את check-docs`);
  t(/שלד הקובץ נקבע בסבב 39/.test(r.stderr + r.stdout),
    `   והשגיאה מצביעה על השלד ולא על משהו אחר`);
}

/* ── 4 — סבב 41: הפסקאות המשותפות נאכפות בתוכן, ולא בשלד ────────────────────
 *  ⚠️ סעיף ו רואה כותרות בלבד, ולכן פרק שאיבד את גופו עובר אותו. סעיף ז
 *  שנוסף בסבב 41 חותם את שש הפסקאות המשותפות ב-sha256; שלוש המוטציות
 *  כאן מודדות שהוא **באמת** תופס מחיקה ושינוי-בית, ⛔ ושהוא **אינו**
 *  נופל על פסקה פרטית — שער שנופל על תוכן פר-אפליקציה היה בדיוק אותה
 *  סחיפה בהיפוך.                                                 */
console.log('· סבב 41 — תוכן הפסקאות המשותפות');


/* 4א — מחיקת פסקה משותפת שלמה (עם הסימונים) מפילה */
{
  const d = mutDir(), p = join(d, 'CONTEXT.md');
  const src = fs.readFileSync(p, 'utf8');
  const i = src.indexOf('<!-- SHARED:start id="context-grant" -->');
  const j = src.indexOf('<!-- SHARED:end -->', i) + '<!-- SHARED:end -->'.length;
  t(i > 0, 'CONTEXT.md: הפסקה המשותפת «context-grant» מסומנת לפני המוטציה');
  fs.writeFileSync(p, src.slice(0, i) + src.slice(j), 'utf8');
  const r = await run(d);
  t(r.status !== 0, '⛔ מחיקת פסקה משותפת מ-CONTEXT.md מפילה את check-docs');
  t(/פסקאות משותפות חסרות/.test(r.stderr + r.stdout), '   והשגיאה אומרת שהפסקה חסרה');
}

/* 4ב — שינוי בית אחד בתוך פסקה משותפת מפיל */
{
  const d = mutDir(), p = join(d, 'README.md');
  /*  ⛔ שם המשתנה אינו `src` (סבב 79) — ⚠️ `src` שמור למקור האפליקציה,
   *  ⭐ וטענה עליו נמדדת בתקן «טענה על התנהגות». */
  const rmSrc = fs.readFileSync(p, 'utf8');
  const needle = 'שחרור קוד web אינו מצריך APK חדש.';
  const nHits = rmSrc.split(needle).length - 1;
  t(nHits === 1, `README.md: הפסקה המשותפת «readme-apk» נושאת את המשפט לפני ` +
                 `המוטציה — נמדדו ${nHits} מופעים והצפוי 1`);
  fs.writeFileSync(p, rmSrc.replace(needle, 'שחרור קוד web אינו מצריך APK חדש'), 'utf8');
  const r = await run(d);
  t(r.status !== 0, '⛔ שינוי בית בפסקה משותפת מפיל את check-docs');
  t(/אינה זהה לחתימה/.test(r.stderr + r.stdout), '   והשגיאה מצביעה על החתימה');
}

/* 4ג — שינוי בפסקה פרטית ⛔ אינו מפיל */
{
  const d = mutDir(), p = join(d, 'README.md');
  const src = fs.readFileSync(p, 'utf8');
  const m = /^##\s+מסכים\s*$/m.exec(src);
  t(!!m, 'README.md: פרק «מסכים» — פרטי לאפליקציה — קיים');
  const at = src.indexOf('\n', m.index + m[0].length) + 1;
  fs.writeFileSync(p, src.slice(0, at) + '\n- **פרק בדיקה פרטי** — נוסף במוטציה.\n' + src.slice(at), 'utf8');
  t((await run(d)).status === 0, '⛔ שינוי בפסקה פרטית אינו מפיל את check-docs');
}

/* ────── 5 — סבב 42ב: ארבעת הפרקים שהוכרעו כמשותפים ביישור תיעוד האנדרואיד ──
 *  ⚠️ סבב 42ב מדד ששלושה נושאים בתיעוד האנדרואיד חיו בשלוש כותרות שונות
 *  לאותו דבר, ושפרק «אייקונים» קיים בריפו אחד בלבד אף שהמבנה שהוא מתאר
 *  זהה בארבעתן (עשרה `mipmap` ו-XML אדפטיבי אחד — נמדד). ארבעת הפרקים
 *  הוכרעו כמשותפים ונכנסו ל-`CANON_MD`, ⛔ ולכן הם נאכפים בתוכן ולא
 *  בכותרת. ⚠️ ומה שיושב **מתחת** לכל אחד מהם — שורת הנימוק הפר-אפליקציתית
 *  — נשאר פרטי, והמוטציה השנייה מודדת שהשער אינו נופל עליו.               */
console.log('· סבב 42ב — הפרקים המשותפים של תיעוד האנדרואיד');


for (const [f, id] of NEW_SHARED) {
  const START = `<!-- SHARED:start id="${id}" -->`;
  const END = '<!-- SHARED:end -->';

  /* 5א — שינוי בית בתוך הפסקה המשותפת מפיל */
  {
    const d = mutDir(), p = join(d, f);
    const src = fs.readFileSync(p, 'utf8');
    const i = src.indexOf(START);
    t(i > 0, `${f}: «${id}» מסומן כמשותף לפני המוטציה`);
    const j = src.indexOf(END, i);
    const head = src.slice(0, i + START.length);
    const body = src.slice(i + START.length, j);
    const at = body.search(/\S/);
    fs.writeFileSync(p, head + body.slice(0, at) + 'x' + body.slice(at) + src.slice(j), 'utf8');
    const r = await run(d);
    t(r.status !== 0, `⛔ שינוי בית ב-«${id}» מפיל את check-docs`);
    t(/אינה זהה לחתימה/.test(r.stderr + r.stdout), '   והשגיאה מצביעה על החתימה');
  }

  /* 5ב — שינוי בשורת הנימוק הפר-אפליקציתית שמתחתיו ⛔ אינו מפיל */
  {
    const d = mutDir(), p = join(d, f);
    const src = fs.readFileSync(p, 'utf8');
    const j = src.indexOf(END, src.indexOf(START)) + END.length;
    fs.writeFileSync(p, src.slice(0, j) + '\n\n⚠️ שורת נימוק פרטית שנוספה במוטציה.' + src.slice(j), 'utf8');
    t((await run(d)).status === 0, `⛔ שינוי בנימוק הפרטי שמתחת ל-«${id}» אינו מפיל`);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   סבב 67 — שכבת האייקונים במניפסט
   ══════════════════════════════════════════════════════════════════════════
   ⛔ מה נאכף: שלושה אייקונים מוצהרים, ⛔ אייקון מלא אינו `maskable`,
   ⛔ וכל `src` מצביע על קובץ שקיים. ⛔ ולמה זה יכול להישבר: הצהרה על
   קובץ חסר היא 404 שקט — ההתקנה מצליחה והאייקון פשוט אינו מופיע.
   ══════════════════════════════════════════════════════════════════════════ */
console.log('· סבב 67 — שכבת האייקונים במניפסט');
const mfPath = (d) => join(d, 'manifest.json');
const mfEdit = async (fn) => {
  const d = mutDir(), p = mfPath(d);
  const mf = JSON.parse(fs.readFileSync(p, 'utf8'));
  fn(mf);
  fs.writeFileSync(p, JSON.stringify(mf, null, 2), 'utf8');
  return run(d);
};
/*  ⚠️ לפי `src` ולא לפי אינדקס — ב-schar המניפסט מצהיר גם על
 *  favicons, ו-`icons[0]` שם אינו אחד משלושת הקנוניים. */
t((await mfEdit((mf) => { mf.icons.find((i) => i.src === 'icons/icon-192.png').purpose = 'any maskable'; })).status !== 0,
  '⛔ `"any maskable"` על האייקון המלא מפיל את check-docs');
t((await mfEdit((mf) => { mf.icons = mf.icons.filter((i) => i.src.indexOf('maskable') < 0); })).status !== 0,
  '⛔ הסרת האייקון ה-maskable מפילה את check-docs');
t((await mfEdit((mf) => { mf.icons.push({ src: 'icons/does-not-exist.png', sizes: '64x64', type: 'image/png' }); })).status !== 0,
  '⛔ `src` שאינו קיים בריפו מפיל את check-docs — 404 שקט');
/*  ⭐ מוטציית-נגד — ⛔ בלעדיה הטענות שלמעלה אינן מבחינות בין «מודד את
 *  ההצהרה» ל«נופל על כל שינוי במניפסט». */
t((await mfEdit((mf) => { mf.name = mf.name + ' '; })).status === 0,
  '⭐ מוטציית-נגד: שינוי שדה שאינו האייקונים ⛔ אינו מפיל');

for (const d of TEMPS) rmSync(d, { recursive: true, force: true });

console.log(bad ? `\n❌ סבב 39ב — ${bad} מתוך ${n} נכשלו` : `\n✓ סבב 39ב+41+42ב (שלושת קובצי ה-md) — ${n} טענות עברו`);
process.exit(bad ? 1 : 0);
