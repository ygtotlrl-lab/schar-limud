#!/usr/bin/env node
/*  test_shell.mjs — שער החתימה על מעטפת ה-WebView.
 *
 *  **מה נאכף:** שתי שכבות — (א) **חוזה התנהגות משותף**: ארבעת הדברים שכל
 *  מעטפת חייבת לממש, נאכפים זהה בארבעתן; (ב) **חתימה על הלוגיקה**: hash על
 *  המקור אחרי הסרת הערות והחלפת כל מחרוזת בסמן אחיד — ⛔ ניסוח javadoc, שם
 *  בעברית, צבע וכתובת אינם בחתימה, ⛔ וכל שינוי ב**זרימה** מפיל אותה.
 *
 *  **הנימוק המדוד:** ארבעה עותקים של אותה מעטפת — שניים כמעט זהים
 *  בית-לבית, אחד נבדל בניסוח ה-javadoc, ואחד כפול מהם בגלל גשר השיתוף —
 *  ⛔ **ואף בדיקה לא נגעה באף אחת מהן**.
 *
 *  **מה יישבר בלעדיו:** ⛔ קובץ ה-Java הוא היחיד בארגון בלי שער, ⚠️ והוא זה
 *  שקובע מה קורה כשאין רשת. ⛔ שינוי מכוון במעטפת מחייב עדכון החתימה באותו
 *  סבב, ⚠️ ואז שער ה-`versionCode` דורש גם קידום גרסה.
 *
 *  **מה אינו נאכף כאן:** ⛔ הסבב אינו מחלץ תבנית משותפת — ⚠️ חילוץ ארבע
 *  מעטפות לקובץ אחד הוא סבב ייעודי, ⛔ ובלי שער קיים הוא ריפקטור בלי רשת
 *  ביטחון. ⭐ והחתימה פר-ריפו ⛔ ולא אחת לארבעתן: המעטפת של יומן נושאת גשר
 *  שיתוף שאין לשלוש האחרות, ⚠️ ולכן הלוגיקה שלה נבדלת **במדידה ולא
 *  בסחיפה**. ⭐ שלוש האחיות מחזיקות בפועל אותה חתימה בדיוק — נמדד, ⛔ ולא
 *  הוצהר.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 */

import fs from 'node:fs';
import crypto from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /* ⭐ הליבה המשותפת (סבב 41) — זהה בית-לבית בארבעת הריפו פרט לשורת
     ה-`package`, וכל חוזה ההתנהגות יושב בה. */
  core:  'android/app/src/main/java/com/schar/limud/ShellActivity.java',
  /* המעטפת הפר-אפליקציתית — זהות בלבד, ואצל יומן גם הגשר. */
  shell: 'android/app/src/main/java/com/schar/limud/MainActivity.java',
  /* אין `navigator.share` בקוד (אומת ב-grep) — ולכן אין גשר, ואין צורך באחד. */
  shareBridge: false,
  /* חתימות הלוגיקה — הערות, מחרוזות ושם החבילה מנורמלים החוצה. */
  coreSha:  '5c919c9358244719',
  shellSha: 'ca9797653ad5d17e',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו 70% מזמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);

for (const p of [APP.core, APP.shell]) {
  if (!fs.existsSync(join(ROOT, p))) { fail(`${p} אינו קיים — אין מעטפת`); process.exit(1); }
}
const coreSrc  = fs.readFileSync(join(ROOT, APP.core),  'utf8');
const shellSrc = fs.readFileSync(join(ROOT, APP.shell), 'utf8');

/*  ⚠️ טוקניזציה ולא ביטוי רגולרי (סבב 40) — בדיוק הלקח של
 *  `check-comments.mjs`: כל URL מכיל `//`, ולכן `"https://…"` היה נקרא
 *  כתחילת הערה והשאר השורה היה נבלע. כאן ההליכה היא תו-תו, עם מצב
 *  מחרוזת ותו-בודד, וכל מחרוזת מוחלפת בסמן `"§"` אחיד.               */
function normalize(text) {
  let out = '', i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i], d = text[i + 1];
    if (c === '/' && d === '/') { while (i < n && text[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"') {                                   // מחרוזת — כולל רצפי בריחה
      i++;
      while (i < n && text[i] !== '"') { if (text[i] === '\\') i++; i++; }
      i++; out += '"§"'; continue;
    }
    if (c === "'") {                                   // תו בודד
      i++;
      while (i < n && text[i] !== "'") { if (text[i] === '\\') i++; i++; }
      i++; out += "'§'"; continue;
    }
    out += c; i++;
  }
  /*  ⭐ שם החבילה מנורמל גם הוא (סבב 40) — הוא מציין-זהות ולא לוגיקה,
   *  והוא **הדבר היחיד** שהפריד בין שלוש המעטפות חסרות-הגשר. בלעדיו כל
   *  אחת מהן הייתה נושאת חתימה משלה, ואי אפשר היה לאכוף שהן זהות.     */
  return out.replace(/\s+/g, ' ').trim().replace(/^package\s+[\w.]+\s*;/, 'package §;');
}

