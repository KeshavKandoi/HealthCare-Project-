// DEMO / SIMULATED packets. Requires a separately provisioned test device.
import 'dotenv/config';
const {ECG_DEVICE_ID:id,ECG_DEVICE_SECRET:secret,ECG_SESSION_ID:sessionId}=process.env;
if(!id||!secret||!sessionId){console.error('Set ECG_DEVICE_ID, ECG_DEVICE_SECRET and ECG_SESSION_ID for a dedicated test device/session. DEMO / SIMULATED only.');process.exit(1)}
const count=Number(process.argv[2]||10),rate=Number(process.env.ECG_SAMPLE_RATE_HZ);
if(!Number.isInteger(count)||count<1||!Number.isInteger(rate)||rate<1){console.error('Usage: ECG_SAMPLE_RATE_HZ=<verified test rate> npm run ecg:simulate -- [count]');process.exit(1)}
const base=process.env.ECG_API_URL||'http://localhost:4000/api/v1/ecg';
for(let sequence=0;sequence<count;sequence++){
 const firstSampleAt=new Date().toISOString();const samples=Array.from({length:rate},(_,i)=>Math.round(100+35*Math.sin(2*Math.PI*i/rate*2)));
 const response=await fetch(`${base}/device/batches`,{method:'POST',headers:{'content-type':'application/json','x-device-id':id,'x-device-secret':secret},body:JSON.stringify({sessionId,sequence,firstSampleAt,sampleRateHz:rate,samples})});
 if(!response.ok)throw Error(`DEMO packet ${sequence} rejected: ${response.status} ${await response.text()}`);
 console.log(`DEMO / SIMULATED packet ${sequence} accepted`);await new Promise(resolve=>setTimeout(resolve,1000));
}
