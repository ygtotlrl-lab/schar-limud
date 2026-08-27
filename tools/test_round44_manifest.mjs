#!/usr/bin/env node
/* סבב 44 — אכיפת תוכן ל-manifest.json.
 *
 * ⚠️ הבודק שנוסף בסבב 33 (check-structure) אוכף את **קיומו** של
 * manifest.json ותו לא, ולכן שני הבדלי ערך שרדו בו בשקט: display
 * (fullscreen מול standalone) ו-orientation (portrait-primary מול
 * portrait). ⛔ זו אותה צורת כשל של סבב 39 בציר אחר — שם הושוו שמות
 * הכותרות ולא תוכנן.
 *
 * הבדיקה הזו מריצה את check-docs האמיתי על עותק מוטב בתיקייה זמנית
 * ודורשת שהוא יפול על שינוי ערך משותף, ⛔ ושלא יפול על שינוי ערך פרטי.
 * ⛔ המוטציות אינן נכתבות לעץ (הלקח של סבב 42ג).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

let pass = 0, fail = 0;
const ok  = (n, m) => { pass++; console.log(`  ok   ${n} · ${m}`); };
const bad = (n, m) => { fail++; console.log(`  FAIL ${n} · ${m}`); };
const t = (n, cond, m) => cond ? ok(n, m) : bad(n, m);

/* ── הערכים הקנוניים, כפי שהם רשומים ב-check-docs ──────────────────────── */
const SHARED = { display: 'standalone', orientation: 'portrait', lang: 'he', dir: 'rtl' };
/* ⛔ אלה נשארים פרטיים ואין לאכוף את ערכם (סבב 44) — זהות חזותית
   פר-אפליקציה, ו-start_url גוזר את ה-id המשתמע (סבב 39). */
const PRIVATE = ['name', 'short_name', 'description', 'start_url',
                 'scope', 'icons', 'theme_color', 'background_color'];

const mfPath = path.join(ROOT, 'manifest.json');
t(1, fs.existsSync(mfPath), 'manifest.json קיים');
const raw = fs.readFileSync(mfPath, 'utf8');
let mf = null;
try { mf = JSON.parse(raw); } catch (e) { /* מדווח בטענה 2 */ }
t(2, mf !== null, 'manifest.json הוא JSON תקין');

let n = 3;
for (const [k, v] of Object.entries(SHARED)) {
  t(n++, mf && mf[k] === v, `"${k}" = «${v}» — הערך הקנוני`);
}
t(n++, PRIVATE.every(k => k in mf), 'כל שמונת המפתחות הפרטיים קיימים');

/* ── check-docs אוכף את הערכים האלה, ולא רק את קיום הקובץ ──────────────── */
const docs = fs.readFileSync(path.join(HERE, 'check-docs.mjs'), 'utf8');
t(n++, /CANON_MANIFEST/.test(docs), 'check-docs מחזיק את הרשימה CANON_MANIFEST');
for (const [k, v] of Object.entries(SHARED)) {
  t(n++, new RegExp(`\\['${k}',\\s*'${v}'\\]`).test(docs),
    `⭐ והזוג ["${k}", "${v}"] רשום בו — אכיפת **ערך**, לא קיום`);
}
t(n++, !PRIVATE.some(k => new RegExp(`\\['${k}',`).test(docs)),
  '⛔ ואף מפתח פרטי אינו ברשימה — יישור שלו היה שובר זהות חזותית');

/* ── מוטציות: העץ אינו נגוע, העותק בתיקייה זמנית ───────────────────────── */
function runDocsOn(mutManifest) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r44mf-'));
  try {
    for (const f of fs.readdirSync(ROOT)) {
      if (f === '.git' || f === 'node_modules') continue;
      fs.cpSync(path.join(ROOT, f), path.join(tmp, f), { recursive: true });
    }
    fs.writeFileSync(path.join(tmp, 'manifest.json'), JSON.stringify(mutManifest, null, 2));
    try {
      execFileSync(process.execPath, [path.join(tmp, 'tools', 'check-docs.mjs')],
                   { cwd: tmp, stdio: 'pipe' });
      return true;                       // עבר
    } catch (e) { return false; }        // נפל
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

const mutShared  = { ...mf, display: 'fullscreen' };
t(n++, runDocsOn(mutShared) === false,
  '⛔ מוטציה: שינוי ערך משותף (display→fullscreen) **מפיל** את check-docs');

const mutOrient  = { ...mf, orientation: 'portrait-primary' };
t(n++, runDocsOn(mutOrient) === false,
  '⛔ מוטציה: שינוי orientation ל-portrait-primary **מפיל** את check-docs');

const mutPrivate = { ...mf, theme_color: '#123456' };
t(n++, runDocsOn(mutPrivate) === true,
  '⭐ ומוטציה בערך פרטי (theme_color) ⛔ **אינה** מפילה — זהות חזותית');

const mutMissing = { ...mf }; delete mutMissing.display;
t(n++, runDocsOn(mutMissing) === false,
  '⛔ מוטציה: מפתח משותף שנמחק כליל **מפיל** — היעדר אינו פטור');

console.log(`\n${fail ? '❌' : '✓'} סבב 44 (manifest) — ${pass} טענות עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
