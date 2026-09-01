#!/usr/bin/env node
/*  מעבר הסיסמאות לגיבוב — סבב 40.
 *
 *  ⭐ **ההחלטה שבוטלה:** עד 2026-08-19 שלוש האפליקציות שיש בהן משתמשים
 *  החזיקו את הסיסמה ב**טקסט גלוי** בענן, ומסלולי הכניסה השוו מולה
 *  מחרוזות ישירות. זו הייתה בחירה תפעולית **מתועדת** של המנהל — «לראות
 *  ולנהל סיסמאות מתוך האפליקציה» — וכלל ברזל 9 מייחד את ההכרעה הזו לו
 *  בלבד. ⭐ **המנהל ביטל אותה ב-2026-08-19**, וזה מה שהסבב מיישם.
 *
 *  ⛔ **ולמה זה היה חמור:** מפתח ה-anon יושב ב-`index.html` הציבורי,
 *  וה-RLS פתוח בכוונה מתועדת. הסיסמה הגלויה לא הייתה «סוד חלש» — היא
 *  הייתה **המפתח שפותח את הכניסה**, קריא לכל מי שפתח את קוד המקור.
 *
 *  מה שנאכף כאן:
 *    א. ⛔ אף מסלול אינו משווה עוד מול הטקסט הגלוי.
 *    ב. כל מסלול אימות עובר דרך פונקציית הטביעה של האפליקציה.
 *    ג. ההשלמה החד-פעמית שגזרה טביעה מהסיסמה הוסרה — היא הייתה הקורא
 *       האחרון של העמודה.
 *    ד. כל כתיבה לעמודה נמצאת מאחורי דגל נתיב-החזרה.
 *    ה. המיגרציה קיימת, צעד א פעיל, צעד ב מוער, ומסומנת «לא הורצה».
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 *
 *  ⚠️ **באפליקציה שאין בה טבלת משתמשים** — `usersTable:null` בבלוק
 *  `APP` — הטענות כאן הן טענות-**חסר** ובלוק המוטציות מדולג (סבב 72).
 *  ⛔ יחס שורות-לטענה חריג הוא נימוק שנדרש, ⛔ ולא רשלנות; הנימוק
 *  המלא יושב בבלוק `APP` שלמטה.
 */
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  usersTable: 'sl_users',
  plainCol: 'password',
  /* ⚠️ השוואה **אחת** מותרת ובכוונה — אין כאן מסך ניהול משתמשים, והמנהל
     יוצר משתמש ב-`INSERT` ידני ב-SQL Editor. הטביעה נוצרת רק בכניסה
     המקוונת הראשונה, ולכן בלי אתחול חד-פעמי כל משתמש חדש היה ננעל בחוץ.
     ⛔ היא רצה פעם אחת בחיי המשתמש, ורק כשאין לו טביעה כלל. */
  allowedPlainEq: 1,
  bootstrapFlag: 'SL_PLAINTEXT_BOOTSTRAP',
  verifyFn: 'slVerifyOffline',
  backfillFn: 'slBackfillPassFp',
  /* ⛔ אין דגל כתיבה — האפליקציה **אינה** יוצרת משתמשים כלל. */
  legacyWriteFlag: null,
  authPaths: [['async function doLogin', 'הכניסה המקוונת']],
  migration: '015_users_drop_plaintext_password.sql',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [119];

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

console.log(`\n─────────────── ${APP.app}: מעבר הסיסמאות לגיבוב (סבב 40) ──`);

/*  ⚠️ אפליקציה בלי משתמשים אינה «פטורה בשקט» (סבב 40) — היא נבדקת
 *  בכיוון ההפוך: שלא צמח לה בשקט מודל משתמשים או עמודת סיסמה. זה בדיוק
 *  ההבדל בין «לא רלוונטי» ל-«❌» שמטריצת היכולות עומדת עליו.          */
