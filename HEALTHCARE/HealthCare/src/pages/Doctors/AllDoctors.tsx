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
  return <article className="doctor-profile-card hl-spotlight hl-reveal" onPointerMove={moveSpotlight}><Portrait src={profile.image} name={profile.name} /><div className="doctor-profile-copy"><span className="doctor-profile-specialty">{profile.specialty}</span><h3>{profile.name}</h3><p>{profile.focus}</p><Link className="doctor-card-primary hl-button" to={`/doctors/hospital/${profile.id}`}>Profile & appointment →</Link></div></article>;
}

export default function AllDoctors() {
  const dispatch = useDispatch<AppDispatch>();
  const { doctors, loading, error } = useSelector((state: RootState) => state.doctor);
  useEffect(() => { dispatch(getAllDoctors()); }, [dispatch]);
  const roster: Doctor[] = Array.isArray(doctors) ? doctors : [];
  return <main className="doctor-directory">
    <header className="doctor-directory-intro"><span>DOCTOR DIRECTORY</span><h1>Heart specialists</h1><p>Explore doctor profiles. Online booking is available only when a verified clinician has published a schedule.</p></header>
    <section aria-label="Doctor profiles"><div className="doctor-profile-grid">
      {hospitalProfiles.filter(profile => profile.id !== 'st-johns-usha-m-k').map(profile => <ProfileCard key={profile.id} profile={profile} />)}
      {roster.map(doctor => <article className="doctor-profile-card hl-spotlight hl-reveal" onPointerMove={moveSpotlight} key={doctor._id || doctor.id}><Portrait src={doctor.image} name={doctor.name || 'Clinician'} /><div className="doctor-profile-copy"><span className="doctor-profile-specialty">{doctor.speciality || 'Clinician'}</span><h3>{doctor.name}</h3><p>{doctor.degree || 'Clinician profile'}</p><Link to={`/doctors/${doctor._id || doctor.id}`}>View profile →</Link></div></article>)}
    </div>{loading && <p role="status" className="doctor-directory-note">Loading additional clinicians…</p>}{error && <p className="doctor-directory-note">Additional clinician profiles could not be loaded.</p>}</section>
  </main>;
}
