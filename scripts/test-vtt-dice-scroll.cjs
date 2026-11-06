// Preview-only stress fixture. Never imported by product code.
const assert = require("node:assert/strict");
const path = require("node:path");

async function measure(button) {
 return button.evaluate(button => {
  const nodes=[];
  let clip={left:0,top:0,right:innerWidth,bottom:innerHeight};
  for(let node=button;node;node=node.parentElement) {
   const r=node.getBoundingClientRect(), css=getComputedStyle(node);
   nodes.push({tag:node.tagName,className:node.className,rect:r.toJSON(),
    clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,clientHeight:node.clientHeight,
    scrollHeight:node.scrollHeight,scrollTop:node.scrollTop,overflowX:css.overflowX,overflowY:css.overflowY});
   if(node!==button) {
    if(["auto","scroll","hidden","clip"].includes(css.overflowX)) {
     clip.left=Math.max(clip.left,r.left+node.clientLeft);clip.right=Math.min(clip.right,r.left+node.clientLeft+node.clientWidth);
    }
    if(["auto","scroll","hidden","clip"].includes(css.overflowY)) {
     clip.top=Math.max(clip.top,r.top+node.clientTop);clip.bottom=Math.min(clip.bottom,r.top+node.clientTop+node.clientHeight);
    }
   }
  }
  const rect=button.getBoundingClientRect();
  const full=rect.left>=clip.left&&rect.right<=clip.right&&rect.top>=clip.top&&rect.bottom<=clip.bottom;
  const clickable=[[.15,.15],[.85,.15],[.5,.5],[.15,.85],[.85,.85]].every(([x,y])=>button.contains(document.elementFromPoint(rect.left+rect.width*x,rect.top+rect.height*y)));
  return {nodes,clip,full,clickable,documentOverflow:document.documentElement.scrollWidth>innerWidth};
 });
}
module.exports = async ({page,panel,button,output,label,release,rpcCalls}) => {
 assert.equal(await panel.getByRole("list",{name:"Rolagens e mensagens"}).getByRole("listitem").count(),80,"80 mocked history entries loaded");
 // Repeat existing DS quick-die elements as synthetic preview content, not CSS overrides.
 // No dimensions, overflow, positioning or ancestors are changed by this fixture.
 const fixture=await panel.evaluate(panel=>{
  const seed=Array.from(panel.querySelectorAll("button")).find(b=>b.textContent.trim()==="d4");
  const row=seed.parentElement, original=Array.from(row.children);
  for(let i=0;i<56;i++) {
   const die=original[i%original.length].cloneNode(true);
   die.setAttribute("data-preview-excess-die",String(i+1));row.append(die);
  }
  return {historyEntries:80,originalDice:original.length,extraDice:56,totalDice:row.children.length,
   syntheticFixture:"80 REST-mocked history rows and 56 cloned existing DS quick-die chips; no layout/CSS overrides"};
 });
 const scroller=await button.evaluateHandle(button=>{
  for(let node=button.parentElement;node;node=node.parentElement) {
   if(["auto","scroll"].includes(getComputedStyle(node).overflowY)&&node.scrollHeight>node.clientHeight+1)return node;
  }
  throw new Error("No overflowing scroll ancestor: cannot certify scroll proof");
 });
 await scroller.evaluate(node=>{node.scrollTop=0;node.setAttribute("data-preview-scroll-proof","true");});
 await page.waitForTimeout(250);
 const before=await measure(button);
 const topScroller=await scroller.evaluate(node=>({tag:node.tagName,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,scrollTop:node.scrollTop,overflowY:getComputedStyle(node).overflowY,rect:node.getBoundingClientRect().toJSON()}));
 await page.screenshot({path:path.join(output,`scroll-top-${label}.png`)});
 assert.ok(topScroller.scrollHeight>topScroller.clientHeight,`${label}: real excess content`);
 assert.equal(topScroller.scrollTop,0,`${label}: capture at top`);
 assert.equal(before.full,false,`${label}: Rolar requires scroll at top`);
 await page.waitForTimeout(500);
 // Wheel is real browser input, not scrollIntoView's implicit actionability adjustment.
 const r=topScroller.rect;
 await page.mouse.move(Math.min(r.right-20,innerSafeWidth(label)),Math.max(r.top+30,Math.min(r.bottom-30,r.top+r.height/2)));
 await page.mouse.wheel(0,topScroller.scrollHeight);
 await page.waitForFunction(()=>{
  const n=document.querySelector('[data-preview-scroll-proof="true"]');
  return n.scrollTop>=n.scrollHeight-n.clientHeight-1;
 });
 await page.waitForTimeout(500);
 const after=await measure(button);
 const endScroller=await scroller.evaluate(node=>({tag:node.tagName,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,scrollTop:node.scrollTop,overflowY:getComputedStyle(node).overflowY,rect:node.getBoundingClientRect().toJSON()}));
 await page.screenshot({path:path.join(output,`scroll-end-${label}.png`)});
 assert.ok(after.full&&after.clickable,`${label}: full button and all five hit-test points exposed after wheel`);
 assert.equal(after.documentOverflow,false,`${label}: document must not overflow horizontally`);
 assert.ok(after.nodes.every(n=>n.scrollWidth<=n.clientWidth),`${label}: ancestor horizontal bounds`);
 const request=page.waitForRequest(r=>new URL(r.url()).pathname.endsWith("/rpc/roll_dice"));
 await button.click();await request;
 await panel.getByRole("button",{name:"Rolando…",exact:true}).waitFor();
 assert.ok(await panel.getByRole("button",{name:"Rolando…",exact:true}).isDisabled());
 await page.waitForTimeout(400);release();
 await panel.getByRole("button",{name:"Rolar",exact:true}).waitFor();
 await panel.getByText("14",{exact:true}).first().waitFor({state:"attached"});
 assert.equal(rpcCalls(),1,`${label}: click invokes exactly one mocked RPC`);
 console.log(label,JSON.stringify({fixture,top:topScroller,end:endScroller,buttonVisibleAfter:after.full,clickable:after.clickable,rpcCalls:rpcCalls()}));
 return {label,fixture,before:{scroller:topScroller,geometry:before},after:{scroller:endScroller,geometry:after},behavior:{actualClick:true,mockedRpcCalls:rpcCalls(),rollingDisabled:true}};
};
function innerSafeWidth(label){return Number(label.split("x")[0])-20;}
