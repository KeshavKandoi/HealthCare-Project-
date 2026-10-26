import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import API from '../Api/API';
import { FhirExportButton } from './CareOperations';
import type { HealthMeasurement, HealthProfile, MedicalEvent } from '../types/domain';
import './patientWorkspace.css';

type HealthTab = 'Overview' | 'Medical History' | 'Medications' | 'Allergies' | 'Health Trends' | 'Documents';
type Field = readonly [key: string, label: string, type: 'text' | 'date' | 'number' | 'email' | 'textarea' | 'datetime-local' | 'select', choices?: string];
type FormValue = Record<string, string | number | null>;
type RecordKind = 'events' | 'medications' | 'allergies' | 'measurements';
type Medication = { id: string; name: string; dosage: string | null; status: 'active' | 'discontinued' | 'completed'; start_date: string | null; created_at: string };
type Allergy = { id: string; substance: string; reaction: string | null; identified_on: string | null; created_at: string };
type EmergencyContact = { name: string | null; relationship: string | null; email: string | null; notes: string | null };
type HealthData = {
  account: { name: string; email: string };
  profile: HealthProfile | null;
  contact: EmergencyContact | null;
  events: MedicalEvent[];
  medications: Medication[];
  allergies: Allergy[];
  measurements: HealthMeasurement[];
};
const tabs: HealthTab[] = ['Overview', 'Medical History', 'Medications', 'Allergies', 'Health Trends', 'Documents'];
const profileFields: Field[] = [['dob', 'Date of birth', 'date'], ['gender', 'Gender', 'text'], ['blood_group', 'Blood group', 'text'], ['height_cm', 'Height (cm)', 'number'], ['weight_kg', 'Weight (kg)', 'number'], ['notes', 'Important notes', 'textarea']];
const contactFields: Field[] = [['name', 'Contact name', 'text'], ['relationship', 'Relationship', 'text'], ['email', 'Email (optional)', 'email'], ['notes', 'Notes', 'textarea']];
const recordConfig: Record<RecordKind, { title: string; fields: Field[] }> = {
  events: { title: 'Medical event', fields: [['event_type', 'Type', 'select', 'illness,surgery,condition,hospital,treatment,other'], ['title', 'Title', 'text'], ['occurred_on', 'Date', 'date'], ['description', 'Description', 'textarea']] },
  medications: { title: 'Medication', fields: [['name', 'Medication name', 'text'], ['dosage', 'Recorded dosage', 'text'], ['frequency', 'Frequency', 'text'], ['start_date', 'Start date', 'date'], ['end_date', 'End date', 'date'], ['status', 'Status', 'select', 'active,discontinued,completed'], ['prescriber', 'Prescribing doctor, if known', 'text'], ['notes', 'Notes', 'textarea']] },
  allergies: { title: 'Allergy', fields: [['substance', 'Substance', 'text'], ['reaction', 'Known reaction', 'text'], ['severity', 'Severity', 'select', 'unknown,mild,moderate,severe'], ['identified_on', 'Date identified', 'date'], ['notes', 'Notes', 'textarea']] },
  measurements: { title: 'Measurement', fields: [['kind', 'Type', 'select', 'heart_rate,systolic_bp,diastolic_bp,blood_glucose,oxygen,weight'], ['value', 'Value', 'number'], ['unit', 'Unit', 'text'], ['measured_at', 'Measured at', 'datetime-local']] },
};

function FormFields({ definition, value, onChange }: { definition: Field[]; value: FormValue; onChange: (next: FormValue) => void }) {
  return <div className="pw-form-grid">{definition.map(([key, label, type, choices]) => <label key={key}>{label}{type === 'textarea'
    ? <textarea value={value[key] ?? ''} onChange={event => onChange({ ...value, [key]: event.target.value })} />
    : type === 'select' ? <select value={value[key] ?? ''} onChange={event => onChange(key === 'kind' ? { ...value, kind: event.target.value, unit: ({ heart_rate: 'bpm', systolic_bp: 'mmHg', diastolic_bp: 'mmHg', blood_glucose: 'mg/dL', oxygen: '%', weight: 'kg' } as Record<string, string>)[event.target.value] || '', measured_at: value.measured_at || new Date().toISOString().slice(0, 16) } : { ...value, [key]: event.target.value })}><option value="">Choose</option>{choices?.split(',').map(choice => <option key={choice} value={choice}>{choice.replaceAll('_', ' ')}</option>)}</select>
    : <input type={type} value={value[key] ?? ''} onChange={event => onChange({ ...value, [key]: event.target.value })} />}</label>)}</div>;
}

