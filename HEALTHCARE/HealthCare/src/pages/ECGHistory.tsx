import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import API from '../Api/API';
import type { RecordingSession } from '../types/domain';
import RecordingGraph from '../components/ECG/RecordingGraph';
import './ECGDashboard.css';

type Chunk = { sequence: number; first_sample_at: string; sample_count: number; samples: number[]; sha256: string };
type SessionNote = { id: string; note: string; created_at: string };
type Detail = { session: RecordingSession; chunks: Chunk[]; notes: SessionNote[]; simulatedVitals?: {systolic:number;diastolic:number;bpm:number;firstSampleAt:string} };
type Symptom = { id: string; symptom: string; marked_at: string; note?: string | null; chunk_sequence: number | null; sample_offset: number | null };
type Report = {
  sessionId: string; status: string; startedAt: string; endedAt: string | null; asOf: string; isSimulated?: boolean;
  targetHours: number; actualDurationMs: number; availableCoverageMs: number;
  availableCoveragePercent: number; qualityVerified: boolean; sampleCount: number;
  receivedBatchCount: number; missingSequences: number; deviceEvents: { event: string; created_at: string }[];
  symptomMarkers: Symptom[]; verifiedMeasurements: { kind: string; value: number; unit: string; measured_at: string }[];
  interpretation: string;
};
type SignedReview = { id: string; summary: string; signed_at: string; doctor_name: string; signatureVerified: boolean };

const duration = (milliseconds: number) => { const seconds=Math.max(0,Math.floor(milliseconds/1000)); const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60; return [h ? `${h}h` : '', m ? `${m}m` : '', `${s}s`].filter(Boolean).join(' '); };
const sessionDuration = (session: RecordingSession) => session.ended_at ? duration(Date.parse(session.ended_at)-Date.parse(session.started_at)) : 'In progress';
const date = (value: string) => new Date(value).toLocaleString();

export default function ECGHistory() {
  const { sessionId } = useParams();
  const [sessions, setSessions] = useState<(RecordingSession & { model?: string | null })[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [reviews, setReviews] = useState<SignedReview[]>([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const load = useCallback(async () => {
    try {
      if (sessionId) {
        const [recording, study] = await Promise.all([
          API.get<Detail>(`/ecg/sessions/${sessionId}`, { params: { metadata: 1 } }),
          API.get<{ report: Report; reviews: SignedReview[] }>(`/monitoring/sessions/${sessionId}/report`),
        ]);
        setDetail(recording.data); setReport(study.data.report); setReviews(study.data.reviews);
      } else {
        const response = await API.get<{ sessions: (RecordingSession & { model?: string | null })[] }>('/ecg/sessions');
        setSessions(response.data.sessions);
      }
      setError('');
    } catch (cause: unknown) { setError((cause as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not load recordings'); }
  }, [sessionId]);
  useEffect(() => { void load(); }, [load]);

  async function addNote() {
    if (!note.trim()) return;
    try { await API.post(`/ecg/sessions/${sessionId}/notes`, { note: note.trim() }); setNote(''); await load(); }
    catch { setError('Could not save note'); }
  }

  return <main className="ecg-new study-report-page">
    <p className="ecg-kicker">ECG LIBRARY / HOLTER STUDIES</p>
    <h1>{sessionId ? 'Study report' : 'Recording history'}</h1>
    {error && <div className="ecg-banner" role="alert">{error}</div>}
    {!sessionId ? <div className="ecg-list">{sessions.length ? sessions.map(session => <article key={session.id}><div><strong>{date(session.started_at)} {session.is_simulated ? '· SIMULATED' : ''}</strong><p>{session.status} · {sessionDuration(session)}</p></div><Link to={`/ecg-history/${session.id}`}>Open report →</Link></article>) : <div className="ecg-empty">No recording sessions yet. <Link to="/ecg-monitor">Open monitor</Link></div>}</div> : detail && report ? <>
      <div className="study-report-toolbar"><Link to="/ecg-history">← All recordings</Link><button onClick={() => window.print()}>Print technical report</button></div>
      <section className="study-report-hero"><div><p className="ecg-kicker">ECG RECORDING · {report.status.toUpperCase()}{detail.session.is_simulated ? ' · SIMULATED' : ''}</p><h2>ECG report</h2><p>Started {date(report.startedAt)} · {report.endedAt ? `Ended ${date(report.endedAt)}` : 'Recording in progress'}</p><p>Duration: <strong>{duration(report.actualDurationMs)}</strong></p></div></section>
      {detail.simulatedVitals&&<section className="ecg-panel"><h2>Simulated vitals</h2><p>{detail.simulatedVitals.systolic.toFixed(0)} / {detail.simulatedVitals.diastolic.toFixed(0)} mmHg · {detail.simulatedVitals.bpm.toFixed(0)} BPM</p><p>Last stored scenario sample · {date(detail.simulatedVitals.firstSampleAt)}</p></section>}<section className="ecg-panel"><h2>ECG recording</h2><p>Drag or scroll to explore recorded samples. Gaps are not filled in.</p><RecordingGraph sessionId={detail.session.id} sampleRate={detail.session.sample_rate_hz} start={detail.session.started_at} end={detail.session.ended_at || report.asOf} units={detail.session.units} /></section>
      <section className="ecg-panel"><h2>Symptoms</h2>{report.symptomMarkers.length ? report.symptomMarkers.map(marker => <div className="study-report-row" key={marker.id}><strong>{marker.symptom}</strong><span>{date(marker.marked_at)}</span>{marker.note && <p>{marker.note}</p>}</div>) : <p>No symptoms marked during this recording.</p>}</section>
      <section className="ecg-panel"><h2>Clinician reviews</h2>{reviews.length ? reviews.map(review => <article className="study-review" key={review.id}><div><strong>{review.doctor_name}</strong><span>{date(review.signed_at)} · {review.signatureVerified ? 'Signature verified' : 'Signature could not be verified'}</span></div><p>{review.summary}</p></article>) : <p>No clinician review has been released for this study.</p>}</section>
      <section className="ecg-panel study-personal-notes"><h2>Personal notes</h2>{detail.notes.map(item => <p key={item.id}>{date(item.created_at)} · {item.note}</p>)}<label htmlFor="ecg-note">Add a note</label><textarea id="ecg-note" value={note} onChange={event => setNote(event.target.value)} maxLength={1000} /><button onClick={addNote} disabled={!note.trim()}>Save note</button></section>
      <p className="ecg-disclaimer">{report.interpretation} Stored signal coverage does not establish clinical signal quality.</p>
    </> : <p role="status">Loading report…</p>}
  </main>;
}
