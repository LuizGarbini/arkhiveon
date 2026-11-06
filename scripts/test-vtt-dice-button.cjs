const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const phase = process.env.VTT_DICE_PHASE || "after";
const output = path.resolve(process.env.VTT_DICE_OUTPUT || "docs/previews/vtt-dados-botao");
const campaignId = "demo-tabletop";
const scene = {
 id: "scene", campaignId, name: "Mesa · dados", gridType: "square", gridSize: 70,
 gridOpacity: 0.2, gridScaleDistance: 1.5, gridScaleUnit: "m", mapScale: 1,
 width: 1600, height: 1200, fogEnabled: false, fogExploration: false,
 isActive: true, orderIndex: 0,
};
const session = { id: "session", campaign_id: campaignId, started_at: "2026-11-06T23:00:00.000Z" };
const entry = { id: "roll-proof", campaign_id: campaignId, scene_id: scene.id,
 session_id: session.id, author_id: "preview-gm-user", character_id: null,
 kind: "roll", formula: "1d20", label: null, message: null, is_secret: false,
 created_at: "2026-11-06T23:01:00.000Z" };
const result = { roll_id: entry.id, total: 14,
 details: { formula: "1d20", count: 1, faces: 20, modifier: 0, rolls: [14] } };

async function main() {
 fs.mkdirSync(output, { recursive: true });
 const browser = await chromium.launch({ headless: true });
 const measures = { phase, viewports: [] };
 const failures = [];
 try {
  for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
   const label = `${viewport.width}x${viewport.height}`;
   const context = await browser.newContext({ viewport,
    recordVideo: { dir: path.join(output, `${phase}-video-${label}`), size: viewport } });
   let rolled = false;
   let rpcCalls = 0;
   let release;
   const pending = new Promise(resolve => { release = resolve; });
   const external = [];
   await context.routeWebSocket("**/realtime/v1/**", route => route.close());
   await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/rest/v1/")) {
     const table = url.pathname.split("/").pop();
     const single = (route.request().headers().accept || "").includes("object");
     let data = [];
     if (table === "campaigns") data = single ? {current_feed_session_id:session.id} : [];
     if (table === "vtt_feed_sessions") data = [session];
     if (table === "vtt_rolls") data = rolled ? (single ? entry : [entry]) : (single ? null : []);
     if (table === "vtt_roll_results") data = rolled ? (single ? result : [result]) : [];
     if (table === "roll_dice") {
      rpcCalls += 1;
      await pending;
      rolled = true;
      data = {id:entry.id,total:14,formula:"1d20",is_secret:false};
     }
     return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(data)});
    }
    if (url.hostname === "127.0.0.1" || url.protocol === "data:" || url.protocol === "blob:") return route.continue();
    external.push(url.origin);
    return route.abort();
   });
   await context.addInitScript(() => {
    localStorage.setItem("arkhiveon_preview_auth", "true");
    localStorage.setItem("rpg-notes-storage", JSON.stringify({state:{
     campaigns:[{id:"demo-tabletop",name:"Mesa · dados",ownerId:"preview-gm-user",myRole:"owner",system:"ordem"}],
     activeCampaignId:"demo-tabletop",hasLoadedCampaigns:true,campaignLoadStatus:"ready",characters:[],npcs:[],
    },version:0}));
   });
   const page = await context.newPage();
   try {
    await page.goto(`${process.env.VTT_BASE_URL}/campaigns/${campaignId}/vtt`, {waitUntil:"domcontentloaded",timeout:90000});
    await page.waitForFunction(() => window.__vtt_store__, {timeout:30000});
    // Match the existing preview harness: let initial mocked route loading finish before injecting the fixture.
    await page.waitForTimeout(1000);
    await page.evaluate(scene => {
     const store = window.__vtt_store__.getState();
     store.setIsGM(true); store.setScenes([scene]); store.setActiveSceneId(scene.id);
    }, scene);
    await page.getByRole("button",{name:"Rolagens e chat",exact:true}).click();
    const panel = page.getByTestId("feed-panel");
    await panel.getByLabel("Fórmula",{exact:true}).fill("1d20");
    await page.waitForTimeout(300);
    const button = panel.getByRole("button",{name:"Rolar",exact:true});
    const geometry = await button.evaluate(button => {
     const viewport = {width:innerWidth,height:innerHeight};
     const nodes = [];
     let visible = {left:0,top:0,right:innerWidth,bottom:innerHeight};
     for (let node = button; node; node=node.parentElement) {
      const rect = node.getBoundingClientRect(); const css = getComputedStyle(node);
      nodes.push({tag:node.tagName,className:node.className,rect:rect.toJSON(),
       clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,clientHeight:node.clientHeight,
       scrollHeight:node.scrollHeight,overflow:css.overflow,overflowX:css.overflowX,overflowY:css.overflowY,
       padding:css.padding,width:css.width,height:css.height,minHeight:css.minHeight,
       maxHeight:css.maxHeight,flexShrink:css.flexShrink,scrollTop:node.scrollTop});
      if (node !== button) {
       if (["hidden","clip","scroll","auto"].includes(css.overflowX)) {
        visible.left=Math.max(visible.left,rect.left+node.clientLeft);
        visible.right=Math.min(visible.right,rect.left+node.clientLeft+node.clientWidth);
       }
       if (["hidden","clip","scroll","auto"].includes(css.overflowY)) {
        visible.top=Math.max(visible.top,rect.top+node.clientTop);
        visible.bottom=Math.min(visible.bottom,rect.top+node.clientTop+node.clientHeight);
       }
      }
     }
     const rect=button.getBoundingClientRect();
     const full=rect.left>=visible.left && rect.right<=visible.right && rect.top>=visible.top && rect.bottom<=visible.bottom;
     const points=[[.15,.15],[.85,.15],[.5,.5],[.15,.85],[.85,.85]];
     const clickable=points.every(([x,y])=>button.contains(document.elementFromPoint(rect.left+rect.width*x,rect.top+rect.height*y)));
     return {viewport,nodes,visible,full,clickable,documentOverflow:document.documentElement.scrollWidth>innerWidth};
    });
    await page.screenshot({path:path.join(output,`${phase}-${label}.png`)});
    measures.viewports.push({label,geometry,externalRequestsBlocked:external});
    console.log(label, JSON.stringify({button:geometry.nodes[0].rect,full:geometry.full,clickable:geometry.clickable,
     clippingContainers:geometry.nodes.slice(1).filter(n=>["hidden","auto","scroll"].includes(n.overflowY)).map(n=>({tag:n.tag,height:n.clientHeight,scrollHeight:n.scrollHeight,overflowY:n.overflowY}))}));
    if (!geometry.full || !geometry.clickable) failures.push(`${label}: roll button clipped or covered`);
    if (phase === "after") {
     assert.ok(geometry.full, `${label}: full button must be visible`);
     assert.ok(geometry.clickable,`${label}: all button corners must be clickable`);
     assert.equal(geometry.documentOverflow,false,`${label}: no horizontal document overflow`);
     assert.ok(geometry.nodes[0].rect.height>=44,`${label}: DS touch target`);
     await button.focus(); assert.equal(await button.evaluate(e=>e===document.activeElement),true);
     const formulaInput = panel.getByLabel("Fórmula", {exact:true});
     await formulaInput.focus();
     const request = page.waitForRequest(request => new URL(request.url()).pathname.endsWith("/rpc/roll_dice"));
     await page.keyboard.press("Enter");
     await request;
     await panel.getByRole("button",{name:"Rolando…",exact:true}).waitFor();
     assert.equal(await panel.getByRole("button",{name:"Rolando…",exact:true}).isDisabled(),true);
     release();
     await panel.getByText("14",{exact:true}).waitFor();
     await panel.getByRole("button",{name:"Rolar",exact:true}).waitFor();
     assert.equal(rpcCalls,1,`${label}: one intercepted RPC`);
     // Enter submits without stealing the formula input's focus during the pending/result updates.
     assert.equal(await formulaInput.evaluate(e=>e===document.activeElement),true,`${label}: preserve formula focus after rolling`);
     await page.screenshot({path:path.join(output,`${phase}-result-${label}.png`)});
     measures.viewports.at(-1).behavior={rpcCalls,rolling:true,result:14,keyboardAndInputFocus:true};
    }
   } finally {
    release();
    const video=page.video(); await context.close();
    await video.saveAs(path.join(output,`${phase}-${label}.webm`));
   }
  }
 } finally {
  fs.writeFileSync(path.join(output,`${phase}-measures.json`),JSON.stringify(measures,null,2));
  await browser.close();
 }
 assert.deepEqual(failures,[],`Dice button geometry regressions: ${failures.join("; ")}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
