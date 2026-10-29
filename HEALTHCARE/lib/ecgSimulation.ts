/** Deterministic demonstration signals; never used to alter physical ECG or estimate measured BP. */
export const simulationRate = 250;
export const simulationScenario = 'resting-v2';
export const simulationSeed = 20261029;
export type SimulationConfig = {scenario?:'resting-v1'|'resting-v2';seed?:number};
const smooth=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x)};
function activity(t:number){const s=((t%240)+240)%240;return s<30?0:s<90?smooth((s-30)/60):s<120?1:s<210?1-smooth((s-120)/90):0}
// Stateless seeded hash: morphology is independent of packet order and network timing.
function noise(seed:number,beat:number,channel:number){let x=(seed^Math.imul(beat+4096,374761393)^Math.imul(channel+1,668265263))>>>0;x=Math.imul(x^(x>>>13),1274126177);return ((x^(x>>>16))>>>0)/4294967296*2-1}
type Beat={time:number;rr:number;p:number;r:number;t:number;tw:number};
const schedules=new Map<number,Beat[]>();
function schedule(t:number,seed:number){
 let beats=schedules.get(seed);
 if(!beats){if(schedules.size>=16)schedules.delete(schedules.keys().next().value!);beats=[{time:-1,rr:60/72,p:.12,r:1,t:.28,tw:.055}];schedules.set(seed,beats)}
 while(beats[beats.length-1].time<t+2){const last=beats[beats.length-1],n=beats.length;
  const target=72+24*activity(last.time)+1.4*Math.sin(last.time*2*Math.PI/7)+.7*Math.sin(last.time/13);
  const rr=60/target*(1+.008*noise(seed,n,0));
  beats.push({time:last.time+rr,rr,p:.12*(1+.07*noise(seed,n,1)),r:1+.035*noise(seed,n,2),t:.28*(1+.08*noise(seed,n,3)),tw:.055*(1+.05*noise(seed,n,4))});
 }
 return beats;
}
function beatIndex(beats:Beat[],t:number){let lo=0,hi=beats.length;while(lo<hi){const m=(lo+hi)>>>1;if(beats[m].time<t)lo=m+1;else hi=m}return lo}
function legacyVitals(t:number){return {bpm:72+3*Math.sin(t/30),systolic:118+3*Math.sin(t/45),diastolic:76+2*Math.sin(t/45)}}
export function scenarioVitals(seconds:number,config:SimulationConfig={}){
 if(config.scenario==='resting-v1')return {...legacyVitals(seconds),measurementSeconds:seconds,trend:'stable' as const,heartRateTrend:'stable' as const};
 const seed=config.seed??simulationSeed,beats=schedule(seconds,seed),i=Math.max(1,beatIndex(beats,seconds));
 const measurementSeconds=Math.floor(Math.max(0,seconds)/5)*5;
 const bp=(t:number)=>({systolic:118+10*activity(t)+.5*Math.sin(t/9),diastolic:76+6*activity(t)+.3*Math.sin(t/11)});
 const current=bp(measurementSeconds),before=bp(Math.max(0,measurementSeconds-5));
 const delta=current.systolic-before.systolic;
 const bpm=60/beats[i].rr,prior=60/beats[Math.max(1,i-1)].rr;
 return {bpm,...current,measurementSeconds,trend:delta>.15?'rising' as const:delta<-.15?'falling' as const:'stable' as const,heartRateTrend:bpm-prior>.3?'rising' as const:bpm-prior<-.3?'falling' as const:'stable' as const};
}
export function simulationSample(seconds:number,config:SimulationConfig={}){
 const gaussian=(x:number,center:number,width:number,amp:number)=>amp*Math.exp(-.5*((x-center)/width)**2);
 if(config.scenario==='resting-v1'){
  const beats=1.2*seconds+1.5*(1-Math.cos(seconds/30)),phase=beats-Math.floor(beats);
  return gaussian(phase,.18,.025,.12)+gaussian(phase,.365,.009,-.14)+gaussian(phase,.4,.012,1)+gaussian(phase,.435,.012,-.25)+gaussian(phase,.68,.055,.28)+.015*Math.sin(seconds*2*Math.PI/5);
 }
 const beats=schedule(seconds,config.seed??simulationSeed),index=beatIndex(beats,seconds);let value=.008*Math.sin(seconds*2*Math.PI/5)+.004*Math.sin(seconds/8);
 for(let i=Math.max(0,index-2);i<Math.min(beats.length,index+2);i++){
  const b=beats[i],x=seconds-b.time,compression=Math.sqrt(b.rr/(60/72));
  value+=gaussian(x,-.18*compression,.022,b.p)+gaussian(x,-.032,.008,-.14)+gaussian(x,0,.011,b.r)+gaussian(x,.032,.011,-.25)+gaussian(x,.24*compression,b.tw,b.t);
 }
 return value;
}
export function simulationPacket(sequence:number,config:SimulationConfig={}){
 return Array.from({length:simulationRate},(_,i)=>simulationSample(sequence+i/simulationRate,config));
}
