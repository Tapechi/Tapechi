const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const el=id=>document.getElementById(id);
import { map } from './map.js';
const keys=new Set();let player,bots,round=0,active=false,remaining=90,last=performance.now(),reload=0,cooldown=0,flash=0,hurt=0,noticeTime=0,depth=[];
const wall=(x,y)=>map[Math.floor(y)]?.[Math.floor(x)]!=='0';
const clear=(x,y)=>!wall(x-.22,y-.22)&&!wall(x+.22,y-.22)&&!wall(x-.22,y+.22)&&!wall(x+.22,y+.22);
function move(p,x,y){if(clear(p.x+x,p.y))p.x+=x;if(clear(p.x,p.y+y))p.y+=y;}
function ray(x,y,a,max=25){
 const dx=Math.cos(a),dy=Math.sin(a),deltaX=Math.abs(1/dx),deltaY=Math.abs(1/dy),stepX=dx<0?-1:1,stepY=dy<0?-1:1;
 let cellX=Math.floor(x),cellY=Math.floor(y),sideX=(dx<0?x-cellX:cellX+1-x)*deltaX,sideY=(dy<0?y-cellY:cellY+1-y)*deltaY,d=0;
 if(wall(x,y))return 0;
 while(d<max){if(sideX<sideY){d=sideX;sideX+=deltaX;cellX+=stepX;}else{d=sideY;sideY+=deltaY;cellY+=stepY;}if(d>=max)return max;if(map[cellY]?.[cellX]!=='0')return d;}
 return max;
}
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
function say(s){el('notice').textContent=s;noticeTime=1.5;}
function hud(){el('health').textContent=Math.max(0,Math.ceil(player.hp));el('ammo').textContent=player.ammo;el('reserve').textContent=player.reserve;el('objective').textContent=`${bots.filter(b=>b.hp>0).length} objetivos restantes`;el('time').textContent=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(Math.ceil(remaining%60)).padStart(2,'0')}`;}
function reset(){round++;player={x:2.5,y:13.5,a:-Math.PI/2,hp:100,ammo:24,reserve:120,pitch:0};bots=[{x:12.5,y:2.5},{x:5.5,y:3.5},{x:12.5,y:11.5}].map((b,i)=>({...b,hp:100,t:1+i*.6}));remaining=90;reload=0;cooldown=0;flash=0;hurt=0;el('round').textContent=`RONDA ${String(round).padStart(2,'0')}`;hud();}
function end(message){active=false;keys.clear();document.exitPointerLock?.();el('overlay').style.display='grid';el('message').textContent=message;el('play').textContent='NUEVA RONDA →';}
let socket,myId,mode='solo',finished=true;
function shoot(){
 if(!active||cooldown||player.hp<=0||reload||!player.ammo)return;
 if(mode==='online'){if(socket?.readyState===1){socket.send(JSON.stringify({type:'shoot',a:player.a,pitch:player.pitch||0}));cooldown=.16;flash=.09;}return;}
 player.ammo--;cooldown=.16;flash=.09;let target,best=Infinity;
 for(const b of bots){if(b.hp<=0)continue;const d=Math.hypot(b.x-player.x,b.y-player.y),a=Math.atan2(b.y-player.y,b.x-player.x);if(Math.abs(angle(a-player.a))<Math.atan(.3/d)&&ray(player.x,player.y,a,d)>d-.1&&Math.abs(player.pitch||0)<.43/(.65*d)&&d<best){target=b;best=d;}}
 if(target){target.hp-=34;say(target.hp<=0?'OBJETIVO ELIMINADO':'IMPACTO');}hud();if(bots.every(b=>b.hp<=0)){finished=true;end('¡Victoria! Eliminaste a toda la patrulla.');}
}
function beginReload(){if(!active)return;if(mode==='online'){if(socket?.readyState===1)socket.send(JSON.stringify({type:'reload'}));}else if(!reload&&player.ammo<24&&player.reserve>0){reload=1.6;say('RECARGANDO…');}}
el('play').onclick=()=>{const selected=el('mode').value;
if(selected==='solo'){if(socket){const old=socket;socket=null;old.onclose=null;old.onmessage=null;old.close();}if(mode!=='solo'||finished||!player){reset();finished=false;}mode='solo';active=true;el('overlay').style.display='none';document.querySelector('aside h2').textContent='Eliminá a la patrulla';captureMouse();return;}
mode='online';document.querySelector('aside h2').textContent='Partida multijugador';if(socket?.readyState===1){active=true;el('overlay').style.display='none';captureMouse();return;}el('play').disabled=true;el('message').textContent='Conectando a la partida…';socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}`);
socket.onmessage=e=>{const msg=JSON.parse(e.data);if(msg.type==='welcome'){myId=msg.id;reset();active=true;el('overlay').style.display='none';el('play').disabled=false;}if(msg.type==='state'&&player){const me=msg.players.find(p=>p.id===myId);if(!me)return;const before=player.hp;Object.assign(player,{x:me.x,y:me.y,hp:me.hp,ammo:me.ammo,reserve:me.reserve});reload=me.reloading?1:0;if(player.hp<before)hurt=.25;bots=msg.players.filter(p=>p.id!==myId);remaining=msg.remaining;el('round').textContent=`RONDA ${msg.round}`;hud();el('objective').textContent=bots.length?`${bots.length} rivales · ${me.kills} bajas · ${me.deaths} muertes`:'Esperando otros jugadores…';if(me.hp<=0)say('ELIMINADO · REAPARECÉS EN 3 SEGUNDOS');}if(msg.type==='hit')say(msg.kill?'BAJA CONFIRMADA':'IMPACTO');};
socket.onclose=()=>{end('Se perdió la conexión online. Elegí Un jugador para jugar contra bots, o volvé a conectar.');socket=null;el('play').disabled=false;el('play').textContent='CONECTAR →';};socket.onerror=()=>{el('message').textContent='No se pudo conectar con el servidor.';};};
let lastMouse=null,hadLock=false;
function inputHint(){el('mouse-status').textContent=document.pointerLockElement===canvas?'MOUSE CAPTURADO · ESC PARA PAUSAR':'MOUSE LIBRE · MOVÉ PARA APUNTAR · CLIC PARA CAPTURAR';}
function captureMouse(){
 lastMouse=null;inputHint();
 try{const pending=canvas.requestPointerLock?.();pending?.catch?.(()=>{lastMouse=null;inputHint();});}catch{inputHint();}
}
function pause(){active=false;keys.clear();lastMouse=null;document.exitPointerLock?.();el('overlay').style.display='grid';el('message').textContent='Operación en pausa.';el('play').textContent='CONTINUAR →';}
document.addEventListener('pointerlockchange',()=>{
 const locked=document.pointerLockElement===canvas;
 // A denied lock in an embedded preview must never stop the fallback controls.
 if(hadLock&&!locked&&active)pause();hadLock=locked;lastMouse=null;inputHint();
});
document.addEventListener('pointerlockerror',()=>{lastMouse=null;inputHint();});
document.addEventListener('mousemove',e=>{
 if(!active||!player)return;
 let dx=0,dy=0;
 if(document.pointerLockElement===canvas){dx=e.movementX||0;dy=e.movementY||0;}
 else{if(e.target!==canvas){lastMouse=null;return;}if(lastMouse){dx=e.clientX-lastMouse.x;dy=e.clientY-lastMouse.y;}lastMouse={x:e.clientX,y:e.clientY};}
 const sensitivity=Number(el('sensitivity').value)||2.5;
 player.a+=dx*sensitivity*.001;
 player.pitch=Math.max(-.65,Math.min(.65,(player.pitch||0)-dy*sensitivity*.001));
});
canvas.addEventListener('mouseleave',()=>{lastMouse=null;});
document.addEventListener('keydown',e=>{if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)shoot();if(e.code==='KeyR')beginReload();if(e.code==='Escape'&&active)pause();});
document.addEventListener('keyup',e=>keys.delete(e.code));canvas.addEventListener('mousedown',e=>{if(active&&document.pointerLockElement!==canvas)captureMouse();if(e.button===0)shoot();});window.addEventListener('blur',()=>{keys.clear();if(active)end('Operación en pausa. Podés continuar la ronda.');});
function update(dt){
if(!active)return;if(mode==='online'&&socket?.readyState!==1)return;
cooldown=Math.max(0,cooldown-dt);flash=Math.max(0,flash-dt);hurt=Math.max(0,hurt-dt);noticeTime-=dt;if(noticeTime<=0)el('notice').textContent='';
player.a+=((keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0))*dt*1.8;
const f=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),s=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),run=keys.has('ShiftLeft');
if(mode==='online'){socket.send(JSON.stringify({type:'input',a:player.a,f,s,run}));}
else{
 remaining=Math.max(0,remaining-dt);const speed=(run?3.4:2.3)*dt/(Math.hypot(f,s)||1);move(player,(Math.cos(player.a)*f-Math.sin(player.a)*s)*speed,(Math.sin(player.a)*f+Math.cos(player.a)*s)*speed);
 if(reload){reload=Math.max(0,reload-dt);if(!reload){const n=Math.min(24-player.ammo,player.reserve);player.ammo+=n;player.reserve-=n;}}
 for(const b of bots){if(b.hp<=0)continue;const d=Math.hypot(player.x-b.x,player.y-b.y),a=Math.atan2(player.y-b.y,player.x-b.x);if(ray(b.x,b.y,a,d)<d-.1)continue;if(d>3)move(b,Math.cos(a)*dt*.65,Math.sin(a)*dt*.65);b.t-=dt;if(b.t<=0){b.t=1.1;player.hp=Math.max(0,player.hp-8);hurt=.25;}}
 if(player.hp<=0||remaining<=0){finished=true;end(player.hp<=0?'Caíste en combate. Usá las coberturas y volvé a intentarlo.':'Tiempo agotado. Iniciá otra ronda.');}hud();
}
if(keys.has('Space'))shoot();el('damage').style.opacity=hurt*2;
}
function render(){
 const w=canvas.width,h=canvas.height,horizon=h/2+(player?.pitch||0)*h*.65;
 const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#4f7e96');sky.addColorStop(.6,'#bbd1d0');sky.addColorStop(1,'#e5c99e');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 if(!player)return;
 const floor=ctx.createLinearGradient(0,Math.max(0,horizon),0,h);floor.addColorStop(0,'#777f77');floor.addColorStop(1,'#343d3b');ctx.fillStyle=floor;ctx.fillRect(0,horizon,w,h-horizon);
 // Perspective seams give the courtyard a readable scale while moving.
 ctx.strokeStyle='#b4bdab22';ctx.lineWidth=1;
 for(let d=1;d<24;d++){const y=horizon+h/(d*2);if(y<h){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}}
 for(let x=0;x<w;x+=2){
  const a=player.a+Math.atan((x/w-.5)*1.3),raw=ray(player.x,player.y,a),d=Math.max(.05,raw*Math.cos(a-player.a)),height=h/d,top=horizon-height/2;
  const wx=player.x+Math.cos(a)*raw,wy=player.y+Math.sin(a)*raw,fx=wx-Math.floor(wx),fy=wy-Math.floor(wy);
  const side=Math.min(fx,1-fx)<Math.min(fy,1-fy),u=side?fy:fx;
  const boundary=wx<1.04||wx>14.96||wy<1.04||wy>14.96;
  const light=Math.max(.22,1-d*.038)*(side?.82:1),edge=u<.035||u>.965;
  const base=boundary?[187,164,123]:[91,114,98];const shade=light*(edge?.55:1);
  ctx.fillStyle=`rgb(${base.map(v=>Math.round(v*shade)).join(',')})`;ctx.fillRect(x,top,2,height);
  // Mortar, coping and crate bands are projected with each wall column.
  ctx.fillStyle=boundary?'#524c3b66':'#172c2799';
  const courses=boundary?6:3;
  for(let row=0;row<=courses;row++){const y=top+height*row/courses;if(y>=0&&y<=h)ctx.fillRect(x,y,2,Math.max(1,height*.012));}
  if(boundary){if((u+(Math.floor((horizon-top)/height*6)%2)*.5)%1<.025){ctx.fillStyle='#615a4522';ctx.fillRect(x,top,2,height);}}
  else if(Math.abs(u-.14)<.025||Math.abs(u-.86)<.025){ctx.fillStyle='#bac5a24d';ctx.fillRect(x,top,2,height);}
  ctx.fillStyle='#dcd5a066';ctx.fillRect(x,top,2,Math.max(1,height*.025));depth[x]=d;depth[x+1]=d;
 }
 for(const b of [...bots].filter(b=>b.hp>0).sort((a,b)=>Math.hypot(b.x-player.x,b.y-player.y)-Math.hypot(a.x-player.x,a.y-player.y))){
  const d=Math.hypot(b.x-player.x,b.y-player.y),rel=angle(Math.atan2(b.y-player.y,b.x-player.x)-player.a),z=d*Math.cos(rel);if(z<=.15||Math.abs(rel)>1)continue;
  const sx=w/2+Math.tan(rel)*w/1.3,size=h/z;
  for(let i=Math.max(0,Math.floor(sx-size*.21));i<Math.min(w,sx+size*.21);i++){
   if(z>=depth[i])continue;const u=(i-sx)/size;
   ctx.fillStyle='#161f21';if(Math.abs(u)<.105)ctx.fillRect(i,horizon-size*.46,1,size*.12);
   ctx.fillStyle='#c0a389';if(Math.abs(u)<.075)ctx.fillRect(i,horizon-size*.36,1,size*.09);
   ctx.fillStyle=Math.abs(u)<.12?'#9b704c':'#66543f';ctx.fillRect(i,horizon-size*.25,1,size*.38);
   ctx.fillStyle='#403d32';if(Math.abs(u)>.035)ctx.fillRect(i,horizon+size*.13,1,size*.32);
   ctx.fillStyle='#1a2226';ctx.fillRect(i,horizon-size*.12,1,size*.07);
   if(Math.abs(u)<.13){ctx.fillStyle='#cbb58b';ctx.fillRect(i,horizon-size*.21,1,size*.025);}
  }
 }
 const bob=active&&(keys.has('KeyW')||keys.has('KeyS'))?Math.sin(performance.now()/100)*3:0;
 const gx=w*.62,gy=h+bob+(reload?55:0)+(flash>0?8:0),unit=h/600;
 ctx.save();ctx.translate(gx,gy);ctx.scale(unit,unit);
 // Gloved hands, stock, magazine, receiver, barrel and iron sights.
 ctx.fillStyle='#6d7963';ctx.beginPath();ctx.moveTo(-80,0);ctx.lineTo(-45,-80);ctx.lineTo(0,-95);ctx.lineTo(80,0);ctx.fill();
 ctx.fillStyle='#202a2d';ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(-28,-92);ctx.lineTo(-19,-175);ctx.lineTo(15,-181);ctx.lineTo(70,-105);ctx.lineTo(150,0);ctx.fill();
 ctx.fillStyle='#526068';ctx.beginPath();ctx.moveTo(-14,-95);ctx.lineTo(-10,-173);ctx.lineTo(12,-178);ctx.lineTo(44,-100);ctx.fill();
 ctx.fillStyle='#111c21';ctx.fillRect(-6,-213,13,48);ctx.fillStyle='#81928a';ctx.fillRect(-4,-213,3,46);
 ctx.fillStyle='#1a252a';ctx.fillRect(-12,-182,25,12);ctx.fillRect(-8,-224,4,16);ctx.fillRect(5,-224,4,16);
 ctx.fillStyle='#8a9b95';ctx.fillRect(-10,-163,28,4);
 for(let i=0;i<6;i++){ctx.fillStyle='#15242a';ctx.fillRect(-3+i*3,-142+i*4,15,3);}
 ctx.fillStyle='#182226';ctx.beginPath();ctx.moveTo(15,-80);ctx.lineTo(44,-70);ctx.lineTo(65,0);ctx.lineTo(31,0);ctx.fill();
 ctx.fillStyle='#354542';ctx.fillRect(44,-80,29,29);
 if(flash>0){ctx.fillStyle='#fff3ac';ctx.beginPath();for(let i=0;i<12;i++){const a=i*Math.PI/6,r=i%2?12:34;ctx.lineTo(Math.cos(a)*r, -229+Math.sin(a)*r);}ctx.closePath();ctx.fill();}
 ctx.restore();
 const scale=4,ox=w-84,oy=70;ctx.fillStyle='#101b20cf';ctx.fillRect(ox-7,oy-7,78,78);
 map.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='1'){ctx.fillStyle='#829487';ctx.fillRect(ox+x*scale,oy+y*scale,scale,scale);}}));
 ctx.fillStyle='#e6ee9a';ctx.beginPath();ctx.arc(ox+player.x*scale,oy+player.y*scale,2.5,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#e6ee9a';ctx.beginPath();ctx.moveTo(ox+player.x*scale,oy+player.y*scale);ctx.lineTo(ox+player.x*scale+Math.cos(player.a)*8,oy+player.y*scale+Math.sin(player.a)*8);ctx.stroke();
 const vignette=ctx.createRadialGradient(w/2,h/2,h*.2,w/2,h/2,w*.65);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#06111999');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
}
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;update(dt);render();requestAnimationFrame(frame);}function resize(){canvas.width=Math.min(1280,innerWidth);canvas.height=Math.round(canvas.width*innerHeight/innerWidth);}addEventListener('resize',resize);resize();requestAnimationFrame(frame);
