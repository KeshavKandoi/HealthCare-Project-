// macOS USB serial gateway. For a dedicated, freshly started recording only.
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [port, sessionId] = process.argv.slice(2);
if (!port || !/^\/dev\/cu\.[\w.-]+$/.test(port) || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(sessionId || '')) throw Error('Usage: node scripts/usb-serial-gateway.mjs /dev/cu.PORT SESSION_UUID');
const configured = spawnSync('stty', ['-f', port, '115200', 'raw', '-echo'], {stdio:'inherit'});
if (configured.status !== 0) throw Error('Could not configure the USB serial port');
const gateway = spawn(process.execPath, [resolve(root, 'dist/scripts/offline-gateway.js'), 'watch'], {cwd:root, stdio:['pipe','inherit','inherit'], env:process.env});
gateway.on('error', error => { console.error(error.message); process.exitCode=1; });
let lastIndex = -1, lastMicros = null, microsEpoch = 0, anchor = null, sequence = 0;
let samples = [], firstSampleAt = null, firstMicros = 0;
function flush(){ if (!samples.length) return; gateway.stdin.write(JSON.stringify({sessionId,sequence:sequence++,firstSampleAt,sampleRateHz:250,samples})+'\n'); samples=[]; }
const input=createInterface({input:createReadStream(port), crlfDelay:Infinity});
input.on('line', line=>{
 try {
  const packet=JSON.parse(line);
  const x={index:packet.i,micros:packet.t,raw:packet.v,leadOff:packet.l};
  if (!Number.isSafeInteger(x.index)||x.index<0||!Number.isInteger(x.micros)||x.micros<0||x.micros>0xffffffff||!Number.isInteger(x.raw)||x.raw<0||x.raw>4095||typeof x.leadOff!=='boolean') throw Error('Invalid firmware packet');
  if (x.index<=lastIndex) throw Error('Device reset or out-of-order samples; start a new recording');
  if(lastMicros!==null&&x.micros<lastMicros){if(lastMicros-x.micros<0x80000000)throw Error('Device clock moved backwards'); microsEpoch+=0x100000000;}
  const t=microsEpoch+x.micros;
  if(anchor===null)anchor=Date.now()-t/1000;
  if(lastIndex>=0 && x.index!==lastIndex+1) { flush(); console.error('Acquisition gap detected'); }
  lastIndex=x.index;lastMicros=x.micros;
  if(x.leadOff){flush();return;}
  if(samples.length && Math.abs((t-firstMicros)/1000-samples.length*4)>2){flush();console.error('Sample timing gap detected');}
  if(!samples.length){firstMicros=t;firstSampleAt=new Date(anchor+t/1000).toISOString();}
  samples.push(x.raw); if(samples.length>=25)flush();
 } catch(error){console.error('USB stream stopped:',error.message);input.close();process.exitCode=1;}
});
input.on('close',()=>{flush();gateway.stdin.end();});
process.on('SIGINT',()=>input.close());
