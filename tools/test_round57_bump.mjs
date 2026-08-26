#!/usr/bin/env node
/*  שער ה-versionCode — הבסיס הוא קומיט הקידום האחרון (סבב 57).
 *
 *  ⚠️ **הנקודה העיוורת שנמדדה ב-26.8:** `test_round40_gradle.mjs` השווה
 *  את שכבת האנדרואיד מול **`origin/main`**. עשרת קובצי ה-mipmap של יומן
 *  הועלו ישירות ל-`main`, ולכן מולו הם היו **הבסיס ולא שינוי** — השער
 *  דיווח «המעטפת לא השתנתה» ועבר, אף שהמעטפת בהחלט השתנתה מאז ה-APK
 *  האחרון שנבנה. ⛔ שער שעובר על מצב שהוא נבנה לתפוס גרוע משער שאינו
 *  קיים: הוא נקרא כעדות.
 *
 *  ⭐ הבסיס החדש הוא **קומיט הקידום האחרון** — הקומיט האחרון שבו הערך
 *  של `versionCode` נבדל מזה שבאביו.
 *
 *  ⛔ **והבדיקה כאן אינה קוראת את הריפו האמיתי כדי להכריע** — היא בונה
 *  **ריפו git סינתטי בתיקייה זמנית**, מריצה בו את `test_round40_gradle.mjs`
 *  **האמיתי** (עותק), ומודדת מה הוא מחזיר בכל תרחיש. ⛔ המוטציות אינן
 *  נכתבות לעץ (הלקח של סבב 42ג).
 *
 *  ארבעה תרחישים, ובהם שתי המוטציות שהסבב דורש:
 *    1. **מוטציית-נגד** — מעטפת שהשתנתה **וקודמה באותו קומיט** ⛔ אינה מפילה.
 *    2. **⭐ המוטציה** — מעטפת שהשתנתה **אחרי** הקידום האחרון בלי קידום
 *       חדש ⛔ **מפילה**, ⚠️ **וזאת כש-`origin/main` מצביע בדיוק על אותו
 *       קומיט** — כלומר בדיוק המצב שהשער הישן העביר בשקט.
 *    3. **קידום נקי** (בלי שינוי מעטפת) ⛔ אינו מפיל.
 *    4. **נסיגה** — `versionCode` שירד מתחת לקידום האחרון ⛔ מפילה.
 *
 *  ולצידם מוטציית-לוגיקה: עותק **מוטב** של השער, שהוחזר לבסיס
 *  `origin/main`, ⛔ **חייב לעבור** על תרחיש 2 — כלומר הבדיקה מוכיחה
 *  שהתיקון הוא שסוגר את הפער, ולא נסיבה מקרית.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  applicationId: 'com.schar.limud',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = 'test_round40_gradle.mjs';

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

/* ── א. טענות סטטיות על השער עצמו ──────────────────────────────────────── */
const gateSrc = fs.readFileSync(join(ROOT, 'tools', GATE), 'utf8');

if (!/function\s+lastBumpCommit\s*\(/.test(gateSrc)) {
  fail(`${GATE}: אין בו \`lastBumpCommit\` — הבסיס אינו קומיט הקידום האחרון`);
} else pass(`${GATE} גוזר את הבסיס ב-lastBumpCommit`);

if (/'origin\/main'/.test(gateSrc)) {
  fail(`${GATE}: עדיין מריץ git מול 'origin/main' — זו הנקודה העיוורת של סבב 57`);
} else pass(`${GATE} אינו נשען על origin/main בקוד`);

/*  ⛔ `-S` סופר מופעים ולא ערכים (סבב 57) — נמדד: הוא פספס את קומיט
 *  הקידום של סבב 56. שער שיחזור אליו חוזר לנקודה העיוורת.               */
if (/log[^\n]*'-S/.test(gateSrc)) {
  fail(`${GATE}: משתמש ב-\`git log -S\` — הוא סופר מופעים ולא ערכים, ומפספס קידום`);
} else pass(`${GATE} אינו נשען על \`git log -S\``);

/* ── ב. ריפו סינתטי בתיקייה זמנית ──────────────────────────────────────── */
const WORK = mkdtempSync(join(tmpdir(), APP.app + '-r57-'));
const ENV = {
  ...process.env,
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

const gradle = (vc) => `android {
    namespace "${APP.applicationId}"
    defaultConfig {
        applicationId "${APP.applicationId}"
        versionCode ${vc}
        versionName "${vc}.0"
    }
}
`;
const readme = (vc) => `# מעטפת\n\n| | |\n|---|---|\n| **versionCode** | ${vc} | המעטפת |\n`;

/*  מריץ את השער האמיתי בריפו הסינתטי ומחזיר `true` אם הוא עבר.        */
function runGate(file = GATE) {
  try {
    execFileSync(process.execPath, [join(WORK, 'tools', file)],
                 { encoding: 'utf8', env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch (_) { return false; }
}

let ok = false;
try {
  g('init', '-q', '-b', 'main');
  fs.mkdirSync(join(WORK, 'tools'), { recursive: true });
  fs.copyFileSync(join(ROOT, 'tools', GATE), join(WORK, 'tools', GATE));

  /* קומיט 1 — בסיס: versionCode 1 */
  W('android/app/build.gradle', gradle(1));
  W('android/README.md', readme(1));
  W('android/app/src/main/java/Shell.java', '// v1\n');
  g('add', '-A'); g('commit', '-qm', 'init');

  /* קומיט 2 — המעטפת השתנתה **וקודמה באותו קומיט** */
  W('android/app/build.gradle', gradle(2));
  W('android/README.md', readme(2));
  W('android/app/src/main/java/Shell.java', '// v2\n');
  g('add', '-A'); g('commit', '-qm', 'bump+shell');
  const c2 = g('rev-parse', 'HEAD').trim();

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
  const mutated = gateSrc.replace(/baseRef = lastBumpCommit\(\);/,
                                  "baseRef = git(['rev-parse', 'origin/main']).trim();");
  if (mutated === gateSrc) {
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
  W('android/app/build.gradle', gradle(3));
  W('android/README.md', readme(3));
  g('add', '-A'); g('commit', '-qm', 'bump only');
  if (!runGate()) fail('קידום נקי (בלי שינוי מעטפת) **הפיל** את השער');
  else pass('קידום נקי — השער עובר');

  /* נסיגה — versionCode מתחת לקידום האחרון */
  W('android/app/build.gradle', gradle(1));
  W('android/README.md', readme(1));
  if (runGate()) fail('נסיגת versionCode **עברה** את השער');
  else pass('נסיגת versionCode — השער נופל');

  /* ⚠️ קומיט 2 ו-3 נקראו לעיל; השמות נשמרים לקריאוּת הדיווח. */
  if (!c2 || !c3) fail('לא נקראו מזהי הקומיטים בריפו הסינתטי');

  ok = true;
} finally {
  rmSync(WORK, { recursive: true, force: true });
}
if (!ok) fail('הרתמה נקטעה לפני סופה');

console.log(failures ? `\n❌ ${APP.app}: ${failures} כשלים בשער קומיט-הקידום`
                     : `\n✅ ${APP.app}: שער קומיט-הקידום עבר`);
process.exit(failures ? 1 : 0);
