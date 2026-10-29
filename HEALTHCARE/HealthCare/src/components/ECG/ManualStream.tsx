import {useEffect,useRef,useState} from 'react';
import axios from 'axios';
import API from '../../Api/API';
import {simulationPacket,simulationRate} from './simulation';
import type {WaveformMode} from './simulation';
import SimulatedVitals from './SimulatedVitals';
import type {SimulatedVital} from './SimulatedVitals';
import type {ECGBatch} from '../../types/domain';
type Props={mode:WaveformMode;onStarted:(id:string)=>void;onBatch:(batch:ECGBatch)=>void;onFinished:()=>void};
export default function ManualStream({mode,onStarted,onBatch,onFinished}:Props){
 const [duration,setDuration]=useState(300),[busy,setBusy]=useState(false),[status,setStatus]=useState('Disconnected'),[error,setError]=useState(''),[sent,setSent]=useState(0),[controlsOpen,setControlsOpen]=useState(true);
 const [history,setHistory]=useState<SimulatedVital[]>([]),[startedAt,setStartedAt]=useState('');
 const run=useRef({stop:false,id:''});const mounted=useRef(true);
 // The running loop reads the backoffice mode afresh for every one-second packet.
 const modeRef=useRef(mode);useEffect(()=>{modeRef.current=mode},[mode]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;run.current.stop=true}},[]);
 async function start(){
  if(busy)return;setBusy(true);setError('');setSent(0);setHistory([]);setStatus('Connecting');run.current={stop:false,id:''};
  try{
   const {data}=await API.post('/ecg/manual/simulated/start',{}, {timeout:20000});run.current.id=data.id;setStartedAt(data.startedAt);if(mounted.current){setControlsOpen(false);onStarted(data.deviceId);}
   for(let sequence=0;sequence<duration&&!run.current.stop;sequence++){
    const due=Date.parse(data.startedAt)+(sequence+1)*1000;
    await new Promise(resolve=>setTimeout(resolve,Math.max(0,due-Date.now())));if(run.current.stop)break;
    const current=modeRef.current;
    // Leads off: nothing is captured for this second, so the recording keeps a visible gap.
    if(current==='off'){if(mounted.current)setStatus('Leads not connected');continue}
    const packet={sequence,firstSampleAt:new Date(Date.parse(data.startedAt)+sequence*1000).toISOString(),sampleRateHz:simulationRate,samples:simulationPacket(sequence,{scenario:data.scenario,seed:data.seed,mode:current}),source:'simulated',scenario:data.scenario,seed:data.seed,mode:current};
    let accepted=false;
    for(let attempt=0;attempt<5&&!accepted;attempt++){
     try{const response=await API.post(`/ecg/manual/simulated/${data.id}/packets`,packet,{timeout:15000});accepted=true;if(mounted.current){setSent(count=>count+1);setHistory(old=>[...old,response.data.batch]);setStatus('Simulated Connected');onBatch(response.data.batch)}}
     catch(e){if(axios.isAxiosError(e)&&e.response&&e.response.status<500)throw e;if(attempt===4)throw e;if(mounted.current)setStatus('Reconnecting · buffering');await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)))}
    }
   }
  }catch(e){if(mounted.current)setError(axios.isAxiosError(e)?e.response?.data?.message||'Connection interrupted. Accepted packets remain saved.':'Unable to connect')}
  finally{if(run.current.id){try{await API.post(`/ecg/sessions/${run.current.id}/stop`,{},{timeout:15000})}catch{if(mounted.current)setError('Could not complete recording. Retry completion below.')}}if(mounted.current){setBusy(false);setStatus('Disconnected');onFinished()}}
 }
 return <section className="ecg-panel manual-stream" aria-label="Manual connection">
  <div className="manual-stream-heading"><div><h2>Connection</h2><span className="manual-simulation-label">Simulated readings</span></div><button type="button" aria-expanded={controlsOpen} aria-controls="manual-settings" onClick={()=>setControlsOpen(open=>!open)}>{controlsOpen?'Hide controls ×':'Show controls +'}</button></div>
  {controlsOpen&&<div id="manual-settings"><label>Recording duration <select disabled={busy} value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[10,30,60,300,600].map(n=><option value={n} key={n}>{n} seconds</option>)}</select></label><div className="ecg-actions"><button disabled={busy} onClick={()=>void start()}>Connect and Start Monitoring</button><button disabled={!busy} onClick={()=>{run.current.stop=true;setStatus('Stopping')}}>Stop Recording</button><a href="/ecg-history">Open Recording History</a></div></div>}
  {error&&<p role="alert">{error}{!busy&&run.current.id&&<button onClick={async()=>{try{await API.post(`/ecg/sessions/${run.current.id}/stop`);setError('');onFinished()}catch{setError('Completion unavailable. Try again.')}}}>Retry completion</button>}</p>}
  <span className="sr-only" role="status">{status}{sent ? ` · ${sent} seconds received` : ''}</span>
  <SimulatedVitals history={history} start={startedAt} showHistory={false} leadsOff={mode==='off'}/>
 </section>
}
