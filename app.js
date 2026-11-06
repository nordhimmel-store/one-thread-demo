import * as THREE from './vendor/three.module.min.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const HATS = [
  {id:'stone', name:'Stone', hex:'#CFC5AE'},
  {id:'black', name:'Black', hex:'#232323'},
  {id:'olive', name:'Olive', hex:'#5D603C'},
  {id:'navy',  name:'Washed navy', hex:'#3E4A63'},
];
const THREADS = [
  {id:'red', name:'Red', hex:'#D9442B'},
  {id:'white', name:'White', hex:'#F7F4EC'},
  {id:'ink', name:'Black', hex:'#1B1B1B'},
];
const state = {hat:HATS[0], thread:THREADS[0]};
const $ = s => document.querySelector(s);

/* ---------- Embroidered logo (procedural stitches on canvas) ---------- */
function lerp(a,b,t){return a+(b-a)*t}
function samplePolyline(pts, step){
  const out=[];
  for(let i=0;i<pts.length-1;i++){
    const [x1,y1]=pts[i],[x2,y2]=pts[i+1];
    const n=Math.max(1,Math.round(Math.hypot(x2-x1,y2-y1)/step));
    for(let k=0;k<n;k++){const t=k/n; out.push([lerp(x1,x2,t),lerp(y1,y2,t),Math.atan2(y2-y1,x2-x1)]);}
  }
  const l=pts[pts.length-1],p=pts[pts.length-2]; out.push([l[0],l[1],Math.atan2(l[1]-p[1],l[0]-p[0])]);
  return out;
}
// Build stitch list in 256 space. Each stitch: [x1,y1,x2,y2,colorKey]
function buildStitches(){
  const S=[]; let seed=7; const rnd=()=>((seed=(seed*16807)%2147483647)/2147483647-.5);
  // running-stitch ring
  const R=100, cx=128, cy=128, n=44;
  for(let i=0;i<n;i++){const a1=i/n*Math.PI*2-Math.PI/2, a2=a1+(Math.PI*2/n)*.62;
    S.push([cx+Math.cos(a1)*R,cy+Math.sin(a1)*R,cx+Math.cos(a2)*R,cy+Math.sin(a2)*R,'t',4]);}
  // satin "1": flag, stem, foot
  const satin=(pts,w)=>{for(const [x,y,a] of samplePolyline(pts,2.3)){const nx=-Math.sin(a)*w/2,ny=Math.cos(a)*w/2, j=rnd()*1.2;
    S.push([x-nx+j,y-ny,x+nx+j,y+ny,'t',2.6]);}};
  satin([[96,92],[132,66]],20); satin([[132,66],[132,184]],22); satin([[100,184],[164,184]],18);
  // red loose tail (always red, the brand thread)
  const tail=[]; for(let i=0;i<=24;i++){const t=i/24; tail.push([164+t*50, 184+Math.sin(t*3)*6+t*40]);}
  const tp=samplePolyline(tail,7); for(let i=0;i<tp.length-1;i+=1){S.push([tp[i][0],tp[i][1],tp[i+1][0],tp[i+1][1],'r',4.5]);}
  return S;
}
const STITCHES=buildStitches();
function drawLogo(ctx, size, threadHex, progress){
  ctx.clearRect(0,0,size,size);
  const k=size/256, count=Math.floor(STITCHES.length*progress);
  ctx.lineCap='round';
  for(let i=0;i<count;i++){
    const [x1,y1,x2,y2,c,w]=STITCHES[i]; const col=c==='r'?'#D9442B':threadHex;
    ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.lineWidth=w*k+1.5*k;
    ctx.beginPath(); ctx.moveTo(x1*k+1.2*k,y1*k+1.5*k); ctx.lineTo(x2*k+1.2*k,y2*k+1.5*k); ctx.stroke();
    ctx.strokeStyle=col; ctx.lineWidth=w*k;
    ctx.beginPath(); ctx.moveTo(x1*k,y1*k); ctx.lineTo(x2*k,y2*k); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.28)'; ctx.lineWidth=w*k*.3;
    ctx.beginPath(); ctx.moveTo(x1*k-.6*k,y1*k-.8*k); ctx.lineTo(x2*k-.6*k,y2*k-.8*k); ctx.stroke();
  }
}

