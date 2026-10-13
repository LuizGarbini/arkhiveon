import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'node:fs';
const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.HelveticaBold);
const form = doc.getForm();
const labels=['Nome do personagem','Classe e nível','Raça','Antecedente','Alinhamento','Pontos de vida','Classe de armadura','Iniciativa'];
for (let p=0;p<3;p++){
 const page = doc.addPage([595,842]);
 page.drawText(`Ficha de teste — página ${p+1}`,{x:40,y:790,size:18,font,color:rgb(0.2,0.1,0.4)});
 labels.forEach((l,i)=>{ const y=740-i*60; page.drawText(l,{x:40,y:y+22,size:10,font});
  const f=form.createTextField(`p${p+1}.${l}`); f.addToPage(page,{x:40,y,width:320,height:20}); });
 ['Inspiração','Proficiente em Atletismo','Proficiente em Furtividade'].forEach((l,i)=>{const y=740-i*40; page.drawText(l,{x:400,y:y+22,size:9,font}); const c=form.createCheckBox(`p${p+1}.${l}`); c.addToPage(page,{x:400,y,width:16,height:16});});
}
fs.writeFileSync('/tmp/libpdfgen/ficha-teste.pdf', await doc.save());
