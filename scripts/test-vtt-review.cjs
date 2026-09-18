const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {startPreviewRecorder}=require('./vtt-preview-recorder.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const output=path.resolve('docs/previews');fs.mkdirSync(output,{recursive:true});
 await context.routeWebSocket('**/realtime/v1/**',route=>route.close());
 const writes=[];
 await context.route('**/rest/v1/**',route=>{if(route.request().method()==='PATCH') writes.push(route.request().postDataJSON());return route.fulfill({status:200,contentType:'application/json',body:'[]'});});
 await context.addInitScript(()=>{
 localStorage.setItem('arkhiveon_preview_auth','true');localStorage.setItem('rpg-notes-storage',JSON.stringify({state:{campaigns:[{id:'demo-tabletop',name:'Mesa de revisão',ownerId:'preview-gm-user',myRole:'owner'}],characters:[],hasLoadedCampaigns:true,campaignLoadStatus:'ready',activeCampaignId:'demo-tabletop'},version:0}));
 });
 const page=await context.newPage();let recording;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto(process.env.VTT_BASE_URL+'/campaigns/demo-tabletop/vtt');await page.waitForFunction(()=>window.__vtt_store__);
 await page.waitForTimeout(1000);
 await page.evaluate(()=>{const s=window.__vtt_store__.getState();s.setIsGM(true);s.setScenes([{id:'scene',campaignId:'demo-tabletop',name:'Arena de testes',gridType:'square',gridSize:70,gridColor:'white',gridOpacity:0.2,gridScaleDistance:1.5,gridScaleUnit:'m',width:1600,height:1200,fogEnabled:false,fogExploration:false,isActive:true,orderIndex:0}]);s.setActiveSceneId('scene');});
 await page.locator('canvas').waitFor();await page.waitForTimeout(500);
 await page.evaluate(()=>{const s=window.__vtt_store__.getState();const a={id:'a',sceneId:'scene',characterId:'hero',name:'Sentinela A',x:300,y:300,layer:'token',sizeCells:1,rotation:0,elevation:0,conditions:[],auras:[],visionRange:6,isLocked:false,isHidden:false,controlledBy:[],hpCurrent:20,hpMax:20};s.setTokens([a,{...a,id:'b',name:'Sentinela B',x:600,hpCurrent:10}]);});
 recording=await startPreviewRecorder(page,path.join(output,'latest-preview.webm'),'PR 77 / Testes com respostas HTTP simuladas');
 await recording.chapter('Dois tokens compartilham a mesma ficha',2200);
 await page.evaluate(()=>window.__vtt_store__.getState().setActiveTokenIdForMenu('b'));
 await page.getByRole('button',{name:'Ficha',exact:true}).click();
 const saved = page.waitForResponse(r=>r.request().method()==='PATCH' && r.url().includes('/vtt_tokens'));
 await page.getByRole('button',{name:'-1',exact:true}).click();await saved;
 assert.equal(writes.at(-1).hp_current,9);
 assert.deepEqual(await page.evaluate(()=>window.__vtt_store__.getState().tokens.map(t=>t.hpCurrent)),[20,9]);
 await recording.chapter('Verificado: apenas B perde 1 PV; A continua com 20',2700);
 await page.getByRole('button',{name:'Rolar d20'}).click();
 await page.waitForTimeout(400);
 const diceCanvas=await page.locator('canvas').last().elementHandle();
 for(let i=0;i<8;i++){await page.evaluate(x=>window.__vtt_store__.getState().updateToken('a',{x}),300+i*4);await page.waitForTimeout(70);}
 assert.ok(await diceCanvas.evaluate(e=>e.isConnected),'Rolagem não deve destruir seu canvas durante movimento');
 await recording.chapter('A rolagem continua enquanto outro token se move',5000);
 await page.getByRole('button',{name:'Fechar ficha'}).click();
 await page.evaluate(()=>{const s=window.__vtt_store__.getState();s.updateToken('b',{x:1275,y:790});s.setActiveTokenIdForMenu('b');});
 await page.getByRole('button',{name:'Condições',exact:true}).click();
 await page.waitForTimeout(200);
 async function checkMenu(){for(const name of ['-1 PV','+1 PV','Condições','Girar 45°','Ficha','Travar','Fechar','Envenenado','Concentração','Excluir token']){const btn=page.getByRole('button',{name,exact:true});await btn.scrollIntoViewIfNeeded();const b=await btn.boundingBox();const size=page.viewportSize();assert.ok(b.width>=44&&b.height>=44,name+' precisa de 44px');assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=size.width&&b.y+b.height<=size.height,name+' fora da tela');}}
 await checkMenu();await recording.chapter('Menu radial e condições permanecem dentro da borda',2500);
 await page.screenshot({path:path.join(output,'latest-preview.png')});
 await recording.stop();recording=null;
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
 recording=await startPreviewRecorder(page,path.join(output,'vtt-mobile-preview.webm'),'Celular / Menu e alvos de toque');await checkMenu();await recording.chapter('Ações e condições acessíveis na tela estreita',2500);
 await page.getByRole('button',{name:'Fechar',exact:true}).click();
 await page.evaluate(()=>window.__vtt_store__.getState().setShowGridSettings(true));
 const input=page.getByRole('spinbutton',{name:'Escala'});assert.ok(await input.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));
 await input.fill('3');await page.getByRole('combobox',{name:'Unidade'}).selectOption('ft');
 await recording.chapter('Escala e unidade: rótulos associados e fonte de 16px',2500);
 await page.screenshot({path:path.join(output,'vtt-mobile.png')});await recording.stop();recording=null;
 assert.deepEqual(errors,[]);console.log('PASS: token correto, rolagem estável, menu nas bordas, toque e campos acessíveis');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
