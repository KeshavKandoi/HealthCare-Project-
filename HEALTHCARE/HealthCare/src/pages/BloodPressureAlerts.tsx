import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../Api/API';
import './patientWorkspace.css';
import './BloodPressureAlerts.css';
import BloodPressureTestAlerts from './BloodPressureTestAlerts';

type Settings = { enabled: boolean; systolic_limit: number | null; diastolic_limit: number | null };
type Alert = { id: string; kind: string; value: number; limit_value: number; status: string; email_status: string; voice_status: string; sms_status: string; created_at: string; invite_email: string };
type Grant = { id: string; patient_name: string; notify: boolean; phone_e164: string | null; phone_verified_at: string | null };
type Recipient = { id: string; invite_email: string; accepted_at: string | null; revoked_at: string | null; notify: boolean; phone_e164: string | null; phone_verified_at: string | null };
const errorMessage = (error: unknown) => (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'This action could not be completed.';

export default function BloodPressureAlerts() {
  const [settings, setSettings] = useState<Settings>({ enabled: false, systolic_limit: null, diastolic_limit: null });
  const [alerts, setAlerts] = useState<Alert[]>([]), [recipients, setRecipients] = useState<Recipient[]>([]), [grants, setGrants] = useState<Grant[]>([]);
  const [verificationConfigured, setVerificationConfigured] = useState(false), [emailConfigured, setEmailConfigured] = useState(false), [voiceConfigured, setVoiceConfigured] = useState(false), [smsConfigured, setSmsConfigured] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [phone, setPhone] = useState<Record<string, string>>({}), [code, setCode] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const results = await Promise.allSettled([
      API.get<{ settings: Settings; alerts: Alert[]; verificationConfigured: boolean; emailConfigured: boolean; voiceConfigured: boolean; smsConfigured: boolean }>('/bp-alerts/settings'),
      API.get<{ caregivers: Recipient[] }>('/monitoring/caregivers'),
      API.get<{ grants: Grant[] }>('/bp-alerts/caregiver/grants'),
    ]);
    if (results[0].status === 'fulfilled') { setSettings(results[0].value.data.settings); setAlerts(results[0].value.data.alerts); setVerificationConfigured(results[0].value.data.verificationConfigured); setEmailConfigured(results[0].value.data.emailConfigured); setVoiceConfigured(results[0].value.data.voiceConfigured); setSmsConfigured(results[0].value.data.smsConfigured); }
    else setError(errorMessage(results[0].reason));
    if (results[1].status === 'fulfilled') setRecipients(results[1].value.data.caregivers);
    if (results[2].status === 'fulfilled') setGrants(results[2].value.data.grants);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function save() {
    try { await API.put('/bp-alerts/settings', { enabled: settings.enabled, systolicLimit: settings.systolic_limit, diastolicLimit: settings.diastolic_limit }); setNotice('Alert limits saved.'); setError(''); await load(); }
    catch (cause) { setError(errorMessage(cause)); }
  }
  async function start(grantId: string) {
    try { await API.post(`/bp-alerts/caregiver/grants/${grantId}/phone/start`, { phone: phone[grantId] }); setNotice('Verification code requested. Enter the code sent to your phone.'); setError(''); await load(); }
    catch (cause) { setError(errorMessage(cause)); }
  }
  async function verify(grantId: string) {
    try { await API.post(`/bp-alerts/caregiver/grants/${grantId}/phone/check`, { code: code[grantId] }); setNotice('Phone verified for this family invitation.'); setError(''); await load(); }
    catch (cause) { setError(errorMessage(cause)); }
  }
  async function remove(grantId: string) {
    try { await API.delete(`/bp-alerts/caregiver/grants/${grantId}/phone`); setNotice('Phone removed. This invitation can no longer receive SMS or voice calls.'); setError(''); await load(); }
    catch (cause) { setError(errorMessage(cause)); }
  }
  const pill = (status: string) => <span className={`bp-pill is-${status}`}>{status === 'skipped' ? 'Not sent' : status[0].toUpperCase() + status.slice(1)}</span>;
  return <main className="pw-shell bp-shell">
    <header className="bp-head"><p className="pw-eyebrow">FAMILY CARE / BLOOD PRESSURE</p><h1>BP alerts</h1><p>See active blood pressure alerts and their delivery, set your own limits, and choose who is notified.</p></header>
    {error && <p className="pw-error" role="alert">{error}</p>}{notice && <p className="bp-notice" role="status">{notice}</p>}
    <BloodPressureTestAlerts />
    {!emailConfigured && !voiceConfigured && !smsConfigured && <div className="bp-provider-note"><i className="fa-solid fa-circle-info" aria-hidden="true" /><div><strong>Alert delivery is not connected yet.</strong><span>Configure Resend email, Twilio SMS or Twilio voice on the server before relying on alerts.</span></div></div>}
    <div className="bp-grid">
      <section className="bp-card"><div className="bp-section-title"><span className="bp-icon" aria-hidden="true"><i className="fa-solid fa-sliders" /></span><div><h2>Your alert limits</h2><p>Set these with your care team. Each newly entered mmHg reading is compared with the matching limit.</p></div></div>
        <div className="bp-input-grid"><label>Systolic above<input type="number" min="90" max="250" inputMode="numeric" placeholder="e.g. 140" value={settings.systolic_limit ?? ''} onChange={event => setSettings(current => ({ ...current, systolic_limit: event.target.value ? Number(event.target.value) : null }))} /><small>Top number · mmHg</small></label><label>Diastolic above<input type="number" min="50" max="150" inputMode="numeric" placeholder="e.g. 90" value={settings.diastolic_limit ?? ''} onChange={event => setSettings(current => ({ ...current, diastolic_limit: event.target.value ? Number(event.target.value) : null }))} /><small>Bottom number · mmHg</small></label></div>
        <label className="bp-toggle"><input type="checkbox" checked={settings.enabled} onChange={event => setSettings(current => ({ ...current, enabled: event.target.checked }))} /><span>Enable alerts for new readings</span></label>
        <button onClick={save} disabled={settings.enabled && settings.systolic_limit == null && settings.diastolic_limit == null}>Save alert settings</button>
        <p className="bp-small">Readings entered more than five minutes after measurement do not trigger an alert, so old history never raises a late alert.</p></section>
      <section className="bp-card"><div className="bp-section-title"><span className="bp-icon" aria-hidden="true"><i className="fa-solid fa-user-group" /></span><div><h2>Caregiver recipients</h2><p>Invite a relative by email, then allow notifications for that invitation.</p></div></div>
        {recipients.filter(item => !item.revoked_at).length ? <ul className="bp-recipient-list">{recipients.filter(item => !item.revoked_at).map(item => <li key={item.id}><strong>{item.invite_email}</strong><span>{!item.accepted_at ? 'Invitation pending' : !item.notify ? 'Notifications off' : !item.phone_verified_at ? 'Email eligible · phone not verified' : 'Email and verified phone eligible'}</span></li>)}</ul> : <div className="bp-empty"><i className="fa-solid fa-user-plus" aria-hidden="true" /><p>No caregiver invitations yet.</p></div>}
        <Link className="bp-inline-link" to="/caregivers">Manage caregivers <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
        <p className="bp-small">You can turn notifications off or revoke access at any time. Removing a phone stops SMS and voice calls but not email.</p></section>
    </div>
    <section className="bp-card"><div className="bp-section-title"><span className="bp-icon" aria-hidden="true"><i className="fa-solid fa-mobile-screen" /></span><div><h2>Verify your phone as a caregiver</h2><p>If you accepted someone’s family invitation, enter your number in international format. A verification code confirms you control it.</p></div></div>
      {grants.length ? grants.map(grant => <div className="bp-grant" key={grant.id}><div><strong>{grant.patient_name}</strong><span>{grant.notify ? 'Patient allows notifications' : 'Patient has notifications turned off'}</span></div>{grant.phone_verified_at ? <div className="bp-verified"><span><i className="fa-solid fa-circle-check" aria-hidden="true" /> {grant.phone_e164} · verified</span><button onClick={() => remove(grant.id)}>Remove phone</button></div> : <div className="bp-verify-form"><label>Phone number<input type="tel" value={phone[grant.id] || ''} placeholder="+919876543210" onChange={event => setPhone(current => ({ ...current, [grant.id]: event.target.value }))} /></label><button onClick={() => start(grant.id)} disabled={!verificationConfigured || !/^\+[1-9][0-9]{7,14}$/.test(phone[grant.id] || '')}>Send code</button><label>Verification code<input inputMode="numeric" value={code[grant.id] || ''} onChange={event => setCode(current => ({ ...current, [grant.id]: event.target.value }))} /></label><button onClick={() => verify(grant.id)} disabled={!verificationConfigured || !/^\d{4,10}$/.test(code[grant.id] || '')}>Verify</button></div>}</div>) : <div className="bp-empty"><i className="fa-solid fa-mobile-screen" aria-hidden="true" /><p>No accepted family invitations on this account.</p></div>}</section>
    <section className="bp-card"><div className="bp-section-title"><span className="bp-icon" aria-hidden="true"><i className="fa-solid fa-clock-rotate-left" /></span><div><h2>Reading alert activity</h2><p>Alerts raised by readings above your limits, with email, SMS and voice status for each caregiver.</p></div></div>
      {alerts.length ? <div className="bp-alert-table"><table><thead><tr><th>When</th><th>Reading</th><th>Recipient</th><th>Email</th><th>SMS</th><th>Voice</th></tr></thead><tbody>{alerts.map(alert => <tr key={alert.id}><td>{new Date(alert.created_at).toLocaleString()}</td><td>{alert.kind.replace('_bp', '')} {alert.value} mmHg <small>limit {alert.limit_value}</small></td><td>{alert.invite_email}</td><td>{pill(alert.email_status)}</td><td>{pill(alert.sms_status)}</td><td>{pill(alert.voice_status)}</td></tr>)}</tbody></table></div> : <div className="bp-empty"><i className="fa-regular fa-bell" aria-hidden="true" /><p>No reading alerts yet.</p></div>}</section>
    <p className="bp-disclaimer">Email, SMS and voice alerts are informational and can be delayed or fail. Confirm unusual readings and symptoms directly. This service does not detect emergencies or replace clinical care.</p>
  </main>;
}
