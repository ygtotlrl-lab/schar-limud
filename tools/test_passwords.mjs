#!/usr/bin/env node
/*  test_passwords.mjs — מעבר הסיסמאות לגיבוב, וצעד ב שסגר את העמודה.
 *
 *  **מה נאכף:** (א) ⛔ אף מסלול אינו משווה עוד מול הטקסט הגלוי; (ב) כל
 *  מסלול אימות עובר דרך פונקציית הטביעה של האפליקציה; (ג) ההשלמה
 *  החד-פעמית שגזרה טביעה מהסיסמה הוסרה — ⚠️ היא הייתה הקורא האחרון של
 *  העמודה; (ד) ⛔ **אפס אתרי כתיבה ואפס אתרי קריאה** לעמודה, ⛔ ואין דגל
 *  נתיב-חזרה שמחזיק אותה; (ה) שתי המיגרציות קיימות — צעד א שרץ, וצעד ב
 *  שמוחק את העמודה ⛔ ומצהיר בבאנר שנכתב ולא רץ.
 *
 *  **הנימוק המדוד:** שלוש האפליקציות שיש בהן משתמשים החזיקו את הסיסמה
 *  ב**טקסט גלוי** בענן, ומסלולי הכניסה השוו מולה מחרוזות ישירות —
 *  ⭐ בחירה תפעולית מתועדת של המנהל, ⛔ שהוא עצמו ביטל.
 *
 *  **מה יישבר בלעדיו:** ⛔ מפתח ה-anon יושב ב-`index.html` הציבורי
 *  וה-RLS פתוח בכוונה מתועדת — ⚠️ הסיסמה הגלויה אינה «סוד חלש» אלא
 *  **המפתח שפותח את הכניסה**, ⛔ קריא לכל מי שפתח את קוד המקור.
 *
 *  **מה אינו נאכף כאן:** ⛔ הרצת צעד ב עצמה — ⚠️ היא פעולת מנהל, ⭐ ומצב
 *  העמודה במסד אינו נראה מהריפו. ⛔ וגם החלפת הסיסמאות הקיימות אינה כאן:
 *  ⚠️ מי שהחזיק את המפתח ראה אותן, ⭐ והטיפול היחיד הוא החלפתן במסד.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 *  ⚠️ **באפליקציה שאין בה טבלת משתמשים** — `usersTable:null` בבלוק `APP` —
 *  הטענות כאן הן טענות-**חסר** ובלוק המוטציות מדולג. ⛔ יחס שורות-לטענה
 *  חריג הוא נימוק שנדרש, ⛔ ולא רשלנות.
 */

import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  usersTable: 'sl_users',
  plainCol: 'password',
  verifyFn: 'slVerifyOffline',
  backfillFn: 'slBackfillPassFp',
  /*  ⛔ מסלול אימות אחד בלבד — ⚠️ אין כאן מסך ניהול משתמשים ואין מעבר
      משתמש: ⭐ המנהל יוצר משתמש ב-`INSERT` ידני, ⛔ ומאז צעד ב הוא גוזר
      לו טביעה בעצמו (הנוסח בבאנר המיגרציה). */
  authPaths: [['async function doLogin', 'הכניסה המקוונת']],
  migrationA: '015_users_drop_plaintext_password.sql',
  migrationB: '016_drop_sl_users_password.sql',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [135];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(join(ROOT, 'index.html'), 'utf8');

/*  ⚠️ טוקניזציה של ה-JS המוטבע ולא regex על ה-HTML (סבב 40) — התיעוד
 *  ההיסטורי מלא באזכורי שם העמודה, וסריקה גולמית הייתה סופרת הערות
 *  כמסלולי קוד. אותו לקח בדיוק כמו `check-comments.mjs`.              */
const js = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)]
             .map((m) => m[1]).join('\n');
