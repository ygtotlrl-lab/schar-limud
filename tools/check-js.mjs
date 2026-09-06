#!/usr/bin/env node
/*  שער תקינות JS — חובה לפני כל דחיפה (סבב 33: אוחד לארבעת הריפו).
 *
 *  ⭐ משימת הבודק: סורק את בלוקי ה-JS המוטבעים, `sw.js` ואת קובצי `tools/`
 *  — ⛔ ומפיל על שגיאת תחביר, ⛔ על שער שנפל, ⛔ ועל שער שחצה את תקרת הזמן.
 *
 *  index.html מחזיק את האפליקציה כולה כ-JS מוטבע, ולכן שגיאת תחביר אינה
 *  נתפסת בשום lint רגיל — היא מגיעה למשתמש כמסך לבן, בלי אזהרה. השער:
 *
 *    1. מחלץ כל בלוק <script> מוטבע מ-index.html ומריץ עליו node --check.
 *    2. מריץ node --check על sw.js.
 *    3. מאמת כללי-אמת שפרסר אינו תופס (APP.rules — פר-אפליקציה; כל כלל
 *       נמדד מהקבצים של האפליקציה עצמה ולא הועתק מריפו אחר).
 *    4. מריץ את כל שערי האחידות ואת חבילות בדיקות הסבבים (APP.gates),
 *       בבריכה מקבילה שגודלה CHECKJS_JOBS.
 *       CHECKJS_STAGES_ONLY=1 עוצר אחרי שלב 3, בלי חבילות הבדיקה.
 *
 *  ⭐ שתי רמות ריצה, ⛔ והדגל הוא מה שמבדיל ביניהן:
 *    • מהירה — `node tools/check-js.mjs`, **ברירת המחדל**: כל השערים,
 *      בדיקות נכונות בלבד. ⭐ זו הריצה שבמהלך העבודה, אחרי כל שינוי —
 *      ⛔ ואינה מחליפה את המלאה לפני מיזוג.
 *    • מלאה — `node tools/check-js.mjs --full`: אותם שערים, ואיתם
 *      המוטציות ובדיקות השלמות. ⛔ זו הריצה שבסוף הסבב ולפני מיזוג —
 *      ⚠️ המוטציות הן מה שמוכיח שהשער מפיל, ⛔ ואינן מוותרות, ⭐ מה
 *      שהשתנה הוא **מתי** הן רצות ⛔ ולא **אם**.
 *
 *  ⭐ השער נולד ב-gius (סבב 11) וחי שם לבדו עשרה סבבים בלי שאיש החליט על
 *  כך — הפער שהוליד את השער הזה. מסבב 33 הוא זהה בית-לבית בארבעת
 *  הריפו פרט לבלוק APP.
 *
 *      node tools/check-js.mjs
 *
 *  יציאה בקוד שונה מאפס אם כשל אחד או יותר.
 */
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { tmpdir, cpus } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /* ⚠️ הכללים נמדדו מ-sw.js ומ-index.html של האפליקציה הזו (סבב 33,
     הורחבו בסבב 35) — לא הועתקו מריפו אחר. [file, regex, expect, msg]
     ⚠️ מסבב 35 יש כאן רשימת CDN במטמון-מראש עם ריפוי עצמי (התבנית של
     שלוש האחיות), ולכן נוסף כלל mode:'cors' — נמדד, לא הוצהר.
     ⭐ ומסבב 42ג יש כאן גם דף אופליין (הליבה המשותפת), ולכן נוסף כלל
     ה-Content-Type — כבשלוש האחיות. */
  rules: [
    ['sw',   "CACHE_NAME\\s*=\\s*'schar-limud-v\\d+'", true,
             "sw.js: CACHE_NAME בתבנית 'schar-limud-v<N>' (תבנית, לא מספר קבוע)"],
    ['sw',   "supabase\\.co", true, "sw.js: דילוג על בקשות supabase.co"],
    ['sw',   "prefix:\\s*'schar-limud-'", true,
             "sw.js: SW_CFG.prefix = 'schar-limud-'"],
    ['sw',   "indexOf\\(SW_CFG\\.prefix\\)\\s*===\\s*0", true,
             "sw.js: ניקוי המטמון לפי SW_CFG.prefix בלבד"],
    ['sw',   "mode:\\s*'cors'", true, "sw.js: משיכת CDN ב-mode:'cors'"],
    ['sw',   "text/html;\\s*charset=utf-8", true,
             "sw.js: דף האופליין עם Content-Type מפורש"],
    ['sw',   "supabase-js@2\\.111\\.0", true, "sw.js: supabase-js נעוץ ברשימת ה-CDN"],
    ['html', "supabase-js@2\\.111\\.0", true, "index.html: supabase-js נעוץ ל-2.111.0"],
    ['html', "supabase-js@2/", false, "index.html: אין גרסת CDN צפה @2"],
  ],
  gates: ['test_rulesdocs.mjs',
           'test_dbfacts.mjs',
          'test_sharedsync.mjs',
          'test_signedshared.mjs',
          'test_filesets.mjs',
          'test_inputlayer.mjs',
          'test_iconlayer.mjs',
          'test_idarg.mjs',
          'test_sources.mjs',
          'test_backup_policy.mjs',
          'test_bump.mjs',
         'test_pendflush.mjs', 'test_lock.mjs',
          'test_session.mjs',
          'check-structure.mjs', 'check-status-area.mjs', 'check-docs.mjs',
          'check-comments.mjs', 'check-capabilities.mjs',
          'test_pull.mjs',
          'test_push.mjs',
          'test_budget.mjs', 'test_icons.mjs',
          'test_android.mjs', 'test_lists.mjs',
          'test_manifest.mjs',
          'test_swcore.mjs',
          'test_build.mjs',
          'test_shell.mjs', 'test_devid.mjs', 'test_passwords.mjs',
          'test_md.mjs', 'test_orphans.mjs', 'test_removals.mjs', 'test_wiring.mjs', 'test_readonly.mjs', 'test_crossgate.mjs',
          'test_offline_login.mjs', 'test_roles.mjs',
          'test_stage_a.mjs', 'test_hotwin.mjs', 'test_cron.mjs',
          'test_merge_pending.mjs', 'test_matrix.mjs', 'test_ids.mjs'],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ תקרת השער
 *  הבודד נמדדת כאן מפני שכאן ממילא רצים כל השערים, ⛔ ושער נפרד שימדוד
 *  אותה היה מריץ את כולם פעם שנייה. */
