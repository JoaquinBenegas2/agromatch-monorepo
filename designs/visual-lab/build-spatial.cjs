// Rebuild the single offline review artifact; does not touch the application.
const fs=require('node:fs');const path=require('node:path');
const root=__dirname;
const base=fs.readFileSync(path.join(root,'editorial-v1.html'),'utf8');
const css=fs.readFileSync(path.join(root,'src/spatial.css'),'utf8');
const js=['world-engine.js','spatial-app.js'].map(f=>fs.readFileSync(path.join(root,'src',f),'utf8')).join('\n');
const output=base.replace('</head>',`<style>\n${css}\n</style>\n</head>`).replace('</body>',`<script>\n${js}\n</script>\n</body>`);
fs.writeFileSync(path.join(root,'index.html'),output);
console.log('Futuros: standalone HTML generated ('+Buffer.byteLength(output)+' bytes).');
