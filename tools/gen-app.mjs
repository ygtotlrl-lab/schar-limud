#!/usr/bin/env node
/* ═══ tools/gen-app.mjs — קובצי הפלטפורמה מהתצורה ═══════════════════════
   ⭐ יוצר מ-`app.config.js` את `manifest.json`, את קובצי האנדרואיד ואת
      האייקונים — ⛔ ואיש אינו עורך אותם ביד: ⚠️ עריכה ידנית נדרסת בהרצה הבאה.
   ⛔ **והרצה שנייה אינה משנה אף קובץ** — ⚠️ מה שנוצר זהה למה שבעץ,
      ⭐ ו-`--check` מפיל כשאינו זהה.
   ⭐ ו-`--get <שדה>` מדפיס ערך אחד — ⚠️ החתימה והבנייה קוראות ממנו,
      ⛔ ואינן מחזיקות עותק משלהן.
   הרצה:  node tools/gen-app.mjs  ·  --check  ·  --get <שדה.שדה>
   ════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/*  ⛔ התצורה נקראת כפי שהדפדפן קורא אותה — ⚠️ סקריפט שמציב את `self.APP`,
 *  ⭐ ולא עותק JSON שני שמתיישן מולה. */
export function loadApp() {
  const ctx = { self: {} };
  runInNewContext(readFileSync(join(ROOT, 'app.config.js'), 'utf8'), ctx, { filename: 'app.config.js' });
  if (!ctx.self.APP) throw new Error('app.config.js אינו מציב את self.APP');
  return ctx.self.APP;
}
export const APP = loadApp();

const MARK = 'נוצר מהתצורה — `app.config.js`, ב-`node tools/gen-app.mjs`: אין לערוך ביד';
const ICON_RE = /^(icon-192|icon-512|icon-maskable-512)\.[0-9a-f]{8}\.png$/;

/*  ⛔ שמות האייקונים נקראים מהתיקייה — ⚠️ השם נושא את תוכנו, ⭐ ומחולל
 *  האייקונים הוא שכתב אותו. */
function iconNames() {
  const out = {};
  for (const f of readdirSync(join(ROOT, 'icons'))) {
    const m = ICON_RE.exec(f);
    if (m) out[m[1]] = 'icons/' + f;
  }
  for (const k of ['icon-192', 'icon-512', 'icon-maskable-512'])
    if (!out[k]) throw new Error(`icons/ — חסר ${k}`);
  return out;
}

function manifest(A) {
  const ic = iconNames();
  const icon = (src, size, purpose) =>
    `    { "src": ${JSON.stringify(src)}, "sizes": "${size}x${size}", "type": "image/png", "purpose": "${purpose}" }`;
  const head = {
    '//': MARK.replace(/`/g, ''),
    name: A.name, short_name: A.shortName, description: A.description,
    id: `/${A.id}/`, start_url: './index.html', scope: `/${A.id}/`,
    display: 'standalone', background_color: A.colors.background, theme_color: A.colors.theme,
    lang: 'he', dir: 'rtl', orientation: 'portrait'
  };
  const lines = Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  return '{\n' + lines.join('\n') + '\n  "icons": [\n' + [
    icon(ic['icon-192'], 192, 'any'),
    icon(ic['icon-512'], 512, 'any'),
    icon(ic['icon-maskable-512'], 512, 'maskable')
  ].join(',\n') + '\n  ]\n}\n';
}

function androidManifest(A) {
  const share = A.android.share;
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- ⛔ ${MARK} -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
${share ? `
    <!-- resolveActivity() for the share hand-off needs this on API 30+ -->
    <queries>
        <intent>
            <action android:name="android.intent.action.SEND" />
            <data android:mimeType="image/*" />
        </intent>
    </queries>
` : ''}
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${A.name}"
        android:supportsRtl="true"
        android:usesCleartextTraffic="false"
        android:theme="@android:style/Theme.Material.Light.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout|smallestScreenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
${share ? `
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
` : ''}
    </application>
</manifest>
`;
}

function appGradle(A) {
  return `// ⛔ ${MARK}
plugins {
    id 'com.android.application'
}

android {
    namespace '${A.android.package}'
    compileSdk 34

    defaultConfig {
        applicationId "${A.android.package}"
        minSdk 21
        targetSdk 34
        versionCode ${A.android.versionCode}
        versionName "${A.android.versionName}"
    }

    buildTypes {
        release {
            minifyEnabled false
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}
${A.android.share ? `
dependencies {
    implementation 'androidx.core:core:1.13.1'
    // WebViewCompat.addWebMessageListener — the origin allow-list for the share bridge
    // is enforced by WebView itself, per frame. See MainActivity#installShareBridge.
    implementation 'androidx.webkit:webkit:1.11.0'
}
` : ''}`;
}

function settingsGradle(A) {
  return `// ⛔ ${MARK}
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "${A.id}"
include ':app'
`;
}

function launcherBg(A) {
  const b = A.android.launcherBg;
  const body = b.kind === 'gradient'
    ? `    <gradient
        android:type="linear"
        android:angle="${b.angle}"
        android:startColor="${b.start}"
        android:endColor="${b.end}"/>`
    : `    <solid android:color="${b.color}"/>`;
  if (b.kind !== 'gradient' && b.kind !== 'solid') throw new Error(`launcherBg.kind — ${b.kind}`);
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- ⛔ ${MARK} -->
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
${body}
</shape>
`;
}

const RES = 'android/app/src/main/res';
export const TARGETS = {
  'manifest.json': manifest,
  'android/app/src/main/AndroidManifest.xml': androidManifest,
  'android/app/build.gradle': appGradle,
  'android/settings.gradle': settingsGradle,
  [`${RES}/drawable/ic_launcher_background.xml`]: launcherBg
};

function get(path) {
  let v = APP;
  for (const k of path.split('.')) {
    if (v == null || !(k in v)) throw new Error(`app.config.js — אין שדה ${path}`);
    v = v[k];
  }
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

async function main(argv) {
  if (argv[0] === '--get') { process.stdout.write(get(argv[1] || '') + '\n'); return; }
  const check = argv[0] === '--check';
  /*  ⚠️ האייקונים קודם — ⭐ `manifest.json` נושא את שמותיהם. */
  if (!check) await import('./gen-icons.mjs');
  let changed = 0;
  for (const [rel, make] of Object.entries(TARGETS)) {
    const p = join(ROOT, rel), want = make(APP);
    const have = existsSync(p) ? readFileSync(p, 'utf8') : null;
    if (have === want) continue;
    changed++;
    if (check) console.error(`❌ ${rel} — אינו מה שהתצורה יוצרת`);
    else writeFileSync(p, want);
  }
  if (check && changed) process.exit(1);
  console.log(`gen-app — ${changed} קבצים ${check ? 'נבדלים' : 'נכתבו'} (${APP.id})`);
}

/*  ⛔ `main` רץ רק כשהקובץ הוא נקודת הכניסה — ⚠️ מחולל האייקונים מייבא
 *  ממנו את התצורה, ⭐ וייבוא אינו הרצה. */
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  main(process.argv.slice(2)).catch(e => { console.error('❌ ' + (e && e.message || e)); process.exit(1); });
