import { useEffect, useState } from 'react';
import API from '../Api/API';

type Channel = 'email' | 'sms' | 'voice';
type HistoryEntry = { at: string; status: string; providerStatus?: string | null; detail?: string | null };
type Delivery = { status: string; recipient: string | null; providerId: string | null; providerStatus: string | null; detail: string | null; updatedAt: string; history: HistoryEntry[] };
type TestAlert = { id: string; systolic: number; diastolic: number; recorded_at: string; source: string; created_at: string; deliveries: Record<Channel, Delivery> };

const channelNames: Record<Channel, string> = { email: 'Email', sms: 'SMS', voice: 'Voice call' };
// Only states the provider reported are shown; an unfinished submission still reads as Pending.
const statusLabel = (status: string) => ({ pending: 'Pending', sending: 'Pending', submitted: 'Submitted', delivered: 'Delivered', failed: 'Failed', not_configured: 'Not sent' }[status] || status);
const when = (value: string) => new Date(value).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const maskPhone = (value: string | null) => value && value.startsWith('+') ? `${value.slice(0, 3)} ••••• ${value.slice(-4)}` : value;

/** Backoffice High blood pressure test alerts with per-channel delivery status, for the authorized account only. */
export default function BloodPressureTestAlerts() {
  const [alerts, setAlerts] = useState<TestAlert[] | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => API.get<{ authorized: boolean; alerts: TestAlert[] }>('/bp-alerts/test-alerts')
      .then(({ data }) => { if (active) setAlerts(data.authorized ? data.alerts : null); }, () => { /* keep the last list */ });
    void load();
    const timer = window.setInterval(load, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  if (!alerts) return null;
  return <section className="bp-card bp-test" aria-labelledby="bp-test-title">
    <div className="bp-section-title"><span className="bp-index">TEST</span><div><h2 id="bp-test-title">Monitoring test alerts</h2><p>Sent when High blood pressure is selected in the Backoffice. Simulated readings only; they are kept separate from genuine patient alerts and go only to your configured test contacts. Updates automatically.</p></div></div>
    {alerts.length ? <ul className="bp-test-list">{alerts.map(alert => <li key={alert.id}><details>
      <summary>
        <span className="bp-test-badge">TEST</span>
        <span className="bp-test-reading"><strong>{alert.systolic}/{alert.diastolic} mmHg</strong><small>{when(alert.recorded_at)} · {alert.source}</small></span>
        <span className="bp-test-channels">{(Object.keys(channelNames) as Channel[]).map(channel => <span key={channel} className={`bp-test-status is-${alert.deliveries[channel]?.status}`}>{channelNames[channel]}: {statusLabel(alert.deliveries[channel]?.status)}</span>)}</span>
      </summary>
      <div className="bp-test-details">{(Object.keys(channelNames) as Channel[]).map(channel => {
        const delivery = alert.deliveries[channel];
        if (!delivery) return null;
        return <div key={channel} className="bp-test-channel">
          <div className="bp-test-channel-head"><strong>{channelNames[channel]}</strong><span className={`bp-test-status is-${delivery.status}`}>{statusLabel(delivery.status)}</span></div>
          <dl>
            <dt>Recipient</dt><dd>{(channel === 'email' ? delivery.recipient : maskPhone(delivery.recipient)) || '—'}</dd>
            <dt>Provider status</dt><dd>{delivery.providerStatus || '—'}</dd>
            {delivery.providerId && <><dt>Provider reference</dt><dd className="bp-test-ref">{delivery.providerId}</dd></>}
            {delivery.detail && <><dt>Detail</dt><dd>{delivery.detail}</dd></>}
          </dl>
          <ol className="bp-test-timeline">{delivery.history.map((item, index) => <li key={index}><time>{when(item.at)}</time> {statusLabel(item.status)}{item.providerStatus ? ` · ${item.providerStatus}` : ''}{item.detail ? ` · ${item.detail}` : ''}</li>)}</ol>
        </div>;
      })}</div>
    </details></li>)}</ul> : <p className="bp-test-empty">No test alerts yet. Select High blood pressure in the Backoffice to send one.</p>}
  </section>;
}