/* ---------- 3D hat ---------- */
const canvas=$('#hatCanvas');
let renderer, scene, camera, hatGroup, crownMat, brimMat, logoTex, logoCanvas, logoCtx;
let stitchT=1, stitchStart=0, rotY=-0.5, velY=0, dragging=false, lastX=0, autoSpin=!RM, needs=true;
function initHat(){
  try{ renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true}); }
  catch(e){ canvas.replaceWith(fallback2D()); return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(32,1,.1,50); camera.position.set(0,1.1,5.6); camera.lookAt(0,.35,0);
  scene.add(new THREE.HemisphereLight(0xfff6e8,0x8a7f70,1.6));
  const key=new THREE.DirectionalLight(0xffffff,2.2); key.position.set(2.5,4,4); scene.add(key);
  const rim=new THREE.DirectionalLight(0xffe2c4,1.0); rim.position.set(-3,2,-3); scene.add(rim);

  // twill bump texture
  const tw=document.createElement('canvas'); tw.width=tw.height=128; const tc=tw.getContext('2d');
  tc.fillStyle='#808080'; tc.fillRect(0,0,128,128);
  for(let i=-128;i<256;i+=4){tc.strokeStyle=i%8?'#9a9a9a':'#666'; tc.lineWidth=2; tc.beginPath(); tc.moveTo(i,0); tc.lineTo(i+128,128); tc.stroke();}
  const twill=new THREE.CanvasTexture(tw); twill.wrapS=twill.wrapT=THREE.RepeatWrapping; twill.repeat.set(10,6);

  crownMat=new THREE.MeshStandardMaterial({color:state.hat.hex,roughness:.92,bumpMap:twill,bumpScale:.6,side:THREE.DoubleSide});
  brimMat=crownMat;
  hatGroup=new THREE.Group(); scene.add(hatGroup);
  const r=1.15;
  // crown: squashed half sphere, 6 panels feel via slight flat segments
  const crown=new THREE.Mesh(new THREE.SphereGeometry(r,48,24,0,Math.PI*2,0,Math.PI/2),crownMat);
  crown.scale.set(1,.78,1.05); hatGroup.add(crown);
  // seams
  const seamMat=new THREE.LineBasicMaterial({color:0x000000,transparent:true,opacity:.22});
  for(let s=0;s<6;s++){const phi=s/6*Math.PI*2+Math.PI/6, pts=[];
    for(let i=0;i<=20;i++){const th=i/20*Math.PI/2; pts.push(new THREE.Vector3(-Math.cos(phi)*Math.sin(th)*r*1.003,Math.cos(th)*r*.78*1.003,Math.sin(phi)*Math.sin(th)*r*1.05*1.003));}
    hatGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),seamMat));}
  // button
  const btn=new THREE.Mesh(new THREE.SphereGeometry(.07,16,8),crownMat); btn.position.y=r*.78; btn.scale.y=.5; hatGroup.add(btn);
  // band
  const band=new THREE.Mesh(new THREE.CylinderGeometry(r*1.002,r*1.002,.06,48,1,true),new THREE.MeshStandardMaterial({color:0x000000,transparent:true,opacity:.12}));
  band.scale.z=1.05; band.position.y=.03; hatGroup.add(band);
  // brim: curved shape
  const sh=new THREE.Shape(); const A0=0.2, A1=Math.PI-0.2, rz=r*1.05;
  sh.moveTo(r*Math.cos(A0),rz*Math.sin(A0));
  for(let i=1;i<=24;i++){const a=A0+(A1-A0)*i/24; sh.lineTo(r*Math.cos(a)*0.99,rz*Math.sin(a)*0.99);}
  sh.bezierCurveTo(-1.15,1.0, -0.8,rz+0.72, 0,rz+0.72);
  sh.bezierCurveTo(0.8,rz+0.72, 1.15,1.0, r*Math.cos(A0),rz*Math.sin(A0));
  const bg=new THREE.ExtrudeGeometry(sh,{depth:.035,bevelEnabled:true,bevelSize:.015,bevelThickness:.012,bevelSegments:2,curveSegments:40});
  const pos=bg.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i), y=pos.getY(i); const out=Math.max(0,Math.hypot(x,y/1.05)-r);
    pos.setZ(i,pos.getZ(i)+out*out*0.18+x*x*0.05);}
  bg.computeVertexNormals();
  const brim=new THREE.Mesh(bg,brimMat); brim.rotation.x=Math.PI/2; brim.position.set(0,.03,0); hatGroup.add(brim);
  // strap hint at back
  const strap=new THREE.Mesh(new THREE.TorusGeometry(.22,.025,8,24,Math.PI),new THREE.MeshStandardMaterial({color:0xb08d3c,metalness:.8,roughness:.35}));
  strap.position.set(0,.05,-r*1.04); hatGroup.add(strap);
  // logo patch on front
  logoCanvas=document.createElement('canvas'); logoCanvas.width=logoCanvas.height=512; logoCtx=logoCanvas.getContext('2d');
  logoTex=new THREE.CanvasTexture(logoCanvas); logoTex.colorSpace=THREE.SRGBColorSpace; logoTex.anisotropy=4;
  const ph=0.62, th0=0.62, thL=0.62;
  const lg=new THREE.SphereGeometry(r*1.012,32,16,Math.PI/2-ph/2,ph,th0,thL);
  const logoMesh=new THREE.Mesh(lg,new THREE.MeshStandardMaterial({map:logoTex,transparent:true,roughness:.6,bumpMap:logoTex,bumpScale:1.5,polygonOffset:true,polygonOffsetFactor:-2}));
  logoMesh.scale.set(1,.78,1.05); hatGroup.add(logoMesh);
  // shadow
  const sc=document.createElement('canvas'); sc.width=sc.height=64; const sx=sc.getContext('2d');
  const g=sx.createRadialGradient(32,32,2,32,32,32); g.addColorStop(0,'rgba(0,0,0,.35)'); g.addColorStop(1,'rgba(0,0,0,0)'); sx.fillStyle=g; sx.fillRect(0,0,64,64);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.4,2.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2; shadow.position.y=-.32; scene.add(shadow);
  hatGroup.position.y=-.1;

  // drag
  canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;autoSpin=false;canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX;lastX=e.clientX;velY=dx*.01;rotY+=velY;needs=true});
  const up=()=>{dragging=false}; canvas.addEventListener('pointerup',up); canvas.addEventListener('pointercancel',up);
  new ResizeObserver(resize).observe(canvas); resize();
  return true;
}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight; if(!w)return; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); needs=true;}
let visible=true;
new IntersectionObserver(es=>{visible=es[0].isIntersecting}).observe(canvas);
function tick(t){
  requestAnimationFrame(tick);
  if(!renderer||!visible)return;
  if(stitchT<1){stitchT=Math.min(1,(t-stitchStart)/1500); paintLogo(stitchT); needs=true;}
  if(!dragging){ if(autoSpin) rotY+=0.004; else if(Math.abs(velY)>1e-4){rotY+=velY; velY*=.94;} }
  if(autoSpin||Math.abs(velY)>1e-4||dragging) needs=true;
  if(!needs)return; needs=false;
  hatGroup.rotation.y=rotY; renderer.render(scene,camera);
}
function paintLogo(p){ if(logoCtx){ drawLogo(logoCtx,512,state.thread.hex,p); logoTex.needsUpdate=true; } }
function restitch(){
  if(RM){ stitchT=1; paintLogo(1); needs=true; }
  else { stitchT=0; stitchStart=performance.now(); }
  // face front when restitching so the stitching is visible
  if(!dragging){ rotY=Math.round(rotY/(Math.PI*2))*Math.PI*2 - .35; velY=0; }
  syncOthers();
}
function fallback2D(){const d=document.createElement('div'); d.textContent='3D preview unavailable — see the hat on the head below.'; d.className='muted'; return d;}

