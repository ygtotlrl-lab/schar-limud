/* ══════════════════════════════════════════════════════════════════════════
   test_dbfacts.mjs — עובדות המסד החי: ⛔ מה שאינו נראה מהקבצים
   ══════════════════════════════════════════════════════════════════════════
   **מה נאכף:** תשע טענות שנמדדות מול המסד עצמו במפתח ה-`anon` שכבר יושב
   ב-`index.html` — ⛔ אפס רשומות עם חותמת אפס או ריקה · ⛔ כל טבלה ועמודה
   שמוצהרות ב-`migrations/` קיימות · ⛔ כל מפתח הגדרה שהקוד קורא קיים
   בטבלת ההגדרות · ⛔ כל מפתח גיבוי חי נמצא ברשימת-ההיתר של הפינוי ·
   ⛔ כל `updated_at` חוזר כמספר, בלי טריגר `touch` חי ב-`migrations/` ·
   ⛔ כל טבלה מקבילה בצורת המשפחה שלה · ⛔ כל עמודה חיה נקראת בקוד או
   מוצהרת עם נימוקה · ⛔ כל עמודה שהקוד נוקב בה בשליפה קיימת בטבלה ·
   ⛔ וכל שדה נגזר ששמור ברשומה מסכים עם מקורו החי.

   **הנימוק המדוד:** ארבע השורות האלה היו ⭕ עם הנימוק «שער רץ על קבצים
   ואינו רואה את המסד», ⚠️ ובינתיים נמדד מולו ידנית: ⛔ **940 מתוך 988**
   רשומות שינה נשאו `updated_at = 0` מייבוא חד-פעמי, ⭐ ואיש לא ידע.
   ⛔ ונמדד ש-`anon` כפוף ל-RLS (`rolbypassrls = false`) ⛔ ושארבע הטענות
   דורשות **קריאה בלבד**, ⚠️ ולכן אין כאן הרחבת הרשאה ואין סוד חדש.

   **מה יישבר בלעדיו:** ⛔ סחיפה בין הריפו למסד נקראת כעדות — ⚠️ מיגרציה
   שרצה חלקית, מפתח הגדרה שנמחק, או ייבוא שנכתב בלי חותמת: ⭐ כולם שקטים
   לחלוטין, ⛔ והסבב הבא בונה על סכימה שאינה קיימת.

   **מה אינו נאכף כאן:** ⛔ **כשל רשת אינו מפיל** — ⚠️ הוא מדווח «לא נמדד»
   והשער עובר: ⭐ הסביבה שבה רץ הסט אינה תמיד מחוברת, ⛔ וניתוק ששובר את
   הסט הופך את השער לרעש שמכבים. ⚠️ **ורשימת-ההיתר נגזרת מהמיגרציה
   ולא מהמסד** — ⛔ ל-`anon` אין `EXECUTE` על `bk_retention_keys()`,
   ⭐ והרחבתו היא החלטת מנהל: ⚠️ מה שנמדד מול המסד הוא **המפתחות החיים**,
   ⛔ והם הצד שבו מפתח שאינו ברשימה אינו מתפנה לעולם.
   ══════════════════════════════════════════════════════════════════════════ */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 93) — ⚠️ הבודק גוזר את
 *  המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [139, 134, 135, 136, 151, 174, 175, 176, 177];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה.
 *  ⛔ **וכאן זה חל על השער כולו** — ⚠️ הוא היחיד שיוצא לרשת, ⭐ ורמת
 *  העבודה נשארת קוראת-קבצים בלבד. */