export const ROWS = [31, 32, 24];

const T_START = Date.now();
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), APP.app + '-check-'));

/*  ⛔ אותם עוזרים כמו בחמשת הבודקים האחרים (סבב 72) — ⚠️ ואין לפתוח
 *  דפוס שני (`ok`/`FAIL`, בלי מונה ובלי `pass`): ⛔ שני דפוסים לאותו
 *  דבר מלמדים לקרוא כל בודק מחדש. */
let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

function check(label, file) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    pass(label);
  } catch (err) {
    fail(`${label}: שגיאת תחביר — נמדד פרסור שנכשל במקום פרסור תקין. ` +
         'מתקנים את הבלוק המוטבע; הפירוט מלמטה');
    console.error(String(err.stderr || err.stdout || err.message).trim());
  }
}

/* ── 1. חילוץ הסקריפטים המוטבעים מ-index.html ──────────────────────────── */
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
let m, n = 0;
while ((m = re.exec(html)) !== null) {
  if (/\bsrc\s*=/i.test(m[1])) continue;             // סקריפט חיצוני — אין מה לפרסר
  n++;
  const out = join(work, `index-inline-${n}.js`);
  writeFileSync(out, m[2]);
  check(`index.html inline script #${n}`, out);
}
if (n === 0) {
  fail('index.html: נמדדו 0 סקריפטים מוטבעים והצפוי לפחות 1 — ' +
       'המבנה השתנה, ובודקים אם הקוד עבר לקובץ חיצוני');
}

/* ── 2. קבצים עצמאיים ──────────────────────────────────────────────────── */
check('sw.js', join(ROOT, 'sw.js'));

/* ── 3. כללי-אמת שפרסר אינו תופס (APP.rules) ───────────────────────────── */
const SRC = { sw: readFileSync(join(ROOT, 'sw.js'), 'utf8'), html };
for (const [file, reSrc, expect, msg] of APP.rules) {
  const hit = new RegExp(reSrc).test(SRC[file]);
  if (hit === expect) { pass(msg); continue; }
  fail(`${msg} — נמדד ${hit ? 'נמצא' : 'לא נמצא'} והצפוי ` +
       `${expect ? 'נמצא' : 'לא נמצא'}. מיישרים את ${file === 'sw' ? 'sw.js' : 'index.html'}`);
}