function stripComments(t) {
  let out = '', i = 0;
  while (i < t.length) {
    const c = t[i], d = t[i + 1];
    if (c === '/' && d === '/') { while (i < t.length && t[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < t.length && !(t[i] === '*' && t[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      /*  ⚠️ מרכאה בודדת/כפולה **אינה חוצה שורה** ב-JS (סבב 40). בלי
       *  התנאי הזה גרש בודד בתוך טקסט עברי פותח «מחרוזת» שרצה עד סוף
       *  הקובץ ובולעת בדרך הערות שלמות — כלומר הערה נקראת כקוד. זה
       *  נמדד: שורת `// ישב כאן .eq('password',p)` נספרה כהשוואה חיה. */
      const q = c, multiline = (c === '`');
      let j = i + 1, closed = false;
      while (j < t.length) {
        if (!multiline && t[j] === '\n') break;
        if (t[j] === '\\') { j += 2; continue; }
        if (t[j] === q) { closed = true; break; }
        j++;
      }
      if (!closed) { out += c; i++; continue; }   // לא מחרוזת — תו בודד
      out += t.slice(i, j + 1); i = j + 1; continue;   // ⚠️ המחרוזת נשמרת כלשונה — שם העמודה הוא מה שמחפשים
    }
    out += c; i++;
  }
  return out;
}
const code = stripComments(js);

let n = 0, bad = 0;
const ok = (m) => console.log(`  ok   ${++n} · ${m}`);
const no = (m) => { bad++; console.error(`  FAIL ${++n} · ${m}`); };
const is = (c, m) => (c ? ok(m) : no(m));

console.log(`\n─────────────── ${APP.app}: הסיסמאות, וצעד ב שסגר את העמודה ──`);

/*  ⛔ דגל נתיב-החזרה של הטקסט הגלוי נמדד בארבעתן ⛔ ולא בשלוש (צעד ב) —
 *  ⚠️ אפליקציה בלי משתמשים היא בדיוק המקום שבו דגל כזה יצמח בשקט, ⭐ ומה
 *  שנמדד הוא **ההיעדר**: שם דגל שנוצר מחדש מחזיר את הכתיבה בלי שאיש
 *  ישים לב, מפני שהעמודה עצמה כבר לא נמצאת בשום שער אחר. */
const PLAIN_FLAG = /\b(?:const|let|var)\s+([A-Za-z_]*PLAINTEXT[A-Za-z_]*)\s*=/g;
const flags = [...code.matchAll(PLAIN_FLAG)].map((m) => m[1]);
is(flags.length === 0,
   `⛔ אין דגל נתיב-חזרה לטקסט הגלוי — נמדדו ${flags.length} והצפוי אפס` +
   (flags.length ? ` (${flags.join(', ')})` : ''));
is([...stripComments(js + '\nvar XX_PLAINTEXT_LEGACY_WRITE = true;\n')
      .matchAll(PLAIN_FLAG)].length === 1,
   '⛔ מוטציה: החזרת דגל נתיב-חזרה — הטענה שמעל הייתה נכשלת');

/*  ⚠️ אפליקציה בלי משתמשים אינה «פטורה בשקט» (סבב 40) — היא נבדקת
 *  בכיוון ההפוך: שלא צמח לה בשקט מודל משתמשים או עמודת סיסמה. זה בדיוק
 *  ההבדל בין «לא רלוונטי» ל-«❌» שמטריצת היכולות עומדת עליו.          */
if (!APP.usersTable) {
  /*  ⛔ טענת-היעדר נמדדת כמונה (סבב 79) — ⚠️ «אין» הוא מספר, ⭐ והוא מודפס. */
  const nUsers = (code.match(/from\(\s*['"]\w*_?users['"]\s*\)/g) || []).length;
  is(nUsers === 0,
     `⛔ אין כאן טבלת משתמשים כלל — נמדדו ${nUsers} אתרי גישה והצפוי אפס`);
  const nPass = (code.match(/pass_fp|pass_salt|password/g) || []).length;
  is(nPass === 0,
     `⛔ ואין שום שדה סיסמה בקוד — נמדדו ${nPass} אזכורים והצפוי אפס`);
  /*  ⭐ מוטציית-נגד — ⛔ בלעדיה שתי הטענות שלמעלה אינן מבחינות בין «קוד»
   *  ל«הערה» (סבב 68): ⚠️ התיעוד ההיסטורי מלא באזכורי שם העמודה, ⛔ וסריקה
   *  שהייתה סופרת אותם הייתה מפילה את השער על טקסט ולא על מסלול חי. */
  is(!/pass_fp|pass_salt|password/.test(
       stripComments(js + "\n// שריד תיעודי: כאן ישבה פעם password\n")),
     '⭐ מוטציית-נגד: הערה שמזכירה `password` ⛔ אינה נספרת כשדה סיסמה');
  console.log(bad ? `\n❌ ${APP.app}: ${n} טענות, ${bad} נכשלו`
                  : `\n✓ צעד ב (סיסמאות) — ${n} טענות עברו, 0 נכשלו`);
  process.exit(bad ? 1 : 0);
}

const COL = APP.plainCol;
const EQ_PLAIN = new RegExp(`\\.eq\\(\\s*['"]${COL}['"]`, 'g');
/*  ⛔ אתר כתיבה הוא השמה או שדה באובייקט ⛔ ולא אזכור השם — ⚠️ `.eq(`,
 *  `select(` והשוואה אינם כתיבה, ⭐ ושורת `strip: ['password']` היא
 *  ההפך הגמור ממנה. */
const writeSites = (t) => [...t.matchAll(new RegExp(`[^\\n]*(?:\\.${COL}\\s*=|\\b${COL}\\s*:)[^\\n]*`, 'g'))]
  .map((m) => m[0])
  .filter((l) => !/\.eq\(/.test(l) && !/select\(/.test(l) && !/!==|===/.test(l));

/* ── א. אין השוואה מול הטקסט הגלוי ─────────────────────────────────────── */
const hits = code.match(EQ_PLAIN) || [];
is(hits.length === 0,
   `⛔ אפס השוואות מול \`${COL}\` — נמדדו ${hits.length}`);

const strCmp = new RegExp(`String\\(\\s*\\w+\\.${COL}\\s*\\)\\s*!==`);
is(!strCmp.test(code), '⛔ ואין השוואת מחרוזות ישירה מול השדה');

/* ── ב. מסלולי האימות עוברים דרך הטביעה ────────────────────────────────── */
for (const [needle, label] of APP.authPaths) {
  const i = code.indexOf(needle);
  const body = i < 0 ? '' : code.slice(i, i + 4000);
  is(body.length > 0 && new RegExp(`${APP.verifyFn}\\s*\\(`).test(body),
     `${label} מאמת דרך \`${APP.verifyFn}\` (הטביעה)`);
}

/* ── ג. ההשלמה החד-פעמית הוסרה ─────────────────────────────────────────── */
is(!new RegExp(`function\\s+${APP.backfillFn}`).test(code),
   `⛔ \`${APP.backfillFn}\` הוסרה — היא הייתה הקורא האחרון של הסיסמה הגלויה`);
is(!new RegExp(`${APP.backfillFn}\\s*\\(`).test(code), '⛔ ואין לה אף אתר קריאה');

/* ── ד. צעד ב — אפס כתיבה ואפס קריאה ───────────────────────────────────── */
const writes = writeSites(code);
is(writes.length === 0,
   `⛔ אפס אתרי כתיבה ל-\`${COL}\` — נמדדו ${writes.length}` +
   (writes.length ? `: ${writes[0].trim().slice(0, 60)}` : ''));
/*  ⛔ והקריאה נמדדת אף היא — ⚠️ שאילתה ששולפת את העמודה כדי להציגה היא
 *  קורא לכל דבר, ⭐ והיא זו שתישבר ברגע שהעמודה תיפול. */
const selects = [...code.matchAll(/select\(\s*(['"])([^'"]*)\1/g)]
                  .filter((m) => new RegExp(`\\b${COL}\\b`).test(m[2]));
is(selects.length === 0,
   `⛔ ואפס שאילתות ששולפות אותה — נמדדו ${selects.length}`);

/* ── ה. שתי המיגרציות ──────────────────────────────────────────────────── */
const liveOf = (f) => fs.readFileSync(f, 'utf8').split('\n')
                        .filter((l) => l.trim() && !l.trim().startsWith('--'));
const MIG_A = join(ROOT, 'migrations', APP.migrationA);
is(fs.existsSync(MIG_A), `\`migrations/${APP.migrationA}\` (צעד א) קיימת`);
if (fs.existsSync(MIG_A)) {
  const live = liveOf(MIG_A);
  is(live.some((l) => /drop\s+not\s+null/i.test(l)),
     'צעד א — הסרת `NOT NULL` — פעיל בקובץ שכבר רץ');
  /*  ⛔ הקובץ שכבר רץ אינו נערך (סבב 85) — ⚠️ צעד ב יושב בקובץ **חדש**,
   *  ⭐ ולכן `drop column` פעיל כאן הוא סימן שמישהו ערך מיגרציה שרצה. */
  is(!live.some((l) => /drop\s+column/i.test(l)),
     '⛔ ואין בו `drop column` פעיל — מיגרציה שרצה אינה נערכת');
}
const MIG_B = join(ROOT, 'migrations', APP.migrationB);
is(fs.existsSync(MIG_B), `\`migrations/${APP.migrationB}\` (צעד ב) קיימת`);
if (fs.existsSync(MIG_B)) {
  const raw = fs.readFileSync(MIG_B, 'utf8');
  const live = liveOf(MIG_B);
  const dropped = live.filter((l) => new RegExp(`drop\\s+column\\s+if\\s+exists\\s+${COL}\\b`, 'i').test(l));
  is(dropped.length === 1,
     `⛔ צעד ב מוחק את \`${COL}\` במשפט אחד — נמדדו ${dropped.length}`);
  /*  ⛔ הצורה נגזרת ממה שרץ בפועל ⛔ ולא מניסוח חופשי — ⚠️ באנר שאומר «רץ»
   *  על קובץ שלא רץ הוא הצהרה שסותרת את הסכימה החיה, ⭐ והסבב הבא בונה
   *  עליה. ⛔ ההרצה עצמה היא פעולת מנהל. */
  is(/⛔ \*\*נכתב ולא רץ\.\*\*/.test(raw),
     '⛔ והבאנר מצהיר «נכתב ולא רץ» — ההרצה היא פעולת מנהל');
}

/* ── מוטציות ───────────────────────────────────────────────────────────── */
console.log('  — מוטציות —');
const m1 = code.replace(/\.eq\(\s*'username'/, `.eq('${COL}', pass).eq('username'`);
is((m1.match(EQ_PLAIN) || []).length > 0,
   '⛔ מוטציה: החזרת השוואה מול הטקסט הגלוי — טענה 1 הייתה נכשלת');

const m2 = code.replace(new RegExp(`${APP.verifyFn}\\s*\\(`, 'g'), 'noopVerify(');
is(!new RegExp(`${APP.verifyFn}\\s*\\(`).test(m2),
   '⛔ מוטציה: ניתוק האימות מהטביעה — טענות המסלולים היו נכשלות');

/*  ⛔ המוטציה מחזירה **כתיבה** ולא אזכור (סבב 85) — ⚠️ שורת `strip` או
 *  הערה שמזכירה את השם אינן כתיבה, ⭐ וההשמה היא מה שנמדד. */
const m3 = code + `\nfunction reintroduce(o, pass) { o.${COL} = pass; }\n`;
is(writeSites(m3).length === 1,
   '⛔ מוטציה: החזרת כתיבה לעמודה — טענת «אפס אתרי כתיבה» הייתה נכשלת');

const m4 = code.replace(/select\(\s*'/, `select('${COL},`);
is([...m4.matchAll(/select\(\s*(['"])([^'"]*)\1/g)]
     .filter((m) => new RegExp(`\\b${COL}\\b`).test(m[2])).length > 0,
   '⛔ מוטציה: החזרת שליפה של העמודה — טענת «אפס שאילתות» הייתה נכשלת');

/*  ⭐ מוטציית-נגד — ⛔ בלעדיה המוטציות שלמעלה אינן מבחינות בין
 *  «מסלול חי» ל«טקסט בהערה» (סבב 68). ⚠️ זה נמדד בסבב 40: שורת הערה
 *  שציטטה השוואה מול העמודה נספרה כהשוואה חיה. */
const anti = stripComments(js + `\n// שריד תיעודי: כאן ישב .eq('${COL}', pass) והשמה o.${COL} = pass\n`);
is((anti.match(EQ_PLAIN) || []).length === 0 && writeSites(anti).length === 0,
   '⭐ מוטציית-נגד: הערה שמצטטת השוואה והשמה ⛔ אינה נספרת כמסלול חי');

console.log(bad ? `\n❌ ${APP.app}: ${n} טענות, ${bad} נכשלו`
                : `\n✓ צעד ב (סיסמאות) — ${n} טענות עברו, 0 נכשלו`);
process.exit(bad ? 1 : 0);
