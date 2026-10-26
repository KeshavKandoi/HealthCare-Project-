import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getAllDoctors } from '../../redux/actions/doctorAction'
import './AllDoctors.css'

function DoctorPortrait({ doctor }) {
  const [imageFailed, setImageFailed] = useState(false)
  const image = doctor?.image
  const src = image?.startsWith('http') || image?.startsWith('data:') ? image : image ? `data:image/jpeg;base64,${image}` : null
  if (!src || imageFailed) return <div className="doctor-avatar-fallback" aria-hidden="true"><i className="fa-solid fa-user-doctor" /></div>
  return <img src={src} alt="" className="doctor-card-photo" onError={() => setImageFailed(true)} />
}

function AllDoctors() {
  const dispatch = useDispatch()
  const { doctors, loading, error } = useSelector(state => state.doctor)
  const [query, setQuery] = useState('')
  const [specialty, setSpecialty] = useState('all')

  useEffect(() => { dispatch(getAllDoctors()) }, [dispatch])

  const roster = Array.isArray(doctors) ? doctors : []
  const specialties = [...new Set(roster.map(doctor => doctor.speciality).filter(Boolean))].sort()
  const filtered = roster.filter(doctor => {
    const matchesSpecialty = specialty === 'all' || doctor.speciality === specialty
    const matchesQuery = `${doctor.name || ''} ${doctor.speciality || ''} ${doctor.degree || ''}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesSpecialty && matchesQuery
  })

  return (
    <main className="doctors-page">
      <section className="doctors-hero"><div className="doctors-hero-inner"><span className="doctors-overline"><span /> HEARTLINE / CARE TEAM</span><h1>Find care that <em>feels right.</em></h1><p>Explore the doctors currently listed on Heartline. Open a profile to review details and available appointments.</p></div><div className="doctors-hero-mark" aria-hidden="true"><i className="fa-solid fa-heart-pulse" /></div></section>

      <section className="doctors-content" aria-label="Doctors directory">
        <div className="doctors-section-head"><div><span className="doctors-overline">DOCTOR DIRECTORY</span><h2>Available profiles</h2></div><span className="doctors-count">{roster.length} {roster.length === 1 ? 'doctor' : 'doctors'} listed</span></div>

        {roster.length > 0 && <div className="doctors-controls"><label className="doctors-search"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><span className="sr-only">Search doctors</span><input type="search" placeholder="Search by name or specialty" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="doctors-filter"><span className="sr-only">Filter by specialty</span><select value={specialty} onChange={event => setSpecialty(event.target.value)}><option value="all">All specialties</option>{specialties.map(item => <option key={item} value={item}>{item}</option>)}</select></label></div>}

        {loading && roster.length === 0 ? <div className="doctors-state" role="status"><span className="doctors-state-icon"><i className="fa-solid fa-spinner fa-spin" /></span><h3>Loading doctors</h3><p>Checking the latest directory.</p></div>
          : error && roster.length === 0 ? <div className="doctors-state" role="alert"><span className="doctors-state-icon"><i className="fa-solid fa-triangle-exclamation" /></span><h3>We couldn't load the directory</h3><p>{error}</p><button type="button" onClick={() => dispatch(getAllDoctors())}>Try again</button></div>
          : roster.length === 0 ? <div className="doctors-state"><span className="doctors-state-icon"><i className="fa-solid fa-user-doctor" /></span><h3>No doctors are listed yet</h3><p>The directory is ready, but no doctor profiles have been added. Check back later or contact us for help finding care.</p><Link to="/contact">Contact Heartline <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div>
          : filtered.length === 0 ? <div className="doctors-state"><span className="doctors-state-icon"><i className="fa-solid fa-magnifying-glass" /></span><h3>No matching doctors</h3><p>Try another name or specialty.</p><button type="button" onClick={() => { setQuery(''); setSpecialty('all') }}>Clear filters</button></div>
          : <div className="doctors-grid">{filtered.map(doctor => <article className="doctor-card" key={doctor._id || doctor.id}><div className="doctor-card-top"><DoctorPortrait doctor={doctor} /><span className="doctor-specialty">{doctor.speciality || 'Medical specialist'}</span></div><h3>{doctor.name}</h3><p className="doctor-degree">{doctor.degree || 'Doctor'}</p><div className="doctor-card-details">{doctor.experience && <span><i className="fa-regular fa-clock" aria-hidden="true" /> {doctor.experience}</span>}{doctor.fees != null && <span>₹{doctor.fees} consultation</span>}</div><Link to={`/doctors/${doctor._id || doctor.id}`} className="doctor-card-link">View profile <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></article>)}</div>}
      </section>
    </main>
  )
}

export default AllDoctors
