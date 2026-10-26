import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../Api/API';
import type { HealthMeasurement, MedicalEvent } from '../types/domain';
import './patientWorkspace.css';
import './HealthHistory.css';

type HistoryData = { events: MedicalEvent[]; measurements: HealthMeasurement[] };
type Entry = { id: string; time: string; category: 'measurement' | 'history'; title: string; detail: string; source?: string };
const kindName: Record<string, string> = { heart_rate: 'Heart rate', systolic_bp: 'Systolic pressure', diastolic_bp: 'Diastolic pressure', blood_glucose: 'Blood glucose', oxygen: 'Oxygen saturation', weight: 'Weight' };

export default function HealthHistory() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'blood-pressure' | 'measurements' | 'history'>('all');
  const [period, setPeriod] = useState<'30' | '90' | 'all'>('90');
  useEffect(() => { API.get<HistoryData>('/my-health/overview').then(response => setData(response.data)).catch(() => setError('Could not load your health history.')); }, []);
  const entries = useMemo<Entry[]>(() => {
    if (!data) return [];
    const measurements = data.measurements.map(item => ({ id: item.id, time: item.measured_at, category: 'measurement' as const, title: kindName[item.kind] || item.kind, detail: `${item.value} ${item.unit}`, source: item.source }));
    const history = data.events.map(item => ({ id: item.id, time: item.occurred_on || item.created_at, category: 'history' as const, title: item.title, detail: item.description || item.event_type.replaceAll('_', ' '), source: item.source }));
    const minimum = period === 'all' ? 0 : Date.now() - Number(period) * 86400000;
    return [...measurements, ...history].filter(item => Date.parse(item.time) >= minimum)
      .filter(item => filter === 'all' || filter === 'history' && item.category === 'history' || filter === 'measurements' && item.category === 'measurement' || filter === 'blood-pressure' && (item.title === 'Systolic pressure' || item.title === 'Diastolic pressure'))
      .sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  }, [data, filter, period]);
  const latest = (kind: HealthMeasurement['kind']) => data?.measurements.filter(item => item.kind === kind).sort((a, b) => Date.parse(b.measured_at) - Date.parse(a.measured_at))[0];
  const systolic = latest('systolic_bp'), diastolic = latest('diastolic_bp'), pulse = latest('heart_rate');
  return <main className="pw-shell history-shell"><header className="history-heading"><div><p className="pw-eyebrow">PERSONAL RECORD / HISTORY</p><h1>Health history</h1><p>Measurements and medical events in date order, with their recorded source.</p></div><Link to="/my-health" className="history-link">Add a record ↗</Link></header>
    {error && <p className="pw-error" role="alert">{error}</p>}
    <section className="history-summary" aria-label="Most recent measurements"><article><span>BLOOD PRESSURE</span><strong>{systolic?.value ?? '—'}<small> / </small>{diastolic?.value ?? '—'}</strong><p>mmHg · latest values may be from different times</p></article><article><span>HEART RATE</span><strong>{pulse?.value ?? '—'}</strong><p>bpm · {pulse ? new Date(pulse.measured_at).toLocaleString() : 'No reading yet'}</p></article><article><span>RECORDED ITEMS</span><strong>{(data?.measurements.length || 0) + (data?.events.length || 0)}</strong><p>Measurements and history entries</p></article></section>
    <section className="history-panel"><div className="history-controls"><div><h2>Record timeline</h2><p>These are stored observations. They are not automatically interpreted.</p></div><div className="history-filters"><label>Show<select value={filter} onChange={event => setFilter(event.target.value as typeof filter)}><option value="all">All records</option><option value="blood-pressure">Blood pressure</option><option value="measurements">Measurements</option><option value="history">Medical events</option></select></label><label>Period<select value={period} onChange={event => setPeriod(event.target.value as typeof period)}><option value="30">30 days</option><option value="90">90 days</option><option value="all">All time</option></select></label></div></div>
      {entries.length ? <div className="history-table-wrap"><table className="history-table"><thead><tr><th scope="col">Recorded at</th><th scope="col">Record</th><th scope="col">Value or details</th><th scope="col">Source</th></tr></thead><tbody>{entries.map(item => <tr key={`${item.category}-${item.id}`}><td><time dateTime={item.time}>{new Date(item.time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: item.time.includes('T') ? 'short' : undefined })}</time></td><td><span className={`history-type ${item.category}`}>{item.category === 'history' ? 'History' : 'Reading'}</span><strong>{item.title}</strong></td><td>{item.detail}</td><td>{item.source || 'Patient'}</td></tr>)}</tbody></table></div> : <div className="history-empty">{data ? 'No records match this view.' : 'Loading your records…'} <Link to="/my-health">Open My Health</Link></div>}</section>
    <p className="history-footnote">If a reading concerns you, confirm it with your measuring device and your care team. <Link to="/bp-alerts">Manage family BP alerts</Link></p>
  </main>;
}
