#!/usr/bin/env node
/* סבב 61 — מדיניות הגיבויים (כלל ברזל 20).
 *
 * ⛔ **שלושת הערכים — 7 עותקים · 30 יום · 14 יום לידני — חיים בשני
 * מקומות**: בטבלה שבכלל ברזל 20 (`CLAUDE.md`) ובקובץ המיגרציה שמממש
 * אותה. ⛔ שני מקורות אמת לאותו מספר הם בדיוק הדבר שנסחף בשקט, ולכן
 * השער הזה משווה ביניהם ונופל על כל הפרש.
 *
 * ⚠️⚠️ **ומה שהשער הזה אינו מודד — ⛔ וזה נרשם כאן ולא רק ב-CLAUDE.md,
 * מפני ששער שמובן לא נכון גרוע משער שאינו קיים:**
 *   ⛔ הבודק קורא **קבצים בלבד** — `CLAUDE.md` ואת ה-SQL שלצידו — ⛔ ואין
 *   לו שום גישה למסד החי. הוא מאמת שהמדיניות **מתועדת ונכתבה במיגרציה**,
 *   ⛔ **ולא שהיא פעילה בפועל**: מיגרציה שנכתבה ומעולם לא הורצה עוברת
 *   אותו במלואו, וכך גם מסד שבו `cron.job` מריץ עדיין את הגרסה הישנה.
 *   ⛔ **אימות המסד החי הוא פעולת מנהל** — הרצת המיגרציה, ואחריה בדיקת
 *   `cron.job` (שהפקודה נושאת את שלושת הערכים) ו-`sync_log` (שהרישום
 *   מפריד בין `aged`/`capped`/`manual`). ⚠️ ואין להוסיף כאן «בדיקת מסד»
 *   שתעקוף את זה — בודק שנוגע במסד החי הוא בודק שיכול למחוק.
 *
 * ⛔ המוטציות רצות על מחרוזת בזיכרון ואינן נכתבות לעץ (הלקח של סבב 42ג).
 * ⛔ הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP ───────────────────────────────────────────────────────────────── */
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');

let failed = 0;
const ok = (m) => console.log('  ok   ' + m);
const bad = (m) => { failed++; console.error('  FAIL ' + m); };
const assert = (c, m) => (c ? ok(m) : bad(m));

/* ── חילוץ שלושת הערכים מכלל ברזל 20 ───────────────────────────────────── */
function ruleBlock(doc) {
  const m = doc.match(
    /<!--\s*SHARED:start\s+id="iron-rule-20-backup-policy"\s*-->([\s\S]*?)<!--\s*SHARED:end\s*-->/);
  return m ? m[1] : null;
}
/* ⚠️ הערכים נקראים מ**טבלה** ולא מפרוזה (סבב 61) — ⛔ פרוזה אינה ניתנת
   לגזירה אמינה, וזה בדיוק הלקח של כלל ברזל 15 בציר אחר. */
function ruleValues(block) {
  if (!block) return null;
  const auto = block.match(/\|\s*אוטומטי[^|\n]*\|\s*\*\*(\d+)\*\*[^|\n]*\|\s*\*\*(\d+)\*\*[^|\n]*\|/);
  const man  = block.match(/\|\s*ידני[^|\n]*\|[^|\n]*\|\s*\*\*(\d+)\*\*[^|\n]*\|/);
  if (!auto || !man) return null;
  return { keep: +auto[1], days: +auto[2], manual: +man[1] };
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
  console.log('\n[1] כלל ברזל 20 — צד התיעוד');
  const b = ruleBlock(DOC);
  assert(b !== null, '1א · בלוק `iron-rule-20-backup-policy` קיים');
  const rv = ruleValues(b);
  assert(rv !== null, '1ב · טבלת שלושת הערכים נקראת מהפרק');
  if (!rv) return null;
  assert(rv.keep === 7,    '1ג · תקרת העותקים בכלל היא 7 (נמצא ' + rv.keep + ')');
  assert(rv.days === 30,   '1ד · תפוגת הגיבוי האוטומטי היא 30 יום (נמצא ' + rv.days + ')');
  assert(rv.manual === 14, '1ה · תפוגת הגיבוי הידני היא 14 יום (נמצא ' + rv.manual + ')');
  assert(/המוקדם\s*\n?\s*>?\s*מביניהם|המוקדם מביניהם/.test(b),
    '1ו · ⛔ הכלל אומר במפורש «המוקדם מביניהם» — תקרה ותפוגה מצטברות');
  assert(/`pre-`/.test(b),
    '1ז · ⛔ קידומת הגיבוי הידני נכתבת במפורש');
  assert(/`PRE_\*`/.test(b) && /`ORPHAN_\*`/.test(b),
    '1ח · ⛔ ומה שאינו מתפנה לעולם רשום בשמו — `PRE_*` ו-`ORPHAN_*`');
  assert(/bk_retention_sweep/.test(b) && /pg_cron/.test(b),
    '1ט · מנגנון הפינוי ומקום ריצתו רשומים בפרק');
  assert(/אינם רואים את המסד החי|ולא שהיא\s*\n?\s*\*\*פעילה/.test(b),
    '1י · ⚠️ ומגבלת השער — קבצים ולא מסד חי — כתובה בפרק עצמו');
  assert(DOC.indexOf(APP.migrationDoc) !== -1,
    '1יא · קובץ המיגרציה נזכר בשמו (' + APP.migrationDoc + ')');
  return rv;
}

/* ── 2. צד ה-SQL — ⚠️ רק בריפו שמחזיק את הקובץ ─────────────────────────── */
function t2(sql) {
  console.log('\n[2] המיגרציה — שלושת הערכים והמבנה');
  assert(mismatches(DOC, sql).length === 0,
    '2א · ⭐ שלושת הערכים במיגרציה תואמים לטבלה שבכלל ברזל 20');
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
