#!/usr/bin/env node
/*  בדיקת אחידות התיעוד — סבב 18, הורחבה בסבב 20.
 *
 *  ⭐ משימת הבודק: סורק את ארבעת קובצי התיעוד ואת בלוקי ה-SHARED שבהם
 *  — ⛔ ומפיל על סחיפה בתוכן המשותף, על שלד חסר ועל חציית תקציב שורות.
 *
 *  כלל ברזל 8 של הארגון: **פרוטוקול תיעוד קבוע.** סבב 17 הוכיח שרכיב
 *  שמוכרז «משותף» נסחף בלי אכיפה — וסבב 18 מדד שאותו דבר בדיוק קרה
 *  לתיעוד עצמו: פרק «בדיקה» של סבב 14 הועתק כלשונו לארבעת הריפו, כולל
 *  לשתי אפליקציות שבהן הבדיקות שהוא מתאר מעולם לא רצו. הבדיקה הזו רצה
 *  עם שערי התחביר לפני כל דחיפה, ונכשלת על חמישה סוגי סטייה:
 *
 *    א. סימוני `SHARED` אינם מאוזנים, מקוננים, בלי `id`, עם `id` כפול,
 *       או שרשימת המזהים אינה תואמת לרשימה הקנונית שלמטה.
 *    ב. תוכנו של בלוק `SHARED` אינו תואם לחתימת ה-sha256 הקנונית.
 *    ג. שורת «עודכן לאחרונה» חסרה, אינה בראש הקובץ, או בפורמט שגוי.
 *    ד. פרק שהוא פרטי בהגדרה («חתימת APK» / «בדיקה») נמצא בתוך בלוק
 *       `SHARED` — סעיף 5 של כלל ברזל 8.
 *    ז. (סבב 41) פסקה משותפת בשלושת הקבצים הנלווים אינה תואמת
 *       לחתימת ה-sha256 שלה, נמחקה, או נוספה בלי רישום קנוני.
 *    ה. (סבב 20) הקובץ שונה מול `origin/main` אבל שורת «עודכן לאחרונה»
 *       זהה לזו שב-`origin/main` — כלומר לא קודמה. סעיף ג בודק את
 *       **צורת** השורה; זה בודק שהיא באמת התקדמה.
 *    ח. (סבב 44) ערך של מפתח משותף ב-`manifest.json` נסחף או נמחק.
 *    ט. (סבב 49) `CLAUDE.md` מחזיק יותר פרקי סבבים מ-`DOC_MAX_ROUNDS`,
 *       פרק ארוך מ-`DOC_MAX_ROUND_LINES`, או יותר שורות מ-`DOC_MAX_LINES`.
 *
 *  ⚠️ סעיף ה — ורק הוא — **מדלג ואינו מפיל** כשאין בסיס להשוואה: אין
 *  git בסביבה, אין `origin/main`, או שהקובץ אינו קיים שם. clone רדוד או
 *  ריפו בלי remote הם מצבים לגיטימיים בסביבת בנייה, ושער שנשבר בהם היה
 *  גורם לעקיפה של הבדיקה כולה. ⛔ אין להפוך את הדילוג לכישלון ואין
 *  להרחיב אותו למקרים אחרים.
 *
 *  סימונים שבתוך גדר קוד (```) אינם נספרים, אחרת הדוגמה שבתוך פרק כלל
 *  ברזל 8 עצמו הייתה נקראת כבלוק אמיתי.
 *
 *  החתימות זהות בארבעת הריפו. שינוי מכוון בפרק משותף = עדכון הפרק
 *  בארבע האפליקציות **ובארבעת עותקי הקובץ הזה**, באותו סבב.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  file: 'CLAUDE.md',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 103, 161];

/* הרשימה הקנונית — מזהה ← חתימת sha256 (16 תווים) של תוכן הבלוק, מקוצץ. */
const CANON = [
  ['table', '184d6b12c05ce73a'],
];

/* פרקים שהם פרטיים בהגדרה — אסור שיישבו בתוך בלוק משותף. */
const PRIVATE_HEADINGS = [
  { re: /^#{2,3}\s*חתימת APK/,  name: 'חתימת APK — מפתח קבוע' },
  { re: /^#{2,3}\s*בדיקה\s*$/,  name: 'בדיקה' },
];

const STAMP_PREFIX = 'עודכן לאחרונה';
/* ⚠️ מספר הסבב יכול לשאת סיומת עברית — «32ב», «35ג» (סבב 35ג): סבב-המשך
 *    נושא את מספר הסבב שהוא ממשיך ולא מספר חדש, וזה הנוהג מסבב 32ב. עד
 *    סבב 35ג הביטוי דרש ספרות בלבד, ולכן סבב-המשך שרץ **באותו יום** של
 *    הסבב שהוא ממשיך לא יכול היה לקדם את השורה כלל: התאריך זהה, והמספר
 *    נדחה. ⛔ הסיומת היא תו עברי אחד ולא טקסט חופשי — «סבב 35 (המשך)»
 *    היה מחזיר את הסחיפה שהפורמט הקבוע בא למנוע. */
const STAMP_RE = /^עודכן לאחרונה: סבב (\d+[א-ת]?) · (\d{4})-(\d{2})-(\d{2})$/;
const START_RE = /^<!--\s*SHARED:start\s+id="([^"]*)"\s*-->\s*$/;
const START_LOOSE = /^<!--\s*SHARED:start\b/;
const END_RE   = /^<!--\s*SHARED:end\s*-->\s*$/;

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);
const warn = (m) => console.warn('⚠️ ' + m);   // אזהרה שאינה מפילה את השער

if (!fs.existsSync(APP.file)) {
  console.error(`❌ ${APP.file} לא נמצא — יש להריץ את הבדיקה משורש הריפו`);
  if (!process.env.DOCS_INPROC) process.exit(1);
  throw new Error(`${APP.file} לא נמצא`);
}
const src = fs.readFileSync(APP.file, 'utf8');
const lines = src.split('\n');

/* גדרות קוד — כל שורה מסומנת אם היא בתוך ``` */
function fenceMask(ls) {
  const mask = new Array(ls.length).fill(false);
  let f = false;
  for (let i = 0; i < ls.length; i++) {
    if (ls[i].startsWith('```')) { f = !f; mask[i] = true; continue; }
    mask[i] = f;
  }
  return mask;
}
const inFence = fenceMask(lines);

/* שורת «עודכן לאחרונה» של טקסט כלשהו — אותו זיהוי בדיוק בשני צדי ההשוואה
 * שבסעיף ה, כדי שגרסת הדיסק וגרסת origin/main ייקראו באותה דרך. */
function stampOf(text) {
  const ls = text.split('\n');
  const f = fenceMask(ls);
  for (let i = 0; i < ls.length; i++) {
    if (!f[i] && ls[i].startsWith(STAMP_PREFIX)) return ls[i].trim();
  }
  return null;
}

/* ── ג. שורת «עודכן לאחרונה» ───────────────────────────────────────────── */
{
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (!inFence[i] && lines[i].startsWith(STAMP_PREFIX)) hits.push(i);
  }
  if (hits.length === 0) {
    fail('שורת «עודכן לאחרונה» חסרה — נמדדו 0 מופעים והצפוי אחד. ' +
       'מוסיפים אותה בראש הקובץ, בפורמט «עודכן לאחרונה: סבב N · YYYY-MM-DD»');
  } else if (hits.length > 1) {
    fail(`שורת «עודכן לאחרונה» — נמדדו ${hits.length} מופעים (שורות ` +
       `${hits.map(i => i + 1).join(', ')}) והצפוי אחד. מסירים את העודפים`);
  } else {
    const i = hits[0];
    const m = STAMP_RE.exec(lines[i]);
    if (!m) fail(`שורת «עודכן לאחרונה» בפורמט שגוי (שורה ${i + 1}): «${lines[i]}». ` +
                 'נמדד פורמט אחר. מתקנים ל-«עודכן לאחרונה: סבב N · YYYY-MM-DD»');
    else if (i > 5) fail(`שורת «עודכן לאחרונה» — נמדדה בשורה ${i + 1} והצפוי בראש הקובץ. ` +
       `מעבירים אותה למעלה`);
    else pass(`שורת העדכון תקינה: סבב ${m[1]} · ${m[2]}-${m[3]}-${m[4]}`);
  }
}

