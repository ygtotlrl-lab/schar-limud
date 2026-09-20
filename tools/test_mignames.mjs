#!/usr/bin/env node
/* ───────────────────────────────────────────────────────────────────────────
   test_mignames.mjs — שם מיגרציה נגזר, ומותאם לרשומה שרצה (סבב 148)

   **מה נאכף:** ⛔ שלוש ספרות · רצף בלי דילוג מ-`000` · ושם באנגלית
   ב-`snake_case` — ⚠️ וכל קובץ מותאם ב-`APP.migrations` לשם הרשומה
   שבטבלת המעקב שבמסד: ⭐ ומפיל גם הפניה `<ריפו>/migrations/<שם>`
   שאין לה קובץ בעץ של אותו ריפו.

   **הנימוק המדוד:** ⛔ 62 רשומות בפרויקט הישיבה ו-31 באישי, ⚠️ ורבות
   מהן בשם שאינו בעץ כלל — ⭐ ואי אפשר היה לדעת אם קובץ שבעץ רץ:
   ⛔ וגיוס התחילה ב-`001` ⚠️ ואיש לא הצליב את הספרה העודפת.

   **מה יישבר בלעדיו:** ⛔ שני מקורות אמת בלי גשר הם שאלה שאין לה
   תשובה — ⚠️ «האם הקובץ הזה רץ?»: ⭐ ושם מיגרציה הוא **ממשק בין ריפו**,
   ⛔ ושינוי שם ששבר הפניה חוצה אינו נראה בריפו ששינה.

   **מה אינו נאכף כאן:** ⛔ תוכן המיגרציה עצמה — ⚠️ הוא נמדד בשורות
   הסכימה וההרשאות · ⛔ ואין כאן מסד: ⭐ טבלת המעקב היא של Supabase,
   ⚠️ והמרשם הוא מה שמייצג אותה בעץ · ⛔ והפניה שנוקבת במספר בלי שם
   קובץ אינה מתקבלת כהפניה — ⚠️ היא מיקום ברצף, ⭐ והרצף זז.
   ──────────────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PEERS } from './peers.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /*  ⛔ הגשר בין העץ לטבלת המעקב שבמסד — ⚠️ **מה נכנס**: שם קובץ
   *  מיגרציה ⟵ שם הרשומה שרצה, או `null` לקובץ שאין לו רשומה.
   *  ⛔ **ומה מפיל**: קובץ בעץ שאין לו רשומה במרשם, רשומה במרשם שאין
   *  לה קובץ, ו-`null` שאינו מוצהר. ⭐ **ולמה המבנה קיים**: טבלת
   *  המעקב אינה בעץ, ⚠️ ובלי הגשר ל«האם הקובץ הזה רץ?» אין תשובה. */
  migrations: {
    '000_initial_schema.sql': null,
    '001_sl_transactions_soft_delete.sql': 'sl_transactions_soft_delete',
    '002_sl_students_soft_delete.sql': 'add_sl_students_soft_delete',
    '003_transactions_fk_restrict.sql': 'sl_transactions_fk_restrict',
    '004_students_enrollment_months.sql': 'sl_students_enrollment_months',
    '005_seed_credit_method.sql': null,
    '006_client_id_identity.sql': 'sl_client_id_identity',
    '007_client_id_index_full.sql': 'sl_client_id_index_full',
    '008_updated_at.sql': 'sl_updated_at_for_merge',
    '009_settings_lists_offline.sql': 'sl_settings_lists_offline_layer',
    '010_users_pass_fp.sql': null,
    '011_users_role.sql': null,
    '012_revoke_delete_anon.sql': null,
    '013_users_active_updated.sql': 'schar_013_users_active_updated_deleted',
    '014_full_indexes.sql': 'schar_014_full_indexes',
    '015_users_drop_plaintext_password.sql': 'schar_015_users_drop_plaintext_password',
    '016_drop_sl_users_password.sql': 'drop_plaintext_password_columns',
    '017_stamp_bigint_drop_touch.sql': 'sl_017_stamp_bigint_drop_touch',
    '018_users_client_id_shape.sql': 'sl_018_users_client_id_shape',
    '019_client_id_is_the_key.sql': 'sl_019_client_id_is_the_key',
    '020_settings_soft_delete.sql': 'sl_020_settings_soft_delete',
    '021_role_vocabulary_check.sql': 'sl_role_vocabulary_check',
    '022_role_junior.sql': 'role_junior_sl_users',
    '023_sl_settings_value_json_check.sql': 'kv_value_json_check',
    '024_revoke_schema_grants.sql': null,
  },
  /*  ⛔ קובץ שאין לו רשומה במעקב — ⚠️ **מה נכנס**: שם הקובץ ⟵ למה אין
   *  לו רשומה; ⛔ **ומה מפיל**: הצהרה שאין לה `null` במרשם, ו-`null`
   *  שאין לו הצהרה. ⭐ **ולמה היא קיימת**: «אין רשומה» הוא ממצא
   *  ⛔ ולא השמטה, ⚠️ ובלי הנימוק הוא נקרא כפער שאיש לא מדד. */
  migNoRecord: {
    '000_initial_schema.sql': 'הטבלאות נוצרו מעורך ה-SQL לפני שהמעקב הופעל — ⛔ ואין רשומה שתוכנה זה',
    '005_seed_credit_method.sql': 'הזריעה רצה מעורך ה-SQL בלי רישום — ⛔ ואין רשומה שתוכנה זה',
    '010_users_pass_fp.sql': 'עמודות הטביעה נוספו מעורך ה-SQL בלי רישום — ⛔ ואין רשומה שתוכנה זה',
    '011_users_role.sql': 'עמודת התפקיד נוספה מעורך ה-SQL בלי רישום — ⛔ ואין רשומה שתוכנה זה',
    '012_revoke_delete_anon.sql': 'ההרשאות נשללו מעורך ה-SQL בלי רישום — ⛔ ואין רשומה שתוכנה זה',
    '024_revoke_schema_grants.sql': 'ההרשאות נשללו מעורך ה-SQL בלי רישום — ⛔ ואין רשומה שתוכנה זה',
  },
  /*  ⛔ רשומה שרצה ואין לה קובץ בעץ — ⚠️ **מה נכנס**: שם הרשומה ⟵
   *  למה אין לה קובץ; ⛔ **ומה מפיל**: שם ריק, שם בלי נימוק, ושם
   *  שכבר מותאם לקובץ ב-`migrations`. ⭐ **ולמה היא קיימת**: אין דרך
   *  לשחזר את תוכנה, ⛔ וההצהרה היא מה שמונע שתישכח. */
  migRanNoFile: {
    'sync_log_and_kv_backup_phase1': 'טבלאות היומן והגיבוי נוצרו כרשומה נפרדת — ⛔ ואין קובץ שתוכנו זה',
    'sync_log_kv_backup_append_only': 'הגנת ה-append-only רצה כרשומה נפרדת — ⛔ ואין קובץ שתוכנו זה',
    'sync_log_kv_backup_revoke_truncate': 'שלילת ה-truncate רצה כרשומה נפרדת — ⛔ ואין קובץ שתוכנו זה',
    'shared_004_retention_keys_drop_ys_attend': 'הרצה חוזרת של רשימת-ההיתר אחרי שמפתח ירד — ⛔ ואין לה קובץ משלה',
    'drop_kv_table_final': 'מחיקת `kv` רצה פעמיים — ⚠️ והרשומה השנייה היא שנושאת את שם הקובץ',
    'backup_allowlist_drop_ys_cls_years': 'הוצאת המפתח מרשימת-ההיתר — ⚠️ הכיוון היה הפוך, והקובץ שנכתב הוא זה שמחזיר אותו',
    'stamp_drop_zero_default': 'הסרת ברירת המחדל מהחותמת רצה מעורך ה-SQL — ⛔ ואין לה קובץ',
    'ys_029_final_form_reapply': 'הרצה חוזרת של אותו קובץ בצורתו הסופית — ⛔ ואין לה קובץ משלה',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [220];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`) בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passN = 0, failN = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
/*  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ כל טענה נמדדת מהעץ ומהמרשם של הריפו
 *  עצמו, ⭐ ומספרן זהה בכולן. */
const FLOOR = { shared: 12, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות. */
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
 *  ⛔ ויותר ממנו הוא ריצפה מיושנת שהפסיקה למדוד את מה שנוסף. */
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
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — עדכן את \`FLOOR\`.`);
    process.exitCode = 1;
  }
});
const ok = (c, m) => { RAN++; if (c) passN++; else { failN++; console.error('❌ ' + m); } };

