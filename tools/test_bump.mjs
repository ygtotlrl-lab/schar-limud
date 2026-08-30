#!/usr/bin/env node
/*  test_bump.mjs — שער ה-versionCode והבסיס שממנו הוא נמדד (סבב 72: מוזג).
 *
 *  **מה נאכף:** צורת `android/app/build.gradle` (versionCode שלם חיובי ·
 *  versionName · applicationId==namespace) · זהות החבילה · **קידום**
 *  `versionCode` כשקובץ תחת `android/` השתנה מאז **קומיט הקידום האחרון** ·
 *  היעדר נסיגה · והמספר שטבלת `android/README.md` מצהירה. ⛔ ולצידם:
 *  שהבסיס נגזר ב-`lastBumpCommit` ⛔ ולא מ-`origin/main`.
 *
 *  **הנימוק המדוד:** עשרת קובצי ה-mipmap של יומן הועלו ישירות ל-`main`,
 *  ולכן מול `origin/main` הם היו **הבסיס ולא שינוי** — השער דיווח
 *  «המעטפת לא השתנתה» ועבר. ⛔ ואין לגזור ב-`git log -S`: `-S` סופר
 *  **מופעים**, וקידום 5 → 6 אינו משנה את מספרם.
 *
 *  **מה יישבר בלעדיו:** APK עם `versionCode` שאינו עולה **נדחה בהתקנה**
 *  (`INSTALL_FAILED_VERSION_DOWNGRADE`), או — גרוע מכך — מותקן בשקט מעל
 *  עצמו ומשאיר את המשתמש עם המעטפת הישנה בלי שום סימן. ⚠️ ובלי הרתמה,
 *  «הבסיס הנכון» הוא הצהרה: הרתמה בונה ריפו סינתטי ומודדת אותה.
 *
 *  **מה אינו נאכף כאן:** תוכן ה-`MainActivity`, התלויות ורשימת ההרשאות.
 *  ⛔ אין ליישר את התלויות בין הריפו (סבב 40) — ליומן לבדה יש
 *  `androidx.webkit`, מפני שרק לה יש גשר שיתוף; חריגה מנומקת ומדודה.
 *
 *  ⛔ `BUMP_GATE_ONLY=1` מריץ את חלק השער בלבד (סבב 72) — ⚠️ הרתמה
 *  מריצה את הקובץ הזה בתוך ריפו סינתטי, ובלי הדגל היא הייתה מריצה שם
 *  את עצמה שוב.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 */
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  applicationId: 'com.schar.limud',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [82];

const SELF = fileURLToPath(import.meta.url);
const ROOT = join(dirname(SELF), '..');
const GRADLE = 'android/app/build.gradle';

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);
const skip = (m) => console.log('⏭️  ' + m);

/*  ⚠️ פרסור ולא הרצת Gradle: הסביבה כאן היא node בלבד, ו-Gradle אינו
 *  זמין. שלוש התבניות נגזרו מארבעת הקבצים בפועל ולא הוצהרו.            */
function parseGradle(text) {
  const num  = (re) => { const m = re.exec(text); return m ? m[1] : null; };
  return {
    versionCode:   num(/^\s*versionCode\s+(\d+)\s*$/m),
    versionName:   num(/^\s*versionName\s+["']([^"']+)["']/m),
    applicationId: num(/^\s*applicationId\s+["']([^"']+)["']/m),
    namespace:     num(/^\s*namespace\s+["']([^"']+)["']/m),
  };
}

const gradlePath = join(ROOT, GRADLE);
if (!fs.existsSync(gradlePath)) { fail(`${GRADLE} אינו קיים — למעטפת אין קובץ בנייה`); process.exit(1); }
const cur = parseGradle(fs.readFileSync(gradlePath, 'utf8'));

/* ── א. צורה ───────────────────────────────────────────────────────────── */
const vc = Number(cur.versionCode);
if (!cur.versionCode || !Number.isInteger(vc) || vc < 1) {
  fail(`versionCode אינו מספר שלם חיובי: ${JSON.stringify(cur.versionCode)}`);
} else pass(`versionCode תקין: ${vc}`);