if (!APP.usersTable) {
  is(!/from\(\s*['"]\w*_?users['"]\s*\)/.test(code),
     '⛔ אין כאן טבלת משתמשים כלל — ולא צמחה אחת בשקט');
  is(!/pass_fp|pass_salt|password/.test(code),
     '⛔ ואין שום שדה סיסמה בקוד — אין סוד במכשיר ואין סוד בענן');
  /*  ⭐ מוטציית-נגד — ⛔ בלעדיה שתי הטענות שלמעלה אינן מבחינות בין «קוד»
   *  ל«הערה» (סבב 68): ⚠️ התיעוד ההיסטורי מלא באזכורי שם העמודה, ⛔ וסריקה
   *  שהייתה סופרת אותם הייתה מפילה את השער על טקסט ולא על מסלול חי. */
  is(!/pass_fp|pass_salt|password/.test(
       stripComments(js + "\n// שריד תיעודי: כאן ישבה פעם password\n")),
     '⭐ מוטציית-נגד: הערה שמזכירה `password` ⛔ אינה נספרת כשדה סיסמה');
  console.log(bad ? `\n❌ ${APP.app}: ${n} טענות, ${bad} נכשלו`
                  : `\n✓ סבב 40 (סיסמאות) — ${n} טענות עברו, 0 נכשלו`);
  process.exit(bad ? 1 : 0);
}

const COL = APP.plainCol;
const EQ_PLAIN = new RegExp(`\\.eq\\(\\s*['"]${COL}['"]`, 'g');

/* ── א. אין השוואה מול הטקסט הגלוי ─────────────────────────────────────── */
const hits = code.match(EQ_PLAIN) || [];
is(hits.length === APP.allowedPlainEq,
   `⛔ מספר ההשוואות מול \`${COL}\` הוא ${APP.allowedPlainEq} כמתוכנן (נמצאו ${hits.length})` +
   (APP.allowedPlainEq ? ' — האתחול החד-פעמי בלבד' : ''));

const strCmp = new RegExp(`String\\(\\s*\\w+\\.${COL}\\s*\\)\\s*!==`);
is(!strCmp.test(code), '⛔ ואין השוואת מחרוזות ישירה מול השדה');

/*  ⚠️ האתחול החד-פעמי, כשהוא קיים, חייב לשבת מאחורי דגל משלו — אחרת
 *  הוא אינו «חלון» אלא מסלול קבוע שאיש לא יסגור.                     */
if (APP.bootstrapFlag) {
  is(new RegExp(`var\\s+${APP.bootstrapFlag}\\s*=`).test(code),
     `⭐ האתחול החד-פעמי מוכרז בדגל \`${APP.bootstrapFlag}\` — וכיבויו הוא צעד מדוד`);
  is(new RegExp(`if\\s*\\(\\s*!${APP.bootstrapFlag}\\s*\\)`).test(code),
     '⛔ והדגל **נבדק** לפני האתחול, לא רק מוכרז');
}

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

/* ── ד. הכתיבות מאחורי דגל נתיב-החזרה ──────────────────────────────────── */
if (APP.legacyWriteFlag) {
  is(new RegExp(`var\\s+${APP.legacyWriteFlag}\\s*=\\s*true\\s*;`).test(code),
     `דגל נתיב-החזרה \`${APP.legacyWriteFlag}\` קיים ופתוח`);
  const writes = [...code.matchAll(new RegExp(`[^\\n]*(?:\\.${COL}\\s*=|\\b${COL}\\s*:)[^\\n]*`, 'g'))]
                   .map((m) => m[0])
                   .filter((l) => !/\.eq\(/.test(l) && !/select\(/.test(l) && !/!==|===/.test(l));
  is(writes.length > 0, `נמצאו ${writes.length} אתרי כתיבה ל-\`${COL}\``);
  const guarded = writes.filter((l) => l.includes(APP.legacyWriteFlag));
  is(guarded.length === writes.length,
     `⛔ כל אתרי הכתיבה מאחורי הדגל (${guarded.length}/${writes.length}) — העמודה \`NOT NULL\`, ` +
     'ולכן הפסקת כתיבה לפני המיגרציה הייתה מפילה כל יצירת משתמש');
} else {
  const writes = [...code.matchAll(new RegExp(`[^\\n]*(?:\\.${COL}\\s*=|\\b${COL}\\s*:)[^\\n]*`, 'g'))]
                   .map((m) => m[0])
                   .filter((l) => !/\.eq\(/.test(l) && !/select\(/.test(l) && !/!==|===/.test(l));
  is(writes.length === 0,
     `⛔ אין כאן אף מסלול שכותב \`${COL}\` — המשתמשים נוצרים ידנית ב-SQL Editor`);
}

/* ── ה. המיגרציה ───────────────────────────────────────────────────────── */
const MIG = join(ROOT, 'migrations', APP.migration);
is(fs.existsSync(MIG), `\`migrations/${APP.migration}\` קיימת`);
if (fs.existsSync(MIG)) {
  const sql = fs.readFileSync(MIG, 'utf8');
  const live = sql.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--'));
  is(live.some((l) => /drop\s+not\s+null/i.test(l)),
     'צעד א (הסרת `NOT NULL`) פעיל — בטוח להרצה מיידית');
  is(!live.some((l) => /drop\s+column/i.test(l)),
     '⛔ צעד ב (מחיקת העמודה) **מוער** — מותנה בכיבוי הדגל ובפריסה');
  /*  ⛔ הסימון הוא אחת משתי הצורות הקנוניות ⛔ ולא ניסוח חופשי — ⚠️ עד כאן
      הטענה חיפשה מחרוזת אחת, ⭐ ושינוי ניסוח היה מפיל אותה על קובץ תקין. */
  is(/⛔⛔ \*\*נכתב ולא רץ\.\*\*/.test(sql),
     '⛔ המיגרציה מסומנת «נכתב ולא רץ» — «נכתב» אינו «רץ»');
}

/* ── מוטציות ───────────────────────────────────────────────────────────── */
console.log('  — מוטציות —');
const m1 = code.replace(/\.eq\(\s*'username'/, `.eq('${COL}', pass).eq('username'`);
is((m1.match(EQ_PLAIN) || []).length > APP.allowedPlainEq,
   '⛔ מוטציה: החזרת השוואה מול הטקסט הגלוי — טענה 1 הייתה נכשלת');

const m2 = code.replace(new RegExp(`${APP.verifyFn}\\s*\\(`, 'g'), 'noopVerify(');
is(!new RegExp(`${APP.verifyFn}\\s*\\(`).test(m2),
   '⛔ מוטציה: ניתוק האימות מהטביעה — טענות המסלולים היו נכשלות');

if (APP.legacyWriteFlag) {
  /*  ⚠️ המוטציה מכוונת לשורת **כתיבה** ולא לשומר הראשון שנמצא בקובץ
   *  (סבב 40) — הדגל שומר גם על אזורים שאינם כתיבה (הצגת הסיסמה
   *  הנוכחית במסך הניהול), והסרתו שם אינה מייצרת כתיבה לא-מוגנת.    */
  const target = code.split('\n').find((l) =>
    l.includes(APP.legacyWriteFlag) &&
    new RegExp(`\\.${COL}\\s*=|\\b${COL}\\s*:`).test(l));
  const m3 = target
    ? code.replace(target, target.replace(new RegExp(`if \\(${APP.legacyWriteFlag}\\)\\s*`), ''))
    : code;
  const w3 = [...m3.matchAll(new RegExp(`[^\\n]*(?:\\.${COL}\\s*=|\\b${COL}\\s*:)[^\\n]*`, 'g'))]
               .map((x) => x[0])
               .filter((l) => !/\.eq\(/.test(l) && !/select\(/.test(l) && !/!==|===/.test(l));
  is(w3.some((l) => !l.includes(APP.legacyWriteFlag)),
     '⛔ מוטציה: כתיבה שיצאה מאחורי הדגל — טענת «כל אתרי הכתיבה» הייתה נכשלת');
}

/*  ⭐ מוטציית-נגד — ⛔ בלעדיה שלוש המוטציות שלמעלה אינן מבחינות בין
 *  «מסלול חי» ל«טקסט בהערה» (סבב 68). ⚠️ זה נמדד בסבב 40: שורת הערה
 *  שציטטה השוואה מול העמודה נספרה כהשוואה חיה. */
const anti = stripComments(js + `\n// שריד תיעודי: כאן ישב .eq('${COL}', pass)\n`);
is((anti.match(EQ_PLAIN) || []).length === APP.allowedPlainEq,
   '⭐ מוטציית-נגד: הערה שמצטטת השוואה מול העמודה ⛔ אינה נספרת כמסלול חי');

console.log(bad ? `\n❌ ${APP.app}: ${n} טענות, ${bad} נכשלו`
                : `\n✓ סבב 40 (סיסמאות) — ${n} טענות עברו, 0 נכשלו`);
process.exit(bad ? 1 : 0);