function EditSection({ title, definition, initial, save }: { title: string; definition: Field[]; initial: FormValue; save: (value: FormValue) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<FormValue>(initial);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try { await save(Object.fromEntries(definition.map(([key]) => [key, value[key] ?? null]))); setEditing(false); }
    finally { setBusy(false); }
  };
  return <section className="pw-card"><div className="pw-row"><h3>{title}</h3><button type="button" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</button></div>{editing
    ? <form onSubmit={submit}><FormFields definition={definition} value={value} onChange={setValue} /><button disabled={busy}>Save {title.toLowerCase()}</button></form>
    : <dl className="pw-details">{definition.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{initial[key] || 'Not provided'}</dd></div>)}</dl>}</section>;
}

function recordTitle(item: MedicalEvent | Medication | Allergy | HealthMeasurement): string {
  if ('title' in item) return item.title;
  if ('name' in item) return item.name;
  if ('substance' in item) return item.substance;
  return item.kind.replaceAll('_', ' ');
}

export default function MyHealth() {
  const [tab, setTab] = useState<HealthTab>('Overview');
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('All changes saved');
  const [newItem, setNewItem] = useState<FormValue>({});
  const [days, setDays] = useState(30);
  const [clock, setClock] = useState(0);
  const load = useCallback(async () => {
    try { const response = await API.get<HealthData>('/my-health/overview'); setData(response.data); setError(''); }
    catch { setError('Could not load your health records'); }
  }, []);
  useEffect(() => { void load(); const timer = window.setTimeout(() => setClock(Date.now()), 0); return () => clearTimeout(timer); }, [load]);
  const save = async (path: string, value: FormValue, method: 'put' | 'post' = 'put') => {
    setSaving('Saving…');
    const body = path === 'measurements' && value.measured_at ? { ...value, measured_at: new Date(String(value.measured_at)).toISOString() } : value;
    try {
      const response = method === 'post' ? await API.post<{ alertsQueued?: number; alertQueueError?: boolean }>(`/my-health/${path}`, body) : await API.put(`/my-health/${path}`, body);
      setSaving(response.data?.alertsQueued ? 'Reading saved · family alert queued' : 'All changes saved'); setNewItem({}); await load();
      if (response.data?.alertQueueError) setError('Reading saved, but a family alert could not be queued. Check BP alerts and contact your family directly if needed.');
    } catch (cause) {
      setSaving("Couldn't save changes"); setError(axios.isAxiosError(cause) ? cause.response?.data?.message || 'Save failed' : 'Save failed');
    }
  };
  const remove = async (path: RecordKind, id: string) => {
    if (!window.confirm('Delete this entry?')) return;
    try { await API.delete(`/my-health/${path}/${id}`); await load(); }
    catch { setError('Could not delete entry'); }
  };
  const profileInput = (overrides: FormValue = {}): FormValue => Object.fromEntries([
    ...profileFields.map(([key]) => [key, data?.profile?.[key as keyof HealthProfile] ?? null]),
    ['units', data?.profile?.units || 'metric'], ['allergy_state', data?.profile?.allergy_state || 'unknown'], ...Object.entries(overrides),
  ]);
  const collection = (key: RecordKind) => {
    if (!data) return null;
    const config = recordConfig[key];
    const items = data[key];
    return <><form className="pw-card" onSubmit={event => { event.preventDefault(); void save(key, newItem, 'post'); }}><h3>Add {config.title.toLowerCase()}</h3><FormFields definition={config.fields} value={newItem} onChange={setNewItem} /><button>Save {config.title.toLowerCase()}</button></form><div className="pw-list">{items.length ? items.map(item => <article className="pw-card" key={item.id}><div className="pw-row"><div><h3>{recordTitle(item)}</h3><p>{'occurred_on' in item ? item.occurred_on : 'start_date' in item ? item.start_date : 'identified_on' in item ? item.identified_on : 'measured_at' in item ? item.measured_at : null}</p></div><button type="button" disabled={'source' in item && item.source === 'clinician'} onClick={() => void remove(key, item.id)}>Delete</button></div>{'description' in item && <p>{item.description}</p>}{'reaction' in item && <p>{item.reaction}</p>}{'dosage' in item && <p>{item.dosage}</p>}{'value' in item && <p><strong>{item.value} {item.unit}</strong> · {'source' in item ? item.source : 'Patient entered'}</p>}</article>) : <div className="pw-empty">No {key} recorded. Missing information does not imply a medical finding.</div>}</div></>;
  };
  const recent = data?.measurements.filter(measurement => Date.parse(measurement.measured_at) >= clock - days * 86400000) || [];
  const kinds = [...new Set(recent.map(measurement => measurement.kind))];
  const meds = data?.medications || [];
  const counts = ([['Active', 'active'], ['Discontinued', 'discontinued'], ['Completed', 'completed']] as const).map(([name, status]) => ({ name, value: meds.filter(medication => medication.status === status).length })).filter(count => count.value);
  const months = Object.entries((data?.events || []).reduce<Record<string, number>>((acc, event) => { const month = (event.occurred_on || event.created_at).slice(0, 7); acc[month] = (acc[month] || 0) + 1; return acc; }, {})).map(([month, count]) => ({ month, count }));
  return <main className="pw-shell"><div className="pw-heading"><div><p className="pw-eyebrow">YOUR PERSONAL RECORD</p><h1>My Health</h1><p>Your personal health information, organized securely in one place.</p><small>{data?.account?.name} · {data?.account?.email}</small></div><span role="status">{saving}</span></div>{error && <p className="pw-error" role="alert">{error}</p>}<nav className="pw-tabs" aria-label="My Health sections">{tabs.map(next => <button key={next} className={tab === next ? 'active' : ''} onClick={() => { setTab(next); setNewItem({}); }}>{next}</button>)}</nav>{!data ? <div className="pw-empty">Loading your health information…</div> : tab === 'Overview' ? <div className="pw-columns"><div><EditSection key={JSON.stringify(data.profile)} title="Personal information" definition={profileFields} initial={data.profile as unknown as FormValue || {}} save={value => save('profile', { ...value, units: data.profile?.units || 'metric', allergy_state: data.profile?.allergy_state || 'unknown' })} /><EditSection key={JSON.stringify(data.contact)} title="Emergency contact" definition={contactFields} initial={data.contact as unknown as FormValue || {}} save={value => save('contact', value)} /></div><div><section className="pw-card"><h3>At a glance</h3><p>{data.events.length} history entries · {data.medications.length} medications · {data.measurements.length} measurements</p><p>Allergy status: {data.profile?.allergy_state === 'none_confirmed' ? 'No known allergies, confirmed by you' : data.allergies.length ? 'Allergies recorded' : 'Information not provided'}</p><Link to="/ecg-history">ECG recordings →</Link></section><section className="pw-card"><h3>Preferences</h3><label>Measurement units <select value={data.profile?.units || 'metric'} onChange={event => void save('profile', profileInput({ units: event.target.value }))}><option value="metric">Metric</option><option value="imperial">Imperial</option></select></label><p>Emergency contact details are stored for reference. Family BP texts require a verified caregiver phone and configured SMS service.</p><Link to="/bp-alerts">Set up family BP alerts →</Link><br /><Link to="/health-history">View organized health history →</Link><a href="#export" onClick={async event => { event.preventDefault(); const response = await API.get('/my-health/export', { responseType: 'blob' }); const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = 'my-health.json'; link.click(); URL.revokeObjectURL(url); }}>Export my records →</a><FhirExportButton /></section></div></div> : tab === 'Medical History' ? collection('events') : tab === 'Medications' ? collection('medications') : tab === 'Allergies' ? <><section className="pw-card"><h3>Allergy information</h3><p>Missing records do not mean no known allergies.</p><button onClick={() => void save('profile', profileInput({ allergy_state: 'none_confirmed' }))}>Confirm no known allergies</button></section>{collection('allergies')}</> : tab === 'Health Trends' ? <><section className="pw-card"><div className="pw-row"><h3>Measurements over time</h3><select value={days} onChange={event => setDays(Number(event.target.value))}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select></div>{kinds.length ? kinds.map(kind => { const series = recent.filter(measurement => measurement.kind === kind).reverse().map(measurement => ({ date: new Date(measurement.measured_at).toLocaleDateString(), value: Number(measurement.value), unit: measurement.unit })); return <div key={kind}><h4>{kind.replaceAll('_', ' ')} · {series[0]?.unit}</h4><div className="pw-chart"><ResponsiveContainer><LineChart data={series}><CartesianGrid stroke="#2c333d" /><XAxis dataKey="date" stroke="#98a3af" /><YAxis stroke="#98a3af" /><Tooltip /><Line dataKey="value" stroke="#64d9c4" isAnimationActive={false} /></LineChart></ResponsiveContainer></div></div>; }) : <div className="pw-empty">No measured data for this time range.</div>}</section><div className="pw-columns"><section className="pw-card"><h3>Medication overview</h3>{counts.length ? <div className="pw-chart"><ResponsiveContainer><PieChart><Pie data={counts} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82}>{counts.map((_, index) => <Cell key={index} fill={['#64d9c4', '#e6b66b', '#98a3af'][index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div> : <p>No medications recorded.</p>}{counts.map(count => <p key={count.name}>{count.name}: {count.value}</p>)}</section><section className="pw-card"><h3>Recorded events by month</h3>{months.length ? <div className="pw-chart"><ResponsiveContainer><BarChart data={months}><XAxis dataKey="month" stroke="#98a3af" /><YAxis allowDecimals={false} stroke="#98a3af" /><Tooltip /><Bar dataKey="count" fill="#64d9c4" /></BarChart></ResponsiveContainer></div> : <p>No medical events recorded.</p>}</section></div>{collection('measurements')}</> : <section className="pw-card"><h3>My Documents</h3><p>Secure document storage is not configured in this deployment. Uploads are unavailable until private storage and malware screening are connected.</p></section>}</main>;
}
