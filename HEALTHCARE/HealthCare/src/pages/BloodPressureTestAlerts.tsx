import { useEffect, useState } from 'react';
import API from '../Api/API';
import { useWaveformMode } from '../backoffice/backoffice';
import { highBpReadingAt } from '../components/ECG/liveSimulation';

type Channel = 'email' | 'sms' | 'voice';
type HistoryEntry = { at: string; status: string; providerStatus?: string | null; detail?: string | null };
type Delivery = { status: string; recipient: string | null; providerId: string | null; providerStatus: string | null; detail: string | null; updatedAt: string; history: HistoryEntry[] };
type MonitoringAlert = { id: string; systolic: number; diastolic: number; recorded_at: string; source: string; created_at: string; deliveries: Record<Channel, Delivery> };

const channels: Channel[] = ['email', 'sms', 'voice'];
const channelNames: Record<Channel, string> = { email: 'Email', sms: 'SMS', voice: 'Voice call' };
const channelIcons: Record<Channel, string> = { email: 'fa-envelope', sms: 'fa-comment-sms', voice: 'fa-phone' };
// Only states the provider reported are shown; an unfinished submission still reads as Pending.
const statusLabel = (status: string) => ({ pending: 'Pending', sending: 'Pending', submitted: 'Submitted', delivered: 'Delivered', failed: 'Failed', not_configured: 'Not sent' }[status] || status);
const when = (value: string) => new Date(value).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const maskPhone = (value: string | null) => value && value.startsWith('+') ? `${value.slice(0, 3)} ••••• ${value.slice(-4)}` : value;
const Status = ({ status, channel }: { status: string; channel?: Channel }) => <span className={`bp-pill is-${status}`}>{channel && <i className={`fa-solid ${channelIcons[channel]}`} aria-hidden="true" />}{channel ? `${channelNames[channel]}: ` : ''}{statusLabel(status)}</span>;

/** Live status and history of the Backoffice High blood pressure monitoring alerts. */
export default function BloodPressureTestAlerts() {
  const [waveform] = useWaveformMode(4000);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [authorized, setAuthorized] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => API.get<{ authorized: boolean; alerts: MonitoringAlert[] }>('/bp-alerts/test-alerts')
      .then(({ data }) => { if (active) { setAlerts(data.alerts || []); setAuthorized(!!data.authorized); } }, () => { /* keep the last list */ });
    void load();
    const timer = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [waveform.updatedAt]);

  const live = waveform.mode === 'high-bp' && !!waveform.updatedAt;
  const reading = live ? highBpReadingAt(waveform.updatedAt!) : null;
  const current = live ? alerts.find(alert => Math.abs(Date.parse(alert.recorded_at) - Date.parse(waveform.updatedAt!)) < 60000) : undefined;
  return <>
    <section className={`bp-status ${live ? 'is-alert' : 'is-clear'}`} aria-live="polite">
      <span className="bp-status-icon" aria-hidden="true"><i className={`fa-solid ${live ? 'fa-triangle-exclamation' : 'fa-shield-heart'}`} /></span>
      {live && reading ? <>
        <div className="bp-status-copy"><span className="bp-status-kicker">Active alert · Test</span><h2>High blood pressure</h2><p>Triggered {when(waveform.updatedAt!)} · Backoffice monitoring scenario · simulated reading</p>
          {current && <div className="bp-status-channels">{channels.map(channel => <Status key={channel} channel={channel} status={current.deliveries[channel]?.status} />)}</div>}</div>
        <div className="bp-status-reading"><strong>{reading.systolic}/{reading.diastolic}</strong><span>mmHg</span></div>
      </> : <div className="bp-status-copy"><span className="bp-status-kicker">Monitoring</span><h2>No active alert</h2><p>{alerts[0] ? `Last alert ${when(alerts[0].created_at)} · ${alerts[0].systolic}/${alerts[0].diastolic} mmHg` : 'An alert appears here as soon as High blood pressure is selected in the Backoffice.'}</p></div>}
    </section>

    <section className="bp-card" aria-labelledby="bp-history-title">
      <div className="bp-section-title"><span className="bp-icon is-alert" aria-hidden="true"><i className="fa-solid fa-heart-pulse" /></span><div><h2 id="bp-history-title">Monitoring alert history</h2><p>Every High blood pressure alert from the Backoffice, with email, SMS and voice call status. Test alerts use simulated readings and are kept apart from genuine patient alerts. Updates automatically.</p></div></div>
      {alerts.length ? <ul className="bp-history">{alerts.map(alert => <li key={alert.id}><details>
        <summary>
          <span className="bp-test-badge">TEST</span>
          <span className="bp-history-reading"><strong>{alert.systolic}/{alert.diastolic} mmHg</strong><small>{when(alert.recorded_at)} · {alert.source}</small></span>
          <span className="bp-history-channels">{channels.map(channel => <Status key={channel} channel={channel} status={alert.deliveries[channel]?.status} />)}</span>
          <i className="fa-solid fa-chevron-down bp-history-chevron" aria-hidden="true" />
        </summary>
        <div className="bp-history-details">{channels.map(channel => {
          const delivery = alert.deliveries[channel];
          if (!delivery) return null;
          return <div key={channel} className="bp-history-channel">
            <div className="bp-history-channel-head"><strong><i className={`fa-solid ${channelIcons[channel]}`} aria-hidden="true" /> {channelNames[channel]}</strong><Status status={delivery.status} /></div>
            <dl>
              {authorized && <><dt>Recipient</dt><dd>{(channel === 'email' ? delivery.recipient : maskPhone(delivery.recipient)) || '—'}</dd></>}
              <dt>Provider status</dt><dd>{delivery.providerStatus || '—'}</dd>
              {delivery.providerId && <><dt>Reference</dt><dd className="bp-mono">{delivery.providerId}</dd></>}
              {delivery.detail && <><dt>Detail</dt><dd>{delivery.detail}</dd></>}
            </dl>
            <ol className="bp-timeline">{delivery.history.map((item, index) => <li key={index}><time>{when(item.at)}</time><span>{statusLabel(item.status)}{item.providerStatus ? ` · ${item.providerStatus}` : ''}</span></li>)}</ol>
          </div>;
        })}</div>
      </details></li>)}</ul> : <div className="bp-empty"><i className="fa-regular fa-bell" aria-hidden="true" /><p>No alerts yet. Select High blood pressure in the Backoffice to raise one.</p></div>}
    </section>
  </>;
}
