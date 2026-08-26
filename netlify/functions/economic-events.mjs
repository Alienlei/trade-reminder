const J=x=>new Response(JSON.stringify(x),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public,max-age=1800'}});
function nth(y,m,w,n){const f=new Date(Date.UTC(y,m,1)).getUTCDay();return 1+((w-f+7)%7)+7*(n-1)}
function off(y,m,d){const a=nth(y,2,0,2),b=nth(y,10,0,1);const dst=(m>2&&m<10)||(m===2&&d>=a)||(m===10&&d<b);return dst?-4:-5}
function isoNY(y,m,d,h,mi){return new Date(Date.UTC(y,m,d,h-off(y,m,d),mi)).toISOString()}
const BLS_FALLBACK=[
 {type:'JOLTS',name:'JOLTS 職缺報告',source:'BLS 官方排程',time:isoNY(2026,8,1,10,0)},
 {type:'NFP',name:'非農就業 NFP / 失業率',source:'BLS 官方排程',time:isoNY(2026,8,4,8,30)},
 {type:'PPI',name:'PPI 生產者物價指數',source:'BLS 官方排程',time:isoNY(2026,8,10,8,30)},
 {type:'CPI',name:'CPI 消費者物價指數',source:'BLS 官方排程',time:isoNY(2026,8,11,8,30)},
 {type:'JOLTS',name:'JOLTS 職缺報告',source:'BLS 官方排程',time:isoNY(2026,8,29,10,0)},
 {type:'NFP',name:'非農就業 NFP / 失業率',source:'BLS 官方排程',time:isoNY(2026,9,2,8,30)},
 {type:'CPI',name:'CPI 消費者物價指數',source:'BLS 官方排程',time:isoNY(2026,9,14,8,30)},
 {type:'PPI',name:'PPI 生產者物價指數',source:'BLS 官方排程',time:isoNY(2026,9,15,8,30)},
 {type:'JOLTS',name:'JOLTS 職缺報告',source:'BLS 官方排程',time:isoNY(2026,10,3,10,0)},
 {type:'NFP',name:'非農就業 NFP / 失業率',source:'BLS 官方排程',time:isoNY(2026,10,6,8,30)},
 {type:'CPI',name:'CPI 消費者物價指數',source:'BLS 官方排程',time:isoNY(2026,10,10,8,30)},
 {type:'PPI',name:'PPI 生產者物價指數',source:'BLS 官方排程',time:isoNY(2026,10,13,8,30)},
 {type:'JOLTS',name:'JOLTS 職缺報告',source:'BLS 官方排程',time:isoNY(2026,11,1,10,0)},
 {type:'NFP',name:'非農就業 NFP / 失業率',source:'BLS 官方排程',time:isoNY(2026,11,4,8,30)},
 {type:'CPI',name:'CPI 消費者物價指數',source:'BLS 官方排程',time:isoNY(2026,11,10,8,30)},
 {type:'PPI',name:'PPI 生產者物價指數',source:'BLS 官方排程',time:isoNY(2026,11,15,8,30)}
];
const MON={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
function clean(h){return h.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim()}
function parseBLS(html,type,name){
 const t=clean(html),out=[],re=/([A-Z][a-z]{2})\.\s+(\d{1,2}),\s+(20\d{2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/g;let m;
 while((m=re.exec(t))){let h=+m[4];if(m[6]==='PM'&&h!==12)h+=12;if(m[6]==='AM'&&h===12)h=0;out.push({type,name,source:'BLS',time:isoNY(+m[3],MON[m[1]],+m[2],h,+m[5])})}
 return out;
}
function fed(){
 const a={2026:[[8,16],[9,28],[11,9]],2027:[[0,27],[2,17],[3,28],[5,9],[6,28],[8,15],[9,27],[11,8]]},o=[];
 for(const y in a)for(const [m,d] of a[y]){
   o.push({type:'FOMC',name:'FOMC 利率決議',source:'Federal Reserve',time:isoNY(+y,m,d,14,0)});
   o.push({type:'FOMC',name:'FOMC 記者會',source:'Federal Reserve',time:isoNY(+y,m,d,14,30)});
 }
 return o;
}
function parseBEA(html){
 const t=clean(html),out=[],y=new Date().getUTCFullYear(),months={January:0,February:1,March:2,April:3,May:4,June:5,July:6,August:7,September:8,October:9,November:10,December:11};
 const re=/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)[\s\S]{0,220}?(Gross Domestic Product|Personal Income and Outlays|GDP)/gi;let m;
 while((m=re.exec(t))){let h=+m[3];if(m[5].toUpperCase()==='PM'&&h!==12)h+=12;if(m[5].toUpperCase()==='AM'&&h===12)h=0;const v=/Personal Income/i.test(m[6])?{type:'PCE',name:'PCE / 個人所得與支出'}:{type:'GDP',name:'GDP 國內生產毛額'};out.push({...v,source:'BEA',time:isoNY(y,months[m[1]],+m[2],h,+m[4])})}
 return out;
}
export default async()=>{
 let events=[...BLS_FALLBACK];
 const src=[
  ['https://www.bls.gov/schedule/news_release/cpi.htm','CPI','CPI 消費者物價指數'],
  ['https://www.bls.gov/schedule/news_release/ppi.htm','PPI','PPI 生產者物價指數'],
  ['https://www.bls.gov/schedule/news_release/empsit.htm','NFP','非農就業 NFP / 失業率'],
  ['https://www.bls.gov/schedule/news_release/jolts.htm','JOLTS','JOLTS 職缺報告']
 ];
 for(const [u,t,n] of src){try{const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0 TradeReminder/2.0.2'}});if(r.ok)events.push(...parseBLS(await r.text(),t,n))}catch{}}
 try{const r=await fetch('https://www.bea.gov/news/schedule',{headers:{'user-agent':'Mozilla/5.0 TradeReminder/2.0.2'}});if(r.ok)events.push(...parseBEA(await r.text()))}catch{}
 events.push(...fed());
 const seen=new Set();
 events=events.filter(e=>{const k=e.type+'|'+e.time;if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>a.time.localeCompare(b.time));
 return J({updatedAt:new Date().toISOString(),events});
}