/*  ⭐ החתימה הקנונית של מעטפת **בלי גשר** — נמדדה בסבב 40 ונמצאה זהה
 *  בית-לבית בשלוש (hanhala · schar · gius) אחרי נרמול הזהות. ⛔ מעטפת
 *  שהוכרזה חסרת-גשר חייבת לשאת אותה, אחרת שלוש האחיות יכולות להיסחף זו
 *  מזו בשקט — בדיוק מה שכלל ברזל 14 אוסר. ליומן חתימה משלה, מפני שגשר
 *  השיתוף מכפיל את המעטפת; זו חריגה **מדודה** ורשומה במטריצה.        */
const SHELL_SHA_NO_BRIDGE = 'ca9797653ad5d17e';

/*  ⭐⭐ החתימה הקנונית של **הליבה**, וזה החידוש של סבב 41: עד אז ליומן
 *  הייתה חתימה משלה, מפני שגשר השיתוף הכפיל אצלה את המעטפת ולא ניתן היה
 *  להשוות. אחרי החילוץ הליבה זהה בית-לבית ב**ארבעתן** — כולל יומן — והגשר
 *  יושב מחוצה לה. ⛔ סחיפה של שורה אחת בליבה נתפסת בארבעת הריפו בנפרד. */
const CORE_SHA = '5c919c9358244719';

/*  ── א. חוזה ההתנהגות המשותף ───────────────────────────────────────────────
 *  ארבעת הדברים שכל מעטפת בארגון מממשת, ולמה כל אחד מהם קיים. ⛔ שורה
 *  שיורדת מכאן היא יכולת שנעלמה ממעטפת אחת בשקט — בדיוק מה שכלל ברזל 14
 *  אוסר.                                                                */
const CONTRACT = [
  { name: 'בורר קבצים מחובר ל-<input type=file>',
    re: /onShowFileChooser/,
    why: 'בלעדיו לחיצה על שדה קובץ באפליקציה פשוט אינה עושה דבר' },
  { name: 'דף אופליין מוגש כ-text/html בקידוד utf-8',
    re: /loadDataWithBaseURL\s*\(\s*null\s*,[^;]*"§"\s*,\s*"§"\s*,\s*null\s*\)/,
    why: 'בלי Content-Type מפורש הדף העברי מוצג כג׳יבריש; base=null מונע ממנו origin' },
  { name: 'כפתור «חזור» מנווט אחורה ב-WebView',
    re: /canGoBack\s*\(\s*\)/,
    why: 'בלעדיו כפתור החזרה סוגר את האפליקציה מכל מסך פנימי' },
  { name: 'http/https נשאר בתוך המעטפת',
    re: /shouldOverrideUrlLoading/,
    why: '⛔ מסירה לדפדפן החיצוני מגיעה לכרום, שסינון התוכן במכשירים חוסם' },
  { name: 'JavaScript ו-localStorage מופעלים',
    re: /setJavaScriptEnabled\s*\(\s*true\s*\)[\s\S]*setDomStorageEnabled\s*\(\s*true\s*\)/,
    why: 'localStorage הוא כל שכבת האופליין; בלעדיו האפליקציה עולה ריקה' },
  /*  ⭐ ההקשחה שנמדדה חסרה ב-gius בסבב 40 והושלמה שם: המעטפת אינה טוענת
   *  דבר מהדיסק (`loadDataWithBaseURL(null, …)`), ולכן גישת file:// היא
   *  הרשאה מיותרת בהגדרה — ובדיוק כזו שדף שנטען מהרשת יכול לנצל.        */
  { name: 'גישת file:// ו-content:// סגורה',
    re: /setAllowFileAccess\s*\(\s*false\s*\)[\s\S]*setAllowContentAccess\s*\(\s*false\s*\)/,
    why: '⛔ המעטפת אינה טוענת דבר מהדיסק, ולכן זו הרשאה מיותרת שדף מרוחק יכול לנצל' },
];

/*  ⭐ חוזה ההתנהגות נבדק ב**ליבה** (סבב 41) — שם הוא יושב מאז החילוץ,
 *  ובאותה צורה בארבעתן. ⛔ מעטפת פר-אפליקציה שתממש אחד מהם בעצמה היא
 *  בדיוק הסטייה שהחילוץ בא למנוע, ולכן היא נופלת על חתימת ה-`shellSha`. */
