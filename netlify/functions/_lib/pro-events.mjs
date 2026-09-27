function nth(y,m,w,n){const f=new Date(Date.UTC(y,m,1)).getUTCDay();return 1+((w-f+7)%7)+7*(n-1)}
function etOffset(y,m,d){const a=nth(y,2,0,2),b=nth(y,10,0,1);const dst=(m>2&&m<10)||(m===2&&d>=a)||(m===10&&d<b);return dst?-4:-5}
function isoET(y,m,d,h=10,mi=0){return new Date(Date.UTC(y,m,d,h-etOffset(y,m,d),mi)).toISOString()}
function isoCT(y,m,d,h=12,mi=0){const et=etOffset(y,m,d);const ct=et-1;return new Date(Date.UTC(y,m,d,h-ct,mi)).toISOString()}

const SPECIAL_2026=[
  ['ISM','ISM 製造業 PMI','ISM 官方排程',2026,9,1,10,0],
  ['ISM','ISM 服務業 PMI','ISM 官方排程',2026,9,5,10,0],
  ['UMICH','密西根大學消費者信心｜10月初值','University of Michigan',2026,9,9,10,0],
  ['UMICH','密西根大學消費者信心｜10月終值','University of Michigan',2026,9,23,10,0],
  ['ISM','ISM 製造業 PMI','ISM 官方排程',2026,10,2,10,0],
  ['ISM','ISM 服務業 PMI','ISM 官方排程',2026,10,4,10,0],
  ['UMICH','密西根大學消費者信心｜11月初值','University of Michigan',2026,10,6,10,0],
  ['UMICH','密西根大學消費者信心｜11月終值','University of Michigan',2026,10,20,10,0],
  ['ISM','ISM 製造業 PMI','ISM 官方排程',2026,11,1,10,0],
  ['ISM','ISM 服務業 PMI','ISM 官方排程',2026,11,3,10,0],
  ['UMICH','密西根大學消費者信心｜12月初值','University of Michigan',2026,11,4,10,0],
  ['UMICH','密西根大學消費者信心｜12月終值','University of Michigan',2026,11,18,10,0],
  ['FED','Fed Waller｜Federal Reserve Economic Data','Federal Reserve',2026,9,1,10,0],
  ['FED','Fed Jefferson｜美國經濟與貨幣政策','Federal Reserve',2026,9,1,13,30],
  ['FED','Fed Bowman｜金融監管','Federal Reserve',2026,9,1,15,0],
  ['FED','Fed Cook｜全球央行議題','Federal Reserve',2026,9,1,15,30]
].map(([type,name,source,y,m,d,h,mi])=>({type,name,source,time:isoET(y,m,d,h,mi),pro:true}));

const HOLIDAYS_2026=[
  {type:'CME_HOLIDAY',name:'CME 感恩節特殊交易日',source:'CME Group 官方假期時程',time:isoET(2026,10,26,0,0),dateOnly:true,pro:true,note:'美國感恩節；交易時段依 CME 最終公告調整。'},
  {type:'CME_EARLY',name:'CME 感恩節後提前結算',source:'CME Group 官方假期時程',time:isoCT(2026,10,27,12,0),pro:true,note:'Equity & Crypto 產品官方結算時間 12:00 CT；App 已換算台灣時間。'},
  {type:'CME_EARLY',name:'CME 聖誕夜提前結算',source:'CME Group 官方假期時程',time:isoCT(2026,11,24,12,0),pro:true,note:'Equity & Crypto 產品官方結算時間 12:00 CT；App 已換算台灣時間。'},
  {type:'CME_HOLIDAY',name:'CME 聖誕節休市／特殊時段',source:'CME Group 官方假期時程',time:isoET(2026,11,25,0,0),dateOnly:true,pro:true,note:'聖誕節；交易時段依 CME 最終公告調整。'}
];

export function getProEvents(){
  let extra=[];
  if(process.env.PRO_EVENTS_JSON){
    try{const parsed=JSON.parse(process.env.PRO_EVENTS_JSON);if(Array.isArray(parsed))extra=parsed.map(x=>({...x,pro:true}))}catch{}
  }
  return [...SPECIAL_2026,...HOLIDAYS_2026,...extra]
    .filter(x=>x?.name&&x?.time)
    .sort((a,b)=>String(a.time).localeCompare(String(b.time)));
}