/*  ⛔ הדפוס — ⚠️ שלוש ספרות · קו תחתון · ושם באנגלית ב-`snake_case`:
 *  ⭐ אות עברית, אות גדולה, מקף או ספרה רביעית אינם בדפוס. */
const NAME_RE = /^[0-9]{3}_[a-z][a-z0-9_]*\.sql$/;
/*  ⛔ ההפניה היא `<ריפו>/migrations/<שם>` — ⚠️ **והיא אינה מקבלת תחילית
 *  מספרית לבדה**: ⭐ הפניה למספר בלי שם היא הפניה למיקום ברצף, ⛔ ולא
 *  לקובץ — ⚠️ והרצף זז. */
const REF_RE = /(yoman-avoda|hanhala-ruchanit|schar-limud|gius|ha-kupa)\/migrations\/([0-9A-Za-z_.]+)/g;
/*  ⛔ סיומות שאינן טקסט — ⚠️ קריאתן כ-UTF-8 מייצרת בייטים שאינם תווים,
 *  ⭐ ואין בהן הפניה. */
const SKIP_EXT = /\.(png|jpg|jpeg|gif|webp|ico|keystore|jks|zip|apk|woff2?|ttf)$/i;

/*  ⛔ העץ נסרק במערכת הקבצים ⛔ ולא ב-git — ⚠️ השער רץ גם על עותק זמני
 *  שאין בו מאגר, ⭐ ושם `git ls-files` היה מחזיר ריק ⛔ ולא נכשל. */
