const J=x=>new Response(JSON.stringify(x),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public,max-age=900'}});
const K=[['federal reserve',6,'Fed／利率訊號可能直接改變 Nasdaq 估值與市場風險偏好。'],['powell',6,'Powell 談話可能改變市場對利率路徑的定價。'],['interest rate',5,'利率預期變化通常會放大 Nasdaq 波動。'],['inflation',5,'通膨資訊會影響升降息預期。'],['cpi',5,'CPI 會直接影響 Fed 與利率預期。'],['pce',5,'PCE 是 Fed 關注的核心通膨指標。'],['payroll',5,'非農相關訊息通常是重大市場催化劑。'],['jobs',4,'就業資訊會影響 Fed 與利率預期。'],['nvidia',5,'NVIDIA 對 Nasdaq 與 AI 題材情緒影響大。'],['nasdaq',4,'Nasdaq 相關消息直接關聯 MNQ/NQ。'],['tariff',5,'關稅政策可能改變通膨與企業獲利預期。'],['treasury yield',5,'美債殖利率變動通常會直接影響科技股估值。'],['war',4,'地緣政治風險可能推升避險與市場波動。']];
function dec(s=''){return s.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function tag(b,n){const m=b.match(new RegExp('<'+n+'[^>]*>([\\\\s\\\\S]*?)<\\\\/'+n+'>','i'));return m?dec(m[1].trim()):''}
function src(b){const m=b.match(/<source[^>]*>([\s\S]*?)<\/source>/i);return m?dec(m[1].trim()):''}
function rank(a){const s=(a.title+' '+a.source).toLowerCase();let score=0,why='可能影響美股風險偏好。';for(const [k,p,w] of K)if(s.includes(k)){score+=p;if(p>=5)why=w}if(/reuters|bloomberg|wall street journal|financial times|cnbc|associated press|ap news|marketwatch/i.test(a.source))score+=2;return{score,why}}
export default async()=>{try{
 const q='("Federal Reserve" OR Powell OR inflation OR CPI OR PCE OR payroll OR jobs OR Nvidia OR Nasdaq OR tariff OR "Treasury yield") when:1d';
 const u='https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=en-US&gl=US&ceid=US:en';
 const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0 TradeReminder/2.0.1'}});if(!r.ok)throw Error('rss '+r.status);const x=await r.text(),rows=[];
 for(const m of x.matchAll(/<item>([\s\S]*?)<\/item>/gi)){const b=m[1],title=tag(b,'title'),url=tag(b,'link'),source=src(b),published=tag(b,'pubDate');if(!title||!url)continue;const rr=rank({title,source});if(rr.score<3)continue;rows.push({title,url,domain:source||'Google News',published,why:rr.why,score:rr.score})}
 const seen=new Set(),out=[];for(const a of rows.sort((a,b)=>b.score-a.score||String(b.published).localeCompare(String(a.published)))){const k=a.title.toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,90);if(seen.has(k))continue;seen.add(k);out.push(a);if(out.length===5)break}
 return J({updatedAt:new Date().toISOString(),headlines:out});
}catch(e){return J({updatedAt:new Date().toISOString(),headlines:[],error:String(e.message||e)})}}