/*  ⛔ דגל השלבים (סבב 72) — ⚠️ שער שדורש רק את שלבי ה-`node --check` אינו
 *  מריץ את חבילות הבדיקה: ⭐ הריצה החיצונית מוכיחה את הבקרה החיובית ממילא,
 *  ⛔ וריצה פנימית שנייה של הסט המלא היא אותה עבודה פעמיים. */
if (process.env.CHECKJS_STAGES_ONLY) {
  if (failures) { rmSync(work, { recursive: true, force: true });
    console.error(`\n❌ ${APP.app}: ${failures} כשלים בשלבים 1–3`); process.exit(1); }
  console.log('\n✅ שלבים 1–3 עברו');
  rmSync(work, { recursive: true, force: true });
  process.exit(0);
}

/* ── 4. שערי האחידות וחבילות הבדיקה (APP.gates) ────────────────────────── */
/*  ⛔ הרמה נקבעת בדגל מפורש, ⛔ וברירת המחדל היא המהירה (סבב 92) — ⚠️ עד
 *  כאן הייתה המלאה, ⭐ ומחירה נמדד: כל הרצה שילמה על כל המוטציות, ⛔ ושני
 *  שערים לבדם היו רוב זמן הסט. ⚠️ והסיכון שההיפוך פותח — «שכחתי את הדגל
 *  והמוטציות לא רצו» — ⛔ נסגר בשער שמודד שכל שער שנושא מוטציית-נגד שואל
 *  את `GATE_MUT`, ⭐ ולא בברירה עצמה. */
/*  ⛔ רמת הריצה נגזרת מארגומנטים וסביבה בפונקציה טהורה (סבב 92) — ⚠️ כדי
 *  שהברירה עצמה תהיה נמדדת: ⭐ קריאה עם קלט ריק מחזירה את מה שרץ כשאיש
 *  אינו מבקש דבר, ⛔ ומשתנה שמשווים לעצמו אינו יכול להיכשל.
 *  ⛔ `GATE_MUT` נלקח בחשבון מפני שהריצות הפנימיות יורשות אותו מהסביבה —
 *  ⚠️ בלעדיו ריצה פנימית של הרמה המלאה הייתה מדלגת על המוטציות. */
export function levelOf(argv, env) {
  return (argv.includes('--full') || env.GATE_MUT === '1') ? 'מלאה' : 'מהירה';
}
const LEVEL = levelOf(process.argv, process.env);
const FULL = LEVEL === 'מלאה';
const FAST = !FULL;

/*  ⛔ כל השערים נכנסים לבריכה, ⛔ ואין רשימה סדרתית — ⚠️ נסרקו ונמצאו
 *  עצמאיים: כל אחד כותב לתיקיית `mkdtemp` משלו, ⛔ ואף אחד אינו קורא את
 *  פלטו של אחר. ⭐ והשער שמריץ את הסט המלא על עותק נמדד ⛔ ולא שוער:
 *  הוצאתו מהבריכה עלתה 43–44 שניות מול 37, ⚠️ מפני שהוא הארוך מכולם
 *  והרצתו לבדו מסדרת את מה שאפשר לחפוף. */

/*  ⛔ אין כאן עוד רשימת שערים שהרמה המהירה מדלגת עליהם (סבב 92) — ⚠️ עד
 *  כאן היא דילגה על אחד-עשר שערים שלמים, ⭐ ואיתם על **בדיקות הנכונות**
 *  שבתוכם: ⛔ מי שרץ בזמן העבודה ויתר על כיסוי, ולא רק על מוטציות.
 *  ⭐ מה שמבדיל את הרמות מעכשיו הוא `GATE_MUT` בלבד — ⛔ כל השערים רצים
 *  בשתיהן, ⚠️ והמוטציות ובדיקות השלמות רצות במלאה בלבד. */

/*  ⛔ המקביליות נמדדה ולא שוערה — ⚠️ 244.8 שניות סדרתי מול 120.1 בארבעה
 *  תהליכים, ⛔ והטענה ש«מקבילה איטית יותר» לא עמדה במדידה. ⭐ הפלט נצבר
 *  לכל שער ונכתב בסדר ההכרזה — ⛔ פלט שנשזר בין שערים אינו קריא, ⚠️ וסדר
 *  לפי מי שסיים ראשון משתנה בין הרצה להרצה ושובר השוואת שני לוגים. */
