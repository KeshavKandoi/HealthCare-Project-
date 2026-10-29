import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import API from '../../Api/API';
import { hospitalProfiles } from './hospitalProfiles';
import './AllDoctors.css';

type Request = { id: string; profile_id: string; preferred_start_at: string; status: string; appointment_id?: string | null; created_at: string };
type Slot = { startAt: string; endAt: string };
type LinkRecord = { profile_id: string; doctor_id: string };
const format = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });
export default function HospitalDoctor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const signedIn = useSelector((state: RootState) => Boolean(state.auth.user));
  const profile = hospitalProfiles.find(item => item.id === id);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState<Request[]>([]);
  const [linkedDoctorId, setLinkedDoctorId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!profile || !signedIn) return;
    Promise.all([API.get('/hospital-requests/mine'), API.get('/hospital-requests/profiles')]).then(([a, b]) => {
      setRequests(a.data.requests.filter((item: Request) => item.profile_id === profile.id));
      setLinkedDoctorId((b.data.linked as LinkRecord[]).find(item => item.profile_id === profile.id)?.doctor_id || '');
    }).catch(() => setError('Could not load current booking information.'));
  }, [profile, signedIn]);
  useEffect(() => {
    if (!date || !linkedDoctorId) return;
    setSlots([]); setSlot(null);
    API.get(`/scheduling/doctors/${linkedDoctorId}/slots`, { params: { date } }).then(({ data }) => setSlots(data.slots)).catch(() => setError('Could not load open times.'));
  }, [date, linkedDoctorId]);
  if (!profile) return <main className="doctor-detail"><h1>Doctor not found</h1><Link to="/doctors">Back to doctors</Link></main>;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!slot) return;
    setBusy(true); setError('');
    try { await API.post('/hospital-requests', { profileId: profile.id, preferredStartAt: slot.startAt, reason }); navigate('/appointments'); }
    catch (cause) { setError(axios.isAxiosError(cause) ? cause.response?.data?.message || 'Could not send appointment request.' : 'Could not send appointment request.'); }
    finally { setBusy(false); }
  };
  return <main className="doctor-detail"><Link to="/doctors" className="doctor-back">← All doctors</Link>
    <section className="doctor-detail-hero"><img src={profile.image} alt={`Portrait of ${profile.name}`} /><div><span className="doctor-profile-specialty">{profile.specialty}</span><h1>{profile.name}</h1><p>{profile.role}</p></div></section>
    <div className="doctor-detail-columns"><section className="doctor-detail-panel"><span className="doctor-detail-label">APPOINTMENT</span><h2>Book a consultation</h2>{!signedIn ? <><p>Sign in to view open times and request a consultation.</p><Link className="doctor-detail-signin hl-button" to="/login">Sign in or explore the demo →</Link></> : linkedDoctorId ? <><p>Choose an open time from this doctor’s published Heartline schedule. Your request goes to the clinician for confirmation.</p><form onSubmit={submit}><label>Date<input required type="date" value={date} min={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })} onChange={event => setDate(event.target.value)} /></label>{date&&<div className="doctor-slot-list"><strong>Open times · IST</strong><div>{slots.length ? slots.map(item => <button className={`hl-button hl-button--choice ${slot?.startAt===item.startAt?'selected':''}`} aria-pressed={slot?.startAt===item.startAt} type="button" key={item.startAt} onClick={()=>setSlot(item)}>{new Date(item.startAt).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'numeric',minute:'2-digit'})}</button>) : <p>No available times on this date.</p>}</div></div>}<label>Reason for visit (optional)<textarea value={reason} maxLength={500} onChange={event => setReason(event.target.value)} placeholder="A short note for the clinician" /></label>{slot&&<p>Selected: <strong>{format(slot.startAt)}</strong></p>}{error&&<p role="alert" className="doctor-detail-error">{error}</p>}<button className="hl-button" disabled={busy||!slot} type="submit">{busy?'Sending…':'Send appointment request'}</button></form></> : <><p className="doctor-detail-pending">Online booking is not available yet. This doctor needs a verified Heartline account and a published schedule before requests can be delivered.</p>{error&&<p role="alert" className="doctor-detail-error">{error}</p>}</>}</section>
      <section className="doctor-detail-panel"><span className="doctor-detail-label">YOUR HISTORY</span><h2>Requests with this doctor</h2>{!signedIn?<p>Sign in to see your request history.</p>:requests.length ? requests.map(item => <article className="doctor-request" key={item.id}><strong>{format(item.preferred_start_at)}</strong><span className={`doctor-status ${item.status}`}>{item.status}</span><small>Requested {format(item.created_at)}</small>{item.appointment_id && <Link to={`/care-conversations?appointment=${item.appointment_id}`}>Open messages & calls →</Link>}</article>) : <p>No appointment requests yet.</p>}<Link to="/appointments">All appointments →</Link></section></div></main>;
}
