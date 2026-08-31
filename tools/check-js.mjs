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
 *    • מלאה — `node tools/check-js.mjs`, ברירת המחדל: כל השערים וכל
 *      המוטציות. ⛔ זו הריצה שלפני דחיפה, פעם אחת — ⚠️ המוטציות הן מה
 *      שמוכיח שהשער מפיל, ⛔ ואינן מדולגות בה.
 *    • מהירה — `node tools/check-js.mjs --fast`: השערים שנמדדו מתחת
 *      לשנייה, בלי רתמות המוטציה. ⭐ זו הריצה שבמהלך העבודה, אחרי כל
 *      שינוי — ⛔ ואינה מחליפה את המלאה לפני דחיפה.
 *
 *  ⭐ השער נולד ב-gius (סבב 11) וחי שם לבדו עשרה סבבים בלי שאיש החליט על
 *  כך — הפער שהוליד את כלל ברזל 14. מסבב 33 הוא זהה בית-לבית בארבעת
 *  הריפו פרט לבלוק APP.
 *
 *      node tools/check-js.mjs
 *
 *  יציאה בקוד שונה מאפס אם כשל אחד או יותר.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
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
          'test_budget.mjs', 'test_icons.mjs',
          'test_android.mjs', 'test_lists.mjs',
          'test_manifest.mjs',
          'test_swcore.mjs',
          'test_build.mjs',
          'test_shell.mjs', 'test_devid.mjs', 'test_passwords.mjs',
          'test_md.mjs', 'test_removals.mjs', 'test_readonly.mjs', 'test_crossgate.mjs',
          'test_offline_login.mjs', 'test_roles.mjs',
          'test_stage_a.mjs', 'test_hotwin.mjs', 'test_cron.mjs',
          'test_merge_pending.mjs', 'test_matrix.mjs', 'test_ids.mjs'],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ תקרת השער
 *  הבודד נמדדת כאן מפני שכאן ממילא רצים כל השערים, ⛔ ושער נפרד שימדוד
 *  אותה היה מריץ את כולם פעם שנייה. */
export const ROWS = [29, 30];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), APP.app + '-check-'));

/*  ⛔ אותם עוזרים כמו בחמשת הבודקים האחרים (סבב 72) — ⚠️ עד כאן היה כאן
 *  דפוס שני (`ok`/`FAIL`, בלי מונה ובלי `pass`), ⛔ ושני דפוסים לאותו
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
/*  ⛔ הרמה נקבעת בדגל מפורש, ⛔ וברירת המחדל היא המלאה — ⚠️ מי ששוכח
 *  את הדגל מקבל את הבדיקה החזקה ולא את החלשה, ⛔ והיפוך הברירה היה הופך
 *  שכחה לפער שקט: השער עובר, והמוטציות לא רצו. */
const FAST = process.argv.includes('--fast');

/*  ⛔ כל השערים נכנסים לבריכה, ⛔ ואין רשימה סדרתית — ⚠️ נסרקו ונמצאו
 *  עצמאיים: כל אחד כותב לתיקיית `mkdtemp` משלו, ⛔ ואף אחד אינו קורא את
 *  פלטו של אחר. ⭐ והשער שמריץ את הסט המלא על עותק נמדד ⛔ ולא שוער:
 *  הוצאתו מהבריכה עלתה 43–44 שניות מול 37, ⚠️ מפני שהוא הארוך מכולם
 *  והרצתו לבדו מסדרת את מה שאפשר לחפוף. */

/*  ⛔ השערים שנמדדו מעל שנייה, ⛔ והיחידים שהרמה המהירה מדלגת עליהם —
 *  ⚠️ כולם מריצים מוטציות, וכל מוטציה היא עותק עץ ותהליך חדש. ⛔ והרשימה
 *  משותפת לארבעתם — ⚠️ שער שאינו קיים באפליקציה פשוט אינו ב-APP.gates
 *  שלה, ⛔ ואינו דורש רשימה פרטית. */
const SLOW = new Set([
  'test_readonly.mjs', 'test_crossgate.mjs', 'test_matrix.mjs',
  'test_iconlayer.mjs', 'test_rulesdocs.mjs', 'test_offline_login.mjs',
  'test_android.mjs', 'test_budget.mjs', 'test_archive.mjs',
  'test_md.mjs', 'test_idarg.mjs',
]);

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

/*  ⛔ חריגה מוכרזת בלבד (סבב 74ב) — ⚠️ שער שחוצה את התקרה ואינו כאן
 *  **מפיל**, ⭐ והכניסה לכאן היא הכרעת מנהל: ⛔ רשימה שגדלה בשקט היא
 *  תקרה שאינה קיימת. `שם השער: הנימוק`. */