const coreNorm  = normalize(coreSrc);
const shellNorm = normalize(shellSrc);
for (const c of CONTRACT) {
  if (c.re.test(coreNorm)) pass(`חוזה המעטפת: ${c.name}`);
  else fail(`חוזה המעטפת נשבר — ${c.name} אינו בליבה המשותפת. ${c.why}`);
}

/*  ── ב. הגשר המקורי — מותר רק למי שהוכרז ───────────────────────────────────
 *  ⛔ `addJavascriptInterface` על דף שנטען מהרשת מזריק את האובייקט לכל
 *  frame בלי שום מושג של origin. ליומן הוא נחוץ (שיתוף דוח כתמונה) והוא
 *  נעול-כפליים; לשלוש האחרות אין `navigator.share` כלל, ולכן גשר שם הוא
 *  הרחבת-הישג בלי צורך.                                                */
/*  ⛔ הליבה המשותפת אינה נושאת גשר לעולם (סבב 41) — גשר בליבה היה מגיע
 *  לארבעתן בבת אחת, כלומר בדיוק ההפך ממה שהחריגה המדודה של יומן אומרת. */
if (/addJavascriptInterface|addWebMessageListener/.test(coreNorm)) {
  fail('⛔ נמצא גשר בליבה המשותפת — גשר שייך למעטפת הפר-אפליקציתית בלבד');
} else {
  pass('הליבה המשותפת נקייה מגשר');
}

const hasBridge = /addJavascriptInterface|addWebMessageListener/.test(shellNorm);
if (APP.shareBridge && !hasBridge) {
  fail('הוכרז גשר שיתוף — ואין במעטפת אף מסלול גשר');
} else if (!APP.shareBridge && hasBridge) {
  fail('⛔ נמצא גשר מקורי במעטפת שלא הוכרזה כנושאת גשר — ' +
       'דף שנטען מהרשת אינו מקבל גשר בלי צורך מדוד (סבב 40)');
} else {
  pass(APP.shareBridge ? 'גשר השיתוף מוכרז וקיים — ונעול ל-origin שלנו'
                       : 'אין גשר מקורי, כמוכרז');
}
if (APP.shareBridge) {
  if (/ALLOWED_ORIGINS|allowedOriginRules|addWebMessageListener/.test(shellNorm)) {
    pass('⭐ מסלול הגשר המאובטח (רשימת מקורות) קיים');
  } else {
    fail('⛔ גשר בלי רשימת מקורות — האכיפה שהפלטפורמה נותנת בחינם ננטשה');
  }
}

/* ── ג. חתימות הלוגיקה ─────────────────────────────────────────────────── */
const sha16 = (t) => crypto.createHash('sha256').update(t, 'utf8').digest('hex').slice(0, 16);
const coreSha  = sha16(coreNorm);
const shellSha = sha16(shellNorm);

if (coreSha === APP.coreSha) {
  pass(`חתימת הליבה המשותפת תואמת: ${coreSha} (${coreNorm.length} תווים מנורמלים)`);
} else {
  fail(`חתימת הליבה המשותפת השתנתה: ${APP.coreSha} → ${coreSha}\n` +
       '   ⛔ שינוי בליבה הוא שינוי בארבע האפליקציות — מעדכנים את הבלוק ואת החתימה בארבעתן, באותו סבב.');
}
if (shellSha === APP.shellSha) {
  pass(`חתימת המעטפת הפר-אפליקציתית תואמת: ${shellSha} (${shellNorm.length} תווים מנורמלים)`);
} else {
  fail(`חתימת המעטפת השתנתה: ${APP.shellSha} → ${shellSha}\n` +
       '   שינוי מכוון = עדכון `shellSha` באותו סבב, ואז שער ה-versionCode דורש גם קידום גרסה.\n' +
       '   ⚠️ הערות, שם האפליקציה, צבע וכתובת אינם בחתימה — אם היא נפלה, **הזרימה** השתנתה.');
}

/*  ── ד. זהות בין האחיות ────────────────────────────────────────────────────
 *  ⛔ כל ריפו אוכף כאן שהחתימה שהוא מצהיר עליה היא הקנונית — כך שסחיפה
 *  בין שלוש המעטפות נתפסת בכל אחת מהן בנפרד, ולא רק בהשוואה ידנית.   */
if (APP.coreSha !== CORE_SHA) {
  fail(`⛔ הליבה חייבת לשאת את החתימה הקנונית ${CORE_SHA}, וכאן הוכרז ${APP.coreSha} — ` +
       'ארבע הליבות נסחפו זו מזו');
} else {
  pass(`⭐ חתימת הליבה היא הקנונית בארבעתן: ${CORE_SHA}`);
}