/*  ⛔ תקציב הזמן של השער הבודד (סבב 74ב) — ⚠️ בלי תקרה, שער שתפח חי
 *  חודשים בלי שאיש ידע: ⭐ `test_rulesdocs` הגיע ל-77 שניות מפני שרתמת
 *  המוטציה שלו ישבה מעל סוגר הריצה הפנימית, ⛔ והמספר לא נמדד באף מקום.
 *  ⚠️ הערך נדיב בכוונה — ⛔ הוא נועד לתפוס שער שתפח בסדר גודל, ⚠️ ולא
 *  לדרג שערים תקינים זה מול זה. */
const BUDGET_MS = 10000;

/*  ⛔ ותקרה גם לסט כולו (סבב 92) — ⚠️ 46 שערים שכל אחד מהם מתחת לתקרה שלו
 *  הם 7.7 דקות תקינות בריפו אחד ו-30 דקות בארבעה, ⛔ בלי שאף שער יחרוג:
 *  ⭐ תקרת השער הבודד תופסת שער שתפח, ⛔ ואינה תופסת סט שתפח.
 *  ⛔ הערך נגזר ⛔ ואינו נבחר — ⚠️ **שבע דקות** לארבעת הריפו, חלקי ארבע. */
const SET_BUDGET_MS = 105000;

/*  ⛔ חריגה מוכרזת בלבד (סבב 74ב) — ⚠️ שער שחוצה את התקרה ואינו כאן
 *  **מפיל**, ⭐ והכניסה לכאן היא הכרעת מנהל: ⛔ רשימה שגדלה בשקט היא
 *  תקרה שאינה קיימת. `שם השער: הנימוק`. */
const BUDGET_EXEMPT = {
  /*  ⛔ ארבעה שערים חוצים את התקרה **לבדם**, ⛔ ואיש לא מחק אותם ולא הרים
   *  את התקרה — ⭐ הם מוכרזים כאן עד הכרעת מנהל. ⛔ **וכל אחד נמדד מחדש
   *  בסבב שנוגע בו (סבב 75)** — ⚠️ חריגה שנימוקה חדל להתקיים היא שארית,
   *  ⛔ והנמקה של חריגה שכבר אינה חריגה היא הערה מיושנת.
   *  ⛔⛔ **וכל אחד מהם חורג ברמה המלאה בלבד (סבב 92)** — ⚠️ ברמה המהירה
   *  כולם מתחת לתקרה: ⭐ מה שחורג הוא המוטציות ובדיקות השלמות,
   *  ⛔ ולא גוף השער. ⚠️ והנימוק נושא את שתי הרמות — ⛔ נימוק שאינו
   *  מבחין ביניהן מתאר תקרה שאינה זו שנחצתה.
   *  ⛔⛔ **ואין בנימוק מספר מוקלד (סבב 95)** — ⚠️ שנייה שהוקלדה כאן
   *  מתארת מכונה אחת, ⛔ וספירה שהוקלדה נסחפת בכל מוטציה שנוספת:
   *  ⭐ הזמן עצמו נמדד ומודפס בכל הרצה. */
  /*  ⛔ הפער בין הריפו אינו סטייה — ⚠️ השער מריץ את **הסט המלא** של
   *  האפליקציה על עותק, ⭐ ומספר השערים שלה הוא מה שקובע: ⛔ הפער נגזר
   *  ממנו, ⚠️ ולא מגוף השער. */
  'test_readonly.mjs':  'מריץ את הסט המלא על עותק — ⛔ קו הבסיס המוכרז, ' +
                        'והוא היחיד שרשאי לכך; ⛔ חורג ברמה המלאה בלבד — ' +
                        '⭐ ובמהירה הוא מתחת לתקרה: ⚠️ הזמן עצמו נמדד ' +
                        'ומודפס בכל הרצה',
  'test_crossgate.mjs': 'משווה ארבעה שערים זה מול זה, ⛔ וכל מוטציה מריצה ' +
                        'שניים מהם על עותק אחד משותף; ⛔ חורג ברמה המלאה ' +
                        'בלבד — ⭐ ובמהירה הוא מתחת לתקרה: ⚠️ הזמן עצמו ' +
                        'נמדד ומודפס בכל הרצה',
  /*  ⛔ החריגה הזו אינה אחידה בארבעתם — ⚠️ הזמן תלוי במספר שורות
   *  הטבלה שאינן מוחרגות, ⭐ והוא נבדל בין הריפו. */
  'test_matrix.mjs':    'הופך תא בטבלה ומריץ את check-capabilities על עותק ' +
                        'אחד משותף, ⛔ פעם לכל שורה שאינה מוחרגת; ⛔ חורג ' +
                        'ברמה המלאה בלבד — ⭐ ובמהירה הוא מתחת לתקרה: ' +
                        '⚠️ הזמן עצמו נמדד ומודפס בכל הרצה',
  /*  ⛔ `test_iconlayer` ירד מכאן (סבב 79) — ⚠️ נמדד מתחת לתקרה
   *  בארבעתם: ⭐ חריגה שנימוקה חדל
   *  להתקיים היא שארית, ⛔ וחריגה רשומה שאינה קיימת בפועל היא בדיוק מה
   *  שהשורה על רשימות-ההיתר אוסרת. */
  /*  ⛔ `test_rulesdocs` **נשאר** (סבב 92) — ⚠️ הרצות חוזרות לבדו בכל
   *  ריפו ברמה המלאה נמדדו משני צדי התקרה, ⛔ **על אותו קוד בדיוק** —
   *  ⚠️ תנודה באותה מכונה, ⛔ והסרה כאן הייתה מייצרת שער שנופל
   *  אקראית. ⭐ וברמה המהירה הוא אינו חריג כלל. */
  'test_rulesdocs.mjs': 'מריץ ריצות רתמה פנימיות — ⛔ וכל אחת טוענת את הסט ' +
                        'מחדש בתהליך node נפרד; ⛔ חורג ברמה המלאה בלבד — ' +
                        '⭐ ובמהירה הוא מתחת לתקרה: ⚠️ הזמן עצמו נמדד ' +
                        'ומודפס בכל הרצה',
};

