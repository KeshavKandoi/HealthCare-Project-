import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../HealthCare/src/components/ECG/streamInput.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {parseStreamInput}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('accepts loop settings without executing code or trusting its patient id or URL',()=>{
 const input='for i in {1..300}; do BPM=$((RANDOM % 40 + 60)); VALUES="$(jot -r 10 80 120)"; curl http://localhost:4000/api/v1/ecg/data; done';
 assert.deepEqual(parseStreamInput(input),{packets:300});
 assert.throws(()=>parseStreamInput('rm -rf /'));
 assert.throws(()=>parseStreamInput(input.replace('300','999999')));
});
test('validates JSON values and packet count',()=>{
 const packet={values:Array(10).fill(90),bpm:80,packets:3};
 assert.deepEqual(parseStreamInput(JSON.stringify(packet)),packet);
 for(const body of [{...packet,values:[]},{...packet,bpm:'80'},{...packet,packets:-1},{...packet,values:Array(10).fill('90')},{...packet,bpm:999}])assert.throws(()=>parseStreamInput(JSON.stringify(body)));
});
