const J=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public,max-age=3600,s-maxage=3600'}});
function dec(s=''){return s.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function tag(b,n){const m=b.match(new RegExp('<'+n+'[^>]*>([\\s\\S]*?)<\\/'+n+'>','i'));return m?dec(m[1].trim()):''}
function sourceName(b){const m=b.match(/<source[^>]*>([\s\S]*?)<\/source>/i);return m?dec(m[1].trim()):''}
function parseRSS(xml){const rows=[];for(const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)){const b=m[1],title=tag(b,'title'),url=tag(b,'link'),source=sourceName(b),published=tag(b,'pubDate');if(title&&url)rows.push({title,url,domain:source||'News',published})}return rows}
function canonical(s=''){return s.toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/g,'').slice(0,100)}
function sourceBoost(n=''){if(/Reuters/i.test(n))return 6;if(/Bloomberg|Financial Times|Wall Street Journal|CNBC|Associated Press|AP News/i.test(n))return 5;if(/MarketWatch|Barron|Yahoo Finance/i.test(n))return 3;return 1}
function keywordBoost(t=''){const s=t.toLowerCase(),k=[['federal reserve',6],['powell',6],['interest rate',5],['inflation',5],['cpi',5],['pce',5],['payroll',5],['jobs',4],['treasury yield',5],['nvidia',5],['nasdaq',4],['tariff',5],['china',3],['war',4],['oil',3],['apple',3],['microsoft',3],['amazon',3],['meta',3],['recession',4],['gdp',4],['earnings',3]];return k.reduce((n,[x,v])=>n+(s.includes(x)?v:0),0)}
async function fetchCandidates(){
 const qs=['("Federal Reserve" OR Powell OR inflation OR CPI OR PCE OR payroll OR "Treasury yield" OR Nasdaq) when:1d','(Nvidia OR Apple OR Microsoft OR Amazon OR Meta OR "AI stocks" OR earnings) when:1d','(tariff OR China OR oil OR war OR recession OR GDP OR "global markets") when:1d'];
 const feeds=qs.map(q=>'https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=en-US&gl=US&ceid=US:en');
 feeds.push('https://www.cnbc.com/id/100003114/device/rss/rss.html');
 let rows=[];for(const u of feeds){try{const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0 TradeReminder/2.0.7'}});if(r.ok)rows.push(...parseRSS(await r.text()))}catch{}}
 const seen=new Set(),dedup=[];for(const a of rows){const k=canonical(a.title);if(!k||seen.has(k))continue;seen.add(k);dedup.push({...a,score:sourceBoost(a.domain)+keywordBoost(a.title)})}
 return dedup.sort((a,b)=>b.score-a.score||String(b.published).localeCompare(String(a.published))).slice(0,18);
}
async function geminiSelect(candidates){
 const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('GEMINI_API_KEY missing');
 const compact=candidates.map((x,i)=>({id:i,title:x.title,source:x.domain,published:x.published}));
 const prompt=`你是給台灣 MNQ/NQ 日內交易者使用的金融新聞編輯。以下是最近約24小時的全球財經新聞候選。請依對美股、Nasdaq、利率、美元、美債、全球風險情緒的實際重要性挑最重要的5條。
規則：
1. 不重複同一事件。
2. 優先央行、通膨、就業、利率、美債、地緣政治、關稅，以及足以影響Nasdaq的大型科技公司消息。
3. 不預測多空，不喊單。
4. title_zh 必須是自然精簡的繁體中文標題。
5. summary_zh 用1句繁體中文說明為什麼交易者今天需要知道，約25～55字。
6. 只能從候選中選，回傳候選id。
7. 僅輸出JSON。
格式：{"items":[{"id":0,"title_zh":"...","summary_zh":"..."}]}
候選：${JSON.stringify(compact)}`;
 const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',{method:'POST',headers:{'x-goog-api-key':key,'content-type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.2,maxOutputTokens:1200,responseMimeType:'application/json'}})});
 if(!r.ok){const e=await r.text();throw new Error('Gemini '+r.status+' '+e.slice(0,180))}
 const data=await r.json(),raw=(data?.candidates?.[0]?.content?.parts||[]).map(x=>x.text||'').join('').trim(),parsed=JSON.parse(raw);
 return Array.isArray(parsed.items)?parsed.items:[];
}
export default async()=>{
 try{
  const candidates=await fetchCandidates();if(!candidates.length)return J({updatedAt:new Date().toISOString(),headlines:[],error:'no candidates'});
  try{
   const ai=await geminiSelect(candidates),picked=[];for(const x of ai){const src=candidates[Number(x.id)];if(!src||!x.title_zh)continue;picked.push({title:String(x.title_zh).trim(),url:src.url,domain:src.domain,published:src.published,why:String(x.summary_zh||'').trim()});if(picked.length===5)break}
   return J({updatedAt:new Date().toISOString(),headlines:picked,ai:true});
  }catch(e){
   const picked=candidates.slice(0,5).map(x=>({title:x.title,url:x.url,domain:x.domain,published:x.published,why:'AI 中文整理暫時不可用；此則為今日高重要度全球市場新聞。'}));
   return J({updatedAt:new Date().toISOString(),headlines:picked,ai:false,error:String(e.message||e)});
  }
 }catch(e){return J({updatedAt:new Date().toISOString(),headlines:[],error:String(e.message||e)})}
}