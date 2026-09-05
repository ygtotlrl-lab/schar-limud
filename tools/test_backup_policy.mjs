#!/usr/bin/env node
/* test_backup_policy.mjs — מדיניות הגיבויים במסד.
 *
 * **מה נאכף:** ⛔ שלושת הערכים — עותקים · ימים · וימי הגיבוי הידני —
 * חיים בשני מקומות: בטבלת התשתית ובקובץ המיגרציה שמממש אותה; ⛔ השער
 * משווה ביניהם ⛔ ונופל על כל הפרש.
 *
 * **הנימוק המדוד:** שני מקורות אמת לאותו מספר הם בדיוק הדבר שנסחף
 * בשקט — ⚠️ ונמדד מצבור של 503 שורות ו-72MB שנצטבר מתחת לרדאר.
 *
 * **מה יישבר בלעדיו:** ⛔ מדיניות שמוצהרת במקום אחד ומיושמת באחר מתיישנת
 * באחד מהם, ⚠️ והסבב הבא בונה על המספר הלא-נכון.
 *
 * **מה אינו נאכף כאן:** ⛔ הבודק קורא **קבצים בלבד** ⛔ ואין לו גישה למסד
 * החי — ⚠️ מיגרציה שנכתבה ומעולם לא הורצה עוברת אותו במלואו, ⛔ וכך גם
 * מסד שמריץ עדיין את הגרסה הישנה. ⭐ אימות המסד החי הוא **פעולת מנהל**,
 * ⛔ ואין להוסיף כאן «בדיקת מסד» שתעקוף זאת: ⚠️ בודק שנוגע במסד החי הוא
 * בודק שיכול למחוק.
 *
 * ⛔ המוטציות רצות על מחרוזת בזיכרון ואינן נכתבות לעץ.
 * ⛔ הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו.
 * ⚠️ שם הקובץ נגזר מהנושא ⛔ ולא ממספר הסבב; ⛔ מיגרציות שכבר רצו מפנות
 * לשם הישן, ⛔ ואין לערוך אותן.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  name: 'schar-limud',
  /* ⚠️ `null` באפליקציה שהמיגרציה אינה יושבת בריפו שלה — ⛔ הפרויקט
     המשותף מחזיק קובץ אחד, ועותק שני בכל ריפו היה מקור אמת שני (אותו
     כלל של 004). שם נאכף צד התיעוד בלבד, והשקילות מול ה-SQL נאכפת
     בריפו שמחזיק את הקובץ. */
  migration: null,
  migrationDoc: 'hanhala-ruchanit/migrations/012_backup_retention_cap.sql',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');

let failed = 0;
const ok = (m) => console.log('  ok   ' + m);
const bad = (m) => { failed++; console.error('  FAIL ' + m); };
const assert = (c, m) => (c ? ok(m) : bad(m));

/* ── חילוץ שלושת הערכים משורת «גיבוי במסד» שבטבלת התשתית ───────────────── */
function ruleBlock(doc) {
  const m = doc.match(
    /<!--\s*SHARED:start\s+id="table"\s*-->([\s\S]*?)<!--\s*SHARED:end\s*-->/);
  return m ? m[1] : null;
}
/* ⚠️ הערכים נקראים משורת **טבלה** ולא מפרוזה (סבב 61) — ⛔ פרוזה אינה ניתנת
   לגזירה אמינה, וזה בדיוק הלקח של כלל ברזל 15 בציר אחר. */
function ruleValues(block) {
  if (!block) return null;
  const row = block.split('\n').find((l) => /^\|\s*\d+\s*\|\s*גיבוי במסד\s*\|/.test(l));
  if (!row) return null;
  const nums = [...row.split('|')[3].matchAll(/\*\*(\d+)\*\*/g)].map((m) => +m[1]);
  if (nums.length !== 3) return null;
  return { keep: nums[0], days: nums[1], manual: nums[2] };
}

