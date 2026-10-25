import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDemoTabs } from '../demo-tabs.mjs';
const KEY='sprintspaces-demo';
const job={key:'a'.repeat(32),job:'b'.repeat(64),profile:'plain',wasReady:true};
function memory(value){const m=new Map(value?[[KEY,JSON.stringify(value)]]:[]);return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};}
function bus(){const peers=[],messages=[];return {messages,channel(){const listeners=[];const peer={addEventListener:(_,f)=>listeners.push(f),postMessage(m){messages.push(m);queueMicrotask(()=>{for(const p of peers)if(p!==listeners)for(const f of p)f({data:m});});}};peers.push(listeners);return peer;}};}
test('a second same-origin tab recovers the existing private job without credentials or persistent storage',async()=>{
 const b=bus(),owner=memory({...job,password:'PRIVATE',username:'PRIVATE',url:'PRIVATE'}),other=memory();
 connectDemoTabs({storage:owner,channel:b.channel()});
 const next=connectDemoTabs({storage:other,channel:b.channel()});
 assert.equal(await next.recover(),true);
 assert.deepEqual(JSON.parse(other.getItem(KEY)),job);
 assert.ok(!JSON.stringify(b.messages).includes('PRIVATE'));
});
test('an unrelated or malformed channel response cannot replace an owned job',async()=>{
 const b=bus(),own=memory(job);const next=connectDemoTabs({storage:own,channel:b.channel()});
 assert.equal(await next.recover(),false);
 const isolated=bus(); const missing=memory(); const recovering=connectDemoTabs({storage:missing,channel:isolated.channel(),nonce:()=> 'expected',delay:f=>setTimeout(f,5)});
 const result=recovering.recover();isolated.channel().postMessage({type:'response',nonce:'other',record:job});isolated.channel().postMessage({type:'response',nonce:'expected',record:{...job,job:'invalid'}});
 assert.equal(await result,false);assert.equal(missing.getItem(KEY),null);
});
test('a browser without a channel continues normally',async()=>{assert.equal(await connectDemoTabs({storage:memory(),channel:null}).recover(),false);});
