import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {WebSocketServer,WebSocket} from 'ws';
import {randomUUID} from 'node:crypto';
import {map} from './web/map.js';

const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/game.js':'game.js','/map.js':'map.js'};
const server=http.createServer(async(req,res)=>{const name=files[req.url?.split('?')[0]];if(!name){res.writeHead(404).end('Not found');return;}try{const body=await readFile(fileURLToPath(new URL(`./web/${name}`,import.meta.url)));res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html','X-Content-Type-Options':'nosniff'}).end(body);}catch{res.writeHead(500).end('Server error');}});
const wss=new WebSocketServer({server,maxPayload:1024});
const players=new Map(),spawns=[[2.5,13.5],[12.5,2.5],[2.5,2.5],[13.5,13.5]];
let round=1,remaining=180;
const wall=(x,y)=>map[Math.floor(y)]?.[Math.floor(x)]!=='0';
const clear=(x,y)=>!wall(x-.22,y-.22)&&!wall(x+.22,y-.22)&&!wall(x-.22,y+.22)&&!wall(x+.22,y+.22);
function spawn(p){const points=[...spawns].sort((a,b)=>distance(b)-distance(a));function distance(v){return Math.min(100,...[...players.values()].filter(q=>q!==p&&q.hp>0).map(q=>Math.hypot(v[0]-q.x,v[1]-q.y)));} [p.x,p.y]=points[0];Object.assign(p,{hp:100,ammo:24,reserve:120,reloading:0,dead:0,input:{f:0,s:0,a:0,run:false}});}
function visible(p,q){const d=Math.hypot(q.x-p.x,q.y-p.y);for(let t=0;t<d;t+=.04)if(wall(p.x+(q.x-p.x)*t/d,p.y+(q.y-p.y)*t/d))return false;return true;}
wss.on('connection',ws=>{if(players.size>=16){ws.close(1013,'Partida llena');return;}const id=randomUUID(),p={id,ws,kills:0,deaths:0,lastShot:0,lastInput:0};spawn(p);players.set(id,p);ws.send(JSON.stringify({type:'welcome',id}));ws.on('close',()=>players.delete(id));ws.on('error',()=>ws.close());ws.on('message',data=>{let m;try{m=JSON.parse(data);}catch{return;}if(!m||typeof m!=='object'||p.hp<=0)return;const now=Date.now();if(m.type==='input'&&Number.isFinite(m.a)&&[-1,0,1].includes(m.f)&&[-1,0,1].includes(m.s)){p.input={a:m.a,f:m.f,s:m.s,run:m.run===true};p.lastInput=now;}if(m.type==='reload'&&!p.reloading&&p.ammo<24&&p.reserve>0)p.reloading=now+1600;if(m.type==='shoot'&&Number.isFinite(m.a)&&now-p.lastShot>=155&&!p.reloading&&p.ammo>0){p.lastShot=now;p.ammo--;let target,best=Infinity;for(const q of players.values()){if(q===p||q.hp<=0)continue;const d=Math.hypot(q.x-p.x,q.y-p.y),a=Math.atan2(q.y-p.y,q.x-p.x)-m.a;if(Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))<Math.atan(.3/d)&&d<best&&visible(p,q)){target=q;best=d;}}if(target){target.hp=Math.max(0,target.hp-34);if(!target.hp){target.deaths++;target.dead=now+3000;p.kills++;}ws.send(JSON.stringify({type:'hit',kill:!target.hp}));}}});});
const timer=setInterval(()=>{const now=Date.now();remaining-=.05;if(remaining<=0){round++;remaining=180;for(const p of players.values()){p.kills=0;p.deaths=0;spawn(p);}}for(const p of players.values()){if(p.hp<=0){if(now>=p.dead)spawn(p);continue;}if(p.reloading&&now>=p.reloading){const n=Math.min(24-p.ammo,p.reserve);p.ammo+=n;p.reserve-=n;p.reloading=0;}if(now-p.lastInput>250)continue;const {f,s,a,run}=p.input,n=Math.hypot(f,s)||1,speed=(run?3.4:2.3)*.05/n,dx=(Math.cos(a)*f-Math.sin(a)*s)*speed,dy=(Math.sin(a)*f+Math.cos(a)*s)*speed;if(clear(p.x+dx,p.y))p.x+=dx;if(clear(p.x,p.y+dy))p.y+=dy;}
const message=JSON.stringify({type:'state',round,remaining,players:[...players.values()].map(({id,x,y,hp,ammo,reserve,kills,deaths,reloading})=>({id,x,y,hp,ammo,reserve,kills,deaths,reloading:!!reloading}))});for(const p of players.values())if(p.ws.readyState===WebSocket.OPEN&&p.ws.bufferedAmount<65536)p.ws.send(message);},50);
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log(`Tapechi listening on port ${server.address().port}`));
function shutdown(){clearInterval(timer);for(const p of players.values())p.ws.terminate();wss.close();server.close();}process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
