import axios from 'axios';import type {HolterDevice,RecordingSession,ECGBatch} from '../types/domain';
import {useEffect,useRef,useState} from 'react';
import {useSelector} from 'react-redux';
import {Link} from 'react-router-dom';
import {io} from 'socket.io-client';
import API from '../Api/API';
import { isDemoSession } from '../demo/demoSession';
import { appendLocalDemoPackets, type LocalDemoPacket } from '../demo/demoApi';
import { queueSymptom, syncSymptoms } from './symptomQueue';
import type { RootState } from '../redux/store';
import './ECGDashboard.css';
import ManualStream from '../components/ECG/ManualStream';
import RecordingGraph from '../components/ECG/RecordingGraph';
const base=(import.meta.env.VITE_BASEURL||'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/,'');
const demoReceiver=(import.meta.env.VITE_LOCAL_ECG_DEMO_URL||'http://127.0.0.1:4000').replace(/\/$/,'');
function ECGDashboard(){
 const demo=isDemoSession();
 const user=useSelector((state:RootState)=>state.auth.user);
 const [devices,setDevices]=useState<HolterDevice[]>([]),[sessions,setSessions]=useState<(RecordingSession&{last_sample_at?:string|null})[]>([]),[chunks,setChunks]=useState<ECGBatch[]>([]),[online,setOnline]=useState(false),[error,setError]=useState(''),[now,setNow]=useState(0);
 const selectedRef=useRef(''),sessionRef=useRef('');
 const demoCursor=useRef({streamId:'',sequence:0});
 const [localDemo,setLocalDemo]=useState<{connected:boolean;bpm:number|null;lastAt:string|null}>({connected:false,bpm:null,lastAt:null});
 const [connectOpen,setConnectOpen]=useState(false),[manual,setManual]=useState(false);
 const [showAuthenticatedTestHelp,setShowAuthenticatedTestHelp]=useState(false);
 const testActive=manual&&localDemo.connected&&!!localDemo.lastAt&&now-Date.parse(localDemo.lastAt)<5000;
 const [selected,setSelected]=useState(''),[targetHours]=useState<24|72>(24),[markerStatus,setMarkerStatus]=useState('');const token=demo?'demo':(()=>{try{return JSON.parse(localStorage.getItem('appData')||'null')?.token}catch{return null}})();
 const reload=async()=>{try{const [d,s]=await Promise.all([API.get('/ecg/devices'),API.get('/ecg/sessions')]);setDevices(d.data.devices);setSessions(s.data.sessions);setSelected(v=>v||d.data.devices[0]?.id||'');if(demo){const sample=await API.get<{chunks:ECGBatch[]}>('/ecg/demo-live');setChunks(sample.data.chunks)}setError('')}catch(e){setError(axios.isAxiosError(e)?e.response?.data?.message||'Server unavailable':'Server unavailable')}};
 useEffect(()=>{if(!token)return;queueMicrotask(reload);const timer=setInterval(()=>setNow(Date.now()),1000);const retry=()=>{if(user?._id)void syncSymptoms(user._id).catch(()=>{})};retry();window.addEventListener('online',retry);const syncTimer=setInterval(retry,10000);if(demo)return()=>{clearInterval(timer);clearInterval(syncTimer);window.removeEventListener('online',retry)};const socket=io(base,{auth:{token}});socket.on('connect',()=>setOnline(true));socket.on('disconnect',()=>setOnline(false));socket.on('ecg-batch',b=>{if(b.deviceId!==selectedRef.current||b.sessionId!==sessionRef.current)return;{setChunks(old=>[...old.filter(item=>!(item.sessionId===b.sessionId&&item.sequence===b.sequence)).slice(-29),b])}reload()});return()=>{clearInterval(timer);clearInterval(syncTimer);window.removeEventListener('online',retry);socket.disconnect()}},[token,user?._id]);
 const device=devices.find(d=>d.id===selected),session=sessions.find(s=>s.device_id===selected&&['recording','interrupted'].includes(s.status));selectedRef.current=selected;sessionRef.current=session?.id||'';const recent=device?.last_seen_at&&now-Date.parse(device.last_seen_at)<(device.model==='Browser stream'?5000:30000);
 useEffect(()=>{
  if(!demo||!manual||!import.meta.env.DEV)return;
  let active=true, busy=false;
  const poll=async()=>{
   if(busy)return;busy=true;
   try{
    const response=await fetch(`${demoReceiver}/api/v1/ecg/demo-stream?after=${demoCursor.current.sequence}`,{signal:AbortSignal.timeout(1800)});
    if(!response.ok)throw new Error('Demo receiver unavailable');
    const data=await response.json() as {simulated:boolean;streamId:string;packets:LocalDemoPacket[]};
    if(!active||!data.simulated||!Array.isArray(data.packets))return;
    if(demoCursor.current.streamId&&demoCursor.current.streamId!==data.streamId){demoCursor.current={streamId:data.streamId,sequence:0};return;}
    demoCursor.current.streamId=data.streamId;
    if(data.packets.length){
     const last=data.packets[data.packets.length-1];demoCursor.current.sequence=last.sequence;
     setLocalDemo({connected:true,bpm:last.bpm,lastAt:last.receivedAt});
     const recorded=appendLocalDemoPackets(data.packets);
     if(recorded)setSessions(current=>current.map(item=>item.id===recorded.id?{...item,...recorded}:item));
     setChunks(current=>[...current,...data.packets.map(packet=>({sessionId:sessionRef.current,deviceId:'demo-device-1',sequence:packet.sequence,firstSampleAt:packet.receivedAt,sampleRateHz:packet.values.length,samples:packet.values,units:'raw' as const,receivedAt:packet.receivedAt}))].slice(-30));
    }else setLocalDemo(current=>({...current,connected:true}));
   }catch{if(active)setLocalDemo(current=>({...current,connected:false}));}finally{busy=false;}
  };
  void poll();const timer=setInterval(()=>void poll(),1000);
  return()=>{active=false;clearInterval(timer)};
 },[demo,manual]);
 const displayedSession=session || sessions.find(s=>s.device_id===selected);
 const action=async()=>{try{if(session)await API.post(`/ecg/sessions/${session.id}/stop`);else await API.post('/ecg/sessions',{deviceId:selected,targetHours});setChunks([]);await reload()}catch(e){setError(axios.isAxiosError(e)?e.response?.data?.message||'Action failed':'Action failed')}};
 const markSymptom=async(symptom:string)=>{if(!session||!user?._id){setMarkerStatus('Connect and start monitoring to mark a symptom.');return}const marker=queueSymptom(user._id,session.id,symptom);setMarkerStatus(`${symptom} marked at ${new Date(marker.markedAt).toLocaleTimeString()}. Saving…`);try{const pending=await syncSymptoms(user._id);setMarkerStatus(pending?'Symptom saved in this tab and awaiting sync.':'Symptom saved and linked to this recording.')}catch{setMarkerStatus('Saved in this tab. Will sync when connectivity returns.')}};
 return <main className="ecg-new"><div className="ecg-new-head"><div><p className="ecg-kicker">PATIENT MONITORING</p><h1>Live monitoring</h1><p>{demo?'Sample ECG display. No physical device is connected.':'Your heart’s electrical activity, recorded and displayed in real time.'}</p></div><div className="ecg-actions"><button onClick={()=>setConnectOpen(value=>!value)}>{connectOpen?'Close connection options':'Connect Holter'}</button>{device&&!device.is_simulated&&<button onClick={action}>{session?'Complete monitoring':'Begin monitoring'}</button>}</div></div>{connectOpen&&<section className="ecg-panel" aria-label="Connection options"><h2>Connect a Holter</h2><p>Choose how to connect.</p><div className="ecg-actions"><button onClick={()=>{if(!demo){setError("");setShowAuthenticatedTestHelp(true);setConnectOpen(false);return}setManual(true);setLocalDemo({connected:false,bpm:null,lastAt:null});demoCursor.current={streamId:"",sequence:0};setChunks([]);setConnectOpen(false)}}>Manual connection</button><Link className="ecg-connect-device" to="/devices">Connect a device</Link>{manual&&<button onClick={()=>{setManual(false);setLocalDemo({connected:false,bpm:null,lastAt:null});setChunks([]);setConnectOpen(false)}}>Disconnect test feed</button>}</div></section>}{showAuthenticatedTestHelp&&!demo&&<ManualStream onStarted={id=>{setSelected(id);selectedRef.current=id;setChunks([]);void reload()}} onBatch={batch=>{setChunks(current=>[...current.filter(item=>!(item.sessionId===batch.sessionId&&item.sequence===batch.sequence)),batch].slice(-30));void reload()}} onFinished={()=>void reload()}/>}{demo?<div className="ecg-banner" role="status">DEMO · Simulated data only. Start the local test receiver to display terminal packets; no medical alerts are sent.</div>:null}{!token?<div className="ecg-banner">Sign in to access your ECG data.</div>:null}{error?<div role="alert" className="ecg-banner">{error}</div>:null}{demo && manual && <div className="ecg-banner" role="status">{!import.meta.env.DEV ? "Manual terminal feed requires the local development site. Open localhost:5173." : !localDemo.connected ? "Receiver unavailable. Stop the normal backend on port 4000, then run npm run ecg:local-demo in HEALTHCARE." : testActive ? `Simulated Holter connected · BPM: ${localDemo.bpm}` : localDemo.lastAt ? "Simulated Holter disconnected: no recent packets." : "Receiver ready. Waiting for your terminal command."}</div>}<div className="ecg-metrics"><article><span>DEVICE STATUS</span><strong>{demo&&manual?(testActive?'Simulated connected':'Disconnected'):!device?'No device':demo?'Sample device':recent?(device.is_simulated?'Simulated Connected':'Connected'):'No recent signal'}</strong><small>{device?.last_seen_at?`Last contact ${new Date(device.last_seen_at).toLocaleString()}`:'No contact reported'}</small></article><article><span>RECORDING</span><strong>{session?Math.max(0,Math.floor((now-Date.parse(session.started_at))/1000))+' s':'Inactive'}</strong><small>{session?.status||'No recording in progress'}</small></article></div><section className="ecg-panel"><div className="ecg-panel-head"><div><h2>{demo?(localDemo.lastAt?'Local simulated waveform':'Sample waveform'):'Live waveform'}</h2><p>{demo && localDemo.lastAt ? 'Raw simulated values · test only' : chunks.length?`${device?.units==='mV'?'mV':'Raw values'} · ${device?.sample_rate_hz} samples/s`:'Awaiting genuine samples'}</p></div></div>{displayedSession?<RecordingGraph sessionId={displayedSession.id} sampleRate={displayedSession.sample_rate_hz} start={displayedSession.started_at} end={displayedSession.ended_at || new Date(now || Date.now()).toISOString()} units={displayedSession.units} live={!!session} liveChunks={chunks.filter(c=>c.sessionId===displayedSession.id).map(c=>({sequence:c.sequence,first_sample_at:c.firstSampleAt,samples:c.samples}))} sourceChunks={demo ? chunks.map(c=>({sequence:c.sequence,first_sample_at:c.firstSampleAt,samples:c.samples})) : undefined}/>:<div className="ecg-empty">{!device?<><h3>No device paired</h3><Link to="/devices">Pair a device</Link></>:session?'Recording is ready. Waiting for device packets.':'Start a recording to receive device packets.'}</div>}<div className="ecg-panel-foot">Browser stream: {demo?(testActive?'Local simulation connected':manual?'Disconnected':'Demo only'):online?'Connected':'Unavailable'} · Device contact: {demo?(testActive?'Simulated packets':manual?'Disconnected':'Sample data'):recent?'Recent':'Not recent'} · Display pause does not stop recording</div></section><section className="ecg-panel ecg-symptom-panel"><div><p className="ecg-kicker">ONE-TAP JOURNAL</p><h2>Mark a symptom</h2><p>Tap when it happens. The exact time is matched to the ECG segment when its batch arrives.</p></div><div className="ecg-symptom-actions">{['dizziness','discomfort','palpitations','breathlessness'].map(symptom=><button key={symptom} disabled={!session} onClick={()=>markSymptom(symptom)}>{symptom}</button>)}</div><p role="status" aria-live="polite">{markerStatus||(!session?'Start a recording to enable symptom markers.':'Markers appear in your study report.')}</p></section><p className="ecg-disclaimer">Technical monitoring only. Signal quality and clinical interpretation require qualified review. Seek urgent care for concerning symptoms.</p></main>
}
export default ECGDashboard;
