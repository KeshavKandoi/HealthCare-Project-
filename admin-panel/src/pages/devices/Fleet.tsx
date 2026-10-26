import { useEffect, useState } from 'react';
import API from '../../Api/API';
import Layout from '../../components/Layouts/Layout';

type FleetDevice = { id: string; model: string | null; firmware_version: string | null; status: string; last_seen_at: string | null; battery_percent: number | null; queued_batches: number | null; sync_failures: number | null; open_support_requests: number };
type SupportRequest = { id: string; device_id: string; request_type: 'support' | 'replacement'; issue: string; status: 'open' | 'in_progress' | 'resolved'; created_at: string };

export default function Fleet() {
  const [devices, setDevices] = useState<FleetDevice[]>([]);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [error, setError] = useState('');
  async function load() {
    try {
      const [fleet, support] = await Promise.all([API.get<{ devices: FleetDevice[] }>('/monitoring/staff/fleet'), API.get<{ requests: SupportRequest[] }>('/monitoring/staff/support')]);
      setDevices(fleet.data.devices); setRequests(support.data.requests); setError('');
    } catch { setError('Could not load fleet diagnostics. Check the API and administrator access.'); }
  }
  useEffect(() => { void load(); }, []);
  async function update(id: string, status: SupportRequest['status']) {
    try { await API.patch(`/monitoring/staff/support/${id}`, { status }); await load(); }
    catch { setError('Could not update support request.'); }
  }
  return <Layout><main className="container py-4"><div className="d-flex justify-content-between align-items-center"><div><p className="text-uppercase text-secondary mb-1">Company support</p><h1>Device fleet</h1></div><button className="btn btn-outline-primary" onClick={load}>Refresh</button></div><p>Connection and sync telemetry reported by trusted devices. Battery is shown only when firmware supports it.</p>{error && <div className="alert alert-danger" role="alert">{error}</div>}<div className="table-responsive"><table className="table table-striped align-middle"><thead><tr><th>Device</th><th>Status</th><th>Last contact</th><th>Battery</th><th>Queued batches</th><th>Sync failures</th><th>Firmware</th><th>Open requests</th></tr></thead><tbody>{devices.map(device => <tr key={device.id}><td>{device.model || 'ECG device'}<br /><small>{device.id}</small></td><td>{device.status}</td><td>{device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : 'Never'}</td><td>{device.battery_percent == null ? 'Not reported' : `${device.battery_percent}%`}</td><td>{device.queued_batches ?? 'Unknown'}</td><td>{device.sync_failures ?? 'Unknown'}</td><td>{device.firmware_version || 'Not reported'}</td><td>{device.open_support_requests}</td></tr>)}</tbody></table></div><h2 className="mt-5">Support requests</h2><div className="table-responsive"><table className="table table-striped align-middle"><thead><tr><th>Received</th><th>Device</th><th>Type</th><th>Issue</th><th>Status</th><th>Update</th></tr></thead><tbody>{requests.map(request => <tr key={request.id}><td>{new Date(request.created_at).toLocaleString()}</td><td>{request.device_id.slice(0, 8)}</td><td>{request.request_type}</td><td>{request.issue}</td><td>{request.status}</td><td><select className="form-select" value={request.status} onChange={event => update(request.id, event.target.value as SupportRequest['status'])}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></td></tr>)}</tbody></table></div></main></Layout>;
}