const RUN_MUT = process.env.GATE_MUT === '1';
/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  name: 'schar-limud',
  /*  ⛔ ארבע טבלאות הכספים נושאות חותמת שרת מטריגר `touch` — ⚠️ ובה הכשל
   *  היחיד האפשרי הוא ריק, ⭐ שאפס אינו ניתן לייצוג ב-`timestamptz`. */
  /*  ⛔ הטבלאות שנושאות `updated_at` — ⚠️ **וכולן `bigint`**: ⭐ חותמת
   *  שהמכשיר מייצר, ⛔ ובה אפס הוא **הישן ביותר** ולא «לא ידוע».
   *  ⛔ אין כאן טיפוס שני — ⚠️ שני טיפוסים לאותו מושג הם שני מנועי הכרעה. */
  stamped: ['sl_students', 'sl_transactions', 'sl_settings',
             'sl_lists', 'sl_users'],
  /*  ⛔ טבלה מוצהרת שאינה במסד בכוונה — ⚠️ **מה נכנס**: שם טבלה ⟵ נימוק.
   *  ⛔ **ומה מפיל**: שם שאין לו הצהרה ב-`migrations/`. ⭐ **ולמה היא
   *  קיימת**: טבלה שמוצהרת ואינה קיימת היא סחיפה — ⛔ **וכאן כל טבלה
   *  מוצהרת קיימת במסד**, ⚠️ וההצהרה ריקה ואינה נשמטת. */
  schemaSkip: [],
  cfgReader: 'slCfgGet',
  cfgTable: 'sl_settings',
  backupTable: 'kv_backup',
  /*  ⛔ הפינוי אינו בבעלות הריפו הזה — ⚠️ רשימת-ההיתר מוגדרת במיגרציה אחת
   *  בריפו של האפליקציה הראשונה בפרויקט, ⭐ ועותק שני היה מקור אמת שני. */
  allowlistFn: '',
  /*  ⛔ משפחות הטבלאות המקבילות — ⚠️ **הרשימה הקנונית זהה בית-לבית
   *  בארבעת עותקי השער**, ⭐ ורק שם הטבלה נבדל: ⛔ ולכן טבלה שתואמת לה
   *  כאן תואמת גם לשלוש האחרות, ⚠️ בלי שהשער יראה את המסד שלהן. */
  /*  ⛔ הטבלאות שהריפו הזה מחזיק — ⚠️ הן והן בלבד נסרקות לשתי טענות
   *  השאריות: ⭐ טבלה של אחות אינה שלנו למדוד, ⛔ ועמודה שאין לה קורא
   *  **כאן** אינה שארית אם היא נקראת שם. */
  ownTables: ['sl_students', 'sl_transactions', 'sl_settings', 'sl_lists', 'sl_users'],
  /*  ⛔ שמות עמודה שאין להם קורא **בכוונה** (סבב 104) — ⚠️ וכל אחד נושא
   *  את נימוקו: ⭐ שלישיית המחיקה הרכה ומשפחת הטבלאות המקבילות מחייבות
   *  את העמודה בסכימה, ⛔ גם באפליקציה שאינה כותבת אותה.
   *  ⛔ **וההצהרה עצמה נמדדת** — ⚠️ שם שאין לו מקרה חי **מפיל**, ⭐ בדיוק
   *  כמו כל רשימת חריגה. */
  /*  ⛔ שדות שנשמרו ברשומה ונגזרים ממקור חי — ⚠️ **מה נכנס**: הטבלה,
   *  השדה, המפתח שלצידו, והמקור פר-הקשר; ⛔ **ומה מפיל**: ערך שמור
   *  שאינו מסכים עם המקור הנוכחי. ⭐ **ולמה המבנה קיים**: המקור משתנה
   *  ⛔ והרשומה אינה.
   *  ⛔ **והרשימה אינה נשמטת** — ⚠️ שדה חסר נקרא «לא נשאל», ⭐ וריק
   *  נקרא «נמדד ואין». */
  derivedFields: [],
  colNoReader: {
    full_name:  'משפחת טבלאות המשתמשים — עמודה שאינה בשימוש כאן נשארת בסכימה',
  },
  twinTables: {
    users:    { table: 'sl_users',
                cols: ['client_id', 'username', 'full_name', 'role', 'active',
                    'created_at', 'updated_at', 'pass_salt', 'pass_fp'] },
    settings: { table: 'sl_settings',
                cols: ['key', 'value', 'updated_at', 'client_id',
                    'deleted', 'deleted_at', 'deleted_by'] },
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const SRC = readFileSync(join(ROOT, 'index.html'), 'utf8');

let fail = 0, notMeasured = '';
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בארבעת הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
const FLOOR = { shared: 11, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות (סבב 119) — ⚠️ `null` הוא תהליך
 *  שלא הגיע לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה
 *  שמבדיל ריצה חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו. */
const SUBRUN = !!process.env.GATE_SUBRUN;
/*  ⛔ הריצפה נמדדת בשני הכיוונים (סבב 118) — ⚠️ **מה נכנס**: מספר הטענות
 *  שרצו עד שלב המוטציות; ⛔ **ומה מפיל**: פחות מהמוצהר — ריצה חלקית —
 *  ⛔ ויותר ממנו — ריצפה מיושנת. ⭐ **ולמה שני הכיוונים**: ריצפה שאינה
 *  מתעדכנת מפסיקה למדוד את מה שנוסף. ⛔ **וההשהיה על שלב המוטציות בלבד
 *  (סבב 119)** — ⚠️ `mutStage` לוכדת את המונה בכניסה אליו, ⭐ ומה שהוא
 *  מוסיף אינו נספר בתקרה: ⛔ השהיה על הרמה המלאה כולה השאירה תשעה שערים
 *  בלי מדידה באף כיוון. ⚠️ ושער שמספרו משתנה גם בלי המוטציות מוכרז
 *  ב-`APP.floorRange` ומקבל את הטווח ב-`GATE_FLOOR_RANGE`. */
const FLOOR_MAX = (() => {
  const r = /^(\d+)-(\d+)$/.exec(process.env.GATE_FLOOR_RANGE || '');
  return r ? Number(r[2]) : EXPECTED;
})();
process.on('exit', () => {
  /*  ⚠️ שער שיובא לתהליך של שער אחר אינו סוגר — ⛔ הספירה שלו לא רצה.
   *  ⛔ וגם ריצת-משנה מוצהרת אינה סוגרת — ⚠️ שער שמריץ את עצמו בעץ
   *  סינתטי מגיע לחלק מטענותיו בכוונה, ⭐ והרצפה נמדדת על עץ אמיתי. */
  if (!process.argv[1] || !process.argv[1].endsWith(GATE_ID)) return;
  if (SUBRUN) return;
  /*  ⛔ אפס שנמדד בכניסה לשלב המוטציות הוא דילוג מוצהר (סבב 119) —
   *  ⚠️ שער שכל גופו מוטציות אינו רץ ברמה המהירה, ⭐ ואפס כזה אינו
   *  ריצה חלקית: ⛔ ו-`null` — תהליך שלא הגיע לשם — כן. */
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
const ok = (m) => (RAN++, console.log('  ok   ' + m));
const bad = (m) => { RAN++; fail++; console.error('  FAIL ' + m); };

/*  ⛔ הכתובת והמפתח נקראים מ-`index.html` ⛔ ואינם מוצהרים כאן — ⚠️ המפתח
 *  הציבורי כבר יושב שם ונשלח מכל דפדפן, ⭐ ולכן אין כאן סוד חדש: ⛔ הצהרה
 *  שנייה שלו הייתה מקור אמת שני שמתיישן. */
/*  ⛔ שני הליטרלים נשלפים בנפרד ⛔ ולא מתוך קריאת `createClient` — ⚠️ שלוש
 *  צורות חיות בארבעת הריפו: מוטבע, קבוע ב-`const`, וגרשיים כפולים,
 *  ⭐ וביטוי שמכיר צורה אחת נופל על השתיים האחרות.
 *  ⛔⛔ **והתפקיד נבדק בגוף ה-JWT** — ⚠️ `service_role` נושא
 *  `rolbypassrls = true` ו**עוקף RLS**: ⭐ מפתח שאינו `anon` נדחה כאן,
 *  ⛔ ואינו יוצא לרשת. */
const _url = /https:\/\/[a-z0-9]+\.supabase\.co/.exec(SRC);
const _key = /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.exec(SRC);
function jwtRole(k) {
  try { return JSON.parse(Buffer.from(k.split('.')[1], 'base64url').toString('utf8')).role || ''; }
  catch (e) { return ''; }
}
const CONN = (_url && _key && jwtRole(_key[0]) === 'anon') ? [null, _url[0] + '/rest/v1', _key[0]] : null;
const KEY_ROLE = _key ? jwtRole(_key[0]) : '';

/*  ⛔ כתובת חלופית לרתמת המוטציה בלבד (סבב 93) — ⚠️ שרת דמה על
 *  `127.0.0.1` שמחזיר תשובות בתבנית PostgREST: ⭐ בלעדיו המוטציות אינן
 *  יכולות לרוץ, ⛔ ומוטציה שאינה רצה אינה אכיפה. ⛔ **והיא דורשת שני
 *  משתנים יחד** — ⚠️ משתנה יחיד ששרד בסביבה היה מפנה את השער בשקט אל
 *  יעד אחר, ⭐ וזו בדיוק נקודת הפעלה שנייה. */
const SELFTEST = process.env.DBFACTS_SELFTEST === '1' && !!process.env.DBFACTS_URL;
const BASE = SELFTEST ? process.env.DBFACTS_URL : (CONN ? CONN[1] : '');
const KEY  = CONN ? CONN[2] : '';

/*  ⛔ תקרת זמן לכל קריאה — ⚠️ שער שממתין לרשת בלי תקרה תולה את הסט:
 *  ⭐ הכשל הוא «לא נמדד» ⛔ ולא המתנה. */
const TIMEOUT_MS = 8000;
/*  ⛔ הקריאה בעימוד ⛔ ואינה נחתכת בתקרת השרת — ⚠️ מספר עגול של שורות
 *  שחוזר בלי המשך הוא חיתוך, ⭐ והלולאה עוצרת רק על עמוד חלקי. */
const DERIVED_PAGE = 1000;

async function q(path, init) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(BASE + path, {
      signal: ac.signal,
      method: (init || {}).method || 'GET',
      body: (init || {}).body,
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY,
                 'Content-Type': 'application/json', ...(init || {}).headers },
    });
    const text = await r.text();
    return { status: r.status, text };
  } finally { clearTimeout(t); }
}

/* ── גזירת המוצהר מקובצי המיגרציה ──────────────────────────────────────── */
const MIG = (() => {
  let files = [];
  try {
    files = readdirSync(join(ROOT, 'migrations')).filter((f) => f.endsWith('.sql')).sort();
  } catch (e) { return { sql: '', names: [] }; }
  return { sql: files.map((f) => readFileSync(join(ROOT, 'migrations', f), 'utf8')).join('\n'), names: files };
})();

/*  ⛔ ההערות נחתכות לפני הגזירה — ⚠️ המילים `create table` ו-`add column`
 *  מופיעות בהערות ההסבר, ⭐ וגזירה גולמית מייצרת שם טבלה שאינו קיים. */
const sqlNoCmt = MIG.sql.replace(/^\s*--.*$/gm, '');

const dropped = new Set(
  [...sqlNoCmt.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]));