/* ── א. סימונים מאוזנים, מזהים תקינים ──────────────────────────────────── */
const found = [];          // {id, from, to, body}
let open = null;
let markerError = false;
for (let i = 0; i < lines.length; i++) {
  if (inFence[i]) { if (open) open.body.push(lines[i]); continue; }
  const l = lines[i];
  if (START_LOOSE.test(l)) {
    const m = START_RE.exec(l);
    if (!m || !m[1].trim()) {
      fail(`שורה ${i + 1}: SHARED:start בלי id תקין — נמדד «${l.trim()}» ` +
       `והצפוי id="<שם>". מתקנים את הסימון`);
      markerError = true; continue;
    }
    if (open) {
      fail(`שורה ${i + 1}: SHARED:start id="${m[1]}" בתוך בלוק פתוח ` +
       `id="${open.id}" — נמדד קינון והצפוי בלוקים סמוכים. מסירים את הקינון`);
      markerError = true; continue;
    }
    open = { id: m[1], from: i + 1, body: [] };
    continue;
  }
  if (END_RE.test(l)) {
    if (!open) { fail(`שורה ${i + 1}: SHARED:end בלי start תואם — נמדד סוגר יתום ` +
       `והצפוי זוג. מוסיפים את סמן הפתיחה, או מסירים את הסוגר`); markerError = true; continue; }
    found.push({ id: open.id, from: open.from, to: i + 1, body: open.body.join('\n').trim() });
    open = null;
    continue;
  }
  if (open) open.body.push(l);
}
if (open) { fail(`בלוק id="${open.id}" (שורה ${open.from}) לא נסגר — נמדד ` +
       `סמן פתיחה בלי סוגר. מוסיפים SHARED:end בסוף הבלוק`); markerError = true; }

const dup = found.map(b => b.id).filter((id, k, arr) => arr.indexOf(id) !== k);
if (dup.length) { fail('מזהי SHARED כפולים: ' + [...new Set(dup)].join(', ') +
                       ' — הצפוי מזהה ייחודי לכל בלוק. מעדכנים את השם הכפול'); markerError = true; }

const canonIds = CANON.map(c => c[0]);
const foundIds = found.map(b => b.id);
const missing = canonIds.filter(id => !foundIds.includes(id));
const extra   = foundIds.filter(id => !canonIds.includes(id));
if (missing.length) fail(`בלוקים משותפים חסרים מהקובץ: ${missing.join(', ')} — נמדדו ` +
                         `${canonIds.length - missing.length} מתוך ${canonIds.length}. ` +
                         `מוסיפים אותם מריפו אחות`);
if (extra.length)   fail('בלוקים משותפים שאינם ברשימה הקנונית: ' + extra.join(', ') +
                         ` — נמדדו ${extra.length} מעבר ל-${canonIds.length} הקנוניים. ` +
                         'מוסיפים אותם לרשימה הקנונית בארבעת עותקי הבדיקה, או מסירים אותם');
if (!markerError && !missing.length && !extra.length) {
  pass(`סימוני SHARED מאוזנים ותקינים — ${found.length} בלוקים, כל המזהים ברשימה הקנונית`);
}

/* ── ב. חתימות התוכן ───────────────────────────────────────────────────── */
for (const [id, sha] of CANON) {
  const b = found.find(x => x.id === id);
  if (!b) continue;                      // כבר דווח כחסר
  const got = crypto.createHash('sha256').update(b.body).digest('hex').slice(0, 16);
  if (got !== sha) {
    fail(`בלוק "${id}" (שורות ${b.from}–${b.to}): אינו זהה לחתימה הקנונית — ${got} ` +
         `במקום ${sha}. שינוי בפרק משותף חייב להיעשות בארבע האפליקציות ` +
         `ובארבעת עותקי הבדיקה, באותו סבב. מיישרים את הבלוק, או מעדכנים את החתימה`);
  } else {
    pass(`בלוק "${id}": זהה לחתימה הקנונית (${sha})`);
  }
}

/* ── ד. פרק פרטי בהגדרה שסומן SHARED ───────────────────────────────────── */
{
  const inside = (i) => found.some(b => i + 1 > b.from && i + 1 < b.to);
  let bad = 0;
  for (let i = 0; i < lines.length; i++) {
    if (inFence[i]) continue;
    for (const p of PRIVATE_HEADINGS) {
      if (p.re.test(lines[i]) && inside(i)) {
        fail(`שורה ${i + 1}: פרק «${p.name}» יושב בתוך בלוק SHARED. ` +
             `הוא פרטי בהגדרה — נמדד בתוך בלוק משותף והצפוי מחוצה לו. ` +
        `מעבירים אותו לחלק הפרטי: לכל אפליקציה תוכן משלה`);
        bad++;
      }
    }
  }
  if (!bad) pass('פרקים פרטיים בהגדרה («חתימת APK» / «בדיקה») יושבים מחוץ לבלוקים המשותפים');
}

/* ── ה. שורת העדכון קודמה בפועל מול origin/main (סבב 20) ───────────────── */
/*  הפער שסבב 18 דיווח עליו: סעיף ג בודק שהשורה קיימת, בראש הקובץ ובפורמט
 *  תקין — כלומר את **צורתה**. סשן שערך פרק פרטי והשאיר את מספר הסבב הישן
 *  עבר את השער. כאן משווים את הקובץ שעל הדיסק (ולכן גם שינוי שטרם קומט)
 *  מול `origin/main`, ואם התוכן שונה אבל השורה זהה — זו הפרה של סעיף 2
 *  בכלל ברזל 8.
 *  ⛔ אין בסיס להשוואה ⇒ מדלגים באזהרה. אין להפוך זאת לכישלון. */
{
  const git = (...args) => spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const skip = (why) => warn(`דילוג על בדיקת קידום שורת העדכון — ${why}. ` +
                             'זו אזהרה בלבד; השער אינו נופל (סבב 20).');

  const ver = git('--version');
  if (ver.error || ver.status !== 0) {
    skip('git אינו זמין בסביבה');
  } else if (git('rev-parse', '--is-inside-work-tree').stdout.trim() !== 'true') {
    skip('התיקייה אינה עותק עבודה של git');
  } else if (git('rev-parse', '--verify', '--quiet', 'origin/main').status !== 0) {
    skip('אין origin/main להשוות אליו (clone רדוד או ריפו בלי remote)');
  } else {
    const base = git('show', `origin/main:./${APP.file}`);
    if (base.status !== 0) {
      skip(`${APP.file} אינו קיים ב-origin/main`);
    } else if (base.stdout === src) {
      pass(`${APP.file} זהה ל-origin/main — אין שינוי, ואין מה לקדם`);
    } else {
      const here = stampOf(src);
      const there = stampOf(base.stdout);
      if (there === null) {
        pass('שורת «עודכן לאחרונה» אינה קיימת ב-origin/main — היא נוספת בשינוי הזה');
      } else if (here !== null && here === there) {
        fail('CLAUDE.md שונה ושורת העדכון לא קודמה — ' +
             `«${there}» זהה לזו שב-origin/main. כלל ברזל 8, סעיף 2: כל סבב ` +
             'מקדמים את שורת «עודכן לאחרונה» — נמדדה שורה זהה והצפוי ערך חדש; ' +
             'גם סבב שנגע רק בקובץ אחד.');
      } else if (here !== null) {
        pass(`שורת העדכון קודמה מול origin/main: «${there}» ← «${here}»`);
      }
      /* here === null כבר דווח בסעיף ג — אין טעם לדווח פעמיים. */
    }
  }
}

