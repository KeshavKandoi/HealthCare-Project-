import { randomUUID } from 'node:crypto';
import { getPool } from '../config/db.js';
import { bpEmailConfigured, bpSmsConfigured, bpVoiceConfigured } from './bpAlerts.js';
import { scenarioVitals, simulationSeed } from './ecgSimulation.js';

/*
 * Backoffice "High blood pressure" test alerts. They go only to the operator's own contacts configured on the
 * server (BP_TEST_ALERT_*), are stored apart from patient BP alerts, and are never sent to patients or caregivers.
 */
export type Channel = 'email' | 'sms' | 'voice';
export type DeliveryStatus = 'pending' | 'sending' | 'submitted' | 'delivered' | 'failed' | 'not_configured';
type HistoryEntry = { at: string; status: DeliveryStatus; providerStatus?: string | null; detail?: string | null };
export type Delivery = { status: DeliveryStatus; recipient: string | null; providerId: string | null; providerStatus: string | null; detail: string | null; updatedAt: string; checkedAt?: string | null; history: HistoryEntry[] };
export type Reading = { systolic: number; diastolic: number; recordedAt: Date };
type Pool = { query(sql: string, params?: unknown[]): Promise<{ rows: any[]; rowCount?: number | null }> };
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const channels: Channel[] = ['email', 'sms', 'voice'];
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const createTable = `create table if not exists healthcare_private.bp_test_alerts (
  id uuid primary key, trigger_key text not null unique, account_email text,
  systolic smallint not null, diastolic smallint not null, recorded_at timestamptz not null, source text not null,
  deliveries jsonb not null, created_at timestamptz not null default now());
alter table healthcare_private.bp_test_alerts alter column account_email drop not null`;

/** The authorized Heartline account and its contacts, all set by the operator on the server. */
export function testAlertConfig() {
  const account = (process.env.BP_TEST_ALERT_ACCOUNT || '').trim().toLowerCase();
  const email = (process.env.BP_TEST_ALERT_EMAIL || account).trim().toLowerCase();
  const phone = (process.env.BP_TEST_ALERT_PHONE || '').trim();
  return {
    account: validEmail(account) ? account : null,
    email: validEmail(email) ? email : null,
    phone: /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null,
    timeZone: process.env.BP_TEST_ALERT_TIMEZONE || 'Asia/Kolkata',
  };
}

const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** Alert wording for every channel, with the reading and local time filled in. */
export function testAlertContent(reading: Reading, timeZone = 'Asia/Kolkata') {
  const time = new Intl.DateTimeFormat('en-IN', { timeZone, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZoneName: 'short' }).format(reading.recordedAt);
  const bp = `${reading.systolic}/${reading.diastolic}`;
  const voice = `Attention. This is Heartline. A high blood pressure alert has been triggered. The blood pressure reading is ${reading.systolic} over ${reading.diastolic} millimeters of mercury. Please review the monitoring dashboard. This is a test alert using simulated data.`;
  const row = (label: string, value: string) => `<tr><td style="padding:10px 0;color:#5b6b7f;font-size:13px;width:150px">${label}</td><td style="padding:10px 0;color:#14233a;font-size:15px;font-weight:600">${escapeXml(value)}</td></tr>`;
  return {
    time,
    subject: 'Heartline | High Blood Pressure Alert — TEST',
    text: `HIGH BLOOD PRESSURE ALERT\n\nAn elevated blood pressure reading has been detected in the Heartline monitoring scenario.\n\nBlood Pressure: ${bp} mmHg\nRecorded at: ${time}\n\nPlease review the reading and follow the appropriate care procedure.\n\nThis notification is part of a simulated monitoring test.`,
    html: `<!doctype html><html><body style="margin:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d7dfe9;border-radius:10px;overflow:hidden">
<tr><td style="background:#b3141f;padding:18px 24px;color:#ffffff"><div style="font-size:12px;letter-spacing:2px;font-weight:700">HEARTLINE MONITORING · TEST</div><div style="font-size:21px;font-weight:700;margin-top:6px">HIGH BLOOD PRESSURE ALERT</div></td></tr>
<tr><td style="padding:22px 24px 6px;color:#14233a;font-size:15px;line-height:1.55">An elevated blood pressure reading has been detected in the Heartline monitoring scenario.</td></tr>
<tr><td style="padding:4px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e3e9f0;border-bottom:1px solid #e3e9f0">${row('Blood Pressure', `${bp} mmHg`)}${row('Recorded at', time)}${row('Source', 'Heartline Backoffice · simulated scenario')}</table></td></tr>
<tr><td style="padding:16px 24px;color:#14233a;font-size:15px;line-height:1.55">Please review the reading and follow the appropriate care procedure.</td></tr>
<tr><td style="padding:14px 24px 22px;color:#5b6b7f;font-size:12px;line-height:1.5;border-top:1px solid #eef2f7">This notification is part of a simulated monitoring test. It is not a genuine patient reading and not an emergency service.</td></tr>
</table></td></tr></table></body></html>`,
    sms: `HEARTLINE BP ALERT — TEST: Elevated BP ${bp} mmHg at ${time}. Please review the reading. Simulated monitoring event.`,
    voice,
    // Neural voice at a slightly slower pace, said twice like a monitoring call.
    twiml: `<Response><Pause length="1"/><Say voice="Polly.Joanna-Neural" language="en-US"><prosody rate="90%">${escapeXml(voice)}</prosody></Say><Pause length="1"/><Say voice="Polly.Joanna-Neural" language="en-US"><prosody rate="90%">Repeating. ${escapeXml(voice)}</prosody></Say></Response>`,
  };
}

