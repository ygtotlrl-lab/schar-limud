#!/usr/bin/env node
/*  test_round35c_cron.mjs — סבב 35ג: פינוי גיבויים אוטומטי במסד (pg_cron).
 *
 *  שלושה חלקים:
 *    1. שכבת הלקוח — `_bkRetention` שבמודול המשותף: רשימת-היתר ולא קידומת,
 *       נכשלת-סגור, ורישום `retention` רק כשנמחק משהו. ⛔ אין להסיר אותה.
 *    2. המיגרציה — צורה (אידמפוטנטיות, `security definer`, שלילת ההרשאה
 *       מ-anon, `unschedule` לפני `schedule`) והתנהגות, דרך סימולטור צר
 *       שקורא את רשימת-ההיתר, את בדיקות השפיות ואת תנאי ה-DELETE.
 *    3. מוטציות: הרחבת רשימת-ההיתר לקידומת `PRE_*` חייבת להיתפס, וריקון
 *       הרשימה חייב לגרום לפונקציה לסרב לרוץ.
 *
 *  ⚠️ המיגרציה **נכתבה ולא הורצה** — הבדיקה קוראת את הקובץ שבריפו, ואינה
 *     מתחברת לשום מסד.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו (schar-limud) ────────────────────── */
/* ⚠️ schar חולקת את הפרויקט `kxbtskqobynewvnckaaz` עם hanhala ועם yoman,
   ולכן המיגרציה אחת לשלושתן ויושבת בריפו של hanhala — שם מוגדרת `kv_backup`.
   ⛔ עותק שני שלה כאן היה מקור אמת שני שמתיישן (סבב 35ג). */
const APP = {
  name: 'schar-limud',
  keys: ['sl_students', 'sl_transactions', 'sl_settings', 'sl_lists'],
  sqlKeys: ['sl_transactions', 'sl_students', 'sl_settings', 'sl_lists'],
  migration: null,
  migrationDoc: 'hanhala-ruchanit/migrations/004_backup_retention_cron.sql',
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'index.html'), 'utf8');
const DOC = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');

let failed = 0;
const ok = (m) => console.log('  ok   ' + m);
const bad = (m) => { failed++; console.error('  FAIL ' + m); };
const assert = (cond, m) => (cond ? ok(m) : bad(m));

/* ══════════════════════════════════════════════════════════════════════════
   רתמת SQL — סימולטור צר של `bk_retention_sweep`
   ══════════════════════════════════════════════════════════════════════════
   ⚠️ הסימולטור אינו Postgres והוא לא מתיימר להיות: הוא קורא מהמיגרציה את
      שלושת הדברים שהמוטציות נוגעות בהם — רשימת-ההיתר, בדיקות השפיות,
      ותנאי ה-DELETE — ומריץ אותם על שורות פיקסטורה. ⛔ בלי זה המוטציות
      היו נבדקות מול regex על טקסט, כלומר «הטקסט השתנה» ולא «ההתנהגות
      השתנתה» — וזו בדיוק אינה בדיקה.
   ══════════════════════════════════════════════════════════════════════════ */

/* רשימת-ההיתר: המחרוזות שבתוך `array[...]` של `bk_retention_keys`, בלי
   שורות הערה (`--`) — הערה שמזכירה מפתח אינה מפתח. */