/*  ⛔ מספר החריגות מושווה למספר שההערה בטבלה מצהירה — ⚠️ הנימוק המדוד:
 *  ההערה אמרה «3 חריגות מוכרזות» בעוד שבקוד היו ארבע, ⭐ והקורא שסמך עליה
 *  חיפש שלוש ומצא שלוש. ⛔ **ושם השורה הוא המפתח ⛔ ולא מספרה** — ⚠️ מספר
 *  מוקלד נסחף בכל מספור מחדש. */
{
  const BUDGET_ROW = 'תקציב זמן לשער';
  const docLines = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8').split('\n');
  const row = docLines.find((l) => /^\|\s*\d+\s*\|/.test(l) &&
    (l.split('|')[2] || '').replace(/\s*[◆◇⧉]\s*$/, '').trim() === BUDGET_ROW);
  const have = Object.keys(BUDGET_EXEMPT).length;
  const said = row && /(\d+)\s+חריגות מוכרזות/.exec(row);
  if (!row)
    fail(`CLAUDE.md: שורת «${BUDGET_ROW}» לא נמצאה בטבלה — נמדדו 0 שורות בשם ` +
         'הזה והצפוי אחת. מיישרים את שם השורה');
  else if (!said)
    fail(`CLAUDE.md: שורת «${BUDGET_ROW}» אינה מצהירה כמה חריגות — נמדדו 0 ` +
         `הצהרות «<מספר> חריגות מוכרזות» והצפוי אחת, בעוד שב-BUDGET_EXEMPT ${have}. ` +
         'מוסיפים את המספר לעמודת ההערות');
  else if (Number(said[1]) !== have)
    fail(`CLAUDE.md: שורת «${BUDGET_ROW}» מצהירה ${said[1]} חריגות ` +
         `ו-BUDGET_EXEMPT מונה ${have} — נמדד פער של ${Math.abs(Number(said[1]) - have)} ` +
         'והצפוי אפס. מעדכנים את ההערה, או את הרשימה');
  else
    pass(`חריגות התקציב — ${have} ב-BUDGET_EXEMPT, וההערה בשורת «${BUDGET_ROW}» ` +
         'מצהירה את אותו מספר');

  /*  ⛔ וכל נימוק מבחין בין הרמות (סבב 92) — ⚠️ ארבעתם חורגים ברמה המלאה
   *  בלבד, ⭐ וברמה המהירה הם מתחת לעשירית מהתקרה: ⛔ נימוק שאינו אומר
   *  באיזו רמה נמדדה החריגה מתאר תקרה שאינה זו שנחצתה, ⚠️ והקורא מסיק
   *  שהשער איטי תמיד. */
  const vague = Object.keys(BUDGET_EXEMPT).filter((g) =>
    !(/ברמה המלאה/.test(BUDGET_EXEMPT[g]) && /במהירה/.test(BUDGET_EXEMPT[g])));
  if (vague.length)
    fail(`BUDGET_EXEMPT: ${vague.length} נימוקים אינם מבחינים בין הרמות — ` +
         `${vague.join(' · ')}; נמדדו ${have - vague.length} מתוך ${have} עם שני ` +
         'המספרים והצפוי כולם. מוסיפים לנימוק את הזמן בכל רמה');
  else
    pass(`BUDGET_EXEMPT — ${have} נימוקים, וכולם נושאים את הזמן בשתי הרמות`);
}

