// core/hebrew.js — מנוע התאריך העברי

import { dayAdd, dayDiff, dayIso, dayNoon } from './util.js';

// ── מנוע התאריך העברי ──
// הטבלה האריתמטית אינה נמחקת — היא רשת הביטחון כש-Intl חסר או שוגה, ואומתה מול הלוח הקבוע עד תת"י.
var HEB_DAYS=["","א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ז׳","ח׳","ט׳","י׳","י״א","י״ב","י״ג","י״ד","ט״ו","ט״ז","י״ז","י״ח","י״ט","כ׳","כ״א","כ״ב","כ״ג","כ״ד","כ״ה","כ״ו","כ״ז","כ״ח","כ״ט","ל׳"];
var HEB_MONTHS     =["תשרי","חשון","כסלו","טבת","שבט","אדר","ניסן","אייר","סיון","תמוז","מנחם אב","אלול"];
var HEB_MONTHS_LEAP=["תשרי","חשון","כסלו","טבת","שבט","אדר א׳","אדר ב׳","ניסן","אייר","סיון","תמוז","מנחם אב","אלול"];
var HEB_DOW=["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];

function hebIsLeap(hy){return ((7*(+hy)+1)%19)<7;}
function hebMonthNames(hy){return hebIsLeap(hy)?HEB_MONTHS_LEAP:HEB_MONTHS;}

// sep — התו שלפני האות האחרונה
function hebGematria(n,sep){
  n=Math.floor(Math.abs(+n))||0;
  if(!n) return '';
  if(n>=1000) n=n%1000;
  var HUN=['','ק','ר','ש','ת'],TENS=['','י','כ','ל','מ','נ','ס','ע','פ','צ'],ONES=['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  var s='',h=Math.floor(n/100),r=n%100;
  while(h>4){s+='ת';h-=4;}
  s+=HUN[h]||'';
  if(r===15) s+='טו';
  else if(r===16) s+='טז';
  else s+=TENS[Math.floor(r/10)]+ONES[r%10];
  if(sep===undefined) sep='״';
  if(!sep||!s) return s;
  if(s.length===1) return s+'׳';
  return s.slice(0,-1)+sep+s.slice(-1);
}
function hebDayLabel(day){var T=HEB_DAYS;return (T&&T[day])||hebGematria(day)||String(day);}
function hebYearLabelFull(hy){
  var ONES=['','א','ב','ג','ד','ה','ו','ז','ח','ט'],th=Math.floor((+hy)/1000);
  return ((th>0&&th<10)?ONES[th]+'׳':'')+hebGematria((+hy)%1000,'״');
}

// ── קריאת הלוח העברי של הדפדפן ──
// שמות החודשים נקראים באנגלית (en-u-ca-hebrew) כי הם יציבים בין גרסאות ICU.
var _hebMICodeLeap={tishri:0,heshvan:1,kislev:2,tevet:3,shevat:4,adar1:5,adar2:6,nisan:7,iyar:8,sivan:9,tamuz:10,av:11,elul:12};
var _hebMICodeStd ={tishri:0,heshvan:1,kislev:2,tevet:3,shevat:4,adar:5,nisan:6,iyar:7,sivan:8,tamuz:9,av:10,elul:11};
function _hebMonthCode(name){
  var s=(name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  if(s.indexOf('adar')===0){
    var t=s.slice(4);
    if(t==='i'||t==='1'||t==='a') return 'adar1';
    if(t==='ii'||t==='2'||t==='b') return 'adar2';
    return 'adar';
  }
  if(s.indexOf('tishr')===0) return 'tishri';
  if(s.indexOf('hesh')!==-1||s.indexOf('chesh')!==-1) return 'heshvan';
  if(s.indexOf('kislev')===0||s.indexOf('chislev')===0) return 'kislev';
  if(s.indexOf('tevet')===0||s.indexOf('teveth')===0) return 'tevet';
  if(s.indexOf('shevat')===0||s.indexOf('shvat')===0||s.indexOf('shebat')===0) return 'shevat';
  if(s.indexOf('nisan')===0||s.indexOf('nissan')===0) return 'nisan';
  if(s.indexOf('iyar')===0||s.indexOf('iyyar')===0) return 'iyar';
  if(s.indexOf('sivan')===0) return 'sivan';
  if(s.indexOf('tamuz')===0||s.indexOf('tammuz')===0) return 'tamuz';
  if(s==='av'||s==='ab') return 'av';
  if(s.indexOf('elul')===0) return 'elul';
  return null;
}
var _hebIntlFmt=null,_hebIntlOK=null;
// מחזירה null כש-Intl אינו זמין או מחזיר תוצאה לא צפויה.
function hebIntl(d){
  try{
    if(_hebIntlOK===false) return null;
    if(!_hebIntlFmt){
      if(typeof Intl==='undefined'||!Intl.DateTimeFormat){_hebIntlOK=false;return null;}
      var f=new Intl.DateTimeFormat('en-u-ca-hebrew',{year:'numeric',month:'long',day:'numeric'});
      var ro=f.resolvedOptions?f.resolvedOptions():null;
      if(!ro||ro.calendar!=='hebrew'||!f.formatToParts){_hebIntlOK=false;return null;}
      _hebIntlFmt=f;_hebIntlOK=true;
    }
    var o={};
    _hebIntlFmt.formatToParts(d).forEach(function(p){o[p.type]=p.value;});
    var hy=parseInt(String(o.year||'').replace(/[^0-9]/g,''),10);
    var day=parseInt(String(o.day||'').replace(/[^0-9]/g,''),10);
    var code=_hebMonthCode(o.month);
    if(!(hy>=4000&&hy<=7000)||!(day>=1&&day<=30)||!code) return null;
    var leap=hebIsLeap(hy);
    var mi=leap?_hebMICodeLeap[code]:_hebMICodeStd[code];
    if(mi===undefined){
      // אי-התאמה בין חישוב העיבור לשם החודש — לא מנחשים.
      return null;
    }
    return {hy:hy,mi:mi,day:day,leap:leap};
  }catch(e){ _hebIntlOK=false; return null; }
}

// אין לבדוק d instanceof Date — הוא תלוי-realm (iframe, vm); הבדיקה היא על החוזה, getTime שמחזיר מספר.
// ואין ליפול-חזרה ל«היום» — זה מציג תאריך שגוי כאילו הוא נכון; רק קריאה בלי ארגומנט משמעה «היום».
function _hebIsDate(d){
  return !!d&&typeof d.getTime==='function'&&!isNaN(d.getTime());
}
var _hebBadDates=[];
function _hebBadDate(where,d){
  var got;
  try{ got=Object.prototype.toString.call(d); }catch(e){ got='?'; }
  _hebBadDates.push({at:Date.now(),where:where,got:got});
  if(_hebBadDates.length>12) _hebBadDates.shift();
  try{ console.warn('[heb] hebDate: קלט שאינו תאריך תקף ב-'+where+' — '+got); }catch(e){}
}
function _hebNone(src){
  return {year:0,monthIndex:0,monthName:'',day:0,dayLabel:'',
          yearLabelFull:'',ok:false,src:src};
}
// נפילה-חזרה בלבד כש-Intl חסר או מחזיר תוצאה לא צפויה — אין למחוק: זו רשת הביטחון.
// אומתה מול הלוח הקבוע, כולל סגירת כל שנה בא׳ תשרי של הבאה ואורך חוקי; הטווח עד תת"י (2049).
var _hcST=[
  {hy:5785,lb:'תשפ"ה',jd:'2024-10-03',ml:[30,30,30,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5786,lb:'תשפ"ו',jd:'2025-09-23',ml:[30,29,30,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5787,lb:'תשפ"ז',jd:'2026-09-12',ml:[30,30,30,29,30,30,29,30,29,30,29,30,29],leap:true },
  {hy:5788,lb:'תשפ"ח',jd:'2027-10-02',ml:[30,30,30,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5789,lb:'תשפ"ט',jd:'2028-09-21',ml:[30,29,30,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5790,lb:'תש"צ',jd:'2029-09-10',ml:[30,29,29,29,30,30,29,30,29,30,29,30,29],leap:true },
  {hy:5791,lb:'תשצ"א',jd:'2030-09-28',ml:[30,30,30,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5792,lb:'תשצ"ב',jd:'2031-09-18',ml:[30,29,30,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5793,lb:'תשצ"ג',jd:'2032-09-06',ml:[30,29,29,29,30,30,29,30,29,30,29,30,29],leap:true },
  {hy:5794,lb:'תשצ"ד',jd:'2033-09-24',ml:[30,30,30,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5795,lb:'תשצ"ה',jd:'2034-09-14',ml:[30,30,30,29,30,30,29,30,29,30,29,30,29],leap:true },
  {hy:5796,lb:'תשצ"ו',jd:'2035-10-04',ml:[30,29,30,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5797,lb:'תשצ"ז',jd:'2036-09-22',ml:[30,29,29,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5798,lb:'תשצ"ח',jd:'2037-09-10',ml:[30,30,30,29,30,30,29,30,29,30,29,30,29],leap:true },
  {hy:5799,lb:'תשצ"ט',jd:'2038-09-30',ml:[30,29,30,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5800,lb:'ת"ת',jd:'2039-09-19',ml:[30,30,30,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5801,lb:'תת"א',jd:'2040-09-08',ml:[30,29,29,29,30,30,29,30,29,30,29,30,29],leap:true },
  {hy:5802,lb:'תת"ב',jd:'2041-09-26',ml:[30,29,30,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5803,lb:'תת"ג',jd:'2042-09-15',ml:[30,30,30,29,30,30,29,30,29,30,29,30,29],leap:true },
  {hy:5804,lb:'תת"ד',jd:'2043-10-05',ml:[30,29,29,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5805,lb:'תת"ה',jd:'2044-09-22',ml:[30,30,30,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5806,lb:'תת"ו',jd:'2045-09-12',ml:[30,29,30,29,30,30,29,30,29,30,29,30,29],leap:true },
  {hy:5807,lb:'תת"ז',jd:'2046-10-01',ml:[30,30,30,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5808,lb:'תת"ח',jd:'2047-09-21',ml:[30,29,29,29,30,29,30,29,30,29,30,29]   ,leap:false},
  {hy:5809,lb:'תת"ט',jd:'2048-09-08',ml:[30,29,30,29,30,30,29,30,29,30,29,30,29],leap:true },
  {hy:5810,lb:'תת"י',jd:'2049-09-27',ml:[30,30,30,29,30,29,30,29,30,29,30,29]   ,leap:false}];
// א׳ תשרי בצורת ISO, והמרחק ממנו בחשבון לוח — יום אינו תמיד 24 שעות.
function _hcHTable(d){
  var iso=dayIso(d),b=_hcST[0];
  for(var i=_hcST.length-1;i>=0;i--){if(iso>=_hcST[i].jd){b=_hcST[i];break;}}
  var df=dayDiff(b.jd,iso),c=0;
  for(var mi=0;mi<b.ml.length;mi++){if(df<c+b.ml[mi])return{hy:b.hy,mi:mi,day:df-c+1};c+=b.ml[mi];}
  return{hy:b.hy,mi:0,day:1};}

// ── עברי ⟵ לועזי ──
// נתוני השנה — א׳ תשרי (ISO) ואורכי החודשים: מ-Intl, ובנפילה-חזרה מהטבלה; null — שנה שאין עליה ראיה.
// קוראים חיצוניים עוברים כאן ולא ב-_hcST ישירות — הוא מצב פנימי, ותלות בו נשברת ביום שהמבנה משתנה.
var _hebYears={};
function _hebYearIntl(hy){
  try{
    var leap=hebIsLeap(hy),nM=leap?13:12,sep=(hy-3761)+'-09-01',start='',k,r;
    // א׳ תשרי חל תמיד בין 5.9 ל-5.10 בשנה הגרגוריאנית hy-3761
    for(k=0;k<45;k++){
      r=hebIntl(dayNoon(dayAdd(sep,k)));
      if(r&&r.hy===hy&&r.mi===0&&r.day===1){start=dayAdd(sep,k);break;}
    }
    if(!start) return null;
    var ml=[],cur=start,total=0;
    for(var m=0;m<nM;m++){
      var pr=hebIntl(dayNoon(dayAdd(cur,29)));
      if(!pr) return null;
      var len=(pr.day===1)?29:30;
      ml.push(len);total+=len;cur=dayAdd(cur,len);
    }
    return (total>=353&&total<=385)?{hy:hy,jd:start,ml:ml,leap:leap}:null;
  }catch(e){return null;}
}
function hebYearInfo(hy){
  hy=+hy;
  if(_hebYears[hy]!==undefined) return _hebYears[hy];
  var info=_hebYearIntl(hy);
  for(var i=0;!info&&i<_hcST.length;i++){
    if(_hcST[i].hy===hy) info={hy:hy,jd:_hcST[i].jd,ml:_hcST[i].ml.slice(),leap:_hcST[i].leap};
  }
  _hebYears[hy]=info||null;
  return _hebYears[hy];
}
// היום הלועזי של תאריך עברי, בעוגן הצהריים — mi מתשרי, כמו monthIndex של hebDate; null — אין ראיה, ולא «היום».
function hebToGreg(hy,mi,day){
  var b=hebYearInfo(hy);
  if(!b||!(mi>=0&&mi<b.ml.length)) return null;
  var c=(+day||1)-1;for(var m=0;m<mi;m++)c+=b.ml[m];
  return dayNoon(dayAdd(b.jd,c));}
// ── הפונקציה המרכזית ──
// מטמון הגזירה ממופתח ביום המקומי (הגזירה מעוגנת בצהריים), מתרוקן בתקרה, והתשובה מוחזרת כעותק רדוד —
// קורא שכותב לשדה היה מרעיל את המטמון לכל השאר.
var _hebCache={};
var _hebCacheN=0;
function hebDate(d){
  if(d===undefined||d===null) d=new Date();
  if(!_hebIsDate(d)){ _hebBadDate('hebDate',d); return _hebNone('bad-input'); }
  var ck=d.getFullYear()+'|'+d.getMonth()+'|'+d.getDate();
  var hit=_hebCache[ck];
  if(hit) return Object.assign({},hit);
  // צהריים מקומיים — מנטרל הבדלי אזור-זמן ושעון-קיץ בגבול היממה.
  var nd=dayNoon(d);
  var r=hebIntl(nd),src='intl';
  if(!r){ r=(typeof _hcHTable==='function')?_hcHTable(nd):null; src='table'; }
  if(!r||!r.hy){ return _hebNone('none'); }
  var names=hebMonthNames(r.hy);
  var out={
    year:r.hy, monthIndex:r.mi, monthName:names[r.mi]||'', day:r.day,
    dayLabel:hebDayLabel(r.day),
    yearLabelFull:hebYearLabelFull(r.hy),
    ok:true, src:src
  };
  if(_hebCacheN>=4000){ _hebCache={}; _hebCacheN=0; }
  _hebCache[ck]=out; _hebCacheN++;
  return Object.assign({},out);
}
// קלט פגום אינו הופך ל«היום» — jsDate || new Date() מציג את תאריך היום כאילו נתבקש;
// מחרוזת ריקה היא מה שכל הצרכנים יודעים לטפל בו, וקריאה בלי ארגומנט משמעה «היום».
function hebrewDate(jsDate){
  if(jsDate===undefined||jsDate===null) jsDate=new Date();
  if(!_hebIsDate(jsDate)){ _hebBadDate('hebrewDate',jsDate); return ''; }
  var h=hebDate(jsDate);
  if(!h.ok) return '';
  return h.dayLabel+' '+h.monthName+' '+h.yearLabelFull;
}

// ייצוא בשם ולא default — שם שנעלם נשבר בטעינה, ו-default היה נבלע בשקט.
export { HEB_DOW, HEB_MONTHS, HEB_MONTHS_LEAP, hebDate, hebDayLabel, hebGematria, hebIsLeap,
         hebMonthNames, hebToGreg, hebYearInfo, hebYearLabelFull, hebrewDate };
