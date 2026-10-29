import { Link } from 'react-router-dom';
import './PublicWebsite.css';
type Kind = 'features' | 'how-it-works' | 'technology' | 'about';
const content: Record<Kind, { label: string; title: string; intro: string; items: [string, string][] }> = {
  features: { label: 'THE HEARTLINE PLATFORM', title: 'A clearer view.\nA connected record.', intro: 'From your first recording to your next appointment, keep the details that matter within reach.', items: [
    ['Live ECG monitoring', 'View incoming samples, pause the display without stopping acquisition, and return to the live signal.'],
    ['Recording playback', 'Review stored sessions, navigate the timeline and inspect captured samples. Recording length depends on the configured device and storage.'],
    ['Personal health records', 'Organize recorded measurements, medical history, medications and allergies.'],
    ['Appointments and care plans', 'Explore configured providers and request an appointment. Requests are subject to confirmation; care plans depend on your care team.'],
    ['Device management', 'Manage pairing, device contact and gateway diagnostics. Physical ESP32 integration requires setup and verification.'],
    ['Context for conversations', 'Keep timestamped symptoms alongside recordings. Communication features depend on your account and confirmed care arrangements.'],
  ] },
  'how-it-works': { label: 'FROM THE SENSOR TO THE SCREEN', title: 'One signal.\nA connected journey.', intro: 'Follow the acquisition path. Every stage has a purpose, from preserving sample order to helping you revisit a recording.', items: [
    ['01 / Electrodes & AD8232', 'An analog ECG front end captures an electrical signal. Electrode placement and safe electrical isolation require appropriate hardware guidance.'],
    ['02 / ESP32 acquisition', 'The firmware targets 250 samples per second and transmits sequenced, timestamped raw values with lead-off information. The actual rate must be measured on the board.'],
    ['03 / Authenticated gateway', 'A local USB serial gateway forwards packets through the existing authenticated ingestion path. Missing hardware data is never replaced with a demonstration signal.'],
    ['04 / Recording storage', 'PostgreSQL stores sessions and waveform chunks. Sample order, timestamps and gaps remain part of the record.'],
    ['05 / ECG visualization', 'The viewer loads the visible time range for scrolling and zoom. Amplitude units depend on verified calibration.'],
    ['06 / Patient & authorized review', 'Patients revisit recordings and mark symptoms. Authorized review tools provide access according to account permissions.'],
  ] },
  technology: { label: 'ENGINEERED FOR CONTEXT', title: 'A careful path\nfor every sample.', intro: 'A modular acquisition and recording architecture. Explore the layers below to see what each contributes.', items: [
    ['ESP32 + AD8232', 'An analog front end and microcontroller provide the physical acquisition path. USB firmware and gateway software need bench verification before use with hardware.'],
    ['React + TypeScript', 'Typed interfaces connect the patient workspace, viewport-based waveform rendering and recording playback.'],
    ['Node.js + Express', 'API handlers receive device packets and serve account-scoped recording and health data.'],
    ['PostgreSQL', 'Recording sessions and waveform chunks are persisted separately from presentation. Simulated and genuine sources retain their source metadata.'],
    ['Socket.IO & synchronization', 'Realtime events deliver updates while stored recording ranges support review and reconnection. Network interruptions must remain visible.'],
    ['Authentication & access', 'Existing authentication and patient access controls govern record requests. A public product page never contains private patient data.'],
    ['Research AI', 'The experimental estimation architecture is separate from measured blood pressure. No validated ECG-only BP model is currently established in this app; unavailable estimates stay unavailable.'],
  ] },
  about: { label: 'WHY HEARTLINE EXISTS', title: 'Health information,\nwith more continuity.', intro: 'Heartline is being built to bring ECG recordings, personal health information and care workflows into one understandable place.', items: [
    ['The problem', 'Readings lose context when they are scattered across devices, notes and appointments. A shared timeline makes the record easier to revisit.'],
    ['The vision', 'A calm workspace that helps people keep their information organized and prepare for conversations with their care team.'],
    ['The engineering approach', 'Preserve original samples, make gaps visible, separate simulation from measurement, and make account access explicit.'],
    ['The development journey', 'The application combines recording review, health records and care workflows. ESP32 hardware integration is a prototype awaiting physical verification.'],
    ['What comes next', 'Bench testing the acquisition path, improving device setup and evaluating research models against reference data. Roadmap items are development goals, not available clinical services.'],
  ] },
};
export default function PublicInformation({ kind }: { kind: Kind }) {
  const page = content[kind];
  return <main className={`pub-site pub-information pub-${kind}`}>
    <header className="pub-section pub-page-hero"><span className="pub-eyebrow">{page.label}</span><h1>{page.title}</h1><p>{page.intro}</p><span className="pub-page-index">HEARTLINE / {kind.toUpperCase().replaceAll('-', ' ')}</span></header>
    {kind === 'technology' && <div className="pub-section pub-architecture" aria-label="System architecture">{['Sensor', 'ESP32', 'USB gateway', 'API + storage', 'ECG viewer'].map((label, index) => <span key={label}><small>0{index + 1}</small>{label}{index < 4 && <b aria-hidden="true">→</b>}</span>)}</div>}
    <section className={`pub-section ${kind === 'how-it-works' ? 'pub-steps' : 'pub-information-grid'}`} aria-label={page.label}>
      {page.items.map(([title, copy], index) => kind === 'technology' ? <details className="pub-tech-detail" key={title}><summary>{title}<span aria-hidden="true">+</span></summary><p>{copy}</p></details> : <article key={title}><span className="pub-eyebrow">0{index + 1}</span><h2>{title}</h2><p>{copy}</p></article>)}
    </section>
    <section className="pub-section pub-inline-cta"><h2>{kind === 'about' ? 'Help shape the next chapter.' : 'See how the pieces fit.'}</h2><Link to={kind === 'about' ? '/contact' : '/subscription'} className="pub-button">{kind === 'about' ? 'Contact Heartline' : 'Explore plans'} ↗</Link></section>
  </main>;
}