const created = [...new Set(
  [...sqlNoCmt.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]))]
  .filter((t) => !dropped.has(t));
/*  ⛔ עמודה שנוספה במיגרציה — ⚠️ זו בדיוק הסחיפה שהשורה מתארת: ⭐ מיגרציה
 *  שרצה חלקית משאירה את הטבלה ⛔ ואת העמודה לא. */
const addedCols = [...sqlNoCmt.matchAll(
  /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi)]
  .map((m) => ({ t: m[1], c: m[2] }))
  .filter((x) => !dropped.has(x.t));

/* ── הטענות ────────────────────────────────────────────────────────────── */
async function claimStamp() {
  const tabs = created.filter((t) => APP.stamped.includes(t));
  if (!tabs.length) { ok(`א. חותמת בכל רשומה — אין טבלה חתומה בריפו הזה`); return; }
  let badRows = 0, seen = 0;
  for (const t of tabs) {
    const r = await q(`/${t}?or=(updated_at.eq.0,updated_at.is.null)&select=updated_at&limit=1`);
    if (r.status !== 200) throw new Error(`${t} → ${r.status} ${r.text.slice(0, 120)}`);
    seen++;
    const rows = JSON.parse(r.text);
    if (rows.length) { badRows++; bad(`א. חותמת בכל רשומה — \`${t}\` נושאת רשומה עם \`updated_at\` אפס או ריק. נמדד ${rows.length}+ מול הצפוי 0. מתקנים במיגרציה שגוזרת את החותמת מהתאריך שברשומה`); }
  }
  if (!badRows) ok(`א. חותמת בכל רשומה — ${seen} טבלאות חתומות, ואפס רשומות עם אפס או ריק`);
}

async function claimSchema() {
  const byTable = new Map();
  for (const t of created) byTable.set(t, new Set());
  for (const x of addedCols) if (byTable.has(x.t)) byTable.get(x.t).add(x.c);
  let miss = 0, checked = 0;
  for (const [t, cols] of byTable) {
    if (APP.schemaSkip.includes(t)) continue;
    const sel = cols.size ? [...cols].join(',') : '*';
    const r = await q(`/${t}?select=${sel}&limit=0`);
    if (r.status === 200) { checked++; continue; }
    if (r.status === 404 || /42P01/.test(r.text)) { miss++; bad(`ב. חתימת סכימה — הטבלה \`${t}\` מוצהרת ב-\`migrations/\` ואינה קיימת במסד. נמדד ${r.status} מול הצפוי 200. מריצים את המיגרציה שיוצרת אותה, או מצהירים אותה ב-\`APP.schemaSkip\` עם נימוק`); continue; }
    if (/42703/.test(r.text)) { miss++; bad(`ב. חתימת סכימה — עמודה שמוצהרת ל-\`${t}\` אינה קיימת במסד: ${r.text.slice(0, 160)}. נמדד 400 מול הצפוי 200. מריצים את המיגרציה שמוסיפה אותה`); continue; }
    throw new Error(`${t} → ${r.status} ${r.text.slice(0, 120)}`);
  }
  if (!miss) ok(`ב. חתימת סכימה — ${checked} טבלאות מוצהרות, וכל עמודה שמוצהרת להן קיימת במסד`);
}

async function claimCfgKeys() {
  const want = [...new Set([...SRC.matchAll(
    new RegExp(APP.cfgReader + "\\(\\s*'([a-z_][a-z0-9_]*)'", 'g'))].map((m) => m[1]))].sort();
  if (!want.length) { ok('ג. כל מפתח שהקוד מבקש — אין קריאת הגדרה בריפו הזה'); return; }
  const r = await q(`/${APP.cfgTable}?select=key`);
  if (r.status !== 200) throw new Error(`${APP.cfgTable} → ${r.status} ${r.text.slice(0, 120)}`);
  const live = new Set(JSON.parse(r.text).map((x) => x.key));
  const missing = want.filter((k) => !live.has(k));
  if (missing.length) bad(`ג. כל מפתח שהקוד מבקש — מפתחות שהקוד קורא ואינם ב-\`${APP.cfgTable}\`: ${missing.join(', ')}. נמדד ${want.length - missing.length}/${want.length} מול הצפוי ${want.length}. מוסיפים אותם במיגרציה, או מסירים את הקורא`);
  else ok(`ג. כל מפתח שהקוד מבקש — ${want.length} מפתחות נקראים בקוד, וכולם קיימים ב-\`${APP.cfgTable}\``);
}