function sqlKeys(sql) {
  const m = /bk_retention_keys\(\)[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(sql);
  if (!m) return null;
  const body = m[1].split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
  const arr = /array\s*\[([\s\S]*?)\]\s*::\s*text\[\]/.exec(body);
  if (!arr) return null;
  return (arr[1].match(/'([^']*)'/g) || []).map((s) => s.slice(1, -1));
}

/* גוף `bk_retention_sweep` — שם נמצאים הסעיפים שהמוטציות מסירות. */
function sweepBody(sql) {
  const m = /bk_retention_sweep\(p_days[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(sql);
  return m ? m[1] : '';
}

const PROTECTED = (k) => /^PRE_/.test(k) || /^ORPHAN_/.test(k) || /^pre-delete-/.test(k);

/* הרצה מדומה. זורקת מחרוזת `refuse:*` כשהפונקציה מסרבת לרוץ. */
function simulateSweep(sql, rows, days, nowMs) {
  const keys = sqlKeys(sql) || [];
  const body = sweepBody(sql);
  const gEmpty = /cardinality\(v_keys\)\s*=\s*0[\s\S]{0,200}?raise exception/.test(body);
  const gProt = /PRE\\_%[\s\S]{0,300}?raise exception/.test(body);
  const gDays = /p_days\s*<\s*7[\s\S]{0,200}?raise exception/.test(body);
  if (gEmpty && keys.length === 0) throw 'refuse:empty';
  if (gProt && keys.some(PROTECTED)) throw 'refuse:protected';
  if (gDays && (days === null || days < 7)) throw 'refuse:days';

  const del = /delete\s+from\s+public\.kv_backup([\s\S]*?);/.exec(body);
  const where = del ? del[1] : '';
  let match;
  if (/key\s*=\s*any\s*\(\s*v_keys\s*\)/.test(where)) match = (r) => keys.indexOf(r.key) !== -1;
  else {
    const lk = /key\s+like\s+'([^']*)%'/.exec(where);
    match = lk ? (r) => r.key.indexOf(lk[1].replace(/\\/g, '')) === 0 : () => true;
  }
  const aged = /created_at\s*<\s*now\(\)\s*-\s*make_interval\(days\s*=>\s*p_days\)/.test(where)
    ? (r) => r.age > days : () => true;

  const gone = rows.filter((r) => match(r) && aged(r));
  const left = rows.filter((r) => gone.indexOf(r) === -1);
  const logged = gone.length > 0 && /if\s+v_deleted\s*>\s*0[\s\S]{0,400}?insert into public\.sync_log/.test(body);
  return { deleted: gone.length, left: left.map((r) => r.key).sort(), logged: logged };
}

/* פיקסטורה: מפתח יומי ישן/טרי, גיבוי לפני-פעולה, יתום, ומפתח שאינו ברשימה. */
function fixture(dailyKey) {
  return [
    { key: dailyKey, age: 31 },
    { key: dailyKey, age: 5 },
    { key: 'PRE_SYNC_UNIFY_' + dailyKey, age: 400 },
    { key: 'ORPHAN_' + dailyKey, age: 400 },
    { key: 'zar_lo_barshima', age: 400 },
  ];
}

/* ══════════════════════════════════════════════════════════════════════════
   1 · המודול בקוד — שכבת הלקוח שנכשלת-סגור, ⛔ ואין להסיר אותה
   ══════════════════════════════════════════════════════════════════════════ */
function t1() {
  assert(/function _bkRetention\(c, keys\)/.test(SRC),
    '1א · `_bkRetention` קיימת במודול המשותף (סבב 35ג — ⛔ אין להסיר)');
  assert(/\.in\('key', keys\)/.test(SRC),
    '1ב · הגריעה מוגבלת לרשימת-היתר של מפתחות (`in(\'key\', keys)`) ולא לקידומת');
  assert(/if \(!c \|\| !Array\.isArray\(keys\) \|\| !keys\.length\) return 0;/.test(SRC),
    '1ג · רשימה ריקה ⇒ הפונקציה יוצאת בלי למחוק דבר');
  assert(/if \(!del \|\| del\.error \|\| !Array\.isArray\(del\.data\)\) return 0;/.test(SRC),
    '1ד · נכשלת סגור — שגיאה (כולל היעדר הרשאת DELETE) מוחזרת כאפס בשקט');
  assert(/if \(n > 0\) logAction\('retention'/.test(SRC),
    '1ה · `retention` נרשם ליומן רק כשנמחק משהו בפועל');
  assert(/var BK_RETENTION_DAYS = 30;/.test(SRC),
    '1ו · חלון השמירה הוא 30 יום');
  // מפתחות הגיבוי היומי של האפליקציה הזו מופיעים ב-`BK_CFG.sources`.
  APP.keys.forEach(function (k) {
    assert(SRC.indexOf("'" + k + "'") !== -1, '1ז · מפתח הגיבוי `' + k + '` קיים ב-BK_CFG');
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · המיגרציה — צורה: אידמפוטנטיות, הרשאות, תזמון, יומן
   ══════════════════════════════════════════════════════════════════════════ */
function t2(sql) {
  assert(/create extension if not exists pg_cron;/.test(sql),
    '2א · `create extension if not exists pg_cron`');
  assert(/create or replace function public\.bk_retention_keys\(\)/.test(sql) &&
         /create or replace function public\.bk_retention_sweep\(p_days/.test(sql),
    '2ב · שתי הפונקציות ב-`create or replace` — אידמפוטנטי');
  assert(/security definer/.test(sql) && /set search_path = public/.test(sql),
    '2ג · `security definer` עם `search_path` נעוץ');
  assert(/revoke all on function public\.bk_retention_sweep\(integer\)\s+from public, anon, authenticated;/.test(sql),
    '2ד · ⛔ הרשאת ההרצה נשללת מ-anon/authenticated — אחרת זהו נתיב מחיקה ב-RPC');
  assert(/grant execute on function public\.bk_retention_sweep\(integer\) to service_role;/.test(sql),
    '2ה · ההרצה שמורה ל-service_role');
  const uIdx = sql.indexOf("cron.unschedule('bk_retention_daily')");
  const sIdx = sql.indexOf('cron.schedule(');
  assert(uIdx > 0 && sIdx > uIdx, '2ו · `unschedule` לפני `schedule` — אין שתי משימות לאותה גריעה');
  assert(/'17 3 \* \* \*'/.test(sql), '2ז · תזמון יומי ב-03:17 UTC — רחוק מגל הגיבוי של חצות UTC');
  assert(/bk_retention_sweep\(30\)/.test(sql), '2ח · המשימה קוראת לגריעה עם חלון 30 יום');
  assert(/insert into public\.sync_log[\s\S]{0,200}'retention'/.test(sql),
    '2ט · כל ריצה שמחקה כותבת שורת `retention` ל-sync_log');
  assert(!/grant[\s\S]{0,80}delete[\s\S]{0,80}kv_backup/i.test(sql),
    '2י · ⛔ הקובץ אינו מעניק `delete` על `kv_backup` לאיש');
  // רשימת-ההיתר מכסה את מפתחות הגיבוי של האפליקציה הזו.
  const keys = sqlKeys(sql) || [];
  assert(keys.length > 0, '2כ · רשימת-ההיתר אינה ריקה (' + keys.length + ' מפתחות)');
  assert(!keys.some(PROTECTED), '2ל · ⛔ אף מפתח מוגן (`PRE_*`/`ORPHAN_*`) אינו ברשימה');
  APP.sqlKeys.forEach(function (k) {
    assert(keys.indexOf(k) !== -1, '2מ · `' + k + '` ברשימת-ההיתר');
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · המיגרציה — התנהגות: מה נמחק, מה שורד, ומתי היא מסרבת
   ══════════════════════════════════════════════════════════════════════════ */
function t3(sql) {
  const daily = APP.sqlKeys[0];
  const r = simulateSweep(sql, fixture(daily), 30, Date.now());
  assert(r.deleted === 1, '3א · עותק יומי בן 31 יום נגרע (' + r.deleted + ')');
  assert(r.left.indexOf(daily) !== -1, '3ב · העותק הטרי של אותו מפתח שורד');
  assert(r.left.indexOf('PRE_SYNC_UNIFY_' + daily) !== -1, '3ג · ⛔ גיבוי `PRE_*` בן 400 יום שורד');
  assert(r.left.indexOf('ORPHAN_' + daily) !== -1, '3ד · ⛔ גיבוי `ORPHAN_*` בן 400 יום שורד');
  assert(r.left.indexOf('zar_lo_barshima') !== -1, '3ה · מפתח שאינו ברשימה שורד — גם בן 400 יום');
  assert(r.logged, '3ו · הגריעה נרשמה ל-sync_log');

  let refused = '';
  try { simulateSweep(sql, fixture(daily), 3, Date.now()); } catch (e) { refused = String(e); }
  assert(refused === 'refuse:days', '3ז · חלון קצר מ-7 ימים ⇒ הפונקציה מסרבת לרוץ');
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · מוטציות — שתי הדרישות של סבב 35ג
   ══════════════════════════════════════════════════════════════════════════ */
function t4(sql) {
  const daily = APP.sqlKeys[0];

  /* מוטציה א — הרחבת רשימת-ההיתר לקידומת `PRE_*`. חייבת להיתפס. */
  {
    const mut = sql.replace(/array\s*\[/, "array[\n    'PRE_SYNC_UNIFY_" + daily + "',");
    const mk = sqlKeys(mut) || [];
    assert(mk.length === (sqlKeys(sql) || []).length + 1 && mk.some(PROTECTED),
      '4א · המוטציה אכן מרחיבה את רשימת-ההיתר למפתח `PRE_*`');
    let refused = '';
    try { simulateSweep(mut, fixture(daily), 30, Date.now()); } catch (e) { refused = String(e); }
    assert(refused === 'refuse:protected',
      '4ב · מוטציה שמכניסה `PRE_*` לרשימה נתפסת — הפונקציה מסרבת לרוץ');
    /* ובלי בדיקת השפיות היא באמת הייתה מוחקת — כלומר ההגנה נושאת משקל. */
    const noGuard = mut.replace(/if exists \(select 1 from unnest\(v_keys\)[\s\S]*?end if;\n/, '');
    const r = simulateSweep(noGuard, fixture(daily), 30, Date.now());
    assert(r.left.indexOf('PRE_SYNC_UNIFY_' + daily) === -1,
      '4ג · הסרת בדיקת השפיות מוחקת בפועל את גיבוי ה-`PRE_*` — טענת 3ג הייתה נכשלת');
  }

  /* מוטציה ב — רשימת-היתר ריקה. הפונקציה חייבת לסרב. */
  {
    const mut = sql.replace(/array\s*\[[\s\S]*?\]\s*::\s*text\[\]/, "array[]::text[]");
    assert(mut !== sql && (sqlKeys(mut) || []).length === 0, '4ד · המוטציה אכן מרוקנת את הרשימה');
    let refused = '';
    try { simulateSweep(mut, fixture(daily), 30, Date.now()); } catch (e) { refused = String(e); }
    assert(refused === 'refuse:empty', '4ה · רשימת-היתר ריקה ⇒ הפונקציה מסרבת לרוץ');
  }

  /* מוטציה ג — ויתור על תנאי רשימת-ההיתר ב-DELETE עצמו. */
  {
    const mut = sql.replace(/where key = any \(v_keys\)/, "where key like '%'");
    assert(mut !== sql, '4ו · עוגן תנאי ה-DELETE קיים');
    const r = simulateSweep(mut, fixture(daily), 30, Date.now());
    assert(r.left.indexOf('PRE_SYNC_UNIFY_' + daily) === -1 || r.left.indexOf('zar_lo_barshima') === -1,
      '4ז · DELETE בלי רשימת-ההיתר מוחק מפתחות מוגנים/זרים — טענות 3ג–3ה היו נכשלות');
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   5 · התיעוד — הפער רשום במקום שהשער קורא
   ══════════════════════════════════════════════════════════════════════════ */
function t5() {
  assert(DOC.indexOf('פינוי גיבויים אוטומטי במסד') !== -1,
    '5א · שורה 22 במטריצת היכולות קיימת');
  assert(DOC.indexOf(APP.migrationDoc) !== -1,
    '5ב · המיגרציה הרלוונטית נזכרת בשמה (' + APP.migrationDoc + ')');
  assert(/57 השורות/.test(DOC) && /2026-08-18/.test(DOC),
    '5ג · מחיקת 57 שורות ה-`PRE_*`/`ORPHAN_*` רשומה כעובדה');
}

/* ── הרצה ──────────────────────────────────────────────────────────────── */
console.log('· ' + APP.name + ' — סבב 35ג: פינוי גיבויים אוטומטי במסד');
t1();
if (APP.migration) {
  const sql = readFileSync(join(ROOT, APP.migration), 'utf8');
  t2(sql); t3(sql); t4(sql);
} else {
  ok('2–4 · המיגרציה יושבת בפרויקט המשותף (' + APP.migrationDoc +
     ') ונבדקת בריפו שמחזיק אותה — כאן נבדק התיעוד בלבד');
}
t5();

if (failed) { console.error('\n✗ ' + failed + ' טענות נכשלו'); process.exit(1); }
console.log('\n✓ סבב 35ג — כל הטענות עברו');
