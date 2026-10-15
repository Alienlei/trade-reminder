import { getStore } from '@netlify/blobs';

const STORE='trade-reminder-shared';
const KEY='news/current';
const HOUR=60*60*1000;
const DAY=24*HOUR;

function dec(s=''){return s.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function tag(b,n){const m=b.match(new RegExp('<'+n+'[^>]*>([\\s\\S]*?)<\\/'+n+'>','i'));return m?dec(m[1].trim()):''}
function sourceName(b){const m=b.match(/<source[^>]*>([\s\S]*?)<\/source>/i);return m?dec(m[1].trim()):''}
function parseRSS(xml){const rows=[];for(const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)){const b=m[1],title=tag(b,'title'),url=tag(b,'link'),source=sourceName(b),published=tag(b,'pubDate');if(title&&url)rows.push({title,url,domain:source||'News',published})}return rows}
function canonical(s=''){return s.toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/g,'').slice(0,120)}
function sourceBoost(n=''){if(/Reuters/i.test(n))return 7;if(/Bloomberg|Financial Times|Wall Street Journal|CNBC|Associated Press|AP News/i.test(n))return 5;if(/MarketWatch|Barron|Yahoo Finance/i.test(n))return 3;return 1}
function keywordBoost(t=''){const s=t.toLowerCase(),k=[['federal reserve',7],['powell',7],['interest rate',6],['inflation',6],['cpi',6],['pce',6],['payroll',6],['jobs',4],['treasury yield',6],['nvidia',5],['nasdaq',5],['tariff',5],['china',3],['war',4],['oil',3],['apple',3],['microsoft',3],['amazon',3],['meta',3],['recession',4],['gdp',4],['earnings',3]];return k.reduce((n,[x,v])=>n+(s.includes(x)?v:0),0)}
function publishedMs(x){const t=Date.parse(x?.published||'');return Number.isFinite(t)?t:0}
function freshnessBoost(ms,now){const age=now-ms;if(age<=6*HOUR)return 9;if(age<=12*HOUR)return 7;if(age<=24*HOUR)return 5;if(age<=36*HOUR)return 2;return 0}

async function fetchCandidates(){
 const qs=['("Federal Reserve" OR Powell OR inflation OR CPI OR PCE OR payroll OR "Treasury yield" OR Nasdaq) when:2d','(Nvidia OR Apple OR Microsoft OR Amazon OR Meta OR "AI stocks" OR earnings) when:2d','(tariff OR China OR oil OR war OR recession OR GDP OR "global markets") when:2d'];
 const feeds=qs.map(q=>'https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=en-US&gl=US&ceid=US:en');
 feeds.push('https://www.cnbc.com/id/100003114/device/rss/rss.html');
 let rows=[];
 for(const u of feeds){try{const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0 TradeReminder/2.2.1'}});if(r.ok)rows.push(...parseRSS(await r.text()))}catch{}}
 const now=Date.now(),seen=new Set(),dedup=[];
 for(const a of rows){
   const k=canonical(a.title),ms=publishedMs(a);
   if(!k||seen.has(k)||!ms)continue;
   const age=now-ms;
   if(age<0||age>48*HOUR)continue;
   seen.add(k);
   dedup.push({...a,publishedAt:new Date(ms).toISOString(),ageHours:age/HOUR,score:sourceBoost(a.domain)+keywordBoost(a.title)+freshnessBoost(ms,now)});
 }
 const recent=dedup.filter(x=>x.ageHours<=24).sort((a,b)=>b.score-a.score||Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 const older=dedup.filter(x=>x.ageHours>24&&x.ageHours<=48).sort((a,b)=>b.score-a.score||Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 const pool=recent.length>=5?recent:[...recent,...older];
 return pool.slice(0,24);
}

async function callGeminiModel(model,candidates){
 const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('GEMINI_API_KEY missing');
 const compact=candidates.map((x,i)=>({id:i,title:x.title,source:x.domain,publishedAt:x.publishedAt,ageHours:+x.ageHours.toFixed(1)}));
 const prompt=`你是給台灣 MNQ/NQ 日內交易者使用的金融新聞編輯。從候選中選最重要的5條。\n規則：\n1. 只可選候選項目，不得新增新聞。\n2. 24小時內優先；只有不足5條時才可使用24-48小時內容；絕不可選超過48小時。\n3. 若同一事件有較新的報導，只選較新的。\n4. 不重複同一事件。\n5. 優先央行、通膨、就業、利率、美債、地緣政治、關稅、足以影響Nasdaq的大型科技消息。\n6. 不預測多空、不喊單。\n7. title_zh 使用自然精簡繁體中文；summary_zh 用一句繁中說明交易者為何需要知道，約25-55字。\n8. 只輸出JSON。\n格式：{"items":[{"id":0,"title_zh":"...","summary_zh":"..."}]}\n候選：${JSON.stringify(compact)}`;
 const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{method:'POST',headers:{'x-goog-api-key':key,'content-type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:1200,responseMimeType:'application/json'}})});
 if(!r.ok)throw new Error(model+' HTTP '+r.status);
 const data=await r.json();
 const raw=(data?.candidates?.[0]?.content?.parts||[]).map(x=>x.text||'').join('').trim();
 if(!raw)throw new Error(model+' empty response');
 const parsed=JSON.parse(raw);
 return Array.isArray(parsed.items)?parsed.items:[];
}
async function geminiSelect(candidates){for(const model of ['gemini-3.5-flash-lite','gemini-3.6-flash','gemini-3.5-flash']){try{const items=await callGeminiModel(model,candidates);if(items.length)return{items,model}}catch{}}throw new Error('AI_UNAVAILABLE')}

export async function readNews(){const store=getStore(STORE);return await store.get(KEY,{type:'json',consistency:'strong'}).catch(()=>null)}
export async function refreshNews(){
 const candidates=await fetchCandidates();
 if(!candidates.length)throw new Error('NO_CANDIDATES');
 let picked=[],model=null,ai=false;
 try{const res=await geminiSelect(candidates);model=res.model;ai=true;for(const x of res.items){const src=candidates[Number(x.id)];if(!src||!x.title_zh)continue;picked.push({title:String(x.title_zh).trim(),url:src.url,domain:src.domain,publishedAt:src.publishedAt,why:String(x.summary_zh||'').trim()});if(picked.length===5)break}}catch{}
 if(!picked.length)picked=candidates.slice(0,5).map(x=>({title:x.title,url:x.url,domain:x.domain,publishedAt:x.publishedAt,why:'AI 中文整理暫時不可用；此則為近期高重要度全球市場新聞。'}));
 const result={updatedAt:new Date().toISOString(),headlines:picked,ai,model};
 const store=getStore(STORE);await store.setJSON(KEY,result,{metadata:{updatedAt:result.updatedAt}});
 return result;
}
export function isFresh(payload,maxAgeMs=HOUR){const t=Date.parse(payload?.updatedAt||'');return Number.isFinite(t)&&Date.now()-t<maxAgeMs}