// Provider states mapped to what the app can honestly claim.
export const providerOutcome: Record<Channel, (status: string) => DeliveryStatus> = {
  email: status => ['delivered', 'opened', 'clicked', 'complained'].includes(status) ? 'delivered' : ['bounced', 'failed', 'canceled'].includes(status) ? 'failed' : 'submitted',
  sms: status => ['delivered', 'read'].includes(status) ? 'delivered' : ['failed', 'undelivered', 'canceled'].includes(status) ? 'failed' : 'submitted',
  voice: status => status === 'completed' ? 'delivered' : ['busy', 'failed', 'no-answer', 'canceled'].includes(status) ? 'failed' : 'submitted',
};

type ProviderResult = { ok: boolean; providerId: string | null; providerStatus: string | null; detail: string | null };

export function createTestAlerts({ pool = getPool as () => Pool, fetcher = ((url, init) => fetch(url, init)) as Fetch, config = testAlertConfig, refreshAfterMs = 15000 } = {}) {
  let ready: Promise<void> | null = null, processing = false;
  const db = async (sql: string, params?: unknown[]) => {
    ready ??= pool().query(createTable).then(() => undefined, () => undefined);
    await ready;
    return pool().query(sql, params);
  };
  const twilioAuth = () => `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`;
  const twilioUrl = (path: string) => `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/${path}`;
  async function call(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; body: any }> {
    const response = await fetcher(url, { ...init, signal: AbortSignal.timeout(10000) });
    let body: any = null;
    try { body = await response.json(); } catch { /* provider returned no JSON */ }
    return { ok: response.ok, status: response.status, body };
  }
  const failure = (status: number, body: any): ProviderResult => ({ ok: false, providerId: null, providerStatus: `HTTP ${status}`, detail: String(body?.message || body?.error_message || body?.name || 'Provider rejected the request').slice(0, 300) });

  const send: Record<Channel, (to: string, content: ReturnType<typeof testAlertContent>) => Promise<ProviderResult>> = {
    async email(to, content) {
      const r = await call('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [to], subject: content.subject, text: content.text, html: content.html }) });
      return r.ok && r.body?.id ? { ok: true, providerId: r.body.id, providerStatus: 'accepted', detail: 'Accepted by Resend' } : failure(r.status, r.body);
    },
    async sms(to, content) {
      const r = await call(twilioUrl('Messages.json'), { method: 'POST', headers: { Authorization: twilioAuth(), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ To: to, From: process.env.TWILIO_SMS_FROM || '', Body: content.sms }) });
      return r.ok && r.body?.sid ? { ok: true, providerId: r.body.sid, providerStatus: r.body.status || 'queued', detail: 'Accepted by Twilio' } : failure(r.status, r.body);
    },
    async voice(to, content) {
      const r = await call(twilioUrl('Calls.json'), { method: 'POST', headers: { Authorization: twilioAuth(), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ To: to, From: process.env.TWILIO_VOICE_FROM || '', Twiml: content.twiml }) });
      return r.ok && r.body?.sid ? { ok: true, providerId: r.body.sid, providerStatus: r.body.status || 'queued', detail: 'Call placed by Twilio' } : failure(r.status, r.body);
    },
  };
  const check: Record<Channel, (id: string) => Promise<{ providerStatus: string; detail: string | null } | null>> = {
    async email(id) { const r = await call(`https://api.resend.com/emails/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } }); return r.ok && r.body?.last_event ? { providerStatus: r.body.last_event, detail: null } : null; },
    async sms(id) { const r = await call(twilioUrl(`Messages/${encodeURIComponent(id)}.json`), { headers: { Authorization: twilioAuth() } }); return r.ok && r.body?.status ? { providerStatus: r.body.status, detail: r.body.error_message || (r.body.error_code ? `Twilio error ${r.body.error_code}` : null) } : null; },
    async voice(id) { const r = await call(twilioUrl(`Calls/${encodeURIComponent(id)}.json`), { headers: { Authorization: twilioAuth() } }); return r.ok && r.body?.status ? { providerStatus: r.body.status, detail: r.body.duration ? `Call lasted ${r.body.duration} s` : null } : null; },
  };
  const enabled = { email: bpEmailConfigured, sms: bpSmsConfigured, voice: bpVoiceConfigured };

  const entry = (status: DeliveryStatus, providerStatus: string | null = null, detail: string | null = null): HistoryEntry => ({ at: new Date().toISOString(), status, providerStatus, detail });
  // Replace one channel only, so concurrent updates to other channels are kept.
  const saveChannel = (id: string, channel: Channel, delivery: Delivery) => db('update healthcare_private.bp_test_alerts set deliveries=jsonb_set(deliveries,$2::text[],$3::jsonb) where id=$1', [id, `{${channel}}`, JSON.stringify(delivery)]);

  /** Records one alert per backoffice trigger and starts delivery. Repeating the same trigger never resends. */
  async function trigger({ triggerKey, reading, source = 'Backoffice · High blood pressure' }: { triggerKey: string; reading: Reading; source?: string }) {
    const settings = config();
    const recipients: Record<Channel, string | null> = { email: settings.email, sms: settings.phone, voice: settings.phone };
    const deliveries = Object.fromEntries(channels.map(channel => {
      const reason = !settings.account ? 'Alert contacts are not set up on the server' : !recipients[channel] ? `No ${channel === 'email' ? 'email address' : 'phone number'} is set up for test alerts` : !enabled[channel]() ? `${channel === 'email' ? 'Email' : channel === 'sms' ? 'SMS' : 'Voice call'} delivery is not configured on the server` : null;
      const status: DeliveryStatus = reason ? 'not_configured' : 'pending';
      return [channel, { status, recipient: reason ? null : recipients[channel], providerId: null, providerStatus: null, detail: reason, updatedAt: new Date().toISOString(), history: [entry(status, null, reason)] } satisfies Delivery];
    })) as Record<Channel, Delivery>;
    // The alert is always recorded and shown in the app; messages go out only to configured contacts.
    const { rows } = await db(`insert into healthcare_private.bp_test_alerts(id,trigger_key,account_email,systolic,diastolic,recorded_at,source,deliveries)
      values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(trigger_key) do nothing returning id`,
      [randomUUID(), triggerKey, settings.account, reading.systolic, reading.diastolic, reading.recordedAt, source, JSON.stringify(deliveries)]);
    if (channels.some(channel => deliveries[channel].status === 'pending')) void processPending().catch(error => console.error('BP test alert delivery failed', error));
    return { recorded: !!rows[0], id: rows[0]?.id ?? null, deliveries, ...(settings.account ? {} : { reason: 'Alert recorded. Email, SMS and calls start once alert contacts are set up on the server.' }) };
  }

  /** Submits each pending channel once; a channel stuck mid-submission is failed, never resent. */
  async function processPending() {
    if (processing) return;
    processing = true;
    try {
      await db(`update healthcare_private.bp_test_alerts a set deliveries=jsonb_set(a.deliveries,array[c.key],c.value||jsonb_build_object('status','failed','detail',
          case when c.value->>'status'='pending' then 'Expired before submission' else 'Submission state unknown after an interruption; not retried to avoid a duplicate' end))
        from healthcare_private.bp_test_alerts b, jsonb_each(b.deliveries) c
        where a.id=b.id and ((c.value->>'status'='pending' and b.created_at<now()-interval '10 minutes') or (c.value->>'status'='sending' and b.created_at<now()-interval '5 minutes'))`);
      for (const channel of channels) {
        for (;;) {
          const { rows } = await db(`update healthcare_private.bp_test_alerts set deliveries=jsonb_set(deliveries,$1::text[],'"sending"')
            where id=(select id from healthcare_private.bp_test_alerts where deliveries->$2::text->>'status'='pending' and created_at>now()-interval '10 minutes' order by created_at limit 1 for update skip locked)
            returning id,systolic,diastolic,recorded_at,deliveries->$2::text delivery`, [`{${channel},status}`, channel]);
          const claimed = rows[0];
          if (!claimed) break;
          const delivery = claimed.delivery as Delivery;
          let result: ProviderResult;
          try { result = enabled[channel]() && delivery.recipient ? await send[channel](delivery.recipient, testAlertContent({ systolic: claimed.systolic, diastolic: claimed.diastolic, recordedAt: new Date(claimed.recorded_at) }, config().timeZone)) : { ok: false, providerId: null, providerStatus: null, detail: 'Channel became unavailable before submission' }; }
          catch (error) { result = { ok: false, providerId: null, providerStatus: null, detail: error instanceof Error ? error.message.slice(0, 300) : 'Provider request failed' }; }
          const status: DeliveryStatus = result.ok ? providerOutcome[channel](result.providerStatus || '') : 'failed';
          await saveChannel(claimed.id, channel, { ...delivery, status, providerId: result.providerId, providerStatus: result.providerStatus, detail: result.detail, updatedAt: new Date().toISOString(), checkedAt: new Date().toISOString(), history: [...delivery.history, entry(status, result.providerStatus, result.detail)] });
        }
      }
    } finally { processing = false; }
  }

  /** Asks Resend and Twilio for the latest state of recent submitted alerts, at most every refreshAfterMs. */
  async function refreshStatuses(accountEmail?: string) {
    for (const channel of channels) {
      const { rows } = await db(`update healthcare_private.bp_test_alerts set deliveries=jsonb_set(deliveries,$1::text[],to_jsonb(now()::text))
        where deliveries->$2::text->>'status'='submitted' and deliveries->$2::text->>'providerId' is not null and created_at>now()-interval '2 hours'
          and ($3::text is null or account_email=$3)
          and coalesce((deliveries->$2::text->>'checkedAt')::timestamptz,'epoch')<now()-$4::int*interval '1 millisecond'
        returning id,deliveries->$2::text delivery`, [`{${channel},checkedAt}`, channel, accountEmail ?? null, refreshAfterMs]);
      for (const row of rows) {
        const delivery = row.delivery as Delivery;
        try {
          const latest = await check[channel](delivery.providerId!);
          if (!latest || latest.providerStatus === delivery.providerStatus) continue;
          const status = providerOutcome[channel](latest.providerStatus);
          await saveChannel(row.id, channel, { ...delivery, status, providerStatus: latest.providerStatus, detail: latest.detail ?? delivery.detail, updatedAt: new Date().toISOString(), history: [...delivery.history, entry(status, latest.providerStatus, latest.detail)] });
        } catch { /* keep the last known state; the next refresh retries */ }
      }
    }
  }

  /** Alert history for the authorized account only; null for anyone else. */
  /** Monitoring alerts are shared like the live monitor; only the configured account sees contact details. */
  async function listFor(accountEmail: string) {
    const account = config().account;
    const authorized = !!account && accountEmail.trim().toLowerCase() === account;
    await refreshStatuses().catch(() => {});
    const { rows } = await db('select id,systolic,diastolic,recorded_at,source,deliveries,created_at from healthcare_private.bp_test_alerts order by created_at desc limit 50');
    const alerts = authorized ? rows : rows.map(row => ({ ...row, deliveries: Object.fromEntries(Object.entries(row.deliveries as Record<Channel, Delivery>).map(([channel, delivery]) => [channel, { ...delivery, recipient: null, providerId: null }])) }));
    return { authorized, alerts };
  }

  const active = () => bpEmailConfigured() || bpSmsConfigured() || bpVoiceConfigured();
  function startWorker() {
    if (!active()) return;
    const timer = setInterval(() => { void processPending().then(() => refreshStatuses()).catch(error => console.error('BP test alert worker error', error)); }, 10000);
    timer.unref();
  }
  return { trigger, processPending, refreshStatuses, listFor, startWorker };
}

export const testAlerts = createTestAlerts();

/** The High blood pressure reading every monitor shows at that moment (monitors run the simulation on the wall clock). */
export function highBpReadingAt(at: string): Reading {
  const recordedAt = new Date(at);
  const vitals = scenarioVitals((recordedAt.getTime() / 1000) % 3600, { scenario: 'resting-v2', seed: simulationSeed, mode: 'high-bp' });
  return { systolic: Math.round(vitals.systolic), diastolic: Math.round(vitals.diastolic), recordedAt };
}