/* ---------- Pickers ---------- */
function radio(container, list, key){
  list.forEach((it,i)=>{
    const b=document.createElement('button'); b.type='button'; b.className=key==='hat'?'swatch':'dot';
    b.style.background=it.hex; b.setAttribute('role','radio'); b.setAttribute('aria-label',it.name);
    b.setAttribute('aria-checked',state[key]===it); b.tabIndex=state[key]===it?0:-1;
    if(key==='hat'){const s=document.createElement('span'); s.textContent=it.name; b.appendChild(s);}
    b.onclick=()=>{state[key]=it; container.querySelectorAll('button').forEach((x,j)=>{x.setAttribute('aria-checked',j===i);x.tabIndex=j===i?0:-1});
      if(crownMat) crownMat.color.set(state.hat.hex); restitch();};
    b.onkeydown=e=>{const d=e.key==='ArrowRight'||e.key==='ArrowDown'?1:e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:0; if(!d)return; e.preventDefault();
      const n=(i+d+list.length)%list.length; container.children[n].click(); container.children[n].focus();};
    container.appendChild(b);
  });
  container.setAttribute('role','radiogroup');
}
radio($('#hatSwatches'),HATS,'hat'); radio($('#threadDots'),THREADS,'thread');

const mini=$('#miniLogo').getContext('2d');
function syncOthers(){
  const txt=`${state.hat.name} hat · ${state.thread.name} thread`;
  $('#selText').textContent=txt; $('#sumSel').textContent=txt;
  $('#svgCrown').setAttribute('fill',state.hat.hex); $('#svgBrim').setAttribute('fill',state.hat.hex); $('#svgButton').setAttribute('fill',state.hat.hex);
  const c=document.createElement('canvas'); c.width=c.height=128; drawLogo(c.getContext('2d'),128,state.thread.hex,1);
  $('#svgLogo').setAttribute('href',c.toDataURL());
  mini.fillStyle=state.hat.hex; mini.fillRect(0,0,80,80); drawLogo(mini,80,state.thread.hex,1);
}