const JOBS = Math.max(1, Number(process.env.CHECKJS_JOBS) || Math.min(4, cpus().length));

function runGate(gate) {
  return new Promise((resolve) => {
    /*  ⛔ השעון נפתח לפני ה-spawn (סבב 74ב) — ⚠️ ההמתנה בתור הבריכה אינה
     *  זמן השער, ⛔ ומדידה שכוללת אותה הייתה תלויה במספר התהליכים. */
    const t0 = Date.now();
    /*  ⛔ `GATE_MUT` הוא מה שמפעיל את המוטציות בשער (סבב 92) — ⚠️ הוא נשלח
     *  רק ברמה המלאה, ⛔ ובמפורש ריק ברמה המהירה: ⭐ סביבה שירשה אותו
     *  מהרצה קודמת הייתה מפעילה מוטציות ברמה שהצהירה שאינה מריצה אותן. */
    const p = spawn(process.execPath, [join(ROOT, 'tools', gate)],
                    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
                      env: { ...process.env, GATE_MUT: FULL ? '1' : '' } });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', (e) => resolve({ out, err: err + e.message + '\n', code: 1, ms: Date.now() - t0 }));
    p.on('close', (code) => resolve({ out, err, code, ms: Date.now() - t0 }));
  });
}

async function runPool(list, jobs) {
  const res = new Array(list.length);
  let next = 0;
  const worker = async () => {
    while (next < list.length) { const i = next++; res[i] = await runGate(list[i]); }
  };
  await Promise.all(Array.from({ length: Math.min(jobs, list.length) }, worker));
  return res;
}

const wanted = APP.gates;

/*  ⛔ שתי הרמות נמדדות ⛔ ואינן מוצהרות (סבב 74ב) — ⚠️ ברירת מחדל
 *  שהתהפכה היא הפער השקט המושלם: השער עובר, המוטציות לא רצו, ואין סימן.
 *  ⭐ ולכן הטענה מפעילה את **גוזרת הרמה על קלט ריק** ⛔ ולא משווה משתנה
 *  לעצמו: ⚠️ `FAST === !flagged` עובר גם כשהברירה מתהפכת, ⛔ ובדיוק זה
 *  «probe שאינו יכול להיכשל».
 *  ⛔ והברירה היא **המהירה** (סבב 92) — ⚠️ בדיקות נכונות בלבד, בזמן
 *  העבודה; ⭐ והמלאה — מוטציות ובדיקות שלמות — היא `--full`, בסוף הסבב
 *  ולפני מיזוג. */
if (levelOf([], {}) !== 'מהירה')
  fail(`שתי רמות ריצה: ברירת המחדל אינה המהירה — נמדדה «${levelOf([], {})}» ` +
       'על קלט ריק והצפוי «מהירה». מיישרים את הברירה למהירה: המוטציות ' +
       'רצות ב-`--full` בלבד');
else if (levelOf(['--full'], {}) !== 'מלאה')
  fail(`שתי רמות ריצה: הדגל --full אינו מפעיל את הרמה המלאה — נמדדה ` +
       `«${levelOf(['--full'], {})}» והצפוי «מלאה». מיישרים את הדגל לרמה`);
else if (levelOf([], { GATE_MUT: '1' }) !== 'מלאה')
  fail('שתי רמות ריצה: ריצה פנימית אינה יורשת את הרמה המלאה — נמדדה ' +
       `«${levelOf([], { GATE_MUT: '1' })}» עם GATE_MUT=1 והצפוי «מלאה». ` +
       'מיישרים את הסביבה לרמה — אחרת המוטציות של הריצה הפנימית מדולגות');
else if (wanted.length !== APP.gates.length)
  fail(`שתי רמות ריצה: הרמה מסננת שערים — נמדדו ${wanted.length} שערים ` +
       `והצפוי ${APP.gates.length}. מסירים את הסינון — ⛔ שתי הרמות מריצות ` +
       'את כל השערים, והמוטציות הן מה שנבדל ביניהן');
else
  pass(`שתי רמות ריצה — ${APP.gates.length} שערים בשתיהן, וברירת המחדל ` +
       `מהירה (בלי מוטציות); הריצה הזו ${LEVEL}`);

