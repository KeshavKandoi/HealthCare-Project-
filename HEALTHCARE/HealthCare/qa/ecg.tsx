import React from 'react';
import {createRoot} from 'react-dom/client';
import RecordingGraph from '../src/components/ECG/RecordingGraph';
import AutomaticSimulation from '../src/components/ECG/AutomaticSimulation';
import data from '../../test/fixtures/ecg/mitdb-100-30s.json';
const start=Date.parse('2026-01-01T00:00:00Z');
const chunks=Array.from({length:30},(_,i)=>({sequence:i,first_sample_at:new Date(start+i*1000).toISOString(),samples:data.samples.slice(i*360,(i+1)*360)}));
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:1200,margin:'30px auto'}}><h1>Reference ECG verification — not patient data</h1><p>MIT-BIH 100 · MLII · 360 Hz · PhysioNet, Moody &amp; Mark</p><RecordingGraph sessionId="reference-100" sampleRate={360} start={new Date(start).toISOString()} end={new Date(start+30000).toISOString()} units="mV" sourceChunks={chunks} lead="MLII"/><AutomaticSimulation/></main>);
