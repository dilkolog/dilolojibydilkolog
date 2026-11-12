/* Shared body rig: proportions stay fixed across all three motion studies. */
const canvas=document.getElementById('monki'),ctx=canvas.getContext('2d');
const body=new Image(),arm=new Image(),rest=new Image();rest.src='assets/rest-arm-source.png';body.src='assets/body-rig.png';arm.src='assets/arm-rig.png';
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const duration=4.8;let mode='wave',running=false,start=0,elapsed=0,raf=0;
const smooth=v=>(1-Math.cos(Math.PI*Math.max(0,Math.min(1,v))))/2;
function keys(t,points){for(let i=1;i<points.length;i++){if(t<=points[i][0]){const [a,va]=points[i-1],[b,vb]=points[i];return va+(vb-va)*smooth((t-a)/(b-a));}}return points.at(-1)[1];}
function drawArm(side,angle,handOnly=false){ctx.save();ctx.translate(side==='left'?398:626,563);if(side==='right')ctx.scale(-1,1);ctx.rotate(angle*Math.PI/180);ctx.scale(.305,.305);ctx.translate(-930,-940);if(handOnly){ctx.beginPath();ctx.rect(125,155,550,510);ctx.clip();}ctx.drawImage(arm,0,0);ctx.restore();}
function drawRest(side){ctx.save();if(side==='left'){ctx.translate(1024,0);ctx.scale(-1,1);}ctx.beginPath();const top=side==='left'?548:530;ctx.moveTo(600,top);ctx.lineTo(820,top);ctx.lineTo(820,910);ctx.lineTo(655,910);ctx.lineTo(615,680);ctx.closePath();ctx.clip();ctx.drawImage(rest,0,0,1024,1024);ctx.restore();}
function eye(x,y,open){ctx.save();ctx.translate(x,y);ctx.strokeStyle='#54240f';ctx.fillStyle='#54240f';ctx.lineWidth=6;ctx.lineCap='round';if(open<.13){ctx.beginPath();ctx.moveTo(-22,3);ctx.quadraticCurveTo(0,-17,22,3);ctx.stroke();}else{const grad=ctx.createLinearGradient(-22,-30,20,30);grad.addColorStop(0,'#54240f');grad.addColorStop(1,'#703215');ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(0,0,24,31*open,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(-7,-10*open,7,7*open,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
function sparkle(x,y,r,alpha){if(alpha<=0)return;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#efb743';ctx.strokeStyle='#a56327';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y-r);ctx.quadraticCurveTo(x+4,y-4,x+r,y);ctx.quadraticCurveTo(x+4,y+4,x,y+r);ctx.quadraticCurveTo(x-4,y+4,x-r,y);ctx.quadraticCurveTo(x-4,y-4,x,y-r);ctx.fill();ctx.stroke();ctx.restore();}
function drawAt(seconds,selected=mode){const t=((seconds%duration)+duration)%duration;ctx.clearRect(0,0,1024,1024);ctx.fillStyle='#fff';ctx.fillRect(0,0,1024,1024);let left=-113,right=-113,leftEye=1,rightEye=1;
 if(selected==='wave'){left=keys(t,[[0,0],[.24,-12],[.54,10],[.84,-10],[1.14,8],[1.5,0],[4.8,0]]);}
 if(selected==='wink'){rightEye=1-keys(t,[[0,0],[.6,0],[.78,1],[1,1],[1.2,0],[4.8,0]]);}
 if(selected==='celebrate'){const lift=keys(t,[[0,0],[.25,0],[.7,1],[1.25,1],[1.8,0],[4.8,0]]);left=-35+43*lift;right=left;const smile=keys(t,[[0,0],[.45,0],[.72,1],[1.2,1],[1.5,0],[4.8,0]]);leftEye=rightEye=1-smile;}
 // The body itself hides shoulder caps. Only the palm returns as a foreground layer.
 if(selected==='wink'){drawRest('left');drawRest('right');}else if(selected==='wave'){drawArm('left',left);drawRest('right');}else{drawArm('left',left);drawArm('right',right);}ctx.drawImage(body,0,0,1024,1024);if(selected!=='wink')drawArm('left',left,true);if(selected==='celebrate')drawArm('right',right,true);
 eye(435,355,leftEye);eye(581,355,rightEye);
 if(selected==='celebrate'){const a=keys(t,[[0,0],[.55,0],[.8,1],[1.2,1],[1.6,0],[4.8,0]]);sparkle(265,170,17,a);sparkle(780,170,13,a);}
 const status=document.getElementById('status');if(status)status.textContent=reduce.matches?'Hareket azaltma tercihi: sabit poz':selected==='wave'?'El sallama · omuz kapakları gövdenin arkasında':selected==='wink'?'Kısa göz kırpma, ardından bekleme':'İki elini kısaca kaldırır, sonra dinlenir';
}
function pause(){running=false;cancelAnimationFrame(raf);document.getElementById('play').textContent='Oynat';}
function tick(now){if(!running)return;elapsed=(now-start)/1000;drawAt(elapsed);raf=requestAnimationFrame(tick);}
function play(){if(reduce.matches){drawAt(0);return;}if(running)return;running=true;start=performance.now()-elapsed*1000;document.getElementById('play').textContent='Duraklat';raf=requestAnimationFrame(tick);}
function select(name){pause();mode=name;elapsed=0;drawAt(0);document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));play();}
const ready=Promise.all([body.decode(),arm.decode(),rest.decode()]).then(()=>{const q=new URLSearchParams(location.search);mode=['wave','wink','celebrate'].includes(q.get('mode'))?q.get('mode'):'wave';drawAt(0);document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));if(!q.has('capture'))play();});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>select(b.dataset.mode));document.getElementById('play').onclick=()=>running?pause():play();document.getElementById('replay').onclick=()=>{pause();elapsed=0;drawAt(0);play();};document.getElementById('still').onclick=()=>{pause();elapsed=0;drawAt(0);};reduce.addEventListener('change',()=>{if(reduce.matches){pause();drawAt(0);}});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.monkiMotion={ready,drawAt,select,pause,duration};
