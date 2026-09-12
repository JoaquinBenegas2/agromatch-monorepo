// An offline concept, deliberately independent from the production application.
const fs=require('node:fs'),path=require('node:path');
const root=__dirname,read=f=>fs.readFileSync(path.join(root,f),'utf8');
const base=read('editorial-v1.html').replace(/<style>[\s\S]*?<\/style>/g,'').replaceAll('agromatch-visual-v1:','savra-immersive-v3:').replaceAll('AgroMatch-plan','SAVRA-plan');
const css=read('src/savra.css');
const engine=read('src/world-engine.js').replace("color(this.kind==='genetic'?'#153d32':'#dce4d0')","color('#102732')")
 .replace("az+=this.drag[0]+(reduced?0:this.pointer[0]*.10)","az+=this.drag[0]+(reduced?0:this.pointer[0]*.10+Math.sin(t*.19)*.075)")
 .replace('distance=mix(13.0,12.5,ease(p))','distance=mix(15.2,14.7,ease(p))')
 .replace("const e=ease((performance.now()-this.orderStart)/1000)","const e=this.options.reduced?.()?1:ease((performance.now()-this.orderStart)/1000)")
 .replace("[0,age,0],[.7,.7,.7]","[0,this.options.reduced?.()?0:age,0],[.7,.7,.7]");
const out=base.replace(/<title>.*?<\/title>/,'<title>SAVRA — El campo en movimiento</title>').replace('</head>',`<style>${css}</style></head>`).replace('</body>',`<script>${engine}\n${read('src/savra-app.js')}</script></body>`);
fs.writeFileSync(path.join(root,'savra.html'),out);
console.log(`SAVRA: ${Buffer.byteLength(out)} bytes, offline standalone.`);
