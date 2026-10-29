/** Deterministic demonstration signals; never used to alter physical ECG or estimate measured BP. */
export const simulationRate = 250;
export const simulationScenario = 'resting-v2';
export const simulationSeed = 20261029;
// Backoffice-selected demonstration modes. 'off' means leads disconnected: no samples are generated.
export const waveformModes = ['normal','off','post-workout','heavy-breathing','high-bp'] as const;
export type WaveformMode = typeof waveformModes[number];
export type SignalMode = Exclude<WaveformMode,'off'>;
export const isWaveformMode = (value:unknown):value is WaveformMode => waveformModes.includes(value as WaveformMode);
export const isSignalMode = (value:unknown):value is SignalMode => value!=='off'&&isWaveformMode(value);
export type SimulationConfig = {scenario?:'resting-v1'|'resting-v2';seed?:number;mode?:SignalMode};
const smooth=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x)};
function activity(t:number){const s=((t%240)+240)%240;return s<30?0:s<90?smooth((s-30)/60):s<120?1:s<210?1-smooth((s-120)/90):0}
// Stateless seeded hash: morphology is independent of packet order and network timing.
function noise(seed:number,beat:number,channel:number){let x=(seed^Math.imul(beat+4096,374761393)^Math.imul(channel+1,668265263))>>>0;x=Math.imul(x^(x>>>13),1274126177);return ((x^(x>>>16))>>>0)/4294967296*2-1}
// Breathing phase for heavy breathing: about 20 deep breaths per minute with a slowly varying rate.
const breathing=(t:number)=>2*Math.PI*.34*t+.6*Math.sin(2*Math.PI*t/29);
type Profile={initialRate:number;rate:(t:number)=>number;jitter:number;shape:{p:number;r:number;t:number};st:number;gain:(t:number)=>number;baseline:(t:number,sample:number,seed:number)=>number;pressure:(t:number)=>{systolic:number;diastolic:number}};
// 'normal' is the original resting-v2 profile and must stay sample-identical to earlier recordings.
const profiles:Record<SignalMode,Profile>={
 normal:{initialRate:72,rate:t=>72+24*activity(t)+1.4*Math.sin(t*2*Math.PI/7)+.7*Math.sin(t/13),jitter:.008,shape:{p:.12,r:1,t:.28},st:0,gain:()=>1,
  baseline:t=>.008*Math.sin(t*2*Math.PI/5)+.004*Math.sin(t/8),
  pressure:t=>({systolic:118+10*activity(t)+.5*Math.sin(t/9),diastolic:76+6*activity(t)+.3*Math.sin(t/11)})},
 // Just finished exercising: sinus tachycardia, taller T waves, mild upsloping ST depression, fast shallow breathing.
 'post-workout':{initialRate:150,rate:t=>144+7*Math.sin(2*Math.PI*t/41)+3*Math.sin(2*Math.PI*t/13),jitter:.004,shape:{p:.13,r:.93,t:.34},st:-.05,gain:()=>1,
  baseline:(t,n,seed)=>.035*Math.sin(2*Math.PI*t/2.3)+.006*Math.sin(t/8)+.006*noise(seed,n,9),
  pressure:t=>({systolic:152+4*Math.sin(t/17)+1.5*Math.sin(t/5),diastolic:79+2*Math.sin(t/19)})},
 // Deep breathing: heart rate rises and falls with each breath, the baseline wanders and QRS amplitude swings with chest movement.
 'heavy-breathing':{initialRate:104,rate:t=>104+13*Math.sin(breathing(t)+.6)+2*Math.sin(2*Math.PI*t/37),jitter:.006,shape:{p:.12,r:1,t:.26},st:0,gain:t=>1+.14*Math.sin(breathing(t)-.4),
  baseline:(t,n,seed)=>{const b=breathing(t);return .2*Math.sin(b)+.03*Math.sin(2*b)+.01*Math.sin(t/7)+.025*Math.max(0,Math.sin(b))**2*noise(seed,n,11)},
  pressure:t=>({systolic:131+3*Math.sin(t/11)+2*Math.sin(t/4.3),diastolic:85+2*Math.sin(t/13)})},
 // Hypertensive reading (about 170/105 mmHg) with a steady sinus rhythm and slightly taller QRS.
 'high-bp':{initialRate:86,rate:t=>86+3*Math.sin(2*Math.PI*t/23)+1.5*Math.sin(t/11),jitter:.007,shape:{p:.13,r:1.12,t:.3},st:0,gain:()=>1,
  baseline:t=>.01*Math.sin(t*2*Math.PI/4.5)+.004*Math.sin(t/8),
  pressure:t=>({systolic:172+4*Math.sin(t/23)+1.5*Math.sin(t/7),diastolic:106+2.5*Math.sin(t/29)})},
};
type Beat={time:number;rr:number;p:number;r:number;t:number;tw:number};
const schedules=new Map<string,Beat[]>();
function schedule(t:number,seed:number,mode:SignalMode){
 const key=`${seed}:${mode}`,profile=profiles[mode];
 let beats=schedules.get(key);
 if(!beats){if(schedules.size>=16)schedules.delete(schedules.keys().next().value!);beats=[{time:-1,rr:60/profile.initialRate,p:profile.shape.p,r:profile.shape.r,t:profile.shape.t,tw:.055}];schedules.set(key,beats)}
 while(beats[beats.length-1].time<t+2){const last=beats[beats.length-1],n=beats.length;
  const target=profile.rate(last.time);
  const rr=60/target*(1+profile.jitter*noise(seed,n,0));
  beats.push({time:last.time+rr,rr,p:profile.shape.p*(1+.07*noise(seed,n,1)),r:profile.shape.r+.035*noise(seed,n,2),t:profile.shape.t*(1+.08*noise(seed,n,3)),tw:.055*(1+.05*noise(seed,n,4))});
 }
 return beats;
}
function beatIndex(beats:Beat[],t:number){let lo=0,hi=beats.length;while(lo<hi){const m=(lo+hi)>>>1;if(beats[m].time<t)lo=m+1;else hi=m}return lo}
function legacyVitals(t:number){return {bpm:72+3*Math.sin(t/30),systolic:118+3*Math.sin(t/45),diastolic:76+2*Math.sin(t/45)}}
export function scenarioVitals(seconds:number,config:SimulationConfig={}){
 if(config.scenario==='resting-v1')return {...legacyVitals(seconds),measurementSeconds:seconds,trend:'stable' as const,heartRateTrend:'stable' as const};
 const mode=config.mode??'normal',seed=config.seed??simulationSeed,beats=schedule(seconds,seed,mode),i=Math.max(1,beatIndex(beats,seconds));
 const measurementSeconds=Math.floor(Math.max(0,seconds)/5)*5;
 const bp=profiles[mode].pressure;
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
 const mode=config.mode??'normal',seed=config.seed??simulationSeed,profile=profiles[mode];
 const beats=schedule(seconds,seed,mode),index=beatIndex(beats,seconds);let value=profile.baseline(seconds,Math.round(seconds*simulationRate),seed);
 for(let i=Math.max(0,index-2);i<Math.min(beats.length,index+2);i++){
  const b=beats[i],x=seconds-b.time,compression=Math.sqrt(b.rr/(60/72)),gain=profile.gain(b.time);
  value+=gaussian(x,-.18*compression,.022,b.p)+gaussian(x,-.032,.008,-.14*gain)+gaussian(x,0,.011,b.r*gain)+gaussian(x,.032,.011,-.25*gain)+gaussian(x,.24*compression,b.tw,b.t);
  if(profile.st)value+=gaussian(x,.075*compression,.03,profile.st);
 }
 return value;
}
export function simulationPacket(sequence:number,config:SimulationConfig={}){
 return Array.from({length:simulationRate},(_,i)=>simulationSample(sequence+i/simulationRate,config));
}
