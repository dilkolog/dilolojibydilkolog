/* A small raster-layer puppet rig. No image content is painted or regenerated per frame. */
const canvas = document.getElementById('monki');
const context = canvas.getContext('2d');
const body = new Image(), arm = new Image();
body.src = 'assets/body.png'; arm.src = 'assets/arm.png';
const DURATION = 4.8;
const keys = [[0,0],[.24,-12],[.54,10],[.84,-10],[1.14,8],[1.5,0],[4.8,0]];
const rig = { x:400, y:565, scale:.31, armPivotX:930, armPivotY:940, torsoCoverY:540 };
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let running = false, start = 0, frameId = null, pausedAt = 0;
function angleAt(seconds) {
 const t = ((seconds % DURATION) + DURATION) % DURATION;
 for(let i=1;i<keys.length;i++) if(t<=keys[i][0]) {
  const [a,va]=keys[i-1], [b,vb]=keys[i];const f=(t-a)/(b-a);const ease=(1-Math.cos(Math.PI*f))/2;
  return va+(vb-va)*ease;
 }
 return 0;
}
function drawAt(seconds, transparent=false) {
 context.clearRect(0,0,1024,1024);
 if(!transparent){context.fillStyle='#ffffff';context.fillRect(0,0,1024,1024);}
 context.drawImage(body,0,0,1024,1024);
 context.save();context.translate(rig.x,rig.y);context.rotate(angleAt(seconds)*Math.PI/180);context.scale(rig.scale,rig.scale);context.drawImage(arm,-rig.armPivotX,-rig.armPivotY);context.restore();
 // Reuse the lower body as a foreground layer so the shoulder attachment stays hidden.
 context.save();context.beginPath();context.rect(0,rig.torsoCoverY,1024,1024-rig.torsoCoverY);context.clip();context.drawImage(body,0,0,1024,1024);context.restore();
 const status=document.getElementById('status');if(status)status.textContent=reduced.matches?'Hareket azaltma tercihi: sabit poz':(seconds%DURATION<1.5?'İki küçük el sallama':'Sakin bekleme');
}
function tick(now){if(!running)return;const elapsed=(now-start)/1000;pausedAt=elapsed;drawAt(elapsed);frameId=requestAnimationFrame(tick);}
function play(){if(reduced.matches){drawAt(0);return;}if(running)return;running=true;start=performance.now()-pausedAt*1000;document.getElementById('play').textContent='Duraklat';frameId=requestAnimationFrame(tick);}
function pause(){running=false;cancelAnimationFrame(frameId);document.getElementById('play').textContent='Oynat';}
function replay(){pause();pausedAt=0;drawAt(0);play();}
const ready=Promise.all([body.decode(),arm.decode()]).then(()=>{drawAt(0);if(!new URLSearchParams(location.search).has('capture'))play();});
document.getElementById('play').onclick=()=>running?pause():play();
document.getElementById('replay').onclick=replay;
document.getElementById('still').onclick=()=>{pause();pausedAt=0;drawAt(0);};
reduced.addEventListener('change',()=>{if(reduced.matches){pause();drawAt(0);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.monkiAnimation={ready,drawAt,angleAt,rig,duration:DURATION,pause};