const BUDGET_EXEMPT = {
  /*  ⛔ ארבעה שערים חוצים את התקרה **לבדם**, ⛔ ואיש לא מחק אותם ולא הרים
   *  את התקרה — ⭐ הם מוכרזים כאן עד הכרעת מנהל. ⛔ **וכל אחד נמדד מחדש
   *  בסבב שנוגע בו (סבב 75)** — ⚠️ חריגה שנימוקה חדל להתקיים היא שארית,
   *  ⛔ והנמקה של חריגה שכבר אינה חריגה היא הערה מיושנת: ⭐ המדידה כאן
   *  היא של סבב 75, לבד ולא בבריכה. */
  'test_readonly.mjs':  'מריץ את הסט המלא על עותק — ⛔ קו הבסיס המוכרז, ' +
                        'והוא היחיד שרשאי לכך; נמדד 18.0–21.0 שניות לבדו',
  'test_crossgate.mjs': 'משווה ארבעה שערים זה מול זה, ⛔ וכל מוטציה מריצה ' +
                        'שניים מהם על עותק אחד משותף; נמדד 11.7–14.3 שניות לבדו',
  /*  ⛔ החריגה הזו אינה אחידה בארבעתם — ⚠️ נמדד 7.2–8.0 שניות בשלוש
   *  ו-10.9 ברביעית, ⭐ ששורות הטבלה שאינן מוחרגות בה רבות יותר. */
  'test_matrix.mjs':    'הופך תא בטבלה ומריץ את check-capabilities על עותק ' +
                        'אחד משותף, ⛔ פעם לכל שורה שאינה מוחרגת; נמדד ' +
                        '7.2–10.9 שניות לבדו',
  /*  ⛔ החריגה הזו אינה אחידה בארבעתם — ⚠️ נמדד 3.2 שניות שם שיש מאסטר
   *  רסטרי, ⛔ ו-8.1–12.6 שניות שם שהסמל מצויר בצורות: ⭐ המחולל רץ אז על
   *  נתיב אחר וארוך. ⛔ והרשימה נשארת משותפת — ⚠️ שער שאינו קיים
   *  באפליקציה פשוט אינו ב-APP.gates שלה. */
  'test_iconlayer.mjs': 'מריץ את המחולל על כל שכבת האייקונים, ⛔ ובשתיים ' +
                        'מהן הסמל מצויר בצורות ולא בציור — נתיב ארוך יותר; ' +
                        'נמדד 3.2–12.6 שניות לבדו',
};

const JOBS = Math.max(1, Number(process.env.CHECKJS_JOBS) || Math.min(4, cpus().length));

function runGate(gate) {
  return new Promise((resolve) => {
    /*  ⛔ השעון נפתח לפני ה-spawn (סבב 74ב) — ⚠️ ההמתנה בתור הבריכה אינה
     *  זמן השער, ⛔ ומדידה שכוללת אותה הייתה תלויה במספר התהליכים. */
    const t0 = Date.now();
    const p = spawn(process.execPath, [join(ROOT, 'tools', gate)],
                    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
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

const skipped = APP.gates.filter((g) => SLOW.has(g));
const wanted = APP.gates.filter((g) => !(FAST && SLOW.has(g)));

/*  ⛔ שתי הרמות נמדדות ⛔ ואינן מוצהרות (סבב 74ב) — ⚠️ ברירת מחדל
 *  שהתהפכה היא הפער השקט המושלם: השער עובר, המוטציות לא רצו, ואין סימן.
 *  ⭐ ולכן הטענה מצמידה את הרמה **לדגל** ⛔ ולא למשתנה שנגזר ממנו: ⚠️
 *  השוואה בין `FAST` לעצמו עוברת גם כשהברירה התהפכה, ⛔ ובדיוק זה
 *  «probe שאינו יכול להיכשל». */
const flagged = process.argv.includes('--fast');
if (!skipped.length)
  fail('שתי רמות ריצה: הרמה המהירה אינה מדלגת על דבר — נמדדו 0 שערים ' +
       'מ-SLOW ב-APP.gates והצפוי לפחות אחד. הרמות זהות, ואין מה לבחור');
else if (FAST !== flagged)
  fail(`שתי רמות ריצה: רמת ברירת המחדל אינה המלאה — נמדדה רמה ` +
       `${FAST ? 'מהירה' : 'מלאה'} והצפוי ${flagged ? 'מהירה' : 'מלאה'}. ` +
       'הרמה נקבעת בדגל בלבד, ובלעדיו רצה המלאה');
else if (wanted.length !== APP.gates.length - (FAST ? skipped.length : 0))
  fail(`שתי רמות ריצה: הרמה אינה מסננת כמצופה — נמדדו ${wanted.length} ` +
       `שערים והצפוי ${APP.gates.length - (FAST ? skipped.length : 0)}. ` +
       'הרמה המלאה מריצה את כולם, והמהירה מדלגת על SLOW בלבד');
else
  pass(`שתי רמות ריצה — רמת ברירת המחדל מלאה (${APP.gates.length} שערים), ` +
       `והמהירה מדלגת על ${skipped.length}; הריצה הזו ${FAST ? 'מהירה' : 'מלאה'}`);

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
       `(${x.ms} מ״ש בבריכה) והתקרה ${BUDGET_MS} מ״ש. מוציאים את רתמת ` +
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
if (FAST) console.log(`\n⚠️ רמה מהירה — ${wanted.length} מתוך ${APP.gates.length} שערים, ` +
                      '⛔ והמוטציות לא רצו: לפני דחיפה מריצים בלי הדגל.');

/*  ⛔ תיקיית העבודה נמחקת בכל מסלול יציאה (סבב 72) — ⚠️ נמדד: היא נשארה
 *  בכל הרצה, ⛔ ואלפי עותקים מילאו את הדיסק עד ENOSPC. */
rmSync(work, { recursive: true, force: true });

if (failures) {
  console.error(`\n❌ ${APP.app}: ${failures} כשלים בשער ה-JS`);
  process.exit(1);
}
console.log('\n✅ all checks passed');
