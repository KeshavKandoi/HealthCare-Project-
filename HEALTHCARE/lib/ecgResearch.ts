/** Research-only analysis. This module never writes measured BP or dispatches alerts. */
export type EcgFeatures = { sampleRateHz: number; durationSeconds: number; rms: number; peakToPeak: number; rPeakTimesSeconds: number[]; heartRateBpm: number|null; rrStdSeconds: number|null };
export type ReferenceCalibration = { patientId: string; source: 'validated-device'|'paired-dataset'; referenceId: string; recordedAt: string; expiresAt: string; systolic: number; diastolic: number };
export type ResearchModel = {
  id: string; version: string; artifactSha256: string;
  evaluated: boolean; evaluationDataset: string; heldOutPatients: number;
  systolicMae: number; diastolicMae: number; requiresCalibration: boolean;
  infer(features: EcgFeatures, calibration: ReferenceCalibration|null): Promise<{systolic:number;diastolic:number;uncertainty95:{systolic:[number,number];diastolic:[number,number]}}>;
};
export type ResearchResult = { status:'unavailable'; reason:string; features?:EcgFeatures } | {status:'experimental'; source:'Experimental AI Estimate'; modelVersion:string; timestamp:string; calibrationStatus:string; systolic:number;diastolic:number;uncertainty95:{systolic:[number,number];diastolic:[number,number]}};
export function extractEcgFeatures(samples:number[], rate:number): EcgFeatures|null {
  if(!Number.isFinite(rate)||rate<200||rate>2000||samples.length<rate*10||!samples.every(Number.isFinite))return null;
  const mean=samples.reduce((a,b)=>a+b,0)/samples.length;
  const centered=samples.map(v=>v-mean);
  let low=Infinity,high=-Infinity,energy=0;
  for(const v of centered){low=Math.min(low,v);high=Math.max(high,v);energy+=v*v}
  const rms=Math.sqrt(energy/samples.length);
  if(high-low<1e-9||rms<1e-9)return null;
  // Conservative research candidate detector; absolute polarity supports inverted single leads.
  // Does not label P/Q/S/T or diagnose rhythm. Not a clinically validated QRS detector.
  const peaks:number[]=[];let last=-rate;
  for(let i=1;i<centered.length-1;i++){
    const a=Math.abs(centered[i]);
    if(a>3*rms&&a>=Math.abs(centered[i-1])&&a>Math.abs(centered[i+1])){
      if(i-last>=rate*.25){peaks.push(i);last=i}
      else if(peaks.length&&a>Math.abs(centered[last])){peaks[peaks.length-1]=i;last=i}
    }
  }
  const rr=peaks.slice(1).map((v,i)=>(v-peaks[i])/rate);
  const valid=rr.length>=5&&rr.every(v=>v>=.25&&v<=2.5);
  const avg=rr.reduce((a,b)=>a+b,0)/rr.length;
  return {sampleRateHz:rate,durationSeconds:samples.length/rate,rms,peakToPeak:high-low,rPeakTimesSeconds:peaks.map(v=>v/rate),heartRateBpm:valid?60/avg:null,rrStdSeconds:valid?Math.sqrt(rr.reduce((a,b)=>a+(b-avg)**2,0)/rr.length):null};
}
export async function estimateResearchBp(input:{patientId:string;samples:number[];sampleRateHz:number;timingVerified:boolean;hasGaps:boolean;leadOff:boolean;calibration:ReferenceCalibration|null},model:ResearchModel|null=null):Promise<ResearchResult>{
  if(!model)return {status:'unavailable',reason:'BP estimate unavailable — ECG-only input'};
  if(!model.evaluated||!model.version||!model.evaluationDataset||model.heldOutPatients<1||!Number.isFinite(model.systolicMae)||!Number.isFinite(model.diastolicMae)||!/^([a-f0-9]{64})$/i.test(model.artifactSha256))return {status:'unavailable',reason:'Model evaluation or artifact metadata missing'};
  if(!input.timingVerified||input.hasGaps||input.leadOff)return {status:'unavailable',reason:'Signal-quality prerequisites not satisfied'};
  const features=extractEcgFeatures(input.samples,input.sampleRateHz);
  if(!features||features.heartRateBpm===null)return {status:'unavailable',reason:'Insufficient ECG quality for research inference'};
  const c=input.calibration;
  if(model.requiresCalibration&&(!c||c.patientId!==input.patientId||!['validated-device','paired-dataset'].includes(c.source)||!c.referenceId||!Number.isFinite(c.systolic)||!Number.isFinite(c.diastolic)||c.systolic<=c.diastolic||!(Date.parse(c.recordedAt)<=Date.now())||!(Date.parse(c.expiresAt)>Date.now())))return {status:'unavailable',reason:'Compatible reference calibration unavailable',features};
  try{
    const output=await model.infer(features,c);
    const bounds=output.uncertainty95;
    if(!bounds||!Number.isFinite(output.systolic)||!Number.isFinite(output.diastolic)||output.systolic<=output.diastolic||!['systolic','diastolic'].every(key=>{const k=key as 'systolic'|'diastolic';const b=bounds[k];return Array.isArray(b)&&b.length===2&&b.every(Number.isFinite)&&b[0]<=output[k]&&b[1]>=output[k]}))return {status:'unavailable',reason:'Invalid model result or uncertainty'};
    return {status:'experimental',source:'Experimental AI Estimate',modelVersion:`${model.id}@${model.version}`,timestamp:new Date().toISOString(),calibrationStatus:c?'Reference available':'Not required by model',...output};
  }catch{return {status:'unavailable',reason:'Research inference service unavailable'}}
}
