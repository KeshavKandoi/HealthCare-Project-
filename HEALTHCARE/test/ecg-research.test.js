import test from 'node:test';import assert from 'node:assert/strict';
import {estimateResearchBp,extractEcgFeatures} from '../dist/lib/ecgResearch.js';
const input={patientId:'a',samples:[],sampleRateHz:250,timingVerified:true,hasGaps:false,leadOff:false,calibration:null};
test('no model never fabricates ECG-only BP',async()=>{assert.match((await estimateResearchBp(input)).reason,/ECG-only/)});
test('sparse, flat and invalid ECG do not produce features',()=>{assert.equal(extractEcgFeatures(Array(3000).fill(1),250),null);assert.equal(extractEcgFeatures([NaN],250),null);assert.equal(extractEcgFeatures(Array(3000).fill(1),10),null)});
test('unevaluated model cannot run inference',async()=>{let called=false;const result=await estimateResearchBp(input,{evaluated:false,infer:async()=>{called=true}});assert.equal(result.status,'unavailable');assert.equal(called,false)});
test('unverified timing, gaps and lead-off block evaluated models',async()=>{const model={evaluated:true,id:'test',version:'1',evaluationDataset:'test-only',heldOutPatients:1,systolicMae:1,diastolicMae:1,artifactSha256:'a'.repeat(64),infer:async()=>{throw Error('must not run')}};for(const change of [{timingVerified:false},{hasGaps:true},{leadOff:true}])assert.match((await estimateResearchBp({...input,...change},model)).reason,/quality/)});
