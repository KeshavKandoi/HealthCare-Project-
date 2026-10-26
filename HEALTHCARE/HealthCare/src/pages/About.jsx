import { Link } from 'react-router-dom'
import careImage from '../assets/about-cardiac-care.png'
import './About.css'

const pillars = [
  { icon: 'fa-wave-square', title: 'A clear signal', copy: 'See ECG readings and heart rate together, with a recent reading always easy to find.' },
  { icon: 'fa-clock-rotate-left', title: 'A fuller picture', copy: 'Keep recorded health information in one place so changes are easier to discuss.' },
  { icon: 'fa-user-doctor', title: 'A path to care', copy: 'Explore the doctors directory and the services available through Heartline.' },
]

function About() {
  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-hero-copy">
          <span className="about-eyebrow"><span /> ABOUT HEARTLINE</span>
          <h1>Heart care feels better when you can <em>see the full picture.</em></h1>
          <p>Heartline brings your readings, health history and care options into one place. We make it easier to follow what is happening and take the next step with confidence.</p>
          <div className="about-hero-actions">
            <Link to="/ecg-monitor" className="about-primary-link">Explore ECG monitoring <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
            <Link to="/doctors" className="about-secondary-link">Find a doctor</Link>
          </div>
        </div>
        <div className="about-hero-image">
          <img src={careImage} alt="Clinician reviewing a heart rhythm display with a patient" />
          <div className="about-image-label"><i className="fa-solid fa-heart-pulse" aria-hidden="true" /> CARE, INFORMED BY EVERY READING</div>
        </div>
      </section>

      <section className="about-intro">
        <div><span className="about-section-label">OUR PURPOSE</span><h2>Make heart health easier to understand.</h2></div>
        <div><p>Health data is most useful when it is clear and available at the right moment. Heartline gives people a place to view incoming ECG data, revisit saved readings and find support.</p><p>We focus on a calm experience that makes complex information easier to navigate while keeping medical decisions with qualified professionals.</p></div>
      </section>

      <section className="about-pillars" aria-labelledby="about-pillars-title">
        <div className="about-section-head"><span className="about-section-label">HOW HEARTLINE HELPS</span><h2 id="about-pillars-title">Designed around the moments that matter.</h2></div>
        <div className="about-pillar-grid">{pillars.map((pillar, index) => (
          <article className="about-pillar" key={pillar.title}>
            <span className="about-pillar-index">0{index + 1} / 03</span>
            <span className="about-pillar-icon"><i className={'fa-solid ' + pillar.icon} aria-hidden="true" /></span>
            <h3>{pillar.title}</h3><p>{pillar.copy}</p>
          </article>
        ))}</div>
      </section>

      <section className="about-final"><div><span className="about-section-label">YOUR NEXT STEP</span><h2>Stay close to what matters.</h2><p>Explore your ECG monitor or learn more about the care options available to you.</p></div><Link to="/ecg-monitor" className="about-primary-link">Open ECG monitor <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></section>
    </main>
  )
}

export default About
