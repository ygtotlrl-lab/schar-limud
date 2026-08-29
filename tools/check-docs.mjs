#!/usr/bin/env node
/*  בדיקת אחידות התיעוד — סבב 18, הורחבה בסבב 20.
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
 *    ט. (סבב 49) `CLAUDE.md` מחזיק יותר משישה פרקי סבבים, או יותר
 *       מהתקרה הגלובלית — תקציב התיעוד של כלל ברזל 18.
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

/* הרשימה הקנונית — מזהה ← חתימת sha256 (16 תווים) של תוכן הבלוק, מקוצץ. */
const CANON = [
  ['rules-table',   'a9d15dbb6ba8919e'],
  ['rules-enforce', '610ca38f7f798896'],
  ['rules-writing', '72e55e1b7a4d66f3'],
  ['rules-session', 'e28b6fcfd5df4fac'],
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
  process.exit(1);
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
    fail('שורת «עודכן לאחרונה» חסרה. הפורמט: «עודכן לאחרונה: סבב N · YYYY-MM-DD»');
  } else if (hits.length > 1) {
    fail(`שורת «עודכן לאחרונה» מופיעה ${hits.length} פעמים (שורות ${hits.map(i => i + 1).join(', ')}) — צריכה להיות אחת`);
  } else {
    const i = hits[0];
    const m = STAMP_RE.exec(lines[i]);
    if (!m) fail(`שורת «עודכן לאחרונה» בפורמט שגוי (שורה ${i + 1}): «${lines[i]}». ` +
                 'הפורמט המדויק: «עודכן לאחרונה: סבב N · YYYY-MM-DD»');
    else if (i > 5) fail(`שורת «עודכן לאחרונה» יושבת בשורה ${i + 1} — היא חייבת להיות בראש הקובץ`);
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
      fail(`שורה ${i + 1}: סימון SHARED:start בלי id תקין — «${l.trim()}»`);
      markerError = true; continue;
    }
    if (open) {
      fail(`שורה ${i + 1}: SHARED:start id="${m[1]}" בתוך בלוק פתוח id="${open.id}" — קינון אסור`);
      markerError = true; continue;
    }
    open = { id: m[1], from: i + 1, body: [] };
    continue;
  }
  if (END_RE.test(l)) {
    if (!open) { fail(`שורה ${i + 1}: SHARED:end בלי start תואם`); markerError = true; continue; }
    found.push({ id: open.id, from: open.from, to: i + 1, body: open.body.join('\n').trim() });
    open = null;
    continue;
  }
  if (open) open.body.push(l);
}
if (open) { fail(`בלוק id="${open.id}" (שורה ${open.from}) לא נסגר ב-SHARED:end`); markerError = true; }

const dup = found.map(b => b.id).filter((id, k, arr) => arr.indexOf(id) !== k);
if (dup.length) { fail('מזהי SHARED כפולים: ' + [...new Set(dup)].join(', ')); markerError = true; }