/* ---------- Scene 1: pull the thread ---------- */
const s1=$('#thread'), svg=$('#threadSvg'), path=$('#threadPath'), knot=$('#threadKnot'), endC=$('#threadEnd');
s1.classList.add('pre');
let pulling=false, entered=false, startY=0;
function setThread(px,py){
  path.setAttribute('d',`M100 0 C 100 ${py*.4}, ${100+(px-100)*.3} ${py*.7}, ${px} ${py}`);
  knot.setAttribute('cx',px); knot.setAttribute('cy',py); endC.setAttribute('cx',px); endC.setAttribute('cy',py);
}
function svgPoint(e){const r=svg.getBoundingClientRect(); return [(e.clientX-r.left)/r.width*200,(e.clientY-r.top)/r.height*400];}
svg.addEventListener('pointerdown',e=>{pulling=true; svg.setPointerCapture(e.pointerId); startY=svgPoint(e)[1];});
svg.addEventListener('pointermove',e=>{ if(!pulling)return; let [x,y]=svgPoint(e); y=Math.max(160,Math.min(400,160+(y-startY)));
  x=100+Math.max(-40,Math.min(40,x-100)); setThread(x,y);
  const p=(y-160)/240; $('#w2').style.clipPath=`inset(0 ${100-p*100}% 0 0)`;
  if(p>.6) enter(); });
const release=()=>{ if(!pulling)return; pulling=false; if(!entered){ springBack(); } };
svg.addEventListener('pointerup',release); svg.addEventListener('pointercancel',release);
svg.addEventListener('click',()=>{ if(!entered){ enter(); } });
svg.setAttribute('tabindex','0'); svg.setAttribute('role','button'); svg.setAttribute('aria-label','Pull the thread to start');
svg.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault(); enter();} });
function springBack(){ const a=performance.now(), from=+knot.getAttribute('cy'), fx=+knot.getAttribute('cx');
  const st=t=>{const k=Math.min(1,(t-a)/400), e=1-Math.pow(1-k,3); setThread(fx+(100-fx)*e,from+(160-from)*e); $('#w2').style.clipPath=''; if(k<1)requestAnimationFrame(st);}; requestAnimationFrame(st);}