if (!cur.versionName) fail('versionName חסר מ-' + GRADLE);
else pass(`versionName תקין: ${cur.versionName}`);

if (cur.applicationId && cur.namespace && cur.applicationId !== cur.namespace) {
  fail(`applicationId (${cur.applicationId}) ו-namespace (${cur.namespace}) אינם תואמים`);
} else if (cur.applicationId) pass('applicationId ו-namespace תואמים');

/* ── ב. זהות החבילה ────────────────────────────────────────────────────── */
if (cur.applicationId !== APP.applicationId) {
  fail(`applicationId הוא «${cur.applicationId}» ולא «${APP.applicationId}» — ` +
       'מזהה החבילה הוא מה שאנדרואיד מזהה לפיו התקנה קיימת, ושינוי שלו יוצר אפליקציה זרה');
} else pass(`מזהה החבילה נעול: ${APP.applicationId}`);

/* ── ג+ד. קידום מאז קומיט הקידום האחרון ────────────────────────────────── */
const git = (args) => execFileSync('git', ['-C', ROOT, ...args],
                                   { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

/*  ⭐ קומיט הקידום האחרון — הקומיט האחרון שבו **הערך** של
 *  `versionCode` נבדל מזה שבאביו. ⛔ השוואת ערך ולא היוריסטיקת-טקסט
 *  (סבב 57) — הנימוק בראש הקובץ.                                        */
function lastBumpCommit() {
  const commits = git(['log', '--format=%H', '--', GRADLE])
                    .split('\n').map((s) => s.trim()).filter(Boolean);
  for (const c of commits) {
    const here = parseGradle(git(['show', c + ':' + GRADLE])).versionCode;
    let there;
    try {
      there = parseGradle(git(['show', c + '^:' + GRADLE])).versionCode;
    } catch (_) {
      /* ⚠️ שורש ההיסטוריה, או גבול של שכפול רדוד (shallow) —
       *  ⛔ ואז הקומיט הזה הוא הבסיס (סבב 57) — הוא הקידום
       *  הישן ביותר שידוע לנו, והנפילה-חזרה היא לכיוון המחמיר:
       *  עדיף לדרוש קידום מיותר מלהעביר בשקט מעטפת שהשתנתה.  */
      return c;
    }
    if (here !== there) return c;
  }
  return null;
}

let base = null, changed = null, baseRef = null;
try {
  baseRef = lastBumpCommit();
  if (baseRef) {
    base = parseGradle(git(['show', baseRef + ':' + GRADLE]));
    /* ⛔ תיעוד אינו מעטפת (סבב 42ב) — קובץ `.md` תחת `android/` יוצא
     *  מרשימת השינויים. הוא אינו נכנס ל-APK ואינו משנה שום בית
     *  במעטפת, ולכן דרישת קידום עליו הייתה **קידום סרק**:
     *  `versionCode` שקופץ בלי שהמעטפת השתנתה הוא בדיוק אותו רעש
     *  ש-`CACHE_NAME` נבנה נגדו בשכבת ה-web, והוא גם שולח את
     *  המשתמשים להתקנה מחדש לשום שינוי.
     *  ⚠️ נמדד בסבב 42ב: יישור `android/README.md` בארבעת הריפו הפיל
     *  את השער הזה בארבעתם, ⛔ בלי ששורה אחת של קוד מעטפת נגעה. */
    changed = git(['diff', '--name-only', baseRef, '--', 'android/'])
                .split('\n').map((s) => s.trim())
                .filter((f) => f && !f.endsWith('.md'));
  }
} catch (_) { base = null; }

if (base === null) {
  skip('אין git או לא נמצא קומיט קידום — בדיקת הקידום מדולגת (ולא מפילה)');
} else {
  const short = baseRef.slice(0, 8);
  const baseVc = Number(base.versionCode);
  if (!Number.isInteger(baseVc)) {
    skip(`versionCode לא נקרא מ-${short} — בדיקת הקידום מדולגת`);
  } else if (vc < baseVc) {
    fail(`versionCode ירד: ${baseVc} → ${vc} מול ${short} — אנדרואיד דוחה התקנה נסוגה`);
  } else if (changed.length === 0) {
    pass(`המעטפת לא השתנתה מאז קומיט הקידום האחרון (${short}) — אין דרישת קידום`);
  } else if (vc === baseVc) {
    fail(`המעטפת השתנתה מאז קומיט הקידום האחרון ${short} (${changed.length} קבצים: ` +
         changed.slice(0, 4).join(', ') + (changed.length > 4 ? ', …' : '') + ') ' +
         `אך versionCode נשאר ${vc} — יש לקדם אותו, אחרת ה-APK החדש לא יותקן מעל הקיים`);
  } else {
    pass(`המעטפת השתנתה (${changed.length} קבצים) ו-versionCode קודם: ${baseVc} → ${vc}`);
  }
}

/* ── ה. תיעוד — המספר שבן-אדם קורא ──────────────────────────────────────────
 *  ⛔ אינו קישוט (סבב 45ב) — `android/README.md` הוא הקובץ שסשן חדש
 *  ומנהל קוראים כדי לדעת באיזו גרסה המעטפת נמצאת, והוא **הצהיר מספר
 *  שגוי בארבעת הריפו במשך ארבעה סבבים**. הפורמט זהה בארבעתם, ולכן
 *  שורת הטבלה נגזרת ואינה מוצהרת.                                       */
const README = 'android/README.md';
const rPath = join(ROOT, README);
if (!fs.existsSync(rPath)) {
  fail(`${README} אינו קיים — אין מאין לקרוא את ה-versionCode המתועד`);
} else {
  const m = /^\|\s*\*\*versionCode\*\*\s*\|\s*(\d+)\b/m.exec(fs.readFileSync(rPath, 'utf8'));
  if (!m) {
    fail(`${README}: שורת «| **versionCode** | <N> …» חסרה מהטבלה — ` +
         'בלעדיה אין מה להשוות, והמספר המתועד חופשי להיסחף');
  } else if (Number(m[1]) !== vc) {
    fail(`${README} מצהיר versionCode ${m[1]} בעוד ש-${GRADLE} נושא ${vc} — ` +
         'המספר שבן-אדם קורא נסחף מהמספר שנבנה בפועל');
  } else pass(`התיעוד תואם: ${README} מצהיר versionCode ${vc}`);
}

/*  ⛔ בריצה בתוך הרתמה — עוצרים כאן (סבב 72) — ⚠️ הרתמה מריצה את הקובץ
 *  הזה בריפו סינתטי, ובלי הדגל היא הייתה בונה שם רתמה משלה. */
if (process.env.BUMP_GATE_ONLY) {
  console.log(failures ? `\n❌ ${APP.app}: ${failures} כשלים בשער ה-versionCode`
                       : `\n✅ ${APP.app}: שער ה-versionCode עבר`);
  process.exit(failures ? 1 : 0);
}

/* ── ו. הבסיס עצמו — טענות סטטיות על חלק השער ──────────────────────────── */
/*  ⚠️ נמדד על **חלק השער בלבד** (סבב 72) — ⛔ הרתמה שמתחתיו מציבה
 *  `origin/main` בכוונה כדי לשחזר את הנקודה העיוורת, וסריקה על הקובץ
 *  כולו הייתה נופלת עליה. */
const SELF_SRC = fs.readFileSync(SELF, 'utf8');
const HARNESS_MARK = '/* ── ז. ריפו סינתטי בתיקייה זמנית';
const gateSrc = SELF_SRC.slice(0, SELF_SRC.indexOf(HARNESS_MARK));

if (!/function\s+lastBumpCommit\s*\(/.test(gateSrc)) {
  fail('אין `lastBumpCommit` בחלק השער — הבסיס אינו קומיט הקידום האחרון');
} else pass('חלק השער גוזר את הבסיס ב-lastBumpCommit');

if (/'origin\/main'/.test(gateSrc)) {
  fail("חלק השער עדיין מריץ git מול 'origin/main' — זו הנקודה העיוורת של סבב 57");
} else pass('חלק השער אינו נשען על origin/main בקוד');

/*  ⛔ `-S` סופר מופעים ולא ערכים (סבב 57) — נמדד: הוא פספס את קומיט
 *  הקידום של סבב 56. שער שיחזור אליו חוזר לנקודה העיוורת.               */
if (/log[^\n]*'-S/.test(gateSrc)) {
  fail('חלק השער משתמש ב-`git log -S` — הוא סופר מופעים ולא ערכים, ומפספס קידום');
} else pass('חלק השער אינו נשען על `git log -S`');

/* ── ז. ריפו סינתטי בתיקייה זמנית ──────────────────────────────────────── */
const WORK = mkdtempSync(join(tmpdir(), APP.app + '-r57-'));
const ENV = {
  ...process.env,
  BUMP_GATE_ONLY: '1',
  GIT_AUTHOR_NAME: 'r57', GIT_AUTHOR_EMAIL: 'r57@example.invalid',
  GIT_COMMITTER_NAME: 'r57', GIT_COMMITTER_EMAIL: 'r57@example.invalid',
  GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null',
};
const g = (...a) => execFileSync('git', ['-C', WORK, ...a],
                                 { encoding: 'utf8', env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });

const W = (rel, txt) => {
  const p = join(WORK, rel);
  fs.mkdirSync(dirname(p), { recursive: true });
  fs.writeFileSync(p, txt, 'utf8');
};

const gradleOf = (n) => `android {
    namespace "${APP.applicationId}"
    defaultConfig {
        applicationId "${APP.applicationId}"
        versionCode ${n}
        versionName "${n}.0"
    }
}
`;
const readmeOf = (n) => `# מעטפת\n\n| | |\n|---|---|\n| **versionCode** | ${n} | המעטפת |\n`;

const SELF_NAME = basename(SELF);

/*  מריץ את השער האמיתי בריפו הסינתטי ומחזיר `true` אם הוא עבר.        */
function runGate(file = SELF_NAME) {
  try {
    execFileSync(process.execPath, [join(WORK, 'tools', file)],
                 { encoding: 'utf8', env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch (_) { return false; }
}

let done = false;
try {
  g('init', '-q', '-b', 'main');
  fs.mkdirSync(join(WORK, 'tools'), { recursive: true });
  fs.copyFileSync(SELF, join(WORK, 'tools', SELF_NAME));

  /* קומיט 1 — בסיס: versionCode 1 */
  W('android/app/build.gradle', gradleOf(1));
  W('android/README.md', readmeOf(1));
  W('android/app/src/main/java/Shell.java', '// v1\n');
  g('add', '-A'); g('commit', '-qm', 'init');

  /* קומיט 2 — המעטפת השתנתה **וקודמה באותו קומיט** */
  W('android/app/build.gradle', gradleOf(2));
  W('android/README.md', readmeOf(2));
  W('android/app/src/main/java/Shell.java', '// v2\n');
  g('add', '-A'); g('commit', '-qm', 'bump+shell');

  if (!runGate()) fail('מוטציית-נגד: קידום שנעשה באותו קומיט **הפיל** את השער');
  else pass('מוטציית-נגד: מעטפת שהשתנתה וקודמה — השער עובר');

  /* קומיט 3 — ⭐ המוטציה: המעטפת השתנתה אחרי הקידום, בלי קידום חדש.
   *  ⚠️ ו-`origin/main` מוצב עליו — בדיוק «הועלה ישירות ל-main».        */
  W('android/app/src/main/java/Shell.java', '// v3 — שינוי מעטפת בלי קידום\n');
  g('add', '-A'); g('commit', '-qm', 'shell only');
  const c3 = g('rev-parse', 'HEAD').trim();
  g('update-ref', 'refs/remotes/origin/main', c3);

  /* ⚠️ מדידה: מול origin/main אין שום הפרש — זו הנקודה העיוורת עצמה. */
  const vsMain = g('diff', '--name-only', 'origin/main', '--', 'android/').trim();
  if (vsMain !== '') {
    fail('הרתמה לא שחזרה את הנקודה העיוורת — מול origin/main כן נמצא הפרש');
  } else pass('הנקודה העיוורת שוחזרה: מול origin/main אין שום הפרש');

  if (runGate()) {
    fail('⭐ המוטציה: מעטפת שהשתנתה אחרי הקידום האחרון בלי קידום — השער **עבר**');
  } else pass('⭐ המוטציה: מעטפת שהשתנתה בלי קידום — השער נופל');

  /*  מוטציית-לוגיקה: עותק מוטב שהוחזר לבסיס origin/main ⛔ חייב לעבור
   *  על אותו תרחיש בדיוק — כלומר התיקון הוא שסוגר את הפער.            */
  const mutated = SELF_SRC.replace(/baseRef = lastBumpCommit\(\);/,
                                   "baseRef = git(['rev-parse', 'origin/main']).trim();");
  if (mutated === SELF_SRC) {
    fail('מוטציית-הלוגיקה לא נתפסה — שורת גזירת הבסיס לא נמצאה בשער');
  } else {
    fs.writeFileSync(join(WORK, 'tools', 'mutant.mjs'), mutated, 'utf8');
    if (runGate('mutant.mjs')) {
      pass('מוטציית-הלוגיקה: הבסיס הישן (origin/main) אכן **עובר** על התרחיש — הפער אמיתי');
    } else {
      fail('מוטציית-הלוגיקה: הבסיס הישן נפל גם הוא — התרחיש אינו מודד את ההפרש בין השניים');
    }
  }

  /* קומיט 4 — קידום נקי, בלי שינוי מעטפת */
  W('android/app/build.gradle', gradleOf(3));
  W('android/README.md', readmeOf(3));
  g('add', '-A'); g('commit', '-qm', 'bump only');
  if (!runGate()) fail('קידום נקי (בלי שינוי מעטפת) **הפיל** את השער');
  else pass('קידום נקי — השער עובר');

  /* נסיגה — versionCode מתחת לקידום האחרון */
  W('android/app/build.gradle', gradleOf(1));
  W('android/README.md', readmeOf(1));
  if (runGate()) fail('נסיגת versionCode **עברה** את השער');
  else pass('נסיגת versionCode — השער נופל');

  done = true;
} finally {
  rmSync(WORK, { recursive: true, force: true });
}
if (!done) fail('הרתמה נקטעה לפני סופה');

/* ── ח. מוטציות על העץ האמיתי, בעותק זמני ──────────────────────────────── */
/*  ⛔ המוטציה רצה על **עותק** ולא על העץ (סבב 42ג) — ⚠️ מדידה שנפלה
 *  באמצע הייתה משאירה את העץ שגוי לתמיד. */
{
  const run = (dir) => spawnSync(process.execPath, [join(dir, 'tools', SELF_NAME)],
    { cwd: dir, encoding: 'utf8', env: { ...process.env, BUMP_GATE_ONLY: '1' } }).status;

  const mut = (label, file, edit, expectFail) => {
    const d = mkdtempSync(join(tmpdir(), 'rd67-'));
    cpSync(resolve(ROOT), d, { recursive: true, filter: (s) => !s.includes('/.git') });
    const f = join(d, file);
    fs.writeFileSync(f, edit(fs.readFileSync(f, 'utf8')));
    const fell = run(d) !== 0;
    if (fell === expectFail) pass(label);
    else fail(label);
    rmSync(d, { recursive: true, force: true });
  };

  mut('⛔ מוטציה: versionCode שירד מפיל את השער', GRADLE,
      (s) => s.replace(/versionCode\s+(\d+)/, (m, n) => 'versionCode ' + Math.max(1, +n - 1)), true);
  mut('⭐ מוטציית-נגד: שדה בנייה אמיתי שנוסף ל-build.gradle ⛔ אינו מפיל', GRADLE,
      (s) => s.replace(/versionName\s+"([^"]+)"/, 'versionName "$1"\n        multiDexEnabled false'), false);
}

console.log(failures ? `\n❌ ${APP.app}: ${failures} כשלים בשער ה-versionCode`
                     : `\n✅ ${APP.app}: שער ה-versionCode עבר`);
process.exit(failures ? 1 : 0);