async function claimAllowlist() {
  if (!APP.allowlistFn) { ok('ד. רשימת-היתר — הפינוי אינו בבעלות הריפו הזה'); return; }
  /*  ⛔⛔ הרשימה נקראת **מהמסד** ⛔ ולא מקובץ המיגרציה (סבב 94) — ⚠️ קריאה
   *  מהקובץ מודדת את מה ש**הוצהר** ולא את מה ש**רץ**: ⭐ מיגרציה שנכתבה
   *  ולא רצה הייתה עוברת בשקט, ⛔ וזו בדיוק הסחיפה שהשורה באה לתפוס. */
  const ra = await q(`/rpc/${APP.allowlistFn}`, { method: 'POST', body: '{}' });
  if (ra.status !== 200) throw new Error(`rpc/${APP.allowlistFn} → ${ra.status} ${ra.text.slice(0, 120)}`);
  const parsed = JSON.parse(ra.text);
  const allow = new Set(Array.isArray(parsed) ? parsed : []);
  if (!allow.size) { bad(`ד. רשימת-היתר — \`${APP.allowlistFn}()\` החזירה רשימה ריקה. נמדד 0 מפתחות מול הצפוי לפחות אחד. מריצים את המיגרציה שמגדירה את הרשימה`); return; }
  const r = await q(`/${APP.backupTable}?select=key`);
  if (r.status !== 200) throw new Error(`${APP.backupTable} → ${r.status} ${r.text.slice(0, 120)}`);
  const liveKeys = [...new Set(JSON.parse(r.text).map((x) => x.key))];
  /*  ⛔ שכבות העוגן והדיפרנציאלי אינן ברשימה השמית — ⚠️ הן מתפנות בתבנית
   *  נפרדת עם תקרה לכל שכבה, ⭐ וגיבויי `PRE_*`/`pre-*` מוגנים מגריעה
   *  אוטומטית: ⛔ שלושתם מוחרגים בשמם — ⚠️ קידומת חופשית הייתה תופסת גם
   *  גיבוי מוגן. */
  const daily = liveKeys.filter((k) =>
    !/^ANCHOR:|^DIFF:/.test(k) && !/^pre-/i.test(k) && !/^PRE_|^ORPHAN_/.test(k));
  const orphan = daily.filter((k) => !allow.has(k));
  if (orphan.length)
    bad(`ד. רשימת-היתר — מפתחות חיים ב-\`${APP.backupTable}\` שאינם ברשימה ולכן אינם מתפנים לעולם: ${orphan.slice(0, 6).join(', ')}. נמדד ${orphan.length} מול הצפוי 0. מוסיפים אותם במיגרציה חדשה שמגדירה את הרשימה מחדש`);
  else ok(`ד. רשימת-היתר — ${allow.size} מפתחות ברשימה שבמסד, ${daily.length} מפתחות חיים, וכולם ברשימה`);
  /*  ⛔ הכיוון ההפוך **מדווח ואינו מפיל** — ⚠️ הנימוק המדוד: גריעת שם
   *  מהרשימה אינה מוחקת את שורותיו אלא **מקפיאה אותן לנצח**, ⭐ ומפתח
   *  שהתרוקן בגריעה תקינה הוא מצב תקין: ⛔ הפלה עליו הייתה דוחפת להסיר
   *  שמות שעדיין מנקזים שורות. */
  const empty = [...allow].filter((k) => !liveKeys.includes(k));
  if (empty.length) console.log(`  · ד. ומדווח: ${empty.length} מפתחות ברשימה בלי שורה ב-\`${APP.backupTable}\` — ${empty.join(', ')}`);
}


/*  ⛔ טענה ה — «דפוס עמודות אחיד»: ⚠️ החותמת היא `bigint` של המכשיר,
 *  ⛔ ואין עליה טריגר `touch` בצד השרת.
 *  ⛔ **הטיפוס נמדד מהערך שחוזר** — ⚠️ `bigint` חוזר מ-PostgREST כמספר
 *  ו-`timestamptz` כמחרוזת, ⭐ וזו הדרך היחידה לראות טיפוס דרך `anon`:
 *  ⛔ ל-`information_schema` אין חשיפה ב-REST.
 *  ⛔ **והטריגר נמדד מהקבצים** — ⚠️ הוא אינו נראה דרך PostgREST כלל,
 *  ⭐ ולכן נמדד שכל `create trigger` בשם `*_touch` נגרע במיגרציה מאוחרת
 *  יותר: ⛔ הפעולה **האחרונה** בסדר הקבצים היא הקובעת. */
async function claimStampType() {
  const tabs = created.filter((t) => APP.stamped.includes(t));
  let nums = 0, strs = 0; const empty = [];
  for (const t of tabs) {
    const r = await q(`/${t}?select=updated_at&limit=1`);
    if (r.status !== 200) throw new Error(`${t} → ${r.status} ${r.text.slice(0, 120)}`);
    const rows = JSON.parse(r.text);
    if (!rows.length) { empty.push(t); continue; }
    if (typeof rows[0].updated_at === 'number') { nums++; continue; }
    strs++;
    bad(`ה. דפוס עמודות אחיד — \`${t}.updated_at\` חוזר כ-${typeof rows[0].updated_at} ולא כמספר. נמדד «${String(rows[0].updated_at).slice(0, 32)}» מול הצפוי מילישניות. מריצים את המיגרציה שממירה את העמודה ל-\`bigint\``);
  }
  const last = new Map(), onTable = new Map();
  for (const m of sqlNoCmt.matchAll(
    /(create|drop)\s+trigger\s+(?:if\s+exists\s+)?([a-z_0-9]+)[\s\S]{0,120}?\bon\s+(?:public\.)?([a-z_0-9]+)/gi)) {
    last.set(m[2].toLowerCase(), m[1].toLowerCase());
    onTable.set(m[2].toLowerCase(), m[3].toLowerCase());
  }
  /*  ⛔ טריגר שהטבלה שלו נגרעה נגרע איתה — ⚠️ ואינו דורש `drop trigger`
   *  משלו: ⭐ דרישה כזו הייתה מפילה על מיגרציה תקינה שגרעה טבלה שלמה. */
  const liveTrg = [...last]
    .filter(([n, v]) => v === 'create' && /_touch$/.test(n) && !dropped.has(onTable.get(n)))
    .map(([n]) => n);
  if (liveTrg.length)
    bad(`ה. דפוס עמודות אחיד — טריגר \`touch\` שנוצר ב-\`migrations/\` ואינו נגרע: ${liveTrg.join(', ')}. נמדד ${liveTrg.length} מול הצפוי 0. כותבים מיגרציה שגורעת אותו — ⛔ חותמת שרת דורסת עריכה אופליין`);
  if (!strs && !liveTrg.length)
    ok(`ה. דפוס עמודות אחיד — ${nums} טבלאות מחזירות חותמת מספרית${empty.length ? ` (${empty.length} ריקות)` : ''}, ואפס טריגרי \`touch\` חיים`);
}