function enter(){
  if(entered) return; entered=true; pulling=false;
  s1.classList.remove('pre'); $('#w2').style.clipPath='';
  if(!RM){ const a=performance.now(), fy=+knot.getAttribute('cy'), fx=+knot.getAttribute('cx');
    const st=t=>{const k=Math.min(1,(t-a)/500); setThread(fx+(100-fx)*k,fy+(400-fy)*k); if(k<1)requestAnimationFrame(st);}; requestAnimationFrame(st); }
  setTimeout(()=>{ $('#hat').scrollIntoView({behavior:RM?'auto':'smooth'}); entered=false; setThread(100,160); s1.classList.add('pre'); }, RM?0:650);
}
$('#startBtn').onclick=()=>$('#hat').scrollIntoView();

/* ---------- Scene 2 enter → stitch; Scene 3 drop ---------- */
new IntersectionObserver(es=>{ if(es[0].isIntersecting) restitch(); },{threshold:.5}).observe($('#hat'));
const svgHat=$('#svgHat');
new IntersectionObserver(es=>{ if(es[0].isIntersecting){ svgHat.classList.remove('dropped'); void svgHat.getBBox(); svgHat.classList.add('dropped');
  const eye=$('#eyeR'); eye.classList.remove('wink'); void eye.getBBox(); eye.classList.add('wink'); } },{threshold:.45}).observe($('#on-you'));

/* ---------- Scene 4: checkout ---------- */
const SHIP={eu:5,us:5,uk:6,other:9};
function updPrice(){const s=SHIP[$('#region').value]; $('#shipPrice').textContent=`~$${s.toFixed(2)}`; $('#total').textContent=`~$${(39+s).toFixed(2)}`;}
$('#region').onchange=updPrice; updPrice();
$('#orderBtn').onclick=()=>{
  const n=(+(localStorage.getItem('onethread_order')||0))+1; localStorage.setItem('onethread_order',n);
  const id='ONE THREAD No. '+String(n).padStart(4,'0');
  const order={order:id,demo:true,product:'Embroidered dad hat',hat_colour:state.hat.name,thread_colour:state.thread.name,ship_region:$('#region').value,price_usd:39,shipping_estimate_usd:SHIP[$('#region').value],fulfilment:'Printful (made to order) — not sent, demo',created:new Date().toISOString()};
  console.info('Demo order (not submitted):',order);
  const finish=()=>{ $('#checkoutCard').hidden=true; $('#orderNo').textContent=id; $('#done').hidden=false; $('#backBtn').focus(); };
  $('#orderBtn').disabled=true;
  if(RM){ finish(); return; }
  playSnip();
  const sc=$('#scissors'), a=performance.now();
  const st=t=>{const k=Math.min(1,(t-a)/700); const x=-40+k*215; const open=Math.abs(Math.sin(k*Math.PI*3))*14;
    sc.setAttribute('transform',`translate(${x} 40)`); $('#bladeA').setAttribute('transform',`rotate(${-open})`); $('#bladeB').setAttribute('transform',`rotate(${open})`);
    if(k<1) requestAnimationFrame(st); else { $('#snipSvg').classList.add('cut'); setTimeout(finish,650);} };
  requestAnimationFrame(st);
};
function playSnip(){ try{ const ac=new (window.AudioContext||window.webkitAudioContext)(); const len=ac.sampleRate*.06, b=ac.createBuffer(1,len,ac.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,4); const s=ac.createBufferSource(); s.buffer=b; const f=ac.createBiquadFilter(); f.type='highpass'; f.frequency.value=3000; const g=ac.createGain(); g.gain.value=.25;
  s.connect(f).connect(g).connect(ac.destination); s.start(ac.currentTime+.45); setTimeout(()=>ac.close(),1200);}catch(e){} }
$('#backBtn').onclick=()=>{ $('#done').hidden=true; $('#checkoutCard').hidden=false; $('#orderBtn').disabled=false; $('#snipSvg').classList.remove('cut');
  $('#scissors').setAttribute('transform','translate(-40 40)'); $('#thread').scrollIntoView({behavior:RM?'auto':'smooth'}); };

/* ---------- boot ---------- */
if(initHat()){ paintLogo(1); }
syncOthers();
requestAnimationFrame(tick);
