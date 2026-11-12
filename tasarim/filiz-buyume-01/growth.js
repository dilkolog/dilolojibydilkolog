/* A design prototype driven by stage interpolation, not by answer counts. */
const $=id=>document.getElementById(id),svg=$('plant');
const stages=[
 {key:'seed',name:'Tohum',description:'Yeni bir kelime, büyümeye hazır.',stem:0,lower:0,upper:0,bud:0,bloom:0},
 {key:'introduced',name:'Yeni tanıştı',description:'Toprağın içinden ilk filiz çıkıyor.',stem:.18,lower:.35,upper:0,bud:0,bloom:0},
 {key:'familiar',name:'Tanıdık',description:'İlk yapraklar açılıyor.',stem:.36,lower:1,upper:0,bud:0,bloom:0},
 {key:'recallable',name:'Hatırlanıyor',description:'Gövde uzuyor; yeni yapraklar beliriyor.',stem:.62,lower:1,upper:.65,bud:0,bloom:0},
 {key:'strong',name:'Sağlam',description:'Bitki güçleniyor, yaprakları genişliyor.',stem:.88,lower:1,upper:1,bud:0,bloom:0},
 {key:'production_ready',name:'Kullanılabiliyor',description:'Tomurcuk hazır. Bir sonraki adım çiçek.',stem:1,lower:1,upper:1,bud:1,bloom:0},
 {key:'mastered',name:'Oturdu',description:'Çiçek açtı. Bu kelime bahçende yerini aldı.',stem:1,lower:1,upper:1,bud:0,bloom:1},
];
const duration=9.6;
const timeline=[[0,0],[.45,0],[1.15,1/6],[1.55,1/6],[2.25,2/6],[2.65,2/6],[3.35,3/6],[3.75,3/6],[4.45,4/6],[4.85,4/6],[5.55,5/6],[6.15,5/6],[7.3,1],[9.6,1]];
const ease=t=>(1-Math.cos(Math.PI*Math.max(0,Math.min(1,t))))/2;
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const lerp=(a,b,t)=>a+(b-a)*t;
let progress=0,playing=false,frameId=0,language='fr',lastAnnounced=-1;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const stem=$('stem'),outline=$('stem-outline'),length=stem.getTotalLength();
const anchors=[.17,.17,.48,.48].map(t=>stem.getPointAtLength(length*t));
const colorSets={fr:['#d66a98','#6e2c48','#f3adc9'],en:['#6d9bdd','#2b4f80','#b5d3f5'],es:['#e9ad36','#8c551d','#ffdc8b']};
function timelineProgress(time){const t=clamp(time,0,duration);for(let i=1;i<timeline.length;i++){const [a,va]=timeline[i-1],[b,vb]=timeline[i];if(t<=b)return lerp(va,vb,ease((t-a)/(b-a)));}return 1;}
function valuesAt(p){const v=clamp(p)*6,i=Math.min(5,Math.floor(v)),t=v-i;const a=stages[i],b=stages[i+1];return Object.fromEntries(['stem','lower','upper','bud','bloom'].map(k=>[k,lerp(a[k],b[k],t)]));}
function paint(p,water=0){
 progress=clamp(p);const v=valuesAt(progress);
 for(const path of [stem,outline]){path.setAttribute('stroke-dasharray',`${length} ${length}`);path.setAttribute('stroke-dashoffset',length*(1-v.stem));path.setAttribute('opacity',v.stem>.001?'1':'0');}
 $('seed').setAttribute('opacity',1-clamp(v.stem/.16));
 $('seed').setAttribute('transform',`translate(256 329) scale(${1-.3*clamp(v.stem/.16)})`);
 for(let i=0;i<4;i++){
  const value=i<2?v.lower:v.upper,side=i%2===0?-1:1,unfold=ease(value),sx=.06+.94*unfold,sy=unfold,angle=(side===-1?65:-65)*(1-unfold);const a=anchors[i];
  $('leaf-'+i).setAttribute('transform',`translate(${a.x} ${a.y}) rotate(${angle}) scale(${side===-1?sx:-sx} ${sy})`);
  $('leaf-'+i).setAttribute('opacity',unfold>.001?'1':'0');
 }
 const tip=stem.getPointAtLength(length*v.stem);
 $('bud').setAttribute('transform',`translate(${tip.x} ${tip.y}) scale(${.2+.8*ease(v.bud)})`);$('bud').setAttribute('opacity',ease(v.bud));
 $('bloom').setAttribute('transform',`translate(${tip.x} ${tip.y})`);
 for(let i=0;i<6;i++){
  const open=ease(clamp((v.bloom-i*.025)/.875)),fold=.08+.92*open;
  $('petal-'+i).setAttribute('transform',`rotate(${i*60+(1-open)*13}) scale(${fold} ${open})`);$('petal-'+i).setAttribute('opacity',open>.001?'1':'0');
 }
 const core=ease(clamp((v.bloom-.1)/.8));$('core').setAttribute('transform',`scale(${core})`);$('core').setAttribute('opacity',core);
 $('water').setAttribute('opacity',water>0&&water<1?'1':'0');
 for(let i=0;i<3;i++){const fall=clamp((water-i*.12)/.64);$('drop-'+i).setAttribute('transform',`translate(${232+i*24} ${Math.max(45,tip.y-60)+fall*75}) scale(.65)`);$('drop-'+i).setAttribute('opacity',water>0&&fall>0&&fall<1?Math.sin(fall*Math.PI):0);}
 const index=Math.min(6,Math.round(progress*6));
 if(index!==lastAnnounced){$('state').textContent=stages[index].name;$('description').textContent=stages[index].description;lastAnnounced=index;}
 $('meter').style.width=(progress*100)+'%';
 $('next').disabled=progress>=1;
 document.querySelectorAll('[data-stage]').forEach(b=>{if(Number(b.dataset.stage)===index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
}
function pause(){playing=false;cancelAnimationFrame(frameId);$('play').textContent='Büyümeyi izle';}
function timeForProgress(p){if(p>=.999999)return 0;for(let i=1;i<timeline.length;i++){const [a,va]=timeline[i-1],[b,vb]=timeline[i];if(vb>va&&p>=va&&p<=vb){const f=clamp((p-va)/(vb-va));return a+(b-a)*Math.acos(1-2*f)/Math.PI;}}return 0;}
function run(target=null){pause();if(reduced.matches){paint(target===null?1:target);return;}playing=true;$('play').textContent='Duraklat';const initial=progress,start=performance.now(),offset=target===null?timeForProgress(progress):0,ms=target===null?(duration-offset)*1000:700;function tick(now){if(!playing)return;const t=(now-start)/ms;if(target===null)paint(timelineProgress(offset+(now-start)/1000));else paint(lerp(initial,target,ease(t)));if(t<1)frameId=requestAnimationFrame(tick);else if(target===null&&$('loop').checked){paint(0);run();}else{paint(target===null?1:target);pause();}}frameId=requestAnimationFrame(tick);}
$('play').onclick=()=>playing?pause():run();
$('next').onclick=()=>run(Math.min(1,(Math.floor(progress*6+.001)+1)/6));
$('reset').onclick=()=>{pause();paint(0);};
$('water-button').onclick=()=>{pause();if(reduced.matches)return;const p=progress,start=performance.now();function tick(now){const t=(now-start)/1000;paint(p,clamp(t));if(t<1)frameId=requestAnimationFrame(tick);else paint(p);}frameId=requestAnimationFrame(tick);};
$('steps').innerHTML=stages.map((s,i)=>`<button data-stage="${i}"><i aria-hidden="true"></i>${s.name}</button>`).join('');
document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>run(Number(b.dataset.stage)/6));
function setLanguage(lang){language=lang;const palette={fr:['#c6317c','#901a57','#9a2f62','#ffe8f1'],en:['#2f6de6','#1b4ba9','#2b58b1','#e5f1ff'],es:['#e6a313','#b76c00','#844b00','#fceed9']}[lang];document.documentElement.style.setProperty('--on-accent',lang==='es'?'#451a03':'#ffffff');['--accent','--accent-deep','--accent-text','--accent-soft'].forEach((k,i)=>document.documentElement.style.setProperty(k,palette[i]));const words={fr:['la maison','ev'],en:['remember','hatırlamak'],es:['la casa','ev']}[lang];document.querySelector('.word').textContent=words[0];document.querySelector('.word').lang=lang;document.querySelector('.meaning').textContent=words[1];const [fill,stroke,highlight]=colorSets[lang];document.querySelectorAll('[data-flower]').forEach(e=>{const type=e.dataset.flower;e.setAttribute(type==='highlight'?'stroke':'fill',type==='highlight'?highlight:fill);if(type!=='highlight')e.setAttribute('stroke',stroke);});document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));}
document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>setLanguage(b.dataset.lang));
function motionPreference(){if(reduced.matches){pause();$('motion-note').textContent='Hareket azaltma tercihi açık: aşamalar sabit pozlarla değişir.';}else $('motion-note').textContent='Kısa büyüme geçişleri; saksı ve toprak sabit.';}
reduced.addEventListener('change',motionPreference);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
const params=new URLSearchParams(location.search);if(params.has('export'))document.body.classList.add('export-view');setLanguage(colorSets[params.get('lang')]?params.get('lang'):'fr');motionPreference();paint(0);
window.plantAnimation={paint,drawAt:t=>paint(timelineProgress(t)),timelineProgress,stages,duration,pause,setLanguage,serialize:()=>new XMLSerializer().serializeToString(svg)};
if(!params.has('capture')&&!reduced.matches)run();
