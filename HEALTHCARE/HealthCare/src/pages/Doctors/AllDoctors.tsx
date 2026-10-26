import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getAllDoctors } from '../../redux/actions/doctorAction';
import type { AppDispatch, RootState } from '../../redux/store';
import { hospitalProfiles, type HospitalProfile } from './hospitalProfiles';
import './AllDoctors.css';
import { moveSpotlight } from '../../ui/spotlight';

type Doctor = { _id?: string; id?: string; name?: string; speciality?: string; degree?: string; image?: string };

function Portrait({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const url = src?.startsWith('http') || src?.startsWith('data:') || src?.startsWith('/') ? src : src ? `data:image/jpeg;base64,${src}` : '';
  return url && !failed ? <img src={url} alt={`Portrait of ${name}`} loading="lazy" onError={() => setFailed(true)} /> : <span className="doctor-photo-fallback" aria-hidden="true"><i className="fa-solid fa-user-doctor" /></span>;
}

function ProfileCard({ profile }: { profile: HospitalProfile }) {
  return <article className="doctor-profile-card hl-spotlight hl-reveal" onPointerMove={moveSpotlight}><Portrait src={profile.image} name={profile.name} /><div className="doctor-profile-copy"><span className="doctor-profile-specialty">{profile.specialty}</span><h3>{profile.name}</h3><p>{profile.hospital}</p><p>{profile.focus}</p><Link className="doctor-card-primary hl-button" to={`/doctors/hospital/${profile.id}`}>Profile & appointment →</Link></div></article>;
}

export default function AllDoctors() {
  const dispatch = useDispatch<AppDispatch>();
  const { doctors, loading, error } = useSelector((state: RootState) => state.doctor);
  useEffect(() => { dispatch(getAllDoctors()); }, [dispatch]);
  const roster: Doctor[] = Array.isArray(doctors) ? doctors : [];
  return <main className="doctor-directory">
    <header className="doctor-directory-intro"><span>DOCTOR DIRECTORY</span><h1>Heart specialists</h1><p>Six source-linked profiles from two Bengaluru hospitals. Choose a doctor to see details and request an appointment time.</p></header>
    <section aria-labelledby="st-johns-heading"><div className="doctor-directory-heading"><div><span>ST. JOHN'S MEDICAL COLLEGE HOSPITAL</span><h2 id="st-johns-heading">Cardiology team</h2></div><strong>4 profiles</strong></div><div className="doctor-profile-grid">{hospitalProfiles.filter(item => item.group === 'st-johns').map(profile => <ProfileCard key={profile.name} profile={profile} />)}</div></section>
    <section aria-labelledby="trilife-heading"><div className="doctor-directory-heading"><div><span>TRILIFE HOSPITAL · KALYAN NAGAR</span><h2 id="trilife-heading">Formerly Specialist Hospital</h2></div><strong>2 profiles</strong></div><div className="doctor-profile-grid">{hospitalProfiles.filter(item => item.group === 'trilife').map(profile => <ProfileCard key={profile.name} profile={profile} />)}</div><p className="doctor-directory-note">The original Specialist Hospital listing is dated. The hospital now uses the TriLife name; check the linked profiles for current availability.</p></section>
    <section aria-labelledby="heartline-heading"><div className="doctor-directory-heading"><div><span>HEARTLINE</span><h2 id="heartline-heading">In-app consultations</h2></div><Link to="/appointments/doctors">See available times →</Link></div><p className="doctor-directory-note">Chat and video are available only with an onboarded clinician after a confirmed appointment. Hospital profiles need verified Heartline clinician accounts before chat and video can be used.</p>{loading && !roster.length ? <p role="status">Loading clinician roster…</p> : error && !roster.length ? <p className="doctor-directory-note">Heartline clinician availability will appear here when the service is connected.</p> : roster.length ? <div className="doctor-profile-grid">{roster.map(doctor => <article className="doctor-profile-card hl-spotlight hl-reveal" onPointerMove={moveSpotlight} key={doctor._id || doctor.id}><Portrait src={doctor.image} name={doctor.name || 'Clinician'} /><div className="doctor-profile-copy"><span className="doctor-profile-specialty">{doctor.speciality || 'Clinician'}</span><h3>{doctor.name}</h3><p>{doctor.degree || 'Heartline profile'}</p><Link to={`/doctors/${doctor._id || doctor.id}`}>View profile →</Link></div></article>)}</div> : <p className="doctor-directory-note">No Heartline clinicians have been added yet.</p>}</section>
  </main>;
}
