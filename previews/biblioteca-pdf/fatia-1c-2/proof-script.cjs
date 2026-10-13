const { chromium } = require(process.env.HOME+"/projects/arkhiveon/node_modules/playwright");
const fs=require("fs");
const CID="3e9555fc-085e-43dd-a063-bcd02847032d", FID="11111111-1111-4111-8111-111111111111";
const pdf=fs.readFileSync("/tmp/libpdfgen/ficha-teste.pdf");
const base="http://localhost:5191"; const step=process.argv[2]||"all";
const file={id:FID,campaign_id:CID,title:"Ficha de personagem (teste)",size_bytes:pdf.length,created_at:"2026-10-13T12:00:00Z"};
(async()=>{const b=await chromium.launch();
for(const [w,h] of (step==="probe"?[[1440,900]]:[[1440,900],[390,844]])){
 const ctx=await b.newContext({viewport:{width:w,height:h},acceptDownloads:true});
 let saved={"p1.Nome do personagem":"Elbereth"}; let slowSave=false; const log=[];
 await ctx.routeWebSocket("**/realtime/v1/**",r=>r.close());
 await ctx.route("**/auth/v1/**",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({id:"preview-gm-user"})}));
 await ctx.route("**/rest/v1/**",async r=>{const req=r.request();const u=req.url();const obj=(req.headers()["accept"]||"").includes("pgrst.object");
  const send=(d)=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(obj?(Array.isArray(d)?d[0]??null:d):(Array.isArray(d)?d:[d]))});
  if(u.includes("campaign_library_pilot"))return send([{campaign_id:CID}]);
  if(u.includes("campaign_library_form_values")){
   if(req.method()==="GET")return send([{field_values:saved}]);
   const body=JSON.parse(req.postData()||"{}"); log.push(Object.keys(body.field_values||{}).length);
   if(slowSave) await new Promise(res=>setTimeout(res,2500));
   saved=body.field_values; return r.fulfill({status:201,contentType:"application/json",body:"[]"});}
  if(u.includes("campaign_library_files"))return send(u.includes("id=eq")?[file]:[file]);
  return send([]);});
 await ctx.route("**/functions/v1/**",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({fileId:FID,url:"https://r2.mock/f.pdf",expiresIn:300})}));
 await ctx.route("https://r2.mock/**",r=>r.fulfill({status:200,contentType:"application/pdf",body:pdf,headers:{"access-control-allow-origin":"*"}}));
 await ctx.addInitScript(cid=>{localStorage.setItem("arkhiveon_preview_auth","true");
  localStorage.setItem("sb-mockref-auth-token",JSON.stringify({access_token:"preview",refresh_token:"preview",token_type:"bearer",expires_in:3600,expires_at:4102444800,user:{id:"preview-gm-user",aud:"authenticated",role:"authenticated"}}));
  localStorage.setItem("arkhiveon-storage",JSON.stringify({state:{campaigns:[{id:cid,name:"Rise of Tiamat",ownerId:"preview-gm-user",myRole:"owner"}],characters:[],hasLoadedCampaigns:true,campaignLoadStatus:"ready",activeCampaignId:cid},version:2}));},CID);
 const p=await ctx.newPage(); p.on("pageerror",e=>console.log("pageerror",e.message)); p.on("requestfailed",q=>console.log("reqfail",q.url().slice(0,120),q.failure()?.errorText)); p.on("response",q=>{if(q.url().includes("wasm")||q.status()>=400)console.log("resp",q.status(),q.url().slice(0,120))}); p.on("console",m=>{if(!m.text().includes("Realtime"))console.log("console:",m.type(),m.text().slice(0,300))});
 const S=(n)=>p.screenshot({path:process.env.HOME+`/projects/arkhiveon-lib2/docs/previews/lib2/${n}-${w}x${h}.png`});
 await p.goto(base+"/library"); await p.waitForTimeout(2500); await S("1-lista");
 await p.getByRole("link",{name:/Abrir Ficha/}).click(); await p.waitForTimeout(6000); await S("2-viewer");
 console.log(w,"url",p.url(),"inputs",await p.locator("input,textarea").count());
 if(step==="probe"){ await ctx.close(); continue; }
 slowSave=true;
 const inputs=p.locator('input[type="text"], input:not([type]), textarea');
 const n=await inputs.count(); console.log("text inputs",n);
 await inputs.nth(2).click(); await p.keyboard.type("Clériga 5",{delay:30});
 await inputs.nth(3).click(); await p.keyboard.type("Meio-elfa",{delay:30});
 await p.waitForTimeout(1100); await S("3-salvando");
 console.log("label saving:",await p.getByText("Salvando…").count());
 await p.waitForTimeout(4000); await S("4-salvo");
 console.log("label saved:",await p.getByText("✓ Salvo").count(),"saves",log, JSON.stringify(saved));
 slowSave=false;
 const dl=p.waitForEvent("download");
 await p.getByRole("button",{name:/Exportar PDF/}).click();
 await p.waitForTimeout(150); await S("5-exportando");
 const d=await dl; const out=`/tmp/lib2shots/export-${w}.pdf`; await d.saveAs(out); console.log("download",d.suggestedFilename());
 await ctx.close();}
await b.close();})();