/*  ⛔ טענה ו — «טבלה מקבילה — סכימה זהה»: ⚠️ אותן עמודות, אותו סדר,
 *  ⭐ **וגם עמודה שאינה בשימוש כאן**.
 *  ⛔ **הסדר נמדד מהתשובה החיה** — ⚠️ PostgREST בונה את ה-JSON בסדר
 *  העמודות של הטבלה, ⭐ ולכן `Object.keys` על שורה אחת הוא הסדר עצמו:
 *  ⛔ ואין ל-`information_schema` חשיפה ב-REST.
 *  ⛔ **וטבלה ריקה אינה נמדדת** — ⚠️ אין ממה לגזור את הסדר, ⭐ והיא
 *  מדווחת ⛔ ואינה עוברת בשתיקה. */
async function claimTwins() {
  const fams = Object.keys(APP.twinTables || {});
  if (!fams.length) { ok('ו. טבלה מקבילה — אין כאן משפחה מוצהרת'); return; }
  let good = 0; const empty = [], absent = [];
  for (const f of fams) {
    const spec = APP.twinTables[f];
    if (!spec) { absent.push(f); continue; }
    const r = await q(`/${spec.table}?select=*&limit=1`);
    if (r.status !== 200) throw new Error(`${spec.table} → ${r.status} ${r.text.slice(0, 120)}`);
    const rows = JSON.parse(r.text);
    if (!rows.length) { empty.push(spec.table); continue; }
    const got = Object.keys(rows[0]);
    if (got.join(',') === spec.cols.join(',')) { good++; continue; }
    bad(`ו. טבלה מקבילה — \`${spec.table}\` אינה בצורת משפחת «${f}». נמדד ` +
        `«${got.join(',')}» מול הצפוי «${spec.cols.join(',')}». ` +
        'מיישרים במיגרציה — ⛔ עמודה שאינה בשימוש **נשארת בסכימה**, ' +
        'וסדר שנבדל אינו ניתן לשינוי ב-`alter` אלא בבנייה מחדש');
  }
  if (good === fams.length - absent.length - empty.length)
    ok(`ו. טבלה מקבילה — ${good} טבלאות בצורת המשפחה שלהן` +
       (absent.length ? `, ${absent.length} מוצהרות «אין»` : '') +
       (empty.length ? `, ${empty.length} ריקות ולא נמדדו` : ''));
}

/*  ⛔ טענה ז — «עמודה בלי קורא»: ⚠️ עמודה שקיימת במסד ואין לה קורא בקוד
 *  היא סכימה שמתארת עולם שהשתנה. ⭐ **והחריגות מוצהרות בשמן ובנימוקן**,
 *  ⛔ וכל שם שמוכרז ואין לו מקרה חי מפיל אף הוא.
 *  ⛔ **הסריקה על קוד בלבד** — ⚠️ הערה שמזכירה עמודה שירדה אינה קורא. */
async function claimColReaders() {
  const tabs = (APP.ownTables || []).filter((t) => created.includes(t));
  if (!tabs.length) { ok('ז. עמודה בלי קורא — אין כאן טבלה מוצהרת'); return; }
  const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1 ');
  const declared = APP.colNoReader || {};
  const used = new Set();
  const orphans = [];
  const empty = [];
  for (const t of tabs) {
    const r = await q(`/${t}?select=*&limit=1`);
    if (r.status !== 200) throw new Error(`${t} → ${r.status} ${r.text.slice(0, 120)}`);
    const rows = JSON.parse(r.text);
    if (!rows.length) { empty.push(t); continue; }
    for (const c of Object.keys(rows[0])) {
      if (new RegExp('\\b' + c + '\\b').test(codeOnly)) continue;
      if (Object.prototype.hasOwnProperty.call(declared, c)) { used.add(c); continue; }
      orphans.push(`${t}.${c}`);
    }
  }
  if (orphans.length)
    bad(`ז. עמודה בלי קורא — ${orphans.join(', ')}. נמדדו ${orphans.length} מול הצפוי 0. ` +
        'גורעים את העמודה במיגרציה, או מצהירים אותה ב-`APP.colNoReader` עם נימוקה');
  /*  ⛔ ההצהרה נמדדת רק מול מדידה **שלמה** — ⚠️ שם שמוכרז יכול לחיות
   *  בטבלה שלא נמדדה: ⭐ טבלה ריקה, או טבלה שהיעד לא החזיר: ⛔ ושיפוט
   *  «פיקטיבי» על מדידה חלקית מפיל על סביבה ⛔ ולא על העץ. */
  const complete = empty.length === 0 && tabs.length === (APP.ownTables || []).length;
  const fake = complete ? Object.keys(declared).filter((c) => !used.has(c)) : [];
  if (fake.length)
    bad(`ז. עמודה בלי קורא — הצהרה בלי מקרה חי: ${fake.join(', ')}. נמדדו ${fake.length} מול הצפוי 0. ` +
        'מסירים את ההצהרה — ⛔ חריגה שאין לה מקרה בפועל היא רשימה שאיש אינו מתחזק');
  if (!orphans.length && !fake.length)
    ok(`ז. עמודה בלי קורא — ${used.size} שמות מוצהרים עם מקרה חי` +
       (complete ? ', וההצהרה נמדדה במלואה' : ', וההצהרה לא נשפטה — המדידה חלקית') +
       (empty.length ? `, ${empty.length} טבלאות ריקות ולא נמדדו` : ''));
}

/*  ⛔ טענה ח — «הגדרה שהוחלפה במיגרציה מאוחרת»: ⚠️ מיגרציה שרצה אינה
 *  נערכת ואינה נמחקת, ⭐ **והמאוחרת היא ההגדרה** — ⛔ וקוד שנשאר מטפל
 *  בהגדרה הישנה. ⛔ **והמדידה מול המסד החי**: ⚠️ כל עמודה שהקוד נוקב
 *  בה בשליפה מטבלה — קיימת בטבלה בפועל. ⭐ זה בדיוק מה שתופס `.id`
 *  שאינו עוד המפתח, ⛔ ועמודת סיסמה שנגרעה. */
