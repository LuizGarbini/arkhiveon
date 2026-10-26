import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { chromium } from "playwright";
const env = Object.fromEntries(readFileSync("/tmp/r3-local.env","utf8").trim().split("\n").map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1).replace(/^"|"$/g,"")];}));
const API = env.API_URL, ANON = env.ANON_KEY;
const APP = process.env.APP_URL || "http://127.0.0.1:3218";
const OUT = process.env.OUT; mkdirSync(OUT,{recursive:true});
const CAMP="a3000000-0000-0000-0000-000000000002", LYRA_CH="a3000000-0000-0000-0000-0000000000a1", BRAM_CH="a3000000-0000-0000-0000-0000000000b1", LYRA_TK="a3000000-0000-0000-0000-0000000000c1";
const PW="r3-local-Pass!1";
const results = {};
const log=(k,v)=>{results[k]=v;console.log(k, JSON.stringify(v));};
const psql=(q)=>execSync(`docker exec supabase_db_arkhiveon-b2b psql -U postgres -tAc "${q}"`).toString().trim();
const dbHp=(id)=>psql(`select (data->>'health')||'/'||(data->>'healthMax') from characters where id='${id}'`);
const resetHp=()=>{psql(`update characters set data=data||'{\\"health\\":33,\\"healthMax\\":38}' where id='${LYRA_CH}'`);psql(`update characters set data=data||'{\\"health\\":20,\\"healthMax\\":24}' where id='${BRAM_CH}'`);};
async function session(email){const r=await fetch(`${API}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:ANON,"content-type":"application/json"},body:JSON.stringify({email,password:PW})});const j=await r.json();if(!j.access_token)throw new Error("login "+email);return j;}
const browser = await chromium.launch();
async function open(email, vp){
  const s = await session(email);
  const ctx = await browser.newContext({viewport:vp});
  await ctx.addInitScript(([k,v])=>{try{localStorage.setItem(k,v);}catch{}},["sb-127-auth-token",JSON.stringify(s)]);
  const page = await ctx.newPage();
  page.on("pageerror",e=>console.log("pageerror",email,String(e).slice(0,200)));
  await page.goto(`${APP}/campaigns/${CAMP}/vtt`,{waitUntil:"domcontentloaded",timeout:120000});
  await page.waitForFunction(()=>window.__vtt_store__&&window.__rpg_store__,{timeout:60000});
  await page.waitForFunction((t)=>window.__vtt_store__.getState().tokens.some(x=>x.id===t),LYRA_TK,{timeout:60000});
  await page.locator("canvas").first().waitFor(); await page.waitForTimeout(1500);
  return {page, ctx, token:s.access_token};
}
const BRAM_TK="a3000000-0000-0000-0000-0000000000c2";
const panels=(p,menu,sheet,tk=LYRA_TK)=>p.evaluate(([m,s,t])=>{const st=window.__vtt_store__.getState();st.setActiveTokenIdForMenu(m?t:null);st.setShowCharacterSheetId(s?t:null);},[menu,sheet,tk]);
async function sideBySide(name, a, b, la, lb){
  const ia=(await a.screenshot()).toString("base64"), ib=(await b.screenshot()).toString("base64");
  const p=await browser.newPage({viewport:{width:1200,height:600}});
  await p.setContent(`<body style="margin:0;background:#111;color:#eee;font:14px sans-serif;display:flex;gap:8px;padding:8px;align-items:flex-start"><figure style="margin:0;flex:1"><figcaption>${la}</figcaption><img style="width:100%" src="data:image/png;base64,${ia}"></figure><figure style="margin:0;flex:1"><figcaption>${lb}</figcaption><img style="width:100%" src="data:image/png;base64,${ib}"></figure></body>`);
  await p.waitForTimeout(300); await p.screenshot({path:`${OUT}/${name}.png`,fullPage:true}); await p.close();
}
async function pixelCount(page, rgbList){
  const png=(await page.locator("canvas").first().screenshot()).toString("base64");
  const p=await browser.newPage();
  const r=await p.evaluate(async([d,list])=>{const img=new Image();img.src="data:image/png;base64,"+d;await img.decode();const c=document.createElement("canvas");c.width=img.width;c.height=img.height;const x=c.getContext("2d");x.drawImage(img,0,0);const px=x.getImageData(0,0,c.width,c.height).data;const out=list.map(()=>0);for(let i=0;i<px.length;i+=4){list.forEach((t,j)=>{if(Math.abs(px[i]-t[0])<=3&&Math.abs(px[i+1]-t[1])<=3&&Math.abs(px[i+2]-t[2])<=3)out[j]++;});}return out;},[png,rgbList]);
  await p.close(); return r;
}
const textRects=(p)=>p.evaluate(()=>{const root=document.querySelector('[role="dialog"]')||document.body;const m={};const seen={};for(const el of root.querySelectorAll("*")){if(el.closest('[data-testid="vtt-hp-saving"]'))continue;const t=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join("");if(!t)continue;const r=el.getBoundingClientRect();if(!r.height)continue;const k=t+"#"+(seen[t]=(seen[t]||0)+1);m[k]=r.top;}return m;});

const shot=async(page,name)=>{await page.waitForTimeout(400);await page.screenshot({path:`${OUT}/${name}.png`});};
const pair=async(base,gm,ana)=>{await shot(gm.page,`${base}-mestre`);await shot(ana.page,`${base}-ana`);};
const btnState=(p)=>p.evaluate(()=>{const bs=[...document.querySelectorAll("button")].filter(b=>["-5","-1","+1","+5","−5","−1"].includes(b.textContent.trim()));return bs.map(b=>({t:b.textContent.trim(),disabled:b.disabled||b.getAttribute("aria-disabled")==="true"}));});
const hpCount=(p,txt)=>p.evaluate((t)=>{const root=document.querySelector('[role="dialog"]')||document.body;let n=0;for(const el of root.querySelectorAll("*")){const s=[...el.childNodes].filter(x=>x.nodeType===3).map(x=>x.textContent).join("").trim();if(s.includes(t))n++;}const pv=[...root.querySelectorAll("*")].filter(el=>[...el.childNodes].some(x=>x.nodeType===3&&x.textContent.trim()==="Pontos de vida")).length;return {ocorrenciasValor:n,rotulosPontosDeVida:pv};},txt);
for (const [W,H] of [[1440,900],[390,844]]) {
  const sfx=`${W}x${H}`; resetHp();
  const gm=await open("r3-gm@arkhiveon.test",{width:W,height:H});
  const ana=await open("r3-ana@arkhiveon.test",{width:W,height:H});
  // P2.3 fluxo 1: token(mestre) -> ficha(Ana)
  await panels(gm.page,true,false); await panels(ana.page,false,true);
  await gm.page.getByText("33 / 38").first().waitFor({timeout:20000});
  await pair(`fluxo1-antes-${sfx}`,gm,ana);
  await gm.page.getByRole("button",{name:"-5"}).first().click();
  await gm.page.getByText("28 / 38").first().waitFor({timeout:15000});
  const t0=Date.now();
  await ana.page.waitForFunction((id)=>window.__rpg_store__.getState().characters.find(c=>c.id===id)?.health===28,LYRA_CH,{timeout:15000});
  log(`pv-ao-vivo-fluxo1-${sfx}`,{db:dbHp(LYRA_CH),anaRecebeuEmMs:Date.now()-t0,semReload:true});
  await gm.page.mouse.move(2,2); await pair(`fluxo1-depois-${sfx}`,gm,ana);
  // P2.3 fluxo 2: ficha(Ana) -> token(mestre)
  await pair(`fluxo2-antes-${sfx}`,gm,ana);
  await ana.page.getByRole("button",{name:"+1"}).first().click();
  const t1=Date.now();
  await gm.page.getByText("29 / 38").first().waitFor({timeout:15000});
  log(`pv-ao-vivo-fluxo2-${sfx}`,{db:dbHp(LYRA_CH),mestreRecebeuEmMs:Date.now()-t1,semReload:true});
  await ana.page.mouse.move(2,2); await pair(`fluxo2-depois-${sfx}`,gm,ana);
  // P1.1 ficha do mestre: PV uma vez só (+ largura total a 390)
  await panels(gm.page,false,true); await gm.page.getByText("Pontos de vida").first().waitFor({timeout:15000});
  const dlg=await gm.page.evaluate(()=>{const d=document.querySelector('[role="dialog"]');const r=d?d.getBoundingClientRect():null;return r?{left:r.left,width:r.width,viewport:innerWidth}:null;});
  log(`r2-pv-uma-vez-ficha-mestre-${sfx}`,{...(await hpCount(gm.page,"29")),ficha:dlg});
  await shot(gm.page,`r2-pv-uma-vez-ficha-mestre-${sfx}`);
  if(W===390) await shot(gm.page,`r2-ficha-mestre-largura-total-${sfx}`);
  // P1.1 botões travados na tela do mestre (gravação segurada)
  let release; const hold=new Promise(r=>release=r);
  await gm.page.route("**/rest/v1/rpc/set_character_hp",async(route)=>{await hold;await route.continue();});
  await gm.page.getByRole("button",{name:"-1"}).first().click();
  await gm.page.waitForTimeout(500);
  log(`r2-botoes-travados-mestre-${sfx}`,await btnState(gm.page));
  await shot(gm.page,`r2-botoes-travados-mestre-${sfx}`);
  release(); await gm.page.waitForTimeout(1200); await gm.page.unroute("**/rest/v1/rpc/set_character_hp");
  // P1.1 erro de rede
  await gm.page.route("**/rest/v1/rpc/set_character_hp",r=>r.abort("failed"));
  await gm.page.getByRole("button",{name:"-1"}).first().click();
  await gm.page.getByText("Não foi possível salvar os PV").first().waitFor({timeout:15000});
  log(`r2-erro-rede-${sfx}`,{toast:true,tentarDeNovo:await gm.page.getByText("Tentar de novo").count()>0,db:dbHp(LYRA_CH)});
  await shot(gm.page,`r2-erro-rede-${sfx}`);
  await gm.page.unroute("**/rest/v1/rpc/set_character_hp");
  // P2.6 Ana na ficha do Bram: sem controle de PV
  await panels(ana.page,false,true,BRAM_TK); await ana.page.waitForTimeout(1500);
  const ctrl=await btnState(ana.page);
  log(`p2-6-ana-ficha-bram-${sfx}`,{botoesPV:ctrl,inputsPV:await ana.page.locator('[role="dialog"] input[type="number"]').count(),nomeBram:await ana.page.getByText("Bram").count()>0});
  await shot(ana.page,`p2-6-ana-ficha-bram-sem-controle-${sfx}`);
  await gm.ctx.close(); await ana.ctx.close();
}
writeFileSync(`${OUT}/medidas.json`,JSON.stringify(results,null,2));
await browser.close();
