import fs from 'node:fs';
const path='v221.html';
let s=fs.readFileSync(path,'utf8');
if(s.includes('data-v221-base-lock'))process.exit(0);
const marker="const saved=localStorage.getItem('tradeTheme')||'navy';";
if(!s.includes(marker))throw new Error('UI lock insertion point not found');
const insert=`document.body.dataset.v221BaseLock=base?'open':'locked';document.querySelectorAll('[data-tab]').forEach(btn=>{if(btn.dataset.tab!=='settingsPane')btn.disabled=!base});if(!base){document.querySelector('[data-tab="settingsPane"]')?.click()}const saved=localStorage.getItem('tradeTheme')||'navy';`;
s=s.replace(marker,insert).replace('<body><main>','<body data-v221-base-lock="boot"><main>');
fs.writeFileSync(path,s);
