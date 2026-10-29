import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
async function moduleAt(path){const source=await readFile(new URL(path,import.meta.url),'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)}
const {signalSegments,reduceToPixels,inspectSignal,initialScale}=await moduleAt('../HealthCare/src/components/ECG/signal.ts');
const {simulationPacket,scenarioVitals}=await moduleAt('../lib/ecgSimulation.ts');
const fixture=JSON.parse(await readFile(new URL('./fixtures/ecg/mitdb-100-30s.json',import.meta.url),'utf8'));
const start=Date.parse('2026-01-01T00:00:00Z');
const chunk=(sequence,samples,time=start+sequence*1000)=>({sequence,samples,first_sample_at:new Date(time).toISOString()});
test('licensed reference retains all 10800 actual values and 360 Hz timing',()=>{
 const chunks=Array.from({length:30},(_,i)=>chunk(i,fixture.samples.slice(i*360,(i+1)*360)));
 const segments=signalSegments(chunks,360,start,start+30000);
 assert.equal(segments.length,1);assert.deepEqual(segments[0].map(p=>p.value),fixture.samples);
 assert.ok(Math.abs(segments[0][359].time-start-359000/360)<0.001);
 assert.deepEqual(initialScale(chunks,'mV'),{center:0,perDivision:.5});
});
test('missing packets and clock overlaps remain separate segments',()=>{
 assert.equal(signalSegments([chunk(0,[1,2]),chunk(2,[3,4],start+2000)],2,start,start+4000).length,2);
 assert.equal(signalSegments([chunk(0,[1,2]),chunk(1,[3,4],start+500)],2,start,start+4000).length,2);
 assert.equal(signalSegments([chunk(0,[1,NaN,2])],3,start,start+4000).length,2);
});
test('pixel reduction preserves extrema and chronological sample order',()=>{
 const points=Array.from({length:10000},(_,i)=>({time:i,value:i===99?100:i===50?-100:0,index:i}));
 const reduced=reduceToPixels(points,0,10000,100);
 assert.ok(reduced.length<=400);assert.ok(reduced.some(p=>p.value===100));assert.ok(reduced.some(p=>p.value===-100));
 assert.ok(reduced.every((p,i)=>i===0||p.time>reduced[i-1].time));
});
test('source repetition is diagnosed, never synthesized to fill time',()=>{
 const chunks=[chunk(0,[80,90,100,110,100,90,80,85,95,105]),chunk(1,[80,90,100,110,100,90,80,85,95,105])];
 assert.equal(inspectSignal(chunks,10).repeatedChunks,1);
 assert.equal(signalSegments(chunks,10,start,start+10000).flat().length,20);
});
test('simulation has deterministic morphology and slowly varying independent BP',()=>{
 assert.equal(simulationPacket(0).length,250);assert.notDeepEqual(simulationPacket(0),simulationPacket(1));
 const values=simulationPacket(0);assert.ok(Math.max(...values)>.9);assert.ok(Math.min(...values)<-.15);
 for(let t=1;t<300;t++){const a=scenarioVitals(t-1,{scenario:'resting-v1'}),b=scenarioVitals(t,{scenario:'resting-v1'});assert.ok(Math.abs(a.systolic-b.systolic)<.1);assert.ok(Math.abs(a.bpm-b.bpm)<.11);assert.ok(b.systolic>b.diastolic)}
});

test('v2 seeded waveform is deterministic, varies with seed, and BP/HR rise then recover',()=>{
 const config={scenario:'resting-v2',seed:20261029};
 assert.deepEqual(simulationPacket(90,config),simulationPacket(90,config));
 assert.notDeepEqual(simulationPacket(90,config),simulationPacket(90,{...config,seed:7}));
 const rest=scenarioVitals(10,config),active=scenarioVitals(105,config),recovery=scenarioVitals(220,config);
 assert.ok(active.bpm>rest.bpm+15);assert.ok(recovery.bpm<active.bpm-15);
 assert.ok(active.systolic>rest.systolic+8);assert.ok(recovery.systolic<active.systolic-8);
 for(let t=1;t<480;t++){const a=scenarioVitals(t-1,config),b=scenarioVitals(t,config);assert.ok(Math.abs(a.bpm-b.bpm)<4);assert.ok(Math.abs(a.systolic-b.systolic)<1.6);assert.ok(Math.abs(a.diastolic-b.diastolic)<1)}
 const values=Array.from({length:15},(_,i)=>simulationPacket(i+80,config)).flat();
 const peaks=[];for(let i=1;i<values.length-1;i++)if(values[i]>.8&&values[i]>=values[i-1]&&values[i]>values[i+1])peaks.push(i);
 assert.ok(peaks.length>20);
 for(let i=1;i<peaks.length;i++){const bpm=60*250/(peaks[i]-peaks[i-1]);const t=80+(peaks[i]+peaks[i-1])/500;assert.ok(Math.abs(bpm-scenarioVitals(t,config).bpm)<1)}
});

test('backoffice modes are deterministic and normal stays identical to resting-v2',()=>{
 const config={scenario:'resting-v2',seed:20261029};
 for(const second of [0,45,105,230])assert.deepEqual(simulationPacket(second,{...config,mode:'normal'}),simulationPacket(second,config));
 for(const mode of ['post-workout','heavy-breathing']){
  assert.deepEqual(simulationPacket(30,{...config,mode}),simulationPacket(30,{...config,mode}));
  assert.notDeepEqual(simulationPacket(30,{...config,mode}),simulationPacket(30,config));
 }
});
test('post-workout keeps a high heart rate whose R-R timing matches the reported BPM',()=>{
 const config={scenario:'resting-v2',seed:20261029,mode:'post-workout'};
 for(let t=0;t<600;t++){const v=scenarioVitals(t,config);assert.ok(v.bpm>130&&v.bpm<160);assert.ok(v.systolic>140&&v.systolic>v.diastolic)}
 const values=Array.from({length:10},(_,i)=>simulationPacket(i+60,config)).flat();
 const peaks=[];for(let i=1;i<values.length-1;i++)if(values[i]>.7&&values[i]>=values[i-1]&&values[i]>values[i+1])peaks.push(i);
 assert.ok(peaks.length>=22);
 for(let i=1;i<peaks.length;i++){const bpm=60*250/(peaks[i]-peaks[i-1]);const t=60+(peaks[i]+peaks[i-1])/500;assert.ok(Math.abs(bpm-scenarioVitals(t,config).bpm)<1.5)}
});
test('heavy breathing swings heart rate with each breath and moves the baseline',()=>{
 const config={scenario:'resting-v2',seed:20261029};
 const bpm=Array.from({length:30},(_,t)=>scenarioVitals(t,{...config,mode:'heavy-breathing'}).bpm);
 assert.ok(Math.max(...bpm)-Math.min(...bpm)>18);
 const mean=bpm.reduce((sum,v)=>sum+v,0)/bpm.length;assert.ok(mean>95&&mean<115);
 const spread=mode=>{const means=Array.from({length:12},(_,t)=>simulationPacket(t+20,{...config,mode}).reduce((sum,v)=>sum+v,0)/250);return Math.max(...means)-Math.min(...means)};
 assert.ok(spread('heavy-breathing')>.2);assert.ok(spread('normal')<.1);
});