const canonIds = CANON.map(c => c[0]);
const foundIds = found.map(b => b.id);
const missing = canonIds.filter(id => !foundIds.includes(id));
const extra   = foundIds.filter(id => !canonIds.includes(id));
if (missing.length) fail('בלוקים משותפים חסרים מהקובץ: ' + missing.join(', '));
if (extra.length)   fail('בלוקים משותפים שאינם ברשימה הקנונית: ' + extra.join(', ') +
                         ' — פרק משותף חדש מחייב עדכון של ארבעת עותקי הבדיקה');
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
         `ובארבעת עותקי הבדיקה, באותו סבב.`);
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
             `הוא פרטי בהגדרה (כלל ברזל 8, סעיף 5) — לכל אפליקציה תוכן משלה.`);
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
             'מקדם את שורת «עודכן לאחרונה», גם סבב שנגע רק בקובץ אחד.');
      } else if (here !== null) {
        pass(`שורת העדכון קודמה מול origin/main: «${there}» ← «${here}»`);
      }
      /* here === null כבר דווח בסעיף ג — אין טעם לדווח פעמיים. */
    }
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
  { file: 'android/README.md', need: [
      [/^##\s+Why WebView and never a TWA\s*$/,       '## Why WebView and never a TWA'],
      [/^##\s+מה בפנים\s*$/,                          '## מה בפנים'],
      [/^##\s+.*גשר/,                                  '## …גשר… (הגשר המקורי / אין גשר שיתוף)'],
      [/^##\s+למה אין נכסים מוטבעים\s*$/,             '## למה אין נכסים מוטבעים'],
      [/^##\s+.*מעבר-origin חד-פעמי/,                  '## ⚠️ מעבר-origin חד-פעמי — ולפני כל הפצת APK'],
      [/^##\s+אייקונים\s*$/,                           '## אייקונים'],
      [/^##\s+Build\s*$/,                              '## Build'],
      [/^##\s+Sign with the PERMANENT key/,            '## Sign with the PERMANENT key …'],
      [/^##\s+תיקון URL ב-APK/,                        '## תיקון URL ב-APK … — smali בלבד'],
    ] },
];

for (const spec of MD_SKELETONS) {
  if (!fs.existsSync(spec.file)) { fail(`${spec.file} חסר — שלושת קובצי ה-md הנלווים חובה בארבעת הריפו`); continue; }
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
           ' — שלד הקובץ נקבע בסבב 39 והוא זהה בארבעת הריפו.');
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
  ['README.md',         'readme-gate',           'fd4654765f8ed749'],
  ['README.md',         'readme-apk',            '54a69bee96c333bf'],
  ['CONTEXT.md',        'context-grant',         'f81b753212d412f0'],
  ['android/README.md', 'android-why-twa',       '253ef8b2c0658ef0'],
  ['android/README.md', 'android-web-update',    'dbfd1b661d1b6b25'],
  ['android/README.md', 'android-origin-switch', '23ef212512bb2202'],
  ['android/README.md', 'android-icons',         '9824d699371d309a'],
  ['android/README.md', 'android-shell-split',   'a2508c6906d22ac5'],
  ['android/README.md', 'android-smali-scope',   '809e7e9d32b16ee6'],
  ['android/README.md', 'android-cache-apk',     '898e51f7bb6048db'],
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
      if (!m || !m[1].trim()) { fail(`${file} שורה ${i + 1}: SHARED:start בלי id תקין`); err = true; continue; }
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
  if (open) { fail(`${file}: בלוק id="${open.id}" (שורה ${open.from}) לא נסגר`); err = true; }
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
    if (dup.length) fail(`${file}: מזהי SHARED כפולים — ${[...new Set(dup)].join(', ')}`);
    const miss = want.map(w => w[0]).filter(id => !ids.includes(id));
    const extra = ids.filter(id => !want.some(w => w[0] === id));
    if (miss.length)  fail(`${file}: פסקאות משותפות חסרות — ${miss.join(', ')}. ` +
                           'פסקה משותפת שנמחקה היא בדיוק הסחיפה שסעיף ז בא לתפוס.');
    if (extra.length) fail(`${file}: בלוקי SHARED שאינם ברשימה הקנונית — ${extra.join(', ')} ` +
                           '— פסקה משותפת חדשה מחייבת עדכון של ארבעת עותקי הבדיקה');
    let ok = !err && !miss.length && !extra.length && !dup.length;
    for (const [id, sha] of want) {
      const b = blocks.find(x => x.id === id);
      if (!b) continue;
      const got = crypto.createHash('sha256').update(b.body).digest('hex').slice(0, 16);
      if (got !== sha) {
        ok = false;
        fail(`${file} — פסקה "${id}" (שורות ${b.from}–${b.to}): אינה זהה לחתימה ` +
             `הקנונית — ${got} במקום ${sha}. שינוי בפסקה משותפת נעשה בארבעת ` +
             'הריפו ובארבעת עותקי הבדיקה, באותו סבב.');
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
   `short_name` · `description` · `start_url` · `scope` · `icons` ·
   `theme_color` · `background_color` — זהות חזותית פר-אפליקציה.
   ⚠️ `start_url` פרטי **גם מטעם שני**: ב-gius הוא `./` ובשלוש
   `./index.html`, וה-id המשתמע נגזר ממנו; יישור שלו היה הופך אפליקציה
   **מותקנת** לאפליקציה זרה (סבב 39). */
const CANON_MANIFEST = [
  ['display',     'standalone'],
  ['orientation', 'portrait'],
  ['lang',        'he'],
  ['dir',         'rtl'],
];
{
  const file = 'manifest.json';
  if (!fs.existsSync(file)) {
    fail('manifest.json חסר — הוא בסט הקנוני של check-structure');
  } else {
    let mf = null;
    try { mf = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { fail(`manifest.json אינו JSON תקין — ${e.message}`); }
    if (mf) {
      let ok = true;
      for (const [key, want] of CANON_MANIFEST) {
        if (!(key in mf)) {
          ok = false;
          fail(`manifest.json: המפתח המשותף "${key}" חסר — ערכו הקנוני «${want}»`);
        } else if (mf[key] !== want) {
          ok = false;
          fail(`manifest.json: "${key}" הוא «${mf[key]}» במקום «${want}». ` +
               'ערך משותף משתנה בארבעת הריפו ובארבעת עותקי הבדיקה, באותו סבב.');
        }
      }
      if (ok) pass(`manifest.json — ${CANON_MANIFEST.length} ערכי המפתחות המשותפים תואמים`);
      /*  ⭐ שכבת האייקונים במניפסט (כלל ברזל 25, סבב 67) — ⛔ שלושה
       *  אייקונים מוצהרים, ⛔ ואייקון מלא אינו נושא `maskable`.
       *  ⚠️ **נמדד ולא הוצהר:** ביומן שני האייקונים המלאים הוכרזו
       *  `"any maskable"`, כלומר הלאנצ'ר חתך אותם בעיגול, ⛔ והקובץ
       *  `icon-maskable-512.png` — שקיים בארבעתן מסבב 46 — לא הופיע
       *  שם כלל. ⛔ ו-`src` שאינו מצביע על קובץ קיים הוא 404 שקט:
       *  ההתקנה מצליחה, והאייקון פשוט אינו מופיע. */
      const icons = Array.isArray(mf.icons) ? mf.icons : [];
      const CANON_ICONS = [
        ['icons/icon-192.png',          '192x192', 'any'],
        ['icons/icon-512.png',          '512x512', 'any'],
        ['icons/icon-maskable-512.png', '512x512', 'maskable'],
      ];
      let iok = true;
      for (const [src, sizes, purpose] of CANON_ICONS) {
        const e = icons.find((i) => i && i.src === src);
        if (!e) { iok = false; fail(`manifest.json: האייקון "${src}" אינו מוצהר`); continue; }
        if (e.sizes !== sizes) {
          iok = false;
          fail(`manifest.json: "${src}" מוצהר ${e.sizes} במקום ${sizes}`);
        }
        if ((e.purpose || 'any') !== purpose) {
          iok = false;
          fail(`manifest.json: "${src}" מוצהר purpose="${e.purpose}" במקום "${purpose}" — ` +
               'אייקון מלא אינו maskable (כלל ברזל 25); "any maskable" הוא מה שגרם ' +
               'לקרניים להיחתך בעיגול הלאנצ\'ר.');
        }
      }
      for (const i of icons) {
        if (!i || !i.src) continue;
        if (!fs.existsSync(i.src)) {
          iok = false;
          fail(`manifest.json: "${i.src}" מוצהר אך אינו קיים בריפו — 404 שקט`);
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
/*  ⛔ תקרת החלק המשותף (סבב 69) — ⚠️ בלעדיה ארבעת בלוקי הכללים גדלים
 *  בלי גבול, והתקרה הכוללת נבלעת בהם. */
const DOC_MAX_SHARED = 400;
/*  ⛔ תקרות שלושת הקבצים הנלווים, ⛔ ותקרה נפרדת לכל חלק (סבב 71) —
 *  ⚠️ תקרה על הקובץ בלבד נבלעת: החלק המשותף גדל, החלק הפרטי מצטמצם,
 *  ⛔ והסכום אינו זז. ⭐ הרף לכל חלק **נמדד** ולא שוער: החלק המשותף
 *  הוא בדיוק מה שיש (12 · 13 · 85 שורות, זהות בית-לבית בארבעתן), והחלק
 *  הפרטי הוא הגבוה שנמדד בארבעתן ועוד מרווח קטן.
 *  ⛔ ו-`android/README` ננעל על 240 ולא על היעד 150 — ⚠️ הרצפה מדודה:
 *  85 שורות SHARED, ולצידן טבלת ה-`versionCode` שהיא ההיסטוריה שהשער
 *  אוכף, וטבלת המפתח הקבוע. ⛔ הצמצום ליעד הוא סבב שנוגע במעטפת. */
const MD_MAX = { 'README.md': 50, 'CONTEXT.md': 100, 'android/README.md': 240 };
/*  ⚠️ `[משותף, פרטי]` — ⛔ שני הרפים נאכפים בנפרד (סבב 71), ⛔ ולא סכומם.
 *  ⚠️ ולכל רף מרווח של ארבע שורות מעל הגבוה שנמדד, ⛔ ולא אפס: שערי
 *  המוטציה מוסיפים שורות לעותק, ⛔ ורף צמוד היה מפיל אותם על התקרה
 *  במקום על התנאי שהם באים לבדוק. */
const MD_SPLIT = {
  'README.md':        [12, 40],
  'CONTEXT.md':       [13, 46],
  'android/README.md': [85, 155],
};

const ROUND_H2 = /^##\s+(?:⭐\s+)?סבב\s/;
{
  const rounds = [];
  for (let i = 0; i < lines.length; i++) {
    if (!inFence[i] && ROUND_H2.test(lines[i])) rounds.push(lines[i].replace(/^##\s+/, '').trim());
  }
  if (rounds.length > DOC_MAX_ROUNDS) {
    const over = rounds.slice(0, rounds.length - DOC_MAX_ROUNDS);
    fail(`${APP.file}: ${rounds.length} פרקי סבבים, והחלון הוא ${DOC_MAX_ROUNDS} ` +
         `(כלל ברזל 18). יש למחוק באותו קומיט — הישנים ראשונים: ${over.join(' · ')}`);
  } else {
    pass(`תקציב התיעוד — ${rounds.length}/${DOC_MAX_ROUNDS} פרקי סבבים`);
  }
  const n = src.endsWith('\n') ? lines.length - 1 : lines.length;
  if (n > DOC_MAX_LINES) {
    fail(`${APP.file}: ${n} שורות — ${n - DOC_MAX_LINES} מעל התקרה של ${DOC_MAX_LINES} ` +
         '(כלל ברזל 18). סבב שחוצה את התקרה גוזם פרקי סבבים באותו קומיט.');
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
    fail(`${APP.file}: החלק המשותף הוא ${shared} שורות — ${shared - DOC_MAX_SHARED} ` +
         `מעל התקרה של ${DOC_MAX_SHARED}.`);
  } else {
    pass(`תקציב התיעוד — ${shared}/${DOC_MAX_SHARED} שורות בחלק המשותף`);
  }
  for (const [f, cap] of Object.entries(MD_MAX)) {
    if (!fs.existsSync(f)) { fail(`${f} חסר`); continue; }
    const t = fs.readFileSync(f, 'utf8').split('\n');
    const n = t[t.length - 1] === '' ? t.length - 1 : t.length;
    if (n > cap) fail(`${f}: ${n} שורות — ${n - cap} מעל התקרה של ${cap}.`);
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
    if (sh > capS) fail(`${f}: החלק המשותף ${sh} שורות — ${sh - capS} מעל התקרה של ${capS}.`);
    else if (pv > capP) fail(`${f}: החלק הפרטי ${pv} שורות — ${pv - capP} מעל התקרה של ${capP}.`);
    else pass(`תקציב התיעוד — ${f}: ${sh}/${capS} משותף · ${pv}/${capP} פרטי`);
  }
  if (priv > DOC_MAX_PRIVATE) {
    fail(`${APP.file}: החלק הפרטי-הקבוע הוא ${priv} שורות — ${priv - DOC_MAX_PRIVATE} ` +
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
  if (alien.length) fail(`${APP.file}: פרק אפליקציה בתוך בלוק משותף — ${alien.join(' · ')}`);
  else pass(`תוכן החלק המשותף — ${found.length} בלוקים, ואין בהם פרק אפליקציה`);

  const screens = priv.filter((h) => SCREENS.test(h));
  const rounds  = priv.filter((h) => ROUND_H2.test(h));
  const other   = priv.filter((h) => !SCREENS.test(h) && !ROUND_H2.test(h));
  if (screens.length !== 1)
    fail(`${APP.file}: החלק הפרטי מחזיק ${screens.length} פרקי «מסכים ולוגיקה» ואחד נדרש.`);
  else if (other.length)
    fail(`${APP.file}: פרק בחלק הפרטי שאינו מסכים ולוגיקה ואינו פרק סבב — ${other.join(' · ')}`);
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
                          [/^##\s+מסכים\b/, 'מסכים'], [/^##\s+⭐?\s*טבלת התשתית/, 'טבלת התשתית']],
  };
  for (const [f, rules] of Object.entries(FOREIGN)) {
    if (!fs.existsSync(f)) continue;
    const ls = fs.readFileSync(f, 'utf8').split('\n'), mk = fenceMask(ls);
    const hits = [];
    for (let i = 0; i < ls.length; i++) {
      if (mk[i] || !/^##\s/.test(ls[i])) continue;
      for (const [re, what] of rules) if (re.test(ls[i])) hits.push(`שורה ${i + 1}: ${what}`);
    }
    if (hits.length) fail(`${f}: פרק מתחום של קובץ אחר — ${hits.join(' · ')}`);
    else pass(`תוכן ${f} — אין בו פרק מתחום של קובץ אחר`);
  }
}

/* ────── יב. מבנה פרק הכלל, וסדר הבלוקים (סבב 71) ───────────────────────────
   ⛔ **תקן פרק הכלל: כותרת · מה נאכף · הנימוק המדוד.** ⚠️ פרק בלי נימוק
   נקרא כגחמה, ⛔ והסשן הבא מבטל אותו בתום לב — בדיוק מה שכל ⛔ בא למנוע.
   ⭐ הצורה נאכפת ולא הניסוח: כותרת `###` · לפחות סימן ⛔ אחד (מה נאכף) ·
   ⛔ ולפחות ⚠️ או ⭐ אחד (הנימוק).
   ⛔ **וסדר הבלוקים נאכף מול הרשימה הקנונית** — ⚠️ הרשימה זהה בארבעת
   עותקי השער, ⛔ ולכן סדר שנשמר מולה הוא סדר אחיד בארבעת הריפו: זו
   הדרך היחידה לאכוף אחידות בין ריפו מתוך ריפו אחד. */
{
  const ids = found.map((b) => b.id).join(',');
  const want = CANON.map((c) => c[0]).join(',');
  if (ids !== want) fail(`${APP.file}: סדר הבלוקים [${ids}] ≠ הסדר הקנוני [${want}]`);
  else pass(`סדר הבלוקים ב-${APP.file} — ${found.length} בלוקים בסדר הקנוני`);

  for (const f of [...new Set(CANON_MD.map((c) => c[0]))]) {
    if (!fs.existsSync(f)) continue;
    const got = scanShared(f).blocks.map((b) => b.id).join(',');
    const exp = CANON_MD.filter((c) => c[0] === f).map((c) => c[1]).join(',');
    if (got !== exp) fail(`${f}: סדר הבלוקים [${got}] ≠ הסדר הקנוני [${exp}]`);
    else pass(`סדר הבלוקים ב-${f} — ${exp.split(',').length} בלוקים בסדר הקנוני`);
  }

  let bad = 0, seen = 0, open = null, head = null, body = [];
  const close = () => {
    if (!head) return;
    const txt = body.join('\n');
    seen++;
    if (!txt.includes('⛔')) { fail(`${APP.file}: פרק הכלל «${head}» בלי ⛔ — מה נאכף אינו כתוב`); bad++; }
    else if (!txt.includes('⚠️') && !txt.includes('⭐')) {
      fail(`${APP.file}: פרק הכלל «${head}» בלי ⚠️ או ⭐ — הנימוק אינו כתוב`); bad++;
    }
    head = null; body = [];
  };
  for (let i = 0; i < lines.length; i++) {
    if (inFence[i]) { if (head) body.push(lines[i]); continue; }
    const st = START_RE.exec(lines[i]);
    if (st) { open = st[1]; continue; }
    if (END_RE.test(lines[i])) { close(); open = null; continue; }
    if (open && open.startsWith('rules-') && /^###\s+\S/.test(lines[i])) {
      close(); head = lines[i].replace(/^###\s+/, '').trim(); continue;
    }
    if (head) body.push(lines[i]);
  }
  close();
  if (!bad) pass(`מבנה פרק הכלל — ${seen} פרקים, לכל אחד כותרת · מה נאכף · נימוק`);
}

console.log(failures ? `\n❌ בדיקת התיעוד נכשלה (${failures})` : '\n✅ בדיקת התיעוד עברה');
process.exit(failures ? 1 : 0);