if (!APP.shareBridge && APP.shellSha !== SHELL_SHA_NO_BRIDGE) {
  fail(`מעטפת בלי גשר חייבת לשאת את החתימה הקנונית ${SHELL_SHA_NO_BRIDGE}, ` +
       `וכאן הוכרז ${APP.shellSha} — שלוש האחיות נסחפו זו מזו`);
} else if (!APP.shareBridge) {
  pass(`⭐ החתימה היא הקנונית לשלוש המעטפות חסרות-הגשר: ${SHELL_SHA_NO_BRIDGE}`);
} else {
  pass('⚠️ מעטפת עם גשר — חתימה משלה, חריגה מדודה ורשומה במטריצה');
}

console.log(failures ? `\n❌ ${APP.app}: ${failures} כשלים בשער המעטפת`
                     : `\n✅ ${APP.app}: שער המעטפת עבר`);
/*  ⛔ מכאן ולמטה מוטציות ובדיקות שלמות (סבב 92) — ⚠️ הן רצות ברמה
 *  המלאה בלבד: ⛔ הרמה המהירה עוצרת כאן עם קוד היציאה של הטענות
 *  שכבר רצו, ⭐ והכיסוי שלהן אינו יורד. */
if (!RUN_MUT) {
  console.log('\n⏭ test_shell: המוטציות רצות ברמה המלאה (--full)');
  process.exit(failures ? 1 : 0);
}
/*  ⛔ היציאה עברה לסוף (סבב 67) — המוטציות רצות אחרי הטענות. */
/* ───────────────────────────────────────────────────────────────────────────
   ⛔ מוטציה ומוטציית-נגד — סבב 67
   ───────────────────────────────────────────────────────────────────────────
   ⛔ מבחן נכנס עם מוטציה, או עם נימוק כתוב מדוע אינו ניתן למוטציה.
   ⚠️ בלעדיה אין שום ראיה שהמבחן **מסוגל** ליפול: 97 טענות שעוברות על עץ
   תקין נראות כרשת ביטחון ופועלות כאישור. ⛔ והמוטציה רצה על **עותק
   בתיקייה זמנית** ולא על העץ (הלקח של סבב 42ג).
   ⚠️ הרצת-המשנה מסומנת ב-`RD67_MUT` — ⛔ בלעדיו המוטציה הייתה מריצה את
   עצמה שוב בתוך העותק, לאין סוף.
   ──────────────────────────────────────────────────────────────────────── */
if (!process.env.RD67_MUT) {
  const _m = await import('node:fs');
  const _p = await import('node:path');
  const _o = await import('node:os');
  const _c = await import('node:child_process');
  const _self = new URL(import.meta.url).pathname;
  const _name = _p.basename(_self);
  const _root = _p.resolve(_p.dirname(_self), '..');
  const _run = (dir) => _c.spawnSync(process.execPath, [_p.join(dir, 'tools', _name)],
    { cwd: dir, encoding: 'utf8', env: { ...process.env, RD67_MUT: '1' } }).status;

  const _mut = (label, file, edit, expectFail) => {
    /*  ⛔ עותק לכל מוטציה, ⛔ ובכוונה (סבב 92) — ⚠️ נמדדו **שניים** בהרצה
        אחת, ⭐ אחד לכל מוטציה: ⛔ כל אחת מריצה שער אמיתי על ליבה שהשתנתה. */
    const d = _m.mkdtempSync(_p.join(_o.tmpdir(), 'rd67-'));
    _m.cpSync(_root, d, { recursive: true, filter: (s) => !s.includes('/.git') });
    const f = _p.join(d, file);
    if (!_m.existsSync(f)) { console.log('  ok   ' + label + ' — ⚠️ הקובץ אינו קיים כאן, הטענה מוצהרת ריקה'); return; }
    _m.writeFileSync(f, edit(_m.readFileSync(f, 'utf8')));
    const st = _run(d);
    const fell = st !== 0;
    console.log((fell === expectFail ? '  ok   ' : '  FAIL ') + label);
    /*  ⛔ יציאה מיידית ולא `exitCode` (סבב 67) — סיכום המבחן קורא
     *  ל-`process.exit` בסופו, והוא היה דורס כשל מוטציה בשקט. */
    if (fell !== expectFail) process.exit(1);
    _m.rmSync(d, { recursive: true, force: true });
  };

  console.log('\n— מוטציות (סבב 67) —');
  _mut('⛔ שינוי בית בליבת ShellActivity מזיז את החתימה ומפיל', 'android/app/src/main/java/com/schar/limud/ShellActivity.java',
       (s) => s.replace(/\bonCreate\b/, 'onCreateRenamed'), true);
  _mut('⭐ מוטציית-נגד: הוספת שורה ריקה בסוף הקובץ ⛔ אינה מפילה', 'android/app/src/main/java/com/schar/limud/ShellActivity.java',
       (s) => s.replace(/\s*$/, '\n'), false);
}

process.exit(failures ? 1 : 0);