/* ── חילוץ שלושת הערכים מהמיגרציה ──────────────────────────────────────── */
function sqlValues(sql) {
  const g = (re) => { const m = sql.match(re); return m ? +m[1] : null; };
  return {
    days:   g(/p_days\s+integer\s+default\s+(\d+)/),
    keep:   g(/p_keep\s+integer\s+default\s+(\d+)/),
    manual: g(/p_manual_days\s+integer\s+default\s+(\d+)/),
  };
}
function cronValues(sql) {
  const m = sql.match(/bk_retention_sweep\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  return m ? { days: +m[1], keep: +m[2], manual: +m[3] } : null;
}

/* ⭐ נקודת ההשוואה היחידה — ⛔ גם הטענות וגם המוטציות עוברות דרכה, ⚠️ כדי
   שמוטציה לא תוכל «לעבור» מסלול אחר מזה שהטענה בדקה. */
function mismatches(doc, sql) {
  const out = [];
  const rv = ruleValues(ruleBlock(doc));
  if (!rv) return ['כלל ברזל 20 — לא נמצאה טבלת הערכים'];
  const sv = sqlValues(sql);
  const cv = cronValues(sql);
  for (const k of ['keep', 'days', 'manual']) {
    if (sv[k] === null) out.push(`המיגרציה — לא נמצא הערך ${k}`);
    else if (sv[k] !== rv[k]) out.push(`${k}: המיגרציה ${sv[k]} מול הכלל ${rv[k]}`);
  }
  if (!cv) out.push('פקודת ה-cron — לא נמצאה קריאה בשלושה ארגומנטים');
  else for (const k of ['keep', 'days', 'manual']) {
    if (cv[k] !== rv[k]) out.push(`cron ${k}: ${cv[k]} מול הכלל ${rv[k]}`);
  }
  return out;
}

/* ── 1. צד התיעוד — נאכף בארבעתן ───────────────────────────────────────── */
function t1() {
  console.log('\n[1] מדיניות הגיבויים — צד התיעוד');
  const b = ruleBlock(DOC);
  assert(b !== null, '1א · טבלת התשתית קיימת');
  const rv = ruleValues(b);
  assert(rv !== null, '1ב · שורת «גיבוי במסד» נושאת את שלושת הערכים');
  if (!rv) return null;
  assert(rv.keep === 7,    '1ג · תקרת העותקים היא 7 (נמצא ' + rv.keep + ')');
  assert(rv.days === 30,   '1ד · תפוגת הגיבוי האוטומטי היא 30 יום (נמצא ' + rv.days + ')');
  assert(rv.manual === 14, '1ה · תפוגת הגיבוי הידני היא 14 יום (נמצא ' + rv.manual + ')');
  /*  ⛔ מה שהיה כאן קודם — «המוקדם מביניהם», `pre-`, `PRE_*`, `bk_retention_sweep`
   *  ומגבלת השער — היו טענות על **פרוזה שמתארת את ה-SQL**, ⛔ בזמן שסעיפים
   *  2–4 אוכפים את ה-SQL עצמו. ⚠️ טענה על תיאור אינה טענה על המנגנון. */
  return rv;
}

/* ── 2. צד ה-SQL — ⚠️ רק בריפו שמחזיק את הקובץ ─────────────────────────── */
function t2(sql) {
  console.log('\n[2] המיגרציה — שלושת הערכים והמבנה');
  assert(mismatches(DOC, sql).length === 0,
    '2א · ⭐ שלושת הערכים במיגרציה תואמים לשורה שבטבלת התשתית');
  assert(cronValues(sql) !== null,
    '2ב · ⛔ פקודת ה-cron נושאת את שלושת הערכים ואינה נשענת על ברירות מחדל');
  assert(/rn\s*>\s*p_keep/.test(sql),
    '2ג · תקרת העותקים נאכפת לפי `rn > p_keep`');
  assert(/make_interval\(days\s*=>\s*p_days\)/.test(sql),
    '2ד · ⛔ ומחיקת הזמן נשארה — התקרה היא **בנוסף** ולא במקומה');
  assert(/like 'pre-%'/.test(sql) && /make_interval\(days\s*=>\s*p_manual_days\)/.test(sql),
    '2ה · הגיבוי הידני מסונן לפי קידומת `pre-` ופג לפי `p_manual_days`');
  assert(!/ilike 'pre-%'/.test(sql),
    '2ו · ⛔ ההשוואה תלוית-רישיות — `PRE_*`/`ORPHAN_*` אינם נתפסים');
  assert(/order by created_at desc,\s*id desc/.test(sql),
    '2ז · ⚠️ שובר-שוויון דטרמיניסטי — `id desc` לצד `created_at desc`');
}

/* ── 3. שלוש ההגנות שאין לגעת בהן, ושתיים שנוספו ───────────────────────── */
function t3(sql) {
  console.log('\n[3] בדיקות השפיות');
  assert(/רשימת-ההיתר ריקה/.test(sql),
    '3א · ⛔ הגנה: רשימת-היתר ריקה מסרבת לרוץ (004, לא נגעה)');
  assert(/רשימת-ההיתר מכילה מפתח מוגן/.test(sql) &&
         /k like 'pre-delete-%'/.test(sql),
    '3ב · ⛔ הגנה: מפתח מוגן ברשימת-ההיתר מסרב לרוץ (004, לא נגעה)');
  assert(/חלון קצר מ-7 ימים/.test(sql),
    '3ג · ⛔ הגנה: חלון קצר מ-7 ימים מסרב לרוץ (004, לא נגעה)');
  assert(/p_keep\s+is\s+null\s+or\s+p_keep\s*<\s*1/.test(sql),
    '3ד · ⭐ הגנה חדשה: תקרה קטנה מ-1 מסרבת לרוץ');
  assert(/p_manual_days\s+is\s+null\s+or\s+p_manual_days\s*<\s*7/.test(sql),
    '3ה · ⭐ הגנה חדשה: חלון ידני קצר מ-7 ימים מסרב לרוץ');
  /* ⛔ ההגנה על מפתח מוגן בודקת את **רשימת-ההיתר**, ⛔ ומסלול ה-`pre-`
     מסנן את **הטבלה** — ⚠️ ואם מישהו יערבב ביניהם ההגנה נשברת בשקט. */
  assert(/where key like 'pre-%'/.test(sql),
    '3ו · ⛔ מסלול ה-`pre-` מסנן את הטבלה ואינו נוגע ברשימת-ההיתר');
}

/* ── 4. החתימה, הסדר וההרשאות ──────────────────────────────────────────── */
function t4(sql) {
  console.log('\n[4] החתימה, הסדר וההרשאות');
  const iDrop = sql.indexOf('drop function if exists public.bk_retention_sweep(integer)');
  const iNew  = sql.indexOf('create or replace function public.bk_retention_sweep(');
  assert(iDrop !== -1, '4א · החתימה הישנה `(integer)` נמחקת');
  assert(iDrop !== -1 && iNew !== -1 && iDrop < iNew,
    '4ב · ⛔ והמחיקה **לפני** היצירה — אחרת `bk_retention_sweep(30)` דו-משמעית');
  assert(/revoke all on function public\.bk_retention_sweep\(integer, integer, integer\)/.test(sql),
    '4ג · ⛔ ההרשאות נקבעות מחדש לחתימה החדשה — היא אינה יורשת את 004');
  assert(/grant execute on function public\.bk_retention_sweep\(integer, integer, integer\)\s*\n?\s*to service_role/.test(sql),
    '4ד · וההרצה שמורה ל-`service_role` בלבד');
  assert(!/grant\s+execute[^;]*to[^;]*\banon\b/.test(sql),
    '4ה · ⛔ ואין `execute` ל-`anon` בשום מקום בקובץ');
  assert(/'aged'/.test(sql) && /'capped'/.test(sql) && /'manual'/.test(sql),
    '4ו · ⭐ היומן מפריד בין שלושת המסלולים');
  assert(!/grant[^;]*delete[^;]*kv_backup/i.test(sql),
    '4ז · ⛔ והקובץ אינו מעניק `delete` על `kv_backup`');
}

/*  ⛔ מכאן ולמטה מוטציות ובדיקות שלמות (סבב 92) — ⚠️ הן רצות ברמה
 *  המלאה בלבד: ⛔ הרמה המהירה עוצרת כאן עם קוד היציאה של הטענות
 *  שכבר רצו, ⭐ והכיסוי שלהן אינו יורד. */
if (!RUN_MUT) {
  console.log('\n⏭ test_backup_policy: המוטציות רצות ברמה המלאה (--full)');
  process.exit(failed ? 1 : 0);
}
/* ── 5. מוטציות — ⛔ בזיכרון בלבד ───────────────────────────────────────── */
function t5(sql) {
  console.log('\n[5] מוטציות');
  const muts = [
    ['p_keep 7→5',        s => s.replace(/p_keep\s+integer\s+default\s+7/, 'p_keep        integer default 5')],
    ['p_days 30→60',      s => s.replace(/p_days\s+integer\s+default\s+30/, 'p_days        integer default 60')],
    ['p_manual_days 14→30', s => s.replace(/p_manual_days\s+integer\s+default\s+14/, 'p_manual_days integer default 30')],
    ['cron (30,7,14)→(30,7,21)',
      s => s.replace(/bk_retention_sweep\(30, 7, 14\)/, 'bk_retention_sweep(30, 7, 21)')],
  ];
  for (const [name, f] of muts) {
    const m = f(sql);
    assert(m !== sql, '5· המוטציה «' + name + '» אכן שינתה את המקור');
    assert(mismatches(DOC, m).length > 0,
      '5· ⛔ מוטציה: ' + name + ' בלי לעדכן את כלל ברזל 20 — **מפילה**');
  }
  /* ⭐ מוטציית-נגד: ⛔ שינוי הערה אינו מפיל — אחרת השער היה נועל את
     התיעוד שבתוך המיגרציה ולא את המדיניות. */
  const c = sql.replace(/^-- =+$/m, '-- ==== הערה ששונתה לצורך מוטציית-הנגד ====');
  assert(c !== sql, '5· מוטציית-הנגד אכן שינתה הערה');
  assert(mismatches(DOC, c).length === 0,
    '5· ⭐ מוטציית-נגד: שינוי **הערה** במיגרציה ⛔ **אינו** מפיל');
}

/* ── הרצה ──────────────────────────────────────────────────────────────── */
console.log('· ' + APP.name + ' — סבב 61: מדיניות הגיבויים (כלל ברזל 20)');
t1();
if (APP.migration) {
  const p = join(ROOT, APP.migration);
  if (!existsSync(p)) {
    bad('קובץ המיגרציה המוכרז אינו קיים: ' + APP.migration);
  } else {
    const sql = readFileSync(p, 'utf8');
    t2(sql); t3(sql); t4(sql); t5(sql);
  }
} else {
  /* ⚠️ אין כאן קובץ מיגרציה, ⛔ ולכן נאכף צד התיעוד בלבד — והשקילות מול
     ה-SQL נאכפת בריפו שמחזיק את הקובץ. ⛔ העתקת המיגרציה לכאן הייתה
     מקור אמת שני (אותו נימוק של סבב 35ג). */
  ok('· ⚠️ אין כאן קובץ מיגרציה — השקילות מול ' + APP.migrationDoc +
     ' נאכפת בריפו שמחזיק אותו');
}

if (failed) { console.error('\n✗ ' + failed + ' טענות נכשלו'); process.exit(1); }
console.log('\n✓ סבב 61 — כל הטענות עברו');
