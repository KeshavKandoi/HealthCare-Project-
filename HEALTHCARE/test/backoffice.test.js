import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {backofficeRouter} from '../dist/routes/backofficeRoutes.js';

// Minimal stand-in for the settings table: create, select and upsert of the single mode row.
function memoryDatabase(){
 let row=null;
 return ()=>({query:async(sql,params)=>{
  if(/^create table/.test(sql))return {rows:[]};
  if(/^select/.test(sql))return {rows:row?[row]:[]};
  if(/^insert/.test(sql)){row={value:JSON.parse(params[0]),updated_at:params[1]};return {rows:[]}}
  throw new Error(`Unexpected query: ${sql}`);
 }});
}
async function serve(pool){
 const events=[],app=express();app.use(express.json());app.use(backofficeRouter(state=>events.push(state),pool));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const call=async(method,path,body,token)=>{const r=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body&&JSON.stringify(body)});return {status:r.status,data:await r.json()}};
 return {call,events,close:()=>new Promise(resolve=>server.close(resolve))};
}

test('backoffice signs in only with the configured email and password',async()=>{
 const api=await serve(memoryDatabase());
 try{
  assert.equal((await api.call('POST','/login',{email:'keshavkandoi@gmail.com',password:'wrong-password'})).status,401);
  assert.equal((await api.call('POST','/login',{email:'someone@example.com',password:'keshavkandoi'})).status,401);
  assert.equal((await api.call('POST','/login',{email:'keshavkandoi@gmail.com'})).status,401);
  const signed=await api.call('POST','/login',{email:' KeshavKandoi@gmail.com ',password:'keshavkandoi'});
  assert.equal(signed.status,200);assert.match(signed.data.token,/^bo_/);assert.ok(Date.parse(signed.data.expiresAt)>Date.now());
  assert.deepEqual((await api.call('GET','/session',null,signed.data.token)).data,{email:'keshavkandoi@gmail.com',expiresAt:signed.data.expiresAt});
  const tampered=signed.data.token.replace(/.$/,c=>c==='A'?'B':'A');
  assert.equal((await api.call('GET','/session',null,tampered)).status,401);
  assert.equal((await api.call('GET','/session')).status,401);
 }finally{await api.close()}
});

test('waveform mode is public to read, changed only by the backoffice, broadcast and persisted',async()=>{
 const database=memoryDatabase(),api=await serve(database);
 try{
  assert.deepEqual((await api.call('GET','/waveform')).data,{mode:'normal',updatedAt:null});
  assert.equal((await api.call('PUT','/waveform',{mode:'off'})).status,401);
  const {token}=(await api.call('POST','/login',{email:'keshavkandoi@gmail.com',password:'keshavkandoi'})).data;
  assert.equal((await api.call('PUT','/waveform',{mode:'sprinting'},token)).status,400);
  const changed=await api.call('PUT','/waveform',{mode:'off'},token);
  assert.equal(changed.status,200);assert.equal(changed.data.mode,'off');assert.equal(changed.data.persisted,true);
  assert.deepEqual(api.events.map(event=>event.mode),['off']);
  assert.equal((await api.call('GET','/waveform')).data.mode,'off');
 }finally{await api.close()}
 const restarted=await serve(database);
 try{assert.equal((await restarted.call('GET','/waveform')).data.mode,'off')}finally{await restarted.close()}
});

test('without a database the mode is kept in memory',async()=>{
 const api=await serve(()=>{throw new Error('DATABASE_URL is required')});
 try{
  const {token}=(await api.call('POST','/login',{email:'keshavkandoi@gmail.com',password:'keshavkandoi'})).data;
  const changed=await api.call('PUT','/waveform',{mode:'heavy-breathing'},token);
  assert.equal(changed.status,200);assert.equal(changed.data.persisted,false);
  assert.equal((await api.call('GET','/waveform')).data.mode,'heavy-breathing');
 }finally{await api.close()}
});

test('repeated sign-in attempts are rate limited',async()=>{
 const api=await serve(memoryDatabase());
 try{
  for(let attempt=0;attempt<10;attempt++)assert.equal((await api.call('POST','/login',{email:'keshavkandoi@gmail.com',password:'guess'})).status,401);
  assert.equal((await api.call('POST','/login',{email:'keshavkandoi@gmail.com',password:'keshavkandoi'})).status,429);
 }finally{await api.close()}
});
