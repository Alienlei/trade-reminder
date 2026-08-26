const J=x=>new Response(JSON.stringify(x),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public,max-age=900'}});
const K=[
 ['federal reserve',7,'Fed／利率訊號可能直接改變 Nasdaq 估值與市場風險偏好。'],
 ['powell',7,'Powell 談話可能改變市場對利率路徑的定價。'],
 ['interest rate',6,'利率預期變化通常會放大 Nasdaq 波動。'],
 ['inflation',6,'通膨資訊會影響升降息預期。'],
 ['cpi',6,'CPI 會直接影響 Fed 與利率預期。'],
 ['pce',6,'PCE 是 Fed 關注的核心通膨指標。'],
 ['payroll',6,'非農相關訊息通常是重大市場催化劑。'],
 ['jobs',5,'就業資訊會影響 Fed 與利率預期。'],
 ['nvidia',6,'NVIDIA 對 Nasdaq 與 AI 題材情緒影響大。'],
 ['nasdaq',5,'Nasdaq 相關消息直接關聯 MNQ/NQ。'],
 ['tariff',6,'關稅政策可能改變通膨與企業獲利預期。'],
 ['treasury yield',6,'美債殖利率變動通常會直接影響科技股估值。'],
 ['war',5,'地緣政治風險可能推升避險與市場波動。'],
 ['apple',3,'大型科技股重大消息可能影響 Nasdaq。'],
 ['microsoft',3,'大型科技股重大消息可能影響 Nasdaq。'],
 ['meta',3,'大型科技股重大消息可能影響 Nasdaq。'],
 ['amazon',3,'大型科技股重大消息可能影響 Nasdaq。'],
 ['聯準會',7,'Fed／利率訊號可能直接改變 Nasdaq 估值與市場風險偏好。'],
 ['鮑爾',7,'Powell 談話可能改變市場對利率路徑的定價。'],
 ['通膨',6,'通膨資訊會影響升降息預期。'],
 ['非農',6,'非農相關訊息通常是重大市場催化劑。'],
 ['輝達',6,'NVIDIA 對 Nasdaq 與 AI 題材情緒影響大。'],
 ['關稅',6,'關稅政策可能改變通膨與企業獲利預期。'],
 ['美債殖利率',6,'美債殖利率變動通常會直接影響科技股估值。']
];
function dec(s=''){return s.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function tag(b,n){const m=b.match(new RegExp('<'+n+'[^>]*>([\\s\\S]*?)<\\/'+n+'>','i'));return m?dec(m[1].trim()):''}
function sourceName(b){const m=b.match(/<source[^>]*>([\s\S]*?)<\/source>/i);return m?dec(m[1].trim()):''}
function rank(a){
 const s=(a.title+' '+a.source).toLowerCase();let score=0,why='可能影響美股風險偏好。';
 for(const [k,p,w] of K){if(s.includes(k.toLowerCase())){score+=p;if(p>=6)why=w}}
 if(/reuters|bloomberg|wall street journal|financial times|cnbc|associated press|ap news|marketwatch|中央社|鉅亨|經濟日報|工商時報/i.test(a.source))score+=2;
 return{score,why}
}
function parseRSS(xml){
 const rows=[];
 for(const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)){
  const b=m[1],title=tag(b,'title'),url=tag(b,'link'),source=sourceName(b),published=tag(b,'pubDate');
  if(!title||!url)continue;
  const rr=rank({title,source});
  if(rr.score<3)continue;
  rows.push({title,url,domain:source||'News',published,why:rr.why,score:rr.score});
 }
 return rows;
}
function mostlyChinese(s=''){const zh=(s.match(/[\u3400-\u9fff]/g)||[]).length;return zh>=Math.max(4,s.length*0.12)}
async function translateTitle(title){
 if(mostlyChinese(title))return title;
 try{
  const u='https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&q='+encodeURIComponent(title);
  const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0 TradeReminder/2.0.3'}});
  if(!r.ok)return title;
  const j=await r.json();
  const t=(j?.[0]||[]).map(x=>x?.[0]||'').join('').trim();
  return t||title;
 }catch{return title}
}
export default async()=>{
 const qzh='(聯準會 OR 鮑爾 OR 通膨 OR CPI OR PCE OR 非農 OR 就業 OR 輝達 OR Nasdaq OR 關稅 OR 美債殖利率) when:1d';
 const qen='("Federal Reserve" OR Powell OR inflation OR CPI OR PCE OR payroll OR jobs OR Nvidia OR Nasdaq OR tariff OR "Treasury yield") when:1d';
 const feeds=[
  'https://news.google.com/rss/search?q='+encodeURIComponent(qzh)+'&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
  'https://news.google.com/rss/search?q='+encodeURIComponent(qen)+'&hl=en-US&gl=US&ceid=US:en',
  'https://www.cnbc.com/id/100003114/device/rss/rss.html'
 ];
 let rows=[];
 for(const u of feeds){
  try{
   const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0 TradeReminder/2.0.3'}});
   if(r.ok)rows.push(...parseRSS(await r.text()));
  }catch{}
 }
 const seen=new Set(),picked=[];
 for(const a of rows.sort((a,b)=>b.score-a.score||String(b.published).localeCompare(String(a.published)))){
  const k=a.title.toLowerCase().replace(/[^a-z0-9\u3400-\u9fff]+/g,'').slice(0,90);
  if(seen.has(k))continue;seen.add(k);picked.push(a);if(picked.length===5)break;
 }
 const headlines=[];
 for(const a of picked){
  headlines.push({...a,title:await translateTitle(a.title)});
 }
 return J({updatedAt:new Date().toISOString(),headlines});
}