/* ── ה2. קידום `CACHE_NAME` מול origin/main (סבב 73ב) ───────────────────────
 *  ⛔ אותו מנגנון בדיוק כמו קידום שורת «עודכן לאחרונה», ⚠️ ועל קובץ אחר:
 *  סבב שנגע ב-`index.html` או ב-`sw.js` ולא קידם את `CACHE_NAME` משאיר את
 *  המכשיר המותקן על הקוד הישן — ⛔ הדפדפן מגיש מהמטמון, והשינוי אינו מגיע
 *  לעולם. ⚠️ אין בסיס להשוואה ⇒ מדלגים באזהרה, ⛔ ואין להפוך זאת לכישלון. */
{
  const git = (...args) => spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const skip = (why) => warn(`דילוג על בדיקת קידום \`CACHE_NAME\` — ${why}. ` +
                             'זו אזהרה בלבד; השער אינו נופל.');
  /*  ⛔ השם נקרא מהקובץ ⛔ ואינו מוצהר כאן — ⚠️ הקידומת נבדלת בין הריפו,
   *  ⭐ ומה שנמדד הוא **השינוי** ולא הערך. */
  const nameOf = (t) => (/CACHE_NAME\s*=\s*'([^']+)'/.exec(t) || [])[1] || null;
  const WATCH = ['index.html', 'sw.js'];
  const ver = git('--version');
  if (ver.error || ver.status !== 0) skip('git אינו זמין בסביבה');
  else if (git('rev-parse', '--is-inside-work-tree').stdout.trim() !== 'true')
    skip('התיקייה אינה עותק עבודה של git');
  else if (git('rev-parse', '--verify', '--quiet', 'origin/main').status !== 0)
    skip('אין origin/main להשוות אליו (clone רדוד או ריפו בלי remote)');
  else if (!fs.existsSync('sw.js')) skip('אין `sw.js` בריפו');
  else {
    const touched = WATCH.filter((f) => fs.existsSync(f) &&
      git('diff', '--quiet', 'origin/main', '--', f).status !== 0);
    const base = git('show', 'origin/main:./sw.js');
    const there = base.status === 0 ? nameOf(base.stdout) : null;
    const here = nameOf(fs.readFileSync('sw.js', 'utf8'));
    if (!touched.length) pass('`CACHE_NAME` — קובצי המקור זהים ל-origin/main, ואין מה לקדם');
    else if (there === null) pass('`CACHE_NAME` אינו קיים ב-origin/main — הוא נוסף בשינוי הזה');
    else if (here === there)
      fail(`${touched.join(' + ')} שונים מול origin/main ו-\`CACHE_NAME\` לא קודם — ` +
           `נמדד «${there}» בשני הצדדים והצפוי ערך חדש. מקדמים את \`CACHE_NAME\` באותו קומיט`);
    else pass(`\`CACHE_NAME\` קודם מול origin/main: «${there}» ← «${here}» (${touched.join(' + ')})`);
  }
}

/* ── ו. שלד קבוע לשלושת קובצי ה-md הנלווים (סבב 39 — השלמה שנייה) ───────────
 *  `CLAUDE.md` נשמר ע"י בלוקי ה-SHARED, אבל שלושת הקבצים שלצידו —
 *  `README.md`, `CONTEXT.md` ו-`android/README.md` — לא נבדקו כלל, והם
 *  נסחפו בדיוק כפי שכלל ברזל 8 מתאר: ל-CONTEXT של יומן חסרה הייתה אזהרת
 *  ה-GRANT שקיימת בשלוש האחיות, ול-`android/README` של גיוס חסרו שני
 *  פרקים שלמים.
 *
 *  ⚠️ מה שנאכף כאן הוא **שלד ולא תוכן** (סבב 39) — כותרות `##` נדרשות,
 *  בסדר יחסי קבוע. ⛔ אין לאכוף כאן זהות בית-לבית: התוכן פר-אפליקציה
 *  מעצם טבעו, וכפייה של נוסח אחיד היא בדיוק מה שכלל ברזל 8 סעיף 4 אוסר.
 *  ⚠️ ופרק **נוסף** בין הנדרשים אינו כישלון — «אייקונים» ב-gius ו-«Notes»
 *  ביומן הם תוספות פרטיות לגיטימיות.                                     */
