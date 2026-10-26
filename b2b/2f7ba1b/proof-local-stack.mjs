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
const panels=(p,menu,sheet)=>p.evaluate(([m,s,t])=>{const st=window.__vtt_store__.getState();st.setActiveTokenIdForMenu(m?t:null);st.setShowCharacterSheetId(s?t:null);},[menu,sheet,LYRA_TK]);
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
for (const [W,H] of [[1440,900],[390,844]]) {
  const sfx=`${W}x${H}`; resetHp();
  const gm=await open("r3-gm@arkhiveon.test",{width:W,height:H});
  const ana=await open("r3-ana@arkhiveon.test",{width:W,height:H});
  // Fluxo 1: token -> ficha
  await panels(gm.page,true,false); await panels(ana.page,false,true);
  await gm.page.getByText("33 / 38").first().waitFor({timeout:20000});
  await sideBySide(`fluxo1-antes-${sfx}`,gm.page,ana.page,"Mestre: menu do token (33/38)","Jogadora Ana: ficha da Lyra");
  // P1 menu único
  const menuCounts=await gm.page.evaluate(()=>({minus5:[...document.querySelectorAll("button")].filter(b=>b.textContent.trim()==="-5"||b.textContent.trim()==="−5").length,dano:[...document.querySelectorAll("button")].filter(b=>b.textContent.trim()==="Dano").length,cura:[...document.querySelectorAll("button")].filter(b=>b.textContent.trim()==="Cura").length,valor:document.querySelectorAll('input[placeholder^="Valor"]').length}));
  log(`p1-menu-${sfx}`,menuCounts);
  await gm.page.screenshot({path:`${OUT}/p1-menu-unico-${sfx}.png`});
  await gm.page.getByRole("button",{name:"-5"}).first().click();
  await gm.page.getByText("28 / 38").first().waitFor({timeout:15000});
  await ana.page.waitForFunction((id)=>window.__rpg_store__.getState().characters.find(c=>c.id===id)?.health===28,LYRA_CH,{timeout:15000});
  await ana.page.waitForTimeout(800);
  log(`fluxo1-${sfx}`,{db:dbHp(LYRA_CH),ana:28});
  await sideBySide(`fluxo1-depois-${sfx}`,gm.page,ana.page,"Mestre clicou −5 no token: 28/38","Ana vê 28 na ficha sem recarregar");
  // Fluxo 2: ficha -> token
  await ana.page.getByRole("button",{name:"+1"}).first().click();
  await gm.page.getByText("29 / 38").first().waitFor({timeout:15000});
  log(`fluxo2-${sfx}`,{db:dbHp(LYRA_CH)});
  await sideBySide(`fluxo2-depois-${sfx}`,gm.page,ana.page,"Mestre vê 29/38 no token","Ana clicou +1 na própria ficha");
  // P1 cor da barra
  const primary=await gm.page.evaluate(()=>{const e=document.createElement("div");e.className="text-primary";document.body.appendChild(e);const c=getComputedStyle(e).color;e.remove();return c;});
  const toRgb=async(c)=>gm.page.evaluate((c)=>{const x=document.createElement("canvas").getContext("2d");x.fillStyle=c;x.fillRect(0,0,1,1);return [...x.getImageData(0,0,1,1).data].slice(0,3);},c);
  const prgb=await toRgb(primary);
  const counts=await pixelCount(gm.page,[prgb,[0x22,0xc5,0x5e],[0xf5,0x9e,0x0b],[0xef,0x44,0x44]]);
  log(`p1-cor-${sfx}`,{primaryComputado:primary,primaryRgb:prgb,pixelsPrimary:counts[0],pixelsVerdeAntigo:counts[1],pixelsAmbarAntigo:counts[2],pixelsVermelhoAntigo:counts[3]});
  await gm.page.locator("canvas").first().screenshot({path:`${OUT}/p1-barra-primary-${sfx}.png`});
  // P2 Salvando sem deslocar (ficha da Ana)
  let release; const hold=new Promise(r=>release=r);
  await ana.page.route("**/rest/v1/rpc/set_character_hp",async(route)=>{await hold;await route.continue();});
  const before=await textRects(ana.page);
  await ana.page.getByRole("button",{name:"-1"}).first().click();
  await ana.page.waitForFunction(()=>{const e=document.querySelector('[data-testid="vtt-hp-saving"]');return e&&getComputedStyle(e).opacity==="1";});
  const during=await textRects(ana.page);
  await ana.page.screenshot({path:`${OUT}/p2-salvando-${sfx}.png`});
  let maxDy=0,keys=0;for(const k of Object.keys(before))if(k in during){keys++;maxDy=Math.max(maxDy,Math.abs(during[k]-before[k]));}
  release(); await ana.page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-testid="vtt-hp-saving"]')).opacity==="0");
  await ana.page.unroute("**/rest/v1/rpc/set_character_hp");
  log(`p2-salvando-${sfx}`,{deslocamentoMaxPx:maxDy,elementosComparados:keys,db:dbHp(LYRA_CH)});
  // P2 botão após erro (rede) no mestre
  await gm.page.route("**/rest/v1/rpc/set_character_hp",r=>r.abort("failed"));
  const m5=gm.page.getByRole("button",{name:"-5"}).first();
  const sty=()=>gm.page.evaluate(()=>{const a=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="-5");const c=getComputedStyle(a);return {bg:c.backgroundColor,outline:c.outlineStyle+" "+c.outlineWidth,shadow:c.boxShadow,border:c.borderColor};});
  await gm.page.mouse.move(2,2); await gm.page.waitForTimeout(300); const antes=await sty();
  await m5.click(); await gm.page.getByText("Não foi possível salvar os PV").first().waitFor({timeout:15000});
  await gm.page.mouse.move(2,2); await gm.page.waitForTimeout(400);
  const depois=await sty(); log(`p2-menos5-antes-vs-depois-${sfx}`,{antes,depois,iguais:JSON.stringify(antes)===JSON.stringify(depois),hpNaTela:await gm.page.getByText("29 / 38").count()>0});
  const st=await gm.page.evaluate(()=>{const bs=[...document.querySelectorAll("button")];const f=(t)=>bs.find(b=>b.textContent.trim()===t);const a=f("-5"),b=f("-1");const s=(e)=>{const c=getComputedStyle(e);return {bg:c.backgroundColor,outline:c.outlineStyle+" "+c.outlineWidth,shadow:c.boxShadow,border:c.borderColor};};return {foco:document.activeElement===a,focusVisible:a.matches(":focus-visible"),menos5:s(a),menos1:s(b),iguais:JSON.stringify(s(a))===JSON.stringify(s(b))};});
  await gm.page.unroute("**/rest/v1/rpc/set_character_hp");
  log(`p2-botao-apos-erro-${sfx}`,st);
  await gm.page.screenshot({path:`${OUT}/p2-botao-apos-erro-${sfx}.png`});
  // P2 42501 pedido real da jogadora na ficha de outro
  const bramBefore=dbHp(BRAM_CH);
  const resP=ana.page.waitForResponse(r=>r.url().includes("/rpc/set_character_hp"));
  await ana.page.evaluate(async([api,anon,tok,id])=>{await fetch(`${api}/rest/v1/rpc/set_character_hp`,{method:"POST",headers:{apikey:anon,Authorization:`Bearer ${tok}`,"content-type":"application/json"},body:JSON.stringify({p_character_id:id,p_current:1})});},[API,ANON,ana.token,BRAM_CH]);
  const res=await resP; const body=await res.text();
  log(`p2-42501-${sfx}`,{status:res.status(),body:JSON.parse(body),bramAntes:bramBefore,bramDepois:dbHp(BRAM_CH)});
  writeFileSync(`${OUT}/42501-jogadora-${sfx}.json`,JSON.stringify({request:{url:res.url(),method:"POST",user:"Ana (viewer, dona da Lyra)",body:{p_character_id:BRAM_CH,"(ficha)":"Bram, do Bruno",p_current:1}},response:{status:res.status(),body:JSON.parse(body)}},null,2));
  await gm.ctx.close(); await ana.ctx.close();
}
writeFileSync(`${OUT}/medidas.json`,JSON.stringify(results,null,2));
await browser.close();
