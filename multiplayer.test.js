import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {WebSocket} from 'ws';

test('two players connect, move with server collision, shoot, reload and disconnect', {timeout:25000}, async()=>{
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3101'},stdio:['ignore','pipe','pipe']});
 const clients=[];try{
 await once(child.stdout,'data');
 const response=await fetch('http://127.0.0.1:3101/');assert.equal(response.status,200);assert.match(await response.text(),/TAPECHI/);
 const connect=async()=>{const ws=new WebSocket('ws://127.0.0.1:3101');clients.push(ws);let state,id;ws.on('message',raw=>{const msg=JSON.parse(raw);if(msg.type==='welcome')id=msg.id;if(msg.type==='state')state=msg;});await once(ws,'open');return {ws,get state(){return state;},get id(){return id;}};};
 const a=await connect(),b=await connect();
 const until=async f=>{const deadline=Date.now()+5000;while(!f()){if(Date.now()>deadline)throw Error('Timed out waiting for game state');await new Promise(r=>setTimeout(r,30));}};
 await until(()=>a.state?.players.length===2&&b.state?.players.length===2);
 const me=()=>a.state.players.find(p=>p.id===a.id);const start=me().x;
 const moving=setInterval(()=>a.ws.send(JSON.stringify({type:'input',f:1,s:0,a:Math.PI,run:true})),50);
 await new Promise(r=>setTimeout(r,650));clearInterval(moving);a.ws.send(JSON.stringify({type:'input',f:0,s:0,a:0}));await until(()=>me().x<start);assert.ok(me().x>=1.22,'player cannot cross perimeter wall');
 a.ws.send(JSON.stringify({type:'shoot',a:0}));await until(()=>me().ammo===23);
 a.ws.send(JSON.stringify({type:'reload'}));await until(()=>me().reloading);await until(()=>me().ammo===24&&!me().reloading);assert.equal(me().reserve,119);
 a.ws.send('{');a.ws.send(JSON.stringify({type:'input',f:999,s:0,a:0}));await new Promise(r=>setTimeout(r,100));assert.ok(Number.isFinite(me().x));
 const rival=()=>a.state.players.find(p=>p.id===b.id);
 const travel=async(a,f,done)=>{const tick=setInterval(()=>b.ws.send(JSON.stringify({type:'input',f,s:0,a,run:true})),40);try{await until(done);}finally{clearInterval(tick);b.ws.send(JSON.stringify({type:'input',f:0,s:0,a}));}};
 await travel(0,1,()=>rival().x>=14);
 await travel(Math.PI/2,1,()=>rival().y>=13.5);
 for(let i=0;i<3;i++){const q=rival(),p=me();a.ws.send(JSON.stringify({type:'shoot',a:Math.atan2(q.y-p.y,q.x-p.x)}));await new Promise(r=>setTimeout(r,190));}
 await until(()=>me().kills===1&&rival().hp===0);assert.equal(rival().deaths,1);
 await until(()=>rival().hp===100);
 b.ws.close();await until(()=>a.state.players.length===1);
 }finally{for(const ws of clients)ws.terminate();child.kill();await once(child,'exit');}
});
