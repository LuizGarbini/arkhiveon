const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const output=path.resolve("docs/previews/vtt-82-p2b"),campaignId="demo-tabletop";
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
function scene(id){return {id,campaign_id:campaignId,name:id==="scene-a"?"Cena A":"Cena B",map_image_url:null,grid_type:"square",grid_size:70,grid_color:"#ffffff",grid_opacity:.2,grid_scale_distance:1.5,grid_scale_unit:"m",grid_offset_x:0,grid_offset_y:0,map_scale:1,width:1000,height:1000,fog_enabled:false,fog_exploration:false,is_active:id==="scene-a",order_index:id==="scene-a"?0:1,created_at:"2026-11-06T23:00:00Z",updated_at:"2026-11-06T23:00:00Z"};}
async function geometry(button){return button.evaluate(button=>{
 const rect=button.getBoundingClientRect(),nodes=[];
 for(let node=button;node;node=node.parentElement){const r=node.getBoundingClientRect(),s=getComputedStyle(node);nodes.push({tag:node.tagName,rect:r.toJSON(),clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,scrollTop:node.scrollTop,overflowX:s.overflowX,overflowY:s.overflowY});}
 const clickable=[[.15,.15],[.85,.15],[.5,.5],[.15,.85],[.85,.85]].every(([x,y])=>button.contains(document.elementFromPoint(rect.left+rect.width*x,rect.top+rect.height*y)));
 return {rect:rect.toJSON(),nodes,clickable,documentOverflow:document.documentElement.scrollWidth>innerWidth};
});}
async function main(){
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true});const proof=[];
 try{for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const label=`${viewport.width}x${viewport.height}`,first=deferred(),retry=deferred(),retryReceived=deferred(),patches=[],rpcs=[],blocked=[];
  const rows=[scene("scene-a"),scene("scene-b")];
  const context=await browser.newContext({viewport,recordVideo:{dir:path.join(output,`raw-${label}`),size:viewport}});
  await context.routeWebSocket("**/realtime/v1/**",r=>r.close());
  await context.route("**/*",async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.pathname.includes("/rest/v1/")){
    const table=url.pathname.split("/").pop();let data=[];let status=200;
    if(table==="vtt_scenes"){
     if(req.method()==="PATCH"){
      const patch=req.postDataJSON();patches.push({patch,id:url.searchParams.get("id"),campaign:url.searchParams.get("campaign_id")});
      if(patches.length===1){await first.promise;status=403;data={code:"42501",message:"Preview: ajuste recusado"};}
      else if(patches.length===2){retryReceived.resolve();await retry.promise;Object.assign(rows[0],patch);data={id:"scene-a",updated_at:"2026-11-06T23:02:00Z"};}
      else{status=403;data={code:"42501",message:"Preview: névoa recusada"};}
     }else{
      const single=(req.headers().accept||"").includes("object"),id=url.searchParams.get("id");
      const filtered=id?rows.filter(r=>`eq.${r.id}`===id):rows;data=single?filtered[0]??null:filtered;
     }
    }
    if(table==="scale_scene_geometry"){
     const args=req.postDataJSON();rpcs.push(args);rows[0].map_scale=1.05;
     status=503;data={code:"PGRST999",message:"Preview: resposta perdida após escala"};
    }
    return route.fulfill({status,contentType:"application/json",body:JSON.stringify(data)});
   }
   if(url.hostname==="127.0.0.1"||url.protocol==="data:"||url.protocol==="blob:")return route.continue();
   blocked.push(url.origin);return route.abort();
  });
  await context.addInitScript(()=>{
   localStorage.setItem("arkhiveon_preview_auth","true");
   localStorage.setItem("rpg-notes-storage",JSON.stringify({state:{campaigns:[{id:"demo-tabletop",name:"P2b · ajustes por cena",ownerId:"preview-gm-user",myRole:"owner",system:"ordem"}],activeCampaignId:"demo-tabletop",hasLoadedCampaigns:true,campaignLoadStatus:"ready",characters:[],npcs:[]},version:0}));
  });
  const page=await context.newPage();page.setDefaultTimeout(15000);
  try{
   await page.goto(`${process.env.VTT_BASE_URL}/campaigns/${campaignId}/vtt`,{waitUntil:"domcontentloaded",timeout:90000});
   await page.waitForFunction(()=>window.__vtt_store__?.getState().activeSceneId==="scene-a");
   await page.evaluate(()=>{const s=window.__vtt_store__.getState();s.setIsGM(true);s.setShowGridSettings(true);s.setGridMoreOpen(true);});
   const panel=page.getByRole("region",{name:"Ajuste do grid"}),size=panel.getByLabel("Tamanho da célula (px)");
   assert.equal(await size.inputValue(),"70");
   const request=page.waitForRequest(r=>r.method()==="PATCH"&&new URL(r.url()).pathname.endsWith("/vtt_scenes"));
   await panel.getByRole("button",{name:"Aumentar célula",exact:true}).click();await request;
   await panel.getByRole("button",{name:"Aumentar célula",exact:true}).click();
   await panel.getByRole("button",{name:"Cor do grid #000000",exact:true}).click();
   assert.equal(await size.inputValue(),"72");assert.equal(patches.length,1,"one physical writer while A is pending");
   first.resolve();
   const retryButton=panel.getByRole("button",{name:"Tentar novamente",exact:true});await retryButton.waitFor();
   await retryButton.scrollIntoViewIfNeeded();await page.waitForTimeout(150);
   const gridError=await geometry(retryButton);assert.ok(gridError.clickable&&gridError.rect.height>=44,"grid retry is fully hit-testable and 44px");assert.equal(gridError.documentOverflow,false);
   await page.screenshot({path:path.join(output,`grid-error-${label}.png`)});
   assert.equal(await size.inputValue(),"72");
   await page.evaluate(()=>window.__vtt_store__.getState().setActiveSceneId("scene-b"));
   await page.waitForFunction(()=>document.querySelector('input[type="number"]')?.value==="70");
   assert.equal(await page.getByRole("alert").count(),0,"A's error must not appear on B");
   // Let the existing 150ms keyed-editor entry animation finish before recording B.
   await page.waitForTimeout(200);
   const gridOtherScene=await geometry(size);assert.ok(gridOtherScene.clickable,"B's 70px editor must actually be visible, not just mounted");
   await page.screenshot({path:path.join(output,`grid-other-scene-${label}.png`),animations:"disabled"});
   await page.evaluate(()=>window.__vtt_store__.getState().setActiveSceneId("scene-a"));
   await retryButton.waitFor();assert.equal(await size.inputValue(),"72");
   const retryReq=page.waitForRequest(r=>r.method()==="PATCH"&&new URL(r.url()).pathname.endsWith("/vtt_scenes"));
   await retryButton.click();await retryReq;await retryReceived.promise;assert.equal(patches.length,2);
   assert.deepEqual(patches[1].patch,{grid_size:72,grid_color:"#000000"});
   retry.resolve();await retryButton.waitFor({state:"hidden"});
   await panel.getByRole("button",{name:"Aumentar escala do mapa",exact:true}).click();
   const reconcile=panel.getByRole("button",{name:"Reconciliar",exact:true});await reconcile.waitFor();
   assert.equal(rpcs.length,1);assert.deepEqual(rpcs[0],{p_scene_id:"scene-a",p_factor:1.05});
   await reconcile.click();await reconcile.waitFor({state:"hidden"});
   assert.equal(rpcs.length,1,"read recovery must never repeat multiplication");
   const afterScale=await page.evaluate(()=>window.__vtt_store__.getState().scenes.find(s=>s.id==="scene-a"));assert.equal(afterScale.mapScale,1.05);assert.equal(afterScale.gridSize,72);
   await page.evaluate(()=>{const s=window.__vtt_store__.getState();s.setShowGridSettings(false);s.setShowFogControls(true);});
   await page.getByRole("button",{name:"Névoa Inativa",exact:true}).click();
   const fogRetry=page.getByRole("button",{name:"Tentar novamente",exact:true});await fogRetry.waitFor();await fogRetry.scrollIntoViewIfNeeded();
   const fogError=await geometry(fogRetry);assert.ok(fogError.clickable&&fogError.rect.height>=44,"fog retry is fully hit-testable and 44px");assert.equal(fogError.documentOverflow,false);
   await page.screenshot({path:path.join(output,`fog-error-${label}.png`)});
   proof.push({viewport,patches,rpcs,gridError,gridOtherScene,fogError,blockedExternalRequests:blocked,assertions:{latestIntent72:true,sceneIsolation:true,retryLatestDelta:true,reconcileReadNoRepeat:true,fogRefusal:true}});
   console.log(label,JSON.stringify({patches,rpcs,gridRetry:gridError.rect,fogRetry:fogError.rect,allAssertions:true}));
  }finally{first.resolve();retry.resolve();const video=page.video();await context.close();await video.saveAs(path.join(output,`p2b-${label}.webm`));}
 }}finally{fs.writeFileSync(path.join(output,"measures.json"),JSON.stringify(proof,null,2));await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
