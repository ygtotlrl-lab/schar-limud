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
 *    ה. (סבב 20) הקובץ שונה מול `origin/main` אבל שורת «עודכן לאחרונה»
 *       זהה לזו שב-`origin/main` — כלומר לא קודמה. סעיף ג בודק את
 *       **צורת** השורה; זה בודק שהיא באמת התקדמה.
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
  ['branch-rules',            '46a0bd36bbc06499'],
  ['iron-rules-storage',      'bee24a8c8b37d418'],
  ['pending-module',          '09e22a5adc623814'],
  ['iron-rule-6-sync',        '58f809376bdf981d'],
  ['round-14-verified-sweep', '4979f68cf39fc7c4'],
  ['round-15-tech-info',      '61819c0a62fc9e0a'],
  ['round-16-pend-delay',     '994d3cb66d4ced7c'],
  ['iron-rule-7-status-area', '3acd979daa17a205'],
  ['iron-rule-8-docs',        'e751633a064dc070'],
  ['iron-rule-9-security-spread', '5412c7382b4daf61'],
  ['iron-rule-10-users',      '54d578f69f5b3690'],
  ['capability-matrix',       '280023153ddfc0fc'],
  ['iron-rule-11-comments',   'd03e5416ced01f6c'],
  ['iron-rule-12-capabilities', '8223e5ba345c4ab3'],
  ['backup-module',           '15352739fcf8bd26'],
  ['iron-rule-13-shared-scope', 'e00e9d7ece5c0d35'],
  ['iron-rule-14-org-wide',   'eb3bbe43a2a82788'],
  ['iron-rule-15-gaps-verified', '0c5e079f0137ce9f'],
  ['sw-strategies',           '3f1636e99044b723'],
  ['iron-rule-16-remnant',    '84f2658bb8580565'],
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

/* ── ו. שלד קבוע לשלושת קובצי ה-md הנלווים (סבב 39 — השלמה שנייה) ────────
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
  { file: 'CONTEXT.md', need: [
      [/^##\s+פרטי ריפו\s*$/,                        '## פרטי ריפו'],
      [/^##\s+.*Supabase — GRANT חובה לטבלאות חדשות/, '## ⚠️ Supabase — GRANT חובה לטבלאות חדשות'],
      [/^##\s+כללים קריטיים לפיתוח\s*$/,             '## כללים קריטיים לפיתוח'],
      [/^##\s+טבלאות\s*$/,                            '## טבלאות'],
      [/^##\s+מצב נוכחי\s*$/,                        '## מצב נוכחי'],
      [/^##\s+פרטי מערכת\s*$/,                       '## פרטי מערכת'],
    ] },
  { file: 'android/README.md', need: [
      [/^##\s+Why WebView and never a TWA\s*$/,       '## Why WebView and never a TWA'],
      [/^##\s+מה בפנים\s*$/,                          '## מה בפנים'],
      [/^##\s+.*גשר/,                                  '## …גשר… (הגשר המקורי / אין גשר שיתוף)'],
      [/^##\s+למה אין( יותר)? נכסים מוטבעים\s*$/,     '## למה אין נכסים מוטבעים'],
      [/^##\s+Build\s*$/,                              '## Build'],
      [/^##\s+Sign with the PERMANENT key/,            '## Sign with the PERMANENT key …'],
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

console.log(failures ? `\n❌ בדיקת התיעוד נכשלה (${failures})` : '\n✅ בדיקת התיעוד עברה');
process.exit(failures ? 1 : 0);
