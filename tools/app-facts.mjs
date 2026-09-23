/* ───────────────────────────────────────────────────────────────────────────
   עובדות האפליקציה מהעץ — מודול משותף לשערים

   ⛔ מה נאכף: זהות האפליקציה — השם בריפו, השם למשתמש, קובץ הכניסה, ה-`scope`,
      קידומת המטמון ועמודתה בטבלת התשתית — **נגזרת כאן מהעץ**, ⚠️ ממה
      שהמניפסט כבר מכריז ומסדר המרשם: ⭐ ושער שזקוק לאחת מהן קורא אותה
      מכאן, ⛔ ואינו מצהיר אותה בבלוק ה-`APP` שלו.
   ⚠️ הנימוק המדוד: אותו שם ריפו הוצהר מאתיים ושמונים וחמש פעמים בחמשת
      הריפו — ⛔ וכל הצהרה היא מקור אמת שני למה שהמניפסט כבר אומר, ⭐ ושער
      שהועתק מאחות נשאר עם השם שלה בלי שאיש יראה.
   ⛔ מה יישבר בלעדיו: כל שער גוזר בעצמו, ⚠️ ושתי גזירות לאותה עובדה הן
      שתי תשובות שנבדלות ביום הראשון שבו אחת מהן תיערך.
   ⭐ מה אינו נאכף כאן: **ערך שאין לו מקור בעץ** — ⛔ תחילית הטבלאות,
      המזהה באנדרואיד, טביעות וקבצים ננעצים: ⚠️ הם מוצהרים בשער שקורא
      אותם, ⭐ עם נימוקם בשדה עצמו.
   ──────────────────────────────────────────────────────────────────────── */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PEERS, appScope } from './peers.mjs';

/*  ⛔ שם הריפו נגזר משם התיקייה ⛔ ולא מהמניפסט — ⚠️ שער שמודד את
 *  ה-`scope` שבמניפסט מול השם היה משווה את המניפסט לעצמו: ⭐ ולכן השם
 *  מגיע ממקור שהשער אינו מודד. ⚠️ ושער שמריץ את הסט על עותק זמני יושב
 *  בתיקייה ששמה אקראי — ⛔ והשם עובר אליו בסביבה, ⭐ ממי שנגזר בתיקייה
 *  האמיתית: ⚠️ ורק כשאין אף אחד מהשניים, ה-`scope` שבמניפסט. */
const SLUG_ENV = 'APP_FACTS_SLUG';

export function appFacts(root, own) {
  /*  ⚠️ עותק זמני שאין בו מניפסט אינו כשל — ⛔ שער שמעתיק רק את מה שהוא
   *  מודד לא יכשל על קובץ שאינו נוגע בו: ⭐ והשם מגיע מהתיקייה או מהסביבה. */
  const man = join(root, 'manifest.json');
  const m = existsSync(man) ? JSON.parse(readFileSync(man, 'utf8')) : {};
  const dir = basename(root);
  const slug = PEERS.includes(dir) ? dir
    : (own && process.env[SLUG_ENV]) || String(m.scope || '').replace(/^\/|\/$/g, '');
  if (own) process.env[SLUG_ENV] = slug;
  return {
    slug,
    title: m.name,
    entry: String(m.start_url || '').replace(/^\.\//, ''),
    scope: appScope(slug),
    cachePrefix: slug + '-',
    /*  ⛔ העמודה נספרת מאחת — ⚠️ אפס הוא «אינה במרשם», ⭐ ושער שמצליב
     *  עמודה נופל עליה ברעש ⛔ ולא על עמודת האחות. */
    col: PEERS.indexOf(slug) + 1,
  };
}

export const FACTS = appFacts(join(dirname(fileURLToPath(import.meta.url)), '..'), true);

/*  ⛔ שם קובץ אייקון נושא את תוכנו — ⚠️ `<בסיס>.<8 ספרות הקס>.png`, ⭐ שמונה
 *  התווים הראשונים של `sha256` על הבתים: ⛔ שינוי בבתים משנה את הכתובת,
 *  ⚠️ וכרום מושך אותה מחדש ⛔ ואינו נשען על מטמון הסמלילים שלו.
 *  ⭐ והבסיס הוא הזהות — ⚠️ רשימות הקבצים המשותפות נוקבות בו, ⛔ שהחתימה
 *  נבדלת בין הריפו. */
export const ICON_BASES = ['apple-touch-icon', 'favicon-16', 'favicon-32', 'icon-192', 'icon-512', 'icon-maskable-512'];
export const ICON_RE = /^([a-z0-9-]+)\.([0-9a-f]{8})\.png$/;
export const iconHash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 8);
export const iconName = (base, buf) => `${base}.${iconHash(buf)}.png`;
/*  ⛔ הנתיב בלי החתימה — ⚠️ `icons/icon-192.<h>.png` ⟵ `icons/icon-192.png`. */
export const iconCanon = (rel) => String(rel).replace(/(^|\/)([a-z0-9-]+)\.[0-9a-f]{8}\.png$/, '$1$2.png');
/*  ⛔ בסיס ⟵ שם הקובץ שבדיסק — ⚠️ בסיס שאין לו קובץ נושא `null`. */
export function iconFiles(root) {
  const dir = join(root, 'icons');
  const names = existsSync(dir) ? readdirSync(dir) : [];
  return Object.fromEntries(ICON_BASES.map((b) => [b, names.find((n) => (ICON_RE.exec(n) || [])[1] === b) || null]));
}
