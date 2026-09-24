/* ═══ app.config.js — תצורת האפליקציה ════════════════════════════════════
   ⛔ המקום היחיד של ערכי האפליקציה — ⚠️ הדפדפן טוען אותו בתג, ה-service
      worker ב-`importScripts`, והכלים ב-`tools/gen-app.mjs`: ⭐ ערך שכתוב
      במקום שני הוא שני מקורות שמתיישנים זה מול זה.
   ⛔ קובצי הפלטפורמה נוצרים מכאן — ⚠️ `node tools/gen-app.mjs`, ⭐ ומי שעורך
      אותם ביד נדרס בהרצה הבאה.
   ════════════════════════════════════════════════════════════════════ */
self.APP = Object.freeze({
  /*  ⛔ שם הריפו — ⚠️ ממנו נגזרים ה-scope, קידומת המטמון ושם הפרויקט באנדרואיד. */
  id: 'schar-limud',
  name: 'שכר לימוד',
  shortName: 'שכר לימוד',
  description: 'מערכת ניהול תשלומי שכר לימוד',
  /*  ⛔ תחילית הטבלאות והאחסון — ⚠️ כל אות בה פותחת מילה בשם הריפו, בסדר. */
  prefix: 'sl_',
  colors: { theme: '#307535', background: '#ffffff' },
  /*  ⚠️ דף האופליין של ה-service worker — ⭐ צבע הרקע והדיו שלו, והסמל. */
  offline: { bg: '#1d4a34', ink: '#FFFFFF', mark: '📴' },
  /*  ⚠️ המפתח הוא מפתח `anon` ציבורי — ⛔ ולא מפתח שירות: ההרשאות במסד. */
  supabase: {
    url: 'https://kxbtskqobynewvnckaaz.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YnRza3FvYnluZXd2bmNrYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDI4NDAsImV4cCI6MjA4ODg3ODg0MH0.WLwPgTJp0Y-p1AuzeXhuHDPWEbWRanVMrvEN4V9Xbeg'
  },
  android: {
    package: 'com.schar.limud',
    /*  ⛔ `versionCode` לעולם אינו יורד, ⚠️ ומקודם בכל שינוי תחת `android/` —
        ⭐ בלי קידום המכשיר המותקן אינו מקבל את ה-APK החדש. */
    versionCode: 20,
    versionName: '15.0',
    launcherBg: { kind: 'solid', color: '#FFFFFF' },
    /*  ⚠️ גשר השיתוף — ⭐ `FileProvider` ו-`androidx`, רק באפליקציה שמייצאת קובץ. */
    share: false
  },
  /*  ⛔ טביעת מפתח החתימה הקבוע — ⚠️ `sign-apk.sh` מסרב לחתום בכל מפתח אחר. */
  signSha256: '0D:1F:DD:8B:5A:3E:9C:65:75:D8:71:80:EC:FF:62:45:CB:F1:14:E0:93:0B:5A:F5:AE:90:02:44:0D:A1:B6:4C',
  /*  ⛔ נכסי האייקון — ⚠️ `tools/gen-icons.mjs` קורא אותם. */
  icon: {
    /*  ⛔ המאסטר כאן הוא **ציור** ולא צורות — ⚠️ כל ניסיון לתאר
        אותו בפרימיטיבים היה מייצר סמל אחר, ⛔ ולא את זה שעל המכשירים.
        ⛔ **ולכן הצורה המוצהרת רסטרית** — ⚠️ והיא תואמת את סיומת
        המאסטר: ⭐ הצהרה שאינה תואמת שולחת את המחולל למסלול שאינו של הקובץ. */
    art: 'master',
    master: 'design/icon-master.png',
    bgKey: [252, 253, 252],
    keyTol: 40,
    /*  ⛔ הדיו נמדד מהמאסטר ⛔ ואינו מוקלד — ⚠️ [47,116,52] היה הצבע
        שהחזית צוירה בו בלבד, ⭐ והאריח צויר בצבע הציור עצמו. */
    ink: [60, 125, 65],
    bg: { kind: 'solid', color: [255, 255, 255] },
    mark: { w: 684, h: 612 },
  }
});