async function claimReplacedDefs() {
  const tabs = (APP.ownTables || []).filter((t) => created.includes(t));
  if (!tabs.length) { ok('ח. הגדרה שהוחלפה — אין כאן טבלה מוצהרת'); return; }
  const codeOnly = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1 ');
  const live = new Map();
  const empty = [];
  for (const t of tabs) {
    const r = await q(`/${t}?select=*&limit=1`);
    if (r.status !== 200) throw new Error(`${t} → ${r.status} ${r.text.slice(0, 120)}`);
    const rows = JSON.parse(r.text);
    if (!rows.length) { empty.push(t); continue; }
    live.set(t, new Set(Object.keys(rows[0])));
  }
  const stale = [];
  let checked = 0;
  const re = /from\(\s*['"`]([a-z_0-9]+)['"`]\s*\)[\s\S]{0,300}?\.select\(\s*['"`]([^'"`]*)['"`]/g;
  let m;
  while ((m = re.exec(codeOnly))) {
    const cols = live.get(m[1]);
    if (!cols) continue;
    for (const c of m[2].split(',').map((x) => x.trim()).filter(Boolean)) {
      if (c === '*' || c.indexOf('(') >= 0) continue;
      checked++;
      if (!cols.has(c)) stale.push(`${m[1]}.${c}`);
    }
  }
  if (stale.length)
    bad(`ח. הגדרה שהוחלפה — הקוד נוקב בעמודות שאינן במסד: ${[...new Set(stale)].join(', ')}. ` +
        `נמדדו ${stale.length} מול הצפוי 0. מסירים את הקוד שמטפל בהגדרה הישנה — ` +
        '⛔ המיגרציה המאוחרת היא ההגדרה');
  else
    ok(`ח. הגדרה שהוחלפה — ${checked} עמודות שהקוד נוקב בהן, כולן קיימות במסד` +
       (empty.length ? `, ${empty.length} טבלאות ריקות ולא נמדדו` : ''));
}


/*  ⛔ טענה ט — «ערך נגזר שהתיישן ברשומה»: ⚠️ שדה שנשמר ברשומה ונגזר
 *  ממקור שהשתנה מתיישן בשקט, ⭐ **והמדידה היא מול המקור החי** — ⛔ ולא
 *  מול הקוד. ⭐ **ומה שנשמר בכוונה מוצהר**: רשומה שמפתחה כבר אינו
 *  במקור היא הנפילה-חזרה, ⛔ והיא נספרת ואינה מפילה.
 *  ⛔ **והצד ההפוך נמדד בכל ריפו** — ⚠️ עמודה חיה ולצידה עמודה בשם
 *  `<שם>_name` היא שם נגזר ששמור בטבלה: ⭐ ריפו בלי שדות נגזרים מוצהרים
 *  עדיין נמדד כאן, ⛔ ואינו טענה שאינה יכולה להיכשל. */
async function claimDerivedStale() {
  const defs = APP.derivedFields || [];
  const decl = new Set(defs.map((d) => d.field));
  const tabs = (APP.ownTables || []).filter((t) => created.includes(t));
  const pairs = [];
  for (const t of tabs) {
    const r = await q(`/${t}?select=*&limit=1`);
    if (r.status !== 200) throw new Error(`${t} → ${r.status} ${r.text.slice(0, 120)}`);
    const rows = JSON.parse(r.text);
    if (!rows.length) continue;
    const cols = Object.keys(rows[0]);
    for (const c of cols)
      if (/_name$/.test(c) && cols.includes(c.replace(/_name$/, '')) && !decl.has(c))
        pairs.push(`${t}.${c}`);
  }
  if (pairs.length)
    bad(`ט. ערך נגזר שהתיישן — עמודות שם לצד המפתח שלהן ואינן מוצהרות: ${pairs.join(', ')}. ` +
        'נמדדו ' + pairs.length + ' מול הצפוי 0. גורעים את העמודה במיגרציה, או מצהירים אותה ' +
        'ב-`APP.derivedFields` עם מקורה');
  if (!defs.length) {
    if (!pairs.length)
      ok(`ט. ערך נגזר שהתיישן — אפס שדות נגזרים מוצהרים, ו-${tabs.length} טבלאות נסרקו`);
    return;
  }
  let seen = 0, kept = 0;
  const stale = [];
  for (const d of defs) {
    for (const s of d.sources) {
      const sr = await q(`/${s.table}?key=eq.${s.row}&select=value`);
      if (sr.status !== 200) throw new Error(`${s.table} → ${sr.status} ${sr.text.slice(0, 120)}`);
      const srow = JSON.parse(sr.text);
      if (!srow.length) { stale.push(`${s.table}:${s.row} אינו במסד`); continue; }
      const map = new Map();
      for (const x of JSON.parse(srow[0].value)) map.set(x[d.by], x[d.as]);
      for (let off = 0; ; off += DERIVED_PAGE) {
        const r = await q(`/${d.entries}?${s.where}&${d.json}->>${d.field}=not.is.null` +
                          `&select=${d.json}&order=${d.order}&limit=${DERIVED_PAGE}&offset=${off}`);
        if (r.status !== 200) throw new Error(`${d.entries} → ${r.status} ${r.text.slice(0, 120)}`);
        const rows = JSON.parse(r.text);
        for (const row of rows) {
          const rec = row[d.json] || {};
          if (rec[d.field] == null) continue;
          seen++;
          if (!map.has(rec[d.key])) { kept++; continue; }
          if (map.get(rec[d.key]) !== rec[d.field])
            stale.push(`${rec[d.key]}: «${rec[d.field]}» מול «${map.get(rec[d.key])}»`);
        }
        if (rows.length < DERIVED_PAGE) break;
      }
    }
  }
  if (stale.length)
    bad(`ט. ערך נגזר שהתיישן — ${[...new Set(stale)].slice(0, 6).join(' · ')}. ` +
        `נמדדו ${stale.length} מול הצפוי 0. מתקנים במיגרציה מול המקור הנוכחי, ` +
        '⛔ ובלי לקדם את `updated_at` — ⚠️ זה תיקון ולא עריכה');
  else if (!pairs.length)
    ok(`ט. ערך נגזר שהתיישן — ${seen} רשומות נמדדו מול המקור החי, אפס שגויות` +
       (kept ? `, ${kept} שומרות מפתח שאינו במקור ומוצהרות` : ''));
}

/* ── ההרצה ─────────────────────────────────────────────────────────────── */
console.log(`── סבב 93 — עובדות המסד החי (${APP.name}) ${'─'.repeat(Math.max(0, 40 - APP.name.length))}`);

mutStage();
if (!RUN_MUT) {
  console.log('\n⏭ test_dbfacts: השער רץ ברמה המלאה (--full)');
  process.exit(0);
}
if (!CONN && !SELFTEST) {
  bad(`לא נמצא מפתח \`anon\` תקין ב-\`index.html\`. נמדד כתובת=${!!_url} מפתח=${!!_key} תפקיד=«${KEY_ROLE || 'אין'}» מול הצפוי «anon». מיישרים את הקריאה שבקוד, ⛔ ולא משתמשים ב-\`service_role\` — הוא עוקף RLS`);
} else {
  try {
    await claimStamp();
    await claimStampType();
    await claimTwins();
    await claimSchema();
    await claimCfgKeys();
    await claimAllowlist();
    await claimColReaders();
    await claimReplacedDefs();
    await claimDerivedStale();
  } catch (e) {
    /*  ⛔⛔ כשל רשת אינו מפיל (סבב 93) — ⚠️ הוא מדווח «לא נמדד»: ⭐ הסביבה
     *  שבה רץ הסט אינה תמיד מחוברת, ⛔ וניתוק ששובר את הסט הופך את השער
     *  לרעש שמכבים. ⚠️ **וזה אינו ✅ שקט** — ⛔ השורה שלמטה נכתבת בכל
     *  הרצה שלא מדדה, ⭐ ומי שקורא את הפלט רואה שלא נמדד. */
    notMeasured = String(e && e.message || e);
    console.log(`  ⚠️ לא נמדד — המסד אינו בהישג יד מהסביבה הזו: ${notMeasured.slice(0, 160)}`);
  }
}

/* ── רתמת המוטציה — שרת דמה מקומי ──────────────────────────────────────── */
/*  ⛔⛔ הרתמה יושבת **מתחת** לסוגר הריצה הפנימית (סבב 92) — ⚠️ רתמה
 *  שיושבת מעליו רצה בכל הרצה, ⭐ ונמדד 77 שניות במקום 7.
 *  ⛔ **ולמה שרת דמה ולא המסד החי** — ⚠️ מוטציה על המסד החי היא **כתיבה**,
 *  ⭐ והשער קורא בלבד: ⛔ שרת דמה מוכיח שמסלול המדידה רץ ותופס, ⚠️ בלי
 *  לגעת בנתון אחד. ⛔ **והוא על `127.0.0.1`** ⛔ ואינו יוצא לרשת. */
if (RUN_MUT && !SELFTEST) {
  const { createServer } = await import('node:http');
  const { spawn } = await import('node:child_process');

  const cfgWant = [...new Set([...SRC.matchAll(
    new RegExp(APP.cfgReader + "\\(\\s*'([a-z_][a-z0-9_]*)'", 'g'))].map((m) => m[1]))];
  const allowFirst = 'bk_key_in_the_stub_allowlist';
  const DF = (APP.derivedFields || [])[0];

  /*  ⛔ התשובות נגזרות **מצורת הבקשה** ⛔ ולא משמות טבלה מוקלדים — ⚠️ ארבעת
   *  הריפו שולחים שמות אחרים, ⭐ ושרת ששומע שם אחד אינו רתמה לשלושה. */
  const reply = (scen, url) => {
    if (/limit=0/.test(url))
      return scen === 'schema'
        ? [400, '{"code":"42703","message":"column x does not exist"}'] : [200, '[]'];
    /*  ⛔ שני מסלולי `updated_at` נפרדים — ⚠️ טענה א שואלת **בסינון**
     *  על אפס או ריק, ⭐ וטענה ה שואלת שורה אחת בלי סינון: ⛔ ענף אחד
     *  לשתיהן היה מפיל את אחת מהן על תשובה שנועדה לשנייה. */
    if (/updated_at\.eq\.0|updated_at\.is\.null/.test(url))
      return scen === 'stamp' ? [200, '[{"updated_at":0}]'] : [200, '[]'];
    if (/select=updated_at/.test(url))
      return scen === 'stamptype'
        ? [200, '[{"updated_at":"2026-01-01T00:00:00+00:00"}]'] : [200, '[{"updated_at":1786118467247}]'];
    /*  ⛔ שורת המשפחה נבנית **מההצהרה עצמה** ⛔ ולא משמות מוקלדים — ⚠️ ארבעת
     *  הריפו מצהירים טבלאות אחרות, ⭐ ורתמה שמכירה שם אחד אינה רתמה לשלושה.
     *  ⛔ והמוטציה הופכת את **הסדר** ⛔ ולא את שמות העמודות — ⚠️ סדר הוא
     *  בדיוק מה שהטענה מוסיפה על «אותן עמודות». */
    /*  ⛔ שני תרחישי השאריות (סבב 104) — ⚠️ שניהם עונים על `select=*`:
     *  ⭐ `colreader` מוסיף עמודה שאין לה קורא ואינה מוצהרת, ⛔ ו-`staledef`
     *  מחזיר שורה שאין בה אף עמודה שהקוד נוקב בה בשליפה. */
    if (scen === 'colreader' && /select=\*/.test(url))
      return [200, '[{"zz_orphan_col":"x"}]'];
    if (scen === 'staledef' && /select=\*/.test(url))
      return [200, '[{"zz":"x"}]'];
    if (/select=\*/.test(url)) {
      const sp = Object.keys(APP.twinTables || {})
        .map((k) => APP.twinTables[k]).filter(Boolean)
        .find((x) => url.indexOf('/' + x.table + '?') === 0);
      if (!sp) return [200, '[]'];
      const cols = scen === 'twin' ? sp.cols.slice().reverse() : sp.cols;
      const row = {};
      cols.forEach((c) => { row[c] = 'x'; });
      return [200, JSON.stringify([row])];
    }
    /*  ⛔ שני מסלולי טענה ט — ⚠️ המקור החי חוזר כערך מפתח-ערך, ⭐ והרשומות
     *  חוזרות כעמודת ה-jsonb: ⛔ והמוטציה משנה את **הערך השמור** ⛔ ולא
     *  את המקור, ⚠️ שזו בדיוק ההתיישנות שהטענה מודדת. */
    if (DF && /\?key=eq\.[^&]+&select=value$/.test(url)) {
      const one = {}; one[DF.by] = 'K'; one[DF.as] = 'שם נוכחי';
      return [200, JSON.stringify([{ value: JSON.stringify([one]) }])];
    }
    if (DF && url.indexOf(DF.field + '=not.is.null') >= 0) {
      const rec = {}; rec[DF.key] = 'K';
      rec[DF.field] = scen === 'derived' ? 'שם שהתיישן' : 'שם נוכחי';
      const wrap = {}; wrap[DF.json] = rec;
      return [200, JSON.stringify([wrap])];
    }
    if (APP.allowlistFn && url.includes('/rpc/' + APP.allowlistFn))
      return [200, JSON.stringify([allowFirst])];
    if (APP.backupTable && url.includes('/' + APP.backupTable + '?'))
      return [200, JSON.stringify(
        (scen === 'orphan' ? [{ key: 'ys_orphan_key_that_is_not_listed' }] : [])
          .concat([{ key: allowFirst }]))];
    const keys = scen === 'cfg' ? cfgWant.slice(1) : cfgWant;
    return [200, JSON.stringify(keys.map((k) => ({ key: k })))];
  };

  let scenario = 'clean';
  const srv = createServer((req, res) => {
    const [code, body] = reply(scenario, req.url);
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(body);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;

  /*  ⛔⛔ הרצה א-סינכרונית ⛔ ולא `spawnSync` — ⚠️ הנימוק המדוד: `spawnSync`
   *  חוסם את לולאת האירועים, ⭐ ולכן שרת הדמה **שיושב באותו תהליך** אינו
   *  יכול לענות: ⛔ הילד נכשל בפסק זמן, נופל למסלול «לא נמדד» ויוצא באפס —
   *  ⚠️ וכל ארבע המוטציות «עברו» מבלי שנמדד דבר. */
  const runSelf = (url) => new Promise((res) => {
    const c = spawn(process.execPath, [fileURLToPath(import.meta.url)], {
      /*  ⛔ ריצת-משנה מוצהרת (סבב 119) — ⚠️ הרתמה מריצה את השער על שרת
       *  דמה, ⭐ והוא מגיע לחלק מטענותיו בכוונה: ⛔ בלי ההכרזה הריצפה
       *  נמדדת על ריצה שאינה על העץ האמיתי. */
      env: { ...process.env, GATE_MUT: '1', GATE_SUBRUN: '1',
             DBFACTS_SELFTEST: '1', DBFACTS_URL: url },
    });
    let out = '';
    c.stdout.on('data', (d) => { out += d; });
    c.stderr.on('data', (d) => { out += d; });
    c.on('close', (status) => res({ status, stdout: out }));
  });
  const at = async (s) => { scenario = s; return runSelf(`http://127.0.0.1:${port}`); };

  /*  ⛔ נמדד מהמקור ⛔ ואינו מוצהר — ⚠️ ריפו שכל שליפותיו `select('*')`
   *  אינו יכול להפיל את טענה ח, ⭐ והמוטציה שלה מוכרזת «אין מה למוטט». */
  const NAMED_SELECTS = (() => {
    const t = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1 ');
    const re = /from\(\s*['"`]([a-z_0-9]+)['"`]\s*\)[\s\S]{0,300}?\.select\(\s*['"`]([^'"`]*)['"`]/g;
    let m, n = 0;
    while ((m = re.exec(t))) {
      if (!(APP.ownTables || []).includes(m[1])) continue;
      for (const c of m[2].split(',').map((x) => x.trim()).filter(Boolean))
        if (c !== '*' && c.indexOf('(') < 0) n++;
    }
    return n;
  })();

  const mut = async (label, scen, want) => {
    const r = await at(scen);
    const got = r.status === 0;
    if (got === want) ok(`${label} — נמדד ${got ? 'עבר' : 'נפל'} כמצופה`);
    else bad(`${label} — נמדד ${got ? 'עבר' : 'נפל'} מול הצפוי ${want ? 'עבר' : 'נפל'}. מיישרים את הטענה, או את השרת שברתמה`);
  };

  await mut('⭐ מוטציית-נגד: תשובה נקייה ⛔ אינה מפילה', 'clean', true);
  await mut('⛔ מוטציה: רשומה עם `updated_at` אפס מפילה את «חותמת בכל רשומה»', 'stamp', false);
  await mut('⛔ מוטציה: חותמת שחוזרת כמחרוזת מפילה את «דפוס עמודות אחיד»', 'stamptype', false);
  if (Object.keys(APP.twinTables || {}).some((k) => APP.twinTables[k]))
    await mut('⛔ מוטציה: סדר עמודות הפוך מפיל את «טבלה מקבילה»', 'twin', false);
  else ok('⛔ אין מוטציית טבלה מקבילה — ⚠️ אין כאן משפחה מוצהרת, ⛔ ואין מה למוטט');
  await mut('⛔ מוטציה: עמודה שאינה קיימת (42703) מפילה את «חתימת סכימה»', 'schema', false);
  if (cfgWant.length)
    await mut('⛔ מוטציה: מפתח הגדרה שנעדר מהטבלה מפיל את «כל מפתח שהקוד מבקש»', 'cfg', false);
  else ok('⛔ אין מוטציית מפתח הגדרה — הריפו הזה אינו קורא הגדרה, ⚠️ ואין מה למוטט');
  if (APP.allowlistFn)
    await mut('⛔ מוטציה: מפתח גיבוי חי שאינו ברשימה מפיל את «רשימת-היתר»', 'orphan', false);
  else ok('⛔ אין מוטציית רשימת-היתר — הפינוי אינו בבעלות הריפו הזה, ⚠️ ואין רשימה למוטט');

  await mut('⛔ מוטציה: עמודה שאין לה קורא ואינה מוצהרת מפילה את «עמודה בלי קורא»', 'colreader', false);
  /*  ⛔ תרחיש ההגדרה שהוחלפה דורש **אתר בפועל** — ⚠️ שליפה שנוקבת בעמודה
   *  בשמה: ⭐ ריפו שכל שליפותיו `select('*')` אין בו מה למוטט, ⛔ והוא
   *  מוכרז כאן ⛔ ואינו מדולג בשתיקה. */
  if (NAMED_SELECTS)
    await mut('⛔ מוטציה: עמודה שהקוד נוקב בה ואינה בשורה מפילה את «הגדרה שהוחלפה»', 'staledef', false);
  else ok('⛔ אין מוטציית «הגדרה שהוחלפה» — ⚠️ אין כאן שליפה שנוקבת בעמודה בשמה, ⛔ ואין מה למוטט');

  if (DF)
    await mut('⛔ מוטציה: ערך שמור שאינו מסכים עם המקור מפיל את «ערך נגזר שהתיישן»', 'derived', false);
  else ok('⛔ אין מוטציית «ערך נגזר שהתיישן» — ⚠️ אין כאן שדה נגזר מוצהר, ⛔ ואין מה למוטט');

  /*  ⭐ מוטציית-נגד אחרונה: ⛔ יעד שאינו נענה **אינו מפיל** — ⚠️ זו ההתנהגות
   *  שהבאנר מכריז, ⭐ ובלי מדידה שלה היא הצהרה בלבד. */
  srv.close();
  const off = await runSelf(`http://127.0.0.1:${port}`);
  if (off.status === 0 && /לא נמדד/.test(off.stdout))
    ok('⭐ מוטציית-נגד: יעד שאינו נענה ⛔ אינו מפיל — מדווח «לא נמדד» ועובר');
  else
    bad(`⭐ מוטציית-נגד: יעד שאינו נענה — נמדד קוד ${off.status} מול הצפוי 0 עם «לא נמדד». מיישרים את מסלול הכשל שאינו מפיל`);
}

if (fail) console.error(`\n✗ סבב 93 (עובדות המסד החי) — ${fail} נכשלו`);
else if (notMeasured) console.log(`\n⚠️ סבב 93 (עובדות המסד החי) — לא נמדד מול המסד, ומסלול המדידה נבדק ברתמה`);
else console.log(`\n✓ סבב 93 (עובדות המסד החי) — תשע הטענות נמדדו מול המסד`);
process.exit(fail ? 1 : 0);
