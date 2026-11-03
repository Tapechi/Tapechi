import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {map} from './web/map.js';

test('solo combat, cover, reload, pause and round completion need no socket',async()=>{
 const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{style:{},textContent:'',value:'solo',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},getContext(){return {};},requestPointerLock(){}});return elements.get(id);};
 const context=vm.createContext({map,console,Math,Set,performance:{now:()=>0},innerWidth:800,innerHeight:600,requestAnimationFrame(){},addEventListener(){},window:{addEventListener(){}},document:{querySelector:element,getElementById:element,listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},exitPointerLock(){}},WebSocket:class{constructor(){throw Error('Solo must not connect');}}});
 const source=(await readFile(new URL('./web/game.js',import.meta.url),'utf8')).replace("import { map } from './map.js';",'');vm.runInContext(source,context);
 const run=code=>vm.runInContext(code,context);
 run("el('play').onclick()");assert.equal(run('active'),true);assert.equal(run('socket'),undefined);
 run('player.x=2.5;player.y=13.5;player.a=0;bots=[{x:5.5,y:13.5,hp:100,t:10}];shoot()');assert.equal(run('bots[0].hp'),66);assert.equal(run('player.ammo'),23);
 run('beginReload();update(1.7)');assert.equal(run('player.ammo'),24);assert.equal(run('player.reserve'),119);
 run('bots=[{x:5.5,y:11.5,hp:100,t:10}];player.x=2.5;player.y=11.5;player.a=0;cooldown=0;shoot()');assert.equal(run('bots[0].hp'),100,'cover blocks shots');
 run('active=false');const time=run('remaining');run('update(1)');assert.equal(run('remaining'),time);
 run('active=true;bots=[{x:5.5,y:13.5,hp:34,t:10}];player.x=2.5;player.y=13.5;cooldown=0;shoot()');assert.equal(run('finished'),true);assert.equal(run('active'),false);
 run("el('play').onclick()");assert.equal(run('bots.length'),3);assert.equal(run('player.hp'),100);
 run('bots=[{x:2.5,y:12,hp:100,t:0}];player.hp=8;update(.1)');assert.equal(run('player.hp'),0);assert.equal(run('finished'),true);
 // Sandboxed previews may reject pointer lock. Mouse fallback must remain playable.
 run("canvas.requestPointerLock=()=>{throw Error('Denied by iframe')};el('play').onclick()");
 assert.equal(run('active'),true);
 run("el('sensitivity').value='2.5';lastMouse=null;document.listeners.mousemove({target:canvas,clientX:200,clientY:200});document.listeners.mousemove({target:canvas,clientX:300,clientY:240})");
 assert.ok(Math.abs(run('player.a')-(-Math.PI/2+.25))<.001);assert.ok(Math.abs(run('player.pitch')+.1)<.001);
 run('document.listeners.pointerlockerror()');assert.equal(run('active'),true);
 run('document.pointerLockElement=canvas;document.listeners.mousemove({movementX:20,movementY:-20})');assert.ok(Math.abs(run('player.pitch')+.05)<.001);
 run('document.listeners.mousemove({movementX:0,movementY:-10000})');assert.equal(run('player.pitch'),.65);
 run('player.x=2.5;player.y=13.5;player.a=0;bots=[{x:5.5,y:13.5,hp:100,t:10}];cooldown=0;shoot()');assert.equal(run('bots[0].hp'),100,'aiming above a target must miss');

});
