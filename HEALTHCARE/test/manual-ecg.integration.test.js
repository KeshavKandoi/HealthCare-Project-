import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {manualEcgRouter} from '../dist/routes/manualEcg.js';

test('manual stream persists only owned simulated packets, rejects malformed and conflicting uploads', {skip:process.env.ECG_INTEGRATION_TEST!=='1'}, async()=>{
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
  const client=await pool.connect();
  let server;
  try {
    await client.query('begin');
    const patient=randomUUID(),other=randomUUID();
    for(const id of [patient,other])await client.query('insert into app_users(id,data) values($1,$2)',[id,{name:'Disposable stream test',email:`${id}@example.invalid`}]);
    // Route commits stay inside a test savepoint. Outer rollback removes ALL fixtures.
    const wrapped={query:(sql,args)=>client.query(sql==='begin'?'savepoint manual_test':sql==='commit'?'release savepoint manual_test':sql==='rollback'?'rollback to savepoint manual_test':sql,args),release:()=>{}};
    const app=express();app.use(express.json());
    app.use((req,res,next)=>{if(![patient,other].includes(req.headers['x-test-user']))return res.sendStatus(401);req.patientId=req.headers['x-test-user'];next()});
    app.use(manualEcgRouter(()=>({connect:async()=>wrapped})));
    app.use((e,req,res,next)=>res.status(500).json({error:e.message}));
    server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
    const request=async(path,body,user=patient)=>{const r=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method:'POST',headers:{'Content-Type':'application/json','x-test-user':user},body:JSON.stringify(body)});return {status:r.status,data:await r.json()}};
    const started=await request('/manual/start',{patientId:other});assert.equal(started.status,201,JSON.stringify(started.data));
    const id=started.data.id,packet={sequence:0,values:[80,90,100,110,100,90,80,85,95,105],bpm:84};
    assert.equal((await request(`/manual/${id}/packets`,packet,other)).status,404);
    assert.equal((await request(`/manual/${id}/packets`,{...packet,values:['bad']})).status,400);
    const result=await request(`/manual/${id}/packets`,packet);assert.equal(result.status,201,JSON.stringify(result.data));assert.deepEqual(result.data.batch.samples,packet.values);
    assert.equal((await request(`/manual/${id}/packets`,packet)).status,409);
    const {rows}=await client.query('select patient_id,is_simulated,sample_count from ecg_recording_sessions where id=$1',[id]);
    assert.equal(rows[0].patient_id,patient);assert.equal(rows[0].is_simulated,true);assert.equal(Number(rows[0].sample_count),10);
    const again=await request('/manual/start',{});assert.equal(again.status,201);assert.equal(again.data.deviceId,started.data.deviceId);
    assert.equal((await client.query('select status from ecg_recording_sessions where id=$1',[id])).rows[0].status,'completed');
    assert.equal((await request(`/manual/${id}/packets`,{...packet,sequence:1})).status,404);
  } finally {
    if(server)await new Promise(resolve=>server.close(resolve));
    await client.query('rollback');client.release();await pool.end();
  }
});

test('simulated stream follows backoffice modes and keeps leads-off time as a gap', {skip:process.env.ECG_INTEGRATION_TEST!=='1'}, async()=>{
  const {simulationPacket}=await import('../dist/lib/ecgSimulation.js');
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
  const client=await pool.connect();
  let server;
  try {
    await client.query('begin');
    const patient=randomUUID();
    await client.query('insert into app_users(id,data) values($1,$2)',[patient,{name:'Disposable simulation test',email:`${patient}@example.invalid`}]);
    const wrapped={query:(sql,args)=>client.query(sql==='begin'?'savepoint mode_test':sql==='commit'?'release savepoint mode_test':sql==='rollback'?'rollback to savepoint mode_test':sql,args),release:()=>{}};
    const app=express();app.use(express.json());
    app.use((req,res,next)=>{req.patientId=patient;next()});
    app.use(manualEcgRouter(()=>({connect:async()=>wrapped})));
    app.use((e,req,res,next)=>res.status(500).json({error:e.message}));
    server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
    const request=async(path,body)=>{const r=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()}};
    const started=await request('/manual/simulated/start',{});assert.equal(started.status,201,JSON.stringify(started.data));
    const id=started.data.id;
    // Start ten seconds in the past so later one-second packets are not in the future.
    const {rows:[{started_at}]}=await client.query("update ecg_recording_sessions set started_at=started_at-interval '10 seconds' where id=$1 returning started_at",[id]);
    const packet=(sequence,mode,samplesMode=mode)=>({sequence,firstSampleAt:new Date(started_at.getTime()+sequence*1000).toISOString(),sampleRateHz:250,samples:simulationPacket(sequence,{scenario:'resting-v2',seed:20261029,mode:samplesMode}),source:'simulated',scenario:'resting-v2',seed:20261029,...(mode?{mode}:{})});
    const first=await request(`/manual/simulated/${id}/packets`,packet(0));assert.equal(first.status,201,JSON.stringify(first.data));assert.equal(first.data.batch.mode,'normal');
    const workout=await request(`/manual/simulated/${id}/packets`,packet(1,'post-workout'));assert.equal(workout.status,201);assert.ok(workout.data.batch.bpm>130);
    assert.equal((await request(`/manual/simulated/${id}/packets`,packet(2,'heavy-breathing','normal'))).status,400);
    assert.equal((await request(`/manual/simulated/${id}/packets`,packet(2,'off','normal'))).status,400);
    // Seconds 2-4 had no signal (leads off); the stream resumes at second 5.
    const resumed=await request(`/manual/simulated/${id}/packets`,packet(5,'heavy-breathing'));assert.equal(resumed.status,201,JSON.stringify(resumed.data));
    assert.equal((await request(`/manual/simulated/${id}/packets`,packet(4,'normal'))).status,409);
    const {rows}=await client.query('select sequence from ecg_recording_chunks where session_id=$1 order by sequence',[id]);
    assert.deepEqual(rows.map(row=>Number(row.sequence)),[0,1,5]);
    const {rows:[session]}=await client.query('select last_sequence,sample_count from ecg_recording_sessions where id=$1',[id]);
    assert.equal(Number(session.last_sequence),5);assert.equal(Number(session.sample_count),750);
  } finally {
    if(server)await new Promise(resolve=>server.close(resolve));
    await client.query('rollback');client.release();await pool.end();
  }
});