/*  ⛔ והמוטציות אכן אינן ברירת המחדל — ⚠️ נמדד בשערים עצמם ולא בדגל:
 *  ⭐ כל שער שנושא מוטציית-נגד חייב לשאול את `GATE_MUT`, ⛔ ושער שאינו
 *  שואל אותו מריץ את המוטציות שלו בכל הרצה — ⚠️ בדיוק מה שהרמה מצהירה
 *  שאינו קורה. */
/*  ⛔ שער שרק **סורק** את המילה אינו מריץ מוטציה (סבב 92) — ⚠️ החריגה
 *  מוכרזת בשמה ובנימוקה, ⛔ ונמדדת משני צדדיה: ⭐ חריגה שאין לה מקרה
 *  בפועל מפילה אף היא. */
const MUT_SCANNER = {
  'check-comments.mjs': 'סורק את קובצי השערים ומודד שלכל שער יש מוטציה — ' +
                        '⛔ ואינו מריץ מוטציה משלו',
};
{
  const dir = join(ROOT, 'tools');
  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs'));
  const carry = files.filter((f) => readFileSync(join(dir, f), 'utf8').includes('מוטציית-נגד'));
  const ghost = Object.keys(MUT_SCANNER).filter((f) => !carry.includes(f));
  const bare = carry.filter((f) => !MUT_SCANNER[f] &&
                                   !readFileSync(join(dir, f), 'utf8')
                                     .includes("process.env.GATE_MUT === '1'"));
  if (ghost.length)
    fail(`MUT_SCANNER: ${ghost.length} חריגות מוכרזות שאין להן מקרה — ` +
         `${ghost.join(' · ')}; נמדדו 0 קבצים כאלה ב-tools/ והצפוי אחד לכל שם. ` +
         'מסירים את השם מהרשימה — חריגה שאינה קיימת בפועל אינה חריגה');
  else if (bare.length)
    fail(`tools/: ${bare.length} שערים מריצים את המוטציות שלהם בכל הרצה — ` +
         `${bare.join(' · ')}; נמדדו ${carry.length} שערים עם מוטציית-נגד ` +
         `ומהם ${carry.length - bare.length} שואלים את GATE_MUT, והצפוי ${carry.length}. ` +
         'מוסיפים בהם את שער ה-MUT — המוטציות רצות ב-`--full` בלבד');
  else
    pass(`המוטציות אינן ברירת המחדל — ${carry.length} שערים נושאים ` +
         `מוטציית-נגד, ו-${carry.length - Object.keys(MUT_SCANNER).length} מהם ` +
         `שואלים את GATE_MUT; ${Object.keys(MUT_SCANNER).length} סורקים מוכרזים`);
}

const timed = [];
{
  const res = await runPool(wanted, JOBS);
  for (let i = 0; i < wanted.length; i++) {
    const r = res[i];
    if (r.out) process.stdout.write(r.out);
    if (r.err) process.stderr.write(r.err);
    if (r.code !== 0) failures++;
    timed.push({ gate: wanted[i], ms: r.ms });
  }
}

/*  ⛔ הזמן נמדד ומודפס (סבב 74ב) — ⚠️ תקרה שאיש אינו רואה את המדידה שלה
 *  מתגלה רק ברגע שהיא נחצית, ⛔ והמגמה שקדמה לה אבודה. */
/*  ⛔ הזמן שבבריכה אינו הפסק (סבב 74ב) — ⚠️ נמדד שהוא מנופח עד פי
 *  שלושה מהעומס: `test_offline_login` הוא 3.8 שניות לבדו ו-11.9 בבריכה.
 *  ⭐ ולכן שער שחצה נמדד שוב **לבדו**, ⛔ והמינימום משני מדידות הוא מה
 *  ששופט: ⚠️ תקרה שנופלת על שינוי תקין מפני שהמכונה עמוסה היא בדיוק
 *  «probe שנופל על שינוי תקין», ⛔ והיא נלמדת כרעש ומדולגת. */