function walk(dir, rel, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name), r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(p, r, out);
    else if (!SKIP_EXT.test(e.name)) out.push(r);
  }
  return out;
}

/*  ⛔ המיגרציות של ריפו שעל הדיסק — ⚠️ ריפו שאינו שם מוחזר `null`,
 *  ⭐ וההפניות אליו מדווחות «לא נמדד» ⛔ ואינן מפילות: ⚠️ ריפו חסר
 *  אינו כשל קוד. */
function migSet(repoRoot) {
  try { return new Set(fs.readdirSync(path.join(repoRoot, 'migrations'))); }
  catch { return null; }
}

/* ══════════════════════════════════════════════════════════════════════════
   1 · שם הקובץ בדפוס, והרצף שלם מ-000
   ══════════════════════════════════════════════════════════════════════════ */
function badNames(files) { return files.filter((f) => !NAME_RE.test(f)); }
function seqGaps(files) {
  const nums = files.filter((f) => NAME_RE.test(f)).map((f) => Number(f.slice(0, 3)))
    .sort((a, b) => a - b);
  const want = nums.map((_, i) => i);
  return nums.filter((n, i) => n !== want[i]);
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · המרשם מול העץ, ומול עצמו
   ══════════════════════════════════════════════════════════════════════════ */
function regGaps(files, reg, noRec, ranNoFile) {
  const keys = Object.keys(reg);
  const fileNoEntry = files.filter((f) => !(f in reg));
  const entryNoFile = keys.filter((k) => !files.includes(k));
  const nulls = keys.filter((k) => reg[k] === null);
  const badRec = keys.filter((k) => reg[k] !== null &&
    (typeof reg[k] !== 'string' || !reg[k].trim()));
  const nullNoWhy = nulls.filter((k) => !String(noRec[k] || '').trim());
  const whyNoNull = Object.keys(noRec).filter((k) => reg[k] !== null);
  const mapped = new Set(keys.map((k) => reg[k]).filter(Boolean));
  const ranBad = Object.entries(ranNoFile)
    .filter(([n, why]) => !n.trim() || !String(why || '').trim() || mapped.has(n))
    .map(([n]) => n);
  return { fileNoEntry, entryNoFile, badRec, nullNoWhy, whyNoNull, ranBad };
}

/* ══════════════════════════════════════════════════════════════════════════
   3 · כל הפניה מוצלבת מול העץ של הריפו שהיא נוקבת בו
   ══════════════════════════════════════════════════════════════════════════ */
function refGaps(docs, trees) {
  const broken = [], absent = new Set();
  let seen = 0;
  for (const [file, text] of docs) {
    REF_RE.lastIndex = 0;
    let m;
    while ((m = REF_RE.exec(text)) !== null) {
      const [, repo, name] = m;
      const tree = trees[repo];
      if (!tree) { absent.add(repo); continue; }
      seen++;
      if (!tree.has(name)) broken.push(`${file} ⟵ ${repo}/migrations/${name}`);
    }
  }
  return { broken, seen, absent: [...absent] };
}

/* ─ הרצת בדיקות הנכונות ────────────────────────────────────────────────── */
console.log(`\n═══ שם מיגרציה נגזר, ומותאם לרשומה שרצה (${APP.app}) ═══\n`);
const FILES = fs.readdirSync(path.join(ROOT, 'migrations')).sort();
const DOCS = walk(ROOT, '', []).map((f) => {
  try { return [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]; } catch { return [f, '']; }
});
const SIBS = path.resolve(ROOT, '..');
const TREES = {};
for (const r of PEERS) TREES[r] = r === APP.app ? new Set(FILES) : migSet(path.join(SIBS, r));

function t1() {
  const bad = badNames(FILES);
  ok(bad.length === 0, `[mig-pattern] migrations/: ${bad.join(', ')} — נמדדו ${bad.length} שמות ` +
    'מחוץ לדפוס `NNN_name.sql` והצפוי אפס. מיישרים לשלוש ספרות ולשם אנגלי ב-snake_case');
  const gaps = seqGaps(FILES);
  ok(gaps.length === 0, `[mig-seq] migrations/: הרצף אינו 000..${FILES.length - 1} — ` +
    `נמדדו ${gaps.length} מספרים מחוץ למקומם והצפוי אפס. מסיטים את הרצף כך שיתחיל ב-000`);
  ok(FILES.length > 0, `[mig-count] migrations/: נמדדו ${FILES.length} קבצים והצפוי לפחות אחד. ` +
    'מוסיפים את קובץ הסכימה');
}

function t2() {
  const g = regGaps(FILES, APP.migrations, APP.migNoRecord, APP.migRanNoFile);
  ok(g.fileNoEntry.length === 0, `[mig-file-no-entry] APP.migrations: ${g.fileNoEntry.join(', ')} — ` +
    `נמדדו ${g.fileNoEntry.length} קבצים בלי רשומה במרשם והצפוי אפס. מוסיפים להם שורה`);
  ok(g.entryNoFile.length === 0, `[mig-entry-no-file] APP.migrations: ${g.entryNoFile.join(', ')} — ` +
    `נמדדו ${g.entryNoFile.length} רשומות שאין להן קובץ בעץ והצפוי אפס. מסירים אותן`);
  ok(g.badRec.length === 0, `[mig-rec-empty] APP.migrations: ${g.badRec.join(', ')} — ` +
    `נמדדו ${g.badRec.length} ערכים שאינם שם רשומה ואינם \`null\` והצפוי אפס. כותבים את שם הרשומה`);
  ok(g.nullNoWhy.length === 0, `[mig-null-decl] APP.migNoRecord: ${g.nullNoWhy.join(', ')} — ` +
    `נמדדו ${g.nullNoWhy.length} קבצים בלי רשומה ובלי נימוק והצפוי אפס. מוסיפים להם נימוק`);
  ok(g.whyNoNull.length === 0, `[mig-null-decl] APP.migNoRecord: ${g.whyNoNull.join(', ')} — ` +
    `נמדדו ${g.whyNoNull.length} הצהרות שיש להן רשומה במרשם והצפוי אפס. מסירים את ההצהרה`);
  ok(g.ranBad.length === 0, `[mig-ran-no-file] APP.migRanNoFile: ${g.ranBad.join(', ')} — ` +
    `נמדדו ${g.ranBad.length} הכרזות בלי נימוק או שכבר מותאמות לקובץ, והצפוי אפס. ` +
    'מסירים אותן או מוסיפים נימוק');
  const mapped = Object.values(APP.migrations).filter(Boolean).length;
  ok(mapped + Object.keys(APP.migNoRecord).length === FILES.length,
    `[mig-cover] APP.migrations: נמדדו ${mapped} מותאמים ו-${Object.keys(APP.migNoRecord).length} ` +
    `מוצהרים בלי רשומה, סך ${mapped + Object.keys(APP.migNoRecord).length} מול ${FILES.length} ` +
    'קבצים בעץ. משלימים את המרשם');
}

function t3() {
  const r = refGaps(DOCS, TREES);
  ok(r.broken.length === 0, `[mig-ref] הפניות למיגרציה שאין לה קובץ: ${r.broken.join(' · ')} — ` +
    `נמדדו ${r.broken.length} מתוך ${r.seen} הפניות והצפוי אפס. כותבים את שם הקובץ שקיים בעץ`);
  if (r.absent.length) console.log(`  ⚠️ לא נמדד: ${r.absent.join(', ')} אינם על הדיסק`);
  ok(r.seen > 0 || r.absent.length > 0,
    `[mig-ref-scan] הסריקה מדדה ${r.seen} הפניות והצפוי לפחות אחת. ` +
    'בודקים שהביטוי סורק את העץ');
}

for (const t of [t1, t2, t3]) {
  try { t(); }
  catch (e) { failN++; console.error(`❌ טענה זרקה: ${(e && e.stack) || e}`); }
}

/*  ⛔ מכאן ולמטה מוטציות ובדיקות שלמות — ⚠️ הן רצות ברמה המלאה בלבד:
 *  ⛔ הרמה המהירה עוצרת כאן עם קוד היציאה של הטענות שכבר רצו. */
mutStage();
if (!RUN_MUT) {
  console.log('\n⏭ test_mignames: המוטציות רצות ברמה המלאה (--full) — ⛔ ואינן נמדדות כאן');
  console.log(`\n[${APP.app}] ${passN} עברו, ${failN} נכשלו`);
  process.exit(failN ? 1 : 0);
}

/* ══════════════════════════════════════════════════════════════════════════
   4 · מוטציות — ⛔ על עותק בזיכרון, ⛔ ולא על העץ
   ══════════════════════════════════════════════════════════════════════════
   ⛔ כל מוטציה נוקבת בשם הטענה שתיפול, ⚠️ והמדידה היא שהערך שהטענה
   מודדת התהפך: ⭐ מוטציה שמפילה טענה אחרת אינה אכיפה. */
function t4() {
  const n = FILES.length;
  /*  ⛔ המוטציה היא `.replace` על שם קובץ אמיתי ⛔ ולא מחרוזת שנכתבה ביד —
   *  ⚠️ מחרוזת שנכתבה ביד אינה מוכיחה שהדפוס תופס את מה שבעץ. */
  const mA = FILES.concat([FILES[0].replace(/^(\d)/, '0$1')]);
  ok(badNames(FILES).length === 0 && badNames(mA).length === 1,
    `[mig-pattern] 4א · ⛔ מוטציה: ספרה רביעית מפילה — נמדד 0 ⟵ 1`);
  const mB = FILES.filter((f) => Number(f.slice(0, 3)) !== 1);
  ok(seqGaps(FILES).length === 0 && seqGaps(mB).length > 0,
    `[mig-seq] 4ב · ⛔ מוטציה: דילוג ברצף מפיל — נמדד 0 ⟵ ${seqGaps(mB).length}`);
  const mC = FILES.concat([FILES[0].replace(/_[a-z0-9_]+\.sql$/, '_שם_בעברית.sql')]);
  ok(badNames(mC).length === 1,
    '[mig-pattern] 4ג · ⛔ מוטציה: שם בעברית מפיל — נמדד 0 ⟵ 1');
  /*  ⛔ שם הריפו נבנה בזמן ריצה ⛔ ואינו ליטרל — ⚠️ ליטרל בגוף השער היה
   *  נסרק כהפניה אמיתית, ⭐ והשער היה מפיל את עצמו. */
  const mutRepo = PEERS.find((r) => TREES[r]) || APP.app;
  const mD = [['tools/_mut.md', `ר\` ${mutRepo}/migrations/099_x.sql \``]];
  ok(refGaps(mD, TREES).broken.length === 1,
    `[mig-ref] 4ד · ⛔ מוטציה: הפניה ל-${mutRepo}/migrations/099_x.sql שאינו קיים מפילה — נמדד 0 ⟵ 1`);
  const mE = regGaps(FILES.concat(['999_no_entry.sql']), APP.migrations,
    APP.migNoRecord, APP.migRanNoFile);
  ok(mE.fileNoEntry.length === 1,
    '[mig-file-no-entry] 4ה · ⛔ מוטציה: קובץ בלי רשומה במרשם מפיל — נמדד 0 ⟵ 1');
  const regF = { ...APP.migrations, '998_no_file.sql': 'ghost_record' };
  const mF = regGaps(FILES, regF, APP.migNoRecord, APP.migRanNoFile);
  ok(mF.entryNoFile.length === 1,
    '[mig-entry-no-file] 4ו · ⛔ מוטציה: רשומה במרשם בלי קובץ מפילה — נמדד 0 ⟵ 1');
}

/* ══════════════════════════════════════════════════════════════════════════
   5 · ⭐ מוטציית-נגד — שינוי חי ⛔ שאינו מפיל
   ══════════════════════════════════════════════════════════════════════════
   ⚠️ רשומה שמוצהרת כ«רצה בלי קובץ» היא בדיוק המקרה שהמרשם נועד לתעד,
   ⛔ ושער שהיה נופל עליה היה מכריח למחוק את מה שאין דרך לשחזר. */
function t5() {
  const ran = { ...APP.migRanNoFile, nc_ran_without_file: 'רשומה שרצה מעורך ה-SQL ואין לה קובץ' };
  const g = regGaps(FILES, APP.migrations, APP.migNoRecord, ran);
  ok(Object.keys(ran).length === Object.keys(APP.migRanNoFile).length + 1,
    'נ1 · מוטציית-הנגד אכן מוסיפה הכרזה');
  ok(g.ranBad.length === 0 && g.fileNoEntry.length === 0 && g.entryNoFile.length === 0,
    `נ2 · ⭐ ואף על פי כן אינה מפילה — נמדדו ${g.ranBad.length} חריגות והצפוי אפס`);
  const docs = DOCS.concat([['tools/_nc.md', `ר\` ${APP.app}/migrations/${FILES[0]} \``]]);
  ok(refGaps(docs, TREES).broken.length === 0,
    'נ3 · ⭐ והפניה תקינה לריפו אחר אינה מפילה — נמדדו 0 שבורות והצפוי אפס');
}

for (const t of [t4, t5]) {
  try { t(); }
  catch (e) { failN++; console.error(`❌ מוטציה זרקה: ${(e && e.stack) || e}`); }
}

console.log(`\n[${APP.app}] ${passN} עברו, ${failN} נכשלו`);
process.exit(failN ? 1 : 0);
