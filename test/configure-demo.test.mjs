import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredPage, configuredPages } from '../tools/configure-demo.mjs';

const html = '<meta name="demo-api" content="">';
const answer = (status = 200, origin = 'https://sprintspaces.github.io', data = {active:0,max:3,total_ready:2,ttl_seconds:900,expiry_policy:'idle',idle_timeout_seconds:900}) => ({status,headers:{get:()=>origin},json:async()=>data});

test('both language pages receive the verified API origin with one live check', async () => {
  let calls = 0;
  const pages = [html, '<html lang="en">' + html + '</html>'];
  const result = await configuredPages(pages, 'https://demo.byst.re/', async () => { calls++; return answer(); });
  assert.equal(calls, 1);
  result.forEach(page => assert.ok(page.includes('content="https://demo.byst.re"')));
  await assert.rejects(configuredPages([html, '<html></html>'], 'https://demo.byst.re', async () => { calls++; return answer(); }));
  assert.equal(calls, 1, 'validate every locale before contacting the service');
});

test('publication requires live counters and the exact site CORS origin', async () => {
  const calls=[];
  const configured=await configuredPage(html,'https://demo.byst.re/',async (...args)=>{calls.push(args);return answer();});
  assert.equal(configured,'<meta name="demo-api" content="https://demo.byst.re">');
  assert.equal(calls[0][0],'https://demo.byst.re/v1/stats');
  assert.equal(calls[0][1].credentials,'omit');
  assert.equal(calls[0][1].headers.Origin,'https://sprintspaces.github.io');
  for (const res of [answer(503),answer(200,'*'),answer(200,'https://other.example'),answer(200,undefined,{active:4,max:3,total_ready:2,ttl_seconds:900,expiry_policy:'idle',idle_timeout_seconds:900}),answer(200,undefined,{active:0,max:3,total_ready:2,ttl_seconds:14400}),answer(200,undefined,{active:0,max:10,total_ready:2,ttl_seconds:900,expiry_policy:'idle',idle_timeout_seconds:900})]) {
    await assert.rejects(configuredPage(html,'https://demo.byst.re',async()=>res));
  }
});

test('publication never accepts a secret or a path as an API origin', async () => {
  let fetched=false;
  for (const origin of ['http://demo.byst.re','https://user:secret@demo.byst.re','https://demo.byst.re?secret=x','https://demo.byst.re/v1/hooks/demo','https://demo.byst.re:8443']) {
    await assert.rejects(configuredPage(html,origin,async()=>{fetched=true;return answer();}));
  }
  assert.equal(fetched,false);
  await assert.rejects(configuredPage(html+html,'https://demo.byst.re',async()=>answer()));
});
