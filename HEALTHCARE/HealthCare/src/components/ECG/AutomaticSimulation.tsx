import {useEffect, useRef, useState} from 'react';
import RecordingGraph from './RecordingGraph';
import {simulationPacket, simulationRate, scenarioVitals, simulationScenario, simulationSeed} from './simulation';
import type {SignalChunk} from './signal';
import API from '../../Api/API';
import SimulatedVitals from './SimulatedVitals';

export default function AutomaticSimulation({persist=false}:{persist?:boolean}) {
  const [status,setStatus]=useState<'idle'|'running'|'paused'|'stopped'>('idle');
  const [chunks,setChunks]=useState<SignalChunk[]>([]);
  const [start,setStart]=useState('');
  const [scenario,setScenario]=useState<'resting-v1'|'resting-v2'>(simulationScenario);
  const count=useRef(0);
  const [saveStatus,setSaveStatus]=useState('');
  const [runId,setRunId]=useState('');
  const [history,setHistory]=useState<{id:string;started_at:string;duration_seconds:number}[]>([]);
  const [retry,setRetry]=useState(0);
  const savedId=useRef('');
  useEffect(()=>{if(persist)void API.get('/ecg/simulations').then(r=>setHistory(r.data.runs)).catch(()=>{})},[persist,saveStatus]);
  useEffect(()=>{
    if(!persist||status!=='stopped'||!chunks.length||savedId.current===runId)return;
    let active=true;setSaveStatus('Saving simulated recording…');
    void API.post('/ecg/simulations',{id:runId,startedAt:start,durationSeconds:chunks.length,scenario,seed:simulationSeed}).then(()=>{savedId.current=runId;if(active)setSaveStatus('Simulated recording saved separately.')}).catch(()=>{if(active)setSaveStatus('Could not save. Keep this page open and retry.');});
    return()=>{active=false};
  },[status,persist,runId,start,chunks.length,retry,scenario]);
  useEffect(()=>{
    if(status!=='running')return;
    const timer=setInterval(()=>{
      const sequence=count.current++;
      setChunks(old=>[...old,{sequence,first_sample_at:new Date(Date.parse(start)+sequence*1000).toISOString(),samples:simulationPacket(sequence,{scenario,seed:simulationSeed})}]);
      if(count.current>=300)setStatus('stopped');
    },1000);
    return()=>clearInterval(timer);
  },[status,start,scenario]);
  const vitalHistory=Array.from({length:chunks.length},(_,i)=>scenarioVitals(i,{scenario,seed:simulationSeed}));
  return <section className="ecg-panel" aria-label="Simulated ECG and blood pressure">
    <h2>SIMULATED ECG + blood pressure</h2>
    <p>{scenario==='resting-v1'?'Resting v1':'Rest → activity → recovery v2'} · 5-minute session · BP is generated independently of ECG. Simulation never sends medical alerts. Pausing stops scenario time; it does not represent physical acquisition.</p>
    <div className="ecg-actions">
      <button disabled={status==='running'||status==='paused'} onClick={()=>{count.current=0;setScenario(simulationScenario);setRunId(crypto.randomUUID());setSaveStatus('');setChunks([]);setStart(new Date().toISOString());setStatus('running')}}>Start simulation</button>
      <button disabled={status!=='running'&&status!=='paused'} onClick={()=>setStatus(status==='paused'?'running':'paused')}>{status==='paused'?'Resume':'Pause'}</button>
      <button disabled={status==='idle'||status==='stopped'} onClick={()=>setStatus('stopped')}>Stop</button>
    </div>
    <p role="status">{saveStatus}{saveStatus.startsWith('Could not')&&<button onClick={()=>setRetry(v=>v+1)}>Retry save</button>}</p>
    {!!history.length&&<label>Simulation playback <select defaultValue="" disabled={status==='running'||status==='paused'} onChange={async e=>{if(!e.target.value)return;try{const {data}=await API.get(`/ecg/simulations/${e.target.value}`);const r=data.run;setScenario(r.scenario_version==='resting-v1'?'resting-v1':'resting-v2');savedId.current=r.id;setRunId(r.id);setStart(r.started_at);setChunks(r.waveform_chunks);count.current=r.duration_seconds;setStatus('stopped');setSaveStatus('Saved simulated recording')}catch{setSaveStatus('Playback unavailable')}}}><option value="">Select a simulated recording</option>{history.map(r=><option value={r.id} key={r.id}>{new Date(r.started_at).toLocaleString()} · {r.duration_seconds}s · SIMULATED</option>)}</select></label>}
    <SimulatedVitals history={vitalHistory} start={start}/>
    {!!chunks.length&&<RecordingGraph sessionId={`simulation-${start}`} start={start} end={new Date(Date.parse(start)+chunks.length*1000).toISOString()} sampleRate={simulationRate} units="mV" sourceChunks={chunks} live={status==='running'} />}
  </section>;
}
