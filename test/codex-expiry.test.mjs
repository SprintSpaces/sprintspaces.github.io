import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemo} from '../demo-core.mjs';
function memory(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}
function reply(status,data){return {status,headers:{get:()=>null},json:async()=>data}}
const ready={state:'ready',url:'https://fixture.byst.re/',username:'synthetic-user',password:'synthetic-password-123',expires_at:'2026-10-23T12:00:10Z'};
test('Codex: the known expiry must clear credentials even while the service is offline',async()=>{
 let now=Date.parse('2026-10-23T12:00:00Z');
 const script=[reply(202,{job:'j'.repeat(64)}),reply(200,ready),'offline'];
 const d=createDemo({api:'https://fixture.invalid',storage:memory(),randomBytes:b=>b.fill(42),now:()=>now,fetch:async()=>{const n=script.shift();if(n==='offline')throw Error('offline');return n}});
 await d.start('plain');await d.step();assert.equal(d.state.phase,'ready');
 now=Date.parse('2026-10-23T12:00:11Z');await d.step();
 assert.deepEqual({phase:d.state.phase,hasCredentials:!!d.state.creds},{phase:'ended',hasCredentials:false});
});
test('Codex: ready without a usable expiry must not show credentials',async(t)=>{
 for(const expires_at of [undefined,'not-a-date','']) await t.test(String(expires_at),async()=>{
  const script=[reply(202,{job:'j'.repeat(64)}),reply(200,{...ready,expires_at})];
  const d=createDemo({api:'https://fixture.invalid',storage:memory(),randomBytes:b=>b.fill(42),now:()=>Date.parse('2026-10-23T12:00:00Z'),fetch:async()=>script.shift()});
  await d.start('plain');await d.step();
  assert.deepEqual({ready:d.state.phase==='ready',hasCredentials:!!d.state.creds},{ready:false,hasCredentials:false});
 });
});