async function soloMs(gate) {
  let best = Infinity;
  for (let k = 0; k < 2; k++) best = Math.min(best, (await runGate(gate)).ms);
  return best;
}
const over = [];
for (const x of timed) {
  if (BUDGET_EXEMPT[x.gate] || x.ms <= BUDGET_MS) continue;
  const solo = await soloMs(x.gate);
  if (solo > BUDGET_MS) over.push({ ...x, solo });
  else console.log(`⏱ tools/${x.gate}: ${x.ms} מ״ש בבריכה ו-${solo} מ״ש לבדו — ` +
                   'עומס המכונה ולא תפיחה של השער');
}
for (const x of over)
  fail(`tools/${x.gate}: חצה את תקציב הזמן — נמדד ${x.solo} מ״ש לבדו ` +
       `(${x.ms} מ״ש בבריכה) והתקרה ${BUDGET_MS} מ״ש. מעדכנים ומסירים את רתמת ` +
       'המוטציה אל מתחת לסוגר הריצה הפנימית, או מכריזים חריגה מנומקת ' +
       'ב-BUDGET_EXEMPT');
if (!over.length) {
  /*  ⛔ המדידה מודפסת ולא רק נשפטת — ⚠️ שער שמטפס מ-2 ל-9 שניות עובר
   *  בשתיקה, ⛔ והמגמה היא מה שמראה אותו לפני שהוא חוצה. ⭐ הסף להדפסה
   *  הוא שנייה, ⛔ בדיוק הסף שמגדיר את הרמה המהירה. */
  const loud = timed.filter((x) => x.ms >= 1000).sort((a, b) => b.ms - a.ms)
                    .map((x) => `${x.gate.replace(/\.mjs$/, '')} ${x.ms}`).join(' · ');
  const ex = Object.keys(BUDGET_EXEMPT).length;
  pass(`תקציב זמן לשער — ${timed.length} שערים, תקרה ${BUDGET_MS} מ״ש` +
       (ex ? `, ${ex} חריגות מוכרזות` : '') +
       `; מעל שנייה: ${loud || 'אין'} מ״ש`);
}
/*  ⛔ תקציב זמן לסט (סבב 92) — ⚠️ נמדד מפתיחת התהליך, ⛔ ולא מסכום זמני
 *  השערים: ⭐ הסכום מתעלם משלבי הפרסור ומהבריכה, ⚠️ והוא הזמן שאיש אינו
 *  מחכה לו. ⛔ והמדידה מודפסת גם כשהיא עוברת — ⚠️ תקרה שאיש אינו רואה את
 *  המדידה שלה מתגלה רק ברגע שהיא נחצית. */
{
  const setMs = Date.now() - T_START;
  /*  ⛔ התקרה חלה על הריצה **בבריכה** (סבב 92) — ⚠️ זו התצורה שרצה בפועל,
   *  ⭐ ו-`CHECKJS_JOBS=1` היא כלי אבחון שמסיר את המקבילות בכוונה: ⛔ תקרה
   *  שנמדדת עליה מודדת את הכלי ⛔ ולא את הסט. ⚠️ וההחרגה מוכרזת ומודפסת —
   *  ⛔ ריצה סדרתית מדווחת את הזמן ⛔ ואינה שותקת. */
  if (JOBS === 1 && wanted.length > 1)
    pass(`תקציב זמן לסט — ${setMs} מ״ש (${LEVEL}, סדרתי) — ⚠️ התקרה ` +
         `${SET_BUDGET_MS} מ״ש חלה על הריצה בבריכה בלבד`);
  else if (setMs > SET_BUDGET_MS)
    fail(`תקציב זמן לסט: הסט חצה את התקרה — נמדדו ${setMs} מ״ש והתקרה ` +
         `${SET_BUDGET_MS} מ״ש (${LEVEL}). ממזגים שערים שמודדים ערך זהה, ` +
         'או מעבירים עבודה לרמה המהירה — ⛔ ולא מרימים את התקרה');
  else
    pass(`תקציב זמן לסט — ${setMs} מ״ש מתוך ${SET_BUDGET_MS} (${LEVEL}, ` +
         `${wanted.length} שערים)`);
}

if (FAST) console.log(`\n⚠️ רמה מהירה — ${wanted.length} שערים רצו, ` +
                      '⛔ והמוטציות ובדיקות השלמות לא: לפני מיזוג מריצים עם --full.');

/*  ⛔ תיקיית העבודה נמחקת בכל מסלול יציאה (סבב 72) — ⚠️ נמדד: היא נשארה
 *  בכל הרצה, ⛔ ואלפי עותקים מילאו את הדיסק עד ENOSPC. */
rmSync(work, { recursive: true, force: true });

if (failures) {
  console.error(`\n❌ ${APP.app}: ${failures} כשלים בשער ה-JS`);
  process.exit(1);
}
console.log('\n✅ all checks passed');