const MD_SKELETONS = [
  { file: 'README.md', need: [
      [/^##\s+הפעלה ראשונה\s*$/,  '## הפעלה ראשונה'],
      [/^##\s+מסכים\s*$/,          '## מסכים'],
      [/^##\s+פיתוח\s*$/,          '## פיתוח'],
      [/^##\s+APK\s*$/,            '## APK'],
    ] },
  /* ⭐ `CONTEXT.md` מחזיק **לקוח · צורך · הסכימה וההרשאות** (סבב 71), ולכן
   *  השלד שלו קצר: זהות הריפו וה-GRANT. ⛔ «כללים קריטיים», «טבלאות»
   *  ו«פרטי מערכת» ירדו — הם היו עותק שני של `CLAUDE.md` ושל `README.md`,
   *  ⛔ ועותק שני נסחף בשקט. פרק ה-smali עבר ל-`android/README.md`.
   *  ⛔ **ו«מצב נוכחי» ירד מהשלד (סבב 71)** — ⚠️ הוא היה צילום מצב, כלומר
   *  היסטוריה, ⛔ ושלד שדורש אותו היה מחייב להחזיר בדיוק את מה שהכלל אוסר. */
  { file: 'CONTEXT.md', need: [
      [/^##\s+פרטי ריפו\s*$/,                        '## פרטי ריפו'],
      [/^##\s+.*Supabase — GRANT חובה לטבלאות חדשות/, '## ⚠️ Supabase — GRANT חובה לטבלאות חדשות'],
    ] },
  /*  ⛔ ארבעה פרקים ירדו מהשלד (סבב 72) — «Why WebView», «גשר», «למה אין
   *  נכסים מוטבעים» ו«המפתח הקבוע»: ⚠️ ארבעתם הסבירו כלל שהטבלה אוכפת,
   *  ⛔ ו-56 שורות ×4 חזרו על מה שכתוב שם. ⭐ מה שנשאר כאן הוא ההוראה
   *  המעשית — איך בונים, מה מריצים, ולאן מסתכלים. */
  { file: 'android/README.md', need: [
      [/^##\s+מה בפנים\s*$/,                          '## מה בפנים'],
      [/^##\s+.*מעבר-origin חד-פעמי/,                  '## ⚠️ מעבר-origin חד-פעמי — ולפני כל הפצת APK'],
      [/^##\s+אייקונים\s*$/,                           '## אייקונים'],
      [/^##\s+Build\s*$/,                              '## Build'],
      [/^##\s+Sign with the PERMANENT key/,            '## Sign with the PERMANENT key …'],
      [/^##\s+תיקון URL ב-APK/,                        '## תיקון URL ב-APK … — smali בלבד'],
    ] },
];

for (const spec of MD_SKELETONS) {
  if (!fs.existsSync(spec.file)) { fail(`${spec.file} חסר — נמדדו 0 עותקים והצפוי אחד. מוסיפים אותו ` +
      `מריפו אחות: שלושת קובצי ה-md הנלווים חובה בארבעת הריפו`); continue; }
  const ls = fs.readFileSync(spec.file, 'utf8').split('\n');
  const mask = fenceMask(ls);
  const heads = ls.map((l, i) => (mask[i] ? '' : l)).filter(l => /^##\s/.test(l));
  let at = 0, ok = true;
  for (const [re, label] of spec.need) {
    let found = -1;
    for (let i = at; i < heads.length; i++) if (re.test(heads[i])) { found = i; break; }
    if (found < 0) {
      ok = false;
      const anywhere = heads.some(h => re.test(h));
      fail(`${spec.file}: הפרק «${label}» ` +
           (anywhere ? 'קיים אך לא בסדר הקנוני' : 'חסר') +
           ' — נמדד מצב אחר מהקנוני. מוסיפים או מעבירים את הפרק: ' +
        'שלד הקובץ נקבע בסבב 39 והוא זהה בארבעת הריפו');
    } else at = found + 1;
  }
  if (ok) pass(`${spec.file} — ${spec.need.length} פרקי השלד קיימים ובסדר`);
}

/* ── ז. פסקאות משותפות בשלושת הקבצים הנלווים (סבב 41 — השלמה) ───────────────
 *  ⚠️ **סעיף ו אוכף שלד, ולא תוכן** — כותרות `##` בסדר יחסי, וזה כל מה
 *  שהוא רואה. סבב 41 מדד את המחיר: ל-`android/README.md` של gius חסרה
 *  הייתה פסקת הסיכום שבסוף פרק החתימה, והשלד עבר — הכותרת הייתה שם.
 *  ⛔ שלד שעובר על פרק חסר-תוכן נותן בדיוק את הביטחון השווא שכלל ברזל 8
 *  סעיף 6 אוסר.
 *
 *  לכן הפסקאות שהן **משותפות באמת** — אותן שש — מסומנות בשלושת הקבצים
 *  באותם סימוני `SHARED` של `CLAUDE.md`, ונאכפות ב-sha256 מלא. ⛔ לא
 *  בהשוואת כותרות ולא בספירת פסקאות (סבב 41) — שתיהן עוברות על פסקה
 *  שהוחלפה בפסקה אחרת באותו אורך.
 *
 *  ⚠️ **ומה שמחוץ לסימון נשאר פרטי, בכוונה** — כותרת הריפו, «הפעלה
 *  ראשונה», «מסכים», טבלת הטבלאות, אזהרת `CACHE_NAME`
 *  (שנבדלת פר-אפליקציה ונמדדה ככזו) ופרקי ה-smali. ⛔ אין להרחיב את
 *  הסימון לפסקה שאינה זהה בארבעתן בפועל — זה בדיוק כלל ברזל 8 סעיף 4,
 *  בציר אחר.                                                             */
/*  ⛔ הרשימה כתובה **בסדר הופעתם בקובץ** (סבב 71) — ⚠️ סעיף יב אוכף
 *  אותו, ⛔ ולכן סדר שגוי כאן הוא כישלון שער ולא עניין של נוחות. */
const CANON_MD = [
  ['README.md',          'readme-gate',           'fd4654765f8ed749'],
  ['README.md',          'readme-apk',            '54a69bee96c333bf'],
  ['CONTEXT.md',         'context-grant',         'f81b753212d412f0'],
  ['android/README.md',  'android-web-update',    'dbfd1b661d1b6b25'],
  ['android/README.md',  'android-origin-switch', '23ef212512bb2202'],
  ['android/README.md',  'android-icons',         '9824d699371d309a'],
  ['android/README.md',  'android-shell-split',   'a2508c6906d22ac5'],
  ['android/README.md',  'android-smali-scope',   'f09ccb513dc4b6df'],
  ['android/README.md',  'android-cache-apk',     '898e51f7bb6048db'],
];

/* סורק סימונים לקובץ md כלשהו — אותם כללים בדיוק של סעיף א. */
function scanShared(file) {
  const ls = fs.readFileSync(file, 'utf8').split('\n');
  const mask = fenceMask(ls);
  const out = [];
  let open = null, err = false;
  for (let i = 0; i < ls.length; i++) {
    if (mask[i]) { if (open) open.body.push(ls[i]); continue; }
    const l = ls[i];
    if (START_LOOSE.test(l)) {
      const m = START_RE.exec(l);
      if (!m || !m[1].trim()) { fail(`${file} שורה ${i + 1}: SHARED:start בלי id תקין — נמדד סימון ` +
          `בלי id והצפוי id="<שם>". מתקנים את הסימון`); err = true; continue; }
      if (open) { fail(`${file} שורה ${i + 1}: קינון SHARED אסור`); err = true; continue; }
      open = { id: m[1], from: i + 1, body: [] };
      continue;
    }
    if (END_RE.test(l)) {
      if (!open) { fail(`${file} שורה ${i + 1}: SHARED:end בלי start תואם`); err = true; continue; }
      out.push({ id: open.id, from: open.from, to: i + 1, body: open.body.join('\n').trim() });
      open = null;
      continue;
    }
    if (open) open.body.push(l);
  }
  if (open) { fail(`${file}: בלוק id="${open.id}" (שורה ${open.from}) לא נסגר — ` +
        `נמדד סמן פתיחה בלי סוגר. מוסיפים SHARED:end`); err = true; }
  return { blocks: out, err };
}

{
  const byFile = new Map();
  for (const [f, id, sha] of CANON_MD) {
    if (!byFile.has(f)) byFile.set(f, []);
    byFile.get(f).push([id, sha]);
  }
  for (const [file, want] of byFile) {
    if (!fs.existsSync(file)) continue;          // כבר דווח בסעיף ו
    const { blocks, err } = scanShared(file);
    const ids = blocks.map(b => b.id);
    const dup = ids.filter((id, k) => ids.indexOf(id) !== k);
    if (dup.length) fail(`${file}: מזהי SHARED כפולים — ${[...new Set(dup)].join(', ')}; ` +
        `הצפוי מזהה ייחודי. מעדכנים את השם הכפול`);
    const miss = want.map(w => w[0]).filter(id => !ids.includes(id));
    const extra = ids.filter(id => !want.some(w => w[0] === id));
    if (miss.length)  fail(`${file}: פסקאות משותפות חסרות — ${miss.join(', ')}. ` +
                           'נמדדו פסקאות חסרות והצפוי אפס. מוסיפים אותן מריפו אחות — ' +
        'פסקה משותפת שנמחקה היא בדיוק הסחיפה שסעיף ז בא לתפוס');
    if (extra.length) fail(`${file}: בלוקי SHARED שאינם ברשימה הקנונית — ${extra.join(', ')} ` +
                           `— נמדדו ${extra.length} מעבר לרשימה הקנונית. מוסיפים אותן ` +
        'לרשימה בארבעת עותקי הבדיקה, או מסירים אותן');
    let ok = !err && !miss.length && !extra.length && !dup.length;
    for (const [id, sha] of want) {
      const b = blocks.find(x => x.id === id);
      if (!b) continue;
      const got = crypto.createHash('sha256').update(b.body).digest('hex').slice(0, 16);
      if (got !== sha) {
        ok = false;
        fail(`${file} — פסקה "${id}" (שורות ${b.from}–${b.to}): אינה זהה לחתימה ` +
             `הקנונית — ${got} במקום ${sha}. שינוי בפסקה משותפת נעשה בארבעת ` +
             'הריפו ובארבעת עותקי הבדיקה, באותו סבב. מיישרים את הפסקה, ' +
        'או מעדכנים את החתימה');
      }
    }
    if (ok) pass(`${file} — ${want.length} הפסקאות המשותפות זהות לחתימה הקנונית`);
  }
}

/* ── ח. manifest.json — **ערכי** המפתחות המשותפים (סבב 44) ──────────────────
   ⚠️ עד הסבב הזה שום בודק לא נגע בתוכן של `manifest.json` — רק בקיומו
   (`check-structure.mjs`). ⛔ **וזו בדיוק צורת הכשל שאיפשרה לשני הבדלים
   לשרוד**: `display` היה `fullscreen` בהנהלה ו-`standalone` בשלוש,
   ו-`orientation` היה `portrait-primary` בגיוס ו-`portrait` בשלוש.
   ⚠️ **וזה אותו לקח של סבב 39 בציר אחר** — שם הושוו **שמות** הכותרות
   ולא תוכנן, וכאן הושווה **קיום** הקובץ ולא ערכיו.
   ⛔ מה שנשאר פרטי בכוונה, ואין להוסיף אותו לרשימה: `name` ·
   `short_name` · `description` · `icons` · `theme_color` ·
   `background_color` — זהות חזותית פר-אפליקציה. */
const CANON_MANIFEST = [
  ['display',     'standalone'],
  ['orientation', 'portrait'],
  ['lang',        'he'],
  ['dir',         'rtl'],
  /*  ⛔ `start_url` יחסי ⛔ ונפתר מול ה-`scope` של כל אפליקציה — ⚠️ ולכן
   *  «זהה» כאן פירושו **אותה צורה**, ⭐ וכל אפליקציה נפתרת לעצמה. */
  ['start_url',   './index.html'],
];

/*  ⛔ `id` ו-`scope` **ייחודיים** לכל אפליקציה ⛔ ואינם שדות משותפים —
 *  ⚠️ ערך יחסי כמו `./` נפתר לכתובת מוחלטת, ⭐ ובארבעתן זה אותו origin
 *  בדיוק: הדפדפן ראה בהן אפליקציה **אחת**, והתקנה של אחת החליפה את
 *  האחרת במסך הבית. ⛔ והרישום מחזיק את ארבעתן ⛔ ולא את המקומית בלבד —
 *  ⚠️ שער שרואה ערך אחד אינו יכול למדוד ייחודיות. */
const CANON_APP_ID = [
  ['yoman-avoda',      '/yoman-avoda/'],
  ['hanhala-ruchanit', '/hanhala-ruchanit/'],
  ['schar-limud',      '/schar-limud/'],
  ['gius',             '/gius/'],
];
{
  const file = 'manifest.json';
  if (!fs.existsSync(file)) {
    fail('manifest.json חסר — נמדדו 0 עותקים והצפוי אחד. ' +
         'מוסיפים אותו מריפו אחות');
  } else {
    let mf = null;
    try { mf = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { fail(`manifest.json אינו JSON תקין — נמדד «${e.message}» והצפוי ` +
      `פרסור שעובר. מתקנים את הקובץ`); }
    if (mf) {
      let ok = true;
      for (const [key, want] of CANON_MANIFEST) {
        if (!(key in mf)) {
          ok = false;
          fail(`manifest.json: המפתח המשותף "${key}" חסר — נמדד היעדר והצפוי ` +
          `«${want}». מוסיפים אותו`);
        } else if (mf[key] !== want) {
          ok = false;
          fail(`manifest.json: "${key}" הוא «${mf[key]}» במקום «${want}». ` +
               'מיישרים את הערך — ערך משותף משתנה בארבעת הריפו ובארבעת ' +
          'עותקי הבדיקה, באותו סבב');
        }
      }
      if (ok) pass(`manifest.json — ${CANON_MANIFEST.length} ערכי המפתחות המשותפים תואמים`);
      /*  ⛔ הייחודיות נמדדת ⛔ ולא ההתאמה בלבד — ⚠️ רישום שכל ערכיו זהים
       *  היה עובר את ההתאמה, ⭐ והוא בדיוק הכשל שנמדד: ארבעה `"./"`. */
      const idVals = CANON_APP_ID.map(([, v]) => v);
      if (new Set(idVals).size !== CANON_APP_ID.length)
        fail(`CANON_APP_ID: נמדדו ${new Set(idVals).size} מזהים שונים והצפוי ` +
             `${CANON_APP_ID.length}. מעדכנים את הרישום כך שלכל אפליקציה ערך משלה — מזהה ` +
             'משותף מאחד את ארבעתן לאפליקציה אחת בדפדפן');
      else pass(`CANON_APP_ID — ${CANON_APP_ID.length} מזהים, וכולם שונים זה מזה`);
      const wantId = (CANON_APP_ID.find(([a]) => a === APP.app) || [])[1];
      if (!wantId)
        fail(`CANON_APP_ID: «${APP.app}» אינו ברישום — נמדד היעדר והצפוי ערך. ` +
             'מוסיפים לו שורה ברישום, בארבעת עותקי הבודק');
      else for (const key of ['id', 'scope']) {
        if (mf[key] !== wantId)
          fail(`manifest.json: "${key}" הוא «${mf[key]}» במקום «${wantId}». ` +
               'מיישרים אותו לערך שברישום — ערך שאינו ייחודי מאחד את ' +
               'ההתקנות לאפליקציה אחת');
        else pass(`manifest.json: "${key}" = «${wantId}» — ייחודי ל-${APP.app}`);
      }
      /*  ⭐ שכבת האייקונים במניפסט (כלל ברזל 25, סבב 67) — ⛔ שלושה
       *  אייקונים מוצהרים, ⛔ ואייקון מלא אינו נושא `maskable`.
       *  ⚠️ **נמדד ולא הוצהר:** ביומן שני האייקונים המלאים הוכרזו
       *  `"any maskable"`, כלומר הלאנצ'ר חתך אותם בעיגול, ⛔ והקובץ
       *  `icon-maskable-512.png` — שקיים בארבעתן מסבב 46 — לא הופיע
       *  שם כלל. ⛔ ו-`src` שאינו מצביע על קובץ קיים הוא 404 שקט:
       *  ההתקנה מצליחה, והאייקון פשוט אינו מופיע. */
      const icons = Array.isArray(mf.icons) ? mf.icons : [];
      /*  ⛔ שישה ולא שלושה (סבב 72) — ⚠️ נמדד: שלושת החסרים הוצהרו
       *  באפליקציה אחת בלבד, ⭐ והם מה שהדפדפן מציג בלשונית ומה שאייפון
       *  משתמש בו במסך הבית. ⛔ והרשימה **שמית** ולא מנייה: ⚠️ «שישה
       *  אייקונים» היה מאושר גם על שישה עותקים של אותו נכס. */
      const CANON_ICONS = [
        ['icons/favicon-16.png',        '16x16',   null],
        ['icons/favicon-32.png',        '32x32',   null],
        ['icons/icon-192.png',          '192x192', 'any'],
        ['icons/icon-512.png',          '512x512', 'any'],
        ['icons/icon-maskable-512.png', '512x512', 'maskable'],
        ['icons/apple-touch-icon.png',  '180x180', null],
      ];
      let iok = true;
      for (const [src, sizes, purpose] of CANON_ICONS) {
        const e = icons.find((i) => i && i.src === src);
        if (!e) { iok = false; fail(`manifest.json: האייקון "${src}" אינו מוצהר — נמדד היעדר ` +
        `והצפוי הצהרה. מוסיפים אותו לרשימה`); continue; }
        if (e.sizes !== sizes) {
          iok = false;
          fail(`manifest.json: "${src}" מוצהר ${e.sizes} במקום ${sizes} — ` +
        `מעדכנים את השדה`);
        }
        /*  ⚠️ `null` בטבלה = «אין `purpose`» (סבב 72) — ⛔ ולא «any»:
            favicon ואייקון אייפון אינם נכסי PWA, ⭐ והצהרת `purpose`
            עליהם הייתה מכריזה אותם כמועמדים למסך הבית. */
        if (purpose === null ? 'purpose' in e : (e.purpose || 'any') !== purpose) {
          iok = false;
          fail(`manifest.json: "${src}" מוצהר purpose="${e.purpose}" במקום "${purpose}" — ` +
               'אייקון מלא אינו maskable (כלל ברזל 25); "any maskable" הוא מה שגרם ' +
               'לקרניים להיחתך בעיגול הלאנצ\'ר. מעדכנים את השדה');
        }
      }
      for (const i of icons) {
        if (!i || !i.src) continue;
        if (!fs.existsSync(i.src)) {
          iok = false;
          fail(`manifest.json: "${i.src}" מוצהר אך אינו קיים בריפו — נמדד ` +
        `היעדר בעץ, 404 שקט. מוסיפים את הנכס, או מסירים את ההצהרה`);
        }
      }
      if (iok) pass(`manifest.json — שלושת האייקונים הקנוניים מוצהרים, וכל src מצביע על קובץ קיים`);
    }
  }
}

/* ────── ט. תקציב התיעוד — חלון של שני סבבים ותקרה של 700 שורות (סבב 71) ────
   ⚠️ **תשעה סשנים נחנקו בשבוע אחד**, ונמדד ש-`CLAUDE.md` תפח מ-1,782
   שורות (אחרי הגיזום של סבב 34) ל-4,447 — ⛔ מפני שכל סבב מוסיף פרק ואף
   סבב אינו מוחק אחד. כלל ברזל 18 קובע שני תנאים: **חלון של שני פרקי
   סבבים** ו**תקרה קשיחה גלובלית**; סבב שלישי נכנס ⇒ הראשון נמחק
   באותו קומיט, וסבב שחוצה את התקרה גוזם באותו קומיט.
   ⭐ **החלון הודק משישה לשניים בסבב 50** — git מחזיק את ההיסטוריה,
   ו-`CLAUDE.md` מחזיק ⛔ הוראות לעתיד בלבד.
   ⚠️ פרק סבב הוא כותרת `## ` שנפתחת ב«סבב N» (עם ⭐ או בלי), והוא נגמר
   בכותרת `## ` הבאה. ⛔ כותרת שבתוך גדר קוד אינה נספרת — אחרת דוגמה
   בתיעוד הייתה נקראת כפרק אמיתי, בדיוק כמו בסעיף א.
   ⛔ **והמדידה היא על הקובץ ולא על הצהרה** (סבב 49) — פרק «פערים
   פתוחים» לימד שתיעוד שאיש אינו מודד ממשיך לתאר עולם שהשתנה. */
const DOC_MAX_LINES  = 700;
const DOC_MAX_ROUNDS = 2;
/*  ⛔ תקרה **לכל פרק סבב בנפרד** (סבב 72) — ⚠️ עד כאן נספרו הפרקים ולא
 *  נמדד אורכם, ⛔ ולכן שני פרקים בני 75 ו-108 שורות עברו. ⭐ הכלל «אין
 *  היסטוריה בקבצי התיעוד» אמר «עד עשר שורות לפרק» מסבב 70, ⛔ ואיש לא
 *  אכף אותו: probe שמאמת ערך אחד מתוך שניים מאשר את השני. */
const DOC_MAX_ROUND_LINES = 10;
/*  ⛔ תקרת החלק המשותף (סבב 69) — ⚠️ בלעדיה ארבעת בלוקי הכללים גדלים
 *  בלי גבול, והתקרה הכוללת נבלעת בהם.
 *  ⛔ **הסף בשער 403** — ⚠️ שלוש שורות מרווח למוטציית-הנגד: ⭐ התקרה
 *  לכללים היא **400**, ⛔ ומוטציית-הנגד שמוכיחה שהשער מודד סף ואינו
 *  נופל על כל תוספת מוסיפה שלוש שורות משותפות ⛔ ואסור לה להפיל.
 *  ⚠️ סף 400 היה הופך את 400 עצמו לבלתי-ניתן לכתיבה, ⭐ ושני מספרים
 *  מוצהרים עדיפים על תקרה שנגזמת בשקט ל-397. */
const DOC_MAX_SHARED = 403;
/*  ⛔ תקרות שלושת הקבצים הנלווים, ⛔ ותקרה נפרדת לכל חלק (סבב 71) —
 *  ⚠️ תקרה על הקובץ בלבד נבלעת: החלק המשותף גדל, החלק הפרטי מצטמצם,
 *  ⛔ והסכום אינו זז. ⭐ הרף לכל חלק **נמדד** ולא שוער: החלק המשותף
 *  הוא בדיוק מה שיש (12 · 13 · 85 שורות, זהות בית-לבית בארבעתן), והחלק
 *  הפרטי הוא הגבוה שנמדד בארבעתן ועוד מרווח קטן.
 *  ⛔ ומסבב 72 התקרות הן **מספרים עגולים שנקבעו בהכרעה** — ⚠️ ולא המצב
 *  הנמדד ועוד מרווח: תקרה צמודה חוסמת עבודה לגיטימית, ⛔ ורופפת אינה
 *  כופה גיזום. ⭐ וסכום שני החלקים שווה לתקרת הקובץ. */
const MD_MAX = { 'README.md': 70, 'CONTEXT.md': 70, 'android/README.md': 300 };
/*  ⚠️ `[משותף, פרטי]` — ⛔ שני הרפים נאכפים בנפרד (סבב 71), ⛔ ולא סכומם.
 *  ⚠️ ולכל רף מרווח של ארבע שורות מעל הגבוה שנמדד, ⛔ ולא אפס: שערי
 *  המוטציה מוסיפים שורות לעותק, ⛔ ורף צמוד היה מפיל אותם על התקרה
 *  במקום על התנאי שהם באים לבדוק. */
const MD_SPLIT = {
  'README.md':        [20, 50],
  'CONTEXT.md':       [20, 50],
  'android/README.md': [150, 150],
};
/*  ⛔ סכום שני החלקים = תקרת הקובץ (סבב 72) — ⚠️ שתי תקרות שסכומן נמוך
 *  מהתקרה הכוללת יוצרות תקרה סמויה שלישית, ⛔ ואז «מתחת לתקרה» נמדד מול
 *  מספר שאיש לא הכריע עליו. */
for (const [f, cap] of Object.entries(MD_MAX)) {
  const [s0, p0] = MD_SPLIT[f];
  if (s0 + p0 !== cap)
    fail(`${f}: תקרות החלקים — נמדד ${s0}+${p0}=${s0 + p0} והצפוי ${cap}. ` +
         'מיישרים את שלושת המספרים באותה הכרעה');
}

const ROUND_H2 = /^##\s+(?:⭐\s+)?סבב\s/;
{
  const rounds = [];
  /*  ⚠️ אורך הפרק נמדד מהכותרת ועד השורה שלפני ה-`##` הבא, ⛔ בלי שורות
   *  ריקות בסופו (סבב 72) — שורה ריקה אינה תוכן, ואין להעניש עליה. */
  let openRound = -1;
  const closeRound = (end) => {
    if (openRound < 0) return;
    let e = end;
    while (e > openRound && !lines[e - 1].trim()) e--;
    rounds[rounds.length - 1].lines = e - openRound;
    openRound = -1;
  };
  for (let i = 0; i < lines.length; i++) {
    if (inFence[i]) continue;
    if (!/^##\s/.test(lines[i])) continue;
    closeRound(i);
    if (ROUND_H2.test(lines[i])) {
      rounds.push({ name: lines[i].replace(/^##\s+/, '').trim(), lines: 0 });
      openRound = i;
    }
  }
  closeRound(lines.length);
  const tooLong = rounds.filter((r) => r.lines > DOC_MAX_ROUND_LINES);
  if (tooLong.length) {
    fail(`${APP.file}: פרק סבב ארוך מ-${DOC_MAX_ROUND_LINES} שורות — ` +
         tooLong.map((r) => `«${r.name}» נמדד ${r.lines}`).join(' · ') +
         '. גוזמים באותו קומיט: מה נעשה, ומה לא הגיע ליעד — ' +
         'ומה שראוי להישמר עולה לכלל, לטבלה או להערה בקוד');
  } else if (rounds.length) {
    pass(`תקציב התיעוד — פרקי הסבבים ${rounds.map((r) => r.lines).join(' · ')}` +
         `/${DOC_MAX_ROUND_LINES} שורות`);
  }
  if (rounds.length > DOC_MAX_ROUNDS) {
    const over = rounds.slice(0, rounds.length - DOC_MAX_ROUNDS).map((r) => r.name);
    fail(`${APP.file}: ${rounds.length} פרקי סבבים, והחלון הוא ${DOC_MAX_ROUNDS} ` +
         `והצפוי ${DOC_MAX_ROUNDS}. יש למחוק באותו קומיט — הישנים ` +
         `ראשונים: ${over.join(' · ')}`);
  } else {
    pass(`תקציב התיעוד — ${rounds.length}/${DOC_MAX_ROUNDS} פרקי סבבים`);
  }
  const n = src.endsWith('\n') ? lines.length - 1 : lines.length;
  if (n > DOC_MAX_LINES) {
    fail(`${APP.file}: נמדדו ${n} שורות — ${n - DOC_MAX_LINES} מעל התקרה של ${DOC_MAX_LINES} ` +
         '— גוזמים פרקי סבבים באותו קומיט');
  } else {
    pass(`תקציב התיעוד — ${n}/${DOC_MAX_LINES} שורות`);
  }
}

/* ── ⭐ תקרת התוכן הפרטי-הקבוע — 900 שורות (סבב 50) ──────────────────────────
   ⚠️ החלון של שני הסבבים והתקרה הגלובלית אינם מספיקים לבדם: שניהם מודדים
   את הקובץ **כולו**, ולכן תפיחה של החלק הפרטי — מה שאינו בלוק `SHARED`
   ואינו פרק סבב — נבלעת בהם ואינה נראית עד שהיא חוצה את התקרה הגלובלית.
   ⛔ והחלק הפרטי הוא בדיוק מה ששום ריפו אחר אינו מיישר, כלומר החלק
   שאיש אינו מודד מלבד השער הזה.
   ⚠️ **המדידה מודעת לגדרות קוד** (`inFence`), בדיוק כמו ספירת פרקי
   הסבבים — ⛔ סמן `SHARED` או כותרת `## סבב` שבתוך דוגמה בתיעוד אינם
   אזור אמיתי, וספירה גולמית הייתה מדווחת מספר שגוי **בשקט**. */
const DOC_MAX_PRIVATE = 300;
{
  const total = src.endsWith('\n') ? lines.length - 1 : lines.length;
  const kind  = new Array(total).fill(0);          // 0 = פרטי · 1 = משותף · 2 = פרק סבב
  for (const b of found)
    for (let i = b.from - 1; i <= b.to - 1 && i < total; i++) kind[i] = 1;
  let head = -1;
  for (let i = 0; i < total; i++) {
    if (inFence[i] || !/^##\s/.test(lines[i])) continue;
    if (head >= 0) { for (let j = head; j < i; j++) if (!kind[j]) kind[j] = 2; head = -1; }
    if (ROUND_H2.test(lines[i])) head = i;
  }
  if (head >= 0) for (let j = head; j < total; j++) if (!kind[j]) kind[j] = 2;
  /*  ⛔ הפרטי הוא כל מה שאינו בבלוק משותף (סבב 69) — ⚠️ פרקי הסבבים
   *  נספרים בו: הם מס הקשר על כל סשן בדיוק כמו כל שורה אחרת. */
  const priv = kind.filter(k => k !== 1).length;
  const shared = kind.filter(k => k === 1).length;
  if (shared > DOC_MAX_SHARED) {
    fail(`${APP.file}: החלק המשותף נמדד ${shared} שורות — ${shared - DOC_MAX_SHARED} ` +
         `מעל התקרה של ${DOC_MAX_SHARED}. גוזמים פרוזה משותפת באותו קומיט`);
  } else {
    pass(`תקציב התיעוד — ${shared}/${DOC_MAX_SHARED} שורות בחלק המשותף`);
  }
  for (const [f, cap] of Object.entries(MD_MAX)) {
    if (!fs.existsSync(f)) { fail(`${f} חסר — נמדדו 0 עותקים והצפוי אחד. מוסיפים אותו מריפו אחות`); continue; }
    const t = fs.readFileSync(f, 'utf8').split('\n');
    const n = t[t.length - 1] === '' ? t.length - 1 : t.length;
    if (n > cap) fail(`${f}: נמדדו ${n} שורות — ${n - cap} מעל התקרה של ${cap}. גוזמים באותו קומיט`);
    else pass(`תקציב התיעוד — ${f}: ${n}/${cap} שורות`);
    /*  ⛔ הפיצול נמדד באותה מסכת גדרות-קוד (סבב 71) — ⚠️ סמן SHARED
     *  שבתוך דוגמה אינו בלוק אמיתי, ⛔ וספירה גולמית הייתה מדווחת
     *  מספר שגוי בשקט. */
    const [capS, capP] = MD_SPLIT[f];
    const ls = t.slice(0, n), mk = fenceMask(ls);
    let sh = 0, open = -1;
    for (let i = 0; i < n; i++) {
      if (mk[i]) continue;
      if (START_LOOSE.test(ls[i])) open = i;
      else if (END_RE.test(ls[i]) && open >= 0) { sh += i - open + 1; open = -1; }
    }
    const pv = n - sh;
    if (sh > capS) fail(`${f}: החלק המשותף נמדד ${sh} שורות — ${sh - capS} מעל התקרה של ` +
        `${capS}. גוזמים באותו קומיט`);
    else if (pv > capP) fail(`${f}: החלק הפרטי נמדד ${pv} שורות — ${pv - capP} מעל התקרה של ` +
        `${capP}. גוזמים באותו קומיט`);
    else pass(`תקציב התיעוד — ${f}: ${sh}/${capS} משותף · ${pv}/${capP} פרטי`);
  }
  if (priv > DOC_MAX_PRIVATE) {
    fail(`${APP.file}: החלק הפרטי-הקבוע נמדד ${priv} שורות — ${priv - DOC_MAX_PRIVATE} ` +
         `מעל התקרה של ${DOC_MAX_PRIVATE} (כלל ברזל 18). גוזמים באותו קומיט, ` +
         'ולקח שראוי להישמר עולה לכלל ברזל או להערה בקוד לפני המחיקה.');
  } else {
    pass(`תקציב התיעוד — ${priv}/${DOC_MAX_PRIVATE} שורות בחלק הפרטי-הקבוע`);
  }
}

/* ────── י. תוכן שני חלקי CLAUDE.md — כל חלק לפי הגדרתו (סבב 71) ────────────
   ⛔ עד כאן נאכף **כמה** יש בכל חלק ⛔ ולא **מה** יש בו: החלק המשותף היה
   יכול להחזיק פרק אפליקציה, והחלק הפרטי פרק כללים, ⚠️ והתקרות היו עוברות.
   ⭐ ההגדרה: המשותף = כללים והטבלה · הפרטי = מסכים ולוגיקה של האפליקציה,
   ולצידם חלון פרקי הסבבים. ⛔ הבדיקה היא על **כותרות `##`**, שהן חלוקת
   הקובץ בפועל. */
{
  const SCREENS = /^##\s+מסכים ולוגיקה\s+—\s+\S/;
  const priv = [], shrd = [];
  for (let i = 0; i < lines.length; i++) {
    if (inFence[i] || !/^##\s/.test(lines[i])) continue;
    (found.some((b) => i + 1 > b.from && i + 1 < b.to) ? shrd : priv).push(lines[i].trim());
  }
  /*  ⛔ בחלק המשותף אין כותרת `##` כלל (סבב 71) — ⚠️ ארבעת הבלוקים נפתחים
   *  ב-`## ⭐` שהוא כותרת הפרק עצמו, ⛔ וכל `##` נוסף בתוכם הוא פרק שנשתל
   *  בטעות בבלוק שהחתימה נועלת. */
  const alien = shrd.filter((h) => SCREENS.test(h) || ROUND_H2.test(h));
  if (alien.length) fail(`${APP.file}: פרק אפליקציה בתוך בלוק משותף — נמדדו ` +
      `${alien.length} (${alien.join(' · ')}) והצפוי אפס. מעבירים אותם לחלק הפרטי`);
  else pass(`תוכן החלק המשותף — ${found.length} בלוקים, ואין בהם פרק אפליקציה`);

  const screens = priv.filter((h) => SCREENS.test(h));
  const rounds  = priv.filter((h) => ROUND_H2.test(h));
  const other   = priv.filter((h) => !SCREENS.test(h) && !ROUND_H2.test(h));
  if (screens.length !== 1)
    fail(`${APP.file}: נמדדו ${screens.length} פרקי «מסכים ולוגיקה» ` +
      `בחלק הפרטי והצפוי אחד. ממזגים אותם, או מסירים את העודפים`);
  else if (other.length)
    fail(`${APP.file}: פרק בחלק הפרטי שאינו מסכים ולוגיקה ואינו פרק סבב — ` +
      `נמדדו ${other.length} (${other.join(' · ')}) והצפוי אפס. ממזגים אותם ` +
      `לתוך «מסכים ולוגיקה», או מסירים אותם`);
  else pass(`תוכן החלק הפרטי — «${screens[0].replace(/^##\s+/, '')}» ו-${rounds.length} פרקי סבבים`);
}

/* ────── יא. פרק מתחום של קובץ אחר (סבב 71) ─────────────────────────────────
   ⛔ הבדיקה היא **שלילית** ⛔ ולא רשימת-היתר: ⚠️ רשימה חיובית של הכותרות
   המותרות הייתה מוכתבת מהמצב הקיים ומברכת עליו, ⛔ ובכל אפליקציה בנוסח
   אחר. ⭐ מה שכן ניתן לומר בוודאות הוא מה **אסור** להיות כאן: פרק שהוא
   בהגדרתו של קובץ אחר. ⚠️ פרק סבב אינו נבדק ב-`android/README` בלבד —
   ⛔ חלון הסבבים הוא של `CLAUDE.md`, ⛔ ופרק סבב בכל קובץ אחר הוא היסטוריה
   שאיש אינו גוזם. */
{
  const FOREIGN = {
    'README.md':         [[ROUND_H2, 'פרק סבב'], [/^##\s+⭐?\s*טבלת התשתית/, 'טבלת התשתית']],
    'CONTEXT.md':        [[ROUND_H2, 'פרק סבב'], [/^##\s+Build\b/i, 'בנייה'],
                          [/^##\s+הפעלה ראשונה/, 'הפעלה ראשונה']],
    'android/README.md': [[ROUND_H2, 'פרק סבב'], [/^##\s+הפעלה ראשונה/, 'הפעלה ראשונה'],
                          [/^##\s+מסכים/, 'מסכים'], [/^##\s+⭐?\s*טבלת התשתית/, 'טבלת התשתית']],
  };
  for (const [f, rules] of Object.entries(FOREIGN)) {
    if (!fs.existsSync(f)) continue;
    const ls = fs.readFileSync(f, 'utf8').split('\n'), mk = fenceMask(ls);
    const hits = [];
    for (let i = 0; i < ls.length; i++) {
      if (mk[i] || !/^##\s/.test(ls[i])) continue;
      for (const [re, what] of rules) if (re.test(ls[i])) hits.push(`שורה ${i + 1}: ${what}`);
    }
    if (hits.length) fail(`${f}: פרק מתחום של קובץ אחר — נמדדו ${hits.length} ` +
      `(${hits.join(' · ')}) והצפוי אפס. מעבירים אותם לקובץ שתחומו`);
    else pass(`תוכן ${f} — אין בו פרק מתחום של קובץ אחר`);
  }
}

/* ────── יב. סדר הבלוקים (סבב 71; ⛔ פרקי הכללים ירדו בסבב 96) ───────────────
   ⛔ **סדר הבלוקים נאכף מול הרשימה הקנונית** — ⚠️ הרשימה זהה בארבעת
   עותקי השער, ⛔ ולכן סדר שנשמר מולה הוא סדר אחיד בארבעת הריפו: זו
   הדרך היחידה לאכוף אחידות בין ריפו מתוך ריפו אחד.
   ⛔ **ואין כאן יותר «מבנה פרק הכלל»** — ⚠️ אין פרקי כללים: ⭐ הטבלה היא
   ההוראה, ⛔ וניסוחה נמדד ב-`sha256` של הבלוק היחיד. */
{
  const ids = found.map((b) => b.id).join(',');
  const want = CANON.map((c) => c[0]).join(',');
  if (ids !== want) fail(`${APP.file}: סדר הבלוקים — נמדד [${ids}] במקום הסדר הקנוני [${want}]. ` +
      `מעדכנים את הסדר`);
  else pass(`סדר הבלוקים ב-${APP.file} — ${found.length} בלוקים בסדר הקנוני`);

  for (const f of [...new Set(CANON_MD.map((c) => c[0]))]) {
    if (!fs.existsSync(f)) continue;
    const got = scanShared(f).blocks.map((b) => b.id).join(',');
    const exp = CANON_MD.filter((c) => c[0] === f).map((c) => c[1]).join(',');
    if (got !== exp) fail(`${f}: סדר הבלוקים — נמדד [${got}] במקום הסדר הקנוני [${exp}]. מעדכנים את הסדר`);
    else pass(`סדר הבלוקים ב-${f} — ${exp.split(',').length} בלוקים בסדר הקנוני`);
  }

  /*  ⛔ **ואין `###` בתוך הבלוק המשותף** (סבב 96) — ⚠️ הבלוק מחזיק את
   *  הטבלה בלבד: ⭐ פרק שיוחזר לתוכו הוא מקור אמת שני להוראה, ⛔ ופרוזה
   *  משותפת שאיש אינו מודד חוזרת תוך סבבים ספורים. */
  let stray = 0, open = null;
  for (let i = 0; i < lines.length; i++) {
    if (inFence[i]) continue;
    const st = START_RE.exec(lines[i]);
    if (st) { open = st[1]; continue; }
    if (END_RE.test(lines[i])) { open = null; continue; }
    if (open && /^###\s+\S/.test(lines[i])) stray++;
  }
  if (stray) fail(`${APP.file}: נמדדו ${stray} פרקי `+'`###`'+` בתוך הבלוק המשותף והצפוי אפס — ` +
    `הבלוק מחזיק את הטבלה בלבד. מעבירים את הפרק לחלק הפרטי, או לשורה בטבלה`);
  else pass(`הבלוק המשותף — אין בו פרק `+'`###`'+`, והטבלה היא ההוראה היחידה שבו`);
}

console.log(failures ? `\n❌ בדיקת התיעוד נכשלה (${failures})` : '\n✅ בדיקת התיעוד עברה');
/*  ⛔ יציאה רק בתהליך משלו (סבב 72) — ⚠️ שער שמריץ את הבודק עשרות פעמים
 *  מייבא אותו לתהליך אחד, ו-`process.exit` היה עוצר את השער עצמו באמצע.
 *  ⭐ מונה הכשלים מיוצא, וזה מה שהמייבא בודק. */
export const docFailures = failures;
if (!process.env.DOCS_INPROC) process.exit(failures ? 1 : 0);
