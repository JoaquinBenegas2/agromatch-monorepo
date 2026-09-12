// @ts-nocheck
/* AgroMatch spatial studies — ported verbatim from designs/visual-lab/src/world-engine.js.
   Untyped on purpose: it's a self-contained WebGL renderer with no dependency
   on app state; SpatialScene.tsx is the typed boundary around it. */
const Spatial = (() => {
  const PI=Math.PI, clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
  const out=t=>1-Math.pow(1-clamp(t),3);
  const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
  const V={add:(a,b)=>a.map((x,i)=>x+b[i]),sub:(a,b)=>a.map((x,i)=>x-b[i]),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l)},dot:(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0)};
  const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  function mul(a,b){const c=Array(16).fill(0);for(let i=0;i<4;i++)for(let j=0;j<4;j++)for(let k=0;k<4;k++)c[i*4+j]+=a[k*4+j]*b[i*4+k];return c}
  function transform(p=[0,0,0],r=[0,0,0],s=[1,1,1]){const [x,y,z]=r,cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);const rx=[1,0,0,0,0,cx,sx,0,0,-sx,cx,0,0,0,0,1],ry=[cy,0,-sy,0,0,1,0,0,sy,0,cy,0,0,0,0,1],rz=[cz,sz,0,0,-sz,cz,0,0,0,0,1,0,0,0,0,1];let m=mul(mul(rz,ry),rx);for(let i=0;i<3;i++)for(let j=0;j<3;j++)m[i*4+j]*=s[i];m[12]=p[0];m[13]=p[1];m[14]=p[2];return m}
  function perspective(fov,aspect,near=.1,far=100){const f=1/Math.tan(fov/2),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]}
  function lookAt(eye,target){const z=V.norm(V.sub(eye,target)),x=V.norm(V.cross([0,1,0],z)),y=V.cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1]}
  function color(hex){if(Array.isArray(hex))return hex;return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)}
  function tint(c,k){return color(c).map(v=>clamp(v*k))}
  const C={cream:'#e9edcc',white:'#f9f6e9',ink:'#183f34',black:'#253a32',green:'#507d51',lime:'#d2f574',clay:'#cd8262',soil:'#203e31',earth:'#9d8c61',pink:'#d3a497',sage:'#9cae7a',teal:'#6faaa0'};
  class Geometry {
    constructor(){this.data=[];this.count=0;this.buffers=new WeakMap()}
    tri(a,b,c,co,scatter=0){const normal=V.norm(V.cross(V.sub(b,a),V.sub(c,a))),col=color(co);const seed=this.count+scatter*181;const displacement=[(hash(seed+2)-.5)*3,1+hash(seed+7)*3,(hash(seed+13)-.5)*3];for(const p of [a,b,c])this.data.push(...p,...normal,...col,...displacement);this.count+=3;return this}
    quad(a,b,c,d,col){this.tri(a,b,c,col);this.tri(a,c,d,col);return this}
    append(geo,m=identity(),baseColor=null){for(let i=0;i<geo.data.length;i+=36){const points=[];for(let k=0;k<3;k++){const p=geo.data.slice(i+k*12,i+k*12+3);points.push([m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]])}this.tri(...points,baseColor||geo.data.slice(i+6,i+9))}return this}
    upload(gl){let b=this.buffers.get(gl);if(!b){b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(this.data),gl.STATIC_DRAW);this.buffers.set(gl,b)}return b}
  }
  function box(w,h,d,col){const g=new Geometry(),x=w/2,y=h/2,z=d/2;const p=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];for(const q of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])g.quad(...q.map(i=>p[i]),col);return g}
  function cylinder(r1,r2,h,col,segments=10){const g=new Geometry();for(let i=0;i<segments;i++){const a=i/segments*PI*2,b=(i+1)/segments*PI*2,p=[Math.cos(a)*r1,-h/2,Math.sin(a)*r1],q=[Math.cos(b)*r1,-h/2,Math.sin(b)*r1],r=[Math.cos(b)*r2,h/2,Math.sin(b)*r2],s=[Math.cos(a)*r2,h/2,Math.sin(a)*r2];g.quad(p,s,r,q,tint(col,.94+.1*hash(i)));g.tri([0,h/2,0],r,s,col);g.tri([0,-h/2,0],p,q,tint(col,.7))}return g}
  function ellipsoid(rx,ry,rz,col,segments=10,rings=6,patch=false){const g=new Geometry();const point=(a,b)=>[rx*Math.sin(b)*Math.cos(a),ry*Math.cos(b),rz*Math.sin(b)*Math.sin(a)];for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=i/segments*PI*2,b=(i+1)/segments*PI*2,u=j/rings*PI,v=(j+1)/rings*PI;const p=point(a,u),q=point(a,v),r=point(b,v),s=point(b,u);let co=tint(col,.93+.12*hash(i+j*13));const center=p.map((x,k)=>(x+q[k]+r[k]+s[k])/4);if(patch&&Math.sin(center[0]*3.2+center[2]*2.3)+Math.cos(center[1]*4.7+center[0]*2)> .45)co=tint(C.black,.94+.08*hash(i+j));g.tri(p,r,q,co);g.tri(p,s,r,co)}return g}
  function segment(a,b,r1,r2,col,n=7){const mid=a.map((v,i)=>(v+b[i])/2),axis=V.norm(V.sub(b,a)),h=Math.hypot(...V.sub(b,a));const ref=Math.abs(axis[1])>.9?[1,0,0]:[0,1,0],x=V.norm(V.cross(ref,axis)),z=V.cross(x,axis);const m=[...x,0,...axis,0,...z,0,...mid,1];return new Geometry().append(cylinder(r1,r2,h,col,n),m)}
  function ribbon(points,width,col){const g=new Geometry();for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];const n=V.norm(V.cross(V.sub(b,a),[0,1,0])).map(v=>v*width);g.quad(V.add(a,n),V.sub(a,n),V.sub(b,n),V.add(b,n),col)}return g}
  function curve(a,b,arch=2,n=35){return Array.from({length:n},(_,i)=>{const t=i/(n-1);return [mix(a[0],b[0],t),mix(a[1],b[1],t)+Math.sin(t*PI)*arch,mix(a[2],b[2],t)+Math.sin(t*PI)*.5]})}
  function cow(kind='cow'){
    const g=new Geometry(),bull=kind==='bull',calf=kind==='calf',coat=bull?'#b8ba9c':C.white;
    const add=(geo,p,r,s)=>g.append(geo,transform(p,r,s));
    add(ellipsoid(bull?1.65:1.54,bull?.82:.67,bull?.7:.58,coat,13,8,true),[0,1.86,0]);
    add(ellipsoid(.66,bull?.93:.73,bull?.64:.47,coat,9,7,true),[1.03,1.97,0],[0,0,-.25]);
    add(ellipsoid(.56,.42,.33,coat,10,7,true),[1.77,2.10,0],[0,0,-.35]);
    add(ellipsoid(.50,.23,.29,coat,9,5),[2.10,1.86,0],[0,0,-.26]);
    add(ellipsoid(.19,.18,.29,bull?'#566354':C.pink,8,5),[2.43,1.78,0]);
    for(const side of [-1,1]){
      add(ellipsoid(.21,.055,.27,coat,6,4),[1.6,2.39,side*.40],[side*.35,.25,side*.3]);
      add(ellipsoid(.13,.031,.19,C.pink,6,3),[1.61,2.423,side*.42],[side*.35,.25,side*.3]);
      add(ellipsoid(.055,.052,.024,C.black,7,4),[1.99,2.19,side*.30]);
      add(ellipsoid(.018,.018,.013,C.white,5,3),[2,2.207,side*.319]);
      if(!calf){g.append(segment([1.46,2.42,side*.26],[1.45,2.68,side*.44],.105,.065,C.cream));g.append(segment([1.45,2.68,side*.44],[1.61,2.86,side*.48],.065,.006,C.cream))}
      for(const back of [-1,1]){
        const x=back===-1?-1.04:1.02,z=side*(bull?.47:.39);const knee=[x+(back===-1?-.12:.07),.69,z];
        g.append(segment([x,1.67,z],knee,back===-1?.25:.18,.095,coat));
        g.append(segment(knee,[x+(back===-1?-.03:.10),.16,z+.01],.085,.063,C.cream));
        add(box(.25,.17,.22,C.black),[x+(back===-1?.015:.14),.09,z+.015]);
      }
    }
    if(!bull&&!calf){add(ellipsoid(.37,.25,.34,C.pink,8,5),[-.80,1.12,0]);for(const x of [-.98,-.66])for(const z of [-.17,.17])add(cylinder(.035,.045,.13,C.pink,5),[x,.87,z])}
    const tail=[[-1.48,2.18,0],[-1.69,1.97,.04],[-1.80,1.30,.12],[-1.92,.85,.18]];for(let i=0;i<3;i++)g.append(segment(tail[i],tail[i+1],.035,.025,coat,5));add(ellipsoid(.07,.17,.07,C.black,6,4),tail[3]);
    if(bull)add(ellipsoid(.61,.25,.57,coat,9,5),[.60,2.52,0]);
    return g;
  }
  function tree(){return new Geometry().append(cylinder(.04,.03,.45,C.earth,5),transform([0,.23,0])).append(ellipsoid(.27,.44,.25,C.green,5,4),transform([0,.65,0])).append(ellipsoid(.22,.30,.20,C.sage,5,3),transform([.04,.99,0]))}
  function barn(){const g=new Geometry().append(box(1.3,.65,.95,C.cream),transform([0,.325,0]));const roof=new Geometry();roof.quad([-.78,.62,-.57],[.78,.62,-.57],[.78,1,0],[-.78,1,0],C.clay);roof.quad([-.78,1,0],[.78,1,0],[.78,.62,.57],[-.78,.62,.57],tint(C.clay,.85));roof.tri([-.65,.65,-.47],[-.65,1,0],[-.65,.65,.47],C.cream);roof.tri([.65,.65,.47],[.65,1,0],[.65,.65,-.47],C.cream);g.append(roof).append(box(.018,.41,.30,C.ink),transform([.66,.21,0]));return g}
  function tractor(){const g=new Geometry();g.append(box(.85,.30,.40,C.lime),transform([.04,.35,0]));g.append(box(.34,.48,.37,C.cream),transform([-.20,.64,0]));g.append(box(.35,.29,.39,C.teal),transform([-.18,.69,0]));g.append(box(.44,.045,.48,C.ink),transform([-.20,.92,0]));for(const s of [-1,1])for(const x of [-.30,.35]){g.append(cylinder(x<0?.25:.16,x<0?.25:.16,.13,C.black,10),transform([x,x<0?.25:.19,s*.29],[PI/2,0,0]));g.append(cylinder(.08,.08,.135,C.cream,8),transform([x,x<0?.25:.19,s*.29],[PI/2,0,0]))}return g}
  const cache={};const get=(key,f)=>cache[key]||(cache[key]=f());
  const vertex=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;attribute vec3 aScatter;uniform mat4 uModel;uniform mat4 uViewProjection;uniform float uBuild;uniform float uTime;varying vec3 vNormal;varying vec3 vColor;varying vec3 vPosition;void main(){vec3 p=aPosition+aScatter*(1.0-uBuild);vec4 world=uModel*vec4(p,1.0);vPosition=world.xyz;vNormal=normalize(mat3(uModel)*aNormal);vColor=mix(vec3(.76,.95,.47),aColor,uBuild);gl_Position=uViewProjection*world;}`;
  const fragment=`precision mediump float;varying vec3 vNormal;varying vec3 vColor;varying vec3 vPosition;uniform vec3 uFog;uniform vec3 uEye;uniform float uOpacity;uniform float uEmission;void main(){vec3 n=normalize(vNormal);float key=max(0.0,dot(n,normalize(vec3(-.6,1.2,1.1))));float fill=max(0.0,dot(n,normalize(vec3(.8,.4,-.8))));float hemi=.58+.11*n.y;vec3 c=vColor*(hemi+.40*key+.16*fill)+uEmission*vColor;float fog=clamp((distance(vPosition,uEye)-18.0)/40.0,0.0,.38);gl_FragColor=vec4(mix(c,uFog,fog),uOpacity);}`;
  class World {
    constructor(canvas,kind,options={}){
      this.canvas=canvas;this.kind=kind;this.options=options;this.start=performance.now();this.elapsed=options.intro===false?3:0;this.objects=[];this.labels=[];this.hit=[];this.pointer=[0,0];this.drag=[0,0];this.dead=false;this.previous=0;
      this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:false});if(!this.gl){canvas.parentElement.classList.add('no-webgl');return}
      this.onContextLost=e=>{e.preventDefault();cancelAnimationFrame(this.raf)};
      this.onContextRestored=()=>this.restoreContext();
      canvas.addEventListener('webglcontextlost',this.onContextLost,false);
      canvas.addEventListener('webglcontextrestored',this.onContextRestored,false);
      this.linkProgram();
      this.prepare();this.bind();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();this.loop=this.loop.bind(this);this.raf=requestAnimationFrame(this.loop);
    }
    linkProgram(){
      const gl=this.gl,compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
      this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);this.loc={};for(const k of ['aPosition','aNormal','aColor','aScatter'])this.loc[k]=gl.getAttribLocation(this.program,k);for(const k of ['uModel','uViewProjection','uBuild','uTime','uFog','uEye','uOpacity','uEmission'])this.loc[k]=gl.getUniformLocation(this.program,k);
      gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);
    }
    /**
     * El navegador puede perder el contexto WebGL en cualquier momento (por
     * ejemplo, al superar el límite de contextos vivos navegando entre
     * varias escenas de la app). Sin este manejo la escena queda en blanco
     * para siempre en vez de recuperarse.
     */
    restoreContext(){
      if(this.dead||!this.gl)return;
      for(const key in cache)cache[key].buffers?.delete(this.gl);
      this.linkProgram();
      this.resize();
      this.previous=0;
      this.raf=requestAnimationFrame(this.loop);
    }
    resize(){if(!this.gl)return;const r=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,1.6);this.width=r.width;this.height=r.height;this.canvas.width=Math.max(1,Math.round(r.width*dpr));this.canvas.height=Math.max(1,Math.round(r.height*dpr));this.gl.viewport(0,0,this.canvas.width,this.canvas.height)}
    bind(){const c=this.canvas;let down=null,moved=false;c.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY,...this.drag];moved=false;c.setPointerCapture(e.pointerId)});c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect();this.pointer=[(e.clientX-r.left)/r.width-.5,(e.clientY-r.top)/r.height-.5];if(down){const dx=e.clientX-down[0],dy=e.clientY-down[1];if(Math.abs(dx)+Math.abs(dy)>6)moved=true;this.drag=[down[2]+dx*.004,clamp(down[3]+dy*.003,-.35,.7)]}});c.addEventListener('pointerup',e=>{if(!moved&&this.kind==='herd'){const r=c.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let nearest=null,dist=19;for(const p of this.hit){const d=Math.hypot(x-p.x,y-p.y);if(d<dist){nearest=p;dist=d}}if(nearest)this.options.onSelect?.(nearest.id)}down=null});c.addEventListener('pointerleave',()=>{if(!down)this.pointer=[0,0]});c.addEventListener('dblclick',()=>{this.drag=[0,0]})}
    add(mesh,p=[0,0,0],r=[0,0,0],s=[1,1,1],extra={}){this.objects.push({mesh,p,r,s,...extra})}
    prepare(){
      this.unitBox=get('box',()=>box(1,1,1,C.cream));this.token=get('token',()=>ellipsoid(.10,.15,.10,C.lime,5,3));
      if(this.kind==='genetic')this.geneticSetup();else if(this.kind==='market')this.marketSetup();else if(this.kind==='herd'||this.kind==='import')this.herdSetup();else if(this.kind==='advisor')this.advisorSetup();else if(this.kind==='plan')this.planSetup();
    }
    geneticSetup(){
      this.mother=get('cow',()=>cow());this.bull=get('bull',()=>cow('bull'));this.calf=get('calf',()=>cow('calf'));
      this.plinth=get('plinth',()=>cylinder(2.25,2.42,.50,C.soil,11));this.top=get('plinth-top',()=>cylinder(2.43,2.43,.055,C.green,11));
      this.central=get('central',()=>cylinder(1.42,1.58,.40,C.sage,9));this.strata=get('strata',()=>cylinder(1,1,.10,C.earth,11));
      this.shadow=get('cow-shadow',()=>ellipsoid(1.9,.018,.74,'#244134',12,3));
      this.sprig=get('sprig',()=>tree());
      this.paths=[curve([-2.8,.05,-.2],[0,.2,1.6],1.4),curve([2.8,.05,-.2],[0,.2,1.6],1.4),curve([-2.6,.04,-.8],[2.6,.04,-.8],1.9)];
      this.ribbonMeshes=this.paths.map(p=>ribbon(p,.024,C.lime));
    }
    marketSetup(){
      const terrain=new Geometry();
      for(let x=-4;x<=4;x++)for(let z=-3;z<=3;z++){
        if(Math.abs(x)+Math.abs(z)>6)continue;const height=.35+hash((x+7)*19+z+6)*.35;const co=[C.green,C.sage,'#8c9c52','#bac585','#4f7050'][Math.floor(hash(x*19+z*8)*5)];terrain.append(box(.94,height,.94,co),transform([x,height/2-.65,z]));
        if(hash(x*23+z*8)>.48&&Math.abs(x)+Math.abs(z)>2)for(let line=0;line<5;line++)terrain.append(box(.035,.055,.80,tint(co,.72)),transform([x-.32+line*.16,height-.64,z]));
      }
      this.terrain=terrain;this.trees=new Geometry();for(let i=0;i<22;i++){const x=(hash(i+4)-.5)*8,z=(hash(i+98)-.5)*6;if(Math.abs(x)>1.9||Math.abs(z)>1.5)this.trees.append(tree(),transform([x,-.03,z],[0,hash(i)*6,0],[.7+hash(i)*.7,.7+hash(i)*.6,.7+hash(i)*.7]))}
      this.farms=[[-2.5,0,-1.2],[2.4,.05,-1.4],[1.6,.02,2.1]];this.barn=get('barn',barn);this.tractor=get('tractor',tractor);this.pin=get('pin',()=>ellipsoid(.12,.18,.12,C.clay,6,4));
      this.paths=this.farms.map(p=>curve([-.2,.06,.1],[p[0],.10,p[2]],.35));this.ribbonMeshes=this.paths.map(p=>ribbon(p,.028,C.lime));
      this.base=get('market-base',()=>cylinder(4.6,4.7,.3,C.soil,8));
    }
    herdSetup(){this.base=get('herd-base',()=>box(3.65,.38,4.8,C.soil));this.tileMeshes=[C.green,C.sage,C.clay].map((co,i)=>get('herd-top-'+i,()=>box(3.66,.06,4.81,tint(co,.7))));this.tokenMeshes=[C.green,C.lime,C.clay].map((co,i)=>get('herd-token-'+i,()=>cylinder(.088,.071,.20,co,5)));this.special=get('special',()=>ellipsoid(.16,.26,.16,C.lime,6,4));this.herdCow=get('mini-cow',()=>cow());this.sheet=get('sheet',()=>box(7.1,.025,4.9,C.white));this.tokenTargets=[];this.tokenFrom=[];this.lastUsual=null;this.moveStart=this.start;this.lastFilter='all';this.tokens=get('sheet-token',()=>box(.26,.025,.095,C.green))}
    advisorSetup(){this.barn=get('barn',barn);this.base=get('advisor-base',()=>cylinder(.80,.93,.27,C.soil,6));this.cap=get('advisor-cap',()=>cylinder(.93,.93,.035,C.sage,6));this.tree=get('sprig',tree);this.lastOrder='';this.orderPositions=new Map();this.oldPositions=new Map();this.orderStart=this.start}
    planSetup(){this.paper=get('plan-paper',()=>box(3.6,.045,4.8,C.white));this.rule=get('plan-rule',()=>box(2.7,.012,.045,C.sage));this.seal=get('plan-seal',()=>cylinder(.27,.27,.035,C.green,12));this.base=get('plan-base',()=>cylinder(3.0,3.3,.4,C.soil,7));}
    camera(t){let target=[0,.7,0],az=.38,el=.54,distance=15.6;
      if(this.kind==='genetic'){const p=this.options.progress?.()||0;az=mix(.36,-.06,ease(p))+.07*Math.sin(p*PI);el=mix(.38,.49,ease(p));distance=mix(13.0,12.5,ease(p));target=[0,.75,.3]}
      else if(this.kind==='market'){az=.50;el=.65;distance=13.7;target=[0,.35,0]}
      else if(this.kind==='herd'){az=.16;el=.73;distance=10.8;target=[0,.1,0]}
      else if(this.kind==='import'){az=-.32+Math.sin(t*.35)*.08;el=.70;distance=11.4;target=[0,.15,0]}
      else if(this.kind==='advisor'){az=.02;el=.62;distance=14.7;target=[0,.1,0]}
      else if(this.kind==='plan'){az=-.34;el=.70;distance=9.6;target=[0,.6,0]}
      if(this.options.camera?.()==='top'){el=1.15;az=.0}else if(this.options.camera?.()==='front'){el=.18;az=0}
      if(this.width/this.height<1.4)distance*=1.4/(this.width/this.height);
      const reduced=this.options.reduced?.();az+=this.drag[0]+(reduced?0:this.pointer[0]*.10);el=clamp(el+this.drag[1]+(reduced?0:this.pointer[1]*.06),.14,1.40);
      if(!this.cameraState||reduced)this.cameraState=[az,el,distance];else this.cameraState=this.cameraState.map((v,i)=>mix(v,[az,el,distance][i],.14));[az,el,distance]=this.cameraState;
      const eye=[Math.sin(az)*Math.cos(el)*distance,Math.sin(el)*distance,Math.cos(az)*Math.cos(el)*distance];this.eye=V.add(eye,target);this.vp=mul(perspective(PI/4.8,this.width/this.height),lookAt(this.eye,target));
    }
    draw(mesh,p=[0,0,0],r=[0,0,0],s=[1,1,1],build=1,opacity=1,emission=0){const gl=this.gl;if(opacity<=.005)return;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.upload(gl));for(const [name,offset]of [['aPosition',0],['aNormal',12],['aColor',24],['aScatter',36]]){gl.enableVertexAttribArray(this.loc[name]);gl.vertexAttribPointer(this.loc[name],3,gl.FLOAT,false,48,offset)}gl.uniformMatrix4fv(this.loc.uModel,false,transform(p,r,s));gl.uniform1f(this.loc.uBuild,build);gl.uniform1f(this.loc.uOpacity,opacity);gl.uniform1f(this.loc.uEmission,emission);gl.depthMask(opacity>.9);gl.drawArrays(gl.TRIANGLES,0,mesh.count);gl.depthMask(true)}
    drawPath(mesh,progress){const gl=this.gl;if(progress<=0)return;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.upload(gl));for(const [name,offset]of [['aPosition',0],['aNormal',12],['aColor',24],['aScatter',36]]){gl.enableVertexAttribArray(this.loc[name]);gl.vertexAttribPointer(this.loc[name],3,gl.FLOAT,false,48,offset)}gl.uniformMatrix4fv(this.loc.uModel,false,identity());gl.uniform1f(this.loc.uBuild,1);gl.uniform1f(this.loc.uOpacity,1);gl.uniform1f(this.loc.uEmission,.25);gl.drawArrays(gl.TRIANGLES,0,Math.floor(mesh.count*clamp(progress)/6)*6)}
    project(p){const m=this.vp;const q=[0,1,2,3].map(i=>m[i]*p[0]+m[4+i]*p[1]+m[8+i]*p[2]+m[12+i]);return {x:(q[0]/q[3]*.5+.5)*this.width,y:(-.5*q[1]/q[3]+.5)*this.height}}
    label(id,p){const el=this.canvas.parentElement.querySelector(`[data-anchor="${id}"]`);if(!el)return;const q=this.project(p);el.style.left=q.x+'px';el.style.top=q.y+'px'}
    genetic(t){
      const p=this.options.progress?.()||0,projected=this.options.projected?.(),entry=this.options.reduced?.()?1:out(this.elapsed/1.4),breath=this.options.reduced?.()?0:Math.sin(t*.8)*.028;
      const approach=ease(p/.22)*.35;const xs=[-3.75+approach,3.75-approach];
      for(let i=0;i<2;i++){const x=xs[i],y=mix(-1.8,-.28,entry)+(i===0?breath:-breath);this.draw(this.plinth,[x,y-.25,0],[0,(1-entry)*(i?-.25:.25),0],[1,1,1]);this.draw(this.top,[x,y+.02,0]);this.draw(this.strata,[x,y-.57,0],[0,.15,0],[2.16,1,2.16]);this.draw(this.shadow,[x,y+.062,0]);const mesh=i?this.bull:this.mother;const angle=i?PI+.04*(1-ease(p/.3)):-.04*(1-ease(p/.3));this.draw(mesh,[x,y+.085,0],[0,angle,0],[.92,.92,.92],1,1);this.label(i?'bull':'mother',[x,y+3.38,-.1]);for(let j=0;j<3;j++)this.draw(this.sprig,[x+(j-1)*.7,y+.08,-1.6],[0,j,0],[.32,.32,.32]);}
      if(projected){const bridge=ease((p-.12)/.38);this.ribbonMeshes.forEach((mesh,i)=>this.drawPath(mesh,clamp(bridge-i*.08)));const build=ease((p-.35)/.40);const cy=mix(-2.0,-.12,out((p-.25)/.5));this.explosion=this.options.reduced?.()?(this.options.explode?.()?1:0):mix(this.explosion||0,this.options.explode?.()?1:0,.14);this.draw(this.central,[0,cy-.25,1.9],[0,(1-build)*1.1,0],[1,1,1],1,clamp((p-.2)*4));if(p>.31){this.draw(this.calf,[0,cy+.025,1.9],[0,-.16+(1-build)*.9,0],[.58,.58,.58],mix(build,.62,this.explosion),clamp((p-.31)*6));this.label('calf',[0,-.38,3.35])}for(let i=0;i<2;i++){const path=this.paths[i],k=Math.min(path.length-1,Math.floor(clamp((p-.14)/.40)*(path.length-1)));if(p>.14&&p<.58)this.draw(this.token,path[k],[0,t,0],[1.2,1.2,1.2],1,1,.18)}}
      this.label('mother-data',[xs[0],-.28,2.15]);this.label('bull-data',[xs[1],-.28,2.15]);
    }
    market(t){const age=(performance.now()-this.start)/1000,entry=out(age/1.7),found=this.options.found?.();this.draw(this.base,[0,-.89,0],[0,0,0],[1,1,1]);this.draw(this.terrain,[0,mix(-1.1,0,entry),0],[0,(1-entry)*.16,0]);this.draw(this.trees,[0,mix(-.65,0,out(age/2.2)),0]);for(let i=0;i<3;i++){const p=this.farms[i],rise=out((age-i*.18)/1.4);this.draw(this.barn,[p[0],p[1]+mix(-.8,0,rise),p[2]],[0,[.3,-.2,-.4][i],0],[.85,.85,.85]);this.label('provider-'+i,[p[0],1.8,p[2]]);if(found){this.drawPath(this.ribbonMeshes[i],out((age-.25-i*.13)/1.3));const phase=this.options.reduced?.()?1:(age*.17+i*.3)%1;const line=this.paths[i],q=line[Math.min(line.length-1,Math.floor(phase*(line.length-1)))];this.draw(this.pin,[q[0],q[1]+.10,q[2]],[0,age,0],[.7,.7,.7]);}}
      const drive=this.options.reduced?.()?0:Math.sin(t*.28)*.7;this.draw(this.tractor,[-1.45+drive,.02,1.4],[0,0,0],[.85,.85,.85]);this.draw(this.pin,[-.2,.5+Math.sin(t)*.045,.1],[0,t*.25,0],[1.2,1.6,1.2]);this.label('need',[-.2,1.28,.1]);
    }
    computeHerd(usual){const counts=[0,0,0];return Array.from({length:293},(_,i)=>{const group=usual?(i<80?0:i>=120&&i<188?1:2):(i<120?0:i<205?1:2),j=counts[group]++;return {id:String(i+1).padStart(3,'0'),g:group,p:[(group-1)*4.3-.1-1.43+(j%10)*.32,.04+group*.12,Math.floor(j/10)*.29-2.0]}})}
    herd(t){const age=(performance.now()-this.start)/1000,initial=this.kind==='import',usual=this.options.usual?.()||false;if(this.lastUsual!==usual){const current=this.tokenTargets.length?this.currentTokens():this.computeHerd(usual);this.tokenFrom=current;this.tokenTargets=this.computeHerd(usual);this.lastUsual=usual;this.moveStart=performance.now()}
      if(initial){const tilt=Math.sin(t*.7)*.035;this.draw(this.sheet,[0,.25,0],[0,0,tilt]);for(let i=0;i<75;i++){const row=Math.floor(i/5),col=i%5;const wave=this.options.reduced?.()?0:Math.sin(t*1.3+row*.4)*.06;this.draw(this.tokens,[-2.8+col*1.3,.29+wave,-2.1+row*.30],[0,0,0],[col===0?1.8:2.5,1,1])}for(let i=0;i<8;i++){const a=t*.2+i;const drift=this.options.reduced?.()?0:Math.sin(a)*.10;this.draw(this.token,[-3.6+i*.9,1.45+drift,2.3],[0,a,0],[.8,.8,.8],1,.8)}this.label('sheet',[0,1.3,-2.3]);return}
      const entrance=out(age/(this.options.imported?.()?1.9:1.1));for(let i=0;i<3;i++){this.draw(this.base,[(i-1)*4.3,mix(-1.5,-.23+i*.12,entrance),0]);this.draw(this.tileMeshes[i],[(i-1)*4.3,mix(-1.29,-.025+i*.12,entrance),0]);this.label('group-'+i,[(i-1)*4.3,.55+i*.12,-2.8]);}
      const nodes=this.currentTokens(),selected=this.options.selected?.()||'084',filter=this.options.filter?.()||'all';this.hit=[];
      for(let i=0;i<nodes.length;i++){const node=nodes[i],target=this.tokenTargets[i],isSelected=node.id===selected;let p=node.p.slice();if(age<2&&this.options.imported?.()){const origin=[-2.8+(i%15)*.4,2.2,Math.floor(i/15)*.22-2.1];const e=out((age-i%17*.021)/1.5);p=p.map((v,k)=>mix(origin[k],v,e));p[1]+=Math.sin(e*PI)*1.2}else p[1]+=mix(-1,0,entrance);const isDim=filter!=='all'&&['sex','conv','beef'][target.g]!==filter;const height=isSelected?2.5:isDim?.22:1+hash(i)*.18;this.draw(isSelected?this.special:this.tokenMeshes[target.g],p,[0,0,0],[1,height,1],1,isDim?.25:1,isSelected?.1:0);const q=this.project(p);this.hit.push({id:node.id,...q});if(isSelected)this.label('selected',[p[0],p[1]+.95,p[2]])}
    }
    currentTokens(){const e=this.options.reduced?.()?1:ease((performance.now()-this.moveStart)/1250);return this.tokenTargets.map((n,i)=>{const a=this.tokenFrom[i]||n;return {id:n.id,g:n.g,p:n.p.map((v,k)=>mix(a.p[k],v,e)+(k===1&&a.g!==n.g?Math.sin(e*PI)*1.8:0))}})}
    advisor(t){const order=this.options.order?.()||Array.from({length:10},(_,i)=>i),key=order.join(',');if(key!==this.lastOrder){this.oldPositions=new Map(this.orderPositions);order.forEach((id,i)=>this.orderPositions.set(id,[(i%5-2)*2.4,0,Math.floor(i/5)*2.8-1.4]));this.lastOrder=key;this.orderStart=performance.now()}const e=ease((performance.now()-this.orderStart)/1000);for(let i=0;i<10;i++){const dest=this.orderPositions.get(i),from=this.oldPositions.get(i)||[dest[0],-2.5,dest[2]],p=dest.map((x,j)=>mix(from[j],x,e)+(j===1?Math.sin(e*PI)*.4:0));p[1]+=Math.sin(t*.8+i)*.035;this.draw(this.base,p,[0,i*.19,0]);this.draw(this.cap,[p[0],p[1]+.154,p[2]],[0,i*.19,0]);this.draw(this.barn,[p[0]-.15,p[1]+.18,p[2]],[0,-.25,0],[.65,.65,.65]);this.draw(this.tree,[p[0]+.50,p[1]+.17,p[2]-.18],[0,i,0],[.6,.6,.6]);this.label('farm-'+i,[p[0],p[1]+1.45,p[2]])}}
    plan(t){const age=(performance.now()-this.start)/1000,e=out(age/1.6);this.draw(this.base,[0,-.65,0]);const count=Math.max(1,Math.min(4,this.options.count?.()||1));for(let i=count-1;i>=0;i--){const y=.2+i*.09+Math.sin(t*.8)*.035;const r=[(1-e)*-.55,.05+i*.08,0];this.draw(this.paper,[i*.08,y,0],r,[1,1,1]);if(i===0){for(let line=0;line<10;line++)this.draw(this.rule,[0,y+.035,-1.7+line*.35],[0,.05,0],[line===0?.65:1,1,line===0?4:1]);this.draw(this.seal,[1.1,y+.06,1.7],[0,0,0]);}}this.label('document',[0,1.4,-1.7])}
    loop(now){
      if(this.dead)return;
      const reduced=this.options.reduced?.(),paused=this.options.paused?.();
      this.raf=requestAnimationFrame(this.loop);
      if(document.hidden){this.previous=now;return}
      if(now-this.previous<32)return;
      const delta=this.previous?Math.min((now-this.previous)/1000,.15):0;
      this.previous=now;
      if(!paused&&!reduced)this.elapsed+=delta;
      if(reduced)this.start=now-10000;
      const t=reduced?0:this.elapsed;
      this.camera(t);
      const gl=this.gl;
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
      gl.uniformMatrix4fv(this.loc.uViewProjection,false,this.vp);gl.uniform3fv(this.loc.uEye,this.eye);
      gl.uniform3fv(this.loc.uFog,color(this.kind==='genetic'?'#153d32':'#dce4d0'));gl.uniform1f(this.loc.uTime,t);
      if(this.kind==='genetic')this.genetic(t);else if(this.kind==='market')this.market(t);else if(this.kind==='herd'||this.kind==='import')this.herd(t);else if(this.kind==='advisor')this.advisor(t);else if(this.kind==='plan')this.plan(t);
      this.options.onFrame?.();
    }
    dispose(){this.dead=true;cancelAnimationFrame(this.raf);this.resizeObserver?.disconnect();this.canvas.removeEventListener('webglcontextlost',this.onContextLost);this.canvas.removeEventListener('webglcontextrestored',this.onContextRestored);if(this.gl){this.gl.deleteProgram(this.program)}}
  }
  return {World,clamp,ease,out};
})();

export { Spatial };
