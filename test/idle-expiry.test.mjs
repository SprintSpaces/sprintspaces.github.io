import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemo} from '../demo-core.mjs';
const response = data => ({status:200,headers:{get:()=>null},json:async()=>data});
const ready = expires_at => response({state:'ready',expiry_policy:'idle',idle_timeout_seconds:900,url:'https://fixture.byst.re/',username:'synthetic-user',password:'synthetic-password-123',expires_at});
function setup(script) {
 let time=Date.parse('2026-10-24T12:00:00Z');const values=new Map();const states=[];
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const demo=createDemo({api:'https://fixture.invalid',storage,now:()=>time,randomBytes:b=>b.fill(41),onChange:s=>states.push(s),fetch:async()=>{let r=script.shift();if(r==='offline')throw Error('network');return r}});
 return {demo,storage,states,setTime:t=>{time=Date.parse(t)}};
}
test('idle deadline advances from backend activity without revealing expired credentials during revalidation',async()=>{
 const f=setup([response({job:'j'.repeat(64)}),ready('2026-10-24T12:00:30Z'),ready('2026-10-24T12:15:20Z'),response({state:'ended'})]);
 await f.demo.start('plain');await f.demo.step();
 f.setTime('2026-10-24T12:00:31Z');assert.equal(await f.demo.step(),5000);
 assert.equal(f.demo.state.phase,'ready');assert.equal(f.demo.state.expiresAt,Date.parse('2026-10-24T12:15:20Z'));
 assert.ok(f.states.some(s=>s.phase==='checking'&&s.creds===null));assert.ok(f.storage.getItem('sprintspaces-demo'));
 f.setTime('2026-10-24T12:15:21Z');await f.demo.step();assert.equal(f.demo.state.phase,'ended');assert.equal(f.demo.state.creds,null);assert.equal(f.storage.getItem('sprintspaces-demo'),null);
});
test('offline at the old idle deadline hides access but retains the private job for recovery',async()=>{
 const f=setup([response({job:'j'.repeat(64)}),ready('2026-10-24T12:00:30Z'),'offline',ready('2026-10-24T12:15:20Z')]);
 await f.demo.start('plain');await f.demo.step();f.setTime('2026-10-24T12:00:31Z');
 await f.demo.step();assert.equal(f.demo.state.phase,'checking');assert.equal(f.demo.state.creds,null);assert.ok(f.storage.getItem('sprintspaces-demo'));
 await f.demo.step();assert.equal(f.demo.state.phase,'ready');assert.equal(f.demo.state.creds.username,'synthetic-user');
});
