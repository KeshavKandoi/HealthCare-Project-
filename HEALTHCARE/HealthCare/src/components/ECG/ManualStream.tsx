import {useEffect,useRef,useState} from 'react';
import axios from 'axios';
import API from '../../Api/API';
import {simulationPacket,simulationRate} from './simulation';
import type {ECGBatch} from '../../types/domain';
type Props={onStarted:(id:string)=>void;onBatch:(batch:ECGBatch)=>void;onFinished:()=>void};
export default function ManualStream({onStarted,onBatch,onFinished}:Props){
 const [duration,setDuration]=useState(300),[busy,setBusy]=useState(false),[status,setStatus]=useState('Disconnected'),[error,setError]=useState(''),[sent,setSent]=useState(0);
 const [vitals,setVitals]=useState<{bpm:number;systolic:number;diastolic:number}|null>(null);
 const run=useRef({stop:false,id:''});const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;run.current.stop=true}},[]);
 async function start(){
  if(busy)return;setBusy(true);setError('');setSent(0);setVitals(null);setStatus('Connecting');run.current={stop:false,id:''};
  try{
   const {data}=await API.post('/ecg/manual/simulated/start',{}, {timeout:20000});run.current.id=data.id;if(mounted.current)onStarted(data.deviceId);
   for(let sequence=0;sequence<duration&&!run.current.stop;sequence++){
    const due=Date.parse(data.startedAt)+(sequence+1)*1000;
    await new Promise(resolve=>setTimeout(resolve,Math.max(0,due-Date.now())));if(run.current.stop)break;
    const packet={sequence,firstSampleAt:new Date(Date.parse(data.startedAt)+sequence*1000).toISOString(),sampleRateHz:simulationRate,samples:simulationPacket(sequence),source:'simulated',scenario:'resting-v1'};
    let accepted=false;
    for(let attempt=0;attempt<5&&!accepted;attempt++){
     try{const response=await API.post(`/ecg/manual/simulated/${data.id}/packets`,packet,{timeout:15000});accepted=true;if(mounted.current){setSent(sequence+1);setVitals(response.data.batch);setStatus('Simulated Connected');onBatch(response.data.batch)}}
     catch(e){if(axios.isAxiosError(e)&&e.response&&e.response.status<500)throw e;if(attempt===4)throw e;if(mounted.current)setStatus('Reconnecting · buffering');await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)))}
    }
   }
  }catch(e){if(mounted.current)setError(axios.isAxiosError(e)?e.response?.data?.message||'Connection interrupted. Accepted packets remain saved.':'Unable to connect')}
  finally{if(run.current.id){try{await API.post(`/ecg/sessions/${run.current.id}/stop`,{},{timeout:15000})}catch{if(mounted.current)setError('Could not complete recording. Retry completion below.')}}if(mounted.current){setBusy(false);setStatus('Disconnected');onFinished()}}
 }
 return <section className="ecg-panel manual-stream" aria-label="Manual connection"><h2>Connect Simulated Holter</h2><p>SIMULATED · ESP32 + AD8232 demonstration · Resting ECG · 250 samples/second</p><label>Recording duration <select disabled={busy} value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[10,30,60,300,600].map(n=><option value={n} key={n}>{n} seconds</option>)}</select></label><div className="ecg-actions"><button disabled={busy} onClick={()=>void start()}>Connect and Start Monitoring</button><button disabled={!busy} onClick={()=>{run.current.stop=true;setStatus('Stopping')}}>Stop Recording</button><a href="/ecg-history">Open Recording History</a></div><p role="status">{status} · {sent} seconds accepted · {sent*250} samples saved</p><div className="ecg-metrics"><article><span>Simulated Blood Pressure</span><strong>{vitals?`${vitals.systolic.toFixed(0)} / ${vitals.diastolic.toFixed(0)} mmHg`:'—'}</strong><small>Scenario output, not measured from ECG</small></article><article><span>Simulated Heart Rate</span><strong>{vitals?`${vitals.bpm.toFixed(0)} BPM`:'—'}</strong><small>From the accepted backend packet</small></article></div><p>Pause Display in the waveform controls pauses only the display. Acquisition continues.</p>{error&&<p role="alert">{error}{!busy&&run.current.id&&<button onClick={async()=>{try{await API.post(`/ecg/sessions/${run.current.id}/stop`);setError('');onFinished()}catch{setError('Completion unavailable. Try again.')}}}>Retry completion</button>}</p>}</section>
}
