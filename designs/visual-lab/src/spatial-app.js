/* This layer is a visual experiment. It reuses the v1 demo state, never its production stack. */
const cinema={start:0,duration:5600,paused:false,pauseAt:0,frozen:0,camera:'orbit',explode:false,scrub:null};
let worlds=[];
let previousSceneKey='';
function cinemaProgress(){if(!view.projected)return 0;if(reduced())return 1;if(cinema.scrub!==null)return cinema.scrub;if(cinema.paused)return cinema.frozen;return Spatial.clamp((performance.now()-cinema.start)/cinema.duration)}
function worldMarkup(kind,labels='',extra=''){
 return `<div class="world world-${kind}" ${extra}><canvas data-world="${kind}" aria-label="Escena tridimensional ${kind==='genetic'?'de encuentro genético':kind==='market'?'del territorio':kind==='herd'?'de 293 animales':kind==='advisor'?'de diez establecimientos':kind==='plan'?'del plan de servicios':'de la planilla'}. Arrastrá para orbitar; doble clic restablece la vista." tabindex="0"></canvas><div class="world-grain"></div>${labels}<div class="world-fallback"><p>Vista conceptual</p><svg viewBox="0 0 320 230" aria-hidden="true">${bovine()}</svg></div><span class="world-hint">ARRASTRÁ PARA ORBITAR · DOBLE CLIC PARA VOLVER</span></div>`;
}
function anchored(id,content,cls=''){return `<div class="world-label ${cls}" data-anchor="${id}">${content}</div>`}
function cameraControls(){return `<div class="world-controls">${button(icon('offers'),'spatial-camera','','title="Cambiar cámara: orbital, cenital o frontal" aria-label="Cambiar cámara"')}${button(icon(cinema.paused?'arrow':'repeat'),'spatial-pause','','title="Pausar o reanudar movimiento" aria-label="Pausar o reanudar movimiento"')}${button(icon('genetics'),'spatial-explode','','title="Desarmar o reunir las facetas de la cría" aria-label="Desarmar o reunir las facetas de la cría"')}</div>`}
scene=function(){
 const b=DEMO.bulls[view.bull],a=DEMO.herd.find(a=>a.id===view.female);
 const labels=anchored('mother',`<span class="wl-over">El origen / tu rodeo</span><strong>${esc(a.name)} <span style="opacity:.6">#${a.id}</span></strong>`)+anchored('bull',`<span class="wl-over">El aporte / ${b.central}</span><strong>${b.name}</strong>`)+anchored('calf','<span class="wl-over">Una nueva posibilidad</span><strong class="serif">Próxima generación.</strong>','calf-label')+anchored('mother-data',`<span class="wl-tag">MADRE · ${a.a2||'SIN GENOTIPO'}</span>`,'ground-data')+anchored('bull-data',`<span class="wl-tag">TORO · ${b.a2}</span>`,'ground-data');
 return `<div class="encounter world world-genetic ${view.projected?'projected':''}"><div class="giant-type">futuros.</div><canvas data-world="genetic" aria-label="Vaca, toro y cría conceptual low poly en tres islas tridimensionales. Arrastrá para orbitar." tabindex="0"></canvas><div class="world-grain"></div><div class="world-corner">TORINDER <b>/</b> ATELIER GENÉTICO</div><div class="world-corner right">ESTUDIO ESPACIAL <b>01</b></div>${labels}${cameraControls()}<span class="concept-note">Representación conceptual. No predice sexo, pelaje, aspecto ni resultado reproductivo.</span><div class="world-fallback"><svg viewBox="0 0 320 230">${bovine()}</svg></div></div><div class="scene-underbar"><span class="scene-stage-label">LA SECUENCIA<span>↗</span></span><div class="scene-timeline"><label class="sr-only" for="scene-scrub">Recorrer la animación</label><input type="range" id="scene-scrub" min="0" max="100" value="${Math.round(cinemaProgress()*100)}" ${view.projected?'':'disabled'}><output id="scene-time">0.0</output></div><div class="scene-stage-words"><b data-phase="0">ORIGEN</b><b data-phase="1">CONEXIÓN</b><b data-phase="2">FUTURO</b></div></div>`;
};
map=function(found=false){return worldMarkup('market',`<div class="world-corner">TERRITORIO DE OPORTUNIDADES</div>${anchored('need','<span class="wl-over">El punto de partida</span><strong>Tu necesidad</strong>','pinlabel')}${found?DEMO.providers.map((p,i)=>anchored('provider-'+i,`<span class="wl-over">Conexión 0${i+1}</span><strong>${p.name.split(' · ')[0]}</strong>`,'pinlabel')).join(''):''}`,`data-found="${found}"`)};
const editorialHerdCanvas=herdCanvas;
herdCanvas=function(importing=false){const old=editorialHerdCanvas(importing),groups=old.match(/<div class="group-labels">[\s\S]*?<\/div>/)[0],svg=old.match(/<svg[\s\S]*?<\/svg>/)[0];return `<div class="herd-canvas spatial-herd">${groups}${worldMarkup('herd',anchored('selected',`#${view.female} · ${view.female==='084'?'Aurora':'Seleccionada'}`,'selected-label'),`data-imported="${importing&&view.animate}"`)}${svg}<p class="herd-note" id="selection-note">293 identidades · tres destinos productivos · tocá una marca para elegir.</p></div>`};
const editorialImport=importPage;
importPage=function(){return editorialImport().replace(/<div class="sheet-art">[\s\S]*?<\/div><div class="import-copy">/,worldMarkup('import',anchored('sheet','<span class="wl-over">El archivo es el punto de partida</span><strong>293 filas. Un rodeo.</strong>','pinlabel'))+'<div class="import-copy">')};
const editorialMarket=market;
market=function(){let html=editorialMarket();html=html.replace('El campo tiene<br><span class="serif">quién lo resuelva.</span>','Una necesidad.<br><span class="serif">Un mundo<br>de conexiones.</span>');if(view.marketStep===2&&view.intent==='genetics')html=html.replace(/<div class="sheet-art">[\s\S]*?<\/div><div class="import-copy">/,worldMarkup('import',anchored('sheet','<strong>De la intención al rodeo.</strong>','pinlabel'))+'<div class="import-copy">');return html};
const editorialMatching=matching;
matching=function(){return editorialMatching().replace('Cada cruce, <span class="serif">una intención.</span>','El futuro se <span class="serif">diseña.</span>').replace('Elegí con fundamentos qué querés aportar a la próxima generación.','Una vaca. Un aporte. Explorá lo que podría cambiar en la próxima generación.').replace('Primero una pregunta. Después, un cruce.','No mires una ficha. Explorá una posibilidad.').replace('La proyección pone en contexto el aporte de','La escena conecta el origen con el aporte de')};
const editorialPlan=plan;
plan=function(){let html=editorialPlan();if(data.plan.length){const start=html.indexOf('<section class="plan-sheet">');html=html.slice(0,start)+`<div class="plan-exhibit">${worldMarkup('plan',anchored('document','<span class="wl-over">De la idea a tus manos</span><strong class="serif">Un plan tangible.</strong>','pinlabel'))}`+html.slice(start)+'</div>'}return html};
const editorialAdvisor=advisor;
advisor=function(){let html=editorialAdvisor();const labels=DEMO.farms.map((f,i)=>anchored('farm-'+i,`<strong>${f.name.replace('Tambo ','')}</strong>`,'pinlabel')).join('');html=html.replace('<div class="advisor-table"',worldMarkup('advisor',labels)+'<div class="advisor-table"');return html.replace('Diez establecimientos.<br><span class="serif">Una mirada compartida.</span>','Diez mundos.<span class="serif"> Una perspectiva.</span>')};
const editorialControls=controls;
controls=function(){return editorialControls().replace('MOCKUP INTERACTIVO / v0.1','FUTUROS / ESTUDIO ESPACIAL v0.2').replace('Sobre el concepto','Dirección de arte')};
const editorialRunAction=runAction;
runAction=function(action,el){
 if(action==='spatial-camera'){cinema.camera=cinema.camera==='orbit'?'top':cinema.camera==='top'?'front':'orbit';toast('Cámara '+({orbit:'orbital',top:'cenital',front:'frontal'}[cinema.camera])+'. Arrastrá la escena para explorar.');return}
 if(action==='spatial-pause'){if(cinema.paused){cinema.start=performance.now()-cinema.frozen*cinema.duration;cinema.paused=false}else{cinema.frozen=cinemaProgress();cinema.paused=true}toast(cinema.paused?'Movimiento pausado.':'Movimiento reanudado.');return}
 if(action==='spatial-explode'){if(!view.projected){toast('Proyectá la cría para explorar sus facetas.');return}cinema.explode=!cinema.explode;return}
 if(action==='project'){cinema.start=performance.now();cinema.scrub=null;cinema.paused=false;cinema.explode=false}
 if(action==='concept'){modal('Futuros · una herramienta que se habita',`<span class="badge">Exploración espacial / v0.2</span><p><b>Una maqueta viva del agro.</b> Low poly, volúmenes suspendidos, luz por facetas y transiciones que convierten una idea en un objeto visible.</p><dl><dt>Torinder / Atelier genético</dt><dd>Dos islas se aproximan. Las conexiones recorren el espacio. La cría conceptual se ensambla por facetas mientras la cámara cambia de perspectiva. El control de secuencia permite recorrer el momento a mano.</dd><dt>Mercado / Un mundo de conexiones</dt><dd>Parcelas, construcciones, árboles y maquinaria modelados. La confirmación activa rutas sobre el territorio, con puntos que las recorren.</dd><dt>Rodeo / Paisaje de decisiones</dt><dd>293 volúmenes con identidad. Los cambios de criterio desplazan los animales entre tres parcelas mediante trayectorias elevadas.</dd><dt>Plan / Una idea tangible</dt><dd>Las asignaciones se convierten en hojas tridimensionales junto al documento operativo.</dd><dt>Asesor / Diez pequeños mundos</dt><dd>Diez maquetas de establecimientos se reordenan al cambiar el criterio de comparación.</dd></dl><p>Arrastrá las escenas para orbitar. En Torinder podés cambiar la cámara, pausar, recorrer la secuencia y desarmar las facetas de la cría.</p><p class="note">WebGL original, geometría procedural y datos ficticios. Todo es material para explorar el diseño, no una implementación final ni una simulación genética.</p>`);return}
 return editorialRunAction(action,el);
};
const editorialRender=render;
render=function(focus=false){for(const w of worlds)w.dispose();worlds=[];editorialRender(focus);document.title='AgroMatch · Futuros — Conceptos espaciales';$('.lab-stamp .eyebrow')&&( $('.lab-stamp .eyebrow').textContent='FUTUROS / ESTUDIO ESPACIAL');const stamp=$('.lab-stamp span');if(stamp)stamp.textContent='Un producto que se habita.';
 for(const canvas of document.querySelectorAll('canvas[data-world]')){
  const kind=canvas.dataset.world,key=[route,kind,view.importStep,view.marketStep,scope()].join('|');
  const intro=key!==previousSceneKey;previousSceneKey=key;
  const w=new Spatial.World(canvas,kind,{
   intro,reduced,paused:()=>cinema.paused,camera:()=>kind==='genetic'?cinema.camera:'orbit',
   progress:cinemaProgress,projected:()=>view.projected,explode:()=>cinema.explode,
   found:()=>canvas.parentElement.dataset.found==='true',imported:()=>canvas.parentElement.dataset.imported==='true',
   usual:()=>view.usual,selected:()=>view.female,query:()=>view.query,
   filter:()=>view.chat&&view.answer==='beef'?'beef':view.filter,count:()=>data.plan.length,
   order:()=>sortedFarms().map(f=>DEMO.farms.findIndex(x=>x.id===f.id)),
   onSelect:id=>{view.female=id;view.projected=false;refreshHerd();const label=canvas.parentElement.querySelector('[data-anchor="selected"]');if(label)label.textContent='#'+id+(id==='084'?' · Aurora':' · Seleccionada')},
   onFrame:kind==='genetic'?()=>{const p=cinemaProgress(),encounter=canvas.parentElement;encounter.classList.toggle('has-calf',view.projected&&p>.58);const range=$('#scene-scrub');if(range&&document.activeElement!==range)range.value=Math.round(p*100);const output=$('#scene-time');if(output)output.textContent=(p*5.6).toFixed(1);document.querySelectorAll('[data-phase]').forEach(el=>el.classList.toggle('active',Number(el.dataset.phase)===(p<.25?0:p<.68?1:2)))}:null
  });worlds.push(w)
 }
};
document.addEventListener('input',e=>{if(e.target.id==='scene-scrub'){cinema.scrub=Number(e.target.value)/100;cinema.paused=false}});
document.addEventListener('keydown',e=>{if(e.target.matches('canvas[data-world]')){const w=worlds.find(w=>w.canvas===e.target);if(!w)return;const keys={ArrowLeft:[-.10,0],ArrowRight:[.10,0],ArrowUp:[0,.08],ArrowDown:[0,-.08]};if(keys[e.key]){e.preventDefault();w.drag[0]+=keys[e.key][0];w.drag[1]+=keys[e.key][1]}else if(e.key==='Home'){e.preventDefault();w.drag=[0,0]}}});
window.addEventListener('pagehide',()=>worlds.forEach(w=>w.dispose()));
render();
