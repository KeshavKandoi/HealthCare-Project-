import {test} from 'node:test';import assert from 'node:assert/strict';import jwt from 'jsonwebtoken';import {patientAuth} from '../dist/middlewares/ecgAuth.js';
process.env.JWT_SECRET='patient-test-secret';
function run(req){let code=0,called=false;patientAuth(req,{status(n){code=n;return this},json(){}},()=>{called=true});return {code,called,patientId:req.patientId}}
test('health and appointment identity is taken from signed JWT',()=>{const token=jwt.sign({id:'owner'},process.env.JWT_SECRET);const result=run({headers:{authorization:`Bearer ${token}`},body:{userId:'victim'},params:{id:'victim'}});assert.equal(result.patientId,'owner');assert.equal(result.called,true)});
test('unsigned patient requests are rejected',()=>{assert.equal(run({headers:{}}).code,401);assert.equal(run({headers:{authorization:'Bearer bad'}}).code,401)});
